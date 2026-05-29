# 智能代码审查与重构建议助手

基于AI的智能代码审查工具，在PR阶段自动进行深度审查。

## 功能特性

### 🔍 智能体1：代码风格与规范检查
- 基于团队自定义规范检查命名、缩进、注释等
- 自动学习代码库风格
- 支持多种命名规范：camelCase、snake_case、PascalCase、kebab-case

### 🧠 智能体2：逻辑缺陷检测
- 识别空指针、资源未释放、并发问题等常见缺陷
- 提供具体行号定位
- AI增强的逻辑分析能力

### ⚡ 智能体3：性能优化
- 建议使用缓存、减少循环嵌套、异步改造等
- 检测低效算法复杂度
- 识别同步阻塞操作

### 📖 智能体4：可读性提升
- 对复杂函数提出拆分建议
- 自动生成重构后的代码 diff
- 可选是否应用重构

### 📊 智能体5：反馈总结
- 汇总所有问题，按严重程度排序
- 生成专业的PR评论
- 支持GitHub/GitLab集成

## 技术栈

- Node.js + TypeScript
- Express.js
- OpenAI API
- GitHub API (Octokit)
- GitLab API (Gitbeaker)

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env` 并配置相关参数：

```bash
cp .env.example .env
```

### 运行服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## API接口

### Webhook

- `POST /api/webhook/github` - GitHub PR Webhook
- `POST /api/webhook/gitlab` - GitLab MR Webhook

### 报告管理

- `POST /api/reports` - 创建审查报告
- `GET /api/reports` - 获取报告列表
- `GET /api/reports/:id` - 获取单个报告
- `DELETE /api/reports/:id` - 删除报告

### Dify集成

- `POST /api/dify/analyze` - 分析代码
- `GET /api/dify/results` - 获取分析结果列表
- `GET /api/dify/results/:reportId` - 获取单个分析结果

## 集成方式

### GitHub Webhook配置

1. 在GitHub仓库设置中添加Webhook
2. Payload URL: `http://your-server/api/webhook/github`
3. Content type: `application/json`
4. Secret: 与 `GITHUB_WEBHOOK_SECRET` 一致
5. 选择事件: `Pull requests`

### GitLab Webhook配置

1. 在GitLab项目设置中添加Webhook
2. URL: `http://your-server/api/webhook/gitlab`
3. Secret token: 与 `GITLAB_WEBHOOK_SECRET` 一致
4. 选择事件: `Merge request events`

## 项目结构

```
src/
├── agents/           # 智能体模块
│   ├── styleAgent.ts       # 代码风格检查
│   ├── logicAgent.ts       # 逻辑缺陷检测
│   ├── performanceAgent.ts # 性能优化建议
│   ├── readabilityAgent.ts # 可读性提升
│   └── summaryAgent.ts     # 反馈总结
├── controllers/      # 控制器
│   ├── webhookController.ts
│   ├── reportController.ts
│   └── difyController.ts
├── routes/           # 路由
├── services/         # 服务层
│   ├── githubService.ts
│   ├── gitlabService.ts
│   └── reviewService.ts
├── types/            # 类型定义
├── utils/            # 工具函数
├── config/           # 配置
├── middlewares/      # 中间件
└── index.ts          # 入口文件
```

## 许可证

MIT License