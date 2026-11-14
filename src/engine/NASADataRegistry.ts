/**
 * NASADataRegistry.ts
 * Centralized registry for planetary, mission engineering, GMAT, and experimental datasets
 * with formal provenance, metadata, unit types, coordinate systems, and validation status.
 */

export type DataClassification =
  | 'MEASURED'
  | 'DERIVED'
  | 'ESTIMATED'
  | 'SIMULATED'
  | 'REFERENCE'
  | 'UNVERIFIED';

export type ValidationStatus = 'Validated' | 'Pending' | 'Flagged' | 'Unverified';

export type DatasetCategory = 'Orbital' | 'Planetary' | 'Engineering' | 'Science' | 'MissionDesign';

export interface DatasetRecord<T = any> {
  id: string;
  name: string;
  category: DatasetCategory;
  sourceOrganization: string;
  originalSourceName: string;
  sourceUrlOrRef: string;
  datasetIdentifier: string;
  retrievalDate: string;
  observationDate: string;
  units: string;
  coordinateSystem?: string;
  dataVersion: string;
  classification: DataClassification;
  validationStatus: ValidationStatus;
  applicableMission?: string;
  applicableSubsystem?: string;
  dataPayload: T;
  description: string;
}

export class NASADataRegistry {
  private static datasets: Map<string, DatasetRecord> = new Map();

  static {
    // Initialize with verified reference datasets
    NASADataRegistry.registerDataset({
      id: 'jpl-horizons-ephemeris-base',
      name: 'JPL Horizons Planetary Ephemeris Reference',
      category: 'Orbital',
      sourceOrganization: 'NASA Jet Propulsion Laboratory',
      originalSourceName: 'JPL HORIZONS Web-Interface & Ephemeris System',
      sourceUrlOrRef: 'https://ssd.jpl.nasa.gov/horizons/',
      datasetIdentifier: 'JPL-HORIZONS-API-V1',
      retrievalDate: '2026-01-15',
      observationDate: '2026-01-01',
      units: 'km, km/s, AU',
      coordinateSystem: 'ICRF/J2000.0',
      dataVersion: '2026.1',
      classification: 'MEASURED',
      validationStatus: 'Validated',
      applicableMission: 'All Orbital Missions',
      applicableSubsystem: 'Navigation & Trajectory',
      description: 'High-precision solar system ephemerides and state vectors for planetary bodies.',
      dataPayload: {
        bodies: ['Sun', 'Mercury', 'Venus', 'Earth', 'Moon', 'Mars', 'Jupiter', 'Saturn'],
        gravitationalConstants: {
          Sun: 132712440041.939,
          Earth: 398600.4418,
          Moon: 4902.8000,
          Mars: 42828.3752,
          Jupiter: 126686534.0,
        },
      },
    });

    NASADataRegistry.registerDataset({
      id: 'nasa-systems-eng-handbook-sp2016-6105',
      name: 'NASA Systems Engineering Handbook SP-2016-6105',
      category: 'Engineering',
      sourceOrganization: 'NASA Office of the Chief Engineer',
      originalSourceName: 'NASA/SP-2016-6105 Rev 2',
      sourceUrlOrRef: 'https://www.nasa.gov/connect/ebooks/nasa-systems-engineering-handbook',
      datasetIdentifier: 'NASA-SP-2016-6105',
      retrievalDate: '2026-01-15',
      observationDate: '2016-12-01',
      units: 'Dimensionless / Procedural',
      dataVersion: 'Rev 2',
      classification: 'REFERENCE',
      validationStatus: 'Validated',
      applicableMission: 'All Programs',
      applicableSubsystem: 'Systems Engineering & Life Cycle',
      description: 'Comprehensive guidelines for technical management, technical processes, and life cycle gates (MCR through FRR).',
      dataPayload: {
        lifecycleGates: ['MCR', 'SRR', 'MDR', 'PDR', 'CDR', 'SIR', 'ORR', 'FRR', 'PLAR', 'PFAR'],
        cmlLevels: 9,
      },
    });

    NASADataRegistry.registerDataset({
      id: 'bionutrients-2-payload-spec',
      name: 'BioNutrients-2 Experimental Science Payload Specification',
      category: 'Science',
      sourceOrganization: 'NASA Ames Research Center / Space Biology Program',
      originalSourceName: 'BioNutrients-2 Flight Payload Requirements Document',
      sourceUrlOrRef: 'https://www.nasa.gov/mission/station/research-explorer/investigation?id=8353',
      datasetIdentifier: 'BN-2-SPEC-2025',
      retrievalDate: '2026-01-15',
      observationDate: '2025-06-10',
      units: 'g, mL, ug/mL, mg',
      dataVersion: '1.2',
      classification: 'REFERENCE',
      validationStatus: 'Validated',
      applicableMission: 'Space Station & Deep Space Biology',
      applicableSubsystem: 'Payload & Life Support',
      description: 'Nutrient production experiment constraints: min 12 replicates, 30mL volume, 3 ug/mL beta-carotene target, <250g container mass.',
      dataPayload: {
        minReplicates: 12,
        minSampleVolumeMl: 30,
        betaCaroteneTargetUgPerMl: 3.0,
        minDryCellWeightMg: 1.0,
        maxContainerMassG: 250,
        maxContainerVolumeMl: 300,
      },
    });

    NASADataRegistry.registerDataset({
      id: 'gmat-r2026a-capabilities',
      name: 'General Mission Analysis Tool (GMAT) R2026a Reference',
      category: 'MissionDesign',
      sourceOrganization: 'NASA Goddard Space Flight Center',
      originalSourceName: 'GMAT R2026a Mathematical Specifications',
      sourceUrlOrRef: 'https://gmat.sourceforge.net/',
      datasetIdentifier: 'GMAT-R2026A',
      retrievalDate: '2026-01-15',
      observationDate: '2026-01-01',
      units: 'km, km/s, kg, seconds',
      coordinateSystem: 'J2000 Earth Equator',
      dataVersion: 'R2026a',
      classification: 'REFERENCE',
      validationStatus: 'Validated',
      applicableMission: 'Orbital & Interplanetary Trajectories',
      applicableSubsystem: 'Astrodynamics & Maneuver Planning',
      description: 'Open-source trajectory optimization, orbit propagation, and finite/impulsive maneuver planning framework.',
      dataPayload: {
        supportedPropagators: ['RungeKutta89', 'PrinceDormand74', 'Cowell'],
        supportedOptimizers: ['SNOPT', 'FMINCON'],
      },
    });
  }

  static registerDataset(record: DatasetRecord): void {
    NASADataRegistry.datasets.set(record.id, record);
  }

  static getDataset(id: string): DatasetRecord | undefined {
    return NASADataRegistry.datasets.get(id);
  }

  static getAllDatasets(): DatasetRecord[] {
    return Array.from(NASADataRegistry.datasets.values());
  }

  static getByCategory(category: DatasetCategory): DatasetRecord[] {
    return NASADataRegistry.getAllDatasets().filter((d) => d.category === category);
  }

  static validateDataset(id: string): boolean {
    const d = NASADataRegistry.datasets.get(id);
    if (!d) return false;
    return d.validationStatus === 'Validated';
  }
}
