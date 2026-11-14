import type { CharacterAnimationState, EnvironmentId } from '../engine/types';
import {
  ENV_PHYSICS,
  getEnvironmentColliders,
  groundHeightAt,
  resolveHorizontalCollisions,
} from './GravitySystem';

export interface GroundedCharacterState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  grounded: boolean;
  crouching: boolean;
  climbing: boolean;
  airTimeSec: number;
  landTimerSec: number;
  strideDistance: number;
  animState: CharacterAnimationState;
}

export interface CharacterMoveInput {
  moveForward: number; // -1..1
  moveRight: number; // -1..1
  cameraYaw: number;
  sprint: boolean;
  jump: boolean;
  crouch: boolean;
  actionAnimOverride?: CharacterAnimationState | null;
}

export function createInitialGroundedState(env: EnvironmentId): GroundedCharacterState {
  const spawnMap: Record<EnvironmentId, { x: number; z: number; yaw: number }> = {
    station: { x: 0, z: 5.5, yaw: 0 },
    spacecraft: { x: 0, z: 6.2, yaw: 0 },
    moon: { x: 4.5, z: 6.0, yaw: -0.4 },
    mars: { x: 5.0, z: 6.2, yaw: -0.4 },
    'orbital-eva': { x: 0, z: 6.0, yaw: 0 },
  };
  const sp = spawnMap[env];
  const y = groundHeightAt(env, sp.x, sp.z);
  return {
    x: sp.x,
    y,
    z: sp.z,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: sp.yaw,
    grounded: true,
    crouching: false,
    climbing: false,
    airTimeSec: 0,
    landTimerSec: 0,
    strideDistance: 0,
    animState: 'idle',
  };
}

function normalizeAngle(a: number): number {
  let res = a;
  while (res > Math.PI) res -= Math.PI * 2;
  while (res < -Math.PI) res += Math.PI * 2;
  return res;
}

export function stepGroundedCharacter(
  prev: GroundedCharacterState,
  input: CharacterMoveInput,
  env: EnvironmentId,
  dt: number
): GroundedCharacterState {
  const clampedDt = Math.min(0.05, Math.max(0.001, dt));
  const spec = ENV_PHYSICS[env];
  const colliders = getEnvironmentColliders(env);

  // Camera-relative planar basis (forward is -sin(yaw), -cos(yaw) in Three.js standard camera orbit)
  const sinY = Math.sin(input.cameraYaw);
  const cosY = Math.cos(input.cameraYaw);
  const rawMag = Math.hypot(input.moveForward, input.moveRight);
  const normF = rawMag > 1 ? input.moveForward / rawMag : input.moveForward;
  const normR = rawMag > 1 ? input.moveRight / rawMag : input.moveRight;

  // World move direction
  const worldMoveX = -sinY * normF + cosY * normR;
  const worldMoveZ = -cosY * normF - sinY * normR;
  const moveLen = Math.hypot(worldMoveX, worldMoveZ);

  const crouching = input.crouch && prev.grounded;
  const targetSpeed = crouching
    ? spec.crouchSpeedMs
    : input.sprint && moveLen > 0.25
      ? spec.sprintSpeedMs
      : moveLen > 0.72
        ? spec.runSpeedMs
        : spec.walkSpeedMs;

  const desiredVx = worldMoveX * targetSpeed;
  const desiredVz = worldMoveZ * targetSpeed;

  const accel = prev.grounded ? 14 : 14 * spec.airControl;
  const blend = 1 - Math.exp(-accel * clampedDt);
  const vx = prev.vx + (desiredVx - prev.vx) * blend;
  const vz = prev.vz + (desiredVz - prev.vz) * blend;

  // Check ladder proximity for climb support
  const nearLadder = colliders.ladders.find(
    (l) => Math.hypot(prev.x - l.x, prev.z - l.z) <= l.radius
  );

  let vy = prev.vy;
  let y = prev.y;
  let grounded = prev.grounded;
  let climbing = false;
  let airTimeSec = prev.airTimeSec;
  let landTimerSec = Math.max(0, prev.landTimerSec - clampedDt);

  if (nearLadder && Math.abs(input.moveForward) > 0.2 && (prev.y > nearLadder.minY + 0.1 || input.moveForward > 0.2)) {
    climbing = true;
    grounded = false;
    vy = input.moveForward * 2.4;
    y = Math.max(nearLadder.minY, Math.min(nearLadder.maxY, prev.y + vy * clampedDt));
    if (y <= nearLadder.minY + 0.02 && input.moveForward < 0) {
      climbing = false;
      grounded = true;
      vy = 0;
    }
  } else {
    if (input.jump && prev.grounded) {
      vy = spec.jumpVelocityMs;
      grounded = false;
      airTimeSec = 0;
    }

    vy -= spec.gravityMs2 * clampedDt;
    y += vy * clampedDt;
  }

  let nextX = prev.x + vx * clampedDt;
  let nextZ = prev.z + vz * clampedDt;
  const resolved = resolveHorizontalCollisions(nextX, nextZ, 0.42, colliders);
  nextX = resolved.x;
  nextZ = resolved.z;

  const floorY = groundHeightAt(env, nextX, nextZ);
  if (!climbing) {
    if (y <= floorY + 0.015 && vy <= 0) {
      if (!prev.grounded && prev.airTimeSec > 0.25) {
        landTimerSec = 0.22;
      }
      y = floorY;
      vy = 0;
      grounded = true;
      airTimeSec = 0;
    } else {
      if (y > floorY + 0.08) {
        grounded = false;
        airTimeSec += clampedDt;
      }
    }
  }

  // Smooth facing toward travel direction
  let yaw = prev.yaw;
  const horizSpeed = Math.hypot(vx, vz);
  if (moveLen > 0.08 && horizSpeed > 0.25) {
    const targetYaw = Math.atan2(worldMoveX, worldMoveZ);
    const diff = normalizeAngle(targetYaw - prev.yaw);
    yaw = normalizeAngle(prev.yaw + diff * Math.min(1, 12 * clampedDt));
  }

  const strideDistance = grounded ? prev.strideDistance + horizSpeed * clampedDt : prev.strideDistance;

  // Determine procedural animation state
  let animState: CharacterAnimationState = 'idle';
  if (input.actionAnimOverride) {
    animState = input.actionAnimOverride;
  } else if (climbing) {
    animState = 'climb';
  } else if (!grounded) {
    animState = vy > 0.35 ? 'jump' : 'fall';
  } else if (landTimerSec > 0.02) {
    animState = 'land';
  } else if (crouching) {
    animState = horizSpeed > 0.3 ? 'crouch' : 'crouch';
  } else if (horizSpeed > spec.runSpeedMs * 1.08) {
    animState = 'sprint';
  } else if (horizSpeed > spec.walkSpeedMs * 1.08) {
    animState = 'run';
  } else if (horizSpeed > 0.28) {
    animState = 'walk';
  }

  return {
    x: nextX,
    y,
    z: nextZ,
    vx,
    vy,
    vz,
    yaw,
    grounded,
    crouching,
    climbing,
    airTimeSec,
    landTimerSec,
    strideDistance,
    animState,
  };
}
