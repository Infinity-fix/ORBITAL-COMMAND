import { useEffect, useState } from 'react';
import { Cloud, CloudCheck, CloudOff, HelpCircle, Rocket, Users } from 'lucide-react';
import { computeSpacecraftEngineering } from '../engine/spacecraftEngineering';
import { calculateMissionReadinessPct } from '../engine/systemsEngineering';
import { computeOrbitalAnalysis } from '../engine/orbitalMechanics';
import type { AppView } from '../engine/types';
import { useMissionStore } from '../store/useMissionStore';
import { CloudSyncModal } from './CloudSyncModal';
import { isFirebaseConfigured, subscribeToAuthState } from '../services/firebase';
import { getCloudSyncStatus, subscribeToSyncStatus, type CloudSyncStatus } from '../services/cloudPersistence';

const NAV_ITEMS: Array<{ id: AppView; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'design', label: 'Design' },
  { id: 'orbital', label: 'Orbital & 3D' },
  { id: 'engineering', label: 'Systems Eng' },
  { id: 'control', label: 'Mission Control' },
  { id: 'play', label: '3D Field Ops' },
  { id: 'squad', label: 'Squad' },
  { id: 'campaign', label: 'Campaign' },
];

export function TopNavShell() {
  const activeView = useMissionStore((s) => s.activeView);
  const setActiveView = useMissionStore((s) => s.setActiveView);
  const setShowHelpModal = useMissionStore((s) => s.setShowHelpModal);
  const mission = useMissionStore((s) => s.mission);
  const squad = useMissionStore((s) => s.squad);

  const [showCloudModal, setShowCloudModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(getCloudSyncStatus());
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const unsubAuth = subscribeToAuthState((u) => setIsSignedIn(Boolean(u)));
    const unsubSync = subscribeToSyncStatus((st) => setSyncStatus(st));
    return () => {
      unsubAuth();
      unsubSync();
    };
  }, []);

  const eng = computeSpacecraftEngineering(mission);
  const orb = computeOrbitalAnalysis(
    mission.destinationId,
    mission.orbitalPlan,
    mission.spacecraft,
    eng.wetMassKg,
    eng.dryMassKg
  );
  const readiness = calculateMissionReadinessPct(mission, eng, orb);
  const firebaseReady = isFirebaseConfigured();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#090d18]">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-2 lg:py-0 lg:h-14 flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-4 gap-y-2">
          {/* Zone 1: Single-line Brand Title */}
          <button
            type="button"
            onClick={() => setActiveView('dashboard')}
            className="order-1 font-display text-base font-bold tracking-wider text-white whitespace-nowrap shrink-0 flex items-center gap-2 hover:text-cyan-300 transition-colors"
          >
            <Rocket className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            <span>ORBITAL COMMAND</span>
          </button>

          {/* Zone 2: Clean Single-Line Nav Links (full-width row on mobile, inline on lg+) */}
          <nav
            className="order-3 lg:order-2 w-full lg:w-auto flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0"
            aria-label="Primary Navigation"
          >
            {NAV_ITEMS.map((item) => {
              const active = activeView === item.id || (item.id === 'campaign' && activeView === 'results');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-100 border border-transparent'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Readiness & Settings/Help Action */}
          <div className="order-2 lg:order-3 flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap">
              <span>{mission.name}</span>
              <span aria-hidden="true">·</span>
              <span className={readiness >= 75 ? 'text-emerald-400' : 'text-amber-400'}>
                {readiness}% Ready
              </span>
              {squad && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-cyan-300 inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" aria-hidden="true" />
                    {squad.code}
                  </span>
                </>
              )}
            </div>

            {/* Cloud & Firebase Status Pill */}
            <button
              type="button"
              onClick={() => setShowCloudModal(true)}
              title={
                firebaseReady && isSignedIn
                  ? 'Cloud Synced via Firebase Firestore'
                  : firebaseReady
                    ? 'Firebase ready · Click to Sign In with Google'
                    : 'Operating in Safe Local Storage Mode · Click for details'
              }
              className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 border transition-colors ${
                firebaseReady && isSignedIn
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:border-emerald-600'
                  : firebaseReady
                    ? 'bg-cyan-950/40 border-cyan-800 text-cyan-300 hover:border-cyan-600'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {firebaseReady && isSignedIn ? (
                <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : firebaseReady ? (
                <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <CloudOff className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="hidden sm:inline">
                {firebaseReady && isSignedIn ? 'Cloud' : firebaseReady ? 'Sign In' : 'Local'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('settings')}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'settings'
                  ? 'bg-slate-800 border-slate-600 text-white'
                  : 'bg-[#0f1628] border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              Settings
            </button>

            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              aria-label="Open Help and Engineering Guide"
              className="p-1.5 rounded border border-slate-700 text-slate-300 hover:text-white hover:border-cyan-500/50 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <CloudSyncModal isOpen={showCloudModal} onClose={() => setShowCloudModal(false)} />
    </>
  );
}
