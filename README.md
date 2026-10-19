# Secure Meta MCP — hardened source distribution

Facebook Pages and Instagram professional-account MCP servers in one repository, with conservative defaults and security regression tests.

This is an independent, modified distribution of Ivan Baev's MIT-licensed projects. It is not affiliated with Meta or endorsed by the upstream author. **“Hardened” describes specific controls, not a security certification.** Live company-account operations have not been validated by this project.

## Download and build

Requirements: Git, npm 11, Node.js 22.22.0 or newer, and your own Meta app/account credentials. Start with a dedicated test Page/account. Instagram requires a Business/Creator account and the relevant Meta API permissions.

After publishing this repository on GitHub, replace `YOUR_USERNAME` below with your GitHub name and use the actual repository name if you choose a different one:

```sh
git clone https://github.com/YOUR_USERNAME/secure-meta-mcp.git
cd secure-meta-mcp
npm run setup
npm test
npm run audit
```

`setup` installs each component's exact lockfile with lifecycle scripts disabled, then explicitly builds both servers. It does not log in, start a server, publish content, or request Meta credentials. A normal `npm install` in the parent does not install the child components; use `npm run setup`.

Download ZIP is also supported: extract it, open a terminal in the extracted folder and run the same npm commands. No global installation, `npx` download, Python, Docker or nested Git submodules are required.

## Connect an MCP client

```sh
npm run config
```

This prints example configuration using your machine's absolute Node/server paths. It emits placeholders, never your environment secrets. Copy the two `mcpServers` entries into your client's supported MCP configuration. Replace account IDs and **inject credentials through your client's approved secret store or an environment-injecting secret manager**. Do not commit filled configuration JSON, paste tokens into chat, or put secrets on command-line arguments.

If you only need one service, configure only that entry. The commands run local compiled files from this repository, not the similarly named upstream npm packages.

| Service | Local executable | Default tool access |
|---|---|---|
| Facebook | `node /absolute/path/secure-meta-mcp/facebook-mcp/bin/facebook-mcp.mjs` | Account diagnostics, reading and insights |
| Instagram | `node /absolute/path/secure-meta-mcp/instagram-mcp/bin/instagram-mcp-ai.cjs` | Read-only reader profile |

The generator uses stdio. HTTP is optional, loopback-only and authenticated. Instagram HTTP requires a separate `IG_HTTP_TOKEN` of at least 32 characters; Facebook also requires its separate HTTP bearer credential. Neither is your Meta access token. Do not expose a raw MCP HTTP listener to the public internet.

## What changed

- **Read-only by default:** write packages are not exposed in the initial configuration.
- **No environment-authorized writes:** omitted/false `apply` always previews. Global apply mode cannot authorize a mutation.
- **Human approval for every write:** if the client cannot display MCP form elicitation, or the operator declines/cancels, writes refuse. There is no password fallback.
- **Facebook plan binding:** all write tiers require a prior matching plan ID, not only destructive/spend operations. Plans expire, bind to parameters/account and cannot be reused after application.
- **Full Instagram request review:** approval receives complete validated tool arguments, including comment/reply text and exact asset URLs. Oversized review content is refused rather than silently truncated.
- **Full Facebook parameter review:** approval includes the full planned parameters and Page ID, in addition to the summary. Existing local-media hashing/containment and state-divergence checks from the newer upstream source are retained.
- **Audit before mutation:** a durable authorization-intent record must be written before the mutation callback runs. Instagram reports outcome-audit failures explicitly without pretending a successful external write failed.
- **No ambient Instagram project `.env`:** configuration no longer comes from an arbitrary current working directory. Use injected variables or a deliberately selected protected config path.
- **No silent plaintext credential persistence:** Instagram credential-file writes require `META_ALLOW_PLAINTEXT_CREDENTIALS=true`. Facebook setup-token defaults to no-write unless the same deliberate opt-in is supplied.
- **Bounded Facebook responses:** Graph/proxy bodies are streamed with a 5 MiB ceiling instead of unbounded buffering.
- **Patched, exact dependency locks:** direct versions are pinned and both development and production graphs are audited.
- **Local source distribution:** old upstream marketplace launchers were removed; historical registry/bundle manifests are reference material under `docs/upstream-packaging/`. Child packages are private to prevent accidental publishing under the upstream npm names.

