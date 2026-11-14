import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCuratedReferenceEphemeris, parseHorizonsVectorResult } from './horizonsParser';

const SAMPLE_HORIZONS_OUTPUT = `
*******************************************************************************
Revised: Jul 31, 2024                 Mars                           499 / 4
Target body name: Mars (499)                      {source: mar097}
Reference frame : Ecliptic of J2000.0
Time scale      : TDB (Barycentric Dynamical Time)
*******************************************************************************
$$SOE
2460627.500000000 = A.D. 2024-Nov-13 00:00:00.0000 TDB
 X = 1.245678901234567E+08 Y = 1.854321098765432E+08 Z = 8.123456789012345E+06
 VX=-1.923456789012345E+01 VY= 1.456789012345678E+01 VZ= 7.890123456789012E-01
$$EOE
*******************************************************************************
`;

test('parseHorizonsVectorResult extracts live Mars position and velocity vectors', () => {
  const parsed = parseHorizonsVectorResult(SAMPLE_HORIZONS_OUTPUT, 'mars', 'live', '2026-11-13T00:00:00Z');
  assert.ok(parsed);
  assert.equal(parsed.targetName, 'Mars (499)');
  assert.equal(parsed.isLive, true);
  assert.equal(parsed.sourceStatus, 'live');
  assert.ok(parsed.rangeAu > 1.4 && parsed.rangeAu < 1.6);
  assert.ok(parsed.speedKms > 23 && parsed.speedKms < 26);
});

test('parseHorizonsVectorResult returns null on malformed output and fallback clearly marks non-live', () => {
  assert.equal(parseHorizonsVectorResult('invalid text', 'mars'), null);

  const fallback = buildCuratedReferenceEphemeris('mars');
  assert.equal(fallback.isLive, false);
  assert.equal(fallback.sourceStatus, 'fallback-curated');
  assert.match(fallback.sourceLabel, /Non-Live Fallback/i);
});
