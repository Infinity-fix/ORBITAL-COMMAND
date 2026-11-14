import type { CharacterAnimationState } from '../engine/types';
import { getEnvironmentColliders } from './GravitySystem';

export interface EVACharacterState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  tetherAnchor: { x: number; y: number; z: number };
  maxTetherM: number;
  tetherDistanceM: number;
  braking: boolean;
  grabbingHandhold: boolean;
  thrusting: boolean;
  animState: CharacterAnimationState;
}

export interface EVAInput {
  moveForward: number;
  moveRight: number;
  moveUp: number; // +1 Space (up), -1 C (down)
  cameraYaw: number;
  cameraPitch: number;
  boost: boolean;
  brake: boolean;
  actionAnimOverride?: CharacterAnimationState | null;
}

export const EVA_HANDHOLDS: Array<{ id: string; label: string; x: number; y: number; z: number }> = [
  { id: 'hh-airlock', label: 'Spacecraft Airlock Handrail', x: 0, y: 1.5, z: 7.5 },
  { id: 'hh-truss-mid', label: 'Station Truss Handhold Alpha', x: -1.5, y: 2.0, z: -2.0 },
  { id: 'hh-truss-fore', label: 'Station Truss Handhold Beta', x: 1.5, y: 2.2, z: -11.0 },
  { id: 'hh-sat-node', label: 'Damaged Satellite Service Grip', x: 0, y: 3.1, z: -20.2 },
];

export function createInitialEVAState(): EVACharacterState {
  return {
    x: 0,
    y: 2.0,
    z: 6.2,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: Math.PI,
    pitch: 0,
    tetherAnchor: { x: 0, y: 1.5, z: 8.2 },
    maxTetherM: 46,
    tetherDistanceM: 2.06,
    braking: false,
    grabbingHandhold: false,
    thrusting: false,
    animState: 'idle',
  };
}

export function stepEVACharacter(
  prev: EVACharacterState,
  input: EVAInput,
  dt: number
): EVACharacterState {
  const clampedDt = Math.min(0.05, Math.max(0.001, dt));
  const colliders = getEnvironmentColliders('orbital-eva');

  const sinY = Math.sin(input.cameraYaw);
  const cosY = Math.cos(input.cameraYaw);

  const thrustMag = input.boost ? 6.8 : 4.2;
  const ax = (-sinY * input.moveForward + cosY * input.moveRight) * thrustMag;
  const az = (-cosY * input.moveForward - sinY * input.moveRight) * thrustMag;
  const ay = input.moveUp * thrustMag;

  const thrusting = Math.abs(input.moveForward) + Math.abs(input.moveRight) + Math.abs(input.moveUp) > 0.08;

  let vx = prev.vx + ax * clampedDt;
  let vy = prev.vy + ay * clampedDt;
  let vz = prev.vz + az * clampedDt;

  // Inertial damping / active RCS braking
  const drag = input.brake ? 6.5 : 0.45;
  const damp = Math.exp(-drag * clampedDt);
  vx *= damp;
  vy *= damp;
  vz *= damp;

  // Clamp peak EVA drift speed for playability
  const speed = Math.hypot(vx, vy, vz);
  const maxSpeed = input.boost ? 7.5 : 4.8;
  if (speed > maxSpeed) {
    const s = maxSpeed / speed;
    vx *= s;
    vy *= s;
    vz *= s;
  }

  let nx = prev.x + vx * clampedDt;
  let ny = Math.max(-8, Math.min(22, prev.y + vy * clampedDt));
  let nz = prev.z + vz * clampedDt;

  // Obstacle sphere avoidance around spacecraft & satellite core
  for (const c of colliders.circles) {
    const dx = nx - c.x;
    const dz = nz - c.z;
    const d = Math.hypot(dx, dz);
    const minR = c.radius + 0.55;
    if (d < minR && ny < 5.2 && ny > -1.5) {
      const push = minR - d;
      const ux = dx / Math.max(0.001, d);
      const uz = dz / Math.max(0.001, d);
      nx += ux * push;
      nz += uz * push;
      vx *= 0.4;
      vz *= 0.4;
    }
  }

  // Tether enforcement
  const tx = nx - prev.tetherAnchor.x;
  const ty = ny - prev.tetherAnchor.y;
  const tz = nz - prev.tetherAnchor.z;
  let tetherDist = Math.hypot(tx, ty, tz);
  if (tetherDist > prev.maxTetherM) {
    const clampScale = prev.maxTetherM / tetherDist;
    nx = prev.tetherAnchor.x + tx * clampScale;
    ny = prev.tetherAnchor.y + ty * clampScale;
    nz = prev.tetherAnchor.z + tz * clampScale;
    tetherDist = prev.maxTetherM;
    // Reflect outward velocity gently along tether
    vx *= -0.25;
    vy *= -0.25;
    vz *= -0.25;
  }

  // Smooth astronaut orientation aligned to camera yaw during EVA
  const targetYaw = input.cameraYaw + Math.PI;
  let yawDiff = targetYaw - prev.yaw;
  while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
  while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
  const yaw = prev.yaw + yawDiff * Math.min(1, 7 * clampedDt);

  const animState: CharacterAnimationState =
    input.actionAnimOverride ??
    (input.brake ? 'emergency' : thrusting ? (input.boost ? 'sprint' : 'fall') : 'idle');

  return {
    ...prev,
    x: nx,
    y: ny,
    z: nz,
    vx,
    vy,
    vz,
    yaw,
    pitch: Math.max(-0.5, Math.min(0.5, input.cameraPitch * 0.4)),
    tetherDistanceM: Number(tetherDist.toFixed(1)),
    braking: input.brake,
    grabbingHandhold: false,
    thrusting,
    animState,
  };
}

export function snapToNearestEVAHandhold(state: EVACharacterState): {
  nextState: EVACharacterState;
  handholdLabel: string | null;
} {
  let best = EVA_HANDHOLDS[0];
  let bestDist = Infinity;
  for (const h of EVA_HANDHOLDS) {
    const d = Math.hypot(state.x - h.x, state.y - h.y, state.z - h.z);
    if (d < bestDist) {
      bestDist = d;
      best = h;
    }
  }
  if (bestDist > 3.6) {
    return { nextState: state, handholdLabel: null };
  }
  const tetherDistanceM = Math.hypot(
    best.x - state.tetherAnchor.x,
    best.y - state.tetherAnchor.y,
    best.z - state.tetherAnchor.z
  );
  return {
    handholdLabel: best.label,
    nextState: {
      ...state,
      x: best.x,
      y: best.y,
      z: best.z,
      vx: 0,
      vy: 0,
      vz: 0,
      tetherDistanceM: Number(tetherDistanceM.toFixed(1)),
      grabbingHandhold: true,
      animState: 'climb',
    },
  };
}
