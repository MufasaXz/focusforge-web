import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
const path = window.location.pathname.replace(/\/$/, '') || '/';
const root = document.getElementById('root')!;
if (root.hasChildNodes()) hydrateRoot(root, <React.StrictMode><App path={path}/></React.StrictMode>);
else createRoot(root).render(<React.StrictMode><App path={path}/></React.StrictMode>);
