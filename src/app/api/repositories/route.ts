import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSchema, query } from '@/server/db/client';
import { extractZipArchive } from '@/server/ingestion/zipExtractor';
import { downloadGitHubRepository, parseGitHubUrl } from '@/server/ingestion/githubIngestion';
import { IndexingPipeline } from '@/server/ingestion/indexingPipeline';

export async function GET() {
  try {
    await ensureDatabaseSchema();
    const result = await query(
      `SELECT id, name, full_name, source_type, github_url, branch, status, stage, progress,
              file_count, folder_count, line_count, token_count, primary_language, framework,
              technologies, summary, stats, error_message, created_at, updated_at
       FROM repositories
       ORDER BY created_at DESC`
    );

    return NextResponse.json({ repositories: result.rows });
  } catch (error: any) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json(
      { error: error?.message || 'Database connection error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSchema();
    const contentType = req.headers.get('content-type') || '';

    let repositoryId = `repo-${Date.now()}`;
    let repoName = 'Uploaded-Repository';
    let fullName = 'local/uploaded-repository';
    let sourceType: 'zip' | 'github' = 'zip';
    let githubUrl: string | undefined = undefined;
    let extractorFn: () => Promise<any>;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const customName = formData.get('name') as string | null;

      if (!file) {
        return NextResponse.json({ error: 'No ZIP archive file provided.' }, { status: 400 });
      }

      if (!file.name.endsWith('.zip')) {
        return NextResponse.json({ error: 'Only .zip files are supported.' }, { status: 400 });
      }

      repoName = customName || file.name.replace(/\.zip$/i, '');
      fullName = `uploads/${repoName}`;
      sourceType = 'zip';

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      extractorFn = async () => extractZipArchive(buffer);
    } else {
      // JSON body for GitHub URL
      const body = await req.json();
      const inputUrl = body.githubUrl || body.url;

      if (!inputUrl) {
        return NextResponse.json({ error: 'GitHub repository URL is required.' }, { status: 400 });
      }

      const info = parseGitHubUrl(inputUrl);
      repoName = info.repo;
      fullName = info.fullName;
      githubUrl = info.htmlUrl;
      sourceType = 'github';

      extractorFn = async () => {
        const { files } = await downloadGitHubRepository(inputUrl);
        return files;
      };
    }

    // Insert initial record with status = PENDING
    await query(
      `INSERT INTO repositories (id, name, full_name, source_type, github_url, status, stage, progress)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', 'Pending Ingestion', 0)`,
      [repositoryId, repoName, fullName, sourceType, githubUrl || null]
    );

    // Launch indexing in background without blocking HTTP response
    setTimeout(() => {
      IndexingPipeline.run(repositoryId, extractorFn).catch((err) => {
        console.error(`Background indexing unhandled error for ${repositoryId}:`, err);
      });
    }, 100);

    return NextResponse.json(
      {
        id: repositoryId,
        name: repoName,
        status: 'PENDING',
        stage: 'Pending Ingestion',
        progress: 0,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating repository:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to ingest repository.' },
      { status: 500 }
    );
  }
}
