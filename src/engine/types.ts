export type MissionCategory =
  | 'Scientific Research'
  | 'Planetary Exploration'
  | 'Earth Observation'
  | 'Communication'
  | 'Navigation'
  | 'Human Spaceflight'
  | 'Astrophysics'
  | 'Planetary Defense'
  | 'Technology Demonstration'
  | 'Sample Return';

export type MissionType =
  | 'Flyby'
  | 'Orbiter'
  | 'Lander'
  | 'Rover'
  | 'Sample Return'
  | 'Space Telescope'
  | 'Crewed Mission'
  | 'Deep Space Probe'
  | 'Communication Satellite'
  | 'Earth Observation Satellite';

export type MissionDifficulty = 'Standard' | 'Realistic' | 'Veteran';

export type DestinationId =
  | 'leo'
  | 'geo'
  | 'moon'
  | 'mars'
  | 'venus'
  | 'jupiter'
  | 'ceres'
  | 'sun-earth-l2';

export type OrbitType =
  | 'Low Earth Orbit'
  | 'Medium Earth Orbit'
  | 'Geostationary Orbit'
  | 'Polar Orbit'
  | 'Sun-synchronous Orbit'
  | 'Lunar Orbit'
  | 'Mars Orbit'
  | 'Heliocentric Orbit'
  | 'Custom Orbit';

export type PropulsionType =
  | 'cold-gas'
  | 'monopropellant'
  | 'bipropellant'
  | 'cryogenic'
  | 'hall-electric'
  | 'ion-gridded';

export type PowerSourceType = 'solar-standard' | 'solar-high-eff' | 'rtg-nuclear' | 'hybrid-solar-rtg';

export type VerificationMethod = 'Test' | 'Analysis' | 'Inspection' | 'Demonstration';
export type VerificationStatus = 'Pending' | 'Passed' | 'Failed';
export type RiskSeverity = 'Low' | 'Moderate' | 'High' | 'Critical';

export type LifecyclePhase =
  | 'Pre-Phase A: Concept Studies'
  | 'Phase A: Concept & Tech Dev'
  | 'Phase B: Preliminary Design'
  | 'Phase C: Final Design & Fab'
  | 'Phase D: Assembly, Integration & Test'
  | 'Phase E: Operations & Sustainment'
  | 'Phase F: Closeout';

export type GateReviewCode =
  | 'MCR'
  | 'SRR'
  | 'MDR'
  | 'PDR'
  | 'CDR'
  | 'SIR'
  | 'ORR'
  | 'FRR'
  | 'PLAR'
  | 'PFAR';

export type SimulationStage =
  | 'Mission Concept'
  | 'Mission Design'
  | 'Development'
  | 'Testing'
  | 'Launch'
  | 'Cruise'
  | 'Operations'
  | 'End of Life';

export type SquadRole =
  | 'Mission Commander'
  | 'Mission Designer'
  | 'Spacecraft Engineer'
  | 'Propulsion Engineer'
  | 'Payload Scientist'
  | 'Navigation Specialist'
  | 'Risk and Safety Officer'
  | 'Pilot'
  | 'Engineer'
  | 'Scientist'
  | 'Mission Specialist';

export type AppView =
  | 'dashboard'
  | 'design'
  | 'orbital'
  | 'engineering'
  | 'control'
  | 'play'
  | 'squad'
  | 'results'
  | 'campaign'
  | 'settings';

export type DesignSubTab = 'brief' | 'spacecraft' | 'payloads' | 'launcher';

