import { Link } from 'react-router-dom';

import { useGetRacesQuery } from '@/shared/api/api-slice';
import { ru } from '@/shared/i18n/ru';

import styles from './RaceList.module.css';

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

export function RaceList() {
  const { data: races, isLoading, isError } = useGetRacesQuery();
  const t = ru.raceList;

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>{t.title}</h2>

      {isLoading && <p className={styles.message}>{t.loading}</p>}

      {isError && <p className={`${styles.message} ${styles.error}`}>{t.error}</p>}

      {races && races.length === 0 && (
        <p className={styles.message}>{t.noRaces}</p>
      )}

      {races && races.length > 0 && (
        <ul className={styles.list}>
          {races.map((race) => (
            <li key={race.id}>
              <Link to={`/race/${race.id}`} className={styles.card}>
                <span className={styles.name}>{race.name}</span>
                <span className={styles.meta}>
                  {new Date(race.startedAt).toLocaleDateString('ru-RU')}
                </span>
                <span className={styles.meta}>
                  {formatDuration(race.durationMs)}
                </span>
                <span className={styles.meta}>
                  {race.yachtCount} {t.yachts}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
