
import { createClient } from '@supabase/supabase-js';

// Helper robusto para leer variables de entorno en Vite/React
const getEnvVar = (key: string) => {
  // 1. Intentar con el prefijo VITE_ (Estándar de Vite para el cliente)
  const viteKey = `VITE_${key}`;
  
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[viteKey]) {
    // @ts-ignore
    return import.meta.env[viteKey];
  }

  // 2. Probar en process.env (Standard/Browser-shim)
  if (typeof process !== 'undefined' && process.env && (process.env[viteKey] || process.env[key])) {
    return process.env[viteKey] || process.env[key];
  }
  
  // 3. Probar en window.process.env
  if (typeof window !== 'undefined' && (window as any).process?.env) {
      return (window as any).process.env[viteKey] || (window as any).process.env[key];
  }
  
  return '';
};

// Mapeo directo de tus variables de .env
const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

export const isConfigured = !!supabaseUrl && !!supabaseAnonKey && !supabaseUrl.includes('placeholder');

if (!isConfigured && typeof window !== 'undefined') {
    console.warn('⚠️ FRESCO: Configuración de Supabase no detectada. Revisa tu archivo .env o las variables de entorno en tu hosting.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);
