import { DESTINATIONS, PROPULSION_SYSTEMS } from './catalog';
import type {
  DestinationId,
  OrbitalCalculationSummary,
  OrbitalPlanConfig,
  SpacecraftConfig,
} from './types';

export const MU_SUN_KM3_S2 = 1.32712440018e11;
export const AU_KM = 149597870.7;
export const MU_EARTH_KM3_S2 = 398600.4418;
export const R_EARTH_KM = 6378.137;
export const G0_MS2 = 9.80665;

/**
 * Circular orbital velocity: v_c = sqrt(mu / r) in km/s
 */
export function calculateCircularVelocityKms(muKm3s2: number, radiusKm: number): number {
  if (radiusKm <= 0 || muKm3s2 <= 0) return 0;
  return Math.sqrt(muKm3s2 / radiusKm);
}

/**
 * Escape velocity at radius r: v_esc = sqrt(2 * mu / r) in km/s
 */
export function calculateEscapeVelocityKms(muKm3s2: number, radiusKm: number): number {
  if (radiusKm <= 0 || muKm3s2 <= 0) return 0;
  return Math.sqrt((2 * muKm3s2) / radiusKm);
}

/**
 * Orbital period in seconds: T = 2 * pi * sqrt(a^3 / mu)
 */
export function calculateOrbitalPeriodSeconds(muKm3s2: number, semiMajorAxisKm: number): number {
  if (semiMajorAxisKm <= 0 || muKm3s2 <= 0) return 0;
  return 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxisKm, 3) / muKm3s2);
}

/**
 * Idealized coplanar Hohmann transfer between circular orbits r1 and r2 around central body mu
 */
export function calculateHohmannTransfer(
  muKm3s2: number,
  r1Km: number,
  r2Km: number
): {
  deltaV1Kms: number;
  deltaV2Kms: number;
  totalDeltaVKms: number;
  transferTimeSeconds: number;
} {
  if (muKm3s2 <= 0 || r1Km <= 0 || r2Km <= 0) {
    return { deltaV1Kms: 0, deltaV2Kms: 0, totalDeltaVKms: 0, transferTimeSeconds: 0 };
  }
  const aTrans = (r1Km + r2Km) / 2;
  const v1 = Math.sqrt(muKm3s2 / r1Km);
  const v2 = Math.sqrt(muKm3s2 / r2Km);
  const vTrans1 = Math.sqrt(muKm3s2 * (2 / r1Km - 1 / aTrans));
  const vTrans2 = Math.sqrt(muKm3s2 * (2 / r2Km - 1 / aTrans));

  const deltaV1Kms = Math.abs(vTrans1 - v1);
  const deltaV2Kms = Math.abs(v2 - vTrans2);
  const transferTimeSeconds = Math.PI * Math.sqrt(Math.pow(aTrans, 3) / muKm3s2);

  return {
    deltaV1Kms,
    deltaV2Kms,
    totalDeltaVKms: deltaV1Kms + deltaV2Kms,
    transferTimeSeconds,
  };
}

/**
 * Tsiolkovsky Rocket Equation: dv = Isp * g0 * ln(m0 / mf) returned in km/s
 */
export function calculateTsiolkovskyDeltaVKms(
  ispSeconds: number,
  wetMassKg: number,
  dryMassKg: number
): number {
  if (ispSeconds <= 0 || dryMassKg <= 0 || wetMassKg <= dryMassKg) return 0;
  return (ispSeconds * G0_MS2 * Math.log(wetMassKg / dryMassKg)) / 1000;
}

/**
 * Required propellant mass for a target delta-v (km/s):
 * m_prop = m_dry * (exp(dv / (Isp * g0)) - 1)
 */
export function calculateRequiredPropellantKg(
  ispSeconds: number,
  dryMassKg: number,
  targetDeltaVKms: number
): number {
  if (ispSeconds <= 0 || dryMassKg <= 0 || targetDeltaVKms <= 0) return 0;
  const veKms = (ispSeconds * G0_MS2) / 1000;
  return dryMassKg * (Math.exp(targetDeltaVKms / veKms) - 1);
}

/**
 * Full mission orbital analysis combining parking orbit, patched-conic Hohmann transfer,
 * arrival capture, plane-change/margin allowance, and spacecraft available delta-v.
 */
