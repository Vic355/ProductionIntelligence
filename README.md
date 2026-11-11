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

### Cloudflare Pages

Connect this repository in Cloudflare Pages (Workers & Pages → Create → Pages → Connect to Git) and use:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `./build.sh` |
| Build output directory | `output/wwwroot` |

`build.sh` installs the .NET 8 SDK (the Cloudflare build image does not include it) and publishes the app. Deep links such as `/operator` work because the site has no `404.html`, so Cloudflare Pages serves `index.html` for unknown paths.