See [the original baseline audit](docs/BASELINE-AUDIT.md) and [HARDENING.md](HARDENING.md) for the finding-to-change mapping and residual risks, and [UPSTREAM.md](UPSTREAM.md) for source commits and licenses.

## Enabling writes deliberately

Read-only mode is useful for unsupported clients. **There is no insecure approval bypass to make publishing work on a client without form elicitation.**

For Instagram, an operator can select `IG_TOOL_PACKAGES=publisher`, set the correct `IG_ACCOUNT_ID`, keep `IG_WRITE_MODE=preview` and keep `IG_ALLOW_DESTRUCTIVE=false`. For Facebook, an operator can select `FB_TOOL_PACKAGES=publisher` and remove the example `FB_PACKAGES_READONLY=all` restriction only after reviewing the selected capabilities. Keep `FB_WRITE_MODE=plan`. Configure a private writable audit path and limited asset-scoped Meta tokens.

An explicit `apply:true` request still requires human approval. Facebook first returns a plan; its apply call must include that matching `plan_id`. Instagram confirms the exact request within that call. Approval is not cached for another call. Enabling tool packages does not grant missing Meta API permissions.

Before accepting an approval, independently check the account/Page, full text, exact asset and intended audience. Asset URLs should be immutable and company-controlled: approving a URL is not a guarantee that a third party will serve the same image later. The terminal/UI must be trusted; prompt-injection fences do not make a compromised client safe.

## Credentials and audit storage

Prefer client/secret-manager injection. The project does not provide its own OS keychain backend. The opt-in plaintext CLI paths remain available for a single-user development environment, but **they do not encrypt credentials**. If you opt in, protect the directory with owner-only POSIX permissions or a verified Windows NTFS ACL, exclude it from sync/backup exposure and never place it in the repository.

Instagram's audit log stops accepting new records at 5 MiB; archive it through your logging process before it fills. Both servers refuse a new write when the pre-mutation audit intent cannot be recorded. If the final audit append fails after a mutation, reconcile the existing intent and actual account state before doing anything again. Local logs are not an independently tamper-proof company audit service or proof of an operator's legal identity.

## Tests and maintenance

```sh
npm test          # builds both and runs hardened security regression tests
npm run audit     # checks both complete dependency lockfiles, including dev tools
npm run check     # build + security tests + dependency audit
```

These commands never need Meta credentials. Security tests forbid live fetch and use synthetic data/fake mutation callbacks. Retained upstream tests contain assumptions about the former policies; only the documented hardened regression suite and selected compatible boundary suites establish this distribution's validation status. The entire upstream test corpus has not been ported to the new policy.

No live Meta permission, account-publishing or advertising-spend certification is implied by a passing offline suite. Test your specific auth path and client on dedicated assets before company use. Review dependencies regularly; a clean audit on one date does not guarantee future safety.

See [VALIDATION.md](VALIDATION.md) for the dated test counts, audit results and the Windows symlink-test limitation.

## Publish your copy to GitHub

This source folder is prepared as a Git repository. Create an **empty** GitHub repository, then run these commands from this folder, replacing the placeholders:

```sh
git remote add origin https://github.com/YOUR_USERNAME/secure-meta-mcp.git
git push -u origin main
```

If starting from a downloaded source ZIP rather than this prepared Git folder, first run `git init -b main`, `git add .`, and `git commit -m "feat: add hardened Meta MCP distribution"`. Set your Git author identity if Git requests it. Then add your remote and push. Inspect staged files before publishing. `.gitignore` excludes dependencies, builds, local config, token files and audit logs; it cannot detect every possible secret.

Keep the upstream MIT license files and [NOTICE](NOTICE). Enable GitHub secret scanning/private vulnerability reporting if available for your repository. This project has no configured remote and is not automatically published anywhere.
