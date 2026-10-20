# Install and connect

Repository: [Prathamesh603/mcps-for-meta-apps](https://github.com/Prathamesh603/mcps-for-meta-apps). Configuration recipes checked against official documentation on 20 October 2026. Live client/account interoperability has not been certified; see [validation](../VALIDATION.md).

## 1. Download and install

Install Git, Node.js 22.22.0 or newer, and npm 11. On Windows use PowerShell; on macOS/Linux use your terminal. Check `node --version` and `npm --version`, then run:

```sh
git clone https://github.com/Prathamesh603/mcps-for-meta-apps.git
cd mcps-for-meta-apps
npm run setup
npm run check
```

Alternatively choose **Code → Download ZIP** on GitHub or [download main.zip](https://github.com/Prathamesh603/mcps-for-meta-apps/archive/refs/heads/main.zip). Extract it, open a terminal inside the extracted `mcps-for-meta-apps-main` directory and run the two npm commands. A Git clone is easier to update. Do not run the old upstream `npx` commands: they fetch a different distribution.

Setup installs both locked dependency graphs without lifecycle hooks and explicitly compiles both. It does not start the servers or connect an account. You can configure just one of the two servers after building. Downloading code does not provide Meta credentials or grant account access.

## 2. Prepare your Meta account credentials

Use your own Meta app and dedicated test assets first. Obtain tokens through Meta's authorized developer/business flows. Never use your Facebook or Instagram login password as an API token.

| Service | Required example variables | Meaning |
|---|---|---|
| Facebook | `FB_PAGE_ID`, `FB_PAGE_TOKEN` | The Page and a Page access token authorized for the intended features |
| Instagram | `IG_ACCOUNT_ID`, `IG_ACCESS_TOKEN` | Professional-account ID and token matching its authentication path |

The generated Instagram config selects **Instagram Login**, `IG_AUTH_PATH=ig-login`. A Facebook Login token needs the corresponding `fb-login` configuration and app setup; do not interchange tokens blindly. Consult the retained [Instagram auth guide](../instagram-mcp/docs/auth.md) and [Facebook environment catalog](../facebook-mcp/.env.example) for advanced configuration. Their historical write-policy descriptions are superseded by the root hardening policy.

Use limited account/asset permissions and protect tokens with your organization's approved secret manager. Codex, Claude Code and Cursor examples reference environment variables; the app process must receive them when it starts. VS Code uses masked input prompts. Claude Desktop's generic JSON template requires a protected local credential-injection arrangement; it does not implement environment interpolation or encryption for you.

For a temporary CLI session, PowerShell **7.1+** can prompt without putting token values in command history:

```powershell
$env:FB_PAGE_ID = Read-Host "Facebook Page ID"
$env:FB_PAGE_TOKEN = Read-Host "Facebook Page token" -MaskInput
$env:IG_ACCOUNT_ID = Read-Host "Instagram professional account ID"
$env:IG_ACCESS_TOKEN = Read-Host "Instagram access token" -MaskInput
```

Or in **Bash**, with echo disabled for the token inputs:

```bash
read -r -p 'Facebook Page ID: ' FB_PAGE_ID
read -r -s -p 'Facebook Page token: ' FB_PAGE_TOKEN; printf '\n'
read -r -p 'Instagram professional account ID: ' IG_ACCOUNT_ID
read -r -s -p 'Instagram access token: ' IG_ACCESS_TOKEN; printf '\n'
export FB_PAGE_ID FB_PAGE_TOKEN IG_ACCOUNT_ID IG_ACCESS_TOKEN
```

Then launch the relevant CLI from that same terminal. These values last for that process/session, not new unrelated terminals. GUI apps already running do not receive newly set variables: fully quit them and launch through an approved environment-injecting launcher. Do not use permanent machine-wide variables as a shared company vault. You only need variables for the service you enable; remove the unused server entry.

## 3. Generate the right client format

Run the direct Node command from this repository. It prints only configuration with absolute paths to your own Node executable and built server launchers. It never reads or prints token values and never changes a client's configuration. Review and merge output; do not overwrite existing settings.

### Codex local app, CLI and IDE

```sh
node scripts/print-config.mjs --client=codex
```

Merge the TOML output into your user `~/.codex/config.toml` (`%USERPROFILE%\.codex\config.toml` on Windows). The generated `env_vars` forwards the four named variables from the client process; static `.env` tables contain only policy settings. Existing server names must be merged rather than duplicated. Restart/reload the client and inspect `/mcp` or `codex mcp list`.

The local app's MCP settings can also register STDIO servers using the generated executable/argument paths. This local recipe does not configure a cloud executor. Source: [official OpenAI MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

### Claude Code

```sh
node scripts/print-config.mjs --client=claude-code
```

Merge the JSON into `.mcp.json` at the root of the project where you use Claude Code. Its `${VARIABLE}` references resolve from the Claude process environment. Start `claude` in that project, review the project-server trust prompt and use `/mcp` to inspect connections. `claude mcp list` provides CLI diagnostics. The generated absolute paths are machine-specific; other contributors must regenerate them. Keep personal config outside this public source tree, or in an ignored local working project. Source: [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp).

### Claude Desktop

```sh
node scripts/print-config.mjs --client=desktop
```

In Claude Desktop open **Settings → Developer → Edit Config** and merge the `mcpServers` entries. The documented file locations are `%APPDATA%\Claude\claude_desktop_config.json` on Windows and `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS. Fully quit/restart Claude and inspect its available tools.

`<SET_...>` values are deliberately nonfunctional placeholders. Supply IDs and tokens through protected local configuration or your approved secret-injecting launcher. For environment injection, remove the four placeholder credential keys from each relevant entry's `env` so they do not override the injected variables; keep the static policy settings. If you choose literal secrets in the private config, that is plaintext storage: restrict OS access, exclude it from sync and never commit it. Do not assume `${VAR}` expands in Desktop just because Claude Code supports it. Source: [MCP local-server guide](https://modelcontextprotocol.io/docs/develop/connect-local-servers).

### Cursor

```sh
node scripts/print-config.mjs --client=cursor
```

Merge output into user `~/.cursor/mcp.json`; a project's `.cursor/mcp.json` is another supported location. This format references `${env:VARIABLE}`. Restart/reload Cursor and inspect MCP tools/settings. Launch it with the required environment, or use your approved credential integration. Source: [Cursor MCP documentation](https://cursor.com/docs/mcp).

### VS Code / GitHub Copilot

```sh
node scripts/print-config.mjs --client=vscode
```

Use **MCP: Open User Configuration** in the Command Palette and merge the `servers` and `inputs` output. A project `.vscode/mcp.json` is an alternative. Start the servers from the MCP controls and enter IDs/tokens when prompted; token inputs are masked. This schema uses `servers`, not `mcpServers`. Use the agent/tool UI to verify discovery. Source: [VS Code MCP configuration reference](https://code.visualstudio.com/docs/agents/reference/mcp-configuration).

### Other clients and compatibility

Any client implementing a compatible **local stdio MCP tools** protocol can attempt to launch the same two Node commands. `node scripts/print-config.mjs` supplies generic command/args/env entries to adapt to its schema. The project does not assert universal client/version compatibility, especially across SDK/protocol versions. A client that can read tools may still lack human form elicitation required for writes.

| Capability | Required client behavior |
|---|---|
| Local discovery and reads | Start a stdio subprocess, negotiate MCP and call tools |
| Publishing/moderation/other mutations | Above, plus faithfully display and obtain per-call human form approval |
| Local filesystem media | Facebook media-directory controls and access to the same local machine/files |
| Browser/cloud-only client | Cannot execute a laptop's local Node path directly; requires separately designed remote hosting/bridge |

No public hosted endpoint, marketplace plugin, unattended write bypass or browser-only ChatGPT/Claude integration is included. Optional authenticated loopback HTTP is for local clients; see the source configuration catalogs before using it.

## 4. Verify read-only operation first

After restarting the client, verify both server names appear (or only your chosen service). Ask it to list available tools, then request account diagnostics or a small media/Page read. Check that the reported account is your intended test asset. A token without the required Meta permissions can connect to MCP yet fail an API call.

The supplied configurations hide write packages. Missing publishing tools are expected. To enable writes, follow [Enabling writes deliberately](../README.md#enabling-writes-deliberately): add the appropriate packages, retain plan/preview policy, configure a private writable audit path, and test human approval. `apply:true` alone is insufficient; Facebook also needs the matching preview plan ID. Never disable confirmation to work around an unsupported client.

## Troubleshooting

| Symptom | Check |
|---|---|
| Invalid JSON/TOML | Copy direct Node output only, merge wrapper keys correctly, avoid duplicate tables |
| Node/file not found | Run `npm run setup`; regenerate config after moving the folder or changing Node |
| Missing token/wrong account | Set variables in the process that launches the client; verify IDs and auth path |
| MCP connected but Meta returns permission errors | Check token validity, app permissions, account type and authorized assets |
| Write refused / no approval support | Keep reads enabled; select a client/version supporting human form elicitation |
| Audit intent refused | Correct private-directory permissions or archive a full log before retrying |
| Error after an external mutation | Check actual account state and the audit outcome before retrying |
| Protocol negotiation fails | Record client/server versions and sanitized stderr; do not report tokens |

See [HARDENING.md](../HARDENING.md), [SECURITY.md](../SECURITY.md), and [VALIDATION.md](../VALIDATION.md) for remaining limits and safe reporting.
