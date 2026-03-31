import React from 'react';
import ReactDOM from 'react-dom/client';
import { HeroUIProvider } from '@heroui/react';
import App from './App';
import './index.css';

const applyTheme = () => {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', isDark);
};

applyTheme();
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', applyTheme);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HeroUIProvider>
      <main className="h-screen w-screen bg-background text-foreground">
        <App />
      </main>
    </HeroUIProvider>
  </React.StrictMode>
);

// Remove the HTML splash screen now that React has mounted
document.getElementById('splash')?.remove();
