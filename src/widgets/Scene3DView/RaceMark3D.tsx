interface RaceMark3DProps {
  x: number;
  z: number;
  type: 'start' | 'finish' | 'turning';
  scale: number;
}

const COLORS: Record<string, string> = {
  start: '#00c853',
  finish: '#d50000',
  turning: '#ffd600',
};

export function RaceMark3D({ x, z, type, scale }: RaceMark3DProps) {
  const color = COLORS[type] ?? '#ff0000';
  const radius = 2 * scale;
  const height = 10 * scale;
  return (
    <mesh position={[x, height / 2, z]}>
      <cylinderGeometry args={[radius, radius, height, 12]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
