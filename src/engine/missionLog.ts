import type {
  MissionEventLog,
  MissionLogCategory,
  OrbitalCalculationSummary,
  SimulationStage,
  SpacecraftEngineeringSummary,
} from './types';

export const MAX_MISSION_LOGS = 120;

export function inferLogCategory(log: MissionEventLog): MissionLogCategory {
  if (log.category) return log.category;
  if (log.severity === 'critical' || log.severity === 'caution') return 'telemetry';
  const titleLower = log.title.toLowerCase();
  if (
    titleLower.includes('gate') ||
    titleLower.includes('mitigat') ||
    titleLower.includes('milestone') ||
    titleLower.includes('verified') ||
    titleLower.includes('completed') ||
    titleLower.includes('adopted')
  ) {
    return 'milestone';
  }
  return 'event';
}

export function createMissionLogEntry(params: {
  stage: SimulationStage;
  category: MissionLogCategory;
  title: string;
  detail: string;
  severity: MissionEventLog['severity'];
  decisionMade?: string;
  metricSnapshot?: string;
  timestamp?: string;
}): MissionEventLog {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: params.timestamp ?? new Date().toISOString(),
    stage: params.stage,
    category: params.category,
    title: params.title,
    detail: params.detail,
    severity: params.severity,
    decisionMade: params.decisionMade,
    metricSnapshot: params.metricSnapshot,
  };
}

export function appendMissionLogs(
  existing: MissionEventLog[],
  incoming: MissionEventLog[]
): MissionEventLog[] {
  if (incoming.length === 0) return existing;
  const next = [...existing];
  for (const entry of incoming) {
    const last = next[next.length - 1];
    if (
      last &&
      last.title === entry.title &&
      last.stage === entry.stage &&
      last.severity === entry.severity &&
      last.detail === entry.detail
    ) {
      continue;
    }
    next.push(entry);
  }
  if (next.length > MAX_MISSION_LOGS) {
    return next.slice(next.length - MAX_MISSION_LOGS);
  }
  return next;
}

