/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["selector", "[data-theme=\"dark\"]"],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Editorial Style Colors - mapped to CSS variables for dark mode support
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
      fontSize: {
        'hero': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'hero-md': ['6rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'hero-lg': ['8rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
      },
      spacing: {
        'section': '6rem',
        'section-md': '10rem',
        'section-lg': '12rem',
      },
      letterSpacing: {
        'editorial': '0.2em',
        'tighter': '-0.02em',
      },
      transitionProperty: {
        'underline': 'background-size',
      },
      backgroundSize: {
        'underline': '100% 1px',
        'underline-hover': '100% 2px',
      },
    },
  },
  plugins: [],
};
