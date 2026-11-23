"use strict";
/* Lembur per tugas, monitor lembur, KPI departemen, volume operator, tampilan HP.
   Karyawan pabrik (dibayar per jam setiap bulan) ditambahkan di sini. Semua data contoh. */

_s = 4242;
FM.push("Bambang","Heru","Wawan","Jajang","Sutrisno","Hendro","Darto","Yayan","Engkos","Tatang","Aris","Supriadi","Toni","Gilang","Ucup","Rahmat","Sholeh","Komar");
FF.push("Elis","Tini","Enok","Sri","Endah","Rani","Ida","Yeni");
Object.defineProperty(AG, "KRY", {enumerable:false, value:{id:"KRY", n:"Karyawan pabrik", short:"Karyawan", fee:0, model:"direct", pic:"HR pabrik", phone:"-", contractEnd:null, nib:"-", fill:1, att:.975}});

const dow = d => dt(d).getUTCDay();
const wk = d => Math.floor(d / 7);                 // 0 = minggu ini (Sen 23 Nov), -1 = minggu lalu
const wkLabel = k => k === 0 ? "Minggu ini" : dShort(k * 7).slice(4);
const ROLES = [
  {id:"hr", n:"Pak Gani", t:"HR", av:"PG"},
  {id:"head", n:"Pak Dian", t:"Kepala Produksi", av:"PD"},
  {id:"S3", n:"Pak Hasan Basri", t:"Manajer Seksi 3", av:"HB"},
  {id:"MEK", n:"Pak Bambang Hartono", t:"Kepala Mekanik", av:"BH"},
  {id:"opr", n:"Operator mesin", t:"karyawan, di HP", av:"OP", worker:true},
  {id:"os", n:"Packer alih daya", t:"di HP", av:"AD", worker:true}
];
UI.role = "hr";
const roleOf = () => ROLES.find(r => r.id === UI.role);
const canSee = dept => UI.role === dept;

/* ---------- departments ---------- */
const DEPT = [
  ...SEC.map(s => ({id:s.id, n:s.n.split(" · ")[1], full:s.n, kind:"prod", mgr:s.leader})),
  {id:"MEK", n:"Mekanik", full:"Mekanik (maintenance)", kind:"mek", mgr:"Pak Bambang Hartono"},
  {id:"QC", n:"Quality Control", full:"Quality Control", kind:"qc", mgr:"Ibu Ratna Dewi"},
  {id:"GDG", n:"Gudang & dispatch", full:"Gudang & dispatch", kind:"gdg", mgr:"Pak Joko Susilo"}
];
const deptById = id => DEPT.find(x => x.id === id);
const KPI = {
  prod:{n:"Bal tambahan", u:"bal", main:"Hasil per jam kerja operator", mu:"% standar", good:"up"},
  mek:{n:"Downtime dicegah", u:"menit", main:"Downtime mesin karena kerusakan", mu:"menit/minggu", good:"down"},
  qc:{n:"Lot dicek", u:"lot", main:"Reject rate di pelanggan", mu:"%", good:"down"},
  gdg:{n:"Palet dimuat tepat waktu", u:"palet", main:"Pengiriman tepat waktu", mu:"%", good:"up"}
};

/* ---------- employees paid per hour ---------- */
const EMP = [];
function mkEmp(dept, role, rate, oregu, mach, f){
  const w = mkWorker({sec: dept.kind === "prod" ? dept.id : null, regu: null, role, ag: "KRY", type: "PKWTT", f});
  w.id = "KR-" + w.id.slice(3);
  Object.assign(w, {dept: dept.id, kind: "karyawan", rate, oregu, mach, end: new Date(Date.UTC(2099, 0, 1)), trained: mach ? [mach] : [role]});
  w.bank.status = "ok";
  EMP.push(w); return w;
}
for (const s of SEC) for (const r of "ABCD") for (const m of s.mach) mkEmp(deptById(s.id), "Operator mesin", ri(34, 40) * 1000, r, m, rnd() < .25);
for (const r of "ABCD") for (let i = 0; i < 4; i++) mkEmp(deptById("MEK"), i === 0 ? "Mekanik senior" : "Mekanik", ri(39, 48) * 1000, r, null, false);
for (const r of "ABCD") for (let i = 0; i < 3; i++) mkEmp(deptById("QC"), "QC inspector", ri(33, 38) * 1000, r, null, rnd() < .6);
for (let i = 0; i < 18; i++) mkEmp(deptById("GDG"), i < 12 ? "Operator gudang" : i < 16 ? "Checker dispatch" : "Driver forklift", ri(32, 36) * 1000, null, null, rnd() < .15);
const pool = dept => EMP.filter(w => w.dept === dept);
function empShift(w, d){ if (w.oregu) return PAT[((d + REGU[w.oregu]) % 8 + 8) % 8]; return dow(d) === 0 ? "L" : "P"; }

/* overtime pay: weekday 1,5× first hour then 2×; Sunday or holiday 2× (PP 35/2021) */
function otPay(rate, h, rest){ if (h <= 0) return 0; return rest ? rate * 2 * h : rate * (1.5 + 2 * Math.max(0, h - 1)); }

/* ---------- breakdown tickets (mechanics) ---------- */
const ALLM = SEC.flatMap(s => s.mach);
const ISSUES = ["Bearing unwind panas","Pisau log saw tumpul","Sensor seal error","Belt conveyor putus","Glue system bocor","Servo folding alarm","Vacuum embossing turun","Motor wrapper overload"];
const TICKETS = [];
function mkTicket(d, open){ const t = {id:"WO-" + (4100 + TICKETS.length), d, mach: pick(ALLM), issue: pick(ISSUES), down: ri(40, 260), open: !!open}; TICKETS.push(t); return t; }

/* ---------- overtime orders (SPL) ---------- */
const TASKS = {
  prod:[["Kejar order [PELANGGAN] setelah ganti SKU", 600], ["Changeover ukuran dan uji jalan", 300], ["Habiskan sisa jumbo roll sebelum PM", 450], ["Tutup kekurangan target shift", 500]],
  mek:[["Perbaikan", 0]],
  qc:[["Cek ulang lot yang ditahan (hold)", 40], ["Uji gramatur dan tarik lot baru", 25], ["Audit kemasan sebelum kirim", 30]],
  gdg:[["Muat truk ekspedisi [PELANGGAN]", 60], ["Stock opname akhir bulan", 45], ["Bongkar kiriman jumbo roll", 40]]
};
const SPL = [];
const otDayH = (id, d, skip) => SPL.reduce((a, s) => s !== skip && s.d === d ? a + s.people.filter(p => p.id === id).reduce((b, p) => b + (p.actual ?? p.plan), 0) : a, 0);
const otWeekH = (id, k, skip) => SPL.reduce((a, s) => s !== skip && wk(s.d) === k ? a + s.people.filter(p => p.id === id).reduce((b, p) => b + (p.actual ?? p.plan), 0) : a, 0);
const splHours = s => s.people.reduce((a, p) => a + (p.actual ?? p.plan), 0);
const splPlan = s => s.people.reduce((a, p) => a + p.plan, 0);
const splCost = s => s.people.reduce((a, p) => a + otPay(wById(p.id).rate, p.actual ?? p.plan, dow(s.d) === 0), 0);
const STAT = {rencana:["info","Direncanakan"], tutup:["warn","Perlu ditutup"], selesai:["ok","Selesai"], tidak:["bad","Tidak selesai"]};
function pickPeople(dp, d, n, h){
  const list = pool(dp.id).filter(w => SH[empShift(w, d)] || dp.kind === "gdg");
  const out = [];
  const weights = list.map((w, i) => (i % 9 < 2 ? 5 : 1));
  for (let k = 0; k < 60 && out.length < n; k++) {
    let t = rnd() * weights.reduce((a, b) => a + b, 0), i = 0;
    while (t > weights[i]) t -= weights[i++];
    const w = list[i];
    if (!w || out.includes(w)) continue;
    if (otDayH(w.id, d) + h > R.otDay || otWeekH(w.id, wk(d)) + h > R.otWeek) continue;
    out.push(w);
  }
  return out;
}
function makeSPL(dp, d, opt = {}){
  const [task, target] = opt.task || pick(TASKS[dp.kind]);
  const h = opt.h || ri(2, 4), n = opt.n || {prod: ri(2, 3), mek: ri(1, 2), qc: ri(1, 2), gdg: ri(3, 5)}[dp.kind];
  const ppl = pickPeople(dp, d, n, h); if (!ppl.length) return null;
  const s = {id: "SPL-" + (1000 + SPL.length), dept: dp.id, d, start: pick(["15.00","23.00","07.00"]), task, target, by: dp.mgr, people: ppl.map(w => ({id: w.id, plan: h, actual: null})), status: "rencana", result: null, note: ""};
  if (dp.kind === "mek") { const t = opt.ticket || mkTicket(d); s.ticket = t.id; s.task = "Perbaikan " + t.mach + ": " + t.issue.toLowerCase(); s.target = t.down; }
  if (dp.kind === "gdg") s.start = "16.00";
  if (d <= -3) {
    const done = rnd() < (dp.id === "S1" ? .62 : dp.id === "GDG" ? .8 : .88);
    s.status = done ? "selesai" : "tidak";
    s.people.forEach(p => p.actual = Math.max(1, Math.min(R.otDay, p.plan + (rnd() < .22 ? (rnd() < .6 ? 1 : -1) : 0))));
    s.result = Math.round(s.target * (done ? .9 + rnd() * .3 : .25 + rnd() * .4));
    if (!done) s.note = pick(["Mesin rusak lagi di tengah lembur", "Bahan baku belum datang", "Order dibatalkan PPIC", "Orang kurang, 1 tidak datang"]);
  } else if (d < 0) s.status = "tutup";
  SPL.push(s); return s;
}
for (let d = -56; d <= 2; d++) {
  const wd = dow(d);
  for (const dp of DEPT) {
    let p = {prod:.14, mek:.45, qc:.12, gdg:.1}[dp.kind];
    if (dp.id === "S3" && wd === 1) p = d < -14 ? .95 : .85;
    if (dp.id === "GDG" && wd === 6) p = .75;
    if (dp.id === "S5" || dp.id === "S6") p = .05;
    if (d > 0) p *= .6;
    if (rnd() > p) continue;
    makeSPL(dp, d, dp.id === "S3" && wd === 1 ? {task: ["Changeover Facial 250s ke 200s dan uji jalan", 400], h: 3, n: 4} : {});
  }
}
for (let i = 0; i < 3; i++) mkTicket(0, true);
SPL.sort((a, b) => b.d - a.d || a.id.localeCompare(b.id));

