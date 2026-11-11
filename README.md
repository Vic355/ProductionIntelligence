# Production Intelligence System (prototype)

A clickable prototype of the three role views from the Production Intelligence System concept brief, for a tissue mill that converts bought-in jumbo rolls into finished rolls and packs. Built with .NET 8 Blazor WebAssembly, so it runs entirely in the browser and can be hosted as static files.

All numbers are **sample data** (`src/ProductionIntelligence.Web/Data/SampleData.cs`). In the real system they would come from the PLC project (counts, speed, stops), the Voice project (stop reasons, transcripts, "what fixed it?"), the planner's daily target and the shift roster.

## Views

| Route | Role | What to try |
| --- | --- | --- |
| `/operator` | Operator, line-side screen | Pace needed for the rest of the shift. Press **Line stops** in the prototype bar, pick a fix, then **Line running again** and answer "did this fix work?". |
| `/shift-leader` | Shift leader | Live board of 6 lines, patrol priorities, manpower flag, escalation buttons, fix approvals (including a fix blocked by the safety rule) and a drafted handover you can edit and send. |
| `/section-head` | Section head | Weekly AI digest, repeat losses judged from PLC data, shift and line comparisons, skills overview, and an Ask tab. |

## Run locally

```bash
dotnet run --project src/ProductionIntelligence.Web
```

Then open the URL it prints (for example http://localhost:5000).

## Publish

```bash
dotnet publish src/ProductionIntelligence.Web -c Release -o publish
```

The static site is in `publish/wwwroot`. Any static host works (GitHub Pages, Azure Static Web Apps, IIS).

### Cloudflare (Workers or Pages)

Connect this repository in Cloudflare (Workers & Pages → Create → Import a repository) and use:

| Setting | Value |
| --- | --- |
| Build command | `./build.sh` |
| Deploy command (Workers) | `npx wrangler deploy` |
| Build output directory (Pages only) | `output/wwwroot` |

`build.sh` installs the .NET 8 SDK (the Cloudflare build image does not include it) and publishes the app to `output/wwwroot`. `wrangler.jsonc` tells `wrangler deploy` to serve that folder as static assets, with single-page-app fallback so deep links like `/operator` work. The `name` in `wrangler.jsonc` must match your Worker's name in the dashboard.
