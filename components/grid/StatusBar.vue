<script setup lang="ts">
import type { IStatusPanelParams } from 'ag-grid-community';

interface Props {
  params: IStatusPanelParams;
}
const props = defineProps<Props>();

const selectedRowCount = ref(0);
const displayedRowCount = ref(0);

function refresh() {
  selectedRowCount.value = props.params.api.getSelectedRows().length;
  displayedRowCount.value = props.params.api.getDisplayedRowCount();
}

onMounted(() => {
  props.params.api.addEventListener('rowDataUpdated', refresh);
  props.params.api.addEventListener('selectionChanged', refresh);
  props.params.api.addEventListener('filterChanged', refresh);
});

onUnmounted(() => {
  props.params.api.removeEventListener('rowDataUpdated', refresh);
  props.params.api.removeEventListener('selectionChanged', refresh);
  props.params.api.removeEventListener('filterChanged', refresh);
});
</script>

<template>
  <div
    class="flex items-center gap-1.5 px-3 text-xs text-slate-11 dark:text-slate-400"
    v-if="displayedRowCount > 0"
  >
    共
    <span class="tabular-nums font-medium text-slate-12 dark:text-slate-200">{{ displayedRowCount }}</span>
    条，已选
    <span
      class="tabular-nums font-medium"
      :class="selectedRowCount ? 'text-blue-600' : 'text-slate-12 dark:text-slate-200'"
      >{{ selectedRowCount }}</span
    >
    条
  </div>
</template>
