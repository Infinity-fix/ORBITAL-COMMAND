import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type {
  AstronautCustomization,
  CharacterAnimationState,
  EquipmentId,
} from '../../engine/types';
import {
  applyAstronautProceduralAnimation,
  type AstronautJointRefs,
} from './CharacterAnimationController';

export interface AstronautModelProps {
  customization: AstronautCustomization;
  animState: CharacterAnimationState;
  strideDistance?: number;
  equippedItem: EquipmentId | null;
  flashlightOn: boolean;
  isZeroG?: boolean;
  hideHead?: boolean;
  oxygenPct?: number;
  suitIntegrityPct?: number;
  aimScan?: boolean;
  isLocal?: boolean;
  /** Optional mutable transform ref for zero-re-render 60fps movement */
  transformRef?: React.RefObject<{
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch?: number;
    animState: CharacterAnimationState;
    strideDistance: number;
  }>;
}

export function AstronautModel({
  customization,
  animState,
  strideDistance = 0,
  equippedItem,
  flashlightOn,
  isZeroG = false,
  hideHead = false,
  oxygenPct = 100,
  suitIntegrityPct = 100,
  aimScan = false,
  transformRef,
}: AstronautModelProps) {
  const rootRef = useRef<THREE.Group>(null);
  const pelvisRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const lShRef = useRef<THREE.Group>(null);
  const lElbRef = useRef<THREE.Group>(null);
  const rShRef = useRef<THREE.Group>(null);
  const rElbRef = useRef<THREE.Group>(null);
  const lHipRef = useRef<THREE.Group>(null);
  const lKneeRef = useRef<THREE.Group>(null);
  const rHipRef = useRef<THREE.Group>(null);
  const rKneeRef = useRef<THREE.Group>(null);

  const visorColor = useMemo(() => {
    if (customization.helmetStyle === 'cyan-hud') return '#38bdf8';
    if (customization.helmetStyle === 'polarized-dark') return '#1e293b';
    return '#f59e0b';
  }, [customization.helmetStyle]);

  const patchColor = useMemo(() => {
    if (customization.missionPatch === 'ARTEMIS') return '#38bdf8';
    if (customization.missionPatch === 'EVA') return '#10b981';
    if (customization.missionPatch === 'ORBITAL') return '#a855f7';
    return '#f97316';
  }, [customization.missionPatch]);

  const isSlim = customization.characterArchetype === 'slim';
  const torsoWidth = isSlim ? 0.36 : 0.42;
  const pelvisWidth = isSlim ? 0.34 : 0.38;
  const shoulderX = isSlim ? 0.23 : 0.27;
  const statusLedColor =
    oxygenPct < 25 || suitIntegrityPct < 45
      ? '#f43f5e'
      : oxygenPct < 50 || suitIntegrityPct < 75
        ? '#f59e0b'
        : '#22c55e';

  useFrame((state, dt) => {
    if (transformRef?.current && rootRef.current) {
      const t = transformRef.current;
      rootRef.current.position.set(t.x, t.y, t.z);
      rootRef.current.rotation.set(t.pitch ?? 0, t.yaw, 0);
    }

    const activeAnim = transformRef?.current ? transformRef.current.animState : animState;
    const activeStride = transformRef?.current ? transformRef.current.strideDistance : strideDistance;

    const joints: AstronautJointRefs = {
      root: rootRef.current,
      pelvis: pelvisRef.current,
      torso: torsoRef.current,
      head: headRef.current,
      leftShoulder: lShRef.current,
      leftElbow: lElbRef.current,
      rightShoulder: rShRef.current,
      rightElbow: rElbRef.current,
      leftHip: lHipRef.current,
      leftKnee: lKneeRef.current,
      rightHip: rHipRef.current,
      rightKnee: rKneeRef.current,
    };

    applyAstronautProceduralAnimation(joints, {
      animState: activeAnim,
      strideDistance: activeStride,
      timeSec: state.clock.elapsedTime,
      hasEquippedItem: Boolean(equippedItem),
      isZeroG,
      dt,
    });
  });

  const primary = customization.primaryColor;
  const accent = customization.accentColor;

  return (
    <group ref={rootRef}>
      {/* Pelvis / Hip Root (~0.88m off ground) */}
      <group ref={pelvisRef} position={[0, 0.88, 0]}>
        <mesh castShadow>
          <boxGeometry args={[pelvisWidth, 0.17, 0.24]} />
          <meshStandardMaterial color={primary} roughness={0.55} metalness={0.12} />
        </mesh>
        {/* Waist Utility Belt */}
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[pelvisWidth + 0.02, 0.06, 0.26]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.45} />
        </mesh>
        <mesh position={[0, 0.04, 0.135]}>
          <boxGeometry args={[0.09, 0.05, 0.02]} />
          <meshStandardMaterial color={accent} roughness={0.3} metalness={0.6} />
        </mesh>

        {/* Torso + PLSS Backpack + Helmet */}
        <group ref={torsoRef} position={[0, 0.09, 0]}>
          {/* Upper Suit Torso */}
          <mesh position={[0, 0.24, 0]} castShadow>
            <boxGeometry args={[torsoWidth, 0.44, 0.27]} />
            <meshStandardMaterial color={primary} roughness={0.48} metalness={0.15} />
          </mesh>
          {/* Shoulder Stripes */}
          <mesh position={[0, 0.42, 0]}>
            <boxGeometry args={[torsoWidth + 0.02, 0.07, 0.28]} />
            <meshStandardMaterial color={accent} roughness={0.4} metalness={0.25} />
          </mesh>

          {/* Chest Display & Control Module (DCM) */}
          <mesh position={[0, 0.24, 0.15]} castShadow>
            <boxGeometry args={[0.24, 0.2, 0.07]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.35} metalness={0.55} />
          </mesh>
          {/* Chest Oxygen Indicator LED Strip */}
          <mesh position={[0.05, 0.27, 0.188]}>
            <boxGeometry args={[0.08, 0.025, 0.01]} />
            <meshStandardMaterial
              color={statusLedColor}
              emissive={statusLedColor}
              emissiveIntensity={1.6}
            />
          </mesh>
          {/* Mission Patch Badge */}
          <mesh position={[-0.14, 0.34, 0.142]}>
            <cylinderGeometry args={[0.042, 0.042, 0.012, 16]} />
            <meshStandardMaterial color={patchColor} roughness={0.35} metalness={0.4} />
          </mesh>

          {/* Accessory: Chest Cam */}
          {customization.accessory === 'chest-cam' && (
            <mesh position={[-0.07, 0.28, 0.19]}>
              <boxGeometry args={[0.05, 0.045, 0.035]} />
              <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
            </mesh>
          )}
          {/* Accessory: Shoulder Beacon */}
          {customization.accessory === 'shoulder-beacon' && (
            <mesh position={[0.22, 0.47, 0]}>
              <sphereGeometry args={[0.032, 10, 10]} />
              <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.8} />
            </mesh>
          )}

          {/* Life Support Backpack (PLSS) */}
          <group position={[0, 0.25, -0.21]}>
            <mesh castShadow>
              <boxGeometry args={[0.36, 0.48, 0.18]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.4} metalness={0.3} />
            </mesh>
            {/* Twin Oxygen Bottles */}
            <mesh position={[-0.1, -0.02, -0.08]} castShadow>
              <cylinderGeometry args={[0.055, 0.055, 0.38, 12]} />
              <meshStandardMaterial color={accent} roughness={0.3} metalness={0.5} />
            </mesh>
            <mesh position={[0.1, -0.02, -0.08]} castShadow>
              <cylinderGeometry args={[0.055, 0.055, 0.38, 12]} />
              <meshStandardMaterial color={accent} roughness={0.3} metalness={0.5} />
            </mesh>
            {/* PLSS Variant Details */}
            {customization.backpackStyle === 'eva-thruster' && (
              <>
                <mesh position={[-0.22, 0.14, 0]}>
                  <boxGeometry args={[0.08, 0.14, 0.16]} />
                  <meshStandardMaterial color="#334155" metalness={0.65} roughness={0.35} />
                </mesh>
                <mesh position={[0.22, 0.14, 0]}>
                  <boxGeometry args={[0.08, 0.14, 0.16]} />
                  <meshStandardMaterial color="#334155" metalness={0.65} roughness={0.35} />
                </mesh>
              </>
            )}
            {customization.backpackStyle === 'science-rack' && (
              <mesh position={[0, 0.3, 0]}>
                <boxGeometry args={[0.28, 0.1, 0.12]} />
                <meshStandardMaterial color="#10b981" roughness={0.4} metalness={0.4} />
              </mesh>
            )}
            {/* Backpack Status Beacon + Optional Whip Antenna */}
            <mesh position={[0.12, 0.27, -0.04]}>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshStandardMaterial color={statusLedColor} emissive={statusLedColor} emissiveIntensity={1.5} />
            </mesh>
            {(customization.accessory === 'antenna-whip' || customization.backpackStyle === 'science-rack') && (
              <mesh position={[-0.14, 0.42, -0.05]}>
                <cylinderGeometry args={[0.008, 0.01, 0.36, 6]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
              </mesh>
            )}
          </group>

          {/* Neck Ring & Helmet (hidden in First-Person Helmet View) */}
          <group ref={headRef} position={[0, 0.5, 0]} visible={!hideHead}>
            {/* Pressure Collar */}
            <mesh position={[0, -0.02, 0]}>
              <cylinderGeometry args={[0.14, 0.15, 0.06, 16]} />
              <meshStandardMaterial color="#475569" metalness={0.75} roughness={0.3} />
            </mesh>
            {/* Outer Helmet Shell */}
            <mesh position={[0, 0.13, 0]} castShadow>
              <sphereGeometry args={[0.185, 20, 18]} />
              <meshStandardMaterial color={primary} roughness={0.28} metalness={0.2} />
            </mesh>
            {/* Reflective Visor Shield */}
            <mesh position={[0, 0.13, 0.045]} scale={[0.92, 0.85, 0.9]}>
              <sphereGeometry args={[0.17, 18, 16, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.22, Math.PI * 0.54]} />
              <meshStandardMaterial
                color={visorColor}
                roughness={0.08}
                metalness={0.92}
                emissive={aimScan ? '#22d3ee' : customization.helmetStyle === 'cyan-hud' ? '#0ea5e9' : '#000000'}
                emissiveIntensity={aimScan ? 0.65 : customization.helmetStyle === 'cyan-hud' ? 0.25 : 0}
              />
            </mesh>
            {/* Dual Suit Headlamps */}
            <mesh position={[-0.14, 0.19, 0.1]}>
              <boxGeometry args={[0.045, 0.035, 0.05]} />
              <meshStandardMaterial
                color={flashlightOn ? '#fef08a' : '#334155'}
                emissive={flashlightOn ? '#fef08a' : '#000000'}
                emissiveIntensity={flashlightOn ? 2.2 : 0}
              />
            </mesh>
            <mesh position={[0.14, 0.19, 0.1]}>
              <boxGeometry args={[0.045, 0.035, 0.05]} />
              <meshStandardMaterial
                color={flashlightOn ? '#fef08a' : '#334155'}
                emissive={flashlightOn ? '#fef08a' : '#000000'}
                emissiveIntensity={flashlightOn ? 2.2 : 0}
              />
            </mesh>
            {flashlightOn && (
              <pointLight position={[0, 0.22, 0.4]} intensity={4.5} distance={14} color="#fffbeb" />
            )}
          </group>

          {/* Left Arm */}
          <group ref={lShRef} position={[-shoulderX, 0.39, 0]}>
            <mesh position={[0, -0.14, 0]} castShadow>
              <capsuleGeometry args={[0.068, 0.2, 6, 10]} />
              <meshStandardMaterial color={primary} roughness={0.5} />
            </mesh>
            <group ref={lElbRef} position={[0, -0.28, 0]}>
              <mesh position={[0, -0.12, 0]} castShadow>
                <capsuleGeometry args={[0.058, 0.18, 6, 10]} />
                <meshStandardMaterial color={primary} roughness={0.5} />
              </mesh>
              {/* Glove */}
              <mesh position={[0, -0.24, 0.01]}>
                <sphereGeometry args={[0.055, 10, 10]} />
                <meshStandardMaterial color={accent} roughness={0.45} metalness={0.2} />
              </mesh>
            </group>
          </group>

          {/* Right Arm + Handheld Equipment */}
          <group ref={rShRef} position={[shoulderX, 0.39, 0]}>
            <mesh position={[0, -0.14, 0]} castShadow>
              <capsuleGeometry args={[0.068, 0.2, 6, 10]} />
              <meshStandardMaterial color={primary} roughness={0.5} />
            </mesh>
            <group ref={rElbRef} position={[0, -0.28, 0]}>
              <mesh position={[0, -0.12, 0]} castShadow>
                <capsuleGeometry args={[0.058, 0.18, 6, 10]} />
                <meshStandardMaterial color={primary} roughness={0.5} />
              </mesh>
              {/* Glove */}
              <mesh position={[0, -0.24, 0.01]}>
                <sphereGeometry args={[0.055, 10, 10]} />
                <meshStandardMaterial color={accent} roughness={0.45} metalness={0.2} />
              </mesh>

              {/* Held Equipment Mesh */}
              {equippedItem && (
                <group position={[0, -0.26, 0.11]}>
                  {equippedItem === 'drill' || equippedItem === 'repair-tool' ? (
                    <>
                      <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.032, 0.04, 0.22, 8]} />
                        <meshStandardMaterial color={equippedItem === 'drill' ? '#f59e0b' : '#38bdf8'} metalness={0.65} roughness={0.3} />
                      </mesh>
                      <mesh position={[0, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.008, 0.015, 0.14, 8]} />
                        <meshStandardMaterial color="#e2e8f0" metalness={0.85} roughness={0.2} />
                      </mesh>
                    </>
                  ) : equippedItem === 'spectrometer' || equippedItem === 'camera' ? (
                    <>
                      <mesh>
                        <boxGeometry args={[0.11, 0.09, 0.14]} />
                        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.35} />
                      </mesh>
                      <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.028, 0.028, 0.05, 10]} />
                        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.8} />
                      </mesh>
                    </>
                  ) : equippedItem === 'hammer' ? (
                    <>
                      <mesh rotation={[Math.PI / 4, 0, 0]}>
                        <cylinderGeometry args={[0.014, 0.014, 0.28, 8]} />
                        <meshStandardMaterial color="#f97316" roughness={0.5} />
                      </mesh>
                      <mesh position={[0, 0.09, 0.09]}>
                        <boxGeometry args={[0.14, 0.05, 0.05]} />
                        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} />
                      </mesh>
                    </>
                  ) : (
                    <mesh>
                      <cylinderGeometry args={[0.038, 0.038, 0.16, 10]} />
                      <meshStandardMaterial
                        color={equippedItem === 'emergency-o2' ? '#22c55e' : '#38bdf8'}
                        metalness={0.5}
                        roughness={0.3}
                      />
                    </mesh>
                  )}
                </group>
              )}
            </group>
          </group>
        </group>

        {/* Left Leg */}
        <group ref={lHipRef} position={[-0.11, -0.07, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.082, 0.26, 6, 10]} />
            <meshStandardMaterial color={primary} roughness={0.55} />
          </mesh>
          <group ref={lKneeRef} position={[0, -0.39, 0]}>
            <mesh position={[0, -0.19, 0]} castShadow>
              <capsuleGeometry args={[0.07, 0.26, 6, 10]} />
              <meshStandardMaterial color={primary} roughness={0.55} />
            </mesh>
            {/* Heavy Lunar/EVA Boot */}
            <mesh position={[0, -0.38, 0.03]} castShadow>
              <boxGeometry args={[0.13, 0.1, 0.22]} />
              <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.25} />
            </mesh>
          </group>
        </group>

        {/* Right Leg */}
        <group ref={rHipRef} position={[0.11, -0.07, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.082, 0.26, 6, 10]} />
            <meshStandardMaterial color={primary} roughness={0.55} />
          </mesh>
          <group ref={rKneeRef} position={[0, -0.39, 0]}>
            <mesh position={[0, -0.19, 0]} castShadow>
              <capsuleGeometry args={[0.07, 0.26, 6, 10]} />
              <meshStandardMaterial color={primary} roughness={0.55} />
            </mesh>
            <mesh position={[0, -0.38, 0.03]} castShadow>
              <boxGeometry args={[0.13, 0.1, 0.22]} />
              <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.25} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
