import { Octokit } from 'octokit';
import { config } from '../config';
import { CodeFile, WebhookPayload } from '../types';
import { detectLanguage } from '../utils/codeParser';

const octokit = new Octokit({
  auth: config.github.token,
});

export async function fetchPRFiles(owner: string, repo: string, prNumber: number): Promise<CodeFile[]> {
  const files: CodeFile[] = [];
  
  try {
    const response = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    for (const file of response.data) {
      if (file.filename && file.status !== 'removed') {
        let content = '';
        
        if (file.patch) {
          content = file.patch;
        } else if (file.sha) {
          try {
            const contentResponse = await octokit.rest.git.getBlob({
              owner,
              repo,
              file_sha: file.sha,
            });
            
            if (contentResponse.data.content) {
              content = Buffer.from(contentResponse.data.content, 'base64').toString('utf-8');
            }
          } catch {
            continue;
          }
        }

        if (content) {
          files.push({
            filename: file.filename,
            content,
            language: detectLanguage(file.filename),
          });
        }
      }
    }
  } catch (error) {
    console.error('获取PR文件失败:', error);
  }

  return files;
}

export async function createPRComment(owner: string, repo: string, prNumber: number, comment: string): Promise<void> {
  try {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: comment,
    });
  } catch (error) {
    console.error('创建PR评论失败:', error);
    throw error;
  }
}

export function parseGitHubWebhook(payload: any): WebhookPayload | null {
  if (!payload.pull_request) {
    return null;
  }

  return {
    event: 'pull_request',
    action: payload.action as 'opened' | 'synchronize' | 'reopened',
    repository: {
      name: payload.repository.name,
      fullName: payload.repository.full_name,
      url: payload.repository.html_url,
    },
    pullRequest: {
      id: payload.pull_request.id.toString(),
      number: payload.pull_request.number,
      title: payload.pull_request.title,
      body: payload.pull_request.body || '',
      head: {
        ref: payload.pull_request.head.ref,
        sha: payload.pull_request.head.sha,
      },
      base: {
        ref: payload.pull_request.base.ref,
        sha: payload.pull_request.base.sha,
      },
      user: {
        login: payload.pull_request.user.login,
      },
    },
  };
}

export function extractRepoInfo(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split('/');
  return { owner, repo };
}