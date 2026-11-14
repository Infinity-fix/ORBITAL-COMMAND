import type { EquipmentId, EquipmentSpec, InventoryItemState } from '../engine/types';

export const EQUIPMENT_CATALOG: Record<EquipmentId, EquipmentSpec> = {
  camera: {
    id: 'camera',
    name: 'Scientific Multispectral Camera',
    shortLabel: 'Camera',
    category: 'Science',
    massKg: 1.4,
    powerDrawPct: 0.8,
    description: 'Captures calibrated geological, orbital, and experiment visual records.',
    animationOnUse: 'instrument',
  },
  'sample-container': {
    id: 'sample-container',
    name: 'Hermetic Sample Container',
    shortLabel: 'Sample Tube',
    category: 'Science',
    massKg: 1.8,
    powerDrawPct: 0.2,
    description: 'Stores uncontaminated regolith, rock, and volatile ice core specimens.',
    animationOnUse: 'collect',
  },
  hammer: {
    id: 'hammer',
    name: 'Geological Field Hammer',
    shortLabel: 'Hammer',
    category: 'Science',
    massKg: 1.2,
    powerDrawPct: 0,
    description: 'Chips fresh mineral faces on craters, basalt outcrops, and boulders.',
    animationOnUse: 'collect',
  },
  drill: {
    id: 'drill',
    name: 'Rotary Core Drill',
    shortLabel: 'Core Drill',
    category: 'Science',
    massKg: 3.1,
    powerDrawPct: 2.2,
    description: 'Extracts subsurface core samples from Moon regolith and Mars delta clay.',
    animationOnUse: 'instrument',
  },
  spectrometer: {
    id: 'spectrometer',
    name: 'Laser Raman Spectrometer',
    shortLabel: 'Spectrometer',
    category: 'Science',
    massKg: 2.2,
    powerDrawPct: 1.8,
    description: 'Identifies mineralogy, hydrated silicates, and volatile elemental ratios.',
    animationOnUse: 'instrument',
  },
  'repair-tool': {
    id: 'repair-tool',
    name: 'Precision EVA Repair Driver',
    shortLabel: 'Repair Tool',
    category: 'Engineering',
    massKg: 1.9,
    powerDrawPct: 1.4,
    description: 'Services solar actuators, bus harnesses, rovers, and external satellite nodes.',
    animationOnUse: 'repair',
  },
  comms: {
    id: 'comms',
    name: 'Field Comms Transceiver',
    shortLabel: 'Comms Relay',
    category: 'Navigation',
    massKg: 1.1,
    powerDrawPct: 0.9,
    description: 'Establishes telemetry uplink and transmits science packets to Mission Control.',
    animationOnUse: 'console',
  },
  flashlight: {
    id: 'flashlight',
    name: 'Helmet & Suit High-Lumen Spot',
    shortLabel: 'Flashlight',
    category: 'Navigation',
    massKg: 0.5,
    powerDrawPct: 0.4,
    description: 'Illuminates permanently shadowed craters, EVA hulls, and station bays.',
    animationOnUse: 'interact',
  },
  'emergency-o2': {
    id: 'emergency-o2',
    name: 'Emergency O2 Reserve Cartridge',
    shortLabel: 'Emerg O2',
    category: 'Survival',
    massKg: 2.4,
    powerDrawPct: 0,
    description: 'Injects +40% breathing oxygen into suit PLSS loop during critical depletion.',
    animationOnUse: 'emergency',
  },
  'nav-device': {
    id: 'nav-device',
    name: 'Inertial Waypoint Beacon Pad',
    shortLabel: 'Nav Beacon',
    category: 'Navigation',
    massKg: 0.9,
    powerDrawPct: 0.5,
    description: 'Calibrates terrain-relative bearings and marks return-to-lander routes.',
    animationOnUse: 'console',
  },
};

export const ALL_EQUIPMENT_IDS = Object.keys(EQUIPMENT_CATALOG) as EquipmentId[];
export const MAX_INVENTORY_SLOTS = 10;

export function createDefaultInventory(loadoutIds?: EquipmentId[]): InventoryItemState[] {
  const baseIds: EquipmentId[] =
    loadoutIds && loadoutIds.length > 0
      ? loadoutIds
      : [
          'camera',
          'sample-container',
          'hammer',
          'drill',
          'spectrometer',
          'repair-tool',
          'comms',
          'flashlight',
          'emergency-o2',
          'nav-device',
        ];

  const unique = Array.from(new Set(baseIds)).slice(0, MAX_INVENTORY_SLOTS);
  return unique.map((id) => ({
    id,
    quantity: id === 'emergency-o2' ? 2 : id === 'sample-container' ? 5 : 1,
    durabilityPct: 100,
    active: id === 'flashlight' ? false : false,
  }));
}

export function getTotalCarriedMassKg(items: InventoryItemState[]): number {
  return Number(
    items
      .reduce((sum, item) => sum + EQUIPMENT_CATALOG[item.id].massKg * Math.min(2, item.quantity), 0)
      .toFixed(1)
  );
}

export function addOrRestockItem(
  items: InventoryItemState[],
  id: EquipmentId,
  quantityDelta: number = 1
): { items: InventoryItemState[]; added: boolean } {
  const existing = items.find((i) => i.id === id);
  if (existing) {
    return {
      added: true,
      items: items.map((i) =>
        i.id === id
          ? { ...i, quantity: i.quantity + quantityDelta, durabilityPct: 100 }
          : i
      ),
    };
  }
  if (items.length >= MAX_INVENTORY_SLOTS) {
    return { items, added: false };
  }
  return {
    added: true,
    items: [...items, { id, quantity: quantityDelta, durabilityPct: 100, active: false }],
  };
}

export function consumeDurabilityOrCharge(
  items: InventoryItemState[],
  id: EquipmentId,
  wearPct: number = 6
): InventoryItemState[] {
  return items
    .map((item) => {
      if (item.id !== id) return item;
      if (id === 'emergency-o2') {
        const nextQty = Math.max(0, item.quantity - 1);
        return { ...item, quantity: nextQty };
      }
      const nextDur = Math.max(5, item.durabilityPct - wearPct);
      return { ...item, durabilityPct: nextDur };
    })
    .filter((i) => i.quantity > 0);
}
