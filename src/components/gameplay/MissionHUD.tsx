import {
  AlertTriangle,
  BatteryCharging,
  Bot,
  Building2,
  Camera,
  Compass,
  Flashlight,
  Map as MapIcon,
  Package,
  Pause,
  Radio,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Target,
  Thermometer,
  Users,
  Wind,
} from 'lucide-react';
import type {
  CameraMode,
  EnvironmentId,
  EquipmentId,
  GameplaySettings,
  InventoryItemState,
  KeyBindings,
  MissionObjectiveStep,
  RemotePlayer3DState,
  RoverState,
  SurvivalTelemetry,
} from '../../engine/types';
import { formatKeyCodeLabel } from '../../gameplay/GameplayStateManager';
import { ENV_PHYSICS } from '../../gameplay/GravitySystem';
import type { NearestInteractableResult } from '../../gameplay/InteractionSystem';
import { EQUIPMENT_CATALOG } from '../../gameplay/InventorySystem';

interface MissionHUDProps {
  environment: EnvironmentId;
  cameraMode: CameraMode;
  telemetry: SurvivalTelemetry;
  objectives: MissionObjectiveStep[];
  showObjectivesPanel: boolean;
  score: number;
  inventory: InventoryItemState[];
  equippedId: EquipmentId | null;
  flashlightOn: boolean;
  nearestInteractable: NearestInteractableResult | null;
  rover: RoverState | null;
  inRover: boolean;
  playerHeadingDeg: number;
  playerPos: { x: number; y: number; z: number };
  remotePlayers: RemotePlayer3DState[];
  settings: GameplaySettings;
  actionToast: string | null;
  gamepadConnected: boolean;
  isTouchDevice?: boolean;
  shoulderSide?: 'right' | 'left';
  aimScan?: boolean;
  activeHazardTitle?: string | null;
  onSelectEquipment: (id: EquipmentId) => void;
  onInteract: () => void;
  onUseEquipment: () => void;
  onRefillTool?: () => void;
  onToggleFlashlight: () => void;
  onCycleCamera: () => void;
  onSwapShoulder?: () => void;
  onOpenMap: () => void;
  onOpenInventory: () => void;
  onToggleObjectives: () => void;
  onOpenPause: () => void;
  onOpenCockpit?: () => void;
  onOpenBaseBuilder?: () => void;
  onOpenAICommander?: () => void;
  onExitRover: () => void;
  onGrabHandhold: () => void;
}

const CAMERA_LABELS: Record<CameraMode, string> = {
  'third-person': '3rd Person',
  'close-inspect': 'Close Inspect',
  'first-person': '1st Person Visor',
  rover: 'Rover Chase',
  'spacecraft-ext': 'External Orbit',
};

function cardinalFromDeg(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const norm = ((deg % 360) + 360) % 360;
  return dirs[Math.round(norm / 45) % 8];
}

