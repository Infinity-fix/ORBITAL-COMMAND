import type {
  DynamicEventType,
  EnvironmentId,
  PlanetaryBaseModule,
  SurvivalTelemetry,
} from '../engine/types';
import { ENV_PHYSICS, getEnvironmentColliders } from './GravitySystem';
import { BASE_MODULE_CATALOG, isPointInBuiltBaseSafeZone } from './PlanetaryBaseSystem';

export function createInitialSurvivalTelemetry(env: EnvironmentId): SurvivalTelemetry {
  const spec = ENV_PHYSICS[env];
  return {
    oxygenPct: 100,
    suitPressureKpa: spec.isPressurized ? 101.3 : 29.6,
    co2Pct: 0.04,
    suitIntegrityPct: 100,
    oxygenLeakPerSec: 0,
    batteryPct: 100,
    temperatureC: spec.isPressurized ? spec.ambientTempC : 20.5,
    healthPct: 100,
    radiationMsv: 0.02,
    commsSignalPct: env === 'mars' ? 92 : 98,
    tetherDistanceM: env === 'orbital-eva' ? 2.0 : 0,
    rcsFuelPct: 100,
    inSafeZone: spec.isPressurized,
    warnings: [],
  };
}

export function stepSurvivalTelemetry(
  prev: SurvivalTelemetry,
  context: {
    environment: EnvironmentId;
    x: number;
    z: number;
    sprinting: boolean;
    flashlightOn: boolean;
    evaThrusting: boolean;
    tetherDistanceM: number;
    inRover: boolean;
    powerEfficiencyBonus: number; // >= 0.8 from spacecraft design
    builtBaseModules?: PlanetaryBaseModule[];
    activeHazardType?: DynamicEventType | null;
  },
  dt: number
): SurvivalTelemetry {
  const clampedDt = Math.min(0.1, Math.max(0.001, dt));
  const spec = ENV_PHYSICS[context.environment];
  const colliders = getEnvironmentColliders(context.environment);
  const builtModules = context.builtBaseModules ?? [];

  const inSafeZone =
    spec.isPressurized ||
    context.inRover ||
    colliders.safeZones.some((sz) => Math.hypot(context.x - sz.x, context.z - sz.z) <= sz.radius) ||
    isPointInBuiltBaseSafeZone(context.environment, context.x, context.z, builtModules);

  let oxygenPct = prev.oxygenPct;
  let batteryPct = prev.batteryPct;
  let rcsFuelPct = prev.rcsFuelPct;
  let suitPressureKpa = prev.suitPressureKpa;
  let co2Pct = prev.co2Pct;
  const suitIntegrityPct = prev.suitIntegrityPct;
  let oxygenLeakPerSec = prev.oxygenLeakPerSec;
  let healthPct = prev.healthPct;

  const hasSolarBase = builtModules.some(
    (m) => m.environment === context.environment && m.type === 'solar-farm'
  );
  const commsTowerBoost = builtModules
    .filter((m) => m.environment === context.environment)
    .reduce((acc, m) => acc + BASE_MODULE_CATALOG[m.type].commsBoostPct, 0);

  if (inSafeZone) {
    // Pressurized airlock / habitat / rover replenishes O2, scrubs CO2, and recharges suit battery
    oxygenPct = Math.min(100, oxygenPct + 6.5 * clampedDt);
    batteryPct = Math.min(100, batteryPct + (hasSolarBase ? 7.5 : 5.0) * clampedDt);
    suitPressureKpa = spec.isPressurized ? 101.3 : 30.2;
    co2Pct = Math.max(0.04, co2Pct - 0.65 * clampedDt);
    rcsFuelPct = Math.min(100, rcsFuelPct + 4.0 * clampedDt);
    healthPct = Math.min(100, healthPct + 1.5 * clampedDt);
    if (spec.isPressurized) oxygenLeakPerSec = 0;
  } else {
    const o2Rate = (context.sprinting ? 0.42 : 0.22) + oxygenLeakPerSec;
    oxygenPct = Math.max(0, oxygenPct - o2Rate * clampedDt);

    const batRate =
      ((context.flashlightOn ? 0.25 : 0.08) + (context.sprinting ? 0.09 : 0)) /
      Math.max(0.7, context.powerEfficiencyBonus);
    batteryPct = Math.max(0, batteryPct - batRate * clampedDt);

    // PLSS LiOH scrubber keeps CO2 < 0.5% while battery is healthy; rises sharply when battery < 15%
    if (batteryPct < 15) {
      co2Pct = Math.min(6.0, co2Pct + (context.sprinting ? 0.28 : 0.16) * clampedDt);
    } else {
      const targetCo2 = context.sprinting ? 0.42 : 0.18;
      co2Pct = co2Pct + (targetCo2 - co2Pct) * Math.min(1, 0.35 * clampedDt);
    }

    if (oxygenLeakPerSec > 0.15) {
      suitPressureKpa = Math.max(12, suitPressureKpa - 0.35 * clampedDt);
    }
  }

  if (context.environment === 'orbital-eva' && context.evaThrusting) {
    rcsFuelPct = Math.max(0, rcsFuelPct - 0.85 * clampedDt);
  }

  // Suit thermal control loop tracks comfortable 18-23C while battery > 5%, drifts toward ambient if depleted
  const targetTemp =
    inSafeZone || batteryPct > 8
      ? 20.5 + Math.sin(context.x * 0.1 + context.z * 0.1) * 0.8
      : spec.ambientTempC * 0.45;
  const temperatureC = prev.temperatureC + (targetTemp - prev.temperatureC) * Math.min(1, 0.35 * clampedDt);

  const stormRadMult = context.activeHazardType === 'solar-storm' ? 45 : 1;
  const radRatePerSec = (spec.radiationBaseMsvHr / 3600) * (inSafeZone ? 0.15 : 1.0) * stormRadMult;
  const radiationMsv = prev.radiationMsv + radRatePerSec * clampedDt;

  // Health penalty when critical O2, pressure, high CO2, or unshielded acute storm exposure occurs
  if (oxygenPct <= 0.1 || suitPressureKpa < 15 || co2Pct >= 4.0) {
    healthPct = Math.max(0, healthPct - 3.2 * clampedDt);
  } else if (suitIntegrityPct < 35 && !inSafeZone) {
    healthPct = Math.max(0, healthPct - 0.9 * clampedDt);
  }

  // Comms attenuation slightly increases with distance from pad/habitat and storms
  const distFromCenter = Math.hypot(context.x, context.z);
  const stormCommsPenalty =
    context.activeHazardType === 'dust-storm'
      ? 18
      : context.activeHazardType === 'comms-blackout'
        ? 38
        : 0;
  const commsSignalPct = Math.max(
    22,
    Math.min(
      100,
      Math.round((context.environment === 'mars' ? 96 : 99) - distFromCenter * 0.32 + commsTowerBoost - stormCommsPenalty)
    )
  );

  const warnings: string[] = [];
  if (oxygenPct < 20) warnings.push('CRITICAL OXYGEN LEVEL — Return to Airlock or Use Emergency O2');
  else if (oxygenPct < 35) warnings.push('Low Oxygen Reserve (<35%)');

  if (oxygenLeakPerSec > 0.05) {
    warnings.push(`SUIT PRESSURE LEAK (-${oxygenLeakPerSec.toFixed(2)}%/s O2) — Use Repair Tool [F]`);
  }
  if (co2Pct >= 2.0) {
    warnings.push(`ELEVATED SUIT CO2 (${co2Pct.toFixed(1)}%) — Recharge Battery or Scrub [R]`);
  }
  if (suitIntegrityPct < 60) {
    warnings.push(`SUIT INTEGRITY DEGRADED (${Math.round(suitIntegrityPct)}%) — Repair Needed`);
  }
  if (batteryPct < 15) warnings.push('CRITICAL SUIT BATTERY (<15%) — Thermal loop degraded');
  if (context.environment === 'orbital-eva' && context.tetherDistanceM > 41) {
    warnings.push('EVA TETHER LIMIT APPROACHING (46m MAX)');
  }
  if (context.environment === 'orbital-eva' && rcsFuelPct < 20) {
    warnings.push('Low EVA RCS Propellant (<20%)');
  }
  if (healthPct < 45) warnings.push('CREW MEDICAL ALERT — Seek Pressurized Shelter');

  return {
    oxygenPct: Number(oxygenPct.toFixed(3)),
    suitPressureKpa: Number(suitPressureKpa.toFixed(2)),
    co2Pct: Number(co2Pct.toFixed(2)),
    suitIntegrityPct: Number(suitIntegrityPct.toFixed(1)),
    oxygenLeakPerSec: Number(oxygenLeakPerSec.toFixed(3)),
    batteryPct: Number(batteryPct.toFixed(3)),
    temperatureC: Number(temperatureC.toFixed(2)),
    healthPct: Number(healthPct.toFixed(3)),
    radiationMsv: Number(radiationMsv.toFixed(4)),
    commsSignalPct,
    tetherDistanceM: Number(context.tetherDistanceM.toFixed(1)),
    rcsFuelPct: Number(rcsFuelPct.toFixed(3)),
    inSafeZone,
    warnings,
  };
}
