# Production Intelligence (mockup)

A clickable mockup for an Indonesian tissue converting mill (UI in Bahasa Indonesia), styled like a machine HMI. 51 machines in 6 sections, 41 running.

- **Kepala Produksi** (`#head`): plant target vs actual, a panel per section with its shift leader and machine tiles, an alarm list (with acknowledge), a suggested actions tab, and a machine detail panel with the running SKU's spec sheet.
- **Operator** (`#operator`): the operator's machine, target vs actual and the running SKU's spec sheet; a card per add-on sensor (A fold camera, B jumbo camera, C sound sensor, D log saw camera, E chaining camera, F motion sensor, G packing camera) saying where it sits, what it does and what it detected, with an example snapshot and event log; and an **AI assistant demo** as the main panel. It shows how the proposed system answers:
  - parameter questions from the recipe table (exact values, never generated);
  - known defects through approved decision trees, with a step progress bar;
  - free questions (typed or by the demo voice button) as RAG answers with sources and safety checks;
  - questions with no source in the knowledge base by refusing instead of guessing;
  - an **AI gateway** switch (Local / Outside model / Auto) that shows what would be sent to an outside model, with names, machine IDs and setpoints removed;
  - a lessons loop: an operator's fix is saved as a lesson that waits for the shift leader's approval and appears on the Head view.

- **Tenaga Kerja** (`/outsource/`): a separate subsystem for planning and paying outsourced (alih daya) and day labour, styled as a plain workforce-management web app. It shares the plant's six sections and machines:
  - **Jadwal**: a weekly roster grid per section (4 regu, 3 shifts), with required vs scheduled headcount from the production plan, open shifts, fill suggestions with rest and overtime warnings, auto-fill and publish; headcount needs per day; requests to agencies.
  - **Absensi**: timesheets from RFID and face clock-ins with bale counts, approvals and corrections; leave requests with their roster impact, and leave balances.
  - **Pekerja**: staff list and profiles (summary, schedule and attendance, bank account, payment history, contract and documents, machine qualifications); PKWT contracts ending soon.
  - **Gaji**: pay run for 21 Oct – 20 Nov with HR then Finance approval, payslips, and exports (BCA bulk transfer, Mandiri MCM, full payroll, e-Bupot PPh 21, BPJS, per-agency summary); payment history with failed and retried transfers; bank accounts with change requests, name check and two-person approval; pay rules (UMK, overtime per PP 35/2021, night and meal allowances, piece premium, BPJS, PPh 21 TER) with a rule tester.
  - **Agen**: agencies with payment model, fee, attendance and fill rate, compliance documents; agency invoices reconciled against approved timesheet hours.
  - **Lembur & KPI**: hourly-paid plant employees (operators, mechanics, QC, warehouse) next to the outsourced staff. Per-task overtime orders (SPL) name the task, people, planned hours and the KPI to move, and block more than 4 hours a day or 18 a week; the manager closes each one as done or not done with actual hours, which then go to payroll at the legal multipliers. A monitor shows a weekly heatmap, the November budget with an 80% warning, overtime with no result, repeat overtime, roster suggestions for overtime that recurs on the same weekday, and how evenly overtime is shared. Department KPIs (mechanics downtime linked to breakdown tickets, QC reject rate, warehouse on-time dispatch, operator output) are set against overtime. Operator volume comes from machine counts per hour on the machine, and a phone view shows a worker their own hours, overtime and output. The "view as" switch in the top bar shows team figures by default; individual results show only for that person's manager.

The main mockup is `public/index.html`. The Tenaga Kerja subsystem is `public/outsource/index.html` (data, rules and helpers), `public/outsource/app.js` (pages) and `public/outsource/lembur.js` (employees, overtime and KPIs). Sensor events are simulated in the browser and the snapshots are illustrations and the assistant is scripted: it does not call a real AI model. The workforce data, rates and rules are generated in the browser and nothing is saved; the UMK and allowances are example values. All names, numbers, SKUs, specs and procedures are examples.

## Run locally

Open `public/index.html` in a browser, or run `npx wrangler dev`. Pushing to `main` deploys it.

## Deploy (Cloudflare Workers)

The repository is connected to the `productionintelligence` Worker. `wrangler.jsonc` serves `./public` as static assets, so there is no build step:

| Setting | Value |
| --- | --- |
| Build command | leave empty |
| Deploy command | `npx wrangler deploy` |

The earlier Blazor three-view prototype is in the git history (commit `eb47da0`).
