/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        foreground: 'var(--color-foreground)',
        background: 'var(--color-background)',
        muted: 'var(--color-muted)',
        border: 'var(--color-border)',
        accent: 'var(--color-accent)',
      },
      fontFamily: {
        serif: ['"LXGW WenKai"', 'serif'],
        sans: ['"LXGW WenKai"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        none: '0',
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
  plugins: [],
}
