
import React from 'react';
import ReactDOM from 'react-dom/client';

/**
 * PUENTE DE SEGURIDAD PARA VARIABLES DE ENTORNO
 * Evitamos el error "Cannot read properties of undefined (reading 'VITE_API_KEY')"
 * mediante una comprobación defensiva profunda.
 */
if (typeof window !== 'undefined') {
  // Inicializamos process.env si no existe
  (window as any).process = (window as any).process || { env: {} };
  (window as any).process.env = (window as any).process.env || {};

  try {
    // Acceso ultra-seguro a import.meta.env
    const meta = (import.meta as any);
    const vKey = meta && meta.env ? meta.env.VITE_API_KEY : undefined;
    
    if (vKey) {
      (window as any).process.env.API_KEY = vKey;
      console.log("Fresco: API_KEY vinculada exitosamente.");
    }
  } catch (e) {
    // Si import.meta no es accesible, no hacemos nada y dejamos que la app maneje el error de config más tarde
    console.warn("Fresco: No se pudo acceder a import.meta de forma nativa.");
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
