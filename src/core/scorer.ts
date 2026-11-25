import { ViolationType, GuardConfig } from '../types';

export const DEFAULT_WEIGHTS: Record<ViolationType, number> = {
  TAB_HIDDEN: 15,
  WINDOW_BLUR: 10,
  FULLSCREEN_EXIT: 25,
  CLIPBOARD_ACCESS: 20,
  CONTEXT_MENU: 5,
  BLOCKED_SHORTCUT: 15,
  DISPLAY_METRIC_CHANGE: 10,
  DEVTOOLS_SUSPECT: 30,
};

export class ViolationScorer {
  private weights: Record<ViolationType, number>;
  private warnThreshold: number;
  private lockThreshold: number;

  constructor(config: Partial<GuardConfig> = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...(config.weights || {}) };
    this.warnThreshold = config.warnThreshold ?? 30;
    this.lockThreshold = config.lockThreshold ?? 60;
  }

  getPoints(type: ViolationType): number {
    return this.weights[type] ?? 10;
  }

  evaluateState(totalScore: number): 'active' | 'warned' | 'locked' {
    if (totalScore >= this.lockThreshold) return 'locked';
    if (totalScore >= this.warnThreshold) return 'warned';
    return 'active';
  }
}
