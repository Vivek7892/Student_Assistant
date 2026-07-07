/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        // Violet primary
        primary: {
          50:  'oklch(97% 0.02 290)',
          100: 'oklch(93% 0.05 290)',
          200: 'oklch(86% 0.10 290)',
          300: 'oklch(76% 0.16 290)',
          400: 'oklch(65% 0.22 290)',
          500: 'oklch(55% 0.26 290)',
          600: 'oklch(47% 0.26 290)',
          700: 'oklch(39% 0.22 290)',
          800: 'oklch(30% 0.16 290)',
          900: 'oklch(22% 0.10 290)',
          950: 'oklch(15% 0.06 290)',
        },
        // Emerald accent
        emerald: {
          400: 'oklch(78% 0.18 162)',
          500: 'oklch(70% 0.20 162)',
        },
        // Amber accent
        amber: {
          400: 'oklch(82% 0.18 80)',
          500: 'oklch(75% 0.20 80)',
        },
        // Cyan accent
        cyan: {
          400: 'oklch(80% 0.16 210)',
          500: 'oklch(72% 0.18 210)',
        },
        // Rose accent
        rose: {
          400: 'oklch(72% 0.20 15)',
          500: 'oklch(64% 0.22 15)',
        },
        // Surface tokens
        surface: {
          0:   'oklch(100% 0 0)',
          50:  'oklch(98.5% 0.002 290)',
          100: 'oklch(96% 0.004 290)',
          200: 'oklch(92% 0.006 290)',
          800: 'oklch(18% 0.012 290)',
          850: 'oklch(14% 0.012 290)',
          900: 'oklch(11% 0.010 290)',
          950: 'oklch(8%  0.008 290)',
        },
        border: {
          DEFAULT: 'oklch(88% 0.006 290)',
          dark:    'oklch(25% 0.012 290)',
        },
        text: {
          primary:   'oklch(15% 0.010 290)',
          secondary: 'oklch(45% 0.012 290)',
          muted:     'oklch(62% 0.010 290)',
          'primary-dark':   'oklch(95% 0.008 290)',
          'secondary-dark': 'oklch(72% 0.012 290)',
          'muted-dark':     'oklch(52% 0.010 290)',
        },
      },
      backgroundImage: {
        'mesh-light': `
          radial-gradient(at 20% 20%, oklch(93% 0.05 290 / 0.6) 0px, transparent 50%),
          radial-gradient(at 80% 10%, oklch(86% 0.10 210 / 0.4) 0px, transparent 50%),
          radial-gradient(at 60% 80%, oklch(93% 0.05 162 / 0.3) 0px, transparent 50%)
        `,
        'mesh-dark': `
          radial-gradient(at 20% 20%, oklch(22% 0.10 290 / 0.5) 0px, transparent 50%),
          radial-gradient(at 80% 10%, oklch(18% 0.08 210 / 0.4) 0px, transparent 50%),
          radial-gradient(at 60% 80%, oklch(18% 0.06 162 / 0.3) 0px, transparent 50%)
        `,
        'gradient-primary': 'linear-gradient(135deg, oklch(55% 0.26 290), oklch(47% 0.26 290))',
        'gradient-emerald': 'linear-gradient(135deg, oklch(78% 0.18 162), oklch(70% 0.20 162))',
        'gradient-amber':   'linear-gradient(135deg, oklch(82% 0.18 80),  oklch(75% 0.20 80))',
        'gradient-cyan':    'linear-gradient(135deg, oklch(80% 0.16 210), oklch(72% 0.18 210))',
        'gradient-rose':    'linear-gradient(135deg, oklch(72% 0.20 15),  oklch(64% 0.22 15))',
      },
      boxShadow: {
        'glass':    '0 4px 24px -4px oklch(55% 0.26 290 / 0.12), 0 1px 4px oklch(0% 0 0 / 0.04)',
        'glass-lg': '0 8px 40px -8px oklch(55% 0.26 290 / 0.18), 0 2px 8px oklch(0% 0 0 / 0.06)',
        'lift':     '0 16px 48px -12px oklch(55% 0.26 290 / 0.24)',
        'glow':     '0 0 32px oklch(55% 0.26 290 / 0.30)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
