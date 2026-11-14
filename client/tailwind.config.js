/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F4F9F6',       // Light clinical mint/sage background
        surface: '#FFFFFF',     // Crisp white surface
        'surface-subtle': '#EBF5EE', // Very soft light green accent surface
        'surface-mint': '#E2F3E7',   // Mint badge/highlight
        ink: '#111A16',         // Crisp dark clinical ink
        muted: '#52665B',       // Muted clinical slate
        hairline: '#CFE3D3',    // Light green-tinted crisp 1px ruled border
        'hairline-subtle': '#E1EFE4',
        brand: {
          DEFAULT: '#0B6E4F',   // Clinical emerald/forest green
          hover: '#08573E',
          subtle: '#E8F5ED',
          light: '#D1EAD9'
        },
        amber: {
          DEFAULT: '#B7791F',
          subtle: '#FEF7ED',
        },
        red: {
          DEFAULT: '#B42318',
          subtle: '#FEF2F2',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      fontSize: {
        '11': ['11px', { lineHeight: '15px' }],
        '13': ['13px', { lineHeight: '18px' }],
        '15': ['15px', { lineHeight: '22px' }],
        '17': ['17px', { lineHeight: '24px' }],
        '20': ['20px', { lineHeight: '26px' }],
        '22': ['22px', { lineHeight: '28px' }],
        '28': ['28px', { lineHeight: '34px' }],
      },
      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
      },
      borderRadius: {
        DEFAULT: '4px',
        input: '4px',
        btn: '4px',
        panel: '6px',
        none: '0px',
      },
      boxShadow: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(11, 110, 79, 0.05)',
        card: '0 1px 3px 0 rgba(11, 110, 79, 0.08)',
        focus: '0 0 0 2px #CFE3D3, 0 0 0 4px #0B6E4F',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
      }
    },
  },
  plugins: [],
}
