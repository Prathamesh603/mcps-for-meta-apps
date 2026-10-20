import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Emit configuration only. Never inspect account variables or write client files.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const clients = ['desktop', 'codex', 'claude-code', 'cursor', 'vscode'];
const args = process.argv.slice(2);
const client = args[0]?.replace(/^--client=/, '') ?? 'desktop';
if (args.length > 1 || !clients.includes(client)) throw new Error(`Use --client=${clients.join('|')}`);
const services = {
  facebook_hardened: {
    path: 'facebook-mcp/bin/facebook-mcp.mjs',
    credentials: ['FB_PAGE_ID', 'FB_PAGE_TOKEN'],
    defaults: { FB_TRANSPORT: 'stdio', FB_TOOL_PACKAGES: 'reader,insights', FB_PACKAGES_READONLY: 'all', FB_WRITE_MODE: 'plan' },
  },
  instagram_hardened: {
    path: 'instagram-mcp/bin/instagram-mcp-ai.cjs',
    credentials: ['IG_ACCOUNT_ID', 'IG_ACCESS_TOKEN'],
    defaults: { IG_AUTH_PATH: 'ig-login', IG_TRANSPORT: 'stdio', IG_TOOL_PACKAGES: 'reader', IG_WRITE_MODE: 'preview', IG_ALLOW_DESTRUCTIVE: 'false' },
  },
};
if (client === 'codex') {
  // JSON quoted strings are valid TOML basic strings for these generated paths.
  const quote = JSON.stringify;
  for (const [name, service] of Object.entries(services)) {
    console.log(`[mcp_servers.${name}]`);
    console.log(`command = ${quote(process.execPath)}`);
    console.log(`args = [${quote(resolve(root, service.path))}]`);
    console.log(`env_vars = [${service.credentials.map(quote).join(', ')}]`);
    console.log(`[mcp_servers.${name}.env]`);
    for (const [key, value] of Object.entries(service.defaults)) console.log(`${key} = ${quote(value)}`);
    console.log('');
  }
} else {
  const servers = {}, inputs = [];
  for (const [name, service] of Object.entries(services)) {
    const env = { ...service.defaults };
    for (const key of service.credentials) {
      if (client === 'vscode') {
        env[key] = '${input:' + key + '}';
        inputs.push({ id: key, type: 'promptString', description: key, password: key.endsWith('TOKEN') });
      } else if (client === 'cursor') env[key] = '${env:' + key + '}';
      else if (client === 'claude-code') env[key] = '${' + key + '}';
      else env[key] = `<SET_${key}_VIA_PROTECTED_LOCAL_CONFIGURATION>`;
    }
    servers[name] = { ...(client === 'desktop' || client === 'cursor' ? {} : { type: 'stdio' }), command: process.execPath, args: [resolve(root, service.path)], env };
  }
  console.log(JSON.stringify(client === 'vscode' ? { inputs, servers } : { mcpServers: servers }, null, 2));
}
