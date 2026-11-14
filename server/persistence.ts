import fs from 'node:fs';
import path from 'node:path';
import type {
  CampaignRecord,
  CareerProfile,
  PlanetaryBaseModule,
  SquadState,
} from '../src/engine/types';
import { createInitialCareerProfile } from '../src/gameplay/CareerProgressionSystem';

interface PersistedDatabase {
  campaigns: CampaignRecord[];
  unlockedAchievements: string[];
  squads: Record<string, SquadState>;
  baseModules: PlanetaryBaseModule[];
  career: CareerProfile;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'campaign-db.json');

const DEFAULT_DB: PersistedDatabase = {
  campaigns: [],
  unlockedAchievements: [],
  squads: {},
  baseModules: [],
  career: createInitialCareerProfile(),
};

function ensureDb(): PersistedDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
      return { ...DEFAULT_DB };
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistedDatabase>;
    return {
      campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : [],
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements) ? parsed.unlockedAchievements : [],
      squads: parsed.squads && typeof parsed.squads === 'object' ? parsed.squads : {},
      baseModules: Array.isArray(parsed.baseModules) ? parsed.baseModules : [],
      career: parsed.career && typeof parsed.career === 'object' ? parsed.career : createInitialCareerProfile(),
    };
  } catch {
    return { ...DEFAULT_DB };
  }
}

function saveDb(db: PersistedDatabase): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Persistence] Failed to write campaign-db.json:', err);
  }
}

export function getCampaignData(): {
  campaigns: CampaignRecord[];
  unlockedAchievements: string[];
  baseModules: PlanetaryBaseModule[];
  career: CareerProfile;
} {
  const db = ensureDb();
  return {
    campaigns: db.campaigns,
    unlockedAchievements: db.unlockedAchievements,
    baseModules: db.baseModules,
    career: db.career,
  };
}

export function addCampaignRecord(record: CampaignRecord, newAchievements: string[] = []): {
  campaigns: CampaignRecord[];
  unlockedAchievements: string[];
} {
  const db = ensureDb();
  const filtered = db.campaigns.filter((c) => c.id !== record.id);
  db.campaigns = [record, ...filtered].slice(0, 100);
  const achSet = new Set([...db.unlockedAchievements, ...newAchievements]);
  db.unlockedAchievements = Array.from(achSet);
  saveDb(db);
  return {
    campaigns: db.campaigns,
    unlockedAchievements: db.unlockedAchievements,
  };
}

export function saveBaseModulesRemote(modules: PlanetaryBaseModule[]): PlanetaryBaseModule[] {
  const db = ensureDb();
  db.baseModules = modules.slice(0, 100);
  saveDb(db);
  return db.baseModules;
}

export function saveCareerProfileRemote(career: CareerProfile): CareerProfile {
  const db = ensureDb();
  db.career = career;
  saveDb(db);
  return db.career;
}

export function getPersistedSquad(code: string): SquadState | null {
  const db = ensureDb();
  return db.squads[code.toUpperCase()] ?? null;
}

export function savePersistedSquad(squad: SquadState): void {
  const db = ensureDb();
  db.squads[squad.code.toUpperCase()] = squad;
  saveDb(db);
}
