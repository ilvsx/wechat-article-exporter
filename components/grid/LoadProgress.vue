<script setup lang="ts">
import type { ICellRendererParams } from 'ag-grid-community';

interface Props {
  params: ICellRendererParams;
}
const props = defineProps<Props>();

const count = ref(props.params.data.count);
const total = ref(props.params.data.total_count || Number.MAX_SAFE_INTEGER);

const percent = computed(() => {
  if (total.value === Number.MAX_SAFE_INTEGER || total.value === 0) return 0;
  return Math.round((count.value / total.value) * 100);
});

function refresh(params: ICellRendererParams): boolean {
  count.value = params.data.count;
  total.value = params.data.total_count || Number.MAX_SAFE_INTEGER;
  return true;
}
</script>

<template>
  <div class="flex h-full items-center gap-2">
    <UProgress color="primary" :value="count" :max="total" class="flex-1" />
    <span class="w-9 text-right text-xs tabular-nums text-slate-11 dark:text-slate-400">{{ percent }}%</span>
  </div>
</template>
