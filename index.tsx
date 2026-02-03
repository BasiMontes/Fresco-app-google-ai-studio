
import React from 'react';
import ReactDOM from 'react-dom/client';

/**
 * PUENTE DE SEGURIDAD EXPLICITO
 * Vite requiere referencias literales para inyectar variables en producción.
 */
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: {} };
  const env = (window as any).process.env;

  // Mapeo explícito (Vite reemplaza estas cadenas en tiempo de compilación)
  const meta = (import.meta as any).env || {};
  
  env.VITE_SUPABASE_URL = meta.VITE_SUPABASE_URL;
  env.VITE_SUPABASE_ANON_KEY = meta.VITE_SUPABASE_ANON_KEY;
  env.VITE_API_KEY = meta.VITE_API_KEY;
  
  // Alias para mayor compatibilidad
  env.SUPABASE_URL = env.VITE_SUPABASE_URL;
  env.SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
  env.API_KEY = env.VITE_API_KEY;

  console.log("Fresco Core: Motor de entorno inicializado.");
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
