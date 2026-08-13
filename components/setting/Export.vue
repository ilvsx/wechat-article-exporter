<template>
  <UCard>
    <template #header>
      <h3 class="text-base font-semibold text-slate-12 dark:text-slate-100">导出选项</h3>
      <p class="text-xs text-slate-11">配置文章的导出选项</p>
    </template>

    <div class="flex flex-col space-y-5">
      <div>
        <p class="mb-2">
          <span class="mr-3">导出目录名:</span>
          <span class="inline-block w-8">
            <UPopover mode="hover" :popper="{ placement: 'right' }">
              <UButton color="white" size="sm" trailing-icon="i-lucide:braces" />

              <template #panel>
                <div class="p-4">
                  <p class="my-2 text-sm text-slate-11">
                    使用 <code class="px-1 py-0.5 bg-slate-3 dark:bg-slate-800 rounded font-mono text-xs">${变量名}</code> 的格式插入变量，例如：<code class="px-1 py-0.5 bg-slate-3 dark:bg-slate-800 rounded font-mono text-xs">${YYYY}-${MM}-${DD}_${title}</code>
                  </p>
                  <p class="my-2 font-medium">支持的变量：</p>
                  <table class="w-full border-collapse border">
                    <tbody>
                      <tr>
                        <th class="w-20">变量</th>
                        <th class="w-32">含义</th>
                        <th class="w-20">变量</th>
                        <th class="w-32">含义</th>
                      </tr>
                      <tr v-for="(item, idx) in variables" :key="idx">
                        <td class="text-center">
                          <UButton
                            v-if="item[0].name"
                            size="xs"
                            color="primary"
                            variant="link"
                            @click="insertVariable(item[0].name)"
                            >{{ item[0].name }}</UButton
                          >
                        </td>
                        <td class="text-center">{{ item[0].description }}</td>
                        <td class="text-center">
                          <UButton
                            v-if="item[1].name"
                            size="xs"
                            color="primary"
                            variant="link"
                            @click="insertVariable(item[1].name)"
                            >{{ item[1].name }}</UButton
                          >
                        </td>
                        <td class="text-center">{{ item[1].description }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </UPopover>
          </span>
        </p>
        <p class="text-sm mb-2 text-slate-11">影响 <span class="font-mono">html/txt/markdown/word/pdf</span> 的导出</p>
        <UInput
          ref="dirnameInputRef"
          placeholder="目录名格式"
          class="w-full max-w-xl font-mono"
          name="dirname"
          v-model="preferences.exportConfig.dirname"
        />
        <p class="mt-2 text-sm text-slate-11">
          <span class="mr-1">预览:</span>
          <span class="font-mono text-slate-12 dark:text-slate-300">{{ dirnamePreview }}</span>
        </p>
      </div>
      <div>
        <p class="mb-2 flex items-center gap-3">
          <span>目录名最大长度:</span>
          <span class="text-xs text-slate-11">(0表示不限制)</span>
          <UInput
            class=""
            placeholder="目录名最大长度"
            v-model="preferences.exportConfig.maxlength"
            type="number"
            min="0"
          />
        </p>
      </div>
      <div>
        <UCheckbox
          v-model="preferences.exportConfig.exportExcelIncludeContent"
          name="exportExcelIncludeContent"
          label="导出 Excel 中包含文章内容"
        />
      </div>
      <div>
        <UCheckbox
          v-model="preferences.exportConfig.exportJsonIncludeContent"
          name="exportJsonIncludeContent"
          label="导出 JSON 中包含文章内容"
        />
        <UCheckbox
          v-model="preferences.exportConfig.exportJsonIncludeComments"
          name="exportJsonIncludeComments"
          label="导出 JSON 中包含留言数据"
        />
      </div>
      <div>
        <UCheckbox
          v-model="preferences.exportConfig.exportHtmlIncludeComments"
          name="exportHtmlIncludeComments"
          label="导出 HTML 中包含留言数据"
        />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { Preferences } from '~/types/preferences';

const preferences: Ref<Preferences> = usePreferences() as unknown as Ref<Preferences>;

const sampleData: Record<string, string> = {
  account: '人民日报',
  title: '这是一篇示例文章标题',
  aid: '100000001',
  author: '张三',
  YYYY: '2025',
  MM: '03',
  DD: '15',
  HH: '10',
  mm: '30',
};

const dirnameInputRef = ref<InstanceType<typeof UInput> | null>(null);

// 在光标处插入 ${变量名}
function insertVariable(name: string) {
  const input = dirnameInputRef.value?.$el?.querySelector('input') as HTMLInputElement | null;
  const current = preferences.value.exportConfig.dirname || '';
  const pos = input ? (input.selectionStart ?? current.length) : current.length;
  const token = `\${${name}}`;
  preferences.value.exportConfig.dirname = current.slice(0, pos) + token + current.slice(pos);
  nextTick(() => {
    if (input) {
      input.focus();
      input.setSelectionRange(pos + token.length, pos + token.length);
    }
  });
}

const dirnamePreview = computed(() => {
  let result = preferences.value.exportConfig.dirname || '';
  for (const [key, value] of Object.entries(sampleData)) {
    result = result.replace(new RegExp(`\\$\\{${key}}`, 'g'), value);
  }
  const maxlength = preferences.value.exportConfig.maxlength;
  if (maxlength) {
    result = result.slice(0, maxlength);
  }
  return result || '（空）';
});

const _variables = [
  { name: 'account', description: '公众号名称' },
  { name: 'title', description: '文章标题' },
  { name: 'aid', description: '文章id' },
  { name: 'author', description: '作者' },
  { name: 'YYYY', description: '年' },
  { name: 'MM', description: '月' },
  { name: 'DD', description: '日' },
  { name: 'HH', description: '时' },
  { name: 'mm', description: '分' },
];
const variables = Array.from({ length: Math.ceil(_variables.length / 2) }, (_, i) => [
  _variables[i * 2] ?? {},
  _variables[i * 2 + 1] ?? {},
]);
</script>

<style scoped>
table th {
  padding: 0.5rem 0.25rem;
}
table td {
  border: 1px solid #00002d17;
  padding: 0.25rem 0.5rem;
}

td:first-child,
th:first-child {
  border-left: none;
}

td:last-child,
th:last-child {
  border-right: none;
}

th {
  border: 1px solid #00002d17;
  border-top: none;
}

tr:nth-child(even) {
  background-color: #00005506;
}

tr:hover {
  background-color: #00005506;
}
</style>
