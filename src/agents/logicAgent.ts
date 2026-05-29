import { v4 as uuidv4 } from 'uuid';
import { CodeFile, ReviewIssue } from '../types';
import { parseCode } from '../utils/codeParser';
import { analyzeCode } from '../utils/openaiClient';

export class LogicAgent {
  async analyze(files: CodeFile[]): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];

    for (const file of files) {
      issues.push(...this.checkLogicalErrors(file));
      issues.push(...await this.aiAnalyze(file));
    }

    return issues;
  }

  private checkLogicalErrors(file: CodeFile): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const lines = file.content.split('\n');
    const parsed = parseCode(file.language, file.content);

    this.checkNullReference(lines, file.filename, issues);
    this.checkUninitializedVariables(parsed.variables, lines, file.filename, issues);
    this.checkResourceLeak(lines, file.filename, issues);
    this.checkConcurrencyIssues(lines, file.filename, issues);
    this.checkOffByOne(lines, file.filename, issues);
    this.checkArrayBounds(lines, file.filename, issues);

    return issues;
  }

  private checkNullReference(lines: string[], filename: string, issues: ReviewIssue[]) {
    const nullCheckPatterns = [
      /\.(val|value|data|result|item)\./,
      /\.[a-zA-Z_]+\s*\(\)/,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (nullCheckPatterns.some(p => p.test(line))) {
        const prevLine = i > 0 ? lines[i - 1] : '';
        const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
        
        if (!prevLine.includes('if') && !prevLine.includes('?.') && !line.includes('?.') &&
            !nextLine.includes('if') && !line.includes('null') && !line.includes('undefined')) {
          issues.push({
            id: uuidv4(),
            file: filename,
            line: i + 1,
            severity: 'high',
            type: 'logic',
            message: '潜在的空指针异常',
            suggestion: '建议添加空值检查或使用可选链操作符(?.)',
            codeSnippet: line,
          });
        }
      }
    }
  }

  private checkUninitializedVariables(
    variables: Array<{ name: string; line: number; type?: string }>,
    lines: string[],
    filename: string,
    issues: ReviewIssue[]
  ) {
    for (const variable of variables) {
      const varLine = lines[variable.line - 1];
      if (!varLine.includes('=') && !varLine.includes('declare')) {
        issues.push({
          id: uuidv4(),
          file: filename,
          line: variable.line,
          severity: 'medium',
          type: 'logic',
          message: `变量 "${variable.name}" 声明但未初始化`,
          suggestion: '初始化变量或在使用前确保已赋值',
          codeSnippet: varLine,
        });
      }
    }
  }

  private checkResourceLeak(lines: string[], filename: string, issues: ReviewIssue[]) {
    const openPatterns = [/open\(/, /create\(/, /connect\(/, /new\s+.*Stream/, /require\(/];
    const closePatterns = [/close\(/, /disconnect\(/, /destroy\(/];

    let openCount = 0;
    let lastOpenLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (openPatterns.some(p => p.test(line))) {
        openCount++;
        lastOpenLine = i + 1;
      }
      if (closePatterns.some(p => p.test(line))) {
        openCount--;
      }
    }

    if (openCount > 0) {
      issues.push({
        id: uuidv4(),
        file: filename,
        line: lastOpenLine,
        severity: 'high',
        type: 'logic',
        message: '资源可能未正确释放',
        suggestion: '确保在使用完资源后调用关闭/释放方法',
        codeSnippet: lines[lastOpenLine - 1],
      });
    }
  }

  private checkConcurrencyIssues(lines: string[], filename: string, issues: ReviewIssue[]) {
    const sharedStatePatterns = [/let\s+[\w]+\s*=/, /var\s+[\w]+\s*=/, /this\./];
    const asyncPatterns = [/async/, /await/, /Promise\./, /setTimeout/, /setInterval/];

    let hasAsync = false;
    let hasSharedState = false;
    let problematicLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (asyncPatterns.some(p => p.test(line))) {
        hasAsync = true;
      }
      if (sharedStatePatterns.some(p => p.test(line))) {
        hasSharedState = true;
        problematicLine = i + 1;
      }
    }

    if (hasAsync && hasSharedState) {
      issues.push({
        id: uuidv4(),
        file: filename,
        line: problematicLine,
        severity: 'medium',
        type: 'logic',
        message: '异步代码中使用共享状态可能导致竞态条件',
        suggestion: '考虑使用锁机制或避免在异步操作中共享可变状态',
        codeSnippet: lines[problematicLine - 1],
      });
    }
  }

  private checkOffByOne(lines: string[], filename: string, issues: ReviewIssue[]) {
    const loopPatterns = [/for\s*\(/, /while\s*\(/];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (loopPatterns.some(p => p.test(line))) {
        if (line.includes('<=') && line.includes('.length')) {
          issues.push({
            id: uuidv4(),
            file: filename,
            line: i + 1,
            severity: 'high',
            type: 'logic',
            message: '潜在的数组越界风险',
            suggestion: '检查循环条件，数组索引应使用 < 而不是 <=',
            codeSnippet: line,
          });
        }
      }
    }
  }

  private checkArrayBounds(lines: string[], filename: string, issues: ReviewIssue[]) {
    const arrayDeclarations: Map<string, number> = new Map();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      const arrayMatch = line.match(/(int|float|double|char|String|var|let|const)\s+(\w+)\s*=\s*new\s+\w+\[(\d+)\]/);
      if (arrayMatch) {
        const varName = arrayMatch[2];
        const size = parseInt(arrayMatch[3]);
        arrayDeclarations.set(varName, size);
      }

      const cArrayMatch = line.match(/(int|float|double|char)\s+(\w+)\[(\d+)\]/);
      if (cArrayMatch) {
        const varName = cArrayMatch[2];
        const size = parseInt(cArrayMatch[3]);
        arrayDeclarations.set(varName, size);
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const [varName, size] of arrayDeclarations) {
        const indexPattern = new RegExp(`${varName}\\[\\s*(\\d+)\\s*\\]`);
        const match = line.match(indexPattern);
        
        if (match) {
          const index = parseInt(match[1]);
          if (index >= size) {
            issues.push({
              id: uuidv4(),
              file: filename,
              line: i + 1,
              severity: 'critical',
              type: 'logic',
              message: `数组越界访问：${varName} 的大小为 ${size}，但访问了索引 ${index}`,
              suggestion: `修改索引值使其小于数组大小 ${size}`,
              codeSnippet: line,
            });
          }
        }

        const sortPattern = new RegExp(`sort\\s*\\(\\s*${varName}(\\+\\d+)?\\s*,\\s*${varName}(\\+\\d+)?\\s*,\\s*(\\d+)\\s*\\)`);
        const sortMatch = line.match(sortPattern);
        
        if (sortMatch) {
          const sortSize = parseInt(sortMatch[3]);
          if (sortSize > size) {
            issues.push({
              id: uuidv4(),
              file: filename,
              line: i + 1,
              severity: 'critical',
              type: 'logic',
              message: `数组排序范围超过数组大小：${varName} 的大小为 ${size}，但排序了 ${sortSize} 个元素`,
              suggestion: `将排序大小从 ${sortSize} 修改为 ${size}`,
              codeSnippet: line,
            });
          }
        }

        const loopPattern = new RegExp(`for\\s*\\([^)]+;\\s*[^)]+\\s*(<|<=)\\s*(\\d+)\\s*;`);
        const loopMatch = line.match(loopPattern);
        
        if (loopMatch) {
          const compareOp = loopMatch[1];
          const loopEnd = parseInt(loopMatch[2]);
          const actualEnd = compareOp === '<=' ? loopEnd : loopEnd - 1;
          
          if (actualEnd >= size && line.includes(varName)) {
            issues.push({
              id: uuidv4(),
              file: filename,
              line: i + 1,
              severity: 'critical',
              type: 'logic',
              message: `循环范围超过数组边界：${varName} 的大小为 ${size}，但循环到了索引 ${actualEnd}`,
              suggestion: `修改循环条件，确保索引小于 ${size}`,
              codeSnippet: line,
            });
          }
        }
      }
    }
  }

  private async aiAnalyze(file: CodeFile): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];

    try {
      const prompt = `请分析以下代码，识别潜在的逻辑缺陷，包括但不限于：
1. 空指针异常
2. 数组越界
3. 类型错误
4. 条件逻辑错误
5. 未处理的异常
6. 资源泄漏

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
              type: 'logic',
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
          } else if (line.includes('ERROR') || line.includes('BUG') || line.includes('问题')) {
            issues.push({
              id: uuidv4(),
              file: file.filename,
              line: currentLine,
              severity: 'medium',
              type: 'logic',
              message: line.trim(),
              suggestion: '请检查此代码段',
            });
          }
        }
      }
    } catch (error) {
      console.error('AI分析逻辑缺陷失败:', error);
    }

    return issues;
  }
}