/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#F27F0C',
          'orange-light': '#F59332',
          'orange-dark': '#D46A00',
          charcoal: '#60605F',
          'charcoal-dark': '#3D3D3C',
          'charcoal-light': '#7A7A79',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F7F7F7',
          tertiary: '#EFEFEF',
          dark: '#1A1A1A',
        },
        status: {
          green: '#22C55E',
          'green-bg': '#DCFCE7',
          yellow: '#EAB308',
          'yellow-bg': '#FEF9C3',
          red: '#EF4444',
          'red-bg': '#FEE2E2',
          blue: '#3B82F6',
          'blue-bg': '#DBEAFE',
        }
      },
      fontFamily: {
        display: ['Nexa', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '4px',
        lg: '12px',
        xl: '16px',
      }
    },
  },
  plugins: [],
}

