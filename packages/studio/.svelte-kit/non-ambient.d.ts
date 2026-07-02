
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/(app)" | "/" | "/(app)/agents" | "/(app)/books" | "/(app)/book" | "/(app)/editor" | "/(app)/evolution" | "/(app)/pipeline" | "/(app)/settings" | "/(app)/store";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/(app)": Record<string, never>;
			"/": Record<string, never>;
			"/(app)/agents": Record<string, never>;
			"/(app)/books": Record<string, never>;
			"/(app)/book": Record<string, never>;
			"/(app)/editor": Record<string, never>;
			"/(app)/evolution": Record<string, never>;
			"/(app)/pipeline": Record<string, never>;
			"/(app)/settings": Record<string, never>;
			"/(app)/store": Record<string, never>
		};
		Pathname(): "/" | "/agents" | "/books" | "/book" | "/editor" | "/evolution" | "/pipeline" | "/settings" | "/store";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/fonts/fonts/lxgw-wenkai/LXGWWenKai-Light.ttf" | "/fonts/fonts/lxgw-wenkai/LXGWWenKai-Medium.ttf" | "/fonts/fonts/lxgw-wenkai/LXGWWenKai-Regular.ttf" | "/fonts/fonts/lxgw-wenkai/LXGWWenKaiMono-Light.ttf" | "/fonts/fonts/lxgw-wenkai/LXGWWenKaiMono-Medium.ttf" | "/fonts/fonts/lxgw-wenkai/LXGWWenKaiMono-Regular.ttf" | string & {};
	}
}