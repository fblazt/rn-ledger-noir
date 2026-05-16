import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const secureStorage = {
  async getItem(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key);
  },
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: false,
    persistSession: true,
    storage: secureStorage,
  },
});

