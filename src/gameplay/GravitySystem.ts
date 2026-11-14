import type { EnvironmentId } from '../engine/types';

export interface EnvironmentPhysicsSpec {
  id: EnvironmentId | 'earth';
  label: string;
  gravityMs2: number;
  jumpVelocityMs: number;
  walkSpeedMs: number;
  runSpeedMs: number;
  sprintSpeedMs: number;
  crouchSpeedMs: number;
  airControl: number;
  isZeroG: boolean;
  hasAtmosphere: boolean;
  ambientTempC: number;
  radiationBaseMsvHr: number;
  isPressurized: boolean;
}

export const ENV_PHYSICS: Record<EnvironmentId | 'earth', EnvironmentPhysicsSpec> = {
  earth: {
    id: 'earth',
    label: 'Earth Reference (1.00 g)',
    gravityMs2: 9.81,
    jumpVelocityMs: 5.2,
    walkSpeedMs: 4.0,
    runSpeedMs: 6.2,
    sprintSpeedMs: 8.6,
    crouchSpeedMs: 2.2,
    airControl: 0.35,
    isZeroG: false,
    hasAtmosphere: true,
    ambientTempC: 20,
    radiationBaseMsvHr: 0.0003,
    isPressurized: true,
  },
  station: {
    id: 'station',
    label: 'Orbital Space Station (Artificial Deck 0.85 g)',
    gravityMs2: 8.35,
    jumpVelocityMs: 4.5,
    walkSpeedMs: 3.8,
    runSpeedMs: 5.6,
    sprintSpeedMs: 7.4,
    crouchSpeedMs: 2.0,
    airControl: 0.3,
    isZeroG: false,
    hasAtmosphere: true,
    ambientTempC: 21.5,
    radiationBaseMsvHr: 0.018,
    isPressurized: true,
  },
  spacecraft: {
    id: 'spacecraft',
    label: 'Crew Spacecraft Interior (Mag-Deck 0.80 g)',
    gravityMs2: 7.85,
    jumpVelocityMs: 4.0,
    walkSpeedMs: 3.4,
    runSpeedMs: 5.0,
    sprintSpeedMs: 6.4,
    crouchSpeedMs: 1.9,
    airControl: 0.3,
    isZeroG: false,
    hasAtmosphere: true,
    ambientTempC: 20.5,
    radiationBaseMsvHr: 0.022,
    isPressurized: true,
  },
  moon: {
    id: 'moon',
    label: 'Lunar South Pole (0.165 g)',
    gravityMs2: 1.62,
    jumpVelocityMs: 3.6,
    walkSpeedMs: 3.6,
    runSpeedMs: 5.4,
    sprintSpeedMs: 7.5,
    crouchSpeedMs: 2.1,
    airControl: 0.55,
    isZeroG: false,
    hasAtmosphere: false,
    ambientTempC: -115,
    radiationBaseMsvHr: 0.14,
    isPressurized: false,
  },
  mars: {
    id: 'mars',
    label: 'Jezero Crater, Mars (0.38 g)',
    gravityMs2: 3.72,
    jumpVelocityMs: 4.4,
    walkSpeedMs: 3.9,
    runSpeedMs: 5.8,
    sprintSpeedMs: 8.0,
    crouchSpeedMs: 2.1,
    airControl: 0.45,
    isZeroG: false,
    hasAtmosphere: true,
    ambientTempC: -62,
    radiationBaseMsvHr: 0.095,
    isPressurized: false,
  },
  'orbital-eva': {
    id: 'orbital-eva',
    label: 'Orbital Zero-G EVA (0.00 g)',
    gravityMs2: 0,
    jumpVelocityMs: 0,
    walkSpeedMs: 3.5,
    runSpeedMs: 5.5,
    sprintSpeedMs: 8.2,
    crouchSpeedMs: 2.5,
    airControl: 1.0,
    isZeroG: true,
    hasAtmosphere: false,
    ambientTempC: -140,
    radiationBaseMsvHr: 0.19,
    isPressurized: false,
  },
};

export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height?: number;
}

export interface CircleCollider {
  x: number;
  z: number;
  radius: number;
  height?: number;
}

export interface EnvironmentColliders {
  boxes: BoxCollider[];
  circles: CircleCollider[];
  boundsRadius: number;
  safeZones: Array<{ x: number; z: number; radius: number; label: string }>;
  ladders: Array<{ x: number; z: number; minY: number; maxY: number; radius: number }>;
}

