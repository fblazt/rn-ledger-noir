#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

loadDotEnv('.env.local');
loadDotEnv('.env');

const config = {
  anonKey: env('SUPABASE_ANON_KEY') ?? env('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  url: trimTrailingSlash(env('SUPABASE_URL') ?? env('EXPO_PUBLIC_SUPABASE_URL')),
  userA: {
    email: env('SUPABASE_TEST_USER_A_EMAIL'),
    password: env('SUPABASE_TEST_USER_A_PASSWORD'),
  },
  userB: {
    email: env('SUPABASE_TEST_USER_B_EMAIL'),
    password: env('SUPABASE_TEST_USER_B_PASSWORD'),
  },
};

validateConfig(config);

const runId = randomUUID();
const marker = `rls-${runId}`;
const results = [];
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64'
);

class RestError extends Error {
  constructor(status, payload) {
    super(`REST ${status}: ${formatPayload(payload)}`);
    this.status = status;
    this.payload = payload;
  }
}

class StorageError extends Error {
  constructor(status, payload) {
    super(`Storage ${status}: ${formatPayload(payload)}`);
    this.status = status;
    this.payload = payload;
  }
}

try {
  await signUp(config.userA.email, config.userA.password);
  await signUp(config.userB.email, config.userB.password);

  const userA = await signIn(config.userA.email, config.userA.password);
  const userB = await signIn(config.userB.email, config.userB.password);

  await check('user A has server-created profile and can update it', async () => {
    const profile = await getProfile(userA);
    assert(profile.id === userA.id, 'profile id should match user A id');
    assert(profile.currency === 'IDR', 'profile should use the default IDR currency');

    const updatedProfile = await updateProfileDisplayName(userA, `${marker}-a`);
    assert(updatedProfile.display_name === `${marker}-a`, 'profile display name should update');
  });

  await check('user B has server-created profile', async () => {
    const profile = await getProfile(userB);
    assert(profile.id === userB.id, 'profile id should match user B id');
  });

  await check('user B cannot read user A profile', async () => {
    const rows = await rest(userB, 'GET', `/profiles?id=eq.${userA.id}&select=*`);
    assert(Array.isArray(rows) && rows.length === 0, 'user B should see zero user A profile rows');
  });

  const categoryA = await check('user A can insert own category', async () => {
    const rows = await rest(userA, 'POST', '/categories', {
      body: {
        color: '#167044',
        icon: 'utensils',
        id: randomUUID(),
        is_default: false,
        name: `${marker}-food`,
        type: 'expense',
        user_id: userA.id,
      },
      prefer: 'return=representation',
    });

    assert(rows.length === 1, 'category insert should return one row');
    return rows[0];
  });

  await check('user B cannot read user A category', async () => {
    const rows = await rest(userB, 'GET', `/categories?id=eq.${categoryA.id}&select=*`);
    assert(rows.length === 0, 'user B should see zero user A category rows');
  });

  await check('user B cannot create transaction with user A category', async () => {
    await expectRestFailure(() =>
      rest(userB, 'POST', '/transactions', {
        body: {
          amount: 45000,
          category_id: categoryA.id,
          id: randomUUID(),
          note: marker,
          transaction_date: '2026-05-15',
          type: 'expense',
          user_id: userB.id,
        },
        prefer: 'return=representation',
      })
    );
  });

  const transactionA = await check('user A can insert own transaction', async () => {
    const rows = await rest(userA, 'POST', '/transactions', {
      body: {
        amount: 45000,
        category_id: categoryA.id,
        id: randomUUID(),
        note: marker,
        transaction_date: '2026-05-15',
        type: 'expense',
        user_id: userA.id,
      },
      prefer: 'return=representation',
    });

    assert(rows.length === 1, 'transaction insert should return one row');
    return rows[0];
  });

  await check('user B cannot read user A transaction', async () => {
    const rows = await rest(userB, 'GET', `/transactions?id=eq.${transactionA.id}&select=*`);
    assert(rows.length === 0, 'user B should see zero user A transaction rows');
  });

  await check('user A can insert own budget', async () => {
    const rows = await rest(userA, 'POST', '/budgets', {
      body: {
        category_id: categoryA.id,
        id: randomUUID(),
        limit_amount: 1500000,
        month: '2026-05',
        user_id: userA.id,
      },
      prefer: 'return=representation',
    });

    assert(rows.length === 1, 'budget insert should return one row');
  });

  await check('user B cannot create budget with user A category', async () => {
    await expectRestFailure(() =>
      rest(userB, 'POST', '/budgets', {
        body: {
          category_id: categoryA.id,
          id: randomUUID(),
          limit_amount: 500000,
          month: '2026-06',
          user_id: userB.id,
        },
        prefer: 'return=representation',
      })
    );
  });

  await check('user B cannot create attachment with user A transaction', async () => {
    await expectRestFailure(() =>
      rest(userB, 'POST', '/transaction_attachments', {
        body: {
          file_name: 'receipt.png',
          id: randomUUID(),
          mime_type: 'image/png',
          size: PNG_BYTES.length,
          storage_path: `${userB.id}/${transactionA.id}/${randomUUID()}.png`,
          transaction_id: transactionA.id,
          user_id: userB.id,
        },
        prefer: 'return=representation',
      })
    );
  });

  const receiptPath = `${userA.id}/${transactionA.id}/${randomUUID()}.png`;

  await check('user A can upload into own receipt folder', async () => {
    await storageUpload(userA, receiptPath, PNG_BYTES);
  });

  await check('user B cannot download user A receipt file', async () => {
    await expectStorageFailure(() => storageDownload(userB, receiptPath));
  });

  await check('user B cannot upload into user A receipt folder', async () => {
    await expectStorageFailure(() =>
      storageUpload(userB, `${userA.id}/${transactionA.id}/${randomUUID()}.png`, PNG_BYTES)
    );
  });

  await check('user A can create attachment metadata for own transaction', async () => {
    const rows = await rest(userA, 'POST', '/transaction_attachments', {
      body: {
        file_name: 'receipt.png',
        id: randomUUID(),
        mime_type: 'image/png',
        size: PNG_BYTES.length,
        storage_path: receiptPath,
        transaction_id: transactionA.id,
        user_id: userA.id,
      },
      prefer: 'return=representation',
    });

    assert(rows.length === 1, 'attachment insert should return one row');
  });

  printSummary();
} catch (error) {
  printSummary();
  console.error('\nValidation failed:', error.message);
  process.exitCode = 1;
}

