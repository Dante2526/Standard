import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import MigrationBanner from './components/MigrationBanner';
import './index.css';

const App = lazy(() => import('./App.tsx'));
const isLegacyDomain = window.location.hostname.includes('vercel.app');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isLegacyDomain ? (
      <MigrationBanner />
    ) : (
      <Suspense fallback={<div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}><div style={{ width: '40px', height: '40px', border: '3px solid rgba(37, 99, 235, 0.2)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>}>
        <App />
      </Suspense>
    )}
  </StrictMode>,
);
