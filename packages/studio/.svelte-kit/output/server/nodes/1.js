

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.BtUYyO8t.js","_app/immutable/chunks/Z63GxF_t.js","_app/immutable/chunks/CjNJzugm.js","_app/immutable/chunks/BEeUWgVu.js"];
export const stylesheets = [];
export const fonts = [];
