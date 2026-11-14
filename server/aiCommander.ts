import { GoogleGenAI } from '@google/genai';
import { computeOrbitalAnalysis } from '../src/engine/orbitalMechanics';
import { computeSpacecraftEngineering } from '../src/engine/spacecraftEngineering';
import type {
  AICommanderRecommendation,
  AICommanderReply,
  EnvironmentId,
  MissionDesign,
  SurvivalTelemetry,
} from '../src/engine/types';

export interface AICommanderRequestBody {
  question: string;
  mission: MissionDesign;
  telemetry?: SurvivalTelemetry | null;
  environment?: EnvironmentId;
  builtModulesCount?: number;
  activeHazards?: Array<{ type: string; severity: string; affectedSubsystem: string }>;
}

function buildRuleBasedRecommendations(
  mission: MissionDesign,
  telemetry?: SurvivalTelemetry | null,
  environment?: EnvironmentId,
  activeHazards?: Array<{ type: string; severity: string; affectedSubsystem: string }>
): { recs: AICommanderRecommendation[]; summaryLines: string[] } {
  const eng = computeSpacecraftEngineering(mission);
  const orb = computeOrbitalAnalysis(
    mission.destinationId,
    mission.orbitalPlan,
    mission.spacecraft,
    eng.wetMassKg,
    eng.dryMassKg
  );

  const recs: AICommanderRecommendation[] = [];
  const summaryLines: string[] = [];

  if (activeHazards && activeHazards.length > 0) {
    const topHazard = activeHazards[0];
    summaryLines.push(
      `⚠️ THREAT ADVISORY: Active ${topHazard.type} hazard (${topHazard.severity}). Subsystem at risk: ${topHazard.affectedSubsystem.toUpperCase()}.`
    );
    recs.push({
      id: 'rec-hazard-evade',
      title: `Evade Active ${topHazard.type} & Seek Shelter`,
      description: `Active threat to ${topHazard.affectedSubsystem}. Enter habitat, safe zone, or deploy protective posture.`,
      actionType: 'activate-emergency-o2',
    });
  }

  summaryLines.push(
    `Mission "${mission.name}" (${mission.missionType} -> ${mission.destinationId.toUpperCase()}) | Stage: ${mission.simulation.currentStage}.`
  );
  summaryLines.push(
    `Margins: Wet Mass ${eng.wetMassKg}/${eng.launcherCapacityKg} kg (${eng.isMassValid ? 'PASS' : 'OVER'}), Power ${eng.powerMarginW >= 0 ? '+' : ''}${eng.powerMarginW} W (${eng.isPowerValid ? 'PASS' : 'DEFICIT'}), Δv ${eng.availableDeltaVKms.toFixed(2)}/${orb.totalRequiredDeltaVKms.toFixed(2)} km/s (${orb.isDeltaVSufficient ? 'PASS' : 'LOW'}), Budget $${eng.totalEstimatedCostMUsd}/$${mission.budgetCapMUsd}M.`
  );

  if (!eng.isPowerValid) {
    recs.push({
      id: 'rec-power-upgrade',
      title: 'Switch Power Bus to Hybrid Solar-RTG',
      description: `Fixes ${eng.powerMarginW} W power deficit by upgrading spacecraft power source.`,
      actionType: 'switch-solars-or-rtg',
    });
  }

  const unmitigatedHigh = mission.risks.find((r) => !r.mitigated && r.score >= 12);
  if (unmitigatedHigh) {
    recs.push({
      id: `rec-risk-${unmitigatedHigh.id}`,
      title: `Mitigate Risk ${unmitigatedHigh.code}: ${unmitigatedHigh.title}`,
      description: `Reduces P×C score from ${unmitigatedHigh.score} to ${unmitigatedHigh.residualScore} ($${unmitigatedHigh.mitigationCostMUsd}M).`,
      actionType: 'mitigate-top-risk',
      payloadId: unmitigatedHigh.id,
    });
  }

  const frrPassed = Boolean(mission.gates.find((g) => g.code === 'FRR')?.passed);
  if (!frrPassed) {
    recs.push({
      id: 'rec-pass-gates',
      title: 'Verify Ready Pre-Launch Gates (through FRR)',
      description: 'Runs automated verification on MCR→FRR gates so spacecraft is cleared for launch.',
      actionType: 'pass-ready-gates',
    });
  }

  if (telemetry && (telemetry.oxygenPct < 40 || telemetry.co2Pct > 1.8)) {
    recs.push({
      id: 'rec-emerg-o2',
      title: 'Trigger Emergency O2 & CO2 Scrub Protocol',
      description: `Suit O2 is ${Math.round(telemetry.oxygenPct)}% and CO2 is ${telemetry.co2Pct.toFixed(1)}%.`,
      actionType: 'activate-emergency-o2',
    });
  }

  if (environment === 'moon' || environment === 'mars') {
    recs.push({
      id: 'rec-base-solar',
      title: `Deploy Roll-Out Solar Array Farm on ${environment.toUpperCase()}`,
      description: 'Adds +8.5 kW surface power budget for habitats, science labs, and suit fast-charge.',
      actionType: 'build-base-solar',
    });
  }

  if (!eng.isMassValid || !orb.isDeltaVSufficient) {
    recs.push({
      id: 'rec-nav-eng',
      title: 'Open Systems Engineering & Margin Review',
      description: 'Inspect mass/Δv blockers before committing to Flight Readiness Review.',
      actionType: 'navigate-engineering',
    });
  }

  return { recs, summaryLines };
}

