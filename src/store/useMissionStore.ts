import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DESTINATIONS,
  LAUNCH_VEHICLES,
  PAYLOADS,
  createDefaultMarsMission,
  createInitialGates,
  createInitialRisks,
} from '../engine/catalog';
import {
  appendMissionLogs,
  createMissionLogEntry,
  detectEngineeringTelemetryAlerts,
} from '../engine/missionLog';
import {
  SIMULATION_STAGES,
  applyDecisionToSimulation,
  createStageEvent,
  getNextStage,
  validateStageReadiness,
} from '../engine/missionSimulation';
import { computeOrbitalAnalysis } from '../engine/orbitalMechanics';
import { computeSpacecraftEngineering } from '../engine/spacecraftEngineering';
import {
  computeFinalMissionScore,
  createMitigatedRisk,
  evaluateGateBlockers,
  evaluateRequirements,
} from '../engine/systemsEngineering';
import {
  DEFAULT_CUSTOMIZATION,
  DEFAULT_GAMEPLAY_SETTINGS,
  DEFAULT_KEY_BINDINGS,
} from '../gameplay/GameplayStateManager';
import { applyCareerProgressionOutcome, createInitialCareerProfile } from '../gameplay/CareerProgressionSystem';
import { validateAndCreateBaseModule } from '../gameplay/PlanetaryBaseSystem';
import { createInitialRovers } from '../gameplay/RoverController';
import type {
  AICommanderRecommendation,
  AppView,
  AstronautCustomization,
  BaseModuleType,
  CampaignRecord,
  CareerProfile,
  DesignSubTab,
  DestinationId,
  GameMode,
  GameplaySettings,
  GateReviewCode,
  MissionCategory,
  MissionDesign,
  MissionDifficulty,
  MissionEventLog,
  MissionLogCategory,
  MissionType,
  NasaEphemerisData,
  OrbitalPlanConfig,
  PlanetaryBaseModule,
  PlayableMissionId,
  RemotePlayer3DState,
  RoverState,
  ScienceRecord,
  SimulationDecisionOption,
  SimulationStage,
  SpacecraftConfig,
  SquadState,
  UserPreferences,
  VerificationMethod,
} from '../engine/types';
import {
  fetchCampaignHistory,
  fetchHorizonsEphemeris,
  saveBaseModulesRemote,
  saveCampaignRecordRemote,
  saveCareerProfileRemote,
} from '../services/apiClient';
import {
  saveCampaignToCloud,
  saveMissionRunToCloud,
  hydrateFromCloudOrLocal,
} from '../services/cloudPersistence';
import { getFirebaseAuth } from '../services/firebase';
import {
  emitSquadBaseBuild,
  emitSquadDiscoveryAdd,
  emitSquadMissionUpdate,
} from '../services/socketClient';

interface MissionStoreState {
  // Shell & UI navigation
  started: boolean;
  activeView: AppView;
  designSubTab: DesignSubTab;
  showHelpModal: boolean;
  missionLogOpen: boolean;
  statusBanner: { type: 'info' | 'error' | 'success'; message: string } | null;

  // Core Active Mission
  mission: MissionDesign;
  retriedInCurrentMission: boolean;

  // NASA Ephemeris Cache
  ephemerisByTarget: Partial<Record<DestinationId, NasaEphemerisData>>;
  ephemerisLoading: boolean;

  // Campaign, Career & Achievements
  campaigns: CampaignRecord[];
  unlockedAchievements: string[];
  career: CareerProfile;

  // Multiplayer Squad
  squad: SquadState | null;
  myMemberId: string | null;
  socketConnected: boolean;
  remotePlayers: Record<string, RemotePlayer3DState>;

  // 3D Gameplay, Base Construction & Astronaut State
  astronautCustomization: AstronautCustomization;
  gameplaySettings: GameplaySettings;
  selectedGameMode: GameMode;
  selectedPlayableMission: PlayableMissionId;
  scienceRecords: ScienceRecord[];
  completedPlayableMissions: PlayableMissionId[];
  baseModules: PlanetaryBaseModule[];
  rovers: Record<'moon' | 'mars', RoverState>;

  // Preferences
  preferences: UserPreferences;

  // Actions
  enterStudio: (view?: AppView) => void;
  setActiveView: (view: AppView) => void;
  setDesignSubTab: (tab: DesignSubTab) => void;
  setShowHelpModal: (open: boolean) => void;
  setMissionLogOpen: (open: boolean) => void;
  appendMissionLog: (entry: {
    category: MissionLogCategory;
    title: string;
    detail: string;
    severity?: MissionEventLog['severity'];
    metricSnapshot?: string;
  }) => void;
  clearMissionLogs: () => void;
  clearStatusBanner: () => void;
  setStatusBanner: (type: 'info' | 'error' | 'success', message: string) => void;

  // Mission Design Actions
  createNewMission: (params: {
    name: string;
    description: string;
    category: MissionCategory;
    destinationId: DestinationId;
    missionType: MissionType;
    difficulty: MissionDifficulty;
    durationDays: number;
    budgetCapMUsd: number;
    primaryObjective: string;
    secondaryObjectives: string[];
  }) => void;
  updateMissionMeta: (patch: Partial<Pick<MissionDesign, 'name' | 'description' | 'category' | 'missionType' | 'difficulty' | 'durationDays' | 'budgetCapMUsd' | 'primaryObjective'>>) => void;
  setDestination: (destId: DestinationId) => void;
  updateSpacecraft: (patch: Partial<SpacecraftConfig>) => void;
  togglePayload: (payloadId: string) => void;
  setLaunchVehicle: (launcherId: string) => void;
  updateOrbitalPlan: (patch: Partial<OrbitalPlanConfig>) => void;

  // Systems Engineering Actions
  toggleRequirementManualVerify: (reqId: string) => void;
  setRequirementMethod: (reqId: string, method: VerificationMethod) => void;
  mitigateRisk: (riskId: string) => void;
  attemptPassGate: (code: GateReviewCode) => { ok: boolean; blockers: string[] };
  passAllReadyPreLaunchGates: () => void;

  // Simulation Actions
  advanceSimulationStage: () => { ok: boolean; error?: string };
  startLaunchSequence: () => { ok: boolean; error?: string };
  finishLaunchSequence: () => void;
  executeSimulationDecision: (option: SimulationDecisionOption) => void;
  retryFailedStage: () => void;
  restartFullCampaignMission: () => void;
  recordCompletedMission: () => void;

  // NASA & Campaign Actions
  loadEphemeris: (targetId: DestinationId) => Promise<void>;
  hydrateCampaignFromServer: () => Promise<void>;
  updatePreferences: (patch: Partial<UserPreferences>) => void;