async function signUp(email, password) {
  const response = await fetch(`${config.url}/auth/v1/signup`, {
    body: JSON.stringify({ email, password }),
    headers: jsonHeaders(),
    method: 'POST',
  });

  const payload = await parseResponse(response);

  if (!response.ok && !isAlreadyRegistered(payload)) {
    throw new Error(`Failed to sign up ${email}: ${formatPayload(payload)}`);
  }
}

async function signIn(email, password) {
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    body: JSON.stringify({ email, password }),
    headers: jsonHeaders(),
    method: 'POST',
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new Error(`Failed to sign in ${email}: ${formatPayload(payload)}`);
  }

  return {
    accessToken: payload.access_token,
    email,
    id: payload.user.id,
  };
}

async function getProfile(user) {
  const rows = await rest(user, 'GET', `/profiles?id=eq.${user.id}&select=*`);

  assert(rows.length === 1, 'server-side profile bootstrap should create one profile row');
  return rows[0];
}

async function updateProfileDisplayName(user, displayName) {
  const rows = await rest(user, 'PATCH', `/profiles?id=eq.${user.id}`, {
    body: {
      display_name: displayName,
    },
    prefer: 'return=representation',
  });

  assert(rows.length === 1, 'profile update should return one row');
  return rows[0];
}

async function rest(user, method, path, options = {}) {
  const response = await fetch(`${config.url}/rest/v1${path}`, {
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: {
      ...jsonHeaders(user),
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    method,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new RestError(response.status, payload);
  }

  return payload;
}

async function storageUpload(user, path, content) {
  const response = await fetch(`${config.url}/storage/v1/object/receipts/${path}`, {
    body: content,
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
      apikey: config.anonKey,
      'Content-Type': 'image/png',
      'x-upsert': 'false',
    },
    method: 'POST',
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new StorageError(response.status, payload);
  }

  return payload;
}

async function storageDownload(user, path) {
  const response = await fetch(`${config.url}/storage/v1/object/authenticated/receipts/${path}`, {
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
      apikey: config.anonKey,
    },
    method: 'GET',
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new StorageError(response.status, payload);
  }

  return payload;
}

async function expectRestFailure(operation) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof RestError) {
      return;
    }

    throw error;
  }

  throw new Error('expected REST operation to fail, but it succeeded');
}

async function expectStorageFailure(operation) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof StorageError) {
      return;
    }

    throw error;
  }

  throw new Error('expected Storage operation to fail, but it succeeded');
}

async function check(name, operation) {
  try {
    const value = await operation();
    results.push({ name, ok: true });
    console.log(`✓ ${name}`);
    return value;
  } catch (error) {
    results.push({ error, name, ok: false });
    console.error(`✗ ${name}`);
    throw error;
  }
}

function jsonHeaders(user) {
  return {
    Authorization: `Bearer ${user?.accessToken ?? config.anonKey}`,
    apikey: config.anonKey,
    'Content-Type': 'application/json',
  };
}

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isAlreadyRegistered(payload) {
  const value = formatPayload(payload).toLowerCase();

  return value.includes('already') || value.includes('registered') || value.includes('exists');
}

function printSummary() {
  const passed = results.filter((result) => result.ok).length;
  const failed = results.length - passed;

  console.log(`\nSupabase validation summary: ${passed} passed, ${failed} failed`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateConfig(value) {
  const missing = [];

  if (!value.url) missing.push('SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL');
  if (!value.anonKey) missing.push('SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (!value.userA.email) missing.push('SUPABASE_TEST_USER_A_EMAIL');
  if (!value.userA.password) missing.push('SUPABASE_TEST_USER_A_PASSWORD');
  if (!value.userB.email) missing.push('SUPABASE_TEST_USER_B_EMAIL');
  if (!value.userB.password) missing.push('SUPABASE_TEST_USER_B_PASSWORD');

  if (missing.length > 0) {
    throw new Error(`Missing required env vars:\n- ${missing.join('\n- ')}`);
  }
}

function loadDotEnv(path) {
  if (!existsSync(path)) {
    return;
  }

  const lines = readFileSync(path, 'utf8').split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function env(name) {
  return process.env[name]?.trim() || undefined;
}

function trimTrailingSlash(value) {
  return value?.replace(/\/$/, '');
}

function formatPayload(payload) {
  return typeof payload === 'string' ? payload : JSON.stringify(payload);
}
