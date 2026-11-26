import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { resolveCanonicalDomainRedirectUrl } from './services/seoService';

if (typeof window !== 'undefined') {
  const redirectTarget = resolveCanonicalDomainRedirectUrl(window.location);
  if (redirectTarget) {
    window.location.replace(redirectTarget);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
