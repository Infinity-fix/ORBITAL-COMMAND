import { Award, CheckCircle2, Compass, XCircle } from 'lucide-react';
import { ACHIEVEMENTS, DESTINATIONS } from '../engine/catalog';
import { useMissionStore } from '../store/useMissionStore';

export function CampaignView() {
  const campaigns = useMissionStore((s) => s.campaigns);
  const unlockedAchievements = useMissionStore((s) => s.unlockedAchievements);
  const career = useMissionStore((s) => s.career);
  const baseModules = useMissionStore((s) => s.baseModules);

  const totalScore = campaigns.reduce((s, c) => s + c.score, 0);
  const passedCount = campaigns.filter((c) => c.passed).length;

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Campaign Progress &amp; Astronaut Career</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Persistent mission log, career rank, engineering skills, and merit achievements (100% free progression)
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono tabular-nums">
          <div>
            <span className="text-slate-400">Cumulative Score: </span>
            <strong className="text-cyan-300 text-base">{totalScore}</strong>
          </div>
          <div>
            <span className="text-slate-400">Successful Missions: </span>
            <strong className="text-emerald-400 text-base">
              {passedCount}/{campaigns.length}
            </strong>
          </div>
        </div>
      </div>

      {/* Astronaut Career & Skills Progression */}
      <section className="bg-[#0d1424] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            Astronaut Career Profile · <span className="text-amber-300">{career.rank}</span>
          </h2>
          <div className="flex flex-wrap gap-4 text-xs font-mono">
            <span className="text-cyan-300">{career.xp} XP</span>
            <span className="text-emerald-300">Agency Rep: {career.reputation}%</span>
            <span className="text-slate-300">Sorties: {career.missionsFlown}</span>
            <span className="text-slate-300">Discoveries: {career.discoveriesLogged}</span>
            <span className="text-amber-200">Base Modules: {baseModules.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#070b14] border border-slate-800">
            <div className="text-[10px] text-slate-400">PILOTING</div>
            <div className="text-base font-bold text-cyan-300 mt-0.5">Lv. {career.skills.piloting} / 10</div>
          </div>
          <div className="p-3 rounded-lg bg-[#070b14] border border-slate-800">
            <div className="text-[10px] text-slate-400">EVA OPS</div>
            <div className="text-base font-bold text-emerald-300 mt-0.5">Lv. {career.skills.evaOps} / 10</div>
          </div>
          <div className="p-3 rounded-lg bg-[#070b14] border border-slate-800">
            <div className="text-[10px] text-slate-400">SCIENCE</div>
            <div className="text-base font-bold text-amber-300 mt-0.5">Lv. {career.skills.science} / 10</div>
          </div>
          <div className="p-3 rounded-lg bg-[#070b14] border border-slate-800">
            <div className="text-[10px] text-slate-400">ENGINEERING</div>
            <div className="text-base font-bold text-sky-300 mt-0.5">Lv. {career.skills.engineering} / 10</div>
          </div>
        </div>
      </section>

      {/* Achievements Grid */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-white">Agency Merit Achievements</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = unlockedAchievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                className={`rounded-lg border p-4 space-y-2 ${
                  unlocked ? 'bg-[#101e33] border-cyan-500/50' : 'bg-[#0d1424] border-slate-800 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">{ach.category}</span>
                  <Award className={`w-4 h-4 ${unlocked ? 'text-amber-400' : 'text-slate-600'}`} />
                </div>
                <div className="font-display text-sm font-semibold text-white">{ach.title}</div>
                <p className="text-xs text-slate-400 leading-relaxed">{ach.description}</p>
                <div className="text-[11px] font-mono">
                  {unlocked ? (
                    <span className="text-emerald-400">Unlocked</span>
                  ) : (
                    <span className="text-slate-500">Locked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mission History Table */}
      <div className="bg-[#0d1424] border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-display text-base font-semibold text-white">Completed &amp; Logged Missions</h2>
        </div>
        {campaigns.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No completed missions logged yet. Finish a full mission through End of Life in Mission Control to record your first campaign result.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090e1a] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Mission</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Cost</th>
                  <th className="py-3 px-4">Grade</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {campaigns.map((c) => {
                  const dest = DESTINATIONS.find((d) => d.id === c.destinationId);
                  return (
                    <tr key={c.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-medium text-white">{c.missionName}</td>
                      <td className="py-3 px-4 text-slate-300">{dest?.name ?? c.destinationId}</td>
                      <td className="py-3 px-4 text-slate-300">{c.missionType}</td>
                      <td className="py-3 px-4 font-mono tabular-nums">${c.costMUsd}M</td>
                      <td className="py-3 px-4 font-display font-bold text-cyan-300">{c.grade}</td>
                      <td className="py-3 px-4 font-mono tabular-nums">{c.score}</td>
                      <td className="py-3 px-4">
                        {c.passed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400">
                            <XCircle className="w-3.5 h-3.5" /> Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
