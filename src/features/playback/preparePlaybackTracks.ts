/**
 * Прекомпьютация интерполированных треков — ключевой performance-pattern.
 *
 * Вызывается один раз при загрузке гонки. Для каждого трека строится
 * Hermite-интерполятор (O(n) на касательные + O(k) на генерацию k точек с шагом
 * 1000/30 ≈ 33 мс). Результат сохраняется в стор.
 *
 * Во время воспроизведения ни один компонент НЕ вызывает interpolateTrack().
 * Вместо этого виджеты индексируются в прекомпьютед-массив бинарным поиском
 * за O(log k) — это на порядки дешевле пересчёта сплайна на каждом кадре.
 *
 * Почему нельзя пересчитывать каждый кадр: createHermiteInterpolator строит
 * касательные конечными разностями за O(n), затем вычисляет 4 базисных полинома.
 * При 8 яхтах × 60 fps это ~480 вызовов интерполятора в секунду. Прекомпьютация
 * сводит каждый кадр к бинарному поиску — ~13 сравнений для 9000 точек.
 */
import type { AppDispatch, RootState } from '@/app/store';
import { trackSelectors } from '@/entities/track';
import { LocalProjection } from '@/shared/geo';
import { interpolateTrack } from '@/shared/interpolation';

import { initPlayback } from './playback.slice';
import {
  clearPrecomputedTracks,
  setPrecomputedTrack,
} from './precomputed-tracks.slice';

const TARGET_HZ = 30;

export function preparePlaybackTracks() {
  return (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const tracks = trackSelectors.selectAll(state.track);

    if (tracks.length === 0) return;

    dispatch(clearPrecomputedTracks());

    const origin = tracks[0].points[0];
    const projection = new LocalProjection({
      lat: origin.lat,
      lon: origin.lon,
    });

    let maxDuration = 0;

    for (const track of tracks) {
      if (track.points.length < 2) continue;

      const interpolated = interpolateTrack(
        track.points,
        { targetHz: TARGET_HZ },
        projection,
      );

      dispatch(
        setPrecomputedTrack({
          yachtId: track.yachtId,
          points: interpolated,
        }),
      );

      const trackEnd = interpolated[interpolated.length - 1].tMs;
      if (trackEnd > maxDuration) maxDuration = trackEnd;
    }

    dispatch(initPlayback(maxDuration));
  };
}
