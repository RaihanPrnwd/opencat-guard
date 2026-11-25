import { GuardConfig, GuardSessionState, SecurityEvent } from '../types';
import { ViolationScorer } from './scorer';
import { SyncQueue } from './sync-queue';
import { ActivityMonitor } from './monitor';

export class CatGuard {
  private config: GuardConfig;
  private scorer: ViolationScorer;
  private queue: SyncQueue;
  private monitor: ActivityMonitor;
  private state: GuardSessionState;
  private listeners: Array<(state: GuardSessionState, latest: SecurityEvent) => void> = [];

  constructor(config: GuardConfig) {
    this.config = {
      strictMode: true,
      requireFullscreen: false,
      warnThreshold: 30,
      lockThreshold: 60,
      ...config,
    };

    this.scorer = new ViolationScorer(this.config);
    this.queue = new SyncQueue(this.config.apiEndpoint, this.config.syncIntervalMs);
    this.state = {
      sessionId: this.config.sessionId,
      candidateId: this.config.candidateId,
      score: 0,
      status: 'active',
      violations: [],
      startedAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    this.monitor = new ActivityMonitor(this.config, (event) => this.handleEvent(event));
  }

  start(): void {
    this.monitor.start();
  }

  stop(): void {
    this.monitor.stop();
    this.queue.destroy();
  }

  getState(): GuardSessionState {
    return { ...this.state, violations: [...this.state.violations] };
  }

  getAuditLog(): SecurityEvent[] {
    return [...this.state.violations];
  }

  onViolation(cb: (state: GuardSessionState, latest: SecurityEvent) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== cb);
    };
  }

  handleEvent(rawEvent: SecurityEvent): void {
    const points = this.scorer.getPoints(rawEvent.type);
    const enrichedEvent: SecurityEvent = { ...rawEvent, points };

    this.state.score += points;
    this.state.lastActiveAt = Date.now();
    this.state.violations.push(enrichedEvent);
    this.state.status = this.scorer.evaluateState(this.state.score);

    this.queue.enqueue(enrichedEvent);

    for (const listener of this.listeners) {
      try {
        listener(this.getState(), enrichedEvent);
      } catch {
        // Safe dispatch: errors in consumer callbacks must not crash exam logic
      }
    }
  }

  requestFullscreen(): Promise<void> {
    if (typeof document !== 'undefined' && document.documentElement?.requestFullscreen) {
      return document.documentElement.requestFullscreen();
    }
    return Promise.resolve();
  }
}
