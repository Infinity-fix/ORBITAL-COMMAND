import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultMarsMission } from './catalog';
import { computeOrbitalAnalysis } from './orbitalMechanics';
import { computeSpacecraftEngineering } from './spacecraftEngineering';
import {
  computeFinalMissionScore,
  computeTradeStudy,
  createMitigatedRisk,
  evaluateGateBlockers,
  evaluateRequirements,
} from './systemsEngineering';

test('Requirements auto-evaluate and detect critical risks and mass failures', () => {
  const m = createDefaultMarsMission();
  const eng = computeSpacecraftEngineering(m);
  const orb = computeOrbitalAnalysis(m.destinationId, m.orbitalPlan, m.spacecraft, eng.wetMassKg, eng.dryMassKg);
  const reqs = evaluateRequirements(m, eng, orb);

  const safetyReq = reqs.find((r) => r.id === 'req-safety');
  assert.equal(safetyReq?.status, 'Failed'); // Critical risks initially unmitigated

  m.risks = m.risks.map((r) => createMitigatedRisk(r));
  const engAfter = computeSpacecraftEngineering(m);
  const reqsAfter = evaluateRequirements(m, engAfter, orb);
  assert.equal(reqsAfter.find((r) => r.id === 'req-safety')?.status, 'Passed');
});

test('FRR gate blocks launch when critical risks are unmitigated or prior gates incomplete', () => {
  const m = createDefaultMarsMission();
  const eng = computeSpacecraftEngineering(m);
  const orb = computeOrbitalAnalysis(m.destinationId, m.orbitalPlan, m.spacecraft, eng.wetMassKg, eng.dryMassKg);
  const reqs = evaluateRequirements(m, eng, orb);

  const blockers = evaluateGateBlockers('FRR', m, eng, orb, reqs);
  assert.ok(blockers.length >= 2);
});

test('Trade study ranks propulsion and power options with deterministic winner', () => {
  const m = createDefaultMarsMission();
  const propStudy = computeTradeStudy(m, 'Propulsion');
  assert.ok(propStudy.options.length >= 4);
  assert.equal(propStudy.winnerId, propStudy.options[0].id);
});

test('Mission failure results in Grade F and passedMission=false', () => {
  const m = createDefaultMarsMission();
  m.simulation.failed = true;
  m.simulation.failedStage = 'Launch';
  m.simulation.failureReason = 'Test anomaly';
  const eng = computeSpacecraftEngineering(m);
  const orb = computeOrbitalAnalysis(m.destinationId, m.orbitalPlan, m.spacecraft, eng.wetMassKg, eng.dryMassKg);
  const score = computeFinalMissionScore(m, eng, orb);

  assert.equal(score.passedMission, false);
  assert.equal(score.grade, 'F');
});