export interface DestinationSpec {
  id: DestinationId;
  name: string;
  horizonsCommand: string;
  bodyType: 'Planet' | 'Moon' | 'Orbit' | 'Small Body' | 'Lagrange Point';
  parentBody: 'Earth' | 'Sun';
  muKm3s2: number; // Gravitational parameter of target body (or Earth for Earth orbits)
  radiusKm: number; // Equatorial radius of target body
  orbitRadiusAu: number; // Heliocentric orbital radius in AU (1.0 for Earth/LEO/GEO/Moon)
  orbitalPeriodDays: number; // Heliocentric or Earth-orbit period
  surfaceGravityMs2: number;
  solarIrradianceWm2: number;
  minDeltaVFromLeoKms: number; // Typical educational reference total delta-v from LEO
  typicalTransferDays: number;
  defaultOrbitType: OrbitType;
  defaultTargetAltKm: number;
  recommendedPower: PowerSourceType;
  colorHex: string;
  atmosphereColorHex?: string;
  visualDistanceScene: number; // 3D scene distance units
  visualRadiusScene: number; // 3D scene radius units
  description: string;
  scienceHighlights: string[];
  sourceNote: string;
}

export interface StructureSpec {
  id: string;
  name: string;
  compatibleTypes: MissionType[];
  baseDryMassKg: number;
  structuralMassKg: number;
  avionicsMassKg: number;
  thermalBaseMassKg: number;
  commsBaseMassKg: number;
  navigationBaseMassKg: number;
  attitudeBaseMassKg: number;
  basePowerDrawW: number;
  maxPayloadMassKg: number;
  costMUsd: number;
  description: string;
}

export interface PropulsionSpec {
  id: PropulsionType;
  name: string;
  ispSeconds: number;
  thrustNewtons: number;
  dryMassKg: number;
  powerDrawW: number;
  tankMassFraction: number; // Tank structural mass per kg of propellant
  costMUsd: number;
  suitability: string;
  sourceNote: string;
}

export interface PowerSpec {
  id: PowerSourceType;
  name: string;
  baseOutputAt1AuW: number; // For solar, scales with 1/AU^2; for RTG, constant
  isSolar: boolean;
  massKg: number;
  costMUsd: number;
  description: string;
}

export interface PayloadSpec {
  id: string;
  name: string;
  category: 'Imaging' | 'Spectroscopy' | 'Fields & Particles' | 'Comms' | 'Sample & Surface' | 'Astrophysics';
  massKg: number;
  powerW: number;
  peakPowerW: number;
  dataRateMbps: number;
  costMUsd: number;
  scienceValue: number;
  compatibleMissionTypes: MissionType[];
  compatibleDestinations: DestinationId[] | 'all';
  purpose: string;
  operationalNotes: string;
}

export interface LaunchVehicleSpec {
  id: string;
  name: string;
  provider: string;
  leoCapacityKg: number;
  gtoCapacityKg: number;
  tliCapacityKg: number;
  marsTmiCapacityKg: number;
  outerPlanetCapacityKg: number;
  fairingDiameterM: number;
  fairingHeightM: number;
  referenceCostMUsd: number;
  costConfidence: 'Published Reference' | 'Estimated Reference';
  reliabilityRating: number; // 0 to 1 educational reference
  dataDate: string;
  sourceNote: string;
  description: string;
}

export interface SpacecraftConfig {
  structureId: string;
  propulsionId: PropulsionType;
  powerId: PowerSourceType;
  solarPanelAreaM2: number;
  batteryCapacityWh: number;
  propellantMassKg: number;
  commsTier: 'S-Band' | 'X-Band' | 'Ka-Band Deep Space' | 'Optical Laser';
  thermalTier: 'Passive MLI' | 'Active Louvers & Heaters' | 'Cryo-Cooler';
  navigationTier: 'Star Tracker + IMU' | 'Deep Space Autonomous Optical' | 'Terrain Relative Nav';
  attitudeControl: 'Reaction Wheels + RCS' | 'CMG High-Torque' | 'Cold Gas Precision';
  redundancyLevel: 'Single-String' | 'Selective Redundancy' | 'Full Fault-Tolerant';
}

export interface OrbitalPlanConfig {
  orbitType: OrbitType;
  departureAltitudeKm: number;
  targetAltitudeKm: number;
  inclinationDeg: number;
  eccentricity: number;
  aerobrakingAssisted: boolean;
  contingencyDeltaVPercent: number;
}

