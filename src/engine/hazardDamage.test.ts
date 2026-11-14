import test from 'node:test';
import assert from 'node:assert';
import { createActiveHazard, applySubsystemDamage, repairSubsystem, INITIAL_SUBSYSTEM_CONDITIONS } from './HazardDamageSystem';

test('HazardDamageSystem creates hazards and applies subsystem damage', () => {
  const hazard = createActiveHazard('space-debris', 'mars');
  assert.strictEqual(hazard.type, 'space-debris');
  assert.strictEqual(hazard.severity, 'critical');
  assert.ok(hazard.responses.length > 0);

  const damaged = applySubsystemDamage(INITIAL_SUBSYSTEM_CONDITIONS, 'structural', 25);
  assert.strictEqual(damaged.structural, 75);

  const repaired = repairSubsystem(damaged, 'structural');
  assert.strictEqual(repaired.structural, 100);
});
