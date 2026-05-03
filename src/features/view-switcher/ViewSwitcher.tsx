import { ru } from '@/shared/i18n/ru';
import { useAppDispatch, useAppSelector } from '@/shared/lib/redux-hooks';

import styles from './ViewSwitcher.module.css';
import { selectView, setView } from './view-switcher.slice';
import type { ViewMode } from './view-switcher.slice';

const MODES: ViewMode[] = ['2d', '3d', 'split'];

export function ViewSwitcher() {
  const dispatch = useAppDispatch();
  const current = useAppSelector(selectView);
  const t = ru.viewSwitcher;

  return (
    <div className={styles.switcher}>
      {MODES.map((mode) => (
        <button
          key={mode}
          className={`${styles.btn} ${current === mode ? styles.active : ''}`}
          onClick={() => dispatch(setView(mode))}
          aria-pressed={current === mode}
        >
          {t[mode]}
        </button>
      ))}
    </div>
  );
}
