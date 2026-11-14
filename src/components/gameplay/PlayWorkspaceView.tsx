import { Canvas, useFrame } from '@react-three/fiber';
import { CheckCircle2, RotateCcw, Trophy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type {
  CameraMode,
  CharacterAnimationState,
  CockpitState,
  DynamicEventChoice,
  DynamicEventType,
  DynamicWorldEvent,
  EnvironmentId,
  EquipmentId,
  GameMode,
  PlanetaryBaseModule,
  PlayableMissionId,
  RoverState,
  SurvivalTelemetry,
} from '../../engine/types';
import {
  createInitialGroundedState,
  stepGroundedCharacter,
  type GroundedCharacterState,
} from '../../gameplay/CharacterController';
import { explainSurvivalFailure, type FailureExplanation } from '../../gameplay/DamageSystem';
import {
  createInitialEVAState,
  snapToNearestEVAHandhold,
  stepEVACharacter,
  type EVACharacterState,
} from '../../gameplay/EVAController';
import { executeEquipmentUse, executeRefillTool } from '../../gameplay/EquipmentSystem';
import { computeDesignBonusesForGameplay } from '../../gameplay/GameplayStateManager';
import { ENV_PHYSICS, groundHeightAt } from '../../gameplay/GravitySystem';
import { InputManager } from '../../gameplay/InputManager';
import { findNearestInteractable, type NearestInteractableResult } from '../../gameplay/InteractionSystem';
import { createDefaultInventory } from '../../gameplay/InventorySystem';
import {
  applyDynamicEventChoice,
  evaluateHazardTriggerFromSimulation,
} from '../../gameplay/MissionEventManager';
import {
  applyObjectiveEvent,
  createGameplayObjectiveState,
  PLAYABLE_MISSIONS,
  type GameplayObjectiveState,
} from '../../gameplay/MissionObjectiveManager';
import { evaluateBaseResources } from '../../gameplay/PlanetaryBaseSystem';
import { createInitialRovers, stepRover } from '../../gameplay/RoverController';
import {
  advanceLaunchStep,
  createInitialCockpitState,
  stepCockpitTelemetry,
} from '../../gameplay/SpacecraftController';
import { soundEngine } from '../../gameplay/soundEngine';
import { createInitialSurvivalTelemetry, stepSurvivalTelemetry } from '../../gameplay/SurvivalSystem';
import {
  emitSquadFieldObjective,
  emitSquadPlayer3DSync,
  emitSquadRescueTrigger,
} from '../../services/socketClient';
import { useMissionStore } from '../../store/useMissionStore';
import { AstronautModel } from '../gameplay3d/AstronautModel';
import { MultiplayerCharacterSync } from '../gameplay3d/MultiplayerCharacterSync';
import { PlanetEnvironment } from '../gameplay3d/PlanetEnvironment';
import { RoverMesh3D } from '../gameplay3d/RoverMesh3D';
import { ThirdPersonCamera } from '../gameplay3d/ThirdPersonCamera';
import { detectSoftwareWebGL } from '../three/threeUtils';
import { AICommanderDrawer } from './AICommanderDrawer';
import { BaseBuilderModal } from './BaseBuilderModal';
import { CockpitModal } from './CockpitModal';
import { DynamicEventModal } from './DynamicEventModal';
import { InventoryModal } from './InventoryModal';
import { MissionHUD } from './MissionHUD';
import { MissionModeMenu } from './MissionModeMenu';
import { MobileGamingHUD } from './MobileGamingHUD';
import { NavigationMap } from './NavigationMap';
import { PauseModal } from './PauseModal';

interface SimulationTickProps {
  environment: EnvironmentId;
  cameraMode: CameraMode;
  paused: boolean;
  inRover: boolean;
  equippedId: EquipmentId | null;
  flashlightOn: boolean;
  actionAnimRef: React.RefObject<{ state: CharacterAnimationState | null; untilMs: number }>;
  inputManager: InputManager;
  groundedRef: React.RefObject<GroundedCharacterState>;
  evaRef: React.RefObject<EVACharacterState>;
  roversRef: React.RefObject<Record<'moon' | 'mars', RoverState>>;
  telemetryRef: React.RefObject<SurvivalTelemetry>;
  playerRenderRef: React.RefObject<{
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    animState: CharacterAnimationState;
    strideDistance: number;
  }>;
  cameraOrbitRef: React.RefObject<{ yaw: number; pitch: number; distance: number }>;
  cameraSensitivity: number;
  invertY: boolean;
  powerEfficiencyBonus: number;
  builtBaseModules: PlanetaryBaseModule[];
  activeHazardType: DynamicEventType | null;
  onSyncUI: (snapshot: {
    pos: { x: number; y: number; z: number };
    yaw: number;
    crouching: boolean;
    aiming: boolean;
    telemetry: SurvivalTelemetry;
    rovers: Record<'moon' | 'mars', RoverState>;
    gamepadConnected: boolean;
  }) => void;
  onMoveMilestoneCheck: (distFromSpawn: number) => void;
  onBroadcastSquad: () => void;
}

function GameplaySimulationLoop({
  environment,
  cameraMode,
  paused,
  inRover,
  flashlightOn,
  actionAnimRef,
  inputManager,
  groundedRef,
  evaRef,
  roversRef,
  telemetryRef,
  playerRenderRef,
  cameraOrbitRef,
  cameraSensitivity,
  invertY,
  powerEfficiencyBonus,
  builtBaseModules,
  activeHazardType,
  onSyncUI,
  onMoveMilestoneCheck,
  onBroadcastSquad,
}: SimulationTickProps) {
  const lastUiSyncRef = useRef(0);
  const lastNetSyncRef = useRef(0);
  const footstepAccRef = useRef(0);

  useFrame((state, dt) => {
    if (paused) return;
    const clampedDt = Math.min(0.05, Math.max(0.001, dt));
    const frameInput = inputManager.sampleFrame(clampedDt);

    // Update camera orbit
    const orb = cameraOrbitRef.current;
    orb.yaw -= frameInput.lookDeltaX * 0.0045 * cameraSensitivity;
    const ySign = invertY ? -1 : 1;
    orb.pitch = Math.max(
      -0.85,
      Math.min(0.85, orb.pitch + frameInput.lookDeltaY * 0.0038 * cameraSensitivity * ySign)
    );
    if (frameInput.wheelDelta !== 0) {
      orb.distance = Math.max(2.6, Math.min(10.0, orb.distance + frameInput.wheelDelta));
    }

    const nowMs = Date.now();
    const overrideAnim =
      actionAnimRef.current.untilMs > nowMs ? actionAnimRef.current.state : null;

    let px = 0;
    let py = 0;
    let pz = 0;
    let pyaw = 0;
    let ppitch = 0;
    let anim: CharacterAnimationState = 'idle';
    let strideDist = 0;
    let crouching = false;
    let evaThrusting = false;
    let tetherDist = 0;

    if (inRover && (environment === 'moon' || environment === 'mars')) {
      const nextRover = stepRover(
        roversRef.current[environment],
        {
          throttle: frameInput.moveForward,
          steer: frameInput.moveRight,
          brake: frameInput.jump || frameInput.brake,
        },
        powerEfficiencyBonus,
        clampedDt
      );
      roversRef.current[environment] = nextRover;
      px = nextRover.x;
      py = nextRover.y;
      pz = nextRover.z;
      pyaw = nextRover.yaw;
      anim = 'idle';
    } else if (ENV_PHYSICS[environment].isZeroG) {
      const moveUp = (frameInput.jump ? 1 : 0) - (frameInput.crouch ? 1 : 0);
      const nextEva = stepEVACharacter(
        evaRef.current,
        {
          moveForward: frameInput.moveForward,
          moveRight: frameInput.moveRight,
          moveUp,
          cameraYaw: orb.yaw,
          cameraPitch: orb.pitch,
          boost: frameInput.sprint,
          brake: frameInput.brake,
          actionAnimOverride: overrideAnim,
        },
        clampedDt
      );
      evaRef.current = nextEva;
      px = nextEva.x;
      py = nextEva.y;
      pz = nextEva.z;
      pyaw = nextEva.yaw;
      ppitch = nextEva.pitch;
      anim = nextEva.animState;
      evaThrusting = nextEva.thrusting;
      tetherDist = nextEva.tetherDistanceM;
      onMoveMilestoneCheck(Math.hypot(px, pz - 6.2));
    } else {
      const prevGrounded = groundedRef.current;
      const nextG = stepGroundedCharacter(
        prevGrounded,
        {
          moveForward: frameInput.moveForward,
          moveRight: frameInput.moveRight,
          cameraYaw: orb.yaw,
          sprint: frameInput.sprint,
          jump: frameInput.jump,
          crouch: frameInput.crouch,
          actionAnimOverride: overrideAnim,
        },
        environment,
        clampedDt
      );
      if (prevGrounded.grounded && !nextG.grounded && nextG.vy > 1) {
        soundEngine.playJump();
        if (environment === 'moon' || environment === 'mars') {
          onMoveMilestoneCheck(10);
        }
      }
      if (nextG.grounded && nextG.strideDistance - footstepAccRef.current > 1.75) {
        footstepAccRef.current = nextG.strideDistance;
        soundEngine.playFootstep(environment === 'moon' || environment === 'mars');
      }
      groundedRef.current = nextG;
      px = nextG.x;
      py = nextG.y;
      pz = nextG.z;
      pyaw = nextG.yaw;
      anim = nextG.animState;
      strideDist = nextG.strideDistance;
      crouching = nextG.crouching;

      if (environment === 'moon' || environment === 'mars') {
        onMoveMilestoneCheck(Math.hypot(px - 4.5, pz - 6.0));
      }
    }

    // Update zero-re-render mutable transform ref for astronaut & camera
    const pr = playerRenderRef.current;
    pr.x = px;
    pr.y = py;
    pr.z = pz;
    pr.yaw = pyaw;
    pr.pitch = ppitch;
    pr.animState = anim;
    pr.strideDistance = strideDist;

    // Step survival system with persistent base Safe Zones & active hazards
    telemetryRef.current = stepSurvivalTelemetry(
      telemetryRef.current,
      {
        environment,
        x: px,
        z: pz,
        sprinting: frameInput.sprint,
        flashlightOn,
        evaThrusting,
        tetherDistanceM: tetherDist,
        inRover,
        powerEfficiencyBonus,
        builtBaseModules,
        activeHazardType,
      },
      clampedDt
    );

    const t = state.clock.elapsedTime;
    if (t - lastUiSyncRef.current >= 0.1) {
      lastUiSyncRef.current = t;
      onSyncUI({
        pos: { x: px, y: py, z: pz },
        yaw: pyaw,
        crouching,
        aiming: frameInput.aiming,
        telemetry: telemetryRef.current,
        rovers: { ...roversRef.current },
        gamepadConnected: frameInput.gamepadConnected,
      });
    }

    if (t - lastNetSyncRef.current >= 0.085) {
      lastNetSyncRef.current = t;
      onBroadcastSquad();
    }

    void cameraMode;
  });

  return null;
}

export function PlayWorkspaceView() {
  const mission = useMissionStore((s) => s.mission);
  const customization = useMissionStore((s) => s.astronautCustomization);
  const gameplaySettings = useMissionStore((s) => s.gameplaySettings);
  const updateGameplaySettings = useMissionStore((s) => s.updateGameplaySettings);
  const preferences = useMissionStore((s) => s.preferences);
  const updatePreferences = useMissionStore((s) => s.updatePreferences);
  const scienceRecords = useMissionStore((s) => s.scienceRecords);
  const addScienceRecord = useMissionStore((s) => s.addScienceRecord);
  const markAllScienceTransmitted = useMissionStore((s) => s.markAllScienceTransmitted);
  const appendMissionLog = useMissionStore((s) => s.appendMissionLog);
  const recordPlayableMissionOutcome = useMissionStore((s) => s.recordPlayableMissionOutcome);
  const baseModules = useMissionStore((s) => s.baseModules);
  const buildBaseModule = useMissionStore((s) => s.buildBaseModule);
  const persistedRovers = useMissionStore((s) => s.rovers);
  const updatePersistedRover = useMissionStore((s) => s.updatePersistedRover);
  const syncFieldMissionToEngineering = useMissionStore((s) => s.syncFieldMissionToEngineering);
  const remotePlayersMap = useMissionStore((s) => s.remotePlayers);
  const squad = useMissionStore((s) => s.squad);
  const setActiveView = useMissionStore((s) => s.setActiveView);

  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);
  const bonuses = useMemo(() => computeDesignBonusesForGameplay(mission), [mission]);

  // Phase: 'lobby' | 'loading' | 'playing' | 'summary'
  const [phase, setPhase] = useState<'lobby' | 'loading' | 'playing' | 'summary'>('lobby');
  const [activeMode, setActiveMode] = useState<GameMode>('career');
  const [environment, setEnvironment] = useState<EnvironmentId>('station');
  const [cameraMode, setCameraMode] = useState<CameraMode>('third-person');
  const [paused, setPaused] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showCockpit, setShowCockpit] = useState(false);
  const [showBaseBuilder, setShowBaseBuilder] = useState(false);
  const [showAICommander, setShowAICommander] = useState(false);
  const [showObjectivesPanel, setShowObjectivesPanel] = useState(true);
  const [aimScan, setAimScan] = useState(false);

  const [inventory, setInventory] = useState(() => createDefaultInventory());
  const [equippedId, setEquippedId] = useState<EquipmentId | null>('spectrometer');
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [inRover, setInRover] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [gamepadConnected, setGamepadConnected] = useState(false);

  const [cockpitState, setCockpitState] = useState<CockpitState>(() =>
    createInitialCockpitState(mission)
  );
  const [activeDynamicEvent, setActiveDynamicEvent] = useState<DynamicWorldEvent | null>(null);
  const [failureExplanation, setFailureExplanation] = useState<FailureExplanation | null>(null);

  const [objectiveState, setObjectiveState] = useState<GameplayObjectiveState>(() =>
    createGameplayObjectiveState('station-prep', 'career')
  );
  const [telemetryUI, setTelemetryUI] = useState<SurvivalTelemetry>(() =>
    createInitialSurvivalTelemetry('station')
  );
  const [playerPosUI, setPlayerPosUI] = useState({ x: 0, y: 0, z: 5.5 });
  const [playerYawUI, setPlayerYawUI] = useState(0);
  const [crouchingUI, setCrouchingUI] = useState(false);
  const [roversUI, setRoversUI] = useState<Record<'moon' | 'mars', RoverState>>(() =>
    persistedRovers ? { moon: { ...persistedRovers.moon }, mars: { ...persistedRovers.mars } } : createInitialRovers()
  );

  // High-frequency mutable simulation refs
  const groundedRef = useRef<GroundedCharacterState>(createInitialGroundedState('station'));
  const evaRef = useRef<EVACharacterState>(createInitialEVAState());
  const roversRef = useRef<Record<'moon' | 'mars', RoverState>>(
    persistedRovers ? { moon: { ...persistedRovers.moon }, mars: { ...persistedRovers.mars } } : createInitialRovers()
  );
  const telemetryRef = useRef<SurvivalTelemetry>(createInitialSurvivalTelemetry('station'));
  const cockpitRef = useRef<CockpitState>(cockpitState);
  const playerRenderRef = useRef({
    x: 0,
    y: 0,
    z: 5.5,
    yaw: 0,
    pitch: 0,
    animState: 'idle' as CharacterAnimationState,
    strideDistance: 0,
  });
  const cameraOrbitRef = useRef({ yaw: 0, pitch: 0.24, distance: gameplaySettings.cameraDistance });
  const actionAnimRef = useRef<{ state: CharacterAnimationState | null; untilMs: number }>({
    state: null,
    untilMs: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const missionScienceSessionCountRef = useRef(0);
  const elapsedSimSecRef = useRef(0);
  const lastEventSecRef = useRef(0);
  const lastRoverPersistSecRef = useRef(0);
  const failureHandledRef = useRef(false);

  useEffect(() => {
    cockpitRef.current = cockpitState;
  }, [cockpitState]);

  const showToast = useCallback((msg: string) => {
    setActionToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setActionToast(null), 3200);
  }, []);

  useEffect(() => {
    soundEngine.setEnabled(preferences.soundEnabled);
  }, [preferences.soundEnabled]);

  useEffect(() => {
    cameraOrbitRef.current.distance = gameplaySettings.cameraDistance;
  }, [gameplaySettings.cameraDistance]);

  const activeRover =
    environment === 'moon' || environment === 'mars' ? roversUI[environment] : null;

  const nearestInteractable: NearestInteractableResult | null = useMemo(() => {
    if (inRover) return null;
    return findNearestInteractable(
      environment,
      playerPosUI,
      equippedId,
      inventory.map((i) => i.id),
      activeRover
    );
  }, [inRover, environment, playerPosUI, equippedId, inventory, activeRover]);

  const dispatchObjective = useCallback(
    (event: Parameters<typeof applyObjectiveEvent>[1]) => {
      setObjectiveState((prev) => {
        const res = applyObjectiveEvent(prev, event);
        if (res.newlyCompleted.length > 0) {
          soundEngine.playObjectiveComplete();
          const step = res.newlyCompleted[0];
          showToast(`Objective Complete: ${step.title}`);
          emitSquadFieldObjective(step.id, step.title);
          appendMissionLog({
            category: 'milestone',
            severity: 'nominal',
            title: `Field Objective: ${step.title}`,
            detail: step.description,
            metricSnapshot: `${res.next.objectives.filter((o) => o.completed).length}/${res.next.objectives.length}`,
          });
        }
        if (res.next.missionCompleted && !prev.missionCompleted) {
          const def = PLAYABLE_MISSIONS[res.next.missionId];
          recordPlayableMissionOutcome({
            missionId: res.next.missionId,
            title: def.title,
            score: res.next.score,
            passed: true,
            scienceCount: missionScienceSessionCountRef.current,
          });
          setPhase('summary');
        }
        return res.next;
      });
    },
    [appendMissionLog, recordPlayableMissionOutcome, showToast]
  );

  const switchEnvironment = useCallback(
    (nextEnv: EnvironmentId) => {
      soundEngine.playAirlock();
      setInRover(false);
      roversRef.current.moon.occupiedByLocal = false;
      roversRef.current.mars.occupiedByLocal = false;

      if (nextEnv === 'orbital-eva') {
        evaRef.current = createInitialEVAState();
        playerRenderRef.current = {
          x: evaRef.current.x,
          y: evaRef.current.y,
          z: evaRef.current.z,
          yaw: evaRef.current.yaw,
          pitch: 0,
          animState: 'idle',
          strideDistance: 0,
        };
      } else {
        groundedRef.current = createInitialGroundedState(nextEnv);
        playerRenderRef.current = {
          x: groundedRef.current.x,
          y: groundedRef.current.y,
          z: groundedRef.current.z,
          yaw: groundedRef.current.yaw,
          pitch: 0,
          animState: 'idle',
          strideDistance: 0,
        };
      }
      telemetryRef.current = createInitialSurvivalTelemetry(nextEnv);
      setTelemetryUI(telemetryRef.current);
      setEnvironment(nextEnv);
      setCameraMode('third-person');
      showToast(`Entered ${nextEnv.toUpperCase()} (${ENV_PHYSICS[nextEnv].label})`);
    },
    [showToast]
  );

  const launchMission = useCallback(
    (params: { mode: GameMode; missionId: PlayableMissionId; startEnv: EnvironmentId }) => {
      setActiveMode(params.mode);
      missionScienceSessionCountRef.current = 0;
      elapsedSimSecRef.current = 0;
      lastEventSecRef.current = 0;
      failureHandledRef.current = false;
      setFailureExplanation(null);
      setActiveDynamicEvent(null);
      setCockpitState(createInitialCockpitState(mission));
      setInventory(createDefaultInventory());
      setEquippedId(params.missionId === 'eva-repair' ? 'repair-tool' : 'spectrometer');
      setFlashlightOn(params.startEnv === 'moon');
      setPaused(false);
      setShowMap(false);
      setShowInventory(false);
      setShowCockpit(false);
      setShowBaseBuilder(false);
      setShowAICommander(false);
      setObjectiveState(createGameplayObjectiveState(params.missionId, params.mode));
      switchEnvironment(params.startEnv);

      setPhase('loading');
      window.setTimeout(() => {
        setPhase('playing');
      }, 320);

      appendMissionLog({
        category: 'event',
        severity: 'nominal',
        title: `3D Field Ops Deployed: ${PLAYABLE_MISSIONS[params.missionId].title}`,
        detail: `Mode: ${params.mode} · Environment: ${params.startEnv}.`,
        metricSnapshot: params.startEnv.toUpperCase(),
      });
    },
    [appendMissionLog, mission, switchEnvironment]
  );

  const handleInteract = useCallback(() => {
    if (inRover && (environment === 'moon' || environment === 'mars')) {
      roversRef.current[environment].occupiedByLocal = false;
      roversRef.current[environment].speedMs = 0;
      const r = roversRef.current[environment];
      const exitX = r.x - Math.cos(r.yaw) * 2.2;
      const exitZ = r.z + Math.sin(r.yaw) * 2.2;
      groundedRef.current = {
        ...groundedRef.current,
        x: exitX,
        y: groundHeightAt(environment, exitX, exitZ),
        z: exitZ,
        vx: 0,
        vy: 0,
        vz: 0,
      };
      setInRover(false);
      setCameraMode('third-person');
      soundEngine.playInteract();
      showToast(`Exited ${r.name}`);
      return;
    }

    if (!nearestInteractable) {
      if (environment === 'orbital-eva') {
        const res = snapToNearestEVAHandhold(evaRef.current);
        if (res.handholdLabel) {
          evaRef.current = res.nextState;
          soundEngine.playInteract();
          showToast(`Anchored to ${res.handholdLabel}`);
          return;
        }
      }
      showToast('No interactive object in proximity.');
      return;
    }

    const item = nearestInteractable.item;
    soundEngine.playInteract();

    if (item.kind === 'rover' && (environment === 'moon' || environment === 'mars')) {
      roversRef.current[environment].occupiedByLocal = true;
      setInRover(true);
      setCameraMode('rover');
      showToast(`Boarded ${item.name} — Drive with WASD`);
      dispatchObjective({ type: 'enter-rover', roverId: item.id });
      return;
    }

    if (item.targetEnvironment) {
      dispatchObjective({ type: 'interact', interactableId: item.id, equippedId });
      switchEnvironment(item.targetEnvironment);
      return;
    }

    if (item.id === 'sc-cockpit-nav' || item.id === 'sc-propulsion-panel') {
      setShowCockpit(true);
    }

    // Trigger procedural interaction/repair/console animation
    actionAnimRef.current = {
      state:
        item.kind === 'repair'
          ? 'repair'
          : item.kind === 'sample'
            ? 'collect'
            : item.kind === 'instrument'
              ? 'instrument'
              : 'console',
      untilMs: Date.now() + 900,
    };

    // Safe recharge on power/habitat/lander/airlock
    if (item.kind === 'power' || item.kind === 'airlock' || item.kind === 'storage') {
      telemetryRef.current = {
        ...telemetryRef.current,
        oxygenPct: 100,
        batteryPct: 100,
        co2Pct: 0.04,
        suitIntegrityPct: Math.max(telemetryRef.current.suitIntegrityPct, 90),
        oxygenLeakPerSec: 0,
        rcsFuelPct: 100,
        suitPressureKpa: ENV_PHYSICS[environment].isPressurized ? 101.3 : 30.2,
      };
      setTelemetryUI(telemetryRef.current);
    }

    const baseMult =
      environment === 'moon' || environment === 'mars'
        ? evaluateBaseResources(mission, baseModules, environment).scienceBonusMultiplier
        : 1.0;

    if (item.kind === 'comms') {
      const transmitted = markAllScienceTransmitted();
      if (transmitted > 0) {
        syncFieldMissionToEngineering({
          scienceDeltaPct: Math.min(18, transmitted * 6),
          note: `Transmitted ${transmitted} field discovery record(s) via ${item.name}`,
        });
        showToast(`Transmitted ${transmitted} science record(s) via ${item.name}.`);
      } else {
        showToast(`${item.name}: Flight Loop telemetry nominal.`);
      }
    } else if (item.kind === 'sample' || item.kind === 'instrument') {
      const toolToRecord: EquipmentId =
        item.requiredEquipment ?? equippedId ?? 'spectrometer';
      const exec = executeEquipmentUse({
        equipmentId: toolToRecord,
        inventory,
        telemetry: telemetryRef.current,
        environment,
        position: playerPosUI,
        nearestLocationLabel: item.name,
        activeObjectiveTitle:
          objectiveState.objectives.find((o) => !o.completed)?.title ?? item.name,
        scienceCount: scienceRecords.length,
        scienceBonusMultiplier: baseMult,
        missionRef: mission.name,
        rover: activeRover,
      });
      if (exec.newScienceRecord) {
        addScienceRecord(exec.newScienceRecord);
        missionScienceSessionCountRef.current += 1;
        soundEngine.playEquipmentScan();
        showToast(exec.message);
      } else {
        showToast(`${item.name} checked.`);
      }
    } else {
      showToast(`${item.name}: ${item.actionLabel} complete.`);
    }

    dispatchObjective({ type: 'interact', interactableId: item.id, equippedId });
  }, [
    inRover,
    environment,
    nearestInteractable,
    equippedId,
    inventory,
    playerPosUI,
    objectiveState.objectives,
    scienceRecords.length,
    mission,
    baseModules,
    activeRover,
    addScienceRecord,
    dispatchObjective,
    markAllScienceTransmitted,
    syncFieldMissionToEngineering,
    showToast,
    switchEnvironment,
  ]);

  const handleUseEquipment = useCallback(
    (explicitId?: EquipmentId) => {
      const targetId = explicitId ?? equippedId;
      if (!targetId) {
        showToast('Select equipment from hotbar (1-9) or Inventory [I].');
        return;
      }
      const baseMult =
        environment === 'moon' || environment === 'mars'
          ? evaluateBaseResources(mission, baseModules, environment).scienceBonusMultiplier
          : 1.0;

      const res = executeEquipmentUse({
        equipmentId: targetId,
        inventory,
        telemetry: telemetryRef.current,
        environment,
        position: playerPosUI,
        nearestLocationLabel: nearestInteractable?.item.name ?? `${environment.toUpperCase()} Sector`,
        activeObjectiveTitle:
          objectiveState.objectives.find((o) => !o.completed)?.title ?? 'Field Survey',
        scienceCount: scienceRecords.length,
        scienceBonusMultiplier: baseMult,
        missionRef: mission.name,
        rover: activeRover,
      });

      if (!res.used) {
        soundEngine.playWarning();
        showToast(res.message);
        return;
      }

      actionAnimRef.current = { state: res.animState, untilMs: Date.now() + 850 };
      setInventory(res.nextInventory);
      telemetryRef.current = res.nextTelemetry;
      setTelemetryUI(res.nextTelemetry);

      if (res.nextRover && (environment === 'moon' || environment === 'mars')) {
        roversRef.current[environment] = res.nextRover;
        setRoversUI({ ...roversRef.current });
        updatePersistedRover(environment, res.nextRover);
      }

      if (res.toggleFlashlight) {
        setFlashlightOn((f) => !f);
      }
      if (res.transmitScience) {
        const tx = markAllScienceTransmitted();
        if (tx > 0) {
          syncFieldMissionToEngineering({
            scienceDeltaPct: Math.min(18, tx * 6),
            note: `Portable Comms telemetry uplink (${tx} science record(s))`,
          });
        }
      }
      if (res.newScienceRecord) {
        addScienceRecord(res.newScienceRecord);
        missionScienceSessionCountRef.current += 1;
        if ((environment === 'moon' || environment === 'mars') && roversRef.current[environment]) {
          const curR = roversRef.current[environment];
          if (Math.hypot(playerPosUI.x - curR.x, playerPosUI.z - curR.z) < 8 || inRover) {
            const nextR = { ...curR, storedSamplesCount: curR.storedSamplesCount + 1 };
            roversRef.current[environment] = nextR;
            setRoversUI({ ...roversRef.current });
            updatePersistedRover(environment, nextR);
          }
        }
        soundEngine.playEquipmentScan();
        appendMissionLog({
          category: 'telemetry',
          severity: 'nominal',
          title: `Science Capture: ${res.newScienceRecord.sampleId}`,
          detail: `${res.newScienceRecord.title} (${res.newScienceRecord.measurement} ${res.newScienceRecord.unit})`,
          metricSnapshot: res.newScienceRecord.instrument,
        });
      } else {
        soundEngine.playInteract();
      }

      showToast(res.message);
      dispatchObjective({ type: 'use-equipment', equipmentId: targetId, environment });
    },
    [
      equippedId,
      inventory,
      environment,
      playerPosUI,
      nearestInteractable,
      objectiveState.objectives,
      scienceRecords.length,
      mission,
      baseModules,
      activeRover,
      inRover,
      addScienceRecord,
      appendMissionLog,
      dispatchObjective,
      markAllScienceTransmitted,
      syncFieldMissionToEngineering,
      updatePersistedRover,
      showToast,
    ]
  );

  const handleRefillTool = useCallback(() => {
    const res = executeRefillTool({
      equippedId,
      inventory,
      telemetry: telemetryRef.current,
    });
    if (res.ok) {
      setInventory(res.nextInventory);
      telemetryRef.current = res.nextTelemetry;
      setTelemetryUI(res.nextTelemetry);
      soundEngine.playInteract();
    } else {
      soundEngine.playWarning();
    }
    showToast(res.message);
  }, [equippedId, inventory, showToast]);

  const handleSwapShoulder = useCallback(() => {
    const nextSide = gameplaySettings.shoulderSide === 'left' ? 'right' : 'left';
    updateGameplaySettings({ shoulderSide: nextSide });
    showToast(`Camera Shoulder: ${nextSide.toUpperCase()}`);
  }, [gameplaySettings.shoulderSide, updateGameplaySettings, showToast]);

  const cycleCamera = useCallback(() => {
    const order: CameraMode[] = inRover
      ? ['rover', 'first-person', 'third-person', 'spacecraft-ext']
      : ['third-person', 'close-inspect', 'first-person', 'spacecraft-ext'];
    setCameraMode((prev) => order[(order.indexOf(prev) + 1) % order.length]);
  }, [inRover]);

  const handleSelectHotbar = useCallback(
    (idx: number) => {
      const target = inventory[idx];
      if (!target) return;
      setEquippedId(target.id);
      dispatchObjective({ type: 'equip', equipmentId: target.id });
      showToast(`Equipped ${target.id}`);
    },
    [inventory, dispatchObjective, showToast]
  );

  // Persistent InputManager wired to callbacks
  const inputManager = useMemo(
    () =>
      new InputManager(gameplaySettings.keyBindings, {
        onInteract: () => {},
        onUseEquipment: () => {},
        onRefillTool: () => {},
        onToggleFlashlight: () => {},
        onToggleCamera: () => {},
        onShoulderSwap: () => {},
        onToggleMap: () => {},
        onToggleInventory: () => {},
        onToggleObjectives: () => {},
        onTogglePause: () => {},
        onSelectHotbar: () => {},
        onWave: () => {},
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    inputManager.updateBindings(gameplaySettings.keyBindings);
    inputManager.updateCallbacks({
      onInteract: handleInteract,
      onUseEquipment: () => handleUseEquipment(),
      onRefillTool: handleRefillTool,
      onToggleFlashlight: () => setFlashlightOn((f) => !f),
      onToggleCamera: cycleCamera,
      onShoulderSwap: handleSwapShoulder,
      onToggleMap: () => {
        if (paused) return;
        setShowInventory(false);
        setShowCockpit(false);
        setShowBaseBuilder(false);
        setShowMap((m) => !m);
      },
      onToggleInventory: () => {
        if (paused) return;
        setShowMap(false);
        setShowCockpit(false);
        setShowBaseBuilder(false);
        setShowInventory((i) => !i);
      },
      onToggleObjectives: () => setShowObjectivesPanel((o) => !o),
      onTogglePause: () => {
        if (showMap) setShowMap(false);
        else if (showInventory) setShowInventory(false);
        else if (showCockpit) setShowCockpit(false);
        else if (showBaseBuilder) setShowBaseBuilder(false);
        else if (showAICommander) setShowAICommander(false);
        else setPaused((p) => !p);
      },
      onSelectHotbar: handleSelectHotbar,
      onWave: () => {
        actionAnimRef.current = { state: 'wave', untilMs: Date.now() + 1400 };
        showToast('Waved to squad crew');
      },
    });
  }, [
    inputManager,
    gameplaySettings.keyBindings,
    handleInteract,
    handleUseEquipment,
    handleRefillTool,
    cycleCamera,
    handleSwapShoulder,
    handleSelectHotbar,
    paused,
    showMap,
    showInventory,
    showCockpit,
    showBaseBuilder,
    showAICommander,
    showToast,
  ]);

  const anyModalBlocking =
    paused ||
    showMap ||
    showInventory ||
    showCockpit ||
    showBaseBuilder ||
    showAICommander ||
    Boolean(activeDynamicEvent) ||
    Boolean(failureExplanation);

  useEffect(() => {
    inputManager.setPaused(phase !== 'playing' || anyModalBlocking);
  }, [inputManager, phase, anyModalBlocking]);

  useEffect(() => {
    if (phase !== 'playing' || !containerRef.current) return;
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    return inputManager.attach(containerRef.current);
  }, [inputManager, phase]);

  // Shortcut [B] for Base Builder on Moon/Mars
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'KeyB') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (environment === 'moon' || environment === 'mars') {
        setShowBaseBuilder((b) => !b);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, environment]);

  const handleAdvanceLaunchStep = useCallback(() => {
    const bypass = activeMode === 'training' || activeMode === 'free-explore';
    const res = advanceLaunchStep(cockpitRef.current, mission, bypass);
    if (res.error) {
      soundEngine.playWarning();
      return { ok: false, error: res.error };
    }
    cockpitRef.current = res.next;
    setCockpitState(res.next);
    soundEngine.playInteract();

    if (res.next.launchStepIndex === 5) {
      appendMissionLog({
        category: 'milestone',
        severity: 'nominal',
        title: 'Main Engine Ignition (Playable Launch)',
        detail: `${mission.name} cleared Step 5/10 ignition in 3D Spacecraft Cockpit.`,
        metricSnapshot: `ALT ${res.next.altitudeKm}km`,
      });
    }
    if (res.completedNow) {
      syncFieldMissionToEngineering({
        launchCompleted: true,
        note: 'Playable 10-step launch sequence completed from 3D Spacecraft Flight Deck.',
      });
      dispatchObjective({ type: 'interact', interactableId: 'sc-propulsion-panel', equippedId });
      showToast('Orbital Insertion Achieved — Cleared for EVA!');
    }
    return { ok: true };
  }, [activeMode, mission, appendMissionLog, syncFieldMissionToEngineering, dispatchObjective, equippedId, showToast]);

  const handleSelectDynamicEventChoice = useCallback(
    (choice: DynamicEventChoice) => {
      if (!activeDynamicEvent) return;
      const res = applyDynamicEventChoice(telemetryRef.current, activeRover, choice);
      telemetryRef.current = res.nextTelemetry;
      setTelemetryUI(res.nextTelemetry);
      if (res.nextRover && (environment === 'moon' || environment === 'mars')) {
        roversRef.current[environment] = res.nextRover;
        setRoversUI({ ...roversRef.current });
        updatePersistedRover(environment, res.nextRover);
      }
      if (res.scoreDelta || res.scienceBonus) {
        setObjectiveState((prev) => ({
          ...prev,
          score: prev.score + res.scoreDelta + res.scienceBonus,
        }));
      }
      appendMissionLog({
        category: 'event',
        severity: 'nominal',
        title: `Anomaly Resolved: ${activeDynamicEvent.title}`,
        detail: `${choice.label} (${choice.effectSummary})`,
      });
      setActiveDynamicEvent(null);
      showToast(choice.effectSummary);
    },
    [activeDynamicEvent, activeRover, environment, appendMissionLog, updatePersistedRover, showToast]
  );

  const handleFailureRecovery = useCallback(
    (mode: 'rescue-airlock' | 'emergency-o2' | 'restart') => {
      if (mode === 'restart') {
        launchMission({
          mode: activeMode,
          missionId: objectiveState.missionId,
          startEnv: environment,
        });
        return;
      }
      failureHandledRef.current = false;
      setFailureExplanation(null);
      if (mode === 'rescue-airlock') {
        emitSquadRescueTrigger({
          environment,
          x: playerPosUI.x,
          z: playerPosUI.z,
          reason: failureExplanation?.title ?? 'Crew life-support emergency',
        });
        const safeEnv: EnvironmentId = environment === 'orbital-eva' ? 'spacecraft' : environment;
        groundedRef.current = createInitialGroundedState(safeEnv);
        evaRef.current = createInitialEVAState();
        telemetryRef.current = createInitialSurvivalTelemetry(safeEnv);
        setTelemetryUI(telemetryRef.current);
        if (safeEnv !== environment) {
          setEnvironment(safeEnv);
        }
        showToast('Rescue Medevac complete — suit recharged in pressurized Safe Zone.');
      } else {
        telemetryRef.current = {
          ...telemetryRef.current,
          oxygenPct: 65,
          co2Pct: 0.25,
          suitIntegrityPct: Math.max(telemetryRef.current.suitIntegrityPct, 65),
          oxygenLeakPerSec: 0,
          healthPct: 65,
        };
        setTelemetryUI(telemetryRef.current);
        showToast('Emergency O2 purged & suit seal patched.');
      }
    },
    [
      activeMode,
      environment,
      failureExplanation,
      launchMission,
      objectiveState.missionId,
      playerPosUI,
      showToast,
    ]
  );

  // Move distance objective trigger (Moon/Mars/EVA exit)
  const moveTriggeredRef = useRef(false);
  useEffect(() => {
    moveTriggeredRef.current = false;
  }, [objectiveState.missionId, environment]);

  const handleMoveMilestoneCheck = useCallback(
    (distFromSpawn: number) => {
      if (!moveTriggeredRef.current && distFromSpawn >= 6.5) {
        moveTriggeredRef.current = true;
        dispatchObjective({ type: 'move-distance', environment, distFromSpawn });
      }
    },
    [dispatchObjective, environment]
  );

  const handleBroadcastSquad = useCallback(() => {
    if (!squad) return;
    const pr = playerRenderRef.current;
    emitSquadPlayer3DSync({
      environmentId: environment,
      x: Number(pr.x.toFixed(2)),
      y: Number(pr.y.toFixed(2)),
      z: Number(pr.z.toFixed(2)),
      yaw: Number(pr.yaw.toFixed(3)),
      animState: pr.animState,
      equippedItem: equippedId,
      inVehicle: inRover,
      flashlightOn,
      customization,
    });
  }, [squad, environment, equippedId, inRover, flashlightOn, customization]);

  const isTouchDevice =
    gameplaySettings.showTouchControls === 'always' ||
    (gameplaySettings.showTouchControls === 'auto' &&
      typeof window !== 'undefined' &&
      (window.innerWidth < 960 || 'ontouchstart' in window));

  if (phase === 'lobby') {
    return <MissionModeMenu onLaunchMission={launchMission} />;
  }

  if (phase === 'loading') {
    return (
      <div className="h-[calc(100vh-4rem)] bg-[#050811] flex flex-col items-center justify-center p-6 text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        <div className="font-display text-xl font-bold text-white">
          Initializing {PLAYABLE_MISSIONS[objectiveState.missionId].title}
        </div>
        <div className="text-xs font-mono text-cyan-300">
          Loading {environment.toUpperCase()} environment · Physics: {ENV_PHYSICS[environment].label}
        </div>
      </div>
    );
  }

  if (phase === 'summary') {
    const def = PLAYABLE_MISSIONS[objectiveState.missionId];
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div className="bg-[#0e1c2b] border border-emerald-500/50 rounded-xl p-6 space-y-4">
          <div className="inline-flex items-center gap-2 text-emerald-400 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4" />
            FIELD OPERATION COMPLETED
          </div>
          <h1 className="font-display text-3xl font-bold text-white">{def.title}</h1>
          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-800 text-xs font-mono">
            <div>
              <div className="text-slate-400">MISSION SCORE</div>
              <div className="text-2xl font-bold text-cyan-300">{objectiveState.score}</div>
            </div>
            <div>
              <div className="text-slate-400">OBJECTIVES</div>
              <div className="text-2xl font-bold text-white">
                {objectiveState.objectives.filter((o) => o.completed).length}/{objectiveState.objectives.length}
              </div>
            </div>
            <div>
              <div className="text-slate-400">SCIENCE RECORDS</div>
              <div className="text-2xl font-bold text-emerald-300">{scienceRecords.length}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <button
              type="button"
              onClick={() => setPhase('lobby')}
              className="px-5 py-2.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Select Next 3D Mission
            </button>
            <button
              type="button"
              onClick={() => setActiveView('campaign')}
              className="px-5 py-2.5 rounded bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-200 text-xs inline-flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              View Campaign &amp; Achievements
            </button>
          </div>
        </div>
      </div>
    );
  }

  const remotePlayersList = Object.values(remotePlayersMap);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="relative w-full h-[calc(100dvh-6.2rem)] lg:h-[calc(100vh-3.6rem)] min-h-[480px] bg-[#03060e] overflow-hidden outline-none select-none"
    >
      {/* Full-Viewport Interactive 3D Canvas */}
      <Canvas
        dpr={isSoftwareGl ? 1 : [1, 1.75]}
        shadows={!isSoftwareGl}
        camera={{ fov: 62, near: 0.1, far: 260, position: [0, 3, 10] }}
        gl={{
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
      >
        <PlanetEnvironment
          environment={environment}
          mission={mission}
          highlightedInteractableId={nearestInteractable?.item.id ?? null}
          playerPosRef={playerRenderRef}
          isSoftwareGl={isSoftwareGl}
          builtModules={baseModules}
          activeHazardType={activeDynamicEvent?.type ?? null}
        />

        {/* Local Playable 3D Astronaut (hidden inside rover) */}
        {!inRover && (
          <AstronautModel
            customization={customization}
            animState={playerRenderRef.current.animState}
            equippedItem={equippedId}
            flashlightOn={flashlightOn}
            isZeroG={environment === 'orbital-eva'}
            hideHead={cameraMode === 'first-person'}
            oxygenPct={telemetryUI.oxygenPct}
            suitIntegrityPct={telemetryUI.suitIntegrityPct}
            aimScan={aimScan}
            isLocal={true}
            transformRef={playerRenderRef}
          />
        )}

        {/* Drivable Planetary Rovers on Moon & Mars */}
        {(environment === 'moon' || environment === 'mars') && (
          <RoverMesh3D
            rover={roversUI[environment]}
            highlighted={nearestInteractable?.item.kind === 'rover'}
          />
        )}

        {/* Remote Multiplayer Squad Crew Astronauts */}
        <MultiplayerCharacterSync
          remotePlayers={remotePlayersMap}
          currentEnvironment={environment}
        />

        <ThirdPersonCamera
          environment={environment}
          cameraMode={cameraMode}
          shoulderSide={gameplaySettings.shoulderSide ?? 'right'}
          aimScan={aimScan}
          targetPosRef={playerRenderRef}
          cameraOrbitRef={cameraOrbitRef}
        />

        <GameplaySimulationLoop
          environment={environment}
          cameraMode={cameraMode}
          paused={anyModalBlocking}
          inRover={inRover}
          equippedId={equippedId}
          flashlightOn={flashlightOn}
          actionAnimRef={actionAnimRef}
          inputManager={inputManager}
          groundedRef={groundedRef}
          evaRef={evaRef}
          roversRef={roversRef}
          telemetryRef={telemetryRef}
          playerRenderRef={playerRenderRef}
          cameraOrbitRef={cameraOrbitRef}
          cameraSensitivity={gameplaySettings.cameraSensitivity}
          invertY={gameplaySettings.invertY}
          powerEfficiencyBonus={bonuses.powerEfficiencyMultiplier}
          builtBaseModules={baseModules}
          activeHazardType={activeDynamicEvent?.type ?? null}
          onSyncUI={(snap) => {
            elapsedSimSecRef.current += 0.1;
            setPlayerPosUI(snap.pos);
            setPlayerYawUI(snap.yaw);
            setCrouchingUI(snap.crouching);
            setAimScan(snap.aiming);
            setTelemetryUI(snap.telemetry);
            setRoversUI(snap.rovers);
            setGamepadConnected(snap.gamepadConnected);

            if (cockpitRef.current.engineIgnited) {
              const nextCockpit = stepCockpitTelemetry(cockpitRef.current, 0.1);
              cockpitRef.current = nextCockpit;
              setCockpitState(nextCockpit);
            }

            if (
              (environment === 'moon' || environment === 'mars') &&
              elapsedSimSecRef.current - lastRoverPersistSecRef.current >= 2.0
            ) {
              lastRoverPersistSecRef.current = elapsedSimSecRef.current;
              updatePersistedRover(environment, snap.rovers[environment]);
            }

            // Dynamic environmental event checks
            if (!activeDynamicEvent && elapsedSimSecRef.current - lastEventSecRef.current >= 4.0) {
              const maybeEvt = evaluateHazardTriggerFromSimulation({
                environment,
                telemetry: snap.telemetry,
                mission,
                rover:
                  environment === 'moon' || environment === 'mars'
                    ? snap.rovers[environment]
                    : null,
                elapsedSec: elapsedSimSecRef.current,
                lastEventSec: lastEventSecRef.current,
                hasActiveEvent: Boolean(activeDynamicEvent),
              });
              if (maybeEvt) {
                lastEventSecRef.current = elapsedSimSecRef.current;
                setActiveDynamicEvent(maybeEvt);
                soundEngine.playWarning();
                appendMissionLog({
                  category: 'telemetry',
                  severity: maybeEvt.severity === 'critical' ? 'critical' : 'caution',
                  title: maybeEvt.title,
                  detail: maybeEvt.cause,
                  metricSnapshot: environment.toUpperCase(),
                });
              }
            }

            // Critical survival failure check with authentic root-cause explanation
            const dead =
              snap.telemetry.healthPct <= 0.1 ||
              (snap.telemetry.oxygenPct <= 0.05 && snap.telemetry.healthPct < 8);
            if (dead && !failureHandledRef.current) {
              failureHandledRef.current = true;
              const exp = explainSurvivalFailure(snap.telemetry, environment);
              setFailureExplanation(exp);
              recordPlayableMissionOutcome({
                missionId: objectiveState.missionId,
                title: PLAYABLE_MISSIONS[objectiveState.missionId].title,
                score: objectiveState.score,
                passed: false,
                scienceCount: missionScienceSessionCountRef.current,
              });
              appendMissionLog({
                category: 'telemetry',
                severity: 'critical',
                title: exp.title,
                detail: exp.cause,
              });
            }
          }}
          onMoveMilestoneCheck={handleMoveMilestoneCheck}
          onBroadcastSquad={handleBroadcastSquad}
        />
      </Canvas>

      {/* Clean HUD Overlay */}
      <MissionHUD
        environment={environment}
        cameraMode={cameraMode}
        telemetry={telemetryUI}
        objectives={objectiveState.objectives}
        showObjectivesPanel={showObjectivesPanel}
        score={objectiveState.score}
        inventory={inventory}
        equippedId={equippedId}
        flashlightOn={flashlightOn}
        nearestInteractable={nearestInteractable}
        rover={activeRover}
        inRover={inRover}
        playerHeadingDeg={(-playerYawUI * 180) / Math.PI}
        playerPos={playerPosUI}
        remotePlayers={remotePlayersList}
        settings={gameplaySettings}
        actionToast={actionToast}
        gamepadConnected={gamepadConnected}
        isTouchDevice={isTouchDevice}
        shoulderSide={gameplaySettings.shoulderSide ?? 'right'}
        aimScan={aimScan}
        activeHazardTitle={activeDynamicEvent?.title ?? null}
        onSelectEquipment={(id) => {
          setEquippedId(id);
          dispatchObjective({ type: 'equip', equipmentId: id });
        }}
        onInteract={handleInteract}
        onUseEquipment={() => handleUseEquipment()}
        onRefillTool={handleRefillTool}
        onToggleFlashlight={() => setFlashlightOn((f) => !f)}
        onCycleCamera={cycleCamera}
        onSwapShoulder={handleSwapShoulder}
        onOpenMap={() => setShowMap(true)}
        onOpenInventory={() => setShowInventory(true)}
        onToggleObjectives={() => setShowObjectivesPanel((o) => !o)}
        onOpenPause={() => setPaused(true)}
        onOpenCockpit={() => setShowCockpit(true)}
        onOpenBaseBuilder={
          environment === 'moon' || environment === 'mars'
            ? () => setShowBaseBuilder(true)
            : undefined
        }
        onOpenAICommander={() => setShowAICommander(true)}
        onExitRover={handleInteract}
        onGrabHandhold={() => {
          const res = snapToNearestEVAHandhold(evaRef.current);
          showToast(
            res.handholdLabel ? `Anchored to ${res.handholdLabel}` : 'Move closer to a yellow truss handhold.'
          );
          if (res.handholdLabel) evaRef.current = res.nextState;
        }}
      />

      {/* Mobile Touch Controls */}
      {isTouchDevice && !anyModalBlocking && (
        <MobileGamingHUD
          touchState={inputManager.touchState}
          leftHanded={gameplaySettings.mobileLeftHanded}
          oxygenPct={telemetryUI.oxygenPct}
          flashlightOn={flashlightOn}
          crouching={crouchingUI}
          canInteract={Boolean(nearestInteractable)}
          onInteract={handleInteract}
          onUseEquipment={() => handleUseEquipment()}
          onToggleFlashlight={() => setFlashlightOn((f) => !f)}
          onToggleCamera={cycleCamera}
          onToggleMap={() => setShowMap(true)}
          onToggleInventory={() => setShowInventory(true)}
          onToggleObjectives={() => setShowObjectivesPanel((o) => !o)}
          onTogglePause={() => setPaused(true)}
          onOpenAICommander={() => setShowAICommander(true)}
          onOpenCockpit={
            environment === 'spacecraft' || environment === 'station'
              ? () => setShowCockpit(true)
              : undefined
          }
          onOpenBaseBuilder={
            environment === 'moon' || environment === 'mars'
              ? () => setShowBaseBuilder(true)
              : undefined
          }
        />
      )}

      {/* Map Modal */}
      {showMap && (
        <NavigationMap
          environment={environment}
          gameMode={activeMode}
          playerPos={playerPosUI}
          playerYaw={playerYawUI}
          objectives={objectiveState.objectives}
          rover={activeRover}
          remotePlayers={remotePlayersList}
          onSwitchEnvironment={switchEnvironment}
          onClose={() => setShowMap(false)}
        />
      )}

      {/* Inventory & Science Records Modal */}
      {showInventory && (
        <InventoryModal
          inventory={inventory}
          equippedId={equippedId}
          scienceRecords={scienceRecords}
          onEquip={(id) => {
            setEquippedId(id);
            dispatchObjective({ type: 'equip', equipmentId: id });
          }}
          onUse={(id) => handleUseEquipment(id)}
          onClose={() => setShowInventory(false)}
        />
      )}

      {/* Spacecraft Cockpit & 10-Step Launch Sequence Modal */}
      {showCockpit && (
        <CockpitModal
          cockpit={cockpitState}
          mission={mission}
          trainingMode={activeMode === 'training' || activeMode === 'free-explore'}
          onUpdateCockpit={(patch) => {
            const next = { ...cockpitRef.current, ...patch };
            cockpitRef.current = next;
            setCockpitState(next);
          }}
          onAdvanceLaunchStep={handleAdvanceLaunchStep}
          onClose={() => setShowCockpit(false)}
        />
      )}

      {/* Planetary Base Construction Modal (Moon & Mars) */}
      {showBaseBuilder && (environment === 'moon' || environment === 'mars') && (
        <BaseBuilderModal
          environment={environment}
          mission={mission}
          modules={baseModules}
          playerPos={{ x: playerPosUI.x, z: playerPosUI.z }}
          onBuildModule={(params) => {
            const res = buildBaseModule(params);
            if (res.ok && res.module) {
              soundEngine.playObjectiveComplete();
              showToast(`Built ${res.module.name}`);
            }
            return res;
          }}
          onClose={() => setShowBaseBuilder(false)}
        />
      )}

      {/* Dynamic World Hazard & Failure Recovery Modal */}
      <DynamicEventModal
        activeEvent={activeDynamicEvent}
        failure={failureExplanation}
        onSelectEventChoice={handleSelectDynamicEventChoice}
        onRecoverFromFailure={handleFailureRecovery}
      />

      {/* AI Flight Director & Mission Commander Drawer */}
      <AICommanderDrawer
        open={showAICommander}
        onClose={() => setShowAICommander(false)}
        telemetry={telemetryUI}
        environment={environment}
        onLocalCommandApplied={(_rec, msg) => showToast(msg)}
      />

      {/* Pause Modal */}
      {paused && (
        <PauseModal
          missionTitle={PLAYABLE_MISSIONS[objectiveState.missionId].title}
          objectives={objectiveState.objectives}
          settings={gameplaySettings}
          soundEnabled={preferences.soundEnabled}
          onUpdateSettings={updateGameplaySettings}
          onToggleSound={(enabled) => updatePreferences({ soundEnabled: enabled })}
          onResume={() => setPaused(false)}
          onRestart={() =>
            launchMission({
              mode: activeMode,
              missionId: objectiveState.missionId,
              startEnv:
                activeMode === 'free-explore'
                  ? environment
                  : PLAYABLE_MISSIONS[objectiveState.missionId].startEnv,
            })
          }
          onExitToMenu={() => {
            setPaused(false);
            setPhase('lobby');
          }}
        />
      )}
    </div>
  );
}