/* ---------- budgets for November (1 Nov = day −22) ---------- */
const novSpent = dep => SPL.filter(s => s.dept === dep && s.d >= -22 && s.d <= 0 && s.status !== "rencana").reduce((a, s) => a + splCost(s), 0);
const novPlan = dep => SPL.filter(s => s.dept === dep && s.d >= -22 && s.d <= 7 && s.status === "rencana").reduce((a, s) => a + splCost(s), 0);
const RATIO = {S1:.66, S2:.48, S3:.93, S4:.57, S5:.35, S6:.5, MEK:.84, QC:.6, GDG:.71};
for (const dp of DEPT) { const sp = novSpent(dp.id) + novPlan(dp.id); dp.budget = sp ? Math.ceil(sp / RATIO[dp.id] / 5e5) * 5e5 : 3e6; }
const budgetTag = p => p >= 1 ? '<span class="tag bad">Lewat anggaran</span>' : p >= .8 ? '<span class="tag warn">Di atas 80%</span>' : '<span class="tag ok">Aman</span>';

/* ---------- payroll for hourly employees ---------- */
const _payLine = payLine;
payLine = function(w){
  if (w.ag !== "KRY") return _payLine(w);
  const h = k => hash(w.id + "|pay|" + k);
  const days = 24 + Math.round(h("d") * 2) - (h("a") < .08 ? 1 : 0), hours = days * 7, base = hours * w.rate;
  let otH = 0, ot = 0;
  for (const s of SPL) if (s.d >= -33 && s.d <= -3 && s.status !== "rencana") for (const p of s.people) if (p.id === w.id) { otH += p.actual; ot += otPay(w.rate, p.actual, dow(s.d) === 0); }
  const nights = w.oregu ? Math.round(days / 3) : 0, night = nights * R.night, meal = days * R.meal;
  const gross = base + ot + night + meal, wage = Math.max(base, R.umk);
  const jht = wage * R.jhtEe, jp = Math.min(wage, R.jpCap) * R.jpEe, kes = Math.min(wage, R.kesCap) * R.kesEe;
  const er = wage * (R.jhtEr + R.jkk + R.jkm) + Math.min(wage, R.jpCap) * R.jpEr + Math.min(wage, R.kesCap) * R.kesEr;
  const pphBase = gross + wage * (R.jkk + R.jkm) + Math.min(wage, R.kesCap) * R.kesEr, pph = Math.round(pphBase * ter(pphBase) / 100) * 100;
  const kasbon = w.kasbon ? Math.round(w.kasbon / 2 / 1000) * 1000 : 0;
  return {w, days, hours, rate: w.rate, base, ot, otH, night, nights, meal, premi: 0, bales: 0, gross, jht, jp, kes, pph, kasbon, net: gross - jht - jp - kes - pph - kasbon, er};
};

/* ---------- operator volume from machine counts ---------- */
const RATE = {TR:80, KT:62, JR:40, FB:104, SP:110, NP:84, HT:54};
function opWeek(w, from = -7, to = -1){
  let shifts = 0, hrs = 0, down = 0, bales = 0, std = 0;
  const eff = .84 + hash(w.id + "eff") * .17;
  for (let d = from; d <= to; d++) {
    if (!SH[empShift(w, d)]) continue;
    const dn = hash(w.id + d + "dn") < .25 ? Math.round(hash(w.id + d + "dm") * 90) / 60 : 0;
    const run = 7 - dn + otDayH(w.id, d), rate = RATE[w.mach.slice(0, 2)];
    shifts++; hrs += run; down += dn; std += rate * run; bales += rate * run * eff * (.95 + hash(w.id + d + "b") * .1);
  }
  return {w, shifts, hrs, down, bales: Math.round(bales), std, pct: std ? bales / std : 0, perH: hrs ? bales / hrs : 0};
}

/* ---------- shared bits ---------- */
const lockNote = dept => `<div class="note">Rincian per orang hanya terlihat oleh atasan langsung (${esc(deptById(dept).mgr)}). Di sini ditampilkan angka tim. <button class="btn sm" data-as="${dept}" ${ROLES.some(r => r.id === dept) ? "" : "hidden"}>Lihat sebagai ${esc(deptById(dept).mgr)}</button></div>`;
function bindAs(){ $$("[data-as]").forEach(b => b.onclick = () => setRole(b.dataset.as)); }
const deptSelect = (val, attr, all = "Semua departemen") => `<select ${attr}>${all === null ? "" : `<option value="">${all}</option>`}${DEPT.map(x => `<option value="${x.id}" ${x.id === val ? "selected" : ""}>${x.full}</option>`).join("")}</select>`;
const names = ids => { const n = ids.map(p => wById(p.id).name.split(" ")[0]); return n.length > 3 ? n.slice(0, 3).join(", ") + " +" + (n.length - 3) : n.join(", "); };
const SEQ = ["#eef3fb","#d3e1f5","#a9c4ea","#7aa3dc","#4d7fc7","#2c5fa8","#1b4282"];
const seqCell = (v, max) => { const i = v <= 0 ? 0 : Math.min(SEQ.length - 1, 1 + Math.floor(v / max * (SEQ.length - 1.01))); return `background:${SEQ[i]};color:${i >= 4 ? "#fff" : "var(--ink)"}`; };
const myDept = () => ["S3","MEK"].includes(UI.role) ? UI.role : "";

