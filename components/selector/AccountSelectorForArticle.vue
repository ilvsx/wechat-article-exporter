<template>
  <USelectMenu
    v-model="selected"
    size="md"
    color="gray"
    searchable
    searchable-placeholder="筛选公众号..."
    clear-search-on-close
    :options="accountOptions"
    option-attribute="nickname"
    placeholder="请选择公众号"
  >
    <template #label>
      <UAvatar v-if="selected && selected.fakeid !== ALL_ACCOUNTS_FAKEID" :src="selected.round_head_img" size="2xs" />
      <UAvatar v-else class="bg-primary-100" icon="i-lucide:layout-grid" size="2xs" />
      <span v-if="selected" class="max-w-30 line-clamp-1">{{ selected.nickname }}</span>
      <span v-if="selected" class="shrink-0">({{ selected.articles }}篇)</span>
    </template>
    <template #option="{ option: account }">
      <template v-if="account.fakeid === ALL_ACCOUNTS_FAKEID">
        <div class="flex items-center gap-2">
          <span
            class="flex size-6 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-300"
          >
            <UIcon name="i-lucide:layout-grid" class="size-3.5" />
          </span>
          <div>
            <p class="text-sm font-medium">{{ account.nickname }}</p>
            <p class="text-slate-11 text-xs">全部已缓存文章</p>
          </div>
        </div>
      </template>
      <template v-else>
        <UAvatar :src="account.round_head_img" size="sm" />
        <div>
          <p class="text-sm font-medium">{{ account.nickname }}</p>
          <p class="text-slate-11 text-xs">已加载文章数: {{ account.articles }}</p>
        </div>
      </template>
    </template>
    <template #option-empty="{ query }">
      未找到匹配「{{ query }}」的公众号<br />请先在「<NuxtLink
        to="/dashboard/account"
        class="text-blue-500 hover:underline"
        >公众号管理</NuxtLink
      >」中添加
    </template>
    <template #empty>
      暂无公众号，请先在「<NuxtLink to="/dashboard/account" class="text-blue-500 hover:underline">公众号管理</NuxtLink
      >」中添加
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { ALL_ACCOUNTS_FAKEID } from '~/config';
import { db } from '~/store/v2/db';
import { getAllInfo, type MpAccount } from '~/store/v2/info';

// 已缓存的公众号信息
const cachedAccountInfos = await getAllInfo();
// 「全部公众号」显示真实缓存文章数(与文章表格一致;info 表计数可能滞后)
const totalArticleCount = await db.article.count();
const sortedAccountInfos = computed(() => {
  cachedAccountInfos.sort((a, b) => {
    return a.articles > b.articles ? -1 : 1;
  });
  return cachedAccountInfos;
});

// 「全部公众号」哨兵选项(排最前)
const allOption = computed<MpAccount>(() => {
  return {
    fakeid: ALL_ACCOUNTS_FAKEID,
    completed: true,
    count: 0,
    articles: totalArticleCount,
    total_count: totalArticleCount,
    nickname: '全部公众号',
  };
});

const accountOptions = computed(() => [allOption.value, ...sortedAccountInfos.value]);

const selected = defineModel<MpAccount | undefined>();
</script>
