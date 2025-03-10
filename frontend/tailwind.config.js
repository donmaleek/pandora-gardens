module.exports = {
    content: [
      './index.html',
      './src/**/*.{js,ts,jsx,tsx}'
    ],
    theme: {
      extend: {

        animation: {
          'slide-in': 'slideIn 0.3s ease-out',
        },
        keyframes: {
          slideIn: {
            'from': { transform: 'translateX(100%)' },
            'to': { transform: 'translateX(0)' },
          }
        },

        backdropBlur: {
          xs: '2px',
          sm: '4px',
        },        
      },
    },
    plugins: [
      require('@tailwindcss/forms'),
    ],
  }