/* ======================= Perintah lembur ======================= */
UI.splDept = null; UI.splSt = "tutup";
PAGES.lembur = () => {
  const dep = UI.splDept ?? myDept(), st = UI.splSt;
  const all = SPL.filter(s => !dep || s.dept === dep);
  const list = all.filter(s => st === "semua" || s.status === st || (st === "selesai" && s.status === "tidak"));
  const last4 = all.filter(s => s.d < 0 && s.d >= -28 && s.status !== "tutup");
  const doneP = last4.length ? last4.filter(s => s.status === "selesai").length / last4.length : 1;
  const noRes = last4.filter(s => s.status === "tidak").reduce((a, s) => a + splHours(s), 0);
  const tw = all.filter(s => wk(s.d) === 0);
  return `<div class="pagehead"><div><h1>Perintah lembur (SPL)</h1><div class="sub">Setiap jam lembur punya tugas, orang, jam rencana dan KPI yang mau digerakkan. Batas ${R.otDay} jam per hari dan ${R.otWeek} jam per minggu per orang (PP 35/2021).</div></div>
    <div class="actions"><button class="btn" id="splexp">Ekspor CSV</button><button class="btn pri" id="splnew">Buat SPL</button></div></div>
  <div class="filters">${deptSelect(dep, 'id="spldep"')}
    <div class="seg" role="group" aria-label="Status">${[["tutup","Perlu ditutup"],["rencana","Direncanakan"],["selesai","Sudah ditutup"],["semua","Semua"]].map(([k, l]) => `<button aria-pressed="${k === st}" data-splst="${k}">${l} (${k === "semua" ? all.length : all.filter(s => s.status === k || (k === "selesai" && s.status === "tidak")).length})</button>`).join("")}</div></div>
  <div class="stats">
    <div class="stat"><div class="k">SPL minggu ini</div><div class="v">${tw.length}</div><div class="s">${tw.reduce((a, s) => a + splPlan(s), 0)} jam direncanakan</div></div>
    <div class="stat"><div class="k">Perlu ditutup</div><div class="v ${all.some(s => s.status === "tutup") ? "warn" : ""}">${all.filter(s => s.status === "tutup").length}</div><div class="s">jam belum masuk gaji</div></div>
    <div class="stat"><div class="k">Tugas selesai, 4 minggu</div><div class="v">${Math.round(doneP * 100)}%</div><div class="s">${last4.length} SPL ditutup</div></div>
    <div class="stat"><div class="k">Jam lembur tanpa hasil</div><div class="v ${noRes ? "bad" : ""}">${noRes}</div><div class="s">tugas tidak selesai, 4 minggu</div></div>
    <div class="stat"><div class="k">Biaya lembur November</div><div class="v">${rpS(DEPT.filter(x => !dep || x.id === dep).reduce((a, x) => a + novSpent(x.id), 0))}</div><div class="s">dari anggaran ${rpS(DEPT.filter(x => !dep || x.id === dep).reduce((a, x) => a + x.budget, 0))}</div></div>
  </div>
  <section class="card"><div class="bd flush tw"><table class="tbl"><thead><tr><th>No.</th><th>Tanggal</th><th>Departemen</th><th>Tugas</th><th>Orang</th><th class="num">Jam rencana</th><th class="num">Jam aktual</th><th>KPI target → hasil</th><th>Status</th><th></th></tr></thead><tbody>
  ${list.slice(0, 80).map(s => { const dp = deptById(s.dept), k = KPI[dp.kind]; return `<tr class="click" data-spl="${s.id}"><td class="num">${s.id}</td><td class="nowrap">${dShort(s.d)}<span class="sub">mulai ${s.start}</span></td><td>${dp.n}</td><td style="max-width:300px">${esc(s.task)}${s.ticket ? `<span class="sub">${s.ticket}</span>` : ""}</td><td>${names(s.people)}<span class="sub">${s.people.length} orang</span></td><td class="num">${splPlan(s)}</td><td class="num">${s.status === "rencana" || s.status === "tutup" ? "—" : splHours(s)}</td><td class="nowrap">${fmt(s.target)} ${k.u}${s.result != null ? ` → <b style="font-weight:600">${fmt(s.result)}</b>` : ""}</td><td><span class="tag ${STAT[s.status][0]}">${STAT[s.status][1]}</span></td><td class="right">${s.status === "tutup" ? `<button class="btn sm pri" data-close-spl="${s.id}">Tutup</button>` : ""}</td></tr>`; }).join("") || `<tr><td colspan="10" class="empty">Tidak ada SPL untuk filter ini.</td></tr>`}
  </tbody></table></div></section>
  ${list.length > 80 ? `<p class="small muted">Menampilkan 80 dari ${list.length}.</p>` : ""}
  <p class="small muted">Jam lembur yang benar-benar dikerjakan tetap dibayar walaupun tugasnya tidak selesai. Tugas yang tidak selesai ditandai di Monitor lembur supaya penyebabnya diperbaiki.</p>`;
};
PAGES.lembur.after = () => {
  $("#spldep").onchange = e => { UI.splDept = e.target.value; rerender(); };
  $$("[data-splst]").forEach(b => b.onclick = () => { UI.splSt = b.dataset.splst; rerender(); });
  $("#splnew").onclick = () => newSPL();
  $$("[data-close-spl]").forEach(b => b.onclick = e => { e.stopPropagation(); closeSPL(SPL.find(s => s.id === b.dataset.closeSpl)); });
  $$("[data-spl]").forEach(r => r.onclick = () => { const s = SPL.find(x => x.id === r.dataset.spl); s.status === "tutup" ? closeSPL(s) : viewSPL(s); });
  $("#splexp").onclick = () => download("perintah-lembur.csv", csv([["SPL","Tanggal","Departemen","Tugas","Tiket","ID","Nama","Jam rencana","Jam aktual","Target KPI","Hasil","Status","Biaya"], ...SPL.flatMap(s => s.people.map(p => [s.id, dDate(dt(s.d)), deptById(s.dept).n, s.task, s.ticket || "", p.id, wById(p.id).name, p.plan, p.actual ?? "", s.target, s.result ?? "", STAT[s.status][1], Math.round(otPay(wById(p.id).rate, p.actual ?? p.plan, dow(s.d) === 0))]))]));
};
function viewSPL(s){
  const dp = deptById(s.dept), k = KPI[dp.kind], t = s.ticket && TICKETS.find(x => x.id === s.ticket);
  modal(`${s.id} · ${dp.n}`, `<dl class="kv"><dt>Tanggal</dt><dd>${dLong(s.d)}, mulai ${s.start}</dd><dt>Tugas</dt><dd>${esc(s.task)}</dd>${t ? `<dt>Tiket kerusakan</dt><dd>${t.id} · ${t.mach} · ${t.issue} · mesin berhenti ${t.down} menit</dd>` : ""}<dt>KPI</dt><dd>${k.n}: target ${fmt(s.target)} ${k.u}${s.result != null ? `, hasil ${fmt(s.result)} ${k.u} (${Math.round(s.result / s.target * 100)}%)` : ""}</dd><dt>Dibuat oleh</dt><dd>${esc(s.by)}</dd><dt>Status</dt><dd><span class="tag ${STAT[s.status][0]}">${STAT[s.status][1]}</span>${s.note ? " · " + esc(s.note) : ""}</dd><dt>Biaya</dt><dd>${rp(splCost(s))}</dd></dl>
    <div class="tw"><table class="tbl"><thead><tr><th>Nama</th><th class="num">Rencana</th><th class="num">Aktual</th><th class="num">Upah lembur</th></tr></thead><tbody>${s.people.map(p => { const w = wById(p.id); return `<tr><td>${esc(w.name)}<span class="sub">${w.id} · ${w.role}</span></td><td class="num">${p.plan} j</td><td class="num">${p.actual ?? "—"}${p.actual != null ? " j" : ""}</td><td class="num">${rp(otPay(w.rate, p.actual ?? p.plan, dow(s.d) === 0))}</td></tr>`; }).join("")}</tbody></table></div>`,
    s.status === "rencana" ? `<button class="btn danger" id="splcancel">Batalkan SPL</button><button class="btn pri" data-close>Tutup</button>` : `<button class="btn pri" data-close>Tutup</button>`, {wide:true});
  const c = $("#splcancel"); if (c) c.onclick = () => { SPL.splice(SPL.indexOf(s), 1); closeModal(); toast(`${s.id} dibatalkan. ${s.people.length} orang mendapat notifikasi.`); rerender(); };
}
function closeSPL(s){
  const dp = deptById(s.dept), k = KPI[dp.kind];
  modal(`Tutup ${s.id}`, `<div class="small muted">${dLong(s.d)} · ${dp.full} · ${esc(s.task)}</div>
    <fieldset style="border:0;margin:0;padding:0"><legend class="lbl" style="margin-bottom:6px">Tugas</legend><div class="opts"><label><input type="radio" name="sdone" value="1" checked>Selesai</label><label><input type="radio" name="sdone" value="0">Tidak selesai</label></div></fieldset>
    <div class="grid g2" style="gap:12px"><div class="field"><label for="sres">Hasil: ${k.n} (target ${fmt(s.target)} ${k.u})</label><input type="number" id="sres" min="0" value="${s.target}"></div>
    <div class="field"><label for="snote">Catatan (wajib kalau tidak selesai)</label><input type="text" id="snote"></div></div>
    <div class="tw"><table class="tbl"><thead><tr><th>Nama</th><th class="num">Rencana</th><th>Jam aktual</th><th>Absen pulang</th></tr></thead><tbody>${s.people.map((p, i) => { const w = wById(p.id); const out = (parseInt(s.start) + p.plan + (hash(p.id + s.id) < .3 ? 1 : 0)) % 24; return `<tr><td>${esc(w.name)}<span class="sub">${w.role}</span></td><td class="num">${p.plan} j</td><td><input type="number" min="0" max="${R.otDay}" step="0.5" value="${p.plan}" data-act="${i}" style="width:80px" aria-label="Jam aktual ${esc(w.name)}"></td><td class="small muted">${pad(out)}.${pad(Math.round(hash(p.id) * 50))} · ${hash(p.id + "g") < .5 ? "gerbang 2" : "RFID mesin"}</td></tr>`; }).join("")}</tbody></table></div>
    <div id="serr"></div><div class="note">Jam aktual dicocokkan dengan absen pulang. Setelah ditutup, jam ini masuk penggajian periode 21 Nov – 20 Des dengan tarif lembur.</div>`,
    `<button class="btn" data-close>Batal</button><button class="btn pri" id="ssave">Tutup SPL dan kirim ke gaji</button>`, {wide:true});
  $("#ssave").onclick = () => {
    const done = $("input[name=sdone]:checked").value === "1", note = $("#snote").value.trim();
    const acts = $$("[data-act]").map(i => Math.max(0, Math.min(R.otDay, +i.value || 0)));
    if (!done && !note) { $("#serr").innerHTML = '<div class="note bad">Tulis kenapa tugas tidak selesai.</div>'; return; }
    s.people.forEach((p, i) => p.actual = acts[i]); s.status = done ? "selesai" : "tidak"; s.result = +$("#sres").value || 0; s.note = note;
    closeModal(); toast(`${s.id} ditutup. ${splHours(s)} jam (${rp(splCost(s))}) masuk penggajian${done ? "" : ", ditandai tidak selesai di Monitor lembur"}.`); rerender();
  };
}
function newSPL(){
  const dep0 = myDept() || UI.splDept || "S3";
  modal("Buat perintah lembur (SPL)", `
    <div class="grid g2" style="gap:12px">
      <div class="field"><label for="ndep">Departemen</label>${deptSelect(dep0, 'id="ndep"', null)}</div>
      <div class="field"><label for="nday">Tanggal</label><select id="nday">${[0,1,2,3,4,5,6].map(d => `<option value="${d}">${dLong(d)}</option>`).join("")}</select></div>
      <div class="field"><label for="nstart">Mulai</label><select id="nstart"><option>15.00</option><option>23.00</option><option>07.00</option><option>16.00</option></select></div>
      <div class="field"><label for="nh">Jam lembur per orang</label><input type="number" id="nh" min="1" max="${R.otDay}" value="3"></div>
      <div class="field" style="grid-column:1/-1" id="ntaskf"></div>
      <div class="field"><label for="ntarget" id="ntl">Target KPI</label><input type="number" id="ntarget" min="1" value="400"></div>
    </div>
    <div><div class="lbl" style="margin-bottom:6px">Pilih orang</div><div class="tw" style="max-height:280px;border:1px solid var(--line);border-radius:5px"><table class="tbl" id="npeople"></table></div></div>
    <div id="nbud"></div>`,
    `<button class="btn" data-close>Batal</button><button class="btn pri" id="nsave" disabled>Kirim SPL</button>`, {wide:true});
  const draw = () => {
    const dp = deptById($("#ndep").value), d = +$("#nday").value, h = Math.max(1, Math.min(8, +$("#nh").value || 1)), k = KPI[dp.kind];
    const open = TICKETS.filter(t => t.open);
    if (!$("#ntaskf").dataset.dep || $("#ntaskf").dataset.dep !== dp.id) {
      $("#ntaskf").dataset.dep = dp.id;
      $("#ntaskf").innerHTML = dp.kind === "mek" ? `<label for="ntask">Tiket kerusakan</label><select id="ntask">${open.map(t => `<option value="${t.id}">${t.id} · ${t.mach} · ${t.issue} (berhenti ${t.down} mnt)</option>`).join("")}</select>` : `<label for="ntask">Tugas</label><input type="text" id="ntask" value="${esc(TASKS[dp.kind][0][0])}">`;
      $("#ntl").textContent = "Target KPI: " + k.n + " (" + k.u + ")"; $("#ntarget").value = dp.kind === "mek" ? open[0].down : TASKS[dp.kind][0][1];
      const ts = $("#ntask"); if (dp.kind === "mek") ts.onchange = () => { $("#ntarget").value = TICKETS.find(t => t.id === ts.value).down; };
      ts.oninput = upd;
    }
    const checked = new Set($$("[data-np]:checked").map(c => c.dataset.np));
    const list = pool(dp.id).map(w => { const day = otDayH(w.id, d), week = otWeekH(w.id, wk(d)), sh = empShift(w, d); const why = h > R.otDay ? `lebih dari ${R.otDay} jam per hari` : day + h > R.otDay ? `sudah ${day} jam lembur hari itu` : week + h > R.otWeek ? `sudah ${week} jam minggu ini, batas ${R.otWeek}` : ""; return {w, day, week, sh, why}; })
      .sort((a, b) => !!a.why - !!b.why || a.week - b.week);
    $("#npeople").innerHTML = `<thead><tr><th></th><th>Nama</th><th>Shift hari itu</th><th class="num">Lembur minggu ini</th><th>Catatan</th></tr></thead><tbody>${list.slice(0, 40).map(x => `<tr><td><input type="checkbox" data-np="${x.w.id}" id="np-${x.w.id}" ${x.why ? "disabled" : checked.has(x.w.id) ? "checked" : ""}></td><td><label for="np-${x.w.id}">${esc(x.w.name)}</label><span class="sub">${x.w.role}${x.w.mach ? " · " + x.w.mach : ""}</span></td><td>${SH[x.sh] ? SH[x.sh].n : "Libur"}</td><td class="num">${x.week} / ${R.otWeek} j</td><td>${x.why ? `<span class="tag bad">Diblokir: ${x.why}</span>` : x.sh === "L" ? '<span class="tag warn">Hari libur, tarif 2×</span>' : ""}</td></tr>`).join("")}</tbody>`;
    $$("[data-np]").forEach(c => c.onchange = upd);
    upd();
  };
  const upd = () => {
    const dp = deptById($("#ndep").value), d = +$("#nday").value, h = +$("#nh").value || 0;
    const sel = $$("[data-np]:checked").map(c => wById(c.dataset.np));
    const cost = sel.reduce((a, w) => a + otPay(w.rate, h, dow(d) === 0), 0);
    const before = (novSpent(dp.id) + novPlan(dp.id)) / dp.budget, after = before + cost / dp.budget;
    const capErr = h > R.otDay ? `Lembur maksimal ${R.otDay} jam per hari.` : "";
    $("#nbud").innerHTML = capErr ? `<div class="note bad">${capErr} SPL tidak bisa dikirim.</div>` : sel.length ? `<div class="note ${after >= 1 ? "bad" : after >= .8 ? "warn" : ""}">${sel.length} orang × ${h} jam = ${sel.length * h} jam, biaya ${rp(cost)}. Anggaran lembur ${dp.n} bulan ini ${Math.round(before * 100)}% terpakai, jadi ${Math.round(after * 100)}% setelah SPL ini.${after >= 1 ? " Perlu persetujuan Kepala Produksi." : after >= .8 ? " Sudah di atas 80%." : ""}</div>` : "";
    $("#nsave").disabled = !sel.length || !!capErr || !($("#ntask")?.value || "").trim();
  };
  ["ndep","nday","nh"].forEach(i => $("#" + i).addEventListener("input", draw));
  $("#ndep").addEventListener("change", draw);
  draw();
  $("#nsave").onclick = () => {
    const dp = deptById($("#ndep").value), d = +$("#nday").value, h = +$("#nh").value, sel = $$("[data-np]:checked").map(c => c.dataset.np);
    for (const id of sel) if (otDayH(id, d) + h > R.otDay || otWeekH(id, wk(d)) + h > R.otWeek) { toast("Ada orang yang melewati batas lembur. SPL tidak dikirim."); return; }
    const t = dp.kind === "mek" ? TICKETS.find(x => x.id === $("#ntask").value) : null;
    const s = {id: "SPL-" + (1000 + SPL.length), dept: dp.id, d, start: $("#nstart").value, task: t ? "Perbaikan " + t.mach + ": " + t.issue.toLowerCase() : $("#ntask").value.trim(), ticket: t ? t.id : undefined, target: +$("#ntarget").value || 0, by: roleOf().id === dp.id ? roleOf().n : dp.mgr, people: sel.map(id => ({id, plan: h, actual: null})), status: "rencana", result: null, note: ""};
    if (t) t.open = false;
    SPL.unshift(s); closeModal(); UI.splSt = "rencana"; UI.splDept = dp.id;
    toast(`${s.id} dikirim ke HP ${sel.length} orang. Mereka konfirmasi di aplikasi sebelum mulai.`); location.hash === "#lembur" ? rerender() : (location.hash = "lembur");
  };
}

