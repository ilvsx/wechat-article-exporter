<template>
  <UCard>
    <template #header>
      <h3 class="text-base font-semibold text-slate-12 dark:text-slate-100">数据备份</h3>
      <p class="text-xs text-slate-11">导出/导入浏览器本地数据库（文章、正文、留言、阅读量等全部数据）</p>
    </template>

    <div class="flex items-center gap-3">
      <UButton color="primary" icon="i-lucide:download" :loading="exporting" @click="exportBackup">
        导出备份
      </UButton>
      <UButton color="gray" icon="i-lucide:upload" :loading="importing" @click="fileRef!.click()">
        导入备份
      </UButton>
      <input ref="fileRef" type="file" accept=".zip" class="hidden" @change="onFileChange" />
      <p class="text-xs text-slate-11 dark:text-slate-400">导入会清空现有数据后恢复，建议先导出备份</p>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { useBackup } from '~/composables/useBackup';

const { exporting, importing, exportBackup, importBackup } = useBackup();

const fileRef = ref<HTMLInputElement | null>(null);

async function onFileChange(evt: Event) {
  const files = (evt.target as HTMLInputElement).files;
  const file = files && files.length > 0 ? files[0] : null;
  if (file) {
    await importBackup(file);
  }
  // 重置 input，允许重复选择同一文件
  if (fileRef.value) {
    fileRef.value.value = '';
  }
}
</script>
