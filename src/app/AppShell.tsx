import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BottomTabBar } from '../layout/BottomTabBar';
import { CommandPalette } from '../layout/CommandPalette';
import { SideNav } from '../layout/SideNav';
import { MobileTopBar } from '../layout/MobileTopBar';
import { ShortcutsDialog } from '../features/shortcuts/ShortcutsDialog';
import { useGlobalShortcuts } from '../features/shortcuts/useGlobalShortcuts';
import { useToast } from '../components/ui/toast-context';
import { usePreferences } from '../lib/queries';
import { useWorkspace } from './workspace-context';
import { useDemoBannerVisibility } from './useDemoBannerVisibility';
import { Banner, Tag } from '../components/ui/Structure';
import { MetricDrawerProvider } from '../features/metric-drawer/MetricDrawerProvider';
import { TourLauncher } from '../features/tour/TourLauncher';
import { PageHint } from '../features/guidance/PageHint';
import { WelcomeTourOffer } from '../features/guidance/WelcomeTourOffer';
import type { PageId } from '../content/pageIntros';

const GalleryPage = lazy(() => import('../gallery'));
const TodayPage = lazy(() => import('../pages/Today/TodayPage'));
const ActivitiesPage = lazy(() => import('../pages/Activities/ActivitiesPage'));
const CompareActivitiesPage = lazy(() => import('../pages/Activities/CompareActivities'));
const ActivityDetailPage = lazy(() => import('../pages/ActivityDetail/ActivityDetailPage'));
const HealthPage = lazy(() => import('../pages/Health/HealthPage'));
const ProgressPage = lazy(() => import('../pages/Progress/ProgressPage'));
const WelcomePage = lazy(() => import('../pages/Welcome/WelcomePage'));
const SettingsPage = lazy(() => import('../pages/Settings/SettingsPage'));
const GuidePage = lazy(() => import('../pages/Guide/GuidePage'));

function NotFoundRedirect() {
  const showToast = useToast();
  useEffect(() => showToast({ message: 'Page not found' }), [showToast]);
  return <Navigate to="/" replace />;
}

function pageId(path: string): PageId | null {
  if (path === '/') return 'overview';
  if (/^\/activities\/[^/]+$/.test(path) && path !== '/activities/compare') return 'activity';
  if (path.startsWith('/activities')) return 'activities';
  if (path.startsWith('/health/')) {
    const tab = path.split('/')[2];
    if (['sleep', 'heart', 'body-battery', 'stress', 'steps'].includes(tab))
      return `health-${tab}` as PageId;
  }
  if (path.startsWith('/trends')) return 'trends';
  if (path.startsWith('/guide')) return 'guide';
  if (path === '/settings') return 'settings';
  return null;
}

