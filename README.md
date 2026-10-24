# M-Team 排行榜悬浮大图预览

<p align="center">
  <a href="https://raw.githubusercontent.com/Eliaukzzz/m-team-rankings-hover-preview/main/m-team-rankings-hover-preview.user.js"><img alt="安装" src="https://img.shields.io/badge/%E4%B8%80%E9%94%AE%E5%AE%89%E8%A3%85-userscript-2ea44f?style=for-the-badge&logo=tampermonkey&logoColor=white"></a>
</p>

<p align="center">
  <a href="https://github.com/Eliaukzzz/m-team-rankings-hover-preview/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-3da639?style=flat-square"></a>
  <a href="https://github.com/Eliaukzzz/m-team-rankings-hover-preview"><img alt="version" src="https://img.shields.io/badge/version-1.1.1-4c8bf5?style=flat-square"></a>
  <a href="https://github.com/Eliaukzzz/m-team-rankings-hover-preview/stargazers"><img alt="stars" src="https://img.shields.io/github/stars/Eliaukzzz/m-team-rankings-hover-preview?style=flat-square&logo=github"></a>
  <img alt="managers" src="https://img.shields.io/badge/Tampermonkey%20%7C%20Violentmonkey-supported-black?style=flat-square">
</p>

在 M-Team 新版排行榜 [/rankings](https://kp.m-team.cc/rankings) 里，把鼠标移到任意一行上，就在行侧弹出这个种子的**海报大图**——不用点进详情页一张张看封面。

![演示](docs/demo.gif)

<sub>动图取自仓库自带的 demo 页（假数据）；真实页面上弹出的就是种子列表里的封面图。</sub>

## 为什么

排行榜一屏 100 条，只有标题和一行元信息。想看「这部片子长什么样」「海报对不对口」，得挨个点进详情页，而且点开就离开了榜单，回来还要重新找位置。

这个脚本把「看一眼海报」变成一次悬浮：**不改页面结构、不打额外接口、不读写账号数据**，只是把行里已有的缩略图放大，贴着行浮出来。

## 功能

- **悬浮即看**：停留约 110ms 弹出，移开约 90ms 淡出。有延迟是为了避免快速划过多行时满屏闪图。
- **智能贴边**：行右侧优先；放不下翻到左侧；两边都放不下就贴视口边缘并上下夹取，保证整张海报**完整可见**，不会被窗口切掉。
- **自动挑图**：一行里常混着图标、旗帜、状态点和小缩略图。脚本按「面积 × antd 图片加成 × 竖版加成」打分，挑最像海报的那张，并按行缓存复用。
- **大图优先**：表格里缩略图通常即原图，直接放大；卡片列表会先试站点的大图变体（`xxx-1.jpg` → `xxxjp-1.jpg`），失败自动回退；若加载结果明显偏小且还有更大候选，会换用更大的那张。
- **带上标题**：大图底部叠一行标题（两行截断），扫一眼就能确认是哪个资源。
- **随手开关**：右下角「大图」按钮或 `Alt + P`，状态记在 `localStorage`，刷新后保持；按住 `Alt` 悬浮则本次不弹（方便拖拽、选区）。
- **不打断操作**：`pointer-events: none`，大图不吃鼠标事件；滚动、切标签页、前进后退、选中文字时自动收起。

## 安装

**先装脚本管理器**：[Tampermonkey](https://www.tampermonkey.net/)（或 Violentmonkey / ScriptCat）。

**再点这里安装脚本**：

**<https://raw.githubusercontent.com/Eliaukzzz/m-team-rankings-hover-preview/main/m-team-rankings-hover-preview.user.js>**

油猴会弹出安装页，点「安装」即可。也可以把仓库里的 [m-team-rankings-hover-preview.user.js](https://github.com/Eliaukzzz/m-team-rankings-hover-preview/blob/main/m-team-rankings-hover-preview.user.js) 直接拖进浏览器窗口，或在油猴面板「添加新脚本」里粘贴内容后 `Ctrl + S`。

安装后打开 <https://kp.m-team.cc/rankings>，鼠标移到任意一行上就有了。

> 首次安装后如果没反应，先刷新一次页面（脚本在 `document-idle` 注入）。

### 环境

| 项目 | 要求 |
| --- | --- |
| 浏览器 | Chrome / Edge / Firefox / Brave 等支持 `PointerEvent` 的现代版本 |
| 脚本管理器 | Tampermonkey 4.19+、Violentmonkey 2.13+、ScriptCat |
| 页面 | `https://kp.m-team.cc/rankings`（新版排行榜），需已登录 |
| 窗口宽度 | ≥ 720px（窄屏放不下大图，自动不启用） |

## 使用

| 操作 | 效果 |
| --- | --- |
| 悬浮某一行 | 行侧弹出该种子的大图（约 0.1 秒后） |
| 移开鼠标 | 约 90ms 后淡出 |
| `Alt + P` | 全局开关预览 |
| 点右下角「大图」按钮 | 同上，状态会被记住 |
| 按住 `Alt` 悬浮 | 本次不弹 |
| 滚动页面 | 大图立即收起 |

## 配置

脚本顶部的 `CONFIG` 是唯一配置区，改完保存、刷新页面即生效：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `paths` | `['/rankings']` | 生效的路径前缀，可加多项 |
| `allPages` | `false` | `true` = 全站所有页面生效 |
| `rowSelector` | `tr.ant-table-row, tr[data-row-key], table.table-fixed tbody tr` | 「一行」的匹配选择器 |
| `thumbMinSize` | `32` | 缩略图最小可见边长，用来滤掉小图标（antd 图片、详情链接内的图不受限） |
| `showDelay` / `hideDelay` | `110` / `90` | 弹出 / 收起的延迟（ms） |
| `maxWidthRatio` / `maxHeightRatio` | `0.46` / `0.68` | 大图最多占视口宽 / 高比例 |
| `maxWidthPx` | `760` | 大图宽度硬上限（px） |
| `minPreviewPx` | `140` | 大图最小边长（px），避免超宽图被压成一条 |
| `gap` | `16` | 大图与行之间的间距（px） |
| `showCaption` | `true` | 底部是否显示标题 |
| `showToggleButton` | `true` | 是否显示右下角开关按钮 |
| `minViewportWidth` | `720` | 视口窄于此值不启用 |
| `preferLargeMinWidth` | `360` | 加载结果小于此宽度时，尝试更大的候选图 |

例：让老版排行榜 `/top` 也生效，并把大图调小一点：

```js
paths: ['/rankings', '/top'],
maxWidthRatio: 0.4,
maxHeightRatio: 0.6,
```

## 工作原理

1. **事件委托，不逐元素绑定**：只在 `window` 上挂捕获阶段的 `pointerover` / `pointerout`。排行榜是 antd Table，翻页、切排序会整批重渲染；逐元素绑监听（参考脚本用 `MutationObserver` + 逐个 `mouseenter`）行多时既费事又容易漏绑。
2. **找行**：`event.target.closest(rowSelector)`；`pointerType` 非 `mouse` 直接忽略，触屏不会误弹。
3. **找图**：行内所有 `<img>` 打分 —— `面积 × (antd 图片 ? 2.5) × (详情链接内 ? 1.6) × (竖版 ? 1.4)`，跳过 `data:` 与 `.svg`。结果按行存 `WeakMap`，行被移除自动回收。
4. **取大图**：优先 `data-src` / `data-original`（懒加载站点常见），再退 `currentSrc` / `src`；非表格场景试 `-123.jpg` → `jp-123.jpg` 变体，失败回退原图。每次加载带递增 `token`，过期结果直接丢弃，快速划过十几行也不会串图。
5. **定位与淡入**：先 `display:block` 再读 `offsetWidth/offsetHeight`（强制布局，避免量到 0 导致抖动），按「右 → 左 → 贴边」三级回退算 `left/top`，最后改 `opacity` 触发 0.16s 过渡。**不用 `requestAnimationFrame` 显示**：后台标签页或无头环境里 rAF 可能长时间不回调，预览会一直保持透明。

## 适配其它页面

- **老版排行榜 `/top`**：`paths: ['/rankings', '/top']`。
- **种子列表、卡片视图**：先试 `allPages: true`；卡片视图一般还要把 `rowSelector` 换成类似 `li.list-none`（参考脚本用的是 `li.list-none .ant-image[role='button']`）的选择器。
- **站点改版**：打开 `?mthp_debug=1`，控制台会打印每行选中的图和候选大图地址，照着新类名改 `rowSelector` 即可。

## 常见问题

**悬浮了但没反应？**<br>
依次确认：地址是 `/rankings`（受 `CONFIG.paths` 限制）→ 窗口宽度 ≥ 720px → 右下角按钮显示「大图」而不是「大图 关」→ 装完是否刷新过页面 → 是否与其它 M-Team 脚本冲突（先禁用其它脚本试试）。

**大图有点糊？**<br>
放大的就是列表里那张图，站点给的是压缩缩略图就必然发虚。脚本不会为此去请求详情页——那会让悬浮变慢，也增加站点压力。

**大图挡住了表格右边几列？**<br>
排行榜表格几乎占满屏幕时，大图只能覆盖在上面（`pointer-events: none`，不影响点击）。把 `maxWidthRatio` 调到 `0.35`、或 `maxWidthPx` 调到 `480` 会好很多。

**会额外耗流量吗？**<br>
每张图只在首次悬浮时加载一次，之后走浏览器缓存；快速划过、没停留的行不会加载。除图片本身外没有任何网络请求。

**会把我的数据传出去吗？**<br>
不会。脚本不读 Cookie、不发请求、不注入远端代码，逻辑全在本地；开关状态只写 `localStorage`。

**手机上能用吗？**<br>
基本不能：触屏没有 hover，脚本也主动过滤了非鼠标指针，窄屏（< 720px）还会自动关闭。

## 本地开发

仓库自带一个仿 antd Table 的演示页，调样式时不用登 M-Team、也不用反复真机验证：

```bash
git clone https://github.com/Eliaukzzz/m-team-rankings-hover-preview.git
cd m-team-rankings-hover-preview
node demo/serve.mjs          # 需要 Node 18+
# 打开 http://localhost:8123/rankings
```

演示页自动加载仓库根目录的脚本文件；加上 `?autohover=3` 会在加载后自动悬浮第 3 行，方便截图或做回归比对。

## 目录结构

```
m-team-rankings-hover-preview/
├── m-team-rankings-hover-preview.user.js   # 脚本本体（安装这个）
├── demo/
│   ├── index.html                          # 仿 antd Table 的演示页
│   ├── serve.mjs                           # 把演示页挂在 /rankings 的极简静态服务器
│   └── posters/                            # 演示用海报图
├── docs/
│   ├── demo.gif                            # README 动图
│   └── preview.png                         # 静态截图
├── LICENSE
└── README.md
```

## 更新日志

- **1.1.1**：补全脚本头信息（`@author` / `@namespace` / `@homepageURL`）；文档整理。
- **1.1.0**：改为事件委托；支持 `data-src` 等懒加载属性；加入大图变体回退，加载过小自动换更大候选；去掉对 `requestAnimationFrame` 的依赖；竖版图加权。
- **1.0.0**：首个可用版本 —— 悬浮预览、贴边定位、标题叠加、`Alt + P` 开关。

## 致谢

- 交互与选择器思路参考 [M-Team 新版页面主题 列表大图预览](https://greasyfork.org/zh-CN/scripts/538074)（作者 [Seahor](https://github.com/SeahorZhang/m-team-thems)）。本脚本是独立实现，针对排行榜用了更轻的委托式处理。
- 页面类名与表格结构来自对 `kp.m-team.cc` 前端 bundle 的阅读；站点改版后可能需要同步调整选择器。

## License

[MIT](LICENSE) © Eliaukzzz

如果这个脚本帮你省了几次点击，欢迎点个 ⭐。