<template>
  <form @submit.prevent="search">
    <UInput
      icon="i-lucide:search"
      color="white"
      required
      v-model="query"
      size="md"
      :trailing="false"
      placeholder="搜索公众号名称…"
      aria-label="搜索公众号名称"
      autocomplete="off"
      spellcheck="false"
    />
  </form>
</template>

<script setup lang="ts">
const query = defineModel<string>();
const emit = defineEmits(['search']);

function search() {
  emit('search', query.value);
}
</script>
