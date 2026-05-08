# AI Coach Suite

一个可运行的「AI 陪练」全栈 MVP：管理后台 + 微信小程序 + 服务端。功能根据前面的全站开发清单落地为可执行代码：场景库、AI 角色陪练、练习会话、实时 WebSocket 对话、练后报告、排行榜、任务下发、管理后台配置。

> 说明：这是基于公开产品能力抽象出的自研实现，不包含任何北森私有代码、接口或素材。

## 技术栈

- `server`: Node.js + Express + TypeScript + Prisma + SQLite + WebSocket
- `admin-web`: React + Vite + TypeScript + Ant Design
- `mini-program`: 原生微信小程序结构
- `infra`: Docker Compose 示例

## 快速启动

```bash
cd server
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

后台管理：

```bash
cd admin-web
npm install
npm run dev
```

微信小程序：用微信开发者工具打开 `mini-program`，把 `utils/config.js` 里的 `API_BASE_URL` 改成你的服务端地址。

默认账号：

```text
管理员：admin@example.com / 123456
学员：learner@example.com / 123456
```

## 核心功能

### 管理后台

- 登录
- 数据概览
- 场景管理：创建、编辑、发布、归档
- AI 角色管理
- 评分规则管理
- 任务下发
- 会话与报告查看
- 用户与角色查看

### 小程序

- 登录
- 首页任务与推荐场景
- 场景库
- 场景详情
- 练习房间：文字对练 + WebSocket 实时回复
- 练后报告：总分、维度分、逐句建议、金牌话术
- 排行榜
- 我的

### 服务端

- JWT 鉴权
- RBAC 简化权限
- 多租户字段预留
- 场景、角色、评分规则、任务、练习会话、报告 API
- WebSocket 实时练习通道
- mock AI 对话与评分引擎
- Prisma 数据模型与 seed 数据

## 目录

```text
ai-coach-suite/
  server/
  admin-web/
  mini-program/
  infra/
```

## 推送到 GitHub

```bash
git init
git add .
git commit -m "feat: init ai coach fullstack app"
git branch -M main
git remote add origin https://github.com/<你的用户名>/ai-coach-suite.git
git push -u origin main
```
