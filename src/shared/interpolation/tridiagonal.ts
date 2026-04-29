/**
 * Метод прогонки (алгоритм Томаса) для трёхдиагональной СЛАУ.
 *
 * Решает систему вида
 *
 *   ┌ b0  c0                  ┐ ┌ x0     ┐   ┌ d0     ┐
 *   │ a1  b1  c1              │ │ x1     │   │ d1     │
 *   │     a2  b2  c2          │ │ x2     │ = │ d2     │
 *   │         ⋱   ⋱   ⋱       │ │ ⋮      │   │ ⋮      │
 *   │            a_{n-1} b_{n-1} ┘ ┘ x_{n-1} ┘   ┘ d_{n-1} ┘
 *
 * за O(n) операций двумя проходами без формирования полной матрицы.
 * Для натурального кубического сплайна получившаяся матрица диагонально
 * доминирующая (|b_i| ≥ |a_i| + |c_i|), поэтому деление на ноль и численная
 * неустойчивость исключены — отдельных проверок не делаем.
 *
 * Прямой ход (исключение поддиагонали):
 *   c'_0 = c_0 / b_0,                  d'_0 = d_0 / b_0
 *   c'_i = c_i / (b_i − a_i · c'_{i−1})
 *   d'_i = (d_i − a_i · d'_{i−1}) / (b_i − a_i · c'_{i−1})
 *
 * Обратный ход:
 *   x_{n−1} = d'_{n−1}
 *   x_i     = d'_i − c'_i · x_{i+1}
 *
 * Параметры:
 *   a — поддиагональ, длина n; a[0] не используется.
 *   b — главная диагональ, длина n.
 *   c — наддиагональ,  длина n; c[n−1] не используется.
 *   d — правая часть,  длина n.
 *
 * Возвращает новый Float64Array с решением. Входы не мутируются.
 */
export function solveTridiagonal(
  a: Float64Array,
  b: Float64Array,
  c: Float64Array,
  d: Float64Array,
): Float64Array {
  const n = b.length;
  if (a.length !== n || c.length !== n || d.length !== n) {
    throw new Error('solveTridiagonal: длины a, b, c, d должны совпадать');
  }
  if (n === 0) return new Float64Array(0);

  const cPrime = new Float64Array(n);
  const dPrime = new Float64Array(n);

  cPrime[0] = c[0] / b[0];
  dPrime[0] = d[0] / b[0];

  for (let i = 1; i < n; i++) {
    const m = b[i] - a[i] * cPrime[i - 1];
    cPrime[i] = c[i] / m;
    dPrime[i] = (d[i] - a[i] * dPrime[i - 1]) / m;
  }

  const x = new Float64Array(n);
  x[n - 1] = dPrime[n - 1];
  for (let i = n - 2; i >= 0; i--) {
    x[i] = dPrime[i] - cPrime[i] * x[i + 1];
  }

  return x;
}
