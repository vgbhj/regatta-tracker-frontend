import { useState } from 'react';

import { selectAllRaces } from '@/entities/race';
import { ru } from '@/shared/i18n/ru';
import { useAppSelector } from '@/shared/lib/redux-hooks';
import { ReportsPanel } from '@/widgets/ReportsPanel';

import styles from './Reports.module.css';

export function Reports() {
  const t = ru.raceReports;
  const races = useAppSelector(selectAllRaces);
  const [selectedRaceId, setSelectedRaceId] = useState('');

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.heading}>{t.title}</h2>
        <div className={styles.subtitle}>{t.subtitle}</div>
      </div>
      <div className={styles.content}>
        {races.length === 0 ? (
          <p className={styles.empty}>{t.noRaces}</p>
        ) : (
          <>
            <select
              className={styles.select}
              value={selectedRaceId}
              onChange={(e) => setSelectedRaceId(e.target.value)}
            >
              <option value="">{t.selectRace}</option>
              {races.map((race) => (
                <option key={race.id} value={race.id}>
                  {race.name}
                </option>
              ))}
            </select>
            {selectedRaceId && <ReportsPanel raceId={selectedRaceId} />}
          </>
        )}
      </div>
    </div>
  );
}
