# Security changes and limits

These changes address the baseline review findings. They are not a warranty or a claim that all possible attacks have been eliminated.

| Baseline finding | Implemented response | Remaining boundary |
|---|---|---|
| F01: Facebook npm local-media directory-swap race | Vendor the newer reviewed Git source, retaining handle/path identity checks, bounded local reads and planned media digests | Use a private media directory and isolated OS identity. No general filesystem-race immunity is claimed. |
| F02: Instagram optional human confirmation/global destructive apply | Mandatory supported human approval; only explicit `apply:true` requests writes; destructive permission remains an additional gate | Your MCP client must faithfully display form elicitation and obtain human input. |
| F03: Facebook apply-first moderation and false ignored | Plan-first moderation; false/missing apply always previews; all tiers need a matching plan and human approval | A compromised client or operator with the token remains powerful. |
| F04: Incomplete review payloads | Instagram includes all parsed arguments; Facebook includes full planned parameters; oversized prompts refuse | A URL can serve mutable content. Use approved immutable assets and review content in a trusted UI. |
| F05: Reusable fallback confirmation token | Remove fallback execution; configured/password-supplied tokens never authorize writes | No headless unattended publishing bypass. |
| F06: Ambient Instagram project config | Remove working-directory `.env` loading | Protect selected per-user config and launcher environment. |
| F07: Unauthenticated Instagram loopback HTTP | Require a 32+ character HTTP token and loopback; prefer stdio | HTTP is not per-user RBAC; do not expose raw listeners publicly. |
| F08: Plaintext CLI credentials | Disable automatic persistence by default; explicit plaintext opt-in required; recommend approved secret injection | This project does not implement OS keychain encryption. Opt-in storage relies on verified filesystem ACLs. |
| F09: Writes without audit intent/outcome visibility | Persist/fsync intent before writes; fail closed if unavailable; Instagram exposes final-audit failure without duplicating the mutation; cap its log size | Local logs are not tamper-proof. A crash/remote failure can leave unknown outcomes; reconcile them. |
| F10: Facebook state changes during confirmation | Retain the current upstream state read after approval | Meta read/write operations may not be atomic. |
| F11: Moving installation/dependency targets | Local compiled launch paths, exact direct dependencies and committed locks, disabled install hooks, private child packages; remove executable marketplace launchers | Review future updates and protect your own repository/release identity. |
| F12: Known dependency advisories | Refresh both locks and include full-graph npm audit in `check` | Advisory results change; zero known advisories is not malware certification. |

Additional defense: Facebook Graph/upload responses have a streaming 5 MiB body cap. Graph destination allowlists, redirect refusal, token redaction, ID validation and untrusted-data fencing are retained. The root project has no runtime dependencies of its own.

Acceptance focuses on enforced boundaries: read-only defaults; explicit apply semantics; no fallback approval; complete request review; plan mismatch/replay rejection; durable intent before callback; honest post-mutation audit failures; URL containment; bounded response bodies; local-media containment; no silent credential persistence.

The source contains historical upstream documentation/tests that describe former semantics. The parent README, this document and the hardened regression suite describe current policy. The baseline audit describes pre-hardening findings and should not be read as proof of a newly discovered defect in this modified build.

Not implemented: OS keychain backend, authenticated per-user remote service/RBAC, independent immutable audit collector, automatic OAuth scope provisioning, exactly-once Meta transactions, or live production/account certification. These require deployment-specific design and validation; the project does not pretend that local patches provide them.
