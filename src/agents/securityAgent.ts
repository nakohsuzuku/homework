import { CodeFile, ReviewIssue } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface SecurityIssue {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}

export class SecurityAgent {
  private securityPatterns: Array<{
    pattern: RegExp;
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    suggestion: string;
  }> = [
    // SQL 注入 - 严重
    {
      pattern: /(SELECT|INSERT|UPDATE|DELETE|DROP).*\+.*\w+/i,
      type: 'sql-injection',
      severity: 'critical',
      message: '潜在的 SQL 注入风险',
      suggestion: '使用参数化查询或预处理语句，避免字符串拼接 SQL',
    },
    {
      pattern: /execute\s*\(\s*["'`].*\+|query\s*\(\s*["'`].*\+/i,
      type: 'sql-injection',
      severity: 'critical',
      message: 'SQL 注入风险 - 字符串拼接 SQL 查询',
      suggestion: '使用 ORM 或参数化查询',
    },
    
    // 命令注入 - 严重
    {
      pattern: /exec\s*\(\s*["'`].*\+|execSync\s*\(\s*["'`].*\+/i,
      type: 'command-injection',
      severity: 'critical',
      message: '命令注入风险 - 用户输入直接传递给系统命令',
      suggestion: '避免使用用户输入构建命令，使用白名单验证',
    },
    {
      pattern: /spawn\s*\(\s*["'`].*\+|spawnSync\s*\(\s*["'`].*\+/i,
      type: 'command-injection',
      severity: 'critical',
      message: '命令注入风险',
      suggestion: '不要将用户输入传递给 spawn 函数',
    },
    
    // eval 危险函数 - 高优先级
    {
      pattern: /\beval\s*\(/i,
      type: 'dangerous-eval',
      severity: 'high',
      message: '使用 eval() 函数存在安全风险',
      suggestion: '避免使用 eval()，使用 JSON.parse() 或其他安全方法替代',
    },
    {
      pattern: /new\s+Function\s*\(/i,
      type: 'dangerous-function',
      severity: 'high',
      message: '使用 Function 构造函数存在安全风险',
      suggestion: '避免动态创建函数，使用静态代码',
    },
    
    // 路径遍历 - 高优先级
    {
      pattern: /readFileSync\s*\([^)]*\+|readFile\s*\([^)]*\+/i,
      type: 'path-traversal',
      severity: 'high',
      message: '潜在的路径遍历风险',
      suggestion: '验证文件路径，使用 path.basename() 限制访问范围',
    },
    {
      pattern: /createReadStream\s*\([^)]*\+|createWriteStream\s*\([^)]*\+/i,
      type: 'path-traversal',
      severity: 'high',
      message: '文件操作存在路径遍历风险',
      suggestion: '验证并规范化文件路径',
    },
    
    // 硬编码密码/密钥 - 严重
    {
      pattern: /password\s*[=:]\s*["'][^"']{4,}["']/i,
      type: 'hardcoded-password',
      severity: 'critical',
      message: '硬编码密码',
      suggestion: '使用环境变量或密钥管理服务存储密码',
    },
    {
      pattern: /apiKey\s*[=:]\s*["'][^"']{8,}["']/i,
      type: 'hardcoded-apikey',
      severity: 'critical',
      message: '硬编码 API 密钥',
      suggestion: '使用环境变量存储 API 密钥',
    },
    {
      pattern: /secret\s*[=:]\s*["'][^"']{8,}["']/i,
      type: 'hardcoded-secret',
      severity: 'critical',
      message: '硬编码密钥',
      suggestion: '使用环境变量或密钥管理服务',
    },
    
    // SSRF 漏洞 - 高优先级
    {
      pattern: /http\.get\s*\([^)]*\+|https\.get\s*\([^)]*\+/i,
      type: 'ssrf',
      severity: 'high',
      message: '潜在的 SSRF 风险 - 用户控制的 URL',
      suggestion: '验证 URL，限制可访问的内部网络',
    },
    {
      pattern: /axios\s*\([^)]*\+|fetch\s*\([^)]*\+/i,
      type: 'ssrf',
      severity: 'high',
      message: 'HTTP 请求存在 SSRF 风险',
      suggestion: '验证并限制可请求的 URL',
    },
    
    // 不安全的随机数 - 中等
    {
      pattern: /Math\.random\s*\(\)/i,
      type: 'insecure-random',
      severity: 'medium',
      message: '使用 Math.random() 生成安全令牌不安全',
      suggestion: '使用 crypto.randomBytes() 生成安全的随机数',
    },
    
    // 敏感信息泄露 - 中等
    {
      pattern: /console\.(log|error|warn)\s*\([^)]*err\.stack/i,
      type: 'info-leak',
      severity: 'medium',
      message: '可能泄露敏感信息的堆栈跟踪',
      suggestion: '在生产环境中不要输出堆栈信息',
    },
    {
      pattern: /res\.json\s*\(\s*{[^}]*error/i,
      type: 'info-leak',
      severity: 'medium',
      message: '可能泄露敏感错误信息',
      suggestion: '返回通用错误消息，记录详细错误到日志',
    },
    
    // XSS 风险 - 高优先级
    {
      pattern: /innerHTML\s*=/i,
      type: 'xss',
      severity: 'high',
      message: '使用 innerHTML 可能导致 XSS 攻击',
      suggestion: '使用 textContent 或安全的 DOM 操作方法',
    },
    {
      pattern: /document\.write\s*\(/i,
      type: 'xss',
      severity: 'high',
      message: '使用 document.write() 可能导致 XSS 攻击',
      suggestion: '使用安全的 DOM 操作方法',
    },
    
    // 不安全的 CORS 配置 - 低优先级
    {
      pattern: /origin\s*:\s*['"]\*['"]/i,
      type: 'insecure-cors',
      severity: 'low',
      message: 'CORS 配置允许所有来源',
      suggestion: '限制允许的来源列表',
    },
  ];

  async analyze(files: CodeFile[]): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];

    for (const file of files) {
      const fileIssues = this.analyzeFile(file);
      issues.push(...fileIssues);
    }

    return issues;
  }

  private analyzeFile(file: CodeFile): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const lines = file.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of this.securityPatterns) {
        if (pattern.pattern.test(line)) {
          issues.push({
            id: uuidv4(),
            file: file.filename,
            line: i + 1,
            severity: pattern.severity,
            type: 'security',
            message: pattern.message,
            suggestion: pattern.suggestion,
            codeSnippet: line.trim(),
          });
        }
      }
    }

    return issues;
  }
}
