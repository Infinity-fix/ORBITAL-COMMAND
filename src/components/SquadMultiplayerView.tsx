import { useState, type FormEvent } from 'react';
import { Copy, LogOut, Send, Shield, Users } from 'lucide-react';
import type { SquadRole } from '../engine/types';
import {
  emitSquadChat,
  emitSquadCreate,
  emitSquadJoin,
  emitSquadLeave,
  emitSquadRoleAssign,
  emitSquadStageAdvance,
} from '../services/socketClient';
import { useMissionStore } from '../store/useMissionStore';

const ALL_ROLES: SquadRole[] = [
  'Mission Commander',
  'Pilot',
  'Engineer',
  'Scientist',
  'Mission Specialist',
  'Mission Designer',
  'Spacecraft Engineer',
  'Propulsion Engineer',
  'Payload Scientist',
  'Navigation Specialist',
  'Risk and Safety Officer',
];

export function SquadMultiplayerView() {
  const squad = useMissionStore((s) => s.squad);
  const myMemberId = useMissionStore((s) => s.myMemberId);
  const socketConnected = useMissionStore((s) => s.socketConnected);
  const mission = useMissionStore((s) => s.mission);
  const setSquadSession = useMissionStore((s) => s.setSquadSession);
  const setStatusBanner = useMissionStore((s) => s.setStatusBanner);

  const [playerName, setPlayerName] = useState('Flight Director');
  const [squadName, setSquadName] = useState('Ares Operations Team');
  const [joinCode, setJoinCode] = useState('');
  const [chatText, setChatText] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !squadName.trim()) {
      setStatusBanner('error', 'Enter both your callsign and squad name.');
      return;
    }
    setBusy(true);
    const res = await emitSquadCreate(squadName, playerName, mission);
    setBusy(false);
    if (!res.ok || !res.squad || !res.memberId) {
      setStatusBanner('error', res.error || 'Could not create squad. Verify backend connection.');
      return;
    }
    sessionStorage.setItem('oc_squad_code', res.squad.code);
    sessionStorage.setItem('oc_member_id', res.memberId);
    sessionStorage.setItem('oc_player_name', playerName);
    setSquadSession(res.squad, res.memberId);
    setStatusBanner('success', `Squad ${res.squad.code} created. You are Mission Commander.`);
  };

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !playerName.trim()) {
      setStatusBanner('error', 'Enter a valid room code and callsign.');
      return;
    }
    setBusy(true);
    const res = await emitSquadJoin(joinCode, playerName);
    setBusy(false);
    if (!res.ok || !res.squad || !res.memberId) {
      setStatusBanner('error', res.error || 'Unable to join squad room.');
      return;
    }
    sessionStorage.setItem('oc_squad_code', res.squad.code);
    sessionStorage.setItem('oc_member_id', res.memberId);
    sessionStorage.setItem('oc_player_name', playerName);
    setSquadSession(res.squad, res.memberId);
    setStatusBanner('success', `Joined squad ${res.squad.code}.`);
  };

  const handleLeave = () => {
    emitSquadLeave();
    sessionStorage.removeItem('oc_squad_code');
    sessionStorage.removeItem('oc_member_id');
    setSquadSession(null, null);
    setStatusBanner('info', 'Left multiplayer squad. Continuing in Solo mode.');
  };

  const handleCopyCode = () => {
    if (!squad) return;
    navigator.clipboard?.writeText(squad.code);
    setStatusBanner('success', `Room code ${squad.code} copied to clipboard.`);
  };

  const handleSendChat = (e: FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    emitSquadChat(chatText);
    setChatText('');
  };

  const handleLeaderAdvance = async () => {
    const res = await emitSquadStageAdvance();
    if (!res.ok && res.error) {
      setStatusBanner('error', res.error);
    }
  };

  const isLeader = Boolean(squad && myMemberId && squad.leaderId === myMemberId);

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Squad &amp; Multiplayer Mission Operations</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time Socket.IO room synchronization · Server-authoritative mission state &amp; role permissions
          </p>
        </div>

        <div className="text-xs font-mono">
          <span className={socketConnected ? 'text-emerald-400' : 'text-amber-300'}>
            {socketConnected ? '● Real-Time Sync Connected' : '○ Offline / Solo Fallback Active'}
          </span>
        </div>
      </div>

      {!squad ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form onSubmit={handleCreate} className="bg-[#0d1424] border border-slate-800 rounded-lg p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-white">Create New Flight Squad</h2>
            <p className="text-xs text-slate-400">
              Host a collaborative mission room using your current mission design. You assume the Mission Commander role.
            </p>
            <label className="block space-y-1 text-xs">
              <span className="text-slate-300">Your Callsign</span>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm text-white"
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="text-slate-300">Squad Name</span>
              <input
                type="text"
                value={squadName}
                onChange={(e) => setSquadName(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm text-white"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !socketConnected}
              className="w-full py-2.5 rounded bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition-colors"
            >
              Create Squad &amp; Generate Room Code
            </button>
          </form>

          <form onSubmit={handleJoin} className="bg-[#0d1424] border border-slate-800 rounded-lg p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-white">Join Existing Squad</h2>
            <p className="text-xs text-slate-400">
              Enter a teammate’s room code (e.g. ORB-7K2M) to join their engineering &amp; flight control team.
            </p>
            <label className="block space-y-1 text-xs">
              <span className="text-slate-300">Your Callsign</span>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm text-white"
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="text-slate-300">Squad Room Code</span>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ORB-XXXX"
                className="w-full px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-sm font-mono uppercase text-white"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !socketConnected}
              className="w-full py-2.5 rounded bg-slate-900 border border-slate-600 hover:border-cyan-400 disabled:opacity-50 text-white font-semibold text-xs transition-colors"
            >
              Join Squad Room
            </button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Squad Roster & Role Assignment */}
          <div className="lg:col-span-7 bg-[#0d1424] border border-slate-800 rounded-lg p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs text-slate-400">Active Synchronized Squad</div>
                <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" aria-hidden="true" />
                  {squad.name}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded bg-[#070b14] border border-cyan-500/40 text-cyan-300 font-mono text-xs inline-flex items-center gap-1.5"
                >
                  <span>{squad.code}</span>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleLeave}
                  className="px-3 py-1.5 rounded bg-rose-950/60 border border-rose-800 text-rose-200 text-xs inline-flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  Leave
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {squad.members.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded bg-[#070b14] border border-slate-800 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono ${m.online ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {m.online ? '● Online' : '○ Offline'}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-white flex items-center gap-1.5">
                        <span>{m.name}</span>
                        {m.id === myMemberId && <span className="text-xs text-cyan-400">(You)</span>}
                        {m.isLeader && <Shield className="w-3.5 h-3.5 text-amber-400" aria-label="Squad Leader" />}
                      </div>
                      <div className="text-xs text-slate-400">{m.role}</div>
                    </div>
                  </div>

                  {(isLeader || m.id === myMemberId) && (
                    <select
                      aria-label={`Assign role for ${m.name}`}
                      value={m.role}
                      disabled={m.isLeader && !isLeader}
                      onChange={(e) => emitSquadRoleAssign(m.id, e.target.value as SquadRole)}
                      className="px-2.5 py-1.5 rounded bg-[#0d1424] border border-slate-700 text-xs text-slate-200"
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r} value={r} disabled={r === 'Mission Commander' && !m.isLeader}>
                          {r}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
              <div className="p-2.5 rounded bg-[#070b14] border border-slate-800">
                <div className="text-[9px] text-slate-400">SHARED OBJECTIVES</div>
                <div className="text-cyan-300 font-bold">{squad.sharedCompletedObjectives?.length ?? 0}</div>
              </div>
              <div className="p-2.5 rounded bg-[#070b14] border border-slate-800">
                <div className="text-[9px] text-slate-400">SHARED DISCOVERIES</div>
                <div className="text-emerald-300 font-bold">{squad.sharedDiscoveries?.length ?? 0}</div>
              </div>
              <div className="p-2.5 rounded bg-[#070b14] border border-slate-800">
                <div className="text-[9px] text-slate-400">SQUAD BASE MODULES</div>
                <div className="text-amber-300 font-bold">{squad.sharedBaseModules?.length ?? 0}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-400">
                Synchronized Mission: <strong className="text-white">{squad.mission.name}</strong> ({squad.mission.simulation.currentStage})
              </span>
              {isLeader && (
                <button
                  type="button"
                  onClick={handleLeaderAdvance}
                  className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs"
                >
                  Authorize Stage Advance
                </button>
              )}
            </div>
          </div>

          {/* Squad Flight Loop Chat */}
          <div className="lg:col-span-5 bg-[#0d1424] border border-slate-800 rounded-lg p-5 flex flex-col h-[460px]">
            <h3 className="font-display text-base font-semibold text-white pb-3 border-b border-slate-800">
              Flight Loop Comms
            </h3>
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
              {squad.chat.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2.5 rounded text-xs ${
                    msg.isSystem
                      ? 'bg-[#070b14] border border-slate-800/70 text-cyan-300'
                      : 'bg-[#10182b] border border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>
                      {msg.senderName} · {msg.senderRole}
                    </span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div>{msg.text}</div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendChat} className="pt-3 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Send flight loop update..."
                className="flex-1 px-3 py-2 rounded bg-[#070b14] border border-slate-700 text-xs text-white"
              />
              <button
                type="submit"
                aria-label="Send message"
                className="px-3.5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
