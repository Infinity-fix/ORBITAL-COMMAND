import type {
  DynamicEventChoice,
  DynamicEventType,
  DynamicWorldEvent,
  EnvironmentId,
  MissionDesign,
  RoverState,
  SurvivalTelemetry,
} from '../engine/types';

export function buildDynamicWorldEvent(
  type: DynamicEventType,
  environment: EnvironmentId,
  causeNote?: string
): DynamicWorldEvent {
  const id = `evt-${type}-${Date.now()}`;
  const now = Date.now();

  switch (type) {
    case 'solar-storm':
      return {
        id,
        type,
        title: 'Solar Particle Event Alert',
        cause:
          causeNote ||
          'Elevated coronal mass ejection proton flux detected along trajectory. Unshielded radiation levels increasing.',
        severity: 'critical',
        environment,
        triggeredAtMs: now,
        active: true,
        choices: [
          {
            id: 'shelter',
            label: 'Shield in Habitat / Safe Zone & Throttle Comms',
            effectSummary: 'Clears acute storm lock; -8% battery, +40 score for safe ops.',
            batteryDelta: -8,
            scoreDelta: 40,
            clearHazard: true,
          },
          {
            id: 'push-science',
            label: 'Record High-Energy Particle Spectrum Before Ducking',
            effectSummary: '+25 Science Yield; costs -10% suit battery & +0.18 mSv.',
            batteryDelta: -10,
            scienceBonus: 25,
            clearHazard: true,
          },
        ],
      };

    case 'dust-storm':
      return {
        id,
        type,
        title: 'Jezero Electrostatic Dust Storm',
        cause:
          causeNote ||
          'Regional baroclinic front kicked up iron-oxide dust, reducing visibility & solar array efficiency by 55%.',
        severity: 'caution',
        environment,
        triggeredAtMs: now,
        active: true,
        choices: [
          {
            id: 'button-up',
            label: 'Enable Helmet Visor Filter & Conserve Power',
            effectSummary: 'Stabilizes suit loop; -5% battery, clears storm hold.',
            batteryDelta: -5,
            scoreDelta: 30,
            clearHazard: true,
          },
          {
            id: 'sample-dust',
            label: 'Capture Aeolian Dust Sample Mid-Squall',
            effectSummary: '+30 Science Yield, -8% suit integrity from grit abrasion.',
            integrityDelta: -8,
            scienceBonus: 30,
            clearHazard: true,
          },
        ],
      };

    case 'o2-leak':
      return {
        id,
        type,
        title: 'Spacesuit Micro-Puncture O2 Leak',
        cause:
          causeNote ||
          'Sharp basalt abrasion punctured outer wrist bladder seal (-0.55% O2/s leak).',
        severity: 'critical',
        environment,
        triggeredAtMs: now,
        active: true,
        choices: [
          {
            id: 'seal-patch',
            label: 'Apply Emergency Sealant Patch & Purge Reserve O2',
            effectSummary: 'Stops O2 leak cleanly, restores +20% O2 and +25% suit integrity.',
            oxygenDelta: 20,
            integrityDelta: 25,
            clearHazard: true,
          },
          {
            id: 'manual-tape',
            label: 'Cinch Bypass Clamp (Low Resource Fix)',
            effectSummary: 'Stops leak without O2 purge (-6% battery while clamping).',
            batteryDelta: -6,
            integrityDelta: 10,
            clearHazard: true,
          },
        ],
      };

    case 'comms-blackout':
      return {
        id,
        type,
        title: 'Relay Antenna Pointing Drift',
        cause:
          causeNote ||
          'High-gain orbital relay alignment degraded by thermal expansion across boom gimbal.',
        severity: 'caution',
        environment,
        triggeredAtMs: now,
        active: true,
        choices: [
          {
            id: 'realign',
            label: 'Run Autonomous Star-Tracker Re-Acquisition',
            effectSummary: 'Restores 100% Flight Loop comms; -7% suit/craft battery.',
            batteryDelta: -7,
            scoreDelta: 25,
            clearHazard: true,
          },
        ],
      };

    case 'rover-fault':
      return {
        id,
        type,
        title: 'Rover Bogie Actuator Jam',
        cause:
          causeNote ||
          'Coarse regolith rock wedged in forward-right rover steering knuckle (-22% integrity).',
        severity: 'caution',
        environment,
        triggeredAtMs: now,
        active: true,
        choices: [
          {
            id: 'clear-bogie',
            label: 'Torque-Reverse & Field-Repair Steering Pin',
            effectSummary: 'Restores +25% rover integrity and clears drive fault.',
            roverIntegrityDelta: 25,
            batteryDelta: -5,
            clearHazard: true,
          },
        ],
      };

    case 'power-shortage':
      return {
        id,
        type,
        title: 'Suit & Bus Power Load Shedding',
        cause:
          causeNote ||
          'Configured spacecraft/suit power margin below safe transient threshold under simultaneous heater + tool load.',
        severity: 'critical',
        environment,
        triggeredAtMs: now,
        active: true,
        choices: [
          {
            id: 'load-shed',
            label: 'Shed Auxiliary Heaters & Recalibrate DC-DC Bus',
            effectSummary: 'Recovers +18% battery reserve cleanly.',
            batteryDelta: 18,
            co2Delta: -0.2,
            clearHazard: true,
          },
        ],
      };

    case 'rescue-beacon':
      return {
        id,
        type,
        title: 'Squad Crew Distress / Rescue Beacon',
        cause:
          causeNote ||
          'A crewmate telemetry transponder reported low oxygen / stranded rover beyond perimeter.',
        severity: 'critical',
        environment,
        triggeredAtMs: now,
        active: true,
        choices: [
          {
            id: 'dispatch-o2',
            label: 'Transmit Waypoint & Share Emergency O2 Link',
            effectSummary: '+60 Squad Coordination Score; clears beacon alert.',
            scoreDelta: 60,
            clearHazard: true,
          },
        ],
      };

    case 'science-anomaly':
    default:
      return {
        id,
        type: 'science-anomaly',
        title: 'Unexpected Subsurface Mineral Anomaly',
        cause:
          causeNote ||
          'Orbital radar & suit magnetometer flagged localized hydrated mineral lens nearby.',
        severity: 'nominal',
        environment,
        triggeredAtMs: now,
        active: true,
        choices: [
          {
            id: 'log-anomaly',
            label: 'Log Coordinates to Discovery Database',
            effectSummary: '+45 Science Discovery Bonus.',
            scienceBonus: 45,
            scoreDelta: 45,
            clearHazard: true,
          },
        ],
      };
  }
}

