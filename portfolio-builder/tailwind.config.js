/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // All eq-* colors resolve to CSS variables — theme toggle rewires them instantly
        eq: {
          bg:      'var(--eq-bg)',
          bg2:     'var(--eq-bg2)',
          card:    'var(--eq-card)',
          el:      'var(--eq-el)',
          hover:   'var(--eq-hover)',
          border:  'var(--eq-border)',
          border2: 'var(--eq-border2)',
          fg:      'var(--eq-fg)',
          fg2:     'var(--eq-fg2)',
          fg3:     'var(--eq-fg3)',
          acc:     'var(--eq-acc)',
          acc2:    'var(--eq-acc2)',
          gain:    'var(--eq-gain)',
          loss:    'var(--eq-loss)',
          warn:    'var(--eq-warn)',
        },
        sector: {
          banking:    '#1a3560',
          technology: '#5b21b6',
          energy:     '#b45309',
          telecom:    '#065f46',
          consumer:   '#9d174d',
          pharma:     '#78350f',
          auto:       '#1e3a8a',
          metals:     '#374151',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
