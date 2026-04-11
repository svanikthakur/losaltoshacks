/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      colors: {
        base: 'var(--color-void)',
        void: 'var(--color-void)',
        surface: 'var(--color-surface-1)',
        'surface-2': 'var(--color-surface-2)',
        elevated: 'var(--color-surface-3)',
        ink: {
          DEFAULT: 'var(--color-text-1)',
          dim: 'var(--color-text-2)',
        },
        muted: 'var(--color-text-3)',
        line: 'var(--color-border-1)',
        'line-strong': 'var(--color-border-2)',
        'line-hot': 'var(--color-border-3)',
        accent: {
          DEFAULT: 'var(--color-charge)',
          soft: 'var(--color-charge-mid)',
          dim: 'var(--color-charge-low)',
          ink: 'var(--color-void)',
        },
        steel: {
          DEFAULT: 'var(--color-steel)',
          soft: 'var(--color-steel-low)',
        },
        online: 'var(--color-online)',
        warning: 'var(--color-warning)',
        offline: 'var(--color-offline)',
      },
      borderRadius: {
        none: '0',
        sm: '0',
        DEFAULT: '0',
        md: '0',
        lg: '0',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        sharp: 'var(--ease-sharp)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '200ms',
        slow: '500ms',
      },
      letterSpacing: {
        tight: '-0.01em',
        mono: '0.1em',
        wide: '0.15em',
        mega: '0.2em',
      },
    },
  },
  plugins: [],
}
