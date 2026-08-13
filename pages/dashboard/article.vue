<script setup lang="ts">
import type {
  ColDef,
  FilterChangedEvent,
  GetRowIdParams,
  GridApi,
  GridOptions,
  GridReadyEvent,
  ICellRendererParams,
  SelectionChangedEvent,
  ValueFormatterParams,
  ValueGetterParams,
} from 'ag-grid-community';

import { AgGridVue } from 'ag-grid-vue3';
import dayjs from 'dayjs';
import { defu } from 'defu';
import type { PreviewArticle } from '#components';
import { durationToSeconds, formatItemShowType, formatTimeStamp, sleep } from '#shared/utils/helpers';
import { validateHTMLContent } from '#shared/utils/html';
import GridAlbum from '~/components/grid/Album.vue';
import GridArticleActions from '~/components/grid/ArticleActions.vue';
import GridCoverTooltip from '~/components/grid/CoverTooltip.vue';
import GridStatusBar from '~/components/grid/StatusBar.vue';
import AccountSelectorForArticle from '~/components/selector/AccountSelectorForArticle.vue';
import { isDev, websiteName } from '~/config';
import { sharedGridOptions } from '~/config/shared-grid-options';
import { articleDeleted, getArticleCache, updateArticleStatus } from '~/store/v2/article';
import { getCommentCache } from '~/store/v2/comment';
import { getDebugCache } from '~/store/v2/debug';
import { getHtmlCache } from '~/store/v2/html';
import { type MpAccount } from '~/store/v2/info';
import { getMetadataCache, type Metadata } from '~/store/v2/metadata';
import type { Preferences } from '~/types/preferences';
import type { AppMsgExWithFakeID } from '~/types/types';
import type { ArticleMetadata } from '~/utils/download/types';
import { createBooleanColumnFilterParams, createDateColumnFilterParams, saveDefaultColumnState } from '~/utils/grid';

useHead({
  title: `文章下载 | ${websiteName}`,
});

// 当前页面的数据模型
interface Article extends AppMsgExWithFakeID, Partial<ArticleMetadata> {
  /**
   * 文章内容是否已下载
   */
  contentDownload: boolean;

  /**
   * 留言内容是否已下载
   */
  commentDownload: boolean;
}

let globalRowData: Article[] = [];
// 当前账号的全部文章（已按 hideDeleted 过滤），供时间范围筛选使用
let allArticles: Article[] = [];

// 发布时间范围筛选（unix 秒，为所选日期的 00:00:00）
const dateRangeStart = ref<number | null>(null);
const dateRangeEnd = ref<number | null>(null);

function formatDate(value: number | null, fallback: string): string {
  return value === null ? fallback : dayjs.unix(value).format('YYYY-MM-DD');
}

// 按发布时间范围过滤表格数据；结束日期包含当天（+86399 秒到 23:59:59）
function applyDateRangeFilter() {
  const start = dateRangeStart.value;
  const end = dateRangeEnd.value;
  globalRowData = allArticles.filter(article => {
    if (start !== null && article.update_time < start) return false;
    if (end !== null && article.update_time > end + 86399) return false;
    return true;
  });
  gridApi.value?.setGridOption('rowData', globalRowData);
}

function clearDateRange() {
  dateRangeStart.value = null;
  dateRangeEnd.value = null;
}

watch([dateRangeStart, dateRangeEnd], () => {
  applyDateRangeFilter();
});