export function evaluateHazardTriggerFromSimulation(params: {
  environment: EnvironmentId;
  telemetry: SurvivalTelemetry;
  mission: MissionDesign;
  rover: RoverState | null;
  elapsedSec: number;
  lastEventSec: number;
  hasActiveEvent: boolean;
}): DynamicWorldEvent | null {
  if (params.hasActiveEvent) return null;
  if (params.elapsedSec - params.lastEventSec < 28) return null;

  const unmitigatedCriticalRisks = params.mission.risks.filter(
    (r) => !r.mitigated && r.score >= 12
  ).length;

  // Deterministic, explainable conditions instead of arbitrary chaos
  if (params.telemetry.batteryPct < 24) {
    return buildDynamicWorldEvent(
      'power-shortage',
      params.environment,
      `Suit battery dropped to ${Math.round(params.telemetry.batteryPct)}% without docking or solar recharge.`
    );
  }
  if (params.rover && params.rover.integrityPct < 65) {
    return buildDynamicWorldEvent(
      'rover-fault',
      params.environment,
      `Rover hull impacts reduced integrity to ${Math.round(params.rover.integrityPct)}%.`
    );
  }
  if (params.environment === 'mars' && params.elapsedSec > 32 && params.lastEventSec < 10) {
    return buildDynamicWorldEvent(
      'dust-storm',
      'mars',
      unmitigatedCriticalRisks > 0
        ? 'Unmitigated atmospheric dust risk escalated into an active Jezero squall.'
        : 'Seasonal baroclinic dust front sweeping across Jezero Basin.'
    );
  }
  if (
    (params.environment === 'orbital-eva' || params.environment === 'moon') &&
    unmitigatedCriticalRisks > 0 &&
    params.elapsedSec > 38 &&
    params.lastEventSec < 10
  ) {
    return buildDynamicWorldEvent(
      'solar-storm',
      params.environment,
      'Unmitigated mission radiation risk coincided with heightened solar particle flux.'
    );
  }

  return null;
}

export function applyDynamicEventChoice(
  telemetry: SurvivalTelemetry,
  rover: RoverState | null,
  choice: DynamicEventChoice
): {
  nextTelemetry: SurvivalTelemetry;
  nextRover: RoverState | null;
  scoreDelta: number;
  scienceBonus: number;
} {
  const nextTelemetry: SurvivalTelemetry = {
    ...telemetry,
    oxygenPct: Math.max(0, Math.min(100, Number((telemetry.oxygenPct + (choice.oxygenDelta ?? 0)).toFixed(2)))),
    batteryPct: Math.max(0, Math.min(100, Number((telemetry.batteryPct + (choice.batteryDelta ?? 0)).toFixed(2)))),
    co2Pct: Math.max(0.04, Number((telemetry.co2Pct + (choice.co2Delta ?? 0)).toFixed(2))),
    suitIntegrityPct: Math.max(
      0,
      Math.min(100, Number((telemetry.suitIntegrityPct + (choice.integrityDelta ?? 0)).toFixed(2)))
    ),
    oxygenLeakPerSec: choice.clearHazard ? 0 : telemetry.oxygenLeakPerSec,
  };

  const nextRover = rover
    ? {
        ...rover,
        integrityPct: Math.max(
          0,
          Math.min(100, Number((rover.integrityPct + (choice.roverIntegrityDelta ?? 0)).toFixed(1)))
        ),
      }
    : null;

  return {
    nextTelemetry,
    nextRover,
    scoreDelta: choice.scoreDelta ?? 0,
    scienceBonus: choice.scienceBonus ?? 0,
  };
}
