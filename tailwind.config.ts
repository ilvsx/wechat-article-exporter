import type { Config } from 'tailwindcss';
import { slateLight } from './config/ui-tokens';

export default {
  content: [],
  theme: {
    extend: {
      colors: {
        slate: slateLight,
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
} satisfies Config;
