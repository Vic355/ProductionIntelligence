/* =====================================================================
   Tugas & KPI: a daily task "route" for every shop-floor worker.
   Works like sales route management: the route is generated each day
   from the shift, machine, production plan, open repair tickets and
   overtime orders. Extra work outside the route (the "zona baru", like
   a salesman visiting a new outlet) is logged, verified by the leader,
   and counted toward KPI and points.
   Loaded last, after portal.js.
   ===================================================================== */

const NOWM = 11 * 60 + 40;                       // demo clock: Senin 23 Nov, 11.40
const nowLabel = "11.40";
UI.rs = {}; UI.rsec = "S3"; UI.kdep = "S3"; UI.edep = ""; UI.ptabK = "tim";

/* ---------- KPI catalogue ---------- */
const KPIS = {
  out: {n:"Hasil vs standar", u:"%", t:95, good:"up", kinds:["prod"]},
  co:  {n:"Waktu changeover", u:"menit", t:35, good:"down", kinds:["prod"]},
  dt:  {n:"Downtime kecil per shift", u:"menit", t:20, good:"down", kinds:["prod","mek"]},
  rj:  {n:"Reject di line", u:"%", t:0.8, good:"down", kinds:["prod","qc"]},
  "5s":{n:"Skor 5S area", u:"poin", t:85, good:"up", kinds:["prod","gdg"]},
  mttr:{n:"Waktu perbaikan (MTTR)", u:"menit", t:45, good:"down", kinds:["mek"]},
  pm:  {n:"PM tepat waktu", u:"%", t:95, good:"up", kinds:["mek"]},
  qcs: {n:"Sampel QC tepat waktu", u:"%", t:98, good:"up", kinds:["qc"]},
  otd: {n:"Muat tepat waktu", u:"%", t:97, good:"up", kinds:["gdg"]},
  imp: {n:"Ide perbaikan diterapkan", u:"ide/bln", t:4, good:"up", kinds:["prod","mek","qc","gdg"]},
  k3:  {n:"Temuan K3 ditindaklanjuti", u:"%", t:100, good:"up", kinds:["prod","mek","qc","gdg"]}
};
const kpiTag = k => `<span class="tag kpi" title="${KPIS[k].n}">${KPIS[k].n}</span>`;
const kpisOf = dep => Object.keys(KPIS).filter(k => KPIS[k].kinds.includes(deptById(dep).kind));
function kpiSeries(k, dep){
  const K = KPIS[k];
  return [...Array(8)].map((_, i) => {
    const h = hash(k + dep + i), p = i / 7, lag = hash(k + dep) * .08;
    if (k === "imp") return Math.max(0, Math.round(K.t * (.4 + .6 * p) + (h - .5) * 2 - lag * 10));
    const v = K.good === "up" ? K.t * (.9 + .085 * p + .05 * (h - .5) - lag) : K.t * (1.32 - .3 * p + .22 * (h - .5) + lag * 2);
    return K.u === "%" && K.t < 5 ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10;
  });
}
const kpiFmt = (k, v) => (KPIS[k].u === "%" ? dec(v, KPIS[k].t < 5 ? 2 : 1) + "%" : (Number.isInteger(v) ? v : dec(v)) + " " + KPIS[k].u);
const kpiOk = (k, v) => KPIS[k].good === "up" ? v >= KPIS[k].t : v <= KPIS[k].t;
const spark = (vals, ok) => { const mx = Math.max(...vals), mn = Math.min(...vals), r = mx - mn || 1; return `<svg class="spark" viewBox="0 0 80 24" aria-hidden="true"><polyline fill="none" stroke="${ok ? "#2a9455" : "#d08a00"}" stroke-width="2" points="${vals.map((v, i) => `${i * 80 / 7},${22 - (v - mn) / r * 20}`).join(" ")}"/></svg>`; };

/* ---------- who is who ---------- */
const SKU = {S1:["Toilet Roll 10s","Toilet Roll 4s"], S2:["Kitchen Towel 2R","Jumbo Roll 300m"], S3:["Facial 250s","Facial 200s"], S4:["Soft Pack 180s","Travel Pack 10s"], S5:["Napkin 1/4 fold","Napkin 1/8 fold"], S6:["Hand Towel M-fold","Hand Towel Z-fold"]};
function rkOf(w){ if (w.ag === "KRY") return w.role === "Operator mesin" ? "opr" : deptById(w.dept).kind; return w.role === "Packer" ? "pck" : w.role === "Operator forklift" ? "fork" : "hlp"; }
const RKN = {opr:"Operator mesin", pck:"Packer", hlp:"Helper produksi", fork:"Operator forklift", qc:"QC inspector", mek:"Mekanik", gdg:"Gudang"};
function deptOfW(w, d){ if (w.ag === "KRY") return w.dept; const c = pShift(w, d ?? 0); return secOf(w, c) || w.sec; }
function machOf(w, d){ if (w.mach) return w.mach; const dp = deptOfW(w, d), s = dp && secById(dp); return s ? s.mach[Math.floor(hash(w.id + d + "m") * s.mach.length)] : null; }
const teamOf = w => w.ag === "KRY" ? w.dept + (w.oregu ? "-" + w.oregu : "") : w.sec ? w.sec + "-" + w.regu : null;
const teamName = t => { const [dp, r] = t.split("-"); return (deptById(dp) ? deptById(dp).n : dp) + (r ? " · Regu " + r : ""); };

/* ---------- tasks added by managers ("Tambah tugas ke KPI") ---------- */
const CUST = [
  {id:"TG-01", dep:"S3", kpi:"rj", n:"Cek panjang potong log saw setelah ganti pisau", who:"opr", freq:"mingguan", d0:0, off:60, dur:15, pts:10, ev:"angka", tgt:3, unit:"cek", by:"Pak Hasan Basri"},
  {id:"TG-02", dep:"S1", kpi:"dt", n:"Uji coba setting tension baru di TR-03 (prototipe)", who:"m:TR-03", freq:"sekali", d0:0, off:200, dur:60, pts:20, ev:"foto", tgt:null, unit:null, by:"Pak Darmawan"},
  {id:"TG-03", dep:"S3", kpi:"co", n:"Pakai kereta ganti ukuran yang sudah disiapkan (SMED)", who:"opr", freq:"harian", d0:-14, off:170, dur:10, pts:5, ev:"cek", tgt:null, unit:null, by:"Pak Hasan Basri"}
];
const custFor = (w, d, dp, m) => CUST.filter(c => c.dep === dp && (c.freq === "harian" ? d >= c.d0 : c.freq === "mingguan" ? d >= c.d0 && (d - c.d0) % 7 === 0 : d === c.d0) && (c.who === "all" || c.who === rkOf(w) || c.who === "m:" + m));

