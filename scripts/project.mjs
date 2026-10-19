import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const command = process.argv[2];
if (!['setup', 'build', 'test', 'audit', 'check'].includes(command)) throw new Error('Use npm run setup, build, test, audit or check.');
if (!process.env.npm_execpath) throw new Error('Run this script through npm so its CLI path is explicit.');
function run(args, cwd = root) {
  const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
function npm(repo, args) { run([process.env.npm_execpath, ...args], resolve(root, repo)); }
if (command === 'setup') {
  for (const repo of ['facebook-mcp', 'instagram-mcp']) npm(repo, ['ci', '--ignore-scripts', '--no-fund']);
}
if (['setup', 'build', 'test', 'check'].includes(command)) {
  for (const repo of ['facebook-mcp', 'instagram-mcp']) npm(repo, ['run', 'build']);
}
if (['test', 'check'].includes(command)) run(['--test', 'test/security.test.mjs']);
if (['test', 'check'].includes(command)) run(['scripts/boundary-tests.mjs']);
if (['audit', 'check'].includes(command)) {
  for (const repo of ['facebook-mcp', 'instagram-mcp']) npm(repo, ['audit', '--package-lock-only', '--ignore-scripts', '--audit-level=low']);
}
