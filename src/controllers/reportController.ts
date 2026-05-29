import { Request, Response } from 'express';
import { ReviewService } from '../services/reviewService';
import { CodeFile, ReviewReport, ReviewIssue } from '../types';

const reviewService = new ReviewService();

const reports: Map<string, ReviewReport> = new Map();

export async function analyzeCode(req: Request, res: Response) {
  try {
    const { code, filename }: { code: string; filename: string } = req.body;

    if (!code || !filename) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const files: CodeFile[] = [{
      filename: filename,
      content: code,
      language: filename.split('.').pop() || 'txt'
    }];

    const report = await reviewService.performReview('manual', 'manual-review', files);
    
    const stats = {
      critical: report.issues.filter(i => i.severity === 'critical').length,
      high: report.issues.filter(i => i.severity === 'high').length,
      medium: report.issues.filter(i => i.severity === 'medium').length,
      low: report.issues.filter(i => i.severity === 'low').length,
    };

    res.status(200).json({
      issues: report.issues,
      stats,
      summary: report.summary,
    });
  } catch (error) {
    console.error('代码分析失败:', error);
    res.status(500).json({ error: '分析失败' });
  }
}

export async function createReview(req: Request, res: Response) {
  try {
    const { prId, repository, files }: { prId: string; repository: string; files: CodeFile[] } = req.body;

    if (!prId || !repository || !files || files.length === 0) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const report = await reviewService.performReview(prId, repository, files);
    reports.set(report.id, report);

    res.status(200).json(report);
  } catch (error) {
    console.error('创建审查报告失败:', error);
    res.status(500).json({ error: '创建报告失败' });
  }
}

export function getReport(req: Request, res: Response) {
  const { id } = req.params;
  const report = reports.get(id);

  if (!report) {
    return res.status(404).json({ error: '报告不存在' });
  }

  res.status(200).json(report);
}

export function listReports(req: Request, res: Response) {
  const allReports = Array.from(reports.values());
  
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  const start = (page - 1) * limit;
  const end = start + limit;
  
  const paginatedReports = allReports.slice(start, end);

  res.status(200).json({
    data: paginatedReports,
    total: allReports.length,
    page,
    limit,
  });
}

export function deleteReport(req: Request, res: Response) {
  const { id } = req.params;
  
  if (!reports.has(id)) {
    return res.status(404).json({ error: '报告不存在' });
  }

  reports.delete(id);
  res.status(200).json({ message: '报告已删除' });
}