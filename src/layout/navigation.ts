import { BookOpen, HeartPulse, ListChecks, Map, Settings, Sun, TrendingUp } from 'lucide-react';

export const primaryNav = [
  { path: '/', label: 'Today', icon: Sun },
  { path: '/activities', label: 'Activities', icon: ListChecks },
  { path: '/journey', label: 'Journey', icon: Map },
  { path: '/health', label: 'Health', icon: HeartPulse },
  { path: '/progress', label: 'Progress', icon: TrendingUp },
] as const;

export const secondaryNav = [
  { path: '/methods', label: 'How it works', icon: BookOpen },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;
