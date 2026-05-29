import OpenAI from 'openai';
import { config } from '../config';

let aiClient: OpenAI | null = null;

if (config.aiProvider === 'zhipu' && config.zhipu.apiKey) {
  aiClient = new OpenAI({
    apiKey: config.zhipu.apiKey,
    baseURL: config.zhipu.apiBase,
  });
} else if (config.aiProvider === 'openai' && config.openai.apiKey) {
  aiClient = new OpenAI({
    apiKey: config.openai.apiKey,
    baseURL: config.openai.apiBase,
  });
}

const currentModel = config.aiProvider === 'zhipu' ? config.zhipu.model : config.openai.model;
const currentTemperature = config.aiProvider === 'zhipu' ? config.zhipu.temperature : config.openai.temperature;

export async function analyzeCode(prompt: string, code: string, maxTokens: number = 4000): Promise<string> {
  if (!aiClient) {
    console.log(`${config.aiProvider.toUpperCase()} API密钥未配置，跳过AI分析`);
    return '';
  }

  try {
    const completion = await aiClient.chat.completions.create({
      model: currentModel,
      temperature: currentTemperature,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'system',
          content: '你是一位资深的软件工程师，精通多种编程语言和代码审查。请仔细分析提供的代码，并给出专业的审查意见。',
        },
        {
          role: 'user',
          content: `${prompt}\n\n代码:\n\`\`\`\n${code}\n\`\`\``,
        },
      ],
    });
    
    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error(`${config.aiProvider.toUpperCase()} API error:`, error);
    throw new Error('代码分析失败');
  }
}

export async function generateRefactoredCode(prompt: string, originalCode: string): Promise<string> {
  if (!aiClient) {
    console.log(`${config.aiProvider.toUpperCase()} API密钥未配置，跳过代码重构`);
    return '';
  }

  try {
    const completion = await aiClient.chat.completions.create({
      model: currentModel,
      temperature: 0.3,
      max_tokens: 4000,
      messages: [
        {
          role: 'system',
          content: '你是一位资深的代码重构专家。请根据要求对代码进行重构，确保代码更加清晰、简洁、高效。只返回重构后的代码，不要包含其他解释文字。',
        },
        {
          role: 'user',
          content: `${prompt}\n\n原始代码:\n\`\`\`\n${originalCode}\n\`\`\`\n\n请返回重构后的代码（只返回代码）：`,
        },
      ],
    });
    
    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error(`${config.aiProvider.toUpperCase()} API error:`, error);
    throw new Error('代码重构失败');
  }
}

export async function summarizeIssues(issues: string[]): Promise<string> {
  if (!aiClient) {
    console.log(`${config.aiProvider.toUpperCase()} API密钥未配置，跳过AI总结`);
    return '';
  }

  try {
    const completion = await aiClient.chat.completions.create({
      model: currentModel,
      temperature: 0.3,
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: '你是一位专业的代码审查报告撰写专家。请根据提供的审查问题列表，生成一份清晰、专业的总结报告，按严重程度排序。',
        },
        {
          role: 'user',
          content: `请汇总以下代码审查问题，生成一份专业的PR评论报告：\n\n${issues.join('\n\n')}`,
        },
      ],
    });
    
    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error(`${config.aiProvider.toUpperCase()} API error:`, error);
    throw new Error('报告生成失败');
  }
}