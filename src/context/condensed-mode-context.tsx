
"use client";

import React, { createContext, useState, useMemo, useContext } from 'react';

type CondensedModeContextType = {
  isCondensed: boolean;
  toggleCondensedMode: () => void;
};

export const CondensedModeContext = createContext<CondensedModeContextType>({
  isCondensed: false,
  toggleCondensedMode: () => {},
});

export const CondensedModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isCondensed, setIsCondensed] = useState(false);

  const toggleCondensedMode = () => {
    setIsCondensed(prev => !prev);
  };

  const value = useMemo(() => ({
    isCondensed,
    toggleCondensedMode,
  }), [isCondensed]);

  return (
    <CondensedModeContext.Provider value={value}>
      {children}
    </CondensedModeContext.Provider>
  );
};

export const useCondensedMode = () => {
    const context = useContext(CondensedModeContext);
    if (!context) {
        throw new Error('useCondensedMode must be used within a CondensedModeProvider');
    }
    return context;
}

    