export default function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const preferences = usePreferences();
  const { mode } = useWorkspace();
  const { hidden: demoBannerHidden, hide: hideDemoBanner } = useDemoBannerVisibility();
  const welcome = location.pathname === '/welcome';
  const gallery = import.meta.env.DEV && location.pathname === '/dev/components';
  useEffect(() => {
    if (preferences.data)
      document.documentElement.setAttribute(
        'data-reduce-motion',
        String(preferences.data.reduce_motion),
      );
  }, [preferences.data]);
  useGlobalShortcuts({
    openSearch: () => setSearchOpen(true),
    openHelp: () => setShortcutsOpen(true),
    disabled: searchOpen || shortcutsOpen,
  });
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <MetricDrawerProvider>
      <div className="flex min-h-screen bg-bg text-text">
        <a
          href="#main-content"
          className="sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:not-sr-only focus:rounded focus:bg-surface focus:p-3"
        >
          Skip to content
        </a>
        {!welcome && !gallery && (
          <SideNav
            onSearch={() => setSearchOpen(true)}
            onShortcuts={() => setShortcutsOpen(true)}
          />
        )}
        <div className="min-w-0 flex-1">
          {!welcome && !gallery && (
            <MobileTopBar
              onSearch={() => setSearchOpen(true)}
              onHelp={() => navigate('/guide')}
              sample={mode === 'demo' && demoBannerHidden}
            />
          )}
          <main
            id="main-content"
            className={
              gallery ? '' : 'mx-auto max-w-[1120px] px-4 pb-24 pt-5 md:px-10 md:pb-12 md:pt-12'
            }
          >
            {mode === 'demo' &&
              !welcome &&
              !gallery &&
              (demoBannerHidden ? (
                <div className="mb-4 hidden justify-end md:flex">
                  <Tag>Sample data</Tag>
                </div>
              ) : (
                <div className="mb-6">
                  <Banner
                    action={
                      <div className="flex shrink-0 items-center gap-3">
                        <Link
                          to="/settings?section=connection"
                          className="font-medium text-accent hover:underline"
                        >
                          Connect
                        </Link>
                        <button
                          type="button"
                          onClick={hideDemoBanner}
                          className="text-text-2 hover:text-text"
                        >
                          Hide
                        </button>
                      </div>
                    }
                  >
                    You’re viewing sample data. Connect your Garmin to see your own.
                  </Banner>
                </div>
              ))}
            {!welcome && !gallery && preferences.data?.onboarded && (
              <div className="mb-5 space-y-3">
                {location.pathname === '/' && <WelcomeTourOffer />}
                {pageId(location.pathname) &&
                  !['guide', 'overview', 'activities'].includes(pageId(location.pathname)!) && (
                    <PageHint key={pageId(location.pathname)} id={pageId(location.pathname)!} />
                  )}
              </div>
            )}
            {preferences.data?.onboarded === false && !welcome && !gallery ? (
              <Navigate to="/welcome" replace />
            ) : (
              <Suspense fallback={<div role="status">Loading page…</div>}>
                <Routes>
                  <Route path="/" element={<TodayPage />} />
                  <Route path="/activities" element={<ActivitiesPage />} />
                  <Route path="/activities/compare" element={<CompareActivitiesPage />} />
                  <Route path="/activities/:id" element={<ActivityDetailPage />} />
                  {['sleep', 'heart', 'body-battery', 'stress', 'steps'].map((tab) => (
                    <Route key={tab} path={`/health/${tab}`} element={<HealthPage />} />
                  ))}
                  <Route path="/trends" element={<ProgressPage />} />
                  <Route path="/trends/week/:weekStart" element={<ProgressPage />} />
                  <Route path="/guide" element={<GuidePage />} />
                  <Route path="/guide/:topic" element={<GuidePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/welcome" element={<WelcomePage />} />
                  {import.meta.env.DEV && (
                    <Route path="/dev/components" element={<GalleryPage />} />
                  )}
                  <Route path="/today" element={<Navigate to="/" replace />} />
                  <Route path="/dashboard" element={<Navigate to="/" replace />} />
                  <Route path="/journey" element={<Navigate to="/trends" replace />} />
                  {['progress', 'training', 'insights'].map((path) => (
                    <Route
                      key={path}
                      path={`/${path}`}
                      element={<Navigate to="/trends" replace />}
                    />
                  ))}
                  <Route path="/health" element={<Navigate to="/health/sleep" replace />} />
                  <Route
                    path="/health/overview"
                    element={<Navigate to="/health/sleep" replace />}
                  />
                  <Route
                    path="/health/energy"
                    element={<Navigate to="/health/body-battery" replace />}
                  />
                  <Route path="/recovery" element={<Navigate to="/health/heart" replace />} />
                  <Route path="/methods" element={<Navigate to="/guide/methods" replace />} />
                  <Route path="/research" element={<Navigate to="/guide/research" replace />} />
                  <Route path="*" element={<NotFoundRedirect />} />
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
          <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
        )}
        {!welcome && !gallery && <TourLauncher />}
      </div>
    </MetricDrawerProvider>
  );
}