const columnDefs = ref<ColDef[]>([
  {
    headerName: 'ID',
    field: 'aid',
    cellDataType: 'text',
    filter: 'agTextColumnFilter',
    minWidth: 150,
    initialHide: true,
    cellClass: 'flex justify-center items-center font-mono',
  },
  {
    headerName: '链接',
    field: 'link',
    cellDataType: 'text',
    filter: 'agTextColumnFilter',
    minWidth: 150,
    initialHide: true,
    cellClass: 'font-mono',
  },
  {
    headerName: '标题',
    field: 'title',
    cellDataType: 'text',
    filter: 'agTextColumnFilter',
    tooltipField: 'title',
    minWidth: 200,
  },
  {
    headerName: '封面',
    field: 'cover',
    sortable: false,
    filter: false,
    cellRenderer: (params: ICellRendererParams) => {
      return `<img alt="" src="${params.value}" style="height: 40px; width: 40px; object-fit: cover;" />`;
    },
    tooltipField: 'cover',
    tooltipComponent: GridCoverTooltip,
    minWidth: 80,
    hide: true,
    cellClass: 'flex justify-center items-center',
  },
  {
    headerName: '摘要',
    field: 'digest',
    cellDataType: 'text',
    filter: 'agTextColumnFilter',
    tooltipField: 'digest',
    minWidth: 200,
    initialHide: true,
  },
  {
    headerName: '创建时间',
    field: 'create_time',
    valueFormatter: p => formatTimeStamp(p.value),
    filter: 'agDateColumnFilter',
    filterParams: createDateColumnFilterParams(),
    filterValueGetter: (params: ValueGetterParams) => {
      return new Date(params.getValue('create_time') * 1000);
    },
    minWidth: 180,
    initialHide: true,
    cellClass: 'flex justify-center items-center font-mono',
  },
  {
    headerName: '发布时间',
    field: 'update_time',
    valueFormatter: p => formatTimeStamp(p.value),
    filter: 'agDateColumnFilter',
    filterParams: createDateColumnFilterParams(),
    filterValueGetter: (params: ValueGetterParams) => {
      return new Date(params.getValue('update_time') * 1000);
    },
    minWidth: 180,
    cellClass: 'flex justify-center items-center font-mono',
  },
  {
    headerName: '是否已删除',
    field: 'is_deleted',
    cellDataType: 'boolean',
    filter: 'agSetColumnFilter',
    filterParams: createBooleanColumnFilterParams('已删除', '未删除'),
    minWidth: 150,
    initialHide: true,
    cellClass: 'flex justify-center items-center',
  },
  {
    headerName: '文章状态',
    field: '_status',
    valueFormatter: p => p.value,
    filter: 'agSetColumnFilter',
    filterParams: {
      valueFormatter: (p: ValueFormatterParams) => p.value,
    },
    minWidth: 150,
    initialHide: true,
    cellClass: 'flex justify-center items-center',
  },
  {
    headerName: '内容已下载',
    headerClass: 'flex justify-center',
    field: 'contentDownload',
    cellDataType: 'boolean',
    filter: 'agSetColumnFilter',
    filterParams: createBooleanColumnFilterParams('已下载', '未下载'),
    minWidth: 150,
    cellClass: 'flex justify-center items-center',
  },
  {
    field: 'commentDownload',
    headerName: '留言已下载',
    headerClass: 'flex justify-center',
    cellDataType: 'boolean',
    filter: 'agSetColumnFilter',
    filterParams: createBooleanColumnFilterParams('已下载', '未下载'),
    minWidth: 150,
    cellClass: 'flex justify-center items-center',
  },
  {
    headerName: '阅读',
    field: 'readNum',
    cellDataType: 'number',
    filter: 'agNumberColumnFilter',
    minWidth: 100,
    cellClass: 'flex justify-center items-center font-mono',
  },
  {
    headerName: '点赞',
    field: 'oldLikeNum',
    cellDataType: 'number',
    filter: 'agNumberColumnFilter',
    minWidth: 100,
    cellClass: 'flex justify-center items-center font-mono',
  },
  {
    headerName: '分享',
    field: 'shareNum',
    cellDataType: 'number',
    filter: 'agNumberColumnFilter',
    minWidth: 100,
    cellClass: 'flex justify-center items-center font-mono',
  },
  {
    headerName: '喜欢',
    field: 'likeNum',
    cellDataType: 'number',
    filter: 'agNumberColumnFilter',
    minWidth: 100,
    cellClass: 'flex justify-center items-center font-mono',
  },
  {
    headerName: '留言',
    field: 'commentNum',
    cellDataType: 'number',
    filter: 'agNumberColumnFilter',
    minWidth: 100,
    cellClass: 'flex justify-center items-center font-mono',
  },
  {
    field: 'author_name',
    headerName: '作者',
    cellDataType: 'text',
    filter: 'agSetColumnFilter',
    minWidth: 150,
    cellClass: 'flex justify-center items-center',
  },
  {
    headerName: '是否原创',
    valueGetter: p => p.data && p.data.copyright_stat === 1 && p.data.copyright_type === 1,
    cellDataType: 'boolean',
    filter: 'agSetColumnFilter',
    filterParams: createBooleanColumnFilterParams('原创', '非原创'),
    minWidth: 150,
    cellClass: 'flex justify-center items-center',
  },
  {
    headerName: '是否付费',
    field: 'is_pay_subscribe',
    valueGetter: p => p.data && p.data.is_pay_subscribe === 1,
    cellDataType: 'boolean',
    filter: 'agSetColumnFilter',
    filterParams: createBooleanColumnFilterParams('付费', '免费'),
    minWidth: 150,
    initialHide: true,
    cellClass: 'flex justify-center items-center',
  },
  {
    headerName: '付费金额',
    field: 'wecoin_count',
    valueFormatter: p => (p.value ? `${p.value} 微币` : ''),
    cellDataType: 'number',
    filter: 'agNumberColumnFilter',
    minWidth: 120,
    initialHide: true,
    cellClass: 'flex justify-center items-center font-mono',
  },
  {
    headerName: '文章类型',
    field: 'item_show_type',
    valueFormatter: p => formatItemShowType(p.value),
    filter: 'agSetColumnFilter',
    filterParams: {
      valueFormatter: (p: ValueFormatterParams) => formatItemShowType(p.value),
    },
    minWidth: 150,
    initialHide: true,
    cellClass: 'flex justify-center items-center',
  },
  {
    headerName: '媒体时长',
    field: 'media_duration',
    valueGetter: params => durationToSeconds(params.data.media_duration), // 用于排序和过滤
    valueFormatter: params => params.data.media_duration,
    filter: 'agNumberColumnFilter',
    comparator: (a, b) => a - b,
    minWidth: 150,
    initialHide: true,
    cellClass: 'flex justify-center items-center font-mono',
  },
  {
    headerName: '所属合集',
    field: 'appmsg_album_infos',
    cellRenderer: GridAlbum,
    sortable: false,
    filter: false,
    valueFormatter: p => p.value.map((album: any) => album.title).join(','),
    minWidth: 150,
    initialHide: true,
  },
  {
    headerName: '操作',
    headerClass: 'flex justify-center',
    field: 'link',
    sortable: false,
    filter: false,
    cellRenderer: GridArticleActions,
    cellRendererParams: {
      onPreview: (params: ICellRendererParams) => {
        preview(params.data);
      },
      onGotoLink: (params: ICellRendererParams) => {
        window.open(params.value, '_blank');
      },
    },
    maxWidth: 100,
    pinned: 'right',
    cellClass: 'flex justify-center items-center',
  },
]);

