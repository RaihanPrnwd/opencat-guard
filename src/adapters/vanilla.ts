import { CatGuard } from '../core/guard';
import { GuardConfig, GuardSessionState } from '../types';

export interface VanillaUIOptions {
  containerId?: string;
  onLock?: () => void;
  onWarn?: (points: number) => void;
}

export function attachVanillaGuard(
  config: GuardConfig,
  options: VanillaUIOptions = {}
): { guard: CatGuard; banner: HTMLElement | null } {
  const guard = new CatGuard(config);
  let banner: HTMLElement | null = null;

  if (typeof document !== 'undefined') {
    banner = document.createElement('div');
    banner.id = 'cat-guard-indicator';
    banner.style.cssText =
      'position:fixed;bottom:12px;right:12px;padding:8px 14px;border-radius:6px;font-family:sans-serif;font-size:12px;font-weight:600;z-index:999999;transition:all 0.2s ease;';
    banner.textContent = 'Shield Active (0 pts)';
    banner.style.backgroundColor = '#10B981';
    banner.style.color = '#FFFFFF';

    const parent = options.containerId ? document.getElementById(options.containerId) : document.body;
    if (parent) parent.appendChild(banner);

    guard.onViolation((state: GuardSessionState) => {
      if (!banner) return;
      banner.textContent = `Shield: ${state.status.toUpperCase()} (${state.score} pts)`;

      if (state.status === 'warned') {
        banner.style.backgroundColor = '#F59E0B';
        if (options.onWarn) options.onWarn(state.score);
      } else if (state.status === 'locked') {
        banner.style.backgroundColor = '#EF4444';
        if (options.onLock) options.onLock();
      }
    });
  }

  guard.start();
  return { guard, banner };
}