/* ======================= Monitor lembur ======================= */
function flags(){
  const out = [];
  for (const s of SPL) {
    if (s.d >= 0 || s.d < -28 || s.status === "tutup") continue;
    const over = s.people.filter(p => p.actual > p.plan).length;
    if (s.status === "tidak") out.push([s, "Tugas tidak selesai", s.note]);
    else if (s.result != null && s.result < s.target * .7) out.push([s, "Hasil di bawah 70% target", fmt(s.result) + " dari " + fmt(s.target) + " " + KPI[deptById(s.dept).kind].u]);
    else if (over >= 2) out.push([s, "Jam aktual melebihi rencana", over + " orang lebih lama dari rencana"]);
  }
  return out;
}
function repeaters(){
  const out = [];
  for (const w of EMP) {
    const weeks = [-4, -3, -2, -1].map(k => otWeekH(w.id, k));
    const n = weeks.filter(h => h > 0).length, heavy = weeks.filter(h => h >= 12).length;
    if (n >= 4 || heavy >= 2) out.push({w, weeks, why: n >= 4 ? "Lembur 4 minggu berturut-turut" : heavy + " minggu di atas 12 jam"});
  }
  return out;
}
function recurring(){
  const out = [];
  for (const dp of DEPT) for (let wd = 0; wd < 7; wd++) {
    const per = [-6, -5, -4, -3, -2, -1].map(k => SPL.filter(s => s.dept === dp.id && wk(s.d) === k && dow(s.d) === wd).reduce((a, s) => a + splHours(s), 0));
    const hit = per.filter(h => h >= 6).length;
    if (hit >= 4) {
      const avgH = per.reduce((a, b) => a + b, 0) / 6, cost = SPL.filter(s => s.dept === dp.id && wk(s.d) >= -6 && wk(s.d) < 0 && dow(s.d) === wd).reduce((a, s) => a + splCost(s), 0) / 6;
      const add = Math.ceil(avgH / 7), alt = add * (daily() + R.meal);
      out.push({dp, wd, hit, avgH, cost, add, alt});
    }
  }
  return out;
}
PAGES.monitor = () => {
  const weeks = [-8, -7, -6, -5, -4, -3, -2, -1, 0];
  const grid = DEPT.map(dp => weeks.map(k => { const ss = SPL.filter(s => s.dept === dp.id && wk(s.d) === k); return {h: ss.reduce((a, s) => a + splHours(s), 0), c: ss.reduce((a, s) => a + splCost(s), 0), n: ss.length}; }));
  const max = Math.max(...grid.flat().map(x => x.h), 1);
  const lastWk = grid.reduce((a, r) => a + r[7].h, 0), avg = grid.reduce((a, r) => a + r.slice(0, 7).reduce((b, x) => b + x.h, 0), 0) / 7;
  const totSp = DEPT.reduce((a, x) => a + novSpent(x.id), 0), totB = DEPT.reduce((a, x) => a + x.budget, 0);
  const fl = flags(), rep = repeaters(), rec = recurring();
  const noRes = fl.filter(f => f[1] === "Tugas tidak selesai").reduce((a, f) => a + splHours(f[0]), 0), last4 = SPL.filter(s => s.d < 0 && s.d >= -28).reduce((a, s) => a + splHours(s), 0);
  const md = myDept();
  return `<div class="pagehead"><div><h1>Monitor lembur</h1><div class="sub">Untuk kepala produksi dan manajer seksi. Angka per tim. Nama hanya terlihat oleh atasan langsung.</div></div>
    <div class="actions"><a class="btn" href="#kpi">KPI departemen</a><a class="btn pri" href="#lembur">Perintah lembur</a></div></div>
  <div class="stats">
    <div class="stat"><div class="k">Jam lembur minggu lalu</div><div class="v">${lastWk}</div><div class="s">rata-rata 7 minggu sebelumnya ${Math.round(avg)}</div></div>
    <div class="stat"><div class="k">Biaya lembur November</div><div class="v ${totSp / totB >= .8 ? "warn" : ""}">${rpS(totSp)}</div><div class="s">${Math.round(totSp / totB * 100)}% dari ${rpS(totB)}, hari ke-23 dari 30</div></div>
    <div class="stat"><div class="k">Jam tanpa hasil, 4 minggu</div><div class="v ${noRes ? "bad" : ""}">${noRes}</div><div class="s">${last4 ? Math.round(noRes / last4 * 100) : 0}% dari ${last4} jam lembur</div></div>
    <div class="stat"><div class="k">Lembur berulang</div><div class="v ${rep.length ? "warn" : ""}">${rep.length}</div><div class="s">orang, risiko lelah dan kurang orang</div></div>
  </div>
  <section class="card" style="margin-bottom:16px"><div class="hd"><h2>Jam lembur per minggu</h2><span class="more small muted">arahkan kursor ke sel untuk rincian</span></div>
    <div class="bd flush tw"><table class="tbl" style="min-width:820px"><thead><tr><th>Departemen</th>${weeks.map(k => `<th class="num">${wkLabel(k)}</th>`).join("")}<th class="num">Total</th></tr></thead><tbody>
    ${DEPT.map((dp, i) => `<tr><td>${dp.full}</td>${grid[i].map((x, j) => `<td class="num" style="${seqCell(x.h, max)};border-left:2px solid #fff" title="${dp.n} · ${wkLabel(weeks[j])}: ${x.h} jam · ${rpS(x.c)} · ${x.n} SPL">${x.h || ""}</td>`).join("")}<td class="num"><b style="font-weight:600">${grid[i].reduce((a, x) => a + x.h, 0)}</b></td></tr>`).join("")}
    </tbody></table></div>
    <div class="bd small muted" style="display:flex;gap:6px;align-items:center;border-top:1px solid var(--line2)">0 jam ${SEQ.map(c => `<span style="display:inline-block;width:22px;height:12px;background:${c};border-radius:2px"></span>`).join("")} ${max} jam per minggu</div></section>
  <div class="grid g2">
    <section class="card"><div class="hd"><h2>Anggaran lembur November</h2><span class="more small muted">terpakai + direncanakan</span></div><div class="bd flush tw"><table class="tbl"><thead><tr><th>Departemen</th><th class="num">Terpakai</th><th class="num">Rencana</th><th class="num">Anggaran</th><th style="width:140px"></th><th>Status</th></tr></thead><tbody>
      ${DEPT.map(dp => { const sp = novSpent(dp.id), pl = novPlan(dp.id), p = (sp + pl) / dp.budget; return `<tr><td>${dp.n}</td><td class="num">${rpS(sp)}</td><td class="num">${pl ? rpS(pl) : "—"}</td><td class="num">${rpS(dp.budget)}</td><td><div class="bar ${p >= 1 ? "" : p >= .8 ? "warn" : "ok"}" title="${Math.round(p * 100)}%"><i style="width:${Math.min(100, p * 100)}%;${p >= 1 ? "background:var(--bad)" : ""}"></i></div><span class="small muted">${Math.round(p * 100)}%</span></td><td>${budgetTag(p)}</td></tr>`; }).join("")}
    </tbody></table></div></section>
    <section class="card"><div class="hd"><h2>Lembur tanpa hasil</h2><span class="more small muted">4 minggu terakhir</span></div><ul class="list">
      ${fl.slice(0, 7).map(([s, t, d]) => `<li><span class="dot ${t === "Tugas tidak selesai" ? "bad" : "warn"}" style="margin-top:6px"></span><div class="grow"><b>${t}</b> · ${deptById(s.dept).n}<div class="meta">${s.id} · ${dShort(s.d)} · ${esc(s.task)} · ${splHours(s)} jam, ${rp(splCost(s))}${d ? " · " + esc(d) : ""}</div></div><button class="btn sm" data-spl="${s.id}">Lihat</button></li>`).join("") || '<li class="muted">Tidak ada.</li>'}
      ${fl.length > 7 ? `<li class="muted small">dan ${fl.length - 7} lainnya</li>` : ""}</ul></section>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <section class="card"><div class="hd"><h2>Saran roster</h2><span class="more small muted">lembur yang terulang di hari yang sama</span></div><ul class="list">
      ${rec.map(r => `<li><div class="grow"><b>${r.dp.n}: lembur hampir setiap ${DAYL[r.wd]}</b><div class="meta">${r.hit} dari 6 minggu terakhir, rata-rata ${dec(r.avgH)} jam, ${rp(r.cost)} per minggu. Menambah ${r.add} orang di shift ${DAYL[r.wd]} lewat roster sekitar ${rp(r.alt)} per minggu${r.alt < r.cost ? `, hemat ${rp(r.cost - r.alt)}` : ""}.</div></div>${r.dp.kind === "prod" ? `<button class="btn sm" data-rost="${r.dp.id}">Buka roster</button>` : ""}</li>`).join("") || '<li class="muted">Belum ada pola berulang.</li>'}</ul></section>
    <section class="card"><div class="hd"><h2>Lembur berulang</h2><span class="more small muted">orang yang lembur terus, 4 minggu</span></div>
      ${md ? `<ul class="list">${rep.filter(x => x.w.dept === md).slice(0, 8).map(x => `<li><span class="av sm">${initials(x.w.name)}</span><div class="grow"><b>${esc(x.w.name)}</b><div class="meta">${x.why} · ${x.weeks.join(" / ")} jam</div></div></li>`).join("") || '<li class="muted">Tidak ada di tim Anda.</li>'}</ul>` : `<div class="bd flush tw"><table class="tbl"><thead><tr><th>Departemen</th><th class="num">Orang</th></tr></thead><tbody>${DEPT.map(dp => [dp, rep.filter(x => x.w.dept === dp.id).length]).filter(x => x[1]).map(([dp, n]) => `<tr><td>${dp.n}</td><td class="num">${n}</td></tr>`).join("") || '<tr><td colspan="2" class="empty">Tidak ada.</td></tr>'}</tbody></table></div><div class="bd small muted" style="border-top:1px solid var(--line2)">Nama terlihat oleh manajer masing-masing. <button class="btn sm" data-as="S3">Lihat sebagai Manajer Seksi 3</button></div>`}</section>
  </div>
  <section class="card" style="margin-top:16px"><div class="hd"><h2>Pembagian lembur</h2><span class="more small muted">4 minggu terakhir · apakah lembur merata di tim</span></div>
    <div class="bd flush tw"><table class="tbl"><thead><tr><th>Departemen</th><th class="num">Anggota tim</th><th class="num">Ikut lembur</th><th class="num">Jam lembur</th><th class="num">Diambil 20% teratas</th><th>Penilaian</th></tr></thead><tbody>
    ${DEPT.map(dp => { const ppl = pool(dp.id).map(w => [-4, -3, -2, -1].reduce((a, k) => a + otWeekH(w.id, k), 0)).sort((a, b) => b - a); const tot = ppl.reduce((a, b) => a + b, 0), ik = ppl.filter(h => h > 0).length, top = ppl.slice(0, Math.max(1, Math.ceil(ik * .2))).reduce((a, b) => a + b, 0), sh = tot ? top / tot : 0; return `<tr><td>${dp.n}</td><td class="num">${ppl.length}</td><td class="num">${ik}</td><td class="num">${tot}</td><td class="num">${tot ? Math.round(sh * 100) + "%" : "—"}</td><td>${!tot ? "" : sh > .45 ? '<span class="tag warn">Tidak merata</span>' : '<span class="tag ok">Cukup merata</span>'}</td></tr>`; }).join("")}
    </tbody></table></div>
    ${md ? `<div class="bd" style="border-top:1px solid var(--line2)"><h3 style="margin-bottom:8px">Tim ${deptById(md).n}: jam lembur per orang</h3>${pool(md).map(w => [w, [-4, -3, -2, -1].reduce((a, k) => a + otWeekH(w.id, k), 0)]).filter(x => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w, h], i, a) => `<div style="display:grid;grid-template-columns:200px 1fr 60px;gap:10px;align-items:center;margin:4px 0" class="small"><span>${esc(w.name)}</span><div class="bar"><i style="width:${h / a[0][1] * 100}%"></i></div><span class="num right">${h} j</span></div>`).join("")}</div>` : ""}</section>`;
};
PAGES.monitor.after = () => {
  bindAs();
  $$("[data-spl]").forEach(b => b.onclick = () => viewSPL(SPL.find(s => s.id === b.dataset.spl)));
  $$("[data-rost]").forEach(b => b.onclick = () => { UI.rosterSec = b.dataset.rost; location.hash = "jadwal"; });
};

