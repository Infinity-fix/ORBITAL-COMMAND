import {
  DESTINATIONS,
  LAUNCH_VEHICLES,
  PAYLOADS,
  POWER_SYSTEMS,
  PROPULSION_SYSTEMS,
} from './catalog';
import { computeOrbitalAnalysis } from './orbitalMechanics';
import { computeSpacecraftEngineering, getLauncherCapacityForDestination } from './spacecraftEngineering';
import type {
  GateReview,
  MissionDesign,
  MissionScoreBreakdown,
  OrbitalCalculationSummary,
  RequirementItem,
  RiskItem,
  RiskSeverity,
  SpacecraftEngineeringSummary,
  TradeStudyOption,
  TradeStudyResult,
} from './types';

export function getRiskSeverity(score: number): RiskSeverity {
  if (score >= 16) return 'Critical';
  if (score >= 10) return 'High';
  if (score >= 5) return 'Moderate';
  return 'Low';
}

export function evaluateRequirements(
  mission: MissionDesign,
  eng: SpacecraftEngineeringSummary,
  orb: OrbitalCalculationSummary
): RequirementItem[] {
  const existingMap = new Map(mission.requirements.map((r) => [r.id, r]));
  const selectedPayloads = PAYLOADS.filter((p) => mission.selectedPayloadIds.includes(p.id));
  const totalScienceValue = selectedPayloads.reduce((s, p) => s + p.scienceValue, 0);
  const criticalUnmitigated = mission.risks.filter((r) => !r.mitigated && r.severity === 'Critical').length;

  const list: RequirementItem[] = [
    {
      id: 'req-mass',
      code: 'SYS-MASS-01',
      title: 'Launch Vehicle Mass Margin',
      description: 'Spacecraft wet mass must remain within selected launch vehicle destination payload capacity.',
      category: 'Mass',
      priority: 'Mandatory',
      targetDisplay: `<= ${eng.launcherCapacityKg.toLocaleString()} kg`,
      actualDisplay: `${eng.wetMassKg.toLocaleString()} kg (${eng.massMarginPct >= 0 ? '+' : ''}${eng.massMarginPct}%)`,
      verificationMethod: 'Analysis',
      status: eng.isMassValid ? 'Passed' : 'Failed',
      objectiveLink: mission.primaryObjective,
      manualVerified: existingMap.get('req-mass')?.manualVerified ?? false,
    },
    {
      id: 'req-power',
      code: 'SYS-PWR-02',
      title: 'Positive Power & Eclipse Margin',
      description: 'Power generation at destination solar flux must exceed average bus + payload load with >= 1.2h eclipse battery.',
      category: 'Power',
      priority: 'Mandatory',
      targetDisplay: `>= ${eng.averagePowerDrawW} W & >= 1.2h`,
      actualDisplay: `${eng.powerGeneratedW} W (${eng.powerMarginPct >= 0 ? '+' : ''}${eng.powerMarginPct}%) · ${eng.eclipseCapacityHours}h`,
      verificationMethod: 'Test',
      status: eng.isPowerValid ? 'Passed' : 'Failed',
      objectiveLink: mission.primaryObjective,
      manualVerified: existingMap.get('req-power')?.manualVerified ?? false,
    },
    {
      id: 'req-deltav',
      code: 'ORB-DV-03',
      title: 'Mission Delta-V Capability',
      description: 'Available Tsiolkovsky delta-v must cover transfer, capture, and contingency maneuvers.',
      category: 'Orbital',
      priority: 'Mandatory',
      targetDisplay: `>= ${orb.totalRequiredDeltaVKms.toFixed(2)} km/s`,
      actualDisplay: `${eng.availableDeltaVKms.toFixed(2)} km/s (Margin: ${orb.deltaVMarginKms >= 0 ? '+' : ''}${orb.deltaVMarginKms.toFixed(2)} km/s)`,
      verificationMethod: 'Analysis',
      status: orb.isDeltaVSufficient ? 'Passed' : 'Failed',
      objectiveLink: mission.primaryObjective,
      manualVerified: existingMap.get('req-deltav')?.manualVerified ?? false,
    },
    {
      id: 'req-science',
      code: 'SCI-PAY-04',
      title: 'Science Payload Complement',
      description: 'Mission must carry at least 2 compatible instruments with >= 35 aggregate science value.',
      category: 'Science',
      priority: 'High',
      targetDisplay: '>= 2 instruments · >= 35 pts',
      actualDisplay: `${selectedPayloads.length} instruments · ${totalScienceValue} pts`,
      verificationMethod: 'Demonstration',
      status: selectedPayloads.length >= 2 && totalScienceValue >= 35 ? 'Passed' : 'Failed',
      objectiveLink: mission.primaryObjective,
      manualVerified: existingMap.get('req-science')?.manualVerified ?? false,
    },
    {
      id: 'req-budget',
      code: 'MGT-BUD-05',
      title: 'Budget Cap & Contingency',
      description: 'Total estimated cost including risk mitigations must stay within the mission budget cap.',
      category: 'Budget',
      priority: 'Mandatory',
      targetDisplay: `<= $${mission.budgetCapMUsd}M`,
      actualDisplay: `$${eng.totalEstimatedCostMUsd}M (${eng.contingencyPct >= 0 ? `${eng.contingencyPct}% reserve` : 'Overrun'})`,
      verificationMethod: 'Inspection',
      status: eng.isBudgetValid ? 'Passed' : 'Failed',
      objectiveLink: mission.secondaryObjectives[0] ?? mission.primaryObjective,
      manualVerified: existingMap.get('req-budget')?.manualVerified ?? false,
    },
    {
      id: 'req-safety',
      code: 'SAF-RSK-06',
      title: 'Critical Risk Mitigation',
      description: 'All Critical (score >= 16) mission risks must be mitigated before Flight Readiness Review.',
      category: 'Safety',
      priority: 'Mandatory',
      targetDisplay: '0 unmitigated Critical risks',
      actualDisplay: `${criticalUnmitigated} unmitigated Critical`,
      verificationMethod: 'Inspection',
      status: criticalUnmitigated === 0 ? 'Passed' : 'Failed',
      objectiveLink: mission.successCriteria[0] ?? mission.primaryObjective,
      manualVerified: existingMap.get('req-safety')?.manualVerified ?? false,
    },
  ];

  return list;
}

