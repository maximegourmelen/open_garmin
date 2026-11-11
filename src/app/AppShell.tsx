import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BottomTabBar } from '../layout/BottomTabBar';
import { CommandPalette } from '../layout/CommandPalette';
import { SideNav } from '../layout/SideNav';
import { MobileTopBar } from '../layout/MobileTopBar';
import { Dialog } from '../components/ui/Controls';
import { usePreferences } from '../lib/queries';

const GalleryPage = lazy(() => import('../gallery'));
const TodayPage = lazy(() => import('../pages/Today/TodayPage'));
const ActivitiesPage = lazy(() => import('../pages/Activities/ActivitiesPage'));
const ActivityDetailPage = lazy(() => import('../pages/ActivityDetail/ActivityDetailPage'));
const JourneyPage = lazy(() => import('../pages/Journey/JourneyPage'));
const HealthPage = lazy(() => import('../pages/Health/HealthPage'));
const ProgressPage = lazy(() => import('../pages/Progress/ProgressPage'));
const OnboardingPage = lazy(() => import('../pages/Onboarding/OnboardingPage'));
const SettingsPage = lazy(() => import('../pages/Settings/SettingsPage'));
const MethodsPage = lazy(() => import('../pages/Methods/MethodsPage'));

export default function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const preferences = usePreferences();
  const welcome = location.pathname === '/welcome';
  const gallery = import.meta.env.DEV && location.pathname === '/dev/components';
  useEffect(() => {
    if (preferences.data)
      document.documentElement.setAttribute(
        'data-reduce-motion',
        String(preferences.data.reduce_motion),
      );
  }, [preferences.data]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <div className="flex min-h-screen bg-bg text-text">
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:not-sr-only focus:rounded focus:bg-surface focus:p-3"
      >
        Skip to content
      </a>
      {!welcome && !gallery && (
        <SideNav onSearch={() => setSearchOpen(true)} onShortcuts={() => setShortcutsOpen(true)} />
      )}
      <div className="min-w-0 flex-1">
        {!welcome && !gallery && (
          <MobileTopBar onSearch={() => setSearchOpen(true)} onHelp={() => navigate('/guide')} />
        )}
        <main
          id="main-content"
          className={
            gallery ? '' : 'mx-auto max-w-[1120px] px-4 pb-24 pt-5 md:px-10 md:pb-12 md:pt-12'
          }
        >
          {preferences.data?.onboarded === false && !welcome && !gallery ? (
            <Navigate to="/welcome" replace />
          ) : (
            <Suspense fallback={<div role="status">Loading page…</div>}>
              <Routes>
                <Route path="/" element={<TodayPage />} />
                <Route path="/activities" element={<ActivitiesPage />} />
                <Route path="/activities/compare" element={<ActivitiesPage />} />
                <Route path="/activities/:id" element={<ActivityDetailPage />} />
                <Route path="/journey" element={<JourneyPage />} />
                <Route path="/health" element={<HealthPage />} />
                <Route path="/health/:tab" element={<HealthPage />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/methods" element={<MethodsPage />} />
                <Route path="/trends" element={<ProgressPage />} />
                <Route path="/trends/week/:weekStart" element={<ProgressPage />} />
                <Route path="/guide" element={<MethodsPage />} />
                <Route path="/guide/:topic" element={<MethodsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/welcome" element={<OnboardingPage />} />
                {import.meta.env.DEV && <Route path="/dev/components" element={<GalleryPage />} />}
                <Route path="/today" element={<Navigate to="/" replace />} />
                <Route path="/dashboard" element={<Navigate to="/" replace />} />
                <Route path="/training" element={<Navigate to="/progress" replace />} />
                <Route path="/recovery" element={<Navigate to="/health" replace />} />
                <Route path="/insights" element={<Navigate to="/progress" replace />} />
                <Route path="/research" element={<Navigate to="/methods" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          )}
        </main>
      </div>
      {!welcome && !gallery && <BottomTabBar onShortcuts={() => setShortcutsOpen(true)} />}
      {!welcome && !gallery && (
        <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      )}
      {!welcome && !gallery && (
        <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} title="Keyboard shortcuts">
          <p className="type-body text-text-2">
            ⌘K or Ctrl K opens search. Press Escape to close a dialog.
          </p>
        </Dialog>
      )}
    </div>
  );
}
