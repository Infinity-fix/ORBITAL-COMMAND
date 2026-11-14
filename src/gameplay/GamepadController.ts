export interface GamepadPollResult {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  jumpPressed: boolean;
  crouchPressed: boolean;
  interactJustPressed: boolean;
  equipmentJustPressed: boolean;
  sprint: boolean;
  connected: boolean;
}

export class GamepadController {
  private prevXBtn = false;
  private prevYBtn = false;

  poll(deadzone = 0.16): GamepadPollResult {
    const empty: GamepadPollResult = {
      moveX: 0,
      moveY: 0,
      lookX: 0,
      lookY: 0,
      jumpPressed: false,
      crouchPressed: false,
      interactJustPressed: false,
      equipmentJustPressed: false,
      sprint: false,
      connected: false,
    };
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return empty;
    const pads = navigator.getGamepads();
    const gp = pads.find((p) => p && p.connected);
    if (!gp) return empty;

    const dz = (v: number) => (Math.abs(v) < deadzone ? 0 : (v - Math.sign(v) * deadzone) / (1 - deadzone));
    const moveX = dz(gp.axes[0] ?? 0);
    const moveY = -dz(gp.axes[1] ?? 0); // Forward up = positive
    const lookX = dz(gp.axes[2] ?? 0);
    const lookY = dz(gp.axes[3] ?? 0);

    const aBtn = Boolean(gp.buttons[0]?.pressed); // Jump (A / Cross)
    const bBtn = Boolean(gp.buttons[1]?.pressed); // Crouch (B / Circle)
    const xBtn = Boolean(gp.buttons[2]?.pressed); // Interact (X / Square)
    const yBtn = Boolean(gp.buttons[3]?.pressed); // Equipment (Y / Triangle)
    const l3OrLb = Boolean(gp.buttons[4]?.pressed || gp.buttons[10]?.pressed);

    const interactJustPressed = xBtn && !this.prevXBtn;
    const equipmentJustPressed = yBtn && !this.prevYBtn;
    this.prevXBtn = xBtn;
    this.prevYBtn = yBtn;

    return {
      moveX,
      moveY,
      lookX,
      lookY,
      jumpPressed: aBtn,
      crouchPressed: bBtn,
      interactJustPressed,
      equipmentJustPressed,
      sprint: l3OrLb,
      connected: true,
    };
  }
}
