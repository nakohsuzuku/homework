import { v4 as uuidv4 } from 'uuid';
import { CodeFile, ReviewIssue } from '../types';
import { parseCode } from '../utils/codeParser';
import { analyzeCode } from '../utils/openaiClient';

export class PerformanceAgent {
  async analyze(files: CodeFile[]): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];

    for (const file of files) {
      issues.push(...this.checkPerformanceIssues(file));
      issues.push(...await this.aiAnalyze(file));
    }

    return issues;
  }

  private checkPerformanceIssues(file: CodeFile): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const lines = file.content.split('\n');
    const parsed = parseCode(file.language, file.content);

    this.checkNestedLoops(lines, file.filename, issues);
    this.checkInefficientStringConcat(lines, file.filename, issues);
    this.checkMissingCaching(parsed.functions, lines, file.filename, issues);
    this.checkSyncInAsync(lines, file.filename, issues);
    this.checkLargeArrayOperations(lines, file.filename, issues);

    return issues;
  }

  private checkNestedLoops(lines: string[], filename: string, issues: ReviewIssue[]) {
    let loopDepth = 0;
    let maxDepth = 0;
    let problematicLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('for (') || line.includes('while (') || line.includes('for (')) {
        loopDepth++;
        if (loopDepth > maxDepth) {
          maxDepth = loopDepth;
          problematicLine = i + 1;
        }
      }
      const closeBraces = (line.match(/\}/g) || []).length;
      loopDepth -= closeBraces;
    }

    if (maxDepth >= 3) {
      issues.push({
        id: uuidv4(),
        file: filename,
        line: problematicLine,
        severity: 'high',
        type: 'performance',
        message: `循环嵌套深度达到${maxDepth}层，可能导致性能问题`,
        suggestion: '考虑使用扁平化数据结构或分治策略优化',
        codeSnippet: lines[problematicLine - 1],
      });
    }
  }

  private checkInefficientStringConcat(lines: string[], filename: string, issues: ReviewIssue[]) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const plusCount = (line.match(/\+\s*['"]/g) || []).length;
      if (plusCount >= 3) {
        issues.push({
          id: uuidv4(),
          file: filename,
          line: i + 1,
          severity: 'medium',
          type: 'performance',
          message: '多次字符串拼接可能导致性能问题',
          suggestion: '使用数组join或模板字符串替代',
          codeSnippet: line,
        });
      }
    }
  }

  private checkMissingCaching(
    functions: Array<{ name: string; startLine: number; content: string }>,
    lines: string[],
    filename: string,
    issues: ReviewIssue[]
  ) {
    for (const func of functions) {
      if ((func.content.includes('await') && func.content.includes('fetch')) || 
          (func.content.includes('await') && func.content.includes('db.')) ||
          (func.content.includes('await') && func.content.includes('api.'))) {
        
        const funcLines = func.content.split('\n');
        let hasCache = false;
        
        for (const line of funcLines) {
          if (line.includes('cache') || line.includes('Cache') || 
              line.includes('memo') || line.includes('Memo')) {
            hasCache = true;
            break;
          }
        }

        if (!hasCache) {
          issues.push({
            id: uuidv4(),
            file: filename,
            line: func.startLine,
            severity: 'medium',
            type: 'performance',
            message: `函数 "${func.name}" 可能受益于缓存优化`,
            suggestion: '考虑添加缓存机制减少重复调用',
            codeSnippet: funcLines[0],
          });
        }
      }
    }
  }

  private checkSyncInAsync(lines: string[], filename: string, issues: ReviewIssue[]) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('await')) {
        const nextLines = lines.slice(i + 1, i + 5);
        for (const nextLine of nextLines) {
          if (nextLine.includes('.sync') || 
              (nextLine.includes('readFile') && !nextLine.includes('await')) ||
              (nextLine.includes('writeFile') && !nextLine.includes('await'))) {
            issues.push({
              id: uuidv4(),
              file: filename,
              line: i + 1,
              severity: 'high',
              type: 'performance',
              message: '异步函数中调用同步IO操作会阻塞事件循环',
              suggestion: '使用异步版本替代同步操作',
              codeSnippet: nextLine,
            });
          }
        }
      }
    }
  }

  private checkLargeArrayOperations(lines: string[], filename: string, issues: ReviewIssue[]) {
    const largeArrayPatterns = [
      /\.forEach\(/,
      /\.map\(/,
      /\.filter\(/,
      /\.reduce\(/,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (largeArrayPatterns.some(p => p.test(line))) {
        const prevLines = lines.slice(Math.max(0, i - 3), i);
        for (const prevLine of prevLines) {
          if (prevLine.includes('.length') && prevLine.includes('>')) {
            const match = prevLine.match(/(\d+)/);
            if (match && parseInt(match[1]) > 1000) {
              issues.push({
                id: uuidv4(),
                file: filename,
                line: i + 1,
                severity: 'medium',
                type: 'performance',
                message: '对大型数组进行迭代操作可能影响性能',
                suggestion: '考虑分批处理或使用更高效的数据结构',
                codeSnippet: line,
              });
            }
          }
        }
      }
    }
  }

  private async aiAnalyze(file: CodeFile): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];

    try {
      const prompt = `请分析以下代码，识别潜在的性能问题，包括但不限于：
1. 低效的算法复杂度
2. 重复计算
3. 不必要的内存分配
4. 同步阻塞操作
5. 缺少缓存机制
6. 大数据量处理问题

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
              type: 'performance',
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
          } else if (line.includes('PERFORMANCE') || line.includes('SLOW') || line.includes('优化')) {
            issues.push({
              id: uuidv4(),
              file: file.filename,
              line: currentLine,
              severity: 'medium',
              type: 'performance',
              message: line.trim(),
              suggestion: '请优化此代码段',
            });
          }
        }
      }
    } catch (error) {
      console.error('AI分析性能问题失败:', error);
    }

    return issues;
  }
}