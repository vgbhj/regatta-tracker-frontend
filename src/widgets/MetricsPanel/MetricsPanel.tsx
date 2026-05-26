import { ru } from '@/shared/i18n/ru';

import styles from './MetricsPanel.module.css';

export function MetricsPanel() {
  const t = ru.metricsPanel;

  return <div className={styles.panel}>{t.placeholder}</div>;
}
