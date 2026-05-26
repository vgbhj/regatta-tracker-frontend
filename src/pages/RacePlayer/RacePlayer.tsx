import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { selectRaceById } from '@/entities/race';
import { usePlaybackClock, preparePlaybackTracks } from '@/features/playback';
import { useLoadRaceFromServer } from '@/features/race-loader';
import { selectView, ViewSwitcher } from '@/features/view-switcher';
import { ru } from '@/shared/i18n/ru';
import { useAppDispatch, useAppSelector } from '@/shared/lib/redux-hooks';
import type { RaceId } from '@/shared/types';
import { MapView } from '@/widgets/MapView';
import { MetricsPanel } from '@/widgets/MetricsPanel';
import { Scene3DView } from '@/widgets/Scene3DView';
import { Timeline } from '@/widgets/Timeline';

import styles from './RacePlayer.module.css';

type BottomTab = 'timeline' | 'metrics';

export function RacePlayer() {
  usePlaybackClock();

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const view = useAppSelector(selectView);
  const raceInStore = useAppSelector((state) =>
    id ? selectRaceById(state, id as RaceId) : undefined,
  );
  const [bottomTab, setBottomTab] = useState<BottomTab>('timeline');
  const t = ru.racePlayer;

  const needsServerFetch = !!id && id !== 'local' && !raceInStore;
  const { loadRace, status: serverStatus } = useLoadRaceFromServer();

  useEffect(() => {
    if (needsServerFetch) {
      loadRace(id!);
    }
  }, [needsServerFetch, id, loadRace]);

  useEffect(() => {
    if (raceInStore) {
      dispatch(preparePlaybackTracks());
    }
  }, [raceInStore, dispatch]);

  if (needsServerFetch && serverStatus === 'loading') {
    return <div className={styles.loading}>{t.loadingRace}</div>;
  }

  if (needsServerFetch && serverStatus === 'error') {
    return <div className={styles.loading}>{t.raceNotFound}</div>;
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
        {(view === '2d' || view === 'split') && <MapView />}
        {(view === '3d' || view === 'split') && <Scene3DView />}
      </section>

      <footer className={styles.bottom}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${bottomTab === 'timeline' ? styles.tabActive : ''}`}
            onClick={() => setBottomTab('timeline')}
            aria-pressed={bottomTab === 'timeline'}
          >
            {t.tabTimeline}
          </button>
          <button
            className={`${styles.tab} ${bottomTab === 'metrics' ? styles.tabActive : ''}`}
            onClick={() => setBottomTab('metrics')}
            aria-pressed={bottomTab === 'metrics'}
          >
            {t.tabMetrics}
          </button>
        </div>
        <div className={styles.tabContent}>
          {bottomTab === 'timeline' && <Timeline />}
          {bottomTab === 'metrics' && <MetricsPanel />}
        </div>
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
