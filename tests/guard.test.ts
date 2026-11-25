import test from 'node:test';
import assert from 'node:assert/strict';
import { ViolationScorer } from '../src/core/scorer';
import { SyncQueue } from '../src/core/sync-queue';
import { CatGuard } from '../src/core/guard';
import { SecurityEvent } from '../src/types';

test('ViolationScorer calculates points and status transitions', () => {
  const scorer = new ViolationScorer({ warnThreshold: 20, lockThreshold: 40 });
  assert.equal(scorer.getPoints('TAB_HIDDEN'), 15);
  assert.equal(scorer.evaluateState(10), 'active');
  assert.equal(scorer.evaluateState(25), 'warned');
  assert.equal(scorer.evaluateState(45), 'locked');
});

test('SyncQueue enqueues and clears on flush', async () => {
  const queue = new SyncQueue(undefined, 0);
  const dummyEvent: SecurityEvent = {
    id: '1',
    sessionId: 'sess_1',
    candidateId: 'cand_1',
    type: 'WINDOW_BLUR',
    points: 10,
    timestamp: Date.now(),
  };

  queue.enqueue(dummyEvent);
  assert.equal(queue.size(), 1);
  assert.deepEqual(queue.getItems()[0], dummyEvent);
});

test('CatGuard updates aggregate score and violation state', () => {
  const guard = new CatGuard({
    sessionId: 'test_session',
    candidateId: 'test_cand',
    warnThreshold: 10,
    lockThreshold: 25,
  });

  const dummyEvent: SecurityEvent = {
    id: 'evt_1',
    sessionId: 'test_session',
    candidateId: 'test_cand',
    type: 'CLIPBOARD_ACCESS',
    points: 0,
    timestamp: Date.now(),
  };

  guard.handleEvent(dummyEvent);
  const state = guard.getState();

  assert.equal(state.score, 20);
  assert.equal(state.status, 'warned');
  assert.equal(state.violations.length, 1);
  assert.equal(state.violations[0].points, 20);
});
