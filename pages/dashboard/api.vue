<template>
  <div class="flex flex-col h-full">
    <Teleport defer to="#title">
      <h1 class="text-base font-semibold text-slate-12 dark:text-slate-100">API</h1>
    </Teleport>
    <div class="flex-1 overflow-y-auto p-6">
      <div class="mx-auto max-w-5xl space-y-12">
        <ApiSummary />
        <ApiDocument v-for="(api, idx) in apis" :key="idx" v-bind="api" :index="idx + 1" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { websiteName } from '~/config';
import { apis } from '~/config/public-apis';

useHead({
  title: `API | ${websiteName}`,
});
</script>
