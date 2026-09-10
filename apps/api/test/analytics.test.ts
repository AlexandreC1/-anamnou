import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocalAnalytics, type AnalyticsEvent } from '../src/analytics.js';
test('local analytics emits only the allowlisted event fields', () => {
  const events: AnalyticsEvent[] = [];
  const analytics = new LocalAnalytics((event) => events.push(event));
  const input = {
    name: 'foundation.readiness' as const,
    outcome: 'available' as const,
    extra: 'must not be logged',
  };
  analytics.track(input);
  assert.deepEqual(events, [
    { name: 'foundation.readiness', outcome: 'available' },
  ]);
});
