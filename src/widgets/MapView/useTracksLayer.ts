import { useEffect, useRef } from 'react';
import L from 'leaflet';

import { yachtSelectors } from '@/entities/yacht';
import { selectAllPrecomputedTracks, selectCurrentTime } from '@/features/playback';
import { useAppSelector } from '@/shared/lib/redux-hooks';

import { findIndexAtTime } from '@/shared/lib/binarySearchTrack';

export function useTracksLayer(map: L.Map | null): void {
  const currentTime = useAppSelector(selectCurrentTime);
  const precomputed = useAppSelector(selectAllPrecomputedTracks);
  const yachts = useAppSelector((state) => yachtSelectors.selectAll(state.yacht));

  const polylinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const latlngCacheRef = useRef<Map<string, Array<[number, number]>>>(
    new Map(),
  );

  useEffect(() => {
    if (!map) return;

    for (const polyline of polylinesRef.current.values()) {
      polyline.remove();
    }
    polylinesRef.current.clear();
    latlngCacheRef.current.clear();

    const yachtMap = new Map(yachts.map((y) => [y.id as string, y]));

    for (const [yachtId, points] of Object.entries(precomputed)) {
      if (points.length === 0) continue;
      const yacht = yachtMap.get(yachtId);
      const color = yacht?.color ?? '#888';

      latlngCacheRef.current.set(
        yachtId,
        points.map((p) => [p.lat, p.lon] as [number, number]),
      );

      const polyline = L.polyline([], {
        color,
        weight: 2,
        opacity: 0.7,
      }).addTo(map);
      polylinesRef.current.set(yachtId, polyline);
    }

    return () => {
      for (const polyline of polylinesRef.current.values()) {
        polyline.remove();
      }
      polylinesRef.current.clear();
      latlngCacheRef.current.clear();
    };
  }, [map, precomputed, yachts]);

  useEffect(() => {
    for (const [yachtId, polyline] of polylinesRef.current) {
      const points = precomputed[yachtId];
      const latlngs = latlngCacheRef.current.get(yachtId);
      if (!points || !latlngs || points.length === 0) continue;

      const idx = findIndexAtTime(points, currentTime);
      polyline.setLatLngs(latlngs.slice(0, idx + 1));
    }
  }, [currentTime, precomputed]);
}
