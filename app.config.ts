export default defineAppConfig({
  ui: {
    primary: 'blue',
    gray: 'slate',
    button: {
      font: 'font-medium',
      rounded: 'rounded-md',
      default: {
        size: 'sm',
        color: 'gray',
        variant: 'outline',
      },
    },
    badge: {
      rounded: 'rounded',
      font: 'font-medium',
    },
    card: {
      background: 'bg-white dark:bg-slate-900',
      ring: 'ring-1 ring-slate-6 dark:ring-slate-800',
      rounded: 'rounded-lg',
      shadow: 'shadow-sm',
      divide: 'divide-y divide-slate-4 dark:divide-slate-800',
    },
  },
});