/* ---------- daily route ---------- */
const RT = new Map();
const splKpi = s => { const k = deptById(s.dept).kind; return k === "mek" ? "mttr" : k === "qc" ? "qcs" : k === "gdg" ? "otd" : /changeover/i.test(s.task) ? "co" : "out"; };
const splUnit = s => ({prod:"karton", mek:"menit downtime", qc:"lot", gdg:"palet"})[deptById(s.dept).kind];
function routeOf(w, d){
  const key = w.id + "|" + d; if (RT.has(key)) return RT.get(key);
  const c = shiftOf(pShift(w, d)); if (!SH[c]) { RT.set(key, []); return []; }
  const rk = rkOf(w), dp = deptOfW(w, d), m = machOf(w, d), st = SH[c].s * 60, h = k => hash(w.id + d + k);
  const sku = SKU[dp] ? SKU[dp][Math.floor(hash((m || dp) + d) * 2)] : "", sku2 = SKU[dp] ? SKU[dp].find(x => x !== sku) : "";
  const tgt = 280 + Math.floor(hash((m || dp) + d + "t") * 9) * 10;
  const L = [];   // [off, dur, name, kpi, pts, evidence, target, unit, source]
  if (rk === "opr") {
    L.push([5, 15, `Cek awal mesin ${m} (checklist start-up)`, "dt", 5, "cek"]);
    L.push([25, 420, `Jalankan ${sku} di ${m}: target ${tgt} karton`, "out", 20, "angka", tgt, "karton", "Rencana produksi"]);
    L.push([120, 10, "Cek kualitas: 4 sampel per 2 jam", "rj", 10, "angka", 4, "sampel"]);
    if (hash(m + d + "co") < .4) L.push([180, 40, `Changeover ${sku} ke ${sku2} di ${m}, maks. 35 menit`, "co", 15, "angka", 35, "menit", "Rencana produksi"]);
    L.push([300, 5, "Catat downtime di atas 5 menit beserta penyebabnya", "dt", 5, "cek"]);
    L.push([450, 20, "5S mesin dan serah terima shift", "5s", 5, "foto"]);
  } else if (rk === "pck") {
    L.push([10, 10, `Siapkan karton dan label line ${m}`, "out", 5, "cek"]);
    L.push([25, 420, `Packing line ${m}: target ${tgt} karton`, "out", 20, "angka", tgt, "karton", "Rencana produksi"]);
    L.push([90, 5, "Cek kode produksi dan seal tiap jam (8 kali)", "rj", 10, "angka", 8, "cek"]);
    L.push([300, 10, "Pisahkan dan catat karton cacat", "rj", 5, "angka", null, "karton"]);
    L.push([450, 20, "5S area packing", "5s", 5, "foto"]);
  } else if (rk === "hlp" || rk === "fork") {
    L.push(rk === "fork" ? [15, 60, `Antar jumbo roll ke unwind ${dp || ""}`, "out", 10, "angka", 6, "roll"] : [10, 30, `Suplai core dan karton ke ${dp || "line"}`, "out", 10, "cek"]);
    L.push([180, 30, "Angkut waste ke bale press", "5s", 5, "cek"]);
    L.push(rk === "fork" ? [240, 45, "Pindahkan palet jadi ke gudang", "out", 10, "angka", 12, "palet"] : [300, 30, "Suplai kedua sebelum pergantian shift", "out", 5, "cek"]);
    L.push(rk === "fork" ? [450, 15, "Cek harian forklift dan isi log", "k3", 5, "cek"] : [450, 20, "5S area line", "5s", 5, "foto"]);
  } else if (rk === "qc") {
    L.push([20, 30, "Patroli sampel line S1–S3 (gramatur, jumlah lembar)", "qcs", 10, "angka", 6, "sampel"]);
    L.push([140, 30, "Patroli sampel line S4–S6", "qcs", 10, "angka", 6, "sampel"]);
    L.push([260, 40, "Uji tarik dan daya serap lot baru", "rj", 10, "angka", 3, "lot"]);
    L.push([400, 20, "Release atau hold lot shift ini", "qcs", 5, "cek"]);
  } else if (rk === "mek") {
    const t = TICKETS.filter(x => x.d === d)[Math.floor(h("tk") * 3)];
    if (t) L.push([30, 90, `Perbaiki ${t.mach}: ${t.issue.toLowerCase()} (${t.id})`, "mttr", 20, "angka", 45, "menit", "Tiket " + t.id]);
    L.push([150, 60, `PM mingguan ${ALLM[Math.floor(h("pm") * ALLM.length)]}`, "pm", 15, "cek", null, null, "Jadwal PM"]);
    L.push([300, 30, "Cek bearing dan belt di line rawan", "dt", 5, "cek"]);
    L.push([440, 20, "Isi log perbaikan dan serah terima", "mttr", 5, "cek"]);
  } else if (rk === "gdg") {
    L.push([20, 90, "Muat truk ekspedisi sesuai jadwal", "otd", 20, "angka", 2, "truk", "Jadwal kirim"]);
    L.push([180, 60, "Cycle count rak A–C", "otd", 10, "angka", 40, "lokasi"]);
    L.push([420, 20, "5S gudang dan serah terima", "5s", 5, "foto"]);
  }
  if (dow(d) === 3 && c === "P") L.push([360, 60, "Waktu perbaikan: ide dan uji coba (1 jam, dilindungi)", "imp", 10, "foto", null, null, "Waktu perbaikan"]);
  for (const x of custFor(w, d, dp, m)) L.push([x.off, x.dur, x.n, x.kpi, x.pts, x.ev, x.tgt, x.unit, "Ditambah " + x.by + " · " + x.id]);
  const out = L.map((x, i) => ({k: "r" + i, at: st + x[0], dur: x[1], n: x[2], kpi: x[3], pts: x[4], ev: x[5], tgt: x[6] ?? null, unit: x[7] ?? null, src: x[8] || "Rutin", ot: false}));
  for (const s of SPL.filter(s => s.d === d && s.people.some(p => p.id === w.id))) { const me = s.people.find(p => p.id === w.id); out.push({k: s.id, at: st + 480, dur: me.plan * 60, n: s.task, kpi: splKpi(s), pts: 15, ev: "angka", tgt: s.target, unit: splUnit(s), src: s.id + " · lembur " + me.plan + " jam", ot: true, spl: s}); }
  out.sort((a, b) => a.at - b.at);
  out.forEach(s => Object.assign(s, stopState(w, d, s)));
  RT.set(key, out); return out;
}
const WHY = ["Mesin rusak, menunggu mekanik", "Bahan baku belum datang", "Order dipindah PPIC", "Dipindah bantu line lain", "Waktu habis"];
function stopState(w, d, s){
  const ov = UI.rs[w.id + "|" + d + "|" + s.k]; if (ov) return ov;
  const h = hash(w.id + d + s.k + "st"), res = ok => s.tgt == null ? null : s.kpi === "co" || s.kpi === "mttr" ? Math.round(s.tgt * (ok ? .7 + h * .35 : 1.3 + h * .5)) : Math.round(s.tgt * (ok ? .93 + h * .14 : .45 + h * .3));
  if (s.ot) {
    const sp = s.spl;
    if (sp.status === "selesai") return {st: "selesai", res: sp.result};
    if (sp.status === "tidak") return {st: "terlewat", res: sp.result, why: sp.note};
    if (sp.status === "tutup") return {st: "selesai", res: Math.round(sp.target * (.85 + h * .2)), wait: true};
    return {st: "belum"};
  }
  if (d < 0 || (d === 0 && s.at + s.dur <= NOWM)) { const ok = h < .89; return {st: ok ? "selesai" : "terlewat", res: res(ok), why: ok ? "" : WHY[Math.floor(h * 97) % WHY.length]}; }
  if (d === 0 && s.at <= NOWM) return {st: "jalan"};
  return {st: "belum"};
}
const rDone = r => r.filter(s => s.st === "selesai").length;
const rPts = r => r.filter(s => s.st === "selesai").reduce((a, s) => a + s.pts, 0);
const rPct = r => r.length ? rDone(r) / r.length : 0;
const STOPST = {selesai:["ok","Selesai"], terlewat:["bad","Terlewat"], jalan:["info","Sedang jalan"], belum:["","Belum"]};
const tmin = m => hm(((m % 1440) + 1440) % 1440);

