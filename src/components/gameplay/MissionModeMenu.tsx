import { Canvas, useFrame } from '@react-three/fiber';
import { CheckCircle2, Compass, Play, Rocket, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type {
  AstronautCustomization,
  AstronautSuitPreset,
  EnvironmentId,
  GameMode,
  PlayableMissionId,
} from '../../engine/types';
import { computeDesignBonusesForGameplay, SUIT_PRESETS } from '../../gameplay/GameplayStateManager';
import { PLAYABLE_MISSIONS } from '../../gameplay/MissionObjectiveManager';
import { useMissionStore } from '../../store/useMissionStore';
import { AstronautModel } from '../gameplay3d/AstronautModel';
import { detectSoftwareWebGL } from '../three/threeUtils';

const GAME_MODES: Array<{ id: GameMode; label: string; desc: string }> = [
  { id: 'career', label: 'Career Mode', desc: 'Story missions with campaign scoring & achievements' },
  { id: 'free-explore', label: 'Free Exploration', desc: 'Roam all 5 3D environments freely without time pressure' },
  { id: 'challenges', label: 'Mission Challenges', desc: 'Timed precision operations with efficiency speed bonus' },
  { id: 'coop', label: 'Squad Co-op', desc: 'Real-time 3D multiplayer exploration with your squad' },
  { id: 'training', label: 'Training Mode', desc: 'Guided objectives & extra control/EVA telemetry cues' },
  { id: 'sandbox', label: 'Sandbox Design', desc: 'Deploy directly into your active engineered mission world' },
];

const COLOR_SWATCHES = ['#e2e8f0', '#1e293b', '#334155', '#f8fafc', '#0f172a', '#cbd5e1'];
const ACCENT_SWATCHES = ['#f97316', '#38bdf8', '#10b981', '#f59e0b', '#a855f7', '#ef4444'];

function PreviewSpinner({ customization }: { customization: AstronautCustomization }) {
  const grpRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (grpRef.current) {
      grpRef.current.rotation.y += dt * 0.45;
    }
  });
  return (
    <group ref={grpRef} position={[0, -0.95, 0]}>
      <AstronautModel
        customization={customization}
        animState="idle"
        equippedItem="spectrometer"
        flashlightOn={false}
      />
    </group>
  );
}

interface MissionModeMenuProps {
  onLaunchMission: (params: {
    mode: GameMode;
    missionId: PlayableMissionId;
    startEnv: EnvironmentId;
  }) => void;
}

export function MissionModeMenu({ onLaunchMission }: MissionModeMenuProps) {
  const mission = useMissionStore((s) => s.mission);
  const selectedGameMode = useMissionStore((s) => s.selectedGameMode);
  const selectedPlayableMission = useMissionStore((s) => s.selectedPlayableMission);
  const setGameModeAndMission = useMissionStore((s) => s.setGameModeAndMission);
  const customization = useMissionStore((s) => s.astronautCustomization);
  const updateCustomization = useMissionStore((s) => s.updateAstronautCustomization);
  const completedMissions = useMissionStore((s) => s.completedPlayableMissions);
  const career = useMissionStore((s) => s.career);
  const squad = useMissionStore((s) => s.squad);
  const setActiveView = useMissionStore((s) => s.setActiveView);

  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);
  const bonuses = useMemo(() => computeDesignBonusesForGameplay(mission), [mission]);

  const [freeExploreEnv, setFreeExploreEnv] = useState<EnvironmentId>(bonuses.recommendedEnvironment);

  const activeMissionDef = PLAYABLE_MISSIONS[selectedPlayableMission];

  const handleSelectPreset = (preset: AstronautSuitPreset) => {
    const p = SUIT_PRESETS[preset];
    updateCustomization({
      suitPreset: preset,
      primaryColor: p.primaryColor,
      accentColor: p.accentColor,
      helmetStyle: p.helmetStyle,
      backpackStyle: p.backpackStyle,
    });
  };