/**
 * Deterministic terrain elevation height function shared between physics, rover, and 3D terrain mesh.
 */
export function groundHeightAt(env: EnvironmentId, x: number, z: number): number {
  if (env === 'station' || env === 'spacecraft' || env === 'orbital-eva') {
    return 0;
  }

  if (env === 'moon') {
    const distFromPad = Math.hypot(x, z);
    // Flat lunar landing pad at center
    if (distFromPad < 9.5) return 0;

    // Gentle lunar regolith swells
    const swell =
      Math.sin(x * 0.075) * Math.cos(z * 0.075) * 0.85 +
      Math.sin(x * 0.19 + 1.2) * Math.sin(z * 0.16) * 0.35;

    // Shackleton rim crater bowl at (-28, -32)
    const c1 = Math.hypot(x + 28, z + 32);
    const crater1 =
      c1 < 14
        ? -2.8 * (1 - (c1 / 14) ** 2) + 1.2 * Math.exp(-((c1 - 12.5) ** 2) / 6)
        : 1.2 * Math.exp(-((c1 - 12.5) ** 2) / 8);

    // Secondary crater at (30, -24)
    const c2 = Math.hypot(x - 30, z + 24);
    const crater2 = c2 < 9 ? -1.7 * (1 - (c2 / 9) ** 2) + 0.6 * Math.exp(-((c2 - 8.5) ** 2) / 4) : 0;

    // Smooth blend out from flat landing pad
    const padBlend = Math.min(1, Math.max(0, (distFromPad - 9.5) / 6));
    return (swell + crater1 + crater2) * padBlend;
  }

  // Mars Jezero Delta terrain
  const distFromPad = Math.hypot(x, z);
  const habDist = Math.hypot(x + 15, z - 12);
  if (distFromPad < 8.5 || habDist < 6.5) return 0;

  const ridge =
    Math.sin(x * 0.055 + 0.5) * Math.cos(z * 0.05) * 1.45 +
    Math.sin(x * 0.14 - z * 0.11) * 0.55 +
    Math.max(0, (Math.hypot(x - 28, z + 22) < 18 ? (18 - Math.hypot(x - 28, z + 22)) * 0.22 : 0));

  // Dust crater at (22, 22)
  const mc = Math.hypot(x - 22, z - 22);
  const marsCrater = mc < 10 ? -1.8 * (1 - (mc / 10) ** 2) + 0.7 * Math.exp(-((mc - 9.5) ** 2) / 4) : 0;

  const padBlend = Math.min(1, Math.max(0, (distFromPad - 8.5) / 5));
  const habBlend = Math.min(1, Math.max(0, (habDist - 6.5) / 4));
  return (ridge + marsCrater) * Math.min(padBlend, habBlend);
}

export function getTerrainSlopeNormalY(env: EnvironmentId, x: number, z: number): number {
  const eps = 0.5;
  const hx1 = groundHeightAt(env, x + eps, z);
  const hx0 = groundHeightAt(env, x - eps, z);
  const hz1 = groundHeightAt(env, x, z + eps);
  const hz0 = groundHeightAt(env, x, z - eps);
  const dx = (hx1 - hx0) / (2 * eps);
  const dz = (hz1 - hz0) / (2 * eps);
  return 1 / Math.sqrt(dx * dx + 1 + dz * dz);
}

