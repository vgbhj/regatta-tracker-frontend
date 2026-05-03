import { usePlaybackClock } from '@/features/playback';
import { RaceLoader } from '@/features/race-loader';
import { selectView, ViewSwitcher } from '@/features/view-switcher';
import { useAppSelector } from '@/shared/lib/redux-hooks';
import { MapView } from '@/widgets/MapView';
import { Scene3DView } from '@/widgets/Scene3DView';
import { Timeline } from '@/widgets/Timeline';

import './App.css';

function App() {
  usePlaybackClock();
  const view = useAppSelector(selectView);

  return (
    <main className="app">
      <div className="toolbar">
        <RaceLoader />
        <ViewSwitcher />
      </div>
      <div className="views">
        {(view === '2d' || view === 'split') && <MapView />}
        {(view === '3d' || view === 'split') && <Scene3DView />}
      </div>
      <Timeline />
    </main>
  );
}

export default App;
