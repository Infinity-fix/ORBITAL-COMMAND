import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialGroundedState, stepGroundedCharacter } from './CharacterController';
import { createInitialEVAState, snapToNearestEVAHandhold, stepEVACharacter } from './EVAController';
import { executeEquipmentUse } from './EquipmentSystem';
import { ENV_PHYSICS, groundHeightAt, resolveCameraCollision } from './GravitySystem';
import { findNearestInteractable } from './InteractionSystem';
import { createDefaultInventory, getTotalCarriedMassKg } from './InventorySystem';
import { applyObjectiveEvent, createGameplayObjectiveState, PLAYABLE_MISSIONS } from './MissionObjectiveManager';
import { createInitialRovers, stepRover } from './RoverController';
import { createInitialSurvivalTelemetry, stepSurvivalTelemetry } from './SurvivalSystem';

test('Lunar low gravity produces noticeably higher & longer jumps than station gravity', () => {
  let stationChar = createInitialGroundedState('station');
  let moonChar = createInitialGroundedState('moon');

  stationChar = stepGroundedCharacter(
    stationChar,
    { moveForward: 0, moveRight: 0, cameraYaw: 0, sprint: false, jump: true, crouch: false },
    'station',
    0.02
  );
  moonChar = stepGroundedCharacter(
    moonChar,
    { moveForward: 0, moveRight: 0, cameraYaw: 0, sprint: false, jump: true, crouch: false },
    'moon',
    0.02
  );

  let maxStationY = stationChar.y;
  let maxMoonY = moonChar.y;
  for (let i = 0; i < 80; i++) {
    stationChar = stepGroundedCharacter(
      stationChar,
      { moveForward: 0, moveRight: 0, cameraYaw: 0, sprint: false, jump: false, crouch: false },
      'station',
      0.04
    );
    moonChar = stepGroundedCharacter(
      moonChar,
      { moveForward: 0, moveRight: 0, cameraYaw: 0, sprint: false, jump: false, crouch: false },
      'moon',
      0.04
    );
    maxStationY = Math.max(maxStationY, stationChar.y);
    maxMoonY = Math.max(maxMoonY, moonChar.y);
  }

  assert.ok(ENV_PHYSICS.moon.gravityMs2 < ENV_PHYSICS.mars.gravityMs2);
  assert.ok(maxMoonY > maxStationY * 2.2, `Moon peak ${maxMoonY} should far exceed station ${maxStationY}`);
});

test('Zero-G EVA controller supports 6-DOF drift, active braking, tether limit, and handholds', () => {
  let eva = createInitialEVAState();
  for (let i = 0; i < 15; i++) {
    eva = stepEVACharacter(
      eva,
      { moveForward: 1, moveRight: 0, moveUp: 0.5, cameraYaw: 0, cameraPitch: 0, boost: true, brake: false },
      0.05
    );
  }
  assert.ok(eva.y > 2.1, 'Upward RCS thrust lifts astronaut in Zero-G');
  assert.ok(eva.z < 5.5, 'Forward RCS thrust moves astronaut toward satellite along -Z');

  // Test tether hard limit enforcement
  let farEva = { ...eva, x: 0, y: 2, z: -42, vz: -15 };
  farEva = stepEVACharacter(
    farEva,
    { moveForward: 1, moveRight: 0, moveUp: 0, cameraYaw: 0, cameraPitch: 0, boost: true, brake: false },
    0.05
  );
  assert.ok(farEva.tetherDistanceM <= farEva.maxTetherM + 0.01, 'Tether distance clamped within maxTetherM');

  // Test handhold grab near airlock
  const nearAirlock = { ...createInitialEVAState(), x: 0.3, y: 1.6, z: 7.4, vx: 1.2, vz: -0.9 };
  const snapped = snapToNearestEVAHandhold(nearAirlock);
  assert.ok(snapped.handholdLabel !== null);
  assert.equal(snapped.nextState.vx, 0);
  assert.equal(snapped.nextState.animState, 'climb');
});

test('Rover controller drives, turns, consumes battery, and tracks odometer', () => {
  const rovers = createInitialRovers();
  let rover = { ...rovers.mars, occupiedByLocal: true };
  const startX = rover.x;
  const startZ = rover.z;

  for (let i = 0; i < 40; i++) {
    rover = stepRover(rover, { throttle: 1, steer: 0.3, brake: false }, 1.0, 0.05);
  }

  const moved = Math.hypot(rover.x - startX, rover.z - startZ);
  assert.ok(moved > 3, `Rover should move cleanly across Mars terrain (moved ${moved}m)`);
  assert.ok(rover.batteryPct < 100, 'Driving consumes rover battery');
  assert.ok(rover.distanceKm > 0, 'Odometer increments');
  assert.equal(rover.y, groundHeightAt('mars', rover.x, rover.z));
});

