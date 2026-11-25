/* =====================================================================
   Employee portal: what a worker sees after logging in.
   A login trimmed to the worker's own data, shown as a web page or
   inside a phone frame (switch in the "Lihat sebagai" bar).
   Used for the "Operator mesin" and "Packer alih daya" views.
   ===================================================================== */

UI.ptab = "tugas"; UI.pview = "hp"; UI.clock = {};
const PTABS_M = ["tugas","jadwal","absen","poin","profil"];   // phone tab bar; Cuti and Gaji open from Profil
const PTABS = [["tugas","Tugas","route"],["poin","Poin","star"],["jadwal","Jadwal","cal"],["absen","Absen","clock"],["cuti","Cuti","leave"],["gaji","Gaji","pay"],["profil","Profil","users"]];

const isKry = w => w.ag === "KRY";
const pShift = (w, d) => isKry(w) ? empShift(w, d) : code(w, d);
const pPlace = (w, d) => isKry(w) ? deptById(w.dept).n + (w.mach ? " · " + w.mach : "") : (() => { const s = secById(secOf(w, pShift(w, d))); return s ? s.n.replace(" · ", " · ") : "Cadangan"; })();
const pTeam = (w, d) => {
  const c = shiftOf(pShift(w, d)); if (!SH[c]) return [];
  const pool_ = isKry(w) ? pool(w.dept).filter(x => x.oregu === w.oregu) : W.filter(x => x.sec === w.sec && x.regu === w.regu && x.ag !== "KRY");
  return pool_.filter(x => x !== w && shiftOf(pShift(x, d)) === c);
};
function pTime(w, d){   // a timesheet row for any worker type
  if (!isKry(w)) { const t = ts(w, d); return t ? {s: t.s, inM: t.inM, outM: t.outM, worked: t.worked, flag: t.flag, bales: t.bales} : null; }
  const c = shiftOf(empShift(w, d)); if (!SH[c]) return null;
  const otH = SPL.filter(s => s.d === d && s.people.some(p => p.id === w.id)).reduce((a, s) => a + (s.people.find(p => p.id === w.id).actual ?? 0), 0);
  const inM = SH[c].s * 60 - 4 - Math.floor(hash(w.id + d + "i") * 12), outM = SH[c].e * 60 + 2 + Math.floor(hash(w.id + d + "o") * 9) + otH * 60;
  return {s: c, inM, outM, worked: (outM - inM) / 60 - 1, flag: otH ? "Lembur " + otH + " jam (SPL)" : "", bales: 0};
}
const pHead = (title, sub, right = "") => `<div class="phd"><div><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ""}</div>${right}</div>`;
const shiftChip = c => SH[c] ? `<span class="sh ${c}">${SH[c].n}</span>` : `<span class="sh off">${LEAVE[c] || "Libur"}</span>`;

