# 抓包兜底数据录入方案规划(capture-ingest-plan)

> 状态:规划草案,待审核
> 日期:2026-08-13
> 定位:当前项目主链路(Credential + `profile_ext getmsg` 历史列表)失效后的**最后防线**——人工在微信浏览公众号文章,每点开一篇,抓包插件自动采集入库。

---

## 1. 背景与定位

### 1.1 上游停更原因(事实)

- 上游项目(wechat-article/wechat-article-exporter)依赖的「公众号后台超链接接口」被微信关闭(2026-07-30 停更,issue #200)
- 本 fork 已将历史文章列表同步改造为 **Credential 通道**:`profile_ext?action=getmsg`(客户端历史消息接口),携带抓包获得的 `uin/key/pass_ticket`
- **风险**:该客户端接口同样可能被微信调整/关闭(2026-08 曾短暂失效后恢复;issue #199 同期的 200013 freq control 风波)

### 1.2 本方案定位

```
主链路(现役):  凭据 + profile_ext getmsg → 批量列表同步
降级链路(本方案): 人工在微信浏览 → 每点开一篇 → 插件抓包 → 自动入库
```

**适用场景**:主链路失效后,个人用户仍可"人工翻页 + 点击即采集"。是**保底方案,不是主路**,效率低于批量同步,但接口全灭时依然可用。

---

## 2. 调研成果摘要(本方案的技术依据)

以下事实均经 2026-08-13 实测验证(凭据来自 PC 微信 4.1.11.55 抓包)。

### 2.1 数据来源图谱

| 数据 | 来源 | 获取方式 | 状态 |
|---|---|---|---|
| 文章列表 | `profile_ext?action=getmsg` | 凭据 GET,offset 分页 | ✅ 现役主链路 |
| 正文 | 页面 `window.cgiDataNew.content_noencode` | **MicroMessenger UA**(无凭据即可)+ JS 执行解析 | ✅ 可用 |
| 阅读量/点赞/分享/收藏/星标 | 页面 `user_info.appmsg_bar_data`(与接口同源) | **凭据会话(cookie)下载页面** + JS 执行解析 | ✅ 可用(见 2.2 注入条件) |
| 互动统计(同源接口) | `getappmsgext` POST + `appmsg_token` | 见 2.3 | ✅ 可用(轻量替代) |
| 评论列表/回复 | `appmsg_comment?action=getcomment/getcommentreply` | 凭据 GET | ✅ 可用 |
| 评论扩展 | `getextracomment`/`getsegment`/`getidentitylist` | 客户端调用,项目未用 | ⚠️ 未验证 |

### 2.2 页面数据的关键事实

- **数据存在性**:页面 HTML 源码里**已有**全部数据(cgiDataNew / appmsg_bar_data 以 JS 对象字面量存在),不渲染也存在
- **提取方式**:值是 JS 表达式(`'99797' * 1`),非 JSON,必须**执行 JS 脚本**才能取对象——项目用 iframe(客户端)/QuickJS-WASM 沙箱(服务端)执行完整 script 块
- **解析路径**(项目现状,实测验证可用):
  ```
  extractCgiScript: 定位包含 window.cgiDataNew = { 的 <script> 块(cheerio)
  → 完整执行该块(iframe/QuickJS)
  → 读 window.cgiDataNew
  → processHtmlMetadata: barData = cgiData.user_info?.appmsg_bar_data
  ```
  - 注意:`appmsg_bar_data` 在页面里出现 3 处(cgiDataNew 内部 user_info + 独立 window 变量赋值),项目取的是 **cgiDataNew.user_info.appmsg_bar_data**
  - ⚠️ 曾误判"项目链路损坏",实为解析窗口太小漏检;完整执行后验证可用

- **互动数据注入条件(2026-08-13 决定性实验,重要)**:
  - **页面是否降级/给完整正文**:由 **User-Agent** 决定——带 `MicroMessenger` UA 的请求,即使无 cookie 也返回完整页面(3.2~4.7MB);Chrome UA/无 UA → 18KB 验证码页
  - **页面内嵌互动数据(barData)是否有真实值**:由**会话凭据(cookie)**决定——无凭据时字段存在但**空注入**(`read_num: '' * 1`),带凭据才有真实值
  - 决定性实验(同文章 `2247759482`,和平精英):
    | 请求 | read_num 值 |
    |---|---|
    | 无凭据(MicroMessenger UA) | `''`(空注入) |
    | **带会话 cookie** | **100001**(真实值,与 getappmsgext 一致) |
  - **凭据与公众号的关联**:用 A 号会话的 cookie 请求 B 号文章 → barData 仍空(实测:和平精英的 cookie 请求"以茶会友"文章,read_num 为 `''`)——注入与"该会话与该公众号的关联"(打开过/关注)有关,佐证"凭据按公众号隔离"的设计
  - **结论**:正文 = UA 的钥匙;互动数据 = 凭据的钥匙;评论 = 凭据的钥匙。三者独立

- **方法学教训(曾产生错误结论)**:
  - ⚠️ 曾用 `includes('appmsg_bar_data')`(字段存在)代替"解析值",误判"无凭据 UA 即可获取互动数据";后又误判"项目元数据抓取带凭据是多余设计"
  - **两条误判均已由控制变量对照实验推翻**(见上表)
  - **规则**:判断"数据是否可得"必须以**解析出的值**为准,并做**同一资源在不同凭据/UA 条件下的对照实验**;字段存在 ≠ 值有效(空壳注入)

### 2.3 getappmsgext 调用方式(完整破解)

```
URL:    https://mp.weixin.qq.com/mp/getappmsgext?appmsg_token=<真实token>&x5=0
方法:   POST
Body:   __biz=<biz>&mid=<mid>&idx=<idx>&sn=<sn>
        &is_only_read=1&is_temp_url=0&appmsg_type=9
Headers: User-Agent(微信客户端版) + Cookie(完整串) + Content-Type: form-urlencoded
响应:   appmsgstat { read_num, old_like_num, like_num, share_num,
                     collect_num, star_num, friend_seen_info, ... }
```

- **失败根因链**(完整复盘):GET + 无参数 → `-1 system error`;POST + `fasttmplajax=1` + appmsg_token 空 → `ret:0` 但数值全 0;**POST + appmsg_token 真实值 → 全部数据**。关键 = **appmsg_token 必须带真实值**(从 Set-Cookie 提取,1387_ 开头,85 字符)
- **数据同源实证**:页面 `appmsg_bar_data.read_num` = 接口 `appmsgstat.read_num`(99797 完全一致)——两条链路数值一致,页面解析不损失数据

### 2.4 appmsg_token 获取链路

```
微信客户端打开文章(带会话)
→ 服务端响应: ① Set-Cookie: appmsg_token=1387_xxx; Path=/
              ② 页面 JS: window.appmsg_token = "1387_xxx"
→ 代理拦截: ① 提取 Set-Cookie → credentials.json
            ② 保存页面(页面内嵌 token 可作备份来源)
→ 使用: 从 set_cookie 解析 appmsg_token(URL 解码)→ 拼入 getappmsgext
时效: 与 pass_ticket 同步(社区约 3.5h,实测 40+ 分钟仍有效)
```

### 2.5 no_transfer 机制(源码级破解)

页面 JS `getAjaxScope(ajaxUrl)` 是路由决策点:

```js
if (URL 无 no_transfer=1
    && 微信环境 && 非小程序/企业微信/公众号 && 非跨域
    && window.__ajaxTransferConfig 存在
    && 客户端版本达标(Windows≥3.9.5 等)) {
  return findAjaxScopeByConfig(ajaxUrl, __ajaxTransferConfig);  // transfer 内部通道
}
// 否则: 标准 HTTP 路径(代理可拦截/可复现)
```

- **transfer = 页面内接口请求的内部路由**:满足全部条件时接口走客户端原生通道,外部代理看不到内容
- **no_transfer=1 的作用**:强制条件①不成立 → 接口落标准 HTTP → 抓包可复现(Reqable 脚本原理)
- **与本方案关系**:采集依赖"标准 HTTP 路径";若客户端版本/页面配置变化导致默认走 transfer,需在**页面请求**上注入 no_transfer=1 保底(接口调用本身不需要该参数)

### 2.6 短链与风控(实测)

| 场景 | 结果 |
|---|---|
| 短链 `/s/xxx` 公开访问 | 302 → `wappoc_appmsgcaptcha`(验证码页) |
| 短链 + 会话 cookie | 200,完整页面(3.22MB) |
| 完整链接公开访问 | 200,降级页(17.7KB,无数据) |
| 完整链接 + 会话 cookie | 200,完整页面(3.17MB,数据齐全) |

**结论:会话 cookie 是访问完整页面的钥匙;公开请求一律降级/验证码。**

### 2.7 风控事实(社区 + 实测)

- 接口直调高频 → `ret:-6 unknown error` 封接口,隔天解封(上游 issue #88 实录)
- getappmsgext 高频 → 滑块验证码(社区)
- TLS/JA3 指纹:非客户端网络库可能被识别(低频个人使用暂未触发)
- key 时效:频繁调用约 20 分钟失效,静置最长 2 小时(社区);appmsg_token/pass_ticket 约 3.5h
- **本项目个人低频使用风险可控;批量采集是风控雷区**

### 2.8 上游设计史(为什么页面解析为主)

| 时间 | 事件 | 意义 |
|---|---|---|
| 2025-10-30 `0431a08` | 引入 processHtmlMetadata(页面解析) | Credential 通道成型第一天即选页面路线 |
| 2025-12 PR #111 | 文字消息提取不到阅读量→换位置提取 | 页面框架内迭代,未考虑切接口 |
| 2026-01 | parseCgiDataNew 演进(CF 限制→QuickJS 沙箱) | 为页面解析投入基础设施 |
| 2026-02 issue #130 | 评论接口被微信改动,作者修复 | 评论只能走接口,且接口易变 |
| 2026-08 issue #88 | 同行接口直调被封一天 | 接口直调风控代价实证 |

**设计结论:能页面拿的绝不走接口(风控友好+数据同源+一次请求多用途),必须接口的才走接口(评论)。**

**补充(2026-08-13 实测修正)**:项目元数据抓取带凭据**不是多余设计,而是必需**——页面互动数据(barData)的注入依赖会话凭据(见 §2.2 决定性实验:无凭据=空注入,带凭据=真实值)。上游"互动数据统一挂凭据通道 + 前置校验"的设计在 2026 年依然正确。

---

## 3. 方案架构

```
┌─────────────────────────────────────────────────────────┐
│ ① 插件层(mitmproxy credential.py,已具备 ~80% 能力)        │
│   拦截 /s? 与 /s/ 文章 → 已持有:                          │
│     URL(__biz/mid/idx/sn)                                │
│     原始 HTML(正文 + appmsg_bar_data + comment_id + 账号) │
│     最新凭据(Set-Cookie → uin/key/pass_ticket/appmsg_token)│
│   [已有] 保存页面/凭据/响应头 → [新增] 推送平台             │
└──────────────────────────┬──────────────────────────────┘
                           │ 推送(契约见 §4)
┌──────────────────────────▼──────────────────────────────┐
│ ② 平台层(wechat-article-exporter)                        │
│   [复用] parseCgiDataNew(正文/账号/互动解析)              │
│   [复用] updateArticleCache / updateHtmlCache /          │
│          updateMetadataCache / updateInfoCache(入库)     │
│   [新增] 入库入口(接收插件推送)                           │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│ ③ 数据层(浏览器 IndexedDB,C1 备份/恢复路径已通)           │
│    article(列表) + html(正文) + metadata(互动) + info(账号)│
└─────────────────────────────────────────────────────────┘
```

### 关键设计决策

| 决策 | 理由 |
|---|---|
| **插件只搬运、平台只解析** | 避免双实现不一致;平台复用 `parseCgiDataNew`,与现有链路零偏差 |
| **推送原始 HTML**(3MB)而非解析结果 | 解析逻辑唯一化;HTML 本身也是备份资产 |
| **入库即带凭据快照** | **必需而非可选项**:页面互动数据(barData)注入依赖凭据身份(§2.2 实测);无凭据快照入库 = 只有正文没有阅读量/点赞。同时凭据抓包时刻最新鲜,评论补抓成功率最高 |
| **按 aid(mid_idx)去重** | 与现有 article 表主键一致,重复打开不重复入库 |
| **不自动抓评论** | 评论走接口有风控成本;入库后用户按需一键补抓 |

---

## 4. 数据流与接口契约

### 4.1 契约草案

```jsonc
// 插件 → 平台(二选一通道,见 §4.2)
{
  "url": "https://mp.weixin.qq.com/s?__biz=...&mid=...&idx=1&sn=...",
  "biz": "MzI1OTk2OTM0NQ==",
  "mid": "2247759482",
  "idx": "1",
  "sn": "81546ab1c8...",
  "msg_title": "文章标题",            // 可选,插件已能提取
  "html": "<原始页面全文>",           // 3MB 级,JSON 传输
  "credential": {                     // 抓包时刻最新凭据快照
    "uin": "...", "key": "...",
    "pass_ticket": "...",
    "appmsg_token": "...",
    "cookie": "完整 Cookie 串"
  }
}
// 平台返回: { "ok": true, "duplicate": false, "aid": "2247759482_1" }
```

### 4.2 传输通道(两个候选)

| 通道 | 实现 | 优点 | 缺点 |
|---|---|---|---|
| **A. 前端直连插件本地 8088**(推荐) | 插件已内置 HTTP 服务(现供凭据面板轮询);新增 `/ingest` 端点;前端 `fetch('http://127.0.0.1:8088/ingest')` 拉取待入库队列 | 零服务端改动、零部署依赖、平台离线时插件可暂存 | 需平台页面在线;浏览器跨域需插件 CORS(已有) |
| B. 经平台 Nitro 后端中转 | `server/api/ingest/article.post.ts` 接收 → 前端轮询/SSE 取 | 平台离线也能收(存 KV) | 服务端改动;3MB 级 JSON 过服务端;CF Workers 内存限制风险 |

### 4.3 入库流程(平台侧)

```
收到推送 → 校验 url/mid 完整
→ 解析(parseCgiDataNew):
    cgiDataNew.user_info.appmsg_bar_data → read/old_like/like/share/collect/star
        ⚠️ 互动值仅在该推送带凭据会话时非空(§2.2);无凭据推送此处为空,仍入库但标注"缺互动数据"
    cgiDataNew.content_noencode → 正文 HTML
    cgiDataNew.nick_name/round_head_img → 公众号信息
→ 去重: db.article 存在 aid(mid_idx)? → duplicate=true 返回
→ 入库(复用 store/v2 各 update* 函数):
    info(公众号,缺失则创建)
    article(aid 主键,含 fakeid=biz、link、create_time=页面时间)
    html(正文,file=Blob)
    metadata(互动数据,空则跳过写入)
→ 凭据快照: 若该 biz 无凭据/已过期 → 用推送的 credential 更新 credentials 存储
    (凭据快照是互动数据与评论补抓的前提,必须保存)
→ 返回 { ok: true, duplicate }
```

### 4.4 插件侧改造(增量)

```
现状: save_page() 已保存 page.html/headers.json/meta.json + [API] 打印
新增:
  1. 命中文章页 → 除保存外,组织 ingest payload → POST 平台通道
  2. 推送失败(平台离线)→ 暂存本地队列(文件),平台在线后补推
  3. 保留现有保存功能(双保险:文件 + 推送)
```

---

## 5. 用户操作流(降级场景)

```
1. 启动:mitmdump -p 8082 -s credential.py(插件常驻)+ 平台页面打开
2. 微信打开公众号主页,像平时一样浏览历史列表
3. 每点开一篇文章 → 插件抓包 → 自动推送 → 自动入库
4. 文章下载页立即可见:标题/时间/正文(来自 cgiDataNew);阅读量/点赞/分享(来自 appmsg_bar_data,**凭据快照生效时才有值**,§2.2)
5. 留言:文章行内「抓取留言」一键补抓(用入库时的凭据快照)
6. 换下一个公众号继续翻
```

**节奏提示**:一篇一点 = 与"人工阅读"同频,风控天然友好;不需要任何接口列表能力。

---

## 6. 优点与局限

### 优点

| 项 | 说明 |
|---|---|
| 接口全灭也能用 | 只要微信客户端还能打开文章 |
| 零新增风控 | 数据来自真实浏览行为,零额外请求 |
| 复用度高 | 解析/存储/UI 全复用,新增代码量小 |
| 凭据时效最优 | 抓包时刻 = 凭据最新鲜 |
| 数据完整性 | 一篇 = 正文+互动+账号+评论锚点全量 |

### 局限(诚实标注)

| 项 | 说明 |
|---|---|
| 人工操作,效率低 | 一篇一点;几十篇可接受,几千篇不现实——**保底非主路** |
| 依赖常驻 | 插件 + 平台页面需在线(通道 A);离线只能暂存 |
| 覆盖不完整 | 只采"打开过的"文章,漏掉没点的 |
| 3MB 级传输 | 每篇推送 3MB HTML(通道 B 过服务端需注意内存) |
| 需页面满足标准 HTTP 路径 | 若客户端走 transfer 通道(§2.5),需注入 no_transfer=1 保底 |

---

## 7. 风险与风控

| 风险 | 等级 | 缓解 |
|---|---|---|
| 主链路失效是本方案动机 | — | 本方案即缓解 |
| 页面结构再变(barData 位置/格式) | 中 | 解析复用平台现有链路,改动集中一处 |
| transfer 通道默认化 | 中 | 插件 request 钩子注入 no_transfer=1(页面请求层,5 行) |
| 推送通道被滥用 | 低 | 仅本地 127.0.0.1;ingest 校验 url 合法性 |
| 凭据快照泄露 | 低 | 仅本地传输;与现有 credentials 存储同安全级别 |

---

## 8. 实施步骤(细化,待批准后执行)

| 步骤 | 内容 | 涉及 | 验证 |
|---|---|---|---|
| 1 | 插件:save_page 扩展为"保存 + 组织 payload + 推送(通道 A 8088 `/ingest`)"+ 离线暂存队列 | credential.py | 打开文章,curl 8088 见 payload |
| 2 | 平台:新增前端 composable `useIngest`(轮询/长轮询插件 8088,防抖拉取)→ 复用 store 写入 | composables/useIngest.ts | 打开文章,文章下载页出现数据 |
| 3 | 去重与账号创建:aid 判重;info 缺失时用 cgiDataNew 创建 | store/v2 复用 | 重复打开不重复入库 |
| 4 | 凭据快照回填:推送凭据更新 credentials 存储(供评论补抓) | useCredentials | 面板出现该公众号凭据 |
| 5 | 评论补抓:文章行内按钮 → getcomment(凭据快照) | Downloader 复用 | 留言可抓 |
| 6 | 端到端验收:真实抓包打开 1 篇 → 全链路入库 → UI 可见 | 全链路 | 见 §9 |

**前置**:先固化调研产物(插件自动保存能力)提交,作为本方案第①层基线。

---

## 9. 验收标准

1. PC 微信打开一篇新文章 → 10 秒内文章下载页出现该文章(标题/时间/正文齐全;阅读量/点赞/分享在凭据快照生效时齐全)
2. 重复打开同一篇 → 不重复入库(duplicate=true)
3. 从未添加过的公众号 → 自动创建账号记录(名称/头像来自 cgiDataNew)
4. 平台离线时打开文章 → 插件本地暂存;平台上线后自动补推
5. 留言一键补抓成功(凭据快照生效)
6. 整个流程零微信额外请求(仅抓包顺手数据)

---

## 10. 开放问题(待审核时定)

1. **通道选型**:前端直连插件 8088(A)vs 后端中转(B)?推荐 A
2. **离线暂存容量**:本地队列上限?(建议 200 篇/500MB 阈值,防磁盘爆)
3. **正文是否需要立即入库**:可选项——只入 article+metadata,html 按需(省 3MB 写入)
4. **是否自动补抓评论**:默认否(风控成本),用户手动
5. **与现有"同步"功能的关系**:本方案入库后,该公众号仍可走主链路全量同步去重合并(互不干扰)

---

*本规划基于 2026-08-13 实测调研成果;关键技术结论(§2)均已用真实凭据与真实页面验证。*
