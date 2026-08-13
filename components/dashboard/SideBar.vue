<script setup lang="ts">
import SidebarContent from '~/components/dashboard/SidebarContent.vue';

// 移动端抽屉开关（导航后自动关闭）
const open = ref(false);
const route = useRoute();
watch(
  () => route.fullPath,
  () => {
    open.value = false;
  }
);
</script>

<template>
  <!-- 移动端汉堡按钮（仅 < md 显示） -->
  <UButton
    icon="i-lucide:menu"
    square
    ghost
    color="gray"
    class="fixed right-3 top-2 z-50 md:hidden"
    @click="open = true"
  />

  <!-- 移动端抽屉导航 -->
  <USlideover v-model="open" :ui="{ width: 'max-w-[260px]', body: { padding: 'p-0' } }">
    <SidebarContent />
  </USlideover>

  <!-- 桌面侧边栏 -->
  <aside
    class="hidden md:flex flex-col h-full w-[250px] flex-shrink-0 justify-between border-r border-slate-6 bg-slate-1 px-4 pb-6 dark:border-slate-800 dark:bg-slate-900"
  >
    <SidebarContent />
  </aside>
</template>
