<template>
  <div class="flex flex-col h-screen">
    <div class="flex flex-1 min-h-0">
      <!-- 左侧边栏 -->
      <SideBar />

      <div class="flex flex-col flex-1 overflow-hidden h-full">
        <!-- 顶部操作栏 -->
        <div
          class="flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-6 bg-white px-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <div id="title"></div>
          <GlobalActions />
        </div>

        <!-- 页面容器 -->
        <div class="flex-1 overflow-hidden bg-slate-2 dark:bg-slate-950">
          <NuxtPage :transition="{ name: 'page', mode: 'out-in', duration: 120 }" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import GlobalActions from '~/components/dashboard/Actions.vue';
import SideBar from '~/components/dashboard/SideBar.vue';
</script>
