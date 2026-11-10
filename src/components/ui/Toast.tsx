import { Toast as RadixToast } from 'radix-ui';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContext } from './toast-context';
import type { ToastOptions } from './toast-context';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const show = useCallback((options: ToastOptions) => setToast(options), []);
  return (
    <ToastContext.Provider value={show}>
      <RadixToast.Provider duration={4000} swipeDirection="down">
        {children}
        <RadixToast.Root
          open={Boolean(toast)}
          onOpenChange={(open) => {
            if (!open) setToast(null);
          }}
          className="flex max-w-sm items-center gap-3 rounded-control bg-primary p-4 type-body text-on-primary shadow-lg dark:shadow-none"
        >
          <RadixToast.Title className="flex-1">{toast?.message}</RadixToast.Title>
          {toast?.action && (
            <RadixToast.Action altText={toast.action.label} asChild>
              <button
                type="button"
                className="font-medium underline"
                onClick={toast.action.onClick}
              >
                {toast.action.label}
              </button>
            </RadixToast.Action>
          )}
        </RadixToast.Root>
        <RadixToast.Viewport className="fixed inset-x-4 bottom-20 z-[70] flex flex-col gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
