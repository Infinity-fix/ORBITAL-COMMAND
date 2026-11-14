import { useEffect } from 'react';
import { CampaignView } from './components/CampaignView';
import { DashboardView } from './components/DashboardView';
import { HelpModal } from './components/HelpModal';
import { MissionControlView } from './components/MissionControlView';
import { MissionDesignView } from './components/MissionDesignView';
import { MissionLogSidebar } from './components/MissionLogSidebar';
import { MissionResultsView } from './components/MissionResultsView';
import { OrbitalPlannerView } from './components/OrbitalPlannerView';
import { PlayWorkspaceView } from './components/gameplay/PlayWorkspaceView';
import { SettingsView } from './components/SettingsView';
import { SquadMultiplayerView } from './components/SquadMultiplayerView';
import { SystemsEngineeringView } from './components/SystemsEngineeringView';
import { TitleScreen } from './components/TitleScreen';
import { TopNavShell } from './components/TopNavShell';
import type { RemotePlayer3DState, SquadState } from './engine/types';
import { emitSquadJoin, getSquadSocket } from './services/socketClient';
import { useMissionStore } from './store/useMissionStore';

export default function App() {
  const started = useMissionStore((s) => s.started);
  const activeView = useMissionStore((s) => s.activeView);
  const statusBanner = useMissionStore((s) => s.statusBanner);
  const clearStatusBanner = useMissionStore((s) => s.clearStatusBanner);
  const hydrateCampaignFromServer = useMissionStore((s) => s.hydrateCampaignFromServer);
  const setSocketConnected = useMissionStore((s) => s.setSocketConnected);
  const applyRemoteSquadState = useMissionStore((s) => s.applyRemoteSquadState);
  const setSquadSession = useMissionStore((s) => s.setSquadSession);
  const upsertRemotePlayer = useMissionStore((s) => s.upsertRemotePlayer);
  const removeRemotePlayer = useMissionStore((s) => s.removeRemotePlayer);
  const setStatusBanner = useMissionStore((s) => s.setStatusBanner);

  useEffect(() => {
    document.body.dataset.state = started ? 'playing' : 'title';
  }, [started]);

  useEffect(() => {
    void hydrateCampaignFromServer();

    const socket = getSquadSocket();
    const onConnect = async () => {
      setSocketConnected(true);
      const savedCode = sessionStorage.getItem('oc_squad_code');
      const savedMember = sessionStorage.getItem('oc_member_id');
      const savedName = sessionStorage.getItem('oc_player_name') || 'Flight Specialist';
      if (savedCode && savedMember) {
        const res = await emitSquadJoin(savedCode, savedName, savedMember);
        if (res.ok && res.squad && res.memberId) {
          setSquadSession(res.squad, res.memberId);
        }
      }
    };

    const onDisconnect = () => {
      setSocketConnected(false);
    };

    const onSquadState = (squad: SquadState) => {
      applyRemoteSquadState(squad);
    };

    const onRemotePlayerState = (player: RemotePlayer3DState) => {
      upsertRemotePlayer(player);
    };

    const onRemotePlayerRemoved = (payload: { memberId: string }) => {
      if (payload?.memberId) {
        removeRemotePlayer(payload.memberId);
      }
    };

    const onRescueAlert = (payload: {
      playerName: string;
      environment: string;
      cause: string;
    }) => {
      if (payload?.playerName) {
        setStatusBanner(
          'error',
          `RESCUE BEACON: ${payload.playerName} in ${payload.environment.toUpperCase()} — ${payload.cause}`
        );
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('squad:state', onSquadState);
    socket.on('squad:player:state', onRemotePlayerState);
    socket.on('squad:player:removed', onRemotePlayerRemoved);
    socket.on('squad:rescue:alert', onRescueAlert);

    if (socket.connected) {
      void onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('squad:state', onSquadState);
      socket.off('squad:player:state', onRemotePlayerState);
      socket.off('squad:player:removed', onRemotePlayerRemoved);
      socket.off('squad:rescue:alert', onRescueAlert);
    };
  }, [
    hydrateCampaignFromServer,
    setSocketConnected,
    applyRemoteSquadState,
    setSquadSession,
    upsertRemotePlayer,
    removeRemotePlayer,
    setStatusBanner,
  ]);

  if (!started) {
    return (
      <>
        <TitleScreen />
        <HelpModal />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-200 flex flex-col">
      <TopNavShell />

      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        <div className="flex-1 min-w-0 flex flex-col">
          {statusBanner && (
            <div
              role="status"
              className={`px-4 lg:px-6 py-2 text-xs flex items-center justify-between border-b ${
                statusBanner.type === 'error'
                  ? 'bg-rose-950/80 border-rose-800 text-rose-200'
                  : statusBanner.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                    : 'bg-slate-900 border-slate-800 text-slate-200'
              }`}
            >
              <span>{statusBanner.message}</span>
              <button
                type="button"
                onClick={clearStatusBanner}
                className="ml-4 text-xs underline hover:no-underline whitespace-nowrap"
              >
                Dismiss
              </button>
            </div>
          )}

          <main className="flex-1 min-w-0">
            {activeView === 'dashboard' && <DashboardView />}
            {activeView === 'design' && <MissionDesignView />}
            {activeView === 'orbital' && <OrbitalPlannerView />}
            {activeView === 'engineering' && <SystemsEngineeringView />}
            {activeView === 'control' && <MissionControlView />}
            {activeView === 'play' && <PlayWorkspaceView />}
            {activeView === 'squad' && <SquadMultiplayerView />}
            {activeView === 'results' && <MissionResultsView />}
            {activeView === 'campaign' && <CampaignView />}
            {activeView === 'settings' && <SettingsView />}
          </main>
        </div>

        <div className={activeView === 'play' ? 'hidden lg:contents' : 'contents'}>
          <MissionLogSidebar />
        </div>
      </div>

      <HelpModal />
    </div>
  );
}
