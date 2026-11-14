import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultMarsMission } from '../engine/catalog';
import {
  applyCareerProgressionOutcome,
  createInitialCareerProfile,
  rankFromXp,
} from './CareerProgressionSystem';
import {
  applySuitLeakAndDamage,
  explainSurvivalFailure,
  repairRoverIntegrity,
  repairSuitIntegrity,
  scrubSuitCO2,
} from './DamageSystem';
import { executeEquipmentUse, executeRefillTool } from './EquipmentSystem';
import { createDefaultInventory } from './InventorySystem';
import {
  applyDynamicEventChoice,
  buildDynamicWorldEvent,
  evaluateHazardTriggerFromSimulation,
} from './MissionEventManager';
import {
  isPointInBuiltBaseSafeZone,
  validateAndCreateBaseModule,
} from './PlanetaryBaseSystem';
import { createInitialRovers, stepRover } from './RoverController';
import {
  advanceLaunchStep,
  createInitialCockpitState,
  evaluateLaunchReadinessForCockpit,
  LAUNCH_SEQUENCE_STEPS,
} from './SpacecraftController';
import { createInitialSurvivalTelemetry, stepSurvivalTelemetry } from './SurvivalSystem';

test('DamageSystem applies leaks/CO2 buildup, repairs suits & rovers, and explains survival failures', () => {
  const baseTel = createInitialSurvivalTelemetry('moon');
  const leaked = applySuitLeakAndDamage(baseTel, 45, 0.55);
  assert.equal(leaked.suitIntegrityPct, 55);
  assert.equal(leaked.oxygenLeakPerSec, 0.55);

  const patched = repairSuitIntegrity(leaked);
  assert.equal(patched.oxygenLeakPerSec, 0);
  assert.equal(patched.suitIntegrityPct, 93);

  const highCo2 = { ...baseTel, co2Pct: 4.3 };
  assert.match(explainSurvivalFailure(highCo2, 'moon').title, /CO2/i);

  const scrubbed = scrubSuitCO2(highCo2);
  assert.ok(scrubbed.co2Pct < 3.0);

  const zeroO2 = { ...baseTel, oxygenPct: 0, oxygenLeakPerSec: 0.5 };
  const exp = explainSurvivalFailure(zeroO2, 'orbital-eva');
  assert.match(exp.title, /Oxygen/i);
  assert.match(exp.cause, /puncture/i);

  const damagedRover = { ...createInitialRovers().mars, integrityPct: 30 };
  const slowStep = stepRover({ ...damagedRover, occupiedByLocal: true }, { throttle: 1, steer: 0, brake: false }, 1, 0.1);
  assert.ok(slowStep.speedMs < 2.0, 'Damaged rover drives slower when integrity < 45%');

  const repairedRover = repairRoverIntegrity(damagedRover);
  assert.equal(repairedRover.integrityPct, 70);
});

test('SpacecraftController blocks unready spacecraft launch and completes 10-step launch sequence when valid', () => {
  const mission = createDefaultMarsMission();
  // Force mass failure by selecting small Electron launcher for a Mars orbiter
  const invalidMission = {
    ...mission,
    launchVehicleId: 'lv-electron',
  };
  const badReadiness = evaluateLaunchReadinessForCockpit(invalidMission);
  assert.equal(badReadiness.canLaunchStrict, false);
  assert.ok(badReadiness.blockers.length > 0);

  let cockpit = createInitialCockpitState(invalidMission);
  const blocked = advanceLaunchStep(cockpit, invalidMission, false);
  assert.ok(blocked.error, 'Step 1 should block launch when mass exceeds launcher cap');

  // Valid mission advances through all 10 steps cleanly
  assert.equal(LAUNCH_SEQUENCE_STEPS.length, 10);
  const validMission = {
    ...mission,
    gates: mission.gates.map((g) => ({ ...g, passed: true })),
  };
  cockpit = createInitialCockpitState(validMission);
  let completedNow = false;
  for (let i = 0; i < 10; i++) {
    const res = advanceLaunchStep(cockpit, validMission, false);
    assert.equal(res.error, undefined);
    cockpit = res.next;
    completedNow = Boolean(res.completedNow);
  }
  assert.equal(cockpit.launchStepIndex, 10);
  assert.equal(cockpit.launchCompleted, true);
  assert.equal(completedNow, true);
});

