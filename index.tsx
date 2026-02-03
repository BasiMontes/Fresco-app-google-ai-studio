
import React from 'react';
import ReactDOM from 'react-dom/client';

/**
 * PUENTE DE SEGURIDAD PARA VARIABLES DE ENTORNO
 * Este bloque asegura que process.env esté disponible en el navegador
 * y mapea las variables de Vite de forma segura.
 */
if (typeof window !== 'undefined') {
  // Aseguramos que el objeto process.env exista
  (window as any).process = (window as any).process || { env: {} };
  (window as any).process.env = (window as any).process.env || {};

  try {
    // Acceso defensivo a import.meta.env
    const metaEnv = (import.meta as any).env;
    if (metaEnv) {
      if (metaEnv.VITE_API_KEY) {
        (window as any).process.env.API_KEY = metaEnv.VITE_API_KEY;
      }
      // Log de diagnóstico silencioso
      console.log("Fresco: Variables de entorno sincronizadas.");
    }
  } catch (e) {
    console.warn("Fresco: No se pudo acceder a import.meta.env, usando respaldo global.");
  }
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
