
import { createClient } from '@supabase/supabase-js';

/**
 * Recuperador de variables de entorno con resiliencia extrema.
 * Protege contra errores de 'undefined' en import.meta.env.
 */
const getEnvVar = (key: string): string => {
  const viteKey = `VITE_${key}`;
  
  // 1. Probar en window.process.env (Donde nuestro puente inyecta las cosas)
  if (typeof window !== 'undefined' && (window as any).process?.env) {
    const val = (window as any).process.env[viteKey] || (window as any).process.env[key];
    if (val) return val;
  }

  // 2. Probar en import.meta.env de forma segura
  try {
    const meta = (import.meta as any);
    if (meta && meta.env && meta.env[viteKey]) {
      return meta.env[viteKey];
    }
  } catch (e) {
    // Ignorar errores de acceso a import.meta
  }

  // 3. Probar en process.env tradicional
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[viteKey] || process.env[key] || '';
    }
  } catch (e) {
    // Ignorar
  }
  
  return '';
};

const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

export const isConfigured = !!supabaseUrl && !!supabaseAnonKey && !supabaseUrl.includes('placeholder');

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);
