
import React from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
}

export const ModalPortal: React.FC<ModalPortalProps> = ({ children }) => {
  // Verificamos que estemos en el cliente
  if (typeof document === 'undefined') return null;
  
  return createPortal(
    children,
    document.body
  );
};
