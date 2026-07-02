

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.R3KJFyKG.js","_app/immutable/chunks/WKelN9wF.js","_app/immutable/chunks/BimzIPwb.js"];
export const stylesheets = ["_app/immutable/assets/0.DnM3DuBQ.css"];
export const fonts = [];
