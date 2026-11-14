import { CheckCircle2, RotateCcw, Trophy, XCircle } from 'lucide-react';
import { computeOrbitalAnalysis } from '../engine/orbitalMechanics';
import { computeSpacecraftEngineering } from '../engine/spacecraftEngineering';
import { computeFinalMissionScore } from '../engine/systemsEngineering';
import { useMissionStore } from '../store/useMissionStore';

export function MissionResultsView() {
  const mission = useMissionStore((s) => s.mission);
  const restartFullCampaignMission = useMissionStore((s) => s.restartFullCampaignMission);
  const setActiveView = useMissionStore((s) => s.setActiveView);

  const eng = computeSpacecraftEngineering(mission);
  const orb = computeOrbitalAnalysis(
    mission.destinationId,
    mission.orbitalPlan,
    mission.spacecraft,
    eng.wetMassKg,
    eng.dryMassKg
  );
  const score = computeFinalMissionScore(mission, eng, orb);

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8 space-y-6">
      <div
        className={`rounded-lg border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${
          score.passedMission
            ? 'bg-[#0e1c2b] border-emerald-500/50'
            : 'bg-rose-950/40 border-rose-700/60'
        }`}
      >
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-medium">
            {score.passedMission ? (
              <span className="text-emerald-400 inline-flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Mission Success Criteria Verified
              </span>
            ) : (
              <span className="text-rose-400 inline-flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Mission Criteria Not Met
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl font-bold text-white">{mission.name} — Evaluation Report</h1>
          <p className="text-xs text-slate-300">{mission.primaryObjective}</p>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <div className="text-right">
            <div className="text-xs text-slate-400">FINAL SCORE</div>
            <div className="font-mono text-4xl font-bold text-white tabular-nums">{score.totalScore}</div>
          </div>
          <div className="w-16 h-16 rounded-lg border border-cyan-500/40 bg-[#070b14] flex flex-col items-center justify-center">
            <span className="text-[10px] text-slate-400">GRADE</span>
            <span className="font-display text-2xl font-bold text-cyan-300">{score.grade}</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {[
          ['Engineering Efficiency', score.engineeringEfficiency],
          ['Science Return', score.scienceAchievement],
          ['Risk Governance', score.riskGovernance],
          ['Budget Discipline', score.budgetDiscipline],
          ['Requirements Verified', score.requirementsVerification],
        ].map(([label, val]) => (
          <div key={label as string} className="bg-[#0d1424] border border-slate-800 rounded-lg p-4 space-y-2">
            <div className="text-xs text-slate-400">{label}</div>
            <div className="font-mono text-2xl font-bold text-white tabular-nums">{val}%</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0d1424] border border-slate-800 rounded-lg p-5 space-y-3">
          <h2 className="font-display text-base font-semibold text-white">Evaluation Findings</h2>
          <ul className="space-y-2 text-xs text-slate-300 list-disc pl-4">
            {score.summaryNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>

        <div className="bg-[#0d1424] border border-slate-800 rounded-lg p-5 space-y-3">
          <h2 className="font-display text-base font-semibold text-white">Mission Economics &amp; Telemetry</h2>
          <div className="space-y-1.5 text-xs font-mono tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Estimated Cost</span>
              <span className="text-white">${eng.totalEstimatedCostMUsd}M / ${mission.budgetCapMUsd}M</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Propellant Remaining</span>
              <span className="text-cyan-300">{mission.simulation.fuelRemainingPct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Science Objectives Completed</span>
              <span className="text-emerald-400">{mission.simulation.objectivesCompleted.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">End of Life Protocol</span>
              <span className="text-white">{mission.simulation.endOfLifeOption ?? 'Incomplete'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveView('campaign')}
          className="px-5 py-2.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-2"
        >
          <Trophy className="w-4 h-4" />
          View Campaign &amp; Achievements
        </button>
        <button
          type="button"
          onClick={restartFullCampaignMission}
          className="px-5 py-2.5 rounded bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 font-medium text-xs inline-flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Design Next Mission
        </button>
      </div>
    </div>
  );
}
