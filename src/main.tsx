import React from 'react';
import ReactDOM from 'react-dom/client';
// Self-hosted шрифти (Fontsource): жодних зовнішніх запитів до Google.
// Важкі підмножини (грек, вʼєт…) не вантажаться — unicode-range у CSS.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/unbounded/400.css';
import '@fontsource/unbounded/500.css';
import '@fontsource/unbounded/600.css';
import '@fontsource/unbounded/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import App from './App';
import { LangProvider } from './i18n/lang';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </React.StrictMode>,
);