/* ---------- Beranda ---------- */
function pHome(w){
  let nd = 0; while (nd < 14 && !SH[shiftOf(pShift(w, nd))]) nd++;
  const c = shiftOf(pShift(w, nd)), clk = UI.clock[w.id];
  const up = isKry(w) ? SPL.filter(s => s.status === "rencana" && s.people.some(p => p.id === w.id)) : [];
  const op = isKry(w) && w.mach ? opWeek(w) : null;
  const last7 = [-7,-6,-5,-4,-3,-2,-1].map(d => pTime(w, d)).filter(Boolean);
  const bales = last7.reduce((a, t) => a + (t.bales || 0), 0), hrs = last7.reduce((a, t) => a + (t.worked || 0), 0);
  const pend = LEAVES.filter(l => l.w === w.id && l.status === "pending").length, hold = holdReason(w);
  return pHead(`Halo, ${esc(w.name.split(" ")[0])}`, dLong(0)) + `
  <section class="card pcard next">
    <div class="small muted">${nd === 0 ? "Shift hari ini" : "Shift berikutnya · " + dLong(nd)}</div>
    ${SH[c] ? `<div class="big">${SH[c].t.replace("–", " – ")}</div><div class="muted">${SH[c].n} · ${pPlace(w, nd)}${pTeam(w, nd).length ? " · bersama " + pTeam(w, nd).length + " orang" : ""}</div>
      ${nd === 0 ? `<div class="row">${clk && clk.out == null ? `<span class="tag ok">Sudah masuk ${hm(clk.in)}</span><button class="btn" data-ptab="absen">Buka absen</button>` : clk ? `<span class="tag">Selesai ${hm(clk.out)}</span>` : `<button class="btn pri" data-ptab="absen">Absen masuk</button>`}</div>` : ""}`
      : `<div class="big">Tidak ada jadwal</div><div class="muted">${w.ag === "PHL" ? "Anda akan dapat pesan kalau ada shift kosong." : "Dalam 14 hari ke depan."}</div>`}
  </section>
  ${hold ? `<div class="note warn">${hold}. Gaji ditahan sampai diperbaiki. <a href="#" data-ptab="profil" data-psec="bank">Perbaiki rekening</a></div>` : ""}
  ${up.length ? `<section class="card pcard"><div class="hd"><h2>Perintah lembur untuk Anda</h2></div><ul class="list">${up.map(s => { const me = s.people.find(p => p.id === w.id); return `<li><div class="grow"><b>${dShort(s.d)} · mulai ${s.start}, ${me.plan} jam</b><div class="meta">${esc(s.task)}</div></div><button class="btn sm ${s.ok ? "" : "pri"}" data-pok="${s.id}" ${s.ok ? "disabled" : ""}>${s.ok ? "Dikonfirmasi" : "Konfirmasi"}</button></li>`; }).join("")}</ul></section>` : ""}
  <div class="pgrid">
    <a class="card pstat" href="#" data-ptab="gaji"><span class="small muted">Gaji berikutnya · 25 Nov</span><b>${w.ag === "PHL" ? "Sabtu" : rp(payLine(w).net)}</b><span class="small muted">${w.ag === "PHL" ? "upah harian dibayar tiap Sabtu" : "lihat slip"}</span></a>
    <a class="card pstat" href="#" data-ptab="cuti"><span class="small muted">Saldo cuti</span><b>${w.ag === "PHL" ? "—" : w.leaveBal + " hari"}</b><span class="small muted">${pend ? pend + " pengajuan menunggu" : "ajukan cuti atau izin"}</span></a>
    <a class="card pstat" href="#" data-ptab="absen"><span class="small muted">7 hari terakhir</span><b>${dec(hrs)} jam</b><span class="small muted">${last7.length} shift${bales ? " · " + fmt(bales) + " bal" : ""}</span></a>
    ${op ? `<div class="card pstat"><span class="small muted">Hasil saya minggu lalu</span><b>${dec(op.pct * 100)}%</b><span class="small muted">dari standar ${w.mach}</span></div>` : isKry(w) ? `<div class="card pstat"><span class="small muted">Lembur minggu ini</span><b>${otWeekH(w.id, 0)} / ${R.otWeek} jam</b><span class="small muted">batas mingguan</span></div>` : ""}
  </div>
  <section class="card pcard"><div class="hd"><h2>Info pabrik</h2></div><ul class="list">
    <li><div class="grow"><b>Gajian 25 November</b><div class="meta">Slip bisa dilihat mulai 24 Nov malam. Pastikan rekening Anda sudah benar.</div></div></li>
    <li><div class="grow"><b>Pemeriksaan kesehatan berkala</b><div class="meta">Klinik pabrik, 1–5 Des, sesuai jadwal regu.</div></div></li>
    <li><div class="grow"><b>APD wajib di area converting</b><div class="meta">Sepatu safety dan penutup telinga di semua line.</div></div></li></ul></section>`;
}