// 注意，`defu`函数最左边的参数优先级最高
const gridTheme = useGridTheme();
const gridOptions: GridOptions = defu(
  {
    getRowId: (params: GetRowIdParams) => `${params.data.fakeid}:${params.data.aid}`,
    theme: gridTheme.value,
    context: { columnStateKey: 'agGridColumnState' },
    statusBar: {
      statusPanels: [
        {
          statusPanel: GridStatusBar,
          align: 'left',
        },
      ],
    },
  },
  sharedGridOptions
);

const gridApi = shallowRef<GridApi | null>(null);
watch(gridTheme, theme => {
  gridApi.value?.setGridOption('theme', theme);
});
function onGridReady(params: GridReadyEvent) {
  gridApi.value = params.api;

  // 保存默认列状态快照（须在 restoreColumnState 之前），供「重置列」恢复
  saveDefaultColumnState('agGridColumnState', params.api.getColumnState());
  restoreColumnState();
}

function onColumnStateChange() {
  if (gridApi.value) {
    saveColumnState();
  }
}
function saveColumnState() {
  const state = gridApi.value?.getColumnState();
  localStorage.setItem('agGridColumnState', JSON.stringify(state));
}

function restoreColumnState() {
  const stateStr = localStorage.getItem('agGridColumnState');
  if (stateStr) {
    const state = JSON.parse(stateStr);
    gridApi.value?.applyColumnState({
      state,
      applyOrder: true,
    });
  }
}

function onFilterChanged(event: FilterChangedEvent) {
  event.api.deselectAll();
}

const preferences = usePreferences();
const hideDeleted = computed(() => (preferences.value as unknown as Preferences).hideDeleted);

const previewArticleRef = ref<typeof PreviewArticle | null>(null);

function preview(article: Article) {
  previewArticleRef.value!.open(article);
}

const loading = ref(false);

// 只能选择单个账号
const selectedAccount = ref<MpAccount | undefined>();

watch(selectedAccount, newVal => {
  switchTableData(newVal!.fakeid).catch(() => {});
});

async function switchTableData(fakeid: string) {
  loading.value = true;
  const articles: Article[] = [];
  const data = await getArticleCache(fakeid, Math.floor(Date.now() / 1000));
  for (const article of data) {
    const contentDownload = (await getHtmlCache(article.link)) !== undefined;
    const commentDownload = (await getCommentCache(article.link)) !== undefined;
    const metadata = await getMetadataCache(article.link);
    if (metadata) {
      articles.push({
        ...metadata,
        ...article,
        contentDownload: contentDownload,
        commentDownload: commentDownload,
      });
    } else {
      articles.push({
        ...article,
        contentDownload: contentDownload,
        commentDownload: commentDownload,
      });
    }
  }
  await sleep(200);
  allArticles = articles.filter(article => (hideDeleted.value ? !article.is_deleted : true));
  applyDateRangeFilter();
  loading.value = false;
}

