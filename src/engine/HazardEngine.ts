/**
 * HazardEngine.ts
 * Manages active environmental hazards, tracks their 3D positions, trajectories, types, and severities,
 * handles collision detection / proximity with the spacecraft/astronaut, and integrates with
 * useMissionStore simulation state to trigger physical damage and alert UI events.
 */

import { createActiveHazard, applySubsystemDamage, type EnvironmentalHazard, type SubsystemConditions } from './HazardDamageSystem';
import type { EnvironmentId } from './types';

export interface ActiveHazardInstance {
  hazard: EnvironmentalHazard;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  radius: number;
  triggered: boolean;
}

export class HazardEngine {
  private static instance: HazardEngine;
  private activeHazards: ActiveHazardInstance[] = [];

  private constructor() {}

  public static getInstance(): HazardEngine {
    if (!HazardEngine.instance) {
      HazardEngine.instance = new HazardEngine();
    }
    return HazardEngine.instance;
  }

  public spawnHazard(type: any, environment: EnvironmentId, initialPos?: { x: number; y: number; z: number }): EnvironmentalHazard {
    const hazard = createActiveHazard(type, environment);
    const pos = initialPos ?? {
      x: (Math.random() - 0.5) * 50,
      y: 10 + Math.random() * 20,
      z: (Math.random() - 0.5) * 50,
    };
    const vel = {
      x: (Math.random() - 0.5) * 2,
      y: -0.5,
      z: (Math.random() - 0.5) * 2,
    };

    const instance: ActiveHazardInstance = {
      hazard,
      position: pos,
      velocity: vel,
      radius: 8.0,
      triggered: false,
    };

    this.activeHazards.push(instance);
    return hazard;
  }

  public getActiveHazards(): ActiveHazardInstance[] {
    return this.activeHazards;
  }

  public updateHazards(
    dt: number,
    targetPos: { x: number; y: number; z: number },
    subsystemConditions: SubsystemConditions,
    onHazardHit: (hazard: EnvironmentalHazard, affectedSubsystem: string, damage: number) => void
  ): { nextConditions: SubsystemConditions; triggeredEvents: EnvironmentalHazard[] } {
    const triggeredEvents: EnvironmentalHazard[] = [];
    let currentConditions = { ...subsystemConditions };

    for (const inst of this.activeHazards) {
      // Update position
      inst.position.x += inst.velocity.x * dt;
      inst.position.y += inst.velocity.y * dt;
      inst.position.z += inst.velocity.z * dt;

      // Check distance to target (spacecraft or astronaut)
      const dist = Math.hypot(
        inst.position.x - targetPos.x,
        inst.position.y - targetPos.y,
        inst.position.z - targetPos.z
      );

      if (dist <= inst.radius && !inst.triggered) {
        inst.triggered = true;
        triggeredEvents.push(inst.hazard);

        // Apply physical damage
        const sub = inst.hazard.affectedSubsystem;
        const dmg = inst.hazard.damagePotential;
        currentConditions = applySubsystemDamage(currentConditions, sub, dmg);

        onHazardHit(inst.hazard, sub, dmg);
      }
    }

    // Clean up expired or far hazards
    this.activeHazards = this.activeHazards.filter((h) => !h.triggered && h.position.y > -20);

    return { nextConditions: currentConditions, triggeredEvents };
  }

  public clearHazards(): void {
    this.activeHazards = [];
  }
}
