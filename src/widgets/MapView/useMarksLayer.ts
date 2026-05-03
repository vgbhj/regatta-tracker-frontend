import { useEffect, useRef } from 'react';
import L from 'leaflet';

import { markSelectors } from '@/entities/mark';
import { useAppSelector } from '@/shared/lib/redux-hooks';

const MARK_COLORS: Record<string, string> = {
  start: '#00c853',
  finish: '#d50000',
  turning: '#ffd600',
};

export function useMarksLayer(map: L.Map | null): void {
  const marks = useAppSelector((state) => markSelectors.selectAll(state.mark));
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    if (layerRef.current) {
      layerRef.current.remove();
    }

    const group = L.layerGroup().addTo(map);
    layerRef.current = group;

    for (const mark of marks) {
      const color = MARK_COLORS[mark.type] ?? '#888';
      L.circleMarker([mark.lat, mark.lon], {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.7,
        weight: 2,
      })
        .bindTooltip(mark.name)
        .addTo(group);
    }

    return () => {
      group.remove();
      layerRef.current = null;
    };
  }, [map, marks]);
}