/* ======================= KPI departemen ======================= */
UI.kpiDept = null;
function weeklyKpi(dp, k){
  const ot = SPL.filter(s => s.dept === dp.id && wk(s.d) === k).reduce((a, s) => a + splHours(s), 0), n = hash(dp.id + k);
  if (dp.kind === "mek") return Math.round(1000 - ot * 9 + n * 150);
  if (dp.kind === "qc") return +(1.9 - ot * .025 + n * .35).toFixed(2);
  if (dp.kind === "gdg") return Math.min(100, Math.round(88 + ot * .25 + n * 6));
  const ops = pool(dp.id).map(w => opWeek(w, k * 7, k * 7 + 6)); const b = ops.reduce((a, x) => a + x.bales, 0), s = ops.reduce((a, x) => a + x.std, 0); return Math.round(b / s * 1000) / 10;
}
const KTARGET = {prod: 92, mek: 900, qc: 1.5, gdg: 95};
const kfmt = (dp, v) => dp.kind === "qc" ? dec(v, 2) + "%" : dp.kind === "mek" ? fmt(v) + " mnt" : dec(v, dp.kind === "prod" ? 1 : 0) + "%";
const kGood = (dp, v) => KPI[dp.kind].good === "down" ? v <= KTARGET[dp.kind] : v >= KTARGET[dp.kind];
PAGES.kpi = () => {
  const dp = deptById(UI.kpiDept || myDept() || "MEK"), k = KPI[dp.kind];
  const weeks = [-8, -7, -6, -5, -4, -3, -2, -1];
  const rows = weeks.map(x => { const ss = SPL.filter(s => s.dept === dp.id && wk(s.d) === x); return {k: x, v: weeklyKpi(dp, x), h: ss.reduce((a, s) => a + splHours(s), 0), c: ss.reduce((a, s) => a + splCost(s), 0), n: ss.length, ok: ss.filter(s => s.status === "selesai").length}; });
  const cur = rows[rows.length - 1], prev = rows[rows.length - 2];
  const recent = SPL.filter(s => s.dept === dp.id && s.d < 0 && s.d >= -28 && s.result != null);
  const unitCost = recent.length ? recent.reduce((a, s) => a + splCost(s), 0) / Math.max(1, recent.reduce((a, s) => a + s.result, 0)) : 0;
  const hit = recent.filter(s => s.result >= s.target * .9).length;
  const people = canSee(dp.id) ? pool(dp.id).map(w => { const my = recent.filter(s => s.people.some(p => p.id === w.id)); return {w, h: my.reduce((a, s) => a + s.people.find(p => p.id === w.id).actual, 0), n: my.length, ok: my.filter(s => s.status === "selesai").length}; }).filter(x => x.n).sort((a, b) => b.h - a.h) : null;
  return `<div class="pagehead"><div><h1>KPI departemen</h1><div class="sub">Setiap SPL menyebut KPI yang mau digerakkan. Di sini lembur dibandingkan dengan KPI utama tiap departemen.</div></div></div>
  <div class="filters"><div class="seg" role="group" aria-label="Departemen">${DEPT.map(x => `<button aria-pressed="${x.id === dp.id}" data-kd="${x.id}">${x.kind === "prod" ? x.id : x.n}</button>`).join("")}</div></div>
  <div class="stats">
    <div class="stat"><div class="k">${k.main}</div><div class="v ${kGood(dp, cur.v) ? "" : "warn"}">${kfmt(dp, cur.v)}</div><div class="s">minggu lalu · target ${kfmt(dp, KTARGET[dp.kind])} ${KPI[dp.kind].good === "down" ? "atau kurang" : "atau lebih"}</div></div>
    <div class="stat"><div class="k">Dibanding minggu sebelumnya</div><div class="v">${kfmt(dp, prev.v)}</div><div class="s">${(cur.v - prev.v) * (k.good === "down" ? -1 : 1) >= 0 ? "membaik" : "memburuk"}</div></div>
    <div class="stat"><div class="k">Lembur minggu lalu</div><div class="v">${cur.h} jam</div><div class="s">${rpS(cur.c)} · ${cur.n} SPL</div></div>
    <div class="stat"><div class="k">SPL capai target, 4 minggu</div><div class="v">${recent.length ? Math.round(hit / recent.length * 100) : 0}%</div><div class="s">${hit} dari ${recent.length} SPL</div></div>
    <div class="stat"><div class="k">Biaya lembur per ${k.u}</div><div class="v">${unitCost ? rp(unitCost) : "—"}</div><div class="s">${k.n.toLowerCase()}</div></div>
  </div>
  <div class="grid g21">
    <section class="card"><div class="hd"><h2>${k.main} vs lembur, 8 minggu</h2></div><div class="bd flush tw"><table class="tbl"><thead><tr><th>Minggu</th><th class="num">${k.main.split(" ")[0]} (${k.mu})</th><th>Target</th><th class="num">Jam lembur</th><th class="num">Biaya lembur</th><th class="num">SPL selesai</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${wkLabel(r.k)}</td><td class="num">${kfmt(dp, r.v)}</td><td>${kGood(dp, r.v) ? '<span class="tag ok">Tercapai</span>' : '<span class="tag warn">Belum</span>'}</td><td class="num">${r.h}</td><td class="num">${rpS(r.c)}</td><td class="num">${r.n ? r.ok + "/" + r.n : "—"}</td></tr>`).join("")}
    </tbody></table></div></section>
    <section class="card" style="align-self:start"><div class="hd"><h2>Cara mengukur</h2></div><div class="bd small" style="display:grid;gap:8px">
      ${{prod:"<p style='margin:0'>Hasil per jam kerja operator dari hitungan mesin, dibanding standar SKU yang jalan. Jam saat mesin rusak tidak dihitung, jadi operator tidak dirugikan oleh downtime. Rincian di <a href='#volume'>Volume operator</a>.</p><p style='margin:0'>Lembur produksi diukur dari bal tambahan yang dihasilkan selama jam lembur.</p>",
        mek:"<p style='margin:0'>Downtime karena kerusakan, dari log stop mesin. Setiap jam lembur mekanik harus menunjuk ke tiket kerusakan (WO), dan hasilnya adalah menit downtime yang dicegah sebelum shift berikutnya.</p>",
        qc:"<p style='margin:0'>Reject rate dari keluhan dan retur pelanggan, plus jumlah lot yang dicek dibanding rencana. Lembur QC diukur dari lot yang selesai dicek sebelum kirim.</p>",
        gdg:"<p style='margin:0'>Pengiriman tepat waktu (truk berangkat sesuai jadwal) dan palet yang dipindah. Lembur gudang diukur dari palet yang dimuat tepat waktu.</p>"}[dp.kind]}</div></section>
  </div>
  ${dp.kind === "mek" ? `<section class="card" style="margin-top:16px"><div class="hd"><h2>Tiket kerusakan dan lembur mekanik</h2><span class="more small muted">4 minggu terakhir dan tiket terbuka</span></div><div class="bd flush tw"><table class="tbl"><thead><tr><th>Tiket</th><th>Tanggal</th><th>Mesin</th><th>Masalah</th><th class="num">Mesin berhenti</th><th>SPL</th><th class="num">Jam lembur</th><th class="num">Downtime dicegah</th><th>Status</th></tr></thead><tbody>
    ${TICKETS.filter(t => t.open || t.d >= -28).sort((a, b) => b.open - a.open || b.d - a.d).slice(0, 18).map(t => { const s = SPL.find(x => x.ticket === t.id); return `<tr><td class="num">${t.id}</td><td>${dShort(t.d)}</td><td>${t.mach}</td><td>${t.issue}</td><td class="num">${t.down} mnt</td><td>${s ? s.id : "—"}</td><td class="num">${s ? splHours(s) : "—"}</td><td class="num">${s && s.result != null ? s.result + " mnt" : "—"}</td><td>${t.open ? '<span class="tag warn">Terbuka</span>' : s ? `<span class="tag ${STAT[s.status][0]}">${STAT[s.status][1]}</span>` : ""}</td></tr>`; }).join("")}
  </tbody></table></div></section>` : ""}
  <section class="card" style="margin-top:16px"><div class="hd"><h2>SPL dan hasilnya</h2><span class="more small muted">4 minggu terakhir</span></div><div class="bd flush tw"><table class="tbl"><thead><tr><th>SPL</th><th>Tanggal</th><th>Tugas</th><th class="num">Jam</th><th class="num">Biaya</th><th class="num">Target</th><th class="num">Hasil</th><th class="num">Tercapai</th><th class="num">Biaya per ${k.u}</th></tr></thead><tbody>
    ${recent.slice(0, 20).map(s => `<tr class="click" data-spl="${s.id}"><td class="num">${s.id}</td><td>${dShort(s.d)}</td><td>${esc(s.task)}</td><td class="num">${splHours(s)}</td><td class="num">${rp(splCost(s))}</td><td class="num">${fmt(s.target)}</td><td class="num">${fmt(s.result)}</td><td class="num"><span class="tag ${s.result >= s.target * .9 ? "ok" : s.result >= s.target * .7 ? "warn" : "bad"}">${Math.round(s.result / s.target * 100)}%</span></td><td class="num">${s.result ? rp(splCost(s) / s.result) : "—"}</td></tr>`).join("") || '<tr><td colspan="9" class="empty">Belum ada SPL yang ditutup.</td></tr>'}
  </tbody></table></div></section>
  <section class="card" style="margin-top:16px"><div class="hd"><h2>Per orang</h2></div>${people ? `<div class="bd flush tw"><table class="tbl"><thead><tr><th>Nama</th><th class="num">SPL</th><th class="num">Jam lembur</th><th class="num">Tugas selesai</th></tr></thead><tbody>${people.slice(0, 20).map(x => `<tr><td>${personCell(x.w)}</td><td class="num">${x.n}</td><td class="num">${x.h}</td><td class="num">${Math.round(x.ok / x.n * 100)}%</td></tr>`).join("")}</tbody></table></div>` : `<div class="bd">${lockNote(dp.id)}</div>`}</section>`;
};
PAGES.kpi.after = () => { bindAs(); $$("[data-kd]").forEach(b => b.onclick = () => { UI.kpiDept = b.dataset.kd; rerender(); }); $$("[data-spl]").forEach(r => r.onclick = () => viewSPL(SPL.find(s => s.id === r.dataset.spl))); };

/* ======================= Volume operator ======================= */
UI.volSec = null;
PAGES.volume = () => {
  const sec = UI.volSec || (SEC.some(s => s.id === UI.role) ? UI.role : "S3");
  const teams = SEC.map(s => { const ops = pool(s.id).map(w => opWeek(w)); const b = ops.reduce((a, x) => a + x.bales, 0), h = ops.reduce((a, x) => a + x.hrs, 0), st = ops.reduce((a, x) => a + x.std, 0), dn = ops.reduce((a, x) => a + x.down, 0); return {s, ops, b, h, pct: b / st, dn, n: ops.length}; });
  const t = teams.find(x => x.s.id === sec);
  return `<div class="pagehead"><div><h1>Volume operator</h1><div class="sub">${dShort(-7)} – ${dShort(-1)} · dari hitungan mesin, dikaitkan ke operator yang login di mesin tiap shift. Jam saat mesin rusak tidak dihitung.</div></div>
    <div class="actions"><label class="sr" for="vsec">Seksi</label>${selectSec(sec, 'id="vsec"', null)}</div></div>
  <section class="card"><div class="hd"><h2>Per seksi</h2><span class="more small muted">% standar = hasil dibanding kecepatan standar SKU yang jalan</span></div><div class="bd flush tw"><table class="tbl"><thead><tr><th>Seksi</th><th class="num">Operator</th><th class="num">Jam di mesin</th><th class="num">Bal</th><th class="num">Bal per jam</th><th class="num">% standar</th><th class="num">Downtime tidak dihitung</th><th class="num">Lembur produksi</th></tr></thead><tbody>
    ${teams.map(x => `<tr ${x.s.id === sec ? 'style="background:#f5f8fd"' : ""}><td>${x.s.n}</td><td class="num">${x.n}</td><td class="num">${fmt(x.h)}</td><td class="num">${fmt(x.b)}</td><td class="num">${fmt(x.b / x.h)}</td><td class="num"><span class="tag ${x.pct >= .92 ? "ok" : "warn"}">${dec(x.pct * 100)}%</span></td><td class="num">${dec(x.dn)} j</td><td class="num">${SPL.filter(s => s.dept === x.s.id && s.d >= -7 && s.d < 0).reduce((a, s) => a + splHours(s), 0)} j</td></tr>`).join("")}
  </tbody></table></div></section>
  <section class="card" style="margin-top:16px"><div class="hd"><h2>Operator ${t.s.n}</h2></div>
    ${canSee(sec) ? `<div class="bd flush tw"><table class="tbl"><thead><tr><th>Operator</th><th>Mesin</th><th>Regu</th><th class="num">Shift</th><th class="num">Jam di mesin</th><th class="num">Bal</th><th class="num">Bal per jam</th><th class="num">% standar</th><th class="num">Lembur</th><th>Catatan</th></tr></thead><tbody>
      ${t.ops.sort((a, b) => b.pct - a.pct).map(x => `<tr><td>${personCell(x.w, x.w.id)}</td><td>${x.w.mach}</td><td>${x.w.oregu}</td><td class="num">${x.shifts}</td><td class="num">${dec(x.hrs)}</td><td class="num">${fmt(x.bales)}</td><td class="num">${fmt(x.perH)}</td><td class="num"><span class="tag ${x.pct >= .92 ? "ok" : x.pct >= .86 ? "" : "warn"}">${dec(x.pct * 100)}%</span></td><td class="num">${[-7,-6,-5,-4,-3,-2,-1].reduce((a, d) => a + otDayH(x.w.id, d), 0)} j</td><td class="small muted">${x.pct < .86 ? "Cek bersama: setting, bahan, atau perlu pelatihan" : x.down > 1 ? dec(x.down) + " j downtime tidak dihitung" : ""}</td></tr>`).join("")}
    </tbody></table></div><div class="bd small muted" style="border-top:1px solid var(--line2)">Hanya Anda dan operator yang bersangkutan yang melihat angka per orang. Pakai untuk coaching, bukan peringkat.</div>` : `<div class="bd">${lockNote(sec)}</div>`}</section>`;
};
PAGES.volume.after = () => { bindAs(); $("#vsec").onchange = e => { UI.volSec = e.target.value; rerender(); }; };

/* ======================= Tampilan HP pekerja ======================= */
UI.hpWho = null; UI.hpKind = "opr";
const hpCands = kind => kind === "os"
  ? [...W.filter(w => w.sec === "S3" && w.regu === "A" && w.ag !== "KRY").sort((x, y) => (y.role === "Packer") - (x.role === "Packer")).slice(0, 8), ...W.filter(w => w.sec === "S1" && w.regu === "B" && w.ag === "MKS").slice(0, 4), ...W.filter(w => w.ag === "PHL").slice(0, 3)]
  : [...pool("S3").slice(0, 10), ...pool("MEK").slice(0, 4), ...pool("GDG").slice(0, 3)];
const big = (v, l) => `<div><div style="font-size:22px;font-weight:650">${v}</div><div class="small muted">${l}</div></div>`;
function phoneEmp(w){
  const mine = SPL.filter(s => s.people.some(p => p.id === w.id)), me = s => s.people.find(p => p.id === w.id);
  const cur = mine.filter(s => s.d >= -2 && s.status !== "rencana");
  const appr = cur.filter(s => s.status === "selesai" || s.status === "tidak").reduce((a, s) => a + me(s).actual, 0), wait = cur.filter(s => s.status === "tutup").reduce((a, s) => a + me(s).plan, 0);
  const prev = mine.filter(s => s.d >= -33 && s.d <= -3), last = prev.reduce((a, s) => a + (me(s).actual || 0), 0), lastPay = prev.reduce((a, s) => a + otPay(w.rate, me(s).actual || 0, dow(s.d) === 0), 0);
  const up = mine.filter(s => s.status === "rencana");
  const op = w.mach ? opWeek(w) : null, team = w.mach ? (() => { const o = pool(w.dept).map(x => opWeek(x)); return o.reduce((a, x) => a + x.bales, 0) / o.reduce((a, x) => a + x.std, 0); })() : null;
  return `<div class="phone"><div class="ph"><div class="small" style="opacity:.8">${dLong(0)}</div><div style="font-size:18px;font-weight:650;margin-top:2px">Halo, ${esc(w.name.split(" ")[0])}</div><div class="small" style="opacity:.8">${w.role}${w.mach ? " · " + w.mach : ""} · ${deptById(w.dept).n}${w.oregu ? " · Regu " + w.oregu : ""}</div></div>
    <div class="pb">
      ${weekCard(w, d => empShift(w, d))}
      <div class="card"><div class="bd"><div class="small muted">Lembur periode ini (21 Nov – 20 Des)</div><div style="display:flex;gap:18px;margin-top:4px">${big(appr + " j", "disetujui")}${big(wait + " j", "menunggu ditutup")}${big(otWeekH(w.id, 0) + " / " + R.otWeek, "jam minggu ini")}</div></div></div>
      ${up.length ? `<div class="card"><div class="hd"><h3>SPL untuk Anda</h3></div><ul class="list">${up.map(s => `<li><div class="grow"><b>${dShort(s.d)} · ${s.start}, ${me(s).plan} jam</b><div class="meta">${esc(s.task)}</div></div><button class="btn sm pri" data-hpok="${s.id}">${s.ok ? "Dikonfirmasi" : "Konfirmasi"}</button></li>`).join("")}</ul></div>` : ""}
      ${op ? `<div class="card"><div class="bd"><div class="small muted">Hasil saya minggu lalu</div><div style="font-size:22px;font-weight:650;margin-top:2px">${dec(op.pct * 100)}% <span class="small muted" style="font-weight:500">dari standar</span></div><div class="bar" style="margin:8px 0 4px"><i style="width:${Math.min(100, op.pct * 100)}%"></i></div><div class="small muted">${fmt(op.bales)} bal di ${w.mach} · ${fmt(op.perH)} bal per jam · rata-rata tim ${dec(team * 100)}%${op.down ? ` · ${dec(op.down)} jam mesin rusak tidak dihitung` : ""}</div></div></div>` : ""}
      <div class="card"><div class="bd"><div class="small muted">Gaji 21 Okt – 20 Nov · dibayar 25 Nov</div><div style="font-size:20px;font-weight:650;margin-top:2px">${rp(payLine(w).net)}</div><div class="small muted">termasuk lembur ${last} jam, ${rp(lastPay)} · upah ${rp(w.rate)} per jam</div><button class="btn sm" style="margin-top:8px" data-hpslip>Lihat slip</button></div></div>
      <div class="card"><div class="hd"><h3>Riwayat lembur</h3></div><ul class="list">${mine.filter(s => s.status !== "rencana").slice(0, 5).map(s => `<li><div class="grow"><b>${dShort(s.d)} · ${me(s).actual ?? me(s).plan} jam</b><div class="meta">${esc(s.task)}</div></div><span class="tag ${STAT[s.status][0]}">${s.status === "tidak" ? "Dibayar, tugas belum selesai" : STAT[s.status][1]}</span></li>`).join("") || '<li class="muted">Belum ada lembur.</li>'}</ul></div>
      ${leaveCard(w)}
      <button class="btn" id="hpdispute" style="justify-content:center">Laporkan jam yang salah</button>
    </div></div>`;
}
function weekCard(w, f){
  return `<div class="card"><div class="hd"><h3>Jadwal minggu ini</h3></div><div class="bd"><div class="wk7">${WEEK.map(d => { const c = shiftOf(f(d)); return `<div><div class="muted" style="margin-bottom:3px">${DAYN[dow(d)]}<br>${dt(d).getUTCDate()}</div>${SH[c] ? `<span class="sh ${c}">${SH[c].n[0]}</span>` : c === "L" ? '<span class="sh" style="color:var(--faint)">–</span>' : `<span class="sh ${c}">${LEAVE[c].slice(0, 4)}</span>`}</div>`; }).join("")}</div>
    <div class="small muted" style="margin-top:8px">P = Pagi 07–15 · S = Siang 15–23 · M = Malam 23–07</div></div></div>`;
}
function leaveCard(w){
  if (w.ag === "PHL") return "";
  const lv = LEAVES.filter(l => l.w === w.id).slice(-3);
  return `<div class="card"><div class="hd"><h3>Cuti</h3><span class="more small muted">sisa ${w.leaveBal} hari</span></div><ul class="list">${lv.map(l => `<li><div class="grow"><b>${l.type}</b><div class="meta">${l.from === l.to ? dShort(l.from) : dShort(l.from) + " – " + dShort(Math.min(l.to, 30))}</div></div><span class="tag ${l.status === "ok" ? "ok" : l.status === "pending" ? "warn" : "bad"}">${l.status === "ok" ? "Disetujui" : l.status === "pending" ? "Menunggu" : "Ditolak"}</span></li>`).join("") || '<li class="muted">Belum ada pengajuan.</li>'}</ul><div class="bd" style="border-top:1px solid var(--line2)"><button class="btn sm pri" data-hpleave>Ajukan cuti atau izin</button></div></div>`;
}
function phoneOS(w){
  const tsl = [-7, -6, -5, -4, -3, -2, -1].map(d => ts(w, d)).filter(Boolean);
  const hadir = tsl.filter(t => t.inM != null).length, bales = tsl.reduce((a, t) => a + t.bales, 0), late = tsl.filter(t => t.flag === "Terlambat").length;
  const c0 = code(w, 0), s0 = shiftOf(c0), t0 = ts(w, 0);
  const h = payHistory(w), lastP = h[0];
  const hold = holdReason(w);
  return `<div class="phone"><div class="ph"><div class="small" style="opacity:.8">${dLong(0)}</div><div style="font-size:18px;font-weight:650;margin-top:2px">Halo, ${esc(w.name.split(" ")[0])}</div><div class="small" style="opacity:.8">${w.role} · ${AG[w.ag].n}${w.sec ? " · " + w.sec + " · Regu " + w.regu : " · harian lepas"}</div></div>
    <div class="pb">
      <div class="card"><div class="bd"><div class="small muted">Hari ini</div>${SH[s0] ? `<div style="font-size:18px;font-weight:650;margin-top:2px">${SH[s0].n} ${SH[s0].t}</div><div class="small muted">${secById(secOf(w, c0)) ? secById(secOf(w, c0)).n : ""} · ${t0 && t0.inM != null && s0 === "P" ? "sudah check-in " + hm(t0.inM) + " lewat " + t0.src : "check-in dengan kartu di mesin atau wajah di gerbang 2"}</div>` : `<div style="font-size:18px;font-weight:650;margin-top:2px">${w.ag === "PHL" ? "Tidak ada jadwal" : "Libur"}</div>${w.ag === "PHL" ? '<div class="small muted">Anda akan dapat pesan kalau ada shift kosong.</div>' : ""}`}</div></div>
      ${weekCard(w, d => code(w, d))}
      <div class="card"><div class="bd"><div class="small muted">Minggu lalu</div><div style="display:flex;gap:18px;margin-top:4px">${big(hadir, "hari hadir")}${big(fmt(bales), "bal dipacking")}${big(late, "terlambat")}</div><div class="small muted" style="margin-top:6px">Jumlah bal dari sensor packing, dikonfirmasi leader line.</div></div></div>
      <div class="card"><div class="bd">${w.ag === "PHL" ? `<div class="small muted">Upah harian, dibayar setiap Sabtu</div><div style="font-size:20px;font-weight:650;margin-top:2px">${lastP ? rp(lastP.amt) : "—"}</div><div class="small muted">${lastP ? "dibayar " + lastP.b.date + " ke " + w.bank.bank + " " + maskNo(w.bank.no) : "Belum ada pembayaran"}</div>` : `<div class="small muted">Gaji 21 Okt – 20 Nov · dibayar 25 Nov</div><div style="font-size:20px;font-weight:650;margin-top:2px">${rp(payLine(w).net)}</div><div class="small muted">ke ${w.bank.bank} ${maskNo(w.bank.no)} · dibayar lewat ${AG[w.ag].n}</div>`}
        ${hold ? `<div class="note warn" style="margin-top:8px">${hold}. Gaji ditahan sampai diperbaiki. Buka menu Rekening untuk mengganti.</div>` : ""}<button class="btn sm" style="margin-top:8px" data-hpslip>Lihat slip</button></div></div>
      ${leaveCard(w)}
      <button class="btn" id="hpdispute" style="justify-content:center">Laporkan jam atau hitungan yang salah</button>
    </div></div>`;
}
PAGES.hp = () => {
  const worker = roleOf().worker, kind = worker ? UI.role : UI.hpKind;
  const cands = hpCands(kind);
  let w = wById(UI.hpWho); if (!w || !cands.includes(w)) w = (kind === "opr" && cands.find(x => SPL.some(s => s.people.some(p => p.id === x.id) && s.d >= -10))) || cands[0];
  UI.hpWho = w.id;
  return `<div class="pagehead"><div><h1>${worker ? "Aplikasi pekerja" : "Tampilan HP pekerja"}</h1><div class="sub">${worker ? "Ini yang dilihat pekerja di HP-nya. Untuk demo, pilih orangnya di daftar pekerja. Di aplikasi asli pekerja hanya melihat datanya sendiri." : "Yang dilihat pekerja di aplikasi: jadwal, jam kerja, lembur, gaji dan hasil dirinya sendiri. Orang lain tidak bisa melihatnya."}</div></div>
    <div class="actions">${worker ? "" : `<div class="seg" role="group" aria-label="Jenis pekerja"><button aria-pressed="${kind === "opr"}" data-hpk="opr">Karyawan</button><button aria-pressed="${kind === "os"}" data-hpk="os">Alih daya</button></div>`}<label class="sr" for="hpw">Pekerja</label><select id="hpw">${cands.map(x => `<option value="${x.id}" ${x === w ? "selected" : ""}>${esc(x.name)} · ${x.role}${x.ag !== "KRY" ? " · " + AG[x.ag].short : ""}</option>`).join("")}</select></div></div>
  <div style="display:flex;justify-content:center">${kind === "os" ? phoneOS(w) : phoneEmp(w)}</div>`;
};
PAGES.hp.after = () => {
  const w = wById(UI.hpWho);
  $("#hpw").onchange = e => { UI.hpWho = e.target.value; rerender(); };
  $$("[data-hpk]").forEach(b => b.onclick = () => { UI.hpKind = b.dataset.hpk; UI.hpWho = null; rerender(); });
  $$("[data-hpok]").forEach(b => b.onclick = () => { SPL.find(s => s.id === b.dataset.hpok).ok = true; toast("Konfirmasi terkirim ke manajer."); rerender(); });
  $$("[data-hpslip]").forEach(b => b.onclick = () => payslip(w, w.ag === "PHL" ? payHistory(w)[0] : null));
  $$("[data-hpleave]").forEach(b => b.onclick = () => {
    modal("Ajukan cuti atau izin", `<div class="grid g2" style="gap:12px"><div class="field"><label for="lt">Jenis</label><select id="lt"><option>Cuti tahunan</option><option>Sakit</option><option>Izin</option><option>Cuti haid</option></select></div><div class="field"><label for="ld">Tanggal</label><select id="ld">${[1,2,3,4,5,6].map(d => `<option value="${d}">${dLong(d)}</option>`).join("")}</select></div><div class="field" style="grid-column:1/-1"><label for="ln">Alasan</label><input type="text" id="ln"></div></div><div class="small muted">Sisa cuti tahunan ${w.leaveBal} hari. Sakit perlu surat dokter, bisa diunggah belakangan.</div>`, `<button class="btn" data-close>Batal</button><button class="btn pri" id="lsend">Kirim ke atasan</button>`);
    $("#lsend").onclick = () => { const d = +$("#ld").value; addLeave(w, $("#lt").value, d, d, "pending", $("#ln").value || "-"); closeModal(); toast("Pengajuan terkirim. Atasan Anda melihatnya di roster dan menu Cuti & izin."); rerender(); };
  });
  $("#hpdispute").onclick = () => toast("Laporan dikirim ke atasan dan HR. Dijawab paling lambat 2 hari kerja, sebelum tutup buku gaji.");
};

/* ======================= hooks into the rest of the app ======================= */
function lemburTodos(){
  const out = [], tut = SPL.filter(s => s.status === "tutup").length;
  if (tut) out.push([`${tut} perintah lembur perlu ditutup`, "Jam lembur masuk gaji setelah manajer menandai tugas selesai atau tidak, dan mengisi jam aktual", "#lembur", "Tutup"]);
  const over = DEPT.filter(dp => (novSpent(dp.id) + novPlan(dp.id)) / dp.budget >= .8);
  if (over.length) out.push([`Anggaran lembur ${over.map(x => x.n).join(", ")} di atas 80%`, "Bulan November, termasuk lembur yang sudah direncanakan", "#monitor", "Lihat"]);
  return out;
}
function lemburProfile(w){
  const mine = SPL.filter(s => s.people.some(p => p.id === w.id)), me = s => s.people.find(p => p.id === w.id);
  return `<section class="card"><div class="hd"><h2>Lembur</h2><span class="more small muted">upah ${rp(w.rate)} per jam · ${w.oregu ? "Regu " + w.oregu : "shift Pagi, Senin–Sabtu"}</span></div><div class="bd flush tw"><table class="tbl"><thead><tr><th>SPL</th><th>Tanggal</th><th>Tugas</th><th class="num">Rencana</th><th class="num">Aktual</th><th class="num">Upah lembur</th><th>Status</th></tr></thead><tbody>
  ${mine.slice(0, 20).map(s => `<tr><td class="num">${s.id}</td><td>${dShort(s.d)}</td><td>${esc(s.task)}</td><td class="num">${me(s).plan}</td><td class="num">${me(s).actual ?? "—"}</td><td class="num">${rp(otPay(w.rate, me(s).actual ?? me(s).plan, dow(s.d) === 0))}</td><td><span class="tag ${STAT[s.status][0]}">${STAT[s.status][1]}</span></td></tr>`).join("") || '<tr><td colspan="7" class="empty">Belum ada lembur.</td></tr>'}
  </tbody></table></div></section>`;
}
NAV.splice(4, 0, {id:"lembur", n:"Lembur & KPI", pages:[["lembur","Perintah lembur"],["monitor","Monitor lembur"],["kpi","KPI departemen"],["volume","Volume operator"],["hp","Tampilan HP pekerja"]]});

/* "Lihat sebagai" bar under the menus, so anyone can switch views on any screen size */
function renderWho(){
  const r = roleOf();
  $(".who").innerHTML = `<span class="av" aria-hidden="true">${r.av}</span><span class="hide-sm">${r.n} · ${r.t}</span>`;
}
function renderViewAs(){
  const r = roleOf();
  $("#viewas").innerHTML = `<span class="lbl">Lihat sebagai</span><div class="seg" role="group" aria-label="Lihat sebagai">${ROLES.map(x => `<button aria-pressed="${x.id === r.id}" data-role="${x.id}">${x.worker ? x.n : x.n + " · " + x.t}</button>`).join("")}</div><span class="small muted">${r.worker ? "Tampilan aplikasi HP pekerja." : ["S3","MEK"].includes(r.id) ? "Rincian per orang terlihat untuk tim " + deptById(r.id).n + "." : "Angka per tim. Rincian per orang hanya untuk atasan langsung."}</span>`;
  $$("[data-role]").forEach(b => b.onclick = () => setRole(b.dataset.role));
}
function setRole(id){
  const wasWorker = roleOf().worker;
  UI.role = id; UI.hpWho = null;
  if (wasWorker && !roleOf().worker && location.hash === "#hp") { location.hash = "beranda"; }
  else rerender();
  toast("Sekarang melihat sebagai " + roleOf().n + " (" + roleOf().t + ").");
}
const _route = route;
route = function(){
  renderWho(); renderViewAs();
  if (roleOf().worker) {
    $("#mainnav").innerHTML = ""; $("#subnav").hidden = true;
    $("#app").innerHTML = PAGES.hp() + `<p class="foot">Mockup. Semua nama, angka, tarif dan aturan adalah contoh dan dibuat di browser.</p>`;
    PAGES.hp.after();
    return;
  }
  $("#subnav").hidden = false;
  _route();
};
