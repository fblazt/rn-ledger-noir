import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SECURE_STORE_CHUNK_SIZE = 1800;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

type ChunkMetadata = {
  chunks: number;
};

const secureStorage = {
  async getItem(key: string) {
    const directValue = await SecureStore.getItemAsync(key);

    if (!directValue) {
      return null;
    }

    const metadata = parseChunkMetadata(directValue);

    if (!metadata) {
      return directValue;
    }

    const chunks = await Promise.all(
      Array.from({ length: metadata.chunks }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index)))
    );

    if (chunks.some((chunk) => chunk === null)) {
      return null;
    }

    return chunks.join('');
  },
  async removeItem(key: string) {
    const directValue = await SecureStore.getItemAsync(key);
    const metadata = directValue ? parseChunkMetadata(directValue) : null;

    await SecureStore.deleteItemAsync(key);

    if (!metadata) {
      return;
    }

    await Promise.all(
      Array.from({ length: metadata.chunks }, (_, index) => SecureStore.deleteItemAsync(chunkKey(key, index)))
    );
  },
  async setItem(key: string, value: string) {
    if (value.length <= SECURE_STORE_CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    await this.removeItem(key);

    const chunks = splitIntoChunks(value, SECURE_STORE_CHUNK_SIZE);

    await Promise.all(
      chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk))
    );
    await SecureStore.setItemAsync(key, JSON.stringify({ chunks: chunks.length } satisfies ChunkMetadata));
  },
};

function chunkKey(key: string, index: number) {
  return `${key}.chunk.${index}`;
}

function parseChunkMetadata(value: string): ChunkMetadata | null {
  try {
    const parsed = JSON.parse(value) as Partial<ChunkMetadata>;

    if (typeof parsed.chunks === 'number' && Number.isInteger(parsed.chunks) && parsed.chunks > 0) {
      return { chunks: parsed.chunks };
    }
  } catch {
    return null;
  }

  return null;
}

function splitIntoChunks(value: string, size: number) {
  const chunks: string[] = [];

  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }

  return chunks;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: false,
    persistSession: true,
    storage: secureStorage,
  },
});
