import { Octokit } from 'octokit';
import { prisma } from "./prisma";

export interface VCSClient {
  fetchFile(path: string, ref?: string): Promise<string | null>;
  writeFile(path: string, content: string, message: string, ref?: string): Promise<void>;
  listContents(path: string, ref?: string, recursive?: boolean): Promise<any[]>;
  postComment(type: 'issue' | 'pull_request' | 'merge_request', id: string | number, body: string): Promise<void>;
  fetchEntireCodebase(ref?: string): Promise<{ path: string; content: string }[]>;
}

class GithubClient implements VCSClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, repoUrl: string) {
    this.octokit = new Octokit({ auth: token });
    const parts = repoUrl.replace('https://github.com/', '').split('/');
    this.owner = parts[0];
    this.repo = parts[1];
  }

  async fetchFile(path: string, ref?: string): Promise<string | null> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref,
      });
      if ('content' in data && typeof data.content === 'string') {
        return Buffer.from(data.content, 'base64').toString();
      }
      return null;
    } catch (error) {
      console.error('GitHub fetchFile error:', error);
      return null;
    }
  }

  async writeFile(path: string, content: string, message: string, ref?: string): Promise<void> {
    let sha: string | undefined;
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref,
      });
      if ('sha' in data) sha = data.sha;
    } catch (e) {
      // File might not exist
    }

    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      sha,
      branch: ref,
    });
  }

  async listContents(path: string, ref?: string, recursive?: boolean): Promise<any[]> {
    if (recursive) {
        try {
            const { data } = await this.octokit.rest.git.getTree({
                owner: this.owner,
                repo: this.repo,
                tree_sha: ref || 'main',
                recursive: 'true'
            });
            return data.tree;
        } catch (error) {
            console.error('GitHub listContents recursive error:', error);
            return [];
        }
    }

    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref,
      });
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error('GitHub listContents error:', error);
      return [];
    }
  }

  async fetchEntireCodebase(ref?: string): Promise<{ path: string; content: string }[]> {
    const tree = await this.listContents('', ref, true);
    const files: { path: string; content: string }[] = [];

    // Only fetch text files and skip big ones/binary
    const skipDirs = ['node_modules', '.git', 'dist', 'build', 'public'];
    const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.java', '.php', '.c', '.cpp', '.h', '.md', '.json', '.yml', '.yaml'];

    for (const item of tree) {
        if (item.type === 'blob') {
            const isSkipped = skipDirs.some(dir => item.path.includes(dir));
            const hasAllowedExt = allowedExtensions.some(ext => item.path.endsWith(ext));

            if (!isSkipped && hasAllowedExt) {
                const content = await this.fetchFile(item.path, ref);
                if (content && content.length < 50000) { // Max 50KB per file for analysis
                    files.push({ path: item.path, content });
                }
            }
        }
        if (files.length >= 50) break; // Limit to 50 files for AI context
    }
    return files;
  }

  async postComment(type: 'issue' | 'pull_request', id: string | number, body: string): Promise<void> {
    const issue_number = typeof id === 'string' ? parseInt(id) : id;
    await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number,
      body,
    });
  }
}

class GitlabClient implements VCSClient {
  private token: string;
  private projectId: string;
  private baseUrl = 'https://gitlab.com/api/v4';

  constructor(token: string, repoUrl: string) {
    this.token = token;
    this.projectId = encodeURIComponent(repoUrl.replace('https://gitlab.com/', ''));
  }

  private async request(path: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'PRIVATE-TOKEN': this.token,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitLab API error: ${response.status} ${text}`);
    }
    return response.json();
  }

  async fetchFile(path: string, ref = 'main'): Promise<string | null> {
    try {
      const data = await this.request(`/projects/${this.projectId}/repository/files/${encodeURIComponent(path)}?ref=${ref}`);
      return Buffer.from(data.content, 'base64').toString();
    } catch (error) {
      console.error('GitLab fetchFile error:', error);
      return null;
    }
  }

  async writeFile(path: string, content: string, message: string, ref = 'main'): Promise<void> {
    let action = 'update';
    try {
      await this.request(`/projects/${this.projectId}/repository/files/${encodeURIComponent(path)}?ref=${ref}`);
    } catch (e) {
      action = 'create';
    }

    await this.request(`/projects/${this.projectId}/repository/files/${encodeURIComponent(path)}`, {
      method: action === 'create' ? 'POST' : 'PUT',
      body: JSON.stringify({
        branch: ref,
        commit_message: message,
        content: content,
        encoding: 'text'
      }),
    });
  }

  async listContents(path: string, ref = 'main', recursive = false): Promise<any[]> {
    try {
      return await this.request(`/projects/${this.projectId}/repository/tree?path=${encodeURIComponent(path)}&ref=${ref}&recursive=${recursive}`);
    } catch (error) {
      console.error('GitLab listContents error:', error);
      return [];
    }
  }

  async fetchEntireCodebase(ref = 'main'): Promise<{ path: string; content: string }[]> {
    const tree = await this.listContents('', ref, true);
    const files: { path: string; content: string }[] = [];

    const skipDirs = ['node_modules', '.git', 'dist', 'build', 'public'];
    const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.java', '.php', '.c', '.cpp', '.h', '.md', '.json', '.yml', '.yaml'];

    for (const item of tree) {
        if (item.type === 'blob') {
            const isSkipped = skipDirs.some(dir => item.path.includes(dir));
            const hasAllowedExt = allowedExtensions.some(ext => item.path.endsWith(ext));

            if (!isSkipped && hasAllowedExt) {
                const content = await this.fetchFile(item.path, ref);
                if (content && content.length < 50000) {
                    files.push({ path: item.path, content });
                }
            }
        }
        if (files.length >= 50) break;
    }
    return files;
  }

  async postComment(type: 'issue' | 'merge_request', id: string | number, body: string): Promise<void> {
    const resource = type === 'issue' ? 'issues' : 'merge_requests';
    await this.request(`/projects/${this.projectId}/${resource}/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }
}

export async function getVCSClient(projectId: string): Promise<VCSClient | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project?.repoUrl) return null;

  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;

  if (project.repoUrl.includes("github.com")) {
    return new GithubClient(token, project.repoUrl);
  }

  if (project.repoUrl.includes("gitlab.com")) {
    return new GitlabClient(token, project.repoUrl);
  }

  return null;
}
