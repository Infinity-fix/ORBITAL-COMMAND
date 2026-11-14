import { Building2, CheckCircle2, Cpu, ShieldCheck, X, Zap } from 'lucide-react';
import { useState } from 'react';
import type { BaseModuleType, MissionDesign, PlanetaryBaseModule } from '../../engine/types';
import { BASE_MODULE_CATALOG, evaluateBaseResources } from '../../gameplay/PlanetaryBaseSystem';

interface BaseBuilderModalProps {
  environment: 'moon' | 'mars';
  mission: MissionDesign;
  modules: PlanetaryBaseModule[];
  playerPos: { x: number; z: number };
  onBuildModule: (params: {
    type: BaseModuleType;
    environment: 'moon' | 'mars';
    x: number;
    z: number;
  }) => { ok: boolean; module?: PlanetaryBaseModule; error?: string };
  onClose: () => void;
}

export function BaseBuilderModal({
  environment,
  mission,
  modules,
  playerPos,
  onBuildModule,
  onClose,
}: BaseBuilderModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const summary = evaluateBaseResources(mission, modules, environment);
  const envModules = modules.filter((m) => m.environment === environment);

  const handleConstruct = (type: BaseModuleType) => {
    const res = onBuildModule({
      type,
      environment,
      x: playerPos.x + 4.5,
      z: playerPos.z + 3.0,
    });
    if (!res.ok) {
      setErrorMsg(res.error ?? 'Could not construct base module.');
      setSuccessMsg(null);
    } else {
      setErrorMsg(null);
      setSuccessMsg(`Deployed ${res.module?.name} on ${environment.toUpperCase()}.`);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#050811]/85 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#0d1424] border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              Planetary Base Construction · {environment.toUpperCase()} Sector
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Mass Budget: {summary.usedMassKg}/{summary.totalMassAllowanceKg} kg · Net Power:{' '}
              <span className={summary.netPowerKw >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                {summary.netPowerKw >= 0 ? '+' : ''}
                {summary.netPowerKw} kW
              </span>{' '}
              · Science Multiplier: {summary.scienceBonusMultiplier}x
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Base Builder"
            className="p-1.5 rounded border border-slate-700 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded bg-rose-950/70 border border-rose-500 text-rose-200 font-mono">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded bg-emerald-950/60 border border-emerald-500 text-emerald-200 font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(Object.keys(BASE_MODULE_CATALOG) as BaseModuleType[]).map((type) => {
              const spec = BASE_MODULE_CATALOG[type];
              const canMass = spec.massKg <= summary.remainingMassKg;
              const canPower = spec.powerDeltaKw >= 0 || summary.netPowerKw + spec.powerDeltaKw >= 0;
              return (
                <div
                  key={type}
                  className="p-3.5 rounded-lg bg-[#070b14] border border-slate-800 flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white text-sm">{spec.name}</span>
                      <span
                        className={`font-mono text-[11px] inline-flex items-center gap-1 ${
                          spec.powerDeltaKw >= 0 ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        <Zap className="w-3 h-3" />
                        {spec.powerDeltaKw >= 0 ? `+${spec.powerDeltaKw}` : spec.powerDeltaKw} kW
                      </span>
                    </div>
                    <p className="text-slate-300 leading-snug">{spec.description}</p>
                    <div className="flex flex-wrap gap-3 pt-1 font-mono text-[10px] text-slate-400">
                      <span>Mass: {spec.massKg} kg</span>
                      {spec.providesSafeZone && (
                        <span className="text-emerald-400 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Safe Zone
                        </span>
                      )}
                      {spec.scienceYieldMultiplier > 0 && (
                        <span className="text-cyan-300">
                          +{Math.round(spec.scienceYieldMultiplier * 100)}% Science
                        </span>
                      )}
                      {spec.commsBoostPct > 0 && (
                        <span className="text-sky-300">+{spec.commsBoostPct}% Comms</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleConstruct(type)}
                    className={`w-full py-2 rounded font-mono font-semibold text-xs ${
                      canMass && canPower
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                        : 'bg-slate-800 text-amber-300 border border-amber-600/40'
                    }`}
                  >
                    Deploy Module Near Astronaut
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Active {environment.toUpperCase()} Base Modules ({envModules.length})
            </h3>
            {envModules.length === 0 ? (
              <div className="p-3 rounded bg-[#070b14] border border-slate-800 text-slate-400">
                No custom modules deployed yet on {environment.toUpperCase()}. Build a Solar Farm first to expand surface power capacity.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {envModules.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded bg-[#070b14] border border-emerald-700/40 font-mono text-[11px]"
                  >
                    <div className="text-white font-semibold truncate">{m.name}</div>
                    <div className="text-slate-400">
                      ({m.x}m, {m.z}m) · {m.massKg}kg · {m.powerDeltaKw >= 0 ? `+${m.powerDeltaKw}` : m.powerDeltaKw} kW
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
