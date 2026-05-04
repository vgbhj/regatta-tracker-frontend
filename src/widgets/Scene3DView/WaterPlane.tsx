import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Водная поверхность с vertex displacement (геометрические волны) и fBm
 * нормальным маппингом для детализации. Используется Gerstner-подобная
 * суперпозиция волн в vertex shader для реалистичной анимации.
 */

const SEGMENTS = 128;

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec3 vWorldPos;

  float wave(vec2 pos, vec2 dir, float freq, float speed, float amp) {
    return amp * sin(dot(pos, dir) * freq + uTime * speed);
  }

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Суперпозиция 4 волн разной частоты и направления
    float h = 0.0;
    h += wave(pos.xy, vec2(1.0, 0.3), 0.08, 1.2, 0.6);
    h += wave(pos.xy, vec2(-0.4, 1.0), 0.12, 0.9, 0.4);
    h += wave(pos.xy, vec2(0.7, -0.7), 0.18, 1.5, 0.25);
    h += wave(pos.xy, vec2(-0.8, -0.5), 0.25, 0.7, 0.15);

    pos.z += h;

    // Вычисляем нормаль через частные производные
    float dx = 0.0;
    float dy = 0.0;
    // d/dx
    dx += 0.6 * 0.08 * cos(dot(pos.xy, vec2(1.0, 0.3)) * 0.08 + uTime * 1.2) * 1.0;
    dx += 0.4 * 0.12 * cos(dot(pos.xy, vec2(-0.4, 1.0)) * 0.12 + uTime * 0.9) * (-0.4);
    dx += 0.25 * 0.18 * cos(dot(pos.xy, vec2(0.7, -0.7)) * 0.18 + uTime * 1.5) * 0.7;
    dx += 0.15 * 0.25 * cos(dot(pos.xy, vec2(-0.8, -0.5)) * 0.25 + uTime * 0.7) * (-0.8);
    // d/dy
    dy += 0.6 * 0.08 * cos(dot(pos.xy, vec2(1.0, 0.3)) * 0.08 + uTime * 1.2) * 0.3;
    dy += 0.4 * 0.12 * cos(dot(pos.xy, vec2(-0.4, 1.0)) * 0.12 + uTime * 0.9) * 1.0;
    dy += 0.25 * 0.18 * cos(dot(pos.xy, vec2(0.7, -0.7)) * 0.18 + uTime * 1.5) * (-0.7);
    dy += 0.15 * 0.25 * cos(dot(pos.xy, vec2(-0.8, -0.5)) * 0.25 + uTime * 0.7) * (-0.5);

    vec3 computedNormal = normalize(vec3(-dx, -dy, 1.0));
    vNormal = normalMatrix * computedNormal;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    vViewPos = mvPos.xyz;
    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec3 vWorldPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = rot * p * 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 worldUv = vWorldPos.xz * 0.015;

    float wave1 = fbm(worldUv + vec2(uTime * 0.04, uTime * 0.03));
    float wave2 = fbm(worldUv * 1.3 + vec2(-uTime * 0.03, uTime * 0.02));
    float n = wave1 * 0.6 + wave2 * 0.4;

    float eps = 0.01;
    float dx = fbm(worldUv + vec2(eps, 0.0) + vec2(uTime * 0.04, uTime * 0.03)) - wave1;
    float dz = fbm(worldUv + vec2(0.0, eps) + vec2(uTime * 0.04, uTime * 0.03)) - wave1;
    vec3 perturbedNormal = normalize(vNormal + vec3(dx, dz, 0.0) * 3.0);

    vec3 lightDir = normalize(vec3(0.3, 1.0, 0.4));
    float diff = max(dot(perturbedNormal, lightDir), 0.0);

    vec3 deep    = vec3(0.01, 0.04, 0.12);
    vec3 mid     = vec3(0.03, 0.14, 0.28);
    vec3 shallow = vec3(0.06, 0.28, 0.42);

    float t1 = smoothstep(0.25, 0.55, n);
    float t2 = smoothstep(0.55, 0.8, n);
    vec3 color = mix(deep, mid, t1);
    color = mix(color, shallow, t2);
    color += diff * 0.2;

    vec3 viewDir = normalize(-vViewPos);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(perturbedNormal, halfDir), 0.0), 128.0);
    color += vec3(1.0, 0.97, 0.9) * spec * 0.45;

    float foam = smoothstep(0.72, 0.82, n);
    color = mix(color, vec3(0.55, 0.62, 0.65), foam * 0.3);

    gl_FragColor = vec4(color, 0.55);
  }
`;

interface WaterPlaneProps {
  centerX: number;
  centerZ: number;
  sizeX: number;
  sizeZ: number;
}

export function WaterPlane({ centerX, centerZ, sizeX, sizeZ }: WaterPlaneProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    [],
  );

  useFrame((_state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position={[centerX, 0, centerZ]}>
      <planeGeometry args={[sizeX, sizeZ, SEGMENTS, SEGMENTS]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