function updateRow(article: Article) {
  const rowNode = gridApi.value?.getRowNode(`${article.fakeid}:${article.aid}`);
  if (rowNode) {
    rowNode.updateData(article);
  }
}

const selectedArticles = shallowRef<Article[]>([]);
function onSelectionChanged(event: SelectionChangedEvent) {
  selectedArticles.value = (event.selectedNodes || []).map(node => node.data);
}
const selectedArticleUrls = computed(() => {
  return selectedArticles.value.map(article => article.link);
});
const contentNotDownloadedCount = computed(() => {
  return selectedArticles.value.filter(article => !article.contentDownload).length;
});

const {
  loading: downloadBtnLoading,
  completed_count: downloadCompletedCount,
  total_count: downloadTotalCount,
  download,
  stop: stopDownload,
} = useDownloader({
  onContent(url: string) {
    const article = globalRowData.find(article => article.link === url);
    if (article) {
      article.contentDownload = true;
      article._status = '正常';
      updateRow(article);

      updateArticleStatus(url, '正常');

      // 修复之前代码逻辑错误导致的数据库状态被误设置为【已删除】
      article.is_deleted = false;
      articleDeleted(url, false);
    } else {
      console.warn(`${url} not found in table data when update contentDownload`);
    }
  },
  onStatusChange(url: string, status: string) {
    const article = globalRowData.find(article => article.link === url);
    if (article) {
      article._status = status;
      updateRow(article);

      updateArticleStatus(url, status);
    }
  },
  onDelete(url: string) {
    const article = globalRowData.find(article => article.link === url);
    if (article) {
      article.is_deleted = true;
      article._status = '已删除';
      updateRow(article);

      updateArticleStatus(url, '已删除');
      articleDeleted(url);
    }
  },
  onMetadata(url: string, metadata: Metadata) {
    const article = globalRowData.find(article => article.link === url);
    if (article) {
      article.readNum = metadata.readNum;
      article.oldLikeNum = metadata.oldLikeNum;
      article.shareNum = metadata.shareNum;
      article.likeNum = metadata.likeNum;
      article.commentNum = metadata.commentNum;

      if ((preferences.value as unknown as Preferences).downloadConfig.metadataOverrideContent) {
        // 如果同步下载文章内容，则更新相关字段
        article.contentDownload = true;
        article._status = '正常';
        updateArticleStatus(url, '正常');

        // 修复之前代码逻辑错误导致的数据库状态被误设置为【已删除】
        article.is_deleted = false;
        articleDeleted(url, false);
      }

      updateRow(article);
    } else {
      console.warn(`${url} not found in table data when update metadata`);
    }
  },
  onComment(url: string) {
    const article = globalRowData.find(article => article.link === url);
    if (article) {
      article.commentDownload = true;
      updateRow(article);
    } else {
      console.warn(`${url} not found in table data when update commentDownload`);
    }
  },
});

const {
  loading: exportBtnLoading,
  phase: exportPhase,
  completed_count: exportCompletedCount,
  total_count: exportTotalCount,
  exportFile,
} = useExporter();

async function debug() {
  const cache = await getDebugCache('https://mp.weixin.qq.com/s/0IEaqpJIBGykHFKqj-7xqw');
  console.log(cache);
  if (cache) {
    const html = await cache.file.text();
    console.log(html);
    const result = validateHTMLContent(html);
    console.log(result);
  }
}

const copied = ref(false);
function copyWechatLink() {
  const link = `https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=${selectedAccount.value?.fakeid}&scene=124#wechat_redirect`;
  navigator.clipboard.writeText(link);

  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1000);
}
</script>

