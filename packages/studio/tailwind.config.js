/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Editorial Style Colors
        background: '#F9F8F6',
        foreground: '#1C1C1C',
        muted: '#6b7280',
        border: '#1C1C1C',
        accent: '#816d70',
      },
      fontFamily: {
        wenkai: ['var(--font-wenkai)', 'serif'],
        'wenkai-mono': ['var(--font-wenkai-mono)', 'monospace'],
        serif: ['var(--font-wenkai)', 'Georgia', 'serif'],
        sans: ['var(--font-wenkai)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-wenkai-mono)', 'monospace'],
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
