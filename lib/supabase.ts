
import { createClient } from '@supabase/supabase-js';

// Helper ultra-robusto para leer variables de entorno
const getEnvVar = (key: string) => {
  // 1. Probar en process.env (Standard/Vite/Browser-shim)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  
  // 2. Probar en window.process.env (Donde inyectamos manualmente)
  if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
      return (window as any).process.env[key];
  }
  
  // 3. Probar en import.meta.env (Vite nativo)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  
  return '';
};

// Vercel/Vite exponen automáticamente VITE_... al cliente
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('NEXT_PUBLIC_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY');

export const isConfigured = !!supabaseUrl && !!supabaseAnonKey && !supabaseUrl.includes('placeholder');

if (!isConfigured && typeof window !== 'undefined') {
    console.warn('⚠️ FRESCO: Configuración de Supabase no detectada o incompleta. Asegúrate de configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel.');
}

// Cliente Singleton
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);
