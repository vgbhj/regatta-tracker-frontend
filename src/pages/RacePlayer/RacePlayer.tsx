import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { usePlaybackClock } from '@/features/playback';
import { useLoadRaceFromServer } from '@/features/race-loader';
import { selectView, ViewSwitcher } from '@/features/view-switcher';
import { ru } from '@/shared/i18n/ru';
import { useAppSelector } from '@/shared/lib/redux-hooks';
import { MapView } from '@/widgets/MapView';
import { MetricsPanel } from '@/widgets/MetricsPanel';
import { Scene3DView } from '@/widgets/Scene3DView';
import { Timeline } from '@/widgets/Timeline';

import styles from './RacePlayer.module.css';

type BottomTab = 'timeline' | 'metrics';

export function RacePlayer() {
  usePlaybackClock();

  const { id } = useParams<{ id: string }>();
  const view = useAppSelector(selectView);
  const [bottomTab, setBottomTab] = useState<BottomTab>('timeline');
  const t = ru.racePlayer;

  const { loadRace, status: serverStatus } = useLoadRaceFromServer();

  useEffect(() => {
    if (id && id !== 'local') {
      loadRace(id);
    }
  }, [id, loadRace]);

  if (id !== 'local' && serverStatus === 'loading') {
    return <div className={styles.loading}>{t.loadingRace}</div>;
  }

  if (id !== 'local' && serverStatus === 'error') {
    return <div className={styles.loading}>{t.raceNotFound}</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <ViewSwitcher />
      </div>

      <section className={styles.viewport}>
        {(view === '2d' || view === 'split') && <MapView />}
        {(view === '3d' || view === 'split') && <Scene3DView />}
      </section>

      <footer className={styles.bottom}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${bottomTab === 'timeline' ? styles.active : ''}`}
            onClick={() => setBottomTab('timeline')}
            aria-pressed={bottomTab === 'timeline'}
          >
            {t.tabTimeline}
          </button>
          <button
            className={`${styles.tab} ${bottomTab === 'metrics' ? styles.active : ''}`}
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
