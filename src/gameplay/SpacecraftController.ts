import { computeOrbitalAnalysis } from '../engine/orbitalMechanics';
import { computeSpacecraftEngineering } from '../engine/spacecraftEngineering';
import type { CockpitState, MissionDesign } from '../engine/types';

export interface LaunchSequenceStepDef {
  step: number;
  code: string;
  label: string;
  detail: string;
}

export const LAUNCH_SEQUENCE_STEPS: LaunchSequenceStepDef[] = [
  { step: 1, code: 'L-10', label: 'Mission Readiness Check', detail: 'Verify engineering reviews & FRR gate clearance.' },
  { step: 2, code: 'L-09', label: 'Fuel & Payload Verification', detail: 'Confirm wet mass within launcher capacity & Δv margin.' },
  { step: 3, code: 'L-08', label: 'Crew & Cabin Confirmation', detail: 'Seal cabin hatch and verify ECLSS cabin pressure (101.3 kPa).' },
  { step: 4, code: 'L-07', label: 'Terminal Auto-Countdown', detail: 'Flight computer assumes terminal count at T-00:10.' },
  { step: 5, code: 'L-06', label: 'Main Engine Ignition', detail: 'Ignite first-stage propulsion & verify chamber thrust.' },
  { step: 6, code: 'L-05', label: 'Tower Liftoff & Pitchover', detail: 'Clear launch pad and initiate gravity-turn ascent.' },
  { step: 7, code: 'L-04', label: 'Max-Q & Stage Separation', detail: 'Separate booster stage and ignite upper orbital stage.' },
  { step: 8, code: 'L-03', label: 'Orbital Insertion Burn', detail: 'Accelerate to parking orbital velocity (Vis-Viva target).' },
  { step: 9, code: 'L-02', label: 'Orbit Verification', detail: 'Confirm perigee/apogee & solar/RTG power bus online.' },
  { step: 10, code: 'L-01', label: 'Mission Control Confirmation', detail: 'Go for orbital operations & planetary transfer.' },
];

export interface LaunchReadinessEvaluation {
  canLaunchStrict: boolean;
  blockers: string[];
  warnings: string[];
  wetMassKg: number;
  launcherCapacityKg: number;
  availableDeltaVKms: number;
  requiredDeltaVKms: number;
  frrPassed: boolean;
}

export function evaluateLaunchReadinessForCockpit(mission: MissionDesign): LaunchReadinessEvaluation {
  const eng = computeSpacecraftEngineering(mission);
  const orb = computeOrbitalAnalysis(
    mission.destinationId,
    mission.orbitalPlan,
    mission.spacecraft,
    eng.wetMassKg,
    eng.dryMassKg
  );
  const frrPassed = Boolean(mission.gates.find((g) => g.code === 'FRR')?.passed);

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!eng.isMassValid) {
    blockers.push(
      `Vehicle wet mass (${eng.wetMassKg.toLocaleString()} kg) exceeds launcher capacity (${eng.launcherCapacityKg.toLocaleString()} kg).`
    );
  }
  if (!eng.isPowerValid) {
    blockers.push(`Negative bus power margin (${eng.powerMarginW} W). Upgrade solar arrays or RTG.`);
  }
  if (!orb.isDeltaVSufficient) {
    blockers.push(
      `Insufficient Δv (${eng.availableDeltaVKms.toFixed(2)} vs ${orb.totalRequiredDeltaVKms.toFixed(2)} km/s required).`
    );
  }
  if (!frrPassed) {
    warnings.push('FRR lifecycle gate in Systems Engineering is not yet signed off.');
  }
  const unmitigatedCrit = mission.risks.filter((r) => !r.mitigated && r.severity === 'Critical');
  if (unmitigatedCrit.length > 0) {
    warnings.push(`${unmitigatedCrit.length} unmitigated Critical risk(s) may trigger in-flight anomalies.`);
  }

  return {
    canLaunchStrict: blockers.length === 0 && frrPassed,
    blockers,
    warnings,
    wetMassKg: eng.wetMassKg,
    launcherCapacityKg: eng.launcherCapacityKg,
    availableDeltaVKms: eng.availableDeltaVKms,
    requiredDeltaVKms: orb.totalRequiredDeltaVKms,
    frrPassed,
  };
}

