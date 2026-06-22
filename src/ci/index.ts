import { Octokit } from 'octokit';
import { ReviewService } from '../services/reviewService';
import { CodeFile } from '../types';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const reviewService = new ReviewService();

export async function runCI() {
  const prNumber = process.env.PR_NUMBER;
  const repo = process.env.REPOSITORY;
  
  if (!prNumber || !repo) {
    console.error('缺少必要的环境变量: PR_NUMBER 或 REPOSITORY');
    process.exit(1);
  }

  const [owner, repoName] = repo.split('/');

  try {
    console.log(`🔍 开始审查 PR #${prNumber}`);

    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo: repoName,
      pull_number: parseInt(prNumber),
    });

    if (files.length === 0) {
      console.log('📭 没有可审查的文件');
      return;
    }

    const codeFiles: CodeFile[] = files
      .filter(file => !file.filename.match(/\.(md|json|yml|yaml|txt)$/i))
      .map(file => ({
        filename: file.filename,
        content: file.patch || '',
        language: file.filename.split('.').pop() || 'txt',
      }));

    const report = await reviewService.performReview(prNumber, repo, codeFiles);

    let comment = `🤖 智能代码审查助手\n\n`;
    comment += `## 审查报告\n\n`;
    
    const criticalIssues = report.issues.filter(i => i.severity === 'critical');
    const highIssues = report.issues.filter(i => i.severity === 'high');
    const mediumIssues = report.issues.filter(i => i.severity === 'medium');
    const lowIssues = report.issues.filter(i => i.severity === 'low');

    if (criticalIssues.length > 0) {
      comment += `### 🔴 严重问题 (${criticalIssues.length})\n`;
      comment += criticalIssues.map((issue, index) => 
        `${index + 1}. **${issue.file}:${issue.line}** - ${issue.message}\n` +
        `   > ${issue.suggestion}\n`
      ).join('\n');
      comment += '\n';
    }

    if (highIssues.length > 0) {
      comment += `### 🟠 高优先级 (${highIssues.length})\n`;
      comment += highIssues.map((issue, index) => 
        `${index + 1}. **${issue.file}:${issue.line}** - ${issue.message}\n`
      ).join('\n');
      comment += '\n';
    }

    if (mediumIssues.length > 0) {
      comment += `### 🟡 中等问题 (${mediumIssues.length})\n`;
      comment += mediumIssues.map((issue, index) => 
        `${index + 1}. **${issue.file}:${issue.line}** - ${issue.message}\n`
      ).join('\n');
      comment += '\n';
    }

    if (lowIssues.length > 0) {
      comment += `### 🟢 建议改进 (${lowIssues.length})\n`;
      comment += lowIssues.map((issue, index) => 
        `${index + 1}. **${issue.file}:${issue.line}** - ${issue.message}\n`
      ).join('\n');
      comment += '\n';
    }

    if (report.issues.length === 0) {
      comment += `### ✅ 代码质量良好\n\n没有发现问题！`;
    }

    comment += `\n---\n✅ 审查完成 | 共发现 ${report.issues.length} 个问题`;

    await octokit.rest.issues.createComment({
      owner,
      repo: repoName,
      issue_number: parseInt(prNumber),
      body: comment,
    });

    console.log(`✅ 审查完成！已发布评论到 PR #${prNumber}`);

    if (criticalIssues.length > 0 || highIssues.length > 0) {
      console.log(`❌ 发现 ${criticalIssues.length} 个严重问题和 ${highIssues.length} 个高优先级问题，CI失败`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ 代码审查失败:', error);
    process.exit(1);
  }
}