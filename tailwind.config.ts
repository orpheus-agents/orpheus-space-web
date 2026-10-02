import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

// Colour, type and shape tokens follow branding/interface.md; values live in src/styles/main.css.
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    borderRadius: { none: '0', win: '10px' },
    boxShadow: { none: 'none' },
    extend: {
      colors: {
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--color-surface-raised) / <alpha-value>)',
        'surface-subtle': 'rgb(var(--color-surface-subtle) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-ink': 'rgb(var(--color-accent-ink) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        'danger-ink': 'rgb(var(--color-danger-ink) / <alpha-value>)',
        term: 'rgb(var(--color-term) / <alpha-value>)',
        'term-fg': 'rgb(var(--color-term-fg) / <alpha-value>)',
        'term-dim': 'rgb(var(--color-term-dim) / <alpha-value>)',
        'term-line': 'rgb(var(--color-term-line) / <alpha-value>)',
        'term-ok': 'rgb(var(--color-term-ok) / <alpha-value>)',
        'term-err': 'rgb(var(--color-term-err) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Martian Grotesk', ...defaultTheme.fontFamily.sans],
        mono: ['Martian Mono', ...defaultTheme.fontFamily.mono],
        code: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
        brand: ['Besley', 'Literata', ...defaultTheme.fontFamily.serif],
      },
      letterSpacing: {
        caps: '0.08em',
        display: '-0.035em',
        title: '-0.025em',
      },
    },
  },
  plugins: [],
} satisfies Config
