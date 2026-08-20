// main.tsx — NON-BLOCKING STARTUP
import { createRoot } from 'react-dom/client';

import {
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';

import App from './App.tsx';
import { auth } from './lib/firebase';

import './index.css';

/*
 * Do not make first paint wait for setPersistence().
 *
 * Firebase Web already supports local persistence;
 * this call remains as an explicit guarantee for the
 * iPhone Home Screen app, but it now runs in parallel.
 */
void setPersistence(
  auth,
  browserLocalPersistence
).catch((error) => {
  console.warn(
    'Unable to enable persistent Firebase auth:',
    error
  );
});

/*
 * Intentionally no StrictMode here.
 *
 * In development/AI Studio, StrictMode can mount effects twice.
 * This app opens several Firestore listeners and device-sync effects,
 * so removing it makes preview/startup behavior much closer to production.
 */
createRoot(
  document.getElementById('root')!
).render(<App />);