/* ---------- extra work outside the route ("zona baru") ---------- */
const XTYPES = {
  bantu:["Bantu line lain yang kurang orang", "out", 15],
  akar: ["Perbaiki akar masalah yang berulang", "dt", 25],
  ide:  ["Ajukan ide perbaikan (kaizen)", "imp", 20],
  terap:["Ide diterapkan dan terbukti", "imp", 50],
  latih:["Latih pekerja baru di mesin", "out", 10],
  k3:   ["Temukan dan laporkan kondisi tidak aman", "k3", 10],
  bersih:["Bersihkan area yang terlewat", "5s", 5]
};
const XNOTE = {bantu:["Bantu packing FB-05 2 jam, 1 orang sakit","Bantu suplai karton S4 waktu forklift rusak"], akar:["Sensor seal FB-02 sering error, ganti posisi bracket","Jam di folding TR-04 karena guide aus, sudah diganti"], ide:["Tanda warna di setelan tension supaya changeover lebih cepat","Rak karton dekat line supaya helper tidak bolak-balik"], terap:["Template setting changeover FB-03, waktu turun 12 menit","Penahan core baru, roll jatuh berkurang"], latih:["Latih operator baru di NP-02","Ajari packer baru cek seal"], k3:["Kabel terkelupas dekat panel SP-04","Lantai licin oli di unwind S2"], bersih:["Bersihkan debu tisu di atas mesin FB-06","Rapikan area waste S1"]};
const XTR = [];
{
  let q = 90210; const qr = () => (q = q * 16807 % 2147483647) / 2147483647;
  const pool_ = W.filter(x => x.ag !== "PHL"), keys = Object.keys(XTYPES), wts = [4, 3, 3, 1, 2, 2, 3];
  for (let d = -27; d <= 0; d++) for (let i = 0; i < 7; i++) {
    let t = qr() * 18, j = 0; while (t > wts[j]) t -= wts[j++];
    const ty = keys[j], w = pool_[Math.floor(qr() * pool_.length)];
    if (!SH[shiftOf(pShift(w, d))]) continue;
    XTR.push({id: "EK-" + (500 + XTR.length), w: w.id, d, ty, note: XNOTE[ty][Math.floor(qr() * 2)], ev: qr() < .7 ? "foto" : "angka", st: d >= -2 && qr() < .7 ? "menunggu" : qr() < .9 ? "ok" : "tolak"});
  }
}
const xPts = x => XTYPES[x.ty][2];

/* ---------- points with guardrails ---------- */
const RULE = {xMin: .8, xCap: 60};
const PC = new Map();
function weekPts(w, k = 0){
  const key = w.id + "|" + k; if (PC.has(key)) return PC.get(key);
  let route = 0, extra = 0, held = 0, ok = 0, total = 0;
  for (let d = k * 7; d < k * 7 + 7 && d <= 0; d++) {
    const r = routeOf(w, d); route += rPts(r); ok += rDone(r); total += r.length;
    for (const x of XTR.filter(x => x.w === w.id && x.d === d && x.st === "ok")) { if (rPct(r) >= RULE.xMin || !r.length) extra += xPts(x); else held += xPts(x); }
  }
  const v = {route, extra: Math.min(extra, RULE.xCap), capped: Math.max(0, extra - RULE.xCap), held, pct: total ? ok / total : 0};
  v.total = v.route + v.extra; PC.set(key, v); return v;
}
const resetPts = () => { PC.clear(); TB = null; };
const LEVELS = [[0,"Pemula"],[400,"Terampil"],[900,"Andal"],[1600,"Ahli"],[2500,"Master"]];
function seasonPts(w){ return Math.round(weekPts(w, -1).total * 7 + hash(w.id + "ssn") * 500 + weekPts(w).total); }
function levelOf(p){ let i = 0; while (i < LEVELS.length - 1 && p >= LEVELS[i + 1][0]) i++; return {i, n: LEVELS[i][1], next: LEVELS[i + 1] || null, from: LEVELS[i][0]}; }
const BADGES = [
  ["kilat","Changeover kilat","5 changeover di bawah target"], ["dt","Pemburu downtime","3 perbaikan akar masalah terverifikasi"], ["kz","Kaizen","Ide diterapkan dan terbukti"],
  ["rute","Rute penuh","Rute 100% selesai 10 hari berturut-turut"], ["bantu","Penolong","Bantu line lain 3 kali"], ["k3","Mata K3","Laporkan 3 kondisi tidak aman"]
];
const badgesOf = w => BADGES.filter(b => hash(w.id + b[0]) < (b[0] === "rute" ? .35 : b[0] === "kilat" ? (rkOf(w) === "opr" ? .4 : 0) : .2) || XTR.some(x => x.w === w.id && x.st === "ok" && ((b[0] === "kz" && x.ty === "terap") || (b[0] === "dt" && x.ty === "akar"))));

/* team league: average points per person, so team size does not matter */
let TB = null;
function teamBoard(){
  if (TB) return TB;
  const m = {};
  for (const w of W) { const t = teamOf(w); if (!t) continue; (m[t] = m[t] || []).push(w); }
  TB = Object.entries(m).map(([t, ws]) => { const p = ws.map(w => weekPts(w)), prev = ws.map(w => weekPts(w, -1));
    return {t, n: ws.length, avg: p.reduce((a, x) => a + x.total, 0) / ws.length, prev: prev.reduce((a, x) => a + x.total, 0) / ws.length, pct: p.reduce((a, x) => a + x.pct, 0) / ws.length, xtr: XTR.filter(x => x.st === "ok" && x.d > -7 && ws.some(w => w.id === x.w)).length}; })
    .sort((a, b) => b.avg - a.avg);
  return TB;
}

/* ---------- overtime effectiveness ---------- */
const effOf = s => s.target ? (/changeover|perbaikan/i.test(s.task) || deptById(s.dept).kind === "mek" ? (s.result ? Math.min(1.2, s.target / Math.max(1, s.result) * (s.status === "selesai" ? 1 : .5)) : 0) : (s.result || 0) / s.target) : 0;
const effTag = e => e >= .9 ? '<span class="tag ok">Efektif</span>' : e >= .5 ? '<span class="tag warn">Sebagian</span>' : '<span class="tag bad">Tidak efektif</span>';

/* ---------- icons ---------- */
ICO.star = '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>';
ICO.route = '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3 3 0 000-6H9a3 3 0 010-6h7"/>';
ICO.target = '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>';

