import { createContext, useCallback, useContext, useState } from 'react';
import { ConfirmDialog, type ConfirmOptions } from '../components/confirm-dialog';

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

type PendingConfirm = {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
};

const ConfirmContext = createContext<Confirm | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<Confirm>(
    (options) => new Promise<boolean>((resolve) => setPending({ options, resolve })),
    [],
  );

  function close(confirmed: boolean) {
    pending?.resolve(confirmed);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        options={pending?.options ?? null}
        onCancel={() => close(false)}
        onConfirm={() => close(true)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }

  return context;
}
