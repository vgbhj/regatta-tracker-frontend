import { useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { useLoadRaceFromFile } from '@/features/race-loader';
import { ru } from '@/shared/i18n/ru';

import styles from './AppHeader.module.css';

export function AppHeader() {
  const t = ru.appHeader;
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { loadFile, status } = useLoadRaceFromFile();
  const busy = status === 'loading';

  const handleFileChange = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    await loadFile(file);
    navigate('/race/local');
  };

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{t.title}</h1>

      <nav className={styles.nav}>
        <NavLink
          to="/"
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
          }
          end
        >
          {t.navRaces}
        </NavLink>
      </nav>

      <div className={styles.spacer} />

      <button
        className={styles.uploadBtn}
        onClick={() => fileRef.current?.click()}
        disabled={busy}
      >
        {t.uploadGpx}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".gpx"
        className={styles.fileInput}
        onChange={handleFileChange}
      />
    </header>
  );
}