export function detectEngineeringTelemetryAlerts(
  prevEng: SpacecraftEngineeringSummary,
  prevOrb: OrbitalCalculationSummary,
  nextEng: SpacecraftEngineeringSummary,
  nextOrb: OrbitalCalculationSummary,
  stage: SimulationStage
): MissionEventLog[] {
  const alerts: MissionEventLog[] = [];

  if (prevEng.isMassValid && !nextEng.isMassValid) {
    alerts.push(
      createMissionLogEntry({
        stage,
        category: 'telemetry',
        severity: 'critical',
        title: 'Mass Exceeds Launcher Capacity',
        detail: `Wet mass (${nextEng.wetMassKg.toLocaleString()} kg) exceeds vehicle limit (${nextEng.launcherCapacityKg.toLocaleString()} kg).`,
        metricSnapshot: `${nextEng.massMarginKg} kg margin`,
      })
    );
  } else if (!prevEng.isMassValid && nextEng.isMassValid) {
    alerts.push(
      createMissionLogEntry({
        stage,
        category: 'telemetry',
        severity: 'nominal',
        title: 'Launcher Mass Margin Restored',
        detail: `Spacecraft wet mass (${nextEng.wetMassKg.toLocaleString()} kg) is back within payload capacity.`,
        metricSnapshot: `+${nextEng.massMarginKg} kg`,
      })
    );
  }

  if (prevEng.isPowerValid && !nextEng.isPowerValid) {
    alerts.push(
      createMissionLogEntry({
        stage,
        category: 'telemetry',
        severity: 'critical',
        title: 'Power / Eclipse Margin Deficit',
        detail: `Generated power (${nextEng.powerGeneratedW} W) or eclipse endurance (${nextEng.eclipseCapacityHours}h) is below operational minimum.`,
        metricSnapshot: `${nextEng.powerMarginW} W`,
      })
    );
  } else if (!prevEng.isPowerValid && nextEng.isPowerValid) {
    alerts.push(
      createMissionLogEntry({
        stage,
        category: 'telemetry',
        severity: 'nominal',
        title: 'Power & Eclipse Margin Nominal',
        detail: `Bus power balance restored (${nextEng.powerGeneratedW} W gen vs ${nextEng.averagePowerDrawW} W load).`,
        metricSnapshot: `+${nextEng.powerMarginPct}%`,
      })
    );
  } else if (
    prevEng.powerMarginPct >= 15 &&
    nextEng.powerMarginPct < 15 &&
    nextEng.isPowerValid
  ) {
    alerts.push(
      createMissionLogEntry({
        stage,
        category: 'telemetry',
        severity: 'caution',
        title: 'Low Power Reserve Warning',
        detail: `Power margin dropped to +${nextEng.powerMarginPct}% (<15%). Peak payload overdrive risks bus brownout.`,
        metricSnapshot: `+${nextEng.powerMarginPct}% margin`,
      })
    );
  }

  if (prevOrb.isDeltaVSufficient && !nextOrb.isDeltaVSufficient) {
    alerts.push(
      createMissionLogEntry({
        stage,
        category: 'telemetry',
        severity: 'critical',
        title: 'Propellant Δv Deficit Alert',
        detail: `Available Δv (${nextEng.availableDeltaVKms} km/s) fell below required transfer budget (${nextOrb.totalRequiredDeltaVKms} km/s).`,
        metricSnapshot: `${nextOrb.deltaVMarginKms} km/s`,
      })
    );
  } else if (!prevOrb.isDeltaVSufficient && nextOrb.isDeltaVSufficient) {
    alerts.push(
      createMissionLogEntry({
        stage,
        category: 'telemetry',
        severity: 'nominal',
        title: 'Propellant Δv Budget Nominal',
        detail: `Available Δv (${nextEng.availableDeltaVKms} km/s) satisfies mission trajectory requirement.`,
        metricSnapshot: `+${nextOrb.deltaVMarginKms} km/s`,
      })
    );
  }

  if (prevEng.isBudgetValid && !nextEng.isBudgetValid) {
    alerts.push(
      createMissionLogEntry({
        stage,
        category: 'telemetry',
        severity: 'caution',
        title: 'Mission Budget Cap Exceeded',
        detail: `Total estimated cost ($${nextEng.totalEstimatedCostMUsd}M) exceeds cap by $${Math.abs(nextEng.budgetRemainingMUsd).toFixed(1)}M.`,
        metricSnapshot: `$${nextEng.totalEstimatedCostMUsd}M`,
      })
    );
  } else if (!prevEng.isBudgetValid && nextEng.isBudgetValid) {
    alerts.push(
      createMissionLogEntry({
        stage,
        category: 'telemetry',
        severity: 'nominal',
        title: 'Budget Compliance Restored',
        detail: `Estimated mission cost ($${nextEng.totalEstimatedCostMUsd}M) returned within allocated cap.`,
        metricSnapshot: `$${nextEng.budgetRemainingMUsd}M reserve`,
      })
    );
  }

  return alerts;
}

export function filterMissionLogs(
  logs: MissionEventLog[],
  categoryFilter: 'all' | MissionLogCategory,
  searchQuery: string
): MissionEventLog[] {
  const q = searchQuery.trim().toLowerCase();
  return logs.filter((entry) => {
    const cat = inferLogCategory(entry);
    if (categoryFilter !== 'all' && cat !== categoryFilter) {
      return false;
    }
    if (!q) return true;
    return (
      entry.title.toLowerCase().includes(q) ||
      entry.detail.toLowerCase().includes(q) ||
      entry.stage.toLowerCase().includes(q) ||
      (entry.metricSnapshot?.toLowerCase().includes(q) ?? false)
    );
  });
}

export function summarizeMissionLogs(logs: MissionEventLog[]): {
  total: number;
  events: number;
  telemetry: number;
  milestones: number;
  activeAlerts: number;
} {
  let events = 0;
  let telemetry = 0;
  let milestones = 0;
  let activeAlerts = 0;

  for (const log of logs) {
    const cat = inferLogCategory(log);
    if (cat === 'event') events++;
    if (cat === 'telemetry') telemetry++;
    if (cat === 'milestone') milestones++;
    if (log.severity === 'critical' || log.severity === 'caution') activeAlerts++;
  }

  return {
    total: logs.length,
    events,
    telemetry,
    milestones,
    activeAlerts,
  };
}
