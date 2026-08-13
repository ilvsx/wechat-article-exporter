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
import { durationToSeconds, formatItemShowType, formatTimeStamp } from '#shared/utils/helpers';
import { validateHTMLContent } from '#shared/utils/html';
import GridAlbum from '~/components/grid/Album.vue';
import GridArticleActions from '~/components/grid/ArticleActions.vue';
import GridCoverTooltip from '~/components/grid/CoverTooltip.vue';
import GridStatusBar from '~/components/grid/StatusBar.vue';
import AccountSelectorForArticle from '~/components/selector/AccountSelectorForArticle.vue';
import toastFactory from '~/composables/toast';
import { ALL_ACCOUNTS_FAKEID, isDev, websiteName } from '~/config';
import { sharedGridOptions } from '~/config/shared-grid-options';
import { articleDeleted, getArticleCache, updateArticleStatus } from '~/store/v2/article';
import { getCommentUrlSet } from '~/store/v2/comment';
import { getDebugCache } from '~/store/v2/debug';
import { getHtmlUrlSet } from '~/store/v2/html';
import { getAllInfo, getInfoCache, type MpAccount } from '~/store/v2/info';
import { getMetadataMap, type Metadata } from '~/store/v2/metadata';
import type { Preferences } from '~/types/preferences';
import type { AppMsgExWithFakeID } from '~/types/types';
import type { ArticleMetadata } from '~/utils/download/types';
import { createBooleanColumnFilterParams, createDateColumnFilterParams, saveDefaultColumnState } from '~/utils/grid';

const toast = toastFactory();

useHead({
  title: `文章下载 | ${websiteName}`,
});

