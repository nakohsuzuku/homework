export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  
  aiProvider: process.env.AI_PROVIDER || 'zhipu', // zhipu | openai
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.2'),
    apiBase: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',
  },
  
  zhipu: {
    apiKey: process.env.ZHIPU_API_KEY || '',
    model: process.env.ZHIPU_MODEL || 'glm-4-6v',
    temperature: parseFloat(process.env.ZHIPU_TEMPERATURE || '0.2'),
    apiBase: process.env.ZHIPU_API_BASE || 'https://open.bigmodel.cn/api/paas/v4',
  },
  
  github: {
    token: process.env.GITHUB_TOKEN || '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || 'secret',
  },
  
  gitlab: {
    token: process.env.GITLAB_TOKEN || '',
    webhookSecret: process.env.GITLAB_WEBHOOK_SECRET || 'secret',
  },
  
  database: {
    type: process.env.DB_TYPE || 'memory',
    path: process.env.DB_PATH || './data',
  },
};

export const defaultStyleConfig = {
  namingConvention: 'camelCase' as const,
  indentation: 'spaces' as const,
  indentSize: 2,
  maxLineLength: 120,
  requireComments: true,
  customRules: {},
};

export const severityLabels = {
  critical: '🔴 Critical',
  high: '🟠 High',
  medium: '🟡 Medium',
  low: '🟢 Low',
};

export const issueTypeLabels = {
  style: '代码风格',
  logic: '逻辑缺陷',
  performance: '性能问题',
  readability: '可读性',
};