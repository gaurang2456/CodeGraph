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

async function testUserRepos() {
  const userId = '8d7d0440-dc13-41c1-ab28-8168526fb493';
  const result = await query(
    `SELECT id, name, full_name, source_type, github_url, branch, user_id, status, stage, progress,
            file_count, folder_count, line_count, token_count, primary_language, framework,
            created_at, updated_at
     FROM repositories
     WHERE user_id = $1 OR user_id IS NULL
     ORDER BY created_at DESC`,
    [userId]
  );
  console.log('Repositories returned for user:', result.rows.map(r => ({
    id: r.id,
    name: r.name,
    user_id: r.user_id,
    status: r.status,
    file_count: r.file_count,
    created_at: r.created_at
  })));
}

testUserRepos().catch(console.error);
