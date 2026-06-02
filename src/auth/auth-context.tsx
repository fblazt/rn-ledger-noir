import type { Session, User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { createContext, use, useEffect, useReducer, useState } from 'react';

import { initializeDatabase, seedDefaultCategories } from '@/src/db';
import { nowIso } from '@/src/lib/date';
import { createLogger } from '@/src/lib/logger';
import { supabase } from '@/src/lib/supabase';
import { syncLocalData } from '@/src/sync/sync';

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

type AuthState = {
  loading: boolean;
  session: Session | null;
};

function authStateReducer(_state: AuthState, nextState: AuthState) {
  return nextState;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, dispatchAuthState] = useReducer(authStateReducer, { loading: true, session: null });
  const { loading, session } = authState;
  const [setupStatus, setSetupStatus] = useState<AuthContextValue['setupStatus']>('idle');

  useEffect(() => {
    let mounted = true;

    restoreStoredSession().then((restoredSession) => {
      if (mounted) {
        dispatchAuthState({ loading: false, session: restoredSession });
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      dispatchAuthState({ loading: false, session: nextSession });
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    let cancelled = false;

    async function prepareAuthenticatedUser(user: User) {
      setSetupStatus('running');

      try {
        await ensureAuthenticatedUserSetup(user);

        if (!cancelled) {
          setSetupStatus('ready');
        }
      } catch (error) {
        logger.error('failed to prepare authenticated user', error);
        if (!cancelled) {
          setSetupStatus('failed');
        }
      }
    }

    prepareAuthenticatedUser(session.user);

    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      throw error;
    }

    dispatchAuthState({ loading: false, session: data.session });
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error('Account created. Confirm your email before logging in.');
    }

    dispatchAuthState({ loading: false, session: data.session });
  }

  const value = {
    loading,
    session,
    setupStatus: session?.user ? setupStatus : 'idle',
    signIn,
    signOut: signOutUser,
    signUp,
    user: session?.user ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = use(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

async function signOutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

async function restoreStoredSession() {
  return restoreStoredSessionAttempt(1);
}

async function restoreStoredSessionAttempt(attempt: number): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    logger.error('failed to restore session', error);
  }

  if (data.session || attempt === 3) {
    return data.session;
  }

  await delay(250);
  return restoreStoredSessionAttempt(attempt + 1);
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function ensureAuthenticatedUserSetup(user: User) {
  const profile = await supabase
    .from('profiles')
    .select('id, email, display_name, currency')
    .eq('id', user.id)
    .maybeSingle();

  if (profile.error) {
    throw profile.error;
  }

  if (!profile.data) {
    throw new Error('Authenticated profile is missing. Apply the server-side profile bootstrap migration.');
  }

  const db = await initializeDatabase();
  const timestamp = nowIso();

  await db.runAsync(
    `insert into local_profiles (
      id,
      email,
      display_name,
      currency,
      created_at,
      updated_at,
      sync_status,
      synced_at
    ) values (?, ?, ?, ?, ?, ?, 'synced', ?)
    on conflict(id) do update set
      email = excluded.email,
      display_name = excluded.display_name,
      currency = excluded.currency,
      updated_at = excluded.updated_at,
      sync_status = 'synced',
      synced_at = excluded.synced_at`,
    profile.data.id,
    profile.data.email ?? user.email ?? null,
    profile.data.display_name ?? null,
    profile.data.currency,
    timestamp,
    timestamp,
    timestamp
  );

  await seedDefaultCategories(db, user.id);

  syncLocalData(user.id).catch((error) => {
    logger.error('post-login sync failed', error);
  });
}
