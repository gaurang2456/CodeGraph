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

async function main() {
  const res = await query("SELECT summary->'architectureFlow' as flow FROM repositories WHERE id = 'repo-1788014671189'");
  console.log('Flow nodes:', JSON.stringify(res.rows[0]?.flow?.nodes, null, 2));
}

main().catch(console.error);
