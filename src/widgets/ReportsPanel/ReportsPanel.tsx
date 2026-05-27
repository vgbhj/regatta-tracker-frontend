import { useCallback, useEffect, useRef, useState } from 'react';

import { yachtSelectors } from '@/entities/yacht';
import { selectGpxByYachtId } from '@/features/analytics';
import { ru } from '@/shared/i18n/ru';
import { useAppSelector } from '@/shared/lib/redux-hooks';

import styles from './ReportsPanel.module.css';

const ANALYTICS_URL =
  import.meta.env.VITE_ANALYTICS_URL ?? 'http://localhost:8080';

interface ReportState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  blobUrl: string | null;
  error: string | null;
}

export function ReportsPanel() {
  const t = ru.raceReports;
  const yachts = useAppSelector((state) => yachtSelectors.selectAll(state.yacht));
  const gpxByYacht = useAppSelector(selectGpxByYachtId);

  const [reports, setReports] = useState<Record<string, ReportState>>({});
  const blobUrlsRef = useRef<string[]>([]);

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

  const relevantYachts = yachts.filter((y) => gpxByYacht[y.id]);

  if (relevantYachts.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>{t.noRace}</div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.title}>{t.title}</div>
      <div className={styles.list}>
        {relevantYachts.map((yacht) => {
          const state = reports[yacht.id] ?? {
            status: 'idle' as const,
            blobUrl: null,
            error: null,
          };

          return (
            <div key={yacht.id} className={styles.row}>
              <span
                className={styles.colorDot}
                style={{ background: yacht.color }}
              />
              <span className={styles.yachtName}>{yacht.name}</span>

              {state.status === 'idle' && (
                <button
                  className={styles.btn}
                  onClick={() => generate(yacht.id)}
                >
                  {t.generate}
                </button>
              )}

              {state.status === 'loading' && (
                <button className={styles.btn} disabled>
                  {t.generating}
                </button>
              )}

              {state.status === 'ready' && state.blobUrl && (
                <a
                  className={`${styles.btn} ${styles.btnReady}`}
                  href={state.blobUrl}
                  download={`${yacht.name}_report.pdf`}
                >
                  {t.download}
                </a>
              )}

              {state.status === 'error' && (
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
