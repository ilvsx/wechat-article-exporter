<template>
  <div class="h-full">
    <Teleport defer to="#title">
      <h1 class="text-base font-semibold text-slate-12 dark:text-slate-100">设置</h1>
    </Teleport>

    <div class="h-full overflow-scroll">
      <SettingProxy />
      <div class="flex flex-wrap">
        <SettingExport />
        <SettingMisc />
      </div>
      <!--      <div>-->
      <!--        <SettingDisplay />-->
      <!--      </div>-->
      <div class="h-[30vh]"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { websiteName } from '~/config';

useHead({
  title: `设置 | ${websiteName}`,
});
</script>
