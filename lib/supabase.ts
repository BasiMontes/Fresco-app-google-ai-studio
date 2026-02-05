
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  const env = (import.meta as any).env;
  if (env && env[key]) return env[key];
  if (typeof window !== 'undefined' && (window as any).process?.env) {
    return (window as any).process.env[key] || '';
  }
  return '';
};

// Intentamos primero con el prefijo VITE_ que es el estándar
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');

export const isConfigured = !!supabaseUrl && !!supabaseAnonKey && !supabaseUrl.includes('placeholder');

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);
