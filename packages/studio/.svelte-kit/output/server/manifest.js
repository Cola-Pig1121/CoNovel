export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["fonts/fonts/lxgw-wenkai/LXGWWenKai-Light.ttf","fonts/fonts/lxgw-wenkai/LXGWWenKai-Medium.ttf","fonts/fonts/lxgw-wenkai/LXGWWenKai-Regular.ttf","fonts/fonts/lxgw-wenkai/LXGWWenKaiMono-Light.ttf","fonts/fonts/lxgw-wenkai/LXGWWenKaiMono-Medium.ttf","fonts/fonts/lxgw-wenkai/LXGWWenKaiMono-Regular.ttf"]),
	mimeTypes: {".ttf":"font/ttf"},
	_: {
		client: {start:"_app/immutable/entry/start.DsRqGgXn.js",app:"_app/immutable/entry/app.B12ofHLk.js",imports:["_app/immutable/entry/start.DsRqGgXn.js","_app/immutable/chunks/4-N5-Kx0.js","_app/immutable/chunks/DncxQNbW.js","_app/immutable/chunks/WKelN9wF.js","_app/immutable/chunks/C8e_DL8x.js","_app/immutable/chunks/DWCvzjsq.js","_app/immutable/entry/app.B12ofHLk.js","_app/immutable/chunks/DncxQNbW.js","_app/immutable/chunks/WKelN9wF.js","_app/immutable/chunks/C8e_DL8x.js","_app/immutable/chunks/DWCvzjsq.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js')),
			__memo(() => import('./nodes/10.js')),
			__memo(() => import('./nodes/11.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/(app)",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/(app)/agents",
				pattern: /^\/agents\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/(app)/books",
				pattern: /^\/books\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/(app)/book",
				pattern: /^\/book\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/(app)/editor",
				pattern: /^\/editor\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/(app)/evolution",
				pattern: /^\/evolution\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/(app)/pipeline",
				pattern: /^\/pipeline\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/(app)/settings",
				pattern: /^\/settings\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/(app)/store",
				pattern: /^\/store\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 11 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
