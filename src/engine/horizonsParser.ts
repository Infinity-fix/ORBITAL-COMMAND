import { DESTINATIONS } from './catalog';
import { AU_KM } from './orbitalMechanics';
import type { DestinationId, NasaEphemerisData } from './types';

/**
 * Parses NASA/JPL Horizons API vector text block (between $$SOE and $$EOE).
 * Supports standard VEC_TABLE='2' / '3' output formats with X, Y, Z, VX, VY, VZ.
 */
export function parseHorizonsVectorResult(
  rawText: string,
  targetId: DestinationId,
  sourceStatus: 'live' | 'cached' = 'live',
  retrievedAt: string = new Date().toISOString()
): NasaEphemerisData | null {
  if (!rawText || !rawText.includes('$$SOE') || !rawText.includes('$$EOE')) {
    return null;
  }

  const soeIdx = rawText.indexOf('$$SOE');
  const eoeIdx = rawText.indexOf('$$EOE');
  if (soeIdx === -1 || eoeIdx <= soeIdx) return null;

  const block = rawText.slice(soeIdx + 5, eoeIdx).trim();
  const lines = block
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 3) return null;

  const targetMatch = rawText.match(/Target body name:\s*([^\n\r{]+)/i);
  const frameMatch = rawText.match(/Reference frame\s*:\s*([^\n\r]+)/i);
  const timeScaleMatch = rawText.match(/Time scale\s*:\s*([^\n\r]+)/i);
  const epochLine = lines[0];

  // Parse X, Y, Z and VX, VY, VZ from lines following epoch
  const bodyBlock = lines.slice(1, 5).join(' ');
  const xMatch = bodyBlock.match(/X\s*=\s*([+-]?\d+\.\d+E[+-]\d+|[+-]?\d+\.\d+)/i);
  const yMatch = bodyBlock.match(/Y\s*=\s*([+-]?\d+\.\d+E[+-]\d+|[+-]?\d+\.\d+)/i);
  const zMatch = bodyBlock.match(/Z\s*=\s*([+-]?\d+\.\d+E[+-]\d+|[+-]?\d+\.\d+)/i);
  const vxMatch = bodyBlock.match(/VX\s*=\s*([+-]?\d+\.\d+E[+-]\d+|[+-]?\d+\.\d+)/i);
  const vyMatch = bodyBlock.match(/VY\s*=\s*([+-]?\d+\.\d+E[+-]\d+|[+-]?\d+\.\d+)/i);
  const vzMatch = bodyBlock.match(/VZ\s*=\s*([+-]?\d+\.\d+E[+-]\d+|[+-]?\d+\.\d+)/i);

  if (!xMatch || !yMatch || !zMatch || !vxMatch || !vyMatch || !vzMatch) {
    return null;
  }

  const x = Number.parseFloat(xMatch[1]);
  const y = Number.parseFloat(yMatch[1]);
  const z = Number.parseFloat(zMatch[1]);
  const vx = Number.parseFloat(vxMatch[1]);
  const vy = Number.parseFloat(vyMatch[1]);
  const vz = Number.parseFloat(vzMatch[1]);

  if ([x, y, z, vx, vy, vz].some((n) => Number.isNaN(n))) {
    return null;
  }

  const rangeKm = Math.sqrt(x * x + y * y + z * z);
  const speedKms = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const dest = DESTINATIONS.find((d) => d.id === targetId);

  return {
    targetId,
    targetName: targetMatch ? targetMatch[1].trim() : dest?.name ?? targetId,
    horizonsCommand: dest?.horizonsCommand ?? '499',
    epochTdb: epochLine,
    referenceFrame: frameMatch ? frameMatch[1].trim() : 'ICRF / J2000 Ecliptic',
    timeScale: timeScaleMatch ? timeScaleMatch[1].trim() : 'TDB (Barycentric Dynamical Time)',
    units: 'KM-S (Kilometers & km/s)',
    positionKm: { x, y, z },
    positionAu: {
      x: Number((x / AU_KM).toFixed(6)),
      y: Number((y / AU_KM).toFixed(6)),
      z: Number((z / AU_KM).toFixed(6)),
    },
    velocityKms: { vx, vy, vz },
    rangeAu: Number((rangeKm / AU_KM).toFixed(5)),
    speedKms: Number(speedKms.toFixed(4)),
    sourceStatus,
    isLive: sourceStatus === 'live',
    sourceLabel:
      sourceStatus === 'live'
        ? 'NASA/JPL Horizons Web API (Live State Vector)'
        : 'NASA/JPL Horizons Web API (Cached State Vector)',
    retrievedAt,
    rawSnippet: lines.slice(0, 4).join('\n'),
  };
}

/**
 * Educational reference fallback when live JPL Horizons is unavailable or offline.
 * Explicitly labeled as non-live curated reference data.
 */
export function buildCuratedReferenceEphemeris(targetId: DestinationId): NasaEphemerisData {
  const dest = DESTINATIONS.find((d) => d.id === targetId) ?? DESTINATIONS[3];
  const rAu = dest.orbitRadiusAu;
  // Deterministic heliocentric circular reference angle based on orbital period
  const angleRad = (dest.orbitRadiusAu * 2.15) % (Math.PI * 2);
  const xKm = Math.cos(angleRad) * rAu * AU_KM;
  const yKm = Math.sin(angleRad) * rAu * AU_KM;
  const zKm = Math.sin(angleRad * 0.5) * 0.02 * rAu * AU_KM;

  // Vis-viva heliocentric circular speed sqrt(MU_SUN / r)
  const vKms = Math.sqrt(1.32712440018e11 / (rAu * AU_KM));
  const vx = -Math.sin(angleRad) * vKms;
  const vy = Math.cos(angleRad) * vKms;
  const vz = 0.25;

  return {
    targetId,
    targetName: dest.name,
    horizonsCommand: dest.horizonsCommand,
    epochTdb: 'J2000.0 Reference Epoch (Educational Fallback)',
    referenceFrame: 'Heliocentric Ecliptic J2000 (Approximate)',
    timeScale: 'Reference Mean Orbital Elements',
    units: 'KM-S (Kilometers & km/s)',
    positionKm: { x: Math.round(xKm), y: Math.round(yKm), z: Math.round(zKm) },
    positionAu: {
      x: Number((xKm / AU_KM).toFixed(5)),
      y: Number((yKm / AU_KM).toFixed(5)),
      z: Number((zKm / AU_KM).toFixed(5)),
    },
    velocityKms: {
      vx: Number(vx.toFixed(3)),
      vy: Number(vy.toFixed(3)),
      vz: Number(vz.toFixed(3)),
    },
    rangeAu: Number(rAu.toFixed(4)),
    speedKms: Number(vKms.toFixed(3)),
    sourceStatus: 'fallback-curated',
    isLive: false,
    sourceLabel: 'Curated Educational Reference Ephemeris (Non-Live Fallback — JPL Horizons Offline/Unreachable)',
    retrievedAt: new Date().toISOString(),
  };
}
