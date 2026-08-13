<template>
  <div class="h-full">
    <Teleport defer to="#title">
      <h1 class="text-base font-semibold text-slate-12 dark:text-slate-100">公共代理</h1>
    </Teleport>

    <div class="flex flex-col h-full gap-4 p-4">
      <!-- header -->
      <header
        class="space-y-3 rounded-lg border border-slate-6 bg-white px-4 py-3 shadow-card dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="flex justify-between items-center">
          <h2 class="text-base font-semibold text-slate-12 dark:text-slate-100">统计信息</h2>

          <div class="flex items-center gap-1.5">
            <UBadge color="green" variant="subtle">可用 {{ totalSuccess }}</UBadge>
            <UBadge color="rose" variant="subtle">不可用 {{ totalFailure }}</UBadge>
          </div>
        </div>
        <div class="flex items-center justify-between gap-3">
          <UAlert
            color="amber"
            variant="subtle"
            title="请合理使用公共代理资源"
            description="若需抓取大量数据，请搭建自己的私有代理节点。若发现某 IP 存在滥用公共代理从而导致官网无法使用，将可能被封禁。"
          />
          <p
            class="flex-shrink-0 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-700"
          >
            所有代理额度将在每天早上 8:00 刷新。
          </p>
          <UPopover :popper="{ placement: 'left-start', arrow: true }">
            <UButton
              :icon="hasBlocked ? 'i-lucide:annoyed' : 'i-lucide:smile'"
              variant="link"
              :color="hasBlocked ? 'rose' : 'green'"
            />

            <template #panel>
              <div class="p-4 space-y-3 max-h-80 overflow-y-scroll">
                <div>
                  <p>当前IP:</p>
                  <code class="font-medium" :class="hasBlocked ? 'text-rose-500' : 'text-green-500'">
                    {{ currentIP }}
                  </code>
                </div>
                <div>
                  <p class="flex justify-between items-center min-w-64">
                    <span>已被封禁IP:</span>
                    <span class="text-xs text-slate-11">若存在误伤，请联系开发者</span>
                  </p>
                  <ul>
                    <li v-for="ip in blockedIPS" :key="ip">
                      <code class="text-rose-500">{{ ip }}</code>
                    </li>
                  </ul>
                </div>
              </div>
            </template>
          </UPopover>
        </div>
      </header>

      <!-- 数据展示区 -->
      <div class="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-6 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div v-if="loading" class="flex justify-center items-center mt-5">
          <Loader :size="28" class="animate-spin text-slate-500" />
        </div>
        <ProxyMetrics :data="metricsData" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loader } from 'lucide-vue-next';
import { request } from '#shared/utils/request';
import ProxyMetrics from '~/components/ProxyMetrics.vue';
import { websiteName } from '~/config';
import type { AccountMetric } from '~/types/proxy';

useHead({
  title: `公共代理 | ${websiteName}`,
});

const loading = ref(false);
const metricsData = ref<AccountMetric[]>([]);

const totalSuccess = computed(
  () => metricsData.value.filter(item => item.metric && item.metric.dailyRequests < 100_000).length
);
const totalFailure = computed(
  () => metricsData.value.filter(item => item.metric && item.metric.dailyRequests >= 100_000).length
);

async function getMetricsData() {
  loading.value = true;
  try {
    metricsData.value = await fetch('/api/web/worker/overview-metrics')
      .then(res => res.json())
      .catch(e => {
        throw e;
      });
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

const currentIP = ref('');
const blockedIPS = ref<string[]>([]);

onMounted(async () => {
  await Promise.all([
    getMetricsData(),
    request('/api/web/misc/current-ip').then(data => {
      currentIP.value = data.ip;
    }),
    request<{ ips: string[] } | string[]>('/api/web/worker/blocked-ip-list').then(data => {
      blockedIPS.value = Array.isArray(data) ? data : data.ips || [];
    }),
  ]);
});
const hasBlocked = computed(() => {
  return blockedIPS.value.includes(currentIP.value);
});
</script>
