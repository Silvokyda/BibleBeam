// src/index.tsx — Renderer entry point
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './renderer/styles/globals.css';
import { Operator } from './renderer/pages/Operator';
import { Projector } from './renderer/pages/Projector';
import { Settings } from './renderer/pages/Settings';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

const root = createRoot(container);

root.render(
  <HashRouter>
    <Routes>
      <Route path="/operator"  element={<Operator />} />
      <Route path="/projector" element={<Projector />} />
      <Route path="/settings"  element={<Settings />} />
      <Route path="*"          element={<Operator />} />
    </Routes>
  </HashRouter>
);
