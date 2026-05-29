import { Request, Response } from 'express';
import { parseGitHubWebhook } from '../services/githubService';
import { parseGitLabWebhook } from '../services/gitlabService';
import { ReviewService } from '../services/reviewService';

const reviewService = new ReviewService();

export async function handleGitHubWebhook(req: Request, res: Response) {
  try {
    if (req.body.zen) {
      return res.status(200).json({ status: 'pong' });
    }

    const payload = parseGitHubWebhook(req.body);
    
    if (!payload) {
      return res.status(400).json({ error: '无效的Webhook payload' });
    }

    if (payload.action !== 'opened' && payload.action !== 'synchronize') {
      return res.status(200).json({ status: 'ignored', reason: '不处理此事件类型' });
    }

    console.log(`收到GitHub PR事件: ${payload.repository.fullName} #${payload.pullRequest.number}`);

    const report = await reviewService.processGitHubWebhook(payload);
    
    if (report) {
      res.status(200).json({ 
        status: 'success', 
        reportId: report.id,
        issuesCount: report.issues.length 
      });
    } else {
      res.status(200).json({ status: 'completed', message: '没有可审查的文件' });
    }
  } catch (error) {
    console.error('处理GitHub Webhook失败:', error);
    res.status(500).json({ error: '处理失败' });
  }
}

export async function handleGitLabWebhook(req: Request, res: Response) {
  try {
    const payload = parseGitLabWebhook(req.body);
    
    if (!payload) {
      return res.status(400).json({ error: '无效的Webhook payload' });
    }

    console.log(`收到GitLab MR事件: ${payload.repository.fullName} #${payload.pullRequest.number}`);

    const report = await reviewService.processGitLabWebhook(payload);
    
    if (report) {
      res.status(200).json({ 
        status: 'success', 
        reportId: report.id,
        issuesCount: report.issues.length 
      });
    } else {
      res.status(200).json({ status: 'completed', message: '没有可审查的文件' });
    }
  } catch (error) {
    console.error('处理GitLab Webhook失败:', error);
    res.status(500).json({ error: '处理失败' });
  }
}