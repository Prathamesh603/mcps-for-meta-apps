> Historical baseline: this audit covers upstream artifacts BEFORE the changes in this repository. See ../HARDENING.md and ../VALIDATION.md for this distribution. Audit dependency counts and execution boundaries below describe that earlier phase only.

# Facebook MCP and Instagram MCP — security review

**Review date:** 19 October 2026 (India time). **Decision:** do not approve either project unchanged for unattended writes to company accounts. Facebook's published npm release should not be used with local uploads enabled. A restricted read-only pilot is a materially safer option, subject to the deployment controls below.

**Malware conclusion:** I found no affirmative evidence of a deliberate credential-stealing backdoor, command-and-control client, miner, ransomware, or hidden runtime shell executor in the first-party code and package artifacts examined. That is an evidence-bounded conclusion, not a guarantee that these projects, their dependencies, future versions, or your installed copy are malware-free. I did find security defects and important authorization weaknesses. An apparently well-intentioned project can still be unsafe for a business account.

## 1. What was reviewed

| Item | Facebook | Instagram |
|---|---|---|
| Repository | `IvanBBaev/facebook-mcp` | `IvanBBaev/instagram-mcp` |
| Current cloned commit | `ee79b3a16235deed305559ac4e83cd9dd9b46583` | `3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b` |
| Current package.json version | `0.7.0` | `0.8.0` |
| npm package examined | `@ivanbaev/facebook-mcp@0.7.0` | `instagram-mcp-ai@0.8.0` |
| npm declared source commit | `759675c359f78a93d4d3ab9ab14793a6c3bede0b` | `8065df3fc97f749a730df6833ac41e26f74be85c` |
| Published JS modules matched to declared source | **45 / 45** | **43 / 43** |
| Production dependency entries in repository lockfile | 94 | 7 |
| All dependency entries, excluding root | 282 | 153 |
| npm-audit production package findings | **6** | **0** |
| npm-audit all-dependency package findings | **8** | **0** |

The dependency counts count installed package locations, not necessarily distinct names. The Facebook source inventory contains 59 non-test TypeScript files, including internal support modules; Instagram contains 43. These counts describe inventory, not a claim that every line or dependency implementation received exhaustive manual inspection.

**Methods actually performed:** clone without submodules; inventory entry points, imports, execution sinks, network calls, configuration, manifests and release workflows; manually trace security-sensitive authorization, media upload, HTTP, OAuth and redaction paths; inspect both npm archives without installing them; verify archive SHA-512 against registry metadata; transpile every shipped first-party JavaScript module from its declared Git commit and compare lexical tokens; query npm audit for production and full lockfiles; inspect relevant primary advisories; run 15 targeted offline probes using synthetic inputs.

The lexical comparison ignores comments and whitespace. It is stronger than comparing filenames but is not a complete reproducible build or an independent compiler verification. Launcher/manifest inspection supplements the module comparison; it does not compare every declaration file or README byte.

**Boundaries:** no real Facebook/Instagram tokens were used; no live Graph API account changes, spend, messages, uploads or publishing were attempted. No npm dependencies were installed, no repository lifecycle/build/release scripts were run, and neither complete MCP server was started. Reviewed gate/helper modules were executed in a purpose-built offline harness, with synthetic credentials, a rejecting fetch stub and fake mutation callbacks. One junction test needed permission to create a local junction within the audit workspace. This is a targeted source/artifact security assessment, not a full penetration test, antivirus certification or vendor background check.

## 2. Most important release discovery

Facebook's npm `0.7.0` is **not the current GitHub source**, even though current package.json still says `0.7.0`. The published build points to `759675c…`; the cloned head is `ee79b3a…`. Forty-four source files corresponding to the 45 shipped JS modules differ between that release and current head. Some differences are comments, but important executable security changes also exist, including media containment and loopback checks confirmed below.

Instagram's npm `0.8.0` maps to `8065df3…`. The current head differs in four documentation files; no source files corresponding to its 43 shipped JS modules differ.

**Implication:** approving the current Facebook repository does not approve the bytes installed by `npx @ivanbaev/facebook-mcp`. Security fixes in main cannot repair an already published tarball. A company needs an internally approved build from an exact commit, or a new reviewed upstream release.

Both downloaded tarballs matched their registry integrity digests. Both registry responses contained publication and SLSA provenance statements whose source commits agreed with package metadata. I decoded and inspected those statements; I did **not** independently validate their Sigstore certificate chain/transparency proof. Provenance is evidence about origin, not proof of benign intent.

## 3. Findings and risk register

Severity below is contextual business risk, not a claimed CVSS score. “Confirmed” identifies a tested behavior or a directly traced code path; it does not imply a live account exploitation.

