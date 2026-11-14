import { DESTINATIONS, LAUNCH_VEHICLES } from './catalog';
import { computeOrbitalAnalysis } from './orbitalMechanics';
import { computeSpacecraftEngineering } from './spacecraftEngineering';
import { evaluateRequirements } from './systemsEngineering';
import type {
  ActiveSimEvent,
  MissionDesign,
  MissionSimulationState,
  SimulationDecisionOption,
  SimulationStage,
} from './types';

export const SIMULATION_STAGES: SimulationStage[] = [
  'Mission Concept',
  'Mission Design',
  'Development',
  'Testing',
  'Launch',
  'Cruise',
  'Operations',
  'End of Life',
];

export function getNextStage(current: SimulationStage): SimulationStage | null {
  const idx = SIMULATION_STAGES.indexOf(current);
  if (idx === -1 || idx >= SIMULATION_STAGES.length - 1) return null;
  return SIMULATION_STAGES[idx + 1];
}

export function createStageEvent(mission: MissionDesign, stage: SimulationStage): ActiveSimEvent | null {
  const dest = DESTINATIONS.find((d) => d.id === mission.destinationId) ?? DESTINATIONS[3];

  switch (stage) {
    case 'Launch':
      return {
        id: `evt-launch-${Date.now()}`,
        stage: 'Launch',
        title: 'Upper-Level Wind Shear & Fairing Acoustic Check',
        prompt:
          'Range telemetry reports upper-altitude wind shear at 11 km (82% of structural placard limit). Choose launch disposition:',
        options: [
          {
            id: 'launch-hold',
            label: 'Hold 15 Minutes for Weather Balloon Verification',
            effectSummary: 'Zero structural risk · +$2M range ops cost',
            budgetDeltaMUsd: 2,
            riskDelta: -5,
            successBias: 0.98,
          },
          {
            id: 'launch-go',
            label: 'Proceed with Nominal Ascent Pitch Profile',
            effectSummary: 'On-time window · Moderate Max-Q structural load',
            riskDelta: 8,
            successBias: 0.85,
          },
        ],
      };

    case 'Cruise':
      return {
        id: `evt-cruise-${Date.now()}`,
        stage: 'Cruise',
        title: `Trajectory Correction Maneuver (TCM-2) En Route to ${dest.name}`,
        prompt:
          'Deep Space Network radiometric tracking detects a 0.42° arrival corridor drift. Select maneuver execution:',
        options: [
          {
            id: 'tcm-precision',
            label: 'Execute Precision Optical-Nav Burn',
            effectSummary: 'Uses 6% propellant · Locks optimal arrival corridor',
            deltaVCostKms: 0.12,
            scienceDelta: 8,
            successBias: 0.99,
          },
          {
            id: 'tcm-minimal',
            label: 'Defer Burn & Rely on Reaction Wheel Desaturation',
            effectSummary: 'Saves fuel · Higher arrival capture burn penalty',
            deltaVCostKms: 0.02,
            riskDelta: 12,
            successBias: 0.72,
          },
        ],
      };

    case 'Operations':
      return {
        id: `evt-ops-${Date.now()}`,
        stage: 'Operations',
        title: `${dest.name} Primary Science Campaign & Power Anomaly`,
        prompt:
          'Solar array bus voltage dips 14% during peak spectrometer + downlink pass. How should Flight Operations respond?',
        options: [
          {
            id: 'ops-stagger',
            label: 'Stagger Downlink & Peak Payload Duty Cycles',
            effectSummary: '+28% Science Return · Preserves 12% power margin',
            powerDeltaPct: 8,
            scienceDelta: 32,
            successBias: 0.98,
          },
          {
            id: 'ops-overdrive',
            label: 'Run All Payloads Simultaneously on Battery Buffer',
            effectSummary: '+42% Science Return · High brownout risk if margin < 15%',
            powerDeltaPct: -22,
            scienceDelta: 42,
            successBias: 0.65,
          },
        ],
      };

    case 'End of Life':
      return {
        id: `evt-eol-${Date.now()}`,
        stage: 'End of Life',
        title: 'Planetary Protection & End-of-Life Disposal',
        prompt:
          'Primary mission duration is complete. Select spacecraft decommissioning protocol in compliance with orbital debris guidelines:',
        options: [
          {
            id: 'eol-disposal',
            label: 'Execute Graveyard Disposal Orbit / Passivation',
            effectSummary: 'Uses remaining propellant · Full planetary protection compliance',
            deltaVCostKms: 0.08,
            scienceDelta: 10,
            successBias: 1.0,
          },
          {
            id: 'eol-deorbit',
            label: 'Controlled Atmospheric Deorbit / Impact Burn',
            effectSummary: 'Clears operational orbit · Zero orbital debris',
            deltaVCostKms: 0.1,
            scienceDelta: 10,
            successBias: 1.0,
          },
        ],
      };

    default:
      return null;
  }
}

