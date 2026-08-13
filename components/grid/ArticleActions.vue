<script setup lang="ts">
import type { ICellRendererParams } from 'ag-grid-community';

interface Props {
  params: ICellRendererParams & {
    onGotoLink?: (params: ICellRendererParams) => void;
    onPreview?: (params: ICellRendererParams) => void;
    onCopyLink?: (params: ICellRendererParams) => void;
  };
}
const props = defineProps<Props>();

const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

function gotoLink() {
  props.params.onGotoLink && props.params.onGotoLink(props.params);
}
function preview() {
  props.params.onPreview && props.params.onPreview(props.params);
}
function copyLink() {
  props.params.onCopyLink && props.params.onCopyLink(props.params);
  copied.value = true;
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copied.value = false;
  }, 1200);
}
</script>

<template>
  <div class="flex items-center justify-center">
    <UTooltip text="复制文章链接" :popper="{ placement: 'bottom' }">
      <UButton
        :icon="copied ? 'i-lucide:check' : 'i-lucide:link'"
        color="blue"
        square
        variant="ghost"
        class="transition-all duration-150 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
        @click="copyLink"
      />
    </UTooltip>
    <UTooltip text="访问原文" :popper="{ placement: 'bottom' }">
      <UButton
        icon="i-lucide:external-link"
        color="blue"
        square
        variant="ghost"
        class="transition-all duration-150 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
        @click="gotoLink"
      />
    </UTooltip>
    <UTooltip text="预览" :popper="{ placement: 'bottom' }">
      <UButton
        :disabled="!params.data.contentDownload || params.data.downloading"
        icon="i-lucide:flame"
        :color="params.data.contentDownload ? 'blue' : 'rose'"
        square
        variant="ghost"
        class="transition-all duration-150 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
        @click="preview"
      />
    </UTooltip>
  </div>
</template>