| ID | Priority | Affected surface | Finding |
|---|---|---|---|
| F01 | High | Facebook npm release | Ancestor-directory swap bypasses local-media containment |
| F02 | High | Instagram source + npm | Human confirmation is optional; model-supplied apply can be sufficient |
| F03 | High | Facebook source + npm | Moderation defaults to apply; even explicit apply:false does not force preview |
| F04 | Medium | Instagram source + npm | Human approval omits exact comment text and only partially describes publishing content |
| F05 | Medium | Facebook source + npm | Fallback operator token is reusable across unrelated actions/plans |
| F06 | Medium, conditional | Instagram source + npm | Ambient working-directory .env can change security policy |
| F07 | Medium, opt-in HTTP | Instagram source + npm | Loopback HTTP can expose all tools without authentication |
| F08 | Medium, deployment | Both | CLI credentials are plaintext files; Windows ACL protection is external |
| F09 | Medium, governance | Instagram | Audit journal failure does not fail or visibly qualify successful writes |
| F10 | Medium | Facebook npm release | State is not rechecked after human confirmation |
| F11 | Medium, supply chain | Both installation paths | Dependency ranges and unpinned launch/build components weaken reproducibility |
| F12 | Maintenance gate | Facebook lockfile | Known vulnerable dependency versions remain; exploitability varies |

### F01 — Facebook npm local-media containment can be bypassed

