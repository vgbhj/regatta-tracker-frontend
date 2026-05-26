import { Link } from 'react-router-dom';

import { selectAllRaces } from '@/entities/race';
import { ru } from '@/shared/i18n/ru';
import { useAppSelector } from '@/shared/lib/redux-hooks';

import styles from './RaceList.module.css';

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

export function RaceList() {
  const races = useAppSelector(selectAllRaces);
  const t = ru.raceList;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.heading}>{t.title}</h2>
            <div className={styles.subtitle}>
              {races.length} {races.length === 1 ? 'гонка' : 'гонок'}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {races.length === 0 && (
          <p className={styles.message}>{t.noRaces}</p>
        )}

        {races.length > 0 && (
          <ul className={styles.cards}>
            {races.map((race) => (
              <li key={race.id}>
                <Link to={`/race/${race.id}`} className={styles.card}>
                  <div className={styles.cardBody}>
                    <span className={styles.raceName}>{race.name}</span>
                    <div className={styles.metaRow}>
                      <span className={styles.metaItem}>
                        {new Date(race.startedAt).toLocaleDateString('ru-RU')}
                      </span>
                      <span className={styles.metaItem}>
                        {formatDuration(race.durationMs)}
                      </span>
                      <span className={styles.metaItem}>
                        {race.yachts.length} {t.yachts}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
