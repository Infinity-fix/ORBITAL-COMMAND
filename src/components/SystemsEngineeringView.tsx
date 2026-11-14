import { useState } from 'react';
import { CheckCircle2, Lock, ShieldAlert, XCircle } from 'lucide-react';
import { computeOrbitalAnalysis } from '../engine/orbitalMechanics';
import { computeSpacecraftEngineering } from '../engine/spacecraftEngineering';
import { computeTradeStudy, evaluateRequirements } from '../engine/systemsEngineering';
import type { VerificationMethod } from '../engine/types';
import { useMissionStore } from '../store/useMissionStore';

export function SystemsEngineeringView() {
  const mission = useMissionStore((s) => s.mission);
  const setRequirementMethod = useMissionStore((s) => s.setRequirementMethod);
  const mitigateRisk = useMissionStore((s) => s.mitigateRisk);
  const attemptPassGate = useMissionStore((s) => s.attemptPassGate);
  const passAllReadyPreLaunchGates = useMissionStore((s) => s.passAllReadyPreLaunchGates);
  const updateSpacecraft = useMissionStore((s) => s.updateSpacecraft);
  const setLaunchVehicle = useMissionStore((s) => s.setLaunchVehicle);

  const [tab, setTab] = useState<'requirements' | 'trades' | 'risks' | 'gates'>('requirements');
  const [tradeTopic, setTradeTopic] = useState<'Propulsion' | 'Launch Vehicle' | 'Power System'>('Propulsion');

  const eng = computeSpacecraftEngineering(mission);
  const orb = computeOrbitalAnalysis(
    mission.destinationId,
    mission.orbitalPlan,
    mission.spacecraft,
    eng.wetMassKg,
    eng.dryMassKg
  );
  const reqs = evaluateRequirements(mission, eng, orb);
  const tradeResult = computeTradeStudy(mission, tradeTopic);

  const applyTradeWinner = () => {
    if (tradeTopic === 'Propulsion') {
      updateSpacecraft({ propulsionId: tradeResult.winnerId as never });
    } else if (tradeTopic === 'Power System') {
      updateSpacecraft({ powerId: tradeResult.winnerId as never });
    } else {
      setLaunchVehicle(tradeResult.winnerId);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Systems Engineering Console</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            NASA-inspired educational lifecycle adaptation · Requirements traceability, trade studies, risk register &amp; design gates
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#0d1424] border border-slate-800 rounded-lg">
          {(
            [
              ['requirements', 'Requirements'],
              ['trades', 'Trade Studies'],
              ['risks', 'Risk Register'],
              ['gates', 'Lifecycle Gates'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                tab === id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-100 border border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: REQUIREMENTS & TRACEABILITY */}
      {tab === 'requirements' && (
        <div className="bg-[#0d1424] border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-300">
              Passed:{' '}
              <strong className="font-mono text-emerald-400">
                {reqs.filter((r) => r.status === 'Passed').length}/{reqs.length}
              </strong>
            </span>
            <span className="text-slate-400">
              Values update automatically from Spacecraft, Orbital, Budget, and Risk configurations.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090e1a] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Requirement</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Actual</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {reqs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-mono text-cyan-300 whitespace-nowrap">{r.code}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{r.title}</div>
                      <div className="text-slate-400 mt-0.5">{r.description}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Traces to: {r.objectiveLink}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{r.priority}</td>
                    <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">{r.targetDisplay}</td>
                    <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">{r.actualDisplay}</td>
                    <td className="py-3 px-4">
                      <select
                        value={r.verificationMethod}
                        onChange={(e) => setRequirementMethod(r.id, e.target.value as VerificationMethod)}
                        className="px-2 py-1 rounded bg-[#070b14] border border-slate-700 text-slate-200"
                      >
                        <option value="Analysis">Analysis</option>
                        <option value="Test">Test</option>
                        <option value="Inspection">Inspection</option>
                        <option value="Demonstration">Demonstration</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {r.status === 'Passed' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                          <XCircle className="w-3.5 h-3.5" aria-hidden="true" /> Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TRADE STUDIES */}
      {tab === 'trades' && (
        <div className="space-y-4">
          <div className="bg-[#0d1424] border border-slate-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {(['Propulsion', 'Launch Vehicle', 'Power System'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTradeTopic(t)}
                  className={`px-3.5 py-1.5 rounded text-xs font-medium border ${
                    tradeTopic === t
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-[#070b14] border-slate-700 text-slate-300'
                  }`}
                >
                  {t} Trade
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={applyTradeWinner}
              className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors"
            >
              Adopt Recommended Option
            </button>
          </div>

          <div className="bg-[#0d1424] border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="text-sm text-cyan-300 font-medium">{tradeResult.explanation}</div>
            <div className="space-y-2.5">
              {tradeResult.options.map((opt, idx) => (
                <div
                  key={opt.id}
                  className={`p-4 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    idx === 0
                      ? 'bg-[#101d36] border-cyan-500/50'
                      : 'bg-[#070b14] border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">#{idx + 1}</span>
                      <span className="font-display text-sm font-semibold text-white">{opt.label}</span>
                      {idx === 0 && <span className="text-xs text-cyan-300 font-medium">Recommended</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{opt.notes}</div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono tabular-nums shrink-0">
                    <span>Perf: {opt.performanceScore}</span>
                    <span>Mass: {opt.massScore}</span>
                    <span>Cost: {opt.costScore}</span>
                    <span>Risk: {opt.riskScore}</span>
                    <span className="text-sm font-bold text-cyan-300">{opt.weightedTotal}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RISK REGISTER */}
      {tab === 'risks' && (
        <div className="space-y-4">
          {mission.risks.map((risk) => {
            const activeScore = risk.mitigated ? risk.residualScore : risk.score;
            return (
              <div
                key={risk.id}
                className="bg-[#0d1424] border border-slate-800 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono text-cyan-300">{risk.code}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span
                      className={`font-medium ${
                        risk.mitigated
                          ? 'text-emerald-400'
                          : risk.severity === 'Critical'
                            ? 'text-rose-400'
                            : risk.severity === 'High'
                              ? 'text-amber-300'
                              : 'text-slate-300'
                      }`}
                    >
                      {risk.mitigated ? 'Mitigated' : `${risk.severity} Risk`}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-slate-400">Owner: {risk.ownerRole}</span>
                  </div>
                  <h3 className="font-display text-base font-semibold text-white">{risk.title}</h3>
                  <p className="text-xs text-slate-300">{risk.description}</p>
                  <p className="text-xs text-slate-400">
                    <strong className="text-slate-200">Mitigation:</strong> {risk.mitigationStrategy}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right text-xs font-mono tabular-nums">
                    <div className="text-slate-400">Score (P×C)</div>
                    <div className="text-lg font-bold text-white">{activeScore} / 25</div>
                    <div className="text-slate-500">Cost: ${risk.mitigationCostMUsd}M</div>
                  </div>

                  <button
                    type="button"
                    disabled={risk.mitigated}
                    onClick={() => mitigateRisk(risk.id)}
                    className={`px-4 py-2 rounded text-xs font-semibold transition-colors whitespace-nowrap ${
                      risk.mitigated
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 cursor-default'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    }`}
                  >
                    {risk.mitigated ? 'Mitigation Applied' : `Mitigate (-$${risk.mitigationCostMUsd}M)`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: LIFECYCLE GATES */}
      {tab === 'gates' && (
        <div className="space-y-4">
          <div className="bg-[#0d1424] border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-300">
              Educational Systems Engineering Lifecycle (Pre-Phase A to Phase F). Critical gates block if mass, power, Δv, budget, or critical risks fail.
            </div>
            <button
              type="button"
              onClick={passAllReadyPreLaunchGates}
              className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap"
            >
              Verify &amp; Pass Pre-Launch Gates (MCR–FRR)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mission.gates.map((gate) => (
              <div
                key={gate.code}
                className={`rounded-lg border p-4 flex flex-col justify-between gap-3 ${
                  gate.passed ? 'bg-[#0e1b29] border-emerald-500/40' : 'bg-[#0d1424] border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-slate-400">{gate.lifecyclePhase}</div>
                    <h3 className="font-display text-base font-semibold text-white mt-0.5">
                      {gate.code} — {gate.name}
                    </h3>
                  </div>
                  {gate.passed ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Passed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-300 font-medium">
                      {gate.blockedReasons.length > 0 ? (
                        <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Lock className="w-4 h-4" aria-hidden="true" />
                      )}
                      {gate.blockedReasons.length > 0 ? 'Blocked' : 'Ready'}
                    </span>
                  )}
                </div>

                {gate.blockedReasons.length > 0 && !gate.passed && (
                  <ul className="text-xs text-rose-300 space-y-1 list-disc pl-4">
                    {gate.blockedReasons.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}

                {!gate.passed && (
                  <button
                    type="button"
                    onClick={() => attemptPassGate(gate.code)}
                    className="self-start px-3.5 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs text-white transition-colors"
                  >
                    Conduct {gate.code} Review
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
