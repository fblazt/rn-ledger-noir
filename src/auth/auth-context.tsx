import type { Session, User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { initializeDatabase, seedDefaultCategories } from '@/src/db';
import { nowIso } from '@/src/lib/date';
import { createLogger } from '@/src/lib/logger';
import { supabase } from '@/src/lib/supabase';

const logger = createLogger('auth');

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  setupStatus: 'idle' | 'running' | 'ready' | 'failed';
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [setupStatus, setSetupStatus] = useState<AuthContextValue['setupStatus']>('idle');

  useEffect(() => {
    let mounted = true;

    restoreStoredSession().then((restoredSession) => {
      if (mounted) {
        setSession(restoredSession);
        setLoading(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setSetupStatus('idle');
      return;
    }

    let cancelled = false;

    setSetupStatus('running');
    ensureAuthenticatedUserSetup(session.user)
      .then(() => {
        if (!cancelled) {
          setSetupStatus('ready');
        }
      })
      .catch((error) => {
        logger.error('failed to prepare authenticated user', error);
        if (!cancelled) {
          setSetupStatus('failed');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      throw error;
    }

    setSession(data.session);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error('Account created. Confirm your email before logging in.');
    }

    setSession(data.session);
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({
      loading,
      session,
      setupStatus,
      signIn,
      signOut,
      signUp,
      user: session?.user ?? null,
    }),
    [loading, session, setupStatus, signIn, signOut, signUp]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

async function restoreStoredSession() {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      logger.error('failed to restore session', error);
    }

    if (data.session || attempt === 3) {
      return data.session;
    }

    await delay(250);
  }

  return null;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function ensureAuthenticatedUserSetup(user: User) {
  const existingProfile = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existingProfile.error) {
    throw existingProfile.error;
  }

  if (!existingProfile.data) {
    const insertedProfile = await supabase.from('profiles').insert({
      currency: 'IDR',
      email: user.email,
      id: user.id,
    });

    if (insertedProfile.error) {
      throw insertedProfile.error;
    }
  }

  const db = await initializeDatabase();
  const timestamp = nowIso();

  await db.runAsync(
    `insert into local_profiles (
      id,
      email,
      currency,
      created_at,
      updated_at,
      sync_status,
      synced_at
    ) values (?, ?, 'IDR', ?, ?, 'synced', ?)
    on conflict(id) do update set
      email = excluded.email,
      updated_at = excluded.updated_at,
      sync_status = 'synced',
      synced_at = excluded.synced_at`,
    user.id,
    user.email ?? null,
    timestamp,
    timestamp,
    timestamp
  );

  await seedDefaultCategories(db, user.id);
}
