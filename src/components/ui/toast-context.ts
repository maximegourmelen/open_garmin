import { createContext, useContext } from 'react';

export type ToastOptions = { message: string; action?: { label: string; onClick: () => void } };
export const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('ToastProvider is missing');
  return show;
}
