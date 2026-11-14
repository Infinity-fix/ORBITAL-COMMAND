import { useState } from 'react';
import type { KeyBindings } from '../engine/types';
import { DEFAULT_KEY_BINDINGS, formatKeyCodeLabel } from '../gameplay/GameplayStateManager';
import { useMissionStore } from '../store/useMissionStore';
import { CloudSyncModal } from './CloudSyncModal';

const BINDING_LABELS: Array<{ key: keyof KeyBindings; label: string }> = [
  { key: 'forward', label: 'Move Forward' },
  { key: 'backward', label: 'Move Backward' },
  { key: 'left', label: 'Strafe Left' },
  { key: 'right', label: 'Strafe Right' },
  { key: 'sprint', label: 'Sprint / EVA Boost' },
  { key: 'jump', label: 'Jump / Zero-G Up' },
  { key: 'crouch', label: 'Crouch / Zero-G Down' },
  { key: 'interact', label: 'Interact / Enter Rover' },
  { key: 'useEquipment', label: 'Use Equipped Tool' },
  { key: 'refillTool', label: 'Refill / Scrub CO2' },
  { key: 'flashlight', label: 'Suit Flashlight' },
  { key: 'toggleCamera', label: 'Cycle Camera Mode' },
  { key: 'shoulderSwap', label: 'Swap Camera Shoulder' },
  { key: 'map', label: 'Navigation Map' },
  { key: 'inventory', label: 'Inventory & Science' },
  { key: 'objectives', label: 'Toggle Objectives' },
  { key: 'pause', label: 'Pause Menu' },
];