export interface RequirementItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: 'Mass' | 'Power' | 'Orbital' | 'Science' | 'Budget' | 'Safety';
  priority: 'Mandatory' | 'High' | 'Target';
  targetDisplay: string;
  actualDisplay: string;
  verificationMethod: VerificationMethod;
  status: VerificationStatus;
  objectiveLink: string;
  manualVerified: boolean;
}

export interface RiskItem {
  id: string;
  code: string;
  title: string;
  description: string;
  probability: number; // 1-5
  consequence: number; // 1-5
  score: number;
  severity: RiskSeverity;
  mitigationStrategy: string;
  mitigationCostMUsd: number;
  mitigated: boolean;
  residualScore: number;
  ownerRole: SquadRole;
}

export interface GateReview {
  code: GateReviewCode;
  name: string;
  lifecyclePhase: LifecyclePhase;
  passed: boolean;
  blockedReasons: string[];
  reviewedAt?: string;
}

export interface TradeStudyOption {
  id: string;
  label: string;
  performanceScore: number;
  costScore: number;
  massScore: number;
  riskScore: number;
  weightedTotal: number;
  notes: string;
}

export interface TradeStudyResult {
  topic: 'Propulsion' | 'Launch Vehicle' | 'Power System';
  winnerId: string;
  explanation: string;
  options: TradeStudyOption[];
}

export type MissionLogCategory = 'event' | 'telemetry' | 'milestone';

export interface MissionEventLog {
  id: string;
  timestamp: string;
  stage: SimulationStage;
  category?: MissionLogCategory;
  title: string;
  detail: string;
  severity: 'info' | 'nominal' | 'caution' | 'critical';
  decisionMade?: string;
  metricSnapshot?: string;
}

export interface SimulationDecisionOption {
  id: string;
  label: string;
  effectSummary: string;
  deltaVCostKms?: number;
  powerDeltaPct?: number;
  scienceDelta?: number;
  riskDelta?: number;
  budgetDeltaMUsd?: number;
  successBias: number; // probability modifier or direct outcome
}

export interface ActiveSimEvent {
  id: string;
  stage: SimulationStage;
  title: string;
  prompt: string;
  options: SimulationDecisionOption[];
}

export interface MissionSimulationState {
  currentStage: SimulationStage;
  stageProgressPct: number;
  countdownSeconds: number;
  isLaunching: boolean;
  launchSequenceStep: string;
  missionElapsedDays: number;
  fuelRemainingPct: number;
  batteryChargePct: number;
  commsLinkPct: number;
  thermalTempC: number;
  scienceCollectedPct: number;
  objectivesCompleted: string[];
  activeEvent: ActiveSimEvent | null;
  failed: boolean;
  failureReason: string | null;
  failedStage: SimulationStage | null;
  completed: boolean;
  endOfLifeOption: 'Deorbit' | 'Disposal Orbit' | 'Controlled Impact' | 'Safe Shutdown' | null;
  logs: MissionEventLog[];
}

export interface MissionDesign {
  id: string;
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
  successCriteria: string[];
  selectedPayloadIds: string[];
  launchVehicleId: string;
  spacecraft: SpacecraftConfig;
  orbitalPlan: OrbitalPlanConfig;
  requirements: RequirementItem[];
  risks: RiskItem[];
  gates: GateReview[];
  simulation: MissionSimulationState;
  createdAt: string;
  updatedAt: string;
}

