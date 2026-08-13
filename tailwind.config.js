/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors: {
        slate: {
          1: '#00005503',
          2: '#00005506',
          3: '#0000330f',
          4: '#00002d17',
          5: '#0009321f',
          6: '#00002f26',
          7: '#00062e32',
          8: '#00083046',
          9: '#00051d74',
          10: '#00071b7f',
          11: '#0007149f',
          12: '#000509e3',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'system-ui',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        pop: '0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 6px -2px rgb(0 0 0 / 0.04)',
        modal: '0 12px 32px -8px rgb(0 0 0 / 0.16)',
      },
    },
    debugScreens: {
      position: ['bottom', 'left'],
      style: {
        backgroundColor: 'black',
        color: 'white',
        fontSize: '16px',
        padding: '0.5rem',
        borderRadius: '0.25rem',
      },
    },
  },
  // plugins: [require('tailwindcss-debug-screens')],
};
