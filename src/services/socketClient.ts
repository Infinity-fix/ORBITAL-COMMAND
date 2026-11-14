import { io, type Socket } from 'socket.io-client';
import type {
  BaseModuleType,
  EnvironmentId,
  MissionDesign,
  PlanetaryBaseModule,
  ScienceRecord,
  SimulationDecisionOption,
  SquadRole,
  SquadState,
} from '../engine/types';

let socket: Socket | null = null;

export function getSquadSocket(): Socket {
  if (!socket) {
    socket = io({
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function emitSquadCreate(
  squadName: string,
  playerName: string,
  mission: MissionDesign
): Promise<{ ok: boolean; squad?: SquadState; memberId?: string; error?: string }> {
  return new Promise((resolve) => {
    const s = getSquadSocket();
    s.emit('squad:create', { squadName, playerName, mission }, (res: { ok: boolean; squad?: SquadState; memberId?: string; error?: string }) => {
      resolve(res);
    });
  });
}

export function emitSquadJoin(
  code: string,
  playerName: string,
  memberId?: string
): Promise<{ ok: boolean; squad?: SquadState; memberId?: string; error?: string }> {
  return new Promise((resolve) => {
    const s = getSquadSocket();
    s.emit('squad:join', { code, playerName, memberId }, (res: { ok: boolean; squad?: SquadState; memberId?: string; error?: string }) => {
      resolve(res);
    });
  });
}

export function emitSquadLeave(): void {
  getSquadSocket().emit('squad:leave');
}

export function emitSquadMissionUpdate(mission: MissionDesign, summary?: string): void {
  getSquadSocket().emit('squad:mission:update', { mission, summary });
}

export function emitSquadRoleAssign(targetMemberId: string, role: SquadRole): void {
  getSquadSocket().emit('squad:role:assign', { targetMemberId, role });
}

export function emitSquadStageAdvance(): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    getSquadSocket().emit('squad:stage:advance', (res: { ok: boolean; error?: string }) => {
      resolve(res);
    });
  });
}

export function emitSquadSimDecision(option: SimulationDecisionOption): void {
  getSquadSocket().emit('squad:sim:decision', { option });
}

export function emitSquadChat(text: string): void {
  getSquadSocket().emit('squad:chat:send', { text });
}

export function emitSquadFieldObjective(objectiveId: string, title?: string): void {
  const s = getSquadSocket();
  if (s.connected) {
    s.emit('squad:field:objective', { objectiveId, title });
  }
}

export function emitSquadDiscoveryAdd(record: ScienceRecord): void {
  const s = getSquadSocket();
  if (s.connected) {
    s.emit('squad:discovery:add', { record });
  }
}

export function emitSquadBaseBuild(params: {
  type: BaseModuleType;
  environment: 'moon' | 'mars';
  x: number;
  z: number;
}): Promise<{ ok: boolean; module?: PlanetaryBaseModule; error?: string }> {
  return new Promise((resolve) => {
    const s = getSquadSocket();
    if (!s.connected) {
      resolve({ ok: false, error: 'Not connected to squad server.' });
      return;
    }
    s.emit('squad:base:build', params, (res: { ok: boolean; module?: PlanetaryBaseModule; error?: string }) => {
      resolve(res);
    });
  });
}

export function emitSquadRescueTrigger(params: {
  environment: EnvironmentId;
  x: number;
  z: number;
  reason: string;
}): void {
  const s = getSquadSocket();
  if (s.connected) {
    s.emit('squad:rescue:trigger', params);
  }
}

export function emitSquadPlayer3DSync(payload: {
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
}): void {
  const s = getSquadSocket();
  if (s.connected) {
    s.emit('squad:player:sync', payload);
  }
}

