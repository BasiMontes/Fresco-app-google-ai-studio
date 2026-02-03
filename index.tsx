
import React from 'react';
import ReactDOM from 'react-dom/client';

// --- PUENTE DE SEGURIDAD PARA VITE / VERCEL ---
// Debe ejecutarse antes de cualquier otro import que pueda usar Gemini
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.process = window.process || { env: {} };
    // @ts-ignore
    window.process.env = window.process.env || {};
    
    // Capturamos la variable de Vite y la inyectamos en el objeto que espera el SDK
    // @ts-ignore
    const viteKey = import.meta.env?.VITE_API_KEY;
    if (viteKey) {
        // @ts-ignore
        window.process.env.API_KEY = viteKey;
        console.debug("Fresco: API_KEY vinculada desde VITE_ env.");
    }
}

// Ahora importamos el resto de la app
import App from './App';

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Fresco Error: No se pudo encontrar el elemento #root en el DOM.");
}
