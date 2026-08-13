<script setup lang="ts">
interface NoRowsMessage {
  noRowsMessage?: string;
}
interface Props {
  params?: NoRowsMessage;
}
defineProps<Props>();
</script>

<template>
  <div class="flex flex-col items-center gap-2 py-8">
    <UIcon name="i-lucide:inbox" class="size-10 text-slate-9" />
    <p class="text-sm font-medium text-slate-12 dark:text-slate-200">{{ params?.noRowsMessage ?? '暂无数据' }}</p>
  </div>
</template>
