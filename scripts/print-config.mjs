import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Emits paths and explicit placeholders only. Never reads or prints environment secrets.
console.log(JSON.stringify({ mcpServers: {
  facebook_hardened: { command: process.execPath, args: [resolve(root, 'facebook-mcp/bin/facebook-mcp.mjs')], env: {
    FB_PAGE_ID: '<YOUR_PAGE_ID>', FB_PAGE_TOKEN: '<INJECT_FROM_YOUR_CLIENT_SECRET_STORE>',
    FB_TRANSPORT: 'stdio', FB_TOOL_PACKAGES: 'reader,insights', FB_PACKAGES_READONLY: 'all', FB_WRITE_MODE: 'plan'
  } },
  instagram_hardened: { command: process.execPath, args: [resolve(root, 'instagram-mcp/bin/instagram-mcp-ai.cjs')], env: {
    IG_ACCESS_TOKEN: '<INJECT_FROM_YOUR_CLIENT_SECRET_STORE>', IG_ACCOUNT_ID: '<YOUR_INSTAGRAM_ACCOUNT_ID>', IG_AUTH_PATH: 'ig-login',
    IG_TRANSPORT: 'stdio', IG_TOOL_PACKAGES: 'reader', IG_WRITE_MODE: 'preview', IG_ALLOW_DESTRUCTIVE: 'false'
  } }
} }, null, 2));
