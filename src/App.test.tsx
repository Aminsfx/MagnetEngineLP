/**
 * The paid gate in front of the dashboard.
 *
 * The regression: a subscription that could not be READ was answered as
 * 'pending', so a paying Operator whose connection dropped as the page opened
 * was sent to /activate, which is the checkout, and asked to pay again.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({
  plan: { status: 'pending' as 'pending' | 'active' | 'cancelled', loading: false, failed: false, refresh: vi.fn() },
}));

vi.mock('./contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'gate@test.dev' }, loading: false }),
}));
vi.mock('./contexts/PlanContext', () => ({ usePlan: () => h.plan }));
vi.mock('./pages/DashboardShell', () => ({ default: () => <p>the dashboard</p> }));
vi.mock('./pages/PendingActivationPage', () => ({ default: () => <p>the checkout</p> }));

import App from './App';

const mount = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('the paid gate', () => {
  beforeEach(() => {
    h.plan = { status: 'pending', loading: false, failed: false, refresh: vi.fn() };
  });

  it('does not send an Operator to the checkout when their plan could not be read', async () => {
    h.plan.failed = true;
    mount('/dashboard');

    expect(await screen.findByRole('heading', { name: /couldn.t confirm your plan/i })).toBeInTheDocument();
    expect(screen.queryByText('the checkout')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(h.plan.refresh).toHaveBeenCalledTimes(1);
  });

  it('still sends an account that has not paid to the checkout', async () => {
    mount('/dashboard');

    expect(await screen.findByText('the checkout')).toBeInTheDocument();
  });

  it('opens the dashboard for an active plan', async () => {
    h.plan.status = 'active';
    mount('/dashboard');

    expect(await screen.findByText('the dashboard')).toBeInTheDocument();
  });
});
