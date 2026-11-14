import type {
  EnvironmentId,
  EquipmentId,
  GameMode,
  MissionObjectiveStep,
  PlayableMissionId,
} from '../engine/types';

export interface PlayableMissionDef {
  id: PlayableMissionId;
  title: string;
  subtitle: string;
  startEnv: EnvironmentId;
  difficultyLabel: string;
  estimatedMinutes: number;
  objectives: MissionObjectiveStep[];
}

export const PLAYABLE_MISSIONS: Record<PlayableMissionId, PlayableMissionDef> = {
  'station-prep': {
    id: 'station-prep',
    title: 'Mission 1: Space Station Preparation',
    subtitle: 'Complete crew briefing, systems checks, ECLSS verification, and pre-launch authorization aboard Gateway Station.',
    startEnv: 'station',
    difficultyLabel: 'Standard · 10 Objectives',
    estimatedMinutes: 4,
    objectives: [
      { id: 'sp-1', order: 1, title: 'Enter the Space Station', description: 'Orient inside the central Gateway atrium.', targetEnv: 'station', hint: 'Walk forward (W) through the central atrium.', completed: true },
      { id: 'sp-2', order: 2, title: 'Visit Mission Briefing Room', description: 'Proceed to the North Mission Control wing.', targetEnv: 'station', targetInteractableId: 'st-mission-brief-holo', hint: 'Head north toward the holographic briefing table.', completed: false },
      { id: 'sp-3', order: 3, title: 'Review Mission Objectives', description: 'Interact [E] with the Mission Control Briefing Display.', targetEnv: 'station', targetInteractableId: 'st-mission-brief-holo', hint: 'Press E at the holographic briefing display.', completed: false },
      { id: 'sp-4', order: 4, title: 'Inspect Spacecraft Equipment', description: 'Visit the West Science & Crew Quarters locker.', targetEnv: 'station', targetInteractableId: 'st-crew-quarters', hint: 'Head west to Crew Quarters & Suit Locker and press E.', completed: false },
      { id: 'sp-5', order: 5, title: 'Inspect Science Instruments', description: 'Calibrate payloads at the Science Lab bench.', targetEnv: 'station', targetInteractableId: 'st-science-lab', hint: 'Interact [E] with the Science Payload Calibration Bench.', completed: false },
      { id: 'sp-6', order: 6, title: 'Check Oxygen & Life Support', description: 'Inspect the ECLSS Oxygen rack in the East Engineering wing.', targetEnv: 'station', targetInteractableId: 'st-eclss-o2', hint: 'Head east to the ECLSS Oxygen Rack and press E.', completed: false },
      { id: 'sp-7', order: 7, title: 'Verify Power Systems', description: 'Confirm solar & bus power distribution in Mission Control.', targetEnv: 'station', targetInteractableId: 'st-power-console', hint: 'Interact [E] with the Station Power Panel in North wing.', completed: false },
      { id: 'sp-8', order: 8, title: 'Check Communication Systems', description: 'Test Deep Space Network Flight Loop uplink.', targetEnv: 'station', targetInteractableId: 'st-comms-console', hint: 'Interact [E] with the Comms Console in North wing.', completed: false },
      { id: 'sp-9', order: 9, title: 'Complete Pre-Launch Inspection', description: 'Verify docking hardware in the Engineering Inspection Bay.', targetEnv: 'station', targetInteractableId: 'st-eng-storage', hint: 'Visit the Engineering Inspection Bay in East wing and press E.', completed: false },
      { id: 'sp-10', order: 10, title: 'Receive Launch Authorization', description: 'Return to Mission Control Briefing Display for final Go/No-Go.', targetEnv: 'station', targetInteractableId: 'st-mission-brief-holo', hint: 'Return to Mission Control Display and press E to authorize launch.', completed: false },
    ],
  },
  'launch-orbit': {
    id: 'launch-orbit',
    title: 'Mission 2: Spacecraft Launch & Orbital Operations',
    subtitle: 'Board the crew spacecraft, execute pre-launch systems checks, monitor liftoff & insertion, and deploy the orbital payload.',
    startEnv: 'spacecraft',
    difficultyLabel: 'Standard · 10 Objectives',
    estimatedMinutes: 5,
    objectives: [
      { id: 'lo-1', order: 1, title: 'Enter the Spacecraft', description: 'Check in inside the Crew Spacecraft cabin.', targetEnv: 'spacecraft', hint: 'Move forward inside the spacecraft interior.', completed: true },
      { id: 'lo-2', order: 2, title: 'Secure Crew & Equipment', description: 'Secure cargo restraints in the Crew Cabin Payload Bay.', targetEnv: 'spacecraft', targetInteractableId: 'sc-storage-cabin', hint: 'Interact [E] with the Payload Bay restraint console.', completed: false },
      { id: 'lo-3', order: 3, title: 'Verify Emergency Life Support', description: 'Inspect Emergency O2 & Cabin Kit.', targetEnv: 'spacecraft', targetInteractableId: 'sc-emergency-kit', hint: 'Interact [E] with the Emergency O2 Locker.', completed: false },
      { id: 'lo-4', order: 4, title: 'Complete Pre-Launch Checklist', description: 'Review guidance readiness at Primary Navigation Console.', targetEnv: 'spacecraft', targetInteractableId: 'sc-cockpit-nav', hint: 'Head forward to Cockpit Navigation Console and press E.', completed: false },
      { id: 'lo-5', order: 5, title: 'Arm Propulsion & Countdown', description: 'Monitor ignition countdown at the Propulsion Control Panel.', targetEnv: 'spacecraft', targetInteractableId: 'sc-propulsion-panel', hint: 'Interact [E] with the Propulsion Panel.', completed: false },
      { id: 'lo-6', order: 6, title: 'Observe Launch Sequence', description: 'Trigger Orbital Liftoff from Navigation Console.', targetEnv: 'spacecraft', targetInteractableId: 'sc-cockpit-nav', hint: 'Press E at Primary Navigation Console for orbital burn.', completed: false },
      { id: 'lo-7', order: 7, title: 'Verify Orbital Power Systems', description: 'Confirm solar array & fuel cell load in orbit.', targetEnv: 'spacecraft', targetInteractableId: 'sc-power-panel', hint: 'Interact [E] with Power Management Panel.', completed: false },
      { id: 'lo-8', order: 8, title: 'Inspect Spacecraft Telemetry', description: 'Confirm Ka-band downlink on Comms Console.', targetEnv: 'spacecraft', targetInteractableId: 'sc-comms-panel', hint: 'Interact [E] with Spacecraft Comms Console.', completed: false },
      { id: 'lo-9', order: 9, title: 'Deploy Orbital Payload', description: 'Release science payload from the aft Payload Bay.', targetEnv: 'spacecraft', targetInteractableId: 'sc-storage-cabin', hint: 'Return to Payload Bay and press E to deploy payload.', completed: false },
      { id: 'lo-10', order: 10, title: 'Complete Orbital Operations', description: 'Log orbital checkout complete at Primary Navigation Console.', targetEnv: 'spacecraft', targetInteractableId: 'sc-cockpit-nav', hint: 'Confirm orbital ops complete at Cockpit Nav Console.', completed: false },
    ],
  },
  'lunar-explore': {
    id: 'lunar-explore',
    title: 'Mission 3: Lunar Exploration',
    subtitle: 'Explore the 0.165g Lunar South Pole, drive the Lunar Rover, collect regolith & ice-crater data, deploy seismic sensors, and return safely.',
    startEnv: 'moon',
    difficultyLabel: 'Realistic · 10 Objectives',
    estimatedMinutes: 6,
    objectives: [
      { id: 'mn-1', order: 1, title: 'Prepare Lunar Landing Site', description: 'Inspect Lander airlock seal after touchdown.', targetEnv: 'moon', targetInteractableId: 'mn-lander-airlock', hint: 'Interact [E] near the Lunar Lander.', completed: true },
      { id: 'mn-2', order: 2, title: 'Exit Lander & Test Low-G', description: 'Step off the pad and test 0.165g lunar jump dynamics.', targetEnv: 'moon', hint: 'Jump (Space) and explore away from the landing pad.', completed: false },
      { id: 'mn-3', order: 3, title: 'Board & Drive Lunar Rover', description: 'Drive the Lunar Terrain Rover toward sample sites.', targetEnv: 'moon', targetInteractableId: 'lunar-rover-1', hint: 'Approach the Lunar Rover and press E to drive.', completed: false },
      { id: 'mn-4', order: 4, title: 'Collect Lunar Basalt Sample', description: 'Collect sealed rock specimen at Site Alpha.', targetEnv: 'moon', targetInteractableId: 'mn-sample-basalt', requiredEquipment: 'sample-container', hint: 'Equip Sample Container (or carry it) and press E or F at Site Alpha (18, -16).', completed: false },
      { id: 'mn-5', order: 5, title: 'Deploy Seismic Experiment', description: 'Drill and anchor passive seismometer at Site Gamma.', targetEnv: 'moon', targetInteractableId: 'mn-seismic-site', requiredEquipment: 'drill', hint: 'Head to Site Gamma (26, 18) and press E to deploy seismic probe.', completed: false },
      { id: 'mn-6', order: 6, title: 'Inspect Shackleton Rim Crater', description: 'Approach and scan shadowed crater volatiles at Site Beta.', targetEnv: 'moon', targetInteractableId: 'mn-crater-ice', requiredEquipment: 'spectrometer', hint: 'Head to Shackleton Crater (-24, -26) and press E to scan.', completed: false },
      { id: 'mn-7', order: 7, title: 'Capture Lunar Surface Imagery', description: 'Use Scientific Camera [F] to record crater horizon.', targetEnv: 'moon', requiredEquipment: 'camera', hint: 'Select Camera (slot 1) and press F to capture image.', completed: false },
      { id: 'mn-8', order: 8, title: 'Recharge at Lunar Habitat', description: 'Verify outpost habitat solar & O2 reserve.', targetEnv: 'moon', targetInteractableId: 'mn-habitat-pad', hint: 'Visit Lunar Habitat (-16, 14) and press E.', completed: false },
      { id: 'mn-9', order: 9, title: 'Transmit Lunar Science Data', description: 'Uplink collected samples via Lunar Comms Array.', targetEnv: 'moon', targetInteractableId: 'mn-comms-tower', hint: 'Interact [E] with Comms Array (-10, -8).', completed: false },
      { id: 'mn-10', order: 10, title: 'Return Safely to Lunar Lander', description: 'Board Lander Ascent Cabin before suit O2 depletes.', targetEnv: 'moon', targetInteractableId: 'mn-lander-airlock', hint: 'Return to Lunar Lander (0, 0) and press E.', completed: false },
    ],
  },
  'mars-explore': {
    id: 'mars-explore',
    title: 'Mission 4: Mars Exploration',
    subtitle: 'Survey Jezero Crater in 0.38g Mars gravity, operate core drill & spectrometer, drive the Mars Rover, and relay discoveries to orbit.',
    startEnv: 'mars',
    difficultyLabel: 'Realistic · 10 Objectives',
    estimatedMinutes: 7,
    objectives: [
      { id: 'ms-1', order: 1, title: 'Complete Mars Arrival & Touchdown', description: 'Verify lander descent deck & atmosphere telemetry.', targetEnv: 'mars', targetInteractableId: 'ms-lander-base', hint: 'Interact [E] at the Mars Descent Module.', completed: true },
      { id: 'ms-2', order: 2, title: 'Exit Lander onto Jezero Basin', description: 'Move out across the Martian regolith.', targetEnv: 'mars', hint: 'Walk away from the landing pad to begin survey.', completed: false },
      { id: 'ms-3', order: 3, title: 'Deploy Pressurized Mars Rover', description: 'Enter and drive the Mars Field Rover.', targetEnv: 'mars', targetInteractableId: 'mars-rover-1', hint: 'Approach the Mars Rover (10, 5) and press E.', completed: false },
      { id: 'ms-4', order: 4, title: 'Locate Delta Ridge Outcrop', description: 'Survey ancient river-delta sedimentary rock at Site Alpha.', targetEnv: 'mars', targetInteractableId: 'ms-delta-outcrop', requiredEquipment: 'hammer', hint: 'Travel to Jezero Delta Outcrop (24, -18) and press E.', completed: false },
      { id: 'ms-5', order: 5, title: 'Operate Rotary Core Drill', description: 'Extract subsurface clay core at Site Beta.', targetEnv: 'mars', targetInteractableId: 'ms-clay-drill-site', requiredEquipment: 'drill', hint: 'Travel to Clay Drill Site (-26, -24) and press E.', completed: false },
      { id: 'ms-6', order: 6, title: 'Run Spectrometer & Dust Survey', description: 'Measure dust iron-oxide spectra in Dust Basin (Site Gamma).', targetEnv: 'mars', targetInteractableId: 'ms-dust-crater', requiredEquipment: 'spectrometer', hint: 'Travel to Dust Basin (22, 22) and press E.', completed: false },
      { id: 'ms-7', order: 7, title: 'Inspect Mars Research Habitat', description: 'Top up O2 & power at Jezero Research Habitat.', targetEnv: 'mars', targetInteractableId: 'ms-habitat-dome', hint: 'Visit Mars Habitat (-15, 12) and press E.', completed: false },
      { id: 'ms-8', order: 8, title: 'Document Mars Strata Photo', description: 'Capture Scientific Camera [F] visual record.', targetEnv: 'mars', requiredEquipment: 'camera', hint: 'Equip Camera and press F anywhere on Mars.', completed: false },
      { id: 'ms-9', order: 9, title: 'Deploy Communications Relay', description: 'Align Mars UHF/X-Band Relay Mast for orbiter uplink.', targetEnv: 'mars', targetInteractableId: 'ms-comms-relay', hint: 'Interact [E] with Comms Relay (-12, -14).', completed: false },
      { id: 'ms-10', order: 10, title: 'Return to Mars Lander / Habitat', description: 'Return to Mars Descent Module to conclude EVA sortie.', targetEnv: 'mars', targetInteractableId: 'ms-lander-base', hint: 'Return to Mars Descent Module (0, 0) and press E.', completed: false },
    ],
  },
  'eva-repair': {
    id: 'eva-repair',
    title: 'Mission 5: EVA Repair Mission',
    subtitle: 'Perform a tethered 6-DOF Zero-G spacewalk to diagnose, repair, and verify a micrometeoroid-damaged satellite array.',
    startEnv: 'orbital-eva',
    difficultyLabel: 'Veteran · 8 Objectives',
    estimatedMinutes: 5,
    objectives: [
      { id: 'ev-1', order: 1, title: 'Prepare EVA Suit & Tether', description: 'Verify suit pressure, O2, and 46m safety tether.', targetEnv: 'orbital-eva', hint: 'Check survival HUD before firing RCS thrusters.', completed: true },
      { id: 'ev-2', order: 2, title: 'Exit Airlock into Zero-G', description: 'Thrust out along the station truss using WASD + Space/C.', targetEnv: 'orbital-eva', hint: 'Use W/A/S/D and Space (up) / C (down) to leave the airlock.', completed: false },
      { id: 'ev-3', order: 3, title: 'Inspect Robotic Arm Worksite', description: 'Check robotic manipulator along port truss (-6.5, 2, -6).', targetEnv: 'orbital-eva', targetInteractableId: 'eva-robotic-arm', hint: 'Navigate to (-6.5, 2, -6) and press E.', completed: false },
      { id: 'ev-4', order: 4, title: 'Navigate to Damaged Satellite', description: 'Approach the damaged satellite solar & telemetry bus (0, 3, -22).', targetEnv: 'orbital-eva', targetInteractableId: 'eva-fault-node', hint: 'Thrust along -Z to the satellite at (0, 3, -22).', completed: false },
      { id: 'ev-5', order: 5, title: 'Inspect Fault & Equip Repair Tool', description: 'Select Precision EVA Repair Driver in equipment hotbar.', targetEnv: 'orbital-eva', requiredEquipment: 'repair-tool', hint: 'Equip Repair Tool (slot 6 or Inventory [I]).', completed: false },
      { id: 'ev-6', order: 6, title: 'Perform External Satellite Repair', description: 'Repair solar actuator & harness at Fault Node [E].', targetEnv: 'orbital-eva', targetInteractableId: 'eva-fault-node', requiredEquipment: 'repair-tool', hint: 'Press E at Damaged Satellite Node with Repair Tool.', completed: false },
      { id: 'ev-7', order: 7, title: 'Verify Satellite Telemetry Link', description: 'Confirm restored bus voltage at Transponder Panel (9.5, 1.8, -18).', targetEnv: 'orbital-eva', targetInteractableId: 'eva-telemetry-verify', hint: 'Float to Transponder Panel (9.5, 1.8, -18) and press E.', completed: false },
      { id: 'ev-8', order: 8, title: 'Return to Spacecraft Airlock', description: 'Navigate back along tether to EVA Airlock (0, 1.5, 8.2).', targetEnv: 'orbital-eva', targetInteractableId: 'eva-airlock-return', hint: 'Return to Airlock Hatch at (0, 1.5, 8.2) and press E.', completed: false },
    ],
  },
};

