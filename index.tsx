import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './src/components/ErrorBoundary';

window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || '';
  if (msg.includes('Refresh Token Not Found') || msg.includes('Auth session missing') || msg.includes('JWT')) {
    console.warn("Caught unhandled auth error:", msg);
    event.preventDefault();
    localStorage.removeItem('supabase.auth.token');
    if (!window.location.hash.includes('/login')) {
       window.location.hash = '/login';
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
