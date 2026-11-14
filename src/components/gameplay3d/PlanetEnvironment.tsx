import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {
  DynamicEventType,
  EnvironmentId,
  MissionDesign,
  PlanetaryBaseModule,
} from '../../engine/types';
import { EVA_HANDHOLDS } from '../../gameplay/EVAController';
import { getEnvironmentColliders, groundHeightAt } from '../../gameplay/GravitySystem';
import { WORLD_INTERACTABLES, type InteractableDef } from '../../gameplay/InteractionSystem';
import { createPlanetTexture, createSolarPanelTexture } from '../three/proceduralTextures';

interface PlanetEnvironmentProps {
  environment: EnvironmentId;
  mission: MissionDesign;
  highlightedInteractableId: string | null;
  playerPosRef: React.RefObject<{ x: number; y: number; z: number }>;
  isSoftwareGl: boolean;
  builtModules?: PlanetaryBaseModule[];
  activeHazardType?: DynamicEventType | null;
}

function EnvironmentIBL({ intensity }: { intensity: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const envTarget = pmrem.fromScene(room, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
      envTarget.dispose();
      room.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
}

function InteractableMarker({
  item,
  highlighted,
}: {
  item: InteractableDef;
  highlighted: boolean;
}) {
  const color = highlighted
    ? '#22d3ee'
    : item.kind === 'airlock'
      ? '#f59e0b'
      : item.kind === 'sample' || item.kind === 'instrument'
        ? '#10b981'
        : item.kind === 'repair'
          ? '#f97316'
          : '#38bdf8';

  const baseY =
    item.environment === 'moon' || item.environment === 'mars'
      ? groundHeightAt(item.environment, item.x, item.z)
      : item.y - 0.85;

  return (
    <group position={[item.x, baseY, item.z]}>
      {/* Ground / Surface Beacon Ring */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[highlighted ? 0.95 : 0.72, highlighted ? 1.15 : 0.85, 24]} />
        <meshBasicMaterial color={color} transparent opacity={highlighted ? 0.95 : 0.55} side={THREE.DoubleSide} />
      </mesh>

      {/* Visual Equipment / Console / Sample Prop */}
      {(item.kind === 'console' || item.kind === 'comms' || item.kind === 'power' || item.kind === 'spacecraft-ctrl') && (
        <group position={[0, 0.65, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.15, 1.05, 0.65]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.35, 0.34]} rotation={[-0.35, 0, 0]}>
            <boxGeometry args={[0.92, 0.42, 0.04]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={highlighted ? 1.3 : 0.65} />
          </mesh>
        </group>
      )}

      {item.kind === 'sample' && (
        <group position={[0, 0.35, 0]}>
          <mesh castShadow>
            <dodecahedronGeometry args={[0.55, 0]} />
            <meshStandardMaterial
              color={item.environment === 'mars' ? '#9a3412' : '#94a3b8'}
              roughness={0.88}
            />
          </mesh>
          <mesh position={[0.45, -0.1, 0.3]} castShadow>
            <dodecahedronGeometry args={[0.32, 0]} />
            <meshStandardMaterial
              color={item.environment === 'mars' ? '#b45309' : '#64748b'}
              roughness={0.9}
            />
          </mesh>
        </group>
      )}

      {(item.kind === 'instrument' || item.kind === 'storage' || item.kind === 'repair') && (
        <group position={[0, 0.55, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.95, 0.85, 0.85]} />
            <meshStandardMaterial color="#334155" metalness={0.55} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.52, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 0.2, 12]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function ProceduralTerrain({
  env,
  color,
  secondaryColor,
}: {
  env: 'moon' | 'mars';
  color: string;
  secondaryColor: string;
}) {
  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(160, 160, 72, 72);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c1 = new THREE.Color(color);
    const c2 = new THREE.Color(secondaryColor);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = groundHeightAt(env, x, z);
      pos.setY(i, y);

      const blend = Math.max(0, Math.min(1, (y + 2.5) / 5.5));
      tmp.copy(c1).lerp(c2, blend);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [env, color, secondaryColor]);

  useEffect(() => () => geom.dispose(), [geom]);

  return (
    <mesh geometry={geom} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.94} metalness={0.04} />
    </mesh>
  );
}

function InstancedSurfaceRocks({ env, count }: { env: 'moon' | 'mars'; count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const rocks = useMemo(() => {
    const list: Array<{ x: number; y: number; z: number; s: number; rx: number; ry: number }> = [];
    for (let i = 0; i < count; i++) {
      const a = i * 2.39996;
      const r = 13 + ((i * 7.3) % 52);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = groundHeightAt(env, x, z) + 0.15;
      const s = 0.28 + ((i * 19) % 10) * 0.08;
      list.push({ x, y, z, s, rx: (i * 0.7) % 3, ry: (i * 1.1) % 3 });
    }
    return list;
  }, [env, count]);

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    rocks.forEach((rk, i) => {
      dummy.position.set(rk.x, rk.y, rk.z);
      dummy.rotation.set(rk.rx, rk.ry, 0);
      dummy.scale.set(rk.s * 1.3, rk.s * 0.85, rk.s);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [rocks]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={env === 'mars' ? '#7c2d12' : '#64748b'} roughness={0.92} />
    </instancedMesh>
  );
}

function EVATetherLine({
  playerPosRef,
}: {
  playerPosRef: React.RefObject<{ x: number; y: number; z: number }>;
}) {
  const lineObj = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 1.5, 8.2),
      new THREE.Vector3(0, 2.0, 6.2),
    ]);
    const mat = new THREE.LineBasicMaterial({ color: '#f59e0b' });
    return new THREE.Line(geom, mat);
  }, []);

  useEffect(() => {
    return () => {
      lineObj.geometry.dispose();
      (lineObj.material as THREE.Material).dispose();
    };
  }, [lineObj]);

  useFrame(() => {
    const p = playerPosRef.current;
    if (!p) return;
    const posAttr = lineObj.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.setXYZ(1, p.x, p.y + 1.0, p.z);
    posAttr.needsUpdate = true;
  });

  return <primitive object={lineObj} />;
}

