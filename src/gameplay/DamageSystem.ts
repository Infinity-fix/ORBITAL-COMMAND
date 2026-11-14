import type { EnvironmentId, RoverState, SurvivalTelemetry } from '../engine/types';

export interface FailureExplanation {
  title: string;
  cause: string;
  recoveryHint: string;
}

export function applySuitLeakAndDamage(
  telemetry: SurvivalTelemetry,
  damagePct: number,
  leakDeltaPerSec: number
): SurvivalTelemetry {
  const suitIntegrityPct = Math.max(0, Number((telemetry.suitIntegrityPct - damagePct).toFixed(2)));
  const oxygenLeakPerSec = Math.max(
    0,
    Number((telemetry.oxygenLeakPerSec + leakDeltaPerSec).toFixed(3))
  );
  return {
    ...telemetry,
    suitIntegrityPct,
    oxygenLeakPerSec,
  };
}

export function repairSuitIntegrity(telemetry: SurvivalTelemetry): SurvivalTelemetry {
  return {
    ...telemetry,
    suitIntegrityPct: Math.min(100, Number((telemetry.suitIntegrityPct + 38).toFixed(1))),
    oxygenLeakPerSec: 0,
    suitPressureKpa: telemetry.suitPressureKpa < 25 ? 29.8 : telemetry.suitPressureKpa,
  };
}

export function scrubSuitCO2(telemetry: SurvivalTelemetry): SurvivalTelemetry {
  return {
    ...telemetry,
    co2Pct: Math.max(0.04, Number((telemetry.co2Pct - 1.8).toFixed(2))),
  };
}

export function repairRoverIntegrity(rover: RoverState): RoverState {
  return {
    ...rover,
    integrityPct: Math.min(100, Number((rover.integrityPct + 40).toFixed(1))),
    batteryPct: Math.min(100, Number((rover.batteryPct + 15).toFixed(1))),
  };
}

export function explainSurvivalFailure(
  telemetry: SurvivalTelemetry,
  environment: EnvironmentId
): FailureExplanation {
  if (telemetry.oxygenPct <= 0.1) {
    return {
      title: 'PLSS Breathing Oxygen Depleted',
      cause:
        telemetry.oxygenLeakPerSec > 0
          ? `An unsealed suit puncture (${telemetry.oxygenLeakPerSec.toFixed(2)}%/s leak) drained your primary O2 reserve in ${environment.toUpperCase()}.`
          : `Extended EVA operations in ${environment.toUpperCase()} exhausted breathing oxygen without returning to a pressurized safe zone or purging an Emergency O2 cartridge.`,
      recoveryHint:
        'Deploy the Rescue Beacon to return to the nearest Pressurized Airlock or purge Emergency O2 before venturing far from base.',
    };
  }
  if (telemetry.co2Pct >= 4.0) {
    return {
      title: 'Hypercapnia — Excessive Suit CO2',
      cause:
        'Low battery voltage slowed your PLSS lithium-hydroxide CO2 scrubber below safe cabin thresholds (>4.0% CO2).',
      recoveryHint:
        'Recharge suit battery at a Habitat, Lander, or Solar Base Module and keep spare battery reserve above 20%.',
    };
  }
  if (telemetry.radiationMsv >= 120) {
    return {
      title: 'Acute Solar Particle Exposure',
      cause: `Prolonged exposure outside radiation shielding during intense solar activity in ${environment.toUpperCase()}.`,
      recoveryHint:
        'Seek shelter inside a Habitat Dome, Spacecraft Cabin, or constructed Base Module during solar storms.',
    };
  }
  return {
    title: 'Suit Life-Support Critical Failure',
    cause: `Cumulative thermal/pressure trauma in ${environment.toUpperCase()} dropped crew health to zero.`,
    recoveryHint:
      'Use Repair Tool to patch suit damage, stay within Safe Zones during storms, and monitor suit telemetry.',
  };
}
