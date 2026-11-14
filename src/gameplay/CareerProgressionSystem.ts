import type { CareerProfile } from '../engine/types';

export function createInitialCareerProfile(): CareerProfile {
  return {
    xp: 0,
    rank: 'Candidate',
    reputation: 50,
    missionsFlown: 0,
    discoveriesLogged: 0,
    skills: {
      piloting: 1,
      evaOps: 1,
      science: 1,
      engineering: 1,
    },
  };
}

export function rankFromXp(xp: number): CareerProfile['rank'] {
  if (xp >= 4000) return 'Chief Astronaut';
  if (xp >= 2400) return 'Senior Commander';
  if (xp >= 1200) return 'Mission Engineer';
  if (xp >= 450) return 'Flight Specialist';
  return 'Candidate';
}

export function applyCareerProgressionOutcome(
  prev: CareerProfile,
  params: {
    passed: boolean;
    score: number;
    scienceCount: number;
    baseModulesCount: number;
    domain: 'piloting' | 'eva' | 'science' | 'engineering';
  }
): CareerProfile {
  const gainedXp = Math.max(
    40,
    Math.round(params.score * (params.passed ? 0.45 : 0.18) + params.scienceCount * 28 + params.baseModulesCount * 22)
  );
  const nextXp = prev.xp + gainedXp;
  const nextRep = Math.max(
    0,
    Math.min(100, prev.reputation + (params.passed ? 6 : -3) + Math.min(4, params.scienceCount))
  );

  const skillBoost = params.passed ? 1 : 0;
  return {
    xp: nextXp,
    rank: rankFromXp(nextXp),
    reputation: nextRep,
    missionsFlown: prev.missionsFlown + 1,
    discoveriesLogged: prev.discoveriesLogged + params.scienceCount,
    skills: {
      piloting: Math.min(10, prev.skills.piloting + (params.domain === 'piloting' ? skillBoost : 0)),
      evaOps: Math.min(10, prev.skills.evaOps + (params.domain === 'eva' ? skillBoost : 0)),
      science: Math.min(10, prev.skills.science + (params.scienceCount > 0 ? 1 : 0)),
      engineering: Math.min(10, prev.skills.engineering + (params.domain === 'engineering' || params.baseModulesCount > 0 ? 1 : 0)),
    },
  };
}
