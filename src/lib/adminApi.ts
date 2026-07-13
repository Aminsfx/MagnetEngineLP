/**
 * Client for the owner-only admin-api Edge Function.
 * Auth: the caller's Supabase session JWT — the function itself verifies the
 * email against its server-side ADMIN_EMAILS secret.
 */
import type { Session } from '@supabase/supabase-js';

export interface AdminOverview {
    totalUsers: number;
    subscriptions: { active: number; pending: number; cancelled: number };
    estMRR: number;
    dmsThisMonth: number;
}

export interface AdminUserRow {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
    lastSignInAt: string | null;
    status: 'pending' | 'active' | 'cancelled' | string;
    plan: string | null;
}

export interface AdminUsersResponse {
    users: AdminUserRow[];
    page: number;
    perPage: number;
    hasMore: boolean;
}

type AdminRequest =
    | { action: 'overview' }
    | { action: 'users'; page?: number; perPage?: number }
    | { action: 'activate'; email: string }
    | { action: 'revoke'; email: string };

export async function callAdminApi<T>(session: Session, body: AdminRequest): Promise<T> {
    const base = import.meta.env.VITE_SUPABASE_URL as string;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    const res = await fetch(`${base}/functions/v1/admin-api`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: anon,
        },
        body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
    }
    return data as T;
}
