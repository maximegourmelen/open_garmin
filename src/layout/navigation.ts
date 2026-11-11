import {
  Activity,
  BookOpen,
  HeartPulse,
  LayoutDashboard,
  Settings,
  TrendingUp,
} from 'lucide-react';

export const primaryNav = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/activities', label: 'Activities', icon: Activity },
  { path: '/health/sleep', label: 'Health', icon: HeartPulse },
  { path: '/trends', label: 'Trends', icon: TrendingUp },
] as const;

export const secondaryNav = [
  { path: '/guide', label: 'Guide', icon: BookOpen },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

export function destination(pathname: string): string {
  if (pathname.startsWith('/activities')) return 'Activities';
  if (pathname.startsWith('/health')) return 'Health';
  if (pathname.startsWith('/trends')) return 'Trends';
  if (pathname.startsWith('/guide')) return 'Guide';
  if (pathname.startsWith('/settings')) return 'Settings';
  return 'Overview';
}
