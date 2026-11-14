import type {
  CharacterAnimationState,
  EnvironmentId,
  EquipmentId,
  InventoryItemState,
  RoverState,
  ScienceRecord,
  SurvivalTelemetry,
} from '../engine/types';
import { repairRoverIntegrity, repairSuitIntegrity, scrubSuitCO2 } from './DamageSystem';
import { EQUIPMENT_CATALOG, consumeDurabilityOrCharge } from './InventorySystem';

export interface EquipmentUseResult {
  used: boolean;
  message: string;
  animState: CharacterAnimationState;
  nextInventory: InventoryItemState[];
  nextTelemetry: SurvivalTelemetry;
  nextRover?: RoverState | null;
  newScienceRecord?: ScienceRecord;
  toggleFlashlight?: boolean;
  transmitScience?: boolean;
}

export function executeEquipmentUse(params: {
  equipmentId: EquipmentId;
  inventory: InventoryItemState[];
  telemetry: SurvivalTelemetry;
  environment: EnvironmentId;
  position: { x: number; y: number; z: number };
  nearestLocationLabel: string;
  activeObjectiveTitle: string;
  scienceCount: number;
  scienceBonusMultiplier?: number;
  missionRef?: string;
  rover?: RoverState | null;
}): EquipmentUseResult {
  const {
    equipmentId,
    inventory,
    telemetry,
    environment,
    position,
    nearestLocationLabel,
    activeObjectiveTitle,
    scienceCount,
    scienceBonusMultiplier = 1,
    missionRef = 'Orbital Command Campaign',
    rover = null,
  } = params;

  const spec = EQUIPMENT_CATALOG[equipmentId];
  const item = inventory.find((i) => i.id === equipmentId);
  if (!item || item.quantity <= 0) {
    return {
      used: false,
      message: `${spec.shortLabel} unavailable in inventory.`,
      animState: 'idle',
      nextInventory: inventory,
      nextTelemetry: telemetry,
      nextRover: rover,
    };
  }

  if (equipmentId === 'flashlight') {
    return {
      used: true,
      message: 'Toggled suit helmet illuminator.',
      animState: 'interact',
      nextInventory: inventory,
      nextTelemetry: telemetry,
      nextRover: rover,
      toggleFlashlight: true,
    };
  }

  if (equipmentId === 'emergency-o2') {
    const nextO2 = Math.min(100, Number((telemetry.oxygenPct + 40).toFixed(1)));
    const nextInventory = consumeDurabilityOrCharge(inventory, 'emergency-o2', 0);
    return {
      used: true,
      message: `Emergency O2 cartridge purged into PLSS loop (O2: ${nextO2}%).`,
      animState: 'emergency',
      nextInventory,
      nextTelemetry: {
        ...telemetry,
        oxygenPct: nextO2,
        co2Pct: Math.max(0.04, Number((telemetry.co2Pct - 0.8).toFixed(2))),
        suitPressureKpa: Math.max(telemetry.suitPressureKpa, 98.5),
      },
      nextRover: rover,
    };
  }

  if (telemetry.batteryPct < spec.powerDrawPct + 1) {
    return {
      used: false,
      message: `Insufficient suit battery for ${spec.name}. Recharge at habitat or lander.`,
      animState: 'idle',
      nextInventory: inventory,
      nextTelemetry: telemetry,
      nextRover: rover,
    };
  }

  const nextTelemetry: SurvivalTelemetry = {
    ...telemetry,
    batteryPct: Math.max(0, Number((telemetry.batteryPct - spec.powerDrawPct).toFixed(1))),
  };
  const nextInventory = consumeDurabilityOrCharge(inventory, equipmentId, 5);

  if (equipmentId === 'comms') {
    return {
      used: true,
      message: `Telemetry uplink packet transmitted via ${spec.name}.`,
      animState: 'console',
      nextInventory,
      nextTelemetry,
      nextRover: rover,
      transmitScience: true,
    };
  }

  if (equipmentId === 'nav-device') {
    return {
      used: true,
      message: `Inertial waypoint fix logged at (${position.x.toFixed(1)}m, ${position.z.toFixed(1)}m).`,
      animState: 'console',
      nextInventory,
      nextTelemetry,
      nextRover: rover,
    };
  }

  if (equipmentId === 'repair-tool') {
    const nearRover =
      rover !== null &&
      Math.hypot(position.x - rover.x, position.z - rover.z) <= 4.8 &&
      rover.integrityPct < 100;

    if (nearRover && rover) {
      const fixedRover = repairRoverIntegrity(rover);
      return {
        used: true,
        message: `Field-repaired ${rover.name} to ${Math.round(fixedRover.integrityPct)}% integrity.`,
        animState: 'repair',
        nextInventory,
        nextTelemetry,
        nextRover: fixedRover,
      };
    }

    if (nextTelemetry.suitIntegrityPct < 100 || nextTelemetry.oxygenLeakPerSec > 0) {
      const patched = repairSuitIntegrity(nextTelemetry);
      return {
        used: true,
        message: `Suit seal patched (${Math.round(patched.suitIntegrityPct)}% integrity, leak sealed).`,
        animState: 'repair',
        nextInventory,
        nextTelemetry: patched,
        nextRover: rover,
      };
    }

    return {
      used: true,
      message: 'EVA Precision Driver cycled — hardware and suit seals nominal.',
      animState: 'repair',
      nextInventory,
      nextTelemetry,
      nextRover: rover,
    };
  }

  // Science instruments generate authentic simulated science records
  const sampleNum = String(scienceCount + 1).padStart(3, '0');
  const measurementsByTool: Record<
    'camera' | 'sample-container' | 'hammer' | 'drill' | 'spectrometer',
    {
      val: string;
      unit: string;
      title: string;
      sampleType: ScienceRecord['sampleType'];
      baseValue: number;
    }
  > = {
    camera: {
      title: `Multispectral Frame · ${nearestLocationLabel}`,
      val: environment === 'mars' ? '670nm Ferric Albedo 0.24' : environment === 'moon' ? 'TiO2 Reflectance 4.8' : '42MP Calibration',
      unit: 'SR-Img',
      sampleType: 'Imagery',
      baseValue: 22,
    },
    'sample-container': {
      title: `Sealed Specimen · ${nearestLocationLabel}`,
      val: environment === 'mars' ? '142.6' : environment === 'moon' ? '118.4' : '45.0',
      unit: 'g regolith',
      sampleType: environment === 'mars' ? 'Atmospheric Dust' : 'Rock',
      baseValue: 35,
    },
    hammer: {
      title: `Fracture Cleavage Assay · ${nearestLocationLabel}`,
      val: environment === 'mars' ? 'Basaltic Mudstone 5.8' : 'Anorthosite 6.2',
      unit: 'Mohs',
      sampleType: 'Rock',
      baseValue: 32,
    },
    drill: {
      title: `Subsurface Core 45cm · ${nearestLocationLabel}`,
      val: environment === 'moon' ? '1.9% H2O Ice' : '11.4% Hydrated Clay',
      unit: 'wt%',
      sampleType: environment === 'moon' ? 'Volatile Ice' : 'Regolith Core',
      baseValue: 48,
    },
    spectrometer: {
      title: `Raman Mineral Spectrum · ${nearestLocationLabel}`,
      val: environment === 'mars' ? 'Fe2O3 / Mg-Smectite 842' : environment === 'moon' ? 'Ilmenite 712' : 'SiO2 1084',
      unit: 'cm⁻¹',
      sampleType: 'Mineral Spectrum',
      baseValue: 40,
    },
  };

  const reading = measurementsByTool[equipmentId as keyof typeof measurementsByTool] ?? {
    title: `Field Measurement · ${nearestLocationLabel}`,
    val: 'Nominal',
    unit: 'units',
    sampleType: 'Rock' as const,
    baseValue: 20,
  };

  const record: ScienceRecord = {
    id: `sci-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sampleId: `OC-${environment.toUpperCase().slice(0, 3)}-${sampleNum}`,
    title: reading.title,
    sampleType: reading.sampleType,
    environment,
    locationLabel: nearestLocationLabel,
    coordinates: {
      x: Number(position.x.toFixed(1)),
      y: Number(position.y.toFixed(1)),
      z: Number(position.z.toFixed(1)),
    },
    timestamp: new Date().toISOString(),
    instrument: spec.name,
    measurement: reading.val,
    unit: reading.unit,
    researchValue: Math.round(reading.baseValue * scienceBonusMultiplier),
    missionRef,
    sourceLabel: 'Simulated Mission Instrument Data',
    objectiveLink: activeObjectiveTitle,
    transmitted: false,
  };

  return {
    used: true,
    message: `${spec.shortLabel} recorded ${record.sampleId} (+${record.researchValue} RV): ${record.measurement} ${record.unit}.`,
    animState: spec.animationOnUse,
    nextInventory,
    nextTelemetry,
    nextRover: rover,
    newScienceRecord: record,
  };
}

export function executeRefillTool(params: {
  equippedId: EquipmentId | null;
  inventory: InventoryItemState[];
  telemetry: SurvivalTelemetry;
}): {
  ok: boolean;
  message: string;
  nextInventory: InventoryItemState[];
  nextTelemetry: SurvivalTelemetry;
} {
  const { equippedId, inventory, telemetry } = params;
  // Scrub CO2 if high, or recharge/recalibrate equipped instrument
  let nextTel = telemetry;
  let scrubbed = false;
  if (telemetry.co2Pct > 0.6) {
    nextTel = scrubSuitCO2(telemetry);
    scrubbed = true;
  }

  if (!equippedId) {
    return {
      ok: scrubbed,
      message: scrubbed
        ? `PLSS CO2 cartridge cycled (CO2: ${nextTel.co2Pct}%).`
        : 'Select a tool to recalibrate or enter a Safe Zone to resupply.',
      nextInventory: inventory,
      nextTelemetry: nextTel,
    };
  }

  const item = inventory.find((i) => i.id === equippedId);
  if (!item) {
    return {
      ok: scrubbed,
      message: scrubbed ? `PLSS CO2 cartridge cycled (CO2: ${nextTel.co2Pct}%).` : 'No equipped item.',
      nextInventory: inventory,
      nextTelemetry: nextTel,
    };
  }

  if (!nextTel.inSafeZone && nextTel.batteryPct < 8) {
    return {
      ok: false,
      message: 'Battery too low to recalibrate tool outside Safe Zone.',
      nextInventory: inventory,
      nextTelemetry: telemetry,
    };
  }

  const batteryCost = nextTel.inSafeZone ? 0 : 3;
  nextTel = {
    ...nextTel,
    batteryPct: Math.max(0, Number((nextTel.batteryPct - batteryCost).toFixed(1))),
  };

  const nextInventory = inventory.map((i) =>
    i.id === equippedId
      ? {
          ...i,
          durabilityPct: 100,
          quantity: i.id === 'sample-container' && nextTel.inSafeZone ? Math.max(i.quantity, 5) : i.quantity,
        }
      : i
  );

  const spec = EQUIPMENT_CATALOG[equippedId];
  return {
    ok: true,
    message: `${spec.shortLabel} recalibrated to 100%${scrubbed ? ` & CO2 scrubbed (${nextTel.co2Pct}%)` : ''}.`,
    nextInventory,
    nextTelemetry: nextTel,
  };
}
