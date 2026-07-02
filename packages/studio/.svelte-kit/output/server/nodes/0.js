

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.D8dAy-J4.js","_app/immutable/chunks/WKelN9wF.js","_app/immutable/chunks/BimzIPwb.js"];
export const stylesheets = ["_app/immutable/assets/0.DpQL7JY4.css"];
export const fonts = [];
