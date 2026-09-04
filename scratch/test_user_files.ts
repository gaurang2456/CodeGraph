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
import { GET } from '../src/app/api/repositories/[id]/files/route';

async function testWithUser() {
  const repoId = 'repo-1788014671189';
  const userId = '8d7d0440-dc13-41c1-ab28-8168526fb493';

  console.log('Testing GET route for user', userId, 'and repo', repoId);

  // Let's create a Request with header
  const req = new Request(`http://localhost:3000/api/repositories/${repoId}/files`) as any;

  // Since cookies() throws outside Next.js request store, let's see how authHelper behaves
  try {
    const res = await GET(req, { params: Promise.resolve({ id: repoId }) });
    console.log('Response status:', res.status);
    const data = await res.json();
    console.log('Response data:', data);
  } catch (err) {
    console.error('Direct error:', err);
  }
}

testWithUser().catch(console.error);