export function validateStageReadiness(
  mission: MissionDesign,
  targetStage: SimulationStage
): { ok: boolean; reason?: string } {
  const eng = computeSpacecraftEngineering(mission);
  const orb = computeOrbitalAnalysis(
    mission.destinationId,
    mission.orbitalPlan,
    mission.spacecraft,
    eng.wetMassKg,
    eng.dryMassKg
  );
  const reqs = evaluateRequirements(mission, eng, orb);

  if (targetStage === 'Launch') {
    if (!eng.isMassValid) {
      return {
        ok: false,
        reason: `Launch blocked: Wet mass (${eng.wetMassKg} kg) exceeds ${LAUNCH_VEHICLES.find((l) => l.id === mission.launchVehicleId)?.name ?? 'launcher'} capacity (${eng.launcherCapacityKg} kg).`,
      };
    }
    if (!eng.isPowerValid) {
      return {
        ok: false,
        reason: `Launch blocked: Negative power margin (${eng.powerMarginW} W) or insufficient eclipse battery (${eng.eclipseCapacityHours}h).`,
      };
    }
    if (!orb.isDeltaVSufficient) {
      return {
        ok: false,
        reason: `Launch blocked: Available Δv (${eng.availableDeltaVKms} km/s) is below mission requirement (${orb.totalRequiredDeltaVKms} km/s).`,
      };
    }
    if (mission.selectedPayloadIds.length === 0) {
      return {
        ok: false,
        reason: 'Launch blocked: Select at least one payload instrument before launch.',
      };
    }
    const frr = mission.gates.find((g) => g.code === 'FRR');
    if (!frr?.passed) {
      return {
        ok: false,
        reason: `Launch blocked: Flight Readiness Review (FRR) gate must be passed in Systems Engineering (failed mandatory checks: ${reqs.filter((r) => r.priority === 'Mandatory' && r.status === 'Failed').length}).`,
      };
    }
  }
  return { ok: true };
}

