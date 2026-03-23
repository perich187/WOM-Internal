/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── WOM Brand ──────────────────────────────────────────
        // Source: wordofmouthagency.com.au
        wom: {
          navy:        '#092137',   // primary dark — sidebar, footer, headings
          'navy-deep': '#061828',   // darker navy for hover states
          cream:       '#F5F1E9',   // page background, light sections
          'cream-dark':'#EDE8DC',   // slightly darker cream for hover/borders
          gold:        '#F0A629',   // primary CTA, active states, accents
          'gold-dark': '#D4921F',   // gold hover / pressed state
          'gold-light':'#F5C15E',   // gold tint for backgrounds

          // Legacy names mapped to brand — kept so existing class refs still work
          purple:        '#F0A629', // was purple, now gold (primary accent)
          'purple-dark': '#D4921F',
          'purple-light':'#F5C15E',
          dark:          '#092137', // was near-black, now navy

          // Secondary palette (platform / status colours)
          cyan:  '#0693e3',
          teal:  '#00d084',
          red:   '#cf2e2e',
          gray:  '#313131',
        },
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        // DM Sans ≈ ITC Avant Garde Gothic Pro (geometric sans-serif)
        // Space Grotesk ≈ Zenon (modern geometric)
        sans:    ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        heading: ['"Space Grotesk"', '"DM Sans"', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': { from: { height: 0 }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: 0 } },
        'fade-in':        { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-in':        'fade-in 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
