import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import Converter from './Converter';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Converter />
  </StrictMode>,
);
