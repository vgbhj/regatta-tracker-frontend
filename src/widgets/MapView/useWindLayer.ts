import { useEffect, useRef } from 'react';
import L from 'leaflet';

import { selectAnalyticsByYacht } from '@/features/analytics';
import type { WindPoint } from '@/features/analytics';
import { selectCurrentTime } from '@/features/playback';
import { useAppSelector } from '@/shared/lib/redux-hooks';

const MS_TO_KNOTS = 1.94384;

function windArrowIcon(directionDeg: number, speedKn: number): L.DivIcon {
  const size = 80;
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<svg width="${size}" height="${size}" viewBox="0 0 80 80" style="transform:rotate(${directionDeg}deg)">
      <line x1="40" y1="68" x2="40" y2="14" stroke="#e63946" stroke-width="4" stroke-linecap="round"/>
      <polyline points="24,28 40,8 56,28" fill="none" stroke="#e63946" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="40" y="78" text-anchor="middle" font-size="14" fill="#e63946" font-weight="700">${speedKn.toFixed(0)} kn</text>
    </svg>`,
  });
}

function findClosestWind(wind: WindPoint[], tMs: number): WindPoint | null {
  if (wind.length === 0) return null;
  let best = wind[0];
  let bestDt = Math.abs(best.tMs - tMs);
  for (let i = 1; i < wind.length; i++) {
    const dt = Math.abs(wind[i].tMs - tMs);
    if (dt < bestDt) {
      best = wind[i];
      bestDt = dt;
    }
  }
  return best;
}

export function useWindLayer(map: L.Map | null): void {
  const analyticsByYacht = useAppSelector(selectAnalyticsByYacht);
  const currentTime = useAppSelector(selectCurrentTime);
  const markerRef = useRef<L.Marker | null>(null);

  const wind: WindPoint[] = (() => {
    for (const data of Object.values(analyticsByYacht)) {
      if (data.wind.length > 0) return data.wind;
    }
    return [];
  })();

  useEffect(() => {
    if (!map || wind.length === 0) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const wp = findClosestWind(wind, currentTime);
    if (!wp) return;

    const speedKn = wp.speedMs * MS_TO_KNOTS;
    const icon = windArrowIcon(wp.directionDeg, speedKn);

    const bounds = map.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const lat = ne.lat - (ne.lat - sw.lat) * 0.08;
    const lng = ne.lng - (ne.lng - sw.lng) * 0.08;

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], {
        icon,
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.setIcon(icon);
    }
  }, [map, wind, currentTime]);

  useEffect(() => {
    if (!map || !markerRef.current) return;
    const onMove = () => {
      if (!markerRef.current) return;
      const bounds = map.getBounds();
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const lat = ne.lat - (ne.lat - sw.lat) * 0.08;
      const lng = ne.lng - (ne.lng - sw.lng) * 0.08;
      markerRef.current.setLatLng([lat, lng]);
    };
    map.on('moveend', onMove);
    return () => {
      map.off('moveend', onMove);
    };
  }, [map]);

  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, []);
}