/* ======================= Manager: today's routes ======================= */
const onShiftToday = dp => W.filter(w => deptOfW(w, 0) === dp && routeOf(w, 0).length);
function personRouteModal(w, d = 0){
  const r = routeOf(w, d);
  modal(`Rute ${esc(w.name)} · ${dLong(d)}`, `<div class="muted" style="margin-bottom:10px">${w.role} · ${AG[w.ag].short} · ${teamOf(w) ? teamName(teamOf(w)) : ""} · ${rDone(r)}/${r.length} selesai · ${rPts(r)} poin</div>${timeline(r)}
    ${XTR.filter(x => x.w === w.id && x.d === d).map(x => `<div class="note">Kerja ekstra: ${XTYPES[x.ty][0]}. ${esc(x.note)} · ${x.st === "ok" ? "terverifikasi" : x.st === "menunggu" ? "menunggu verifikasi" : "ditolak"}</div>`).join("")}`, `<button class="btn pri" data-close>Tutup</button>`);
}
function timeline(r, act){
  return `<ol class="tline">${r.map(s => `<li class="${s.st}"><span class="tdot"></span><div class="grow"><div class="tt"><b>${tmin(s.at)}</b> ${esc(s.n)}</div><div class="meta">${kpiTag(s.kpi)} ${s.ot ? '<span class="tag warn">Lembur</span> ' : ""}${s.src} · ${s.pts} poin${s.res != null ? ` · hasil <b>${fmt(s.res)} ${s.unit || ""}</b>${s.tgt != null ? " dari " + fmt(s.tgt) : ""}` : ""}${s.why ? " · " + esc(s.why) : ""}${s.wait ? " · menunggu ditutup manajer" : ""}</div>${act ? act(s) : ""}</div><span class="tag ${STOPST[s.st][0]}">${STOPST[s.st][1]}</span></li>`).join("") || '<li class="muted">Tidak ada jadwal hari ini.</li>'}</ol>`;
}
PAGES.rute = () => {
  const dp = UI.rsec, D = deptById(dp), ppl = onShiftToday(dp), see = canSee(dp);
  const all = ppl.map(w => routeOf(w, 0)).flat(), done = all.filter(s => s.st === "selesai").length, miss = all.filter(s => s.st === "terlewat"), xt = XTR.filter(x => x.d === 0 && ppl.some(w => w.id === x.w));
  const teams = {}; ppl.forEach(w => (teams[teamOf(w) || dp] = teams[teamOf(w) || dp] || []).push(w));
  const sec = secById(dp);
  const tile = m => { const ops = ppl.filter(w => machOf(w, 0) === m && SH[shiftOf(pShift(w, 0))] && shiftOf(pShift(w, 0)) === "P"); const r = ops.map(w => routeOf(w, 0)).flat(); const ms = r.filter(s => s.st === "terlewat").length, ot = r.some(s => s.ot);
    return `<button class="mtile ${!r.length ? "" : ms >= 2 ? "bad" : ms ? "warn" : "ok"}" data-mt="${m}"><b>${m}</b><span>${r.length ? rDone(r) + "/" + r.length + " tugas" : "tidak jalan"}</span><i style="width:${r.length ? rPct(r) * 100 : 0}%"></i>${ot ? '<em>lembur</em>' : ""}</button>`; };
  return `<div class="pagehead"><div><h1>Rute tugas hari ini</h1><div class="sub">${dLong(0)} · pukul ${nowLabel} · rute dibuat otomatis dari shift, mesin, rencana produksi, tiket perbaikan dan SPL</div></div>
    <div class="actions">${deptSelect(dp, 'id="rsec"', null)}<button class="btn pri" id="addtask">Tambah tugas ke KPI</button></div></div>
  <div class="stats"><div class="stat"><div class="k">Orang dengan rute hari ini</div><div class="v">${ppl.length}</div><div class="s">${D.full}</div></div>
    <div class="stat"><div class="k">Tugas selesai</div><div class="v">${done} <span class="small muted">/ ${all.length}</span></div><div class="s">shift Siang dan Malam belum mulai</div></div>
    <div class="stat"><div class="k">Tugas terlewat</div><div class="v ${miss.length ? "warn" : ""}">${miss.length}</div><div class="s">dengan alasan dari pekerja</div></div>
    <div class="stat"><div class="k">Kerja ekstra dicatat</div><div class="v">${xt.length}</div><div class="s">${xt.filter(x => x.st === "menunggu").length} menunggu verifikasi</div></div>
    <div class="stat"><div class="k">Tugas lembur hari ini</div><div class="v">${all.filter(s => s.ot).length}</div><div class="s">terhubung ke KPI</div></div></div>
  <div class="grid g21">
    <section class="card"><div class="hd"><h2>${sec ? "Peta line · shift Pagi" : "Tim hari ini"}</h2><span class="more small muted">${sec ? "warna = rute operator dan packer di mesin itu" : ""}</span></div>
      <div class="bd">${sec ? `<div class="mgrid">${sec.mach.map(tile).join("")}</div><div class="small muted" style="margin-top:10px"><span class="dot ok"></span>sesuai rute <span class="dot warn" style="margin-left:10px"></span>1 tugas terlewat <span class="dot bad" style="margin-left:10px"></span>2 atau lebih terlewat</div>` : `<ul class="list" style="margin:-14px -16px">${Object.entries(teams).map(([t, ws]) => { const r = ws.map(w => routeOf(w, 0)).flat(); return `<li><div class="grow"><b>${teamName(t)}</b><div class="meta">${ws.length} orang</div></div><span class="num">${rDone(r)}/${r.length}</span></li>`; }).join("")}</ul>`}</div></section>
    <section class="card"><div class="hd"><h2>Kendala dari lantai</h2></div><ul class="list">${miss.slice(0, 7).map(s => `<li><span class="dot bad" style="margin-top:6px"></span><div class="grow"><b>${esc(s.n)}</b><div class="meta">${tmin(s.at)} · ${esc(s.why || "")}</div></div></li>`).join("") || '<li class="muted">Tidak ada tugas terlewat.</li>'}</ul></section>
  </div>
  <section class="card" style="margin-top:16px"><div class="hd"><h2>${see ? "Rute per orang" : "Rute per regu"}</h2><span class="more small muted">${see ? "Anda melihat rincian karena ini tim Anda" : "Rincian per orang hanya untuk atasan langsung"}</span></div><div class="bd flush tw"><table class="tbl"><thead><tr><th>${see ? "Pekerja" : "Regu"}</th><th>Shift</th><th class="num">${see ? "Tugas" : "Orang"}</th><th>Progres rute</th><th class="num">Terlewat</th><th class="num">Ekstra</th><th class="num">Poin hari ini</th></tr></thead><tbody>
    ${see ? ppl.filter(w => shiftOf(pShift(w, 0)) === "P").sort((x, y) => (y.ag === "KRY") - (x.ag === "KRY") || rPct(routeOf(x, 0)) - rPct(routeOf(y, 0))).map(w => { const r = routeOf(w, 0), c = shiftOf(pShift(w, 0)); return `<tr class="click" data-pr="${w.id}"><td>${personCell(w, w.role + (machOf(w, 0) ? " · " + machOf(w, 0) : ""))}</td><td>${SH[c].n}</td><td class="num">${rDone(r)}/${r.length}</td><td style="min-width:140px"><div class="bar"><i style="width:${rPct(r) * 100}%"></i></div></td><td class="num">${r.filter(s => s.st === "terlewat").length || ""}</td><td class="num">${XTR.filter(x => x.w === w.id && x.d === 0).length || ""}</td><td class="num">${rPts(r)}</td></tr>`; }).join("") + `<tr><td colspan="7" class="muted">${ppl.filter(w => shiftOf(pShift(w, 0)) !== "P").length} orang shift Siang dan Malam: rute sudah dibuat, belum mulai.</td></tr>`
      : Object.entries(teams).map(([t, ws]) => { const r = ws.map(w => routeOf(w, 0)).flat(), c = shiftOf(pShift(ws[0], 0)); return `<tr><td><b>${teamName(t)}</b></td><td>${SH[c] ? SH[c].n : "—"}</td><td class="num">${ws.length}</td><td style="min-width:140px"><div class="bar"><i style="width:${rPct(r) * 100}%"></i></div><span class="sub">${rDone(r)}/${r.length} tugas</span></td><td class="num">${r.filter(s => s.st === "terlewat").length || ""}</td><td class="num">${XTR.filter(x => x.d === 0 && ws.some(w => w.id === x.w)).length || ""}</td><td class="num">${dec(ws.reduce((a, w) => a + rPts(routeOf(w, 0)), 0) / ws.length)}</td></tr>`; }).join("")}
  </tbody></table></div></section>
  ${see ? "" : `<p class="small muted">Untuk melihat rute per orang, pilih <a href="#" data-as="${["S3","MEK"].includes(dp) ? dp : "S3"}">${["S3","MEK"].includes(dp) ? deptById(dp).mgr : "Pak Hasan Basri"}</a> di "Lihat sebagai".</p>`}`;
};
PAGES.rute.after = () => {
  $("#rsec").onchange = e => { UI.rsec = e.target.value; rerender(); };
  $("#addtask").onclick = () => addTaskModal(UI.rsec);
  bindAs();
  $$("[data-pr]").forEach(r => r.onclick = () => personRouteModal(wById(r.dataset.pr)));
  $$("[data-mt]").forEach(b => b.onclick = () => { const w = onShiftToday(UI.rsec).find(x => machOf(x, 0) === b.dataset.mt && shiftOf(pShift(x, 0)) === "P" && x.ag === "KRY") || onShiftToday(UI.rsec).find(x => machOf(x, 0) === b.dataset.mt && shiftOf(pShift(x, 0)) === "P");
    if (!w) return toast("Mesin ini tidak jalan di shift Pagi.");
    if (!canSee(UI.rsec)) return toast("Rincian per orang hanya untuk manajer seksi. Pilih Pak Hasan Basri di Lihat sebagai untuk Seksi 3.");
    personRouteModal(w); });
};

