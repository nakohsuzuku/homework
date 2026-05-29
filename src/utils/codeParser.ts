import * as diff from 'diff';
import { CodeFile, ReviewIssue, RefactorSuggestion } from '../types';

export function parseCode(language: string, content: string): {
  functions: Array<{ name: string; startLine: number; endLine: number; content: string }>;
  variables: Array<{ name: string; line: number; type?: string }>;
  classes: Array<{ name: string; startLine: number; endLine: number }>;
} {
  const functions: Array<{ name: string; startLine: number; endLine: number; content: string }> = [];
  const variables: Array<{ name: string; line: number; type?: string }> = [];
  const classes: Array<{ name: string; startLine: number; endLine: number }> = [];
  
  const lines = content.split('\n');
  
  let currentFunction: { name: string; startLine: number; endLine: number; content: string } | null = null;
  let braceDepth = 0;
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    if (currentFunction) {
      currentFunction.content += line + '\n';
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      braceDepth += openBraces - closeBraces;
      
      if (braceDepth === 0) {
        currentFunction.endLine = lineNumber;
        functions.push(currentFunction);
        currentFunction = null;
      }
      return;
    }
    
    const funcMatch = line.match(/(?:function\s+|=>\s*|async\s+function\s+|const\s+(\w+)\s*=\s*async?\s*\(|\(\s*\)\s*=>\s*\{)/);
    if (funcMatch) {
      const funcName = funcMatch[1] || `anonymous_${lineNumber}`;
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      braceDepth = openBraces - closeBraces;
      
      if (braceDepth === 0 && line.includes('=>')) {
        functions.push({ name: funcName, startLine: lineNumber, endLine: lineNumber, content: line + '\n' });
      } else {
        currentFunction = { name: funcName, startLine: lineNumber, endLine: lineNumber, content: line + '\n' };
      }
    }
    
    const classMatch = line.match(/class\s+(\w+)/);
    if (classMatch) {
      classes.push({ name: classMatch[1], startLine: lineNumber, endLine: lineNumber });
    }
    
    const varMatch = line.match(/(?:const|let|var)\s+(\w+)(?::\s*(\w+))?/);
    if (varMatch) {
      variables.push({ name: varMatch[1], line: lineNumber, type: varMatch[2] });
    }
  });
  
  return { functions, variables, classes };
}

export function generateDiff(original: string, refactored: string): string {
  const result = diff.createPatch('temp.ts', original, refactored);
  return result;
}

export function extractCodeSnippet(content: string, line: number, contextLines: number = 3): string {
  const lines = content.split('\n');
  const start = Math.max(0, line - 1 - contextLines);
  const end = Math.min(lines.length, line + contextLines);
  return lines.slice(start, end).join('\n');
}

export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    swift: 'swift',
    kt: 'kotlin',
  };
  return languageMap[ext || ''] || 'text';
}

export function validateNaming(name: string, convention: string): boolean {
  const patterns: Record<string, RegExp> = {
    camelCase: /^[a-z][a-zA-Z0-9]*$/,
    snake_case: /^[a-z][a-z0-9_]*$/,
    PascalCase: /^[A-Z][a-zA-Z0-9]*$/,
    'kebab-case': /^[a-z][a-z0-9-]*$/,
  };
  const pattern = patterns[convention];
  return pattern ? pattern.test(name) : true;
}

export function checkIndentation(line: string, expectedSize: number, useSpaces: boolean): boolean {
  const leadingWhitespace = line.match(/^\s*/)?.[0] || '';
  if (useSpaces) {
    return leadingWhitespace.length % expectedSize === 0;
  }
  return !leadingWhitespace.includes(' ');
}