export function createInitialCockpitState(mission: MissionDesign): CockpitState {
  const sim = mission.simulation;
  const inOrbit =
    sim.currentStage === 'Launch' ||
    sim.currentStage === 'Cruise' ||
    sim.currentStage === 'Operations';
  return {
    engineIgnited: false,
    throttlePct: 0,
    attitudeMode: 'prograde',
    pitchDeg: 0,
    yawDeg: 0,
    rollDeg: 0,
    altitudeKm: inOrbit ? mission.orbitalPlan.departureAltitudeKm : 0,
    velocityKms: inOrbit ? 7.73 : 0,
    fuelPct: sim.fuelRemainingPct,
    powerPct: sim.batteryChargePct,
    lifeSupportNominal: true,
    commsLocked: true,
    dockedToStation: sim.currentStage === 'Mission Concept' || sim.currentStage === 'Testing',
    emergencyShutdown: false,
    launchStepIndex: inOrbit ? 10 : 0,
    launchSequenceActive: false,
    launchCompleted: inOrbit,
  };
}

export function stepCockpitTelemetry(prev: CockpitState, dt: number): CockpitState {
  if (prev.emergencyShutdown) {
    return {
      ...prev,
      engineIgnited: false,
      throttlePct: 0,
    };
  }
  if (!prev.engineIgnited || prev.throttlePct <= 0 || prev.fuelPct <= 0) {
    return {
      ...prev,
      throttlePct: prev.fuelPct <= 0 ? 0 : prev.throttlePct,
      engineIgnited: prev.fuelPct <= 0 ? false : prev.engineIgnited,
    };
  }
  const thrustFrac = prev.throttlePct / 100;
  const fuelBurn = thrustFrac * 1.45 * dt;
  const nextFuel = Math.max(0, Number((prev.fuelPct - fuelBurn).toFixed(2)));
  const nextAlt = Number((prev.altitudeKm + thrustFrac * 2.8 * dt).toFixed(1));
  const nextVel = Number(Math.min(11.2, prev.velocityKms + thrustFrac * 0.22 * dt).toFixed(2));
  const nextPower = Math.max(10, Math.min(100, Number((prev.powerPct - thrustFrac * 0.35 * dt + 0.25 * dt).toFixed(2))));

  return {
    ...prev,
    fuelPct: nextFuel,
    powerPct: nextPower,
    altitudeKm: nextAlt,
    velocityKms: nextVel,
    dockedToStation: false,
  };
}

export function advanceLaunchStep(
  prev: CockpitState,
  mission: MissionDesign,
  bypassFrrInTraining: boolean
): { next: CockpitState; error?: string; completedNow?: boolean } {
  const readiness = evaluateLaunchReadinessForCockpit(mission);
  if (prev.launchStepIndex === 0 && !bypassFrrInTraining && readiness.blockers.length > 0) {
    return {
      next: prev,
      error: readiness.blockers[0],
    };
  }
  if (prev.launchStepIndex >= 10) {
    return { next: prev, completedNow: false };
  }

  const nextIdx = prev.launchStepIndex + 1;
  const completedNow = nextIdx === 10;
  const parkingAlt = mission.orbitalPlan.departureAltitudeKm;
  const altProgress = nextIdx >= 5 ? Math.round(((nextIdx - 4) / 6) * parkingAlt) : 0;
  const velProgress = nextIdx >= 5 ? Number((((nextIdx - 4) / 6) * 7.73).toFixed(2)) : 0;

  return {
    completedNow,
    next: {
      ...prev,
      launchStepIndex: nextIdx,
      launchSequenceActive: !completedNow,
      launchCompleted: completedNow,
      engineIgnited: nextIdx >= 5 && nextIdx < 9,
      throttlePct: nextIdx >= 5 && nextIdx < 9 ? 100 : 0,
      dockedToStation: false,
      altitudeKm: Math.max(prev.altitudeKm, altProgress),
      velocityKms: Math.max(prev.velocityKms, velProgress),
      fuelPct: Math.max(20, Number((prev.fuelPct - (nextIdx >= 5 ? 1.5 : 0)).toFixed(1))),
    },
  };
}
