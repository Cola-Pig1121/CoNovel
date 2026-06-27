/**
 * Unified API Layer
 *
 * Provides a single interface for both Tauri (desktop) and Web (browser).
 * In Tauri mode, calls Rust commands via invoke().
 * In Web mode, calls Next.js API Routes via fetch().
 */

import { isTauri, tauriInvoke } from './tauri';

// ===== URL to Command mapping =====
// Maps REST-style API routes to Tauri command names and arguments

function urlToCommand(url: string, method: string, body?: unknown): { name: string; args: Record<string, unknown> } {
  // Books
  if (url === '/api/books' && method === 'GET') return { name: 'list_books', args: {} };
  if (url === '/api/books' && method === 'POST') return { name: 'create_book', args: body || {} };

  const bookMatch = url.match(/^\/api\/books\/([^/]+)$/);
  if (bookMatch) {
    const id = bookMatch[1];
    if (method === 'GET') return { name: 'get_book', args: { book_id: id } };
    if (method === 'PUT') return { name: 'update_book', args: { book_id: id, updates: body } };
    if (method === 'DELETE') return { name: 'delete_book', args: { book_id: id } };
  }

  // Chapters
  const chapterMatch = url.match(/^\/api\/books\/([^/]+)\/chapters\/(\d+)$/);
  if (chapterMatch) {
    const [, bookId, num] = chapterMatch;
    if (method === 'GET') return { name: 'get_chapter', args: { book_id: bookId, chapter_number: parseInt(num) } };
    if (method === 'PUT') return { name: 'save_chapter', args: { book_id: bookId, chapter_number: parseInt(num), ...((body || {}) as Record<string, unknown>) } };
  }

  const chaptersListMatch = url.match(/^\/api\/books\/([^/]+)\/chapters$/);
  if (chaptersListMatch && method === 'GET') return { name: 'list_chapters', args: { book_id: chaptersListMatch[1] } };
  if (chaptersListMatch && method === 'POST') return { name: 'create_chapter', args: { book_id: chaptersListMatch[1], ...((body || {}) as Record<string, unknown>) } };

  // Characters
  const charMatch = url.match(/^\/api\/books\/([^/]+)\/characters$/);
  if (charMatch && method === 'GET') return { name: 'list_books', args: { book_id: charMatch[1] } }; // Fallback

  // Config
  if (url === '/api/config?type=providers' && method === 'GET') return { name: 'get_providers', args: {} };
  if (url === '/api/config?type=agents' && method === 'GET') return { name: 'get_agent_configs', args: {} };

  // Pipeline
  if (url === '/api/pipeline' && method === 'GET') return { name: 'get_all_pipelines', args: {} };

  // Knowledge
  if (url.startsWith('/api/knowledge')) return { name: 'search_knowledge', args: {} };

  // Naming
  if (url === '/api/naming' && method === 'POST') return { name: 'generate_names', args: body || {} };

  // For unknown routes, return the URL as-is for Web mode fallback
  return { name: '', args: {} };
}

// ===== Unified API Interface =====

export const api = {
  /**
   * GET request
   */
  async get<T = any>(url: string): Promise<T> {
    if (isTauri()) {
      const { name, args } = urlToCommand(url, 'GET');
      if (name) return tauriInvoke<T>(name, args);
      throw new Error(`Unknown route: ${url}`);
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  },

  /**
   * POST request
   */
  async post<T = any>(url: string, body?: unknown): Promise<T> {
    if (isTauri()) {
      const { name, args } = urlToCommand(url, 'POST', body);
      if (name) return tauriInvoke<T>(name, args);
      throw new Error(`Unknown route: ${url}`);
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  },

  /**
   * PUT request
   */
  async put<T = any>(url: string, body?: unknown): Promise<T> {
    if (isTauri()) {
      const { name, args } = urlToCommand(url, 'PUT', body);
      if (name) return tauriInvoke<T>(name, args);
      throw new Error(`Unknown route: ${url}`);
    }
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  },

  /**
   * DELETE request
   */
  async del<T = any>(url: string, body?: unknown): Promise<T> {
    if (isTauri()) {
      const { name, args } = urlToCommand(url, 'DELETE', body);
      if (name) return tauriInvoke<T>(name, args);
      throw new Error(`Unknown route: ${url}`);
    }
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  },
};
