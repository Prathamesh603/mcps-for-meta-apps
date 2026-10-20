import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const generator = new URL('../scripts/print-config.mjs', import.meta.url);
const canary = 'SYNTHETIC_CREDENTIAL_MUST_NOT_APPEAR_IN_CONFIG';
const credentialKeys = ['FB_PAGE_ID', 'FB_PAGE_TOKEN', 'IG_ACCOUNT_ID', 'IG_ACCESS_TOKEN'];
function generate(client) {
  return spawnSync(process.execPath, [fileURLToPath(generator), `--client=${client}`], {
    encoding: 'utf8', env: { ...process.env, ...Object.fromEntries(credentialKeys.map(k => [k, canary])) },
  });
}

test('client JSON templates use valid launchers, read-only policy and secret references', () => {
  for (const client of ['desktop', 'claude-code', 'cursor', 'vscode']) {
    const result = generate(client);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!result.stdout.includes(canary));
    const config = JSON.parse(result.stdout);
    const servers = client === 'vscode' ? config.servers : config.mcpServers;
    assert.equal(Object.keys(servers).length, 2);
    for (const server of Object.values(servers)) {
      assert.ok(isAbsolute(server.command) && existsSync(server.command));
      assert.ok(isAbsolute(server.args[0]) && existsSync(server.args[0]));
    }
    assert.equal(servers.facebook_hardened.env.FB_PACKAGES_READONLY, 'all');
    assert.equal(servers.instagram_hardened.env.IG_TOOL_PACKAGES, 'reader');
    if (client === 'vscode') assert.equal(config.inputs.filter(i => i.password).length, 2);
    for (const key of credentialKeys) {
      const env = key.startsWith('FB_') ? servers.facebook_hardened.env : servers.instagram_hardened.env;
      const reference = client === 'claude-code' ? '${' + key + '}' : client === 'cursor' ? '${env:' + key + '}' : client === 'vscode' ? '${input:' + key + '}' : `<SET_${key}_VIA_PROTECTED_LOCAL_CONFIGURATION>`;
      assert.equal(env[key], reference);
    }
  }
});

test('Codex configuration forwards credential names without reading their values', () => {
  const result = generate('codex');
  assert.equal(result.status, 0, result.stderr);
  assert.ok(!result.stdout.includes(canary));
  assert.ok(result.stdout.includes('[mcp_servers.facebook_hardened]'));
  assert.ok(result.stdout.includes('[mcp_servers.instagram_hardened]'));
  assert.ok(result.stdout.includes('env_vars = ["FB_PAGE_ID", "FB_PAGE_TOKEN"]'));
  assert.ok(result.stdout.includes('env_vars = ["IG_ACCOUNT_ID", "IG_ACCESS_TOKEN"]'));
});

test('an unknown client refuses rather than printing a misleading configuration', () => {
  const result = generate('unsupported-client');
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
});
