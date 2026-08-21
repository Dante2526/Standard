import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import MigrationBanner from './components/MigrationBanner';
import './index.css';

const isLegacyDomain = window.location.hostname.includes('vercel.app');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isLegacyDomain ? <MigrationBanner /> : <App />}
  </StrictMode>,
);
