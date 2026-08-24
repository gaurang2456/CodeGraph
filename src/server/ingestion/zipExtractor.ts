import JSZip from 'jszip';
import path from 'path';
import { shouldIndexFile, detectLanguage } from './fileFilter';

export interface ExtractedFile {
  filePath: string;
  fileName: string;
  extension: string;
  language: string;
  content: string;
  lineCount: number;
}

const MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024; // 100 MB max
const MAX_TOTAL_FILES = 5000;

/**
 * Safely extracts a ZIP buffer in-memory, filtering out binary and ignored files.
 */
export async function extractZipArchive(zipBuffer: Buffer | ArrayBuffer): Promise<ExtractedFile[]> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipBuffer);
  
  const extractedFiles: ExtractedFile[] = [];
  let totalBytes = 0;

  // Detect common root folder wrapper (e.g. repo-main/)
  const allPaths = Object.keys(loadedZip.files).filter((p) => !loadedZip.files[p].dir);
  const firstParts = allPaths.map((p) => p.replace(/\\/g, '/').split('/')[0]);
  const hasCommonRoot =
    firstParts.length > 0 &&
    firstParts.every((p) => p === firstParts[0]) &&
    allPaths.every((p) => p.includes('/'));
  const commonPrefix = hasCommonRoot ? `${firstParts[0]}/` : '';

  for (const relativePath of Object.keys(loadedZip.files)) {
    const entry = loadedZip.files[relativePath];

    if (entry.dir) continue;

    // Sanitize path and prevent directory traversal
    const normalizedPath = relativePath.replace(/\\/g, '/');
    if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
      console.warn(`[ZIP Security] Skipped suspicious path: ${normalizedPath}`);
      continue;
    }

    // Strip common top-level prefix if present
    const cleanPath = commonPrefix && normalizedPath.startsWith(commonPrefix)
      ? normalizedPath.substring(commonPrefix.length)
      : normalizedPath;

    if (!cleanPath || !shouldIndexFile(cleanPath)) {
      continue;
    }

    if (extractedFiles.length >= MAX_TOTAL_FILES) {
      console.warn(`[ZIP Warning] Exceeded maximum file count of ${MAX_TOTAL_FILES}`);
      break;
    }

    try {
      const content = await entry.async('string');
      const byteLength = Buffer.byteLength(content, 'utf8');
      totalBytes += byteLength;

      if (totalBytes > MAX_UNCOMPRESSED_BYTES) {
        throw new Error(`Archive exceeds maximum uncompressed size limit of 100MB.`);
      }

      // Check if file is text/UTF-8 clean
      if (content.includes('\0')) {
        // Binary null byte detected
        continue;
      }

      const fileName = path.basename(cleanPath);
      const extension = path.extname(fileName).toLowerCase();
      const language = detectLanguage(cleanPath);
      const lineCount = content.split(/\r\n|\r|\n/).length;

      extractedFiles.push({
        filePath: cleanPath,
        fileName,
        extension,
        language,
        content,
        lineCount,
      });
    } catch (err: any) {
      console.warn(`[ZIP Warning] Failed reading file ${cleanPath}:`, err?.message);
    }
  }

  return extractedFiles;
}
