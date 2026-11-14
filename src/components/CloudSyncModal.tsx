import { useEffect, useState } from 'react';
import {
  Cloud,
  CloudCheck,
  CloudOff,
  Database,
  LogIn,
  LogOut,
  RefreshCw,
  Save,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  clearCustomFirebaseConfig,
  isFirebaseConfigured,
  saveCustomFirebaseConfig,
  signInWithGoogle,
  signOutFromFirebase,
  subscribeToAuthState,
  testConnection,
} from '../services/firebase';
import {
  getCloudSyncStatus,
  hydrateFromCloudOrLocal,
  subscribeToSyncStatus,
  type CloudSyncStatus,
} from '../services/cloudPersistence';
import { useMissionStore } from '../store/useMissionStore';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CloudSyncModal({ isOpen, onClose }: boolean extends true ? any : CloudSyncModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(getCloudSyncStatus());
  const [statusDetail, setStatusDetail] = useState<string>('');
  const [connectionTestMsg, setConnectionTestMsg] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);

  const [customApiKey, setCustomApiKey] = useState('');
  const [customProjectId, setCustomProjectId] = useState('');
  const [customAppId, setCustomAppId] = useState('');

  const campaigns = useMissionStore((s) => s.campaigns);
  const achievements = useMissionStore((s) => s.unlockedAchievements);
  const hydrateCampaignFromServer = useMissionStore((s) => s.hydrateCampaignFromServer);

  useEffect(() => {
    const unsubAuth = subscribeToAuthState((u) => setUser(u));
    const unsubSync = subscribeToSyncStatus((st, detail) => {
      setSyncStatus(st);
      if (detail) setStatusDetail(detail);
    });
    return () => {
      unsubAuth();
      unsubSync();
    };
  }, []);

  if (!isOpen) return null;

  const configured = isFirebaseConfigured();

  const handleTestConnection = async () => {
    setIsTesting(true);
    const res = await testConnection();
    setConnectionTestMsg(res.message);
    setIsTesting(false);
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    const res = await signInWithGoogle();
    if (!res.ok && res.error) {
      setStatusDetail(res.error);
    } else if (res.user) {
      setStatusDetail(`Signed in as ${res.user.displayName || res.user.email}`);
      await hydrateFromCloudOrLocal(res.user.uid);
      await hydrateCampaignFromServer();
    }
    setIsSigningIn(false);
  };

  const handleSignOut = async () => {
    await signOutFromFirebase();
    setUser(null);
    setStatusDetail('Signed out of cloud session. Active in local mode.');
  };

  const handleSaveCustomConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customProjectId.trim() || !customApiKey.trim()) return;
    saveCustomFirebaseConfig({
      projectId: customProjectId.trim(),
      apiKey: customApiKey.trim(),
      appId: customAppId.trim() || undefined,
    });
  };

  const handleResetToLocal = () => {
    clearCustomFirebaseConfig();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloud-sync-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-xl bg-[#090e1a] border border-slate-700 rounded-xl shadow-2xl p-6 text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-cyan-950/60 border border-cyan-800/80 text-cyan-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 id="cloud-sync-modal-title" className="font-display text-lg font-bold">
                Cloud Sync &amp; Firebase Profile
              </h2>
              <p className="text-xs text-slate-400">
                Persistent mission history, spacecraft blueprints &amp; achievements
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Cloud Sync modal"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
            configured && user
              ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
              : configured
                ? 'bg-cyan-950/40 border-cyan-800 text-cyan-200'
                : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {configured && user ? (
              <CloudCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : configured ? (
              <Cloud className="w-5 h-5 text-cyan-400 shrink-0" />
            ) : (
              <CloudOff className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div>
              <div className="font-semibold">
                {configured && user
                  ? 'Cloud Synced with Firebase'
                  : configured
                    ? 'Firebase Configured · Sign-In Required'
                    : 'Safe Local Storage Mode (Offline Fallback)'}
              </div>
              <div className="text-[11px] opacity-90">
                {statusDetail ||
                  (configured && user
                    ? `Connected as ${user.displayName || user.email}`
                    : configured
                      ? 'Click Sign in with Google to sync your career across devices'
                      : 'Never pretending: Cloud credentials not set. All saves are stored securely locally.')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            Test
          </button>
        </div>

        {connectionTestMsg && (
          <div className="p-2.5 rounded bg-slate-900/90 border border-slate-700 text-xs text-slate-300 font-mono">
            {connectionTestMsg}
          </div>
        )}

        {/* User Account Section */}
        {configured && (
          <div className="p-4 rounded-lg bg-[#0d1424] border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Commander Identity
            </h3>
            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-10 h-10 rounded-full border border-cyan-500/50"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-cyan-900/60 border border-cyan-600 flex items-center justify-center font-bold text-cyan-300">
                      {user.displayName?.charAt(0) || 'C'}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-sm text-white">
                      {user.displayName || 'Flight Commander'}
                    </div>
                    <div className="text-xs text-slate-400">{user.email || user.uid}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-300">
                  Authenticate with Google to persist your missions, spacecraft, and trophies to your personal Firestore collection.
                </p>
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 shrink-0 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  {isSigningIn ? 'Connecting...' : 'Sign in with Google'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Synced Data Overview */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-lg bg-[#0d1424] border border-slate-800">
            <div className="text-xs text-slate-400">Campaign Runs</div>
            <div className="text-xl font-bold text-cyan-300 font-mono mt-1">{campaigns.length}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0d1424] border border-slate-800">
            <div className="text-xs text-slate-400">Achievements</div>
            <div className="text-xl font-bold text-amber-300 font-mono mt-1">{achievements.length}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0d1424] border border-slate-800">
            <div className="text-xs text-slate-400">Storage Mode</div>
            <div className="text-xs font-semibold text-emerald-400 font-mono mt-2">
              {configured && user ? 'FIRESTORE' : 'LOCAL CACHE'}
            </div>
          </div>
        </div>

        {/* Schema & Security Rules Info */}
        <div className="p-3 rounded-lg bg-[#0a101d] border border-slate-800 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Isolated Security Architecture</span>
          </div>
          <p className="leading-relaxed text-[11px]">
            Data is strictly isolated under <code className="text-cyan-300">users/&#123;userId&#125;</code> subcollections: <code className="text-slate-300">campaigns</code>, <code className="text-slate-300">missions</code>, <code className="text-slate-300">spacecraft</code>, <code className="text-slate-300">achievements</code>, and <code className="text-slate-300">settings</code>. Read/write rules require matching cryptographic auth tokens.
          </p>
        </div>

        {/* Custom Config Toggle */}
        <div className="border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={() => setShowConfigForm((s) => !s)}
            className="text-xs text-cyan-400 hover:text-cyan-300 underline"
          >
            {showConfigForm ? 'Hide Firebase Connection Settings' : 'Configure Custom Firebase Project (Optional)'}
          </button>

          {showConfigForm && (
            <form onSubmit={handleSaveCustomConfig} className="mt-3 p-3 rounded-lg bg-[#070b14] border border-slate-800 space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Project ID</label>
                <input
                  type="text"
                  placeholder="orbital-command-12345"
                  value={customProjectId}
                  onChange={(e) => setCustomProjectId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Web API Key</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">App ID (optional)</label>
                <input
                  type="text"
                  placeholder="1:123456789:web:abcdef"
                  value={customAppId}
                  onChange={(e) => setCustomAppId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-400"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save &amp; Reload
                </button>
                <button
                  type="button"
                  onClick={handleResetToLocal}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Clear Custom Config
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
