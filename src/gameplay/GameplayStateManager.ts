import type {
  AstronautCustomization,
  AstronautSuitPreset,
  EnvironmentId,
  GameplaySettings,
  KeyBindings,
  MissionDesign,
  PlayableMissionId,
} from '../engine/types';
import { computeOrbitalAnalysis } from '../engine/orbitalMechanics';
import { computeSpacecraftEngineering } from '../engine/spacecraftEngineering';

export const SUIT_PRESETS: Record<
  AstronautSuitPreset,
  {
    label: string;
    description: string;
    primaryColor: string;
    accentColor: string;
    helmetStyle: AstronautCustomization['helmetStyle'];
    backpackStyle: AstronautCustomization['backpackStyle'];
  }
> = {
  'white-exploration': {
    label: 'White Exploration Suit',
    description: 'High-reflectance planetary surface EVA suit with thermal MLI layers.',
    primaryColor: '#e2e8f0',
    accentColor: '#f97316',
    helmetStyle: 'gold-visor',
    backpackStyle: 'plss-standard',
  },
  'dark-mission': {
    label: 'Dark Mission Suit',
    description: 'Stealth-weave charcoal IVA/EVA flight suit with cyan telemetry trim.',
    primaryColor: '#1e293b',
    accentColor: '#38bdf8',
    helmetStyle: 'polarized-dark',
    backpackStyle: 'eva-thruster',
  },
  'scientific-research': {
    label: 'Scientific Research Suit',
    description: 'Field astrobiology & geology suit with emerald instrument harness.',
    primaryColor: '#cbd5e1',
    accentColor: '#10b981',
    helmetStyle: 'cyan-hud',
    backpackStyle: 'science-rack',
  },
  'eva-suit': {
    label: 'EVA Orbital Suit',
    description: 'Zero-G SAFER thruster pack suit tuned for orbital spacecraft servicing.',
    primaryColor: '#f1f5f9',
    accentColor: '#06b6d4',
    helmetStyle: 'gold-visor',
    backpackStyle: 'eva-thruster',
  },
  'engineering-suit': {
    label: 'Engineering Suit',
    description: 'High-visibility amber hazard trim for station & rover maintenance.',
    primaryColor: '#334155',
    accentColor: '#f59e0b',
    helmetStyle: 'cyan-hud',
    backpackStyle: 'plss-standard',
  },
};

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  sprint: 'ShiftLeft',
  jump: 'Space',
  crouch: 'KeyC',
  interact: 'KeyE',
  useEquipment: 'KeyF',
  refillTool: 'KeyR',
  flashlight: 'KeyL',
  toggleCamera: 'KeyV',
  shoulderSwap: 'KeyQ',
  map: 'KeyM',
  inventory: 'KeyI',
  objectives: 'Tab',
  pause: 'Escape',
};

export const DEFAULT_GAMEPLAY_SETTINGS: GameplaySettings = {
  cameraSensitivity: 1.0,
  cameraDistance: 5.2,
  shoulderSide: 'right',
  invertY: false,
  mobileLeftHanded: false,
  showTouchControls: 'auto',
  hudShowTelemetry: true,
  hudShowObjectives: true,
  hudShowMinimap: true,
  keyBindings: DEFAULT_KEY_BINDINGS,
};

export const DEFAULT_CUSTOMIZATION: AstronautCustomization = {
  characterName: 'Cmdr. Vega',
  characterArchetype: 'standard',
  suitPreset: 'white-exploration',
  primaryColor: SUIT_PRESETS['white-exploration'].primaryColor,
  accentColor: SUIT_PRESETS['white-exploration'].accentColor,
  helmetStyle: 'gold-visor',
  backpackStyle: 'plss-standard',
  missionPatch: 'ARES',
  accessory: 'chest-cam',
};

export function formatKeyCodeLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'Space') return 'Space';
  return code;
}

export interface DesignGameplayBonuses {
  powerEfficiencyMultiplier: number;
  scienceBonusMultiplier: number;
  recommendedPlayableMission: PlayableMissionId;
  recommendedEnvironment: EnvironmentId;
  spacecraftLabel: string;
  massValid: boolean;
  powerValid: boolean;
  deltaVValid: boolean;
  frrPassed: boolean;
  criticalRiskCount: number;
  baseMassAllowanceKg: number;
}

export function computeDesignBonusesForGameplay(mission: MissionDesign): DesignGameplayBonuses {
  const eng = computeSpacecraftEngineering(mission);
  const orb = computeOrbitalAnalysis(
    mission.destinationId,
    mission.orbitalPlan,
    mission.spacecraft,
    eng.wetMassKg,
    eng.dryMassKg
  );
  const powerEfficiencyMultiplier = Math.max(0.85, Math.min(1.45, 1 + eng.powerMarginPct / 200));
  const scienceBonusMultiplier = 1 + Math.min(0.5, mission.selectedPayloadIds.length * 0.08);
  const frrPassed = Boolean(mission.gates.find((g) => g.code === 'FRR')?.passed);
  const criticalRiskCount = mission.risks.filter((r) => !r.mitigated && r.severity === 'Critical').length;
  const baseMassAllowanceKg = Math.round(
    Math.max(4500, eng.launcherCapacityKg * 0.48 + eng.payloadMassKg * 4.2)
  );

  let recommendedEnvironment: EnvironmentId = 'station';
  let recommendedPlayableMission: PlayableMissionId = 'station-prep';
  if (mission.destinationId === 'moon') {
    recommendedEnvironment = 'moon';
    recommendedPlayableMission = 'lunar-explore';
  } else if (mission.destinationId === 'mars') {
    recommendedEnvironment = 'mars';
    recommendedPlayableMission = 'mars-explore';
  } else if (mission.destinationId === 'leo' || mission.destinationId === 'geo') {
    recommendedEnvironment = 'orbital-eva';
    recommendedPlayableMission = 'eva-repair';
  } else if (mission.simulation.currentStage === 'Launch' || mission.simulation.currentStage === 'Cruise') {
    recommendedEnvironment = 'spacecraft';
    recommendedPlayableMission = 'launch-orbit';
  }

  return {
    powerEfficiencyMultiplier: Number(powerEfficiencyMultiplier.toFixed(2)),
    scienceBonusMultiplier: Number(scienceBonusMultiplier.toFixed(2)),
    recommendedPlayableMission,
    recommendedEnvironment,
    spacecraftLabel: `${mission.name} (${mission.spacecraft.powerId})`,
    massValid: eng.isMassValid,
    powerValid: eng.isPowerValid,
    deltaVValid: orb.isDeltaVSufficient,
    frrPassed,
    criticalRiskCount,
    baseMassAllowanceKg,
  };
}
