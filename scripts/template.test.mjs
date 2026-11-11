import assert from 'node:assert/strict';
import test from 'node:test';
import { futureWeekday, seed } from '../.neander/seed.mjs';

test('seed rejects missing configuration before contacting a database', async () => {
  await assert.rejects(seed({ password: 'valid-test-secret' }), /DATABASE_URL/);
  await assert.rejects(seed({ databaseUrl: 'postgresql://invalid.invalid/test' }), /DEMO_HOST_PASSWORD/);
  await assert.rejects(seed({ databaseUrl: 'postgresql://invalid.invalid/test', password: 'short' }), /at least 12/);
});

test('sample meetings use UTC workdays across weekends and year boundaries', () => {
  assert.equal(futureWeekday(2, new Date('2026-12-31T23:59:00-08:00')).toISOString(), '2027-01-04T10:00:00.000Z');
  assert.equal(futureWeekday(2, new Date('2026-11-06T23:00:00Z')).toISOString(), '2026-11-09T10:00:00.000Z');
});
