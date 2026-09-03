import { GitHubConnectionService } from './githubConnectionService';

export interface GitHubUserProfile {
  id: number;
  login: string;
  name?: string | null;
  avatar_url?: string;
  html_url: string;
  email?: string | null;
}

export interface GitHubRepoDetails {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  description?: string | null;
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
