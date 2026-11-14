import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';

const h = vi.hoisted(() => ({ getSubscription: vi.fn() }));

vi.mock('./AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('../lib/db', () => ({ db: { getSubscription: h.getSubscription } }));

import { PlanProvider, usePlan } from './PlanContext';

const wrapper = ({ children }: { children: ReactNode }) => <PlanProvider>{children}</PlanProvider>;

// The regression: a subscription that could not be read was answered as
// 'pending', which sends a paying Operator to the checkout.
describe('a subscription that could not be read', () => {
  beforeEach(() => {
    h.getSubscription.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('is said to have failed, not to be unpaid', async () => {
    h.getSubscription.mockRejectedValue(new Error('[db] getSubscription: Failed to fetch'));

    const { result } = renderHook(() => usePlan(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.failed).toBe(true);
    expect(result.current.status).not.toBe('active');
  });

  it('opens up once a retry reads it', async () => {
    h.getSubscription.mockRejectedValueOnce(new Error('[db] getSubscription: Failed to fetch'));
    const { result } = renderHook(() => usePlan(), { wrapper });
    await waitFor(() => expect(result.current.failed).toBe(true));

    h.getSubscription.mockResolvedValue({ tier: 'starter', status: 'active', trialEndsAt: null });
    await act(() => result.current.refresh());

    expect(result.current).toMatchObject({ failed: false, status: 'active', loading: false });
  });
});
