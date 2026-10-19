# Security policy

Use a dedicated test account first. Keep production tokens asset-scoped and inject them through an approved secret store. Prefer stdio and a private low-privilege process. Never commit filled token/config files.

To stop access: stop the MCP process, remove its client configuration, and revoke the affected credential in your company's Meta administration tools. Changing the client configuration alone does not revoke a stolen token.

Report a vulnerability through your fork's GitHub private vulnerability reporting feature if enabled. Do not put access tokens, app secrets, customer messages or working exploit data against third-party assets in public issues. This repository does not invent a maintainer contact address; configure one for your own public fork.

Every write requires client-mediated approval. Clients without MCP form elicitation can use read-only features. Do not weaken this rule to work around unsupported clients; develop and review an independent approval mechanism first.

Review [HARDENING.md](HARDENING.md) for implemented controls and limits. Passing offline tests and a dependency audit does not establish that a build is safe for every company deployment. No real account operations were used in the project's initial validation.
