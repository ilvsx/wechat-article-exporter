<template>
  <div :class="isDev ? 'debug-screens' : ''" class="flex flex-col h-screen">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <UNotifications position="top-right" />
    <UModals />
  </div>
</template>

<script setup lang="ts">
import { ModuleRegistry } from 'ag-grid-community';
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise';
import { isDev } from '~/config';
import { isChromeBrowser } from '~/utils';

const runtimeConfig = useRuntimeConfig();

ModuleRegistry.registerModules([AllEnterpriseModule]);
LicenseManager.setLicenseKey(runtimeConfig.public.aggridLicense);

const toast = useToast();
onMounted(() => {
  if (!isChromeBrowser()) {
    toast.warning('推荐使用 Chrome 浏览器', '表格渲染在 Chrome 下表现最佳，其他浏览器可能存在兼容问题。');
  }
});

// 移动端地址栏颜色跟随深浅色模式
const colorMode = useColorMode();
const themeColor = computed(() => (colorMode.value === 'dark' ? '#0f172a' : '#ffffff'));
useHead({
  meta: [{ name: 'theme-color', content: () => themeColor.value }],
});
</script>

<style>
@import 'style.css';
</style>
