import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { MetricId } from '../../content/glossary';
import { MetricDrawer } from './MetricDrawer';
import { MetricDrawerContext } from './metric-drawer-context';

export function MetricDrawerProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<MetricId | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const open = useCallback((id: MetricId) => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelected(id);
  }, []);
  const close = useCallback(() => {
    setSelected(null);
    setTimeout(() => {
      if (trigger.current?.isConnected) trigger.current.focus();
    }, 0);
  }, []);
  return (
    <MetricDrawerContext.Provider value={open}>
      {children}
      {selected && <MetricDrawer id={selected} onClose={close} onSelect={setSelected} />}
    </MetricDrawerContext.Provider>
  );
}
