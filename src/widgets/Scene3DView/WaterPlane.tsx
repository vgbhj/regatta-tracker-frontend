import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;

  void main() {
    vUv = uv;
    vNormal = normalMatrix * normal;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mvPos.xyz;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    vec2 uv = vUv * 12.0;
    float n1 = noise(uv + uTime * 0.15);
    float n2 = noise(uv * 2.3 - uTime * 0.1);
    float n = n1 * 0.6 + n2 * 0.4;

    float eps = 0.02;
    float nx = noise(uv + vec2(eps, 0.0) + uTime * 0.15) - n;
    float ny = noise(uv + vec2(0.0, eps) + uTime * 0.15) - n;
    vec3 perturbedNormal = normalize(vNormal + vec3(nx, ny, 0.0) * 3.0);

    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
    float diff = max(dot(perturbedNormal, lightDir), 0.0);

    vec3 deepColor = vec3(0.01, 0.08, 0.18);
    vec3 shallowColor = vec3(0.08, 0.30, 0.45);
    vec3 color = mix(deepColor, shallowColor, n);
    color += diff * 0.25;

    vec3 viewDir = normalize(-vViewPos);
    vec3 reflDir = reflect(-lightDir, perturbedNormal);
    float spec = pow(max(dot(viewDir, reflDir), 0.0), 64.0);
    color += vec3(1.0, 0.95, 0.85) * spec * 0.6;

    gl_FragColor = vec4(color, 0.35);
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
    () => ({ uTime: { value: 0 } }),
    [],
  );

  useFrame((_state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[centerX, -0.5, centerZ]}
    >
      <planeGeometry args={[sizeX, sizeZ, 1, 1]} />
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