export interface SpacecraftEngineeringSummary {
  structureMassKg: number;
  subsystemsMassKg: number;
  propulsionDryMassKg: number;
  powerHardwareMassKg: number;
  payloadMassKg: number;
  dryMassKg: number;
  propellantMassKg: number;
  wetMassKg: number;
  launcherCapacityKg: number;
  massMarginKg: number;
  massMarginPct: number;
  isMassValid: boolean;
  powerGeneratedW: number;
  averagePowerDrawW: number;
  peakPowerDrawW: number;
  powerMarginW: number;
  powerMarginPct: number;
  isPowerValid: boolean;
  eclipseCapacityHours: number;
  availableDeltaVKms: number;
  spacecraftCostMUsd: number;
  payloadCostMUsd: number;
  launchCostMUsd: number;
  operationsCostMUsd: number;
  mitigationCostMUsd: number;
  subtotalCostMUsd: number;
  contingencyReserveMUsd: number;
  contingencyPct: number;
  totalEstimatedCostMUsd: number;
  budgetRemainingMUsd: number;
  isBudgetValid: boolean;
}

export interface OrbitalCalculationSummary {
  originBody: string;
  targetBody: string;
  parkingOrbitVelocityKms: number;
  earthEscapeVelocityKms: number;
  targetCircularVelocityKms: number;
  targetEscapeVelocityKms: number;
  targetOrbitalPeriodHours: number;
  hohmannDepartureDeltaVKms: number;
  hohmannArrivalDeltaVKms: number;
  marginAndCorrectionDeltaVKms: number;
  totalRequiredDeltaVKms: number;
  estimatedTransferDays: number;
  deltaVMarginKms: number;
  isDeltaVSufficient: boolean;
  assumptions: string[];
  dataProvenance: string;
}

export interface NasaEphemerisData {
  targetId: DestinationId;
  targetName: string;
  horizonsCommand: string;
  epochTdb: string;
  referenceFrame: string;
  timeScale: string;
  units: string;
  positionKm: { x: number; y: number; z: number };
  positionAu: { x: number; y: number; z: number };
  velocityKms: { vx: number; vy: number; vz: number };
  rangeAu: number;
  speedKms: number;
  sourceStatus: 'live' | 'cached' | 'fallback-curated';
  isLive: boolean;
  sourceLabel: string;
  retrievedAt: string;
  rawSnippet?: string;
}

export interface MissionScoreBreakdown {
  engineeringEfficiency: number;
  scienceAchievement: number;
  riskGovernance: number;
  budgetDiscipline: number;
  requirementsVerification: number;
  totalScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  passedMission: boolean;
  summaryNotes: string[];
}

export interface CampaignRecord {
  id: string;
  missionName: string;
  destinationId: DestinationId;
  missionType: MissionType;
  score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  passed: boolean;
  costMUsd: number;
  durationDays: number;
  completedAt: string;
  failureReason?: string | null;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  category: 'Exploration' | 'Engineering' | 'Operations' | 'Teamwork';
}

export interface SquadMember {
  id: string;
  name: string;
  role: SquadRole;
  isLeader: boolean;
  online: boolean;
  joinedAt: string;
}

