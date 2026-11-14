export interface VehicleKinematicsInput {
  throttle: number; // -1..1
  steer: number; // -1..1 (positive = right turn, negative = left turn)
  brake: boolean;
}

export interface VehicleKinematicsState {
  x: number;
  z: number;
  yaw: number;
  speedMs: number;
  steerAngle: number;
  wheelSpin: number;
}

export function stepVehicleKinematics(
  prev: VehicleKinematicsState,
  input: VehicleKinematicsInput,
  params: {
    maxSpeedMs: number;
    maxReverseMs: number;
    accelMs2: number;
    turnRateRadS: number;
    dragPerSec: number;
    slopeFactor: number;
  },
  dt: number
): VehicleKinematicsState {
  const clampedDt = Math.min(0.05, Math.max(0.001, dt));
  let speedMs = prev.speedMs;

  if (input.brake) {
    const sign = Math.sign(speedMs);
    const decel = Math.min(Math.abs(speedMs), params.accelMs2 * 2.2 * clampedDt);
    speedMs -= sign * decel;
  } else if (Math.abs(input.throttle) > 0.05) {
    speedMs += input.throttle * params.accelMs2 * params.slopeFactor * clampedDt;
  } else {
    speedMs *= Math.exp(-params.dragPerSec * clampedDt);
  }

  speedMs = Math.max(-params.maxReverseMs, Math.min(params.maxSpeedMs, speedMs));
  if (Math.abs(speedMs) < 0.02 && Math.abs(input.throttle) < 0.05) {
    speedMs = 0;
  }

  const targetSteer = -input.steer * 0.48;
  const steerAngle = prev.steerAngle + (targetSteer - prev.steerAngle) * Math.min(1, 10 * clampedDt);
  const speedRatio = Math.min(1, Math.abs(speedMs) / 2.2);
  const reverseDir = speedMs >= -0.05 ? 1 : -1;
  const yaw = prev.yaw + steerAngle * params.turnRateRadS * speedRatio * reverseDir * clampedDt;

  const x = prev.x + Math.sin(yaw) * speedMs * clampedDt;
  const z = prev.z + Math.cos(yaw) * speedMs * clampedDt;
  const wheelSpin = prev.wheelSpin + (speedMs * clampedDt) / 0.36;

  return { x, z, yaw, speedMs, steerAngle, wheelSpin };
}
