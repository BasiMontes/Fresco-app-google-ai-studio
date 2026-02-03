
import React from 'react';
import ReactDOM from 'react-dom/client';

// Puente de emergencia para Vite -> process.env
// @ts-ignore
const vKey = import.meta.env.VITE_API_KEY;

if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: {} };
  (window as any).process.env = (window as any).process.env || {};
  
  if (vKey) {
    (window as any).process.env.API_KEY = vKey;
    console.log("Fresco: API_KEY bridged to process.env");
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
