import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  Info,
  OctagonAlert,
  PanelRightClose,
  PanelRightOpen,
  ScrollText,
  Trash2,
} from 'lucide-react';
import { computeOrbitalAnalysis } from '../engine/orbitalMechanics';
import { computeSpacecraftEngineering } from '../engine/spacecraftEngineering';
import {
  filterMissionLogs,
  inferLogCategory,
  summarizeMissionLogs,
} from '../engine/missionLog';
import type { MissionEventLog, MissionLogCategory } from '../engine/types';
import { useMissionStore } from '../store/useMissionStore';

function SeverityBadge({ severity }: { severity: MissionEventLog['severity'] }) {
  if (severity === 'critical') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400">
        <OctagonAlert className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span>Critical</span>
      </span>
    );
  }
  if (severity === 'caution') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300">
        <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span>Caution</span>
      </span>
    );
  }
  if (severity === 'nominal') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
        <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span>Nominal</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-300">
      <Info className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>Info</span>
    </span>
  );
}

function categoryLabel(cat: MissionLogCategory): string {
  if (cat === 'milestone') return 'Milestone';
  if (cat === 'telemetry') return 'Telemetry';
  return 'Event';
}

export function MissionLogSidebar() {
  const mission = useMissionStore((s) => s.mission);
  const missionLogOpen = useMissionStore((s) => s.missionLogOpen);
  const setMissionLogOpen = useMissionStore((s) => s.setMissionLogOpen);
  const appendMissionLog = useMissionStore((s) => s.appendMissionLog);
  const clearMissionLogs = useMissionStore((s) => s.clearMissionLogs);

  const [categoryFilter, setCategoryFilter] = useState<'all' | MissionLogCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const eng = computeSpacecraftEngineering(mission);
  const orb = computeOrbitalAnalysis(
    mission.destinationId,
    mission.orbitalPlan,
    mission.spacecraft,
    eng.wetMassKg,
    eng.dryMassKg
  );

  const summary = useMemo(
    () => summarizeMissionLogs(mission.simulation.logs),
    [mission.simulation.logs]
  );

  const filteredLogs = useMemo(
    () => filterMissionLogs(mission.simulation.logs, categoryFilter, searchQuery).slice().reverse(),
    [mission.simulation.logs, categoryFilter, searchQuery]
  );

  const hasTelemetryFault =
    !eng.isMassValid ||
    !eng.isPowerValid ||
    !orb.isDeltaVSufficient ||
    !eng.isBudgetValid ||
    mission.simulation.failed;

  const handleAddNote = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = noteInput.trim();
    if (!trimmed) return;
    appendMissionLog({
      category: 'event',
      severity: 'info',
      title: 'Flight Director Note',
      detail: trimmed,
    });
    setNoteInput('');
  };

  if (!missionLogOpen) {
    return (
      <>
        {/* Desktop collapsed rail */}
        <aside
          aria-label="Mission Log Collapsed"
          data-testid="mission-log-sidebar-collapsed"
          className="hidden lg:flex w-12 shrink-0 border-l border-slate-800 bg-[#090d18] flex-col items-center py-4 gap-4 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]"
        >
          <button
            type="button"
            onClick={() => setMissionLogOpen(true)}
            aria-label="Expand Mission Log Sidebar"
            className="p-2 rounded border border-slate-700 bg-[#0f1628] text-cyan-300 hover:border-cyan-500/60 transition-colors"
            title="Expand Mission Log"
          >
            <PanelRightOpen className="w-4 h-4" aria-hidden="true" />
          </button>
          <div className="flex flex-col items-center gap-1 text-[11px] font-mono tabular-nums text-slate-400">
            <ScrollText className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span>{summary.total}</span>
          </div>
          {summary.activeAlerts > 0 && (
            <div
              className="text-[11px] font-mono tabular-nums text-amber-300"
              title={`${summary.activeAlerts} caution or critical log entries`}
            >
              {summary.activeAlerts}!
            </div>
          )}
        </aside>

        {/* Mobile collapsed bar */}
        <div className="lg:hidden border-t border-slate-800 bg-[#090d18] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <ScrollText className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            <span className="font-display font-semibold text-white">Mission Log</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-mono tabular-nums text-slate-400">{summary.total} entries</span>
          </div>
          <button
            type="button"
            onClick={() => setMissionLogOpen(true)}
            className="px-3 py-1.5 rounded border border-slate-700 bg-[#0f1628] text-xs font-medium text-cyan-300 hover:border-cyan-500/50 whitespace-nowrap"
          >
            Show Log
          </button>
        </div>
      </>
    );
  }

  return (
    <aside
      aria-label="Mission Log"
      data-testid="mission-log-sidebar"
      className="w-full lg:w-[340px] xl:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#090d18] flex flex-col lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]"
    >
      {/* Sidebar Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-sm font-bold text-white tracking-wide truncate">
              Mission Log
            </h2>
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5 flex items-center gap-1.5">
            <span>{summary.total} entries</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className={hasTelemetryFault ? 'text-rose-400' : 'text-emerald-400'}>
              {hasTelemetryFault ? 'Telemetry Alert' : 'Systems Nominal'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={clearMissionLogs}
            aria-label="Clear Mission Log"
            title="Clear log entries"
            className="p-1.5 rounded border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setMissionLogOpen(false)}
            aria-label="Collapse Mission Log Sidebar"
            title="Collapse Mission Log"
            className="p-1.5 rounded border border-slate-700 bg-[#0f1628] text-slate-300 hover:text-white hover:border-cyan-500/50 transition-colors"
          >
            <PanelRightClose className="w-4 h-4 hidden lg:block" aria-hidden="true" />
            <span className="lg:hidden text-xs px-1">Hide</span>
          </button>
        </div>
      </div>

      {/* Live Telemetry & Milestone Strip */}
      <div className="px-4 py-2.5 border-b border-slate-800 bg-[#070a12] grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums">
        <div>
          <div className="text-slate-500">Stage</div>
          <div className="text-slate-100 truncate font-medium mt-0.5">{mission.simulation.currentStage}</div>
        </div>
        <div>
          <div className="text-slate-500">Fuel / Batt</div>
          <div
            className={`font-medium mt-0.5 ${
              mission.simulation.fuelRemainingPct <= 20 || mission.simulation.batteryChargePct <= 25
                ? 'text-rose-400'
                : 'text-cyan-300'
            }`}
          >
            {mission.simulation.fuelRemainingPct}% / {mission.simulation.batteryChargePct}%
          </div>
        </div>
        <div>
          <div className="text-slate-500">Δv / Power</div>
          <div
            className={`font-medium mt-0.5 ${
              !orb.isDeltaVSufficient || !eng.isPowerValid ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {orb.deltaVMarginKms >= 0 ? `+${orb.deltaVMarginKms}` : orb.deltaVMarginKms} ·{' '}
            {eng.powerMarginPct >= 0 ? `+${eng.powerMarginPct}%` : `${eng.powerMarginPct}%`}
          </div>
        </div>
      </div>

      {/* Category Filter Segmented Bar + Search */}
      <div className="px-4 py-2.5 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-1 p-1 bg-[#070a12] border border-slate-800 rounded-md">
          {(
            [
              ['all', `All (${summary.total})`],
              ['event', `Events (${summary.events})`],
              ['telemetry', `Telemetry (${summary.telemetry})`],
              ['milestone', `Milestones (${summary.milestones})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategoryFilter(id)}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                categoryFilter === id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
              title={label}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          type="search"
          aria-label="Filter mission log entries"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter events, telemetry, milestones..."
          className="w-full px-2.5 py-1.5 rounded bg-[#070a12] border border-slate-800 focus:border-cyan-500/60 focus:outline-none text-xs text-slate-200 placeholder:text-slate-500"
        />
      </div>

      {/* Scrollable Log Timeline */}
      <div
        data-testid="mission-log-entries"
        className="flex-1 overflow-y-auto max-h-[420px] lg:max-h-none divide-y divide-slate-800/80"
      >
        {filteredLogs.length === 0 ? (
          <div className="p-6 text-center space-y-2">
            <p className="text-xs text-slate-400">No log entries match the active filter.</p>
            {(categoryFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('all');
                  setSearchQuery('');
                }}
                className="px-3 py-1 rounded border border-slate-700 text-xs text-cyan-300 hover:border-cyan-500/50"
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          filteredLogs.map((log) => {
            const cat = inferLogCategory(log);
            return (
              <article key={log.id} className="px-4 py-3 space-y-1 hover:bg-[#0c1220] transition-colors">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-400 font-mono tabular-nums min-w-0 truncate">
                    {cat === 'milestone' && (
                      <Flag className="w-3 h-3 text-cyan-400 shrink-0" aria-hidden="true" />
                    )}
                    <span className="text-slate-300">{categoryLabel(cat)}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="truncate">{log.stage}</span>
                  </div>
                  <SeverityBadge severity={log.severity} />
                </div>

                <div className="text-xs font-semibold text-slate-100 leading-snug">{log.title}</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{log.detail}</p>

                <div className="flex items-center justify-between gap-2 pt-0.5 text-[10px] font-mono tabular-nums text-slate-500">
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  {log.metricSnapshot && (
                    <span className="text-cyan-300/90">{log.metricSnapshot}</span>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Flight Director Quick Note Input */}
      <form onSubmit={handleAddNote} className="p-3 border-t border-slate-800 bg-[#070a12] flex gap-2">
        <input
          type="text"
          aria-label="Add flight director note"
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          placeholder="Add flight note to mission log..."
          className="flex-1 min-w-0 px-2.5 py-1.5 rounded bg-[#0d1424] border border-slate-700 focus:border-cyan-500/60 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0 transition-colors"
        >
          Log Note
        </button>
      </form>
    </aside>
  );
}
