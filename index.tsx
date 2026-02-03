
import React from 'react';
import ReactDOM from 'react-dom/client';

/**
 * PUENTE DE SEGURIDAD PARA VARIABLES DE ENTORNO
 * Vite requiere que las variables se escriban de forma literal 
 * (import.meta.env.NOMBRE) para que se inyecten durante el build de Vercel.
 */
if (typeof window !== 'undefined') {
  // Inicializamos el objeto global process.env
  (window as any).process = (window as any).process || { env: {} };
  const env = (window as any).process.env;

  // Fix: Cast import.meta to any to suppress "Property 'env' does not exist" errors in TypeScript
  env.VITE_API_KEY = (import.meta as any).env.VITE_API_KEY;
  env.VITE_SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
  env.VITE_SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

  // Creamos los alias que usa la aplicación y el SDK
  env.API_KEY = env.VITE_API_KEY;
  env.SUPABASE_URL = env.VITE_SUPABASE_URL;
  env.SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

  console.log("Fresco Core: Variables inyectadas.");
}

import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
