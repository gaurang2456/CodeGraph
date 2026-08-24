import { extractZipArchive, ExtractedFile } from './zipExtractor';

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  fullName: string;
  defaultBranch: string;
  htmlUrl: string;
}

/**
 * Parses and validates a public GitHub URL or owner/repo format.
 */
export function parseGitHubUrl(input: string): GitHubRepoInfo {
  let cleaned = input.trim();
  cleaned = cleaned.replace(/^git@github\.com:/, 'https://github.com/');
  cleaned = cleaned.replace(/\.git$/, '');

  const match = cleaned.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i)
    || cleaned.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);

  if (!match) {
    throw new Error(`Invalid GitHub repository URL: "${input}". Format should be https://github.com/owner/repository or owner/repository.`);
  }

  const owner = match[1];
  const repo = match[2];
  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    defaultBranch: 'main',
    htmlUrl: `https://github.com/${owner}/${repo}`,
  };
}

/**
 * Downloads and extracts a public GitHub repository.
 */
export async function downloadGitHubRepository(
  urlOrRepo: string
): Promise<{ info: GitHubRepoInfo; files: ExtractedFile[] }> {
  const info = parseGitHubUrl(urlOrRepo);

  // Try fetching repository metadata from GitHub API to determine default branch
  let branch = 'main';
  try {
    const metaRes = await fetch(`https://api.github.com/repos/${info.owner}/${info.repo}`, {
      headers: {
        'User-Agent': 'CodeGraph-Ingestion-Engine/1.0',
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (metaRes.ok) {
      const meta = await metaRes.json();
      if (meta.default_branch) {
        branch = meta.default_branch;
        info.defaultBranch = branch;
      }
    }
  } catch (e) {
    console.warn(`[GitHub API] Could not fetch repo metadata, defaulting to branch '${branch}'`);
  }

  // Download zipball from GitHub
  const zipUrl = `https://api.github.com/repos/${info.owner}/${info.repo}/zipball/${branch}`;
  const zipRes = await fetch(zipUrl, {
    headers: {
      'User-Agent': 'CodeGraph-Ingestion-Engine/1.0',
      'Accept': 'application/vnd.github.v3+json',
    },
    redirect: 'follow',
  });

  if (!zipRes.ok) {
    if (zipRes.status === 404) {
      throw new Error(`Repository '${info.fullName}' was not found. Please ensure it is a public repository.`);
    }
    throw new Error(`Failed to download repository archive from GitHub (Status: ${zipRes.status} ${zipRes.statusText})`);
  }

  const arrayBuffer = await zipRes.arrayBuffer();
  const files = await extractZipArchive(arrayBuffer);

  return {
    info,
    files,
  };
}
