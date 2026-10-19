# Upstream provenance

| Component | Upstream repository | Vendored commit | Upstream version |
|---|---|---|---|
| Facebook | https://github.com/IvanBBaev/facebook-mcp | `ee79b3a16235deed305559ac4e83cd9dd9b46583` | 0.7.0 |
| Instagram | https://github.com/IvanBBaev/instagram-mcp | `3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b` | 0.8.0 |

Both components were imported from exact Git source snapshots, with their original MIT LICENSE files retained. This repository is one ordinary Git repository, not a pair of nested repositories or submodules. Changes to vendor source are maintained directly here.

The child package versions retain upstream identity for code compatibility; the parent distribution version and Git commit identify this modified build. Both child packages are private. Do not represent this distribution as an official upstream npm release. In particular, upstream Facebook npm 0.7.0 refers to an older commit and is not a substitute for this source build.

When updating: review the upstream diff, preserve/reapply HARDENING.md controls, refresh and audit lockfiles, run the security regression suite and compatible boundary suites, and retest the specific client/auth path on test assets. Record the new source commits and changes. Never update the vendor directories with a blind npm/npx download.
