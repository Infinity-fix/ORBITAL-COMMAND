import { DESTINATIONS } from '../src/engine/catalog';
import { buildCuratedReferenceEphemeris, parseHorizonsVectorResult } from '../src/engine/horizonsParser';
import type { DestinationId, NasaEphemerisData } from '../src/engine/types';

interface CacheEntry {
  data: NasaEphemerisData;
  cachedAtMs: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const ephemerisCache = new Map<DestinationId, CacheEntry>();

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function fetchNasaHorizonsEphemeris(targetId: DestinationId): Promise<NasaEphemerisData> {
  const dest = DESTINATIONS.find((d) => d.id === targetId);
  if (!dest) {
    return buildCuratedReferenceEphemeris('mars');
  }

  const cached = ephemerisCache.get(targetId);
  const now = Date.now();
  if (cached && now - cached.cachedAtMs < CACHE_TTL_MS) {
    return {
      ...cached.data,
      sourceStatus: 'cached',
      isLive: false,
      sourceLabel: 'NASA/JPL Horizons Web API (Cached State Vector)',
    };
  }

  const start = new Date();
  const stop = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${dest.horizonsCommand}'`,
    OBJ_DATA: 'NO',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'VECTORS',
    CENTER: "'500@10'", // Heliocentric (Sun body center)
    START_TIME: `'${formatDate(start)}'`,
    STOP_TIME: `'${formatDate(stop)}'`,
    STEP_SIZE: "'1 d'",
    VEC_TABLE: "'2'",
    OUT_UNITS: "'KM-S'",
  });

  const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Horizons HTTP ${res.status}`);
    }

    const json = (await res.json()) as { result?: string; error?: string };
    if (!json.result) {
      throw new Error(json.error || 'Missing Horizons result field');
    }

    const parsed = parseHorizonsVectorResult(json.result, targetId, 'live', new Date().toISOString());
    if (!parsed) {
      throw new Error('Unable to parse $$SOE..$$EOE vector block');
    }

    ephemerisCache.set(targetId, { data: parsed, cachedAtMs: now });
    return parsed;
  } catch {
    if (cached) {
      return {
        ...cached.data,
        sourceStatus: 'cached',
        isLive: false,
        sourceLabel: 'NASA/JPL Horizons Web API (Last Valid Cached Vector — Live Query Unavailable)',
      };
    }
    return buildCuratedReferenceEphemeris(targetId);
  }
}
