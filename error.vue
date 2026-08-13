<template>
  <NuxtLayout>
    <div class="min-h-screen bg-slate-2 text-slate-12 dark:bg-slate-950 dark:text-slate-100">
      <div class="flex min-h-screen flex-col items-center justify-center text-center px-6">
        <div class="mb-6 flex size-16 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10">
          <UIcon name="i-lucide:triangle-alert" class="size-8 text-rose-500" />
        </div>
        <h1 class="text-2xl font-semibold tracking-tight">出了点小状况</h1>
        <p class="mt-2 text-sm text-slate-11 dark:text-slate-400">抱歉，页面出现了一些问题。请稍后重试。</p>
        <div v-if="errorCode" class="mt-4 text-xs text-slate-11 dark:text-slate-500">
          <p>
            Error Code: <span class="font-mono">{{ errorCode }}</span>
          </p>
        </div>
        <UButton color="primary" icon="i-lucide:home" class="mt-8" to="/">返回主页</UButton>
      </div>
    </div>
  </NuxtLayout>
</template>

<script lang="ts" setup>
import { websiteName } from '~/config/index.js';

useHead({
  title: `出了点小状况 | ${websiteName}`,
});

const route = useRoute();
const errorCode = computed(() => route.query.error);
</script>
