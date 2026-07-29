# HarborNavi Landing Page V6 交接说明

更新时间：2026-07-29

## 1. 交接目标与责任边界

本交接以 `/home-v6` 为当前 Landing Page 工作版本。Fiona (`fiona-xstation`) 负责页面设计、前端实现、响应式适配、素材更新、SEO 元信息、Preview 验证和生产发布；产品负责人只负责需要业务判断的文案、产品承诺、价格、日期、众筹、硬件规格、兼容性和隐私口径。

Fiona 可以直接 push 到 `main`。她的 `main` push 会通过 GitHub Actions 调用项目专属 Vercel Deploy Hook，自动发布到 `harbornavi.com`，不需要原维护者操作 Vercel。

## 2. 仓库与当前状态

| 项目 | 当前值 |
| --- | --- |
| GitHub | `https://github.com/HarborNavi/harbornavi-site` |
| 可见性 | Public |
| 默认分支 | `main` |
| 生产分支 | `main` |
| 生产发布 workflow | `.github/workflows/deploy-production.yml` |
| GitHub 生产密钥 | `VERCEL_DEPLOY_HOOK_URL` (Actions Secret) |
| Vercel 本地链接项目 | `harbornavi-site` |
| 正式站点 | `https://harbornavi.com` |
| V6 路由 | `https://harbornavi.com/home-v6` |
| 正式入口 | `/` 和 `/home` 永久重定向到 `/home-v6` |

仓库已经存在，不要再创建同名或重复仓库。Fiona 具有 GitHub `Write` 权限；按本次交接要求，`main` 保持可直接 push。大范围改动、API、数据库、支付和隐私修改仍建议通过 PR Preview 验证后再合并。

任何本地工作树都应遵守：

- `.env.local` 已被忽略，任何时候都不要提交、粘贴或截图其中的值。
- `.vercel/` 是本地项目链接信息，已被忽略，不提交。
- `.tmp/` 可能包含浏览器 profile、缓存、Cookie/登录数据等本地状态，已被 `.gitignore` 忽略。
- `.neon` 可能包含本地 Neon 链接状态，已被 `.gitignore` 忽略。
- 不要使用 `git add -A`、`git add .` 或 Git 客户端的“Stage All”。只按明确文件路径 stage。

## 3. 本地运行

项目是 Astro 静态站点，Vercel 在同一项目中提供 Serverless API。

```powershell
git clone https://github.com/HarborNavi/harbornavi-site.git
cd harbornavi-site
npm ci
npm run dev
```

页面地址：`http://127.0.0.1:4321/home-v6`。生产环境的 `/` 和 `/home` 由 `vercel.json` 永久重定向到 V6；本地 Astro dev 仍可直接打开各路由源文件。

`npm run dev` 可以验证页面和浏览器端交互，但 Astro dev server 本身不等于完整 Vercel 环境。`/api/waitlist` 和 `/api/events` 的端到端验证应在配置好 Preview 环境变量和 Preview 数据库的 Vercel deployment 上进行，或由有权限的维护者使用 Vercel 本地开发流程验证。

不要把生产数据库凭据拉给不需要生产权限的人。开发和 Preview 应使用独立的数据库分支或测试数据库。

## 4. `/home-v6` 文件结构

| 文件 | 作用 |
| --- | --- |
| `src/pages/home-v6.astro` | 路由入口，仅挂载 V6 组件 |
| `src/components/HomeV6Landing.astro` | 页面内容、SEO、JSON-LD、表单、弹窗和前端 analytics |
| `src/styles/home-v6.css` | V6 独立样式与响应式断点 |
| `public/assets/` | 页面使用的图像素材 |
| `vercel.json` | 根路径重定向和每日 waitlist retry 兜底 cron |
| `.github/workflows/retry-waitlist.yml` | 每小时调用受保护的 waitlist retry endpoint |

页面自上而下为：

1. Header：Memory / How it works / Compatibility / Hardware / Compare 锚点和 Join CTA。
2. Hero：主 slogan、两段产品描述、首屏 waitlist 表单和主图。
3. Memory story：家庭片段如何成为可查询的本地记忆。
4. Home briefing：回家后获得当天的简要连接信息。
5. Remember / Understand / Respond：本地存储、Home Agent 和设备动作三层。
6. Proof stories：包裹事件和 Movie night 场景。
7. Trust boundary：敏感操作等待用户确认。
8. Compatibility：Home Assistant、RTSP/ONVIF、selected integrations、planned Zigbee/IR。
9. Hardware：本地硬件价值和计划规格。
10. Compare：与 Camera AI、Cloud home AI、本地自动化和专业全屋系统的对比。
11. FAQ。
12. Final CTA、Footer 和成功弹窗。

