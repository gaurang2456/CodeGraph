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

async function testRepoFilesQuery() {
  const repoId = 'repo-1788014671189';
  console.log('Testing files query for repo:', repoId);

  const res = await query(
    `SELECT id, file_path, file_name, extension, language, line_count
     FROM repository_files
     WHERE repository_id = $1
     ORDER BY file_path ASC`,
    [repoId]
  );
  console.log('Query result count:', res.rows.length);

  // Check if any row has null or undefined file_path
  const badRows = res.rows.filter(r => !r.file_path);
  console.log('Rows with empty file_path:', badRows.length);
}

testRepoFilesQuery().catch(console.error);
