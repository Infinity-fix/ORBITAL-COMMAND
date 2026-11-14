import test from 'node:test';
import assert from 'node:assert';
import { NASADataRegistry } from './NASADataRegistry';
import { NASADataSourceManager } from './NASADataSourceManager';

test('NASADataRegistry manages datasets with metadata and validation', () => {
  const ds = NASADataRegistry.getDataset('bionutrients-2-payload-spec');
  assert.ok(ds, 'BioNutrients-2 dataset exists');
  assert.strictEqual(ds?.validationStatus, 'Validated');
  assert.strictEqual(ds?.classification, 'REFERENCE');
  assert.strictEqual(ds?.dataPayload.minReplicates, 12);
  assert.strictEqual(ds?.dataPayload.minSampleVolumeMl, 30);
});

test('NASADataSourceManager singleton provides cached datasets and hydration', async () => {
  const manager = NASADataSourceManager.getInstance();
  assert.ok(manager, 'Singleton instance exists');

  const { record, isStale, source } = manager.getDatasetWithCache('nasa-systems-eng-handbook-sp2016-6105');
  assert.ok(record, 'System engineering handbook record returned');
  assert.strictEqual(isStale, false);
  assert.ok(source);

  const hydration = await manager.hydrateMissionPlanner('mars');
  assert.ok(hydration, 'Hydration object returned');
  assert.ok(hydration.provenance);
});
