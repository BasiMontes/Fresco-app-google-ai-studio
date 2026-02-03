
import React from 'react';
import ReactDOM from 'react-dom/client';

/**
 * PUENTE DE SEGURIDAD PARA VARIABLES DE ENTORNO
 * Aseguramos que process.env esté disponible y poblado.
 */
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: {} };
  const env = (window as any).process.env;
  const meta = (import.meta as any).env || {};

  // Solo asignamos si la variable está vacía para no pisar inyecciones nativas
  if (!env.API_KEY) env.API_KEY = meta.VITE_API_KEY || meta.API_KEY;
  if (!env.SUPABASE_URL) env.SUPABASE_URL = meta.VITE_SUPABASE_URL || meta.SUPABASE_URL;
  if (!env.SUPABASE_ANON_KEY) env.SUPABASE_ANON_KEY = meta.VITE_SUPABASE_ANON_KEY || meta.SUPABASE_ANON_KEY;

  console.log("Fresco Core: Puente de entorno verificado.");
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
