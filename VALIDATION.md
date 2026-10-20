# Validation snapshot

Validated again on 20 October 2026 using Windows, Node.js 22.22.0 and npm 11.7.0, before the initial GitHub publication.

`npm run check` completed successfully, including both TypeScript builds:

| Suite | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Hardened cross-component security regression suite | 32 | 0 | 0 |
| Client configuration generation and secret-reference tests | 3 | 0 | 0 |
| Facebook HTTP, authentication and redaction boundary suites | 216 | 0 | 0 |
| Instagram host, HTTP, redaction, path injection and publishing API suites | 280 | 0 | 0 |
| Total in the default check | 531 | 0 | 0 |

Both complete dependency lockfiles reported **zero known npm audit vulnerabilities**, including development dependencies. This is a dated advisory result, not proof that dependencies contain no malicious or undiscovered behavior. Direct versions are pinned; lockfiles retain registry integrity hashes. Installation used `npm ci --ignore-scripts` before explicit compilation.

The Codex generator's output was additionally parsed with Python's TOML parser and its executable paths verified. JSON client templates were parsed and checked against their documented wrapper/reference conventions. Tests inject synthetic credential canaries to ensure the generator never emits environment secret values. These checks validate configuration generation, not a live client/account session.

Tests use synthetic credentials and mocked Meta requests. No real account was connected; no actual publishing, messaging, deletion or spending was performed. The default check does not start the complete MCP processes or establish live client compatibility. The GitHub Actions Linux/Windows matrix is included but has not been run remotely as part of this snapshot.

## Additional upstream media-test attempt

The retained Facebook media suite was also attempted. Of its 87 cases, 77 passed, six were skipped by upstream platform conditions, and four could not complete because this Windows environment denied symlink creation (`EPERM`, including one race test whose callback then received that permission error). These four are **not validated** here. They are excluded from the default cross-platform check, not represented as passing tests. The hardened regression suite separately tests local traversal rejection and a valid contained read.

Run the retained media suite on an appropriately configured test machine after building:

```sh
cd facebook-mcp
node --import ./build/testing/network-fence.js --test build/api/media-photos.test.js
```

The rest of the retained upstream corpus has not been migrated to the stricter approval/default policy. `test:upstream` is historical and is not a release acceptance gate for this distribution. See [HARDENING.md](HARDENING.md) for controls and remaining deployment requirements, and [docs/BASELINE-AUDIT.md](docs/BASELINE-AUDIT.md) for the original pre-hardening assessment.
