import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress Talisman extension errors that might be caught by the environment
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    if (message.includes('Talisman extension')) {
      return;
    }
    originalError.apply(console, args);
  };

  window.addEventListener('error', (event) => {
    if (event.message?.includes('Talisman extension')) {
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.toString().includes('Talisman extension')) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
