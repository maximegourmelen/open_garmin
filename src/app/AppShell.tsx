import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomTabBar } from '../layout/BottomTabBar';
import { CommandPalette } from '../layout/CommandPalette';
import { SideNav } from '../layout/SideNav';
import { TopBar } from '../layout/TopBar';
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
  const location = useLocation();
  const preferences = usePreferences();
  const welcome = location.pathname === '/welcome';
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
      {!welcome && <SideNav />}
      <div className="min-w-0 flex-1">
        {!welcome && <TopBar onSearch={() => setSearchOpen(true)} />}
        <main id="main-content" className="px-4 pb-24 pt-6 md:px-8 md:pb-8">
          {preferences.data?.onboarded === false && !welcome ? (
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
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/welcome" element={<OnboardingPage />} />
                {import.meta.env.DEV && <Route path="/__gallery" element={<GalleryPage />} />}
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
      {!welcome && <BottomTabBar />}
      {!welcome && <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
