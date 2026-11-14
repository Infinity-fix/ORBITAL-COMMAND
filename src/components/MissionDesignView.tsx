import { useState, type FormEvent } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import {
  DESTINATIONS,
  LAUNCH_VEHICLES,
  PAYLOADS,
  POWER_SYSTEMS,
  PROPULSION_SYSTEMS,
  STRUCTURES,
} from '../engine/catalog';
import { computeOrbitalAnalysis } from '../engine/orbitalMechanics';
import { computeSpacecraftEngineering, getLauncherCapacityForDestination } from '../engine/spacecraftEngineering';
import type {
  DestinationId,
  MissionCategory,
  MissionDifficulty,
  MissionType,
  PowerSourceType,
  PropulsionType,
  SpacecraftConfig,
} from '../engine/types';
import { useMissionStore } from '../store/useMissionStore';
import { SpacecraftViewport3D } from './three/SpacecraftViewport3D';

const CATEGORIES: MissionCategory[] = [
  'Scientific Research',
  'Planetary Exploration',
  'Earth Observation',
  'Communication',
  'Navigation',
  'Human Spaceflight',
  'Astrophysics',
  'Planetary Defense',
  'Technology Demonstration',
  'Sample Return',
];

const MISSION_TYPES: MissionType[] = [
  'Flyby',
  'Orbiter',
  'Lander',
  'Rover',
  'Sample Return',
  'Space Telescope',
  'Crewed Mission',
  'Deep Space Probe',
  'Communication Satellite',
  'Earth Observation Satellite',
];

