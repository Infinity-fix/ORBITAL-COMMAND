import test from 'node:test';
import assert from 'node:assert';
import { HazardEngine } from './HazardEngine';
import { INITIAL_SUBSYSTEM_CONDITIONS } from './HazardDamageSystem';

test('HazardEngine manages active hazards and collision detection', () => {
  const engine = HazardEngine.getInstance();
  engine.clearHazards();

  const hazard = engine.spawnHazard('space-debris', 'mars', { x: 0, y: 5, z: 0 });
  assert.strictEqual(engine.getActiveHazards().length, 1);

  let hitCount = 0;
  const res = engine.updateHazards(0.1, { x: 0, y: 5, z: 0 }, INITIAL_SUBSYSTEM_CONDITIONS, (h, sub, dmg) => {
    hitCount++;
  });

  assert.strictEqual(hitCount, 1);
  assert.strictEqual(res.nextConditions.structural, 60); // 100 - 40 damagePotential for space-debris
  assert.strictEqual(res.triggeredEvents.length, 1);
});
