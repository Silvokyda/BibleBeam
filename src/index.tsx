// src/index.tsx — Renderer entry point
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './renderer/styles/globals.css';
import { Operator } from './renderer/pages/Operator';
import { Projector } from './renderer/pages/Projector';
import { Settings } from './renderer/pages/Settings';

const bb = (window as any).biblebeam;

function App() {
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    // Load saved theme
    (async () => {
      const theme = await bb?.getTheme?.() || 'system';
      document.documentElement.setAttribute('data-theme', theme);
      setThemeReady(true);
    })();

    // Listen for theme changes
    const unsub = bb?.onThemeChanged?.((theme: string) => {
      document.documentElement.setAttribute('data-theme', theme);
    });
    return () => unsub?.();
  }, []);

  // Prevent flash of wrong theme
  if (!themeReady) {
    return <div style={{ background: 'var(--bg)', width: '100vw', height: '100vh' }} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/operator"  element={<Operator />} />
        <Route path="/projector" element={<Projector />} />
        <Route path="/settings"  element={<Settings />} />
        <Route path="*"          element={<Operator />} />
      </Routes>
    </HashRouter>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

createRoot(container).render(<App />);