export interface SquadChatMessage {
  id: string;
  senderName: string;
  senderRole: SquadRole;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface SquadState {
  code: string;
  name: string;
  leaderId: string;
  members: SquadMember[];
  mission: MissionDesign;
  chat: SquadChatMessage[];
  sharedCompletedObjectives?: string[];
  sharedDiscoveries?: ScienceRecord[];
  sharedBaseModules?: PlanetaryBaseModule[];
  updatedAt: string;
}

export interface UserPreferences {
  units: 'SI' | 'SI + AU';
  graphicsQuality: 'High' | 'Balanced';
  soundEnabled: boolean;
  showOrbitalAssumptions: boolean;
}

// =============================================================================
// 3D THIRD-PERSON GAMEPLAY & EXPLORATION TYPES
// =============================================================================

export type GameMode =
  | 'career'
  | 'free-explore'
  | 'challenges'
  | 'coop'
  | 'training'
  | 'sandbox';

export type EnvironmentId = 'station' | 'spacecraft' | 'moon' | 'mars' | 'orbital-eva';

export type CameraMode =
  | 'third-person'
  | 'close-inspect'
  | 'first-person'
  | 'rover'
  | 'spacecraft-ext';

export type CharacterAnimationState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'sprint'
  | 'jump'
  | 'fall'
  | 'land'
  | 'crouch'
  | 'turn'
  | 'interact'
  | 'collect'
  | 'instrument'
  | 'repair'
  | 'console'
  | 'climb'
  | 'enter'
  | 'exit'
  | 'carry'
  | 'wave'
  | 'emergency';

export type AstronautSuitPreset =
  | 'white-exploration'
  | 'dark-mission'
  | 'scientific-research'
  | 'eva-suit'
  | 'engineering-suit';

export interface AstronautCustomization {
  characterName: string;
  characterArchetype: 'standard' | 'slim';
  suitPreset: AstronautSuitPreset;
  primaryColor: string;
  accentColor: string;
  helmetStyle: 'gold-visor' | 'cyan-hud' | 'polarized-dark';
  backpackStyle: 'plss-standard' | 'eva-thruster' | 'science-rack';
  missionPatch: 'ARES' | 'ARTEMIS' | 'EVA' | 'ORBITAL';
  accessory: 'none' | 'chest-cam' | 'antenna-whip' | 'shoulder-beacon';
}

export type EquipmentId =
  | 'camera'
  | 'sample-container'
  | 'hammer'
  | 'drill'
  | 'spectrometer'
  | 'repair-tool'
  | 'comms'
  | 'flashlight'
  | 'emergency-o2'
  | 'nav-device';

export interface EquipmentSpec {
  id: EquipmentId;
  name: string;
  shortLabel: string;
  category: 'Science' | 'Engineering' | 'Survival' | 'Navigation';
  massKg: number;
  powerDrawPct: number;
  description: string;
  animationOnUse: CharacterAnimationState;
}

export interface InventoryItemState {
  id: EquipmentId;
  quantity: number;
  durabilityPct: number;
  active: boolean;
}

export interface SurvivalTelemetry {
  oxygenPct: number;
  suitPressureKpa: number;
  co2Pct: number;
  suitIntegrityPct: number;
  oxygenLeakPerSec: number;
  batteryPct: number;
  temperatureC: number;
  healthPct: number;
  radiationMsv: number;
  commsSignalPct: number;
  tetherDistanceM: number;
  rcsFuelPct: number;
  inSafeZone: boolean;
  warnings: string[];
}

export type PlayableMissionId =
  | 'station-prep'
  | 'launch-orbit'
  | 'lunar-explore'
  | 'mars-explore'
  | 'eva-repair';

export interface MissionObjectiveStep {
  id: string;
  order: number;
  title: string;
  description: string;
  targetEnv: EnvironmentId;
  targetInteractableId?: string;
  requiredEquipment?: EquipmentId;
  hint: string;
  completed: boolean;
}

export interface ScienceRecord {
  id: string;
  sampleId: string;
  title: string;
  sampleType: 'Rock' | 'Regolith Core' | 'Volatile Ice' | 'Mineral Spectrum' | 'Imagery' | 'Atmospheric Dust';
  environment: EnvironmentId;
  locationLabel: string;
  coordinates: { x: number; y: number; z: number };
  timestamp: string;
  instrument: string;
  measurement: string;
  unit: string;
  researchValue: number;
  missionRef: string;
  sourceLabel: 'Simulated Mission Instrument Data';
  objectiveLink: string;
  transmitted: boolean;
}

export interface RoverState {
  id: string;
  name: string;
  environment: EnvironmentId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speedMs: number;
  wheelSpin: number;
  steerAngle: number;
  batteryPct: number;
  integrityPct: number;
  distanceKm: number;
  storedSamplesCount: number;
  occupiedByLocal: boolean;
}

export interface RemotePlayer3DState {
  memberId: string;
  name: string;
  role: SquadRole;
  environmentId: EnvironmentId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  animState: CharacterAnimationState;
  equippedItem: EquipmentId | null;
  inVehicle: boolean;
  flashlightOn: boolean;
  customization: AstronautCustomization;
  updatedAt: number;
}

export interface KeyBindings {
  forward: string;
  backward: string;
  left: string;
  right: string;
  sprint: string;
  jump: string;
  crouch: string;
  interact: string;
  useEquipment: string;
  refillTool: string;
  flashlight: string;
  toggleCamera: string;
  shoulderSwap: string;
  map: string;
  inventory: string;
  objectives: string;
  pause: string;
}

export interface GameplaySettings {
  cameraSensitivity: number;
  cameraDistance: number;
  shoulderSide: 'right' | 'left';
  invertY: boolean;
  mobileLeftHanded: boolean;
  showTouchControls: 'auto' | 'always' | 'off';
  hudShowTelemetry: boolean;
  hudShowObjectives: boolean;
  hudShowMinimap: boolean;
  keyBindings: KeyBindings;
}

export type BaseModuleType =
  | 'habitat'
  | 'solar-farm'
  | 'comms-tower'
  | 'research-lab'
  | 'storage-module'
  | 'landing-pad'
  | 'rover-garage'
  | 'life-support';

export interface PlanetaryBaseModule {
  id: string;
  type: BaseModuleType;
  name: string;
  environment: 'moon' | 'mars';
  x: number;
  z: number;
  massKg: number;
  powerDeltaKw: number; // + generates power, - consumes power
  builtAt: string;
  integrityPct: number;
}

export interface CockpitState {
  engineIgnited: boolean;
  throttlePct: number;
  attitudeMode: 'prograde' | 'retrograde' | 'nadir' | 'manual';
  pitchDeg: number;
  yawDeg: number;
  rollDeg: number;
  altitudeKm: number;
  velocityKms: number;
  fuelPct: number;
  powerPct: number;
  lifeSupportNominal: boolean;
  commsLocked: boolean;
  dockedToStation: boolean;
  emergencyShutdown: boolean;
  launchStepIndex: number; // 0..10 for playable launch sequence
  launchSequenceActive: boolean;
  launchCompleted: boolean;
}

export type DynamicEventType =
  | 'solar-storm'
  | 'dust-storm'
  | 'o2-leak'
  | 'comms-blackout'
  | 'rover-fault'
  | 'power-shortage'
  | 'science-anomaly'
  | 'rescue-beacon';

export interface DynamicEventChoice {
  id: string;
  label: string;
  effectSummary: string;
  oxygenDelta?: number;
  batteryDelta?: number;
  co2Delta?: number;
  integrityDelta?: number;
  roverIntegrityDelta?: number;
  scienceBonus?: number;
  scoreDelta?: number;
  clearHazard?: boolean;
}

export interface DynamicWorldEvent {
  id: string;
  type: DynamicEventType;
  title: string;
  cause: string;
  severity: 'caution' | 'critical' | 'nominal';
  environment: EnvironmentId;
  triggeredAtMs: number;
  active: boolean;
  choices: DynamicEventChoice[];
}

export interface CareerProfile {
  xp: number;
  rank: 'Candidate' | 'Flight Specialist' | 'Mission Engineer' | 'Senior Commander' | 'Chief Astronaut';
  reputation: number;
  missionsFlown: number;
  discoveriesLogged: number;
  skills: {
    piloting: number;
    evaOps: number;
    science: number;
    engineering: number;
  };
}

export interface AICommanderRecommendation {
  id: string;
  title: string;
  description: string;
  actionType:
    | 'mitigate-top-risk'
    | 'pass-ready-gates'
    | 'switch-solars-or-rtg'
    | 'activate-emergency-o2'
    | 'build-base-solar'
    | 'navigate-engineering';
  payloadId?: string;
}

export interface AICommanderReply {
  reply: string;
  source: 'gemini-api' | 'local-flight-director';
  recommendations: AICommanderRecommendation[];
}