/* ======================= Manager: add a task to a KPI ======================= */
function addTaskModal(dp, kpi){
  const sec = secById(dp), ks = kpisOf(dp);
  modal("Tambah tugas ke KPI", `<div class="grid g2" style="gap:12px">
    <div class="field"><label for="tdep">Departemen</label>${deptSelect(dp, 'id="tdep"', null)}</div>
    <div class="field"><label for="tk">KPI yang digerakkan</label><select id="tk">${ks.map(k => `<option value="${k}" ${k === kpi ? "selected" : ""}>${KPIS[k].n} (target ${kpiFmt(k, KPIS[k].t)})</option>`).join("")}</select></div>
    <div class="field" style="grid-column:1/-1"><label for="tn">Tugas</label><input type="text" id="tn" placeholder="contoh: Cek tension unwind tiap 2 jam dan catat"></div>
    <div class="field"><label for="tw">Untuk</label><select id="tw"><option value="all">Semua orang di ${deptById(dp).n}</option><option value="opr">Operator mesin</option><option value="pck">Packer</option>${sec ? sec.mach.map(m => `<option value="m:${m}">Mesin ${m} saja</option>`).join("") : ""}</select></div>
    <div class="field"><label for="tf">Frekuensi</label><select id="tf"><option value="harian">Setiap shift</option><option value="mingguan">Seminggu sekali</option><option value="sekali">Sekali</option></select></div>
    <div class="field"><label for="td">Mulai</label><select id="td">${[0,1,2,3,4,5,6].map(d => `<option value="${d}">${dLong(d)}</option>`).join("")}</select></div>
    <div class="field"><label for="to">Waktu dalam shift</label><select id="to"><option value="30">Awal shift</option><option value="210">Tengah shift</option><option value="420">Akhir shift</option></select></div>
    <div class="field"><label for="te">Bukti dari pekerja</label><select id="te"><option value="cek">Centang selesai</option><option value="angka">Isi angka hasil</option><option value="foto">Foto</option></select></div>
    <div class="field"><label for="tp">Poin</label><select id="tp">${[5,10,15,20,25].map(p => `<option ${p === 10 ? "selected" : ""}>${p}</option>`).join("")}</select></div>
    <div class="field" style="grid-column:1/-1"><label><input type="checkbox" id="tot"> Perlu lembur (dibuatkan SPL yang terhubung ke tugas dan KPI ini)</label></div>
    <div class="field" id="totf" hidden><label for="toh">Jam lembur per orang</label><select id="toh">${[1,2,3,4].map(h => `<option ${h === 2 ? "selected" : ""}>${h}</option>`).join("")}</select></div>
    <div class="field" id="totn" hidden><label for="ton">Jumlah orang</label><select id="ton">${[1,2,3,4].map(h => `<option ${h === 2 ? "selected" : ""}>${h}</option>`).join("")}</select></div>
  </div><div id="terr"></div><div class="note">Tugas muncul di rute HP pekerja yang cocok. Poin hanya dihitung kalau tugas selesai dengan bukti. Efeknya ke KPI terlihat di KPI & tugas.</div>`,
  `<button class="btn" data-close>Batal</button><button class="btn pri" id="tsave">Simpan tugas</button>`);
  $("#tdep").onchange = e => { closeModal(); addTaskModal(e.target.value); };
  $("#tot").onchange = e => { $("#totf").hidden = $("#totn").hidden = !e.target.checked; };
  $("#tsave").onclick = () => {
    const n = $("#tn").value.trim(); if (n.length < 5) { $("#terr").innerHTML = '<div class="note bad">Tulis nama tugas yang jelas.</div>'; return; }
    const t = {id: "TG-0" + (CUST.length + 1), dep: dp, kpi: $("#tk").value, n, who: $("#tw").value, freq: $("#tf").value, d0: +$("#td").value, off: +$("#to").value, dur: 30, pts: +$("#tp").value, ev: $("#te").value, tgt: null, unit: null, by: roleOf().n};
    CUST.push(t); let msg = `${t.id} ditambahkan ke KPI ${KPIS[t.kpi].n}.`;
    if ($("#tot").checked) { const s = makeSPL(deptById(dp), t.d0, {task: [n, 100], h: +$("#toh").value, n: +$("#ton").value}); if (s) { s.kpiTask = t.id; t.spl = s.id; msg += ` ${s.id} dibuat untuk ${s.people.length} orang.`; } }
    RT.clear(); resetPts(); closeModal(); toast(msg + " Muncul di rute HP pekerja."); rerender();
  };
}

/* ======================= Manager: KPI with tasks ======================= */
function taskStats(dp, match){
  const ws = W.filter(w => (w.ag === "KRY" ? w.dept : w.sec) === dp).filter((w, i) => i % 3 === 0).slice(0, 30);
  let n = 0, ok = 0;
  for (const w of ws) for (let d = -27; d <= 0; d++) for (const s of routeOf(w, d)) if (!s.ot && match(s) && s.st !== "belum" && s.st !== "jalan") { n++; if (s.st === "selesai") ok++; }
  return {n, pct: n ? ok / n : null};
}
PAGES.kpitugas = () => {
  const dp = UI.kdep, ks = kpisOf(dp);
  const spl = SPL.filter(s => s.dept === dp && s.d > -28 && s.d <= 0 && ["selesai","tidak"].includes(s.status));
  return `<div class="pagehead"><div><h1>KPI & tugas</h1><div class="sub">Setiap tugas di rute dan setiap jam lembur terhubung ke satu KPI, supaya terlihat tugas mana yang menggerakkan angka.</div></div>
    <div class="actions">${deptSelect(dp, 'id="kdep"', null)}<button class="btn pri" data-addk="">Tambah tugas ke KPI</button></div></div>
  <div class="kpilist">${ks.map(k => { const v = kpiSeries(k, dp), now = v[7], ok = kpiOk(k, now), sp = spl.filter(s => splKpi(s) === k);
    const tmpl = {}; const ws = [...pool(dp).slice(0, 4), ...W.filter(w => w.ag !== "KRY" && w.sec === dp).filter((w, i) => i % 5 === 0).slice(0, 6)];
    for (const w of ws) for (let d = -6; d <= 0; d++) for (const s of routeOf(w, d)) if (s.kpi === k && !s.ot) { const nm = s.n.replace(/(FB|TR|KT|SP|NP|HT|JR)-\d+/g, "mesin").replace(/target \d+ karton/, "target shift").replace(/(Facial|Toilet|Kitchen|Jumbo|Soft|Travel|Napkin|Hand)[^:]*?(?= ke | di |:)/g, "SKU"); tmpl[nm] = tmpl[nm] || {src: s.src.startsWith("Ditambah") ? s.src : s.src === "Rutin" ? "Rutin" : s.src, pts: s.pts}; }
    const rows = Object.entries(tmpl);
    const xs = XTR.filter(x => XTYPES[x.ty][1] === k && x.st === "ok" && W.find(w => w.id === x.w && (w.ag === "KRY" ? w.dept : w.sec) === dp));
    return `<section class="card kpicard"><div class="hd"><div><h2>${KPIS[k].n}</h2><div class="small muted">target ${kpiFmt(k, KPIS[k].t)} · ${KPIS[k].good === "up" ? "makin tinggi makin baik" : "makin rendah makin baik"}</div></div><div class="more kpinow"><b class="${ok ? "okc" : "warnc"}">${kpiFmt(k, now)}</b>${spark(v, ok)}<span class="small muted">8 minggu</span></div></div>
      <div class="bd flush tw"><table class="tbl"><thead><tr><th>Tugas yang terhubung</th><th>Sumber</th><th class="num">Poin</th><th class="num">Selesai 4 mgg</th></tr></thead><tbody>
      ${rows.map(([nm, x]) => { const st = taskStats(dp, s => s.kpi === k && s.n.replace(/(FB|TR|KT|SP|NP|HT|JR)-\d+/g, "mesin").replace(/target \d+ karton/, "target shift").replace(/(Facial|Toilet|Kitchen|Jumbo|Soft|Travel|Napkin|Hand)[^:]*?(?= ke | di |:)/g, "SKU") === nm); return `<tr><td>${esc(nm)}</td><td class="small">${esc(x.src)}</td><td class="num">${x.pts}</td><td class="num">${st.pct == null ? "—" : Math.round(st.pct * 100) + "%"}</td></tr>`; }).join("") || '<tr><td colspan="4" class="muted">Belum ada tugas rutin untuk KPI ini.</td></tr>'}
      </tbody></table></div>
      <div class="bd kpifoot"><span><b>${sp.length}</b> SPL lembur · ${sp.reduce((a, s) => a + splHours(s), 0)} jam · ${rp(sp.reduce((a, s) => a + splCost(s), 0))}${sp.length ? " · " + Math.round(sp.filter(s => effOf(s) >= .9).length / sp.length * 100) + "% efektif" : ""}</span><span><b>${xs.length}</b> kerja ekstra terverifikasi (4 mgg)</span><button class="btn sm" data-addk="${k}">Tambah tugas</button></div></section>`; }).join("")}</div>`;
};
PAGES.kpitugas.after = () => { $("#kdep").onchange = e => { UI.kdep = e.target.value; rerender(); }; $$("[data-addk]").forEach(b => b.onclick = () => addTaskModal(UI.kdep, b.dataset.addk || undefined)); };

