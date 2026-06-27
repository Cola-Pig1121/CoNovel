/**
 * Tauri Environment Detection and Invoke Wrapper
 *
 * Detects if running in Tauri desktop or browser,
 * and provides unified invoke interface.
 */

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

export async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}
