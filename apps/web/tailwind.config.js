/** @type {import('tailwindcss').Config} */
import { fontFamily } from 'tailwindcss/defaultTheme';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        'border-accent': 'var(--border-accent)',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        'bg-base': 'var(--bg-base)',
        'bg-surface': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-input': 'var(--bg-input)',
        'bg-hover': 'var(--bg-hover)',
        foreground: 'hsl(var(--foreground))',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          disabled: 'var(--text-disabled)',
          inverse: 'var(--text-inverse)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
        },
        brand: 'hsl(var(--brand))',
        status: {
          success: 'hsl(var(--success))',
          warning: 'hsl(var(--warning))',
          error: 'hsl(var(--destructive))',
          info: 'hsl(var(--info))',
          neutral: 'var(--color-neutral)',
        },
        'status-bg': {
          success: 'var(--bg-success)',
          warning: 'var(--bg-warning)',
          error: 'var(--bg-danger)',
          info: 'var(--bg-info)',
        },
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      fontSize: {
        '3xs': ['10px', { lineHeight: '1.4' }],
        '4xs': ['9px', { lineHeight: '1.2' }],
        '5xs': ['8px', { lineHeight: '1' }],
      },
      letterSpacing: {
        'widest-lg': '0.2em',
        'widest-xl': '0.25em',
        'widest-2xl': '0.3em',
      },
      maxWidth: {
        'cell-sm': '180px',
        'cell-md': '200px',
      },
      lineHeight: {
        'tightest': '1.05',
      },
      scale: {
        '98': '0.98',
      },
      backgroundImage: {
        'radial-login':
          'radial-gradient(ellipse 60% 60% at 30% 50%, hsl(var(--primary) / 0.06) 0%, transparent 70%)',
      },
      spacing: {
        'page-x': 'var(--page-px)',
        'page-y': 'var(--page-py)',
        section: 'var(--section-gap)',
        card: 'var(--card-p)',
        'cell-x': 'var(--table-cell-px)',
        'cell-y': 'var(--table-cell-py)',
      },
      height: {
        row: 'var(--row-h)',
      },
      fontFamily: {
        sans: ['var(--font-body)', ...fontFamily.sans],
        body: ['var(--font-body)', ...fontFamily.sans],
        display: ['var(--font-display)', ...fontFamily.sans],
        heading: ['var(--font-display)', ...fontFamily.sans],
        mono: ['var(--font-mono)', ...fontFamily.mono],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
