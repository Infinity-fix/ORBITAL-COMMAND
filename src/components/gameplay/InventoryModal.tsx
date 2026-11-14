import { FlaskConical, Package, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { EnvironmentId, EquipmentId, InventoryItemState, ScienceRecord } from '../../engine/types';
import { EQUIPMENT_CATALOG, getTotalCarriedMassKg } from '../../gameplay/InventorySystem';

interface InventoryModalProps {
  inventory: InventoryItemState[];
  equippedId: EquipmentId | null;
  scienceRecords: ScienceRecord[];
  onEquip: (id: EquipmentId) => void;
  onUse: (id: EquipmentId) => void;
  onClose: () => void;
}

const ENV_FILTERS: Array<{ id: 'all' | EnvironmentId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'station', label: 'Station' },
  { id: 'spacecraft', label: 'Craft' },
  { id: 'moon', label: 'Moon' },
  { id: 'mars', label: 'Mars' },
  { id: 'orbital-eva', label: 'EVA' },
];

export function InventoryModal({
  inventory,
  equippedId,
  scienceRecords,
  onEquip,
  onUse,
  onClose,
}: InventoryModalProps) {
  const totalMass = getTotalCarriedMassKg(inventory);
  const [envFilter, setEnvFilter] = useState<'all' | EnvironmentId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scienceRecords.filter((rec) => {
      if (envFilter !== 'all' && rec.environment !== envFilter) return false;
      if (!q) return true;
      return (
        rec.title.toLowerCase().includes(q) ||
        rec.sampleId.toLowerCase().includes(q) ||
        rec.instrument.toLowerCase().includes(q) ||
        (rec.sampleType ?? '').toLowerCase().includes(q) ||
        rec.locationLabel.toLowerCase().includes(q)
      );
    });
  }, [scienceRecords, envFilter, searchQuery]);

  const totalResearchValue = useMemo(
    () => scienceRecords.reduce((acc, r) => acc + (r.researchValue ?? 25), 0),
    [scienceRecords]
  );

  return (
    <div className="fixed inset-0 z-40 bg-[#050811]/85 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#0d1424] border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              Astronaut Equipment Kit &amp; Discovery Database
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Carried Mass: {totalMass} kg · {inventory.length}/10 Slots · {scienceRecords.length} Discoveries · Total Value: {totalResearchValue} RV
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Inventory"
            className="p-1.5 rounded border border-slate-700 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Equipment Slots */}
          <div className="lg:col-span-6 space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Field Equipment &amp; Survival Gear
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {inventory.map((item) => {
                const spec = EQUIPMENT_CATALOG[item.id];
                const isEquipped = equippedId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border space-y-2 ${
                      isEquipped
                        ? 'bg-cyan-500/10 border-cyan-400'
                        : 'bg-[#070b14] border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-white">{spec.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {spec.category} · {spec.massKg}kg · Qty {item.quantity} · {item.durabilityPct}%
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">{spec.description}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onEquip(item.id)}
                        className={`flex-1 py-1 rounded text-[11px] font-mono font-semibold ${
                          isEquipped
                            ? 'bg-cyan-500 text-slate-950'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        {isEquipped ? 'Equipped' : 'Equip'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onUse(item.id);
                          if (item.id === 'emergency-o2') onClose();
                        }}
                        className="px-3 py-1 rounded bg-amber-500/20 border border-amber-500/50 hover:bg-amber-500/30 text-amber-200 text-[11px] font-mono"
                      >
                        Activate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recorded Scientific Measurements / Discovery Database */}
          <div className="lg:col-span-6 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
                Discovery Database ({filteredRecords.length}/{scienceRecords.length})
              </h3>
              <span className="text-[10px] font-mono text-amber-300">
                Simulated Mission Instrument Data
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {ENV_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setEnvFilter(f.id)}
                  className={`px-2 py-1 rounded text-[10px] font-mono border ${
                    envFilter === f.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                      : 'bg-[#070b14] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter samples..."
                className="flex-1 min-w-[120px] px-2.5 py-1 rounded bg-[#070b14] border border-slate-700 text-[11px] text-white"
              />
            </div>

            {filteredRecords.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#070b14] border border-slate-800 text-xs text-slate-400">
                {scienceRecords.length === 0
                  ? 'No field specimens or spectral readings recorded yet. Equip the Camera, Drill, Hammer, Sample Tube, or Spectrometer and press [F] during surface exploration.'
                  : 'No discovery records match the current filter.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-lg bg-[#070b14] border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-emerald-300 font-bold">
                        {rec.sampleId} · {rec.sampleType ?? 'Sample'}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-amber-300">+{rec.researchValue ?? 25} RV</span>
                        <span className={rec.transmitted ? 'text-cyan-300' : 'text-slate-400'}>
                          {rec.transmitted ? 'TRANSMITTED' : 'LOCAL BUFFER'}
                        </span>
                      </span>
                    </div>
                    <div className="font-semibold text-white">{rec.title}</div>
                    <div className="font-mono text-cyan-200">
                      {rec.measurement} {rec.unit}
                    </div>
                    <div className="text-[10px] text-slate-400 flex flex-wrap justify-between gap-2">
                      <span>{rec.instrument} · {rec.environment.toUpperCase()}</span>
                      <span>{rec.missionRef ?? rec.sourceLabel}</span>
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