**Evidence:** [release source, readResolvedLocalPhoto](https://github.com/IvanBBaev/facebook-mcp/blob/759675c359f78a93d4d3ab9ab14793a6c3bede0b/src/api/media-photos.ts#L670). Shipped file: `build/api/media-photos.js`, lines 434–465. Current mitigation: [assertHandleStillContained](https://github.com/IvanBBaev/facebook-mcp/blob/ee79b3a16235deed305559ac4e83cd9dd9b46583/src/api/media-photos.ts#L799).

The release resolves a media path and checks that it is inside `FB_MEDIA_DIR`, then later opens it. Its `O_NOFOLLOW` flag protects the final component on platforms supporting that flag, but it does not protect ancestor directories. Between validation and open, an attacker able to change an ancestor below the allowed directory can replace it with a symlink/junction pointing elsewhere.

**Offline result:** after a controlled parent-junction swap, the exact published read helper returned `OUTSIDE_SYNTHETIC` from a file outside the allowed media directory. The current GitHub containment helper rejected that same swapped path. Only synthetic workspace files were involved; no company file was read or uploaded. The test isolates the post-validation read helper; an attacker against the complete tool would also need to win the timing window or otherwise control the relevant filesystem path.

**Prerequisites:** local uploads enabled; attacker or untrusted process can modify the relevant nested media-directory path; a read/upload is triggered; target readable by the MCP process. This is not an unauthenticated remote file-read endpoint and not arbitrary remote code execution. In a shared writable media dropbox, however, the weaker local actor may be able to make a more privileged publishing process read outside its intended boundary. An upload path could then send those bytes to Meta or fail after reading them, depending on content and the API's validation.

**Fix:** do not enable local uploads in the audited npm release. Use a reviewed release containing the current handle/path identity checks, keep the media directory private and separate from secrets, and retest the complete upload path. The current checks improve this specific case; this review does not claim immunity to every filesystem race.

### F02 — Instagram does not require a human approval channel

**Evidence:** [withWriteGate](https://github.com/IvanBBaev/instagram-mcp/blob/3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b/src/mcp/write-mode.ts#L593), especially lines 599–646; [client capability detection](https://github.com/IvanBBaev/instagram-mcp/blob/3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b/src/mcp/registry.ts#L336).

The gate requests human confirmation only if the connected client advertises supported form elicitation. If it does not, `apply:true` reaches the mutation callback without human approval. A preview is optional, not a required stored, action-bound plan. Therefore a model with tool access can move directly from reading an adversarial caption/comment to issuing a write, if the client itself does not enforce an independent approval policy.

**Confirmed:** with a confirmer reporting unsupported, `apply:true` ran one fake mutation. With a supporting confirmer returning decline, no mutation ran. The implementation handles explicit denial correctly; the weakness is what happens when the approval channel is unavailable.

There is an additional destructive-action surprise: with `IG_WRITE_MODE=apply` and `IG_ALLOW_DESTRUCTIVE=true`, a delete intent with **no per-call apply field** also ran in the offline probe. The tool description says deletion requires `apply:true` plus the destructive flag, but the shared gate accepts global apply mode instead. [Delete-tool description and handler](https://github.com/IvanBBaev/instagram-mcp/blob/3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b/src/tools/comments.ts#L721).

**Impact:** unauthorized posts/replies/moderation if a model is misdirected; deletion where both global flags were enabled. This does not grant permissions absent from the Meta token and does not prove a prompt injection succeeds against every model.

**Fix:** introduce a company policy that fails closed when confirmation is unavailable; require immutable plan-bound approval for writes; require explicit per-call apply for deletion regardless of global mode. Until then, expose only read tools to unattended agents and keep destructive permission off.

### F03 — Facebook moderation is apply-first, including apply:false

**Evidence:** [moderation package default](https://github.com/IvanBBaev/facebook-mcp/blob/ee79b3a16235deed305559ac4e83cd9dd9b46583/src/tools/moderation.ts#L1309), [write-mode resolution](https://github.com/IvanBBaev/facebook-mcp/blob/ee79b3a16235deed305559ac4e83cd9dd9b46583/src/mcp/registry.ts#L86), [authorize](https://github.com/IvanBBaev/facebook-mcp/blob/ee79b3a16235deed305559ac4e83cd9dd9b46583/src/mcp/write-mode.ts#L126), [explicitly documented apply semantics](https://github.com/IvanBBaev/facebook-mcp/blob/ee79b3a16235deed305559ac4e83cd9dd9b46583/src/tools/shared.ts#L197).

Moderation declares `writeModeDefault:'apply'`. That covers public replies, hiding, blocking and unblocking classified as reversible. If the global write mode was not explicitly supplied, this package default overrides the general plan-mode default. The authorization condition is `explicit || defaultWriteMode === 'apply'`; it does not treat `apply:false` as a veto.

**Confirmed:** a reversible authorization request with `apply:false` and effective apply mode returned `mode:'apply'`. This is documented behavior, not a hidden backdoor or a newly discovered violation of its own apply-argument contract. It is nevertheless a poor default for a company agent. Reading the result afterward is too late to make a public reply private again; deleting it later cannot erase screenshots or notifications.

**Impact:** an agent trying to inspect an operation can inadvertently publish a reply or block a customer. Prompt-injected comments increase the importance of a hard approval boundary. Destructive and spend tiers still have additional gates; this finding does not mean ad spending is automatically enabled.

**Fix:** explicitly set `FB_WRITE_MODE=plan` in a trusted launch environment; better, remove write tools for read-only deployments. Patch explicit false to force preview, and require human approval for customer-visible mutations regardless of reversibility.

### F04 — Instagram approval prompts cannot establish exact content approval

**Evidence:** [reply intent](https://github.com/IvanBBaev/instagram-mcp/blob/3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b/src/tools/comments.ts#L569), [new-comment intent](https://github.com/IvanBBaev/instagram-mcp/blob/3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b/src/tools/comments.ts#L609), [caption excerpt](https://github.com/IvanBBaev/instagram-mcp/blob/3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b/src/tools/publishing.ts#L178), [post-image details](https://github.com/IvanBBaev/instagram-mcp/blob/3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b/src/tools/publishing.ts#L808).

Reply/comment intents include the target ID but omit `args.message`. The API receives the message separately. The confirmation builder cannot display text it never receives. For composite publishing, the prompt describes media hosts/counts and a caption excerpt capped at 200 code points, not the exact media path or full caption. Low-level container creation provides even less content context. Confirmation details are also capped by the prompt renderer.

**Attack scenario:** the operator approves “reply to comment 123” without seeing the actual offensive, confidential or misleading reply. Two images on the same host can produce equivalent host-level summaries. A harmful caption suffix can fall outside the excerpt. This finding concerns what the tool-generated approval proves; a client UI that independently displays full arguments can reduce the risk.

**Fix:** show complete normalized outbound text, exact asset identifiers and a media preview through a trusted UI; bind approval to a canonical hash of all actual parameters. If content must be truncated in chat, provide a complete review artifact before asking for approval. Do not label partial review as approval of exact content.

### F05 — Facebook operator-token fallback is a reusable secret

**Evidence:** [createConfirmer and token comparison](https://github.com/IvanBBaev/facebook-mcp/blob/ee79b3a16235deed305559ac4e83cd9dd9b46583/src/mcp/confirm.ts#L130).

The fallback compares per-call `confirm_token` with a global `FB_CONFIRM_TOKEN`. It is not signed over the tool, plan ID, parameters or a one-time nonce. The server accepts the same matching token again on an unrelated plan. Constant-time comparison is implemented, but that does not make the authorization action-specific.

**Confirmed:** one synthetic token approved two unrelated synthetic plan requests. No real token was involved. This applies to the operator-token fallback, not a functioning human elicitation flow.

**Impact:** if the operator pastes this secret into model-visible conversation or it leaks to a tool caller, possession can authorize later high-impact requests. The attacker still needs tool access, valid plans and token-granted permissions.

**Fix:** keep confirmation secrets out of model context; use trusted client-mediated approval or short-lived, single-use approvals bound to the exact plan and account. Do not describe this fallback as an intrinsically one-action credential.

### F06 — Instagram trusts an ambient .env in its working directory

**Evidence:** [loadEnvFiles](https://github.com/IvanBBaev/instagram-mcp/blob/3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b/src/index.ts#L110), especially lines 168–180.

Unless `IG_ENV_FILE` explicitly selects a file, startup loads a per-user config file and then `process.cwd()/.env`. Existing environment values win, but missing settings can be supplied by that working-directory file. For example, a trusted token supplied by the MCP client can coexist with `IG_WRITE_MODE=apply` supplied by an untrusted project directory if the launch environment did not pin write mode.

**Prerequisites:** an attacker can place/edit `.env` in the directory from which the MCP process starts, and relevant security settings are not already supplied by a more trusted source. This is configuration poisoning, not a claim that dotenv itself executes shell code. This server explicitly uses non-fast parsing options; no shell expansion backdoor was established.

**Impact:** a project file can influence write policy, active account selection or tool exposure. It need not contain the company token itself to weaken how an already available token is used.

**Fix:** set an absolute `IG_ENV_FILE` pointing to a protected per-user file, explicitly pin policy settings in the launcher, and use a fixed trusted working directory. Consider removing ambient CWD loading or allowing only a narrow set of non-security settings from it.

### F07 — Instagram's opt-in HTTP mode permits no authentication on loopback

**Evidence:** [HTTP bind/auth checks](https://github.com/IvanBBaev/instagram-mcp/blob/3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b/src/mcp/transport.ts#L375), [request handler](https://github.com/IvanBBaev/instagram-mcp/blob/3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b/src/mcp/transport.ts#L481), [CLI host validation](https://github.com/IvanBBaev/instagram-mcp/blob/3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b/src/core/settings.ts#L318).

If HTTP transport is selected and `IG_HTTP_TOKEN` is unset, loopback startup is allowed with a warning. Any local process able to reach that socket can attempt the exposed tools; it does not need the Meta credential because the server supplies it. Localhost is a location restriction, not user authentication.

Important qualification: normal CLI settings **reject non-loopback IG_HTTP_HOST**. The lower-level transport function can accept a token-protected non-loopback address when embedded, but that is not the ordinary CLI configuration. This is not a finding that the default server exposes itself unauthenticated to the internet. Stdio is the default. Host/origin defenses are also configured, reducing browser-based attack paths; no browser-origin bypass was demonstrated.

**Fix:** prefer stdio. If HTTP is necessary, require a strong separate HTTP bearer token, retain loopback binding, control local-user/process access, and authenticate any reverse proxy. Do not expose raw HTTP externally. Both projects use a shared service credential model rather than per-user company RBAC.

### F08 — Credential-at-rest protection depends on deployment

**Evidence:** [Instagram credential writer](https://github.com/IvanBBaev/instagram-mcp/blob/3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b/src/core/config-write.ts#L901), [Facebook atomic writer / Windows qualification](https://github.com/IvanBBaev/facebook-mcp/blob/ee79b3a16235deed305559ac4e83cd9dd9b46583/src/core/config.ts#L257).

CLI login/configuration paths persist access tokens and app secrets as dotenv text. POSIX modes are restricted; Windows uses inherited NTFS permissions rather than implementing vault encryption or an owner-only DACL itself. The Instagram plugin manifest marks its client-provided token sensitive and describes keychain storage, but that is a client integration property. It does not turn CLI `.env` persistence into OS-keychain storage.

**Impact:** readable config directories, shared Windows profiles, backups, sync folders and same-user malware can expose credentials. A normal private `%APPDATA%` location can be reasonably ACL-protected; plaintext storage alone does not prove another Windows user can read it. I did not inspect your actual credential files or their ACLs during this audit.

**Fix:** inject secrets from a company-controlled vault or approved client secret store; isolate the process identity; verify Windows ACLs explicitly; avoid synced/shared folders; restrict backup access; use limited asset-scoped tokens and a rotation/revocation procedure. File permissions do not protect against code already running as that same account.

### F09 — Instagram writes can succeed without an audit record

**Evidence:** [journal append and catch](https://github.com/IvanBBaev/instagram-mcp/blob/3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b/src/mcp/write-mode.ts#L145), [mutation before journaling](https://github.com/IvanBBaev/instagram-mcp/blob/3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b/src/mcp/write-mode.ts#L646).

The journal is best-effort and written after `perform()`. An append failure logs a warning, then the successful tool result is returned. There is no journal-status field added to that result. Existing file modes are not repaired by the creation-only `mode` option, and this file contains no rotation mechanism. Rejected/failed attempts are not uniformly recorded by this success-path journal.

**Confirmed:** directing the synthetic journal at a directory caused an append warning, while one fake mutation ran and its success result was returned unchanged.

**Impact:** no reliable record of who authorized what, or proof of every attempted action, for incident investigation. This is a governance/operational weakness, not evidence of intentional audit evasion. Facebook's current implementation provides richer outcomes and journal status, but its local file is also not a tamper-proof external audit service.

**Fix:** durably record an intent before mutation; record final outcome afterward; surface journal health in the tool result and monitoring; centralize append-only audit records with an independent access boundary. Decide explicitly whether missing audit capacity blocks new writes. Do not throw a misleading “write failed” after a successful external mutation.

### F10 — Facebook release has a confirmation-time state race

**Evidence:** [released gate state read and confirmation](https://github.com/IvanBBaev/facebook-mcp/blob/759675c359f78a93d4d3ab9ab14793a6c3bede0b/src/mcp/write-mode.ts#L419), [current second read](https://github.com/IvanBBaev/facebook-mcp/blob/ee79b3a16235deed305559ac4e83cd9dd9b46583/src/mcp/write-mode.ts#L712).

The published gate checks before-state, waits for human confirmation, then performs. Another actor or process can alter the object during that wait. The source now performs a second state read after approval.

**Confirmed:** a fake spend-state changed from 1 to 2 during the confirmer callback, and the released gate still performed the fake mutation planned against state 1. This is a gate-level test, not a live Ads Manager exploit. A malicious actor needs another route to change the object, or legitimate concurrent activity must occur.

**Fix:** deploy the updated post-confirmation divergence check and keep money-related writes disabled until end-to-end sandbox testing. A second read narrows the race but does not make a read-then-write sequence atomic against Meta; use conditional operations/version checks where the platform supports them.

### F11 — Installation and release paths do not all freeze reviewed bytes

**Evidence:** [Facebook plugin launcher](https://github.com/IvanBBaev/facebook-mcp/blob/ee79b3a16235deed305559ac4e83cd9dd9b46583/.claude-plugin/plugin.json#L23), [Instagram release workflow](https://github.com/IvanBBaev/instagram-mcp/blob/3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b/.github/workflows/release.yml#L40), [Instagram bundle builder](https://github.com/IvanBBaev/instagram-mcp/blob/3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b/scripts/build-mcpb.sh#L13).

Facebook's plugin launches `npx -y @ivanbaev/facebook-mcp` without a version. Its behavior depends on resolution/cache state and what npm currently publishes. Instagram's plugin pins `0.8.0`, which is better, but dependencies in package.json still use ranges. Neither inspected package tarball includes its repository package-lock, so a consumer's fresh dependency resolution is not inherently the dependency graph whose lockfile I audited. A company can solve this with its own approved lockfile/artifact.

Instagram's release workflow references mutable `actions/checkout@v7` and `actions/setup-node@v7` rather than full commit SHAs. Its bundle builder runs `npx @anthropic-ai/mcpb@2`, pinning a major rather than exact bytes. It uses a stored NPM_TOKEN for publishing. These are supply-chain opportunities if an upstream action/package or publisher credential is compromised, not evidence that a compromise happened. Facebook's current release workflow is more defensive: SHA-pinned actions, restricted permissions, ignored install scripts in privileged publish/bundle stages, and provenance steps. Its earlier published workflow is a separate historical artifact.

**Fix:** install a reviewed exact artifact from an internal registry; freeze runtime dependencies with a reviewed lockfile; use `npm ci --ignore-scripts` for controlled staging; pin action/tool commits or exact versions and verify digests; use short-lived publishing identity; require review for dependency updates. Pinning only the top-level package is insufficient.

### F12 — Facebook's lockfile has known dependency vulnerabilities

The production audit returned six affected package entries: one critical, two high and three moderate. The full audit returned eight: one critical, four high and three moderate. Instagram returned zero for both production and full audits. Audit exit codes indicating findings were preserved; the scan completed rather than failing to contact the service. Both repository lockfiles are unchanged between the examined npm source commit and current head.

| Locked Facebook dependency | Registry severity | Review of relevance |
|---|---|---|
| `@modelcontextprotocol/sdk` 1.29.0 | High | [OAuth credential-destination advisory](https://github.com/advisories/GHSA-6qxp-vccf-f47h) explicitly excludes MCP servers and stdio clients. Present but not an established exploit of this server. Update for hygiene. |
| `proxy-addr` 2.0.7 | Critical | [Trust-subnet/IP-spoofing advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) requires an affected proxy trust configuration. This server's first-party HTTP wrapper uses native Node HTTP and bearer checks; I found no first-party Express trust-proxy setup. Do not relabel the whole MCP “critical remote takeover.” |
| `fast-uri` 3.1.6 | High | Authority/host parsing issues. [Primary advisory](https://github.com/advisories/GHSA-qw65-cvwx-89v3). First-party Graph destinations use Node URL construction and fixed Meta hosts; no bypass via this dependency was demonstrated. |
| `hono` 4.13.5 | Moderate | Audit finding concerns JSX escaping; no first-party JSX page rendering path found in the MCP server. |
| `ip-address` 10.5.0 | Moderate | Classification and resource-consumption findings. First-party Graph host checks do not use this package; dependent SDK paths would need separate reachability analysis. |
| `qs` 6.15.3 | Moderate | Parsing/resource-consumption advisories; no direct exploit demonstrated through the reviewed wrapper. |

The two additional full-audit packages are development/build dependencies `brace-expansion` and `js-yaml`; their reported severities are high. They affect the build/release environment even when not shipped as runtime dependencies.

**Decision:** update and re-audit the approved deployment graph before production. Neither zero audit results nor positive audit results alone establish malware status. The raw audit JSON includes every advisory, affected range, package path and reported fix availability. The summary counts vulnerable packages, not CVEs.

## 4. Additional observations that should not be overstated

**Released Facebook loopback predicate:** its HTTP host check accepts any string starting `127.`, including a DNS name such as `127.attacker.example`. The offline predicate test accepted that name; current source correctly rejects it using literal-IP checks. This becomes dangerous only if such a name is actually configured and resolves to an address the service can bind; no network bind or remote-access exploit was performed. HTTP bearer authentication still applies. Treat this as another reason to avoid the stale release and bind a literal loopback address.

**Released Facebook exported gate:** if an embedder creates it without its optional confirmer, a high-consequence plan can reach a fake mutation without human confirmation. The normal CLI/server builder supplies a confirmer, so this is not a proven default CLI bypass. Current source requires the confirmer and refuses when absent. An offline probe confirmed the released library behavior.

**Released Facebook injected journal:** a custom Journal implementation that throws after a successful fake mutation causes the old gate to return an error, creating retry ambiguity. The default file journal itself catches I/O errors and returns a failed status; therefore the injected-Journal probe must not be misrepresented as every full-disk failure causing duplicate posts. Current gate code is more defensive.

**Facebook response buffering:** first-party HTTP/upload code uses `response.text()` without the explicit streaming byte cap present in Instagram. An unexpectedly huge Meta/proxy response could consume memory. Fixed destinations and TLS narrow the attacker prerequisites; no memory-exhaustion exploit was attempted. Add capped body reads as defense in depth.

**Approval replay and duplicates:** neither an agent's promise nor a successful dry run is a durable authorization artifact. Some non-idempotent operations deliberately avoid automatic HTTP retries, which is good, but an agent manually starting the workflow again can still duplicate public actions. No end-to-end exactly-once publishing guarantee was established.

## 5. Malware and attack-surface assessment

| Threat | Observed evidence | Conclusion / boundary |
|---|---|---|
| Hidden runtime shell execution | No `child_process`, eval/new Function or shell-spawn sink found in reviewed first-party runtime paths; development scripts do use subprocesses for build/test/package work | No first-party runtime command-execution backdoor found. Does not certify all transitive packages. |
| Credential exfiltration to author-controlled server | Examined network implementations target official Meta Graph/OAuth hosts; no first-party token collector endpoint identified | No such exfiltration found in inspected artifacts. Registry/tooling downloads are separate install-time traffic. |
| Package artifact substitution | 45 Facebook and 43 Instagram JS modules matched declared release-source transpilation; archive integrity matched metadata | No unexplained JS additions in those modules. Integrity metadata is not independent author trust. |
| Install-time payload | Neither top-level package declares preinstall/install/postinstall/prepare hooks; inspected archives contain no `.env`, credential files, native executable or binary addon under the path scan | Favorable first-party evidence. Facebook dev dependency `unrs-resolver` is flagged as having an install script in its lockfile; not first-party malware evidence. |
| Automatic persistence/mining/ransomware | No scheduled persistence installer, arbitrary encryption/deletion loop or mining/C2 runtime mechanism identified in examined first-party paths | None found; no forensic scan of the workstation was conducted. |
| Local filesystem exfiltration | Facebook reads/uploads local media; release containment race reproduced. Instagram uses public media URLs rather than local upload tools | Facebook release needs remediation; Instagram has a smaller local-upload surface. |
| SSRF/token leak through Graph URLs | Fixed destination hosts and redirect refusal; negative Instagram host/path probes passed; Facebook reconstructs paging from cursors rather than following arbitrary next URLs | Useful controls. They do not prevent the agent from intentionally publishing a public URL or text using authorized tools. |
| Indirect prompt injection | Both label/fence external text; Instagram defangs delimiter variants and escapes invisible text; Facebook uses explicit taint envelopes | Defense in depth, not enforcement of authorization. No broad model-level injection-resistance test was performed. |
| Customer-facing abuse | Publishing, replies, deletion and moderation are intentional features; Facebook adds messaging and optional ads | Limit available tools and token scopes. Legitimate functionality becomes an attack path when invoked under false instructions. |
| Company/customer-data disclosure | Tool results intentionally return account/media/comment information and Facebook conversation contents | MCP clients may forward this data to their model provider. “No telemetry” in server code does not mean all data stays on the laptop. |

Instagram's normal Graph hosts are `graph.instagram.com` and `graph.facebook.com`. Its login flow additionally uses `www.instagram.com`, `api.instagram.com` and `www.facebook.com`. Facebook's runtime hosts are `graph.facebook.com`, `graph-video.facebook.com` and `rupload.facebook.com`. Arbitrary public media URLs are generally handed to Meta to fetch; I did not establish a server-side arbitrary-URL downloader in Instagram. That distinction matters when assessing local-network SSRF.

Secret redaction is substantial in both projects: registered token values are scrubbed at output/log boundaries, error content is handled deliberately, and secrets are not intentionally returned as normal tool output. Redaction is not token encryption, least privilege, or an absolute barrier against transformed/unrecognized secret representations. No real token leakage was observed in this review because no real credentials were used.

## 6. OAuth and token blast radius

Instagram login uses a random 16-byte state, checks it on callback, binds its callback listener to explicit loopback choices, refuses exchange redirects and applies exchange timeouts/body caps. I found no evidence of a fake login endpoint or deliberate callback-based credential collector. Its standard authentication routes use the company's Meta app credentials, not an author-hosted authentication backend in the inspected code.

Its default requested scopes include publishing, comment management and insights; the Facebook-login path also includes Page discovery and `business_management`. The tool can accept a scope override. A reader deployment should not automatically receive the full default scope set. The exact minimum supported scope combination must be tested for the selected Meta auth path rather than assumed.

Facebook intentionally supports system/user/Page tokens. A powerful token that can access multiple company assets increases the consequence of a compromised agent or local process. The Page registry restricts tools to configured Page references, but this is application-level protection inside a process holding the token; it is not equivalent to issuing a token that cannot access unrelated assets.

There are no first-party tools identified here for changing the Instagram password or harvesting browser session cookies. That does not make tokens low-risk: they can authorize the exposed publishing/moderation/data operations. The effective authority is the intersection of enabled tools, token scopes, asset assignments, Meta permissions and client approval policy.

## 7. Company-use decision

| Deployment | Recommendation |
|---|---|
| Facebook npm 0.7.0 with shared/local media uploads | **Reject as-is.** Reproduced containment issue and stale release protections. |
| Facebook current source, broad account token, autonomous publishing/moderation/ads | **Reject as-is.** Override defaults, enforce approval and resolve dependency/release issues first. |
| Instagram 0.8.0, unrestricted agent writes | **Reject as-is.** Optional human confirmation and incomplete review payloads are insufficient company controls. |
| Either, exact reviewed build, separate limited test account | Suitable for a controlled validation exercise with bounded scope. |
| Either, hard read-only tools, limited token, stdio, isolated process | **Conditional pilot candidate**, after privacy review and approval of exact dependencies/artifact. This is not unconditional production approval. |

For an initial read-only deployment, the following are policy-setting examples, not installation commands and not substitutes for token restrictions:

```dotenv
# Facebook: explicitly remove write capabilities at registration time.
FB_TRANSPORT=stdio
FB_TOOL_PACKAGES=reader,insights
FB_PACKAGES_READONLY=all
FB_WRITE_MODE=plan
```

```dotenv
# Instagram: the reader profile removes write tools across its packages.
IG_TRANSPORT=stdio
IG_TOOL_PACKAGES=reader
IG_WRITE_MODE=preview
IG_ALLOW_DESTRUCTIVE=false
# Also set IG_ENV_FILE to an absolute, protected company-managed config file.
```

Preview/plan modes alone are **not read-only security boundaries**: callers can provide apply arguments. Registry filtering plus limited Meta permissions are stronger. Retain only the account profiles required for that deployment; use separate processes/tokens when company brands, teams or tenants must be isolated. Do not give a shared HTTP token to multiple users and expect per-user authorization or attribution.

Before enabling company writes:

1. Select an exact approved source commit and dependency graph; build/package in a controlled environment; record hashes and verify provenance with an approved verifier.
2. Remediate F01 and confirm the actual deployed package contains the fix; pin future releases and transitive dependencies.
3. Enforce a trusted approval channel that refuses on missing support, displays exact content/media, and binds a short-lived approval to account + tool + parameters + asset identity.
4. Remove ambient project configuration; explicitly pin safety settings. Prefer stdio and an isolated low-privilege process with egress restrictions. Do not mount user homes, browser profiles or unrelated secrets into it.
5. Apply least privilege at Meta: a dedicated company app, approved asset assignments and only required scopes. Keep ads, DMs and deletion disabled until separately justified and tested.
6. Keep media in a private publish-only directory with no secrets or untrusted writers. Prefer immutable approved assets whose contents cannot change after review.
7. Use a vault/approved secret store; verify Windows ACLs; implement rotation and an independently accessible token-revocation/kill-switch procedure.
8. Add reliable action auditing with operator identity and approval receipts. Verify successful writes by read-back and reconcile unknown outcomes before retrying.
9. Run end-to-end tests only on dedicated test assets: wrong account, stale plan, changed file, failed approval, lost response, partial carousel, deleted comment, token expiry, rate limit and audit failure.
10. Approve data routing through the MCP client/model provider for customer comments/messages. Server-side absence of telemetry does not establish the client's retention or access policy.

## 8. Probe record and reproducibility

The evidence bundle includes the JSON results and harness for **15 completed offline checks**, with no probe failures on the final run. It includes both positive controls (safe behavior) and reproduced weaknesses. “15 checks completed” is not “15 vulnerabilities”: several checks establish correct blocking behavior or conditional library-only behavior.

Key reproduced results:

- Instagram: unsupported confirmation + apply true performs a fake mutation; explicit false blocks even under global apply; human decline blocks; global apply + destructive permission can delete without per-call apply; journal failure leaves successful return unchanged.
- Facebook: explicit false can authorize under apply mode; fallback token approves unrelated plans; release gate misses state changes during confirmation; release loopback predicate accepts a hostname beginning `127.` while current predicate rejects it.
- Facebook media: released read helper reads a synthetic file through a swapped ancestor junction; current containment helper rejects the same path.
- Instagram: non-Meta hosts, path traversal and query-injected paths are refused in the URL-builder probes.
- Library-only qualifications: released Facebook gate with no confirmer, and a throwing injected Journal, behave less defensively than current code. Default CLI wiring/default Journal must not be conflated with those injections.

The helper tests sometimes extract exact functions from source and provide controlled collaborators. They are not full client/server integration tests. The media test specifically isolates the race's read stage after simulated validation. The harness deletes secret-like environment variables before loading modules and replaces global fetch with a rejecting function; it does not claim to be a general sandbox for running arbitrary unreviewed code. The reviewed modules contain no alternate network client in these tested paths.

The repository's entire unit suite, lint gate, CodeQL analysis and live smoke harness were **not** run. I did not test actual token revocation, company asset assignment, real Graph API permission enforcement, the currently connected Instagram installation's package bytes, or every dependency's source. I did not exhaustively review all historical commits or download and validate release MCPB bundles. The npm tarball findings must not automatically be applied to an unexamined MCPB bundle or custom installation.

## 9. Artifact identity

| Downloaded artifact | SHA-256 |
|---|---|
| Facebook npm 0.7.0 archive | `762eeb439547223fb07e5b258cc8b83c3763ef382ba955dd55f9b5cc1b7421e6` |
| Instagram npm 0.8.0 archive | `935d6fdbdba9fd3402acbabbaa63c1c0c16e73bd03474379d55016f983ff7945` |

The evidence bundle contains registry metadata/provenance responses, original npm archives, extracted shipped JS, source/package comparison results, lockfile inventories, raw production/full npm audit outputs, the offline probe harness/results, and source snapshots. No live access tokens or company customer-message exports were added to these audit deliverables.

**Final assessment:** no affirmative malware evidence was found in the examined first-party code/artifacts. There is enough evidence of security and authorization weaknesses to withhold approval for broad unattended company-account use. Instagram is the more straightforward candidate for a restricted pilot; Facebook requires particular care because its npm release lacks important protections present in main. Approval must attach to the exact deployed build, configuration, token scope and client policy—not to the repository name or a general “safe MCP” label.