export function computeTradeStudy(
  mission: MissionDesign,
  topic: 'Propulsion' | 'Launch Vehicle' | 'Power System'
): TradeStudyResult {
  const eng = computeSpacecraftEngineering(mission);
  const dest = DESTINATIONS.find((d) => d.id === mission.destinationId) ?? DESTINATIONS[0];
  const options: TradeStudyOption[] = [];

  if (topic === 'Propulsion') {
    for (const p of PROPULSION_SYSTEMS) {
      const testMission: MissionDesign = {
        ...mission,
        spacecraft: { ...mission.spacecraft, propulsionId: p.id },
      };
      const tEng = computeSpacecraftEngineering(testMission);
      const tOrb = computeOrbitalAnalysis(mission.destinationId, mission.orbitalPlan, testMission.spacecraft, tEng.wetMassKg, tEng.dryMassKg);

      const perf = Math.min(100, Math.max(10, 50 + tOrb.deltaVMarginKms * 12 + (p.ispSeconds / 3200) * 25));
      const cost = Math.min(100, Math.max(15, 100 - p.costMUsd * 0.9));
      const mass = tEng.isMassValid ? Math.min(100, 60 + tEng.massMarginPct * 0.6) : 10;
      const risk = p.id === 'cryogenic' && dest.orbitRadiusAu > 1.2 ? 45 : tEng.isPowerValid ? 88 : 35;
      const weighted = Number((perf * 0.35 + mass * 0.25 + cost * 0.2 + risk * 0.2).toFixed(1));
      options.push({
        id: p.id,
        label: p.name,
        performanceScore: Math.round(perf),
        costScore: Math.round(cost),
        massScore: Math.round(mass),
        riskScore: Math.round(risk),
        weightedTotal: weighted,
        notes: `Isp ${p.ispSeconds} s · Δv margin ${tOrb.deltaVMarginKms >= 0 ? '+' : ''}${tOrb.deltaVMarginKms.toFixed(2)} km/s · Power ${tEng.isPowerValid ? 'OK' : 'Deficit'}`,
      });
    }
  } else if (topic === 'Launch Vehicle') {
    for (const lv of LAUNCH_VEHICLES) {
      const cap = getLauncherCapacityForDestination(lv.id, dest.id);
      const marginPct = cap > 0 ? ((cap - eng.wetMassKg) / cap) * 100 : -100;
      const mass = cap >= eng.wetMassKg ? Math.min(100, 60 + marginPct * 0.5) : 5;
      const cost = Math.min(100, Math.max(5, 100 - (lv.referenceCostMUsd / 10)));
      const perf = cap >= eng.wetMassKg ? 85 : 15;
      const risk = Math.round(lv.reliabilityRating * 100);
      const weighted = Number((perf * 0.3 + mass * 0.3 + cost * 0.25 + risk * 0.15).toFixed(1));
      options.push({
        id: lv.id,
        label: lv.name,
        performanceScore: Math.round(perf),
        costScore: Math.round(cost),
        massScore: Math.round(mass),
        riskScore: risk,
        weightedTotal: weighted,
        notes: `Cap ${cap.toLocaleString()} kg · Est. $${lv.referenceCostMUsd}M · Reliability ${(lv.reliabilityRating * 100).toFixed(0)}%`,
      });
    }
  } else {
    for (const pw of POWER_SYSTEMS) {
      const testMission: MissionDesign = {
        ...mission,
        spacecraft: { ...mission.spacecraft, powerId: pw.id },
      };
      const tEng = computeSpacecraftEngineering(testMission);
      const perf = tEng.isPowerValid ? Math.min(100, 65 + tEng.powerMarginPct * 0.35) : 15;
      const cost = Math.min(100, Math.max(15, 100 - pw.costMUsd * 0.65));
      const mass = Math.min(100, Math.max(25, 95 - (pw.massKg / 200) * 45));
      const risk = pw.isSolar && dest.orbitRadiusAu > 2.0 ? 30 : 90;
      const weighted = Number((perf * 0.4 + risk * 0.25 + cost * 0.2 + mass * 0.15).toFixed(1));
      options.push({
        id: pw.id,
        label: pw.name,
        performanceScore: Math.round(perf),
        costScore: Math.round(cost),
        massScore: Math.round(mass),
        riskScore: Math.round(risk),
        weightedTotal: weighted,
        notes: `Gen ${tEng.powerGeneratedW} W at ${dest.orbitRadiusAu} AU · Margin ${tEng.powerMarginPct >= 0 ? '+' : ''}${tEng.powerMarginPct}%`,
      });
    }
  }

  options.sort((a, b) => b.weightedTotal - a.weightedTotal);
  const winner = options[0];
  return {
    topic,
    winnerId: winner?.id ?? '',
    explanation: winner
      ? `${winner.label} achieves the highest weighted trade score (${winner.weightedTotal}/100) for ${dest.name} considering performance, mass margin, cost efficiency, and operational risk.`
      : 'No viable trade options found.',
    options,
  };
}

