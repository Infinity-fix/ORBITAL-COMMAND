import type { EnvironmentId, EquipmentId } from '../engine/types';

export type InteractableKind =
  | 'console'
  | 'door'
  | 'airlock'
  | 'rover'
  | 'instrument'
  | 'sample'
  | 'power'
  | 'comms'
  | 'repair'
  | 'navigation'
  | 'storage'
  | 'spacecraft-ctrl'
  | 'handhold';

export interface InteractableDef {
  id: string;
  name: string;
  kind: InteractableKind;
  environment: EnvironmentId;
  x: number;
  y: number;
  z: number;
  radius: number;
  actionLabel: string;
  requiredEquipment?: EquipmentId;
  targetEnvironment?: EnvironmentId;
  description: string;
}

export const WORLD_INTERACTABLES: InteractableDef[] = [
  // ======================== ENVIRONMENT A: SPACE STATION ========================
  {
    id: 'st-mission-brief-holo',
    name: 'Mission Control Briefing Display',
    kind: 'console',
    environment: 'station',
    x: 0,
    y: 0.9,
    z: -18.5,
    radius: 3.0,
    actionLabel: 'Review Mission Objectives & Launch Authorization',
    description: 'Holographic tactical table displaying active flight readiness and crew checklist.',
  },
  {
    id: 'st-comms-console',
    name: 'Deep Space Network Comms Console',
    kind: 'comms',
    environment: 'station',
    x: -6,
    y: 0.9,
    z: -16,
    radius: 2.6,
    actionLabel: 'Verify Telemetry & Comms Systems',
    description: 'X/Ka-band relay transceiver rack with Flight Loop link check.',
  },
  {
    id: 'st-power-console',
    name: 'Station Solar & Bus Power Panel',
    kind: 'power',
    environment: 'station',
    x: 6,
    y: 0.9,
    z: -16,
    radius: 2.6,
    actionLabel: 'Verify Power Bus & Battery Margins',
    description: 'Primary photovoltaic truss distribution and eclipse battery state monitor.',
  },
  {
    id: 'st-science-lab',
    name: 'Science Payload Calibration Bench',
    kind: 'instrument',
    environment: 'station',
    x: -18,
    y: 0.9,
    z: -4,
    radius: 2.8,
    actionLabel: 'Inspect Science Instruments',
    description: 'Bench for spectrometer, multispectral camera, and sample canister validation.',
  },
  {
    id: 'st-crew-quarters',
    name: 'Crew Quarters & Suit Locker',
    kind: 'storage',
    environment: 'station',
    x: -18,
    y: 0.9,
    z: 4,
    radius: 2.8,
    actionLabel: 'Inspect Crew Gear & Resupply Suit',
    description: 'Personal flight lockers, helmet seals, and EVA equipment rack.',
  },
  {
    id: 'st-eclss-o2',
    name: 'ECLSS Oxygen & Life Support Rack',
    kind: 'power',
    environment: 'station',
    x: 16,
    y: 0.9,
    z: -4,
    radius: 2.8,
    actionLabel: 'Check Oxygen & Life Support Loop',
    description: 'Sabatier & electrolysis oxygen loop scrubber plus reserve O2 manifold.',
  },
  {
    id: 'st-eng-storage',
    name: 'Engineering Pre-Launch Inspection Bay',
    kind: 'repair',
    environment: 'station',
    x: 16,
    y: 0.9,
    z: 4,
    radius: 2.8,
    actionLabel: 'Complete Pre-Launch Equipment Inspection',
    description: 'Spacecraft docking adapter, thermal blankets, and spare EVA tool inventory.',
  },
  {
    id: 'st-airlock-spacecraft',
    name: 'Spacecraft Docking Airlock Hatch',
    kind: 'airlock',
    environment: 'station',
    x: 22.2,
    y: 1.0,
    z: 0,
    radius: 2.8,
    actionLabel: 'Board Crew Spacecraft Interior',
    targetEnvironment: 'spacecraft',
    description: 'Pressurized transfer tunnel leading directly into the Orbital Command spacecraft cabin.',
  },

  // ======================== ENVIRONMENT B: SPACECRAFT INTERIOR ========================
  {
    id: 'sc-cockpit-nav',
    name: 'Primary Navigation & Guidance Console',
    kind: 'spacecraft-ctrl',
    environment: 'spacecraft',
    x: 0,
    y: 0.9,
    z: -9.5,
    radius: 2.8,
    actionLabel: 'Run Pre-Launch Checklist / Launch Operations',
    description: 'Flight computer PFD, attitude gyro readouts, and launch ignition sequence trigger.',
  },
  {
    id: 'sc-propulsion-panel',
    name: 'Propulsion & Countdown Control Panel',
    kind: 'spacecraft-ctrl',
    environment: 'spacecraft',
    x: -3.4,
    y: 0.9,
    z: -7.0,
    radius: 2.5,
    actionLabel: 'Arm Thrusters & Monitor Countdown Telemetry',
    description: 'Main engine gimbal pressures, helium purge valves, and delta-V burn timer.',
  },
  {
    id: 'sc-power-panel',
    name: 'Spacecraft Power Management Panel',
    kind: 'power',
    environment: 'spacecraft',
    x: 3.4,
    y: 0.9,
    z: -7.0,
    radius: 2.5,
    actionLabel: 'Verify Spacecraft Fuel Cells & Solar Arrays',
    description: 'Bus voltage, RTG/Solar bus allocation, and battery charge controller.',
  },
  {
    id: 'sc-comms-panel',
    name: 'Spacecraft Ka-Band Comms Console',
    kind: 'comms',
    environment: 'spacecraft',
    x: -3.4,
    y: 0.9,
    z: -4.0,
    radius: 2.5,
    actionLabel: 'Transmit Orbital Insertion Telemetry',
    description: 'High-gain antenna pointing and real-time ground control data link.',
  },
  {
    id: 'sc-storage-cabin',
    name: 'Crew Cabin Equipment & Payload Bay',
    kind: 'storage',
    environment: 'spacecraft',
    x: 0,
    y: 0.8,
    z: 4.5,
    radius: 2.6,
    actionLabel: 'Secure Crew & Deploy Orbital Payload',
    description: 'Tie-down cargo restraint bay and orbital payload deployment mechanism.',
  },
  {
    id: 'sc-emergency-kit',
    name: 'Cabin Emergency O2 & Repair Locker',
    kind: 'storage',
    environment: 'spacecraft',
    x: -3.6,
    y: 0.9,
    z: 2.0,
    radius: 2.4,
    actionLabel: 'Replenish Suit O2 & Emergency Kit',
    description: 'Emergency depressurization masks, fire suppressant, and O2 cartridges.',
  },
  {
    id: 'sc-airlock-eva',
    name: 'Aft EVA Airlock Hatch',
    kind: 'airlock',
    environment: 'spacecraft',
    x: 0,
    y: 1.0,
    z: 9.2,
    radius: 2.6,
    actionLabel: 'Exit Airlock to Zero-G Orbital EVA',
    targetEnvironment: 'orbital-eva',
    description: 'Depressurize airlock and step outside into orbital space.',
  },

  // ======================== ENVIRONMENT C: LUNAR SURFACE ========================
  {
    id: 'mn-lander-airlock',
    name: 'Lunar Descent Lander Airlock',
    kind: 'airlock',
    environment: 'moon',
    x: 0,
    y: 1.2,
    z: 0,
    radius: 4.2,
    actionLabel: 'Enter Lander / Recharge Suit & Transmit Data',
    description: 'Pressurized ascent stage cabin; restores O2/battery and logs landing completion.',
  },
  {
    id: 'mn-habitat-pad',
    name: 'Lunar South Pole Habitat & Solar Array',
    kind: 'power',
    environment: 'moon',
    x: -16,
    y: 1.2,
    z: 14,
    radius: 4.5,
    actionLabel: 'Recharge Suit Systems at Lunar Outpost',
    description: 'Pressurized surface shelter with high-efficiency solar power and O2 reserve.',
  },
  {
    id: 'mn-comms-tower',
    name: 'Lunar High-Gain Comms Array',
    kind: 'comms',
    environment: 'moon',
    x: -10,
    y: 1.2,
    z: -8,
    radius: 3.4,
    actionLabel: 'Transmit Lunar Science Packets to Earth',
    description: 'Earth-pointing S/Ka-band parabolic surface relay dish.',
  },
  {
    id: 'mn-sample-basalt',
    name: 'Anorthosite & Basalt Outcrop (Site Alpha)',
    kind: 'sample',
    environment: 'moon',
    x: 18,
    y: 0.6,
    z: -16,
    radius: 3.4,
    actionLabel: 'Collect Lunar Rock Sample',
    requiredEquipment: 'sample-container',
    description: 'Exposed highland ejecta boulders suitable for sealed core/rock collection.',
  },
  {
    id: 'mn-crater-ice',
    name: 'Shackleton Rim Volatile Ice Crater (Site Beta)',
    kind: 'sample',
    environment: 'moon',
    x: -24,
    y: -0.6,
    z: -26,
    radius: 4.2,
    actionLabel: 'Inspect Crater & Scan Water-Ice Volatiles',
    requiredEquipment: 'spectrometer',
    description: 'Shadowed crater wall holding potential subsurface water-ice signatures.',
  },
  {
    id: 'mn-seismic-site',
    name: 'Passive Seismic Experiment Pad (Site Gamma)',
    kind: 'instrument',
    environment: 'moon',
    x: 26,
    y: 0.6,
    z: 18,
    radius: 3.6,
    actionLabel: 'Deploy Seismic & Regolith Experiment',
    requiredEquipment: 'drill',
    description: 'Level regolith pad prepared for lunar seismometer and heat-flow probe deployment.',
  },

  // ======================== ENVIRONMENT D: MARS SURFACE ========================
  {
    id: 'ms-lander-base',
    name: 'Mars Descent Module & Recovery Beacon',
    kind: 'airlock',
    environment: 'mars',
    x: 0,
    y: 1.2,
    z: 0,
    radius: 4.2,
    actionLabel: 'Board Mars Lander / Recharge & Log Return',
    description: 'Primary surface entry vehicle with life support umbilical.',
  },
  {
    id: 'ms-habitat-dome',
    name: 'Jezero Pressurized Research Habitat',
    kind: 'power',
    environment: 'mars',
    x: -15,
    y: 1.2,
    z: 12,
    radius: 4.8,
    actionLabel: 'Enter Mars Habitat / Recharge O2 & Power',
    description: 'Pressurized inflatable research module with solar farm and dust airlock.',
  },
  {
    id: 'ms-comms-relay',
    name: 'Mars UHF/X-Band Surface Relay Mast',
    kind: 'comms',
    environment: 'mars',
    x: -12,
    y: 1.2,
    z: -14,
    radius: 3.4,
    actionLabel: 'Deploy & Align Mars Comms Relay',
    description: 'Relays surface science telemetry to Mars Reconnaissance Orbiter.',
  },
  {
    id: 'ms-delta-outcrop',
    name: 'Jezero Delta Layered Outcrop (Site Alpha)',
    kind: 'sample',
    environment: 'mars',
    x: 24,
    y: 1.2,
    z: -18,
    radius: 3.8,
    actionLabel: 'Scan Geological Strata & Collect Sample',
    requiredEquipment: 'hammer',
    description: 'Ancient river-delta sedimentary ridge showing lacustrine mineral bands.',
  },
  {
    id: 'ms-clay-drill-site',
    name: 'Hydrated Clay Core Drill Site (Site Beta)',
    kind: 'instrument',
    environment: 'mars',
    x: -26,
    y: 0.8,
    z: -24,
    radius: 4.0,
    actionLabel: 'Operate Core Drill & Spectrometer',
    requiredEquipment: 'drill',
    description: 'Phyllosilicate clay bed ideal for biosignature core extraction.',
  },
  {
    id: 'ms-dust-crater',
    name: 'Aeolian Dust Basin (Site Gamma)',
    kind: 'sample',
    environment: 'mars',
    x: 22,
    y: -0.6,
    z: 22,
    radius: 4.0,
    actionLabel: 'Measure Atmospheric Dust & Soil Chemistry',
    requiredEquipment: 'spectrometer',
    description: 'Fine iron-oxide dust basin with active electrostatic grain drift.',
  },

  // ======================== ENVIRONMENT E: ORBITAL ZERO-G EVA ========================
  {
    id: 'eva-airlock-return',
    name: 'Spacecraft EVA Airlock Hatch',
    kind: 'airlock',
    environment: 'orbital-eva',
    x: 0,
    y: 1.5,
    z: 8.2,
    radius: 3.6,
    actionLabel: 'Re-Enter Pressurized Spacecraft Cabin',
    targetEnvironment: 'spacecraft',
    description: 'Tether anchor point and pressurized EVA ingress hatch.',
  },
  {
    id: 'eva-robotic-arm',
    name: 'Station Robotic Arm Worksite',
    kind: 'navigation',
    environment: 'orbital-eva',
    x: -6.5,
    y: 2.0,
    z: -6.0,
    radius: 3.4,
    actionLabel: 'Inspect Robotic Arm End-Effector',
    description: '7-DOF latching robotic manipulator servicing orbital truss payloads.',
  },
  {
    id: 'eva-fault-node',
    name: 'Damaged Satellite Solar & Telemetry Bus',
    kind: 'repair',
    environment: 'orbital-eva',
    x: 0,
    y: 3.0,
    z: -22.0,
    radius: 4.2,
    actionLabel: 'Inspect Fault & Repair Satellite Array',
    requiredEquipment: 'repair-tool',
    description: 'Micrometeoroid-damaged rotary solar actuator and telemetry bus harness.',
  },
  {
    id: 'eva-telemetry-verify',
    name: 'Satellite Orbital Transponder Panel',
    kind: 'comms',
    environment: 'orbital-eva',
    x: 9.5,
    y: 1.8,
    z: -18.0,
    radius: 3.8,
    actionLabel: 'Verify Restored Satellite Telemetry Link',
    description: 'External diagnostics port confirming nominal bus voltage and downlink lock.',
  },
];

