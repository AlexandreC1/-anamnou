# Repository instructions

Read PROJECT_BIBLE.md completely and docs/ASTRA_ENGINEERING_CONTRACT.md before
changing code. Inspect the current repository and preserve existing work.

The product Bible governs product behavior. Flag material conflicts instead of
silently changing architecture, security, ownership or requirements.

Current authorized scope is Phase 2 schools/classes, explicitly authorized after Phase 1.
Stop before Phase 3 profiles, media uploads and yearbook business features.

Use npm workspaces and the pinned Node version. Run npm run check and
npm audit --audit-level=high before declaring the foundation verified.
Report exact changed files, decisions, commands/results, assumptions and risks.

Do not commit .env, .tools, generated clients, build output or credentials.
Security-sensitive changes require review before merge.
