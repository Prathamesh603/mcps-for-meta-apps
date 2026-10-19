import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const suites = [
  ['facebook-mcp', ['--import', './build/testing/network-fence.js', '--test', 'build/core/http.test.js', 'build/core/auth.test.js', 'build/core/redact.test.js']],
  ['instagram-mcp', ['--test', 'dist/test/core/host.test.js', 'dist/test/core/http.test.js', 'dist/test/core/redact.test.js', 'dist/test/api/path-injection.test.js', 'dist/test/api/publishing.test.js']],
];
for (const [repo, args] of suites) {
  const child = spawnSync(process.execPath, args, { cwd: resolve(root, repo), stdio: 'inherit', shell: false });
  if (child.error) throw child.error;
  if (child.status !== 0) process.exit(child.status ?? 1);
}
