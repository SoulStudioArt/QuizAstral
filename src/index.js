import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Ceci est le composant qui charge Tailwind CSS via un CDN.
const TailwindScript = () => (
    <script src="https://cdn.tailwindcss.com"></script>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* On ajoute le script de Tailwind ici */}
    <TailwindScript />
    <App />
  </React.StrictMode>
);

reportWebVitals();