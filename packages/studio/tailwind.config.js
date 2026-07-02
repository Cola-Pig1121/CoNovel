/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: "var(--color-bg)",
        foreground: "var(--color-fg)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        accent: "var(--color-accent)",
      },
      fontFamily: {
        wenkai: ['"LXGW WenKai"', 'serif'],
        'wenkai-mono': ['"LXGW WenKai Mono"', 'monospace'],
        serif: ['"LXGW WenKai"', 'Georgia', 'serif'],
        sans: ['"LXGW WenKai"', 'system-ui', 'sans-serif'],
        mono: ['"LXGW WenKai Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
