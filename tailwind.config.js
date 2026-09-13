/** @type {import('tailwindcss').Config} */
const withOpacity = (variable) => `rgb(var(${variable}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: withOpacity('--c-bg'),
        surface: withOpacity('--c-surface'),
        'surface-2': withOpacity('--c-surface-2'),
        line: withOpacity('--c-line'),
        ink: withOpacity('--c-ink'),
        muted: withOpacity('--c-muted'),
        brand: {
          300: withOpacity('--c-brand-300'),
          400: withOpacity('--c-brand-400'),
          500: withOpacity('--c-brand-500'),
          600: withOpacity('--c-brand-600'),
          700: withOpacity('--c-brand-700'),
        },
        success: {
          bg: withOpacity('--c-success-bg'),
          fg: withOpacity('--c-success-fg'),
        },
        accent: withOpacity('--c-accent'),
        gold: withOpacity('--c-gold'),
        danger: withOpacity('--c-danger'),
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        num: ['Inter var', 'Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      transitionDuration: {
        DEFAULT: '180ms',
      },
      boxShadow: {
        soft: '0 1px 2px rgb(0 0 0 / 0.16), 0 8px 24px -12px rgb(0 0 0 / 0.32)',
        glow: '0 0 0 1px rgb(var(--c-brand-500) / 0.35), 0 10px 30px -12px rgb(var(--c-brand-500) / 0.45)',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgb(var(--c-brand-500) / 0.55)' },
          '100%': { boxShadow: '0 0 0 12px rgb(var(--c-brand-500) / 0)' },
        },
      },
      animation: {
        'pop-in': 'pop-in 180ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'pulse-ring': 'pulse-ring 1200ms ease-out infinite',
      },
    },
  },
  plugins: [],
}