export function getEnvironmentColliders(env: EnvironmentId): EnvironmentColliders {
  if (env === 'station') {
    return {
      boundsRadius: 30,
      safeZones: [{ x: 0, z: 0, radius: 30, label: 'Pressurized Station' }],
      ladders: [{ x: -6.5, z: 7.5, minY: 0, maxY: 3.4, radius: 1.3 }],
      boxes: [
        // Outer perimeter walls keeping player inside corridors/rooms
        { minX: -11, maxX: -3, minZ: -10.4, maxZ: -9.6, height: 4 },
        { minX: 3, maxX: 11, minZ: -10.4, maxZ: -9.6, height: 4 },
        { minX: -11, maxX: 11, minZ: -24.5, maxZ: -23.5, height: 4 },
        { minX: -11, maxX: -10.2, minZ: -24, maxZ: -10, height: 4 },
        { minX: 10.2, maxX: 11, minZ: -24, maxZ: -10, height: 4 },
        // Atrium / wing separator walls with 5m doorways
        { minX: -10.4, maxX: -9.6, minZ: -10, maxZ: -2.6, height: 4 },
        { minX: -10.4, maxX: -9.6, minZ: 2.6, maxZ: 10, height: 4 },
        { minX: 9.6, maxX: 10.4, minZ: -10, maxZ: -2.6, height: 4 },
        { minX: 9.6, maxX: 10.4, minZ: 2.6, maxZ: 10, height: 4 },
        // West science wing outer walls
        { minX: -24.5, maxX: -23.5, minZ: -8.5, maxZ: 8.5, height: 4 },
        { minX: -24, maxX: -10, minZ: -8.6, maxZ: -7.8, height: 4 },
        { minX: -24, maxX: -10, minZ: 7.8, maxZ: 8.6, height: 4 },
        // East engineering wing outer walls
        { minX: 23.5, maxX: 24.5, minZ: -8.5, maxZ: 8.5, height: 4 },
        { minX: 10, maxX: 24, minZ: -8.6, maxZ: -7.8, height: 4 },
        { minX: 10, maxX: 24, minZ: 7.8, maxZ: 8.6, height: 4 },
        // South observation deck walls
        { minX: -10, maxX: -3.2, minZ: 9.6, maxZ: 10.4, height: 4 },
        { minX: 3.2, maxX: 10, minZ: 9.6, maxZ: 10.4, height: 4 },
        { minX: -8.5, maxX: 8.5, minZ: 17.6, maxZ: 18.4, height: 4 },
        { minX: -8.6, maxX: -7.8, minZ: 10, maxZ: 18, height: 4 },
        { minX: 7.8, maxX: 8.6, minZ: 10, maxZ: 18, height: 4 },
      ],
      circles: [
        { x: 0, z: -18.5, radius: 1.4, height: 1.5 }, // Briefing holo table
        { x: 0, z: 0, radius: 1.2, height: 1.3 }, // Atrium pedestal
      ],
    };
  }

  if (env === 'spacecraft') {
    return {
      boundsRadius: 15,
      safeZones: [{ x: 0, z: 0, radius: 16, label: 'Pressurized Spacecraft Cabin' }],
      ladders: [],
      boxes: [
        { minX: -5.4, maxX: -4.6, minZ: -12, maxZ: 10.5, height: 3.5 },
        { minX: 4.6, maxX: 5.4, minZ: -12, maxZ: 10.5, height: 3.5 },
        { minX: -5, maxX: 5, minZ: -12.4, maxZ: -11.4, height: 3.5 },
        { minX: -5, maxX: 5, minZ: 10.2, maxZ: 11, height: 3.5 },
        { minX: -1.6, maxX: 1.6, minZ: -10.5, maxZ: -8.5, height: 1.3 },
      ],
      circles: [
        { x: 0, z: 4.5, radius: 0.9, height: 1.2 },
      ],
    };
  }

  if (env === 'moon') {
    return {
      boundsRadius: 68,
      safeZones: [
        { x: 0, z: 0, radius: 5.5, label: 'Lunar Lander Airlock' },
        { x: -16, z: 14, radius: 6.2, label: 'Lunar Outpost Habitat' },
      ],
      ladders: [{ x: 0, z: 2.3, minY: 0, maxY: 3.2, radius: 1.2 }],
      boxes: [],
      circles: [
        { x: 0, z: 0, radius: 2.4, height: 5 }, // Lunar lander body
        { x: -16, z: 14, radius: 3.4, height: 3.5 }, // Lunar habitat dome
        { x: -10, z: -8, radius: 1.1, height: 4 }, // Comms mast
        { x: 14, z: -6, radius: 1.6, height: 2 }, // Boulder
        { x: -20, z: -16, radius: 1.9, height: 2.2 }, // Boulder
      ],
    };
  }

  if (env === 'mars') {
    return {
      boundsRadius: 72,
      safeZones: [
        { x: 0, z: 0, radius: 5.5, label: 'Mars Descent Lander' },
        { x: -15, z: 12, radius: 6.5, label: 'Jezero Research Habitat' },
      ],
      ladders: [{ x: 0, z: 2.3, minY: 0, maxY: 3.2, radius: 1.2 }],
      boxes: [],
      circles: [
        { x: 0, z: 0, radius: 2.4, height: 5 },
        { x: -15, z: 12, radius: 3.8, height: 3.6 },
        { x: -12, z: -14, radius: 1.1, height: 4 },
        { x: 16, z: -10, radius: 1.7, height: 2 },
        { x: -22, z: -8, radius: 2.1, height: 2.4 },
      ],
    };
  }

  // orbital-eva
  return {
    boundsRadius: 56,
    safeZones: [{ x: 0, z: 8, radius: 4.5, label: 'Spacecraft EVA Airlock' }],
    ladders: [],
    boxes: [],
    circles: [
      { x: 0, z: 11, radius: 2.6, height: 5 }, // Spacecraft aft body
      { x: 0, z: -22, radius: 2.2, height: 5 }, // Damaged satellite core
    ],
  };
}

