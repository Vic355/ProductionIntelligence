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
  - **Agen**: the two labour agencies (Penukal and Gemna) with payment model, fee, attendance and fill rate, compliance documents; agency invoices reconciled against approved timesheet hours.
  - **Lembur & KPI**: hourly-paid plant employees (operators, mechanics, QC, warehouse) next to the outsourced staff. Per-task overtime orders (SPL) name the task, people, planned hours and the KPI to move, and block more than 4 hours a day or 18 a week; the manager closes each one as done or not done with actual hours, which then go to payroll at the legal multipliers. A monitor shows a weekly heatmap, the November budget with an 80% warning, overtime with no result, repeat overtime, roster suggestions for overtime that recurs on the same weekday, and how evenly overtime is shared. Department KPIs (mechanics downtime linked to breakdown tickets, QC reject rate, warehouse on-time dispatch, operator output) are set against overtime. Operator volume comes from machine counts per hour on the machine, and a phone view shows a worker their own hours, overtime and output. Team figures show by default; individual results show only for that person's manager.
  - **Lihat sebagai** (view as): a bar under the menus switches between Pak Gani (HR), Pak Dian (Kepala Produksi), the Seksi 3 manager, the head of mechanics, and two worker logins: a machine operator (plant employee) and an outsourced packer (agency worker).
  - **Menu**: a page listing every feature as a tile with a short description and live counts, with one search box that finds both menus and people by name or ID.
  - **Staff profiles**: a side panel with the person's key facts and a menu of sections (summary with items needing attention, personal data with identity, contact, job and tax/BPJS details that can be edited, schedule, leave, bank account, payments, contract and documents, qualifications).
  - **Worker portal**: what a worker sees after logging in, either as a web page or inside a phone frame (Web / HP switch). It covers home (next shift, clock-in, overtime orders to confirm, pay, leave balance, factory notices), roster (own shifts, team today, open shifts to pick up), clock in/out with a 7-day timesheet, leave (pending, upcoming, history, request), payslips, and a self-service profile (contact, bank account change with PIN, tax/BPJS, qualifications).

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

### Tugas & KPI (daily task routes)

The app now opens on **Tugas & KPI**, modelled on sales route management:

- **Rute hari ini**: every shop-floor worker (operators, outsourced packers and helpers, QC, mechanics, warehouse) gets a task route generated each day from their shift, machine, the production plan (SKU changeovers), open repair tickets, overtime orders and tasks managers add. A line map shows each machine's route progress; problems reported from the floor are listed; individuals are visible only to their direct manager.
- **KPI & tugas**: each KPI with its 8-week trend, the tasks linked to it, their completion rate, the overtime spent on it and verified extra work. "Tambah tugas ke KPI" adds a task to the routes of the right people and can create a linked overtime order.
- **Efektivitas lembur**: every closed overtime order compared with its KPI target (effective at 90% or more), summarised per KPI with cost.
- **Poin & tim**: team league (points per person, so team size doesn't matter), leader verification of extra work, badges and the rules.
- **Extra work ("zona baru")**: work outside the route (helping another line, fixing a recurring problem, kaizen ideas, safety reports) is logged from the phone with evidence and verified by the leader.
- **Guardrails**: extra-work points count only once 80% of that day's route is done, are capped at 60 a week, overtime earns points for results not hours, a protected 1-hour improvement slot sits in the route every Wednesday, and only team rankings are public.
- **Phone app**: Tugas (route with progress ring, start/finish with result, report a problem, log extra work), Poin (level, weekly points, team rank, badges, performance premium), plus roster, clock-in, leave, pay and profile. Available for "Operator mesin", "Packer alih daya" and "Staf produksi" (QC, mechanics, warehouse).
