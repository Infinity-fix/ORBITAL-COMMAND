import { Compass, Navigation, X } from 'lucide-react';
import type {
  EnvironmentId,
  GameMode,
  MissionObjectiveStep,
  RemotePlayer3DState,
  RoverState,
} from '../../engine/types';
import { WORLD_INTERACTABLES } from '../../gameplay/InteractionSystem';

interface NavigationMapProps {
  environment: EnvironmentId;
  gameMode: GameMode;
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  objectives: MissionObjectiveStep[];
  rover: RoverState | null;
  remotePlayers: RemotePlayer3DState[];
  onSwitchEnvironment: (env: EnvironmentId) => void;
  onClose: () => void;
}

const ENV_SPAN: Record<EnvironmentId, number> = {
  station: 32,
  spacecraft: 16,
  moon: 68,
  mars: 72,
  'orbital-eva': 48,
};

export function NavigationMap({
  environment,
  gameMode,
  playerPos,
  playerYaw,
  objectives,
  rover,
  remotePlayers,
  onSwitchEnvironment,
  onClose,
}: NavigationMapProps) {
  const span = ENV_SPAN[environment];
  const toMapPct = (x: number, z: number) => ({
    left: `${Math.max(4, Math.min(96, 50 + (x / (span * 2)) * 100))}%`,
    top: `${Math.max(4, Math.min(96, 50 + (z / (span * 2)) * 100))}%`,
  });

  const envInteractables = WORLD_INTERACTABLES.filter((i) => i.environment === environment);
  const activeObj = objectives.find((o) => !o.completed);
  const activeTarget = envInteractables.find((i) => i.id === activeObj?.targetInteractableId);
  const baseReturnDist = Math.hypot(playerPos.x, playerPos.z);

  const playerScreen = toMapPct(playerPos.x, playerPos.z);
  const pDeg = ((-playerYaw * 180) / Math.PI) % 360;

  return (
    <div className="fixed inset-0 z-40 bg-[#050811]/85 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#0d1424] border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Tactical Radar Map Canvas */}
        <div className="flex-1 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-cyan-400" />
              Tactical Navigation Map · {environment.toUpperCase()}
            </h2>
            <span className="text-xs font-mono text-slate-400">Radius {span}m</span>
          </div>

          <div className="relative w-full aspect-square max-h-[420px] rounded-lg bg-[#050811] border border-slate-800 overflow-hidden">
            {/* Grid Rings */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08)_0%,transparent_70%)]" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-800/80" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-800/80" />
            <div className="absolute inset-[25%] rounded-full border border-slate-800/70" />

            {/* Return to Base Path Line */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
              <line
                x1={50 + (playerPos.x / (span * 2)) * 100}
                y1={50 + (playerPos.z / (span * 2)) * 100}
                x2={50}
                y2={50}
                stroke="#f59e0b"
                strokeWidth="0.7"
                strokeDasharray="2 2"
              />
              {activeTarget && (
                <line
                  x1={50 + (playerPos.x / (span * 2)) * 100}
                  y1={50 + (playerPos.z / (span * 2)) * 100}
                  x2={50 + (activeTarget.x / (span * 2)) * 100}
                  y2={50 + (activeTarget.z / (span * 2)) * 100}
                  stroke="#22d3ee"
                  strokeWidth="0.9"
                />
              )}
            </svg>

            {/* POIs & Objectives */}
            {envInteractables.map((item) => {
              const pos = toMapPct(item.x, item.z);
              const isTarget = activeObj?.targetInteractableId === item.id;
              const shortTag = item.name
                .replace(/Lunar |Mars |Station |Spacecraft /gi, '')
                .split('(')[0]
                .split('&')[0]
                .trim()
                .slice(0, 16);
              return (
                <div
                  key={item.id}
                  style={{ left: pos.left, top: pos.top }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group"
                >
                  <div
                    className={`w-3 h-3 rounded-full border ${
                      isTarget
                        ? 'bg-cyan-400 border-white animate-pulse'
                        : item.kind === 'airlock' || item.kind === 'power'
                          ? 'bg-amber-400 border-amber-200'
                          : 'bg-emerald-400 border-emerald-200'
                    }`}
                  />
                  <span className="block mt-0.5 px-1 py-0.5 rounded bg-[#070b14]/90 text-[9px] font-mono text-slate-200 whitespace-nowrap">
                    {shortTag}
                  </span>
                </div>
              );
            })}

            {/* Rover Marker */}
            {rover && (
              <div
                style={toMapPct(rover.x, rover.z)}
                className="absolute -translate-x-1/2 -translate-y-1/2"
              >
                <div className="w-3.5 h-3.5 rounded bg-amber-400 border border-white" />
                <span className="text-[10px] font-mono text-amber-300 ml-1">ROVER</span>
              </div>
            )}

            {/* Squad Teammates */}
            {remotePlayers
              .filter((r) => r.environmentId === environment)
              .map((rp) => (
                <div
                  key={rp.memberId}
                  style={toMapPct(rp.x, rp.z)}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                >
                  <div className="w-3 h-3 rounded-full bg-emerald-400 border border-white" />
                  <span className="text-[10px] font-mono text-emerald-300 ml-1">{rp.name}</span>
                </div>
              ))}

            {/* Local Player Heading Marker */}
            <div
              style={{ left: playerScreen.left, top: playerScreen.top }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              <Navigation
                className="w-5 h-5 text-cyan-300 drop-shadow"
                style={{ transform: `rotate(${pDeg}deg)` }}
              />
            </div>
          </div>
        </div>

        {/* Map Waypoints & Environment Transfer */}
        <div className="w-full md:w-80 bg-[#090e1a] border-t md:border-t-0 md:border-l border-slate-800 p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-white">Waypoints &amp; Distances</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Map"
                className="p-1 rounded border border-slate-700 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded bg-[#0d1424] border border-slate-800 text-xs font-mono space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Return to Base / Origin:</span>
                <span className="text-amber-300">{baseReturnDist.toFixed(1)} m</span>
              </div>
              {activeTarget && (
                <div className="flex justify-between text-slate-300">
                  <span>Active Objective Target:</span>
                  <span className="text-cyan-300">
                    {Math.hypot(activeTarget.x - playerPos.x, activeTarget.z - playerPos.z).toFixed(1)} m
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
              {envInteractables.map((item) => {
                const dist = Math.hypot(item.x - playerPos.x, item.z - playerPos.z);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded bg-[#070b14] border border-slate-800/80"
                  >
                    <span className="text-slate-200 truncate pr-2">{item.name}</span>
                    <span className="font-mono text-cyan-300 shrink-0">{dist.toFixed(0)}m</span>
                  </div>
                );
              })}
            </div>

            {(gameMode === 'free-explore' || gameMode === 'sandbox') && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-xs font-semibold text-slate-300">Quick Deploy Environment</div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {(['station', 'spacecraft', 'moon', 'mars', 'orbital-eva'] as EnvironmentId[]).map((env) => (
                    <button
                      key={env}
                      type="button"
                      onClick={() => {
                        onSwitchEnvironment(env);
                        onClose();
                      }}
                      className={`px-2 py-1.5 rounded border font-mono ${
                        env === environment
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-[#070b14] border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {env}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs"
          >
            Resume Exploration [M]
          </button>
        </div>
      </div>
    </div>
  );
}
