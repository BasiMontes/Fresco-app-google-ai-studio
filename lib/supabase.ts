
import { createClient } from '@supabase/supabase-js';

/**
 * Recuperador de variables de entorno con máxima resiliencia.
 * Prueba en cascada: Vite Meta -> Process Env -> Window Process
 */
const getEnvVar = (key: string): string => {
  const viteKey = `VITE_${key}`;
  
  // 1. Intentar Meta Env (Vite) de forma segura
  try {
    const meta = (import.meta as any).env;
    if (meta && meta[viteKey]) return meta[viteKey];
    if (meta && meta[key]) return meta[key];
  } catch (e) {}

  // 2. Intentar Process Env Global
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[viteKey]) return process.env[viteKey];
    if (process.env[key]) return process.env[key];
  }

  // 3. Intentar Shim de ventana
  if (typeof window !== 'undefined' && (window as any).process?.env) {
    const pEnv = (window as any).process.env;
    if (pEnv[viteKey]) return pEnv[viteKey];
    if (pEnv[key]) return pEnv[key];
  }
  
  return '';
};

const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

export const isConfigured = !!supabaseUrl && !!supabaseAnonKey && !supabaseUrl.includes('placeholder');

// Inicializamos el cliente. Si no hay claves, usará placeholders para no romper el JS.
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);
