import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Nous allons injecter le script de Tailwind directement ici pour garantir son chargement.
const TailwindScript = () => (
    <script src="https://cdn.tailwindcss.com"></script>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <TailwindScript />
    <App />
  </React.StrictMode>
);

reportWebVitals();
