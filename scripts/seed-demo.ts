import fs from 'fs';
import path from 'path';
import { seedDemoUsers } from './seed-demo-users';
import { seedDemoData } from './seed-demo-data';

function loadEnvFiles() {
  const files = ['.env.local', '.env'];
  for (const file of files) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

async function runSeed() {
  loadEnvFiles();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY must be set in your .env or .env.local file.');
    process.exit(1);
  }

  if (process.env.ALLOW_DEMO_SEED !== 'true' && process.env.NODE_ENV === 'production') {
    console.error('❌ Refusing to run demo seed in production without ALLOW_DEMO_SEED=true');
    process.exit(1);
  }

  console.log('🚀 Starting PeoplePay360 Demo Seed Script...');
  try {
    await seedDemoUsers(url, key);
    await seedDemoData(url, key);
    console.log('🎉 Demo seeding finished successfully!');
  } catch (err) {
    console.error('❌ Seeding failed with error:', err);
    process.exit(1);
  }
}

runSeed();
