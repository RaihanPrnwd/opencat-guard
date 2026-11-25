export type ViolationType =
  | 'TAB_HIDDEN'
  | 'WINDOW_BLUR'
  | 'FULLSCREEN_EXIT'
  | 'CLIPBOARD_ACCESS'
  | 'CONTEXT_MENU'
  | 'BLOCKED_SHORTCUT'
  | 'DISPLAY_METRIC_CHANGE'
  | 'DEVTOOLS_SUSPECT';

export type GuardAction = 'allow' | 'warn' | 'lock';

export interface GuardConfig {
  sessionId: string;
  candidateId: string;
  apiEndpoint?: string;
  syncIntervalMs?: number;
  strictMode?: boolean;
  lockThreshold?: number;
  warnThreshold?: number;
  weights?: Partial<Record<ViolationType, number>>;
  allowedShortcuts?: string[];
  requireFullscreen?: boolean;
}

export interface SecurityEvent {
  id: string;
  sessionId: string;
  candidateId: string;
  type: ViolationType;
  points: number;
  timestamp: number;
  details?: Record<string, unknown>;
}

export interface GuardSessionState {
  sessionId: string;
  candidateId: string;
  score: number;
  status: 'active' | 'warned' | 'locked';
  violations: SecurityEvent[];
  startedAt: number;
  lastActiveAt: number;
}
