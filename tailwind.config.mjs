/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Ensure amber colors are always included for dynamic class generation
    'text-amber-200', 'text-amber-300', 'text-amber-400', 'text-amber-500', 'text-amber-600', 'text-amber-700', 'text-amber-800',
    'bg-amber-200', 'bg-amber-300', 'bg-amber-400', 'bg-amber-500', 'bg-amber-600', 'bg-amber-700', 'bg-amber-800',
    'border-amber-200', 'border-amber-300', 'border-amber-400', 'border-amber-500', 'border-amber-600', 'border-amber-700', 'border-amber-800',
    'hover:bg-amber-200', 'hover:bg-amber-300', 'hover:bg-amber-400', 'hover:bg-amber-500', 'hover:bg-amber-600', 'hover:bg-amber-700', 'hover:bg-amber-800'
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};