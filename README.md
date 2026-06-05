# 爆款研究所 Viral Research Lab

面向自媒体创作者的 AI SaaS 工具平台。V1 包含首页、注册登录、Dashboard、五个 AI 工具、Prisma 数据模型、NextAuth 认证、OpenAI 接口和 Vercel 部署配置。

## 功能

- AI账号定位师：生成账号定位、适合原因、栏目设计、变现路径、30天计划、首月50个选题
- AI标题大师：生成 10-30 个爆款标题
- AI文案优化：生成爆款版、故事版、口播版、情绪版
- 文案提取器：支持粘贴、图片、视频、链接入口，V1 预留 OCR/转写/链接解析
- 文案拆解大师：拆解钩子、痛点、利益点、情绪、结构、公式、模板，并生成同结构文案

## 本地启动

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
cp .env.example .env
```

填写 `DATABASE_URL`、`NEXTAUTH_SECRET`、`OPENAI_API_KEY`。Google 登录为预留能力，填写 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET` 后自动启用。

3. 初始化数据库

```bash
npx prisma generate
npx prisma migrate dev --name init
```

4. 启动项目

```bash
npm run dev
```

打开 `http://localhost:3000`。

## Vercel 部署

1. 在 Vercel 创建 PostgreSQL 数据库，或使用 Neon、Supabase、Railway 等 PostgreSQL 服务。
2. 在 Vercel 项目环境变量中添加 `.env.example` 里的变量。
3. 确保 `NEXTAUTH_URL` 使用线上域名，例如 `https://your-app.vercel.app`。
4. 部署命令保持默认即可；`npm run build` 会先执行 `prisma generate`。
5. 首次上线后，在本地或 CI 中对生产数据库执行迁移：

```bash
npx prisma migrate deploy
```

## 充值配置

网站已预留微信支付和支付宝充值入口。未配置商户资料时，系统只会创建待配置订单，不会真实扣款。

微信支付需要在环境变量中配置：

- `WECHAT_PAY_APP_ID`
- `WECHAT_PAY_MCH_ID`
- `WECHAT_PAY_API_V3_KEY`
- `WECHAT_PAY_PRIVATE_KEY`
- `WECHAT_PAY_CERT_SERIAL_NO`
- `WECHAT_PAY_NOTIFY_URL`

支付宝需要在环境变量中配置：

- `ALIPAY_APP_ID`
- `ALIPAY_PRIVATE_KEY`
- `ALIPAY_PUBLIC_KEY`
- `ALIPAY_NOTIFY_URL`
- `ALIPAY_RETURN_URL`

回调接口已预留：

- 微信支付：`/api/payments/wechat/notify`
- 支付宝：`/api/payments/alipay/notify`

## 目录说明

- `app/`：Next.js App Router 页面与 API Routes
- `components/`：通用 UI、导航、工具表单
- `lib/`：Prisma、NextAuth、OpenAI、API 辅助函数
- `prisma/schema.prisma`：数据库模型

## 生产建议

V1 的文案提取器已完成多入口表单和记录能力，图片 OCR、视频转写、链接解析以接口形式预留。上线后可接入 OpenAI Vision、Whisper 或第三方解析服务。