export function MissionHUD({
  environment,
  cameraMode,
  telemetry,
  objectives,
  showObjectivesPanel,
  score,
  inventory,
  equippedId,
  flashlightOn,
  nearestInteractable,
  rover,
  inRover,
  playerHeadingDeg,
  playerPos,
  remotePlayers,
  settings,
  actionToast,
  gamepadConnected,
  isTouchDevice = false,
  shoulderSide = 'right',
  aimScan = false,
  activeHazardTitle = null,
  onSelectEquipment,
  onInteract,
  onUseEquipment,
  onRefillTool,
  onToggleFlashlight,
  onCycleCamera,
  onSwapShoulder,
  onOpenMap,
  onOpenInventory,
  onToggleObjectives,
  onOpenPause,
  onOpenCockpit,
  onOpenBaseBuilder,
  onOpenAICommander,
  onExitRover,
  onGrabHandhold,
}: MissionHUDProps) {
  const kb: KeyBindings = settings.keyBindings;
  const envSpec = ENV_PHYSICS[environment];
  const activeObj = objectives.find((o) => !o.completed) ?? objectives[objectives.length - 1];
  const completedCount = objectives.filter((o) => o.completed).length;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-4 select-none">
      {/* ==================== TOP BAR: ENVIRONMENT, COMPASS, CONTROLS ==================== */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left: Mission Objective Tracker */}
        <div className={`flex flex-col gap-1.5 w-[210px] sm:w-[245px] shrink-0 ${isTouchDevice ? 'mt-9 sm:mt-0' : ''}`}>
          <div className="pointer-events-auto flex items-center gap-1.5 bg-[#070b14]/90 border border-slate-700/80 rounded px-2.5 py-1 text-[11px]">
            <span className="font-mono font-bold text-cyan-300 uppercase">
              {environment === 'orbital-eva' ? 'ZERO-G EVA' : environment.toUpperCase()}
            </span>
            <span className="text-slate-500">|</span>
            <span className="font-mono text-slate-300 tabular-nums">
              {envSpec.isZeroG ? '0.00 g' : `${envSpec.gravityMs2.toFixed(2)} m/s²`}
            </span>
            {telemetry.inSafeZone && (
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
                <span className="hidden sm:inline">Safe</span>
              </span>
            )}
          </div>

          {settings.hudShowObjectives && showObjectivesPanel && activeObj && (
            <div className="pointer-events-auto bg-[#070b14]/90 border border-slate-800 rounded-lg p-2.5 space-y-1 text-xs shadow-lg">
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
                <span className="inline-flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  OBJ {completedCount}/{objectives.length}
                </span>
                <span className="text-amber-300">{score} pts</span>
              </div>
              <div className="font-semibold text-white text-[11px] leading-tight">{activeObj.title}</div>
              <div className="text-[10px] text-slate-300 leading-snug">{activeObj.hint}</div>
            </div>
          )}
        </div>

        {/* Top-Center: Compass Heading + Coordinates + Non-Obstructing Action Toast */}
        <div className={`flex-1 min-w-0 flex flex-col items-center gap-1 ${isTouchDevice ? 'mt-9 sm:mt-0' : ''}`}>
          <div className="hidden lg:flex items-center gap-2 bg-[#070b14]/90 border border-slate-700/80 rounded px-2.5 py-1 text-[11px] font-mono tabular-nums whitespace-nowrap">
            <Compass className="w-3 h-3 text-cyan-400" />
            <span className="text-white font-semibold">
              {cardinalFromDeg(playerHeadingDeg)} ({Math.round(((playerHeadingDeg % 360) + 360) % 360)}°)
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              X:{playerPos.x.toFixed(0)} Y:{playerPos.y.toFixed(1)} Z:{playerPos.z.toFixed(0)}
            </span>
            {gamepadConnected && (
              <span className="text-emerald-400 text-[10px]">PAD</span>
            )}
          </div>

          {activeHazardTitle && (
            <div className="bg-amber-950/95 border border-amber-400 rounded px-3 py-1 text-[11px] font-mono text-amber-100 inline-flex items-center gap-1.5 shadow-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>HAZARD: {activeHazardTitle}</span>
            </div>
          )}

          {telemetry.warnings.length > 0 && (
            <div className="bg-rose-950/90 border border-rose-500 rounded px-3 py-1 text-[11px] font-mono text-rose-100 inline-flex items-center gap-1.5 shadow-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{telemetry.warnings[0]}</span>
            </div>
          )}

          {actionToast && (
            <div className="bg-[#070b14]/95 border border-cyan-500/70 rounded px-2.5 py-1 text-[11px] font-mono text-cyan-200 shadow-lg">
              {actionToast}
            </div>
          )}
        </div>

        {/* Top-Right: Quick Action Buttons & Squad Indicators */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {!isTouchDevice && (
          <div className="pointer-events-auto flex flex-wrap justify-end items-center gap-1 max-w-[440px]">
            {onOpenAICommander && (
              <button
                type="button"
                onClick={onOpenAICommander}
                className="px-2 py-1 rounded bg-[#070b14]/90 border border-cyan-500/50 hover:border-cyan-300 text-[10px] font-mono text-cyan-200 inline-flex items-center gap-1 whitespace-nowrap"
              >
                <Bot className="w-3 h-3 text-cyan-400" />
                <span>AI Cmd</span>
              </button>
            )}
            {onOpenCockpit && (environment === 'spacecraft' || environment === 'station') && (
              <button
                type="button"
                onClick={onOpenCockpit}
                className="px-2 py-1 rounded bg-[#070b14]/90 border border-amber-500/50 hover:border-amber-300 text-[10px] font-mono text-amber-200 inline-flex items-center gap-1 whitespace-nowrap"
              >
                <Rocket className="w-3 h-3 text-amber-400" />
                <span>Flight Deck</span>
              </button>
            )}
            {onOpenBaseBuilder && (environment === 'moon' || environment === 'mars') && (
              <button
                type="button"
                onClick={onOpenBaseBuilder}
                className="px-2 py-1 rounded bg-[#070b14]/90 border border-emerald-500/50 hover:border-emerald-300 text-[10px] font-mono text-emerald-200 inline-flex items-center gap-1 whitespace-nowrap"
              >
                <Building2 className="w-3 h-3 text-emerald-400" />
                <span>Base [B]</span>
              </button>
            )}
            <button
              type="button"
              onClick={onCycleCamera}
              title={`Toggle Camera (${formatKeyCodeLabel(kb.toggleCamera)})`}
              className="px-2 py-1 rounded bg-[#070b14]/90 border border-slate-700 hover:border-cyan-400 text-[10px] font-mono text-slate-200 inline-flex items-center gap-1 whitespace-nowrap"
            >
              <Camera className="w-3 h-3 text-cyan-400" />
              <span className="hidden xl:inline">{CAMERA_LABELS[cameraMode]}</span>
              <span className="text-slate-400">[{formatKeyCodeLabel(kb.toggleCamera)}]</span>
            </button>
            {onSwapShoulder && (
              <button
                type="button"
                onClick={onSwapShoulder}
                title={`Swap Shoulder (${formatKeyCodeLabel(kb.shoulderSwap)})`}
                className="px-2 py-1 rounded bg-[#070b14]/90 border border-slate-700 hover:border-cyan-400 text-[10px] font-mono text-slate-200 whitespace-nowrap"
              >
                {shoulderSide === 'right' ? 'R-Cam' : 'L-Cam'} [{formatKeyCodeLabel(kb.shoulderSwap)}]
              </button>
            )}
            <button
              type="button"
              onClick={onOpenMap}
              className="px-2 py-1 rounded bg-[#070b14]/90 border border-slate-700 hover:border-cyan-400 text-[10px] font-mono text-slate-200 inline-flex items-center gap-1 whitespace-nowrap"
            >
              <MapIcon className="w-3 h-3 text-cyan-400" />
              <span>Map [{formatKeyCodeLabel(kb.map)}]</span>
            </button>
            <button
              type="button"
              onClick={onOpenInventory}
              className="px-2 py-1 rounded bg-[#070b14]/90 border border-slate-700 hover:border-cyan-400 text-[10px] font-mono text-slate-200 inline-flex items-center gap-1 whitespace-nowrap"
            >
              <Package className="w-3 h-3 text-amber-400" />
              <span>Kit [{formatKeyCodeLabel(kb.inventory)}]</span>
            </button>
            <button
              type="button"
              onClick={onToggleObjectives}
              className="px-1.5 py-1 rounded bg-[#070b14]/90 border border-slate-700 hover:border-cyan-400 text-[10px] font-mono text-slate-200 whitespace-nowrap"
              title="Toggle Objectives"
            >
              [{formatKeyCodeLabel(kb.objectives)}]
            </button>
            <button
              type="button"
              onClick={onOpenPause}
              aria-label="Pause Mission"
              className="p-1 rounded bg-[#070b14]/90 border border-slate-700 hover:border-rose-400 text-slate-200"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>
          )}

          {remotePlayers.length > 0 && (
            <div className="bg-[#070b14]/90 border border-emerald-700/50 rounded px-2.5 py-1.5 text-[11px] font-mono space-y-1">
              <div className="text-emerald-300 flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>Squad Crew ({remotePlayers.length})</span>
              </div>
              {remotePlayers.map((rp) => {
                const dist = Math.hypot(rp.x - playerPos.x, rp.z - playerPos.z);
                return (
                  <div key={rp.memberId} className="text-slate-300 flex justify-between gap-3">
                    <span>{rp.name}</span>
                    <span className="text-cyan-300">
                      {rp.environmentId === environment ? `${dist.toFixed(0)}m` : rp.environmentId}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Center Viewport kept unobstructed (only thin reticle during Right-Click Aim/Scan) */}
      <div className="flex-1 flex items-center justify-center">
        {aimScan && (
          <div className="w-10 h-10 rounded-full border border-cyan-400/80 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
          </div>
        )}
      </div>

      {/* ==================== BOTTOM HUD: SURVIVAL TELEMETRY + INTERACTION + HOTBAR ==================== */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        {/* Bottom-Left: Survival & Suit Telemetry */}
        {settings.hudShowTelemetry && (
          <div className={`${isTouchDevice ? 'hidden md:grid' : 'grid'} pointer-events-auto bg-[#070b14]/90 border border-slate-800 rounded-lg p-3 grid-cols-4 gap-x-3.5 gap-y-2 text-[11px] font-mono tabular-nums min-w-[310px]`}>
            <div className="flex items-center gap-1.5">
              <Wind className={`w-3.5 h-3.5 ${telemetry.oxygenPct < 25 ? 'text-rose-400' : 'text-cyan-400'}`} />
              <div>
                <div className="text-[9px] text-slate-400">OXYGEN</div>
                <div className={telemetry.oxygenPct < 25 ? 'text-rose-300 font-bold' : 'text-white'}>
                  {Math.round(telemetry.oxygenPct)}%
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <BatteryCharging className={`w-3.5 h-3.5 ${telemetry.batteryPct < 20 ? 'text-rose-400' : 'text-emerald-400'}`} />
              <div>
                <div className="text-[9px] text-slate-400">BATTERY</div>
                <div className="text-white">{Math.round(telemetry.batteryPct)}%</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              <div>
                <div className="text-[9px] text-slate-400">SUIT TEMP</div>
                <div className="text-white">{telemetry.temperatureC.toFixed(0)}°C</div>
              </div>
            </div>

            <div>
              <div className="text-[9px] text-slate-400">CO2</div>
              <div className={telemetry.co2Pct >= 2.0 ? 'text-rose-300 font-bold' : 'text-slate-200'}>
                {telemetry.co2Pct.toFixed(2)}%
              </div>
            </div>

            <div>
              <div className="text-[9px] text-slate-400">PRESSURE</div>
              <div className="text-slate-200">{telemetry.suitPressureKpa.toFixed(1)} kPa</div>
            </div>

            <div>
              <div className="text-[9px] text-slate-400">HEALTH</div>
              <div className={telemetry.healthPct < 50 ? 'text-rose-300 font-bold' : 'text-emerald-300'}>
                {Math.round(telemetry.healthPct)}%
              </div>
            </div>

            <div>
              <div className="text-[9px] text-slate-400">SUIT INT</div>
              <div className={telemetry.suitIntegrityPct < 60 ? 'text-amber-300 font-bold' : 'text-slate-200'}>
                {Math.round(telemetry.suitIntegrityPct)}%
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-cyan-400" />
              <div>
                <div className="text-[9px] text-slate-400">
                  {environment === 'orbital-eva' ? 'TETHER' : 'COMMS'}
                </div>
                <div className="text-slate-200">
                  {environment === 'orbital-eva'
                    ? `${telemetry.tetherDistanceM}m / 46m`
                    : `${telemetry.commsSignalPct}%`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom-Center: Context Interaction Prompt & Equipment Hotbar */}
        <div className="flex flex-col items-center gap-2 mx-auto">
          {/* Active Rover Controls / Exit Prompt */}
          {inRover && rover && (
            <div className="pointer-events-auto flex flex-wrap items-center gap-3 bg-[#070b14]/95 border border-amber-500/60 rounded-lg px-4 py-2 text-xs font-mono">
              <span className="text-amber-300 font-bold">{rover.name}</span>
              <span className="text-slate-300">{Math.abs(rover.speedMs).toFixed(1)} m/s</span>
              <span className="text-emerald-300">Bat {Math.round(rover.batteryPct)}%</span>
              <span className={rover.integrityPct < 55 ? 'text-rose-300' : 'text-cyan-300'}>
                Hull {Math.round(rover.integrityPct)}%
              </span>
              <span className="text-slate-300">Samples {rover.storedSamplesCount}</span>
              <span className="text-slate-400">{rover.distanceKm.toFixed(2)} km</span>
              <button
                type="button"
                onClick={onExitRover}
                className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                Exit Rover [{formatKeyCodeLabel(kb.interact)}]
              </button>
            </div>
          )}

          {/* Universal Proximity Interaction Prompt */}
          {!inRover && nearestInteractable && (
            <button
              type="button"
              onClick={onInteract}
              className="pointer-events-auto flex items-center gap-3 bg-[#070b14]/95 border border-cyan-400 rounded-lg px-4 py-2 text-xs shadow-lg hover:bg-slate-900 transition-colors"
            >
              <span className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-mono font-bold">
                {formatKeyCodeLabel(kb.interact)}
              </span>
              <div className="text-left">
                <div className="font-semibold text-white">{nearestInteractable.item.actionLabel}</div>
                <div className="text-[10px] text-cyan-300 font-mono">
                  {nearestInteractable.item.name} · {nearestInteractable.distance}m
                  {nearestInteractable.blockedReason ? ` · ${nearestInteractable.blockedReason}` : ''}
                </div>
              </div>
            </button>
          )}

          {/* Zero-G Handhold Helper */}
          {environment === 'orbital-eva' && !nearestInteractable && (
            <div className="pointer-events-auto flex items-center gap-2 bg-[#070b14]/85 border border-slate-700 rounded px-3 py-1 text-[11px] font-mono text-slate-300">
              <span>RCS: WASD + Space(Up) / C(Down) · Brake [B]</span>
              <button
                type="button"
                onClick={onGrabHandhold}
                className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-200 hover:bg-amber-500/30"
              >
                Grab Handhold
              </button>
            </div>
          )}

          {/* Equipment Quick Hotbar */}
          <div className={`${isTouchDevice ? 'hidden sm:flex' : 'flex'} pointer-events-auto flex-nowrap overflow-x-auto items-center justify-start sm:justify-center gap-1 bg-[#070b14]/90 border border-slate-800 rounded-lg p-1.5 max-w-[94vw]`}>
            {inventory.slice(0, 7).map((item, idx) => {
              const spec = EQUIPMENT_CATALOG[item.id];
              const isSelected = equippedId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectEquipment(item.id)}
                  title={`${spec.name} (${spec.description})`}
                  className={`px-1.5 py-1 rounded text-[10px] font-mono border transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                      : 'bg-[#0b1220] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-slate-500 mr-1">{idx + 1}</span>
                  <span>{spec.shortLabel}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={onUseEquipment}
              className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-[10px] whitespace-nowrap"
            >
              Use [{formatKeyCodeLabel(kb.useEquipment)}]
            </button>
            {onRefillTool && (
              <button
                type="button"
                onClick={onRefillTool}
                title={`Refill / Scrub CO2 (${formatKeyCodeLabel(kb.refillTool)})`}
                className="px-2 py-1 rounded bg-[#0b1220] border border-slate-700 hover:border-cyan-400 text-cyan-200 font-mono text-[10px] inline-flex items-center gap-1 whitespace-nowrap"
              >
                <RefreshCw className="w-3 h-3" />
                <span>[{formatKeyCodeLabel(kb.refillTool)}]</span>
              </button>
            )}
            <button
              type="button"
              onClick={onToggleFlashlight}
              aria-label="Toggle Flashlight"
              className={`p-1.5 rounded border ${
                flashlightOn
                  ? 'bg-amber-400 text-slate-950 border-white'
                  : 'bg-[#0b1220] text-slate-300 border-slate-700'
              }`}
            >
              <Flashlight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
