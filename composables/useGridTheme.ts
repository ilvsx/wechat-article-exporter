import { darkGridTheme, lightGridTheme } from '~/config/shared-grid-options';
import type { Preferences } from '~/types/preferences';

/**
 * 响应式 AG Grid 主题
 * @description 跟随 Nuxt colorMode（亮/暗）与表格密度偏好，返回对应的 grid theme
 */
export function useGridTheme() {
  const colorMode = useColorMode();
  const preferences = usePreferences();

  const theme = computed(() => {
    const base = colorMode.value === 'dark' ? darkGridTheme : lightGridTheme;
    const density = (preferences.value as Preferences).tableDensity;
    if (density === 'comfortable') {
      // 舒适密度：行高/表头放宽
      return base.withParams({ rowHeight: 44, headerHeight: 48 });
    }
    return base;
  });

  return theme;
}
