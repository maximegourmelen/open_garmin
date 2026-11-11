import { useCallback, useState } from 'react';

export function useDemoBannerVisibility() {
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem('og_demo_banner_hidden') === 'true';
    } catch {
      return false;
    }
  });
  const hide = useCallback(() => {
    setHidden(true);
    try {
      sessionStorage.setItem('og_demo_banner_hidden', 'true');
    } catch {
      /* storage unavailable */
    }
  }, []);
  return { hidden, hide };
}
