<script setup lang="ts">
import type { IStatusPanelParams } from 'ag-grid-community';
import { getDefaultColumnState } from '~/utils/grid';

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

// 重置列设置为页面默认状态（context.columnStateKey 由各页面传入）
function resetColumns() {
  const key = props.params.context?.columnStateKey;
  if (!key) return;
  localStorage.removeItem(key);
  const state = getDefaultColumnState(key);
  if (state) {
    props.params.api.applyColumnState({ state, applyOrder: true });
  }
}

// 快捷键：Ctrl+Alt+R 重置列设置
function onKeyDown(e: KeyboardEvent) {
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'r') {
    e.preventDefault();
    resetColumns();
  }
}

onMounted(() => {
  props.params.api.addEventListener('rowDataUpdated', refresh);
  props.params.api.addEventListener('selectionChanged', refresh);
  props.params.api.addEventListener('filterChanged', refresh);
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  props.params.api.removeEventListener('rowDataUpdated', refresh);
  props.params.api.removeEventListener('selectionChanged', refresh);
  props.params.api.removeEventListener('filterChanged', refresh);
  window.removeEventListener('keydown', onKeyDown);
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
    <UButton
      class="ml-auto"
      size="xs"
      color="gray"
      variant="ghost"
      icon="i-lucide:columns-3"
      :title="'重置列设置 (Ctrl+Alt+R)'"
      aria-label="重置列设置"
      @click="resetColumns"
      >重置列</UButton
    >
  </div>
</template>
