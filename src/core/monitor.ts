import { ViolationType, SecurityEvent, GuardConfig } from '../types';

export type EventCallback = (event: SecurityEvent) => void;

export class ActivityMonitor {
  private config: GuardConfig;
  private onViolation: EventCallback;
  private cleanups: Array<() => void> = [];
  private blurTimestamp = 0;
  private lastDimensions = { w: 0, h: 0 };

  constructor(config: GuardConfig, onViolation: EventCallback) {
    this.config = config;
    this.onViolation = onViolation;
  }

  start(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this.lastDimensions = { w: window.innerWidth, h: window.innerHeight };

    this.bind(document, 'visibilitychange', () => {
      if (document.hidden) {
        this.emit('TAB_HIDDEN', { status: 'hidden' });
      }
    });

    this.bind(window, 'blur', () => {
      this.blurTimestamp = Date.now();
      this.emit('WINDOW_BLUR', { type: 'blur' });
    });

    this.bind(window, 'focus', () => {
      if (this.blurTimestamp > 0) {
        const awayMs = Date.now() - this.blurTimestamp;
        this.blurTimestamp = 0;
        this.emit('WINDOW_BLUR', { type: 'focus_restored', durationMs: awayMs });
      }
    });

    this.bind(document, 'fullscreenchange', () => {
      if (!document.fullscreenElement && this.config.requireFullscreen) {
        this.emit('FULLSCREEN_EXIT', { isFullscreen: false });
      }
    });

    this.bind(window, 'resize', () => {
      const wDiff = Math.abs(window.innerWidth - this.lastDimensions.w);
      const hDiff = Math.abs(window.innerHeight - this.lastDimensions.h);
      if (wDiff > 100 || hDiff > 100) {
        this.emit('DISPLAY_METRIC_CHANGE', {
          current: { w: window.innerWidth, h: window.innerHeight },
          previous: this.lastDimensions,
        });
        this.lastDimensions = { w: window.innerWidth, h: window.innerHeight };
      }
    });

    const blockInputs = ['copy', 'paste', 'cut'];
    for (const action of blockInputs) {
      this.bind(document, action, (e: Event) => {
        if (this.config.strictMode) e.preventDefault();
        this.emit('CLIPBOARD_ACCESS', { action });
      });
    }

    this.bind(document, 'contextmenu', (e: Event) => {
      if (this.config.strictMode) e.preventDefault();
      this.emit('CONTEXT_MENU', {});
    });

    this.bind(window, 'keydown', (e: Event) => {
      const ke = e as KeyboardEvent;
      const key = ke.key.toUpperCase();
      const isCtrlOrMeta = ke.ctrlKey || ke.metaKey;

      const suspectShortcuts = ['I', 'J', 'C', 'U', 'S', 'P'];
      const isF12 = key === 'F12';
      const isDevShortcut = isCtrlOrMeta && ke.shiftKey && suspectShortcuts.includes(key);
      const isViewSource = isCtrlOrMeta && (key === 'U' || key === 'S' || key === 'P');

      if (isF12 || isDevShortcut || isViewSource) {
        if (this.config.strictMode) ke.preventDefault();
        this.emit('BLOCKED_SHORTCUT', { key: ke.key, ctrl: ke.ctrlKey, meta: ke.metaKey, alt: ke.altKey });
      }
    });
  }

  stop(): void {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
  }

  private bind(target: EventTarget, type: string, handler: (e: Event) => void): void {
    target.addEventListener(type, handler as EventListener, true);
    this.cleanups.push(() => target.removeEventListener(type, handler as EventListener, true));
  }

  private emit(type: ViolationType, details?: Record<string, unknown>): void {
    const event: SecurityEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sessionId: this.config.sessionId,
      candidateId: this.config.candidateId,
      type,
      points: 0,
      timestamp: Date.now(),
      details,
    };
    this.onViolation(event);
  }
}
