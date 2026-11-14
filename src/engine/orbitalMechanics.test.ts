import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AU_KM,
  MU_EARTH_KM3_S2,
  R_EARTH_KM,
  calculateCircularVelocityKms,
  calculateEscapeVelocityKms,
  calculateHohmannTransfer,
  calculateOrbitalPeriodSeconds,
  calculateTsiolkovskyDeltaVKms,
  computeOrbitalAnalysis,
} from './orbitalMechanics';
import { createDefaultMarsMission } from './catalog';

test('LEO circular velocity and escape velocity match orbital mechanics reference', () => {
  const rLeo = R_EARTH_KM + 400; // ~6778 km
  const vc = calculateCircularVelocityKms(MU_EARTH_KM3_S2, rLeo);
  const ve = calculateEscapeVelocityKms(MU_EARTH_KM3_S2, rLeo);

  assert.ok(vc > 7.6 && vc < 7.75, `Expected ~7.67 km/s, got ${vc}`);
  assert.ok(Math.abs(ve - vc * Math.SQRT2) < 1e-6);
});

test('ISS-altitude orbital period is ~92 minutes', () => {
  const periodMin = calculateOrbitalPeriodSeconds(MU_EARTH_KM3_S2, R_EARTH_KM + 400) / 60;
  assert.ok(periodMin > 91 && periodMin < 94, `Expected ~92.5 min, got ${periodMin}`);
});

test('Hohmann transfer from LEO to GEO produces ~3.9 km/s delta-v and ~5.25h transfer', () => {
  const r1 = R_EARTH_KM + 200;
  const r2 = R_EARTH_KM + 35786;
  const h = calculateHohmannTransfer(MU_EARTH_KM3_S2, r1, r2);
  const hours = h.transferTimeSeconds / 3600;

  assert.ok(h.totalDeltaVKms > 3.7 && h.totalDeltaVKms < 4.1, `Expected ~3.9 km/s, got ${h.totalDeltaVKms}`);
  assert.ok(hours > 5.0 && hours < 5.6, `Expected ~5.25 hours, got ${hours}`);
});

test('Tsiolkovsky rocket equation computes positive delta-v when wet > dry', () => {
  const dv = calculateTsiolkovskyDeltaVKms(318, 3000, 1000);
  // 318 * 9.80665 * ln(3) / 1000 ≈ 3.426 km/s
  assert.ok(dv > 3.3 && dv < 3.55, `Expected ~3.43 km/s, got ${dv}`);
  assert.equal(calculateTsiolkovskyDeltaVKms(318, 1000, 1000), 0);
});

test('Default Mars mission orbital analysis yields realistic ~259 day heliocentric transfer', () => {
  const m = createDefaultMarsMission();
  const analysis = computeOrbitalAnalysis('mars', m.orbitalPlan, m.spacecraft, 3200, 1050);
  assert.ok(analysis.estimatedTransferDays > 240 && analysis.estimatedTransferDays < 275);
  assert.ok(analysis.assumptions.length >= 3);
  assert.ok(AU_KM > 1.49e8);
});
