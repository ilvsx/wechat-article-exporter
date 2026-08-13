<script setup lang="ts">
import type { ICellRendererParams } from 'ag-grid-community';
import { Loader } from 'lucide-vue-next';

interface Props {
  params: ICellRendererParams & {
    onSync?: (params: ICellRendererParams) => void;
    onStop?: (params: ICellRendererParams) => void;
    onCopyLink?: (params: ICellRendererParams) => void;
    isDeleting: boolean;
    isSyncing: boolean;
    syncingRowId: string | null;
  };
}
const props = defineProps<Props>();

const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

function sync() {
  props.params.onSync && props.params.onSync(props.params);
}
function stop() {
  props.params.onStop && props.params.onStop(props.params);
}
function copyLink() {
  props.params.onCopyLink && props.params.onCopyLink(props.params);
  copied.value = true;
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copied.value = false;
  }, 1200);
}
const isDisabled = computed(() => props.params.isDeleting || props.params.isSyncing);
const isLoading = computed(() => props.params.isSyncing && props.params.node.id === props.params.syncingRowId);
</script>

<template>
  <div class="flex items-center justify-center gap-3">
    <UButton v-if="isLoading" color="green" size="xs" variant="solid" @click="stop">
      <Loader :size="14" class="animate-spin" />
      停止</UButton
    >
    <UButton
      v-else
      icon="i-lucide:refresh-cw"
      color="blue"
      size="xs"
      :disabled="isDisabled"
      @click="sync"
    ></UButton>
    <UTooltip text="复制公众号链接" :popper="{ placement: 'top' }">
      <UButton
        :icon="copied ? 'i-lucide:check' : 'i-lucide:link'"
        color="gray"
        size="xs"
        square
        variant="ghost"
        :disabled="isDisabled"
        @click="copyLink"
      />
    </UTooltip>
  </div>
</template>
