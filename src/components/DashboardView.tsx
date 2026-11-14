import { AlertTriangle, CheckCircle2, Compass, Cpu, Play, Rocket, ShieldAlert } from 'lucide-react';
import { DESTINATIONS, LAUNCH_VEHICLES, PAYLOADS } from '../engine/catalog';
import { computeOrbitalAnalysis } from '../engine/orbitalMechanics';
import { computeSpacecraftEngineering } from '../engine/spacecraftEngineering';
import { calculateMissionReadinessPct, evaluateRequirements } from '../engine/systemsEngineering';
import { useMissionStore } from '../store/useMissionStore';

export function DashboardView() {
  const mission = useMissionStore((s) => s.mission);
  const setActiveView = useMissionStore((s) => s.setActiveView);
  const setDesignSubTab = useMissionStore((s) => s.setDesignSubTab);
  const createNewMission = useMissionStore((s) => s.createNewMission);
  const campaigns = useMissionStore((s) => s.campaigns);

  const dest = DESTINATIONS.find((d) => d.id === mission.destinationId) ?? DESTINATIONS[3];
  const launcher = LAUNCH_VEHICLES.find((l) => l.id === mission.launchVehicleId) ?? LAUNCH_VEHICLES[1];
  const eng = computeSpacecraftEngineering(mission);
  const orb = computeOrbitalAnalysis(
    mission.destinationId,
    mission.orbitalPlan,
    mission.spacecraft,
    eng.wetMassKg,
    eng.dryMassKg
  );
  const reqs = evaluateRequirements(mission, eng, orb);
  const readiness = calculateMissionReadinessPct(mission, eng, orb);
  const passedGates = mission.gates.filter((g) => g.passed).length;
  const criticalRisks = mission.risks.filter((r) => !r.mitigated && r.severity === 'Critical').length;

  const loadPresetMission = (preset: 'mars-rover' | 'lunar-lander' | 'l2-telescope' | 'europa-probe') => {
    if (preset === 'mars-rover') {
      createNewMission({
        name: 'Perseverance Frontier Rover',
        description: 'Surface astrobiology and core-sampling rover targeting ancient Mars delta deposits.',
        category: 'Planetary Exploration',
        destinationId: 'mars',
        missionType: 'Rover',
        difficulty: 'Realistic',
        durationDays: 680,
        budgetCapMUsd: 1100,
        primaryObjective: 'Extract sealed subsurface core samples and characterize hydrated clay minerals.',
        secondaryObjectives: ['Test terrain-relative precision landing', 'Measure surface radiation dose'],
      });
    } else if (preset === 'lunar-lander') {
      createNewMission({
        name: 'Artemis South Pole Prospector',
        description: 'Lunar south pole lander surveying permanently shadowed crater volatiles.',
        category: 'Sample Return',
        destinationId: 'moon',
        missionType: 'Lander',
        difficulty: 'Standard',
        durationDays: 90,
        budgetCapMUsd: 780,
        primaryObjective: 'Quantify lunar regolith water-ice concentration near Shackleton rim.',
        secondaryObjectives: ['Demonstrate precision hazard avoidance landing'],
      });
    } else if (preset === 'l2-telescope') {
      createNewMission({
        name: 'Origins Cryo Observatory',
        description: 'Segmented infrared space telescope operating in a Sun-Earth L2 halo orbit.',
        category: 'Astrophysics',
        destinationId: 'sun-earth-l2',
        missionType: 'Space Telescope',
        difficulty: 'Realistic',
        durationDays: 1825,
        budgetCapMUsd: 1450,
        primaryObjective: 'Resolve exoplanet atmospheric absorption spectra and deep-field high-redshift galaxies.',
        secondaryObjectives: ['Maintain sub-arcsecond pointing stability at L2'],
      });
    } else {
      createNewMission({
        name: 'Europa Clipper Reconnaissance',
        description: 'Radiation-hardened deep-space orbiter sounding Europa’s subsurface ocean.',
        category: 'Scientific Research',
        destinationId: 'jupiter',
        missionType: 'Deep Space Probe',
        difficulty: 'Veteran',
        durationDays: 1400,
        budgetCapMUsd: 1600,
        primaryObjective: 'Measure ice-shell thickness and induced magnetic ocean signature at Jupiter.',
        secondaryObjectives: ['Operate Multi-MMRTG nuclear power at 5.2 AU'],
      });
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* Top Hero Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 bg-[#0d1424] border border-slate-800 rounded-lg p-6 flex flex-col justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>{mission.category}</span>
              <span aria-hidden="true">·</span>
              <span>{mission.missionType}</span>
              <span aria-hidden="true">·</span>
              <span>Destination: {dest.name}</span>
              <span aria-hidden="true">·</span>
              <span>Stage: {mission.simulation.currentStage}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              {mission.name}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {mission.primaryObjective}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-800/80">
            <div>
              <div className="text-xs text-slate-400">Wet Mass / Cap</div>
              <div className={`text-lg font-mono font-semibold tabular-nums ${eng.isMassValid ? 'text-white' : 'text-rose-400'}`}>
                {eng.wetMassKg.toLocaleString()} kg
              </div>
              <div className="text-xs text-slate-500 font-mono tabular-nums">
                Cap {eng.launcherCapacityKg.toLocaleString()} kg
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">Power Margin</div>
              <div className={`text-lg font-mono font-semibold tabular-nums ${eng.isPowerValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                {eng.powerMarginPct >= 0 ? '+' : ''}{eng.powerMarginPct}%
              </div>
              <div className="text-xs text-slate-500 font-mono tabular-nums">
                {eng.powerGeneratedW} W / {eng.averagePowerDrawW} W
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">Δv Available / Req</div>
              <div className={`text-lg font-mono font-semibold tabular-nums ${orb.isDeltaVSufficient ? 'text-cyan-300' : 'text-rose-400'}`}>
                {eng.availableDeltaVKms.toFixed(2)} km/s
              </div>
              <div className="text-xs text-slate-500 font-mono tabular-nums">
                Req {orb.totalRequiredDeltaVKms.toFixed(2)} km/s
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">Est. Cost / Cap</div>
              <div className={`text-lg font-mono font-semibold tabular-nums ${eng.isBudgetValid ? 'text-white' : 'text-rose-400'}`}>
                ${eng.totalEstimatedCostMUsd}M
              </div>
              <div className="text-xs text-slate-500 font-mono tabular-nums">
                Cap ${mission.budgetCapMUsd}M
              </div>
            </div>
          </div>
        </div>

        {/* Readiness & Quick Actions */}
        <div className="lg:col-span-4 bg-[#0d1424] border border-slate-800 rounded-lg p-6 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Mission Readiness</span>
              <span className="font-mono text-xl font-bold tabular-nums text-cyan-300">{readiness}%</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded overflow-hidden">
              <div
                className={`h-full transition-all ${readiness >= 75 ? 'bg-cyan-400' : 'bg-amber-400'}`}
                style={{ width: `${readiness}%` }}
              />
            </div>

            <div className="space-y-2 pt-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Requirements Passed</span>
                <span className="font-mono tabular-nums">
                  {reqs.filter((r) => r.status === 'Passed').length} / {reqs.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Lifecycle Gates</span>
                <span className="font-mono tabular-nums">{passedGates} / {mission.gates.length}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Critical Unmitigated Risks</span>
                <span className={`font-mono tabular-nums ${criticalRisks > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {criticalRisks}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveView('play')}
              className="w-full py-2.5 px-4 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Rocket className="w-4 h-4" aria-hidden="true" />
              Deploy 3D Astronaut Field Ops
            </button>
            <button
              type="button"
              onClick={() => setActiveView('control')}
              className="w-full py-2.5 px-4 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4" aria-hidden="true" />
              Open Mission Control
            </button>
            <button
              type="button"
              onClick={() => {
                setDesignSubTab('brief');
                setActiveView('design');
              }}
              className="w-full py-2 px-4 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              Create New Mission / Edit Brief
            </button>
          </div>
        </div>
      </div>

      {/* Engineering Workflow Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => {
            setDesignSubTab('spacecraft');
            setActiveView('design');
          }}
          className="text-left bg-[#0d1424] hover:bg-[#111a2f] border border-slate-800 hover:border-cyan-500/40 rounded-lg p-5 transition-colors space-y-2"
        >
          <div className="flex items-center justify-between">
            <Cpu className="w-5 h-5 text-cyan-400" aria-hidden="true" />
            <span className="text-xs font-mono text-slate-400">{mission.selectedPayloadIds.length} payloads</span>
          </div>
          <h2 className="font-display text-base font-semibold text-white">Spacecraft &amp; Payloads</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Configure bus, propulsion, solar/RTG arrays, {PAYLOADS.length} instruments, and inspect in 3D.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('orbital')}
          className="text-left bg-[#0d1424] hover:bg-[#111a2f] border border-slate-800 hover:border-cyan-500/40 rounded-lg p-5 transition-colors space-y-2"
        >
          <div className="flex items-center justify-between">
            <Compass className="w-5 h-5 text-cyan-400" aria-hidden="true" />
            <span className="text-xs font-mono text-slate-400">{orb.estimatedTransferDays} d transit</span>
          </div>
          <h2 className="font-display text-base font-semibold text-white">Orbital &amp; NASA Horizons</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Plan Hohmann transfers, inspect 3D trajectories, and fetch JPL Horizons state vectors.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('engineering')}
          className="text-left bg-[#0d1424] hover:bg-[#111a2f] border border-slate-800 hover:border-cyan-500/40 rounded-lg p-5 transition-colors space-y-2"
        >
          <div className="flex items-center justify-between">
            {criticalRisks > 0 ? (
              <ShieldAlert className="w-5 h-5 text-amber-400" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            )}
            <span className="text-xs font-mono text-slate-400">{passedGates}/10 gates</span>
          </div>
          <h2 className="font-display text-base font-semibold text-white">Systems Engineering</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Verify requirements, run propulsion &amp; power trade studies, mitigate risks, and pass FRR.
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setDesignSubTab('launcher');
            setActiveView('design');
          }}
          className="text-left bg-[#0d1424] hover:bg-[#111a2f] border border-slate-800 hover:border-cyan-500/40 rounded-lg p-5 transition-colors space-y-2"
        >
          <div className="flex items-center justify-between">
            <Rocket className="w-5 h-5 text-cyan-400" aria-hidden="true" />
            <span className="text-xs font-mono text-slate-400">{launcher.name.split(' ')[0]}</span>
          </div>
          <h2 className="font-display text-base font-semibold text-white">Launch Vehicle</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Match payload mass margin ({eng.massMarginPct}%) and fairing envelope to orbital launchers.
          </p>
        </button>
      </div>

      {/* Mission Presets & Engineering Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#0d1424] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-white">Quick-Start Reference Missions</h2>
            <span className="text-xs text-slate-400">Loads full engineering baseline</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                ['mars-rover', 'Mars Astrobiology Rover', 'Mars · Rover · $1,100M cap'],
                ['lunar-lander', 'Artemis South Pole Lander', 'Moon · Lander · $780M cap'],
                ['l2-telescope', 'Origins L2 Space Telescope', 'Sun-Earth L2 · Observatory'],
                ['europa-probe', 'Europa Deep-Space Probe', 'Jupiter · RTG Nuclear · Veteran'],
              ] as const
            ).map(([key, title, sub]) => (
              <button
                key={key}
                type="button"
                onClick={() => loadPresetMission(key)}
                className="text-left p-3.5 rounded border border-slate-800 bg-[#090e1a] hover:border-cyan-500/50 transition-colors"
              >
                <div className="text-sm font-medium text-white">{title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#0d1424] border border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-white">Pre-Launch Status Checks</h2>
            <span className="text-xs font-mono text-slate-400">{campaigns.length} past runs</span>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { ok: eng.isMassValid, label: `Mass Margin: ${eng.massMarginKg} kg (${eng.massMarginPct}%)` },
              { ok: eng.isPowerValid, label: `Power & Eclipse: ${eng.powerMarginW} W margin · ${eng.eclipseCapacityHours}h battery` },
              { ok: orb.isDeltaVSufficient, label: `Delta-V Margin: ${orb.deltaVMarginKms >= 0 ? '+' : ''}${orb.deltaVMarginKms.toFixed(2)} km/s` },
              { ok: eng.isBudgetValid, label: `Budget Reserve: $${eng.budgetRemainingMUsd}M (${eng.contingencyPct}%)` },
              { ok: criticalRisks === 0, label: `Critical Risks Unmitigated: ${criticalRisks}` },
              { ok: Boolean(mission.gates.find((g) => g.code === 'FRR')?.passed), label: 'Flight Readiness Review (FRR) Gate' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 py-1 border-b border-slate-800/60 last:border-0">
                {item.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                )}
                <span className={item.ok ? 'text-slate-200' : 'text-amber-200'}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
