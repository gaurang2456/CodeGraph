export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface DiffStats {
  additions: number;
  deletions: number;
}

/**
 * Computes structured line-by-line diff between original and proposed code.
 */
export function computeLineDiff(original: string = '', proposed: string = ''): DiffLine[] {
  const origLines = original ? original.split(/\r?\n/) : [];
  const propLines = proposed ? proposed.split(/\r?\n/) : [];

  const m = origLines.length;
  const n = propLines.length;

  // Compute Longest Common Subsequence (LCS) matrix
  // For very large files, limit DP table to keep execution < 5ms
  if (m * n > 4000000) {
    // Fast block diff for ultra-large files
    return computeFastBlockDiff(origLines, propLines);
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origLines[i - 1] === propLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build the diff
  const diff: DiffLine[] = [];
  let i = m;
  let j = n;

  const rawEntries: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1] === propLines[j - 1]) {
      rawEntries.push({
        type: 'unchanged',
        oldLineNumber: i,
        newLineNumber: j,
        content: origLines[i - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawEntries.push({
        type: 'added',
        newLineNumber: j,
        content: propLines[j - 1],
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawEntries.push({
        type: 'removed',
        oldLineNumber: i,
        content: origLines[i - 1],
      });
      i--;
    }
  }

  return rawEntries.reverse();
}

/**
 * Fast block diff fallback for extremely large files
 */
function computeFastBlockDiff(origLines: string[], propLines: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  let oldLine = 1;
  let newLine = 1;

  for (const line of origLines) {
    result.push({
      type: 'removed',
      oldLineNumber: oldLine++,
      content: line,
    });
  }
  for (const line of propLines) {
    result.push({
      type: 'added',
      newLineNumber: newLine++,
      content: line,
    });
  }
  return result;
}

/**
 * Calculates total additions and deletions for a file diff.
 */
export function calculateDiffStats(original: string = '', proposed: string = ''): DiffStats {
  const lines = computeLineDiff(original, proposed);
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.type === 'added') additions++;
    else if (line.type === 'removed') deletions++;
  }

  return { additions, deletions };
}

/**
 * Generates Git-style unified diff string representation.
 */
export function generateUnifiedDiff(
  filePath: string,
  original: string = '',
  proposed: string = ''
): string {
  const diffLines = computeLineDiff(original, proposed);
  const header = `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,${original.split('\n').length} +1,${proposed.split('\n').length} @@\n`;

  const body = diffLines
    .map((l) => {
      if (l.type === 'added') return `+ ${l.content}`;
      if (l.type === 'removed') return `- ${l.content}`;
      return `  ${l.content}`;
    })
    .join('\n');

  return header + body;
}
