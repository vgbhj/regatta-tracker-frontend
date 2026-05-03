export interface SplineNode {
  tMs: number;
  x: number;
  y: number;
}

export type Interpolator = (tMs: number) => { x: number; y: number };

export interface InterpolationOptions {
  targetHz: number;
}