export interface GameplayObjectiveState {
  missionId: PlayableMissionId;
  mode: GameMode;
  objectives: MissionObjectiveStep[];
  startedAtMs: number;
  completedAtMs: number | null;
  missionCompleted: boolean;
  score: number;
}

export function createGameplayObjectiveState(
  missionId: PlayableMissionId,
  mode: GameMode
): GameplayObjectiveState {
  const def = PLAYABLE_MISSIONS[missionId];
  return {
    missionId,
    mode,
    objectives: def.objectives.map((o) => ({ ...o })),
    startedAtMs: Date.now(),
    completedAtMs: null,
    missionCompleted: false,
    score: 0,
  };
}

export type ObjectiveEvent =
  | { type: 'interact'; interactableId: string; equippedId: EquipmentId | null }
  | { type: 'use-equipment'; equipmentId: EquipmentId; environment: EnvironmentId }
  | { type: 'equip'; equipmentId: EquipmentId }
  | { type: 'move-distance'; environment: EnvironmentId; distFromSpawn: number }
  | { type: 'enter-rover'; roverId: string };

export function applyObjectiveEvent(
  prev: GameplayObjectiveState,
  event: ObjectiveEvent
): {
  next: GameplayObjectiveState;
  newlyCompleted: MissionObjectiveStep[];
} {
  if (prev.missionCompleted || prev.mode === 'free-explore') {
    return { next: prev, newlyCompleted: [] };
  }

  const newlyCompleted: MissionObjectiveStep[] = [];
  const nextObjectives = prev.objectives.map((o) => ({ ...o }));

  // Find first incomplete objective that matches — OR allow natural flexible match on active/next 2 steps
  const firstIncompleteIdx = nextObjectives.findIndex((o) => !o.completed);
  if (firstIncompleteIdx === -1) {
    return { next: prev, newlyCompleted: [] };
  }

  for (let i = firstIncompleteIdx; i < nextObjectives.length; i++) {
    const step = nextObjectives[i];
    if (step.completed) continue;

    // Preserve logical ending order: final return/authorization objective requires prior objectives done
    const isFinalStep = i === nextObjectives.length - 1;
    const priorIncomplete = nextObjectives.slice(0, i).some((p) => !p.completed);
    if (isFinalStep && priorIncomplete) continue;

    // Prevent skipping ahead more than 2 non-final steps except rover/camera bonuses
    if (i > firstIncompleteIdx + 2 && event.type !== 'enter-rover') continue;

    let matched = false;
    if (event.type === 'interact' && step.targetInteractableId === event.interactableId) {
      matched = true;
    } else if (
      event.type === 'enter-rover' &&
      step.targetInteractableId === event.roverId
    ) {
      matched = true;
    } else if (
      event.type === 'use-equipment' &&
      !step.targetInteractableId &&
      step.requiredEquipment === event.equipmentId &&
      step.targetEnv === event.environment
    ) {
      matched = true;
    } else if (
      event.type === 'equip' &&
      !step.targetInteractableId &&
      step.requiredEquipment === event.equipmentId &&
      step.id === 'ev-5'
    ) {
      matched = true;
    } else if (
      event.type === 'move-distance' &&
      !step.targetInteractableId &&
      !step.requiredEquipment &&
      step.targetEnv === event.environment &&
      event.distFromSpawn >= 6.5
    ) {
      matched = true;
    }

    if (matched) {
      step.completed = true;
      newlyCompleted.push(step);
      break;
    }
  }

  const allDone = nextObjectives.every((o) => o.completed);
  const doneCount = nextObjectives.filter((o) => o.completed).length;
  const elapsedMin = Math.max(0.5, (Date.now() - prev.startedAtMs) / 60000);
  const speedBonus = prev.mode === 'challenges' && allDone ? Math.max(0, Math.round(150 - elapsedMin * 15)) : 0;
  const score = Math.round((doneCount / nextObjectives.length) * 850 + (allDone ? 150 : 0) + speedBonus);

  return {
    newlyCompleted,
    next: {
      ...prev,
      objectives: nextObjectives,
      missionCompleted: allDone,
      completedAtMs: allDone ? Date.now() : null,
      score,
    },
  };
}
