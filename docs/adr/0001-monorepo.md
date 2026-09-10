# ADR 0001: npm workspaces and a modular monolith

Status: Accepted

The repository was empty. Use npm workspaces for apps/web and apps/api, with a
single lockfile and root quality commands. A task orchestrator is unnecessary for
two applications. Vite is the Bible's default React build system. NestJS is
compiled with TypeScript rather than a second bundler, preserving decorator metadata.

Root TypeScript and ESLint configuration is shared directly. Do not create
packages/shared, packages/config or packages/ui merely to populate the tree:
extract them when a second consumer exists.

Infrastructure identifiers use yearbook; TÈLÒ (formerly Anamnou) is display branding. No cloud
provider is selected. Applications run on the host and infrastructure in Compose.
