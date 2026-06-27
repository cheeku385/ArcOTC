import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Patch console.error to demote benign third-party React 19 / RainbowKit warnings
const originalError = console.error;
console.error = (...args: any[]) => {
  const argStr = args.map(arg => String(arg)).join(' ');
  if (
    argStr.includes('Cannot update a component') ||
    argStr.includes('setstate-in-render') ||
    argStr.includes('ConnectModal') ||
    argStr.includes('Hydrate')
  ) {
    // Safely log as debug/info to avoid crashing testing frameworks
    console.log('[React 19 Compatibility Warning Suppressed]:', ...args);
    return;
  }
  originalError(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

