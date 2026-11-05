import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { initGlobalUploadUrlResolver } from './utils/fileUploader';
import './index.css';

// Initialize automatic /uploads/ image resolver for static hosting & instant previews
initGlobalUploadUrlResolver();

// Safely suppress benign ResizeObserver loop notifications
window.addEventListener('error', (e) => {
  if (
    typeof e.message === 'string' &&
    (e.message.includes('ResizeObserver loop completed with undelivered notifications') ||
     e.message.includes('ResizeObserver loop limit exceeded'))
  ) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
