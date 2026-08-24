import path from 'path';

export const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.github',
  'node_modules',
  'dist',
  'build',
  '.next',
  'target',
  'bin',
  'obj',
  'out',
  'coverage',
  '.gradle',
  '.mvn',
  'venv',
  '.venv',
  'env',
  '__pycache__',
  '.pytest_cache',
  '.idea',
  '.vscode',
  '.settings',
  '.eclipse',
  '.turbo',
  'vendor',
]);

export const IGNORED_EXTENSIONS = new Set([
  // Binaries / Compiled
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.svg',
  '.mp4',
  '.mp3',
  '.wav',
  '.ogg',
  '.zip',
  '.tar',
  '.gz',
  '.7z',
  '.rar',
  '.jar',
  '.war',
  '.ear',
  '.class',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.pdf',
  '.wasm',
  '.pyc',
  '.pyd',
  '.pyo',
  '.ds_store',
  '.tsbuildinfo',
]);

export const IGNORED_FILENAMES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'cargo.lock',
  'composer.lock',
  'gemfile.lock',
  '.ds_store',
  'thumbs.db',
]);

export const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.java': 'Java',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.py': 'Python',
  '.go': 'Go',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.hpp': 'C++',
  '.h': 'C',
  '.c': 'C',
  '.rs': 'Rust',
  '.sql': 'SQL',
  '.html': 'HTML',
  '.htm': 'HTML',
  '.css': 'CSS',
  '.scss': 'CSS',
  '.sass': 'CSS',
  '.less': 'CSS',
  '.json': 'JSON',
  '.yml': 'YAML',
  '.yaml': 'YAML',
  '.xml': 'XML',
  '.md': 'Markdown',
  '.markdown': 'Markdown',
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.properties': 'Properties',
  '.env.example': 'Config',
};

/**
 * Checks whether a given relative file path should be included in indexing.
 */
export function shouldIndexFile(filePath: string): boolean {
  // Normalize slashes
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const filename = parts[parts.length - 1].toLowerCase();

  // Check if any parent folder is ignored
  for (let i = 0; i < parts.length - 1; i++) {
    const dir = parts[i].toLowerCase();
    if (IGNORED_DIRECTORIES.has(dir) || dir.startsWith('.')) {
      return false;
    }
  }

  // Check ignored filenames
  if (IGNORED_FILENAMES.has(filename)) {
    return false;
  }

  // Check extensions
  const ext = path.extname(filename).toLowerCase();
  if (IGNORED_EXTENSIONS.has(ext)) {
    return false;
  }

  // Check if recognized source or config file
  if (filename === 'dockerfile' || filename === 'makefile' || filename === 'pom.xml') {
    return true;
  }

  return ext in EXTENSION_TO_LANGUAGE || isTextExtension(ext);
}

function isTextExtension(ext: string): boolean {
  return [
    '.txt',
    '.conf',
    '.config',
    '.ini',
    '.toml',
    '.env',
    '.graphql',
    '.proto',
    '.gradle',
  ].includes(ext);
}

/**
 * Detects the programming language or format for a given file path.
 */
export function detectLanguage(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const filename = path.basename(normalized).toLowerCase();

  if (filename === 'dockerfile') return 'Dockerfile';
  if (filename === 'pom.xml') return 'XML';
  if (filename === 'makefile') return 'Makefile';

  const ext = path.extname(filename).toLowerCase();
  return EXTENSION_TO_LANGUAGE[ext] || 'Text';
}
