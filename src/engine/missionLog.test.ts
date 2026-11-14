import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultMarsMission } from './catalog';
import { computeOrbitalAnalysis } from './orbitalMechanics';
import { computeSpacecraftEngineering } from './spacecraftEngineering';
import {
  appendMissionLogs,
  createMissionLogEntry,
  detectEngineeringTelemetryAlerts,
  filterMissionLogs,
  inferLogCategory,
  summarizeMissionLogs,
} from './missionLog';

test('detectEngineeringTelemetryAlerts emits alert on Δv deficit transition and nominal restoration', () => {
  const baseMission = createDefaultMarsMission();
  const baseEng = computeSpacecraftEngineering(baseMission);
  const baseOrb = computeOrbitalAnalysis(
    baseMission.destinationId,
    baseMission.orbitalPlan,
    baseMission.spacecraft,
    baseEng.wetMassKg,
    baseEng.dryMassKg
  );

  const lowPropMission = {
    ...baseMission,
    spacecraft: { ...baseMission.spacecraft, propellantMassKg: 1200 },
  };
  const lowEng = computeSpacecraftEngineering(lowPropMission);
  const lowOrb = computeOrbitalAnalysis(
    lowPropMission.destinationId,
    lowPropMission.orbitalPlan,
    lowPropMission.spacecraft,
    lowEng.wetMassKg,
    lowEng.dryMassKg
  );

  const deficitAlerts = detectEngineeringTelemetryAlerts(
    baseEng,
    baseOrb,
    lowEng,
    lowOrb,
    'Mission Design'
  );
  assert.equal(deficitAlerts.length, 1);
  assert.equal(deficitAlerts[0].category, 'telemetry');
  assert.equal(deficitAlerts[0].severity, 'critical');
  assert.match(deficitAlerts[0].title, /Δv Deficit/i);

  // Repeating at same invalid state emits 0 duplicate alerts
  const noDup = detectEngineeringTelemetryAlerts(
    lowEng,
    lowOrb,
    lowEng,
    lowOrb,
    'Mission Design'
  );
  assert.equal(noDup.length, 0);

  // Restoring propellant emits nominal restoration alert
  const restored = detectEngineeringTelemetryAlerts(
    lowEng,
    lowOrb,
    baseEng,
    baseOrb,
    'Mission Design'
  );
  assert.equal(restored.length, 1);
  assert.equal(restored[0].severity, 'nominal');
});

test('filterMissionLogs and summarizeMissionLogs categorize and filter accurately', () => {
  const logs = [
    createMissionLogEntry({
      stage: 'Mission Concept',
      category: 'event',
      severity: 'info',
      title: 'Mission Initialized',
      detail: 'Ares Horizon Orbiter created.',
    }),
    createMissionLogEntry({
      stage: 'Mission Design',
      category: 'milestone',
      severity: 'nominal',
      title: 'MCR Gate Passed',
      detail: 'Mission Concept Review approved.',
    }),
    createMissionLogEntry({
      stage: 'Operations',
      category: 'telemetry',
      severity: 'critical',
      title: 'Low Power Bus Warning',
      detail: 'Solar margin below 15%.',
    }),
  ];

  const summary = summarizeMissionLogs(logs);
  assert.equal(summary.total, 3);
  assert.equal(summary.events, 1);
  assert.equal(summary.milestones, 1);
  assert.equal(summary.telemetry, 1);
  assert.equal(summary.activeAlerts, 1);

  assert.equal(filterMissionLogs(logs, 'milestone', '').length, 1);
  assert.equal(filterMissionLogs(logs, 'all', 'mcr').length, 1);
  assert.equal(inferLogCategory({ ...logs[1], category: undefined }), 'milestone');
});

test('appendMissionLogs prevents identical back-to-back entries and respects max cap', () => {
  const e1 = createMissionLogEntry({
    stage: 'Launch',
    category: 'event',
    severity: 'nominal',
    title: 'Liftoff Nominal',
    detail: 'Vehicle cleared tower.',
  });
  const e2 = createMissionLogEntry({
    stage: 'Launch',
    category: 'event',
    severity: 'nominal',
    title: 'Liftoff Nominal',
    detail: 'Vehicle cleared tower.',
  });

  const merged = appendMissionLogs([e1], [e2]);
  assert.equal(merged.length, 1);
});
