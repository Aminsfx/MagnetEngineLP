import {
  LayoutDashboard,
  Users,
  Database,
  Inbox as InboxIcon,
  CalendarClock,
  Calculator,
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
  { path: '/calculator', label: 'Calculator', icon: Calculator },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/profile', label: 'Profile', icon: UserCircle },
] as const;

export type DashboardPath = (typeof DASHBOARD_ROUTES)[number]['path'];

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
