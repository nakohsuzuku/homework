export interface CodeFile {
  filename: string;
  content: string;
  language: string;
}

export interface ReviewIssue {
  id: string;
  file: string;
  line: number;
  column?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'style' | 'logic' | 'performance' | 'readability' | 'security';
  message: string;
  suggestion: string;
  codeSnippet?: string;
}

export interface RefactorSuggestion {
  file: string;
  originalCode: string;
  refactoredCode: string;
  diff: string;
  explanation: string;
}

export interface ReviewReport {
  id: string;
  prId: string;
  repository: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  issues: ReviewIssue[];
  refactorSuggestions: RefactorSuggestion[];
  summary: string;
}

export interface PRInfo {
  id: string;
  title: string;
  description: string;
  baseBranch: string;
  headBranch: string;
  author: string;
  createdAt: Date;
  files: CodeFile[];
}

export interface StyleConfig {
  namingConvention: 'camelCase' | 'snake_case' | 'PascalCase' | 'kebab-case';
  indentation: 'spaces' | 'tabs';
  indentSize: number;
  maxLineLength: number;
  requireComments: boolean;
  customRules: Record<string, string>;
}

export interface AgentResult {
  issues: ReviewIssue[];
  suggestions?: RefactorSuggestion[];
}

export interface WebhookPayload {
  event: 'pull_request' | 'push';
  action: 'opened' | 'synchronize' | 'reopened';
  repository: {
    name: string;
    fullName: string;
    url: string;
  };
  pullRequest: {
    id: string;
    number: number;
    title: string;
    body: string;
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
      sha: string;
    };
    user: {
      login: string;
    };
  };
}