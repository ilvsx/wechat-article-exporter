<script setup lang="ts">
import type { ICellRendererParams } from 'ag-grid-community';

interface Props {
  params: ICellRendererParams;
}
defineProps<Props>();
</script>

<template>
  <p v-if="params.node.group">
    <span>{{ params.value }}</span>
  </p>
  <p v-else class="flex flex-wrap">
    <UBadge v-if="params.value" color="green" variant="subtle" size="xs">是</UBadge>
    <UBadge v-else color="gray" variant="subtle" size="xs">否</UBadge>
  </p>
</template>