/* ======================= Manager: overtime effectiveness ======================= */
PAGES.efek = () => {
  const dp = UI.edep, list = SPL.filter(s => (!dp || s.dept === dp) && s.d > -28 && s.d <= -3 && ["selesai","tidak"].includes(s.status));
  const hrs = list.reduce((a, s) => a + splHours(s), 0), cost = list.reduce((a, s) => a + splCost(s), 0), eff = list.filter(s => effOf(s) >= .9);
  const byK = {}; list.forEach(s => (byK[splKpi(s)] = byK[splKpi(s)] || []).push(s));
  return `<div class="pagehead"><div><h1>Efektivitas lembur</h1><div class="sub">Setiap SPL punya tugas dan target KPI. Lembur dianggap efektif kalau hasilnya minimal 90% dari target. 4 minggu terakhir, SPL yang sudah ditutup.</div></div>
    <div class="actions">${deptSelect(dp, 'id="edep"')}</div></div>
  <div class="stats"><div class="stat"><div class="k">Jam lembur</div><div class="v">${fmt(hrs)}</div><div class="s">${list.length} SPL</div></div>
    <div class="stat"><div class="k">Biaya lembur</div><div class="v">${rp(cost / 1e6 * 1e6).replace(/\.\d{3}\.\d{3}$/, " jt")}</div><div class="s">${rp(cost)}</div></div>
    <div class="stat"><div class="k">SPL efektif</div><div class="v ${eff.length / (list.length || 1) < .75 ? "warn" : ""}">${list.length ? Math.round(eff.length / list.length * 100) : 0}%</div><div class="s">hasil ≥ 90% target</div></div>
    <div class="stat"><div class="k">Biaya lembur tidak efektif</div><div class="v bad">${rp(list.filter(s => effOf(s) < .5).reduce((a, s) => a + splCost(s), 0))}</div><div class="s">hasil di bawah 50%</div></div></div>
  <section class="card"><div class="hd"><h2>Per KPI</h2></div><div class="bd flush tw"><table class="tbl"><thead><tr><th>KPI</th><th class="num">SPL</th><th class="num">Jam</th><th class="num">Biaya</th><th class="num">Rata-rata hasil</th><th class="num">Efektif</th><th>Kesimpulan</th></tr></thead><tbody>
    ${Object.entries(byK).sort((a, b) => b[1].length - a[1].length).map(([k, ss]) => { const e = ss.reduce((a, s) => a + effOf(s), 0) / ss.length, pe = ss.filter(s => effOf(s) >= .9).length / ss.length; return `<tr><td><b>${KPIS[k].n}</b></td><td class="num">${ss.length}</td><td class="num">${ss.reduce((a, s) => a + splHours(s), 0)}</td><td class="num">${rp(ss.reduce((a, s) => a + splCost(s), 0))}</td><td class="num">${Math.round(e * 100)}%</td><td class="num">${Math.round(pe * 100)}%</td><td>${pe >= .8 ? "Lembur menggerakkan KPI" : pe >= .6 ? "Cek tugas yang sering gagal" : "Cari penyebab di luar jam kerja (bahan, mesin, rencana)"}</td></tr>`; }).join("")}
  </tbody></table></div></section>
  <section class="card" style="margin-top:16px"><div class="hd"><h2>Per SPL</h2></div><div class="bd flush tw"><table class="tbl"><thead><tr><th>SPL</th><th>Tanggal</th><th>Departemen</th><th>Tugas</th><th>KPI</th><th class="num">Target</th><th class="num">Hasil</th><th class="num">Jam</th><th class="num">Biaya</th><th>Efek</th></tr></thead><tbody>
    ${list.slice(0, 40).map(s => `<tr><td class="num">${s.id}</td><td>${dShort(s.d)}</td><td>${deptById(s.dept).n}</td><td>${esc(s.task)}${s.note ? `<span class="sub">${esc(s.note)}</span>` : ""}</td><td class="small">${KPIS[splKpi(s)].n}</td><td class="num">${fmt(s.target)} ${splUnit(s)}</td><td class="num">${s.result != null ? fmt(s.result) : "—"}</td><td class="num">${splHours(s)}</td><td class="num">${rp(splCost(s))}</td><td>${effTag(effOf(s))}</td></tr>`).join("")}
  </tbody></table></div></section>`;
};
PAGES.efek.after = () => { $("#edep").onchange = e => { UI.edep = e.target.value; rerender(); }; };

/* ======================= Manager: points and teams ======================= */
const RULES_HTML = `<ul class="rules">
  <li><b>Tugas utama dulu.</b> Poin kerja ekstra baru dihitung kalau rute hari itu sudah ${RULE.xMin * 100}% selesai. Sebelum itu poin ditahan.</li>
  <li><b>Ada batasnya.</b> Poin kerja ekstra maksimal ${RULE.xCap} per orang per minggu, supaya tidak ada yang mengejar poin dan melupakan tugas rutin.</li>
  <li><b>Hasil, bukan jam.</b> Lembur tidak memberi poin per jam. Poin hanya dari tugas lembur yang selesai dan hasilnya tercatat.</li>
  <li><b>Waktu perbaikan dilindungi.</b> Setiap Rabu shift Pagi ada 1 jam di rute untuk ide dan uji coba. Itu tugas rute, bukan tambahan, jadi tidak mengorbankan pekerjaan biasa.</li>
  <li><b>Harus terverifikasi.</b> Kerja ekstra perlu bukti (foto atau angka) dan disetujui leader. Laporan ganda ditolak.</li>
  <li><b>Yang tampil adalah tim.</b> Papan peringkat per regu. Poin pribadi hanya terlihat oleh pekerja itu dan atasannya.</li></ul>`;
