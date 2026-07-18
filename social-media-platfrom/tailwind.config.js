/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#4A90E2', light: '#7BAEEA', dark: '#3574C4' },
        secondary: { DEFAULT: '#2ECC71', light: '#58D68D', dark: '#25A25A' },
        accent: { DEFAULT: '#F1C40F', light: '#F5D547', dark: '#C9A50D' },
        bgsoft: '#F9FAFB',
      },
      fontFamily: {
        display: ['"Poppins"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 30px rgba(74,144,226,0.12)',
        card: '0 4px 20px rgba(17,24,39,0.06)',
        glow: '0 0 0 4px rgba(74,144,226,0.15)',
      },
      borderRadius: {
        xl2: '1.5rem',
        xl3: '2rem',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        slideDown: { '0%': { opacity: 0, transform: 'translateY(-16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: 0, transform: 'scale(0.94)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        floatY: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-out both',
        slideUp: 'slideUp 0.45s cubic-bezier(0.22,1,0.36,1) both',
        slideDown: 'slideDown 0.35s ease-out both',
        scaleIn: 'scaleIn 0.3s cubic-bezier(0.22,1,0.36,1) both',
        floatY: 'floatY 3.5s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}