当前 Hero 定稿方向：

```text
Home is where the heart is. And where your memories live.
```

```text
HarborNavi: Keeping the moments that define your home, private and forever.
```

Hero 的两段描述也已按产品负责人提供的截图更新。桌面宽屏下 slogan 设计为一长行；`home-v6.css` 在较窄断点恢复换行。任何修改都要同时检查 1440px/1280px 桌面、平板和 390px/360px 手机，不能依靠隐藏溢出来掩盖文字被裁切。

SEO 元信息、Open Graph、Twitter Card、canonical 和 Product JSON-LD 当前都直接写在 `HomeV6Landing.astro`。修改主 slogan、描述、主图或最终正式路由时，需要同步更新这些字段。

## 5. 当前页面引用的素材

以下图像都是 1536 x 1024 PNG：

| 素材 | 使用位置 |
| --- | --- |
| `public/assets/home-v6-memory-hero-id.png` | Hero 主图和社交分享图 |
| `public/assets/home-v6-family-moment-id.png` | Memory story |
| `public/assets/home-v6-homecoming-briefing-id.png` | Home briefing |
| `public/assets/home-v4-package-response.png` | Package proof story，共用 V4 素材 |
| `public/assets/home-v6-movie-night-id.png` | Movie night proof story |
| `public/assets/home-v6-trust-boundary-id.png` | Trust boundary |
| `public/assets/home-v6-hardware-id.png` | Hardware |

素材更新规则：

- 新版本使用新文件名，例如 `home-v6-memory-hero-v2.webp`，不要静默覆盖旧图。
- 同步修改组件中的路径、`width`/`height`、准确的 `alt` 和社交分享图引用。
- 每张图都应展示实际产品、家庭场景或真实界面含义，不使用与产品无关的气氛图。
- 当前 PNG 单张约 1.8-2.5MB，上线前应评估 WebP/AVIF 和响应式图片，避免首屏与长页面流量过大。
- `home-v6-memory-hero.png` 和 `home-v6-sleeping-child-card.png` 当前没有被 V6 组件引用，不应仅因为位于目录中就自动 stage。

## 6. Waitlist 与 API 边界

V6 有 Hero 和页尾两个 email 表单。它们共享同一套浏览器逻辑：

- 必填字段：`email`。
- Honeypot：隐藏的 `company` 字段；真人应留空。
- POST `/api/waitlist`：提交 email、`route=home-v6`、表单位置、path、referrer 和 UTM。
- POST `/api/events`：记录 page view、表单开始/提交/成功/失败、场景曝光、survey 和 Discord 点击。
- UTM 保存在 `sessionStorage`；analytics session id 也只在浏览器 session 内使用。
- API 保存成功并发出确认邮件后，页面提示用户检查邮箱；只有点击有效确认链接后才完成营销订阅。

服务端的双重确认链路：

1. `/api/waitlist` 校验 email、忽略 honeypot、按 email upsert 到 Neon，并增加 `submission_count`。
2. 只有标准化后的 `route=home-v6` 获得 `kickstarter_updates` scope。服务端写入 `home_v6_2026_07`、请求时间和 `pending_confirmation`；这些值不信任客户端输入。
3. Resend Email API 发送带 HMAC 签名的确认链接。链接七天后失效；未点击前不会创建营销 Topic 订阅。
4. `/api/waitlist/confirm` 验签、检查有效期和 consent version，确认后才将联系人明确设为单一 Kickstarter Topic 的 `opt_in`，随后发送运营提醒。
5. 确认邮件、Contact sync 和运营提醒的 status、attempt count、时间、provider/topic id 和错误记录在 `waitlist_leads.metadata`。
6. GitHub Actions 每小时调用 `/api/cron/retry-waitlist` 重试符合条件的失败任务，Vercel 每日兜底。没有配置 Topic ID 时，它会查找或创建 `default_subscription=opt_out` 的 Kickstarter Topic；未确认 V6 lead 超过 30 天会从 Neon 清理。

Resend Topic 的 `opt_out` 是 Topic 的默认策略；确认后的单个联系人仍由代码明确写成 `opt_in`。V6 不依赖 Road Topic，也不会在初次 POST 后直接把邮箱加入营销名单。Kickstarter 营销邮件必须用 Resend Broadcast 和 Topic 退订能力发送，不能用事务性 Email API 绕过退订。

`/api/events` 只接受 allowlist 事件，并清理 analytics properties 中的 PII-like key；email 不进入 analytics 表。V6 不调用 `/api/waitlist/profile`、reservation、Stripe 或 admin API。不要为了改 Landing Page 表现而修改这些接口。

