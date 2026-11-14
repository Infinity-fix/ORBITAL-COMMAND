import { AlertTriangle, CheckCircle2, Flame, Power, Radio, Rocket, ShieldAlert, X } from 'lucide-react';
import { useState } from 'react';
import type { CockpitState, MissionDesign } from '../../engine/types';
import {
  evaluateLaunchReadinessForCockpit,
  LAUNCH_SEQUENCE_STEPS,
} from '../../gameplay/SpacecraftController';

interface CockpitModalProps {
  cockpit: CockpitState;
  mission: MissionDesign;
  trainingMode: boolean;
  onUpdateCockpit: (patch: Partial<CockpitState>) => void;
  onAdvanceLaunchStep: () => { ok: boolean; error?: string };
  onClose: () => void;
}

export function CockpitModal({
  cockpit,
  mission,
  trainingMode,
  onUpdateCockpit,
  onAdvanceLaunchStep,
  onClose,
}: CockpitModalProps) {
  const [diagReport, setDiagReport] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const readiness = evaluateLaunchReadinessForCockpit(mission);

  const handleAdvance = () => {
    const res = onAdvanceLaunchStep();
    if (!res.ok && res.error) {
      setStepError(res.error);
    } else {
      setStepError(null);
    }
  };

  const runDiagnostics = () => {
    setDiagReport(
      `RCS/Main Bus: ${cockpit.powerPct.toFixed(0)}% | Fuel: ${cockpit.fuelPct.toFixed(0)}% | Life Support: ${
        cockpit.lifeSupportNominal ? '101.3 kPa Nominal' : 'Caution'
      } | Mass Check: ${readiness.wetMassKg}/${readiness.launcherCapacityKg} kg | Δv: ${readiness.availableDeltaVKms.toFixed(
        2
      )}/${readiness.requiredDeltaVKms.toFixed(2)} km/s`
    );
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#050811]/88 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#0d1424] border border-cyan-500/40 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Rocket className="w-5 h-5 text-cyan-400" />
              Spacecraft Flight Deck &amp; Launch Operations Console
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {mission.name} · Stage: {mission.simulation.currentStage} · Orbit Alt {cockpit.altitudeKm} km · Vel{' '}
              {cockpit.velocityKms.toFixed(2)} km/s
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Cockpit Console"
            className="p-1.5 rounded border border-slate-700 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
          {/* Left: Manual Propulsion, Attitude & Subsystems */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-4 rounded-lg bg-[#070b14] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-white flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Propulsion &amp; Throttle Control
                </h3>
                <span
                  className={`font-mono text-[11px] ${
                    cockpit.emergencyShutdown
                      ? 'text-rose-400'
                      : cockpit.engineIgnited
                        ? 'text-amber-300'
                        : 'text-slate-400'
                  }`}
                >
                  {cockpit.emergencyShutdown ? 'SCRAM SHUTDOWN' : cockpit.engineIgnited ? 'IGNITED' : 'STANDBY'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateCockpit({
                      emergencyShutdown: false,
                      engineIgnited: !cockpit.engineIgnited,
                      throttlePct: !cockpit.engineIgnited ? Math.max(25, cockpit.throttlePct) : 0,
                    })
                  }
                  className={`px-3.5 py-2 rounded font-mono font-semibold ${
                    cockpit.engineIgnited
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                  }`}
                >
                  {cockpit.engineIgnited ? 'Shutdown Main Engine' : 'Ignite Main Engine'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateCockpit({
                      emergencyShutdown: true,
                      engineIgnited: false,
                      throttlePct: 0,
                    })
                  }
                  className="px-3 py-2 rounded bg-rose-950/80 border border-rose-500/70 text-rose-200 font-mono inline-flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Emergency Cutoff
                </button>
              </div>

              <label className="block space-y-1">
                <div className="flex justify-between font-mono text-[11px] text-slate-300">
                  <span>Engine Throttle</span>
                  <span>{cockpit.throttlePct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={cockpit.throttlePct}
                  onChange={(e) =>
                    onUpdateCockpit({
                      throttlePct: Number(e.target.value),
                      engineIgnited: Number(e.target.value) > 0 && !cockpit.emergencyShutdown,
                    })
                  }
                  className="w-full accent-cyan-400"
                />
              </label>

              <div className="space-y-1">
                <span className="text-slate-400 block font-mono text-[11px]">Attitude Autopilot Mode</span>
                <div className="grid grid-cols-4 gap-1.5 font-mono text-[11px]">
                  {(['prograde', 'retrograde', 'nadir', 'manual'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onUpdateCockpit({ attitudeMode: m })}
                      className={`py-1.5 rounded border uppercase ${
                        cockpit.attitudeMode === m
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                          : 'bg-[#0d1424] border-slate-700 text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subsystem Gauges & Actions */}
            <div className="p-4 rounded-lg bg-[#070b14] border border-slate-800 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
                <div>
                  <div className="text-[10px] text-slate-400">FUEL</div>
                  <div className="text-base font-bold text-cyan-300">{cockpit.fuelPct.toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">BUS POWER</div>
                  <div className="text-base font-bold text-emerald-300">{cockpit.powerPct.toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">COMMS</div>
                  <div className="text-sm font-bold text-white">
                    {cockpit.commsLocked ? 'Ka-LOCK' : 'STANDBY'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">DOCKING</div>
                  <div className="text-sm font-bold text-amber-300">
                    {cockpit.dockedToStation ? 'DOCKED' : 'FREE FLIGHT'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onUpdateCockpit({ commsLocked: !cockpit.commsLocked })}
                  className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-200 font-mono inline-flex items-center gap-1.5"
                >
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  {cockpit.commsLocked ? 'Cycle Relay Link' : 'Lock Comms Relay'}
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateCockpit({ dockedToStation: !cockpit.dockedToStation })}
                  className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-200 font-mono inline-flex items-center gap-1.5"
                >
                  <Power className="w-3.5 h-3.5 text-amber-400" />
                  {cockpit.dockedToStation ? 'Undock from Station' : 'Dock Adapter'}
                </button>
                <button
                  type="button"
                  onClick={runDiagnostics}
                  className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-emerald-400 text-emerald-300 font-mono"
                >
                  Run System Diagnostics
                </button>
              </div>
              {diagReport && (
                <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-700/50 font-mono text-[11px] text-emerald-200">
                  {diagReport}
                </div>
              )}
            </div>
          </div>

          {/* Right: Connected 10-Step Playable Launch Sequence */}
          <div className="lg:col-span-6 p-4 rounded-lg bg-[#070b14] border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-white">
                  10-Step Launch &amp; Orbital Insertion Sequence
                </h3>
                <span className="font-mono text-[11px] text-cyan-300">
                  Step {cockpit.launchStepIndex}/10
                </span>
              </div>

              {readiness.blockers.length > 0 && !trainingMode && (
                <div className="p-3 rounded bg-rose-950/60 border border-rose-500/60 text-rose-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Engineering Hold — Launch Blocked
                  </div>
                  {readiness.blockers.map((b, i) => (
                    <div key={i} className="text-[11px]">
                      • {b}
                    </div>
                  ))}
                </div>
              )}

              {readiness.warnings.length > 0 && (
                <div className="p-2.5 rounded bg-amber-950/40 border border-amber-600/50 text-amber-200 text-[11px]">
                  {readiness.warnings[0]}
                </div>
              )}

              {stepError && (
                <div className="p-2.5 rounded bg-rose-950/70 border border-rose-500 text-rose-200 font-mono text-[11px]">
                  HOLD: {stepError}
                </div>
              )}

              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {LAUNCH_SEQUENCE_STEPS.map((st) => {
                  const done = cockpit.launchStepIndex >= st.step;
                  const current = cockpit.launchStepIndex + 1 === st.step;
                  return (
                    <div
                      key={st.step}
                      className={`p-2.5 rounded border flex items-start justify-between gap-2 ${
                        done
                          ? 'bg-emerald-950/35 border-emerald-700/60 text-emerald-200'
                          : current
                            ? 'bg-cyan-500/15 border-cyan-400 text-white'
                            : 'bg-[#0d1424] border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>
                        <div className="font-mono text-[11px] font-bold">
                          {st.code} · {st.label}
                        </div>
                        <div className="text-[11px] opacity-85">{st.detail}</div>
                      </div>
                      {done && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-slate-400">
                {cockpit.launchCompleted
                  ? 'Orbital Insertion Achieved — Cleared for EVA/Surface Ops'
                  : trainingMode
                    ? 'Training Mode: Launch holds relaxed'
                    : 'Connected to Mission Design & FRR'}
              </span>
              <button
                type="button"
                disabled={cockpit.launchCompleted}
                onClick={handleAdvance}
                className="px-4 py-2.5 rounded bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold font-mono text-xs whitespace-nowrap"
              >
                {cockpit.launchCompleted
                  ? 'Orbit Achieved ✓'
                  : `Execute Step ${cockpit.launchStepIndex + 1}/10`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
