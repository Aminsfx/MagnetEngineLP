import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AuthProvider } from './src/contexts/AuthContext';
import { PlanProvider } from './src/contexts/PlanContext';
import { ToastProvider } from './src/components/common/Toast';
import App from './src/App';

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
            <Analytics />
            <SpeedInsights />
          </ToastProvider>
        </PlanProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