/* ---------- Jadwal ---------- */
function pJadwal(w){
  const mode = UI.pjm || "saya", days = [...Array(14).keys()];
  const open = !isKry(w) ? days.filter(d => d > 0 && d < 8 && shiftOf(code(w, d)) === "L").slice(0, 2) : [];
  return pHead("Jadwal", "Jadwal 2 minggu ke depan", `<div class="seg" role="group" aria-label="Tampilan jadwal"><button aria-pressed="${mode === "saya"}" data-pjm="saya">Jadwal saya</button><button aria-pressed="${mode === "tim"}" data-pjm="tim">Tim saya</button></div>`) +
  (mode === "saya" ? `
  ${open.length ? `<section class="card pcard"><div class="hd"><h2>Shift kosong yang bisa diambil</h2></div><ul class="list">${open.map((d, i) => { const c = i ? "S" : "P"; return `<li><div class="grow"><b>${dLong(d)} · ${SH[c].n} ${SH[c].t}</b><div class="meta">${secById(w.sec) ? secById(w.sec).n : "Seksi 3 · Facial Box"} · dibayar sebagai lembur hari istirahat</div></div><button class="btn sm pri" data-pick="${d}">Ambil</button></li>`; }).join("")}</ul></section>` : ""}
  <section class="card pcard"><ul class="list shiftlist">${days.map(d => { const c = shiftOf(pShift(w, d)); return `<li class="${d === 0 ? "today" : ""}"><div class="dbox"><span>${DAYN[dow(d)]}</span><b>${dt(d).getUTCDate()}</b></div><div class="grow">${SH[c] ? `<b>${SH[c].t.replace("–", " – ")}</b><div class="meta">${SH[c].n} · ${pPlace(w, d)}</div>` : `<b class="muted">${LEAVE[c] || "Libur"}</b>`}</div>${shiftChip(c)}</li>`; }).join("")}</ul></section>
  <p class="small muted">Tidak bisa masuk di hari tertentu? <a href="#" data-ptab="cuti">Ajukan cuti atau izin</a>.</p>`
  : `<section class="card pcard"><div class="hd"><h2>${dLong(0)}</h2><span class="more small muted">${isKry(w) ? deptById(w.dept).n + (w.oregu ? " · Regu " + w.oregu : "") : (w.sec || "") + " · Regu " + (w.regu || "-")}</span></div><ul class="list">${(() => { const c = shiftOf(pShift(w, 0)), t = pTeam(w, 0); return SH[c] ? [w, ...t].slice(0, 14).map(x => `<li><span class="av sm" aria-hidden="true">${initials(x.name)}</span><div class="grow"><b>${esc(x.name)}${x === w ? " (Anda)" : ""}</b><div class="meta">${x.role}${x.mach ? " · " + x.mach : ""}</div></div>${shiftChip(c)}</li>`).join("") : '<li class="muted">Anda libur hari ini.</li>'; })()}</ul></section>
  <p class="small muted">Hanya nama dan shift rekan satu regu yang terlihat. Jam kerja dan gaji orang lain tidak ditampilkan.</p>`);
}

