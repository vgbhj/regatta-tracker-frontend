import { useEffect, useRef } from 'react';
import L from 'leaflet';

import {
  selectAnalyticsByYacht,
  selectSelectedYachtId,
  selectSelectedManeuverId,
  selectManeuver,
} from '@/features/analytics';
import type { ManeuverAnalytics } from '@/features/analytics';
import { selectAllPrecomputedTracks, selectCurrentTime } from '@/features/playback';
import { findIndexAtTime } from '@/shared/lib/binarySearchTrack';
import { useAppDispatch, useAppSelector } from '@/shared/lib/redux-hooks';

const MANEUVER_COLORS: Record<string, string> = {
  tack: '#f59e0b',
  gybe: '#8b5cf6',
};

function formatTime(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function useManeuversLayer(map: L.Map | null): void {
  const dispatch = useAppDispatch();
  const analyticsByYacht = useAppSelector(selectAnalyticsByYacht);
  const selectedYachtId = useAppSelector(selectSelectedYachtId);
  const selectedManeuverId = useAppSelector(selectSelectedManeuverId);
  const currentTime = useAppSelector(selectCurrentTime);
  const precomputed = useAppSelector(selectAllPrecomputedTracks);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<number, L.CircleMarker>>(new Map());
  const maneuverTmsRef = useRef<Map<number, number>>(new Map());

  const maneuvers: ManeuverAnalytics[] =
    selectedYachtId ? (analyticsByYacht[selectedYachtId]?.maneuvers ?? []) : [];

  const trackPoints = selectedYachtId ? precomputed[selectedYachtId] : undefined;

  useEffect(() => {
    if (!map) return;

    if (layerRef.current) {
      layerRef.current.remove();
    }
    markersRef.current.clear();
    maneuverTmsRef.current.clear();

    const group = L.layerGroup().addTo(map);
    layerRef.current = group;

    for (const m of maneuvers) {
      let lat = m.lat;
      let lon = m.lon;
      let tMs = m.tMs;

      if (trackPoints && trackPoints.length > 0) {
        const idx = findIndexAtTime(trackPoints, m.tMs);
        const pt = trackPoints[idx];
        lat = pt.lat;
        lon = pt.lon;
        tMs = pt.tMs;
      }

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      maneuverTmsRef.current.set(m.id, tMs);

      const color = MANEUVER_COLORS[m.type] ?? '#888';
      const marker = L.circleMarker([lat, lon], {
        radius: 7,
        color,
        fillColor: color,
        weight: 2,
        opacity: 0,
        fillOpacity: 0,
      })
        .bindTooltip(
          `#${m.id} ${m.type} ${formatTime(tMs)} (${m.score.toFixed(0)})`,
        )
        .on('click', () => dispatch(selectManeuver(m.id)))
        .addTo(group);

      markersRef.current.set(m.id, marker);
    }

    return () => {
      group.remove();
      layerRef.current = null;
      markersRef.current.clear();
      maneuverTmsRef.current.clear();
    };
  }, [map, maneuvers, trackPoints, dispatch]);

  useEffect(() => {
    for (const m of maneuvers) {
      const marker = markersRef.current.get(m.id);
      if (!marker) continue;

      const tMs = maneuverTmsRef.current.get(m.id) ?? m.tMs;
      const visible = currentTime >= tMs;
      const isSelected = m.id === selectedManeuverId;
      const color = MANEUVER_COLORS[m.type] ?? '#888';

      if (!visible) {
        marker.setStyle({ opacity: 0, fillOpacity: 0 });
      } else if (isSelected) {
        marker.setStyle({
          radius: 11,
          weight: 3,
          opacity: 1,
          fillOpacity: 0.9,
          color: '#fff',
          fillColor: color,
        });
      } else {
        marker.setStyle({
          radius: 7,
          weight: 2,
          opacity: 1,
          fillOpacity: 0.6,
          color,
          fillColor: color,
        });
      }
    }
  }, [currentTime, selectedManeuverId, maneuvers]);

  useEffect(() => {
    if (!map || selectedManeuverId == null) return;

    const marker = markersRef.current.get(selectedManeuverId);
    if (!marker) return;

    const latlng = marker.getLatLng();
    map.flyTo(latlng, 16, { duration: 0.8 });
  }, [map, selectedManeuverId]);
}
