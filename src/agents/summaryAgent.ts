import { ReviewIssue, RefactorSuggestion, ReviewReport } from '../types';
import { severityLabels, issueTypeLabels } from '../config';
import { summarizeIssues } from '../utils/openaiClient';

export class SummaryAgent {
  async generateReport(
    prId: string,
    repository: string,
    issues: ReviewIssue[],
    refactorSuggestions: RefactorSuggestion[]
  ): Promise<ReviewReport> {
    const sortedIssues = this.sortBySeverity(issues);
    const summary = await this.generateSummary(sortedIssues, refactorSuggestions);

    return {
      id: `report-${Date.now()}`,
      prId,
      repository,
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date(),
      issues: sortedIssues,
      refactorSuggestions,
      summary,
    };
  }

  private sortBySeverity(issues: ReviewIssue[]): ReviewIssue[] {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    return [...issues].sort((a, b) => {
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.line - b.line;
    });
  }

  private async generateSummary(issues: ReviewIssue[], suggestions: RefactorSuggestion[]): Promise<string> {
    const issueStats = this.calculateStats(issues);
    
    let summary = `## 📊 代码审查报告\n\n`;
    summary += `### 总体统计\n`;
    summary += `- 🔴 Critical: ${issueStats.critical}\n`;
    summary += `- 🟠 High: ${issueStats.high}\n`;
    summary += `- 🟡 Medium: ${issueStats.medium}\n`;
    summary += `- 🟢 Low: ${issueStats.low}\n`;
    summary += `- 📝 总计: ${issues.length} 个问题\n`;

    if (suggestions.length > 0) {
      summary += `\n### 🔧 重构建议\n`;
      summary += `发现 ${suggestions.length} 个可重构的函数\n`;
    }

    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      summary += `\n### 🔴 严重问题\n`;
      for (const issue of criticalIssues) {
        summary += `**${issue.file}:${issue.line}** - ${issue.message}\n`;
        summary += `> ${issue.suggestion}\n\n`;
      }
    }

    const highIssues = issues.filter(i => i.severity === 'high');
    if (highIssues.length > 0) {
      summary += `\n### 🟠 重要问题\n`;
      for (const issue of highIssues.slice(0, 5)) {
        summary += `**${issue.file}:${issue.line}** - ${issue.message}\n`;
        summary += `> ${issue.suggestion}\n\n`;
      }
      if (highIssues.length > 5) {
        summary += `... 还有 ${highIssues.length - 5} 个重要问题\n`;
      }
    }

    try {
      const aiSummary = await summarizeIssues(issues.map(i => 
        `${i.file}:${i.line} [${issueTypeLabels[i.type]}] ${severityLabels[i.severity]}: ${i.message}`
      ));
      
      if (aiSummary) {
        summary += `\n---\n\n### 🤖 AI 分析总结\n\n${aiSummary}\n`;
      }
    } catch (error) {
      console.error('AI总结生成失败:', error);
    }

    summary += `\n---\n\n*报告生成时间: ${new Date().toLocaleString()}*`;

    return summary;
  }

  private calculateStats(issues: ReviewIssue[]): Record<string, number> {
    const stats: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const issue of issues) {
      stats[issue.severity]++;
    }

    return stats;
  }

  generatePRComment(report: ReviewReport): string {
    let comment = `## 🤖 智能代码审查结果\n\n`;
    
    if (report.issues.length === 0) {
      comment += `🎉 **代码质量优秀！** 未发现明显问题。\n`;
    } else {
      comment += `### ⚠️ 发现问题\n\n`;
      
      const groupedBySeverity = this.groupBySeverity(report.issues);
      
      for (const severity of ['critical', 'high', 'medium', 'low'] as const) {
        const issues = groupedBySeverity[severity];
        if (issues && issues.length > 0) {
          comment += `#### ${severityLabels[severity]} (${issues.length})\n\n`;
          for (const issue of issues.slice(0, 3)) {
            comment += `- \`${issue.file}:${issue.line}\`: ${issue.message}\n`;
          }
          if (issues.length > 3) {
            comment += `- ... 还有 ${issues.length - 3} 个问题\n`;
          }
          comment += `\n`;
        }
      }
      
      if (report.refactorSuggestions.length > 0) {
        comment += `### 🔧 重构建议\n\n`;
        comment += `发现 ${report.refactorSuggestions.length} 个函数建议重构\n`;
        comment += `查看完整报告获取详细的重构方案\n`;
      }
    }
    
    comment += `\n---\n`;
    comment += `📋 [查看完整报告](${report.id})\n`;
    
    return comment;
  }

  private groupBySeverity(issues: ReviewIssue[]): Record<string, ReviewIssue[]> {
    return issues.reduce((acc, issue) => {
      if (!acc[issue.severity]) {
        acc[issue.severity] = [];
      }
      acc[issue.severity].push(issue);
      return acc;
    }, {} as Record<string, ReviewIssue[]>);
  }
}