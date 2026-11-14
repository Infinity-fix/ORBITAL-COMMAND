import type { RoverState } from '../../engine/types';

export function RoverMesh3D({ rover, highlighted }: { rover: RoverState; highlighted: boolean }) {
  const isMars = rover.environment === 'mars';
  const bodyColor = isMars ? '#f8fafc' : '#cbd5e1';
  const accentColor = isMars ? '#f97316' : '#38bdf8';

  const wheelPositions: Array<[number, number, number, boolean]> = [
    [-0.95, 0.36, 1.05, true],
    [0.95, 0.36, 1.05, true],
    [-0.95, 0.36, -1.05, false],
    [0.95, 0.36, -1.05, false],
  ];

  return (
    <group position={[rover.x, rover.y, rover.z]} rotation={[0, rover.yaw, 0]}>
      {/* Main Chassis Deck */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[1.55, 0.32, 2.5]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.45} />
      </mesh>
      {/* Gold Thermal MLI Core */}
      <mesh position={[0, 0.66, -0.3]} castShadow>
        <boxGeometry args={[1.22, 0.36, 1.25]} />
        <meshStandardMaterial color="#d97706" roughness={0.35} metalness={0.85} />
      </mesh>
      {/* Driver Seat / Pressurized Canopy Frame */}
      <mesh position={[0, 0.94, 0.45]} castShadow>
        <boxGeometry args={[0.92, 0.34, 0.72]} />
        <meshStandardMaterial color="#1e293b" roughness={0.55} metalness={0.4} />
      </mesh>
      {/* Mast Camera Tower */}
      <mesh position={[0.45, 1.25, 0.88]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.95, 10]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0.45, 1.72, 0.92]} castShadow>
        <boxGeometry args={[0.32, 0.16, 0.2]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Twin Mast Optical Lenses */}
      <mesh position={[0.38, 1.72, 1.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.04, 10]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0.52, 1.72, 1.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.04, 10]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.2} />
      </mesh>
      {/* Solar Deck & Dish */}
      <mesh position={[0, 0.86, -0.68]}>
        <boxGeometry args={[1.4, 0.05, 0.9]} />
        <meshStandardMaterial color="#0f172a" roughness={0.25} metalness={0.6} />
      </mesh>
      {/* Accent Bumper */}
      <mesh position={[0, 0.56, 1.28]}>
        <boxGeometry args={[1.42, 0.12, 0.1]} />
        <meshStandardMaterial color={accentColor} roughness={0.35} />
      </mesh>

      {/* Articulated Rotating Wheels */}
      {wheelPositions.map(([wx, wy, wz, isFront], idx) => (
        <group
          key={idx}
          position={[wx, wy, wz]}
          rotation={[0, isFront ? rover.steerAngle : 0, 0]}
        >
          <group rotation={[rover.wheelSpin, 0, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.36, 0.36, 0.26, 16]} />
              <meshStandardMaterial color="#1e293b" roughness={0.85} metalness={0.35} />
            </mesh>
            <mesh position={[wx > 0 ? 0.14 : -0.14, 0, 0]}>
              <boxGeometry args={[0.03, 0.45, 0.08]} />
              <meshStandardMaterial color={accentColor} metalness={0.6} roughness={0.3} />
            </mesh>
          </group>
        </group>
      ))}

      {highlighted && (
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 2.05, 32]} />
          <meshBasicMaterial color="#38bdf8" side={2} />
        </mesh>
      )}
    </group>
  );
}