function buildFallbackReply(req: AICommanderRequestBody): AICommanderReply {
  const { recs, summaryLines } = buildRuleBasedRecommendations(
    req.mission,
    req.telemetry,
    req.environment,
    req.activeHazards
  );
  const q = (req.question || '').toLowerCase();

  let advice = '';
  if (q.includes('launch') || q.includes('ready') || q.includes('gate')) {
    const frr = req.mission.gates.find((g) => g.code === 'FRR');
    advice = frr?.passed
      ? 'Flight Readiness Review (FRR) is PASSED. Your spacecraft is cleared for Cockpit 10-step Launch Countdown.'
      : `Launch clearance is currently held at FRR (${frr?.blockedReasons?.[0] ?? 'verify earlier gates & margins'}).`;
  } else if (q.includes('o2') || q.includes('oxygen') || q.includes('suit') || q.includes('surviv')) {
    advice = req.telemetry
      ? `Suit telemetry reports O2 ${Math.round(req.telemetry.oxygenPct)}%, CO2 ${req.telemetry.co2Pct.toFixed(2)}%, Battery ${Math.round(req.telemetry.batteryPct)}%, Integrity ${Math.round(req.telemetry.suitIntegrityPct)}%. ${req.telemetry.inSafeZone ? 'Crew is inside a pressurized Safe Zone.' : 'Return to a Habitat/Lander/Rover or deploy Emergency O2 if reserves drop below 35%.'}`
      : 'Suit survival telemetry is active inside 3D Field Operations.';
  } else if (q.includes('base') || q.includes('build') || q.includes('power')) {
    advice = `Surface outposts draw directly from your mission launch mass & power margin. Deploy a Solar Farm (+8.5 kW) before adding a Habitat (-3.2 kW) or Research Lab (-2.8 kW).`;
  } else {
    advice =
      recs.length > 0
        ? `Flight Director analysis identified ${recs.length} actionable engineering/ops step(s) below. Confirm any card to apply it.`
        : 'All primary engineering, orbital Δv, and readiness checks look nominal. Proceed to Mission Control or 3D Field Operations.';
  }

  return {
    reply: `${summaryLines[0]}\n${summaryLines[1]}\n\n${advice}`,
    source: 'local-flight-director',
    recommendations: recs.slice(0, 4),
  };
}

export async function handleAICommanderQuery(
  body: AICommanderRequestBody
): Promise<AICommanderReply> {
  const fallback = buildFallbackReply(body);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallback;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const eng = computeSpacecraftEngineering(body.mission);
    const orb = computeOrbitalAnalysis(
      body.mission.destinationId,
      body.mission.orbitalPlan,
      body.mission.spacecraft,
      eng.wetMassKg,
      eng.dryMassKg
    );

    const systemContext = [
      'You are the Orbital Command AI Flight Director assisting an aerospace mission player.',
      'Be concise (max 110 words), factual, and strictly grounded in the telemetry JSON provided.',
      'Write plain text with line breaks or simple "- " bullets only. Do NOT use markdown bold (**), headers (#), or backticks (`).',
      'Never invent paid upgrades or non-existent hardware. Distinguish simulated mission calculations from NASA Horizons.',
      `Active Mission: ${body.mission.name} (${body.mission.missionType} to ${body.mission.destinationId}), Stage: ${body.mission.simulation.currentStage}`,
      `Engineering: WetMass=${eng.wetMassKg}kg/${eng.launcherCapacityKg}kg, PowerMargin=${eng.powerMarginW}W, AvailDeltaV=${eng.availableDeltaVKms}km/s vs Req=${orb.totalRequiredDeltaVKms}km/s, Cost=$${eng.totalEstimatedCostMUsd}M/$${body.mission.budgetCapMUsd}M`,
      `UnmitigatedRisks=${body.mission.risks.filter((r) => !r.mitigated).length}, FRRPassed=${Boolean(body.mission.gates.find((g) => g.code === 'FRR')?.passed)}`,
      body.telemetry
        ? `SuitTelemetry: Env=${body.environment ?? 'unknown'}, O2=${body.telemetry.oxygenPct}%, CO2=${body.telemetry.co2Pct}%, Battery=${body.telemetry.batteryPct}%, Integrity=${body.telemetry.suitIntegrityPct}%, InSafeZone=${body.telemetry.inSafeZone}`
        : 'SuitTelemetry: Not deployed in EVA right now',
    ].join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `${systemContext}\n\nAstronaut Question: ${body.question}`,
    });

    const text = response.text?.trim();
    if (!text) return fallback;

    return {
      reply: text,
      source: 'gemini-api',
      recommendations: fallback.recommendations,
    };
  } catch (err) {
    console.warn('[AI Commander] Falling back to local Flight Director:', err instanceof Error ? err.message : err);
    return fallback;
  }
}