export function evaluateGateBlockers(
  gateCode: GateReview['code'],
  mission: MissionDesign,
  eng: SpacecraftEngineeringSummary,
  orb: OrbitalCalculationSummary,
  reqs: RequirementItem[]
): string[] {
  const blockers: string[] = [];
  const criticalRisks = mission.risks.filter((r) => !r.mitigated && r.severity === 'Critical');

  if (gateCode === 'MCR' || gateCode === 'SRR' || gateCode === 'MDR') {
    if (!mission.name.trim() || !mission.primaryObjective.trim()) {
      blockers.push('Mission name and primary scientific objective must be defined.');
    }
    if (mission.selectedPayloadIds.length === 0) {
      blockers.push('At least one scientific or operational payload must be selected.');
    }
  }

  if (gateCode === 'PDR' || gateCode === 'CDR') {
    if (!eng.isMassValid) {
      blockers.push(`Wet mass (${eng.wetMassKg} kg) exceeds launcher capacity (${eng.launcherCapacityKg} kg).`);
    }
    if (!eng.isPowerValid) {
      blockers.push(`Power deficit (${eng.powerMarginW} W) or insufficient eclipse battery (${eng.eclipseCapacityHours}h).`);
    }
    if (!orb.isDeltaVSufficient) {
      blockers.push(`Insufficient Δv (${eng.availableDeltaVKms} km/s vs ${orb.totalRequiredDeltaVKms} km/s required).`);
    }
  }

  if (gateCode === 'CDR' || gateCode === 'SIR' || gateCode === 'ORR' || gateCode === 'FRR') {
    if (!eng.isBudgetValid) {
      blockers.push(`Budget overrun of $${Math.abs(eng.budgetRemainingMUsd)}M over cap.`);
    }
    if (criticalRisks.length > 0) {
      blockers.push(`${criticalRisks.length} Critical risk(s) remain unmitigated in the Risk Register.`);
    }
    const failedMandatory = reqs.filter((r) => r.priority === 'Mandatory' && r.status === 'Failed');
    if (failedMandatory.length > 0) {
      blockers.push(`${failedMandatory.length} Mandatory requirement(s) currently failing verification.`);
    }
  }

  if (gateCode === 'FRR') {
    const priorIncomplete = mission.gates.filter(
      (g) => ['MCR', 'SRR', 'MDR', 'PDR', 'CDR', 'SIR', 'ORR'].includes(g.code) && !g.passed
    );
    if (priorIncomplete.length > 0) {
      blockers.push(`Complete prior reviews (${priorIncomplete.map((g) => g.code).join(', ')}) before Flight Readiness.`);
    }
  }

  if (gateCode === 'PLAR' && !['Operations', 'End of Life'].includes(mission.simulation.currentStage) && !mission.simulation.completed) {
    blockers.push('Spacecraft must complete Launch & Cruise before Post-Launch Assessment.');
  }

  if (gateCode === 'PFAR' && !mission.simulation.completed) {
    blockers.push('Mission closeout (End of Life) must finish before Post-Flight Assessment.');
  }

  return blockers;
}

