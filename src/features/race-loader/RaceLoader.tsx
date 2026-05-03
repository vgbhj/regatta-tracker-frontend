import { useRef, useState } from 'react';

import { ru } from '@/shared/i18n/ru';
import { useGetRacesQuery } from '@/shared/api/api-slice';

import { useLoadRaceFromFile } from './useLoadRaceFromFile';
import { useLoadRaceFromServer } from './useLoadRaceFromServer';
import styles from './RaceLoader.module.css';

import type { LoadStatus } from './useLoadRaceFromFile';

type Mode = 'server' | 'file';

const t = ru.raceLoader;

function StatusMessage({ status, error }: { status: LoadStatus; error: string | null }) {
  if (status === 'idle') return null;
  if (status === 'loading')
    return <p className={`${styles.status} ${styles.statusLoading}`}>{t.statusLoading}</p>;
  if (status === 'success')
    return <p className={`${styles.status} ${styles.statusSuccess}`}>{t.statusSuccess}</p>;
  return (
    <p className={`${styles.status} ${styles.statusError}`}>
      {t.statusError}
      {error}
    </p>
  );
}

export function RaceLoader() {
  const [mode, setMode] = useState<Mode>('file');
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: races, isLoading: racesLoading, isError: racesError } = useGetRacesQuery();
  const fromFile = useLoadRaceFromFile();
  const fromServer = useLoadRaceFromServer();

  const busy = fromFile.status === 'loading' || fromServer.status === 'loading';

  const handleLoadServer = () => {
    if (selectedRaceId) fromServer.loadRace(selectedRaceId);
  };

  const handleFileChange = () => {
    const file = fileRef.current?.files?.[0];
    if (file) fromFile.loadFile(file);
  };

  return (
    <section className={styles.root}>
      <h2 className={styles.title}>{t.title}</h2>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${mode === 'server' ? styles.tabActive : ''}`}
          onClick={() => setMode('server')}
        >
          {t.tabServer}
        </button>
        <button
          className={`${styles.tab} ${mode === 'file' ? styles.tabActive : ''}`}
          onClick={() => setMode('file')}
        >
          {t.tabFile}
        </button>
      </div>

      <div className={styles.body}>
        {mode === 'server' && (
          <>
            {racesLoading && (
              <p className={`${styles.status} ${styles.statusLoading}`}>{t.statusLoading}</p>
            )}
            {racesError && (
              <p className={`${styles.status} ${styles.statusError}`}>{t.serverUnavailable}</p>
            )}
            {races && races.length === 0 && (
              <p className={styles.status}>{t.noRaces}</p>
            )}
            {races && races.length > 0 && (
              <>
                <select
                  className={styles.select}
                  value={selectedRaceId}
                  onChange={(e) => setSelectedRaceId(e.target.value)}
                >
                  <option value="">{t.selectRace}</option>
                  {races.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <button
                  className={styles.button}
                  disabled={!selectedRaceId || busy}
                  onClick={handleLoadServer}
                >
                  {t.load}
                </button>
              </>
            )}
            <StatusMessage status={fromServer.status} error={fromServer.error} />
          </>
        )}

        {mode === 'file' && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".gpx"
              className={styles.fileInput}
              onChange={handleFileChange}
              disabled={busy}
            />
            <StatusMessage status={fromFile.status} error={fromFile.error} />
          </>
        )}
      </div>
    </section>
  );
}
