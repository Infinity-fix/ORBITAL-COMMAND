import type { Server, Socket } from 'socket.io';
import { createDefaultMarsMission } from '../src/engine/catalog';
import { applyDecisionToSimulation, createStageEvent, getNextStage, validateStageReadiness } from '../src/engine/missionSimulation';
import { validateAndCreateBaseModule } from '../src/gameplay/PlanetaryBaseSystem';
import type {
  BaseModuleType,
  EnvironmentId,
  MissionDesign,
  PlanetaryBaseModule,
  ScienceRecord,
  SimulationDecisionOption,
  SquadChatMessage,
  SquadMember,
  SquadRole,
  SquadState,
} from '../src/engine/types';
import { getPersistedSquad, savePersistedSquad } from './persistence';

const AVAILABLE_ROLES: SquadRole[] = [
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

const activeSquads = new Map<string, SquadState>();
const socketMembership = new Map<string, { code: string; memberId: string }>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ORB-${suffix}`;
}

function getOrLoadSquad(code: string): SquadState | null {
  const key = code.trim().toUpperCase();
  if (activeSquads.has(key)) return activeSquads.get(key)!;
  const persisted = getPersistedSquad(key);
  if (persisted) {
    // Mark members offline until they reconnect
    const hydrated: SquadState = {
      ...persisted,
      sharedCompletedObjectives: persisted.sharedCompletedObjectives ?? [],
      sharedDiscoveries: persisted.sharedDiscoveries ?? [],
      sharedBaseModules: persisted.sharedBaseModules ?? [],
      members: persisted.members.map((m) => ({ ...m, online: false })),
    };
    activeSquads.set(key, hydrated);
    return hydrated;
  }
  return null;
}

function appendSystemChat(squad: SquadState, text: string): SquadChatMessage {
  const msg: SquadChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    senderName: 'Flight Loop',
    senderRole: 'Mission Commander',
    text,
    timestamp: new Date().toISOString(),
    isSystem: true,
  };
  squad.chat = [...squad.chat.slice(-49), msg];
  return msg;
}

export function registerMultiplayerHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    socket.on(
      'squad:create',
      (
        payload: { squadName: string; playerName: string; mission?: MissionDesign },
        ack?: (res: { ok: boolean; squad?: SquadState; memberId?: string; error?: string }) => void
      ) => {
        const playerName = (payload?.playerName || 'Flight Director').trim().slice(0, 32);
        const squadName = (payload?.squadName || 'Ares Operations Squad').trim().slice(0, 48);
        let code = generateRoomCode();
        while (activeSquads.has(code)) code = generateRoomCode();

        const memberId = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const leader: SquadMember = {
          id: memberId,
          name: playerName,
          role: 'Mission Commander',
          isLeader: true,
          online: true,
          joinedAt: new Date().toISOString(),
        };

        const mission = payload?.mission ? structuredClone(payload.mission) : createDefaultMarsMission();
        const squad: SquadState = {
          code,
          name: squadName,
          leaderId: memberId,
          members: [leader],
          mission,
          sharedCompletedObjectives: [],
          sharedDiscoveries: [],
          sharedBaseModules: [],
          chat: [
            {
              id: `msg-${Date.now()}`,
              senderName: 'Flight Loop',
              senderRole: 'Mission Commander',
              text: `${playerName} initialized squad ${code} as Mission Commander.`,
              timestamp: new Date().toISOString(),
              isSystem: true,
            },
          ],
          updatedAt: new Date().toISOString(),
        };

        activeSquads.set(code, squad);
        savePersistedSquad(squad);
        socketMembership.set(socket.id, { code, memberId });
        socket.join(code);

        ack?.({ ok: true, squad, memberId });
        io.to(code).emit('squad:state', squad);
      }
    );

    socket.on(
      'squad:join',
      (
        payload: { code: string; playerName: string; memberId?: string },
        ack?: (res: { ok: boolean; squad?: SquadState; memberId?: string; error?: string }) => void
      ) => {
        const code = (payload?.code || '').trim().toUpperCase();
        const squad = getOrLoadSquad(code);
        if (!squad) {
          ack?.({ ok: false, error: `Squad room "${code}" not found.` });
          return;
        }

        const playerName = (payload?.playerName || 'Specialist').trim().slice(0, 32);
        let member = payload.memberId ? squad.members.find((m) => m.id === payload.memberId) : undefined;
        let memberId = member?.id;

        if (member) {
          member.online = true;
          member.name = playerName || member.name;
          appendSystemChat(squad, `${member.name} reconnected to flight loop.`);
        } else {
          memberId = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const usedRoles = new Set(squad.members.map((m) => m.role));
          const assignedRole =
            AVAILABLE_ROLES.find((r) => !usedRoles.has(r)) ??
            AVAILABLE_ROLES[squad.members.length % AVAILABLE_ROLES.length];

          member = {
            id: memberId,
            name: playerName,
            role: assignedRole,
            isLeader: false,
            online: true,
            joinedAt: new Date().toISOString(),
          };
          squad.members.push(member);
          appendSystemChat(squad, `${playerName} joined as ${assignedRole}.`);
        }

        squad.updatedAt = new Date().toISOString();
        savePersistedSquad(squad);
        socketMembership.set(socket.id, { code, memberId: memberId! });
        socket.join(code);

        ack?.({ ok: true, squad, memberId });
        io.to(code).emit('squad:state', squad);
      }
    );

    socket.on('squad:role:assign', (payload: { targetMemberId: string; role: SquadRole }) => {
      const link = socketMembership.get(socket.id);
      if (!link) return;
      const squad = getOrLoadSquad(link.code);
      if (!squad) return;

      const requester = squad.members.find((m) => m.id === link.memberId);
      const target = squad.members.find((m) => m.id === payload.targetMemberId);
      if (!requester || !target) return;

      // Only leader can reassign others; members can adjust own non-commander role
      if (requester.id !== squad.leaderId && target.id !== requester.id) return;
      if (payload.role === 'Mission Commander' && requester.id !== squad.leaderId) return;

      target.role = payload.role;
      appendSystemChat(squad, `${target.name} assigned to ${payload.role}.`);
      squad.updatedAt = new Date().toISOString();
      savePersistedSquad(squad);
      io.to(link.code).emit('squad:state', squad);
    });

    socket.on('squad:mission:update', (payload: { mission: MissionDesign; summary?: string }) => {
      const link = socketMembership.get(socket.id);
      if (!link || !payload?.mission) return;
      const squad = getOrLoadSquad(link.code);
      if (!squad) return;

      const member = squad.members.find((m) => m.id === link.memberId);
      if (!member) return;

      // Authoritative merge on server
      squad.mission = {
        ...payload.mission,
        updatedAt: new Date().toISOString(),
      };
      if (payload.summary) {
        appendSystemChat(squad, `${member.name} (${member.role}): ${payload.summary}`);
      }
      squad.updatedAt = new Date().toISOString();
      savePersistedSquad(squad);
      io.to(link.code).emit('squad:state', squad);
    });

    socket.on(
      'squad:stage:advance',
      (ack?: (res: { ok: boolean; error?: string }) => void) => {
        const link = socketMembership.get(socket.id);
        if (!link) {
          ack?.({ ok: false, error: 'Not connected to a squad.' });
          return;
        }
        const squad = getOrLoadSquad(link.code);
        if (!squad) return;

        if (squad.leaderId !== link.memberId) {
          ack?.({ ok: false, error: 'Only the Squad Leader (Mission Commander) can advance mission stages.' });
          return;
        }

        const nextStage = getNextStage(squad.mission.simulation.currentStage);
        if (!nextStage) {
          ack?.({ ok: false, error: 'Mission is already at End of Life.' });
          return;
        }

        const check = validateStageReadiness(squad.mission, nextStage);
        if (!check.ok) {
          ack?.({ ok: false, error: check.reason });
          return;
        }

        const nextEvent = createStageEvent(squad.mission, nextStage);
        squad.mission.simulation = {
          ...squad.mission.simulation,
          currentStage: nextStage,
          stageProgressPct: nextEvent ? 35 : 100,
          activeEvent: nextEvent,
          logs: [
            ...squad.mission.simulation.logs,
            {
              id: `log-${Date.now()}`,
              timestamp: new Date().toISOString(),
              stage: nextStage,
              title: `Entered ${nextStage}`,
              detail: `Commander authorized transition to ${nextStage}.`,
              severity: 'nominal',
            },
          ],
        };
        appendSystemChat(squad, `Mission advanced to ${nextStage}.`);
        squad.updatedAt = new Date().toISOString();
        savePersistedSquad(squad);
        io.to(link.code).emit('squad:state', squad);
        ack?.({ ok: true });
      }
    );

    socket.on('squad:sim:decision', (payload: { option: SimulationDecisionOption }) => {
      const link = socketMembership.get(socket.id);
      if (!link || !payload?.option) return;
      const squad = getOrLoadSquad(link.code);
      if (!squad) return;

      const member = squad.members.find((m) => m.id === link.memberId);
      if (!member) return;

      squad.mission.simulation = applyDecisionToSimulation(squad.mission, payload.option);
      appendSystemChat(squad, `${member.name} executed decision: ${payload.option.label}`);
      squad.updatedAt = new Date().toISOString();
      savePersistedSquad(squad);
      io.to(link.code).emit('squad:state', squad);
    });

    socket.on('squad:chat:send', (payload: { text: string }) => {
      const link = socketMembership.get(socket.id);
      if (!link) return;
      const squad = getOrLoadSquad(link.code);
      if (!squad) return;

      const member = squad.members.find((m) => m.id === link.memberId);
      const text = (payload?.text || '').trim().slice(0, 280);
      if (!member || !text) return;

      const msg: SquadChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        senderName: member.name,
        senderRole: member.role,
        text,
        timestamp: new Date().toISOString(),
      };
      squad.chat = [...squad.chat.slice(-49), msg];
      squad.updatedAt = new Date().toISOString();
      savePersistedSquad(squad);
      io.to(link.code).emit('squad:state', squad);
    });

    socket.on('squad:field:objective', (payload: { objectiveId: string; title?: string }) => {
      const link = socketMembership.get(socket.id);
      if (!link || !payload?.objectiveId) return;
      const squad = getOrLoadSquad(link.code);
      if (!squad) return;
      const member = squad.members.find((m) => m.id === link.memberId);
      if (!member) return;

      const existing = squad.sharedCompletedObjectives ?? [];
      if (!existing.includes(payload.objectiveId)) {
        squad.sharedCompletedObjectives = [...existing, payload.objectiveId];
        appendSystemChat(
          squad,
          `${member.name} (${member.role}) completed field objective: ${payload.title ?? payload.objectiveId}.`
        );
        squad.updatedAt = new Date().toISOString();
        savePersistedSquad(squad);
        io.to(link.code).emit('squad:state', squad);
      }
    });

    socket.on('squad:discovery:add', (payload: { record: ScienceRecord }) => {
      const link = socketMembership.get(socket.id);
      if (!link || !payload?.record?.id) return;
      const squad = getOrLoadSquad(link.code);
      if (!squad) return;
      const member = squad.members.find((m) => m.id === link.memberId);
      if (!member) return;

      const list = squad.sharedDiscoveries ?? [];
      if (!list.some((d) => d.id === payload.record.id)) {
        squad.sharedDiscoveries = [payload.record, ...list].slice(0, 120);
        squad.mission.simulation.scienceCollectedPct = Math.min(
          100,
          squad.mission.simulation.scienceCollectedPct + 6
        );
        appendSystemChat(
          squad,
          `${member.name} logged discovery ${payload.record.sampleId}: ${payload.record.title}.`
        );
        squad.updatedAt = new Date().toISOString();
        savePersistedSquad(squad);
        io.to(link.code).emit('squad:state', squad);
      }
    });

    socket.on(
      'squad:base:build',
      (
        payload: { type: BaseModuleType; environment: 'moon' | 'mars'; x: number; z: number },
        ack?: (res: { ok: boolean; module?: PlanetaryBaseModule; error?: string }) => void
      ) => {
        const link = socketMembership.get(socket.id);
        if (!link) {
          ack?.({ ok: false, error: 'Not connected to a squad.' });
          return;
        }
        const squad = getOrLoadSquad(link.code);
        if (!squad) {
          ack?.({ ok: false, error: 'Squad room unavailable.' });
          return;
        }
        const member = squad.members.find((m) => m.id === link.memberId);
        if (!member) return;

        const existingModules = squad.sharedBaseModules ?? [];
        const res = validateAndCreateBaseModule({
          mission: squad.mission,
          existingModules,
          type: payload.type,
          environment: payload.environment,
          x: payload.x,
          z: payload.z,
        });

        if (!res.ok || !res.module) {
          ack?.({ ok: false, error: res.error ?? 'Module placement rejected.' });
          return;
        }

        squad.sharedBaseModules = [...existingModules, res.module];
        appendSystemChat(
          squad,
          `${member.name} (${member.role}) constructed ${res.module.name} on ${payload.environment.toUpperCase()}.`
        );
        squad.updatedAt = new Date().toISOString();
        savePersistedSquad(squad);
        io.to(link.code).emit('squad:state', squad);
        ack?.({ ok: true, module: res.module });
      }
    );

    socket.on(
      'squad:rescue:trigger',
      (payload: { environment: EnvironmentId; x: number; z: number; reason: string }) => {
        const link = socketMembership.get(socket.id);
        if (!link) return;
        const squad = getOrLoadSquad(link.code);
        if (!squad) return;
        const member = squad.members.find((m) => m.id === link.memberId);
        if (!member) return;

        appendSystemChat(
          squad,
          `EMERGENCY RESCUE BEACON from ${member.name} (${payload.environment.toUpperCase()} at ${payload.x.toFixed(0)}m, ${payload.z.toFixed(0)}m): ${payload.reason}`
        );
        squad.updatedAt = new Date().toISOString();
        savePersistedSquad(squad);
        io.to(link.code).emit('squad:state', squad);
        socket.to(link.code).emit('squad:rescue:alert', {
          memberId: member.id,
          memberName: member.name,
          environment: payload.environment,
          x: payload.x,
          z: payload.z,
          reason: payload.reason,
        });
      }
    );

    // Real-time 3D astronaut character state synchronization across squad room
    socket.on(
      'squad:player:sync',
      (payload: {
        environmentId: string;
        x: number;
        y: number;
        z: number;
        yaw: number;
        animState: string;
        equippedItem: string | null;
        inVehicle: boolean;
        flashlightOn: boolean;
        customization: unknown;
      }) => {
        const link = socketMembership.get(socket.id);
        if (!link) return;
        const squad = getOrLoadSquad(link.code);
        if (!squad) return;
        const member = squad.members.find((m) => m.id === link.memberId);
        if (!member) return;

        socket.to(link.code).emit('squad:player:state', {
          memberId: member.id,
          name: member.name,
          role: member.role,
          environmentId: payload.environmentId,
          x: payload.x,
          y: payload.y,
          z: payload.z,
          yaw: payload.yaw,
          animState: payload.animState,
          equippedItem: payload.equippedItem,
          inVehicle: Boolean(payload.inVehicle),
          flashlightOn: Boolean(payload.flashlightOn),
          customization: payload.customization,
          updatedAt: Date.now(),
        });
      }
    );

    socket.on('squad:leave', () => {
      handleDisconnectOrLeave(io, socket, true);
    });

    socket.on('disconnect', () => {
      handleDisconnectOrLeave(io, socket, false);
    });
  });
}

function handleDisconnectOrLeave(io: Server, socket: Socket, permanent: boolean): void {
  const link = socketMembership.get(socket.id);
  if (!link) return;
  socketMembership.delete(socket.id);
  io.to(link.code).emit('squad:player:removed', { memberId: link.memberId });

  const squad = activeSquads.get(link.code);
  if (!squad) return;

  if (permanent) {
    const leaving = squad.members.find((m) => m.id === link.memberId);
    squad.members = squad.members.filter((m) => m.id !== link.memberId);
    if (leaving) {
      appendSystemChat(squad, `${leaving.name} left the squad.`);
    }
    if (squad.leaderId === link.memberId && squad.members.length > 0) {
      squad.members[0].isLeader = true;
      squad.members[0].role = 'Mission Commander';
      squad.leaderId = squad.members[0].id;
      appendSystemChat(squad, `${squad.members[0].name} assumed Mission Commander leadership.`);
    }
    socket.leave(link.code);
  } else {
    const member = squad.members.find((m) => m.id === link.memberId);
    if (member) {
      member.online = false;
    }
  }

  squad.updatedAt = new Date().toISOString();
  savePersistedSquad(squad);
  io.to(link.code).emit('squad:state', squad);
}