export function resolveHorizontalCollisions(
  x: number,
  z: number,
  radius: number,
  colliders: EnvironmentColliders
): { x: number; z: number } {
  let nx = x;
  let nz = z;

  // Box obstacles
  for (const b of colliders.boxes) {
    const closestX = Math.max(b.minX, Math.min(nx, b.maxX));
    const closestZ = Math.max(b.minZ, Math.min(nz, b.maxZ));
    const dx = nx - closestX;
    const dz = nz - closestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        const push = radius - dist;
        nx += (dx / dist) * push;
        nz += (dz / dist) * push;
      } else {
        // Inside box: push out toward nearest edge
        const leftPen = Math.abs(nx - b.minX);
        const rightPen = Math.abs(b.maxX - nx);
        const topPen = Math.abs(nz - b.minZ);
        const botPen = Math.abs(b.maxZ - nz);
        const minPen = Math.min(leftPen, rightPen, topPen, botPen);
        if (minPen === leftPen) nx = b.minX - radius;
        else if (minPen === rightPen) nx = b.maxX + radius;
        else if (minPen === topPen) nz = b.minZ - radius;
        else nz = b.maxZ + radius;
      }
    }
  }

  // Circle obstacles
  for (const c of colliders.circles) {
    const dx = nx - c.x;
    const dz = nz - c.z;
    const minDist = radius + c.radius;
    const distSq = dx * dx + dz * dz;
    if (distSq < minDist * minDist) {
      const dist = Math.max(0.001, Math.sqrt(distSq));
      const push = minDist - dist;
      nx += (dx / dist) * push;
      nz += (dz / dist) * push;
    }
  }

  // Clamp to world exploration boundary
  const distFromCenter = Math.hypot(nx, nz);
  if (distFromCenter > colliders.boundsRadius) {
    const scale = colliders.boundsRadius / distFromCenter;
    nx *= scale;
    nz *= scale;
  }

  return { x: nx, z: nz };
}

/**
 * Ray-marches from lookTarget to desiredCamPos against walls, circles, and terrain
 * so the third-person camera never clips through walls or underground.
 */
export function resolveCameraCollision(
  env: EnvironmentId,
  target: { x: number; y: number; z: number },
  desiredCam: { x: number; y: number; z: number }
): { x: number; y: number; z: number } {
  const colliders = getEnvironmentColliders(env);
  const dx = desiredCam.x - target.x;
  const dy = desiredCam.y - target.y;
  const dz = desiredCam.z - target.z;
  const totalDist = Math.hypot(dx, dy, dz);
  if (totalDist < 0.05) return desiredCam;

  const steps = 14;
  let safeT = 1.0;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const px = target.x + dx * t;
    const py = target.y + dy * t;
    const pz = target.z + dz * t;

    // Terrain floor check
    if (!ENV_PHYSICS[env].isZeroG) {
      const gY = groundHeightAt(env, px, pz) + 0.35;
      if (py < gY) {
        safeT = Math.min(safeT, Math.max(0.25, (i - 1) / steps));
        break;
      }
    }

    // Wall box check (if inside indoor height range)
    let hitWall = false;
    for (const b of colliders.boxes) {
      const wallH = b.height ?? 3.5;
      if (py <= wallH && px >= b.minX - 0.22 && px <= b.maxX + 0.22 && pz >= b.minZ - 0.22 && pz <= b.maxZ + 0.22) {
        hitWall = true;
        break;
      }
    }
    if (hitWall) {
      safeT = Math.min(safeT, Math.max(0.22, (i - 1) / steps));
      break;
    }
  }

  const finalY = ENV_PHYSICS[env].isZeroG
    ? target.y + dy * safeT
    : Math.max(groundHeightAt(env, target.x + dx * safeT, target.z + dz * safeT) + 0.45, target.y + dy * safeT);

  return {
    x: target.x + dx * safeT,
    y: finalY,
    z: target.z + dz * safeT,
  };
}
