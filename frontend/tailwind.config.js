module.exports = {
    content: [
      './index.html',
      './src/**/*.{js,ts,jsx,tsx}'
    ],
    theme: {
      extend: {
        animation: {
          'fade-in': 'fadeIn 0.5s ease-in',
          'spin': 'spin 1s linear infinite'
        },

        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          }
        }
      },
    },
    plugins: [],
  }