// 当前页面的数据模型
interface Article extends AppMsgExWithFakeID, Partial<ArticleMetadata> {
  /**
   * 所属公众号昵称(全量视图区分来源)
   */
  accountName: string;

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

// 发布时间范围筛选(日期 unix 秒为 day 精度,时间单独存 HH:mm)
const dateRangeStart = ref<number | null>(null);
const dateRangeEnd = ref<number | null>(null);
const startTime = ref('00:00');
const endTime = ref('23:59');
// 结束时间跟随当前时刻(勾选后结束时间为"现在",随时间推进)
const endFollowNow = ref(false);

const QUICK_RANGES = [
  { key: 'today', label: '当天' },
  { key: '1d', label: '1天' },
  { key: '7d', label: '7天' },
  { key: '14d', label: '14天' },
  { key: '30d', label: '30天' },
];

function composeTimestamp(dateTs: number, time: string): number {
  const [h, m] = time.split(':').map(Number);
  return dayjs
    .unix(dateTs)
    .hour(h || 0)
    .minute(m || 0)
    .second(0)
    .unix();
}

function formatDateTime(dateTs: number | null, time: string, fallback: string): string {
  return dateTs === null ? fallback : dayjs.unix(composeTimestamp(dateTs, time)).format('MM-DD HH:mm');
}

// 快捷范围:当天=今日 00:00 起;Nd=当前时刻往前 N 天;结束均跟随当前
function applyQuickRange(key: string) {
  const now = dayjs();
  endFollowNow.value = true;
  if (key === 'today') {
    dateRangeStart.value = now.startOf('day').unix();
    startTime.value = '00:00';
  } else {
    const days = Number(key.replace('d', ''));
    dateRangeStart.value = now.subtract(days, 'days').unix();
    startTime.value = now.format('HH:mm');
  }
  dateRangeEnd.value = null;
  endTime.value = now.format('HH:mm');
  applyDateRangeFilter();
}

// 当前范围匹配的快捷项(用于按钮选中态)
const activeQuick = computed(() => {
  if (!endFollowNow.value || dateRangeStart.value === null) return null;
  const now = Date.now();
  const s = composeTimestamp(dateRangeStart.value, startTime.value);
  if (s === dayjs().startOf('day').unix()) return 'today';
  for (const d of [1, 7, 14, 30]) {
    if (Math.abs(s - (now - d * 86400)) < 120) return `${d}d`;
  }
  return null;
});

// 按发布时间范围过滤表格数据(精确到分钟)
function applyDateRangeFilter() {
  const hadSelection = selectedArticles.value.length > 0;
  const startTs = dateRangeStart.value !== null ? composeTimestamp(dateRangeStart.value, startTime.value) : null;
  const endTs = endFollowNow.value
    ? Math.floor(Date.now() / 1000)
    : dateRangeEnd.value !== null
      ? composeTimestamp(dateRangeEnd.value, endTime.value)
      : null;
  globalRowData = allArticles.filter(article => {
    if (startTs !== null && article.update_time < startTs) return false;
    if (endTs !== null && article.update_time > endTs) return false;
    return true;
  });
  gridApi.value?.setGridOption('rowData', globalRowData);
  // allArticles 为非响应式,手动同步空态文案(无文章 vs 筛选后 0 条)
  gridApi.value?.setGridOption('noRowsOverlayComponentParams', noRowsParams.value);
  if (hadSelection) {
    toast.info('时间范围已变化', '已勾选的文章可能不在当前范围内，请确认勾选');
  }
}

function clearDateRange() {
  dateRangeStart.value = null;
  dateRangeEnd.value = null;
  startTime.value = '00:00';
  endTime.value = '23:59';
  endFollowNow.value = false;
  applyDateRangeFilter();
}

watch([dateRangeStart, dateRangeEnd, startTime, endTime, endFollowNow], () => {
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
    cellClass: 'flex justify-center items-center',
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
    cellClass: 'flex justify-center items-center',
  },
  {
    headerName: '公众号',
    field: 'accountName',
    cellDataType: 'text',
    filter: 'agSetColumnFilter',
    tooltipField: 'accountName',
    minWidth: 160,
    cellClass: 'flex justify-center items-center',
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
    initialSort: 'desc',
    minWidth: 180,
    cellClass: 'flex justify-center items-center',
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
    cellClass: 'flex justify-center items-center',
  },
  {
    headerName: '点赞',
    field: 'oldLikeNum',
    cellDataType: 'number',
    filter: 'agNumberColumnFilter',
    minWidth: 100,
    cellClass: 'flex justify-center items-center',
  },
  {
    headerName: '分享',
    field: 'shareNum',
    cellDataType: 'number',
    filter: 'agNumberColumnFilter',
    minWidth: 100,
    cellClass: 'flex justify-center items-center',
  },
  {
    headerName: '喜欢',
    field: 'likeNum',
    cellDataType: 'number',
    filter: 'agNumberColumnFilter',
    minWidth: 100,
    cellClass: 'flex justify-center items-center',
  },
  {
    headerName: '留言',
    field: 'commentNum',
    cellDataType: 'number',
    filter: 'agNumberColumnFilter',
    minWidth: 100,
    cellClass: 'flex justify-center items-center',
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
    cellClass: 'flex justify-center items-center',
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
    cellClass: 'flex justify-center items-center',
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
const pageSizePref = useLocalStorage('article:pageSize', 50);
const noRowsParams = computed(() => ({
  noRowsMessage:
    allArticles.length === 0 ? '暂无文章数据，请先在「公众号管理」中同步文章' : '没有符合条件的文章，请调整筛选条件',
}));
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
    // 分页(管理后台式,每页 50/100/200)
    pagination: true,
    paginationPageSize: pageSizePref.value,
    paginationPageSizeSelector: [50, 100, 200],
    noRowsOverlayComponentParams: noRowsParams.value,
  },
  sharedGridOptions
);

const gridApi = shallowRef<GridApi | null>(null);
watch(gridTheme, theme => {
  gridApi.value?.setGridOption('theme', theme);
});
watch(noRowsParams, params => {
  gridApi.value?.setGridOption('noRowsOverlayComponentParams', params);
});
function onGridReady(params: GridReadyEvent) {
  gridApi.value = params.api;

  // 保存默认列状态快照（须在 restoreColumnState 之前），供「重置列」恢复
  saveDefaultColumnState('agGridColumnState', params.api.getColumnState());
  restoreColumnState();
  // 全量视图显示公众号列;单账号视图默认隐藏(用户手动调整后不受影响)
  params.api.setColumnsVisible(['accountName'], isAllScope.value);
  refreshCounts();
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
  const cleared = selectedArticles.value.length;
  if (cleared > 0) {
    toast.info('筛选条件已变化', `已清除 ${cleared} 条勾选`);
  }
  event.api.deselectAll();
}

// 分页页大小/页码变化:持久化页大小并刷新范围数量标签
function onPaginationChanged() {
  if (!gridApi.value) return;
  pageSizePref.value = gridApi.value.paginationGetPageSize();
  refreshCounts();
}

// 「当前页/筛选结果」范围数量标签(与状态栏同口径)
const filteredRowCount = ref(0);
const pageRowCount = ref(0);
function refreshCounts() {
  const api = gridApi.value;
  if (!api) return;
  filteredRowCount.value = api.getDisplayedRowCount();
  const page = api.paginationGetCurrentPage();
  const size = api.paginationGetPageSize();
  pageRowCount.value = Math.max(0, Math.min(size, filteredRowCount.value - page * size));
}

const preferences = usePreferences();
const hideDeleted = computed(() => (preferences.value as unknown as Preferences).hideDeleted);

const previewArticleRef = ref<typeof PreviewArticle | null>(null);

function preview(article: Article) {
  previewArticleRef.value!.open(article);
}

const loading = ref(false);

// 账号筛选:默认「全部公众号」(undefined 或哨兵均视为全部,由选择器统一渲染计数)
const selectedAccount = ref<MpAccount | undefined>();
const scope = computed(() => {
  const fakeid = selectedAccount.value?.fakeid;
  return fakeid === undefined || fakeid === ALL_ACCOUNTS_FAKEID ? 'all' : fakeid;
});
const isAllScope = computed(() => scope.value === 'all');

// 单账号视图隐藏公众号列;全量视图显示(用户手动调整后下次切换才重置)
watch(scope, () => {
  gridApi.value?.setColumnsVisible(['accountName'], isAllScope.value);
  refreshCounts();
});

watch(selectedAccount, () => {
  switchTableData(scope.value).catch(() => {});
});

onMounted(() => {
  // 进入页面默认加载全部公众号文章
  switchTableData(scope.value).catch(() => {});
});

async function switchTableData(fakeid: string) {
  loading.value = true;
  const articles: Article[] = [];
  const nowTs = Math.floor(Date.now() / 1000);
  // 一次性批量获取状态集合:html/comment 仅取主键(不加载 Blob),metadata 全量合并数值
  const [htmlSet, commentSet, metadataMap] = await Promise.all([getHtmlUrlSet(), getCommentUrlSet(), getMetadataMap()]);

  let lists: AppMsgExWithFakeID[][];
  let accountNames: Map<string, string>;
  if (fakeid === 'all') {
    const accounts = await getAllInfo();
    accountNames = new Map(accounts.map(account => [account.fakeid, account.nickname || account.fakeid]));
    lists = await Promise.all(accounts.map(account => getArticleCache(account.fakeid, nowTs)));
  } else {
    const account = await getInfoCache(fakeid);
    accountNames = new Map([[fakeid, account?.nickname || fakeid]]);
    lists = [await getArticleCache(fakeid, nowTs)];
  }

  for (const list of lists) {
    for (const article of list) {
      const metadata = metadataMap.get(article.link);
      articles.push({
        ...(metadata ?? {}),
        ...article,
        accountName: accountNames.get(article.fakeid) || article.fakeid,
        contentDownload: htmlSet.has(article.link),
        commentDownload: commentSet.has(article.link),
      });
    }
  }
  allArticles = articles.filter(article => (hideDeleted.value ? !article.is_deleted : true));
  applyDateRangeFilter();
  loading.value = false;

  if (allArticles.length > 10000) {
    toast.info('已加载全部文章', `共 ${allArticles.length} 篇,数据量较大,建议使用公众号筛选`);
  } else if (allArticles.length > 0) {
    toast.success('加载完成', `共 ${allArticles.length} 篇文章`);
  }
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

// ---- 导出范围控制 ----
type ExportScope = 'selected' | 'page' | 'filtered';
type ExportType = 'excel' | 'json' | 'html' | 'text' | 'markdown' | 'word' | 'pdf';
const exportScope = ref<ExportScope>('selected');
// 持久化偏好:仅在无勾选时生效,避免「上次选的当前页 + 新勾选」误导出
const scopePref = useLocalStorage<ExportScope>('article:exportScope', 'selected');
let userTouchedScope = false;

watch(selectedArticles, rows => {
  if (rows.length > 0) {
    if (!userTouchedScope) exportScope.value = 'selected';
  } else {
    exportScope.value = scopePref.value;
    userTouchedScope = false;
  }
});
watch(exportScope, scope => {
  if (selectedArticles.value.length === 0) scopePref.value = scope;
});

function selectExportScope(next: ExportScope) {
  userTouchedScope = true;
  exportScope.value = next;
}

// 按当前范围收集导出目标行(与状态栏「共N条」同口径,含列筛选)
function collectExportRows(): Article[] {
  const api = gridApi.value;
  if (!api) return [];
  if (exportScope.value === 'selected') return selectedArticles.value;
  const rows: Article[] = [];
  if (exportScope.value === 'page') {
    const start = api.paginationGetCurrentPage() * api.paginationGetPageSize();
    const end = start + api.paginationGetPageSize();
    api.forEachNodeAfterFilterAndSort((node, index) => {
      if (index >= start && index < end) rows.push(node.data);
    });
  } else {
    api.forEachNodeAfterFilterAndSort(node => rows.push(node.data));
  }
  return rows;
}

const exportScopeOptions = computed(() => [
  { label: `勾选的行 (${selectedArticles.value.length})`, value: 'selected' },
  { label: `当前页 (${pageRowCount.value})`, value: 'page' },
  { label: `筛选结果 (${filteredRowCount.value})`, value: 'filtered' },
]);
const needsContentFormats = new Set(['html', 'text', 'markdown', 'word', 'pdf']);

// 导出弹窗:范围 + 格式一次选定
const exportDialogOpen = ref(false);
const exportFormats: { type: ExportType; label: string }[] = [
  { type: 'excel', label: 'Excel' },
  { type: 'json', label: 'JSON' },
  { type: 'html', label: 'HTML' },
  { type: 'text', label: 'Txt' },
  { type: 'markdown', label: 'Markdown' },
  { type: 'word', label: 'Word (内测中)' },
  { type: 'pdf', label: 'PDF (内测中)' },
];
const exportFormatPref = useLocalStorage<ExportType>('article:exportFormat', 'excel');

// 弹窗内实时计算的目标行与未抓取数
const dialogExportRows = computed(() => collectExportRows());
const dialogNoContentCount = computed(() => dialogExportRows.value.filter(row => !row.contentDownload).length);
const dialogNeedsContent = computed(() => needsContentFormats.has(exportFormatPref.value));

function openExportDialog() {
  if (exportBtnLoading.value) return;
  // 有勾选且未手动改过范围时，默认落回「勾选的行」
  if (selectedArticles.value.length > 0 && !userTouchedScope) exportScope.value = 'selected';
  exportDialogOpen.value = true;
}

function confirmDialogExport(skipNoContent: boolean) {
  const rows = dialogExportRows.value;
  if (rows.length === 0) {
    toast.warning('提示', exportScope.value === 'selected' ? '请先勾选要导出的文章' : '没有可导出的文章');
    return;
  }
  exportDialogOpen.value = false;
  runExport(exportFormatPref.value, rows, skipNoContent);
}

function runExport(type: ExportType, rows: Article[], skipNoContent = false) {
  let urls = rows.map(row => row.link);
  let noContent = rows.filter(row => !row.contentDownload).length;
  if (skipNoContent) {
    urls = rows.filter(row => row.contentDownload).map(row => row.link);
    noContent = 0;
  }
  exportFile(type, urls, noContent);
}

// ---- 抓取确认框(勾选超过阈值时防误操作) ----
const DOWNLOAD_CONFIRM_THRESHOLD = 200;
const downloadConfirmOpen = ref(false);
const pendingDownload = ref<{ type: 'html' | 'metadata' | 'comment'; rows: Article[] } | null>(null);
const pendingDownloadUrls = computed(() => pendingDownload.value?.rows.map(row => row.link) ?? []);

function requestDownload(type: 'html' | 'metadata' | 'comment') {
  const rows = selectedArticles.value;
  if (rows.length === 0) {
    toast.warning('提示', '请先勾选要抓取的文章');
    return;
  }
  if (rows.length > DOWNLOAD_CONFIRM_THRESHOLD) {
    pendingDownload.value = { type, rows };
    downloadConfirmOpen.value = true;
    return;
  }
  download(
    type,
    rows.map(row => row.link)
  );
}

function confirmDownload() {
  const pending = pendingDownload.value;
  if (!pending) return;
  downloadConfirmOpen.value = false;
  download(pending.type, pendingDownloadUrls.value);
}

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
const canCopyLink = computed(() => !isAllScope.value && !!selectedAccount.value);
function copyWechatLink() {
  const link = `https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=${selectedAccount.value?.fakeid}#wechat_redirect`;
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
          <div class="flex flex-wrap items-center gap-2">
            <!-- 快捷范围 -->
            <div class="flex items-center gap-0.5 rounded-lg bg-slate-3 p-0.5 dark:bg-slate-800">
              <UButton
                v-for="r in QUICK_RANGES"
                :key="r.key"
                size="xs"
                :variant="activeQuick === r.key ? 'solid' : 'ghost'"
                :color="activeQuick === r.key ? 'primary' : 'gray'"
                @click="applyQuickRange(r.key)"
                >{{ r.label }}</UButton
              >
            </div>
            <!-- 开始时间 -->
            <UPopover :popper="{ placement: 'bottom-start' }">
              <UButton
                color="gray"
                size="sm"
                icon="i-lucide:calendar-clock"
                :label="formatDateTime(dateRangeStart, startTime, '开始时间')"
              />
              <template #panel="{ close }">
                <div class="flex flex-col gap-3 p-3">
                  <BaseDatePicker v-model="dateRangeStart" @close="close" />
                  <UInput v-model="startTime" type="time" size="sm" class="w-36" />
                </div>
              </template>
            </UPopover>
            <span class="select-none text-slate-9">–</span>
            <!-- 结束时间 -->
            <UPopover :popper="{ placement: 'bottom-start' }">
              <UButton
                color="gray"
                size="sm"
                icon="i-lucide:calendar-clock"
                :label="endFollowNow ? '跟随当前时刻' : formatDateTime(dateRangeEnd, endTime, '结束时间')"
                :disabled="endFollowNow"
              />
              <template #panel="{ close }">
                <div class="flex flex-col gap-3 p-3">
                  <BaseDatePicker v-model="dateRangeEnd" :disabled="endFollowNow" @close="close" />
                  <UInput v-model="endTime" type="time" size="sm" class="w-36" :disabled="endFollowNow" />
                </div>
              </template>
            </UPopover>
            <UCheckbox v-model="endFollowNow" size="sm" label="结束跟随当前" />
            <UButton
              v-if="dateRangeStart !== null || dateRangeEnd !== null || endFollowNow"
              size="xs"
              color="gray"
              variant="ghost"
              icon="i-lucide:x"
              @click="clearDateRange"
            />
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UButton v-if="downloadBtnLoading" color="rose" variant="soft" @click="stopDownload">停止</UButton>
          <ButtonGroup
            :items="[
              { label: '文章内容', event: 'download-article-html' },
              { label: '阅读量 (需要Credential)', event: 'download-article-metadata' },
              { label: '留言内容 (需要Credential)', event: 'download-article-comment' },
            ]"
            @download-article-html="requestDownload('html')"
            @download-article-metadata="requestDownload('metadata')"
            @download-article-comment="requestDownload('comment')"
          >
            <UButton
              :loading="downloadBtnLoading"
              :disabled="selectedArticles.length === 0"
              color="primary"
              :label="downloadBtnLoading ? `抓取中 ${downloadCompletedCount}/${downloadTotalCount}` : '抓取'"
              trailing-icon="i-lucide:chevron-down"
            />
          </ButtonGroup>

          <UButton
            :loading="exportBtnLoading"
            :disabled="allArticles.length === 0"
            color="gray"
            icon="i-lucide:download"
            :label="exportBtnLoading ? `${exportPhase} ${exportCompletedCount}/${exportTotalCount}` : '导出'"
            @click="openExportDialog"
          />

          <UTooltip text="选择单个公众号后可用" :disabled="canCopyLink">
            <span class="inline-flex">
              <UButton
                :disabled="!canCopyLink"
                :icon="copied ? 'i-lucide:check' : 'i-lucide:link'"
                label="复制公众号链接"
                color="gray"
                @click="copyWechatLink"
              />
            </span>
          </UTooltip>
          <UButton v-if="isDev" @click="debug">调试</UButton>
        </div>
      </header>

      <!-- 导出弹窗:范围 + 格式一次选定 -->
      <UModal v-model="exportDialogOpen">
        <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
          <template #header>
            <h3 class="text-base font-semibold">导出文章</h3>
          </template>
          <div class="space-y-4">
            <!-- 导出范围 -->
            <div>
              <p class="mb-2 text-xs font-medium text-slate-11 dark:text-slate-400">导出范围</p>
              <div class="grid gap-2">
                <label
                  v-for="opt in exportScopeOptions"
                  :key="opt.value"
                  class="flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition"
                  :class="
                    exportScope === opt.value
                      ? 'border-primary-500 bg-primary-50 dark:border-primary-500/50 dark:bg-primary-900/20'
                      : 'border-slate-6 hover:border-slate-9 dark:border-slate-700'
                  "
                >
                  <URadio :model-value="exportScope" :value="opt.value" @update:model-value="selectExportScope(opt.value)" />
                  <span class="font-medium">{{ opt.label }}</span>
                </label>
              </div>
            </div>
            <!-- 导出格式 -->
            <div>
              <p class="mb-2 text-xs font-medium text-slate-11 dark:text-slate-400">导出格式</p>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <UButton
                  v-for="fmt in exportFormats"
                  :key="fmt.type"
                  size="sm"
                  :variant="exportFormatPref === fmt.type ? 'solid' : 'outline'"
                  :color="exportFormatPref === fmt.type ? 'primary' : 'gray'"
                  @click="exportFormatPref = fmt.type"
                  >{{ fmt.label }}</UButton
                >
              </div>
            </div>
            <!-- 未抓取正文提示 -->
            <div
              v-if="dialogNoContentCount > 0 && dialogNeedsContent"
              class="flex items-start gap-2 rounded-md border border-amber-6 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300"
            >
              <UIcon name="i-lucide:triangle-alert" class="mt-0.5 size-3.5 shrink-0" />
              <span>
                {{ dialogExportRows.length }} 篇中 {{ dialogNoContentCount }} 篇未抓取正文，
                <span class="font-medium">导出将跳过未抓取的文章</span>
              </span>
            </div>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="gray" variant="outline" @click="exportDialogOpen = false">取消</UButton>
              <UButton
                v-if="dialogNoContentCount > 0 && dialogNeedsContent"
                color="primary"
                variant="soft"
                @click="confirmDialogExport(false)"
                >全部导出（跳过 {{ dialogNoContentCount }} 篇）</UButton
              >
              <UButton color="primary" :disabled="dialogExportRows.length === 0" @click="confirmDialogExport(true)">
                导出 {{ dialogExportRows.length }} 篇
              </UButton>
            </div>
          </template>
        </UCard>
      </UModal>

      <!-- 抓取确认(勾选数量超过阈值) -->
      <UModal v-model="downloadConfirmOpen">
        <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
          <template #header>
            <h3 class="text-base font-semibold">抓取确认</h3>
          </template>
          <p class="text-sm text-slate-11 dark:text-slate-400">
            将抓取
            <span class="font-semibold text-slate-12 dark:text-slate-100">{{ pendingDownloadUrls.length }}</span>
            篇文章{{ pendingDownload?.type === 'metadata' || pendingDownload?.type === 'comment' ? '（需要 Credential）' : '' }}，数量较大，可能耗时较长，确认继续？
          </p>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="gray" variant="outline" @click="downloadConfirmOpen = false">取消</UButton>
              <UButton color="primary" @click="confirmDownload">确认抓取</UButton>
            </div>
          </template>
        </UCard>
      </UModal>

      <div class="min-h-0 flex-1 overflow-hidden rounded-lg shadow-card">
        <ag-grid-vue
          style="width: 100%; height: 100%"
          :loading="loading"
          :rowData="globalRowData"
          :columnDefs="columnDefs"
          :gridOptions="gridOptions"
          @grid-ready="onGridReady"
          @filter-changed="onFilterChanged"
          @model-updated="refreshCounts"
          @pagination-changed="onPaginationChanged"
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
