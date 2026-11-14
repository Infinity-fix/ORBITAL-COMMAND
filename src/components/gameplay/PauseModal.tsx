import { CheckCircle2, Circle, LogOut, Play, RotateCcw, Sliders } from 'lucide-react';
import type { GameplaySettings, MissionObjectiveStep } from '../../engine/types';
import { formatKeyCodeLabel } from '../../gameplay/GameplayStateManager';

interface PauseModalProps {
  missionTitle: string;
  objectives: MissionObjectiveStep[];
  settings: GameplaySettings;
  soundEnabled: boolean;
  onUpdateSettings: (patch: Partial<GameplaySettings>) => void;
  onToggleSound: (enabled: boolean) => void;
  onResume: () => void;
  onRestart: () => void;
  onExitToMenu: () => void;
}

export function PauseModal({
  missionTitle,
  objectives,
  settings,
  soundEnabled,
  onUpdateSettings,
  onToggleSound,
  onResume,
  onRestart,
  onExitToMenu,
}: PauseModalProps) {
  const kb = settings.keyBindings;

  return (
    <div className="fixed inset-0 z-50 bg-[#050811]/88 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#0d1424] border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Mission Paused</h2>
            <p className="text-xs text-slate-400">{missionTitle}</p>
          </div>
          <button
            type="button"
            onClick={onResume}
            className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            Resume [Esc]
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Mission Objectives Checklist */}
          <div className="space-y-3">
            <h3 className="font-display text-sm font-semibold text-white">
              Mission Objectives ({objectives.filter((o) => o.completed).length}/{objectives.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {objectives.map((obj) => (
                <div
                  key={obj.id}
                  className={`p-2.5 rounded border flex items-start gap-2 ${
                    obj.completed
                      ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-200'
                      : 'bg-[#070b14] border-slate-800 text-slate-300'
                  }`}
                >
                  {obj.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold">
                      {obj.order}. {obj.title}
                    </div>
                    <div className="text-[11px] text-slate-400">{obj.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Camera, Controls & HUD Preferences */}
          <div className="space-y-4">
            <h3 className="font-display text-sm font-semibold text-white flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Camera, Touch &amp; HUD Settings
            </h3>

            <label className="block space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Camera Sensitivity</span>
                <span className="font-mono text-cyan-300">{settings.cameraSensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.3}
                max={2.5}
                step={0.1}
                value={settings.cameraSensitivity}
                onChange={(e) => onUpdateSettings({ cameraSensitivity: Number(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Third-Person Camera Distance</span>
                <span className="font-mono text-cyan-300">{settings.cameraDistance.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min={3.0}
                max={9.0}
                step={0.2}
                value={settings.cameraDistance}
                onChange={(e) => onUpdateSettings({ cameraDistance: Number(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </label>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.mobileLeftHanded}
                  onChange={(e) => onUpdateSettings({ mobileLeftHanded: e.target.checked })}
                  className="accent-cyan-400"
                />
                <span>Left-Handed Mobile Touch Layout</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.showTouchControls === 'always'}
                  onChange={(e) =>
                    onUpdateSettings({ showTouchControls: e.target.checked ? 'always' : 'auto' })
                  }
                  className="accent-cyan-400"
                />
                <span>Always Display On-Screen Touch Controls</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.hudShowTelemetry}
                  onChange={(e) => onUpdateSettings({ hudShowTelemetry: e.target.checked })}
                  className="accent-cyan-400"
                />
                <span>Show Suit Telemetry HUD</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => onToggleSound(e.target.checked)}
                  className="accent-cyan-400"
                />
                <span>Procedural Flight &amp; Suit Audio SFX</span>
              </label>
            </div>

            <div className="p-3 rounded bg-[#070b14] border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1">
              <div className="text-slate-200 font-semibold">Active Key Bindings:</div>
              <div>
                Move: {formatKeyCodeLabel(kb.forward)}/{formatKeyCodeLabel(kb.left)}/{formatKeyCodeLabel(kb.backward)}/{formatKeyCodeLabel(kb.right)} · Jump: {formatKeyCodeLabel(kb.jump)} · Crouch: {formatKeyCodeLabel(kb.crouch)}
              </div>
              <div>
                Interact: {formatKeyCodeLabel(kb.interact)} · Tool: {formatKeyCodeLabel(kb.useEquipment)} · Refill: {formatKeyCodeLabel(kb.refillTool)} · Light: {formatKeyCodeLabel(kb.flashlight)} · Cam: {formatKeyCodeLabel(kb.toggleCamera)} · Shoulder: {formatKeyCodeLabel(kb.shoulderSwap)}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="px-4 py-2 rounded bg-slate-900 border border-slate-700 hover:border-amber-400 text-amber-200 text-xs inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restart Mission
          </button>
          <button
            type="button"
            onClick={onExitToMenu}
            className="px-4 py-2 rounded bg-rose-950/60 border border-rose-700 hover:border-rose-500 text-rose-200 text-xs inline-flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Exit to Field Ops Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
