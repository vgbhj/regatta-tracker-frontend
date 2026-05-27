import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { selectRaceById } from '@/entities/race';
import { clearAnalytics, fetchYachtAnalytics, selectAnalyticsByYacht } from '@/features/analytics';
import {
  usePlaybackClock,
  preparePlaybackTracks,
  stop,
  clearPrecomputedTracks,
} from '@/features/playback';
import { DEMO_RACES, useLoadRaceFromServer } from '@/features/race-loader';
import { selectView, ViewSwitcher } from '@/features/view-switcher';
import { ru } from '@/shared/i18n/ru';
import { useAppDispatch, useAppSelector } from '@/shared/lib/redux-hooks';
import type { RaceId } from '@/shared/types';
import { AnalyticsPanel } from '@/widgets/AnalyticsPanel';
import { MapView } from '@/widgets/MapView';
import { Scene3DView } from '@/widgets/Scene3DView';
import { Timeline } from '@/widgets/Timeline';

import styles from './RacePlayer.module.css';

export function RacePlayer() {
  usePlaybackClock();

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const view = useAppSelector(selectView);
  const raceInStore = useAppSelector((state) =>
    id ? selectRaceById(state, id as RaceId) : undefined,
  );
  const [preparing, setPreparing] = useState(false);
  const analyticsByYacht = useAppSelector(selectAnalyticsByYacht);
  const t = ru.racePlayer;

  const needsServerFetch = !!id && id !== 'local' && !raceInStore;
  const { loadRace, status: serverStatus } = useLoadRaceFromServer();

  useEffect(() => {
    return () => {
      dispatch(stop());
      dispatch(clearPrecomputedTracks());
      dispatch(clearAnalytics());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (needsServerFetch) {
      loadRace(id!);
    }
  }, [needsServerFetch, id, loadRace]);

  useEffect(() => {
    if (!raceInStore) return;
    setPreparing(true);
    const timer = setTimeout(() => {
      dispatch(preparePlaybackTracks(raceInStore.id));
      setPreparing(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [raceInStore, dispatch]);

  useEffect(() => {
    if (!id || !raceInStore) return;
    const demo = DEMO_RACES.find((d) => d.id === id);
    if (!demo) return;
    const yachtIds = raceInStore.yachts;
    demo.urls.forEach((url, i) => {
      const yId = yachtIds[i];
      if (!yId || analyticsByYacht[yId]) return;
      fetch(url)
        .then((r) => r.text())
        .then((text) =>
          dispatch(fetchYachtAnalytics({ yachtId: yId, gpxText: text })),
        )
        .catch(() => {});
    });
  }, [id, raceInStore, analyticsByYacht, dispatch]);

  if (needsServerFetch && serverStatus === 'loading') {
    return <div className={styles.loading}>{t.loadingRace}</div>;
  }

  if (needsServerFetch && serverStatus === 'error') {
    return <div className={styles.loading}>{t.raceNotFound}</div>;
  }

  if (preparing) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>{t.preparingPlayback}</span>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button className={styles.backBtn} onClick={() => navigate('/')}>
            <ArrowLeftIcon />
          </button>
          <ViewSwitcher />
        </div>
      </div>

      <section className={styles.viewport}>
        <div className={styles.viewportMain}>
          {view === '2d' && <MapView />}
          {view === '3d' && <Scene3DView />}
        </div>
        <AnalyticsPanel />
      </section>

      <footer className={styles.bottom}>
        <Timeline />
      </footer>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
