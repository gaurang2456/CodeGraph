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

async function testTreeBuilding() {
  const repoId = 'repo-1788015585583';
  const repoRes = await query('SELECT * FROM repositories WHERE id = $1', [repoId]);
  const repository = repoRes.rows[0];
  console.log('Repository:', repository.name, repository.id);

  const filesRes = await query(
    `SELECT id, file_path, file_name, extension, language, line_count
     FROM repository_files
     WHERE repository_id = $1
     ORDER BY file_path ASC`,
    [repoId]
  );
  console.log('Total files from query:', filesRes.rows.length);

  const repoName = repository.name || 'repository';
  const rootNode: FileTreeNode = {
    id: 'root',
    name: repoName,
    path: '',
    type: 'folder',
    isOpen: true,
    children: [],
  };

  for (const row of filesRes.rows) {
    const parts = row.file_path.split('/');
    let currentNode = rootNode;

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

  console.log('Root node children count:', rootNode.children?.length);
  console.log('Sample root children:', rootNode.children?.slice(0, 5));
}

testTreeBuilding().catch(console.error);