/* ---------- Absen ---------- */
function pAbsen(w){
  const c = shiftOf(pShift(w, 0)), clk = UI.clock[w.id], now = NOWM;
  const rows = [-1,-2,-3,-4,-5,-6,-7].map(d => [d, pTime(w, d)]).filter(x => x[1]);
  return pHead("Absen", "Absen pakai HP hanya di area pabrik. Kartu di mesin dan wajah di gerbang tetap bisa dipakai.") + `
  <section class="card pcard clockcard">
    <div class="small muted">${dLong(0)}</div><div class="clock">${hm(clk ? (clk.out ?? now) : now)}</div>
    ${SH[c] ? `<div class="muted">Shift ${SH[c].n} ${SH[c].t} · ${pPlace(w, 0)}</div>
      <div class="small muted" style="margin:4px 0 12px">Lokasi: Gerbang 2, dalam area pabrik</div>
      ${!clk ? `<button class="btn pri xl" data-clk="in">Mulai shift</button>` : clk.out == null ? `<div class="row" style="justify-content:center"><span class="tag ok">Masuk ${hm(clk.in)}</span>${clk.brk ? `<span class="tag">Istirahat ${hm(clk.brk)}</span>` : ""}</div><div class="row" style="justify-content:center;margin-top:10px">${clk.brk ? "" : `<button class="btn" data-clk="brk">Mulai istirahat</button>`}<button class="btn pri" data-clk="out">Selesai shift</button></div>` : `<span class="tag">Shift selesai ${hm(clk.out)}. Timesheet dikirim ke atasan.</span>`}`
    : `<div class="muted" style="margin-top:6px">Tidak ada shift hari ini.</div>`}
  </section>
  <section class="card pcard"><div class="hd"><h2>Timesheet 7 hari terakhir</h2></div><ul class="list">${rows.map(([d, t]) => `<li><div class="grow"><b>${dShort(d)} · ${SH[t.s].n}</b><div class="meta">${hm(t.inM)} – ${hm(t.outM)}${t.worked != null ? " · " + dec(t.worked) + " jam" : ""}${t.bales ? " · " + fmt(t.bales) + " bal" : ""}${t.flag ? " · " + t.flag : ""}</div></div><span class="tag ${t.flag === "Mangkir" ? "bad" : d === -1 ? "warn" : "ok"}">${t.flag === "Mangkir" ? "Tidak hadir" : d === -1 ? "Menunggu cek" : "Disetujui"}</span></li>`).join("") || '<li class="muted">Belum ada timesheet.</li>'}</ul>
    <div class="bd" style="border-top:1px solid var(--line2)"><button class="btn sm" id="pdispute">Laporkan jam yang salah</button></div></section>`;
}

/* ---------- Cuti ---------- */
function pCuti(w){
  const ls = LEAVES.filter(l => l.w === w.id), pend = ls.filter(l => l.status === "pending"), upc = ls.filter(l => l.status === "ok" && l.to >= 0), past = ls.filter(l => l.status !== "pending" && l.to < 0);
  const item = l => `<li><div class="grow"><b>${l.type}</b><div class="meta">${l.from === l.to ? dLong(l.from) : dShort(l.from) + " – " + dShort(l.to)} · ${esc(l.note || "")}</div></div><span class="tag ${l.status === "ok" ? "ok" : l.status === "pending" ? "warn" : "bad"}">${l.status === "ok" ? "Disetujui" : l.status === "pending" ? "Menunggu" : "Ditolak"}</span></li>`;
  return pHead("Cuti & izin", "", `<button class="btn pri" id="pleave">Ajukan</button>`) + `
  <div class="pgrid">
    <div class="card pstat"><span class="small muted">Cuti tahunan</span><b>${w.ag === "PHL" ? "—" : w.leaveBal + " hari"}</b><span class="small muted">${w.ag === "PHL" ? "tidak berlaku untuk harian lepas" : "sisa sampai 31 Des 2026"}</span></div>
    <div class="card pstat"><span class="small muted">Sakit tahun ini</span><b>${Math.floor(hash(w.id + "sk") * 4)} hari</b><span class="small muted">dengan surat dokter</span></div>
  </div>
  <section class="card pcard"><div class="hd"><h2>Menunggu persetujuan</h2></div><ul class="list">${pend.map(item).join("") || '<li class="muted">Tidak ada.</li>'}</ul></section>
  <section class="card pcard"><div class="hd"><h2>Akan datang</h2></div><ul class="list">${upc.map(item).join("") || '<li class="muted">Tidak ada.</li>'}</ul></section>
  <details class="card pcard"><summary class="hd"><h2>Riwayat</h2><span class="more small muted">${past.length}</span></summary><ul class="list">${past.map(item).join("") || '<li class="muted">Belum ada.</li>'}</ul></details>`;
}

