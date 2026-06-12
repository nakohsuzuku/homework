import { CodeFile, ReviewIssue, RefactorSuggestion, ReviewReport, WebhookPayload } from '../types';
import { StyleAgent, LogicAgent, PerformanceAgent, ReadabilityAgent, SummaryAgent, SecurityAgent } from '../agents';
import { fetchPRFiles, createPRComment, extractRepoInfo } from './githubService';
import { fetchMRFiles, createMRComment } from './gitlabService';

export class ReviewService {
  private styleAgent: StyleAgent;
  private logicAgent: LogicAgent;
  private performanceAgent: PerformanceAgent;
  private readabilityAgent: ReadabilityAgent;
  private summaryAgent: SummaryAgent;
  private securityAgent: SecurityAgent;

  constructor() {
    this.styleAgent = new StyleAgent();
    this.logicAgent = new LogicAgent();
    this.performanceAgent = new PerformanceAgent();
    this.readabilityAgent = new ReadabilityAgent();
    this.summaryAgent = new SummaryAgent();
    this.securityAgent = new SecurityAgent();
  }

  async processGitHubWebhook(payload: WebhookPayload): Promise<ReviewReport | null> {
    try {
      const { owner, repo } = extractRepoInfo(payload.repository.fullName);
      const prNumber = payload.pullRequest.number;

      const files = await fetchPRFiles(owner, repo, prNumber);
      
      if (files.length === 0) {
        console.log('没有找到PR文件');
        return null;
      }

      const report = await this.performReview(payload.pullRequest.id, payload.repository.fullName, files);
      
      const comment = this.summaryAgent.generatePRComment(report);
      await createPRComment(owner, repo, prNumber, comment);

      return report;
    } catch (error) {
      console.error('处理GitHub Webhook失败:', error);
      return null;
    }
  }

  async processGitLabWebhook(payload: WebhookPayload): Promise<ReviewReport | null> {
    try {
      const projectId = payload.repository.fullName;
      const mrIid = payload.pullRequest.number;

      const files = await fetchMRFiles(projectId, mrIid);
      
      if (files.length === 0) {
        console.log('没有找到MR文件');
        return null;
      }

      const report = await this.performReview(payload.pullRequest.id, payload.repository.fullName, files);
      
      const comment = this.summaryAgent.generatePRComment(report);
      await createMRComment(projectId, mrIid, comment);

      return report;
    } catch (error) {
      console.error('处理GitLab Webhook失败:', error);
      return null;
    }
  }

  async performReview(prId: string, repository: string, files: CodeFile[]): Promise<ReviewReport> {
    console.log(`开始审查: ${repository} PR#${prId}`);
    
    const allIssues: ReviewIssue[] = [];
    const allSuggestions: RefactorSuggestion[] = [];

    const styleIssues = await this.styleAgent.analyze(files);
    allIssues.push(...styleIssues);
    console.log(`代码风格检查完成: ${styleIssues.length} 个问题`);

    const logicIssues = await this.logicAgent.analyze(files);
    allIssues.push(...logicIssues);
    console.log(`逻辑缺陷检测完成: ${logicIssues.length} 个问题`);

    const performanceIssues = await this.performanceAgent.analyze(files);
    allIssues.push(...performanceIssues);
    console.log(`性能优化检查完成: ${performanceIssues.length} 个问题`);

    const { issues: readabilityIssues, suggestions } = await this.readabilityAgent.analyze(files);
    allIssues.push(...readabilityIssues);
    allSuggestions.push(...suggestions);
    console.log(`可读性检查完成：${readabilityIssues.length} 个问题，${suggestions.length} 个重构建议`);

    const securityIssues = await this.securityAgent.analyze(files);
    allIssues.push(...securityIssues);
    console.log(`安全漏洞检测完成：${securityIssues.length} 个问题`);

    const report = await this.summaryAgent.generateReport(prId, repository, allIssues, allSuggestions);
    
    console.log(`审查完成: 共 ${allIssues.length} 个问题`);
    
    return report;
  }
}