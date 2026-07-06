import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { AuthProvider } from './src/contexts/AuthContext';
import { PlanProvider } from './src/contexts/PlanContext';
import { ToastProvider } from './src/components/common/Toast';
import App from './src/App';

injectSpeedInsights();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PlanProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </PlanProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

