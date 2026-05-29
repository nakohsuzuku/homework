import { Request, Response } from 'express';
import { ReviewService } from '../services/reviewService';
import { CodeFile, ReviewReport } from '../types';

const reviewService = new ReviewService();

const reports: Map<string, ReviewReport> = new Map();

export async function analyzeCode(req: Request, res: Response) {
  try {
    const { files, prId, repository }: { files: CodeFile[]; prId?: string; repository?: string } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: '缺少代码文件' });
    }

    const report = await reviewService.performReview(
      prId || `manual-${Date.now()}`,
      repository || 'local',
      files
    );
    
    reports.set(report.id, report);

    res.status(200).json({
      success: true,
      data: {
        reportId: report.id,
        issues: report.issues,
        refactorSuggestions: report.refactorSuggestions,
        summary: report.summary,
        statistics: {
          total: report.issues.length,
          critical: report.issues.filter(i => i.severity === 'critical').length,
          high: report.issues.filter(i => i.severity === 'high').length,
          medium: report.issues.filter(i => i.severity === 'medium').length,
          low: report.issues.filter(i => i.severity === 'low').length,
        },
      },
    });
  } catch (error) {
    console.error('Dify分析失败:', error);
    res.status(500).json({
      success: false,
      error: '分析失败',
    });
  }
}

export async function getAnalysisResult(req: Request, res: Response) {
  const { reportId } = req.params;
  const report = reports.get(reportId);

  if (!report) {
    return res.status(404).json({
      success: false,
      error: '报告不存在',
    });
  }

  res.status(200).json({
    success: true,
    data: {
      reportId: report.id,
      prId: report.prId,
      repository: report.repository,
      status: report.status,
      issues: report.issues,
      refactorSuggestions: report.refactorSuggestions,
      summary: report.summary,
      createdAt: report.createdAt,
      completedAt: report.completedAt,
    },
  });
}

export function listAnalysisResults(req: Request, res: Response) {
  const allReports = Array.from(reports.values()).reverse();
  
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  const start = (page - 1) * limit;
  const end = start + limit;
  
  const paginatedReports = allReports.slice(start, end);

  res.status(200).json({
    success: true,
    data: paginatedReports.map(r => ({
      reportId: r.id,
      prId: r.prId,
      repository: r.repository,
      status: r.status,
      issuesCount: r.issues.length,
      createdAt: r.createdAt,
    })),
    pagination: {
      total: allReports.length,
      page,
      limit,
      totalPages: Math.ceil(allReports.length / limit),
    },
  });
}