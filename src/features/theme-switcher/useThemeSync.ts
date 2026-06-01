import { useEffect } from 'react';

import { useAppSelector } from '@/shared/lib/redux-hooks';

import { selectTheme } from './theme-switcher.slice';

export function useThemeSync() {
  const theme = useAppSelector(selectTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
}
