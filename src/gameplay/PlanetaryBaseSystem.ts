import { computeSpacecraftEngineering } from '../engine/spacecraftEngineering';
import type { BaseModuleType, EnvironmentId, MissionDesign, PlanetaryBaseModule } from '../engine/types';

export interface BaseModuleSpec {
  type: BaseModuleType;
  name: string;
  massKg: number;
  powerDeltaKw: number; // + generates, - consumes
  description: string;
  providesSafeZone: boolean;
  commsBoostPct: number;
  scienceYieldMultiplier: number;
}

export const BASE_MODULE_CATALOG: Record<BaseModuleType, BaseModuleSpec> = {
  habitat: {
    type: 'habitat',
    name: 'Pressurized Habitat Module',
    massKg: 1450,
    powerDeltaKw: -3.2,
    description: 'Pressurized living & crew shelter dome. Creates a permanent O2/Temp Safe Zone.',
    providesSafeZone: true,
    commsBoostPct: 5,
    scienceYieldMultiplier: 0,
  },
  'solar-farm': {
    type: 'solar-farm',
    name: 'Roll-Out Solar Array Farm',
    massKg: 620,
    powerDeltaKw: 8.5,
    description: 'High-efficiency surface photovoltaic wings supplying +8.5 kW to base modules.',
    providesSafeZone: false,
    commsBoostPct: 0,
    scienceYieldMultiplier: 0,
  },
  'comms-tower': {
    type: 'comms-tower',
    name: 'Deep Space Comms Tower',
    massKg: 480,
    powerDeltaKw: -1.6,
    description: '3m Ka-band relay mast boosting planetary telemetry signal strength.',
    providesSafeZone: false,
    commsBoostPct: 18,
    scienceYieldMultiplier: 0.05,
  },
  'research-lab': {
    type: 'research-lab',
    name: 'Planetary Science Laboratory',
    massKg: 1200,
    powerDeltaKw: -2.8,
    description: 'On-site analytical lab increasing sample discovery research value by +25%.',
    providesSafeZone: true,
    commsBoostPct: 0,
    scienceYieldMultiplier: 0.25,
  },
  'storage-module': {
    type: 'storage-module',
    name: 'Cryo & Sample Storage Vault',
    massKg: 540,
    powerDeltaKw: -0.9,
    description: 'Hermetic specimen vault & spare equipment cache.',
    providesSafeZone: false,
    commsBoostPct: 0,
    scienceYieldMultiplier: 0.1,
  },
  'landing-pad': {
    type: 'landing-pad',
    name: 'Sintered Landing Pad',
    massKg: 780,
    powerDeltaKw: -0.4,
    description: 'Laser-leveled beacon pad stabilizing surface resupply landings.',
    providesSafeZone: false,
    commsBoostPct: 5,
    scienceYieldMultiplier: 0,
  },
  'rover-garage': {
    type: 'rover-garage',
    name: 'Pressurized Rover Service Bay',
    massKg: 960,
    powerDeltaKw: -2.1,
    description: 'Maintenance shelter that recharges & repairs nearby surface rovers.',
    providesSafeZone: true,
    commsBoostPct: 0,
    scienceYieldMultiplier: 0,
  },
  'life-support': {
    type: 'life-support',
    name: 'ISRU Oxygen & ECLSS Plant',
    massKg: 1100,
    powerDeltaKw: -2.6,
    description: 'In-situ propellant & breathable O2 generator expanding Safe Zone radius.',
    providesSafeZone: true,
    commsBoostPct: 0,
    scienceYieldMultiplier: 0.05,
  },
};

export interface BaseResourceSummary {
  totalMassAllowanceKg: number;
  usedMassKg: number;
  remainingMassKg: number;
  totalPowerGeneratedKw: number;
  totalPowerConsumedKw: number;
  netPowerKw: number;
  commsBonusPct: number;
  scienceBonusMultiplier: number;
}

