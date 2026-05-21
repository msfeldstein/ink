## Cursor Cloud specific instructions

Ink is a React renderer for building CLI apps with JSX. It's a pure TypeScript/npm library with no external service dependencies.

### Key commands

| Task | Command |
|------|---------|
| Install deps | `npm install` (also runs `tsc` via `prepare` script) |
| Dev mode | `npm run dev` (watches & recompiles TypeScript) |
| Build | `npm run build` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` (XO/ESLint — warnings only, no errors expected) |
| Full test | `FORCE_COLOR=true CI=false npx ava --serial` |
| Run example | `npm run example examples/<name>` |
| Benchmark | `npm run benchmark benchmark/<name>` |

### Non-obvious caveats

- **`FORCE_COLOR=true` is required for tests.** Some test assertions compare ANSI-colored output strings. Without `FORCE_COLOR=true`, at least one test will fail. The CI workflow sets this explicitly.
- **`CI=false` when running tests locally.** Ink's rendering behavior changes in CI mode (only last frame rendered). Set `CI=false` to get full rendering behavior in tests, matching the CI workflow.
- **No lockfile by design.** `.npmrc` contains `package-lock=false`. Do not commit a `package-lock.json`.
- **`node-pty` native addon.** Requires `build-essential` and `python3` on the system for compilation during `npm install`. These are pre-installed in the Cloud Agent VM.
- **Node.js >= 22 required.** The `engines` field enforces this. The VM ships with v22.
- **ESM-only.** The project uses `"type": "module"`. All imports use `.js` extensions for TypeScript files.
