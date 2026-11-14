import { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Building2,
  Camera,
  Flashlight,
  Hand,
  Map as MapIcon,
  Package,
  Pause,
  Rocket,
  Target,
  Wrench,
} from 'lucide-react';
import type { TouchInputBridge } from '../../gameplay/InputManager';

interface MobileControlsProps {
  touchState: TouchInputBridge;
  leftHanded: boolean;
  oxygenPct: number;
  flashlightOn: boolean;
  crouching: boolean;
  canInteract: boolean;
  onInteract: () => void;
  onUseEquipment: () => void;
  onToggleFlashlight: () => void;
  onToggleCamera: () => void;
  onToggleMap: () => void;
  onToggleInventory: () => void;
  onToggleObjectives: () => void;
  onTogglePause: () => void;
  onOpenAICommander?: () => void;
  onOpenBaseBuilder?: () => void;
  onOpenCockpit?: () => void;
}

export function MobileControls({
  touchState,
  leftHanded,
  oxygenPct,
  flashlightOn,
  crouching,
  canInteract,
  onInteract,
  onUseEquipment,
  onToggleFlashlight,
  onToggleCamera,
  onToggleMap,
  onToggleInventory,
  onToggleObjectives,
  onTogglePause,
  onOpenAICommander,
  onOpenBaseBuilder,
  onOpenCockpit,
}: MobileControlsProps) {
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [sprintActive, setSprintActive] = useState(false);
  const [jumpPressed, setJumpPressed] = useState(false);
  const joyOriginRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const camOriginRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);

  const maxRadius = 42;

  const handleJoyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    joyOriginRef.current = { x: cx, y: cy, pointerId: e.pointerId };
    updateJoystick(e.clientX, e.clientY, cx, cy);
  };

  const handleJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joyOriginRef.current || joyOriginRef.current.pointerId !== e.pointerId) return;
    e.stopPropagation();
    updateJoystick(e.clientX, e.clientY, joyOriginRef.current.x, joyOriginRef.current.y);
  };

  const handleJoyUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joyOriginRef.current || joyOriginRef.current.pointerId !== e.pointerId) return;
    joyOriginRef.current = null;
    setKnobOffset({ x: 0, y: 0 });
    touchState.moveX = 0;
    touchState.moveY = 0;
  };

  const updateJoystick = (px: number, py: number, cx: number, cy: number) => {
    let dx = px - cx;
    let dy = py - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnobOffset({ x: dx, y: dy });
    touchState.moveX = dx / maxRadius;
    touchState.moveY = -dy / maxRadius;
  };

  const handleCamDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    camOriginRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
  };

  const handleCamMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!camOriginRef.current || camOriginRef.current.pointerId !== e.pointerId) return;
    e.stopPropagation();
    touchState.lookDeltaX += (e.clientX - camOriginRef.current.x) * 1.4;
    touchState.lookDeltaY += (e.clientY - camOriginRef.current.y) * 1.2;
    camOriginRef.current.x = e.clientX;
    camOriginRef.current.y = e.clientY;
  };

  const handleCamUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (camOriginRef.current?.pointerId === e.pointerId) {
      camOriginRef.current = null;
    }
  };

  const joystickBlock = (
    <div className="pointer-events-auto flex flex-col items-center gap-2 select-none">
      <button
        type="button"
        onClick={() => {
          const next = !sprintActive;
          setSprintActive(next);
          touchState.sprint = next;
        }}
        className={`px-3 py-1 rounded text-[11px] font-mono border transition-colors ${
          sprintActive
            ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-bold'
            : 'bg-[#070b14]/85 text-slate-300 border-slate-600'
        }`}
      >
        Sprint {sprintActive ? 'ON' : 'OFF'}
      </button>
      <div
        role="application"
        aria-label="Virtual Movement Joystick"
        onPointerDown={handleJoyDown}
        onPointerMove={handleJoyMove}
        onPointerUp={handleJoyUp}
        onPointerCancel={handleJoyUp}
        className="relative w-28 h-28 rounded-full border-2 border-cyan-400/50 bg-[#070b14]/70 touch-none flex items-center justify-center"
      >
        <div
          className="w-11 h-11 rounded-full bg-cyan-400/80 border-2 border-white shadow-lg"
          style={{ transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)` }}
        />
      </div>
    </div>
  );

  const actionCluster = (
    <div className="pointer-events-auto flex flex-col items-end gap-2 select-none">
      {/* Independent Touch Camera Rotation Pad */}
      <div
        onPointerDown={handleCamDown}
        onPointerMove={handleCamMove}
        onPointerUp={handleCamUp}
        onPointerCancel={handleCamUp}
        className="w-40 h-20 rounded-lg border border-slate-600/70 bg-[#070b14]/45 touch-none flex items-center justify-center text-[10px] font-mono text-slate-400"
      >
        Drag to Look / Orbit
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onInteract}
          aria-label="Interact"
          className={`w-12 h-12 rounded-full border flex flex-col items-center justify-center text-[10px] font-mono transition-transform active:scale-95 ${
            canInteract
              ? 'bg-cyan-500 text-slate-950 border-cyan-200 font-bold'
              : 'bg-[#0b1220]/85 text-slate-300 border-slate-600'
          }`}
        >
          <Hand className="w-4 h-4" />
          <span>Use</span>
        </button>

        <button
          type="button"
          onClick={onUseEquipment}
          aria-label="Use Equipment"
          className="w-12 h-12 rounded-full border bg-[#0b1220]/85 border-amber-500/60 text-amber-200 flex flex-col items-center justify-center text-[10px] font-mono active:scale-95"
        >
          <Wrench className="w-4 h-4" />
          <span>Tool</span>
        </button>

        <button
          type="button"
          onPointerDown={() => {
            setJumpPressed(true);
            touchState.jump = true;
          }}
          onPointerUp={() => {
            setJumpPressed(false);
            touchState.jump = false;
          }}
          onPointerCancel={() => {
            setJumpPressed(false);
            touchState.jump = false;
          }}
          aria-label="Jump or Up"
          className={`w-12 h-12 rounded-full border flex flex-col items-center justify-center text-[10px] font-mono transition-transform ${
            jumpPressed
              ? 'bg-emerald-400 text-slate-950 border-white scale-95'
              : 'bg-[#0b1220]/85 text-emerald-300 border-emerald-600/60'
          }`}
        >
          <ArrowUp className="w-4 h-4" />
          <span>Jump</span>
        </button>

        <button
          type="button"
          onClick={onToggleFlashlight}
          aria-label="Flashlight"
          className={`w-12 h-12 rounded-full border flex flex-col items-center justify-center text-[10px] font-mono active:scale-95 ${
            flashlightOn
              ? 'bg-amber-400 text-slate-950 border-white font-bold'
              : 'bg-[#0b1220]/85 text-slate-300 border-slate-600'
          }`}
        >
          <Flashlight className="w-4 h-4" />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => {
            touchState.crouch = !touchState.crouch;
          }}
          aria-label="Crouch or Down"
          className={`w-12 h-12 rounded-full border flex flex-col items-center justify-center text-[10px] font-mono active:scale-95 ${
            crouching
              ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
              : 'bg-[#0b1220]/85 border-slate-600 text-slate-300'
          }`}
        >
          <ArrowDown className="w-4 h-4" />
          <span>Crouch</span>
        </button>

        <button
          type="button"
          onClick={onToggleCamera}
          aria-label="Camera Mode"
          className="w-12 h-12 rounded-full border bg-[#0b1220]/85 border-slate-600 text-slate-200 flex flex-col items-center justify-center text-[10px] font-mono active:scale-95"
        >
          <Camera className="w-4 h-4" />
          <span>Cam</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3">
      {/* Compact Touch Utility Strip */}
      <div className="flex items-center justify-end gap-1.5 pointer-events-auto">
        <span className={`px-2 py-1 rounded text-[10px] font-mono border ${oxygenPct < 25 ? 'bg-rose-950 border-rose-500 text-rose-200' : 'bg-[#070b14]/85 border-slate-700 text-cyan-300'}`}>
          O2 {Math.round(oxygenPct)}%
        </span>
        {onOpenAICommander && (
          <button type="button" onClick={onOpenAICommander} aria-label="AI Commander" className="p-1.5 rounded bg-[#070b14]/85 border border-cyan-500/50 text-cyan-200">
            <Bot className="w-3.5 h-3.5" />
          </button>
        )}
        {onOpenCockpit && (
          <button type="button" onClick={onOpenCockpit} aria-label="Flight Deck" className="p-1.5 rounded bg-[#070b14]/85 border border-amber-500/50 text-amber-200">
            <Rocket className="w-3.5 h-3.5" />
          </button>
        )}
        {onOpenBaseBuilder && (
          <button type="button" onClick={onOpenBaseBuilder} aria-label="Base Builder" className="p-1.5 rounded bg-[#070b14]/85 border border-emerald-500/50 text-emerald-200">
            <Building2 className="w-3.5 h-3.5" />
          </button>
        )}
        <button type="button" onClick={onToggleObjectives} aria-label="Objectives" className="p-1.5 rounded bg-[#070b14]/85 border border-slate-700 text-slate-200">
          <Target className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onToggleMap} aria-label="Map" className="p-1.5 rounded bg-[#070b14]/85 border border-slate-700 text-slate-200">
          <MapIcon className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onToggleInventory} aria-label="Inventory" className="p-1.5 rounded bg-[#070b14]/85 border border-slate-700 text-slate-200">
          <Package className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onTogglePause} aria-label="Pause" className="p-1.5 rounded bg-[#070b14]/85 border border-slate-700 text-slate-200">
          <Pause className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Joystick & Action Buttons (Reversible Left/Right Handedness) */}
      <div className={`flex items-end justify-between pb-2 sm:pb-12 ${leftHanded ? 'flex-row-reverse' : 'flex-row'}`}>
        {joystickBlock}
        {actionCluster}
      </div>
    </div>
  );
}
