import { useEffect, useRef } from 'react';
import L from 'leaflet';

import { yachtSelectors } from '@/entities/yacht';
import { selectAllPrecomputedTracks, selectCurrentTime } from '@/features/playback';
import { useAppSelector } from '@/shared/lib/redux-hooks';

import { findIndexAtTime } from '@/shared/lib/binarySearchTrack';

export function useYachtsLayer(map: L.Map | null): void {
  const currentTime = useAppSelector(selectCurrentTime);
  const precomputed = useAppSelector(selectAllPrecomputedTracks);
  const yachts = useAppSelector((state) => yachtSelectors.selectAll(state.yacht));

  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());

  useEffect(() => {
    if (!map) return;

    for (const marker of markersRef.current.values()) {
      marker.remove();
    }
    markersRef.current.clear();

    for (const yacht of yachts) {
      const marker = L.circleMarker([0, 0], {
        radius: 6,
        color: yacht.color,
        fillColor: yacht.color,
        fillOpacity: 1,
        weight: 2,
      })
        .bindTooltip(yacht.name, { permanent: false })
        .addTo(map);
      markersRef.current.set(yacht.id, marker);
    }

    return () => {
      for (const marker of markersRef.current.values()) {
        marker.remove();
      }
      markersRef.current.clear();
    };
  }, [map, yachts]);

  // Обновление позиций — только setLatLng, маркеры НЕ пересоздаются
  useEffect(() => {
    for (const [yachtId, marker] of markersRef.current) {
      const points = precomputed[yachtId];
      if (!points || points.length === 0) continue;

      const idx = findIndexAtTime(points, currentTime);
      const point = points[idx];
      marker.setLatLng([point.lat, point.lon]);
    }
  }, [currentTime, precomputed]);
}
