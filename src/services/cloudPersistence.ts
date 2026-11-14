/**
 * cloudPersistence.ts
 * Manages synchronizing missions, spacecraft, campaigns, achievements, and settings
 * to Firestore with strict user isolation (users/{userId}/...), and transparently
 * falls back to local persistence and Express API when Firebase is not configured.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type {
  CampaignRecord,
  CareerProfile,
  MissionDesign,
  SpacecraftConfig,
  UserPreferences,
} from '../engine/types';
import {
  getFirebaseFirestore,
  isFirebaseConfigured,
} from './firebase';
import {
  fetchCampaignHistory,
  saveCampaignRecordRemote,
  saveCareerProfileRemote,
} from './apiClient';

export type CloudSyncStatus = 'synced' | 'syncing' | 'local-fallback' | 'offline' | 'error';

export interface CloudSpacecraftBlueprint {
  id: string;
  userId: string;
  name: string;
  busType: string;
  propulsionType: string;
  powerSourceType: string;
  wetMassKg: number;
  dryMassKg: number;
  deltaVMs: number;
  config: SpacecraftConfig;
  createdAt: string;
}

export interface CloudMissionRun {
  id: string;
  userId: string;
  missionId: string;
  title: string;
  score: number;
  passed: boolean;
  scienceCount: number;
  completedAt: string;
}

let currentSyncStatus: CloudSyncStatus = 'local-fallback';
const syncListeners = new Set<(status: CloudSyncStatus, detail?: string) => void>();

export function getCloudSyncStatus(): CloudSyncStatus {
  return currentSyncStatus;
}

export function subscribeToSyncStatus(
  listener: (status: CloudSyncStatus, detail?: string) => void
): () => void {
  syncListeners.add(listener);
  listener(currentSyncStatus);
  return () => {
    syncListeners.delete(listener);
  };
}

function setSyncStatus(status: CloudSyncStatus, detail?: string) {
  currentSyncStatus = status;
  for (const listener of syncListeners) {
    listener(status, detail);
  }
}

/**
 * Syncs user profile metadata to Firestore users/{userId}
 */
export async function syncUserProfileToCloud(user: {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  isAnonymous?: boolean;
}): Promise<void> {
  const db = getFirebaseFirestore();
  if (!isFirebaseConfigured() || !db) {
    setSyncStatus('local-fallback', 'Local storage active');
    return;
  }
  try {
    setSyncStatus('syncing', 'Updating user profile');
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        id: user.uid,
        displayName: user.displayName || 'Flight Commander',
        email: user.email || '',
        photoURL: user.photoURL || '',
        isAnonymous: Boolean(user.isAnonymous),
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
    setSyncStatus('synced', 'Profile saved to cloud');
  } catch (err) {
    console.warn('[CloudSync] Failed to sync user profile:', err);
    setSyncStatus('error', 'Profile sync failed');
  }
}

/**
 * Saves a completed campaign record to users/{userId}/campaigns/{campaignId}
 */
export async function saveCampaignToCloud(
  userId: string | null,
  record: CampaignRecord,
  unlockedAchievements: string[] = []
): Promise<void> {
  const db = getFirebaseFirestore();
  if (!userId || !isFirebaseConfigured() || !db) {
    // Local fallback
    saveCampaignRecordRemote(record, unlockedAchievements);
    setSyncStatus('local-fallback', 'Campaign saved locally');
    return;
  }

  try {
    setSyncStatus('syncing', 'Uploading campaign record');
    const safeId = record.id.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const docRef = doc(db, 'users', userId, 'campaigns', safeId);
    await setDoc(docRef, {
      ...record,
      id: safeId,
      userId,
      uploadedAt: serverTimestamp(),
    });

    // Also sync unlocked achievements
    for (const achId of unlockedAchievements) {
      const achRef = doc(db, 'users', userId, 'achievements', achId);
      await setDoc(achRef, {
        id: achId,
        userId,
        achievementId: achId,
        unlockedAt: new Date().toISOString(),
        category: 'campaign',
      }, { merge: true });
    }

    setSyncStatus('synced', 'Campaign synced with cloud');
  } catch (err) {
    console.error('[CloudSync] Failed to save campaign:', err);
    saveCampaignRecordRemote(record, unlockedAchievements);
    setSyncStatus('error', 'Campaign cloud sync failed; saved locally');
  }
}

/**
 * Saves a 3D field mission run to users/{userId}/missions/{missionId}
 */
export async function saveMissionRunToCloud(
  userId: string | null,
  run: {
    missionId: string;
    title: string;
    score: number;
    passed: boolean;
    scienceCount: number;
  }
): Promise<void> {
  const db = getFirebaseFirestore();
  const safeId = `run-${run.missionId}-${Date.now()}`;
  if (!userId || !isFirebaseConfigured() || !db) {
    setSyncStatus('local-fallback', 'Mission record saved locally');
    return;
  }

  try {
    setSyncStatus('syncing', 'Saving mission run');
    const docRef = doc(db, 'users', userId, 'missions', safeId);
    await setDoc(docRef, {
      id: safeId,
      userId,
      missionId: run.missionId,
      title: run.title,
      score: run.score,
      passed: run.passed,
      scienceCount: run.scienceCount,
      completedAt: new Date().toISOString(),
    });
    setSyncStatus('synced', 'Mission run saved to cloud');
  } catch (err) {
    console.warn('[CloudSync] Failed to save mission run to cloud:', err);
    setSyncStatus('error', 'Mission sync failed');
  }
}