export function PlanetEnvironment({
  environment,
  mission,
  highlightedInteractableId,
  playerPosRef,
  isSoftwareGl,
  builtModules = [],
  activeHazardType = null,
}: PlanetEnvironmentProps) {
  const earthTex = useMemo(() => createPlanetTexture('earth', isSoftwareGl ? 1 : 4), [isSoftwareGl]);
  const solarTex = useMemo(() => createSolarPanelTexture(isSoftwareGl ? 1 : 4), [isSoftwareGl]);

  useEffect(() => {
    return () => {
      earthTex.dispose();
      solarTex.dispose();
    };
  }, [earthTex, solarTex]);

  const colliders = useMemo(() => getEnvironmentColliders(environment), [environment]);
  const envInteractables = useMemo(
    () => WORLD_INTERACTABLES.filter((i) => i.environment === environment),
    [environment]
  );
  const envBuiltModules = useMemo(
    () => builtModules.filter((m) => m.environment === environment),
    [builtModules, environment]
  );

  // Starfield points (lightweight)
  const starsGeom = useMemo(() => {
    const count = isSoftwareGl ? 320 : 750;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = ((i * 7919) % 3600) * (Math.PI / 1800);
      const phi = Math.acos(1 - 2 * (((i * 3571) % 1000) / 1000));
      const rad = 115;
      positions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = rad * Math.cos(phi);
      positions[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [isSoftwareGl]);

  useEffect(() => () => starsGeom.dispose(), [starsGeom]);

  const isDustStorm = environment === 'mars' && activeHazardType === 'dust-storm';
  const isSolarStorm = activeHazardType === 'solar-storm';

  const bgColor =
    environment === 'mars'
      ? isDustStorm
        ? '#78350f'
        : '#451a0d'
      : environment === 'station' || environment === 'spacecraft'
        ? '#070b14'
        : '#02040a';

  return (
    <>
      <color attach="background" args={[bgColor]} />
      {environment === 'mars' && (
        <fog
          attach="fog"
          args={[isDustStorm ? '#92400e' : '#5c2614', isDustStorm ? 10 : 28, isDustStorm ? 46 : 92]}
        />
      )}
      <EnvironmentIBL intensity={environment === 'moon' || environment === 'orbital-eva' ? 0.55 : 0.72} />

      <ambientLight intensity={environment === 'station' || environment === 'spacecraft' ? 0.52 : 0.35} />
      <directionalLight
        position={environment === 'moon' ? [30, 26, 20] : [24, 34, 18]}
        intensity={environment === 'mars' ? (isDustStorm ? 1.35 : 1.85) : isSolarStorm ? 2.8 : 2.1}
        color={isSolarStorm ? '#fde047' : environment === 'mars' ? '#fed7aa' : '#ffffff'}
        castShadow={!isSoftwareGl}
      />

      {environment !== 'mars' && (
        <points geometry={starsGeom}>
          <pointsMaterial color="#e2e8f0" size={0.55} sizeAttenuation={false} />
        </points>
      )}

      {/* ==================== SPACE STATION INTERIOR ==================== */}
      {environment === 'station' && (
        <group>
          {/* Metallic Deck Floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color="#1e293b" roughness={0.62} metalness={0.35} />
          </mesh>
          {/* Central Deck Grid Accent */}
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.8, 3.1, 36]} />
            <meshBasicMaterial color="#0ea5e9" />
          </mesh>
          {/* Holographic Mission Table in North Briefing Room */}
          <group position={[0, 0, -18.5]}>
            <mesh position={[0, 0.6, 0]}>
              <cylinderGeometry args={[1.3, 1.4, 1.1, 20]} />
              <meshStandardMaterial color="#0f172a" metalness={0.75} roughness={0.25} />
            </mesh>
            <mesh position={[0, 1.55, 0]}>
              <sphereGeometry args={[0.55, 16, 14]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.4} wireframe />
            </mesh>
          </group>

          {/* Station Perimeter Bulkhead Walls matching BoxColliders */}
          {colliders.boxes.map((b, i) => {
            const w = b.maxX - b.minX;
            const d = b.maxZ - b.minZ;
            const h = b.height ?? 4;
            return (
              <mesh
                key={i}
                position={[(b.minX + b.maxX) / 2, h / 2, (b.minZ + b.maxZ) / 2]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[w, h, d]} />
                <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.45} />
              </mesh>
            );
          })}

          {/* Upper Observation Mezzanine & Ladder */}
          <mesh position={[-6.5, 3.4, 9.2]}>
            <boxGeometry args={[4.5, 0.25, 3.5]} />
            <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[-6.5, 1.7, 7.4]}>
            <boxGeometry args={[0.6, 3.4, 0.14]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.3} />
          </mesh>

          {/* Observation Window View of Planet Earth outside South Deck */}
          <mesh position={[0, 2.5, 29]}>
            <sphereGeometry args={[9.5, 28, 22]} />
            <meshStandardMaterial map={earthTex} roughness={0.75} />
          </mesh>

          {/* Overhead Station Strip Lights */}
          {[-16, -6, 0, 12].map((zPos) => (
            <pointLight key={zPos} position={[0, 3.6, zPos]} intensity={6} distance={18} color="#bae6fd" />
          ))}
        </group>
      )}

      {/* ==================== SPACECRAFT INTERIOR ==================== */}
      {environment === 'spacecraft' && (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[14, 28]} />
            <meshStandardMaterial color="#0f172a" roughness={0.55} metalness={0.4} />
          </mesh>
          {colliders.boxes.map((b, i) => {
            const w = b.maxX - b.minX;
            const d = b.maxZ - b.minZ;
            const h = b.height ?? 3.5;
            return (
              <mesh key={i} position={[(b.minX + b.maxX) / 2, h / 2, (b.minZ + b.maxZ) / 2]}>
                <boxGeometry args={[w, h, d]} />
                <meshStandardMaterial color="#1e293b" roughness={0.45} metalness={0.55} />
              </mesh>
            );
          })}
          {/* Curved Cabin Rib Frames */}
          {[-8, -4, 0, 4, 8].map((z) => (
            <mesh key={z} position={[0, 3.3, z]}>
              <boxGeometry args={[9.6, 0.22, 0.32]} />
              <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
          {/* Forward Canopy Planet View */}
          <mesh position={[0, 4.5, -34]}>
            <sphereGeometry args={[11, 28, 22]} />
            <meshStandardMaterial
              map={mission.destinationId === 'mars' ? undefined : earthTex}
              color={mission.destinationId === 'mars' ? '#c2410c' : '#ffffff'}
              roughness={0.8}
            />
          </mesh>
          <pointLight position={[0, 3.0, -7]} intensity={8} distance={16} color="#7dd3fc" />
          <pointLight position={[0, 3.0, 4]} intensity={7} distance={16} color="#e2e8f0" />
        </group>
      )}

      {/* ==================== LUNAR SURFACE ==================== */}
      {environment === 'moon' && (
        <group>
          <ProceduralTerrain env="moon" color="#64748b" secondaryColor="#94a3b8" />
          <InstancedSurfaceRocks env="moon" count={isSoftwareGl ? 36 : 75} />

          {/* Earth Hanging in Black Lunar Sky */}
          <mesh position={[-35, 34, -75]}>
            <sphereGeometry args={[7.5, 24, 20]} />
            <meshStandardMaterial map={earthTex} roughness={0.7} />
          </mesh>

          {/* Flat Lunar Landing Pad + Lander */}
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[7.5, 8.2, 0.08, 32]} />
            <meshStandardMaterial color="#334155" roughness={0.8} />
          </mesh>
          <group position={[0, 0, 0]}>
            {/* Lander Descent Stage (Gold Kapton MLI) */}
            <mesh position={[0, 1.5, 0]} castShadow>
              <cylinderGeometry args={[1.9, 2.2, 1.8, 8]} />
              <meshStandardMaterial color="#d97706" metalness={0.82} roughness={0.35} />
            </mesh>
            {/* Ascent Cabin */}
            <mesh position={[0, 3.1, 0]} castShadow>
              <cylinderGeometry args={[1.45, 1.65, 1.5, 12]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.35} roughness={0.45} />
            </mesh>
            {/* 4 Landing Legs */}
            {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((ang, idx) => (
              <mesh
                key={idx}
                position={[Math.sin(ang) * 2.3, 0.75, Math.cos(ang) * 2.3]}
                rotation={[Math.cos(ang) * 0.45, 0, -Math.sin(ang) * 0.45]}
              >
                <cylinderGeometry args={[0.1, 0.12, 2.2, 8]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.3} />
              </mesh>
            ))}
          </group>

          {/* Lunar Outpost Habitat Dome + Solar Wing */}
          <group position={[-16, groundHeightAt('moon', -16, 14), 14]}>
            <mesh position={[0, 0.2, 0]} castShadow>
              <sphereGeometry args={[3.3, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.42} metalness={0.2} />
            </mesh>
            <mesh position={[4.5, 1.4, 0]} rotation={[0.45, 0, 0]}>
              <boxGeometry args={[3.6, 0.08, 1.8]} />
              <meshStandardMaterial map={solarTex} roughness={0.25} metalness={0.4} />
            </mesh>
          </group>
        </group>
      )}

      {/* ==================== MARS SURFACE ==================== */}
      {environment === 'mars' && (
        <group>
          <ProceduralTerrain env="mars" color="#9a3412" secondaryColor="#c2410c" />
          <InstancedSurfaceRocks env="mars" count={isSoftwareGl ? 40 : 85} />

          {/* Mars Landing Pad & Descent Module */}
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[7.2, 7.8, 0.08, 32]} />
            <meshStandardMaterial color="#451a03" roughness={0.85} />
          </mesh>
          <group position={[0, 0, 0]}>
            <mesh position={[0, 1.7, 0]} castShadow>
              <cylinderGeometry args={[2.0, 2.3, 2.4, 12]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.4} metalness={0.35} />
            </mesh>
            <mesh position={[0, 3.2, 0]} castShadow>
              <coneGeometry args={[2.0, 1.1, 12]} />
              <meshStandardMaterial color="#f97316" roughness={0.4} />
            </mesh>
          </group>

          {/* Mars Research Habitat & Solar Array */}
          <group position={[-15, groundHeightAt('mars', -15, 12), 12]}>
            <mesh position={[0, 1.5, 0]} castShadow>
              <cylinderGeometry args={[3.6, 3.8, 3.0, 16]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.45} />
            </mesh>
            <mesh position={[0, 3.1, 0]}>
              <sphereGeometry args={[3.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#f97316" roughness={0.35} />
            </mesh>
            <mesh position={[5.2, 1.3, 0]} rotation={[0.4, 0, 0]}>
              <boxGeometry args={[4.2, 0.08, 2.2]} />
              <meshStandardMaterial map={solarTex} roughness={0.25} metalness={0.4} />
            </mesh>
          </group>
        </group>
      )}

      {/* ==================== ORBITAL ZERO-G EVA ==================== */}
      {environment === 'orbital-eva' && (
        <group>
          {/* Giant Curved Earth Below */}
          <mesh position={[0, -56, -15]} rotation={[0.2, 0.4, 0]}>
            <sphereGeometry args={[44, 36, 28]} />
            <meshStandardMaterial map={earthTex} roughness={0.8} />
          </mesh>

          {/* Docked Spacecraft Exterior & Airlock */}
          <group position={[0, 1.5, 11]}>
            <mesh castShadow>
              <cylinderGeometry args={[2.3, 2.3, 5.2, 16]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.35} />
            </mesh>
            <mesh position={[-5.2, 0, 0]}>
              <boxGeometry args={[6.4, 0.08, 2.2]} />
              <meshStandardMaterial map={solarTex} metalness={0.45} roughness={0.25} />
            </mesh>
            <mesh position={[5.2, 0, 0]}>
              <boxGeometry args={[6.4, 0.08, 2.2]} />
              <meshStandardMaterial map={solarTex} metalness={0.45} roughness={0.25} />
            </mesh>
          </group>

          {/* Orbital Truss Spine */}
          <mesh position={[0, 1.5, -5]}>
            <boxGeometry args={[1.4, 1.2, 26]} />
            <meshStandardMaterial color="#64748b" metalness={0.75} roughness={0.3} wireframe />
          </mesh>

          {/* Robotic Arm Worksite */}
          <group position={[-6.5, 2.0, -6.0]}>
            <mesh rotation={[0, 0, 0.5]}>
              <cylinderGeometry args={[0.16, 0.18, 4.5, 10]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.6} roughness={0.3} />
            </mesh>
          </group>

          {/* Damaged Target Satellite */}
          <group position={[0, 3.0, -22]}>
            <mesh castShadow>
              <boxGeometry args={[3.2, 2.6, 3.2]} />
              <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.32} />
            </mesh>
            <mesh position={[-4.5, 0, 0]} rotation={[0.2, 0, 0.15]}>
              <boxGeometry args={[5.5, 0.08, 2.1]} />
              <meshStandardMaterial map={solarTex} roughness={0.25} />
            </mesh>
            <mesh position={[4.5, 0, 0]} rotation={[-0.2, 0, -0.1]}>
              <boxGeometry args={[5.5, 0.08, 2.1]} />
              <meshStandardMaterial map={solarTex} roughness={0.25} />
            </mesh>
            <pointLight position={[0, 0.6, 2.1]} intensity={5} distance={10} color="#f97316" />
          </group>

          {/* EVA Handholds */}
          {EVA_HANDHOLDS.map((h) => (
            <mesh key={h.id} position={[h.x, h.y, h.z]}>
              <torusGeometry args={[0.26, 0.05, 8, 16]} />
              <meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={0.6} />
            </mesh>
          ))}

          {/* Dynamic 3D Safety Tether */}
          <EVATetherLine playerPosRef={playerPosRef} />
        </group>
      )}

      {/* ==================== CONSTRUCTED PLANETARY BASE MODULES ==================== */}
      {envBuiltModules.map((mod) => {
        const baseY =
          environment === 'moon' || environment === 'mars'
            ? groundHeightAt(environment, mod.x, mod.z)
            : 0;
        return (
          <group key={mod.id} position={[mod.x, baseY, mod.z]}>
            {mod.type === 'habitat' || mod.type === 'research-lab' || mod.type === 'life-support' ? (
              <>
                <mesh position={[0, 1.3, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[2.3, 2.5, 2.4, 16]} />
                  <meshStandardMaterial
                    color={mod.type === 'research-lab' ? '#bae6fd' : '#e2e8f0'}
                    roughness={0.4}
                    metalness={0.2}
                  />
                </mesh>
                <mesh position={[0, 2.6, 0]}>
                  <sphereGeometry args={[2.25, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  <meshStandardMaterial
                    color={mod.type === 'life-support' ? '#10b981' : '#38bdf8'}
                    roughness={0.35}
                  />
                </mesh>
                <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[3.2, 3.5, 28]} />
                  <meshBasicMaterial color="#10b981" transparent opacity={0.45} side={THREE.DoubleSide} />
                </mesh>
              </>
            ) : mod.type === 'solar-farm' ? (
              <>
                <mesh position={[0, 0.9, 0]}>
                  <cylinderGeometry args={[0.14, 0.18, 1.8, 10]} />
                  <meshStandardMaterial color="#475569" metalness={0.7} />
                </mesh>
                <mesh position={[0, 1.75, 0]} rotation={[0.42, 0, 0]} castShadow>
                  <boxGeometry args={[4.6, 0.08, 2.2]} />
                  <meshStandardMaterial map={solarTex} roughness={0.22} metalness={0.45} />
                </mesh>
              </>
            ) : mod.type === 'comms-tower' ? (
              <>
                <mesh position={[0, 2.2, 0]} castShadow>
                  <cylinderGeometry args={[0.12, 0.3, 4.4, 8]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.3} />
                </mesh>
                <mesh position={[0, 4.4, 0.25]} rotation={[0.6, 0, 0]}>
                  <cylinderGeometry args={[1.1, 0.15, 0.45, 16]} />
                  <meshStandardMaterial color="#f8fafc" metalness={0.4} roughness={0.3} />
                </mesh>
                <pointLight position={[0, 4.7, 0]} intensity={3} distance={8} color="#38bdf8" />
              </>
            ) : mod.type === 'landing-pad' ? (
              <mesh position={[0, 0.06, 0]}>
                <cylinderGeometry args={[4.2, 4.6, 0.12, 24]} />
                <meshStandardMaterial color="#334155" roughness={0.8} metalness={0.2} />
              </mesh>
            ) : (
              <mesh position={[0, 1.1, 0]} castShadow>
                <boxGeometry args={[3.2, 2.2, 2.8]} />
                <meshStandardMaterial
                  color={mod.type === 'rover-garage' ? '#f59e0b' : '#64748b'}
                  roughness={0.45}
                  metalness={0.45}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* ==================== INTERACTABLE MARKERS ==================== */}
      {envInteractables.map((item) => (
        <InteractableMarker
          key={item.id}
          item={item}
          highlighted={highlightedInteractableId === item.id}
        />
      ))}
    </>
  );
}
