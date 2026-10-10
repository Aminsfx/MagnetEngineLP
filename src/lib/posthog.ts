import posthog from 'posthog-js';

type AnalyticsProperties = Record<string, string | number | boolean>;

const projectToken = import.meta.env.VITE_POSTHOG_KEY;
const apiHost = import.meta.env.VITE_POSTHOG_HOST;
// Vitest loads .env too; without this guard every test run would send events
// to the live project (and write PostHog's state into the tests' localStorage).
const configured = Boolean(projectToken && apiHost) && import.meta.env.MODE !== 'test';

if (configured && projectToken && apiHost) {
  posthog.init(projectToken, {
    api_host: apiHost,
    defaults: '2026-05-30',
    logs: {
      serviceName: 'magnetengine-web',
      environment: import.meta.env.MODE,
    },
  });

  posthog.logger.info('web_client_initialized', {
    event: 'web_client_initialized',
  });
} else if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
  if (!projectToken) {
    console.error('VITE_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_KEY is configured');
  }
  if (!apiHost) {
    console.error('VITE_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_HOST is configured');
  }
}

export function posthogCapture(event: string, properties?: AnalyticsProperties): void {
  if (configured) posthog.capture(event, properties);
}

export function posthogIdentify(distinctId: string, properties: Record<string, unknown>): void {
  if (configured) posthog.identify(distinctId, properties);
}

export function posthogReset(): void {
  if (configured) posthog.reset();
}

export const posthogLogs = {
  info(body: string, attributes: AnalyticsProperties) {
    if (configured) posthog.logger.info(body, attributes);
  },
};
