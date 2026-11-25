# OpenCAT Guard (`@raihanprnwd/cat-shield`)

> Modular, privacy-preserving client-side telemetry and exam integrity monitoring engine for Computer Assisted Test (CAT) web platforms.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Repository](https://img.shields.io/badge/GitHub-RaihanPrnwd%2Fopencat--guard-green)](https://github.com/RaihanPrnwd/opencat-guard)

---

## Overview

**OpenCAT Guard** provides client-side integrity monitoring for online test-taking platforms. It measures exam engagement anomalies (tab switching, window focus loss, unauthorized shortcut interception, screen metrics tampering) without installing invasive kernel-level drivers or reading files outside browser sandbox limits.

### Core Philosophy
- **Client signals are heuristics**: Client detections are treated as audit telemetry, not definitive proof of malpractice.
- **Fail-safe execution**: Monitoring errors must never disrupt candidate exam flow or cause test submission failures.
- **Batch sync & offline resilience**: Telemetry events buffer in memory and flush periodically to prevent network spamming.

---

## Features

- **Tab & Window Focus Tracking**: Detects `visibilitychange` events and tracks window blur duration down to the millisecond.
- **Input & Shortcut Guard**: Intercepts `Ctrl+C`, `Ctrl+V`, right-click context menus, Developer Tool triggers (`F12`, `Ctrl+Shift+I/J/C`), and source view (`Ctrl+U`).
- **Display Anomaly Hooks**: Logs large viewport resolution changes (indicative of multi-monitor dragging, split-screen snapping, or screen casting).
- **Weighted Violation Scoring**: Assigns point penalties per violation type with customizable warning (`warn`) and session termination (`lock`) thresholds.
- **Telemetry Batch Queue**: Buffers structured audit JSON payloads and dispatches them with retry handling via `fetch`.
- **Framework Agnostic**: Pure TypeScript core with optional vanilla DOM adapters, React hook compatibility, and Electron support.

---

## Architecture

```
OpenCAT Guard
│
├── core/
│   ├── monitor.ts      # Browser DOM & window event interceptors
│   ├── scorer.ts       # Point accumulator & threshold state evaluator
│   ├── sync-queue.ts   # In-memory batch sync dispatcher with retry fallback
│   └── guard.ts        # Central orchestrator & lifecycle engine
│
├── adapters/
│   └── vanilla.ts      # Zero-dependency status badge widget
│
└── types/
    └── index.ts        # Event schemas, session state, and config interfaces
```

---

## Installation

```bash
npm install
npm run build
```

---

## Quick Start

### 1. Programmatic Engine Setup

```typescript
import { CatGuard, SecurityEvent, GuardSessionState } from './src';

const guard = new CatGuard({
  sessionId: 'exam-sess-4891',
  candidateId: 'cand-0912',
  strictMode: true,          // Intercepts & prevents default input events
  warnThreshold: 30,         // Points required to trigger warning
  lockThreshold: 60,         // Points required to lock session
  apiEndpoint: '/api/v1/telemetry/audit',
  syncIntervalMs: 5000,
});

// Subscribe to real-time anomalies
guard.onViolation((state: GuardSessionState, latest: SecurityEvent) => {
  console.warn(`[Anomaly: ${latest.type}] Current Score: ${state.score}`);

  if (state.status === 'warned') {
    alert('Warning: Excessive window focus switching recorded.');
  }

  if (state.status === 'locked') {
    // Notify CAT backend to lock exam input
    fetch('/api/v1/exam/lock', { credentials: 'include' });
  }
});

// Start interceptors
guard.start();

// Cleanup on exam submit
// guard.stop();
```

### 2. Vanilla UI Badge Integration

```typescript
import { attachVanillaGuard } from './src/adapters/vanilla';

const { guard } = attachVanillaGuard({
  sessionId: 'exam-sess-4891',
  candidateId: 'cand-0912',
  strictMode: true,
}, {
  onWarn: (pts) => console.log('Warn threshold reached:', pts),
  onLock: () => alert('Exam locked due to multiple security violations.'),
});
```

---

## Default Violation Scoring Matrix

| Event Type | Points | Trigger Condition |
| :--- | :--- | :--- |
| `DEVTOOLS_SUSPECT` | **30** | Developer tool shortcut combo pressed (`F12`, `Ctrl+Shift+I`, etc.) |
| `FULLSCREEN_EXIT` | **25** | Candidate leaves required fullscreen mode |
| `CLIPBOARD_ACCESS` | **20** | Copy, cut, or paste operations invoked |
| `TAB_HIDDEN` | **15** | Browser tab switched or document visibility state changed |
| `BLOCKED_SHORTCUT` | **15** | Page source (`Ctrl+U`) or print preview invoked |
| `WINDOW_BLUR` | **10** | Window loses active focus to background OS process |
| `DISPLAY_METRIC_CHANGE` | **10** | Window size changes abruptly by >100px |
| `CONTEXT_MENU` | **5** | Right-click context menu triggered |

---

## Verification & Testing

Node 20+ native test runner is used (no heavy test frameworks required):

```bash
# Build TypeScript artifacts
npm run build

# Execute unit test suites
npm test
```

---

## Security Model & Limitations

1. **Client Trust Boundary**: Client-side JavaScript cannot defend against browser extensions, modified Chromium runtimes, or external physical devices.
2. **Backend Validation Required**: Every client violation log must be verified against server-side session heartbeats and exam question submission timestamps.
3. **Privacy First**: No webcam capture, microphone access, browser history queries, or persistent filesystem reads are performed.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Maintained by [Raihanprnwd](https://github.com/RaihanPrnwd).
