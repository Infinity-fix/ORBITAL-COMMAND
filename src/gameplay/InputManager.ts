import type { KeyBindings } from '../engine/types';
import { GamepadController } from './GamepadController';

export interface TouchInputBridge {
  moveX: number; // -1..1
  moveY: number; // -1..1
  sprint: boolean;
  jump: boolean;
  crouch: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
}

export interface UnifiedFrameInput {
  moveForward: number;
  moveRight: number;
  sprint: boolean;
  jump: boolean;
  crouch: boolean;
  brake: boolean;
  aiming: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
  wheelDelta: number;
  gamepadConnected: boolean;
}

export interface ActionCallbacks {
  onInteract: () => void;
  onUseEquipment: () => void;
  onRefillTool: () => void;
  onToggleFlashlight: () => void;
  onToggleCamera: () => void;
  onShoulderSwap: () => void;
  onToggleMap: () => void;
  onToggleInventory: () => void;
  onToggleObjectives: () => void;
  onTogglePause: () => void;
  onSelectHotbar: (index: number) => void;
  onWave: () => void;
}

export class InputManager {
  private heldKeys = new Set<string>();
  private keyBindings: KeyBindings;
  private callbacks: ActionCallbacks;
  private gamepad = new GamepadController();
  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private wheelDelta = 0;
  private isDragging = false;
  private aimingRightMouse = false;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private pointerDownButton = -1;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private crouchToggle = false;
  private active = true;
  private targetEl: HTMLElement | null = null;

  public touchState: TouchInputBridge = {
    moveX: 0,
    moveY: 0,
    sprint: false,
    jump: false,
    crouch: false,
    lookDeltaX: 0,
    lookDeltaY: 0,
  };

  constructor(keyBindings: KeyBindings, callbacks: ActionCallbacks) {
    this.keyBindings = keyBindings;
    this.callbacks = callbacks;
  }

  updateBindings(bindings: KeyBindings): void {
    this.keyBindings = bindings;
  }

  updateCallbacks(callbacks: ActionCallbacks): void {
    this.callbacks = callbacks;
  }

  setPaused(paused: boolean): void {
    this.active = !paused;
    if (paused) {
      this.heldKeys.clear();
      this.isDragging = false;
      this.aimingRightMouse = false;
    }
  }

  attach(canvasContainer: HTMLElement): () => void {
    this.targetEl = canvasContainer;

    const isTextInputFocused = () => {
      const tag = document.activeElement?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTextInputFocused()) return;
      const code = e.code;

      if (code === this.keyBindings.pause) {
        e.preventDefault();
        this.callbacks.onTogglePause();
        return;
      }

      if (
        code === this.keyBindings.map ||
        code === this.keyBindings.inventory ||
        code === this.keyBindings.objectives
      ) {
        if (code === 'Tab') e.preventDefault();
        if (!this.heldKeys.has(code)) {
          if (code === this.keyBindings.map) this.callbacks.onToggleMap();
          else if (code === this.keyBindings.inventory) this.callbacks.onToggleInventory();
          else if (code === this.keyBindings.objectives) this.callbacks.onToggleObjectives();
        }
        this.heldKeys.add(code);
        return;
      }

      if (!this.active) return;

      // Prevent browser scrolling on game keys
      if (code === 'Space' || code === 'Tab' || code === 'ArrowUp' || code === 'ArrowDown') {
        e.preventDefault();
      }

      if (!this.heldKeys.has(code)) {
        if (code === this.keyBindings.interact) this.callbacks.onInteract();
        else if (code === this.keyBindings.useEquipment) this.callbacks.onUseEquipment();
        else if (code === this.keyBindings.refillTool) this.callbacks.onRefillTool();
        else if (code === this.keyBindings.flashlight) this.callbacks.onToggleFlashlight();
        else if (code === this.keyBindings.toggleCamera) this.callbacks.onToggleCamera();
        else if (code === this.keyBindings.shoulderSwap) this.callbacks.onShoulderSwap();
        else if (code === this.keyBindings.crouch) this.crouchToggle = !this.crouchToggle;
        else if (code === 'KeyG') this.callbacks.onWave();
        else if (/^Digit[1-9]$/.test(code)) {
          this.callbacks.onSelectHotbar(Number(code.slice(5)) - 1);
        } else if (code === 'Digit0') {
          this.callbacks.onSelectHotbar(9);
        }
      }

      this.heldKeys.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.heldKeys.delete(e.code);
    };

