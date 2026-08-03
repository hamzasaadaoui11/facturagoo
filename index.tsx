import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './src/components/ErrorBoundary';

window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || (typeof event.reason === 'string' ? event.reason : '') || '';
  if (
    msg.includes('Refresh Token') ||
    msg.includes('Auth session missing') ||
    msg.includes('JWT') ||
    msg.includes('invalid_grant')
  ) {
    console.warn("Caught unhandled auth error:", msg);
    event.preventDefault();
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase.auth') || key.includes('sb-'))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error("Error clearing auth keys:", e);
    }
    if (!window.location.hash.includes('/login')) {
       window.location.hash = '#/login';
    }
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
