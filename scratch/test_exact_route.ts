import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { query } from '../src/server/db/client';
import { FileTreeNode } from '../src/types';

async function testExactRouteLogic() {
  const id = 'repo-1788014671189';
  const withContent = false;

  console.log('Testing exact route logic for repo:', id);
  try {
    const repoRes = await query('SELECT * FROM repositories WHERE id = $1', [id]);
    const repository = repoRes.rows[0];

    const selectCols = withContent
      ? `id, file_path, file_name, extension, language, line_count, content`
      : `id, file_path, file_name, extension, language, line_count`;

    const filesRes = await query(
      `SELECT ${selectCols}
       FROM repository_files
       WHERE repository_id = $1
       ORDER BY file_path ASC`,
      [id]
    );

    const repoName = repository.name || 'repository';

    const rootNode: FileTreeNode = {
      id: 'root',
      name: repoName,
      path: '',
      type: 'folder',
      isOpen: true,
      children: [],
    };

    const snippetsMap: Record<string, { code: string; language: string; lineCount: number }> = {};

    for (const row of filesRes.rows) {
      const parts = row.file_path.split('/');
      let currentNode = rootNode;

      if (withContent && row.content !== undefined) {
        snippetsMap[row.file_name] = {
          code: row.content,
          language: (row.language || 'code').toLowerCase(),
          lineCount: row.line_count || 0,
        };
        snippetsMap[row.file_path] = {
          code: row.content,
          language: (row.language || 'code').toLowerCase(),
          lineCount: row.line_count || 0,
        };
      }

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');

        if (!currentNode.children) {
          currentNode.children = [];
        }

        let existingChild = currentNode.children.find((c) => c.name === part);

        if (!existingChild) {
          existingChild = {
            id: currentPath,
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'folder',
            isOpen: !isFile,
            children: isFile ? undefined : [],
            language: isFile ? (row.language || 'code').toLowerCase() : undefined,
          };
          currentNode.children.push(existingChild);
        }

        if (!isFile) {
          currentNode = existingChild;
        }
      }
    }

    if (!withContent && filesRes.rows.length > 0) {
      const firstRow = filesRes.rows[0];
      const firstContentRes = await query(
        `SELECT file_path, file_name, language, line_count, content
         FROM repository_files
         WHERE repository_id = $1 AND id = $2
         LIMIT 1`,
        [id, firstRow.id]
      );
      if (firstContentRes.rows.length > 0) {
        const f = firstContentRes.rows[0];
        snippetsMap[f.file_name] = {
          code: f.content || '',
          language: (f.language || 'code').toLowerCase(),
          lineCount: f.line_count || 0,
        };
        snippetsMap[f.file_path] = {
          code: f.content || '',
          language: (f.language || 'code').toLowerCase(),
          lineCount: f.line_count || 0,
        };
      }
    }

    const payload = {
      fileTree: rootNode,
      snippets: snippetsMap,
      totalFiles: filesRes.rows.length,
    };

    const serialized = JSON.stringify(payload);
    console.log('SUCCESS! Serialized JSON length:', serialized.length);
  } catch (err) {
    console.error('FAILED with error:', err);
  }
}

testExactRouteLogic().catch(console.error);
