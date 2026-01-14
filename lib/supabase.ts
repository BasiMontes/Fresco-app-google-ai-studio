
import { createClient } from '@supabase/supabase-js';

// Helper para leer variables de entorno en distintos bundlers (Vite, Next.js, CRA)
const getEnvVar = (key: string) => {
  // 1. Probar en window.process.env (Donde inyectamos manualmente en index.html)
  if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
      return (window as any).process.env[key];
  }
  
  // 2. Probar en import.meta.env (Vite)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  
  // 3. Probar en process.env (Node/Standard/Next.js)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  
  return '';
};

// Intentamos leer del .env
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

// Validación estricta: Solo está configurado si hay URL y Key reales (no placeholders)
export const isConfigured = !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'PON_AQUI_TU_URL_DE_SUPABASE';

if (!isConfigured && typeof window !== 'undefined') {
    console.error('⚠️ FRESCO ERROR: No se ha detectado la configuración de Supabase. Verifica tus variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
}

// Cliente Singleton
// Usamos placeholders si no hay config para evitar crashes al importar, pero isConfigured impedirá el uso de la app
export const supabase = createClient(
    supabaseUrl || 'https://placeholder-url.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);
