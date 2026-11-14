import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isFirebaseConfigured,
  getFirebaseAuth,
  getFirebaseFirestore,
  testConnection,
} from './firebase';
import {
  getCloudSyncStatus,
  subscribeToSyncStatus,
  saveCampaignToCloud,
  saveMissionRunToCloud,
  saveSpacecraftDesignToCloud,
  hydrateFromCloudOrLocal,
} from './cloudPersistence';
import type { CampaignRecord } from '../engine/types';

test('Firebase service gracefully handles unconfigured state', async () => {
  const configured = isFirebaseConfigured();
  assert.equal(typeof configured, 'boolean');

  // When unconfigured, auth and db should be null without runtime crash
  if (!configured) {
    assert.equal(getFirebaseAuth(), null);
    assert.equal(getFirebaseFirestore(), null);

    const testRes = await testConnection();
    assert.equal(testRes.ok, false);
    assert.match(testRes.message, /local storage mode/i);
  }
});

test('CloudPersistence provides local fallback and status subscription', async () => {
  const initialStatus = getCloudSyncStatus();
  assert.ok(['local-fallback', 'synced', 'offline'].includes(initialStatus));

  let notifiedStatus = '';
  const unsubscribe = subscribeToSyncStatus((status) => {
    notifiedStatus = status;
  });

  assert.ok(notifiedStatus.length > 0);
  unsubscribe();
});

test('saveCampaignToCloud and saveMissionRunToCloud fall back gracefully without throwing', async () => {
  const mockCampaign: CampaignRecord = {
    id: `test-camp-${Date.now()}`,
    missionName: 'Test Mars Observer',
    destinationId: 'mars',
    missionType: 'Orbiter',
    score: 95,
    grade: 'A',
    passed: true,
    costMUsd: 450,
    durationDays: 250,
    completedAt: new Date().toISOString(),
  };

  // Should not throw even when userId is null or credentials are unconfigured
  await assert.doesNotReject(async () => {
    await saveCampaignToCloud(null, mockCampaign, ['ach-first-orbit']);
  });

  await assert.doesNotReject(async () => {
    await saveMissionRunToCloud(null, {
      missionId: 'station-prep',
      title: 'Station Preparation',
      score: 100,
      passed: true,
      scienceCount: 3,
    });
  });

  await assert.doesNotReject(async () => {
    await saveSpacecraftDesignToCloud(null, {
      id: 'sc-test-1',
      name: 'Test Explorer Bus',
      mission: {
        spacecraft: {
          structureId: 'medium-standard',
          propulsionId: 'bipropellant',
          powerId: 'solar-flexible',
        },
      } as any,
      wetMassKg: 1800,
      dryMassKg: 850,
      deltaVMs: 3200,
    });
  });
});

test('hydrateFromCloudOrLocal retrieves data with fallback source', async () => {
  const result = await hydrateFromCloudOrLocal(null);
  assert.ok(Array.isArray(result.campaigns));
  assert.ok(Array.isArray(result.achievements));
  assert.equal(result.source, 'local');
});
