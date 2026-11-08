import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Pip } from '../components/companion';
import { BottomTabBar } from '../layout/BottomTabBar';
import { CommandPalette } from '../layout/CommandPalette';
import { SideNav } from '../layout/SideNav';
import { TopBar } from '../layout/TopBar';
import GalleryPage from '../gallery';

function Placeholder({ title }: { title: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center gap-4 text-center">
      <Pip pose="thinking" size={140} />
      <h2 className="text-2xl font-bold text-text">{title}</h2>
      <p className="max-w-md text-sm text-text-2">
        Your {title.toLowerCase()} view is being prepared.
      </p>
    </div>
  );
}

export default function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
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
      <SideNav />
      <div className="min-w-0 flex-1">
        <TopBar onSearch={() => setSearchOpen(true)} />
        <main id="main-content" className="px-4 pb-24 pt-6 md:px-8 md:pb-8">
          <Routes>
            <Route path="/" element={<Placeholder title="Today" />} />
            <Route path="/activities" element={<Placeholder title="Activities" />} />
            <Route
              path="/activities/compare"
              element={<Placeholder title="Compare activities" />}
            />
            <Route path="/activities/:id" element={<Placeholder title="Activity details" />} />
            <Route path="/journey" element={<Placeholder title="Journey" />} />
            <Route path="/health" element={<Placeholder title="Health" />} />
            {['sleep', 'heart', 'energy', 'stress', 'steps'].map((page) => (
              <Route
                key={page}
                path={`/health/${page}`}
                element={<Placeholder title={page[0].toUpperCase() + page.slice(1)} />}
              />
            ))}
            <Route path="/progress" element={<Placeholder title="Progress" />} />
            <Route path="/methods" element={<Placeholder title="How it works" />} />
            <Route path="/settings" element={<Placeholder title="Settings" />} />
            <Route path="/welcome" element={<Placeholder title="Welcome" />} />
            {import.meta.env.DEV && <Route path="/__gallery" element={<GalleryPage />} />}
            <Route path="/today" element={<Navigate to="/" replace />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/training" element={<Navigate to="/progress" replace />} />
            <Route path="/recovery" element={<Navigate to="/health" replace />} />
            <Route path="/insights" element={<Navigate to="/progress" replace />} />
            <Route path="/research" element={<Navigate to="/methods" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <BottomTabBar />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
