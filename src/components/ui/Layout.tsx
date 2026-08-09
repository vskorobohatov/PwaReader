import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Navigation from './Navigation';

interface HeaderState {
  title: string;
  rightContent: ReactNode;
}

const HeaderContext = createContext<{
  setTitle: (title: string) => void;
  setRightContent: (content: ReactNode) => void;
  clearHeader: () => void;
}>({ setTitle: () => {}, setRightContent: () => {}, clearHeader: () => {} });

export function useHeader() {
  return useContext(HeaderContext);
}

export default function Layout() {
  const [headerState, setHeaderState] = useState<HeaderState>({
    title: '',
    rightContent: null,
  });

  const setTitle = useCallback((title: string) => {
    setHeaderState(prev => ({ ...prev, title }));
  }, []);

  const setRightContent = useCallback((content: ReactNode) => {
    setHeaderState(prev => ({ ...prev, rightContent: content }));
  }, []);

  const clearHeader = useCallback(() => {
    setHeaderState({ title: '', rightContent: null });
  }, []);

  return (
    <HeaderContext.Provider value={useMemo(() => ({ setTitle, setRightContent, clearHeader }), [])}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <Header title={headerState.title} rightContent={headerState.rightContent} />
        <main className="max-w-lg mx-auto py-2 px-3">
          <Outlet />
        </main>
        <Navigation />
      </div>
    </HeaderContext.Provider>
  );
}