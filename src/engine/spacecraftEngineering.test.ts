import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultMarsMission } from './catalog';
import { computeSpacecraftEngineering, getLauncherCapacityForDestination } from './spacecraftEngineering';

test('Default Mars mission has valid mass, power, and budget baseline', () => {
  const m = createDefaultMarsMission();
  const eng = computeSpacecraftEngineering(m);

  assert.ok(eng.wetMassKg > eng.dryMassKg);
  assert.equal(eng.wetMassKg, eng.dryMassKg + eng.propellantMassKg);
  assert.equal(eng.isMassValid, true);
  assert.equal(eng.isPowerValid, true);
  assert.equal(eng.isBudgetValid, true);
});

test('Solar power output scales down via inverse-square law at Jupiter vs Earth LEO', () => {
  const leoMission = createDefaultMarsMission();
  leoMission.destinationId = 'leo';
  const jupMission = createDefaultMarsMission();
  jupMission.destinationId = 'jupiter';

  const leoEng = computeSpacecraftEngineering(leoMission);
  const jupEng = computeSpacecraftEngineering(jupMission);

  assert.ok(leoEng.powerGeneratedW > jupEng.powerGeneratedW * 20);
  assert.equal(jupEng.isPowerValid, false);
});

test('Exceeding launcher payload capacity flags invalid mass margin', () => {
  const m = createDefaultMarsMission();
  m.launchVehicleId = 'lv-electron'; // Only 30 kg to Mars TMI
  const cap = getLauncherCapacityForDestination('lv-electron', 'mars');
  assert.equal(cap, 30);

  const eng = computeSpacecraftEngineering(m);
  assert.equal(eng.isMassValid, false);
  assert.ok(eng.massMarginKg < 0);
});
