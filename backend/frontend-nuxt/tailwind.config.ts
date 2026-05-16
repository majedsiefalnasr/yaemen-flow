import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#0F2A47',
          50: '#E8EEF6', 100: '#C7D5E8', 500: '#1B3D6B', 700: '#0F2A47', 900: '#071833',
        },
        accent: { DEFAULT: '#0F766E', 500: '#14B8A6' },
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
      },
    },
  },
}