const ENV_DEFAULT_MISSION: Record<EnvironmentId, PlayableMissionId> = {
  station: 'station-prep',
  spacecraft: 'launch-orbit',
  moon: 'lunar-explore',
  mars: 'mars-explore',
  'orbital-eva': 'eva-repair',
};

  const handleDeploy = () => {
    const targetEnv =
      selectedGameMode === 'free-explore'
        ? freeExploreEnv
        : selectedGameMode === 'sandbox'
          ? bonuses.recommendedEnvironment
          : activeMissionDef.startEnv;
    const targetMission =
      selectedGameMode === 'free-explore'
        ? ENV_DEFAULT_MISSION[freeExploreEnv]
        : selectedGameMode === 'sandbox'
          ? bonuses.recommendedPlayableMission
          : selectedPlayableMission;
    onLaunchMission({
      mode: selectedGameMode,
      missionId: targetMission,
      startEnv: targetEnv,
    });
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* Header & Spacecraft Design Connection Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            3D Field Operations &amp; EVA Deployment
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Third-person playable missions · Variable planetary gravity, drivable rovers, Zero-G EVA &amp; squad co-op
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded bg-[#0d1424] border border-slate-700 font-mono text-slate-200">
            Rank: <span className="text-amber-300">{career.rank}</span> ({career.xp} XP)
          </div>
          <div className="px-3 py-1.5 rounded bg-[#0d1424] border border-slate-700 font-mono text-slate-200">
            Active Bus: <span className="text-cyan-300">{mission.name}</span> · Power Eff{' '}
            <span className="text-emerald-300">{Math.round(bonuses.powerEfficiencyMultiplier * 100)}%</span>
          </div>
          {squad && (
            <div className="px-3 py-1.5 rounded bg-emerald-950/60 border border-emerald-700/60 font-mono text-emerald-200 inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Squad {squad.code} ({squad.members.filter((m) => m.online).length} online)
            </div>
          )}
        </div>
      </div>

      {/* Main Layout: Modes + Playable Missions (Left) | 3D Suit Customizer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          {/* Step 1: Game Mode Selector */}
          <section className="bg-[#0d1424] border border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              1. Select Operations Mode
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {GAME_MODES.map((m) => {
                const active = selectedGameMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setGameModeAndMission(m.id, selectedPlayableMission)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      active
                        ? 'bg-cyan-500/15 border-cyan-400 text-white'
                        : 'bg-[#070b14] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-xs font-semibold">{m.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{m.desc}</div>
                  </button>
                );
              })}
            </div>
            {selectedGameMode === 'coop' && !squad && (
              <div className="flex items-center justify-between gap-3 p-3 rounded bg-amber-950/40 border border-amber-700/50 text-xs text-amber-200">
                <span>Join or create a Squad Room first to synchronize 3D teammates in real time.</span>
                <button
                  type="button"
                  onClick={() => setActiveView('squad')}
                  className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-semibold whitespace-nowrap"
                >
                  Open Squad Lobby
                </button>
              </div>
            )}
          </section>

          {/* Step 2: Playable Missions or Free Exploration World */}
          <section className="bg-[#0d1424] border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
                <Rocket className="w-4 h-4 text-cyan-400" />
                {selectedGameMode === 'free-explore'
                  ? '2. Choose 3D Exploration Environment'
                  : '2. Select Playable Mission Scenario'}
              </h2>
              <span className="text-xs font-mono text-slate-400">
                {completedMissions.length}/5 Missions Completed
              </span>
            </div>

            {selectedGameMode === 'free-explore' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(
                  [
                    ['station', 'Orbital Space Station', '0.85 g · Corridors, Labs, Mission Control & Window'],
                    ['spacecraft', 'Spacecraft Interior', '0.80 g · Cockpit, Panels & Cargo Airlock'],
                    ['moon', 'Lunar South Pole', '0.165 g · Craters, Lander & Drivable Lunar Rover'],
                    ['mars', 'Jezero Crater, Mars', '0.38 g · Delta Outcrops, Habitat & Mars Rover'],
                    ['orbital-eva', 'Orbital Zero-G EVA', '0.00 g · 6-DOF Thrusters, Tether & Satellite Repair'],
                  ] as Array<[EnvironmentId, string, string]>
                ).map(([envId, label, desc]) => (
                  <button
                    key={envId}
                    type="button"
                    onClick={() => setFreeExploreEnv(envId)}
                    className={`text-left p-3.5 rounded-lg border transition-colors ${
                      freeExploreEnv === envId
                        ? 'bg-cyan-500/15 border-cyan-400'
                        : 'bg-[#070b14] border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-xs font-semibold text-white">{label}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{desc}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {(Object.keys(PLAYABLE_MISSIONS) as PlayableMissionId[]).map((id) => {
                  const def = PLAYABLE_MISSIONS[id];
                  const active = selectedPlayableMission === id;
                  const done = completedMissions.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setGameModeAndMission(selectedGameMode, id)}
                      className={`w-full text-left p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        active
                          ? 'bg-cyan-500/15 border-cyan-400'
                          : 'bg-[#070b14] border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{def.title}</span>
                          {done && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Cleared
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{def.subtitle}</p>
                      </div>
                      <div className="shrink-0 text-right font-mono text-[11px] space-y-0.5">
                        <div className="text-cyan-300 uppercase">{def.startEnv}</div>
                        <div className="text-slate-400">{def.difficultyLabel}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Engineering-to-Gameplay Readiness Bridge */}
          <section className="bg-[#0d1424] border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-sm font-semibold text-white">
                3. Engineering Readiness &amp; Field Constraints
              </h2>
              <button
                type="button"
                onClick={() => setActiveView('engineering')}
                className="text-[11px] font-mono text-cyan-300 hover:underline"
              >
                Adjust in Systems Engineering →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px] font-mono">
              <div className={`p-2 rounded border ${bonuses.massValid ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300' : 'bg-rose-950/40 border-rose-700/60 text-rose-300'}`}>
                <div className="text-[9px] text-slate-400">MASS BUDGET</div>
                <div>{bonuses.massValid ? 'PASS' : 'OVER CAP'}</div>
              </div>
              <div className={`p-2 rounded border ${bonuses.powerValid ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300' : 'bg-rose-950/40 border-rose-700/60 text-rose-300'}`}>
                <div className="text-[9px] text-slate-400">POWER BUS</div>
                <div>{bonuses.powerValid ? 'PASS' : 'DEFICIT'}</div>
              </div>
              <div className={`p-2 rounded border ${bonuses.deltaVValid ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300' : 'bg-rose-950/40 border-rose-700/60 text-rose-300'}`}>
                <div className="text-[9px] text-slate-400">DELTA-V</div>
                <div>{bonuses.deltaVValid ? 'PASS' : 'SHORT'}</div>
              </div>
              <div className={`p-2 rounded border ${bonuses.frrPassed ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300' : 'bg-amber-950/35 border-amber-700/50 text-amber-300'}`}>
                <div className="text-[9px] text-slate-400">FRR GATE</div>
                <div>{bonuses.frrPassed ? 'CLEARED' : 'PENDING'}</div>
              </div>
              <div className={`p-2 rounded border ${bonuses.criticalRiskCount === 0 ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300' : 'bg-amber-950/35 border-amber-700/50 text-amber-300'}`}>
                <div className="text-[9px] text-slate-400">CRIT RISKS</div>
                <div>{bonuses.criticalRiskCount} OPEN</div>
              </div>
              <div className="p-2 rounded border bg-[#070b14] border-slate-700 text-cyan-300">
                <div className="text-[9px] text-slate-400">BASE MASS CAP</div>
                <div>{bonuses.baseMassAllowanceKg} kg</div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Live 3D Astronaut Customizer & Deploy CTA */}
        <aside className="lg:col-span-4 bg-[#0d1424] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Astronaut Customizer
            </h2>
            <span className="text-[10px] font-mono text-emerald-400 inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Cosmetic Only
            </span>
          </div>

          {/* Live 3D Astronaut Preview Canvas */}
          <div className="w-full h-56 rounded-lg bg-[#050811] border border-slate-800 overflow-hidden">
            <Canvas
              dpr={isSoftwareGl ? 1 : [1, 1.5]}
              camera={{ position: [0, 0.35, 3.1], fov: 40 }}
              gl={{ antialias: !isSoftwareGl, powerPreference: 'high-performance' }}
            >
              <color attach="background" args={['#050811']} />
              <ambientLight intensity={0.75} />
              <directionalLight position={[3, 4, 4]} intensity={1.8} />
              <directionalLight position={[-3, 2, -2]} intensity={0.8} color="#38bdf8" />
              <PreviewSpinner customization={customization} />
            </Canvas>
          </div>

          {/* Customization Controls */}
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="block space-y-1">
                <span className="text-slate-300">Astronaut Callsign</span>
                <input
                  type="text"
                  maxLength={24}
                  value={customization.characterName}
                  onChange={(e) => updateCustomization({ characterName: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-[#070b14] border border-slate-700 text-white"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-slate-300">Suit Frame</span>
                <select
                  value={customization.characterArchetype ?? 'standard'}
                  onChange={(e) =>
                    updateCustomization({
                      characterArchetype: e.target.value as AstronautCustomization['characterArchetype'],
                    })
                  }
                  className="w-full px-3 py-1.5 rounded bg-[#070b14] border border-slate-700 text-white"
                >
                  <option value="standard">Standard Build</option>
                  <option value="slim">Slim Build</option>
                </select>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-slate-300">Spacesuit Preset</span>
              <select
                value={customization.suitPreset}
                onChange={(e) => handleSelectPreset(e.target.value as AstronautSuitPreset)}
                className="w-full px-3 py-1.5 rounded bg-[#070b14] border border-slate-700 text-white"
              >
                {(Object.keys(SUIT_PRESETS) as AstronautSuitPreset[]).map((k) => (
                  <option key={k} value={k}>
                    {SUIT_PRESETS[k].label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-slate-300 block">Suit Color</span>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateCustomization({ primaryColor: c })}
                      aria-label={`Suit color ${c}`}
                      className={`w-6 h-6 rounded border-2 ${
                        customization.primaryColor === c ? 'border-cyan-400 scale-110' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-300 block">Trim Accent</span>
                <div className="flex flex-wrap gap-1.5">
                  {ACCENT_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateCustomization({ accentColor: c })}
                      aria-label={`Accent color ${c}`}
                      className={`w-6 h-6 rounded border-2 ${
                        customization.accentColor === c ? 'border-white scale-110' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="space-y-1">
                <span className="text-slate-300 block">Helmet Visor</span>
                <select
                  value={customization.helmetStyle}
                  onChange={(e) =>
                    updateCustomization({
                      helmetStyle: e.target.value as AstronautCustomization['helmetStyle'],
                    })
                  }
                  className="w-full px-2 py-1.5 rounded bg-[#070b14] border border-slate-700 text-white"
                >
                  <option value="gold-visor">Gold Reflective</option>
                  <option value="cyan-hud">Cyan HUD Visor</option>
                  <option value="polarized-dark">Polarized Dark</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-slate-300 block">PLSS Backpack</span>
                <select
                  value={customization.backpackStyle}
                  onChange={(e) =>
                    updateCustomization({
                      backpackStyle: e.target.value as AstronautCustomization['backpackStyle'],
                    })
                  }
                  className="w-full px-2 py-1.5 rounded bg-[#070b14] border border-slate-700 text-white"
                >
                  <option value="plss-standard">PLSS Standard</option>
                  <option value="eva-thruster">EVA SAFER Pack</option>
                  <option value="science-rack">Science Rack</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-slate-300 block">Mission Patch</span>
                <select
                  value={customization.missionPatch}
                  onChange={(e) =>
                    updateCustomization({
                      missionPatch: e.target.value as AstronautCustomization['missionPatch'],
                    })
                  }
                  className="w-full px-2 py-1.5 rounded bg-[#070b14] border border-slate-700 text-white"
                >
                  <option value="ARES">ARES Mars</option>
                  <option value="ARTEMIS">ARTEMIS Moon</option>
                  <option value="EVA">EVA Ops</option>
                  <option value="ORBITAL">ORBITAL Cmd</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-slate-300 block">Accessory</span>
                <select
                  value={customization.accessory}
                  onChange={(e) =>
                    updateCustomization({
                      accessory: e.target.value as AstronautCustomization['accessory'],
                    })
                  }
                  className="w-full px-2 py-1.5 rounded bg-[#070b14] border border-slate-700 text-white"
                >
                  <option value="chest-cam">Chest Camera</option>
                  <option value="antenna-whip">Whip Antenna</option>
                  <option value="shoulder-beacon">Shoulder Beacon</option>
                  <option value="none">Clean Suit</option>
                </select>
              </label>
            </div>
          </div>

          <button
            type="button"
            data-deploy-3d="true"
            onClick={handleDeploy}
            className="w-full py-3 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors shadow-lg"
          >
            <Play className="w-4 h-4" />
            Deploy 3D Astronaut Mission
          </button>
        </aside>
      </div>
    </div>
  );
}