PAGES.poin = () => {
  const tab = UI.ptabK, tb = teamBoard(), pend = XTR.filter(x => x.st === "menunggu").sort((a, b) => b.d - a.d);
  const tabs = [["tim","Papan tim"],["verif",`Verifikasi kerja ekstra (${pend.length})`],["lencana","Lencana"],["aturan","Aturan main"]];
  let body = "";
  if (tab === "tim") body = `<section class="card"><div class="bd flush tw"><table class="tbl"><thead><tr><th class="num">#</th><th>Tim</th><th class="num">Orang</th><th class="num">Poin per orang minggu ini</th><th class="num">Minggu lalu</th><th>Rute selesai</th><th class="num">Ekstra terverifikasi</th></tr></thead><tbody>
    ${tb.map((t, i) => `<tr><td class="num">${i < 3 ? `<span class="medal m${i + 1}">${i + 1}</span>` : i + 1}</td><td><b>${teamName(t.t)}</b></td><td class="num">${t.n}</td><td class="num"><b>${dec(t.avg)}</b></td><td class="num">${dec(t.prev)}</td><td style="min-width:130px"><div class="bar"><i style="width:${t.pct * 100}%"></i></div><span class="sub">${Math.round(t.pct * 100)}%</span></td><td class="num">${t.xtr}</td></tr>`).join("")}
    </tbody></table></div></section><p class="small muted">Rata-rata per orang, supaya regu besar dan kecil adil. Minggu dimulai Senin. Tiga tim teratas bulan ini dapat makan bersama dan premi tim.</p>`;
  if (tab === "verif") body = `<section class="card"><ul class="list">${pend.map(x => { const w = wById(x.w); return `<li><span class="av sm" aria-hidden="true">${initials(w.name)}</span><div class="grow"><b>${XTYPES[x.ty][0]}</b> · ${xPts(x)} poin<div class="meta">${esc(w.name)} · ${w.role} · ${teamOf(w) ? teamName(teamOf(w)) : ""} · ${dShort(x.d)}</div><div style="margin-top:3px">${esc(x.note)} <span class="tag">${x.ev === "foto" ? "1 foto" : "angka hasil"}</span> ${kpiTag(XTYPES[x.ty][1])}</div></div><div class="nowrap"><button class="btn sm danger" data-xno="${x.id}">Tolak</button> <button class="btn sm pri" data-xok="${x.id}">Verifikasi</button></div></li>`; }).join("") || '<li class="empty">Semua kerja ekstra sudah diverifikasi.</li>'}</ul></section>`;
  if (tab === "lencana") { const ws = W.filter(w => w.ag !== "PHL"); body = `<div class="grid g3">${BADGES.map(b => `<section class="card"><div class="bd badge"><span class="bico">${ico("star")}</span><div><b>${b[1]}</b><div class="small muted">${b[2]}</div><div class="small" style="margin-top:4px">${ws.filter(w => badgesOf(w).includes(b)).length} orang</div></div></div></section>`).join("")}</div>`; }
  if (tab === "aturan") body = `<div class="grid g2"><section class="card"><div class="hd"><h2>Aturan main</h2></div><div class="bd">${RULES_HTML}</div></section>
    <section class="card"><div class="hd"><h2>Cara dapat poin</h2></div><div class="bd flush tw"><table class="tbl"><tbody>
      <tr><td>Tugas rute selesai dengan bukti</td><td class="num">5–20</td></tr><tr><td>Tugas lembur selesai sesuai target</td><td class="num">15</td></tr>
      ${Object.values(XTYPES).map(x => `<tr><td>Ekstra: ${x[0]}</td><td class="num">${x[2]}</td></tr>`).join("")}
      <tr><td colspan="2" class="small muted">Level musim ini: ${LEVELS.map(l => l[1] + " " + fmt(l[0])).join(" · ")}. Poin pribadi ditukar premi kinerja di slip gaji, 1 poin = Rp 100, maksimal Rp 150.000 per bulan.</td></tr></tbody></table></div></section></div>`;
  return `<div class="pagehead"><div><h1>Poin & tim</h1><div class="sub">Gamifikasi untuk mendorong kerja ekstra yang tercatat, tanpa mengorbankan tugas rutin dan waktu perbaikan.</div></div></div>
  <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${k === tab}" data-pk="${k}">${l}</button>`).join("")}</div>${body}`;
};
PAGES.poin.after = () => {
  $$("[data-pk]").forEach(b => b.onclick = () => { UI.ptabK = b.dataset.pk; rerender(); });
  $$("[data-xok]").forEach(b => b.onclick = () => { XTR.find(x => x.id === b.dataset.xok).st = "ok"; resetPts(); toast("Terverifikasi. Poin masuk ke pekerja dan timnya."); rerender(); });
  $$("[data-xno]").forEach(b => b.onclick = () => { XTR.find(x => x.id === b.dataset.xno).st = "tolak"; resetPts(); toast("Ditolak. Pekerja mendapat notifikasi dengan alasan."); rerender(); });
};

/* ======================= Worker phone: route of the day ======================= */
function ring(p, label){ const c = 2 * Math.PI * 34; return `<svg class="ring" viewBox="0 0 80 80" aria-label="${label}"><circle cx="40" cy="40" r="34" stroke="#e3e8ef" stroke-width="8" fill="none"/><circle cx="40" cy="40" r="34" stroke="var(--pri)" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="${c * p} ${c}" transform="rotate(-90 40 40)"/><text x="40" y="45" text-anchor="middle" font-size="16" font-weight="700" fill="var(--ink)">${Math.round(p * 100)}%</text></svg>`; }
function pTugas(w){
  const r = routeOf(w, 0), c = shiftOf(pShift(w, 0)), wp = weekPts(w), tb = teamBoard(), ti = tb.findIndex(t => t.t === teamOf(w));
  const xs = XTR.filter(x => x.w === w.id && x.d > -7).sort((a, b) => b.d - a.d);
  let nd = 0; while (nd < 14 && !SH[shiftOf(pShift(w, nd))]) nd++;
  const cur = r.find(s => s.st === "jalan"), nextB = r.find(s => s.st === "belum");
  const act = s => s.st === "jalan" ? `<div class="stopact">${s.ev === "angka" ? `<label class="sr" for="res-${s.k}">Hasil</label><input type="number" id="res-${s.k}" placeholder="${s.tgt != null ? "target " + s.tgt : "jumlah"} ${s.unit || ""}" inputmode="numeric">` : s.ev === "foto" ? `<button class="btn sm" data-foto="${s.k}">Ambil foto</button>` : ""}<button class="btn sm pri" data-sdone="${s.k}">Selesai</button><button class="btn sm" data-sprob="${s.k}">Ada kendala</button></div>`
    : s.st === "belum" && s === nextB && !cur && !s.ot ? `<div class="stopact"><button class="btn sm" data-sstart="${s.k}">Mulai</button></div>`
    : s.ot && s.st === "belum" && !s.spl.ok ? `<div class="stopact"><button class="btn sm pri" data-pok="${s.spl.id}">Konfirmasi lembur</button></div>` : "";
  return pHead("Tugas hari ini", r.length ? `${dLong(0)} · shift ${SH[c].n} ${SH[c].t} · ${machOf(w, 0) || deptById(deptOfW(w, 0)).n}` : dLong(0)) +
  (r.length ? `<section class="card pcard rtop"><div class="rhead">${ring(rPct(r), "Rute selesai")}<div><div class="big">${rDone(r)} / ${r.length} tugas</div><div class="muted">${rPts(r)} poin hari ini · ${wp.total} minggu ini</div><div class="small muted">${ti >= 0 ? "Tim Anda peringkat " + (ti + 1) + " dari " + tb.length : ""}</div></div></div>
      ${rPct(r) >= RULE.xMin ? `<div class="note ok-note">Tugas utama ${Math.round(rPct(r) * 100)}% selesai. Kerja ekstra hari ini dihitung penuh.</div>` : `<div class="small muted" style="margin-top:8px">Kerja ekstra tetap bisa dicatat. Poinnya dihitung setelah rute ${RULE.xMin * 100}% selesai.</div>`}</section>
    <section class="card pcard"><div class="hd"><h2>Rute</h2><span class="more small muted">dibuat otomatis jam 05.00</span></div><div class="bd">${timeline(r, act)}</div></section>`
  : `<section class="card pcard next"><div class="small muted">Shift berikutnya</div><div class="big">${nd < 14 ? dLong(nd) : "Belum ada"}</div><div class="muted">Rute dibuat pagi hari sebelum shift.</div></section>`) + `
  <button class="btn pri xbtn" id="pxtra">${ico("route")} Catat kerja ekstra</button>
  <section class="card pcard"><div class="hd"><h2>Kerja ekstra 7 hari</h2></div><ul class="list">${xs.map(x => `<li><div class="grow"><b>${XTYPES[x.ty][0]}</b><div class="meta">${dShort(x.d)} · ${esc(x.note)}</div></div><span class="tag ${x.st === "ok" ? "ok" : x.st === "menunggu" ? "warn" : "bad"}">${x.st === "ok" ? "+" + xPts(x) + " poin" : x.st === "menunggu" ? "Menunggu leader" : "Ditolak"}</span></li>`).join("") || '<li class="muted">Belum ada. Bantu line lain, perbaiki masalah yang berulang, atau ajukan ide.</li>'}</ul></section>`;
}
function pPoin(w){
  const wp = weekPts(w), sp = seasonPts(w), lv = levelOf(sp), b = badgesOf(w), tb = teamBoard(), ti = tb.findIndex(t => t.t === teamOf(w));
  const near = tb.slice(Math.max(0, ti - 2), Math.max(0, ti - 2) + 5);
  return pHead("Poin saya", "Hanya Anda dan atasan Anda yang melihat poin pribadi.") + `
  <section class="card pcard next"><div class="small muted">Level musim ini (Okt–Des)</div><div class="big">${lv.n}</div><div class="muted">${fmt(sp)} poin${lv.next ? ` · ${fmt(lv.next[0] - sp)} lagi ke ${lv.next[1]}` : ""}</div>
    <div class="bar" style="margin-top:10px"><i style="width:${lv.next ? (sp - lv.from) / (lv.next[0] - lv.from) * 100 : 100}%"></i></div></section>
  <div class="pgrid">
    <div class="card pstat"><span class="small muted">Minggu ini</span><b>${wp.total} poin</b><span class="small muted">rute ${wp.route} · ekstra ${wp.extra}</span></div>
    <div class="card pstat"><span class="small muted">Rute selesai</span><b>${Math.round(wp.pct * 100)}%</b><span class="small muted">7 hari terakhir</span></div>
    ${wp.held ? `<div class="card pstat"><span class="small muted">Poin ekstra ditahan</span><b>${wp.held}</b><span class="small muted">rute hari itu di bawah ${RULE.xMin * 100}%</span></div>` : ""}
    ${wp.capped ? `<div class="card pstat"><span class="small muted">Lewat batas mingguan</span><b>${wp.capped}</b><span class="small muted">maks. ${RULE.xCap} poin ekstra</span></div>` : ""}
    <div class="card pstat"><span class="small muted">Premi kinerja bulan ini</span><b>${rp(Math.min(150000, (wp.total + weekPts(w, -1).total * 3) * 100))}</b><span class="small muted">masuk slip 25 Des</span></div>
  </div>
  <section class="card pcard"><div class="hd"><h2>Tim saya</h2><span class="more small muted">${teamOf(w) ? teamName(teamOf(w)) : ""}</span></div><ul class="list">${near.map(t => `<li class="${t.t === teamOf(w) ? "mine" : ""}"><b class="num" style="width:26px">${tb.indexOf(t) + 1}</b><div class="grow">${teamName(t.t)}${t.t === teamOf(w) ? " (tim Anda)" : ""}</div><span class="num">${dec(t.avg)}</span></li>`).join("")}</ul></section>
  <section class="card pcard"><div class="hd"><h2>Lencana</h2></div><div class="bd badges">${BADGES.map(x => `<div class="badge ${b.includes(x) ? "" : "off"}"><span class="bico">${ico("star")}</span><div><b>${x[1]}</b><div class="small muted">${x[2]}</div></div></div>`).join("")}</div></section>
  <details class="card pcard"><summary class="hd"><h2>Aturan main</h2></summary><div class="bd">${RULES_HTML}</div></details>`;
}
function bindTugas(w){
  const key = k => w.id + "|0|" + k, stop = k => routeOf(w, 0).find(s => s.k === k);
  const upd = (k, v) => { UI.rs[key(k)] = v; RT.delete(w.id + "|0"); resetPts(); renderPortal(); };
  $$("[data-sstart]").forEach(b => b.onclick = () => { upd(b.dataset.sstart, {st: "jalan"}); toast("Tugas dimulai."); });
  $$("[data-foto]").forEach(b => b.onclick = () => { b.textContent = "Foto terlampir"; b.disabled = true; });
  $$("[data-sdone]").forEach(b => b.onclick = () => { const s = stop(b.dataset.sdone), inp = $("#res-" + s.k); if (s.ev === "angka" && inp && !inp.value) { inp.focus(); toast("Isi hasilnya dulu."); return; }
    upd(s.k, {st: "selesai", res: inp && inp.value ? +inp.value : s.tgt}); toast(`Selesai. +${s.pts} poin untuk ${KPIS[s.kpi].n}.`); });
  $$("[data-sprob]").forEach(b => b.onclick = () => { const s = stop(b.dataset.sprob);
    modal("Ada kendala", `<div class="field"><label for="pw">Kendala</label><select id="pw">${WHY.map(x => `<option>${x}</option>`).join("")}</select></div><div class="field" style="margin-top:10px"><label for="pn">Catatan</label><input type="text" id="pn"></div><div class="small muted">Leader dan manajer langsung melihatnya di peta line.</div>`, `<button class="btn" data-close>Batal</button><button class="btn pri" id="psend">Kirim</button>`);
    $("#psend").onclick = () => { const why = $("#pw").value + ($("#pn").value ? ", " + $("#pn").value : ""); closeModal(); upd(s.k, {st: "terlewat", why}); toast("Kendala dikirim ke leader."); }; });
  const px = $("#pxtra"); if (px) px.onclick = () => {
    modal("Catat kerja ekstra", `<div class="field"><label for="xt">Jenis</label><select id="xt">${Object.entries(XTYPES).map(([k, x]) => `<option value="${k}">${x[0]} · ${x[2]} poin</option>`).join("")}</select></div>
      <div class="field" style="margin-top:10px"><label for="xn">Apa yang dikerjakan</label><input type="text" id="xn" placeholder="contoh: bantu packing FB-05 1 jam"></div>
      <div style="margin-top:10px"><button class="btn sm" id="xf">Ambil foto bukti</button></div>
      <div class="note" style="margin-top:10px">Leader memverifikasi dulu. Poin dihitung kalau rute hari ini sudah ${RULE.xMin * 100}% selesai, maksimal ${RULE.xCap} poin ekstra per minggu.</div><div id="xerr"></div>`,
      `<button class="btn" data-close>Batal</button><button class="btn pri" id="xsend">Kirim ke leader</button>`);
    $("#xf").onclick = e => { e.target.textContent = "Foto terlampir"; e.target.disabled = true; };
    $("#xsend").onclick = () => { const n = $("#xn").value.trim(); if (n.length < 4) { $("#xerr").innerHTML = '<div class="note bad">Tulis singkat apa yang dikerjakan.</div>'; return; }
      XTR.push({id: "EK-" + (500 + XTR.length), w: w.id, d: 0, ty: $("#xt").value, note: n, ev: $("#xf").disabled ? "foto" : "angka", st: "menunggu"}); resetPts(); closeModal(); toast("Terkirim. Leader akan memverifikasi."); renderPortal(); };
  };
}

/* ---------- wire into navigation ---------- */
NAV.splice(1, 0, {id:"tugas", n:"Tugas & KPI", pages:[["rute","Rute hari ini"],["kpitugas","KPI & tugas"],["efek","Efektivitas lembur"],["poin","Poin & tim"]]});
NAV.forEach(g => { if (g.id === "lembur") g.n = "Lembur"; });
Object.assign(PAGEINFO, {rute: ["route", "Rute tugas harian setiap pekerja, peta line"], kpitugas: ["target", "KPI dengan tugas yang menggerakkannya"], efek: ["kpi", "Apakah jam lembur menghasilkan"], poin: ["star", "Papan tim, verifikasi kerja ekstra, aturan"]});
{
  const _r = route;
  route = function(){ if (!location.hash || location.hash === "#") history.replaceState(null, "", "#rute"); _r(); };
}