/* ---------- Gaji ---------- */
function pGaji(w){
  const h = payHistory(w), cur = w.ag !== "PHL" ? payLine(w) : null;
  return pHead("Gaji", `Dibayar ke ${w.bank.bank} ${maskNo(w.bank.no)}${["MKS","STM"].includes(w.ag) ? " lewat " + AG[w.ag].n : ""}`) + `
  ${cur ? `<section class="card pcard next"><div class="small muted">${PERIOD.n} · dibayar 25 Nov</div><div class="big">${rp(cur.net)}</div><div class="muted">Bruto ${rp(cur.gross)} · potongan ${rp(cur.gross - cur.net)}${cur.otH ? " · lembur " + cur.otH + " jam" : ""}</div><div class="row"><button class="btn" data-pslip="cur">Lihat slip</button></div></section>` : ""}
  <section class="card pcard"><div class="hd"><h2>Slip sebelumnya</h2></div><ul class="list">${h.map((x, i) => `<li><div class="grow"><b>${x.b.period}</b><div class="meta">${x.b.date}${x.fail ? " · transfer gagal: " + x.fail.why : ""}</div></div><b class="num">${rp(x.amt)}</b><button class="btn sm" data-pslip="${i}">Slip</button></li>`).join("") || '<li class="muted">Belum ada slip.</li>'}</ul></section>`;
}

/* ---------- Profil (self service) ---------- */
function pProfil(w){
  const p = pdOf(w), sec = UI.psec;
  const row = (k, v) => `<div class="kvrow"><span class="muted">${k}</span><span>${v || '<span class="faint">—</span>'}</span></div>`;
  const block = (id, t, body, edit) => `<section class="card pcard ${sec === id ? "focus" : ""}" id="ps-${id}"><div class="hd"><h2>${t}</h2>${edit ? `<button class="btn sm more" data-pedit="${edit}">${edit === "kual" ? "+ Tambah" : "Ubah"}</button>` : ""}</div><div class="bd">${body}</div></section>`;
  return `<div class="pme"><span class="av lg" aria-hidden="true">${initials(w.name)}</span><div><h1>${esc(w.name)}</h1><div class="muted">${w.role} · ${w.id}</div><div class="muted small">${isKry(w) ? "Karyawan tetap" : AG[w.ag].n + (w.type === "PKWT" ? " · PKWT s/d " + dDate(w.end) : "")}</div></div></div>` +
  block("pribadi", "Data pribadi", row("No. HP", w.phone) + row("Email", esc(p.email)) + row("Alamat", esc(p.addr)) + row("Kontak darurat", `${esc(p.ecName)} (${p.ecRel}) · ${p.ecPhone}`), "kontak") +
  block("bank", "Rekening bank", w.bank.status === "none" ? `<div class="note bad">Belum ada rekening. Gaji ditahan sampai rekening ditambahkan.</div>` : row("Bank", w.bank.bank) + row("Nomor", maskNo(w.bank.no)) + row("Atas nama", esc(w.bank.holder)) + row("Status", bankTag(w.bank.status)) + `<p class="small muted" style="margin:8px 0 0">Mengganti rekening perlu PIN, dicek ke bank, lalu disetujui HR dan Finance.</p>`, "bank") +
  block("pajak", "Pajak dan BPJS", row("Status PTKP", p.ptkp) + row("NPWP", w.npwp) + row("BPJS Ketenagakerjaan", w.bpjsTk) + row("BPJS Kesehatan", w.bpjsKes) + row("Faskes", p.faskes), "pajak") +
  block("kual", "Kualifikasi", (w.trained.length ? w.trained : [w.role]).map(m => row(m.includes("-") ? "Mesin " + m : m, '<span class="tag ok">Terverifikasi</span>')).join("") + (UI.pq && UI.pq[w.id] ? UI.pq[w.id].map(q => row(esc(q), '<span class="tag warn">Menunggu persetujuan</span>')).join("") : ""), "kual") +
  `<section class="card pcard"><ul class="list"><li><a class="prow" href="#" data-ptab="gaji"><span class="grow"><b>Slip gaji</b></span><span class="faint">›</span></a></li><li><a class="prow" href="#" data-ptab="cuti"><span class="grow"><b>Cuti & izin</b></span><span class="faint">›</span></a></li><li><a class="prow" href="#" id="plogout"><span class="grow"><b>Keluar</b></span><span class="faint">›</span></a></li></ul></section>`;
}