V4 和 V5 仅作历史视觉对照，已标记 `noindex`，表单不再提交 email，只引导访问 V6。后续不能从这两个 route 恢复营销收集，除非重新完成产品、隐私、测试和发布审批。

## 7. 环境变量与密钥原则

变量名以 `.env.example` 为唯一可提交模板。`.env.example` 只能放空值或明显占位符，绝不放真实凭据。

V6 数据保存的最低服务端依赖：

```text
DATABASE_URL
```

后台登录所需，但不是 V6 页面渲染所需：

```text
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
```

完整的 V6 确认、Topic 同步和 cron 链路需要：

```text
RESEND_API_KEY
WAITLIST_CONFIRMATION_SECRET
CRON_SECRET
```

`WAITLIST_CONFIRMATION_SECRET` 至少 32 个字符。生产环境还必须提供一个 Resend 接受的 sender：优先使用 `WAITLIST_CONFIRMATION_FROM_EMAIL`，未配置时回退到 `NOTIFY_FROM_EMAIL`。运营提醒还需要：

```text
NOTIFY_TO_EMAIL
NOTIFY_FROM_EMAIL
```

`NOTIFY_TO_EMAIL` 也作为确认邮件的 reply-to，便于接收删除请求。以下是可选 override，不是首次部署的阻断项：

```text
WAITLIST_PUBLIC_ORIGIN
RESEND_KICKSTARTER_TOPIC_ID
RESEND_KICKSTARTER_TOPIC_NAME
```

`WAITLIST_PUBLIC_ORIGIN` 默认 `https://harbornavi.com`。`RESEND_KICKSTARTER_TOPIC_ID` 未配置时，cron 会按环境查找或创建 Topic；Preview 默认使用独立名称，避免混入生产受众。V6 没有 `RESEND_ROAD_TOPIC_ID` 依赖。

其他 campaign 和 Stripe 变量与 V6 Landing Page 修改不是同一发布范围。`CRON_SECRET` 同时保护 waitlist retry 和现有的 reservation refund cron；Vercel Production/Preview 环境变量和 GitHub Actions Secret 必须使用同一个值，轮换时一起更新。不要因为变量存在于 `.env.example` 就给 Landing Page 维护者开放生产密钥。

执行原则：

- 在 Vercel Project Settings 中分别配置 Preview 和 Production；Preview 使用测试资源。
- 生产密钥只授予确有需要的维护者，优先使用最小权限和可轮换凭据。
- 不通过 Git、PR、issue、聊天、截图或交接文档传递密钥。
- 一旦凭据误入 Git 或聊天，不能只删除文件；应立即在提供方轮换并检查使用记录。
- `PUBLIC_*` 会进入浏览器构建产物，不得存放秘密。

## 8. Git 分支与 PR 流程

1. 小范围、低风险文案或样式修改可以在本地验证后直接 push `main`。
2. 大范围视觉、API、数据库、支付、隐私或部署修改应从最新 `origin/main` 创建独立分支。
3. 一次 PR 只负责一个清楚范围；用明确路径 stage，然后检查 `git diff --cached --stat` 和 `git diff --cached`。
4. PR 中附 Preview URL、桌面/手机截图和验证结果；检查通过后由 Fiona 合并到 `main`。
5. `main` 更新后检查 GitHub Actions 的 `Deploy production` workflow，并在正式域名完成 smoke test。

## 9. 生产发布自动化

`.github/workflows/deploy-production.yml` 在以下情况运行：

- Fiona (`fiona-xstation`) push 或合并到 `main`。
- 有 `Write` 权限的维护者在 GitHub Actions 中手动选择 `Run workflow`。

workflow 使用 GitHub Actions Secret `VERCEL_DEPLOY_HOOK_URL` 调用只绑定 `main` 的 Vercel Deploy Hook。Hook URL 等同部署凭据：不得打印、复制到聊天、写进代码或交接文档。怀疑泄露时应立即在 Vercel Project Settings > Git > Deploy Hooks 删除旧 hook，创建新 hook，并更新同名 GitHub Secret。

如果 workflow 显示成功，说明 Vercel 已接受生产部署任务；随后仍要检查正式域名。构建失败时，Fiona 可以从 GitHub commit 的 Vercel check 查看结果；涉及环境变量、域名、回滚或 Vercel 项目设置的问题仍需项目 Owner 处理。

### 绝对不要 stage

```text
.env.local
.vercel/
.tmp/
.neon
preview.out.log
preview.err.log
node_modules/
dist/
.astro/
```

`main` 已包含当前线上所需的 V2-V6、`/15-homes`、admin、reservation/Stripe、cron 和数据库基线。后续修改仍应按功能范围拆分提交。

## 10. 验证与发布

每个 PR 至少执行：

```powershell
npm ci
npm run build
npm run typecheck
npm test
```

