# Production Intelligence (mockup)

A clickable mockup for an Indonesian tissue converting mill (UI in Bahasa Indonesia), styled like a machine HMI. 51 machines in 6 sections, 41 running.

- **Kepala Produksi** (`#head`): plant target vs actual, a panel per section with its shift leader and machine tiles, an alarm list (with acknowledge), a suggested actions tab, and a machine detail panel with the running SKU's spec sheet.
- **Operator** (`#operator`): the operator's machine, target vs actual, the running SKU's spec sheet, sensors per station (jumbo camera, rotary knife chaining camera, interfolder fold camera, log saw cut/compression camera, packing camera, motion sensor for output, acoustic and vibration sensors), trends, defect detection, and an assistant for defect steps, HMI settings, and calling the shift leader or a mechanic.

Everything is one static file, `public/index.html`. Sensor data is simulated in the browser and the assistant is scripted. All names, numbers, SKUs, specs and procedures are examples.

## Run locally

Open `public/index.html` in a browser, or run `npx wrangler dev`. Pushing to `main` deploys it.

## Deploy (Cloudflare Workers)

The repository is connected to the `productionintelligence` Worker. `wrangler.jsonc` serves `./public` as static assets, so there is no build step:

| Setting | Value |
| --- | --- |
| Build command | leave empty |
| Deploy command | `npx wrangler deploy` |

The earlier Blazor three-view prototype is in the git history (commit `eb47da0`).
