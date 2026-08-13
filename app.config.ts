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
    // 下拉菜单丝滑过渡(scale + opacity)
    selectMenu: {
      transition: {
        enterActiveClass: 'transition duration-150 ease-out',
        enterFromClass: 'opacity-0 scale-95',
        enterToClass: 'opacity-100 scale-100',
        leaveActiveClass: 'transition duration-100 ease-in',
        leaveFromClass: 'opacity-100 scale-100',
        leaveToClass: 'opacity-0 scale-95',
      },
    },
    inputMenu: {
      transition: {
        enterActiveClass: 'transition duration-150 ease-out',
        enterFromClass: 'opacity-0 scale-95',
        enterToClass: 'opacity-100 scale-100',
        leaveActiveClass: 'transition duration-100 ease-in',
        leaveFromClass: 'opacity-100 scale-100',
        leaveToClass: 'opacity-0 scale-95',
      },
    },
    dropdown: {
      transition: {
        enterActiveClass: 'transition duration-150 ease-out',
        enterFromClass: 'opacity-0 scale-95',
        enterToClass: 'opacity-100 scale-100',
        leaveActiveClass: 'transition duration-100 ease-in',
        leaveFromClass: 'opacity-100 scale-100',
        leaveToClass: 'opacity-0 scale-95',
      },
    },
    // tooltip 提高层级,避免被表格表头/容器遮挡
    tooltip: {
      container: 'z-50 group',
    },
  },
});