/* ---------- shell ---------- */
function portalWorker(){
  const cands = hpCands(UI.role);
  let w = wById(UI.hpWho); if (!w || !cands.includes(w)) w = (UI.role === "opr" && cands.find(x => SPL.some(s => s.people.some(p => p.id === x.id) && s.status === "rencana"))) || cands[0];
  UI.hpWho = w.id; return w;
}
function renderPortal(){
  const w = portalWorker(), t = UI.ptab, hp = UI.pview === "hp";
  document.body.classList.add("inportal");
  if (!UI.clock[w.id] && shiftOf(pShift(w, 0)) === "P") UI.clock[w.id] = {in: 6 * 60 + 48 + Math.floor(hash(w.id + "ci") * 10)};
  const body = {home: pTugas, tugas: pTugas, poin: pPoin, jadwal: pJadwal, absen: pAbsen, cuti: pCuti, gaji: pGaji, profil: pProfil}[t](w);
  $("#mainnav").innerHTML = hp ? "" : PTABS.map(([k, l]) => `<a href="#" data-ptab="${k}" aria-current="${k === t}">${l}</a>`).join("");
  $("#subnav").hidden = true;
  $(".who").innerHTML = `<span class="av" aria-hidden="true">${initials(w.name)}</span><span class="hide-sm">${esc(w.name)}</span>`;
  // demo controls live in the "Lihat sebagai" bar so the app itself stays clean
  $$("#viewas .pdemo").forEach(x => x.remove());
  $("#viewas").insertAdjacentHTML("beforeend", `<span class="pdemo"><label class="sr" for="pwho">Pekerja</label><select id="pwho">${hpCands(UI.role).map(x => `<option value="${x.id}" ${x === w ? "selected" : ""}>${esc(x.name)} · ${x.role}${x.ag !== "KRY" ? " · " + AG[x.ag].short : ""}</option>`).join("")}</select><span class="seg" role="group" aria-label="Tampilan"><button aria-pressed="${!hp}" data-pv="web">Web</button><button aria-pressed="${hp}" data-pv="hp">HP</button></span></span>`);
  $("#app").innerHTML = (hp ? `<div class="phonewrap"><div class="phone pframe"><div class="ptop"><span class="mark">PI</span><b>Kinerja</b><span class="av sm" aria-hidden="true">${initials(w.name)}</span></div><div class="pscreen">${body}</div>
      <nav class="ptabbar" aria-label="Menu aplikasi">${PTABS.filter(x => PTABS_M.includes(x[0])).map(([k, l, ic]) => `<a href="#" data-ptab="${k}" aria-current="${k === t || (["gaji","cuti"].includes(t) && k === "profil")}">${ico(ic)}<span>${l}</span></a>`).join("")}</nav></div></div>`
    : `<div class="portal"><div class="pscreen">${body}</div></div>`) + `
    <p class="foot">Mockup. Semua nama, angka, tarif dan aturan adalah contoh dan dibuat di browser.</p>`;
  bindPortal(w); bindTugas(w);
  const sc = hp ? $(".pframe .pscreen") : null;
  if (UI.psec) { const el = $("#ps-" + UI.psec); if (el) { if (sc) sc.scrollTop = el.offsetTop - sc.offsetTop - 8; else el.scrollIntoView({block: "start"}); } UI.psec = null; } else { window.scrollTo(0, 0); if (sc) sc.scrollTop = 0; }
}
function bindPortal(w){
  $$("[data-ptab]").forEach(a => a.onclick = e => { e.preventDefault(); UI.ptab = a.dataset.ptab; UI.psec = a.dataset.psec || null; renderPortal(); });
  $("#pwho").onchange = e => { UI.hpWho = e.target.value; renderPortal(); };
  $$("[data-pv]").forEach(b => b.onclick = () => { UI.pview = b.dataset.pv; renderPortal(); });
  $$("[data-pjm]").forEach(b => b.onclick = () => { UI.pjm = b.dataset.pjm; renderPortal(); });
  $$("[data-pok]").forEach(b => b.onclick = () => { SPL.find(s => s.id === b.dataset.pok).ok = true; toast("Konfirmasi terkirim ke manajer."); renderPortal(); });
  $$("[data-pick]").forEach(b => b.onclick = () => { b.disabled = true; b.textContent = "Diminta"; toast("Permintaan dikirim ke leader seksi. Shift masuk jadwal Anda setelah disetujui."); });
  $$("[data-clk]").forEach(b => b.onclick = () => {
    const k = b.dataset.clk, c = UI.clock[w.id] || (UI.clock[w.id] = {});
    if (k === "in") { c.in = 6 * 60 + 52; toast("Absen masuk 06.52 tercatat. Selamat bekerja."); }
    if (k === "brk") { c.brk = 11 * 60; toast("Istirahat dimulai."); }
    if (k === "out") { c.out = 15 * 60 + 4; toast("Absen pulang 15.04 tercatat. Timesheet dikirim ke atasan."); }
    renderPortal();
  });
  $$("[data-pslip]").forEach(b => b.onclick = () => payslip(w, b.dataset.pslip === "cur" ? null : payHistory(w)[+b.dataset.pslip]));
  const dsp = $("#pdispute"); if (dsp) dsp.onclick = () => toast("Laporan dikirim ke atasan dan HR. Dijawab paling lambat 2 hari kerja.");
  const pl = $("#pleave"); if (pl) pl.onclick = () => {
    modal("Ajukan cuti atau izin", `<div class="grid g2" style="gap:12px"><div class="field"><label for="lt">Jenis</label><select id="lt"><option>Cuti tahunan</option><option>Sakit</option><option>Izin</option>${w.f ? "<option>Cuti haid</option>" : ""}<option>Tidak bisa masuk (bukan cuti)</option></select></div><div class="field"><label for="ld">Tanggal</label><select id="ld">${[1,2,3,4,5,6,7,8,9,10].map(d => `<option value="${d}">${dLong(d)}</option>`).join("")}</select></div><div class="field" style="grid-column:1/-1"><label for="ln">Alasan</label><input type="text" id="ln"></div></div><div class="small muted">Sisa cuti tahunan ${w.ag === "PHL" ? "—" : w.leaveBal + " hari"}. Sakit perlu surat dokter, bisa diunggah belakangan.</div>`, `<button class="btn" data-close>Batal</button><button class="btn pri" id="lsend">Kirim ke atasan</button>`);
    $("#lsend").onclick = () => { const d = +$("#ld").value; addLeave(w, $("#lt").value.startsWith("Tidak") ? "Izin" : $("#lt").value, d, d, "pending", $("#ln").value || "-"); closeModal(); toast("Pengajuan terkirim ke atasan."); renderPortal(); };
  };
  $$("[data-pedit]").forEach(b => b.onclick = () => {
    const k = b.dataset.pedit;
    if (k === "bank") {
      modal("Ganti rekening", `<div class="field"><label for="pin">Masukkan PIN untuk melanjutkan</label><input type="text" id="pin" inputmode="numeric" autocomplete="off" placeholder="6 angka"></div><div class="grid g2" style="gap:12px;margin-top:12px"><div class="field"><label for="bk2">Bank</label><select id="bk2">${["BCA","BRI","Mandiri","BNI","BSI","BJB","SeaBank"].map(x => `<option>${x}</option>`).join("")}</select></div><div class="field"><label for="bn2">Nomor rekening</label><input type="text" id="bn2" inputmode="numeric"></div></div><div class="note">Rekening harus atas nama Anda sendiri (${esc(w.name)}). Sampai disetujui, gaji tetap ke rekening lama.</div><div id="berr2"></div>`, `<button class="btn" data-close>Batal</button><button class="btn pri" id="bsend2">Ajukan</button>`);
      $("#bsend2").onclick = () => { const no = $("#bn2").value.replace(/\D/g, ""); if ($("#pin").value.length < 6 || no.length < 10) { $("#berr2").innerHTML = '<div class="note bad">Isi PIN 6 angka dan nomor rekening 10 sampai 16 angka.</div>'; return; }
        BREQ.unshift({id:"BR-0" + (72 + BREQ.length - 3), w:w.id, kind:"Ganti rekening", from:{bank:w.bank.bank, no:w.bank.no}, to:{bank:$("#bk2").value, no, holder:w.name}, when:"Senin 23 Nov", via:"Aplikasi pekerja (PIN)", reason:"Diajukan pekerja", inquiry:null, approvals:[], status:"Menunggu", flags:[]});
        closeModal(); toast("Perubahan rekening diajukan. Anda dapat notifikasi setelah disetujui HR dan Finance."); };
    } else if (k === "kual") {
      modal("Tambah kualifikasi", `<div class="field"><label for="qn">Nama kualifikasi atau mesin</label><input type="text" id="qn" placeholder="contoh: Mesin FB-03, SIO forklift"></div><div class="small muted">Leader seksi akan menilai lalu menyetujui.</div>`, `<button class="btn" data-close>Batal</button><button class="btn pri" id="qsend">Kirim</button>`);
      $("#qsend").onclick = () => { const v = $("#qn").value.trim(); if (!v) return; UI.pq = UI.pq || {}; (UI.pq[w.id] = UI.pq[w.id] || []).push(v); closeModal(); toast("Dikirim ke leader untuk dinilai."); UI.psec = "kual"; renderPortal(); };
    } else { profEdit(w, k); const s = $("#pesave"), f = s.onclick; s.onclick = () => { f(); UI.ptab = "profil"; renderPortal(); }; }
  });
  const lo = $("#plogout"); if (lo) lo.onclick = e => { e.preventDefault(); setRole("hr"); };
}

