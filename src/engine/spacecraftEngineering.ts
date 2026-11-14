import {
  DESTINATIONS,
  LAUNCH_VEHICLES,
  PAYLOADS,
  POWER_SYSTEMS,
  PROPULSION_SYSTEMS,
  STRUCTURES,
} from './catalog';
import { calculateTsiolkovskyDeltaVKms } from './orbitalMechanics';
import type { DestinationId, MissionDesign, SpacecraftEngineeringSummary } from './types';

export function getLauncherCapacityForDestination(
  launcherId: string,
  destinationId: DestinationId
): number {
  const lv = LAUNCH_VEHICLES.find((l) => l.id === launcherId) ?? LAUNCH_VEHICLES[1];
  switch (destinationId) {
    case 'leo':
      return lv.leoCapacityKg;
    case 'geo':
      return lv.gtoCapacityKg;
    case 'moon':
    case 'sun-earth-l2':
      return lv.tliCapacityKg;
    case 'mars':
    case 'venus':
      return lv.marsTmiCapacityKg;
    case 'ceres':
    case 'jupiter':
      return lv.outerPlanetCapacityKg;
    default:
      return lv.leoCapacityKg;
  }
}

export function computeSpacecraftEngineering(mission: MissionDesign): SpacecraftEngineeringSummary {
  const dest = DESTINATIONS.find((d) => d.id === mission.destinationId) ?? DESTINATIONS[0];
  const structure = STRUCTURES.find((s) => s.id === mission.spacecraft.structureId) ?? STRUCTURES[1];
  const propulsion =
    PROPULSION_SYSTEMS.find((p) => p.id === mission.spacecraft.propulsionId) ?? PROPULSION_SYSTEMS[2];
  const power = POWER_SYSTEMS.find((p) => p.id === mission.spacecraft.powerId) ?? POWER_SYSTEMS[1];
  const launcher = LAUNCH_VEHICLES.find((l) => l.id === mission.launchVehicleId) ?? LAUNCH_VEHICLES[1];

  const selectedPayloads = PAYLOADS.filter((p) => mission.selectedPayloadIds.includes(p.id));
  const payloadMassKg = selectedPayloads.reduce((sum, p) => sum + p.massKg, 0);
  const payloadPowerAvgW = selectedPayloads.reduce((sum, p) => sum + p.powerW, 0);
  const payloadPowerPeakW = selectedPayloads.reduce((sum, p) => sum + p.peakPowerW, 0);
  const payloadCostMUsd = selectedPayloads.reduce((sum, p) => sum + p.costMUsd, 0);

  // Subsystems modifiers
  const commsMult =
    mission.spacecraft.commsTier === 'Optical Laser'
      ? { mass: 28, power: 135, cost: 24 }
      : mission.spacecraft.commsTier === 'Ka-Band Deep Space'
        ? { mass: 22, power: 110, cost: 16 }
        : mission.spacecraft.commsTier === 'X-Band'
          ? { mass: 12, power: 65, cost: 8 }
          : { mass: 0, power: 30, cost: 0 };

  const thermalMult =
    mission.spacecraft.thermalTier === 'Cryo-Cooler'
      ? { mass: 45, power: 160, cost: 34 }
      : mission.spacecraft.thermalTier === 'Active Louvers & Heaters'
        ? { mass: 18, power: 55, cost: 12 }
        : { mass: 0, power: 10, cost: 0 };

  const navMult =
    mission.spacecraft.navigationTier === 'Terrain Relative Nav'
      ? { mass: 36, power: 95, cost: 28 }
      : mission.spacecraft.navigationTier === 'Deep Space Autonomous Optical'
        ? { mass: 20, power: 45, cost: 18 }
        : { mass: 0, power: 20, cost: 0 };

  const redundancyFactor =
    mission.spacecraft.redundancyLevel === 'Full Fault-Tolerant'
      ? { massMult: 1.18, costMult: 1.28 }
      : mission.spacecraft.redundancyLevel === 'Selective Redundancy'
        ? { massMult: 1.08, costMult: 1.12 }
        : { massMult: 1.0, costMult: 1.0 };

  const propellantMassKg = Math.max(0, mission.spacecraft.propellantMassKg);
  const tankMassKg = propellantMassKg * propulsion.tankMassFraction;

  // Power hardware mass: solar panels ~ 2.4 kg/m2 + batteries ~ 1 kg per 160 Wh
  const solarMassKg = power.isSolar ? mission.spacecraft.solarPanelAreaM2 * 2.4 : 0;
  const batteryMassKg = mission.spacecraft.batteryCapacityWh / 160;
  const powerHardwareMassKg = power.massKg + solarMassKg + batteryMassKg;

  const structureMassKg = structure.structuralMassKg;
  const subsystemsMassKg = Math.round(
    (structure.avionicsMassKg +
      structure.thermalBaseMassKg +
      structure.commsBaseMassKg +
      structure.navigationBaseMassKg +
      structure.attitudeBaseMassKg +
      commsMult.mass +
      thermalMult.mass +
      navMult.mass) *
      redundancyFactor.massMult
  );
  const propulsionDryMassKg = Math.round(propulsion.dryMassKg + tankMassKg);

  const dryMassKg = Math.round(
    structureMassKg + subsystemsMassKg + propulsionDryMassKg + powerHardwareMassKg + payloadMassKg
  );
  const wetMassKg = Math.round(dryMassKg + propellantMassKg);

  const launcherCapacityKg = getLauncherCapacityForDestination(launcher.id, dest.id);
  const massMarginKg = launcherCapacityKg - wetMassKg;
  const massMarginPct = launcherCapacityKg > 0 ? (massMarginKg / launcherCapacityKg) * 100 : -100;
  const isMassValid = launcherCapacityKg > 0 && massMarginKg >= 0 && payloadMassKg <= structure.maxPayloadMassKg;

  // Power calculation: solar irradiance scales with 1 / AU^2
  const solarFluxFactor = 1 / Math.pow(dest.orbitRadiusAu, 2);
  let powerGeneratedW = 0;
  if (power.id === 'rtg-nuclear') {
    powerGeneratedW = power.baseOutputAt1AuW;
  } else if (power.id === 'hybrid-solar-rtg') {
    const solarPart = Math.round((power.baseOutputAt1AuW * 0.65) * mission.spacecraft.solarPanelAreaM2 * solarFluxFactor);
    powerGeneratedW = 240 + solarPart;
  } else {
    // baseOutputAt1AuW is net W/m^2 at 1 AU (1361 W/m^2 * cell efficiency * packing factor)
    powerGeneratedW = Math.round(power.baseOutputAt1AuW * mission.spacecraft.solarPanelAreaM2 * solarFluxFactor);
  }

  // Average bus + comms + thermal + nav + payload + electric propulsion (when thrusting, partial duty cycle)
  const propulsionAvgPowerW = propulsion.powerDrawW * (propulsion.id.includes('electric') || propulsion.id.includes('ion') ? 0.55 : 0.25);
  const averagePowerDrawW = Math.round(
    structure.basePowerDrawW +
      commsMult.power +
      thermalMult.power +
      navMult.power +
      propulsionAvgPowerW +
      payloadPowerAvgW
  );
  const peakPowerDrawW = Math.round(
    averagePowerDrawW - payloadPowerAvgW + payloadPowerPeakW + propulsion.powerDrawW * 0.65
  );

  const powerMarginW = powerGeneratedW - averagePowerDrawW;
  const powerMarginPct = averagePowerDrawW > 0 ? (powerMarginW / averagePowerDrawW) * 100 : 100;
  const eclipseCapacityHours =
    averagePowerDrawW > 0 ? Number((mission.spacecraft.batteryCapacityWh / averagePowerDrawW).toFixed(2)) : 0;
  const isPowerValid = powerMarginW >= 0 && eclipseCapacityHours >= 1.2;

  const availableDeltaVKms = Number(
    calculateTsiolkovskyDeltaVKms(propulsion.ispSeconds, wetMassKg, dryMassKg).toFixed(3)
  );

  // Cost calculation
  const solarCostMUsd = power.isSolar ? mission.spacecraft.solarPanelAreaM2 * 0.45 : 0;
  const batteryCostMUsd = (mission.spacecraft.batteryCapacityWh / 1000) * 1.2;
  const spacecraftCostMUsd = Number(
    (
      (structure.costMUsd + commsMult.cost + thermalMult.cost + navMult.cost) * redundancyFactor.costMult +
      propulsion.costMUsd +
      power.costMUsd +
      solarCostMUsd +
      batteryCostMUsd
    ).toFixed(1)
  );
  const launchCostMUsd = launcher.referenceCostMUsd;
  const operationsCostMUsd = Number((Math.max(12, mission.durationDays * 0.085)).toFixed(1));
  const mitigationCostMUsd = mission.risks
    .filter((r) => r.mitigated)
    .reduce((sum, r) => sum + r.mitigationCostMUsd, 0);

  const subtotalCostMUsd = Number(
    (spacecraftCostMUsd + payloadCostMUsd + launchCostMUsd + operationsCostMUsd + mitigationCostMUsd).toFixed(1)
  );
  const contingencyReserveMUsd = Number((mission.budgetCapMUsd - subtotalCostMUsd).toFixed(1));
  const contingencyPct =
    mission.budgetCapMUsd > 0 ? Number(((contingencyReserveMUsd / mission.budgetCapMUsd) * 100).toFixed(1)) : 0;
  const totalEstimatedCostMUsd = subtotalCostMUsd;
  const budgetRemainingMUsd = contingencyReserveMUsd;
  const isBudgetValid = totalEstimatedCostMUsd <= mission.budgetCapMUsd;

  return {
    structureMassKg,
    subsystemsMassKg,
    propulsionDryMassKg,
    powerHardwareMassKg: Math.round(powerHardwareMassKg),
    payloadMassKg,
    dryMassKg,
    propellantMassKg,
    wetMassKg,
    launcherCapacityKg,
    massMarginKg: Math.round(massMarginKg),
    massMarginPct: Number(massMarginPct.toFixed(1)),
    isMassValid,
    powerGeneratedW,
    averagePowerDrawW,
    peakPowerDrawW,
    powerMarginW,
    powerMarginPct: Number(powerMarginPct.toFixed(1)),
    isPowerValid,
    eclipseCapacityHours,
    availableDeltaVKms,
    spacecraftCostMUsd,
    payloadCostMUsd: Number(payloadCostMUsd.toFixed(1)),
    launchCostMUsd,
    operationsCostMUsd,
    mitigationCostMUsd,
    subtotalCostMUsd,
    contingencyReserveMUsd,
    contingencyPct,
    totalEstimatedCostMUsd,
    budgetRemainingMUsd,
    isBudgetValid,
  };
}
