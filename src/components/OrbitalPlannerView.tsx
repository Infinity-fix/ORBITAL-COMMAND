import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { DESTINATIONS } from '../engine/catalog';
import { computeOrbitalAnalysis } from '../engine/orbitalMechanics';
import { computeSpacecraftEngineering } from '../engine/spacecraftEngineering';
import type { DestinationId, OrbitType } from '../engine/types';
import { useMissionStore } from '../store/useMissionStore';
import { SolarSystemViewport3D } from './three/SolarSystemViewport3D';

const ORBIT_TYPES: OrbitType[] = [
  'Low Earth Orbit',
  'Medium Earth Orbit',
  'Geostationary Orbit',
  'Polar Orbit',
  'Sun-synchronous Orbit',
  'Lunar Orbit',
  'Mars Orbit',
  'Heliocentric Orbit',
  'Custom Orbit',
];

export function OrbitalPlannerView() {
  const mission = useMissionStore((s) => s.mission);
  const setDestination = useMissionStore((s) => s.setDestination);
  const updateOrbitalPlan = useMissionStore((s) => s.updateOrbitalPlan);
  const ephemerisByTarget = useMissionStore((s) => s.ephemerisByTarget);
  const ephemerisLoading = useMissionStore((s) => s.ephemerisLoading);
  const loadEphemeris = useMissionStore((s) => s.loadEphemeris);

  useEffect(() => {
    if (!ephemerisByTarget[mission.destinationId]) {
      void loadEphemeris(mission.destinationId);
    }
  }, [mission.destinationId, ephemerisByTarget, loadEphemeris]);

  const eng = computeSpacecraftEngineering(mission);
  const orb = computeOrbitalAnalysis(
    mission.destinationId,
    mission.orbitalPlan,
    mission.spacecraft,
    eng.wetMassKg,
    eng.dryMassKg
  );
  const eph = ephemerisByTarget[mission.destinationId];

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Orbital Mechanics &amp; 3D Trajectory</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Patched-conic Hohmann transfer estimates · Vis-Viva &amp; Tsiolkovsky budgets · NASA/JPL Horizons Ephemeris
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Target Body:</span>
          <select
            value={mission.destinationId}
            onChange={(e) => setDestination(e.target.value as DestinationId)}
            className="px-3 py-1.5 rounded bg-[#0d1424] border border-slate-700 text-white"
          >
            {DESTINATIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main 3D Viewport + Parameter Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 bg-[#0d1424] border border-slate-800 rounded-lg p-5 space-y-4">
          <h2 className="font-display text-base font-semibold text-white">Trajectory Parameters</h2>

          <label className="block space-y-1 text-xs">
            <span className="text-slate-300">Orbit Regime</span>
            <select
              value={mission.orbitalPlan.orbitType}
              onChange={(e) => updateOrbitalPlan({ orbitType: e.target.value as OrbitType })}
              className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-white"
            >
              {ORBIT_TYPES.map((ot) => (
                <option key={ot} value={ot}>
                  {ot}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-300">Earth Parking Altitude</span>
              <span className="font-mono text-cyan-300 tabular-nums">{mission.orbitalPlan.departureAltitudeKm} km</span>
            </div>
            <input
              type="range"
              min={180}
              max={1000}
              step={20}
              value={mission.orbitalPlan.departureAltitudeKm}
              onChange={(e) => updateOrbitalPlan({ departureAltitudeKm: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </label>

          <label className="block space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-300">Target Orbit Altitude</span>
              <span className="font-mono text-cyan-300 tabular-nums">
                {mission.orbitalPlan.targetAltitudeKm.toLocaleString()} km
              </span>
            </div>
            <input
              type="range"
              min={100}
              max={mission.destinationId === 'geo' ? 36500 : 5000}
              step={50}
              value={mission.orbitalPlan.targetAltitudeKm}
              onChange={(e) => updateOrbitalPlan({ targetAltitudeKm: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </label>

          <label className="block space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-300">Orbital Inclination</span>
              <span className="font-mono text-cyan-300 tabular-nums">{mission.orbitalPlan.inclinationDeg}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={120}
              step={1}
              value={mission.orbitalPlan.inclinationDeg}
              onChange={(e) => updateOrbitalPlan({ inclinationDeg: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </label>

          <label className="block space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-300">Contingency Δv Margin</span>
              <span className="font-mono text-cyan-300 tabular-nums">{mission.orbitalPlan.contingencyDeltaVPercent}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={mission.orbitalPlan.contingencyDeltaVPercent}
              onChange={(e) => updateOrbitalPlan({ contingencyDeltaVPercent: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-300 pt-1">
            <input
              type="checkbox"
              checked={mission.orbitalPlan.aerobrakingAssisted}
              onChange={(e) => updateOrbitalPlan({ aerobrakingAssisted: e.target.checked })}
              className="accent-cyan-400"
            />
            <span>Use atmospheric aerobraking for arrival capture (reduces arrival Δv)</span>
          </label>

          {/* Calculated Delta-V Readout */}
          <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs font-mono tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-400">Parking Circular Vel</span>
              <span className="text-white">{orb.parkingOrbitVelocityKms} km/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Target Circular Vel</span>
              <span className="text-white">{orb.targetCircularVelocityKms} km/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Target Escape Vel</span>
              <span className="text-white">{orb.targetEscapeVelocityKms} km/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Target Orbital Period</span>
              <span className="text-white">{orb.targetOrbitalPeriodHours} hrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Hohmann Departure Δv</span>
              <span className="text-cyan-300">{orb.hohmannDepartureDeltaVKms} km/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Arrival Capture Δv</span>
              <span className="text-cyan-300">{orb.hohmannArrivalDeltaVKms} km/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Transfer Duration</span>
              <span className="text-white">{orb.estimatedTransferDays} days</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-800 font-semibold">
              <span className="text-slate-300">Required / Available Δv</span>
              <span className={orb.isDeltaVSufficient ? 'text-emerald-400' : 'text-rose-400'}>
                {orb.totalRequiredDeltaVKms} / {eng.availableDeltaVKms} km/s
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <SolarSystemViewport3D
            mission={mission}
            heightClass="h-[520px]"
            onSelectBody={(id) => setDestination(id)}
          />
        </div>
      </div>

      {/* Bottom Row: NASA/JPL Horizons Ephemeris + Model Assumptions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#0d1424] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="font-display text-base font-semibold text-white">
                NASA/JPL Horizons Ephemeris State Vector
              </h2>
              <p className="text-xs text-slate-400">
                {eph ? eph.sourceLabel : 'Querying JPL Horizons API...'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadEphemeris(mission.destinationId)}
              disabled={ephemerisLoading}
              className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-xs text-slate-200 inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ephemerisLoading ? 'animate-spin' : ''}`} />
              Refresh Ephemeris
            </button>
          </div>

          {eph ? (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
                <div className="p-2.5 rounded bg-[#070b14] border border-slate-800">
                  <div className="text-[10px] text-slate-500">TARGET BODY</div>
                  <div className="text-white mt-0.5 truncate">{eph.targetName}</div>
                </div>
                <div className="p-2.5 rounded bg-[#070b14] border border-slate-800">
                  <div className="text-[10px] text-slate-500">HELIOCENTRIC RANGE</div>
                  <div className="text-cyan-300 mt-0.5">{eph.rangeAu} AU</div>
                </div>
                <div className="p-2.5 rounded bg-[#070b14] border border-slate-800">
                  <div className="text-[10px] text-slate-500">ORBITAL SPEED</div>
                  <div className="text-white mt-0.5">{eph.speedKms} km/s</div>
                </div>
                <div className="p-2.5 rounded bg-[#070b14] border border-slate-800">
                  <div className="text-[10px] text-slate-500">DATA STATUS</div>
                  <div className={eph.isLive ? 'text-emerald-400 mt-0.5' : 'text-amber-300 mt-0.5'}>
                    {eph.sourceStatus === 'live'
                      ? 'Live JPL API'
                      : eph.sourceStatus === 'cached'
                        ? 'Cached JPL Vector'
                        : 'Curated Fallback'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono tabular-nums">
                <div className="p-3 rounded bg-[#070b14] border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-500">POSITION VECTOR (AU)</div>
                  <div className="text-slate-200">
                    X: {eph.positionAu.x} · Y: {eph.positionAu.y} · Z: {eph.positionAu.z}
                  </div>
                </div>
                <div className="p-3 rounded bg-[#070b14] border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-500">VELOCITY VECTOR (KM/S)</div>
                  <div className="text-slate-200">
                    VX: {eph.velocityKms.vx} · VY: {eph.velocityKms.vy} · VZ: {eph.velocityKms.vz}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                <span>Epoch: {eph.epochTdb}</span>
                <span>Frame: {eph.referenceFrame}</span>
                <span>Units: {eph.units}</span>
                <span>Retrieved: {new Date(eph.retrievedAt).toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">Loading state vector...</div>
          )}
        </div>

        <div className="lg:col-span-5 bg-[#0d1424] border border-slate-800 rounded-lg p-5 space-y-3">
          <h2 className="font-display text-base font-semibold text-white">
            Orbital Mechanics Model Assumptions
          </h2>
          <p className="text-xs text-slate-400">{orb.dataProvenance}</p>
          <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
            {orb.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
