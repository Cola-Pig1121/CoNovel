/**
 * Tauri Environment Detection and Invoke Wrapper
 *
 * Uses window.__TAURI__ directly at runtime.
 * No @tauri-apps/api import needed at build time.
 */

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

export async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  // Access Tauri invoke directly from the global object
  const tauri = (window as any).__TAURI__;
  return tauri.core.invoke(cmd, args) as Promise<T>;
}
