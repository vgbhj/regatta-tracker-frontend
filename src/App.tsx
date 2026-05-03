import { usePlaybackClock } from '@/features/playback';
import { RaceLoader } from '@/features/race-loader';
import { MapView } from '@/widgets/MapView';
import { Timeline } from '@/widgets/Timeline';

import './App.css';

function App() {
  usePlaybackClock();

  return (
    <main className="app">
      <RaceLoader />
      <MapView />
      <Timeline />
    </main>
  );
}

export default App;