  // Squad Sync Actions
  setSocketConnected: (connected: boolean) => void;
  setSquadSession: (squad: SquadState | null, memberId: string | null) => void;
  applyRemoteSquadState: (squad: SquadState) => void;
  upsertRemotePlayer: (player: RemotePlayer3DState) => void;
  removeRemotePlayer: (memberId: string) => void;

  // 3D Gameplay, Base & Career Actions
  updateAstronautCustomization: (patch: Partial<AstronautCustomization>) => void;
  updateGameplaySettings: (patch: Partial<GameplaySettings>) => void;
  setGameModeAndMission: (mode: GameMode, missionId: PlayableMissionId) => void;
  addScienceRecord: (record: ScienceRecord) => void;
  markAllScienceTransmitted: () => number;
  buildBaseModule: (params: {
    type: BaseModuleType;
    environment: 'moon' | 'mars';
    x: number;
    z: number;
  }) => { ok: boolean; module?: PlanetaryBaseModule; error?: string };
  updatePersistedRover: (env: 'moon' | 'mars', rover: RoverState) => void;
  syncFieldMissionToEngineering: (params: {
    launchCompleted?: boolean;
    scienceDeltaPct?: number;
    note: string;
  }) => void;
  applyApprovedAICommand: (rec: AICommanderRecommendation) => { ok: boolean; message: string };
  recordPlayableMissionOutcome: (params: {
    missionId: PlayableMissionId;
    title: string;
    score: number;
    passed: boolean;
    scienceCount: number;
  }) => void;
}

function syncMissionDerived(mission: MissionDesign): MissionDesign {
  const eng = computeSpacecraftEngineering(mission);
  const orb = computeOrbitalAnalysis(
    mission.destinationId,
    mission.orbitalPlan,
    mission.spacecraft,
    eng.wetMassKg,
    eng.dryMassKg
  );
  const requirements = evaluateRequirements(mission, eng, orb);
  // Keep gate blocker previews up-to-date
  const gates = mission.gates.map((g) => ({
    ...g,
    blockedReasons: g.passed ? [] : evaluateGateBlockers(g.code, mission, eng, orb, requirements),
  }));
  return {
    ...mission,
    requirements,
    gates,
    updatedAt: new Date().toISOString(),
  };
}

function buildInitialMission(): MissionDesign {
  return syncMissionDerived(createDefaultMarsMission());
}

const checkAutostart = (): boolean => {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
};

