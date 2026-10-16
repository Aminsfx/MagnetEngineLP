import {
  LayoutDashboard,
  Users,
  Database,
  Inbox as InboxIcon,
  CalendarClock,
  Settings,
  UserCircle,
} from 'lucide-react';

/**
 * The dashboard's pages, declared once.
 *
 * Three modules need this list and used to each carry their own copy: the
 * route guard in `App.tsx` (which paths belong to the shell rather than the
 * public 404), the nav in `Sidebar.tsx`, and the `<Routes>` in
 * `DashboardShell.tsx`. Adding `/inbox` to two of the three is what shipped
 * commit ef5787b — a page that 404'd because the guard hadn't heard of it.
 *
 * `DashboardPath` is derived from this array, and `DashboardShell` keys its
 * page elements by that type, so a route added here without an element (or an
 * element without a route) is a compile error rather than a runtime 404.
 */
export const DASHBOARD_ROUTES = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/campaign', label: 'Campaign Builder', icon: Users },
  { path: '/queue', label: 'Approval Queue', icon: Database },
  { path: '/inbox', label: 'Inbox', icon: InboxIcon },
  { path: '/follow-ups', label: 'Follow-ups', icon: CalendarClock },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/profile', label: 'Profile', icon: UserCircle },
] as const;

export type DashboardPath = (typeof DASHBOARD_ROUTES)[number]['path'];

/**
 * The switch that hides the Inbox. It was on from 2026-10-14 while Instagram's
 * move to a GraphQL inbox left the extension unable to read replies; the
 * extension's reader was rebuilt for it (extension/igpage.js + igparse.js).
 * Set it to `true` again to hide the Inbox without deleting anything: the
 * route then redirects to /dashboard, and the nav item, onboarding step,
 * "to answer" counts, the AI Reply Assistant settings and autopilot all stand
 * down.
 */
export const INBOX_PAUSED = false;

/**
 * `npm run demo` shows the Inbox over sample conversations (src/lib/inboxDemo.ts)
 * even while it is paused, so its triage and copilot can be seen. Nothing in
 * the demo is sent or saved.
 */
export const INBOX_DEMO = import.meta.env.VITE_INBOX_DEMO === 'true';

/** Whether the Inbox is out of the nav and its route redirects. */
export const INBOX_HIDDEN = INBOX_PAUSED && !INBOX_DEMO;

/**
 * True when `pathname` is owned by the dashboard shell. Sub-paths count, so
 * `/queue/lead-1` stays inside the shell instead of falling through to the
 * public 404.
 */
export function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_ROUTES.some(
    (r) => pathname === r.path || pathname.startsWith(`${r.path}/`),
  );
}