export function applyDecisionToSimulation(
  mission: MissionDesign,
  option: SimulationDecisionOption
): MissionSimulationState {
  const sim = { ...mission.simulation };
  const eng = computeSpacecraftEngineering(mission);
  const orb = computeOrbitalAnalysis(
    mission.destinationId,
    mission.orbitalPlan,
    mission.spacecraft,
    eng.wetMassKg,
    eng.dryMassKg
  );

  const unmitigatedCritical = mission.risks.filter((r) => !r.mitigated && r.severity === 'Critical').length;
  const lv = LAUNCH_VEHICLES.find((l) => l.id === mission.launchVehicleId);
  const reliability = lv?.reliabilityRating ?? 0.95;

  // Deterministic engineering evaluation (no opaque random punishment when engineering is sound)
  let fuelUsedPct = option.deltaVCostKms ? Math.min(25, (option.deltaVCostKms / Math.max(0.5, eng.availableDeltaVKms)) * 100) : 2;
  let newFuel = Math.max(0, Number((sim.fuelRemainingPct - fuelUsedPct).toFixed(1)));
  let newBattery = Math.min(100, Math.max(0, sim.batteryChargePct + (option.powerDeltaPct ?? 0)));
  let newScience = Math.min(100, Math.round(sim.scienceCollectedPct + (option.scienceDelta ?? 12)));

  // Check real engineering failure triggers
  if (option.id === 'ops-overdrive' && eng.powerMarginPct < 15) {
    return {
      ...sim,
      batteryChargePct: 0,
      failed: true,
      failedStage: 'Operations',
      failureReason:
        'Power bus brownout during simultaneous peak payload operation. Power margin (<15%) could not sustain peak draw.',
      activeEvent: null,
      logs: [
        ...sim.logs,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          stage: sim.currentStage,
          category: 'telemetry',
          title: 'CRITICAL: Main Bus Under-Voltage Fault',
          detail: 'Simultaneous payload load exceeded available solar + battery capacity.',
          severity: 'critical',
          decisionMade: option.label,
          metricSnapshot: '0% Battery',
        },
      ],
    };
  }

  if (sim.currentStage === 'Launch' && option.id === 'launch-go' && unmitigatedCritical > 0 && reliability < 0.96) {
    return {
      ...sim,
      failed: true,
      failedStage: 'Launch',
      failureReason:
        'Max-Q structural resonance anomaly triggered by unmitigated critical risk during wind-shear ascent.',
      activeEvent: null,
      logs: [
        ...sim.logs,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          stage: 'Launch',
          category: 'telemetry',
          title: 'CRITICAL: Ascent Telemetry Lost at Max-Q',
          detail: 'Unmitigated launch structural risk combined with wind shear exceeded fairing placard.',
          severity: 'critical',
          decisionMade: option.label,
        },
      ],
    };
  }

  if (newFuel <= 0 && sim.currentStage !== 'End of Life') {
    return {
      ...sim,
      fuelRemainingPct: 0,
      failed: true,
      failedStage: sim.currentStage,
      failureReason: `Propellant exhausted during ${sim.currentStage} burn. Increase propellant load or select higher-Isp propulsion.`,
      activeEvent: null,
      logs: [
        ...sim.logs,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          stage: sim.currentStage,
          category: 'telemetry',
          title: 'CRITICAL: Propellant Depletion',
          detail: `Available Δv (${eng.availableDeltaVKms} km/s) insufficient for ${orb.totalRequiredDeltaVKms} km/s profile.`,
          severity: 'critical',
          decisionMade: option.label,
          metricSnapshot: '0% Fuel',
        },
      ],
    };
  }

  const nextObjectives = [...sim.objectivesCompleted];
  if (sim.currentStage === 'Operations' && !nextObjectives.includes(mission.primaryObjective)) {
    nextObjectives.push(mission.primaryObjective);
  }
  if (sim.currentStage === 'End of Life') {
    for (const sec of mission.secondaryObjectives) {
      if (!nextObjectives.includes(sec)) nextObjectives.push(sec);
    }
  }

  const eolChoice =
    option.id === 'eol-deorbit'
      ? ('Deorbit' as const)
      : option.id === 'eol-disposal'
        ? ('Disposal Orbit' as const)
        : sim.endOfLifeOption;

  const isCompleted = sim.currentStage === 'End of Life';

  return {
    ...sim,
    fuelRemainingPct: newFuel,
    batteryChargePct: newBattery,
    scienceCollectedPct: isCompleted ? Math.max(82, newScience) : newScience,
    objectivesCompleted: nextObjectives,
    activeEvent: null,
    stageProgressPct: 100,
    completed: isCompleted,
    endOfLifeOption: eolChoice,
    logs: [
      ...sim.logs,
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        stage: sim.currentStage,
        category: isCompleted ? 'milestone' : 'event',
        title: `${sim.currentStage} Decision Executed`,
        detail: `${option.label} — ${option.effectSummary}`,
        severity: 'nominal',
        decisionMade: option.label,
        metricSnapshot: `Fuel ${newFuel}% · Sci ${isCompleted ? Math.max(82, newScience) : newScience}%`,
      },
    ],
  };
}
