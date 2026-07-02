

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.DqXlEPQz.js","_app/immutable/chunks/CqWs38ap.js","_app/immutable/chunks/D9wOJ8Gt.js"];
export const stylesheets = ["_app/immutable/assets/0.WBihc3Hi.css"];
export const fonts = [];
