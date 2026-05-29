import { Gitlab } from '@gitbeaker/rest';
import { config } from '../config';
import { CodeFile, WebhookPayload } from '../types';
import { detectLanguage } from '../utils/codeParser';

const gitlab = new Gitlab({
  token: config.gitlab.token,
}) as any;

export async function fetchMRFiles(projectId: string | number, mrIid: number): Promise<CodeFile[]> {
  const files: CodeFile[] = [];
  
  try {
    const changes = await gitlab.MergeRequests.changes(projectId, mrIid);
    
    if (!changes || !Array.isArray(changes.changes)) {
      console.warn('GitLab API 返回的 changes 数据格式不正确');
      return files;
    }

    for (const change of changes.changes) {
      const changeObj = change as Record<string, any>;
      if (changeObj.new_path && changeObj.diff && typeof changeObj.new_path === 'string') {
        files.push({
          filename: changeObj.new_path,
          content: changeObj.diff,
          language: detectLanguage(changeObj.new_path),
        });
      }
    }
  } catch (error) {
    console.error('获取MR文件失败:', error);
  }

  return files;
}

export async function createMRComment(projectId: string | number, mrIid: number, comment: string): Promise<void> {
  try {
    await gitlab.MergeRequests.createNote(projectId, mrIid, { body: comment });
  } catch (error) {
    console.error('创建MR评论失败:', error);
    throw error;
  }
}

export function parseGitLabWebhook(payload: any): WebhookPayload | null {
  if (!payload.merge_request || !payload.object_attributes) {
    return null;
  }

  return {
    event: 'pull_request',
    action: payload.object_attributes.action as 'opened' | 'synchronize' | 'reopened',
    repository: {
      name: payload.project.name,
      fullName: payload.project.path_with_namespace,
      url: payload.project.web_url,
    },
    pullRequest: {
      id: payload.merge_request.id.toString(),
      number: payload.merge_request.iid,
      title: payload.merge_request.title,
      body: payload.merge_request.description || '',
      head: {
        ref: payload.merge_request.source_branch,
        sha: payload.merge_request.last_commit.id,
      },
      base: {
        ref: payload.merge_request.target_branch,
        sha: payload.merge_request.target_branch_sha,
      },
      user: {
        login: payload.user.username,
      },
    },
  };
}