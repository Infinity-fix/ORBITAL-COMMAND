import { X } from 'lucide-react';
import { useMissionStore } from '../store/useMissionStore';

export function HelpModal() {
  const open = useMissionStore((s) => s.showHelpModal);
  const setOpen = useMissionStore((s) => s.setShowHelpModal);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-2xl bg-[#0d1424] border border-slate-700 rounded-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 id="help-modal-title" className="font-display text-xl font-bold text-white">
            Aerospace Mission Design Guide
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close help modal"
            className="p-1.5 rounded border border-slate-700 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <div>
            <h3 className="font-display text-sm font-semibold text-cyan-300">1. Mission &amp; Spacecraft Design</h3>
            <p className="mt-1">
              Define your destination and mission type in <strong>Design</strong>. Solar array power scales with the inverse-square law ($1/r^2$ in AU), so outer-system missions (Ceres, Jupiter) require large arrays or Multi-MMRTG nuclear power.
            </p>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-cyan-300">2. Orbital Mechanics &amp; JPL Horizons</h3>
            <p className="mt-1">
              In <strong>Orbital &amp; 3D</strong>, inspect the 3D heliocentric transfer arc and verify that your spacecraft’s Tsiolkovsky Δv exceeds the required transfer + capture Δv. Fetch state vectors directly from NASA/JPL Horizons.
            </p>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-cyan-300">3. Systems Engineering &amp; Gate Reviews</h3>
            <p className="mt-1">
              Before launching, mitigate Critical risks in the Risk Register, verify all mandatory requirements pass, and pass the pre-launch readiness gates (MCR through FRR).
            </p>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-cyan-300">4. Mission Control &amp; Recovery</h3>
            <p className="mt-1">
              Advance through Concept, Design, Development, Testing, Launch Liftoff, Cruise, Operations, and End of Life. If an anomaly causes a stage failure, you may retry the failed stage or restart the mission campaign.
            </p>
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-cyan-300">5. Multiplayer Squads</h3>
            <p className="mt-1">
              Create a squad room in <strong>Squad</strong> and share the room code (e.g. <code className="font-mono">ORB-XXXX</code>) with teammates to collaborate in real time across specialized engineering roles.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs"
          >
            Return to Studio
          </button>
        </div>
      </div>
    </div>
  );
}
