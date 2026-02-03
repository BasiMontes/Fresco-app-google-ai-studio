
import { createClient } from '@supabase/supabase-js';

/**
 * Recuperador de variables con máxima prioridad a import.meta.env
 * que es el estándar de Vite para inyección en producción.
 */
const getVar = (key: string): string => {
  const meta = (import.meta as any).env || {};
  const viteKey = `VITE_${key}`;
  
  // 1. Intentar meta directo (mejor para producción)
  if (meta[viteKey]) return meta[viteKey];
  if (meta[key]) return meta[key];
  
  // 2. Intentar puente global
  if (typeof window !== 'undefined' && (window as any).process?.env) {
    const pEnv = (window as any).process.env;
    return pEnv[viteKey] || pEnv[key] || '';
  }
  
  return '';
};

const supabaseUrl = getVar('SUPABASE_URL');
const supabaseAnonKey = getVar('SUPABASE_ANON_KEY');

export const isConfigured = !!supabaseUrl && !!supabaseAnonKey && !supabaseUrl.includes('placeholder');

// Inicialización del cliente
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);
