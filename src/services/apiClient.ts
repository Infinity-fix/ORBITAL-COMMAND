import { buildCuratedReferenceEphemeris } from '../engine/horizonsParser';
import type {
  AICommanderReply,
  CampaignRecord,
  CareerProfile,
  DestinationId,
  EnvironmentId,
  MissionDesign,
  NasaEphemerisData,
  PlanetaryBaseModule,
  SurvivalTelemetry,
} from '../engine/types';

export async function fetchHorizonsEphemeris(targetId: DestinationId): Promise<NasaEphemerisData> {
  try {
    const res = await fetch(`/api/nasa/horizons?target=${encodeURIComponent(targetId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as NasaEphemerisData;
  } catch {
    return buildCuratedReferenceEphemeris(targetId);
  }
}

export async function fetchCampaignHistory(): Promise<{
  campaigns: CampaignRecord[];
  unlockedAchievements: string[];
  baseModules?: PlanetaryBaseModule[];
  career?: CareerProfile;
}> {
  try {
    const res = await fetch('/api/campaigns');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as {
      campaigns: CampaignRecord[];
      unlockedAchievements: string[];
      baseModules?: PlanetaryBaseModule[];
      career?: CareerProfile;
    };
  } catch {
    return { campaigns: [], unlockedAchievements: [] };
  }
}

export async function saveCampaignRecordRemote(
  record: CampaignRecord,
  achievements: string[]
): Promise<{ campaigns: CampaignRecord[]; unlockedAchievements: string[] } | null> {
  try {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record, achievements }),
    });
    if (!res.ok) return null;
    return (await res.json()) as { campaigns: CampaignRecord[]; unlockedAchievements: string[] };
  } catch {
    return null;
  }
}

export async function saveBaseModulesRemote(modules: PlanetaryBaseModule[]): Promise<void> {
  try {
    await fetch('/api/base-modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modules }),
    });
  } catch {
    // Non-blocking fallback: localStorage persistence still holds state
  }
}

export async function saveCareerProfileRemote(career: CareerProfile): Promise<void> {
  try {
    await fetch('/api/career', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ career }),
    });
  } catch {
    // Non-blocking fallback
  }
}

export async function askAICommander(params: {
  question: string;
  mission: MissionDesign;
  telemetry?: SurvivalTelemetry | null;
  environment?: EnvironmentId;
  builtModulesCount?: number;
  activeHazards?: Array<{ type: string; severity: string; affectedSubsystem: string }>;
}): Promise<AICommanderReply> {
  const res = await fetch('/api/ai/commander', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`AI Commander HTTP ${res.status}`);
  }
  return (await res.json()) as AICommanderReply;
}
