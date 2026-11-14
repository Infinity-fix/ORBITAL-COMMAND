import * as THREE from 'three';
import type { CharacterAnimationState } from '../../engine/types';

export interface AstronautJointRefs {
  root: THREE.Group | null;
  pelvis: THREE.Group | null;
  torso: THREE.Group | null;
  head: THREE.Group | null;
  leftShoulder: THREE.Group | null;
  leftElbow: THREE.Group | null;
  rightShoulder: THREE.Group | null;
  rightElbow: THREE.Group | null;
  leftHip: THREE.Group | null;
  leftKnee: THREE.Group | null;
  rightHip: THREE.Group | null;
  rightKnee: THREE.Group | null;
}

export interface AnimationSampleInput {
  animState: CharacterAnimationState;
  strideDistance: number;
  timeSec: number;
  hasEquippedItem: boolean;
  isZeroG: boolean;
  dt: number;
}

function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * Math.min(0.05, dt)));
}

export function applyAstronautProceduralAnimation(
  joints: AstronautJointRefs,
  input: AnimationSampleInput
): void {
  const { animState, strideDistance, timeSec, hasEquippedItem, isZeroG, dt } = input;
  const speedBlend = 14;

  // Target joint angles
  let pelvisY = 0.88;
  let pelvisTiltX = 0;
  let torsoTwistY = 0;
  let torsoTiltX = 0;
  let headTiltX = 0;
  let headTurnY = 0;

  let lHipX = 0;
  let rHipX = 0;
  let lKneeX = 0;
  let rKneeX = 0;

  let lShX = 0.08;
  let rShX = 0.08;
  let lShZ = 0.14;
  let rShZ = -0.14;
  let lElbX = -0.25;
  let rElbX = -0.25;

  // Distance-synced stride phase prevents foot sliding on surfaces
  const stridePhase = strideDistance * 2.55;
  const idleBreath = Math.sin(timeSec * 2.1);

  if (animState === 'idle') {
    pelvisY = isZeroG ? 0.92 + Math.sin(timeSec * 1.4) * 0.04 : 0.88 + idleBreath * 0.008;
    torsoTiltX = isZeroG ? 0.12 : 0.02 + idleBreath * 0.015;
    lShZ = isZeroG ? 0.34 : 0.16;
    rShZ = isZeroG ? -0.34 : -0.16;
    lElbX = isZeroG ? -0.55 : -0.22;
    rElbX = hasEquippedItem ? -0.62 : isZeroG ? -0.55 : -0.22;
    if (isZeroG) {
      lHipX = -0.22 + Math.sin(timeSec * 1.3) * 0.08;
      rHipX = -0.15 - Math.sin(timeSec * 1.3) * 0.08;
      lKneeX = 0.42;
      rKneeX = 0.36;
    }
  } else if (animState === 'walk' || animState === 'run' || animState === 'sprint') {
    const amp = animState === 'sprint' ? 0.82 : animState === 'run' ? 0.65 : 0.44;
    const armAmp = animState === 'sprint' ? 0.78 : animState === 'run' ? 0.56 : 0.36;
    const s = Math.sin(stridePhase);
    const c = Math.cos(stridePhase);

    pelvisY = 0.87 + Math.abs(c) * (animState === 'sprint' ? 0.065 : 0.035);
    torsoTiltX = animState === 'sprint' ? 0.22 : animState === 'run' ? 0.12 : 0.05;
    torsoTwistY = -s * 0.11;

    lHipX = s * amp;
    rHipX = -s * amp;
    lKneeX = Math.max(0.05, -c * amp * 1.05 + 0.25);
    rKneeX = Math.max(0.05, c * amp * 1.05 + 0.25);

    lShX = -s * armAmp;
    rShX = hasEquippedItem ? -0.35 - s * armAmp * 0.35 : s * armAmp;
    lElbX = -0.45 - Math.max(0, -s) * 0.35;
    rElbX = hasEquippedItem ? -0.78 : -0.45 - Math.max(0, s) * 0.35;
  } else if (animState === 'crouch') {
    const s = Math.sin(stridePhase * 0.8);
    pelvisY = 0.58;
    torsoTiltX = 0.34;
    lHipX = -0.82 + s * 0.28;
    rHipX = -0.82 - s * 0.28;
    lKneeX = 1.35;
    rKneeX = 1.35;
    lShX = -0.35;
    rShX = -0.42;
    lElbX = -0.7;
    rElbX = -0.7;
  } else if (animState === 'jump' || animState === 'fall') {
    pelvisY = 0.92;
    torsoTiltX = animState === 'jump' ? -0.06 : 0.12;
    lHipX = animState === 'jump' ? -0.38 : -0.18;
    rHipX = animState === 'jump' ? 0.18 : -0.34;
    lKneeX = 0.65;
    rKneeX = 0.48;
    lShZ = 0.55;
    rShZ = -0.55;
    lShX = -0.4;
    rShX = -0.4;
  } else if (animState === 'land') {
    pelvisY = 0.7;
    torsoTiltX = 0.26;
    lHipX = -0.58;
    rHipX = -0.58;
    lKneeX = 1.05;
    rKneeX = 1.05;
    lShZ = 0.38;
    rShZ = -0.38;
  } else if (animState === 'climb') {
    const phase = timeSec * 5.2;
    pelvisY = 0.86;
    torsoTiltX = 0.14;
    lShX = -1.35 + Math.sin(phase) * 0.55;
    rShX = -1.35 - Math.sin(phase) * 0.55;
    lElbX = -0.8;
    rElbX = -0.8;
    lHipX = -0.45 - Math.sin(phase) * 0.45;
    rHipX = -0.45 + Math.sin(phase) * 0.45;
    lKneeX = 0.85;
    rKneeX = 0.85;
  } else if (animState === 'collect') {
    pelvisY = 0.62;
    torsoTiltX = 0.55;
    headTiltX = 0.28;
    lHipX = -0.75;
    rHipX = -0.45;
    lKneeX = 1.2;
    rKneeX = 0.95;
    rShX = -1.05 + Math.sin(timeSec * 8) * 0.16;
    rElbX = -0.45;
  } else if (animState === 'instrument' || animState === 'console' || animState === 'interact') {
    torsoTiltX = 0.12;
    headTiltX = 0.18;
    rShX = -0.95;
    rElbX = -0.65 + Math.sin(timeSec * 7) * 0.1;
    lShX = -0.52;
    lElbX = -0.85;
  } else if (animState === 'repair') {
    torsoTiltX = 0.22;
    headTiltX = 0.15;
    rShX = -1.15 + Math.sin(timeSec * 14) * 0.08;
    rElbX = -0.45;
    lShX = -0.78;
    lElbX = -0.7;
  } else if (animState === 'wave') {
    rShX = -2.45;
    rShZ = -0.45 + Math.sin(timeSec * 10) * 0.32;
    rElbX = -0.35 + Math.sin(timeSec * 10) * 0.25;
    headTurnY = Math.sin(timeSec * 2) * 0.12;
  } else if (animState === 'carry') {
    torsoTiltX = 0.08;
    lShX = -0.85;
    rShX = -0.85;
    lElbX = -0.95;
    rElbX = -0.95;
  } else if (animState === 'emergency') {
    pelvisY = 0.85;
    torsoTiltX = 0.18;
    lShX = -0.95;
    rShX = -0.95;
    lElbX = -1.1;
    rElbX = -1.1;
    headTiltX = Math.sin(timeSec * 8) * 0.08;
  }

  if (joints.pelvis) {
    joints.pelvis.position.y = damp(joints.pelvis.position.y, pelvisY, speedBlend, dt);
    joints.pelvis.rotation.x = damp(joints.pelvis.rotation.x, pelvisTiltX, speedBlend, dt);
  }
  if (joints.torso) {
    joints.torso.rotation.x = damp(joints.torso.rotation.x, torsoTiltX, speedBlend, dt);
    joints.torso.rotation.y = damp(joints.torso.rotation.y, torsoTwistY, speedBlend, dt);
  }
  if (joints.head) {
    joints.head.rotation.x = damp(joints.head.rotation.x, headTiltX, speedBlend, dt);
    joints.head.rotation.y = damp(joints.head.rotation.y, headTurnY, speedBlend, dt);
  }
  if (joints.leftHip) joints.leftHip.rotation.x = damp(joints.leftHip.rotation.x, lHipX, speedBlend, dt);
  if (joints.rightHip) joints.rightHip.rotation.x = damp(joints.rightHip.rotation.x, rHipX, speedBlend, dt);
  if (joints.leftKnee) joints.leftKnee.rotation.x = damp(joints.leftKnee.rotation.x, lKneeX, speedBlend, dt);
  if (joints.rightKnee) joints.rightKnee.rotation.x = damp(joints.rightKnee.rotation.x, rKneeX, speedBlend, dt);

  if (joints.leftShoulder) {
    joints.leftShoulder.rotation.x = damp(joints.leftShoulder.rotation.x, lShX, speedBlend, dt);
    joints.leftShoulder.rotation.z = damp(joints.leftShoulder.rotation.z, lShZ, speedBlend, dt);
  }
  if (joints.rightShoulder) {
    joints.rightShoulder.rotation.x = damp(joints.rightShoulder.rotation.x, rShX, speedBlend, dt);
    joints.rightShoulder.rotation.z = damp(joints.rightShoulder.rotation.z, rShZ, speedBlend, dt);
  }
  if (joints.leftElbow) joints.leftElbow.rotation.x = damp(joints.leftElbow.rotation.x, lElbX, speedBlend, dt);
  if (joints.rightElbow) joints.rightElbow.rotation.x = damp(joints.rightElbow.rotation.x, rElbX, speedBlend, dt);
}
