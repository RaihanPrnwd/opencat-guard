import { SecurityEvent } from '../types';

export class SyncQueue {
  private queue: SecurityEvent[] = [];
  private endpoint?: string;
  private timer: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;

  constructor(endpoint?: string, intervalMs = 5000) {
    this.endpoint = endpoint;
    if (this.endpoint && intervalMs > 0) {
      this.timer = setInterval(() => this.flush(), intervalMs);
    }
  }

  enqueue(event: SecurityEvent): void {
    this.queue.push(event);
  }

  size(): number {
    return this.queue.length;
  }

  getItems(): SecurityEvent[] {
    return [...this.queue];
  }

  async flush(): Promise<boolean> {
    if (!this.endpoint || this.queue.length === 0 || this.isSyncing) {
      return false;
    }

    this.isSyncing = true;
    const batch = [...this.queue];

    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch, sentAt: Date.now() }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      this.queue.splice(0, batch.length);
      return true;
    } catch {
      // ponytail: in-memory queue only; add indexedDB persistence if offline survives page reloads.
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
