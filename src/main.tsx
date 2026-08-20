import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';

import App from './App.tsx';
import { auth } from './lib/firebase';
import './index.css';

async function bootstrapApp() {
  /*
   * Explicitly keep Firebase login on this device until the user signs out.
   * This is especially important for iPhone Home Screen / standalone mode.
   */
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    // Do not block the whole app if iOS temporarily refuses browser storage.
    console.warn('Unable to enable persistent Firebase auth:', error);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrapApp();