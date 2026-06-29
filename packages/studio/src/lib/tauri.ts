/**
 * Tauri Environment Detection and Invoke Wrapper
 *
 * Tauri v2 injects __TAURI__ into the webview, but it may not be
 * available immediately on page load. We check multiple signals
 * and also support a retry mechanism for components.
 */

export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  // Check for Tauri v2 global objects
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window;
}

export async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  const tauri = (window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__;
  return tauri.core.invoke(cmd, args) as Promise<T>;
}

/**
 * Wait for Tauri to be ready (polls with timeout)
 */
export async function waitForTauri(timeoutMs = 3000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isTauri()) return true;
    await new Promise(r => setTimeout(r, 100));
  }
  return isTauri();
}
