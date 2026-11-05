import fs from 'fs';
import path from 'path';

// Production entrypoint for Cloud Run deployment
// When running in production (after npm run build), load the pre-compiled server bundle
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
const distServer = path.join(process.cwd(), 'dist', 'server.cjs');

if (fs.existsSync(distServer)) {
  // Production runtime (Cloud Run container)
  // @ts-ignore
  await import('./dist/server.cjs');
} else {
  // Development runtime with tsx
  try {
    await import('tsx/esm');
  } catch {}
  await import('./server.core.ts');
}