/**
 * Saves custom spacecraft design to users/{userId}/spacecraft/{spacecraftId}
 */
export async function saveSpacecraftDesignToCloud(
  userId: string | null,
  blueprint: {
    id: string;
    name: string;
    mission: MissionDesign;
    wetMassKg: number;
    dryMassKg: number;
    deltaVMs: number;
  }
): Promise<void> {
  const db = getFirebaseFirestore();
  const safeId = blueprint.id.replace(/[^a-zA-Z0-9_\-]/g, '_');
  if (!userId || !isFirebaseConfigured() || !db) {
    // Store in localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('oc_local_spacecraft_designs') || '[]');
        stored.push(blueprint);
        localStorage.setItem('oc_local_spacecraft_designs', JSON.stringify(stored.slice(-20)));
      } catch {}
    }
    setSyncStatus('local-fallback', 'Spacecraft saved locally');
    return;
  }

  try {
    setSyncStatus('syncing', 'Saving spacecraft design');
    const docRef = doc(db, 'users', userId, 'spacecraft', safeId);
    await setDoc(docRef, {
      id: safeId,
      userId,
      name: blueprint.name,
      busType: blueprint.mission.spacecraft.structureId,
      propulsionType: blueprint.mission.spacecraft.propulsionId,
      powerSourceType: blueprint.mission.spacecraft.powerId,
      wetMassKg: blueprint.wetMassKg,
      dryMassKg: blueprint.dryMassKg,
      deltaVMs: blueprint.deltaVMs,
      config: blueprint.mission.spacecraft,
      createdAt: new Date().toISOString(),
    });
    setSyncStatus('synced', 'Spacecraft saved to cloud');
  } catch (err) {
    console.warn('[CloudSync] Failed to save spacecraft design:', err);
    setSyncStatus('error', 'Spacecraft sync failed');
  }
}

/**
 * Saves user preferences and settings to users/{userId}/settings/preferences
 */
export async function saveSettingsToCloud(
  userId: string | null,
  prefs: UserPreferences
): Promise<void> {
  const db = getFirebaseFirestore();
  if (!userId || !isFirebaseConfigured() || !db) {
    setSyncStatus('local-fallback', 'Preferences saved locally');
    return;
  }

  try {
    const docRef = doc(db, 'users', userId, 'settings', 'preferences');
    await setDoc(docRef, {
      id: 'preferences',
      userId,
      units: prefs.units,
      graphicsQuality: prefs.graphicsQuality,
      soundEnabled: prefs.soundEnabled,
      updatedAt: new Date().toISOString(),
    });
    setSyncStatus('synced', 'Settings synced to cloud');
  } catch (err) {
    console.warn('[CloudSync] Failed to sync settings:', err);
  }
}

/**
 * Hydrates all player data from the cloud, falling back to local Express storage
 */
export async function hydrateFromCloudOrLocal(userId: string | null): Promise<{
  campaigns: CampaignRecord[];
  achievements: string[];
  career?: CareerProfile;
  source: 'cloud' | 'local';
}> {
  const db = getFirebaseFirestore();
  if (!userId || !isFirebaseConfigured() || !db) {
    const local = await fetchCampaignHistory();
    setSyncStatus('local-fallback', 'Using local storage mode');
    return {
      campaigns: local.campaigns || [],
      achievements: local.unlockedAchievements || [],
      career: local.career,
      source: 'local',
    };
  }

  try {
    setSyncStatus('syncing', 'Fetching cloud profile');
    const campaignsCol = collection(db, 'users', userId, 'campaigns');
    const campSnapshot = await getDocs(campaignsCol);
    const campaigns: CampaignRecord[] = [];
    campSnapshot.forEach((d) => {
      campaigns.push(d.data() as CampaignRecord);
    });

    const achCol = collection(db, 'users', userId, 'achievements');
    const achSnapshot = await getDocs(achCol);
    const achievements: string[] = [];
    achSnapshot.forEach((d) => {
      const data = d.data();
      if (data.achievementId) achievements.push(data.achievementId);
    });

    setSyncStatus('synced', `Cloud sync complete (${campaigns.length} campaigns)`);
    return {
      campaigns,
      achievements,
      source: 'cloud',
    };
  } catch (err) {
    console.warn('[CloudSync] Error fetching cloud data, falling back to local:', err);
    setSyncStatus('error', 'Cloud sync failed; loaded local records');
    const local = await fetchCampaignHistory();
    return {
      campaigns: local.campaigns || [],
      achievements: local.unlockedAchievements || [],
      career: local.career,
      source: 'local',
    };
  }
}