<template>
  <div class="h-full">
    <Teleport defer to="#title">
      <h1 class="text-base font-semibold text-slate-12 dark:text-slate-100">文章下载</h1>
    </Teleport>

    <div class="flex flex-col h-full gap-4 p-4">
      <!-- 顶部筛选与操作区 -->
      <header
        class="flex flex-col items-start gap-3 rounded-lg border border-slate-6 bg-white px-4 py-3 shadow-card dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="flex flex-col gap-2 xl:flex-row">
          <div class="flex space-x-3">
            <AccountSelectorForArticle v-model="selectedAccount" class="w-80" />
          </div>
          <!-- 发布时间范围筛选 -->
          <div class="flex items-center space-x-2">
            <UPopover :popper="{ placement: 'bottom-start' }">
              <UButton color="gray" icon="i-lucide:calendar-days" :label="formatDate(dateRangeStart, '开始日期')" />
              <template #panel="{ close }">
                <BaseDatePicker v-model="dateRangeStart" @close="close" />
              </template>
            </UPopover>
            <span class="select-none text-slate-9">–</span>
            <UPopover :popper="{ placement: 'bottom-start' }">
              <UButton color="gray" icon="i-lucide:calendar-days" :label="formatDate(dateRangeEnd, '结束日期')" />
              <template #panel="{ close }">
                <BaseDatePicker v-model="dateRangeEnd" @close="close" />
              </template>
            </UPopover>
            <UButton
              v-if="dateRangeStart !== null || dateRangeEnd !== null"
              size="xs"
              color="gray"
              variant="ghost"
              icon="i-lucide:x"
              @click="clearDateRange"
            />
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <UButton v-if="downloadBtnLoading" color="rose" variant="soft" @click="stopDownload">停止</UButton>
          <ButtonGroup
            :items="[
              { label: '文章内容', event: 'download-article-html' },
              { label: '阅读量 (需要Credential)', event: 'download-article-metadata' },
              { label: '留言内容 (需要Credential)', event: 'download-article-comment' },
            ]"
            @download-article-html="download('html', selectedArticleUrls)"
            @download-article-metadata="download('metadata', selectedArticleUrls)"
            @download-article-comment="download('comment', selectedArticleUrls)"
          >
            <UButton
              :loading="downloadBtnLoading"
              :disabled="!selectedAccount"
              color="primary"
              :label="downloadBtnLoading ? `抓取中 ${downloadCompletedCount}/${downloadTotalCount}` : '抓取'"
              trailing-icon="i-lucide:chevron-down"
            />
          </ButtonGroup>

          <ButtonGroup
            :items="[
              { label: 'Excel', event: 'export-article-excel' },
              { label: 'JSON', event: 'export-article-json' },
              { label: 'HTML', event: 'export-article-html' },
              { label: 'Txt', event: 'export-article-text' },
              { label: 'Markdown', event: 'export-article-markdown' },
              { label: 'Word (内测中)', event: 'export-article-word' },
              { label: 'PDF (内测中)', event: 'export-article-pdf' },
            ]"
            @export-article-excel="exportFile('excel', selectedArticleUrls)"
            @export-article-json="exportFile('json', selectedArticleUrls)"
            @export-article-html="exportFile('html', selectedArticleUrls, contentNotDownloadedCount)"
            @export-article-text="exportFile('text', selectedArticleUrls, contentNotDownloadedCount)"
            @export-article-markdown="exportFile('markdown', selectedArticleUrls, contentNotDownloadedCount)"
            @export-article-word="exportFile('word', selectedArticleUrls, contentNotDownloadedCount)"
            @export-article-pdf="exportFile('pdf', selectedArticleUrls, contentNotDownloadedCount)"
          >
            <UButton
              :loading="exportBtnLoading"
              :disabled="!selectedAccount"
              color="gray"
              :label="exportBtnLoading ? `${exportPhase} ${exportCompletedCount}/${exportTotalCount}` : '导出'"
              trailing-icon="i-lucide:chevron-down"
            />
          </ButtonGroup>

          <UButton
            :disabled="!selectedAccount"
            :icon="copied ? 'i-lucide:check' : 'i-lucide:link'"
            label="复制公众号链接"
            color="gray"
            @click="copyWechatLink"
          />
          <UButton v-if="isDev" @click="debug">调试</UButton>
        </div>
      </header>

      <div class="min-h-0 flex-1 overflow-hidden rounded-lg shadow-card">
        <ag-grid-vue
          style="width: 100%; height: 100%"
          :loading="loading"
          :rowData="globalRowData"
          :columnDefs="columnDefs"
          :gridOptions="gridOptions"
          @grid-ready="onGridReady"
          @filter-changed="onFilterChanged"
          @column-moved="onColumnStateChange"
          @column-visible="onColumnStateChange"
          @column-pinned="onColumnStateChange"
          @column-resized="onColumnStateChange"
          @selection-changed="onSelectionChanged"
        ></ag-grid-vue>
      </div>
    </div>

    <PreviewArticle ref="previewArticleRef" />
  </div>
</template>