export function calculateMissionReadinessPct(
  mission: MissionDesign,
  eng: SpacecraftEngineeringSummary,
  orb: OrbitalCalculationSummary
): number {
  const reqs = evaluateRequirements(mission, eng, orb);
  const reqScore = (reqs.filter((r) => r.status === 'Passed').length / Math.max(1, reqs.length)) * 45;
  const riskPenalty = mission.risks.reduce((sum, r) => sum + (r.mitigated ? r.residualScore * 0.3 : r.score * 1.1), 0);
  const riskScore = Math.max(0, 30 - riskPenalty * 0.5);
  const preLaunchGates = mission.gates.filter((g) => !['PLAR', 'PFAR'].includes(g.code));
  const gateScore = (preLaunchGates.filter((g) => g.passed).length / Math.max(1, preLaunchGates.length)) * 25;
  return Math.max(0, Math.min(100, Math.round(reqScore + riskScore + gateScore)));
}

export function computeFinalMissionScore(
  mission: MissionDesign,
  eng: SpacecraftEngineeringSummary,
  orb: OrbitalCalculationSummary
): MissionScoreBreakdown {
  const reqs = evaluateRequirements(mission, eng, orb);
  const sim = mission.simulation;

  if (sim.failed) {
    return {
      engineeringEfficiency: eng.isMassValid && eng.isPowerValid && orb.isDeltaVSufficient ? 55 : 25,
      scienceAchievement: Math.round(sim.scienceCollectedPct * 0.6),
      riskGovernance: Math.max(10, 60 - mission.risks.filter((r) => !r.mitigated && r.severity === 'Critical').length * 25),
      budgetDiscipline: eng.isBudgetValid ? 65 : 20,
      requirementsVerification: Math.round((reqs.filter((r) => r.status === 'Passed').length / reqs.length) * 80),
      totalScore: Math.round(sim.scienceCollectedPct * 0.35 + 20),
      grade: 'F',
      passedMission: false,
      summaryNotes: [
        `Mission terminated in ${sim.failedStage ?? 'flight'}: ${sim.failureReason ?? 'Critical anomaly'}`,
        'Review engineering margins, risk register mitigations, and operational decisions before retrying.',
      ],
    };
  }

  const massPerf = eng.isMassValid ? Math.min(100, 75 + Math.max(0, eng.massMarginPct) * 0.6) : 20;
  const powerPerf = eng.isPowerValid ? Math.min(100, 75 + Math.max(0, eng.powerMarginPct) * 0.5) : 20;
  const dvPerf = orb.isDeltaVSufficient ? Math.min(100, 80 + Math.min(20, orb.deltaVMarginKms * 8)) : 20;
  const engineeringEfficiency = Math.round((massPerf + powerPerf + dvPerf) / 3);

  const scienceAchievement = Math.round(
    Math.min(100, sim.scienceCollectedPct * 0.85 + Math.min(15, sim.objectivesCompleted.length * 5))
  );

  const unmitigatedCritical = mission.risks.filter((r) => !r.mitigated && r.severity === 'Critical').length;
  const mitigatedRatio = mission.risks.filter((r) => r.mitigated).length / Math.max(1, mission.risks.length);
  const riskGovernance = Math.max(0, Math.round(50 + mitigatedRatio * 50 - unmitigatedCritical * 30));

  const budgetDiscipline = eng.isBudgetValid
    ? Math.min(100, Math.round(70 + Math.min(30, eng.contingencyPct * 1.5)))
    : Math.max(10, Math.round(50 - Math.abs(eng.contingencyPct) * 2));

  const passedReqs = reqs.filter((r) => r.status === 'Passed').length;
  const requirementsVerification = Math.round((passedReqs / Math.max(1, reqs.length)) * 100);

  const totalScore = Math.round(
    engineeringEfficiency * 0.25 +
      scienceAchievement * 0.3 +
      riskGovernance * 0.15 +
      budgetDiscipline * 0.15 +
      requirementsVerification * 0.15
  );

  const passedMission =
    sim.completed &&
    !sim.failed &&
    scienceAchievement >= 60 &&
    eng.isMassValid &&
    eng.isPowerValid &&
    orb.isDeltaVSufficient;

  let grade: MissionScoreBreakdown['grade'] = 'F';
  if (passedMission) {
    if (totalScore >= 90) grade = 'S';
    else if (totalScore >= 80) grade = 'A';
    else if (totalScore >= 68) grade = 'B';
    else if (totalScore >= 55) grade = 'C';
  }

  const summaryNotes: string[] = [];
  if (passedMission) {
    summaryNotes.push(`Mission objectives achieved with ${sim.scienceCollectedPct}% science return.`);
    if (eng.contingencyPct >= 10) summaryNotes.push(`Strong budget discipline (${eng.contingencyPct}% reserve retained).`);
    if (unmitigatedCritical === 0) summaryNotes.push('All critical engineering risks were mitigated prior to operations.');
  } else {
    summaryNotes.push('Spacecraft reached End of Life, but mission science or engineering criteria fell below threshold.');
  }

  return {
    engineeringEfficiency,
    scienceAchievement,
    riskGovernance,
    budgetDiscipline,
    requirementsVerification,
    totalScore,
    grade,
    passedMission,
    summaryNotes,
  };
}

export function createMitigatedRisk(risk: RiskItem): RiskItem {
  const newProb = Math.max(1, risk.probability - 2);
  const newScore = newProb * risk.consequence;
  return {
    ...risk,
    mitigated: true,
    residualScore: newScore,
  };
}