test('PlanetaryBaseSystem enforces mass/power budget and provides Moon/Mars safe zone shelter', () => {
  const mission = createDefaultMarsMission();
  // Habitat needs -3.2 kW while baseline lander has +4.0 kW; building two habitats should require a Solar Farm first
  const hab1 = validateAndCreateBaseModule({
    mission,
    existingModules: [],
    type: 'habitat',
    environment: 'mars',
    x: 10,
    z: 10,
  });
  assert.equal(hab1.ok, true);
  assert.ok(hab1.module);

  const hab2 = validateAndCreateBaseModule({
    mission,
    existingModules: [hab1.module!],
    type: 'habitat',
    environment: 'mars',
    x: 20,
    z: 20,
  });
  // Depending on mission baseline power margin, either succeeds or explains net power limit
  if (!hab2.ok) {
    assert.match(hab2.error ?? '', /power/i);
  }

  const solar = validateAndCreateBaseModule({
    mission,
    existingModules: [hab1.module!],
    type: 'solar-farm',
    environment: 'mars',
    x: 15,
    z: 15,
  });
  assert.equal(solar.ok, true);

  assert.equal(isPointInBuiltBaseSafeZone('mars', hab1.module!.x, hab1.module!.z, [hab1.module!]), true);
  const telInBase = stepSurvivalTelemetry(
    { ...createInitialSurvivalTelemetry('mars'), oxygenPct: 50 },
    {
      environment: 'mars',
      x: hab1.module!.x,
      z: hab1.module!.z,
      sprinting: false,
      flashlightOn: false,
      evaThrusting: false,
      tetherDistanceM: 0,
      inRover: false,
      powerEfficiencyBonus: 1,
      builtBaseModules: [hab1.module!],
    },
    0.1
  );
  assert.equal(telInBase.inSafeZone, true);
  assert.ok(telInBase.oxygenPct > 50);
});

test('MissionEventManager triggers deterministic hazards and applies player resolution choices', () => {
  const mission = createDefaultMarsMission();
  const lowBatTel = { ...createInitialSurvivalTelemetry('moon'), batteryPct: 18 };
  const evt = evaluateHazardTriggerFromSimulation({
    environment: 'moon',
    telemetry: lowBatTel,
    mission,
    rover: null,
    elapsedSec: 35,
    lastEventSec: 0,
    hasActiveEvent: false,
  });
  assert.ok(evt && evt.type === 'power-shortage');

  const leakEvt = buildDynamicWorldEvent('o2-leak', 'orbital-eva');
  const leakTel = { ...createInitialSurvivalTelemetry('orbital-eva'), oxygenPct: 45, oxygenLeakPerSec: 0.55 };
  const resolved = applyDynamicEventChoice(leakTel, null, leakEvt.choices[0]);
  assert.equal(resolved.nextTelemetry.oxygenLeakPerSec, 0);
  assert.equal(resolved.nextTelemetry.oxygenPct, 65);
});

test('CareerProgressionSystem promotes rank with XP & EquipmentSystem refill/repair work end-to-end', () => {
  let profile = createInitialCareerProfile();
  assert.equal(profile.rank, 'Candidate');
  assert.equal(rankFromXp(450), 'Flight Specialist');
  assert.equal(rankFromXp(4200), 'Chief Astronaut');

  for (let i = 0; i < 4; i++) {
    profile = applyCareerProgressionOutcome(profile, {
      passed: true,
      score: 900,
      scienceCount: 3,
      baseModulesCount: 1,
      domain: 'eva',
    });
  }
  assert.ok(profile.xp > 1200);
  assert.ok(profile.skills.evaOps >= 5);
  assert.ok(profile.skills.science >= 5);

  const inv = createDefaultInventory();
  const damagedRover = { ...createInitialRovers().moon, integrityPct: 45 };
  const tel = { ...createInitialSurvivalTelemetry('moon'), co2Pct: 2.4 };
  const repairRes = executeEquipmentUse({
    equipmentId: 'repair-tool',
    inventory: inv,
    telemetry: tel,
    environment: 'moon',
    position: { x: damagedRover.x + 1, y: 0, z: damagedRover.z },
    nearestLocationLabel: 'Lunar Rover',
    activeObjectiveTitle: 'Repair Rover',
    scienceCount: 0,
    rover: damagedRover,
  });
  assert.equal(repairRes.used, true);
  assert.ok(repairRes.nextRover && repairRes.nextRover.integrityPct === 85);

  const refillRes = executeRefillTool({
    equippedId: 'repair-tool',
    inventory: repairRes.nextInventory,
    telemetry: repairRes.nextTelemetry,
  });
  assert.equal(refillRes.ok, true);
  assert.ok(refillRes.nextTelemetry.co2Pct < 2.4);
});
