# Collaboard - 多人实时协同代码编辑器

Collaboard 是一个基于 Web 的多人实时协同代码编辑器。输入昵称并创建一个房间号（或加入已有房间），即可与其他人一起实时编辑同一份代码，并看到彼此的在线状态和光标位置。

## 功能特性

- **实时协同编辑**：基于 Pusher 实时通道，输入内容在多人之间实时同步
- **远程光标与选区**：实时显示其他成员的光标和选中区域，并区分不同颜色
- **在线成员列表**：通过 Pusher presence 通道展示当前房间内的在线用户
- **房间机制**：生成或输入房间号即可加入，无需注册登录
- **自动保存**：输入自动防抖同步，冲突时自动重试，掉线重连后自动重新拉取最新内容
- **代码编辑器**：基于 CodeMirror 6，支持 JavaScript / TypeScript，暗色主题
- **中英文界面**：内置 zh / en 双语切换

## 技术栈

- [Next.js](https://nextjs.org) 16（App Router）+ React 19 + TypeScript
- [CodeMirror 6](https://codemirror.net)（`@uiw/react-codemirror`）编辑器
- [Pusher](https://pusher.com) 实时消息（presence 通道 + 客户端事件）
- [CloudBase](https://cloud.tencent.com/product/tcb)（腾讯云开发）存储房间代码
- [Tailwind CSS](https://tailwindcss.com) 4 样式

## 环境变量

项目依赖以下环境变量，缺少 Pusher 或 CloudBase 配置时应用会降级运行（编辑器仍可用，但无法实时同步/持久化）：

| 变量 | 说明 |
| --- | --- |
| `NEXT_PUBLIC_PUSHER_KEY` | Pusher 应用 key（客户端） |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Pusher 集群（客户端） |
| `PUSHER_APP_ID` | Pusher 应用 ID（服务端） |
| `PUSHER_SECRET` | Pusher 密钥（服务端） |
| `CLOUDBASE_ENV_ID` | CloudBase 环境 ID |
| `CLOUDBASE_API_KEY` | CloudBase 访问密钥 |

复制 `.env.example` 为 `.env.local` 并填入对应值（首次使用请先在 [Pusher](https://pusher.com) 和 [腾讯云开发](https://cloud.tencent.com/product/tcb) 创建应用）。

## 快速开始

首先，安装依赖并启动开发服务器：

```bash
npm install
npm run dev
# 或
yarn dev
# 或
pnpm dev
# 或
bun dev
```

用浏览器打开 [http://localhost:3000](http://localhost:3000) 即可看到结果。

输入昵称和房间号，或点击随机按钮生成房间号，点击「加入房间」开始实时协同编辑。页面修改可在 `app/page.tsx` 中编辑，保存后自动热更新。

## 构建与部署

```bash
npm run build   # 生产构建
npm start       # 启动生产服务器
```

更详细的 Next.js 部署说明可参考 [Next.js 部署文档](https://nextjs.org/docs/app/building-your-application/deploying)。
