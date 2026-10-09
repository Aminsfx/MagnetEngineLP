import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { inject as injectAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { initAnalytics, registerSuper } from './src/lib/analytics';
import { landingVariant } from './src/lib/landingVariant';
import { AuthProvider } from './src/contexts/AuthContext';
import { PlanProvider } from './src/contexts/PlanContext';
import { ToastProvider } from './src/components/common/Toast';
import App from './src/App';

injectAnalytics();
injectSpeedInsights();
initAnalytics();
// The A/B landing page this browser first saw rides on every Mixpanel event,
// including after a sign-out reset, not only on visits that pass a landing page.
const firstVariant = landingVariant();
if (firstVariant) registerSuper({ landing_variant: firstVariant });

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