视觉验收：

- Chrome 桌面 1440 x 900 和 1280 x 800。
- 手机 390 x 844 和 360 x 800。
- Hero slogan 在宽屏是一行，在不足空间时自然换行，不裁切、不覆盖主图。
- Header、CTA、表单、比较表、FAQ、弹窗和 footer 无横向页面溢出。
- 键盘可完成表单和弹窗操作，焦点可见，Escape 可关闭弹窗。
- `prefers-reduced-motion` 下无强制动画。
- 所有图片成功加载，alt 与画面一致，布局不因图片加载而跳动。

Preview API 验收：

- `/api/events` 的 `page_view` 和表单事件写入 Preview analytics 表。
- 有效 email 保存为 `pending_confirmation` 并收到确认邮件；无效 email 返回 400；honeypot 不写入 lead。
- 有效链接确认后只进入一个 Kickstarter Topic，联系人为显式 `opt_in`，运营提醒只在确认后发送。
- 无效/过期链接、成功、发送失败、重复提交、网络断开和慢请求状态都可理解。
- 人为制造一次 provider 失败后，验证每小时 GitHub 调度能恢复任务，并验证每日 Vercel 兜底和 30 天未确认清理逻辑。
- email 不进入 analytics 表。
- 只用测试邮箱和 Preview 数据库，测试完成后清理数据。
- 退订使用 Broadcast 的 Topic unsubscribe；不要用事务性 Email API 做营销 smoke test。

发布流程：

1. 确认 GitHub-Vercel 集成为 PR 生成 Preview；本地 `.vercel/project.json` 不能替代远端检查。
2. 在 Preview 完成视觉、功能、SEO、隐私和产品承诺审批。
3. Fiona 合并或 push 到 `main` 后，确认 GitHub Actions `Deploy production` 成功。
4. 等待 Vercel 构建完成，在正式域名检查 `/` 和 `/home` 重定向、canonical、OG 图、robots、API、表单和 analytics。
5. `/home-v6` 已是正式入口；V4/V5 只保留历史对照。不要重新启用旧页表单或把旧页设为可索引入口。

## 11. 需要产品负责人审批的内容

以下内容不能由页面维护者自行“润色”为确定承诺：

- 产品价格、众筹档位、发货时间、上市日期、地区和数量。
- 128GB eMMC、双 M.2、K3-class compute、双 2.5GbE、HDMI、Zigbee、IR、指纹、secure element 等规格。
- 支持的 Home Assistant、RTSP/ONVIF、相机、设备品牌和型号。
- “local”“private”“forever”“without a required subscription”“optional cloud”等隐私、数据路径和商业模式表述。
- HarborNavi 可以自动执行的动作、需要确认的敏感动作和安全边界。
- 对竞品能力、订阅、安装和数据路径的比较；来源链接和比较日期必须可核验。
- Kickstarter、SurveyMonkey、Discord、YouTube、15 Homes 等外部链接和收集目的。
- waitlist 的营销同意、Topic、unsubscribe 文案、privacy policy 和数据保留规则发生变化时，必须重新审批。

## 12. 当前待办

- [x] 将 `/home-v6` 设为唯一当前 Landing Page，并让 `/`、`/home` 永久重定向到 V6。
- [x] 将 V4/V5 标记为 `noindex` 历史页并停用旧表单。
- [x] 实现 V6 Neon pending lead、七天签名确认、单一 Kickstarter Topic 显式 opt-in 和确认后运营提醒。
- [x] 实现 waitlist metadata 状态、每小时 GitHub 重试、每日 Vercel 兜底、Topic 自动初始化和 30 天未确认清理。
- [x] 更新 V6 表单状态、隐私说明、环境变量模板和后端操作文档。
- [x] 将 `.tmp/` 和 `.neon` 规则纳入远端 `.gitignore`。
- [x] 将当前线上前后端代码整理成可复现的 GitHub `main` 基线。
- [x] Fiona 获得 GitHub `Write` 权限，可以直接 push `main`。
- [x] 建立 Fiona `main` push 到 Vercel Production 的 GitHub Actions 自动发布。
- [ ] 在生产环境完成真实受控邮箱的端到端验证：提交、确认、Topic opt-in、运营提醒、cron 恢复和正式域名 smoke test。
- [ ] 为 Preview 配置独立数据库，并执行 `db/waitlist.sql`、`db/analytics.sql`。
- [ ] 优化大体积 PNG，并重新检查首屏 LCP 与移动流量。
- [ ] 验证 SurveyMonkey、Discord 和 comparison source 链接。
- [ ] 完成 1440/1280/390/360 截图和表单/API smoke test。
- [ ] 由产品负责人签字确认硬件、兼容性、隐私、订阅和众筹表述。
