import { useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { useLoadRaceFromFile } from '@/features/race-loader';
import { ThemeSwitcher } from '@/features/theme-switcher';
import { ru } from '@/shared/i18n/ru';

import styles from './AppHeader.module.css';

const SailIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 21V3" />
    <path d="M12 3 4 19h8" />
    <path d="M12 6c5 3 8 7 8 13h-8" />
  </svg>
);

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
      <NavLink to="/" className={styles.logo}>
        <div className={styles.logoIcon}>
          <SailIcon />
        </div>
        <div className={styles.logoText}>
          Regatta<span className={styles.logoAccent}>Tracker</span>
        </div>
      </NavLink>

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
        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
          }
        >
          {ru.raceReports.navReports}
        </NavLink>
      </nav>

      <div className={styles.actions}>
        <ThemeSwitcher />
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
      </div>
    </header>
  );
}
