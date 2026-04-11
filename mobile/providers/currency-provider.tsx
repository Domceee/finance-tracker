import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './auth-provider';
import { getRates, updateCurrency as apiUpdateCurrency } from '../lib/api';

type CurrencyContextValue = {
  currency: string;
  setCurrency: (code: string) => Promise<void>;
  formatCurrency: (amountEur: number) => string;
  toEur: (amountInSelectedCurrency: number) => number;
  ratesLoading: boolean;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser, isAuthenticated } = useAuth();
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const fetchedRef = useRef(false);

  const currency = user?.currency ?? 'EUR';

  useEffect(() => {
    if (!isAuthenticated || fetchedRef.current) {
      return;
    }

    fetchedRef.current = true;
    setRatesLoading(true);

    getRates()
      .then((data) => setRates(data.rates))
      .catch(() => {
        // silent fail — amounts will display as EUR
      })
      .finally(() => setRatesLoading(false));
  }, [isAuthenticated]);

  async function setCurrency(code: string) {
    await apiUpdateCurrency(code);
    updateUser({ currency: code });
  }

  function toEur(amountInSelectedCurrency: number) {
    const rate = rates?.[currency] ?? 1;
    return amountInSelectedCurrency / rate;
  }

  function formatCurrency(amountEur: number) {
    const rate = rates?.[currency] ?? 1;
    const converted = amountEur * rate;

    try {
      return new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(converted);
    } catch {
      return `${currency} ${converted.toFixed(2)}`;
    }
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, toEur, ratesLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }

  return context;
}
