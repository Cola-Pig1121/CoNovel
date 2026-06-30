import { isTauri, tauriInvoke } from './tauri';

/**
 * Unified API Layer
 * Tauri mode → Rust Commands
 * Static export mode → Tauri Commands (no API routes needed)
 */

function urlToCommand(url: string, method: string, body?: unknown): { name: string; args: Record<string, unknown> } {
  const a: Record<string, unknown> = {};
  const b = (body || a) as Record<string, unknown>;

  // === Books ===
  if (url === '/api/books' && method === 'GET') return { name: 'list_books', args: a };
  if (url === '/api/books' && method === 'POST') return { name: 'create_book', args: b };

  const bookM = url.match(/^\/api\/books\/([^/?]+)$/);
  if (bookM) {
    const id = bookM[1];
    if (method === 'GET') return { name: 'get_book', args: { book_id: id } };
    if (method === 'PUT') return { name: 'update_book', args: { book_id: id, updates: b } };
    if (method === 'DELETE') return { name: 'delete_book', args: { book_id: id } };
  }

  // === Chapters ===
  const chM = url.match(/^\/api\/books\/([^/?]+)\/chapters\/(\d+)$/);
  if (chM) {
    if (method === 'GET') return { name: 'get_chapter', args: { book_id: chM[1], chapter_number: parseInt(chM[2]) } };
    if (method === 'PUT') return { name: 'save_chapter', args: { book_id: chM[1], chapter_number: parseInt(chM[2]), ...b } };
  }
  const chsM = url.match(/^\/api\/books\/([^/?]+)\/chapters(\?|$)/);
  if (chsM) {
    if (method === 'GET') return { name: 'list_chapters', args: { book_id: chsM[1] } };
    if (method === 'POST') return { name: 'create_chapter', args: { book_id: chsM[1], ...b } };
  }

  // === Characters ===
  const charM = url.match(/^\/api\/books\/([^/?]+)\/characters$/);
  if (charM) {
    if (method === 'GET') return { name: 'get_book', args: { book_id: charM[1] } }; // Characters stored in state
    if (method === 'POST') return { name: 'update_book', args: { book_id: charM[1], updates: { add_character: b } } };
  }
  const charDelM = url.match(/^\/api\/books\/([^/?]+)\/characters\/([^/?]+)$/);
  if (charDelM && method === 'DELETE') return { name: 'update_book', args: { book_id: charDelM[1], updates: { delete_character: charDelM[2] } } };

  // === Foreshadowing ===
  const fsM = url.match(/^\/api\/books\/([^/?]+)\/foreshadowing$/);
  if (fsM) {
    if (method === 'GET') return { name: 'get_book', args: { book_id: fsM[1] } };
    if (method === 'POST') return { name: 'update_book', args: { book_id: fsM[1], updates: { add_foreshadowing: b } } };
  }

  // === Timeline ===
  const tlM = url.match(/^\/api\/books\/([^/?]+)\/timeline$/);
  if (tlM) {
    if (method === 'GET') return { name: 'get_book', args: { book_id: tlM[1] } };
    if (method === 'POST') return { name: 'update_book', args: { book_id: tlM[1], updates: { add_timeline: b } } };
  }

  // === Style ===
  const stM = url.match(/^\/api\/books\/([^/?]+)\/style$/);
  if (stM) {
    if (method === 'GET') return { name: 'get_book', args: { book_id: stM[1] } };
    if (method === 'PUT') return { name: 'update_book', args: { book_id: stM[1], updates: { style: b } } };
  }

  // === Constraints ===
  const conM = url.match(/^\/api\/books\/([^/?]+)\/constraints(\?|$)/);
  if (conM) {
    if (method === 'GET') {
      const fileParam = url.match(/[?&]file=([^&]+)/);
      if (fileParam) return { name: 'get_constraint_file', args: { book_id: conM[1], name: fileParam[1] } };
      return { name: 'list_constraints', args: { book_id: conM[1] } };
    }
    if (method === 'PUT') return { name: 'save_constraint_file', args: { book_id: conM[1], ...b } };
    if (method === 'POST') return { name: 'create_constraint_file', args: { book_id: conM[1], ...b } };
    if (method === 'DELETE') return { name: 'delete_constraint_file', args: { book_id: conM[1], ...b } };
  }

  // === Reference ===
  const refM = url.match(/^\/api\/books\/([^/?]+)\/reference\/upload$/);
  if (refM && method === 'POST') return { name: 'upload_reference_file', args: { book_id: refM[1], ...b } };
  const refM2 = url.match(/^\/api\/books\/([^/?]+)\/reference(\?|$)/);
  if (refM2) {
    if (method === 'GET') return { name: 'list_references', args: { book_id: refM2[1] } };
    if (method === 'POST') return { name: 'save_reference_meta', args: { book_id: refM2[1], ...b } };
    if (method === 'DELETE') return { name: 'delete_reference_file', args: { book_id: refM2[1], ...b } };
  }

  // === Hooks ===
  const hkM = url.match(/^\/api\/books\/([^/?]+)\/hooks$/);
  if (hkM && method === 'GET') return { name: 'get_book', args: { book_id: hkM[1] } };

  // === Reading Power ===
  const rpM = url.match(/^\/api\/books\/([^/?]+)\/reading-power$/);
  if (rpM && method === 'GET') return { name: 'get_book', args: { book_id: rpM[1] } };

  // === Pipeline ===
  if (url === '/api/pipeline' && method === 'GET') return { name: 'get_all_pipelines', args: a };
  const pcM = url.match(/^\/api\/books\/([^/?]+)\/pipeline-control$/);
  if (pcM) {
    if (method === 'GET') return { name: 'get_pipeline_state', args: { book_id: pcM[1] } };
    if (method === 'POST') return { name: 'control_pipeline', args: { book_id: pcM[1], ...b } };
  }

  // === Write ===
  const wrM = url.match(/^\/api\/books\/([^/?]+)\/write$/);
  if (wrM) {
    if (method === 'GET') return { name: 'get_write_status', args: { book_id: wrM[1] } };
    if (method === 'POST') return { name: 'start_pipeline', args: { book_id: wrM[1], ...b } };
  }

  // === Memory ===
  const memM = url.match(/^\/api\/books\/([^/?]+)\/memory$/);
  if (memM && method === 'GET') return { name: 'get_book', args: { book_id: memM[1] } };

  // === Graph ===
  const grM = url.match(/^\/api\/books\/([^/?]+)\/graph$/);
  if (grM && method === 'GET') return { name: 'get_book', args: { book_id: grM[1] } };

  // === Config ===
  if (url.startsWith('/api/config') && method === 'GET') {
    if (url.includes('providers')) return { name: 'get_providers', args: a };
    if (url.includes('agents')) return { name: 'get_agent_configs', args: a };
    return { name: 'get_providers', args: a };
  }
  if (url === '/api/config' && method === 'PUT') return { name: 'save_providers', args: b };

  // === Models ===
  if (url === '/api/models/discover' && method === 'POST') return { name: 'scan_models', args: b };

  // === Naming ===
  if (url === '/api/naming' && method === 'POST') return { name: 'generate_names', args: b };

  // === Knowledge ===
  if (url.startsWith('/api/knowledge')) return { name: 'search_knowledge', args: a };

  return { name: '', args: a };
}

export const api = {
  async get<T = any>(url: string): Promise<T> {
    if (isTauri()) {
      const { name, args } = urlToCommand(url, 'GET');
      if (name) return tauriInvoke<T>(name, args);
    }
    throw new Error(`Route not available: ${url}`);
  },

  async post<T = any>(url: string, body?: unknown): Promise<T> {
    if (isTauri()) {
      const { name, args } = urlToCommand(url, 'POST', body);
      if (name) return tauriInvoke<T>(name, args);
    }
    throw new Error(`Route not available: ${url}`);
  },

  async put<T = any>(url: string, body?: unknown): Promise<T> {
    if (isTauri()) {
      const { name, args } = urlToCommand(url, 'PUT', body);
      if (name) return tauriInvoke<T>(name, args);
    }
    throw new Error(`Route not available: ${url}`);
  },

  async del<T = any>(url: string, body?: unknown): Promise<T> {
    if (isTauri()) {
      const { name, args } = urlToCommand(url, 'DELETE', body);
      if (name) return tauriInvoke<T>(name, args);
    }
    throw new Error(`Route not available: ${url}`);
  },
};
