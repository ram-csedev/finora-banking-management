/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#05070c',
          900: '#080b11',
          850: '#0d121d',
          800: '#121826',
          750: '#182032',
          700: '#1e293b',
          600: '#334155',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
        },
        neon: {
          cyan: '#00f0ff',
          'cyan-muted': '#06b6d4',
          'cyan-glow': 'rgba(6, 182, 212, 0.15)',
          emerald: '#10b981',
          'emerald-glow': 'rgba(16, 185, 129, 0.15)',
          amber: '#f59e0b',
          'amber-glow': 'rgba(245, 158, 11, 0.15)',
          rose: '#f43f5e',
          'rose-glow': 'rgba(244, 63, 94, 0.15)',
          violet: '#8b5cf6',
          'violet-glow': 'rgba(139, 92, 246, 0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.35)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.35)',
        'glow-amber': '0 0 25px -5px rgba(245, 158, 11, 0.35)',
        'glow-rose': '0 0 25px -5px rgba(244, 63, 94, 0.35)',
        'glow-violet': '0 0 25px -5px rgba(139, 92, 246, 0.35)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      },
      backgroundImage: {
        'radial-gradient': 'radial-gradient(circle at 50% 0%, var(--tw-gradient-stops))',
        'grid-pattern': 'linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
