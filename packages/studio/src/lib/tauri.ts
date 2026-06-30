/**
 * Tauri Environment Detection and Invoke Wrapper
 *
 * Tauri v2 injects __TAURI__ into the webview.
 * Supports retry for components that load before Tauri is ready.
 */

export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  const t = (window as any).__TAURI__;
  const i = (window as any).__TAURI_INTERNALS__;
  return !!(t && t.core && typeof t.core.invoke === 'function') || !!(i && i.invoke);
}

export async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  const tauri = (window as any).__TAURI__;
  if (tauri && tauri.core && typeof tauri.core.invoke === 'function') {
    return tauri.core.invoke(cmd, args) as Promise<T>;
  }
  // Fallback: __TAURI_INTERNALS__ (Tauri v2 alternative)
  const internals = (window as any).__TAURI_INTERNALS__;
  if (internals && typeof internals.invoke === 'function') {
    return internals.invoke(cmd, args) as Promise<T>;
  }
  throw new Error('Tauri API not available');
}

export async function waitForTauri(timeoutMs = 3000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isTauri()) return true;
    await new Promise(r => setTimeout(r, 100));
  }
  return isTauri();
}
