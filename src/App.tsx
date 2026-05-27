import { Route, Routes } from 'react-router-dom';

import { useDemoRaces } from '@/features/race-loader';
import { RaceList } from '@/pages/RaceList';
import { RacePlayer } from '@/pages/RacePlayer';
import { Reports } from '@/pages/Reports';
import { AppHeader } from '@/widgets/AppHeader';

function App() {
  useDemoRaces();

  return (
    <>
      <AppHeader />
      <Routes>
        <Route path="/" element={<RaceList />} />
        <Route path="/race/:id" element={<RacePlayer />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </>
  );
}

export default App;