export function MissionDesignView() {
  const mission = useMissionStore((s) => s.mission);
  const designSubTab = useMissionStore((s) => s.designSubTab);
  const setDesignSubTab = useMissionStore((s) => s.setDesignSubTab);
  const createNewMission = useMissionStore((s) => s.createNewMission);
  const updateMissionMeta = useMissionStore((s) => s.updateMissionMeta);
  const setDestination = useMissionStore((s) => s.setDestination);
  const updateSpacecraft = useMissionStore((s) => s.updateSpacecraft);
  const togglePayload = useMissionStore((s) => s.togglePayload);
  const setLaunchVehicle = useMissionStore((s) => s.setLaunchVehicle);

  // New Mission form state
  const [newName, setNewName] = useState(mission.name);
  const [newDesc, setNewDesc] = useState(mission.description);
  const [newCategory, setNewCategory] = useState<MissionCategory>(mission.category);
  const [newDest, setNewDest] = useState<DestinationId>(mission.destinationId);
  const [newType, setNewType] = useState<MissionType>(mission.missionType);
  const [newDiff, setNewDiff] = useState<MissionDifficulty>(mission.difficulty);
  const [newDuration, setNewDuration] = useState(mission.durationDays);
  const [newBudget, setNewBudget] = useState(mission.budgetCapMUsd);
  const [newObjective, setNewObjective] = useState(mission.primaryObjective);
  const [formError, setFormError] = useState<string | null>(null);

  const eng = computeSpacecraftEngineering(mission);
  const orb = computeOrbitalAnalysis(
    mission.destinationId,
    mission.orbitalPlan,
    mission.spacecraft,
    eng.wetMassKg,
    eng.dryMassKg
  );
  const dest = DESTINATIONS.find((d) => d.id === mission.destinationId) ?? DESTINATIONS[3];
  const structure = STRUCTURES.find((s) => s.id === mission.spacecraft.structureId) ?? STRUCTURES[1];

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newObjective.trim()) {
      setFormError('Mission Name and Primary Objective are required.');
      return;
    }
    if (newBudget < 50 || newDuration < 1) {
      setFormError('Budget cap must be >= $50M and duration >= 1 day.');
      return;
    }
    setFormError(null);
    createNewMission({
      name: newName,
      description: newDesc || 'Custom space mission design.',
      category: newCategory,
      destinationId: newDest,
      missionType: newType,
      difficulty: newDiff,
      durationDays: newDuration,
      budgetCapMUsd: newBudget,
      primaryObjective: newObjective,
      secondaryObjectives: ['Validate deep-space telemetry and power margin'],
    });
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Mission Design Workspace</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {mission.name} · {dest.name} · {mission.missionType}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#0d1424] border border-slate-800 rounded-lg">
          {(
            [
              ['brief', '1. Mission Brief'],
              ['spacecraft', '2. Spacecraft 3D'],
              ['payloads', '3. Payloads'],
              ['launcher', '4. Launch Vehicle'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setDesignSubTab(id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                designSubTab === id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-100 border border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: MISSION CREATION & BRIEF */}
      {designSubTab === 'brief' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateSubmit}
            className="lg:col-span-8 bg-[#0d1424] border border-slate-800 rounded-lg p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-display text-lg font-semibold text-white">Create or Reconfigure Mission</h2>
              <span className="text-xs text-slate-400">Updates mission parameters &amp; constraints</span>
            </div>

            {formError && (
              <div className="p-3 rounded bg-rose-950/70 border border-rose-800 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1.5 text-xs">
                <span className="text-slate-300 font-medium block">Mission Name</span>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    updateMissionMeta({ name: e.target.value });
                  }}
                  className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400"
                  placeholder="e.g. Ares Horizon Orbiter"
                />
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="text-slate-300 font-medium block">Destination</span>
                <select
                  value={newDest}
                  onChange={(e) => {
                    const id = e.target.value as DestinationId;
                    setNewDest(id);
                    setDestination(id);
                  }}
                  className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400"
                >
                  {DESTINATIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.orbitRadiusAu} AU)
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="text-slate-300 font-medium block">Mission Category</span>
                <select
                  value={newCategory}
                  onChange={(e) => {
                    const cat = e.target.value as MissionCategory;
                    setNewCategory(cat);
                    updateMissionMeta({ category: cat });
                  }}
                  className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="text-slate-300 font-medium block">Mission Type</span>
                <select
                  value={newType}
                  onChange={(e) => {
                    const t = e.target.value as MissionType;
                    setNewType(t);
                    updateMissionMeta({ missionType: t });
                  }}
                  className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400"
                >
                  {MISSION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="text-slate-300 font-medium block">Budget Cap ($M USD)</span>
                <input
                  type="number"
                  min={50}
                  max={5000}
                  value={newBudget}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setNewBudget(val);
                    if (val >= 50) updateMissionMeta({ budgetCapMUsd: val });
                  }}
                  className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="text-slate-300 font-medium block">Mission Duration (Days)</span>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={newDuration}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setNewDuration(val);
                    if (val >= 1) updateMissionMeta({ durationDays: val });
                  }}
                  className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </label>
            </div>

            <label className="space-y-1.5 text-xs block">
              <span className="text-slate-300 font-medium block">Difficulty Profile</span>
              <div className="flex gap-2">
                {(['Standard', 'Realistic', 'Veteran'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => {
                      setNewDiff(diff);
                      updateMissionMeta({ difficulty: diff });
                    }}
                    className={`px-3.5 py-1.5 rounded border text-xs font-medium ${
                      newDiff === diff
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-[#070b14] border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </label>

            <label className="space-y-1.5 text-xs block">
              <span className="text-slate-300 font-medium block">Primary Scientific Objective</span>
              <input
                type="text"
                value={newObjective}
                onChange={(e) => {
                  setNewObjective(e.target.value);
                  updateMissionMeta({ primaryObjective: e.target.value });
                }}
                className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </label>

            <label className="space-y-1.5 text-xs block">
              <span className="text-slate-300 font-medium block">Mission Description</span>
              <textarea
                rows={2}
                value={newDesc}
                onChange={(e) => {
                  setNewDesc(e.target.value);
                  updateMissionMeta({ description: e.target.value });
                }}
                className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </label>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="submit"
                className="px-5 py-2.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors"
              >
                Initialize Fresh Mission Baseline
              </button>
            </div>
          </form>

          <div className="lg:col-span-4 bg-[#0d1424] border border-slate-800 rounded-lg p-6 space-y-4">
            <h3 className="font-display text-base font-semibold text-white">Target Body Reference</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Body</span>
                <span className="text-white font-medium">{dest.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Heliocentric Distance</span>
                <span className="font-mono text-white tabular-nums">{dest.orbitRadiusAu} AU</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Solar Irradiance</span>
                <span className="font-mono text-cyan-300 tabular-nums">{dest.solarIrradianceWm2} W/m²</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Surface Gravity</span>
                <span className="font-mono text-white tabular-nums">{dest.surfaceGravityMs2} m/s²</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Typical Transit</span>
                <span className="font-mono text-white tabular-nums">{dest.typicalTransferDays} days</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{dest.description}</p>
            <div className="space-y-1.5 pt-2">
              <div className="text-xs font-medium text-slate-400">Science Highlights</div>
              <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
                {dest.scienceHighlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">{dest.sourceNote}</div>
          </div>
        </div>
      )}

      {/* TAB 2: SPACECRAFT DESIGNER + LIVE 3D ASSEMBLY */}
      {designSubTab === 'spacecraft' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 space-y-4">
            <SpacecraftViewport3D mission={mission} heightClass="h-[460px]" />

            {/* Live Engineering Mass & Power Telemetry */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0d1424] border border-slate-800 rounded-lg p-4 text-xs">
              <div>
                <div className="text-slate-400">Dry / Wet Mass</div>
                <div className="font-mono font-semibold text-white tabular-nums mt-0.5">
                  {eng.dryMassKg} / {eng.wetMassKg} kg
                </div>
              </div>
              <div>
                <div className="text-slate-400">Power Gen / Load</div>
                <div className={`font-mono font-semibold tabular-nums mt-0.5 ${eng.isPowerValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {eng.powerGeneratedW} / {eng.averagePowerDrawW} W
                </div>
              </div>
              <div>
                <div className="text-slate-400">Available Δv</div>
                <div className={`font-mono font-semibold tabular-nums mt-0.5 ${orb.isDeltaVSufficient ? 'text-cyan-300' : 'text-rose-400'}`}>
                  {eng.availableDeltaVKms.toFixed(2)} km/s
                </div>
              </div>
              <div>
                <div className="text-slate-400">Eclipse Battery</div>
                <div className="font-mono font-semibold text-white tabular-nums mt-0.5">
                  {eng.eclipseCapacityHours} hrs
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-[#0d1424] border border-slate-800 rounded-lg p-6 space-y-5">
            <h2 className="font-display text-lg font-semibold text-white">Spacecraft Subsystems Configuration</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1.5 text-xs">
                <span className="text-slate-300 font-medium block">Primary Bus Structure</span>
                <select
                  value={mission.spacecraft.structureId}
                  onChange={(e) => updateSpacecraft({ structureId: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm text-white"
                >
                  {STRUCTURES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.baseDryMassKg} kg · ${s.costMUsd}M)
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="text-slate-300 font-medium block">Propulsion System</span>
                <select
                  value={mission.spacecraft.propulsionId}
                  onChange={(e) => updateSpacecraft({ propulsionId: e.target.value as PropulsionType })}
                  className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm text-white"
                >
                  {PROPULSION_SYSTEMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Isp {p.ispSeconds} s)
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="text-slate-300 font-medium block">Power Generation</span>
                <select
                  value={mission.spacecraft.powerId}
                  onChange={(e) => updateSpacecraft({ powerId: e.target.value as PowerSourceType })}
                  className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm text-white"
                >
                  {POWER_SYSTEMS.map((pw) => (
                    <option key={pw.id} value={pw.id}>
                      {pw.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="text-slate-300 font-medium block">Communications Tier</span>
                <select
                  value={mission.spacecraft.commsTier}
                  onChange={(e) =>
                    updateSpacecraft({ commsTier: e.target.value as SpacecraftConfig['commsTier'] })
                  }
                  className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm text-white"
                >
                  <option value="S-Band">S-Band (Near Earth)</option>
                  <option value="X-Band">X-Band (Standard Deep Space)</option>
                  <option value="Ka-Band Deep Space">Ka-Band Deep Space</option>
                  <option value="Optical Laser">Optical Laser Relay</option>
                </select>
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="text-slate-300 font-medium block">Thermal Control</span>
                <select
                  value={mission.spacecraft.thermalTier}
                  onChange={(e) =>
                    updateSpacecraft({ thermalTier: e.target.value as SpacecraftConfig['thermalTier'] })
                  }
                  className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm text-white"
                >
                  <option value="Passive MLI">Passive MLI Blanket</option>
                  <option value="Active Louvers & Heaters">Active Louvers &amp; Heaters</option>
                  <option value="Cryo-Cooler">Cryo-Cooler Optical Shield</option>
                </select>
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="text-slate-300 font-medium block">Navigation &amp; Fault Tolerance</span>
                <select
                  value={mission.spacecraft.redundancyLevel}
                  onChange={(e) =>
                    updateSpacecraft({
                      redundancyLevel: e.target.value as SpacecraftConfig['redundancyLevel'],
                    })
                  }
                  className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm text-white"
                >
                  <option value="Single-String">Single-String (Lean Mass)</option>
                  <option value="Selective Redundancy">Selective Redundancy</option>
                  <option value="Full Fault-Tolerant">Full Fault-Tolerant Class A</option>
                </select>
              </label>
            </div>

            {/* Sliders for Propellant, Solar Area, Battery */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <label className="block space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-300">Propellant Mass</span>
                  <span className="font-mono text-cyan-300 tabular-nums">
                    {mission.spacecraft.propellantMassKg} kg (Req Δv: {orb.totalRequiredDeltaVKms.toFixed(2)} km/s)
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={8000}
                  step={50}
                  value={mission.spacecraft.propellantMassKg}
                  onChange={(e) => updateSpacecraft({ propellantMassKg: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </label>

              {mission.spacecraft.powerId !== 'rtg-nuclear' && (
                <label className="block space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Solar Array Area</span>
                    <span className="font-mono text-cyan-300 tabular-nums">
                      {mission.spacecraft.solarPanelAreaM2} m² ({eng.powerGeneratedW} W at {dest.orbitRadiusAu} AU)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={60}
                    step={1}
                    value={mission.spacecraft.solarPanelAreaM2}
                    onChange={(e) => updateSpacecraft({ solarPanelAreaM2: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </label>
              )}

              <label className="block space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-300">Battery Capacity</span>
                  <span className="font-mono text-cyan-300 tabular-nums">
                    {mission.spacecraft.batteryCapacityWh} Wh ({eng.eclipseCapacityHours}h eclipse)
                  </span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={16000}
                  step={250}
                  value={mission.spacecraft.batteryCapacityWh}
                  onChange={(e) => updateSpacecraft({ batteryCapacityWh: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </label>
            </div>

            <div className="p-3 rounded bg-[#070b14] border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Structure + Subsystems + Power + Propulsion Dry</span>
                <span className="font-mono text-slate-200 tabular-nums">
                  {eng.structureMassKg + eng.subsystemsMassKg + eng.powerHardwareMassKg + eng.propulsionDryMassKg} kg
                </span>
              </div>
              <div className="flex justify-between">
                <span>Payload Allocation (Max {structure.maxPayloadMassKg} kg)</span>
                <span className="font-mono text-slate-200 tabular-nums">{eng.payloadMassKg} kg</span>
              </div>
              <div className="flex justify-between">
                <span>Spacecraft Hardware Estimate</span>
                <span className="font-mono text-cyan-300 tabular-nums">${eng.spacecraftCostMUsd}M</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PAYLOAD CONFIGURATION */}
      {designSubTab === 'payloads' && (
        <div className="space-y-4">
          <div className="bg-[#0d1424] border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4">
              <span>
                Selected Payloads: <strong className="text-white font-mono">{mission.selectedPayloadIds.length}</strong>
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>
                Payload Mass:{' '}
                <strong className={`font-mono tabular-nums ${eng.payloadMassKg <= structure.maxPayloadMassKg ? 'text-cyan-300' : 'text-rose-400'}`}>
                  {eng.payloadMassKg} / {structure.maxPayloadMassKg} kg
                </strong>
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>
                Power Margin:{' '}
                <strong className={`font-mono tabular-nums ${eng.isPowerValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {eng.powerMarginW} W ({eng.powerMarginPct}%)
                </strong>
              </span>
            </div>
            <span className="text-slate-400">Compatible with {mission.missionType} at {dest.name}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PAYLOADS.map((p) => {
              const selected = mission.selectedPayloadIds.includes(p.id);
              const typeCompatible = p.compatibleMissionTypes.includes(mission.missionType);
              const destCompatible =
                p.compatibleDestinations === 'all' || p.compatibleDestinations.includes(mission.destinationId);
              const compatible = typeCompatible && destCompatible;

              return (
                <div
                  key={p.id}
                  className={`rounded-lg border p-5 flex flex-col justify-between gap-4 transition-colors ${
                    selected
                      ? 'bg-[#101c33] border-cyan-500/60'
                      : 'bg-[#0d1424] border-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-slate-400">{p.category} · +{p.scienceValue} Science</div>
                        <h3 className="font-display text-base font-semibold text-white mt-0.5">{p.name}</h3>
                      </div>
                      {selected && <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-1" aria-hidden="true" />}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{p.purpose}</p>
                    <p className="text-[11px] text-slate-400">{p.operationalNotes}</p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800/80">
                    <div className="grid grid-cols-4 gap-2 text-xs font-mono tabular-nums">
                      <div>
                        <div className="text-[10px] text-slate-500">MASS</div>
                        <div className="text-slate-200">{p.massKg} kg</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">AVG PWR</div>
                        <div className="text-slate-200">{p.powerW} W</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">DATA</div>
                        <div className="text-slate-200">{p.dataRateMbps} Mbps</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">COST</div>
                        <div className="text-cyan-300">${p.costMUsd}M</div>
                      </div>
                    </div>

                    {!compatible && (
                      <div className="text-[11px] text-amber-300">
                        Advisory: Not standard for {mission.missionType} at {dest.name}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => togglePayload(p.id)}
                      className={`w-full py-2 rounded text-xs font-semibold transition-colors ${
                        selected
                          ? 'bg-rose-500/15 border border-rose-500/40 text-rose-200 hover:bg-rose-500/25'
                          : 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/25'
                      }`}
                    >
                      {selected ? 'Remove Payload' : 'Integrate Payload'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: LAUNCH VEHICLE SELECTION */}
      {designSubTab === 'launcher' && (
        <div className="space-y-4">
          <div className="bg-[#0d1424] border border-slate-800 rounded-lg p-4 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-4">
            <div>
              Spacecraft Wet Mass: <strong className="font-mono text-white tabular-nums">{eng.wetMassKg.toLocaleString()} kg</strong>
              <span className="mx-2 text-slate-600">·</span>
              Destination: <strong className="text-cyan-300">{dest.name}</strong>
            </div>
            <div className="text-slate-400">
              Prices labeled as Published or Estimated Reference (non-binding educational figures).
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LAUNCH_VEHICLES.map((lv) => {
              const selected = mission.launchVehicleId === lv.id;
              const cap = getLauncherCapacityForDestination(lv.id, mission.destinationId);
              const marginKg = cap - eng.wetMassKg;
              const compatible = cap > 0 && marginKg >= 0;

              return (
                <div
                  key={lv.id}
                  className={`rounded-lg border p-5 flex flex-col justify-between gap-4 ${
                    selected ? 'bg-[#101c33] border-cyan-500/60' : 'bg-[#0d1424] border-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-slate-400">
                          {lv.provider} · {lv.costConfidence} ({lv.dataDate})
                        </div>
                        <h3 className="font-display text-lg font-semibold text-white">{lv.name}</h3>
                      </div>
                      <span
                        className={`text-xs font-mono px-2 py-0.5 rounded border ${
                          compatible
                            ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                            : 'border-rose-500/40 text-rose-300 bg-rose-500/10'
                        }`}
                      >
                        {compatible ? 'Compatible' : 'Insufficient Cap'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">{lv.description}</p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div className="grid grid-cols-4 gap-2 text-xs font-mono tabular-nums">
                      <div>
                        <div className="text-[10px] text-slate-500">DEST CAP</div>
                        <div className={compatible ? 'text-white' : 'text-rose-400'}>{cap.toLocaleString()} kg</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">MARGIN</div>
                        <div className={marginKg >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {marginKg >= 0 ? '+' : ''}{marginKg.toLocaleString()} kg
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">FAIRING</div>
                        <div className="text-slate-200">{lv.fairingDiameterM}m × {lv.fairingHeightM}m</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">REF COST</div>
                        <div className="text-cyan-300">${lv.referenceCostMUsd}M</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500">{lv.sourceNote}</div>

                    <button
                      type="button"
                      onClick={() => setLaunchVehicle(lv.id)}
                      className={`w-full py-2 rounded text-xs font-semibold transition-colors ${
                        selected
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-900 border border-slate-700 text-slate-200 hover:border-cyan-500/50'
                      }`}
                    >
                      {selected ? 'Selected Launch Vehicle' : 'Select Launch Vehicle'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