export function computeOrbitalAnalysis(
  destinationId: DestinationId,
  orbitalPlan: OrbitalPlanConfig,
  spacecraft: SpacecraftConfig,
  wetMassKg: number,
  dryMassKg: number
): OrbitalCalculationSummary {
  const dest = DESTINATIONS.find((d) => d.id === destinationId) ?? DESTINATIONS[0];
  const prop = PROPULSION_SYSTEMS.find((p) => p.id === spacecraft.propulsionId) ?? PROPULSION_SYSTEMS[2];

  const parkRadiusKm = R_EARTH_KM + Math.max(160, orbitalPlan.departureAltitudeKm);
  const parkingOrbitVelocityKms = calculateCircularVelocityKms(MU_EARTH_KM3_S2, parkRadiusKm);
  const earthEscapeVelocityKms = calculateEscapeVelocityKms(MU_EARTH_KM3_S2, parkRadiusKm);

  const targetRadiusKm = dest.radiusKm + Math.max(100, orbitalPlan.targetAltitudeKm);
  const targetCircularVelocityKms =
    dest.id === 'sun-earth-l2'
      ? 0.35 // Halo orbit station-keeping / Lissajous velocity scale
      : calculateCircularVelocityKms(dest.muKm3s2, targetRadiusKm);
  const targetEscapeVelocityKms =
    dest.id === 'sun-earth-l2' ? 0.5 : calculateEscapeVelocityKms(dest.muKm3s2, targetRadiusKm);

  const targetPeriodSec =
    dest.id === 'sun-earth-l2'
      ? 180 * 86400
      : calculateOrbitalPeriodSeconds(dest.muKm3s2, targetRadiusKm);
  const targetOrbitalPeriodHours = targetPeriodSec / 3600;

  let hohmannDepartureDeltaVKms = 0;
  let hohmannArrivalDeltaVKms = 0;
  let estimatedTransferDays = 1;

  if (dest.id === 'leo') {
    const h = calculateHohmannTransfer(MU_EARTH_KM3_S2, parkRadiusKm, targetRadiusKm);
    hohmannDepartureDeltaVKms = h.deltaV1Kms;
    hohmannArrivalDeltaVKms = h.deltaV2Kms;
    estimatedTransferDays = Math.max(0.1, h.transferTimeSeconds / 86400);
  } else if (dest.id === 'geo') {
    const h = calculateHohmannTransfer(MU_EARTH_KM3_S2, parkRadiusKm, R_EARTH_KM + 35786);
    // Include inclination plane change component from typical mid-latitude launch (~28.5 deg)
    const planeChangePenalty = 0.25;
    hohmannDepartureDeltaVKms = h.deltaV1Kms;
    hohmannArrivalDeltaVKms = h.deltaV2Kms + planeChangePenalty;
    estimatedTransferDays = h.transferTimeSeconds / 86400;
  } else if (dest.id === 'moon') {
    const lunarDistanceKm = 384400;
    const h = calculateHohmannTransfer(MU_EARTH_KM3_S2, parkRadiusKm, lunarDistanceKm);
    // Hyperbolic capture into 100km lunar orbit approx
    const vArrivalInf = Math.abs(h.deltaV2Kms);
    const vPerilune = Math.sqrt(Math.pow(vArrivalInf, 2) + (2 * dest.muKm3s2) / targetRadiusKm);
    const lunarCapture = Math.max(0.75, vPerilune - targetCircularVelocityKms);
    hohmannDepartureDeltaVKms = h.deltaV1Kms;
    hohmannArrivalDeltaVKms = lunarCapture;
    estimatedTransferDays = h.transferTimeSeconds / 86400;
  } else if (dest.id === 'sun-earth-l2') {
    hohmannDepartureDeltaVKms = 3.22;
    hohmannArrivalDeltaVKms = 0.18; // Halo insertion + station-keeping
    estimatedTransferDays = 30;
  } else {
    // Heliocentric patched-conic Hohmann from 1.0 AU to dest.orbitRadiusAu
    const r1Km = 1.0 * AU_KM;
    const r2Km = dest.orbitRadiusAu * AU_KM;
    const helio = calculateHohmannTransfer(MU_SUN_KM3_S2, r1Km, r2Km);

    // Hyperbolic departure from Earth parking orbit: dv = sqrt(v_inf^2 + v_esc^2) - v_park
    const vInfDep = helio.deltaV1Kms;
    hohmannDepartureDeltaVKms =
      Math.sqrt(Math.pow(vInfDep, 2) + Math.pow(earthEscapeVelocityKms, 2)) - parkingOrbitVelocityKms;

    // Hyperbolic arrival capture into target orbit around destination body
    const vInfArr = helio.deltaV2Kms;
    const vPeriapsis = Math.sqrt(Math.pow(vInfArr, 2) + Math.pow(targetEscapeVelocityKms, 2));
    const captureBurn = Math.max(0.4, vPeriapsis - targetCircularVelocityKms);
    hohmannArrivalDeltaVKms = orbitalPlan.aerobrakingAssisted ? captureBurn * 0.45 : captureBurn;
    estimatedTransferDays = helio.transferTimeSeconds / 86400;
  }

  // Note: Launch vehicle places spacecraft onto parking orbit or injection C3;
  // Spacecraft delta-v budget typically needs post-TLI/TMI capture + station-keeping + TCMs,
  // OR if launcher only delivers to LEO parking orbit, spacecraft covers departure + capture.
  // For educational clarity & realistic staging: Launch vehicle covers ascent to LEO + initial injection boost (~65% of departure burn for heavy launchers),
  // while the spacecraft covers remaining injection/TCM + full arrival capture + orbit maintenance.
  const inclinationPenalty =
    dest.parentBody === 'Earth'
      ? Math.abs(orbitalPlan.inclinationDeg - 28.5) * 0.012
      : 0.08;
  const baseTransferDemand = hohmannDepartureDeltaVKms * 0.35 + hohmannArrivalDeltaVKms + inclinationPenalty;
  const marginAndCorrectionDeltaVKms =
    baseTransferDemand * (Math.max(0, orbitalPlan.contingencyDeltaVPercent) / 100);
  const totalRequiredDeltaVKms = baseTransferDemand + marginAndCorrectionDeltaVKms;

  const availableDeltaVKms = calculateTsiolkovskyDeltaVKms(prop.ispSeconds, wetMassKg, dryMassKg);
  const deltaVMarginKms = availableDeltaVKms - totalRequiredDeltaVKms;

  return {
    originBody: 'Earth (Parking Orbit)',
    targetBody: dest.name,
    parkingOrbitVelocityKms: Number(parkingOrbitVelocityKms.toFixed(3)),
    earthEscapeVelocityKms: Number(earthEscapeVelocityKms.toFixed(3)),
    targetCircularVelocityKms: Number(targetCircularVelocityKms.toFixed(3)),
    targetEscapeVelocityKms: Number(targetEscapeVelocityKms.toFixed(3)),
    targetOrbitalPeriodHours: Number(targetOrbitalPeriodHours.toFixed(2)),
    hohmannDepartureDeltaVKms: Number(hohmannDepartureDeltaVKms.toFixed(3)),
    hohmannArrivalDeltaVKms: Number(hohmannArrivalDeltaVKms.toFixed(3)),
    marginAndCorrectionDeltaVKms: Number(marginAndCorrectionDeltaVKms.toFixed(3)),
    totalRequiredDeltaVKms: Number(totalRequiredDeltaVKms.toFixed(3)),
    estimatedTransferDays: Number(estimatedTransferDays.toFixed(1)),
    deltaVMarginKms: Number(deltaVMarginKms.toFixed(3)),
    isDeltaVSufficient: deltaVMarginKms >= 0,
    assumptions: [
      'Idealized coplanar circular patched-conic Hohmann approximation.',
      'Excludes N-body perturbations, solar radiation pressure, finite-burn gravity losses, and launch-window synodic phasing.',
      'Assumes launch vehicle upper stage delivers spacecraft to parking orbit + 65% of Earth-departure injection energy; spacecraft propulsion executes post-separation TCM, arrival capture, and orbital maintenance.',
      'Educational mission planning estimate — not certified flight-dynamics trajectory software.',
    ],
    dataProvenance: `${dest.sourceNote} · Calculated via Vis-Viva & Tsiolkovsky equations`,
  };
}
