
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Puente de seguridad para entornos de producción (Vercel/Vite)
// Vite requiere el prefijo VITE_ para exponer variables al cliente
if (typeof window !== 'undefined') {
    // Definimos process en el objeto window para que coincida con la expectativa de process.env en el resto de la app.
    // Usamos casting a 'any' para evitar que TypeScript se queje de que 'process' no existe en el tipo Window estándar.
    (window as any).process = (window as any).process || {};
    (window as any).process.env = (window as any).process.env || {};
    
    // @ts-ignore - Vite inyecta variables en import.meta.env
    const viteKey = (import.meta as any).env?.VITE_API_KEY;
    if (viteKey) {
        (window as any).process.env.API_KEY = viteKey;
    }
}

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
