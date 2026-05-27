import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { selectRaceById } from '@/entities/race';
import { yachtSelectors } from '@/entities/yacht';
import { selectGpxByYachtId } from '@/features/analytics';
import { ru } from '@/shared/i18n/ru';
import { useAppSelector } from '@/shared/lib/redux-hooks';
import type { RaceId } from '@/shared/types';

import styles from './ReportsPanel.module.css';

const ANALYTICS_URL =
  import.meta.env.VITE_ANALYTICS_URL ?? 'http://localhost:8080';

interface ReportState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  blobUrl: string | null;
  error: string | null;
}

interface ReportsPanelProps {
  raceId: string;
}

export function ReportsPanel({ raceId }: ReportsPanelProps) {
  const t = ru.raceReports;
  const race = useAppSelector((state) =>
    selectRaceById(state, raceId as RaceId),
  );
  const allYachts = useAppSelector((state) =>
    yachtSelectors.selectAll(state.yacht),
  );
  const gpxByYacht = useAppSelector(selectGpxByYachtId);

  const yachts = useMemo(() => {
    if (!race) return [];
    const ids = new Set<string>(race.yachts);
    return allYachts.filter((y) => ids.has(y.id));
  }, [allYachts, race]);

  const [reports, setReports] = useState<Record<string, ReportState>>({});
  const blobUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    setReports({});
  }, [raceId]);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const generate = useCallback(
    async (yachtId: string) => {
      const gpxText = gpxByYacht[yachtId];
      if (!gpxText) return;

      setReports((prev) => ({
        ...prev,
        [yachtId]: { status: 'loading', blobUrl: null, error: null },
      }));

      try {
        const resp = await fetch(`${ANALYTICS_URL}/report`, {
          method: 'POST',
          body: gpxText,
          headers: { 'Content-Type': 'application/octet-stream' },
        });

        if (!resp.ok) {
          const body = await resp.text().catch(() => '');
          throw new Error(body || `HTTP ${resp.status}`);
        }

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        blobUrlsRef.current.push(url);

        setReports((prev) => ({
          ...prev,
          [yachtId]: { status: 'ready', blobUrl: url, error: null },
        }));
      } catch (e) {
        setReports((prev) => ({
          ...prev,
          [yachtId]: {
            status: 'error',
            blobUrl: null,
            error: e instanceof Error ? e.message : 'Unknown',
          },
        }));
      }
    },
    [gpxByYacht],
  );

  if (yachts.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>{t.noYachts}</div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.title}>{race?.name}</div>
      <div className={styles.list}>
        {yachts.map((yacht) => {
          const state = reports[yacht.id] ?? {
            status: 'idle' as const,
            blobUrl: null,
            error: null,
          };
          const hasGpx = !!gpxByYacht[yacht.id];

          return (
            <div key={yacht.id} className={styles.row}>
              <span
                className={styles.colorDot}
                style={{ background: yacht.color }}
              />
              <span className={styles.yachtName}>{yacht.name}</span>

              {!hasGpx && (
                <span className={styles.noData}>{t.noGpxData}</span>
              )}

              {hasGpx && state.status === 'idle' && (
                <button
                  className={styles.btn}
                  onClick={() => generate(yacht.id)}
                >
                  {t.generate}
                </button>
              )}

              {hasGpx && state.status === 'loading' && (
                <button className={styles.btn} disabled>
                  {t.generating}
                </button>
              )}

              {hasGpx && state.status === 'ready' && state.blobUrl && (
                <a
                  className={`${styles.btn} ${styles.btnReady}`}
                  href={state.blobUrl}
                  download={`${yacht.name}_report.pdf`}
                >
                  {t.download}
                </a>
              )}

              {hasGpx && state.status === 'error' && (
                <>
                  <span className={styles.error}>
                    {t.errorGenerate}: {state.error}
                  </span>
                  <button
                    className={styles.btn}
                    onClick={() => generate(yacht.id)}
                  >
                    {t.generate}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
