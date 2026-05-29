import { v4 as uuidv4 } from 'uuid';
import { CodeFile, ReviewIssue, StyleConfig } from '../types';
import { parseCode, validateNaming, checkIndentation, detectLanguage } from '../utils/codeParser';
import { defaultStyleConfig } from '../config';

export class StyleAgent {
  private config: StyleConfig;

  constructor(config?: Partial<StyleConfig>) {
    this.config = { ...defaultStyleConfig, ...config };
  }

  async analyze(files: CodeFile[]): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];

    for (const file of files) {
      issues.push(...this.checkFile(file));
    }

    return issues;
  }

  private checkFile(file: CodeFile): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const lines = file.content.split('\n');
    const parsed = parseCode(file.language, file.content);

    this.checkNamingConvention(parsed.functions, file.filename, issues);
    this.checkNamingConvention(parsed.variables, file.filename, issues);
    this.checkNamingConvention(parsed.classes, file.filename, issues);

    this.checkIndentation(lines, file.filename, issues);
    this.checkLineLength(lines, file.filename, issues);
    this.checkComments(file, parsed.functions, issues);

    return issues;
  }

  private checkNamingConvention(
    items: Array<{ name: string; line?: number }>,
    filename: string,
    issues: ReviewIssue[]
  ) {
    for (const item of items) {
      if (!validateNaming(item.name, this.config.namingConvention)) {
        issues.push({
          id: uuidv4(),
          file: filename,
          line: item.line || 1,
          severity: 'low',
          type: 'style',
          message: `命名不符合${this.config.namingConvention}规范`,
          suggestion: `将 "${item.name}" 重命名为符合${this.config.namingConvention}规范的名称`,
          codeSnippet: item.name,
        });
      }
    }
  }

  private checkIndentation(lines: string[], filename: string, issues: ReviewIssue[]) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!checkIndentation(line, this.config.indentSize, this.config.indentation === 'spaces')) {
        issues.push({
          id: uuidv4(),
          file: filename,
          line: i + 1,
          severity: 'low',
          type: 'style',
          message: '缩进不符合规范',
          suggestion: `使用${this.config.indentation === 'spaces' ? this.config.indentSize + '个空格' : '制表符'}进行缩进`,
          codeSnippet: line,
        });
      }
    }
  }

  private checkLineLength(lines: string[], filename: string, issues: ReviewIssue[]) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > this.config.maxLineLength) {
        issues.push({
          id: uuidv4(),
          file: filename,
          line: i + 1,
          severity: 'low',
          type: 'style',
          message: `行长度超过${this.config.maxLineLength}字符`,
          suggestion: '将过长的行拆分为多行',
          codeSnippet: lines[i].slice(0, 50) + '...',
        });
      }
    }
  }

  private checkComments(file: CodeFile, functions: Array<{ name: string; startLine: number; content: string }>, issues: ReviewIssue[]) {
    if (!this.config.requireComments) return;

    for (const func of functions) {
      const firstLine = func.content.split('\n')[0];
      if (!firstLine.includes('/**') && !firstLine.includes('//') && !firstLine.includes('#')) {
        issues.push({
          id: uuidv4(),
          file: file.filename,
          line: func.startLine,
          severity: 'low',
          type: 'style',
          message: `函数 "${func.name}" 缺少注释`,
          suggestion: '添加函数说明注释',
          codeSnippet: firstLine,
        });
      }
    }
  }
}