/**
 * Кубическая эрмитова интерполяция (Cubic Hermite Spline).
 *
 * Выбор метода обоснован в главе 3 ВКР по результатам количественного сравнения
 * пяти методов интерполяции на реальных GPS-треках парусных гонок.
 *
 * Почему не натуральный кубический сплайн (natural cubic spline):
 * Натуральный кубический сплайн минимизирует суммарную кривизну кривой и
 * обеспечивает непрерывность второй производной (C²) во всех узлах. На парусных
 * треках это приводит к «срезанию углов»: при резкой смене галса яхта за доли
 * секунды меняет курс на 80–100°, но глобально-гладкий сплайн сглаживает этот
 * излом, генерируя точки, далёкие от реальной траектории.
 *
 * Эрмитов сплайн с касательными, оценёнными конечными разностями, «знает»
 * мгновенное направление движения в каждом узле: перед поворотом яхта шла в одну
 * сторону, после — в другую. Кривая на каждом сегменте согласована с направлением
 * в обоих концах и не пытается быть глобально гладкой ценой искажения траектории.
 *
 * Базисные функции Эрмита (s — нормализованный параметр на сегменте, s ∈ [0, 1]):
 *   h00(s) = 2s³ − 3s² + 1     — значение в левом узле
 *   h10(s) = s³ − 2s² + s       — касательная в левом узле (× Δt)
 *   h01(s) = −2s³ + 3s²         — значение в правом узле
 *   h11(s) = s³ − s²            — касательная в правом узле (× Δt)
 *
 * Интерполяция координаты x на сегменте [i, i+1]:
 *   x(t) = h00(s)·x[i] + h10(s)·Δt·dx[i] + h01(s)·x[i+1] + h11(s)·Δt·dx[i+1]
 * где Δt = t[i+1] − t[i], s = (t − t[i]) / Δt.
 * Аналогично для y.
 */
import type { Interpolator, SplineNode } from './types';

interface Tangents {
  dx: Float64Array;
  dy: Float64Array;
}

function estimateTangents(nodes: SplineNode[]): Tangents {
  const n = nodes.length;
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    if (i === 0) {
      const dt = nodes[1].tMs - nodes[0].tMs;
      dx[0] = (nodes[1].x - nodes[0].x) / dt;
      dy[0] = (nodes[1].y - nodes[0].y) / dt;
    } else if (i === n - 1) {
      const dt = nodes[n - 1].tMs - nodes[n - 2].tMs;
      dx[n - 1] = (nodes[n - 1].x - nodes[n - 2].x) / dt;
      dy[n - 1] = (nodes[n - 1].y - nodes[n - 2].y) / dt;
    } else {
      const dt = nodes[i + 1].tMs - nodes[i - 1].tMs;
      dx[i] = (nodes[i + 1].x - nodes[i - 1].x) / dt;
      dy[i] = (nodes[i + 1].y - nodes[i - 1].y) / dt;
    }
  }

  return { dx, dy };
}

function findSegment(nodes: SplineNode[], tMs: number): number {
  let lo = 0;
  let hi = nodes.length - 2;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (nodes[mid + 1].tMs < tMs) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

export function createHermiteInterpolator(nodes: SplineNode[]): Interpolator {
  if (nodes.length < 2) {
    throw new Error('Hermite spline requires at least 2 nodes');
  }

  const { dx, dy } = estimateTangents(nodes);

  return (tMs: number) => {
    const tClamped = Math.max(nodes[0].tMs, Math.min(nodes[nodes.length - 1].tMs, tMs));

    const i = findSegment(nodes, tClamped);
    const dt = nodes[i + 1].tMs - nodes[i].tMs;
    const s = (tClamped - nodes[i].tMs) / dt;

    const s2 = s * s;
    const s3 = s2 * s;

    const h00 = 2 * s3 - 3 * s2 + 1;
    const h10 = s3 - 2 * s2 + s;
    const h01 = -2 * s3 + 3 * s2;
    const h11 = s3 - s2;

    return {
      x: h00 * nodes[i].x + h10 * dt * dx[i] + h01 * nodes[i + 1].x + h11 * dt * dx[i + 1],
      y: h00 * nodes[i].y + h10 * dt * dy[i] + h01 * nodes[i + 1].y + h11 * dt * dy[i + 1],
    };
  };
}

export { estimateTangents, type Tangents };
