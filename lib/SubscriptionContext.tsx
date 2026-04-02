import React, { createContext, useContext, useState } from 'react';

const SubscriptionContext = createContext({
  isPro: false,
  setIsPro: (value: boolean) => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isPro, setIsPro] = useState(false); // Default to not paid

  return (
    <SubscriptionContext.Provider value={{ isPro, setIsPro }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
