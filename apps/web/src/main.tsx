import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import './styles/global.css';
import './styles/app.css';

const raiz = document.getElementById('raiz');
if (raiz === null) {
  throw new Error('Elemento #raiz não encontrado no index.html.');
}

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
