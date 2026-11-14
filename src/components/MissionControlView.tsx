import { useEffect, useState } from 'react';
import { AlertOctagon, ArrowRight, Bot, CheckCircle2, RotateCcw, Rocket } from 'lucide-react';
import { SIMULATION_STAGES } from '../engine/missionSimulation';
import { useMissionStore } from '../store/useMissionStore';
import { AICommanderDrawer } from './gameplay/AICommanderDrawer';
import { SolarSystemViewport3D } from './three/SolarSystemViewport3D';

export function MissionControlView() {
  const [aiOpen, setAiOpen] = useState(false);
  const mission = useMissionStore((s) => s.mission);
  const advanceSimulationStage = useMissionStore((s) => s.advanceSimulationStage);
  const startLaunchSequence = useMissionStore((s) => s.startLaunchSequence);
  const finishLaunchSequence = useMissionStore((s) => s.finishLaunchSequence);
  const executeSimulationDecision = useMissionStore((s) => s.executeSimulationDecision);
  const retryFailedStage = useMissionStore((s) => s.retryFailedStage);
  const restartFullCampaignMission = useMissionStore((s) => s.restartFullCampaignMission);
  const setActiveView = useMissionStore((s) => s.setActiveView);
  const squad = useMissionStore((s) => s.squad);
  const myMemberId = useMissionStore((s) => s.myMemberId);

  const sim = mission.simulation;
  const stageIdx = SIMULATION_STAGES.indexOf(sim.currentStage);
  const isLeaderOrSolo = !squad || squad.leaderId === myMemberId;

  // Countdown timer during Launch Liftoff animation
  useEffect(() => {
    if (!sim.isLaunching) return;
    const timer = window.setTimeout(() => {
      finishLaunchSequence();
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [sim.isLaunching, finishLaunchSequence]);

  const progressFor3D =
    sim.currentStage === 'Launch'
      ? 0.04
      : sim.currentStage === 'Cruise'
        ? 0.55
        : sim.currentStage === 'Operations' || sim.currentStage === 'End of Life'
          ? 0.96
          : 0.01;

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Mission Control Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {mission.name} · Stage {stageIdx + 1} of {SIMULATION_STAGES.length}: {sim.currentStage}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="px-3.5 py-2 rounded bg-cyan-500/15 border border-cyan-400/60 hover:bg-cyan-500/25 text-cyan-200 font-semibold text-xs inline-flex items-center gap-1.5"
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            AI Flight Director
          </button>
          <button
            type="button"
            onClick={() => setActiveView('play')}
            className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5"
          >
            <Rocket className="w-4 h-4" />
            Deploy 3D Astronaut Ops
          </button>
          {sim.completed && (
            <button
              type="button"
              onClick={() => setActiveView('results')}
              className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              View Mission Results Report
            </button>
          )}
          <button
            type="button"
            onClick={restartFullCampaignMission}
            className="px-3.5 py-2 rounded bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs text-slate-300"
          >
            Reset Mission
          </button>
        </div>
      </div>

      {/* Stage Timeline Strip */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
        {SIMULATION_STAGES.map((st, idx) => {
          const isCurrent = st === sim.currentStage;
          const isDone = idx < stageIdx || (sim.completed && idx === SIMULATION_STAGES.length - 1);
          return (
            <div
              key={st}
              className={`px-3 py-2 rounded border text-xs ${
                isCurrent
                  ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 font-semibold'
                  : isDone
                    ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                    : 'bg-[#0d1424] border-slate-800 text-slate-500'
              }`}
            >
              <div className="text-[10px] font-mono">0{idx + 1}</div>
              <div className="truncate">{st}</div>
            </div>
          );
        })}
      </div>

      {/* Main Split: 3D Telemetry + Flight Operations Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          <SolarSystemViewport3D
            mission={mission}
            heightClass="h-[430px]"
            progressOverride={progressFor3D}
          />

          {/* Live Spacecraft Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-[#0d1424] border border-slate-800 rounded-lg p-4 text-xs font-mono tabular-nums">
            <div>
              <div className="text-[10px] text-slate-400">MET (DAYS)</div>
              <div className="text-base font-semibold text-white mt-0.5">T+{sim.missionElapsedDays}d</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">PROPELLANT</div>
              <div className={`text-base font-semibold mt-0.5 ${sim.fuelRemainingPct > 20 ? 'text-cyan-300' : 'text-rose-400'}`}>
                {sim.fuelRemainingPct}%
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">BATTERY</div>
              <div className={`text-base font-semibold mt-0.5 ${sim.batteryChargePct > 25 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {sim.batteryChargePct}%
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">COMMS LINK</div>
              <div className="text-base font-semibold text-white mt-0.5">{sim.commsLinkPct}%</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">SCIENCE</div>
              <div className="text-base font-semibold text-amber-300 mt-0.5">{sim.scienceCollectedPct}%</div>
            </div>
          </div>
        </div>

        {/* Operations Console */}
        <div className="lg:col-span-5 space-y-4">
          {/* Failure Recovery Panel */}
          {sim.failed && (
            <div className="bg-rose-950/70 border border-rose-700 rounded-lg p-5 space-y-4">
              <div className="flex items-start gap-3">
                <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0" />
                <div>
                  <h2 className="font-display text-lg font-bold text-white">
                    Mission Anomaly in {sim.failedStage}
                  </h2>
                  <p className="text-xs text-rose-200 mt-1 leading-relaxed">{sim.failureReason}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={retryFailedStage}
                  className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry {sim.failedStage} Stage
                </button>
                <button
                  type="button"
                  onClick={restartFullCampaignMission}
                  className="px-4 py-2 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs hover:border-slate-500"
                >
                  Full Mission Restart
                </button>
              </div>
            </div>
          )}

          {/* Active Stage Event Decision */}
          {!sim.failed && sim.activeEvent && (
            <div className="bg-[#101c33] border border-cyan-500/50 rounded-lg p-5 space-y-4">
              <div>
                <div className="text-xs font-mono text-cyan-300">{sim.activeEvent.stage} Flight Event</div>
                <h2 className="font-display text-lg font-semibold text-white mt-1">{sim.activeEvent.title}</h2>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{sim.activeEvent.prompt}</p>
              </div>
              <div className="space-y-2.5">
                {sim.activeEvent.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => executeSimulationDecision(opt)}
                    className="w-full text-left p-3.5 rounded bg-[#070b14] hover:bg-slate-900 border border-slate-700 hover:border-cyan-400 transition-colors"
                  >
                    <div className="text-xs font-semibold text-white">{opt.label}</div>
                    <div className="text-[11px] text-cyan-300 mt-0.5">{opt.effectSummary}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stage Progression Controls */}
          {!sim.failed && !sim.activeEvent && !sim.completed && (
            <div className="bg-[#0d1424] border border-slate-800 rounded-lg p-5 space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-white">
                  Current Stage: {sim.currentStage}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {sim.isLaunching
                    ? sim.launchSequenceStep
                    : stageIdx < 3
                      ? 'Complete design & engineering reviews in Design / Systems Eng, then advance toward Launch.'
                      : stageIdx === 3
                        ? 'Testing phase active. Ensure FRR gate is passed in Systems Engineering before initiating Launch.'
                        : 'Stage checks complete. Authorize transition to next mission phase.'}
                </p>
              </div>

              {!isLeaderOrSolo && (
                <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/50 p-3 rounded">
                  Only the Squad Leader (Mission Commander) can authorize stage advancement.
                </div>
              )}

              {sim.isLaunching ? (
                <div className="p-4 rounded bg-[#070b14] border border-amber-500/40 text-xs font-mono text-amber-300">
                  LIFTOFF IN PROGRESS · Staging &amp; Orbital Insertion telemetry acquiring...
                </div>
              ) : sim.currentStage === 'Testing' ? (
                <button
                  type="button"
                  disabled={!isLeaderOrSolo}
                  onClick={startLaunchSequence}
                  className="w-full py-3 px-4 rounded bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Rocket className="w-4 h-4" />
                  Initiate Launch Countdown &amp; Liftoff
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!isLeaderOrSolo}
                  onClick={() => advanceSimulationStage()}
                  className="w-full py-3 px-4 rounded bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Advance to Next Stage</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Completed Summary Box */}
          {sim.completed && !sim.failed && (
            <div className="bg-emerald-950/50 border border-emerald-600/50 rounded-lg p-5 space-y-3">
              <h2 className="font-display text-lg font-bold text-white">
                End of Life Closeout Complete ({sim.endOfLifeOption})
              </h2>
              <p className="text-xs text-emerald-200">
                Mission timeline complete. Open the Mission Results Report to evaluate final criteria and score.
              </p>
              <button
                type="button"
                onClick={() => setActiveView('results')}
                className="w-full py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs"
              >
                Open Mission Evaluation Report
              </button>
            </div>
          )}

          {/* Flight Event Log */}
          <div className="bg-[#0d1424] border border-slate-800 rounded-lg p-4 space-y-2.5">
            <h3 className="font-display text-sm font-semibold text-white">Flight Director Event Log</h3>
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {[...sim.logs].reverse().map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded bg-[#070b14] border border-slate-800/80 text-xs space-y-0.5"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span
                      className={
                        log.severity === 'critical'
                          ? 'text-rose-400'
                          : log.severity === 'caution'
                            ? 'text-amber-300'
                            : 'text-cyan-300'
                      }
                    >
                      {log.stage}
                    </span>
                    <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="font-medium text-slate-100">{log.title}</div>
                  <div className="text-slate-400">{log.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <AICommanderDrawer open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
