import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { LoadedDatabase } from '../types';

interface AppContextType {
  databases: LoadedDatabase[];
  selectedFilters: Record<string, string[]>;
  theme: 'light' | 'dark';
  isLoading: boolean;
  setDatabases: (dbs: LoadedDatabase[]) => void;
  setSelectedFilters: (filters: Record<string, string[]>) => void;
  toggleTheme: () => void;
  setIsLoading: (loading: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [databases, setDatabases] = useState<LoadedDatabase[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isLoading, setIsLoading] = useState(false);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  return (
    <AppContext.Provider value={{
      databases,
      selectedFilters,
      theme,
      isLoading,
      setDatabases,
      setSelectedFilters,
      toggleTheme,
      setIsLoading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
