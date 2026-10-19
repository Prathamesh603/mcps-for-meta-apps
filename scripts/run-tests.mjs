import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Component npm test runs the same cross-component security contract as the parent.
const child = spawnSync(process.execPath, ['--test', 'test/security.test.mjs'], { cwd: root, stdio: 'inherit', shell: false });
if (child.error) throw child.error;
process.exit(child.status ?? 1);
