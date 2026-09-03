import { GitHubConnectionService } from './githubConnectionService';

export interface GitHubUserProfile {
  id: number;
  login: string;
  name?: string | null;
  avatar_url?: string;
  html_url: string;
  email?: string | null;
}

export interface GitHubRepoPermissions {
  admin: boolean;
  maintain?: boolean;
  push: boolean;
  triage?: boolean;
  pull: boolean;
}

export interface GitHubRepoDetails {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  description?: string | null;
  permissions?: GitHubRepoPermissions;
}

export interface GitTreeItem {
  path: string;
  mode: '100644' | '100755' | '040000' | '160000' | '120000';
  type: 'blob' | 'tree' | 'commit';
  sha: string | null;
}

export interface GitCommitDetails {
  sha: string;
  tree: { sha: string; url: string };
  message: string;
  parents: Array<{ sha: string }>;
}

export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  content?: string;
  encoding?: string;
}

export interface GitHubPullRequestDetails {
  id: number;
  number: number;
  html_url: string;
  url: string;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  merged?: boolean;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
}

export class GitHubApiClient {
  private token: string;
  private baseUrl: string = 'https://api.github.com';

  constructor(token: string) {
    if (!token) {
      throw new Error('A valid GitHub access token is required to initialize GitHubApiClient.');
    }
    this.token = token;
  }

  /**
   * Performs an authenticated request to the GitHub REST API.
   * SECURITY: Tokens are stripped from error messages and never logged.
   */
  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'CodeGraph-Platform/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers as Record<string, string> || {}),
    };

    if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorDetails = '';
        try {
          const json = await response.json();
          errorDetails = json.message || '';
        } catch {
          errorDetails = await response.text().catch(() => '');
        }

        // Clean out any accidental token reflections
        const sanitizedDetails = errorDetails.replace(new RegExp(this.token, 'g'), '[REDACTED_TOKEN]');
        throw new Error(
          `GitHub API request failed [${response.status}]: ${sanitizedDetails || response.statusText}`
        );
      }

      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (err: any) {
      const safeMessage = (err?.message || 'Unknown GitHub API error').replace(
        new RegExp(this.token, 'g'),
        '[REDACTED_TOKEN]'
      );
      throw new Error(safeMessage);
    }
  }

  /**
   * Retrieves the authenticated GitHub user's profile.
   */
  async getUser(): Promise<GitHubUserProfile> {
    return this.request<GitHubUserProfile>('/user');
  }

  /**
   * Retrieves repository metadata for a given owner and repo name.
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepoDetails> {
    return this.request<GitHubRepoDetails>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  }

  /**
   * Reads a Git reference (e.g. heads/main or heads/feature-xyz).
   * Returns null if not found (404).
   */
  async getRef(
    owner: string,
    repo: string,
    ref: string
  ): Promise<{ ref: string; object: { sha: string; type: string } } | null> {
    const cleanRef = ref.replace(/^refs\//, '');
    try {
      return await this.request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/${cleanRef}`);
    } catch (err: any) {
      if (err.message && err.message.includes('404')) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Creates a Git reference (branch).
   * ref should typically be in format: 'refs/heads/branch-name'
   */
  async createRef(
    owner: string,
    repo: string,
    ref: string,
    sha: string
  ): Promise<{ ref: string; object: { sha: string; type: string } }> {
    const fullRef = ref.startsWith('refs/') ? ref : `refs/${ref}`;
    return this.request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: fullRef,
        sha,
      }),
    });
  }

  /**
   * Fetches raw or decoded content of a file on GitHub at a given ref (branch, commit SHA).
   * Returns null if file does not exist (404).
   */
  async getFileContent(
    owner: string,
    repo: string,
    filePath: string,
    ref?: string
  ): Promise<GitHubFileContent | null> {
    const encodedPath = filePath
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    const query = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    try {
      return await this.request<GitHubFileContent>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}${query}`
      );
    } catch (err: any) {
      if (err.message && err.message.includes('404')) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Creates a Git blob in GitHub's object store.
   */
  async createBlob(
    owner: string,
    repo: string,
    content: string,
    encoding: 'utf-8' | 'base64' = 'utf-8'
  ): Promise<{ sha: string; url: string }> {
    return this.request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        encoding,
      }),
    });
  }

  /**
   * Reads a Git commit to get its base tree and metadata.
   */
  async getCommit(owner: string, repo: string, commitSha: string): Promise<GitCommitDetails> {
    return this.request<GitCommitDetails>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${commitSha}`
    );
  }

  /**
   * Creates a new Git tree from a base tree and a list of tree items.
   * Enables staging multi-file additions, modifications, and deletions without creating a commit.
   */
  async createTree(
    owner: string,
    repo: string,
    baseTreeSha: string,
    treeItems: GitTreeItem[]
  ): Promise<{ sha: string; url: string }> {
    return this.request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    });
  }

  /**
   * Creates a Git commit in GitHub's object store.
   */
  async createCommit(
    owner: string,
    repo: string,
    message: string,
    treeSha: string,
    parents: string[]
  ): Promise<GitCommitDetails> {
    return this.request<GitCommitDetails>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits`,
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          tree: treeSha,
          parents,
        }),
      }
    );
  }

  /**
   * Updates a Git reference (pushes a commit to a branch).
   * force defaults to false to enforce safe fast-forward updates.
   */
  async updateRef(
    owner: string,
    repo: string,
    ref: string,
    sha: string,
    force: boolean = false
  ): Promise<{ ref: string; object: { sha: string; type: string } }> {
    const cleanRef = ref.replace(/^refs\//, '');
    return this.request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/${cleanRef}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          sha,
          force,
        }),
      }
    );
  }

  /**
   * Creates a Pull Request on GitHub.
   */
  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
    body?: string
  ): Promise<GitHubPullRequestDetails> {
    return this.request<GitHubPullRequestDetails>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
      {
        method: 'POST',
        body: JSON.stringify({
          title,
          head,
          base,
          body: body || '',
        }),
      }
    );
  }

  /**
   * Lists Pull Requests for a repository, optionally filtered by head branch, base branch, and state.
   */
  async listPullRequests(
    owner: string,
    repo: string,
    head?: string,
    base?: string,
    state: 'open' | 'closed' | 'all' = 'all'
  ): Promise<GitHubPullRequestDetails[]> {
    const params = new URLSearchParams();
    params.set('state', state);
    if (head) params.set('head', head);
    if (base) params.set('base', base);

    return this.request<GitHubPullRequestDetails[]>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?${params.toString()}`
    );
  }
}

/**
 * Factory to create an authenticated GitHubApiClient for the given CodeGraph user.
 * Strictly verifies the user has a GitHub connection before instantiating the client.
 */
export async function createGitHubClient(userId: string): Promise<GitHubApiClient> {
  if (!userId) {
    throw new Error('User ID is required to create a GitHub API client.');
  }

  const token = await GitHubConnectionService.getRawGitHubTokenForUser(userId);

  if (!token) {
    throw new Error('No GitHub account connected for this user. Please connect your GitHub account first.');
  }

  return new GitHubApiClient(token);
}