export const useMissionStore = create<MissionStoreState>()(
  persist(
    (set, get) => {
      const updateMissionAndSync = (
        updater: (prev: MissionDesign) => MissionDesign,
        syncSummary?: string
      ) => {
        const prevMission = get().mission;
        const prevEng = computeSpacecraftEngineering(prevMission);
        const prevOrb = computeOrbitalAnalysis(
          prevMission.destinationId,
          prevMission.orbitalPlan,
          prevMission.spacecraft,
          prevEng.wetMassKg,
          prevEng.dryMassKg
        );

        let nextMission = syncMissionDerived(updater(prevMission));
        const nextEng = computeSpacecraftEngineering(nextMission);
        const nextOrb = computeOrbitalAnalysis(
          nextMission.destinationId,
          nextMission.orbitalPlan,
          nextMission.spacecraft,
          nextEng.wetMassKg,
          nextEng.dryMassKg
        );

        const autoAlerts = detectEngineeringTelemetryAlerts(
          prevEng,
          prevOrb,
          nextEng,
          nextOrb,
          nextMission.simulation.currentStage
        );

        if (autoAlerts.length > 0) {
          nextMission = {
            ...nextMission,
            simulation: {
              ...nextMission.simulation,
              logs: appendMissionLogs(nextMission.simulation.logs, autoAlerts),
            },
          };
        }

        set({ mission: nextMission });
        const squad = get().squad;
        if (squad) {
          emitSquadMissionUpdate(nextMission, syncSummary);
        }
      };

      return {
        started: checkAutostart(),
        activeView: 'dashboard',
        designSubTab: 'brief',
        showHelpModal: false,
        missionLogOpen: true,
        statusBanner: null,

        mission: buildInitialMission(),
        retriedInCurrentMission: false,

        ephemerisByTarget: {},
        ephemerisLoading: false,

        campaigns: [],
        unlockedAchievements: [],
        career: createInitialCareerProfile(),

        squad: null,
        myMemberId: null,
        socketConnected: false,
        remotePlayers: {},

        astronautCustomization: DEFAULT_CUSTOMIZATION,
        gameplaySettings: DEFAULT_GAMEPLAY_SETTINGS,
        selectedGameMode: 'career',
        selectedPlayableMission: 'station-prep',
        scienceRecords: [],
        completedPlayableMissions: [],
        baseModules: [],
        rovers: createInitialRovers(),

        preferences: {
          units: 'SI + AU',
          graphicsQuality: 'High',
          soundEnabled: true,
          showOrbitalAssumptions: true,
        },

        enterStudio: (view) => {
          if (typeof document !== 'undefined') {
            document.body.dataset.state = 'playing';
          }
          set((s) => ({
            started: true,
            activeView: view ?? s.activeView,
          }));
        },

        setActiveView: (view) => set({ activeView: view }),
        setDesignSubTab: (tab) => set({ designSubTab: tab }),
        setShowHelpModal: (open) => set({ showHelpModal: open }),
        setMissionLogOpen: (open) => set({ missionLogOpen: open }),
        appendMissionLog: (entry) => {
          updateMissionAndSync((prev) => ({
            ...prev,
            simulation: {
              ...prev.simulation,
              logs: appendMissionLogs(prev.simulation.logs, [
                createMissionLogEntry({
                  stage: prev.simulation.currentStage,
                  category: entry.category,
                  title: entry.title,
                  detail: entry.detail,
                  severity: entry.severity ?? 'info',
                  metricSnapshot: entry.metricSnapshot,
                }),
              ]),
            },
          }));
        },
        clearMissionLogs: () => {
          updateMissionAndSync((prev) => ({
            ...prev,
            simulation: {
              ...prev.simulation,
              logs: [
                createMissionLogEntry({
                  stage: prev.simulation.currentStage,
                  category: 'event',
                  severity: 'info',
                  title: 'Mission Log Cleared',
                  detail: `Active log buffer cleared during ${prev.simulation.currentStage}.`,
                }),
              ],
            },
          }));
        },
        clearStatusBanner: () => set({ statusBanner: null }),
        setStatusBanner: (type, message) => set({ statusBanner: { type, message } }),

        createNewMission: (params) => {
          const dest = DESTINATIONS.find((d) => d.id === params.destinationId) ?? DESTINATIONS[3];
          const now = new Date().toISOString();

          const defaultStructure =
            params.missionType === 'Crewed Mission'
              ? 'bus-crewed'
              : params.missionType === 'Lander' || params.missionType === 'Rover'
                ? 'bus-lander-rover'
                : params.missionType === 'Space Telescope'
                  ? 'bus-observatory'
                  : 'bus-planetary';

          const defaultPayloads =
            params.missionType === 'Space Telescope'
              ? ['pay-telescope', 'pay-ir-spec']
              : params.missionType === 'Rover' || params.missionType === 'Lander'
                ? ['pay-rover-lab', 'pay-sample-drill', 'pay-atmo']
                : ['pay-hirise', 'pay-ir-spec', 'pay-mag'];

          const defaultLauncher =
            params.missionType === 'Crewed Mission'
              ? 'lv-sls'
              : params.destinationId === 'leo'
                ? 'lv-falcon9'
                : 'lv-falcon-heavy';

          const fresh: MissionDesign = {
            id: `mission-${Date.now()}`,
            name: params.name.trim(),
            description: params.description.trim(),
            category: params.category,
            destinationId: params.destinationId,
            missionType: params.missionType,
            difficulty: params.difficulty,
            durationDays: params.durationDays,
            budgetCapMUsd: params.budgetCapMUsd,
            primaryObjective: params.primaryObjective.trim(),
            secondaryObjectives: params.secondaryObjectives,
            successCriteria: [
              `Achieve nominal ${dest.defaultOrbitType} insertion at ${dest.name}`,
              'Collect >= 80% primary scientific payload return',
              'Complete controlled End of Life passivation or disposal',
            ],
            selectedPayloadIds: defaultPayloads,
            launchVehicleId: defaultLauncher,
            spacecraft: {
              structureId: defaultStructure,
              propulsionId: dest.id === 'ceres' ? 'ion-gridded' : 'bipropellant',
              powerId: dest.recommendedPower,
              solarPanelAreaM2: dest.orbitRadiusAu >= 1.5 ? 20 : 12,
              batteryCapacityWh: 4200,
              propellantMassKg: dest.id === 'leo' ? 350 : dest.id === 'jupiter' ? 3400 : 2100,
              commsTier: dest.orbitRadiusAu > 1.2 ? 'Ka-Band Deep Space' : 'X-Band',
              thermalTier: 'Active Louvers & Heaters',
              navigationTier: 'Deep Space Autonomous Optical',
              attitudeControl: 'Reaction Wheels + RCS',
              redundancyLevel: 'Selective Redundancy',
            },
            orbitalPlan: {
              orbitType: dest.defaultOrbitType,
              departureAltitudeKm: 300,
              targetAltitudeKm: dest.defaultTargetAltKm,
              inclinationDeg: dest.id === 'geo' ? 0 : 65,
              eccentricity: 0.01,
              aerobrakingAssisted: false,
              contingencyDeltaVPercent: 10,
            },
            requirements: [],
            risks: createInitialRisks(params.destinationId, params.missionType),
            gates: createInitialGates(),
            simulation: {
              currentStage: 'Mission Concept',
              stageProgressPct: 0,
              countdownSeconds: 10,
              isLaunching: false,
              launchSequenceStep: 'Standby on Pad',
              missionElapsedDays: 0,
              fuelRemainingPct: 100,
              batteryChargePct: 100,
              commsLinkPct: 100,
              thermalTempC: 21,
              scienceCollectedPct: 0,
              objectivesCompleted: [],
              activeEvent: null,
              failed: false,
              failureReason: null,
              failedStage: null,
              completed: false,
              endOfLifeOption: null,
              logs: [
                {
                  id: `log-${Date.now()}`,
                  timestamp: now,
                  stage: 'Mission Concept',
                  title: `New Mission Created: ${params.name}`,
                  detail: `${params.missionType} targeting ${dest.name}.`,
                  severity: 'info',
                },
              ],
            },
            createdAt: now,
            updatedAt: now,
          };

          const synced = syncMissionDerived(fresh);
          set({
            mission: synced,
            retriedInCurrentMission: false,
            designSubTab: 'spacecraft',
            statusBanner: { type: 'success', message: `Mission "${synced.name}" initialized for ${dest.name}.` },
          });
          if (get().squad) {
            emitSquadMissionUpdate(synced, `created new mission "${synced.name}"`);
          }
        },

        updateMissionMeta: (patch) => {
          updateMissionAndSync((prev) => ({ ...prev, ...patch }), 'updated mission brief');
        },

        setDestination: (destId) => {
          const dest = DESTINATIONS.find((d) => d.id === destId) ?? DESTINATIONS[3];
          updateMissionAndSync((prev) => ({
            ...prev,
            destinationId: destId,
            orbitalPlan: {
              ...prev.orbitalPlan,
              orbitType: dest.defaultOrbitType,
              targetAltitudeKm: dest.defaultTargetAltKm,
            },
            risks: createInitialRisks(destId, prev.missionType),
            simulation: {
              ...prev.simulation,
              logs: appendMissionLogs(prev.simulation.logs, [
                createMissionLogEntry({
                  stage: prev.simulation.currentStage,
                  category: 'event',
                  severity: 'info',
                  title: `Destination Targeted: ${dest.name}`,
                  detail: `Orbital baseline switched to ${dest.defaultOrbitType} (${dest.orbitRadiusAu} AU).`,
                  metricSnapshot: `${dest.solarIrradianceWm2} W/m²`,
                }),
              ]),
            },
          }), `changed destination to ${dest.name}`);
          get().loadEphemeris(destId);
        },

        updateSpacecraft: (patch) => {
          updateMissionAndSync(
            (prev) => ({
              ...prev,
              spacecraft: { ...prev.spacecraft, ...patch },
            }),
            'modified spacecraft configuration'
          );
        },

        togglePayload: (payloadId) => {
          const payload = PAYLOADS.find((p) => p.id === payloadId);
          updateMissionAndSync((prev) => {
            const exists = prev.selectedPayloadIds.includes(payloadId);
            const nextIds = exists
              ? prev.selectedPayloadIds.filter((id) => id !== payloadId)
              : [...prev.selectedPayloadIds, payloadId];
            return {
              ...prev,
              selectedPayloadIds: nextIds,
              simulation: {
                ...prev.simulation,
                logs: appendMissionLogs(prev.simulation.logs, [
                  createMissionLogEntry({
                    stage: prev.simulation.currentStage,
                    category: 'event',
                    severity: 'info',
                    title: exists ? `Payload Removed: ${payload?.name ?? payloadId}` : `Payload Installed: ${payload?.name ?? payloadId}`,
                    detail: `${nextIds.length} science instrument(s) configured on bus.`,
                    metricSnapshot: `${nextIds.length} payloads`,
                  }),
                ]),
              },
            };
          }, 'updated payload complement');
        },

        setLaunchVehicle: (launcherId) => {
          const lv = LAUNCH_VEHICLES.find((l) => l.id === launcherId);
          updateMissionAndSync(
            (prev) => ({
              ...prev,
              launchVehicleId: launcherId,
              simulation: {
                ...prev.simulation,
                logs: appendMissionLogs(prev.simulation.logs, [
                  createMissionLogEntry({
                    stage: prev.simulation.currentStage,
                    category: 'milestone',
                    severity: 'nominal',
                    title: `Launcher Selected: ${lv?.name ?? launcherId}`,
                    detail: `${lv?.provider ?? 'Launch'} vehicle assigned ($${lv?.referenceCostMUsd ?? 0}M ref cost).`,
                  }),
                ]),
              },
            }),
            'selected launch vehicle'
          );
        },

        updateOrbitalPlan: (patch) => {
          updateMissionAndSync(
            (prev) => ({
              ...prev,
              orbitalPlan: { ...prev.orbitalPlan, ...patch },
            }),
            'adjusted orbital plan'
          );
        },

        toggleRequirementManualVerify: (reqId) => {
          updateMissionAndSync((prev) => {
            const targetReq = prev.requirements.find((r) => r.id === reqId);
            const nextVerified = targetReq ? !targetReq.manualVerified : false;
            return {
              ...prev,
              requirements: prev.requirements.map((r) =>
                r.id === reqId ? { ...r, manualVerified: nextVerified } : r
              ),
              simulation: {
                ...prev.simulation,
                logs: targetReq
                  ? appendMissionLogs(prev.simulation.logs, [
                      createMissionLogEntry({
                        stage: prev.simulation.currentStage,
                        category: 'milestone',
                        severity: nextVerified ? 'nominal' : 'info',
                        title: `Requirement ${nextVerified ? 'Verified' : 'Unchecked'}: ${targetReq.code}`,
                        detail: targetReq.title,
                      }),
                    ])
                  : prev.simulation.logs,
              },
            };
          });
        },

        setRequirementMethod: (reqId, method) => {
          updateMissionAndSync((prev) => ({
            ...prev,
            requirements: prev.requirements.map((r) =>
              r.id === reqId ? { ...r, verificationMethod: method } : r
            ),
          }));
        },

        mitigateRisk: (riskId) => {
          updateMissionAndSync((prev) => {
            const risk = prev.risks.find((r) => r.id === riskId);
            return {
              ...prev,
              risks: prev.risks.map((r) => (r.id === riskId ? createMitigatedRisk(r) : r)),
              simulation: {
                ...prev.simulation,
                logs: risk
                  ? appendMissionLogs(prev.simulation.logs, [
                      createMissionLogEntry({
                        stage: prev.simulation.currentStage,
                        category: 'milestone',
                        severity: 'nominal',
                        title: `Risk Mitigated: ${risk.code}`,
                        detail: `${risk.title} (residual P×C: ${risk.residualScore}/25).`,
                        metricSnapshot: `-$${risk.mitigationCostMUsd}M`,
                      }),
                    ])
                  : prev.simulation.logs,
              },
            };
          }, 'mitigated engineering risk');
        },

        attemptPassGate: (code) => {
          const mission = get().mission;
          const eng = computeSpacecraftEngineering(mission);
          const orb = computeOrbitalAnalysis(
            mission.destinationId,
            mission.orbitalPlan,
            mission.spacecraft,
            eng.wetMassKg,
            eng.dryMassKg
          );
          const reqs = evaluateRequirements(mission, eng, orb);
          const blockers = evaluateGateBlockers(code, mission, eng, orb, reqs);

          if (blockers.length > 0) {
            updateMissionAndSync((prev) => ({
              ...prev,
              simulation: {
                ...prev.simulation,
                logs: appendMissionLogs(prev.simulation.logs, [
                  createMissionLogEntry({
                    stage: prev.simulation.currentStage,
                    category: 'telemetry',
                    severity: 'caution',
                    title: `Gate Review Blocked: ${code}`,
                    detail: blockers[0],
                  }),
                ]),
              },
            }));
            set({
              statusBanner: {
                type: 'error',
                message: `${code} Gate Blocked: ${blockers[0]}`,
              },
            });
            return { ok: false, blockers };
          }

          const gateMeta = mission.gates.find((g) => g.code === code);
          updateMissionAndSync((prev) => ({
            ...prev,
            gates: prev.gates.map((g) =>
              g.code === code
                ? { ...g, passed: true, blockedReasons: [], reviewedAt: new Date().toISOString() }
                : g
            ),
            simulation: {
              ...prev.simulation,
              logs: appendMissionLogs(prev.simulation.logs, [
                createMissionLogEntry({
                  stage: prev.simulation.currentStage,
                  category: 'milestone',
                  severity: 'nominal',
                  title: `Gate Approved: ${code}`,
                  detail: `${gateMeta?.name ?? code} passed engineering readiness verification.`,
                  metricSnapshot: `${gateMeta?.lifecyclePhase.split(':')[0] ?? code}`,
                }),
              ]),
            },
          }), `approved ${code} gate review`);
          set({ statusBanner: { type: 'success', message: `${code} Review Gate passed.` } });
          return { ok: true, blockers: [] };
        },

        passAllReadyPreLaunchGates: () => {
          const preCodes: GateReviewCode[] = ['MCR', 'SRR', 'MDR', 'PDR', 'CDR', 'SIR', 'ORR', 'FRR'];
          let passedCount = 0;
          let lastBlocker = '';
          for (const code of preCodes) {
            const m = get().mission;
            if (m.gates.find((g) => g.code === code)?.passed) continue;
            const res = get().attemptPassGate(code);
            if (res.ok) passedCount++;
            else {
              lastBlocker = res.blockers[0] || `${code} blocked`;
              break;
            }
          }
          if (lastBlocker) {
            set({
              statusBanner: {
                type: 'error',
                message: `Gates halted: ${lastBlocker}`,
              },
            });
          } else if (passedCount > 0) {
            set({
              statusBanner: {
                type: 'success',
                message: `All pre-launch gates through FRR verified and passed.`,
              },
            });
          }
        },

        advanceSimulationStage: () => {
          const mission = get().mission;
          if (mission.simulation.failed) {
            return { ok: false, error: 'Resolve or retry failed stage before advancing.' };
          }
          if (mission.simulation.activeEvent) {
            return { ok: false, error: 'Resolve the active mission event decision first.' };
          }
          const nextStage = getNextStage(mission.simulation.currentStage);
          if (!nextStage) {
            return { ok: false, error: 'Mission already at End of Life.' };
          }

          const check = validateStageReadiness(mission, nextStage);
          if (!check.ok) {
            updateMissionAndSync((prev) => ({
              ...prev,
              simulation: {
                ...prev.simulation,
                logs: appendMissionLogs(prev.simulation.logs, [
                  createMissionLogEntry({
                    stage: prev.simulation.currentStage,
                    category: 'telemetry',
                    severity: 'critical',
                    title: `Stage Transition Blocked (${nextStage})`,
                    detail: check.reason || 'Readiness check failed.',
                  }),
                ]),
              },
            }));
            set({ statusBanner: { type: 'error', message: check.reason || 'Stage blocked.' } });
            return check;
          }

          const event = createStageEvent(mission, nextStage);
          const stageDayMap: Record<SimulationStage, number> = {
            'Mission Concept': 0,
            'Mission Design': 0,
            Development: 0,
            Testing: 0,
            Launch: 1,
            Cruise: Math.round(
              computeOrbitalAnalysis(
                mission.destinationId,
                mission.orbitalPlan,
                mission.spacecraft,
                computeSpacecraftEngineering(mission).wetMassKg,
                computeSpacecraftEngineering(mission).dryMassKg
              ).estimatedTransferDays
            ),
            Operations: Math.round(mission.durationDays * 0.85),
            'End of Life': mission.durationDays,
          };

          updateMissionAndSync((prev) => ({
            ...prev,
            simulation: {
              ...prev.simulation,
              currentStage: nextStage,
              stageProgressPct: event ? 35 : 100,
              missionElapsedDays: Math.max(prev.simulation.missionElapsedDays, stageDayMap[nextStage]),
              activeEvent: event,
              isLaunching: false,
              launchSequenceStep: nextStage === 'Launch' ? 'T-00:10 Terminal Count Ready' : prev.simulation.launchSequenceStep,
              logs: appendMissionLogs(prev.simulation.logs, [
                createMissionLogEntry({
                  stage: nextStage,
                  category: nextStage === 'Operations' || nextStage === 'End of Life' ? 'milestone' : 'event',
                  title: `Entered ${nextStage}`,
                  detail: `Mission transitioned to ${nextStage} (T+${stageDayMap[nextStage]}d).`,
                  severity: 'nominal',
                  metricSnapshot: `T+${stageDayMap[nextStage]}d`,
                }),
              ]),
            },
          }), `advanced mission to ${nextStage}`);

          return { ok: true };
        },

        startLaunchSequence: () => {
          const mission = get().mission;
          const check = validateStageReadiness(mission, 'Launch');
          if (!check.ok) {
            updateMissionAndSync((prev) => ({
              ...prev,
              simulation: {
                ...prev.simulation,
                logs: appendMissionLogs(prev.simulation.logs, [
                  createMissionLogEntry({
                    stage: prev.simulation.currentStage,
                    category: 'telemetry',
                    severity: 'critical',
                    title: 'Launch Hold: Readiness Check Failed',
                    detail: check.reason || 'Pre-launch gate or margin check failed.',
                  }),
                ]),
              },
            }));
            set({ statusBanner: { type: 'error', message: check.reason || 'Launch blocked.' } });
            return check;
          }

          updateMissionAndSync((prev) => ({
            ...prev,
            simulation: {
              ...prev.simulation,
              currentStage: 'Launch',
              isLaunching: true,
              countdownSeconds: 5,
              launchSequenceStep: 'Ignition Sequence Start · Main Engines Nominal',
              logs: appendMissionLogs(prev.simulation.logs, [
                createMissionLogEntry({
                  stage: 'Launch',
                  category: 'event',
                  title: 'Liftoff Sequence Initiated',
                  detail: 'Main engines ignited; vehicle cleared tower.',
                  severity: 'nominal',
                  metricSnapshot: 'T+0s Liftoff',
                }),
              ]),
            },
          }));
          return { ok: true };
        },

        finishLaunchSequence: () => {
          const mission = get().mission;
          const event = createStageEvent(mission, 'Launch');
          updateMissionAndSync((prev) => ({
            ...prev,
            simulation: {
              ...prev.simulation,
              isLaunching: false,
              countdownSeconds: 0,
              launchSequenceStep: 'Stage Separation & Fairing Deploy Nominal · Orbital Insertion Achieved',
              stageProgressPct: 50,
              missionElapsedDays: 1,
              fuelRemainingPct: 92,
              activeEvent: event,
              logs: appendMissionLogs(prev.simulation.logs, [
                createMissionLogEntry({
                  stage: 'Launch',
                  category: 'milestone',
                  title: 'MECO & Orbital Insertion Nominal',
                  detail: 'Upper stage separated cleanly; spacecraft solar arrays deployed.',
                  severity: 'nominal',
                  metricSnapshot: 'Fuel 92%',
                }),
              ]),
            },
          }));
        },

        executeSimulationDecision: (option) => {
          updateMissionAndSync(
            (prev) => ({
              ...prev,
              simulation: applyDecisionToSimulation(prev, option),
            }),
            `executed ${option.label}`
          );
          if (get().mission.simulation.completed) {
            get().recordCompletedMission();
          }
        },

        retryFailedStage: () => {
          const prevSim = get().mission.simulation;
          const retryStage = prevSim.failedStage ?? prevSim.currentStage;
          const event = createStageEvent(get().mission, retryStage);

          set({ retriedInCurrentMission: true });
          updateMissionAndSync((prev) => ({
            ...prev,
            simulation: {
              ...prev.simulation,
              currentStage: retryStage,
              failed: false,
              failureReason: null,
              failedStage: null,
              fuelRemainingPct: Math.max(45, prev.simulation.fuelRemainingPct),
              batteryChargePct: Math.max(70, prev.simulation.batteryChargePct),
              activeEvent: event,
              logs: appendMissionLogs(prev.simulation.logs, [
                createMissionLogEntry({
                  stage: retryStage,
                  category: 'event',
                  title: `Stage Retry Authorized (${retryStage})`,
                  detail: 'Anomaly recovery applied; re-entering stage checkpoint.',
                  severity: 'caution',
                }),
              ]),
            },
          }), `retried ${retryStage} stage`);
        },

        restartFullCampaignMission: () => {
          const prev = get().mission;
          const fresh = createDefaultMarsMission();
          const resetMission: MissionDesign = {
            ...prev,
            gates: createInitialGates(),
            simulation: {
              ...fresh.simulation,
              logs: [
                createMissionLogEntry({
                  stage: 'Mission Concept',
                  category: 'event',
                  title: 'Full Mission Campaign Restarted',
                  detail: `Reset ${prev.name} to Mission Concept after previous run.`,
                  severity: 'info',
                }),
              ],
            },
          };
          set({
            mission: syncMissionDerived(resetMission),
            retriedInCurrentMission: false,
            activeView: 'design',
            statusBanner: { type: 'info', message: 'Mission restarted from Mission Concept.' },
          });
        },

        recordCompletedMission: () => {
          const mission = get().mission;
          const eng = computeSpacecraftEngineering(mission);
          const orb = computeOrbitalAnalysis(
            mission.destinationId,
            mission.orbitalPlan,
            mission.spacecraft,
            eng.wetMassKg,
            eng.dryMassKg
          );
          const breakdown = computeFinalMissionScore(mission, eng, orb);

          const record: CampaignRecord = {
            id: `camp-${mission.id}-${Date.now()}`,
            missionName: mission.name,
            destinationId: mission.destinationId,
            missionType: mission.missionType,
            score: breakdown.totalScore,
            grade: breakdown.grade,
            passed: breakdown.passedMission,
            costMUsd: eng.totalEstimatedCostMUsd,
            durationDays: mission.durationDays,
            completedAt: new Date().toISOString(),
            failureReason: mission.simulation.failureReason,
          };

          const newlyUnlocked: string[] = [];
          if (breakdown.passedMission) {
            newlyUnlocked.push('ach-first-orbit');
            if (mission.destinationId === 'mars' && ['S', 'A'].includes(breakdown.grade)) {
              newlyUnlocked.push('ach-mars-explorer');
            }
            if (['ceres', 'jupiter'].includes(mission.destinationId)) {
              newlyUnlocked.push('ach-outer-system');
            }
            if (mission.risks.every((r) => r.mitigated || r.severity !== 'Critical')) {
              newlyUnlocked.push('ach-zero-critical');
            }
            if (eng.contingencyPct >= 10) {
              newlyUnlocked.push('ach-budget-hawk');
            }
            if (get().retriedInCurrentMission) {
              newlyUnlocked.push('ach-recovery');
            }
          }
          if (get().squad) {
            newlyUnlocked.push('ach-squad-cmd');
          }

          const nextCareer = applyCareerProgressionOutcome(get().career, {
            passed: breakdown.passedMission,
            score: breakdown.totalScore,
            scienceCount: get().scienceRecords.length,
            baseModulesCount: get().baseModules.length,
            domain: 'engineering',
          });

          set((s) => {
            const achSet = new Set([...s.unlockedAchievements, ...newlyUnlocked]);
            return {
              campaigns: [record, ...s.campaigns].slice(0, 50),
              unlockedAchievements: Array.from(achSet),
              career: nextCareer,
              mission: {
                ...s.mission,
                simulation: {
                  ...s.mission.simulation,
                  logs: appendMissionLogs(s.mission.simulation.logs, [
                    createMissionLogEntry({
                      stage: s.mission.simulation.currentStage,
                      category: 'milestone',
                      severity: breakdown.passedMission ? 'nominal' : 'critical',
                      title: `Mission Completed: Grade ${breakdown.grade}`,
                      detail: `${mission.name} archived (${breakdown.totalScore}/100 pts) · Rank: ${nextCareer.rank}.`,
                      metricSnapshot: `${breakdown.totalScore}/100`,
                    }),
                  ]),
                },
              },
            };
          });

          saveCampaignRecordRemote(record, newlyUnlocked);
          saveCareerProfileRemote(nextCareer);
          const currentUid = getFirebaseAuth()?.currentUser?.uid ?? null;
          void saveCampaignToCloud(currentUid, record, newlyUnlocked);
        },

        loadEphemeris: async (targetId) => {
          set({ ephemerisLoading: true });
          const data = await fetchHorizonsEphemeris(targetId);
          set((s) => ({
            ephemerisByTarget: { ...s.ephemerisByTarget, [targetId]: data },
            ephemerisLoading: false,
            mission: {
              ...s.mission,
              simulation: {
                ...s.mission.simulation,
                logs: appendMissionLogs(s.mission.simulation.logs, [
                  createMissionLogEntry({
                    stage: s.mission.simulation.currentStage,
                    category: 'telemetry',
                    severity: data.isLive ? 'nominal' : 'info',
                    title: `Ephemeris Acquired: ${data.targetName}`,
                    detail: `${data.sourceLabel} · Heliocentric range ${data.rangeAu} AU at ${data.speedKms} km/s.`,
                    metricSnapshot: `${data.rangeAu} AU`,
                  }),
                ]),
              },
            },
          }));
        },

        hydrateCampaignFromServer: async () => {
          const currentUid = getFirebaseAuth()?.currentUser?.uid ?? null;
          const cloudData = await hydrateFromCloudOrLocal(currentUid);
          const remote = await fetchCampaignHistory();
          set((s) => {
            const byId = new Map<string, CampaignRecord>();
            for (const c of [...(cloudData.campaigns ?? []), ...(remote.campaigns ?? []), ...s.campaigns]) {
              byId.set(c.id, c);
            }
            const achSet = new Set([
              ...s.unlockedAchievements,
              ...(cloudData.achievements ?? []),
              ...(remote.unlockedAchievements ?? []),
            ]);

            const modById = new Map<string, PlanetaryBaseModule>();
            for (const m of [...(remote.baseModules ?? []), ...s.baseModules]) {
              modById.set(m.id, m);
            }

            const remoteCareer = cloudData.career || remote.career;
            const bestCareer =
              remoteCareer && remoteCareer.xp > s.career.xp ? remoteCareer : s.career;

            return {
              campaigns: Array.from(byId.values()).slice(0, 50),
              unlockedAchievements: Array.from(achSet),
              baseModules: Array.from(modById.values()),
              career: bestCareer,
            };
          });
        },

        updatePreferences: (patch) => {
          set((s) => ({ preferences: { ...s.preferences, ...patch } }));
        },

        setSocketConnected: (connected) => set({ socketConnected: connected }),

        setSquadSession: (squad, memberId) => {
          set((s) => {
            const mergedMods = new Map<string, PlanetaryBaseModule>();
            for (const m of [...s.baseModules, ...(squad?.sharedBaseModules ?? [])]) {
              mergedMods.set(m.id, m);
            }
            const mergedSci = new Map<string, ScienceRecord>();
            for (const r of [...(squad?.sharedDiscoveries ?? []), ...s.scienceRecords]) {
              mergedSci.set(r.id, r);
            }
            return {
              squad,
              myMemberId: memberId,
              baseModules: squad ? Array.from(mergedMods.values()) : s.baseModules,
              scienceRecords: squad ? Array.from(mergedSci.values()).slice(0, 120) : s.scienceRecords,
              mission: squad
                ? syncMissionDerived({
                    ...squad.mission,
                    simulation: {
                      ...squad.mission.simulation,
                      logs: appendMissionLogs(squad.mission.simulation.logs, [
                        createMissionLogEntry({
                          stage: squad.mission.simulation.currentStage,
                          category: 'event',
                          severity: 'nominal',
                          title: `Squad Room Connected: ${squad.code}`,
                          detail: `${squad.members.length} crew member(s) synchronized in ${squad.name}.`,
                          metricSnapshot: squad.code,
                        }),
                      ]),
                    },
                  })
                : s.mission,
              unlockedAchievements: squad
                ? Array.from(new Set([...s.unlockedAchievements, 'ach-squad-cmd']))
                : s.unlockedAchievements,
            };
          });
        },

        applyRemoteSquadState: (squad) => {
          set((s) => {
            const mergedMods = new Map<string, PlanetaryBaseModule>();
            for (const m of [...s.baseModules, ...(squad.sharedBaseModules ?? [])]) {
              mergedMods.set(m.id, m);
            }
            const mergedSci = new Map<string, ScienceRecord>();
            for (const r of [...(squad.sharedDiscoveries ?? []), ...s.scienceRecords]) {
              mergedSci.set(r.id, r);
            }
            return {
              squad,
              mission: syncMissionDerived(squad.mission),
              baseModules: Array.from(mergedMods.values()),
              scienceRecords: Array.from(mergedSci.values()).slice(0, 120),
            };
          });
        },

        upsertRemotePlayer: (player) => {
          set((s) => ({
            remotePlayers: {
              ...s.remotePlayers,
              [player.memberId]: player,
            },
          }));
        },

        removeRemotePlayer: (memberId) => {
          set((s) => {
            if (!s.remotePlayers[memberId]) return s;
            const next = { ...s.remotePlayers };
            delete next[memberId];
            return { remotePlayers: next };
          });
        },

        updateAstronautCustomization: (patch) => {
          set((s) => ({
            astronautCustomization: { ...s.astronautCustomization, ...patch },
          }));
        },

        updateGameplaySettings: (patch) => {
          set((s) => ({
            gameplaySettings: {
              ...s.gameplaySettings,
              ...patch,
              keyBindings: patch.keyBindings
                ? { ...s.gameplaySettings.keyBindings, ...patch.keyBindings }
                : s.gameplaySettings.keyBindings,
            },
          }));
        },

        setGameModeAndMission: (mode, missionId) => {
          set({
            selectedGameMode: mode,
            selectedPlayableMission: missionId,
          });
        },

        addScienceRecord: (record) => {
          set((s) => {
            const nextCareer: CareerProfile = {
              ...s.career,
              xp: s.career.xp + 25,
              discoveriesLogged: s.career.discoveriesLogged + 1,
            };
            saveCareerProfileRemote(nextCareer);
            return {
              scienceRecords: [record, ...s.scienceRecords].slice(0, 120),
              career: nextCareer,
              mission: {
                ...s.mission,
                simulation: {
                  ...s.mission.simulation,
                  scienceCollectedPct: Math.min(100, s.mission.simulation.scienceCollectedPct + 5),
                },
              },
            };
          });
          if (get().squad) {
            emitSquadDiscoveryAdd(record);
          }
        },

        markAllScienceTransmitted: () => {
          const pending = get().scienceRecords.filter((r) => !r.transmitted).length;
          if (pending > 0) {
            set((s) => ({
              scienceRecords: s.scienceRecords.map((r) => ({ ...r, transmitted: true })),
              mission: {
                ...s.mission,
                simulation: {
                  ...s.mission.simulation,
                  scienceCollectedPct: Math.min(100, s.mission.simulation.scienceCollectedPct + pending * 12),
                },
              },
            }));
          }
          return pending;
        },

        buildBaseModule: ({ type, environment, x, z }) => {
          const res = validateAndCreateBaseModule({
            mission: get().mission,
            existingModules: get().baseModules,
            type,
            environment,
            x,
            z,
          });
          if (!res.ok || !res.module) {
            return res;
          }
          const newMod = res.module;
          const nextModules = [...get().baseModules, newMod];
          set({ baseModules: nextModules });
          saveBaseModulesRemote(nextModules);
          get().appendMissionLog({
            category: 'milestone',
            severity: 'nominal',
            title: `Base Constructed: ${newMod.name}`,
            detail: `Deployed on ${environment.toUpperCase()} at (${newMod.x}m, ${newMod.z}m) · ${newMod.massKg} kg.`,
            metricSnapshot: `${newMod.powerDeltaKw >= 0 ? '+' : ''}${newMod.powerDeltaKw} kW`,
          });
          if (get().squad) {
            void emitSquadBaseBuild({ type, environment, x, z });
          }
          return { ok: true, module: newMod };
        },

        updatePersistedRover: (env, rover) => {
          set((s) => ({
            rovers: {
              ...s.rovers,
              [env]: rover,
            },
          }));
        },

        syncFieldMissionToEngineering: ({ launchCompleted, scienceDeltaPct, note }) => {
          updateMissionAndSync((prev) => ({
            ...prev,
            simulation: {
              ...prev.simulation,
              currentStage:
                launchCompleted &&
                ['Mission Concept', 'Mission Design', 'Development', 'Testing'].includes(
                  prev.simulation.currentStage
                )
                  ? 'Launch'
                  : prev.simulation.currentStage,
              scienceCollectedPct: Math.min(
                100,
                prev.simulation.scienceCollectedPct + (scienceDeltaPct ?? 0)
              ),
              logs: appendMissionLogs(prev.simulation.logs, [
                createMissionLogEntry({
                  stage: prev.simulation.currentStage,
                  category: 'milestone',
                  severity: 'nominal',
                  title: launchCompleted ? 'Cockpit Launch Sequence Cleared' : 'Field Ops Sync',
                  detail: note,
                }),
              ]),
            },
          }));
        },

        applyApprovedAICommand: (rec) => {
          if (rec.actionType === 'mitigate-top-risk' && rec.payloadId) {
            get().mitigateRisk(rec.payloadId);
            return { ok: true, message: `Mitigated risk per Flight Director recommendation.` };
          }
          if (rec.actionType === 'pass-ready-gates') {
            get().passAllReadyPreLaunchGates();
            return { ok: true, message: `Executed automated pre-launch gate verification.` };
          }
          if (rec.actionType === 'switch-solars-or-rtg') {
            get().updateSpacecraft({ powerId: 'hybrid-solar-rtg', solarPanelAreaM2: 24 });
            return { ok: true, message: `Upgraded spacecraft bus to Hybrid Solar + RTG (24 m²).` };
          }
          if (rec.actionType === 'build-base-solar') {
            const targetEnv = get().mission.destinationId === 'moon' ? 'moon' : 'mars';
            const res = get().buildBaseModule({ type: 'solar-farm', environment: targetEnv, x: -8, z: 10 });
            return { ok: res.ok, message: res.ok ? `Solar Farm deployed on ${targetEnv.toUpperCase()}.` : res.error ?? 'Could not build Solar Farm.' };
          }
          if (rec.actionType === 'navigate-engineering') {
            get().setActiveView('engineering');
            return { ok: true, message: `Navigated to Systems Engineering console.` };
          }
          return { ok: true, message: `Acknowledged recommendation: ${rec.title}` };
        },

        recordPlayableMissionOutcome: ({ missionId, title, score, passed, scienceCount }) => {
          const mission = get().mission;
          const eng = computeSpacecraftEngineering(mission);
          const pctScore = Math.min(100, Math.round(score / 10));
          const grade: CampaignRecord['grade'] =
            !passed ? 'F' : pctScore >= 92 ? 'S' : pctScore >= 82 ? 'A' : pctScore >= 70 ? 'B' : 'C';

          const record: CampaignRecord = {
            id: `field-${missionId}-${Date.now()}`,
            missionName: `${title} (3D Field Ops)`,
            destinationId:
              missionId === 'lunar-explore'
                ? 'moon'
                : missionId === 'mars-explore'
                  ? 'mars'
                  : missionId === 'eva-repair'
                    ? 'leo'
                    : mission.destinationId,
            missionType: mission.missionType,
            score: pctScore,
            grade,
            passed,
            costMUsd: eng.totalEstimatedCostMUsd,
            durationDays: mission.durationDays,
            completedAt: new Date().toISOString(),
            failureReason: passed ? null : 'Suit life support failure during field operation.',
          };

          const newlyUnlocked: string[] = [];
          if (passed) {
            newlyUnlocked.push('ach-first-orbit');
            if (missionId === 'mars-explore') newlyUnlocked.push('ach-mars-explorer');
            if (get().squad) newlyUnlocked.push('ach-squad-cmd');
          }

          const domain: 'piloting' | 'eva' | 'science' | 'engineering' =
            missionId === 'launch-orbit'
              ? 'piloting'
              : missionId === 'eva-repair'
                ? 'eva'
                : missionId === 'station-prep'
                  ? 'engineering'
                  : 'science';

          const nextCareer = applyCareerProgressionOutcome(get().career, {
            passed,
            score: pctScore,
            scienceCount,
            baseModulesCount: get().baseModules.length,
            domain,
          });

          set((s) => {
            const doneSet = new Set(s.completedPlayableMissions);
            if (passed) doneSet.add(missionId);
            const achSet = new Set([...s.unlockedAchievements, ...newlyUnlocked]);
            return {
              campaigns: [record, ...s.campaigns].slice(0, 50),
              completedPlayableMissions: Array.from(doneSet),
              unlockedAchievements: Array.from(achSet),
              career: nextCareer,
              mission: {
                ...s.mission,
                simulation: {
                  ...s.mission.simulation,
                  scienceCollectedPct: Math.min(
                    100,
                    Math.max(s.mission.simulation.scienceCollectedPct, scienceCount * 20)
                  ),
                  logs: appendMissionLogs(s.mission.simulation.logs, [
                    createMissionLogEntry({
                      stage: s.mission.simulation.currentStage,
                      category: 'milestone',
                      severity: passed ? 'nominal' : 'critical',
                      title: `${title} — ${passed ? `Grade ${grade}` : 'Aborted'}`,
                      detail: `3D Field Ops completed (${pctScore}/100) · Career Rank: ${nextCareer.rank}.`,
                      metricSnapshot: `${score} pts`,
                    }),
                  ]),
                },
              },
            };
          });

          saveCampaignRecordRemote(record, newlyUnlocked);
          saveCareerProfileRemote(nextCareer);
          const currentUid = getFirebaseAuth()?.currentUser?.uid ?? null;
          void saveCampaignToCloud(currentUid, record, newlyUnlocked);
          void saveMissionRunToCloud(currentUid, { missionId, title, score, passed, scienceCount });
        },
      };
    },
    {
      name: 'orbital-command-storage-v1',
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<MissionStoreState>;
        return {
          ...currentState,
          ...persisted,
          career: {
            ...createInitialCareerProfile(),
            ...(persisted.career ?? {}),
            skills: {
              ...createInitialCareerProfile().skills,
              ...(persisted.career?.skills ?? {}),
            },
          },
          baseModules: Array.isArray(persisted.baseModules) ? persisted.baseModules : currentState.baseModules,
          rovers: {
            ...createInitialRovers(),
            ...(persisted.rovers ?? {}),
          },
          astronautCustomization: {
            ...DEFAULT_CUSTOMIZATION,
            ...(persisted.astronautCustomization ?? {}),
          },
          gameplaySettings: {
            ...DEFAULT_GAMEPLAY_SETTINGS,
            ...(persisted.gameplaySettings ?? {}),
            keyBindings: {
              ...DEFAULT_KEY_BINDINGS,
              ...(persisted.gameplaySettings?.keyBindings ?? {}),
            },
          },
        };
      },
      partialize: (state) => ({
        mission: state.mission,
        campaigns: state.campaigns,
        unlockedAchievements: state.unlockedAchievements,
        career: state.career,
        preferences: state.preferences,
        missionLogOpen: state.missionLogOpen,
        astronautCustomization: state.astronautCustomization,
        gameplaySettings: state.gameplaySettings,
        scienceRecords: state.scienceRecords,
        completedPlayableMissions: state.completedPlayableMissions,
        baseModules: state.baseModules,
        rovers: state.rovers,
      }),
    }
  )
);

export { SIMULATION_STAGES };
