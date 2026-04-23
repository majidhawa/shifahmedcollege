import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './data/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#0f4f3f',
          gold: '#d7a93b',
          cream: '#f8f6ef',
          dark: '#0c1f1a'
        }
      },
      boxShadow: {
        soft: '0 20px 60px rgba(15,79,63,0.12)'
      },
      backgroundImage: {
        'brand-radial': 'radial-gradient(circle at top, rgba(215,169,59,0.14), transparent 35%)'
      }
    },
  },
  plugins: [],
};

export default config;
