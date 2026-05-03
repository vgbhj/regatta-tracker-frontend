import { useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useStore } from 'react-redux';
import type { Vector3Tuple } from 'three';

import { markSelectors } from '@/entities/mark';
import { yachtSelectors } from '@/entities/yacht';
import { selectAllPrecomputedTracks } from '@/features/playback';
import { LocalProjection } from '@/shared/geo';
import { useAppSelector } from '@/shared/lib/redux-hooks';
import type { RootState } from '@/app/store';

import { MapTexturePlane } from './MapTexturePlane';
import { RaceMark3D } from './RaceMark3D';
import { computeSceneBounds } from './SceneBounds';
import styles from './Scene3DView.module.css';
import { TrackTrail } from './TrackTrail';
import { WaterPlane } from './WaterPlane';
import { YachtModel } from './YachtModel';

interface LocalPoint {
  tMs: number;
  x: number;
  z: number;
  heading: number;
}

export function Scene3DView() {
  const precomputed = useAppSelector(selectAllPrecomputedTracks);
  const yachts = useAppSelector((state) => yachtSelectors.selectAll(state.yacht));
  const marks = useAppSelector((state) => markSelectors.selectAll(state.mark));
  const store = useStore<RootState>();

  const projection = useMemo(() => {
    const entries = Object.values(precomputed);
    if (entries.length === 0 || entries[0].length === 0) return null;
    const first = entries[0][0];
    return new LocalProjection({ lat: first.lat, lon: first.lon });
  }, [precomputed]);

  const localTracks = useMemo<Record<string, LocalPoint[]>>(() => {
    if (!projection) return {};
    const result: Record<string, LocalPoint[]> = {};
    for (const [yachtId, points] of Object.entries(precomputed)) {
      result[yachtId] = points.map((p) => {
        const local = projection.toLocal(p);
        return {
          tMs: p.tMs,
          x: local.x,
          z: -local.y,
          heading: p.heading ?? 0,
        };
      });
    }
    return result;
  }, [precomputed, projection]);

  const localMarks = useMemo(() => {
    if (!projection) return [];
    return marks.map((m) => {
      const local = projection.toLocal(m);
      return { id: m.id, x: local.x, z: -local.y, type: m.type };
    });
  }, [marks, projection]);

  const bounds = useMemo(
    () => computeSceneBounds(localTracks, localMarks),
    [localTracks, localMarks],
  );

  const objectScale = bounds ? bounds.diagonal / 500 : 1;

  const cameraPosition = useMemo<Vector3Tuple>(() => {
    if (!bounds) return [150, 200, 150];
    const h = bounds.diagonal * 0.5;
    const offset = bounds.diagonal * 0.3;
    return [bounds.centerX + offset, h, bounds.centerZ + offset];
  }, [bounds]);

  const orbitTarget = useMemo<Vector3Tuple>(() => {
    if (!bounds) return [0, 0, 0];
    return [bounds.centerX, 0, bounds.centerZ];
  }, [bounds]);

  const getCurrentTime = useCallback(
    () => store.getState().playback.currentTimeMs,
    [store],
  );

  const yachtMap = useMemo(
    () => new Map(yachts.map((y) => [y.id as string, y])),
    [yachts],
  );

  const farPlane = bounds ? bounds.diagonal * 5 : 5000;

  return (
    <div className={styles.canvas}>
      <Canvas
        camera={{
          position: cameraPosition,
          fov: 60,
          near: 1,
          far: farPlane,
        }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[200, 300, 100]} intensity={1.2} />
        <OrbitControls target={orbitTarget} />

        {bounds && projection && (
          <>
            <MapTexturePlane projection={projection} bounds={bounds} />
            <WaterPlane
              centerX={bounds.centerX}
              centerZ={bounds.centerZ}
              sizeX={bounds.sizeX}
              sizeZ={bounds.sizeZ}
            />
          </>
        )}

        {localMarks.map((m) => (
          <RaceMark3D
            key={m.id}
            x={m.x}
            z={m.z}
            type={m.type}
            scale={objectScale}
          />
        ))}

        {Object.entries(localTracks).map(([yachtId, track]) => {
          const yacht = yachtMap.get(yachtId);
          if (!yacht || track.length === 0) return null;
          return (
            <group key={yachtId}>
              <YachtModel
                color={yacht.color}
                localTrack={track}
                getCurrentTime={getCurrentTime}
                scale={objectScale}
              />
              <TrackTrail
                color={yacht.color}
                localTrack={track}
                getCurrentTime={getCurrentTime}
              />
            </group>
          );
        })}
      </Canvas>
    </div>
  );
}
