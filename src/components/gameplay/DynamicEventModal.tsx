import { AlertOctagon, AlertTriangle, LifeBuoy, RotateCcw, ShieldAlert } from 'lucide-react';
import type { DynamicEventChoice, DynamicWorldEvent } from '../../engine/types';
import type { FailureExplanation } from '../../gameplay/DamageSystem';

interface DynamicEventModalProps {
  activeEvent: DynamicWorldEvent | null;
  failure: FailureExplanation | null;
  onSelectEventChoice: (choice: DynamicEventChoice) => void;
  onRecoverFromFailure: (mode: 'rescue-airlock' | 'emergency-o2' | 'restart') => void;
}

export function DynamicEventModal({
  activeEvent,
  failure,
  onSelectEventChoice,
  onRecoverFromFailure,
}: DynamicEventModalProps) {
  if (!activeEvent && !failure) return null;

  if (failure) {
    return (
      <div className="fixed inset-0 z-50 bg-[#050811]/90 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-[#0d1424] border border-rose-500 rounded-xl p-6 space-y-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-7 h-7 text-rose-400 shrink-0" />
            <div>
              <div className="text-[11px] font-mono text-rose-300 uppercase">Crew Survival Alert</div>
              <h2 className="font-display text-xl font-bold text-white mt-0.5">{failure.title}</h2>
            </div>
          </div>

          <div className="p-3.5 rounded bg-rose-950/50 border border-rose-800/70 text-xs text-rose-100 leading-relaxed space-y-2">
            <p>
              <strong>Root Cause:</strong> {failure.cause}
            </p>
            <p className="text-amber-200">
              <strong>Recovery Guidance:</strong> {failure.recoveryHint}
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-1 text-xs">
            <button
              type="button"
              onClick={() => onRecoverFromFailure('rescue-airlock')}
              className="w-full py-2.5 px-4 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold inline-flex items-center justify-center gap-2"
            >
              <LifeBuoy className="w-4 h-4" />
              Deploy Rescue Beacon &amp; Medevac to Airlock Safe Zone
            </button>
            <button
              type="button"
              onClick={() => onRecoverFromFailure('emergency-o2')}
              className="w-full py-2.5 px-4 rounded bg-amber-500/20 border border-amber-400 text-amber-200 font-semibold hover:bg-amber-500/30"
            >
              Purge Reserve Emergency O2 &amp; Patch Suit Seal
            </button>
            <button
              type="button"
              onClick={() => onRecoverFromFailure('restart')}
              className="w-full py-2 px-4 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:border-slate-500 inline-flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restart Field Operation
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeEvent) return null;

  return (
    <div className="fixed inset-0 z-40 bg-[#050811]/78 flex items-center justify-center p-4">
      <div
        className={`w-full max-w-xl bg-[#0d1424] rounded-xl p-6 space-y-4 shadow-2xl border ${
          activeEvent.severity === 'critical'
            ? 'border-rose-500'
            : activeEvent.severity === 'caution'
              ? 'border-amber-500'
              : 'border-cyan-500'
        }`}
      >
        <div className="flex items-start gap-3">
          {activeEvent.severity === 'critical' ? (
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
          )}
          <div>
            <div className="text-[11px] font-mono text-cyan-300 uppercase">
              Dynamic Mission Anomaly · {activeEvent.environment.toUpperCase()}
            </div>
            <h2 className="font-display text-xl font-bold text-white mt-0.5">{activeEvent.title}</h2>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed bg-[#070b14] border border-slate-800 rounded p-3">
          {activeEvent.cause}
        </p>

        <div className="space-y-2.5">
          {activeEvent.choices.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectEventChoice(c)}
              className="w-full text-left p-3.5 rounded-lg bg-[#070b14] hover:bg-slate-900 border border-slate-700 hover:border-cyan-400 transition-colors"
            >
              <div className="text-xs font-semibold text-white">{c.label}</div>
              <div className="text-[11px] font-mono text-cyan-300 mt-0.5">{c.effectSummary}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