/* route: worker roles get the portal instead of the manager app */
{
  const _r = route;
  route = function(){
    document.body.classList.remove("inportal");
    if (roleOf().worker) { renderWho(); renderViewAs(); renderPortal(); return; }
    _r();
  };
  const _set = setRole;
  setRole = function(id){ if (ROLES.find(r => r.id === id && r.worker)) { UI.ptab = "tugas"; } _set(id); };
}

/* Lembur › "Portal pekerja": explains the login and opens it as either worker type */
PAGES.hp = () => `<div class="pagehead"><div><h1>Portal pekerja</h1><div class="sub">Setiap pekerja login dengan No. HP dan PIN, di HP atau komputer. Yang terlihat hanya data miliknya sendiri.</div></div></div>
  <div class="grid g2">${[["opr","Operator mesin (karyawan per jam)","Jadwal dan regu, absen, perintah lembur untuk dikonfirmasi, hasil mesin, slip gaji, cuti dan data pribadi."],["os","Packer alih daya (Penukal atau Gemna)","Jadwal dan shift kosong yang bisa diambil, absen, jumlah bal, slip gaji dari agen, cuti dan data pribadi."]].map(([k, t, d]) => `<section class="card"><div class="bd"><h2>${t}</h2><p class="muted" style="margin:6px 0 12px">${d}</p><button class="btn pri" data-open="${k}" data-v="hp">Buka di HP</button> <button class="btn" data-open="${k}" data-v="web">Buka versi web</button></div></section>`).join("")}</div>`;
PAGES.hp.after = () => $$("[data-open]").forEach(b => b.onclick = () => { UI.pview = b.dataset.v; setRole(b.dataset.open); });
NAV.forEach(g => g.pages.forEach(p => { if (p[0] === "hp") p[1] = "Portal pekerja"; }));
if (typeof PAGEINFO !== "undefined") PAGEINFO.hp = ["phone", "Login pekerja untuk melihat data sendiri"];
