<p align="center">
  <img src="./assets/logo.svg" alt="Logo">
</p>

# wechat-article-exporter（社区 fork）

![GitHub forks]
![GitHub License]
![Package Version]

> [!WARNING]
> **本仓库是上游 [wechat-article/wechat-article-exporter](https://github.com/wechat-article/wechat-article-exporter) 的社区 fork。**
>
> 上游项目已于 **2026-07-30 停止维护**：其依赖的「公众号后台超链接接口」被微信官方关闭，完整说明见 [关于本项目停止维护的说明 #200](https://github.com/wechat-article/wechat-article-exporter/issues/200)。
>
> **本 fork 已将历史文章同步改造为基于 Credential（微信客户端动态凭据）的通道：**
> - 通过 mitmproxy 插件（`public/plugins/credential.py`）或 wxdown-service 抓取凭据后，「同步」即可继续拉取公众号历史文章列表；
> - 凭据约 **25 分钟**过期，过期后需在微信中重新打开一篇文章刷新（页面右上角「抓取 Credentials」）；
> - 阅读量、留言等元数据导出同样依赖 Credential，机制不变。

一款 **微信公众号文章批量下载** 工具，支持导出阅读量与评论数据，可私有化部署（Docker / 任意 Node 服务器 / Cloudflare Workers）。支持下载各种文件格式，其中 HTML 格式可 100% 还原文章排版与样式。

## :rocket: 快速开始

### 1. 本地运行

要求 Node >= 22（依赖管理使用 corepack 内置的 yarn）：

```bash
corepack enable && corepack prepare yarn@1.22.22 --activate
yarn
yarn dev        # 启动开发服务器，访问 http://localhost:3000
```

生产构建与运行：

```bash
yarn build
node .output/server/index.mjs
```

### 2. 抓取 Credential（历史同步的前置条件）

方式一（推荐，无需安装证书）：下载并运行 [wxdown-service](https://github.com/wechat-article/wxdown-service/releases)，在页面右上角「抓取 Credentials」面板填入 `wss://127.0.0.1:65001` 开始监控。

方式二（mitmproxy 插件）：

```bash
pip install mitmproxy   # 或 winget install mitmproxy.mitmproxy
mitmdump -p 8082 -s public/plugins/credential.py -q
```

- 在面板填入 mitmdump 启动时打印的会话密钥完成认证；
- 在 **PC 微信** 中打开一篇目标公众号的文章，凭据自动入库（显示在「抓取 Credentials」面板）；
- 若微信不走系统代理（常见于设置了 `http_proxy` 等环境变量），需将代理环境变量指向 mitmdump 端口后重启微信。

### 3. 添加公众号并同步

- 「抓取 Credentials」面板 → 「添加公众号」；或「公众号管理 → 添加」按名称搜索（依赖后台登录，可能失效）；
- 建议先在「设置 → 同步范围」选择时间范围（如最近 7 天）做小范围测试；
- 「公众号管理 → 同步」分页拉取历史文章，凭据过期时提示重新抓取。

### 4. 下载与导出

「文章下载」页选中公众号后，可按发布时间范围筛选，勾选文章后「抓取」（正文 / 阅读量 / 留言）与「导出」（html/json/excel/txt/md/docx）。

## :whale: 部署

| 方式 | 命令 | 说明 |
|---|---|---|
| Node 服务器 | `yarn build && node .output/server/index.mjs` | 任意 VPS，需 Node >= 22 |
| Docker | `docker build -t wechat-article-exporter .` | 见仓库 `Dockerfile` |
| Cloudflare Workers | `yarn deploy` | 需配置 `wrangler.toml` 中的 KV 绑定 |

> 注意：项目包含服务端（Nitro 接口代理与会话存储），**不能纯静态部署**——浏览器无法直连微信接口（CORS），所有数据获取都依赖服务端转发。

## :floppy_disk: 数据存储

- 文章列表、正文、留言、阅读量等全部数据存储在**浏览器 IndexedDB**（本地数据库 `exporter.wxdown.online`），不会上传到任何服务器；
- 服务端仅存储登录会话（KV：cookie/令牌等小数据）；
- 清除浏览器数据前请先通过「公众号管理 → 批量导出」备份账号清单。

## :dart: 特性

- [x] 历史文章列表同步（基于 Credential 通道，凭据约 25 分钟过期）
- [x] 搜索公众号，支持关键字搜索（依赖后台登录，可能失效；可用凭据面板添加替代）
- [x] 支持导出 html/json/excel/txt/md/docx 格式（html 格式打包了图片和样式文件，能够保证 100% 还原文章样式）
- [x] 缓存文章列表数据，减少接口请求次数
- [x] 支持文章过滤，包括作者、标题、发布时间、原创标识、所属合集等
- [x] 支持合集下载
- [x] 支持图片分享消息、视频分享消息
- [x] 支持导出评论、评论回复、阅读量、转发量等数据（需要有效 Credential）
- [x] 支持 Docker / Cloudflare 部署
- [x] ~~开放 API 接口~~（公开 API 已下线，不再对外提供服务）

## :bulb: 原理

历史文章列表通过**微信客户端历史消息接口**（`mp/profile_ext?action=getmsg`）获取。该接口需要携带抓包得到的动态凭据（`uin`/`key`/`pass_ticket`）：在微信中打开任意一篇目标公众号的文章，mitmproxy 插件（或 wxdown-service）会拦截请求并自动提取凭据；之后「同步」即可分页拉取该公众号的全部历史文章。凭据有效期约 25 分钟，过期后需重新抓取。

## :warning: 已知限制

- **凭据时效**：约 25 分钟过期，长任务需中途刷新（微信中重新打开一篇文章）；
- **接口变化风险**：微信可能随时调整客户端接口（2026-08 曾短暂失效后恢复），无法保证长期可用；
- **消息总数**：新接口不返回总数，同步完成后以已同步消息数回填（进度显示 100%）；
- **付费文章**：正文全文需要凭据，且接口未返回付费标记，可能受限。

## 公号三刀

上游作者的另一个项目 —— **[公号三刀](https://wechat.zoro.build)**。受同样的接口关闭影响，它也无法再批量同步公众号历史文章。目前仅支持抓取非群发等少量文章，阅读量与评论数据的抓取仍然可用。

## :heart: 感谢

- 感谢上游 [wechat-article/wechat-article-exporter](https://github.com/wechat-article/wechat-article-exporter) 项目及作者两年多的维护
- 感谢 [Deno Deploy]、[Cloudflare Workers] 提供免费托管服务
- 感谢 [WeChat_Article] 项目提供原理思路

## :memo: 许可

MIT

## :red_circle: 声明

本程序抓取的 Credential 仅用于你自己的文章抓取目的，不会把抓取能力作为公共爬虫服务提供给他人，也不存在账号池。抓取到的文章内容版权归原作者所有，请合理使用。

<!-- Definitions -->

[GitHub forks]: https://img.shields.io/github/forks/ilvsx/wechat-article-exporter?style=social&label=Fork&style=plastic

[GitHub License]: https://img.shields.io/github/license/ilvsx/wechat-article-exporter?label=License

[Package Version]: https://img.shields.io/github/package-json/v/ilvsx/wechat-article-exporter?label=Version

[Deno Deploy]: https://deno.com/deploy

[Cloudflare Workers]: https://workers.cloudflare.com

[Wechat_Article]: https://github.com/1061700625/WeChat_Article