export function evaluateBaseResources(
  mission: MissionDesign,
  modules: PlanetaryBaseModule[],
  env: 'moon' | 'mars'
): BaseResourceSummary {
  const eng = computeSpacecraftEngineering(mission);
  // Mission launcher capacity & payload allocation determines deployable surface base mass allowance
  const totalMassAllowanceKg = Math.round(
    Math.max(4500, eng.launcherCapacityKg * 0.48 + eng.payloadMassKg * 4.2)
  );

  const envModules = modules.filter((m) => m.environment === env);
  const usedMassKg = envModules.reduce((acc, m) => acc + m.massKg, 0);

  // Outpost lander baseline provides +4.0 kW starting power
  let totalPowerGeneratedKw = 4.0 + Math.max(0, eng.powerMarginW / 500);
  let totalPowerConsumedKw = 0;
  let commsBonusPct = 0;
  let scienceMult = 1.0;

  for (const mod of envModules) {
    const spec = BASE_MODULE_CATALOG[mod.type];
    if (mod.powerDeltaKw >= 0) totalPowerGeneratedKw += mod.powerDeltaKw;
    else totalPowerConsumedKw += Math.abs(mod.powerDeltaKw);
    commsBonusPct += spec.commsBoostPct;
    scienceMult += spec.scienceYieldMultiplier;
  }

  return {
    totalMassAllowanceKg,
    usedMassKg,
    remainingMassKg: Math.max(0, totalMassAllowanceKg - usedMassKg),
    totalPowerGeneratedKw: Number(totalPowerGeneratedKw.toFixed(1)),
    totalPowerConsumedKw: Number(totalPowerConsumedKw.toFixed(1)),
    netPowerKw: Number((totalPowerGeneratedKw - totalPowerConsumedKw).toFixed(1)),
    commsBonusPct,
    scienceBonusMultiplier: Number(scienceMult.toFixed(2)),
  };
}

export function validateAndCreateBaseModule(params: {
  mission: MissionDesign;
  existingModules: PlanetaryBaseModule[];
  type: BaseModuleType;
  environment: 'moon' | 'mars';
  x: number;
  z: number;
}): { ok: boolean; module?: PlanetaryBaseModule; error?: string } {
  const spec = BASE_MODULE_CATALOG[params.type];
  const summary = evaluateBaseResources(params.mission, params.existingModules, params.environment);

  if (spec.massKg > summary.remainingMassKg) {
    return {
      ok: false,
      error: `Insufficient payload mass budget (${summary.remainingMassKg} kg left; ${spec.name} requires ${spec.massKg} kg). Upgrade launch vehicle or payloads.`,
    };
  }

  if (spec.powerDeltaKw < 0 && summary.netPowerKw + spec.powerDeltaKw < 0) {
    return {
      ok: false,
      error: `Insufficient base power (${summary.netPowerKw.toFixed(1)} kW net available; ${spec.name} draws ${Math.abs(spec.powerDeltaKw)} kW). Build a Solar Farm first.`,
    };
  }

  // Keep slight spacing from other modules so 3D domes don't stack
  const envMods = params.existingModules.filter((m) => m.environment === params.environment);
  const offsetAngle = envMods.length * 1.15;
  const nearOverlap = envMods.some((m) => Math.hypot(m.x - params.x, m.z - params.z) < 5.0);
  const finalX = nearOverlap ? Number((params.x + Math.cos(offsetAngle) * 6.5).toFixed(1)) : Number(params.x.toFixed(1));
  const finalZ = nearOverlap ? Number((params.z + Math.sin(offsetAngle) * 6.5).toFixed(1)) : Number(params.z.toFixed(1));

  return {
    ok: true,
    module: {
      id: `base-${params.type}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      type: params.type,
      name: spec.name,
      environment: params.environment,
      x: finalX,
      z: finalZ,
      massKg: spec.massKg,
      powerDeltaKw: spec.powerDeltaKw,
      builtAt: new Date().toISOString(),
      integrityPct: 100,
    },
  };
}

export function isPointInBuiltBaseSafeZone(
  env: EnvironmentId,
  x: number,
  z: number,
  modules: PlanetaryBaseModule[]
): boolean {
  if (env !== 'moon' && env !== 'mars') return false;
  return modules.some((m) => {
    if (m.environment !== env) return false;
    const spec = BASE_MODULE_CATALOG[m.type];
    return spec.providesSafeZone && Math.hypot(x - m.x, z - m.z) <= 6.8;
  });
}
