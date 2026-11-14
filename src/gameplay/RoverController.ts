import type { EnvironmentId, RoverState } from '../engine/types';
import {
  getEnvironmentColliders,
  getTerrainSlopeNormalY,
  groundHeightAt,
  resolveHorizontalCollisions,
} from './GravitySystem';
import { stepVehicleKinematics } from './VehicleController';

export function createInitialRovers(): Record<'moon' | 'mars', RoverState> {
  return {
    moon: {
      id: 'lunar-rover-1',
      name: 'Lunar Terrain Rover (LRV-2)',
      environment: 'moon',
      x: 9.0,
      y: groundHeightAt('moon', 9.0, 4.0),
      z: 4.0,
      yaw: -0.6,
      speedMs: 0,
      wheelSpin: 0,
      steerAngle: 0,
      batteryPct: 100,
      integrityPct: 100,
      distanceKm: 0,
      storedSamplesCount: 0,
      occupiedByLocal: false,
    },
    mars: {
      id: 'mars-rover-1',
      name: 'Pressurized Mars Field Rover',
      environment: 'mars',
      x: 10.0,
      y: groundHeightAt('mars', 10.0, 5.0),
      z: 5.0,
      yaw: -0.5,
      speedMs: 0,
      wheelSpin: 0,
      steerAngle: 0,
      batteryPct: 100,
      integrityPct: 100,
      distanceKm: 0,
      storedSamplesCount: 0,
      occupiedByLocal: false,
    },
  };
}

export function stepRover(
  prev: RoverState,
  input: { throttle: number; steer: number; brake: boolean },
  batteryEfficiencyMultiplier: number,
  dt: number
): RoverState {
  const env: EnvironmentId = prev.environment;
  const colliders = getEnvironmentColliders(env);
  const slopeNormalY = getTerrainSlopeNormalY(env, prev.x, prev.z);

  const hasPower = prev.batteryPct > 0.5 && prev.integrityPct > 10;
  const effectiveThrottle = hasPower ? input.throttle : 0;

  const damageSpeedFactor = prev.integrityPct < 45 ? 0.65 : 1.0;
  const maxSpeedMs = (env === 'moon' ? 11.5 : 13.0) * damageSpeedFactor;
  const nextKin = stepVehicleKinematics(
    {
      x: prev.x,
      z: prev.z,
      yaw: prev.yaw,
      speedMs: prev.speedMs,
      steerAngle: prev.steerAngle,
      wheelSpin: prev.wheelSpin,
    },
    { throttle: effectiveThrottle, steer: input.steer, brake: input.brake },
    {
      maxSpeedMs,
      maxReverseMs: 5.5,
      accelMs2: 6.2,
      turnRateRadS: 2.1,
      dragPerSec: 1.4,
      slopeFactor: Math.max(0.55, slopeNormalY),
    },
    dt
  );

  const preDist = Math.hypot(nextKin.x - prev.x, nextKin.z - prev.z);
  const resolved = resolveHorizontalCollisions(nextKin.x, nextKin.z, 1.35, colliders);
  const collided = Math.hypot(resolved.x - nextKin.x, resolved.z - nextKin.z) > 0.04;
  const y = groundHeightAt(env, resolved.x, resolved.z);

  let integrityPct = prev.integrityPct;
  let speedMs = nextKin.speedMs;
  if (collided && Math.abs(speedMs) > 4.5) {
    integrityPct = Math.max(0, Number((integrityPct - Math.abs(speedMs) * 0.65).toFixed(1)));
    speedMs *= 0.25;
  }

  const batteryDrain =
    (Math.abs(speedMs) > 0.2 ? 0.08 * Math.abs(speedMs) : 0.005) /
    Math.max(0.6, batteryEfficiencyMultiplier);
  // Trickle solar recharge on rover deck when stationary
  const solarTrickle = Math.abs(speedMs) < 0.2 ? 0.03 : 0;
  const batteryPct = Math.max(0, Math.min(100, prev.batteryPct - batteryDrain * dt + solarTrickle * dt));

  return {
    ...prev,
    x: resolved.x,
    y,
    z: resolved.z,
    yaw: nextKin.yaw,
    speedMs,
    steerAngle: nextKin.steerAngle,
    wheelSpin: nextKin.wheelSpin,
    batteryPct: Number(batteryPct.toFixed(3)),
    integrityPct,
    distanceKm: Number((prev.distanceKm + preDist / 1000).toFixed(4)),
  };
}