export function SettingsView() {
  const preferences = useMissionStore((s) => s.preferences);
  const updatePreferences = useMissionStore((s) => s.updatePreferences);
  const gameplaySettings = useMissionStore((s) => s.gameplaySettings);
  const updateGameplaySettings = useMissionStore((s) => s.updateGameplaySettings);
  const [capturingKey, setCapturingKey] = useState<keyof KeyBindings | null>(null);
  const [showCloudModal, setShowCloudModal] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="font-display text-2xl font-bold text-white">Settings &amp; Scientific Provenance</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Simulation preferences, configurable 3D controls, NASA data transparency disclosures, and educational scope
        </p>
      </div>

      <div className="bg-[#0d1424] border border-slate-800 rounded-lg p-6 space-y-4 text-xs">
        <h2 className="font-display text-base font-semibold text-white">Simulator Preferences</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-slate-300 block">Unit Display Convention</span>
            <select
              value={preferences.units}
              onChange={(e) => updatePreferences({ units: e.target.value as 'SI' | 'SI + AU' })}
              className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-white"
            >
              <option value="SI + AU">SI + Astronomical Units (km, kg, W, AU)</option>
              <option value="SI">Pure SI (km, kg, W)</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-slate-300 block">3D Viewport Quality</span>
            <select
              value={preferences.graphicsQuality}
              onChange={(e) => updatePreferences({ graphicsQuality: e.target.value as 'High' | 'Balanced' })}
              className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-white"
            >
              <option value="High">High (PBR + Environment Reflections)</option>
              <option value="Balanced">Balanced</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-slate-300 pt-2">
          <input
            type="checkbox"
            checked={preferences.showOrbitalAssumptions}
            onChange={(e) => updatePreferences({ showOrbitalAssumptions: e.target.checked })}
            className="accent-cyan-400"
          />
          <span>Always display orbital model assumptions and simplification notes</span>
        </label>
      </div>

      {/* Configurable 3D Camera, Mobile Touch & Key Bindings */}
      <div className="bg-[#0d1424] border border-slate-800 rounded-lg p-6 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-white">
            3D Controls, Camera &amp; Key Bindings
          </h2>
          <button
            type="button"
            onClick={() => updateGameplaySettings({ keyBindings: DEFAULT_KEY_BINDINGS })}
            className="px-3 py-1 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-200 font-mono text-[11px]"
          >
            Reset Defaults
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="space-y-1">
            <span className="text-slate-300 block">
              Camera Sensitivity ({gameplaySettings.cameraSensitivity.toFixed(1)}x)
            </span>
            <input
              type="range"
              min={0.3}
              max={2.5}
              step={0.1}
              value={gameplaySettings.cameraSensitivity}
              onChange={(e) => updateGameplaySettings({ cameraSensitivity: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </label>

          <label className="space-y-1">
            <span className="text-slate-300 block">Default Camera Shoulder</span>
            <select
              value={gameplaySettings.shoulderSide}
              onChange={(e) =>
                updateGameplaySettings({
                  shoulderSide: e.target.value as 'right' | 'left',
                })
              }
              className="w-full px-3 py-1.5 rounded bg-[#070b14] border border-slate-700 text-white"
            >
              <option value="right">Right Shoulder (Default)</option>
              <option value="left">Left Shoulder</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-slate-300 block">Touch Controls Visibility</span>
            <select
              value={gameplaySettings.showTouchControls}
              onChange={(e) =>
                updateGameplaySettings({
                  showTouchControls: e.target.value as 'auto' | 'always' | 'off',
                })
              }
              className="w-full px-3 py-1.5 rounded bg-[#070b14] border border-slate-700 text-white"
            >
              <option value="auto">Auto (Touch / Mobile Viewport)</option>
              <option value="always">Always On</option>
              <option value="off">Off</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-slate-300 pt-4">
            <input
              type="checkbox"
              checked={gameplaySettings.mobileLeftHanded}
              onChange={(e) => updateGameplaySettings({ mobileLeftHanded: e.target.checked })}
              className="accent-cyan-400"
            />
            <span>Left-Handed Touch Layout</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
          {BINDING_LABELS.map(({ key, label }) => {
            const isListening = capturingKey === key;
            return (
              <div
                key={key}
                className="flex items-center justify-between p-2.5 rounded bg-[#070b14] border border-slate-800"
              >
                <span className="text-slate-300">{label}</span>
                <button
                  type="button"
                  onClick={() => setCapturingKey(key)}
                  onKeyDown={(e) => {
                    if (!isListening) return;
                    e.preventDefault();
                    updateGameplaySettings({
                      keyBindings: {
                        ...gameplaySettings.keyBindings,
                        [key]: e.code,
                      },
                    });
                    setCapturingKey(null);
                  }}
                  className={`px-2.5 py-1 rounded font-mono text-[11px] border ${
                    isListening
                      ? 'bg-cyan-500 text-slate-950 border-white font-bold'
                      : 'bg-[#0d1424] border-slate-700 text-cyan-300 hover:border-cyan-400'
                  }`}
                >
                  {isListening ? 'Press Key...' : formatKeyCodeLabel(gameplaySettings.keyBindings[key])}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cloud Sync & Firebase Architecture */}
      <div className="bg-[#0d1424] border border-slate-800 rounded-lg p-6 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
              <span>Cloud Persistence &amp; Firebase</span>
            </h2>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Persistent user-isolated Firestore database and Google Authentication
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCloudModal(true)}
            className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors"
          >
            Open Cloud Sync
          </button>
        </div>

        <div className="p-3 rounded bg-[#070b14] border border-slate-800 text-slate-300 leading-relaxed text-[11px] space-y-2">
          <p>
            <strong>Storage Architecture:</strong> Stored per authenticated commander under <code className="text-cyan-300">users/&#123;userId&#125;</code> subcollections: <code className="text-slate-200">campaigns</code>, <code className="text-slate-200">missions</code>, <code className="text-slate-200">spacecraft</code>, <code className="text-slate-200">achievements</code>, and <code className="text-slate-200">settings</code>.
          </p>
          <p>
            <strong>Safe Fallback Mode:</strong> When Firebase credentials are unconfigured or offline, ORBITAL COMMAND seamlessly persists your missions, rovers, and career progress to local IndexedDB/localStorage and the local Express server database without data loss.
          </p>
        </div>
      </div>

      <CloudSyncModal isOpen={showCloudModal} onClose={() => setShowCloudModal(false)} />

      <div className="bg-[#0d1424] border border-slate-800 rounded-lg p-6 space-y-3 text-xs text-slate-300 leading-relaxed">
        <h2 className="font-display text-base font-semibold text-white">
          NASA Data Sources &amp; Educational Disclaimers
        </h2>
        <p>
          <strong>Live Ephemeris Integration:</strong> Celestial body state vectors are queried through the backend proxy from the official{' '}
          <span className="text-cyan-300">NASA/JPL Horizons System API</span> (<code className="font-mono">ssd.jpl.nasa.gov/api/horizons.api</code>). When network access is unavailable or rate-limited, the simulator explicitly labels fallback data as non-live curated reference elements.
        </p>
        <p>
          <strong>Systems Engineering Adaptation:</strong> Lifecycle phases (Pre-Phase A through Phase F) and review gates (MCR through PFAR) are an educational adaptation inspired by the NASA Systems Engineering Handbook. Completion in this game does not represent official NASA certification or flight-readiness validation.
        </p>
        <p>
          <strong>Orbital Mechanics Scope:</strong> Transfer Δv and transit duration estimates use idealized coplanar circular patched-conic Hohmann equations and Tsiolkovsky rocket staging. Perturbations, finite-burn losses, and synodic phasing windows are excluded.
        </p>
        <p>
          <strong>Zero Monetization:</strong> All spacecraft buses, payloads, launch vehicles, astronaut suits, equipment, and destinations are unlocked for educational play with zero paid purchases or pay-to-win mechanics.
        </p>
      </div>
    </div>
  );
}
