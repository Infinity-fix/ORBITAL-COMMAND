import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { CameraMode, EnvironmentId } from '../../engine/types';
import { resolveCameraCollision } from '../../gameplay/GravitySystem';

export interface ThirdPersonCameraProps {
  environment: EnvironmentId;
  cameraMode: CameraMode;
  shoulderSide?: 'right' | 'left';
  aimScan?: boolean;
  targetPosRef: React.RefObject<{ x: number; y: number; z: number; yaw: number }>;
  cameraOrbitRef: React.RefObject<{ yaw: number; pitch: number; distance: number }>;
}

const _desiredCam = new THREE.Vector3();
const _smoothPos = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

export function ThirdPersonCamera({
  environment,
  cameraMode,
  shoulderSide = 'right',
  aimScan = false,
  targetPosRef,
  cameraOrbitRef,
}: ThirdPersonCameraProps) {
  const { camera } = useThree();
  const initializedRef = useRef(false);
  const shoulderSignRef = useRef(1);

  useFrame((_, dt) => {
    const t = targetPosRef.current;
    const orb = cameraOrbitRef.current;
    if (!t || !orb) return;

    const clampedDt = Math.min(0.05, Math.max(0.001, dt));
    const yaw = orb.yaw;
    const pitch = Math.max(-0.95, Math.min(0.85, orb.pitch));
    const targetShoulderSign = shoulderSide === 'left' ? -1 : 1;
    shoulderSignRef.current +=
      (targetShoulderSign - shoulderSignRef.current) * Math.min(1, 10 * clampedDt);

    if (cameraMode === 'first-person') {
      const eyeY = t.y + 1.56;
      camera.position.set(t.x, eyeY, t.z);
      const lookDist = 10;
      _lookTarget.set(
        t.x - Math.sin(yaw) * Math.cos(pitch) * lookDist,
        eyeY - Math.sin(pitch) * lookDist,
        t.z - Math.cos(yaw) * Math.cos(pitch) * lookDist
      );
      camera.lookAt(_lookTarget);
      initializedRef.current = true;
      return;
    }

    if (cameraMode === 'spacecraft-ext') {
      const extRadius = environment === 'station' ? 28 : 16;
      const angle = yaw * 0.7;
      _desiredCam.set(
        Math.sin(angle) * extRadius,
        8 + Math.sin(pitch) * 6,
        Math.cos(angle) * extRadius
      );
      _lookTarget.set(0, 1.5, 0);
      if (!initializedRef.current) {
        _smoothPos.copy(_desiredCam);
        initializedRef.current = true;
      } else {
        _smoothPos.lerp(_desiredCam, 1 - Math.exp(-6 * clampedDt));
      }
      camera.position.copy(_smoothPos);
      camera.lookAt(_lookTarget);
      return;
    }

    const baseDistRaw =
      cameraMode === 'close-inspect'
        ? Math.min(2.8, orb.distance * 0.58)
        : cameraMode === 'rover'
          ? Math.max(6.2, orb.distance * 1.28)
          : orb.distance;
    const baseDist = aimScan ? Math.max(2.2, baseDistRaw * 0.72) : baseDistRaw;

    const focusY = cameraMode === 'rover' ? t.y + 1.45 : t.y + 1.42;
    const shoulderOffset =
      (cameraMode === 'close-inspect' ? 0.54 : cameraMode === 'third-person' ? 0.42 : 0) *
      shoulderSignRef.current;

    // Right/left vector relative to camera yaw for over-the-shoulder tactical framing
    const rightX = Math.cos(yaw) * shoulderOffset;
    const rightZ = -Math.sin(yaw) * shoulderOffset;

    _lookTarget.set(t.x + rightX, focusY, t.z + rightZ);

    const horizDist = Math.cos(pitch) * baseDist;
    const vertDist = Math.sin(pitch) * baseDist;

    const rawCam = {
      x: _lookTarget.x + Math.sin(yaw) * horizDist,
      y: _lookTarget.y + vertDist + 0.35,
      z: _lookTarget.z + Math.cos(yaw) * horizDist,
    };

    const safeCam = resolveCameraCollision(
      environment,
      { x: _lookTarget.x, y: _lookTarget.y, z: _lookTarget.z },
      rawCam
    );

    _desiredCam.set(safeCam.x, safeCam.y, safeCam.z);

    if (!initializedRef.current) {
      _smoothPos.copy(_desiredCam);
      initializedRef.current = true;
    } else {
      _smoothPos.lerp(_desiredCam, 1 - Math.exp(-14 * clampedDt));
    }

    camera.position.copy(_smoothPos);
    camera.lookAt(_lookTarget);
  });

  return null;
}
