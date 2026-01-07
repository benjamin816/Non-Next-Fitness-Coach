
import React, { createContext, useContext, useMemo } from 'react';
import { LocalIndexedDbProvider } from '../db/DexieStorage';
import { StorageProvider as IStorageProvider } from '../types';

const StorageContext = createContext<IStorageProvider | null>(null);

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (!context) throw new Error('useStorage must be used within StorageProvider');
  return context;
};

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const storage = useMemo(() => new LocalIndexedDbProvider(), []);

  return (
    <StorageContext.Provider value={storage}>
      {children}
    </StorageContext.Provider>
  );
};
