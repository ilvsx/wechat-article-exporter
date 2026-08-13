<script setup lang="ts">
import BottomPanel from '~/components/dashboard/BottomPanel.vue';
import NavMenus from '~/components/dashboard/NavMenus.vue';
import { websiteName } from '~/config';
</script>

<template>
  <aside
    class="hidden md:flex flex-col h-full w-[250px] flex-shrink-0 justify-between border-r border-slate-6 bg-slate-1 px-4 pb-6 dark:border-slate-800 dark:bg-slate-900"
  >
    <!-- 网站标题 & Logo -->
    <div class="flex items-center h-14">
      <NuxtLink to="/" class="px-2 font-semibold text-[15px]">{{ websiteName }}</NuxtLink>
    </div>

    <!-- 导航菜单 -->
    <NavMenus />

    <!-- 底部视图 -->
    <BottomPanel />
  </aside>
</template>
