# Production Intelligence (mockup)

A clickable mockup for a tissue mill converting hall with two views:

- **Head** (`#head`): every line's carton output against the day's target, lines down (no cartons counted for 3 min), suspected quality problems from the extra sensor suite (chaining, pack defect, loose wind), and a WhatsApp thread with each line's operator whose replies show on the board.
- **Operator** (`#operator`): the operator's own line vs target, that line's sensors, and an assistant that gives defect checklists, the HMI recipe for the running SKU, and contacts the supervisor or a mechanic.

Everything is one static file, `public/index.html`. Sensor data is simulated in the browser; the WhatsApp replies and the assistant are scripted. All names, numbers, recipes and checklists are invented.

## Run locally

Open `public/index.html` in a browser, or run `npx wrangler dev`. Pushing to `main` deploys it.

## Deploy (Cloudflare Workers)

The repository is connected to the `productionintelligence` Worker. `wrangler.jsonc` serves `./public` as static assets, so there is no build step:

| Setting | Value |
| --- | --- |
| Build command | leave empty |
| Deploy command | `npx wrangler deploy` |

The earlier Blazor three-view prototype is in the git history (commit `eb47da0`).