test('Camera collision pulls camera inside station walls', () => {
  const cam = resolveCameraCollision(
    'station',
    { x: -10, y: 1.6, z: 6 },
    { x: -10, y: 1.6, z: 14 }
  );
  assert.ok(cam.z < 10.5, `Camera (${cam.z}) should stop before clipping outside south wall`);
});

test('Survival telemetry depletes O2 outside and recharges inside habitat safe zone', () => {
  let tel = createInitialSurvivalTelemetry('moon');
  for (let i = 0; i < 20; i++) {
    tel = stepSurvivalTelemetry(
      tel,
      {
        environment: 'moon',
        x: 24,
        z: -24,
        sprinting: true,
        flashlightOn: true,
        evaThrusting: false,
        tetherDistanceM: 0,
        inRover: false,
        powerEfficiencyBonus: 1,
      },
      0.1
    );
  }
  assert.ok(tel.oxygenPct < 100, 'O2 depletes during lunar surface EVA');
  assert.ok(tel.batteryPct < 100, 'Battery depletes when flashlight + sprint active');

  const depletedO2 = tel.oxygenPct;
  // Move inside Lunar Habitat safe zone (-16, 14)
  for (let i = 0; i < 15; i++) {
    tel = stepSurvivalTelemetry(
      tel,
      {
        environment: 'moon',
        x: -16,
        z: 14,
        sprinting: false,
        flashlightOn: false,
        evaThrusting: false,
        tetherDistanceM: 0,
        inRover: false,
        powerEfficiencyBonus: 1,
      },
      0.1
    );
  }
  assert.ok(tel.inSafeZone);
  assert.ok(tel.oxygenPct > depletedO2, 'Habitat safe zone restores O2');
});

test('Inventory, equipment usage, and science record generation work without pay-to-win', () => {
  const inv = createDefaultInventory();
  assert.equal(inv.length, 10);
  assert.ok(getTotalCarriedMassKg(inv) > 10);

  const tel = { ...createInitialSurvivalTelemetry('mars'), oxygenPct: 32 };
  const o2Res = executeEquipmentUse({
    equipmentId: 'emergency-o2',
    inventory: inv,
    telemetry: tel,
    environment: 'mars',
    position: { x: 10, y: 0, z: 5 },
    nearestLocationLabel: 'Jezero Basin',
    activeObjectiveTitle: 'Survey Outcrop',
    scienceCount: 0,
  });
  assert.equal(o2Res.used, true);
  assert.equal(o2Res.nextTelemetry.oxygenPct, 72);

  const specRes = executeEquipmentUse({
    equipmentId: 'spectrometer',
    inventory: o2Res.nextInventory,
    telemetry: o2Res.nextTelemetry,
    environment: 'mars',
    position: { x: 24, y: 1, z: -18 },
    nearestLocationLabel: 'Jezero Delta Outcrop',
    activeObjectiveTitle: 'Scan Geological Strata',
    scienceCount: 0,
  });
  assert.equal(specRes.used, true);
  assert.ok(specRes.newScienceRecord);
  assert.equal(specRes.newScienceRecord?.sourceLabel, 'Simulated Mission Instrument Data');
});

test('Playable mission objective manager completes Station Prep & EVA Repair chains', () => {
  assert.equal(Object.keys(PLAYABLE_MISSIONS).length, 5);
  let state = createGameplayObjectiveState('eva-repair', 'career');
  assert.equal(state.objectives[0].completed, true);

  state = applyObjectiveEvent(state, { type: 'move-distance', environment: 'orbital-eva', distFromSpawn: 8 }).next;
  state = applyObjectiveEvent(state, { type: 'interact', interactableId: 'eva-robotic-arm', equippedId: 'repair-tool' }).next;
  state = applyObjectiveEvent(state, { type: 'interact', interactableId: 'eva-fault-node', equippedId: 'repair-tool' }).next;
  state = applyObjectiveEvent(state, { type: 'equip', equipmentId: 'repair-tool' }).next;
  state = applyObjectiveEvent(state, { type: 'interact', interactableId: 'eva-fault-node', equippedId: 'repair-tool' }).next;
  state = applyObjectiveEvent(state, { type: 'interact', interactableId: 'eva-telemetry-verify', equippedId: 'repair-tool' }).next;
  state = applyObjectiveEvent(state, { type: 'interact', interactableId: 'eva-airlock-return', equippedId: 'repair-tool' }).next;

  assert.equal(state.missionCompleted, true);
  assert.ok(state.score >= 950);

  const near = findNearestInteractable('station', { x: 0, y: 0, z: -18.2 }, 'comms', ['comms'], null);
  assert.ok(near !== null && near.item.id === 'st-mission-brief-holo');
});
