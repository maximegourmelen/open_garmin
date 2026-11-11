import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { MetricId } from '../../content/glossary';
import { MetricDrawer } from './MetricDrawer';
import { MetricDrawerContext } from './metric-drawer-context';

export function MetricDrawerProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<MetricId | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const afterClose = useRef<(() => void) | null>(null);
  const open = useCallback((id: MetricId, onClose?: () => void) => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    afterClose.current = onClose ?? null;
    setSelected(id);
  }, []);
  const close = useCallback(() => {
    setSelected(null);
    const callback = afterClose.current;
    afterClose.current = null;
    setTimeout(() => {
      if (trigger.current?.isConnected) trigger.current.focus();
      callback?.();
    }, 0);
  }, []);
  return (
    <MetricDrawerContext.Provider value={open}>
      {children}
      {selected && <MetricDrawer id={selected} onClose={close} onSelect={setSelected} />}
    </MetricDrawerContext.Provider>
  );
}
