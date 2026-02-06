# FNF HTML5 Auto-Porter

Local-first Electron + CLI tool for porting Friday Night Funkin mods/engine forks to HTML5 builds.

## Website Hosting Contract
Validation is strict on safety/integrity, flexible on folder layout.

### Required at bundle root
- `index.html`
- `build.json`

### Path/reference rules
- `index.html` is mandatory entrypoint.
- Referenced files from `index.html` and discovered JS/CSS/HTML files must:
  - be **relative paths**,
  - resolve to files **inside the bundle root**,
  - exist on disk.
- Blocked by default:
  - absolute paths (`C:\...`, `/home/...`, `/Users/...`, leading `/`),
  - external URLs (`http://`, `https://`, `file://`),
  - runtime download behavior.

### Self-contained meaning
A self-contained bundle runs with only files shipped in the archive (no runtime fetch/CDN by default).

### Safe overrides
- CLI: `--allow-external`
- CLI: `--allow-runtime-downloads`
- UI: Settings toggles under Hosting Contract

### Valid example
```
/index.html
/build.json
/data/sprites.png
/js/app.js
/songs/week1.ogg
```
This is valid even without `/assets` because layout is flexible.

### Invalid examples
- `index.html` contains `<script src="/js/app.js">` → leading slash absolute path blocked.
- `index.html` contains `<script src="https://cdn.example.com/lib.js">` → external URL blocked unless `--allow-external`.
- `index.html` references `./sounds/week1.ogg` but file absent → missing referenced file.

## Monorepo Layout
- `packages/core`: detection, queue, patching, build execution, hosting validator, metadata, publishers, daemon server.
- `packages/cli`: `fnf-porter` commands.
- `packages/ui`: Electron + React + Vite desktop app.
- `packages/publishers/epicrobo`: plugin publisher (not hardcoded in core).

## CLI
```bash
fnf-porter detect <input>
fnf-porter port <inputs...> [--dry-run] [--allow-external] [--allow-runtime-downloads] [--id ...] [--title ...] [--version ...] [--license ...] [--source-type file|repo|url] [--source-value ...] [--credits "name|role|url;..."]
fnf-porter list
fnf-porter open <modId>
fnf-porter publish --target <local|http|epicrobo> --id <buildId> [--dest ...] [--endpoint ...] [--token ...]
fnf-porter serve --port 8787 --host 0.0.0.0
```

Publish directly after porting:
```bash
fnf-porter port ./my-mod.zip --publish --target epicrobo --endpoint https://example.com --token $TOKEN
```

## Daemon / Service mode
- `POST /port` multipart form with `input` file and optional fields (`dryRun`, `id`, `title`, `version`, `license`)
- `GET /job/:id` status + logs tail
- `GET /job/:id/result` download final web zip

Security defaults:
- request size limits enabled
- optional bearer auth via `PORTER_TOKEN`
- CORS disabled by default

## Setup
### Windows
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```
Future raw URL format:
```powershell
irm https://<your-release-url>/install.ps1 | iex
```

### Linux / Codespaces
```bash
bash scripts/install.sh
```

## Dev / CI
```bash
npm install
npm run build
npm run test
npm run ci:artifacts
```

## Safety
- No DRM/paywall bypass.
- No hidden networking/malware.
- Processes only user-provided local inputs.
