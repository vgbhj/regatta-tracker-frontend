import { selectGpxByYachtId } from '@/features/analytics';
import { ru } from '@/shared/i18n/ru';
import { useAppSelector } from '@/shared/lib/redux-hooks';
import { ReportsPanel } from '@/widgets/ReportsPanel';

import styles from './Reports.module.css';

export function Reports() {
  const t = ru.raceReports;
  const gpxByYacht = useAppSelector(selectGpxByYachtId);
  const hasData = Object.keys(gpxByYacht).length > 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.heading}>{t.title}</h2>
        <div className={styles.subtitle}>{t.subtitle}</div>
      </div>
      <div className={styles.content}>
        {hasData ? <ReportsPanel /> : <p className={styles.empty}>{t.noRace}</p>}
      </div>
    </div>
  );
}
