/**
 * HazardDamageSystem.ts
 * Comprehensive dynamic threat and environmental hazard simulation system.
 * Tracks subsystem conditions (structure, solar, propulsion, comms, instruments, thermal, power, computer)
 * and simulates active hazards (wind storms, asteroid debris, micrometeoroids, solar particle events,
 * radiation, thermal anomalies, communication disturbances) with real-time consequences and player responses.
 */

import type { EnvironmentId, MissionDesign, RoverState, SurvivalTelemetry } from './types';

export type HazardType =
  | 'wind-storm'
  | 'space-debris'
  | 'micrometeoroid'
  | 'solar-particle-event'
  | 'radiation-spike'
  | 'thermal-anomaly'
  | 'comms-disturbance';

export type HazardSeverity = 'informational' | 'caution' | 'warning' | 'critical' | 'emergency';

export interface SubsystemConditions {
  structural: number; // 0 - 100%
  solar: number;
  propulsion: number;
  comms: number;
  instruments: number;
  thermal: number;
  power: number;
  computer: number;
}

export interface EnvironmentalHazard {
  id: string;
  type: HazardType;
  title: string;
  description: string;
  severity: HazardSeverity;
  environment: EnvironmentId;
  distanceKm: number;
  closingVelocityKms: number;
  timeToImpactSec: number;
  affectedSubsystem: keyof SubsystemConditions;
  damagePotential: number; // % health reduction if unmitigated
  deltaVCostForEvasion?: number;
  active: boolean;
  triggeredAtMs: number;
  responses: HazardResponseOption[];
}

export interface HazardResponseOption {
  id: string;
  label: string;
  effectSummary: string;
  deltaVCost?: number;
  batteryDelta?: number;
  integrityDelta?: number;
  scienceBonus?: number;
  mitigatesHazard: boolean;
}

export const INITIAL_SUBSYSTEM_CONDITIONS: SubsystemConditions = {
  structural: 100,
  solar: 100,
  propulsion: 100,
  comms: 100,
  instruments: 100,
  thermal: 100,
  power: 100,
  computer: 100,
};

export function createActiveHazard(type: HazardType, environment: EnvironmentId): EnvironmentalHazard {
  const id = `haz-${type}-${Date.now()}`;
  const now = Date.now();

  switch (type) {
    case 'wind-storm':
      return {
        id,
        type,
        title: 'Jezero Electrostatic Dust Squall',
        description: 'High-velocity atmospheric dust front reducing solar array generation by 45% and degrading surface optical visibility.',
        severity: 'warning',
        environment,
        distanceKm: 1.8,
        closingVelocityKms: 0.03,
        timeToImpactSec: 60,
        affectedSubsystem: 'solar',
        damagePotential: 15,
        active: true,
        triggeredAtMs: now,
        responses: [
          {
            id: 'button-up',
            label: 'Seal Optics & Retract Mast Arrays',
            effectSummary: 'Protects solar & instrument arrays; -4% suit battery, avoids damage.',
            batteryDelta: -4,
            mitigatesHazard: true,
          },
          {
            id: 'push-through',
            label: 'Maintain Full Operations During Storm',
            effectSummary: '+20 Science Yield from aeolian capture, but -20% solar and -12% solar array condition.',
            scienceBonus: 20,
            mitigatesHazard: false,
          },
        ],
      };

    case 'space-debris':
      return {
        id,
        type,
        title: 'Cataloged Orbital Debris Collision Alert',
        description: 'High-inclination defunct upper-stage fragment crossing orbital insertion corridor.',
        severity: 'critical',
        environment,
        distanceKm: 120,
        closingVelocityKms: 14.2,
        timeToImpactSec: 45,
        affectedSubsystem: 'structural',
        damagePotential: 40,
        deltaVCostForEvasion: 0.045, // 45 m/s delta-v
        active: true,
        triggeredAtMs: now,
        responses: [
          {
            id: 'evasive-burn',
            label: 'Execute RCS Evasive Thruster Burn (0.045 km/s Δv)',
            effectSummary: 'Safely alters trajectory; consumes 0.045 km/s Δv reserve.',
            deltaVCost: 0.045,
            mitigatesHazard: true,
          },
          {
            id: 'brace-impact',
            label: 'Shutdown Non-Essential Busses & Brace',
            effectSummary: 'Saves power but risks -25% structural and solar subsystem damage if impact occurs.',
            mitigatesHazard: false,
          },
        ],
      };

    case 'solar-particle-event':
      return {
        id,
        type,
        title: 'Coronal Mass Ejection (CME) Proton Flux Spike',
        description: 'Intense high-energy proton storm hitting spacecraft/habitat exterior. Elevated single-event upset risk.',
        severity: 'emergency',
        environment,
        distanceKm: 150000,
        closingVelocityKms: 850,
        timeToImpactSec: 30,
        affectedSubsystem: 'computer',
        damagePotential: 30,
        active: true,
        triggeredAtMs: now,
        responses: [
          {
            id: 'safe-mode',
            label: 'Enter Hardware Safe-Mode & Shield Electronics',
            effectSummary: 'Protects flight computer and instruments; pauses telemetry transmission.',
            batteryDelta: -6,
            mitigatesHazard: true,
          },
          {
            id: 'absorb-data',
            label: 'Record High-Flux Particle Spectrum',
            effectSummary: '+35 Science Yield, risks computer/instrument memory glitches (-15% health).',
            scienceBonus: 35,
            mitigatesHazard: false,
          },
        ],
      };

    case 'thermal-anomaly':
      return {
        id,
        type,
        title: 'Radiator Loop Thermal Imbalance',
        description: 'Direct sun exposure overheated starboard bus radiator panel (Core temp +85°C).',
        severity: 'warning',
        environment,
        distanceKm: 0.1,
        closingVelocityKms: 0,
        timeToImpactSec: 50,
        affectedSubsystem: 'thermal',
        damagePotential: 20,
        active: true,
        triggeredAtMs: now,
        responses: [
          {
            id: 'reorient-craft',
            label: 'Yaw Spacecraft 45° to Sunshade Vector',
            effectSummary: 'Restores thermal equilibrium; consumes minor RCS fuel.',
            batteryDelta: -3,
            mitigatesHazard: true,
          },
        ],
      };

    case 'comms-disturbance':
    default:
      return {
        id,
        type: 'comms-disturbance',
        title: 'Deep Space Plasma Scintillation Comms Fade',
        description: 'Solar corona scattering dropped Ka-band signal-to-noise ratio by 18 dB.',
        severity: 'caution',
        environment,
        distanceKm: 5000,
        closingVelocityKms: 30,
        timeToImpactSec: 40,
        affectedSubsystem: 'comms',
        damagePotential: 10,
        active: true,
        triggeredAtMs: now,
        responses: [
          {
            id: 'switch-sband',
            label: 'Switch to Low-Gain S-Band Backup Antenna',
            effectSummary: 'Restores robust link with lower data rate.',
            mitigatesHazard: true,
          },
        ],
      };
  }
}

export function applySubsystemDamage(
  conditions: SubsystemConditions,
  subsystem: keyof SubsystemConditions,
  damageAmount: number
): SubsystemConditions {
  const current = conditions[subsystem];
  const next = Math.max(0, Number((current - damageAmount).toFixed(1)));
  return {
    ...conditions,
    [subsystem]: next,
  };
}

export function repairSubsystem(
  conditions: SubsystemConditions,
  subsystem: keyof SubsystemConditions
): SubsystemConditions {
  return {
    ...conditions,
    [subsystem]: 100,
  };
}