export interface NearestInteractableResult {
  item: InteractableDef;
  distance: number;
  hasRequiredEquipment: boolean;
  blockedReason?: string;
}

export function findNearestInteractable(
  env: EnvironmentId,
  pos: { x: number; y: number; z: number },
  equippedId: EquipmentId | null,
  inventoryIds: EquipmentId[],
  rover?: { id: string; name: string; x: number; y: number; z: number; occupiedByLocal: boolean } | null
): NearestInteractableResult | null {
  let best: NearestInteractableResult | null = null;

  for (const item of WORLD_INTERACTABLES) {
    if (item.environment !== env) continue;
    const dist =
      env === 'orbital-eva'
        ? Math.hypot(pos.x - item.x, pos.y - item.y, pos.z - item.z)
        : Math.hypot(pos.x - item.x, pos.z - item.z);

    if (dist <= item.radius && (!best || dist < best.distance)) {
      const hasReq =
        !item.requiredEquipment ||
        equippedId === item.requiredEquipment ||
        inventoryIds.includes(item.requiredEquipment);
      best = {
        item,
        distance: Number(dist.toFixed(1)),
        hasRequiredEquipment: hasReq,
        blockedReason: hasReq ? undefined : `Requires ${item.requiredEquipment} in equipment kit`,
      };
    }
  }

  // Also check drivable rover proximity when on Moon or Mars
  if (rover && !rover.occupiedByLocal) {
    const rDist = Math.hypot(pos.x - rover.x, pos.z - rover.z);
    if (rDist <= 3.6 && (!best || rDist < best.distance)) {
      best = {
        item: {
          id: rover.id,
          name: rover.name,
          kind: 'rover',
          environment: env,
          x: rover.x,
          y: rover.y,
          z: rover.z,
          radius: 3.6,
          actionLabel: 'Enter & Drive Rover',
          description: 'Pressurized electric terrain rover with onboard navigation & science rack.',
        },
        distance: Number(rDist.toFixed(1)),
        hasRequiredEquipment: true,
      };
    }
  }

  return best;
}
