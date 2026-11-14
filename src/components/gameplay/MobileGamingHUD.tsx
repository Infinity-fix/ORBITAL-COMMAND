/**
 * MobileGamingHUD.tsx
 * Free Fire / BGMI-inspired mobile gaming HUD with touch-based camera look area
 * on the right side interacting with the existing ThirdPersonCamera system in PlayWorkspaceView.
 */

import { MobileControls } from './MobileControls';
import type { TouchInputBridge } from '../../gameplay/InputManager';

interface MobileGamingHUDProps {
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

export function MobileGamingHUD(props: MobileGamingHUDProps) {
  return <MobileControls {...props} />;
}
