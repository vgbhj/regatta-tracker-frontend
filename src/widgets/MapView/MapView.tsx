import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { markSelectors } from '@/entities/mark';
import { selectAllPrecomputedTracks } from '@/features/playback';
import { useAppSelector } from '@/shared/lib/redux-hooks';

import styles from './MapView.module.css';
import { useMarksLayer } from './useMarksLayer';
import { useTracksLayer } from './useTracksLayer';
import { useYachtsLayer } from './useYachtsLayer';

const BOUNDS_SAMPLE_STRIDE = 50;

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);

  const marks = useAppSelector((state) => markSelectors.selectAll(state.mark));
  const precomputed = useAppSelector(selectAllPrecomputedTracks);

  useEffect(() => {
    if (!containerRef.current) return;
    const m = L.map(containerRef.current, {
      attributionControl: false,
    }).setView([55.75, 37.62], 13);
    L.control.attribution({ prefix: 'Leaflet' }).addTo(m);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(m);
    setMap(m);
    return () => {
      m.remove();
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    const bounds = L.latLngBounds([]);
    for (const mark of marks) {
      bounds.extend([mark.lat, mark.lon]);
    }
    for (const points of Object.values(precomputed)) {
      for (let i = 0; i < points.length; i += BOUNDS_SAMPLE_STRIDE) {
        bounds.extend([points[i].lat, points[i].lon]);
      }
      if (points.length > 0) {
        bounds.extend([
          points[points.length - 1].lat,
          points[points.length - 1].lon,
        ]);
      }
    }
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [map, marks, precomputed]);

  useMarksLayer(map);
  useTracksLayer(map);
  useYachtsLayer(map);

  return <div ref={containerRef} className={styles.map} />;
}