    const onBlur = () => {
      this.heldKeys.clear();
      this.isDragging = false;
      this.aimingRightMouse = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!this.active || e.pointerType === 'touch') return;
      if (e.target instanceof HTMLElement && e.target.closest('button, input, select, a')) return;
      this.pointerDownButton = e.button;
      this.pointerDownX = e.clientX;
      this.pointerDownY = e.clientY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      if (e.button === 2) {
        this.aimingRightMouse = true;
      } else if (e.button === 0) {
        this.isDragging = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.active || e.pointerType === 'touch') return;
      if (document.pointerLockElement === canvasContainer) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      } else if (this.isDragging || this.aimingRightMouse) {
        this.mouseDeltaX += e.clientX - this.lastPointerX;
        this.mouseDeltaY += e.clientY - this.lastPointerY;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 2) {
        this.aimingRightMouse = false;
      }
      if (
        this.active &&
        e.button === 0 &&
        this.pointerDownButton === 0 &&
        !(e.target instanceof HTMLElement && e.target.closest('button, input, select, a'))
      ) {
        const dragDist = Math.hypot(e.clientX - this.pointerDownX, e.clientY - this.pointerDownY);
        if (dragDist < 5 && (document.pointerLockElement === canvasContainer || this.aimingRightMouse)) {
          this.callbacks.onUseEquipment();
        }
      }
      this.isDragging = false;
      this.pointerDownButton = -1;
    };

    const onContextMenu = (e: MouseEvent) => {
      if (this.active) e.preventDefault();
    };

    const onWheel = (e: WheelEvent) => {
      if (!this.active) return;
      e.preventDefault();
      this.wheelDelta += Math.sign(e.deltaY) * 0.55;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    canvasContainer.addEventListener('pointerdown', onPointerDown);
    canvasContainer.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvasContainer.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvasContainer.removeEventListener('pointerdown', onPointerDown);
      canvasContainer.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvasContainer.removeEventListener('wheel', onWheel);
      this.heldKeys.clear();
      this.targetEl = null;
    };
  }

  requestPointerLock(): void {
    if (this.targetEl && document.pointerLockElement !== this.targetEl) {
      this.targetEl.requestPointerLock?.();
    }
  }

  sampleFrame(dt: number): UnifiedFrameInput {
    const gp = this.gamepad.poll();
    if (gp.interactJustPressed && this.active) this.callbacks.onInteract();
    if (gp.equipmentJustPressed && this.active) this.callbacks.onUseEquipment();

    let fwd = 0;
    let right = 0;
    if (this.heldKeys.has(this.keyBindings.forward) || this.heldKeys.has('ArrowUp')) fwd += 1;
    if (this.heldKeys.has(this.keyBindings.backward) || this.heldKeys.has('ArrowDown')) fwd -= 1;
    if (this.heldKeys.has(this.keyBindings.right) || this.heldKeys.has('ArrowRight')) right += 1;
    if (this.heldKeys.has(this.keyBindings.left) || this.heldKeys.has('ArrowLeft')) right -= 1;

    fwd += gp.moveY + this.touchState.moveY;
    right += gp.moveX + this.touchState.moveX;
    fwd = Math.max(-1, Math.min(1, fwd));
    right = Math.max(-1, Math.min(1, right));

    const lookDeltaX =
      this.mouseDeltaX + this.touchState.lookDeltaX + gp.lookX * 260 * dt;
    const lookDeltaY =
      this.mouseDeltaY + this.touchState.lookDeltaY + gp.lookY * 180 * dt;

    const wheelDelta = this.wheelDelta;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.touchState.lookDeltaX = 0;
    this.touchState.lookDeltaY = 0;
    this.wheelDelta = 0;

    return {
      moveForward: fwd,
      moveRight: right,
      sprint:
        this.heldKeys.has(this.keyBindings.sprint) ||
        this.heldKeys.has('ShiftRight') ||
        this.touchState.sprint ||
        gp.sprint,
      jump:
        this.heldKeys.has(this.keyBindings.jump) ||
        this.touchState.jump ||
        gp.jumpPressed,
      crouch:
        this.crouchToggle ||
        this.touchState.crouch ||
        gp.crouchPressed,
      brake: this.heldKeys.has('KeyB') || this.heldKeys.has(this.keyBindings.jump),
      aiming: this.aimingRightMouse,
      lookDeltaX,
      lookDeltaY,
      wheelDelta,
      gamepadConnected: gp.connected,
    };
  }
}
