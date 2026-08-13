<script setup lang="ts">
import BottomPanel from '~/components/dashboard/BottomPanel.vue';
import NavMenus from '~/components/dashboard/NavMenus.vue';
import { websiteName } from '~/config';
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- 网站标题 & Logo -->
    <div class="flex flex-shrink-0 items-center h-14 px-4">
      <NuxtLink to="/" class="px-2 font-semibold text-[15px]">{{ websiteName }}</NuxtLink>
    </div>

    <!-- 导航菜单 -->
    <NavMenus />

    <!-- 底部视图 -->
    <BottomPanel />
  </div>
</template>
