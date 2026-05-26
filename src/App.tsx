import { Route, Routes } from 'react-router-dom';

import { RaceList } from '@/pages/RaceList';
import { RacePlayer } from '@/pages/RacePlayer';
import { AppHeader } from '@/widgets/AppHeader';

function App() {
  return (
    <>
      <AppHeader />
      <Routes>
        <Route path="/" element={<RaceList />} />
        <Route path="/race/:id" element={<RacePlayer />} />
      </Routes>
    </>
  );
}

export default App;
