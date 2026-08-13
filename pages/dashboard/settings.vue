<template>
  <div class="h-full">
    <Teleport defer to="#title">
      <h1 class="text-base font-semibold text-slate-12 dark:text-slate-100">设置</h1>
    </Teleport>

    <div class="h-full overflow-y-auto p-6">
      <div class="mx-auto max-w-5xl space-y-6">
        <SettingBackup />
        <SettingProxy />
        <div class="flex flex-wrap gap-6">
          <SettingExport />
          <SettingMisc />
        </div>
        <!--      <div>-->
        <!--        <SettingDisplay />-->
        <!--      </div>-->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { websiteName } from '~/config';

useHead({
  title: `设置 | ${websiteName}`,
});
</script>
