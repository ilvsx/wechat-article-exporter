import { darkGridTheme, lightGridTheme } from '~/config/shared-grid-options';

/**
 * 响应式 AG Grid 主题
 * @description 跟随 Nuxt colorMode（亮/暗）返回对应的 grid theme
 */
export function useGridTheme() {
  const colorMode = useColorMode();

  const theme = computed(() => (colorMode.value === 'dark' ? darkGridTheme : lightGridTheme));

  return theme;
}
