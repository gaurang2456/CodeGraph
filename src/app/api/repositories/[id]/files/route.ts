import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSchema, query } from '@/server/db/client';
import { FileTreeNode } from '@/types';
import { requireRepositoryAccess, handleAuthApiError } from '@/server/auth/authHelper';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const { id } = await params;
    const { repository } = await requireRepositoryAccess(id, req);

    const filesRes = await query(
      `SELECT id, file_path, file_name, extension, language, line_count, content
       FROM repository_files
       WHERE repository_id = $1
       ORDER BY file_path ASC`,
      [id]
    );

    const repoName = repository.name || 'repository';

    // Build hierarchical file tree from flat paths
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

      snippetsMap[row.file_name] = {
        code: row.content,
        language: row.language.toLowerCase(),
        lineCount: row.line_count,
      };
      // Also map by full path so citations with full paths resolve
      snippetsMap[row.file_path] = {
        code: row.content,
        language: row.language.toLowerCase(),
        lineCount: row.line_count,
      };

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
            language: isFile ? row.language.toLowerCase() : undefined,
          };
          currentNode.children.push(existingChild);
        }

        if (!isFile) {
          currentNode = existingChild;
        }
      }
    }

    return NextResponse.json({
      fileTree: rootNode,
      snippets: snippetsMap,
      totalFiles: filesRes.rows.length,
    });
  } catch (error: any) {
    return handleAuthApiError(error);
  }
}
