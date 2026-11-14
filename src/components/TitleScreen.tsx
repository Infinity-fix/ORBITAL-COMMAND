import { useEffect, useState } from 'react';
import {
  Compass,
  Play,
  RotateCcw,
  Users,
  Settings,
  Cloud,
  Eye,
  Trophy,
  Rocket,
  Shield,
  Layers,
} from 'lucide-react';
import { useMissionStore } from '../store/useMissionStore';
import { SolarSystemViewport3D } from './three/SolarSystemViewport3D';
import { CloudSyncModal } from './CloudSyncModal';
import { DESTINATIONS } from '../engine/catalog';
import type { DestinationId } from '../engine/types';

export function TitleScreen() {
  const mission = useMissionStore((s) => s.mission);
  const campaigns = useMissionStore((s) => s.campaigns);
  const enterStudio = useMissionStore((s) => s.enterStudio);
  const setDestination = useMissionStore((s) => s.setDestination);
  const setActiveView = useMissionStore((s) => s.setActiveView);
  const setGameModeAndMission = useMissionStore((s) => s.setGameModeAndMission);

  const [ambientTour, setAmbientTour] = useState(false);
  const [showMissionSelect, setShowMissionSelect] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);

  useEffect(() => {
    document.body.dataset.state = 'title';
    const onKey = (e: KeyboardEvent) => {
      if (ambientTour) {
        setAmbientTour(false);
        return;
      }
      if (showMissionSelect || showCloudModal) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        enterStudio('dashboard');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enterStudio, ambientTour, showMissionSelect, showCloudModal]);

  const handleNewGame = () => {
    enterStudio('design');
  };

  const handleContinue = () => {
    enterStudio('dashboard');
  };

  const handleSelectFieldMission = (destId: DestinationId, mode: 'career' | 'training' | 'free-explore') => {
    setDestination(destId);
    if (destId === 'moon') {
      setGameModeAndMission(mode, 'lunar-explore');
    } else if (destId === 'mars') {
      setGameModeAndMission(mode, 'mars-explore');
    } else {
      setGameModeAndMission(mode, 'station-prep');
    }
    enterStudio('play');
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050811] select-none">
      {/* Live 3D Solar System Camera Tour */}
      <div className="absolute inset-0">
        <SolarSystemViewport3D mission={mission} heightClass="h-full" tourMode={true} />
      </div>

      {/* Measured contrast scrim over negative space */}
      {!ambientTour && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#050811]/95 via-[#050811]/60 to-transparent transition-opacity duration-300" />
      )}

      {/* Ambient Tour Exit Button */}
      {ambientTour && (
        <button
          type="button"
          onClick={() => setAmbientTour(false)}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 rounded-full bg-slate-900/80 border border-slate-700/80 hover:border-cyan-400 text-slate-200 text-xs font-mono backdrop-blur-xs flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          Click or press any key to return to Main Menu
        </button>
      )}

      {/* Main Menu Shell */}
      {!ambientTour && (
        <div className="relative z-10 h-full max-w-6xl mx-auto px-6 lg:px-10 flex flex-col justify-between py-8">
          {/* Top Brand Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                viewBox="0 0 40 40"
                className="w-10 h-10 text-cyan-400 shrink-0"
                aria-hidden="true"
                fill="none"
              >
                <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.45" />
                <ellipse
                  cx="20"
                  cy="20"
                  rx="17"
                  ry="7"
                  transform="rotate(-24 20 20)"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
                <circle cx="20" cy="20" r="4.5" fill="#f59e0b" />
                <circle cx="32" cy="14" r="2.2" fill="#38bdf8" />
              </svg>
              <div>
                <span className="font-display text-lg font-bold tracking-wider text-slate-100 block">
                  ORBITAL COMMAND
                </span>
                <span className="text-[10px] font-mono tracking-widest text-cyan-400/80 uppercase block">
                  AEROSPACE MISSION SIMULATOR &amp; 3D FLIGHT OPS
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCloudModal(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-900/70 border border-slate-700 hover:border-cyan-500/50 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
              >
                <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                <span>Cloud &amp; Firebase</span>
              </button>

              <button
                type="button"
                onClick={() => setAmbientTour(true)}
                title="Watch ambient solar system camera flyover"
                className="p-1.5 rounded-lg bg-slate-900/70 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-white transition-colors"
                aria-label="Toggle ambient solar tour"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Left Hero & Action Menu */}
          <div className="max-w-xl space-y-6 my-auto">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-950/70 border border-cyan-800 text-cyan-300 text-xs font-mono">
                <Rocket className="w-3 h-3 text-cyan-400" />
                <span>ORBITAL OBSERVER CAMPAIGN READY</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1] text-balance">
                Real-Time 2D &amp; 3D Spaceflight Command
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg">
                Engineer spacecraft architectures, calculate orbital trajectories, survive dynamic space hazards, and pilot astronaut EVA &amp; planetary rovers across Earth, Moon, and Mars.
              </p>
            </div>

            {/* Menu Buttons Group */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 pt-2">
              {/* Primary Start CTA */}
              <button
                type="button"
                data-start="true"
                onClick={handleContinue}
                className="px-6 py-3.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Continue Mission
              </button>

              <button
                type="button"
                onClick={handleNewGame}
                className="px-5 py-3.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-100 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-cyan-400" />
                New Mission
              </button>

              <button
                type="button"
                onClick={() => setShowMissionSelect(true)}
                className="px-5 py-3.5 rounded-lg bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                Mission Select (2D / 3D)
              </button>

              <button
                type="button"
                onClick={() => enterStudio('squad')}
                className="px-5 py-3.5 rounded-lg bg-[#0e1628] hover:bg-[#16213a] border border-slate-700 text-slate-200 font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4 text-cyan-300" />
                Multiplayer Squad
              </button>

              <button
                type="button"
                onClick={() => enterStudio('settings')}
                className="px-4 py-3.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>

              {campaigns.length > 0 && (
                <button
                  type="button"
                  onClick={() => enterStudio('campaign')}
                  className="px-4 py-3.5 rounded-lg bg-transparent hover:bg-slate-900/80 border border-slate-700 text-slate-300 text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Campaign History ({campaigns.length})
                </button>
              )}
            </div>
          </div>

          {/* Footer Control Hints (Flat, borderless single-line as per guidelines) */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono border-t border-slate-800/80 pt-4">
            <div>
              WASD Move · Space Thrust / Jump · Shift Boost · E Interact · Esc Pause
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Shield className="w-3.5 h-3.5" />
                Free Educational Aerospace Sim · 0 Pay-To-Win
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mission Select Modal */}
      {showMissionSelect && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mission-select-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in"
        >
          <div className="relative w-full max-w-2xl bg-[#090e1a] border border-slate-700 rounded-xl shadow-2xl p-6 text-slate-100 flex flex-col gap-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 id="mission-select-title" className="font-display text-xl font-bold">
                  Select Mission &amp; Simulation Mode
                </h2>
                <p className="text-xs text-slate-400">
                  Deploy directly into 2D Orbital Planning or interactive 3D Field Operations
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMissionSelect(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-xs hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            {/* Mode 1: 2D Orbital & Flight Engineering */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                <span>2D Aerospace Design &amp; Orbital Trajectory Simulation</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowMissionSelect(false);
                    enterStudio('design');
                  }}
                  className="p-3.5 rounded-lg bg-[#0e1626] border border-slate-700 hover:border-cyan-500 text-left transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="font-semibold text-sm text-white">Orbital Observer (Campaign)</div>
                    <p className="text-xs text-slate-400 mt-1">
                      Mars science orbiter with full Hohmann transfer, delta-v budgeting, NASA Horizons ephemeris, and NASA SP-2016-6105 reviews.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-300 mt-3 block">Launch 2D Studio →</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMissionSelect(false);
                    enterStudio('orbital');
                  }}
                  className="p-3.5 rounded-lg bg-[#0e1626] border border-slate-700 hover:border-cyan-500 text-left transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="font-semibold text-sm text-white">Orbital Mechanics Lab</div>
                    <p className="text-xs text-slate-400 mt-1">
                      Interactive orbital transfers, eccentricity calculators, inclination burns, and live NASA/JPL Horizons solar system tracking.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-300 mt-3 block">Open Trajectory Planner →</span>
                </button>
              </div>
            </div>

            {/* Mode 2: 3D Field Operations */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>3D Interactive Field Operations &amp; Surface Exploration</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowMissionSelect(false);
                    handleSelectFieldMission('moon', 'career');
                  }}
                  className="p-3 rounded-lg bg-[#0e1626] border border-slate-700 hover:border-amber-400 text-left transition-colors"
                >
                  <div className="font-semibold text-sm text-white">Lunar Outpost</div>
                  <div className="text-[11px] text-amber-300 font-mono mt-0.5">Low Gravity (1.62 m/s²)</div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Drive the lunar rover, deploy habitat base modules, and survey water ice at Shackleton Crater.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMissionSelect(false);
                    handleSelectFieldMission('mars', 'career');
                  }}
                  className="p-3 rounded-lg bg-[#0e1626] border border-slate-700 hover:border-amber-400 text-left transition-colors"
                >
                  <div className="font-semibold text-sm text-white">Mars Surface Survey</div>
                  <div className="text-[11px] text-rose-300 font-mono mt-0.5">Atmosphere &amp; 3.72 m/s²</div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Survive dust storms, sample Jezero Crater rocks, and establish solar arrays.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMissionSelect(false);
                    handleSelectFieldMission('leo', 'career');
                  }}
                  className="p-3 rounded-lg bg-[#0e1626] border border-slate-700 hover:border-amber-400 text-left transition-colors"
                >
                  <div className="font-semibold text-sm text-white">Station &amp; Orbital EVA</div>
                  <div className="text-[11px] text-cyan-300 font-mono mt-0.5">Zero-G 6-DOF RCS Drift</div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Perform spacewalk maintenance, latch safety tethers, and pilot spacecraft flight decks.
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cloud & Firebase Modal */}
      <CloudSyncModal isOpen={showCloudModal} onClose={() => setShowCloudModal(false)} />
    </div>
  );
}
