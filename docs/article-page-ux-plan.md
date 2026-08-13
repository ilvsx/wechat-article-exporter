# 文章下载页 UX 优化规划(默认全量展示 + 分页 + 导出范围控制)

## 问题

1. **Toast 位置**:`<UNotifications />` 从未显式配置位置,大屏可见性差。
2. **文章页门槛过高**:必须先在「公众号」下拉选择账号,表格才加载数据;未选时表格空白、抓取/导出/复制链接按钮全部禁用——新用户不知道要先选账号。
3. **无分页**:全量虚拟滚动,与常见管理后台习惯不符。
4. **导出无范围控制**:导出/抓取只支持「勾选行」;若未来支持全量视图,必须防止一次性导出所有公众号所有数据(误操作、资源爆炸)。

## 方案

### A. Toast 位置(小改)
`app.vue` 显式 `<UNotifications position="top-right" />`。
- 右上角是大屏视觉焦点区,符合管理后台惯例
- 同时 toast 文案增强:全量加载完成/导出范围提示均走 toastFactory

### B. 默认展示全部 + 公众号列

**交互模型**:账号选择器从「必选项」变为「筛选器」。

- `AccountSelectorForArticle` 增加顶部选项 **「全部公众号」**(显示总文章数);选中任意账号 = 只显示该账号;回到「全部」= 全量
- `article.vue` 新增 `scope` 状态(`'all' | fakeid`):
  - 进入页面默认 `'all'`,自动加载**所有公众号**缓存文章(遍历 `getAllInfo()` → 各账号 `getArticleCache(fakeid, ts)` 合并)
  - 切换账号/全部 → 重新加载(沿用现有 loading 遮罩)
- 表格新增 **「公众号」列**(nickname,全量视图区分来源;单账号视图可选隐藏,默认显示)

**数据流**:`allArticles`(当前 scope 全部,过滤 hideDeleted)→ 时间筛选 → `globalRowData` → AG Grid 分页渲染。现有 `applyDateRangeFilter`/`updateRow` 等逻辑不变。

### C. 分页(AG Grid 内置)

```ts
pagination: true,
paginationPageSize: 50,
paginationPageSizeSelector: [50, 100, 200],
```
- 状态栏已有 `GridStatusBar`(总数/选中数),分页控件走 AG Grid 底部默认样式
- 列重置/筛选/排序等既有功能不受影响

### D. 性能(全量加载的关键)

现状 `switchTableData` 对**每篇**文章执行 3 次 IndexedDB 查询(html/comment/metadata,按 url 逐篇 get)。全量数千篇 → 数千次往返,且 `getHtmlCache` 返回含 **Blob** 的记录,逐篇拉取已重、bulkGet 会直接把几百 MB 拉进内存。

**轻量方案**:三个 store 新增 `getXxxUrlSet()`(基于 `db.table.toCollection().primaryKeys()`,只取主键 url 数组,不加载数据体):

```ts
// store/v2/html.ts
export async function getHtmlUrlSet(): Promise<Set<string>> {
  return new Set(await db.html.toCollection().primaryKeys());
}
```

加载时一次调用得到三个 Set,逐篇 `contentDownload = htmlSet.has(link)` O(1) 判定。
- 加载后单篇状态更新仍走现有 `updateRow`(不重载全量)

### E. 导出/抓取范围控制

**抓取(下载)**:保持「勾选行」语义,disabled 条件从 `!selectedAccount` 改为 **无勾选**(附 tooltip「请先勾选文章」)。

**导出**:新增范围选择器(导出按钮组旁),三选一:

| 范围 | 行为 | 默认 |
|---|---|---|
| 勾选的行 | 无勾选 → 禁用 + 提示 | ✅ |
| 当前页 | 导出当前分页的所有行 | |
| 筛选结果全部 | **弹确认框**(显示 N 篇,提示耗时)→ 确认后导出 | |

- 范围选择持久化到 localStorage(记用户偏好)
- 「筛选结果全部」确认框防止误触发全量导出(用户原话诉求)
- 导出数据来源:勾选行 = `selectedArticleUrls`;当前页 = 当前分页行 urls;全部 = `globalRowData`(时间筛选后)urls
- 导出进度沿用 `useExporter`(已有完成进度 toast)

### F. 空态与引导

- 无任何公众号:表格空态文案「暂无公众号,请先在公众号管理中添加」
- 有公众号无缓存文章:提示「请先在公众号管理中同步文章」
- 全量加载完成:toast「已加载 N 篇文章」;加载期间 loading 遮罩

## 风险与对策

| 风险 | 对策 |
|---|---|
| 账号多 + 文章数万,加载变慢 | 各账号 `getArticleCache` 并发(Promise.all);存在性判定改 Set 后单次遍历 O(N);AG Grid 分页只渲染当前页 |
| Blob 内存爆炸 | 坚持 primaryKeys 方案,绝不 bulkGet html 表 |
| 「筛选结果全部」误导出 | 确认框 + 数量展示 + 进度条 |
| 既有单账号工作流回归 | scope='all' 是新增路径,单账号路径行为保持不变(数据、筛选、抓取、导出逻辑同一套) |

## 验证

1. 进入页面默认加载全部账号文章 + 分页 + 公众号列
2. 切换账号/全部正确加载,时间筛选在两种 scope 下均生效
3. 勾选行抓取/导出;当前页导出;筛选全部导出(确认框出现、数量正确)
4. 无公众号/无文章空态文案
5. `yarn build` + dev 实测

## 改动文件清单

- `app.vue`(toast 位置)
- `components/selector/AccountSelectorForArticle.vue`(全部公众号选项)
- `pages/dashboard/article.vue`(scope/分页/公众号列/导出范围/空态)
- `store/v2/html.ts` / `store/v2/comment.ts` / `store/v2/metadata.ts`(新增 `getXxxUrlSet()`)
- `composables/useExporter.ts`(如导出范围需要传入来源说明,按需小改)
- 可能有:设置页(导出范围默认值偏好,按需)
