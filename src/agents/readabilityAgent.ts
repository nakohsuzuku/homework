import { v4 as uuidv4 } from 'uuid';
import { CodeFile, ReviewIssue, RefactorSuggestion } from '../types';
import { parseCode, generateDiff } from '../utils/codeParser';
import { analyzeCode, generateRefactoredCode } from '../utils/openaiClient';

export class ReadabilityAgent {
  async analyze(files: CodeFile[]): Promise<{ issues: ReviewIssue[]; suggestions: RefactorSuggestion[] }> {
    const issues: ReviewIssue[] = [];
    const suggestions: RefactorSuggestion[] = [];

    for (const file of files) {
      const { issues: fileIssues, suggestions: fileSuggestions } = await this.analyzeFile(file);
      issues.push(...fileIssues);
      suggestions.push(...fileSuggestions);
    }

    return { issues, suggestions };
  }

  private async analyzeFile(file: CodeFile): Promise<{ issues: ReviewIssue[]; suggestions: RefactorSuggestion[] }> {
    const issues: ReviewIssue[] = [];
    const suggestions: RefactorSuggestion[] = [];
    const parsed = parseCode(file.language, file.content);

    for (const func of parsed.functions) {
      const funcLength = func.endLine - func.startLine + 1;
      
      if (funcLength > 50) {
        issues.push({
          id: uuidv4(),
          file: file.filename,
          line: func.startLine,
          severity: 'medium',
          type: 'readability',
          message: `函数 "${func.name}" 过长（${funcLength}行），可读性较差`,
          suggestion: '考虑将函数拆分为多个小函数',
          codeSnippet: func.content.split('\n')[0],
        });

        const refactorSuggestion = await this.generateRefactorSuggestion(file, func);
        if (refactorSuggestion) {
          suggestions.push(refactorSuggestion);
        }
      }

      const paramCount = this.countParameters(func.content);
      if (paramCount > 5) {
        issues.push({
          id: uuidv4(),
          file: file.filename,
          line: func.startLine,
          severity: 'low',
          type: 'readability',
          message: `函数 "${func.name}" 参数过多（${paramCount}个）`,
          suggestion: '考虑使用对象参数替代多个独立参数',
          codeSnippet: func.content.split('\n')[0],
        });
      }

      if (this.hasDeepNestedConditionals(func.content)) {
        issues.push({
          id: uuidv4(),
          file: file.filename,
          line: func.startLine,
          severity: 'medium',
          type: 'readability',
          message: `函数 "${func.name}" 包含深层嵌套的条件语句`,
          suggestion: '考虑使用早期返回或策略模式简化逻辑',
          codeSnippet: func.content.split('\n')[0],
        });
      }
    }

    const aiIssues = await this.aiAnalyze(file);
    issues.push(...aiIssues);

    return { issues, suggestions };
  }

  private countParameters(funcContent: string): number {
    const firstLine = funcContent.split('\n')[0];
    const paramMatch = firstLine.match(/\(([^)]+)\)/);
    if (paramMatch) {
      const params = paramMatch[1].split(',').map(p => p.trim());
      return params.filter(p => p).length;
    }
    return 0;
  }

  private hasDeepNestedConditionals(funcContent: string): boolean {
    const lines = funcContent.split('\n');
    let maxDepth = 0;
    let currentDepth = 0;

    for (const line of lines) {
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      
      if (line.includes('if') || line.includes('else') || line.includes('switch')) {
        currentDepth += openBraces;
        maxDepth = Math.max(maxDepth, currentDepth);
      }
      
      currentDepth -= closeBraces;
    }

    return maxDepth >= 4;
  }

  private async generateRefactorSuggestion(
    file: CodeFile,
    func: { name: string; startLine: number; endLine: number; content: string }
  ): Promise<RefactorSuggestion | null> {
    try {
      const prompt = `请重构以下函数，目标：
1. 将过长的函数拆分为多个职责单一的小函数
2. 提高代码可读性
3. 保持功能不变

函数名：${func.name}`;

      const refactoredCode = await generateRefactoredCode(prompt, func.content);
      
      if (refactoredCode && refactoredCode !== func.content) {
        const diff = generateDiff(func.content, refactoredCode);
        
        return {
          file: file.filename,
          originalCode: func.content,
          refactoredCode: refactoredCode,
          diff: diff,
          explanation: `已将函数 "${func.name}" 拆分为多个小函数以提高可读性`,
        };
      }
    } catch (error) {
      console.error('生成重构建议失败:', error);
    }

    return null;
  }

  private async aiAnalyze(file: CodeFile): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];

    try {
      const prompt = `请分析以下代码的可读性问题，包括但不限于：
1. 函数过长或职责不清晰
2. 变量命名不清晰
3. 缺少必要的注释
4. 复杂的条件逻辑
5. 重复代码

请以JSON格式返回发现的问题，每个问题包含：行号、严重程度(critical/high/medium/low)、问题描述、修复建议。`;

      const result = await analyzeCode(prompt, file.content);
      
      try {
        const parsed = JSON.parse(result);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            issues.push({
              id: uuidv4(),
              file: file.filename,
              line: item.line || 1,
              severity: item.severity || 'medium',
              type: 'readability',
              message: item.message || '未知问题',
              suggestion: item.suggestion || '',
              codeSnippet: item.codeSnippet,
            });
          }
        }
      } catch {
        const lines = result.split('\n');
        let currentLine = 0;
        for (const line of lines) {
          if (line.match(/^\d+:/)) {
            currentLine = parseInt(line.split(':')[0]);
          } else if (line.includes('READABILITY') || line.includes('CONFUSING') || line.includes('复杂')) {
            issues.push({
              id: uuidv4(),
              file: file.filename,
              line: currentLine,
              severity: 'medium',
              type: 'readability',
              message: line.trim(),
              suggestion: '请改善代码可读性',
            });
          }
        }
      }
    } catch (error) {
      console.error('AI分析可读性问题失败:', error);
    }

    return issues;
  }
}