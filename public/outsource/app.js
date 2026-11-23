"use strict";
/* Pages for the Tenaga Kerja Alih Daya mockup. Data and helpers are in index.html. */
const PAGES = {};
const WEEK = [0, 1, 2, 3, 4, 5, 6];

/* ======================= Beranda ======================= */
function openSlots(sec){ let n = 0; for (const d of WEEK) for (const s of "PSM") n += Math.max(0, need(sec, d, s) - sched(sec, d, s)); return n; }
PAGES.beranda = () => {
  const nowNeed = SEC.reduce((a, s) => a + need(s.id, 0, "P"), 0), nowSch = SEC.reduce((a, s) => a + sched(s.id, 0, "P"), 0);
  const tsY = W.map(w => ts(w, -1)).filter(Boolean);
  const cek = tsY.filter(t => t.st === "cek").length;
  const open = SEC.map(s => [s, openSlots(s.id)]);
  const openTot = open.reduce((a, x) => a + x[1], 0);
  const pend = LEAVES.filter(l => l.status === "pending").length;
  const ending = W.filter(w => w.ag !== "PHL" && daysBetween(TODAY, w.end) <= 14 && w.end >= TODAY);
  const breq = BREQ.filter(b => b.status !== "Disetujui" && b.status !== "Ditolak").length;
  const net = payroll().reduce((a, p) => a + p.net, 0);
  const todo = [];
  for (const [s, n] of open) if (n) todo.push([`${n} shift kosong minggu ini di ${s.n}`, PLAN_CHG.filter(c => c.sec === s.id && c.delta > 0).map(c => dShort(c.d) + ": " + c.why).join(" · ") || "Karena cuti dan sakit", "#jadwal", "Isi shift", s.id]);
  if (breq) todo.push([`${breq} perubahan rekening bank menunggu persetujuan`, "Harus selesai sebelum file transfer gajian dibuat (24 Nov)", "#rekening", "Tinjau"]);
  if (cek) todo.push([`${cek} timesheet kemarin perlu dicek`, "Terlambat, tidak absen pulang, mangkir atau lembur tanpa perintah", "#absensi", "Cek"]);
  if (pend) todo.push([`${pend} pengajuan cuti dan izin`, "Persetujuan mengubah roster dan bisa membuat shift kosong", "#cuti", "Tinjau"]);
  if (ending.length) todo.push([`${ending.length} kontrak PKWT berakhir dalam 14 hari`, ending.map(w => w.name.split(" ")[0] + " (" + dDate(w.end).slice(0, -5) + ")").join(", "), "#kontrak", "Putuskan"]);
  todo.push(["Penggajian " + PERIOD.n + " menunggu persetujuan", "Dibayar " + PERIOD.pay + " · " + rpS(net) + " ke " + payroll().length + " pekerja", "#penggajian", "Buka"]);
  const weekCost = SEC.reduce((a, s) => a + WEEK.reduce((b, d) => b + dayCost(s.id, d), 0), 0);
  return `
  <div class="pagehead"><div><h1>Selamat pagi, Ibu Maya</h1><div class="sub">${dLong(0)} · Shift Pagi sedang berjalan · Pabrik [KOTA]</div></div>
    <div class="actions"><a class="btn" href="#kebutuhan">Kebutuhan tenaga</a><a class="btn pri" href="#jadwal">Buka roster</a></div></div>
  <div class="stats">
    <div class="stat"><div class="k">Terjadwal shift Pagi</div><div class="v ${nowSch < nowNeed ? "warn" : ""}">${nowSch} <span class="small muted">/ ${nowNeed}</span></div><div class="s">dari kebutuhan rencana produksi</div></div>
    <div class="stat"><div class="k">Shift kosong minggu ini</div><div class="v ${openTot ? "bad" : ""}">${openTot}</div><div class="s">${open.filter(x => x[1]).map(x => x[0].id).join(", ") || "semua terisi"}</div></div>
    <div class="stat"><div class="k">Timesheet perlu dicek</div><div class="v ${cek ? "warn" : ""}">${cek}</div><div class="s">${dShort(-1)}</div></div>
    <div class="stat"><div class="k">Biaya tenaga minggu ini</div><div class="v">${rpS(weekCost)}</div><div class="s">perkiraan dari roster</div></div>
    <div class="stat"><div class="k">Gajian berikutnya</div><div class="v">25 Nov</div><div class="s">${rpS(net)} neto</div></div>
  </div>
  <div class="grid g21">
    <section class="card"><div class="hd"><h2>Perlu tindakan</h2><span class="tag">${todo.length}</span></div>
      <ul class="list">${todo.map((t, i) => `<li><div class="grow"><b>${t[0]}</b><div class="meta">${t[1]}</div></div><a class="btn sm" href="${t[2]}" ${t[4] ? `data-sec="${t[4]}"` : ""}>${t[3]}</a></li>`).join("")}</ul></section>
    <section class="card"><div class="hd"><h2>Hari ini per seksi</h2><span class="more small muted">terjadwal / butuh</span></div>
      <div class="bd flush tw"><table class="tbl"><thead><tr><th>Seksi</th><th class="num">Pagi</th><th class="num">Siang</th><th class="num">Malam</th></tr></thead><tbody>
      ${SEC.map(s => `<tr><td>${s.n.replace("Seksi ", "S")}<span class="sub">${machinesOn(s.id, 0, "P")} mesin · ${s.leader}</span></td>${[..."PSM"].map(x => { const a = sched(s.id, 0, x), b = need(s.id, 0, x); return `<td class="num ${a < b ? "" : ""}">${a < b ? `<span class="tag bad">${a}/${b}</span>` : a + "/" + b}</td>`; }).join("")}</tr>`).join("")}
      </tbody></table></div></section>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <section class="card"><div class="hd"><h2>Biaya tenaga per 1.000 bal</h2><span class="more small muted">minggu lalu, roster × hasil packing</span></div>
      <div class="bd flush tw"><table class="tbl"><thead><tr><th>Seksi</th><th class="num">Bal</th><th class="num">Biaya tenaga</th><th class="num">Per 1.000 bal</th><th class="num">vs minggu sebelumnya</th></tr></thead><tbody>
      ${SEC.map((s, i) => { const bales = s.mach.length * 3 * 7 * (300 + i * 15); const cost = WEEK.reduce((b, d) => b + dayCost(s.id, d - 7), 0); const per = cost / bales * 1000; const ch = (hash(s.id + "c") - .55) * 9; return `<tr><td>${s.n.replace("Seksi ", "S")}</td><td class="num">${fmt(bales)}</td><td class="num">${rpS(cost)}</td><td class="num">${rp(Math.round(per / 100) * 100)}</td><td class="num"><span class="${ch > 0 ? "tag warn" : "tag ok"}">${ch > 0 ? "+" : "−"}${dec(Math.abs(ch))}%</span></td></tr>`; }).join("")}
      </tbody></table></div></section>
    <section class="card"><div class="hd"><h2>Agen penyalur</h2><a class="more btn ghost sm" href="#agen">Semua agen</a></div>
      <div class="bd flush tw"><table class="tbl"><thead><tr><th>Agen</th><th class="num">Pekerja</th><th class="num">Kehadiran</th><th class="num">Permintaan terpenuhi</th></tr></thead><tbody>
      ${Object.values(AG).map(a => `<tr><td>${a.n}<span class="sub">${a.id === "PHL" ? "Cadangan harian" : MODEL[a.model].split(",")[0]}</span></td><td class="num">${W.filter(w => w.ag === a.id).length}</td><td class="num">${dec(a.att * 100)}%</td><td class="num">${a.id === "PHL" ? "—" : Math.round(a.fill * 100) + "%"}</td></tr>`).join("")}
      </tbody></table></div></section>
  </div>`;
};
PAGES.beranda.after = () => { $$("[data-sec]").forEach(a => a.addEventListener("click", () => { UI.rosterSec = a.dataset.sec; })); };

/* ======================= Roster ======================= */
function consecutive(w, d, newCode){
  let n = 1;
  for (let x = d - 1; x >= d - 10; x--) { if (SH[shiftOf(code(w, x))]) n++; else break; }
  for (let x = d + 1; x <= d + 10; x++) { if (SH[shiftOf(code(w, x))]) n++; else break; }
  return SH[shiftOf(newCode)] ? n : 0;
}
function warnings(w, d, c){
  const out = [], s = shiftOf(c);
  if (!SH[s]) return out;
  const prev = shiftOf(code(w, d - 1)), next = shiftOf(code(w, d + 1));
  if (prev === "M" && s === "P") out.push(["bad", "Shift malam kemarin selesai 07.00, jadi tidak ada jeda istirahat sebelum shift Pagi."]);
  if (prev === "M" && s === "S") out.push(["warn", "Jeda istirahat hanya 8 jam setelah shift malam."]);
  if (s === "M" && next === "P") out.push(["bad", "Shift Pagi besok mulai tepat saat shift Malam ini selesai."]);
  if (s === "S" && next === "P") out.push(["warn", "Jeda istirahat ke shift Pagi besok hanya 8 jam."]);
  const run = consecutive(w, d, c); if (run > 6) out.push(["bad", `${run} hari kerja berturut-turut. Pola 6 hari kerja memberi minimal 1 hari istirahat per minggu.`]);
  if (w.ag !== "PHL" && baseCode(w, d) === "L") out.push(["warn", `Hari istirahat ${w.name.split(" ")[0]}: dibayar sebagai kerja di hari istirahat (2× upah sejam, sekitar ${rp(hourly() * 7 * 2)}).`]);
  if (w.end < dt(d)) out.push(["bad", "Kontrak sudah berakhir pada tanggal ini."]);
  const pl = LEAVES.find(l => l.w === w.id && l.status === "pending" && d >= l.from && d <= l.to); if (pl) out.push(["warn", `Ada pengajuan ${pl.type.toLowerCase()} yang belum diputuskan untuk tanggal ini.`]);
  return out;
}
function cellHtml(w, d, curSec){
  const c = code(w, d), s = shiftOf(c), other = secOf(w, c), ed = OV[key(w.id, d)] !== undefined && OV[key(w.id, d)] !== OV0[key(w.id, d)];
  const pl = LEAVES.find(l => l.w === w.id && l.status === "pending" && d >= l.from && d <= l.to);
  let inner;
  if (SH[s]) inner = `<span class="sh ${s} ${ed ? "edited" : ""} ${w.ag !== "PHL" && baseCode(w, d) === "L" ? "ot" : ""}">${SH[s].n}<small>${SH[s].t.replace(/\.00/g, "")}${other !== curSec ? " · " + other : ""}</small></span>`;
  else if (s === "L") inner = `<span class="small faint">${w.ag === "PHL" ? "tersedia" : "libur"}</span>`;
  else inner = `<span class="sh ${s}">${LEAVE[s]}</span>`;
  if (pl) inner += `<span class="tag warn" style="margin-top:3px">minta ${pl.type === "Izin" ? "izin" : pl.type === "Sakit" ? "sakit" : "cuti"}</span>`;
  return `<td class="c"><button class="cellbtn" data-cell="${w.id}|${d}" aria-label="${esc(w.name)}, ${dShort(d)}">${inner}</button></td>`;
}
function hoursWeek(w){ return WEEK.reduce((a, d) => a + (SH[shiftOf(code(w, d))] ? 7 : 0), 0); }
PAGES.jadwal = () => {
  const sec = UI.rosterSec, s = secById(sec), ag = UI.rosterAg;
  const changes = Object.keys({...OV, ...OV0}).filter(k => OV[k] !== OV0[k]).length;
  const rows = W.filter(w => w.sec === sec && (!ag || w.ag === ag));
  const guests = W.filter(w => w.sec !== sec && WEEK.some(d => { const c = code(w, d); return SH[shiftOf(c)] && secOf(w, c) === sec; }));
  const needRow = `<tr class="need"><td class="nm"><b>Kebutuhan vs terjadwal</b><span>dari rencana produksi PPIC</span></td>${WEEK.map(d => `<td class="c">${[..."PSM"].map(x => { const a = sched(sec, d, x), b = need(sec, d, x); return `<div class="needline ${a < b ? "short" : ""}"><span>${SH[x].n}</span><span class="num">${a}/${b}</span></div>`; }).join("")}${[..."PSM"].map(x => { const g = need(sec, d, x) - sched(sec, d, x); return g > 0 ? `<button class="openbtn" data-open="${sec}|${d}|${x}">${SH[x].n[0]} −${g} isi</button>` : ""; }).join("")}</td>`).join("")}<td class="tot"></td></tr>`;
  const grp = (title, list) => list.length ? `<tr class="grp"><td class="nm" style="background:#f3f5f8">${title}</td><td colspan="8">${list.length} orang</td></tr>` + list.map(w => `<tr><td class="nm"><a href="#profil/${w.id}" style="color:inherit;text-decoration:none"><b>${esc(w.name)}</b></a><span>${w.role} · ${AG[w.ag].short}${w.trained.length && w.role === "Packer" ? " · " + w.trained.join(", ") : ""}</span></td>${WEEK.map(d => cellHtml(w, d, sec)).join("")}<td class="tot">${hoursWeek(w)} j</td></tr>`).join("") : "";
  const plan = PLAN_CHG.filter(c => c.sec === sec);
  return `
  <div class="pagehead"><div><h1>Roster</h1><div class="sub">${dShort(0)} – ${dShort(6)} 2026 · ${s.n} · Leader ${s.leader}</div></div>
    <div class="actions">
      <label class="sr" for="rsec">Seksi</label>${selectSec(sec, 'id="rsec"', null)}
      <label class="sr" for="rag">Agen</label>${selectAg(ag, 'id="rag"')}
      <button class="btn" id="autofill">Isi shift kosong</button>
      <button class="btn pri" id="publish" ${changes ? "" : "disabled"}>Terbitkan${changes ? ` (${changes} perubahan)` : ""}</button>
    </div></div>
  ${plan.length ? `<div class="note" style="margin-bottom:12px"><b style="color:var(--ink)">Perubahan rencana produksi minggu ini:</b> ${plan.map(c => `${dShort(c.d)} ${c.sh === "PSM" ? "semua shift" : SH[c.sh].n}: ${c.delta > 0 ? "+" : ""}${c.delta} mesin, ${c.why}`).join(" · ")}</div>` : ""}
  <div class="filters legend"><span class="sh P">Pagi</span><span class="sh S">Siang</span><span class="sh M">Malam</span><span class="sh C">Cuti</span><span class="sh SK">Sakit</span><span class="sh I">Izin</span><span class="sh P ot">Di hari istirahat</span><span class="sh P edited">Diubah, belum terbit</span><span style="margin-left:auto">Klik sel untuk mengubah shift</span></div>
  <div class="card"><div class="tw" style="max-height:72vh"><table class="roster"><thead><tr><th class="nm">Pekerja</th>${WEEK.map(d => `<th class="${d === 0 ? "today" : ""}">${dShort(d)}</th>`).join("")}<th class="right">Jam</th></tr></thead><tbody>
    ${needRow}
    ${["A","B","C","D"].map(r => grp("Regu " + r, rows.filter(w => w.regu === r))).join("")}
    ${grp("Dipinjam dan harian lepas", guests)}
    <tr class="need"><td class="nm"><b>Perkiraan biaya</b><span>upah, makan, malam, lembur</span></td>${WEEK.map(d => `<td class="c num" style="padding:8px">${rpS(dayCost(sec, d))}</td>`).join("")}<td class="tot">${rpS(WEEK.reduce((a, d) => a + dayCost(sec, d), 0))}</td></tr>
  </tbody></table></div></div>`;
};
PAGES.jadwal.after = () => {
  $("#rsec").onchange = e => { UI.rosterSec = e.target.value; rerender(); };
  $("#rag").onchange = e => { UI.rosterAg = e.target.value; rerender(); };
  $$("[data-cell]").forEach(b => b.onclick = () => { const [id, d] = b.dataset.cell.split("|"); editCell(wById(id), +d); });
  $$("[data-open]").forEach(b => b.onclick = () => { const [sec, d, sh] = b.dataset.open.split("|"); openFill(sec, +d, sh); });
  $("#publish").onclick = () => {
    const ch = Object.keys({...OV, ...OV0}).filter(k => OV[k] !== OV0[k]);
    const people = new Set(ch.map(k => k.split("|")[0]));
    for (const k of Object.keys(OV0)) delete OV0[k]; Object.assign(OV0, OV);
    toast(`Roster diterbitkan. ${people.size} pekerja yang jadwalnya berubah mendapat notifikasi di aplikasi dan WhatsApp.`); rerender();
  };
  $("#autofill").onclick = () => {
    const sec = UI.rosterSec; let filled = 0, left = 0;
    for (const d of WEEK) for (const x of "PSM") {
      let gap = need(sec, d, x) - sched(sec, d, x);
      for (const c of candidates(sec, d, x)) { if (gap <= 0) break; if (c.warn.some(w => w[0] === "bad")) continue; OV[key(c.w.id, d)] = c.w.sec === sec ? x : x + "@" + sec; gap--; filled++; }
      left += Math.max(0, gap);
    }
    toast(filled ? `${filled} shift diisi dari pekerja harian lepas dan regu yang libur.${left ? ` ${left} masih kosong, buat permintaan ke agen.` : ""} Periksa lalu terbitkan.` : "Tidak ada kandidat tanpa peringatan. Buat permintaan ke agen.");
    rerender();
  };
};
function editCell(w, d){
  const cur = code(w, d), s = shiftOf(cur), sec = secOf(w, cur);
  const opts = [["P","Pagi"],["S","Siang"],["M","Malam"],["L","Libur"],["C","Cuti"],["SK","Sakit"],["I","Izin"]];
  const body = `<div class="person"><span class="av sm">${initials(w.name)}</span><div><b>${esc(w.name)}</b><div class="small muted">${w.role} · ${w.sec ? "Regu " + w.regu + " · " + w.sec : "Harian lepas"} · ${dLong(d)}</div></div></div>
  <fieldset style="border:0;margin:0;padding:0"><legend class="lbl" style="margin-bottom:6px">Shift</legend><div class="opts">${opts.map(([k, n]) => `<label><input type="radio" name="sh" value="${k}" ${k === s ? "checked" : ""}>${n}${SH[k] ? `<span class="small muted">${SH[k].t.replace(/\.00/g, "")}</span>` : ""}</label>`).join("")}</div></fieldset>
  <div class="field"><label for="esec">Di seksi</label>${selectSec(sec || UI.rosterSec, 'id="esec"', null)}</div>
  <div id="ewarn"></div>`;
  modal("Ubah shift", body, `<button class="btn" data-close>Batal</button><button class="btn pri" id="esave">Simpan</button>`);
  const upd = () => { const v = $("input[name=sh]:checked")?.value; const ws = v ? warnings(w, d, v) : []; $("#ewarn").innerHTML = ws.map(x => `<div class="note ${x[0]}" style="margin-top:6px">${x[1]}</div>`).join(""); };
  $$("input[name=sh]").forEach(i => i.onchange = upd); upd();
  $("#esave").onclick = () => { const v = $("input[name=sh]:checked")?.value; if (!v) return; const sc = $("#esec").value; OV[key(w.id, d)] = SH[v] && sc !== w.sec ? v + "@" + sc : v; if (OV[key(w.id, d)] === baseCode(w, d) && OV0[key(w.id, d)] === undefined) delete OV[key(w.id, d)]; closeModal(); rerender(); };
}
function candidates(sec, d, x){
  const out = [];
  for (const w of W) {
    if (w.sec !== sec && w.ag !== "PHL") continue;
    if (shiftOf(code(w, d)) !== "L") continue;
    if (w.ag !== "PHL" && w.end < dt(d)) continue;
    const ws = warnings(w, d, x);
    out.push({w, warn: ws, cost: w.ag === "PHL" ? R.phlDaily + R.meal : daily() + hourly() * 7 + R.meal, kind: w.ag === "PHL" ? "Harian lepas" : "Regu " + w.regu + " (libur)"});
  }
  return out.sort((a, b) => (a.warn.filter(w => w[0] === "bad").length - b.warn.filter(w => w[0] === "bad").length) || (a.w.ag === "PHL" ? -1 : 1) - (b.w.ag === "PHL" ? -1 : 1) || a.cost - b.cost);
}
function openFill(sec, d, x){
  const gap = need(sec, d, x) - sched(sec, d, x), list = candidates(sec, d, x).slice(0, 10);
  const why = PLAN_CHG.find(c => c.sec === sec && c.d === d && c.sh.includes(x) && c.delta > 0);
  modal(`Isi ${gap} shift ${SH[x].n.toLowerCase()} · ${dShort(d)}`, `
    <div class="small muted">${secById(sec).n} · ${SH[x].t}${why ? " · " + why.why : ""}</div>
    <div class="tw"><table class="tbl"><thead><tr><th></th><th>Kandidat</th><th>Status</th><th class="num">Biaya shift</th></tr></thead><tbody>
    ${list.map((c, i) => `<tr><td><input type="checkbox" id="cf${i}" data-w="${c.w.id}" ${i < gap && !c.warn.some(w => w[0] === "bad") ? "checked" : ""} aria-label="Pilih ${esc(c.w.name)}"></td><td><label for="cf${i}"><b>${esc(c.w.name)}</b></label><span class="sub">${c.w.role}${c.w.ag === "PHL" ? "" : " · " + c.w.trained.slice(0, 3).join(", ")}</span></td><td>${c.kind}${c.warn.map(w => `<span class="sub" style="color:var(--${w[0] === "bad" ? "bad" : "warn"})">${w[1].split(".")[0]}</span>`).join("")}</td><td class="num">${rp(c.cost)}</td></tr>`).join("") || `<tr><td colspan="4" class="empty">Tidak ada pekerja yang libur di seksi ini atau harian lepas yang tersedia.</td></tr>`}
    </tbody></table></div>
    <div class="note">Tidak cukup? Minta tambahan ke ${AG[secById(sec).ag].n}. Permintaan dikirim ke PIC agen lewat email dan WhatsApp, dan nama pekerja yang dikirim agen langsung masuk ke roster.</div>`,
    `<button class="btn" id="toagen">Minta ke agen</button><button class="btn pri" id="fsave">Masukkan ke roster</button>`, {wide:true});
  $("#fsave").onclick = () => { let n = 0; $$("#overlay input[data-w]:checked").forEach(i => { const w = wById(i.dataset.w); OV[key(w.id, d)] = w.sec === sec ? x : x + "@" + sec; n++; }); closeModal(); toast(`${n} pekerja dimasukkan ke shift ${SH[x].n} ${dShort(d)}. Terbitkan roster untuk memberi tahu mereka.`); rerender(); };
  $("#toagen").onclick = () => requestModal({sec, d, sh:x, n:gap});
}

/* ======================= Kebutuhan tenaga ======================= */
PAGES.kebutuhan = () => {
  const d = UI.planDay;
  let tN = 0, tS = 0;
  const rows = SEC.map(s => { const r = [..."PSM"].map(x => ({m: machinesOn(s.id, d, x), n: need(s.id, d, x), a: sched(s.id, d, x)})); r.forEach(y => { tN += y.n; tS += Math.min(y.a, y.n); }); return [s, r]; });
  return `
  <div class="pagehead"><div><h1>Kebutuhan tenaga</h1><div class="sub">Dihitung dari rencana produksi PPIC (diperbarui Minggu 22 Nov, 16.00). Butuh = mesin jalan × kru per mesin + helper dan forklift.</div></div>
    <div class="actions"><button class="btn" id="newreq">Buat permintaan ke agen</button></div></div>
  <div class="filters"><div class="seg" role="group" aria-label="Hari">${WEEK.map(x => `<button aria-pressed="${x === d}" data-day="${x}">${dShort(x)}</button>`).join("")}</div></div>
  <div class="stats">
    <div class="stat"><div class="k">Kebutuhan ${dShort(d)}</div><div class="v">${tN}</div><div class="s">orang-shift, 3 shift</div></div>
    <div class="stat"><div class="k">Terisi</div><div class="v">${tS}</div><div class="s">${Math.round(tS / tN * 100)}% dari kebutuhan</div></div>
    <div class="stat"><div class="k">Kurang</div><div class="v ${tN - tS ? "bad" : ""}">${tN - tS}</div><div class="s">orang-shift</div></div>
    <div class="stat"><div class="k">Mesin dijadwalkan</div><div class="v">${SEC.reduce((a, s) => a + machinesOn(s.id, d, "P"), 0)}</div><div class="s">shift Pagi, dari 51 mesin</div></div>
  </div>
  <section class="card"><div class="bd flush tw"><table class="tbl"><thead><tr><th>Seksi</th><th class="num">Kru / mesin</th>${[..."PSM"].map(x => `<th class="num">${SH[x].n}<span class="sub">mesin · butuh · terisi</span></th>`).join("")}<th>Agen utama</th><th></th></tr></thead><tbody>
    ${rows.map(([s, r]) => { const short = r.some(y => y.a < y.n); return `<tr><td><b>${s.n}</b><span class="sub">+ ${s.extra.join(", ").toLowerCase()}</span></td><td class="num">${s.crew}</td>${r.map(y => `<td class="num">${y.m} · ${y.n} · ${y.a < y.n ? `<span class="tag bad">${y.a}</span>` : y.a}</td>`).join("")}<td>${AG[s.ag].short}</td><td class="right">${short ? `<button class="btn sm" data-goto="${s.id}">Isi di roster</button>` : '<span class="tag ok">Cukup</span>'}</td></tr>`; }).join("")}
  </tbody></table></div></section>
  <section class="card" style="margin-top:16px"><div class="hd"><h2>Perubahan rencana produksi minggu ini</h2></div>
    <div class="bd flush tw"><table class="tbl"><thead><tr><th>Hari</th><th>Seksi</th><th>Shift</th><th class="num">Mesin</th><th class="num">Tenaga</th><th>Alasan</th></tr></thead><tbody>
    ${PLAN_CHG.map(c => `<tr><td>${dShort(c.d)}</td><td>${secById(c.sec).n}</td><td>${c.sh === "PSM" ? "Semua" : SH[c.sh].n}</td><td class="num">${c.delta > 0 ? "+" : ""}${c.delta}</td><td class="num">${c.delta > 0 ? "+" : ""}${c.delta * secById(c.sec).crew} per shift</td><td>${c.why}</td></tr>`).join("")}
    </tbody></table></div></section>`;
};
PAGES.kebutuhan.after = () => {
  $$("[data-day]").forEach(b => b.onclick = () => { UI.planDay = +b.dataset.day; rerender(); });
  $$("[data-goto]").forEach(b => b.onclick = () => { UI.rosterSec = b.dataset.goto; location.hash = "jadwal"; });
  $("#newreq").onclick = () => requestModal({});
};

/* ======================= Permintaan ke agen ======================= */
function requestModal(p){
  const sec = p.sec || "S3";
  modal("Permintaan tenaga ke agen", `
    <div class="grid g2" style="gap:12px">
      <div class="field"><label for="rq-sec">Seksi</label>${selectSec(sec, 'id="rq-sec"', null)}</div>
      <div class="field"><label for="rq-ag">Agen</label><select id="rq-ag">${["MKS","STM","BKN"].map(a => `<option value="${a}" ${a === secById(sec).ag ? "selected" : ""}>${AG[a].n}</option>`).join("")}</select></div>
      <div class="field"><label for="rq-d">Tanggal</label><select id="rq-d">${WEEK.map(d => `<option value="${d}" ${d === (p.d ?? 3) ? "selected" : ""}>${dLong(d)}</option>`).join("")}</select></div>
      <div class="field"><label for="rq-sh">Shift</label><select id="rq-sh">${[..."PSM"].map(x => `<option value="${x}" ${x === (p.sh || "P") ? "selected" : ""}>${SH[x].n} ${SH[x].t}</option>`).join("")}</select></div>
      <div class="field"><label for="rq-n">Jumlah orang</label><input type="number" id="rq-n" min="1" max="30" value="${Math.max(1, p.n || 2)}"></div>
      <div class="field"><label for="rq-role">Posisi</label><select id="rq-role"><option>Packer</option><option>Helper produksi</option><option>Operator forklift (SIO)</option></select></div>
    </div>
    <div class="field"><label for="rq-note">Catatan untuk agen</label><textarea id="rq-note" rows="2">Sudah ikut induksi K3. Datang 06.30 ke pos satpam gerbang 2, bawa KTP.</textarea></div>
    <div class="note">Tarif sesuai perjanjian alih daya: upah mengikuti aturan gaji pabrik, fee agen ${Math.round(AG[secById(sec).ag].fee * 1000) / 10}%. Agen harus mengirim nama paling lambat H−1 pukul 18.00.</div>`,
    `<button class="btn" data-close>Batal</button><button class="btn pri" id="rq-send">Kirim ke agen</button>`);
  $("#rq-sec").onchange = e => { $("#rq-ag").value = secById(e.target.value).ag; };
  $("#rq-send").onclick = () => {
    const r = {id: "RQ-" + (119 + REQS.length - 4), ag: $("#rq-ag").value, sec: $("#rq-sec").value, d: +$("#rq-d").value, sh: $("#rq-sh").value, n: +$("#rq-n").value, status: "Menunggu agen", names: "-", sent: "23 Nov 2026"};
    REQS.unshift(r); closeModal(); toast(`${r.id} dikirim ke ${AG[r.ag].pic} (${AG[r.ag].short}). Status bisa dilihat di Permintaan ke agen.`);
    if (location.hash === "#permintaan") rerender();
  };
}
PAGES.permintaan = () => `
  <div class="pagehead"><div><h1>Permintaan ke agen</h1><div class="sub">Tambahan tenaga untuk shift kosong. Agen mengirim nama, nama masuk ke roster setelah dikonfirmasi HR.</div></div>
    <div class="actions"><button class="btn pri" id="newreq">Buat permintaan</button></div></div>
  <section class="card"><div class="bd flush tw"><table class="tbl"><thead><tr><th>No.</th><th>Agen</th><th>Seksi</th><th>Untuk</th><th class="num">Orang</th><th>Dikirim</th><th>Status</th><th>Nama dari agen</th><th></th></tr></thead><tbody>
  ${REQS.map(r => `<tr><td class="num">${r.id}</td><td>${AG[r.ag].short}</td><td>${secById(r.sec).n.split(" · ")[1]}</td><td>${dShort(r.d)} · ${SH[r.sh].n}</td><td class="num">${r.n}</td><td>${r.sent}</td><td><span class="tag ${r.status === "Selesai" ? "ok" : r.status === "Dikonfirmasi" ? "info" : "warn"}">${r.status}</span></td><td>${r.names}</td><td class="right">${r.status === "Menunggu agen" ? `<button class="btn sm" data-remind="${r.id}">Ingatkan</button>` : r.status === "Dikonfirmasi" ? `<button class="btn sm" data-accept="${r.id}">Masukkan ke roster</button>` : ""}</td></tr>`).join("")}
  </tbody></table></div></section>`;
PAGES.permintaan.after = () => {
  $("#newreq").onclick = () => requestModal({});
  $$("[data-remind]").forEach(b => b.onclick = () => toast(`Pengingat dikirim ke ${AG[REQS.find(r => r.id === b.dataset.remind).ag].pic} lewat WhatsApp.`));
  $$("[data-accept]").forEach(b => b.onclick = () => {
    const r = REQS.find(x => x.id === b.dataset.accept);
    const fresh = []; for (let i = 0; i < r.n; i++) { const w = mkWorker({sec: null, regu: null, role: "Packer", ag: r.ag, type: "PKWT", start: dt(r.d)}); w.trained = ["Packer umum"]; w.bank.status = r.ag === "BKN" ? "agen" : "pending"; OV[key(w.id, r.d)] = r.sh + "@" + r.sec; fresh.push(w.name); }
    r.status = "Selesai"; r.names = fresh.join(", ");
    toast(`${fresh.join(" dan ")} masuk roster ${dShort(r.d)} shift ${SH[r.sh].n}. Rekening mereka perlu dicek sebelum gajian.`); rerender();
  });
};

/* ======================= Timesheet ======================= */
PAGES.absensi = () => {
  const d = UI.tsDay, sec = UI.tsSec;
  const all = W.filter(w => !sec || secOf(w, code(w, d)) === sec || w.sec === sec).map(w => ts(w, d)).filter(t => t && (!sec || t.sec === sec));
  const f = UI.tsFilter, list = all.filter(t => f === "semua" || (f === "cek" ? t.st === "cek" || t.st === "baru" : t.st === "ok")).sort((a, b) => (a.st === "cek" ? 0 : 1) - (b.st === "cek" ? 0 : 1));
  const n = k => all.filter(t => t.st === k).length;
  const ot = all.reduce((a, t) => a + t.ot, 0), bales = all.reduce((a, t) => a + t.bales, 0);
  const flagTag = t => !t.flag ? "" : `<span class="tag ${t.flag === "Mangkir" ? "bad" : t.flag === "Lembur" || t.flag === "Dikoreksi" ? "info" : "warn"}">${t.flag}${t.flag === "Terlambat" ? " " + t.late + " mnt" : t.flag === "Lembur" ? " " + t.ot + " j" : ""}</span>`;
  const stTag = t => t.st === "ok" ? '<span class="tag ok">Disetujui</span>' : t.st === "rej" ? '<span class="tag bad">Ditolak</span>' : t.st === "cek" ? '<span class="tag warn">Perlu dicek</span>' : '<span class="tag">Baru</span>';
  return `
  <div class="pagehead"><div><h1>Timesheet</h1><div class="sub">Absen dari RFID di mesin dan kamera wajah di gerbang. Hitungan bal dari sensor packing, dikonfirmasi leader line.</div></div>
    <div class="actions"><button class="btn" id="tsexp">Ekspor CSV</button><button class="btn" id="tsok">Setujui yang dipilih</button><button class="btn pri" id="tsclean">Setujui semua yang normal</button></div></div>
  <div class="filters">
    <div class="seg" role="group" aria-label="Hari">${[-7,-6,-5,-4,-3,-2,-1,0].map(x => `<button aria-pressed="${x === d}" data-tday="${x}">${x === 0 ? "Hari ini" : dShort(x)}</button>`).join("")}</div>
    ${selectSec(sec, 'id="tssec"')}
    <div class="seg" role="group" aria-label="Status">${[["cek","Perlu tindakan"],["semua","Semua"],["ok","Disetujui"]].map(([k, l]) => `<button aria-pressed="${k === f}" data-tf="${k}">${l}</button>`).join("")}</div>
  </div>
  <div class="stats">
    <div class="stat"><div class="k">Absen tercatat</div><div class="v">${all.length}</div><div class="s">${dLong(d)}</div></div>
    <div class="stat"><div class="k">Perlu dicek</div><div class="v ${n("cek") ? "warn" : ""}">${n("cek")}</div><div class="s">${n("baru")} baru, normal</div></div>
    <div class="stat"><div class="k">Mangkir</div><div class="v ${all.filter(t => t.flag === "Mangkir").length ? "bad" : ""}">${all.filter(t => t.flag === "Mangkir").length}</div><div class="s">tidak ada absen masuk</div></div>
    <div class="stat"><div class="k">Jam lembur</div><div class="v">${ot}</div><div class="s">perlu SPL dari leader</div></div>
    <div class="stat"><div class="k">Bal dipacking</div><div class="v">${fmt(bales)}</div><div class="s">dasar premi hasil</div></div>
  </div>
  <section class="card"><div class="bd flush tw"><table class="tbl"><thead><tr><th><input type="checkbox" id="tsall" aria-label="Pilih semua"></th><th>Pekerja</th><th>Shift</th><th>Mesin</th><th class="num">Masuk</th><th class="num">Pulang</th><th class="num">Jam kerja</th><th class="num">Bal</th><th>Sumber</th><th>Catatan</th><th>Status</th><th></th></tr></thead><tbody>
  ${list.slice(0, 120).map(t => `<tr><td><input type="checkbox" data-ts="${t.w.id}" aria-label="Pilih ${esc(t.w.name)}"></td><td>${personCell(t.w, t.w.id + " · " + AG[t.w.ag].short)}</td><td><span class="sh ${t.s}" style="display:inline-block">${SH[t.s].n}</span></td><td>${t.mach}</td><td class="num">${hm(t.inM)}</td><td class="num">${hm(t.outM)}</td><td class="num">${t.worked == null ? "—" : dec(t.worked)}</td><td class="num">${t.bales ? fmt(t.bales) : "—"}</td><td class="small muted">${t.inM == null ? "—" : t.src}</td><td>${flagTag(t)}</td><td>${stTag(t)}</td><td class="right nowrap"><button class="btn sm" data-tsedit="${t.w.id}">Ubah</button></td></tr>`).join("") || `<tr><td colspan="12" class="empty">Tidak ada timesheet untuk filter ini.</td></tr>`}
  </tbody></table></div></section>
  ${list.length > 120 ? `<p class="small muted">Menampilkan 120 dari ${list.length}. Pilih seksi untuk mempersempit.</p>` : ""}`;
};
PAGES.absensi.after = () => {
  const d = UI.tsDay;
  $$("[data-tday]").forEach(b => b.onclick = () => { UI.tsDay = +b.dataset.tday; rerender(); });
  $$("[data-tf]").forEach(b => b.onclick = () => { UI.tsFilter = b.dataset.tf; rerender(); });
  $("#tssec").onchange = e => { UI.tsSec = e.target.value; rerender(); };
  $("#tsall").onchange = e => $$("[data-ts]").forEach(c => c.checked = e.target.checked);
  $("#tsok").onclick = () => { const s = $$("[data-ts]:checked"); s.forEach(c => TSAPPR[key(c.dataset.ts, d)] = "ok"); toast(s.length ? `${s.length} timesheet disetujui.` : "Pilih timesheet dulu."); rerender(); };
  $("#tsclean").onclick = () => { let n = 0; for (const w of W) { const t = ts(w, d); if (t && t.st === "baru") { TSAPPR[key(w.id, d)] = "ok"; n++; } } toast(`${n} timesheet tanpa catatan disetujui. Yang terlambat, mangkir dan lembur tetap menunggu.`); rerender(); };
  $$("[data-tsedit]").forEach(b => b.onclick = () => tsEdit(wById(b.dataset.tsedit), d));
  $("#tsexp").onclick = () => {
    const rows = [["ID","Nama","Agen","Seksi","Tanggal","Shift","Masuk","Pulang","Jam kerja","Lembur","Bal","Catatan","Status"]];
    for (const w of W) { const t = ts(w, d); if (t) rows.push([w.id, w.name, AG[w.ag].short, t.sec, dDate(dt(d)), SH[t.s].n, hm(t.inM), hm(t.outM), t.worked == null ? "" : dec(t.worked), t.ot, t.bales, t.flag || "", t.st]); }
    download(`timesheet-${dt(d).toISOString().slice(0, 10)}.csv`, csv(rows));
  };
};
function tsEdit(w, d){
  const t = ts(w, d), sh = SH[t.s];
  const v = m => m == null ? "" : pad(Math.floor(m / 60) % 24) + ":" + pad(m % 60);
  modal("Koreksi timesheet", `
    <div class="person"><span class="av sm">${initials(w.name)}</span><div><b>${esc(w.name)}</b><div class="small muted">${dLong(d)} · ${sh.n} ${sh.t} · ${t.mach}</div></div></div>
    ${t.flag ? `<div class="note ${t.flag === "Mangkir" ? "bad" : "warn"}">${t.flag === "Tidak absen pulang" ? "Tidak ada absen pulang. Sensor packing mencatat bal terakhir di " + t.mach + " pukul " + hm(sh.e * 60 - 3) + "." : t.flag === "Terlambat" ? "Masuk " + t.late + " menit setelah jadwal. Lewat toleransi " + R.lateGrace + " menit, menit terlambat dipotong." : t.flag === "Mangkir" ? "Tidak ada absen masuk dan tidak ada pengajuan izin atau sakit." : t.flag === "Lembur" ? "Pulang " + t.ot + " jam setelah jadwal. Lembur dibayar kalau ada Surat Perintah Lembur dari leader." : t.flag}</div>` : ""}
    <div class="grid g2" style="gap:12px">
      <div class="field"><label for="tin">Masuk</label><input type="time" id="tin" value="${v(t.inM ?? sh.s * 60)}"></div>
      <div class="field"><label for="tout">Pulang</label><input type="time" id="tout" value="${v(t.outM ?? sh.e * 60)}"></div>
      <div class="field"><label for="tot">Lembur disetujui (jam)</label><input type="number" id="tot" min="0" max="${R.otDay}" value="${t.ot}"></div>
      <div class="field"><label for="trs">Alasan koreksi</label><select id="trs"><option>Lupa absen, dikonfirmasi leader</option><option>Lembur dengan SPL</option><option>Mesin rusak, pulang awal dibayar</option><option>Sakit, surat dokter menyusul</option><option>Mangkir, tidak dibayar</option></select></div>
    </div>`,
    `<button class="btn danger" id="trej">Tolak</button><button class="btn" data-close>Batal</button><button class="btn pri" id="tsave">Simpan dan setujui</button>`);
  const toM = (s, base) => { const [h, m] = s.split(":").map(Number); let x = h * 60 + m; if (x < base - 360) x += 1440; return x; };
  $("#tsave").onclick = () => {
    const reason = $("#trs").value;
    if (reason.startsWith("Mangkir")) TSEDIT[key(w.id, d)] = {in:null, out:null, flag:"Mangkir", ot:0};
    else TSEDIT[key(w.id, d)] = {in: toM($("#tin").value, sh.s * 60), out: toM($("#tout").value, sh.s * 60), flag: "Dikoreksi", ot: +$("#tot").value};
    TSAPPR[key(w.id, d)] = "ok"; closeModal(); toast("Timesheet dikoreksi dan disetujui. Alasan dicatat di riwayat perubahan."); rerender();
  };
  $("#trej").onclick = () => { TSAPPR[key(w.id, d)] = "rej"; closeModal(); toast("Timesheet ditolak. Pekerja mendapat notifikasi dan bisa mengajukan keberatan."); rerender(); };
}

/* ======================= Cuti & izin ======================= */
function leaveImpact(l){
  const w = wById(l.w), out = [];
  for (let d = l.from; d <= Math.min(l.to, 6); d++) { const s = shiftOf(code(w, d)); if (!SH[s]) continue; const a = sched(w.sec, d, s) - 1, b = need(w.sec, d, s); out.push([d, s, a, b]); }
  return out;
}
const leaveDays = l => l.to - l.from + 1;
PAGES.cuti = () => {
  const pend = LEAVES.filter(l => l.status === "pending"), done = LEAVES.filter(l => l.status !== "pending").sort((a, b) => b.from - a.from);
  const tab = UI.leaveTab;
  return `
  <div class="pagehead"><div><h1>Cuti & izin</h1><div class="sub">Pengajuan dari aplikasi pekerja. Persetujuan langsung mengubah roster.</div></div></div>
  <div class="tabs" role="tablist"><button role="tab" aria-selected="${tab === "pending"}" data-lt="pending">Menunggu (${pend.length})</button><button role="tab" aria-selected="${tab === "done"}" data-lt="done">Riwayat</button><button role="tab" aria-selected="${tab === "saldo"}" data-lt="saldo">Saldo cuti</button></div>
  ${tab === "pending" ? `<section class="card"><ul class="list">${pend.map(l => { const w = wById(l.w), imp = leaveImpact(l), short = imp.filter(x => x[2] < x[3]); return `<li><span class="av sm">${initials(w.name)}</span><div class="grow"><b><a href="#profil/${w.id}" style="color:inherit">${esc(w.name)}</a></b> · ${l.type} · ${l.from === l.to ? dShort(l.from) : dShort(l.from) + " – " + (l.to > 30 ? dDate(dt(l.to)) : dShort(l.to))} <span class="muted">(${leaveDays(l)} hari)</span>
      <div class="meta">${w.sec ? secById(w.sec).n + " · Regu " + w.regu : "Harian lepas"} · ${AG[w.ag].short} · ${l.note}${l.type === "Cuti tahunan" ? " · sisa cuti " + w.leaveBal + " hari" : ""}</div>
      <div class="meta" style="margin-top:4px">${imp.length ? short.length ? short.map(x => `<span class="tag bad">${dShort(x[0])} ${SH[x[1]].n}: jadi ${x[2]}/${x[3]}</span>`).join(" ") : `<span class="tag ok">Roster tetap cukup</span>` : '<span class="tag">Tidak ada shift di minggu ini</span>'}</div></div>
      <div class="nowrap"><button class="btn sm danger" data-lno="${l.id}">Tolak</button> <button class="btn sm pri" data-lok="${l.id}">Setujui</button></div></li>`; }).join("") || '<li class="empty">Tidak ada pengajuan yang menunggu.</li>'}</ul></section>` : ""}
  ${tab === "done" ? `<section class="card"><div class="bd flush tw"><table class="tbl"><thead><tr><th>Pekerja</th><th>Jenis</th><th>Tanggal</th><th class="num">Hari</th><th>Catatan</th><th>Status</th></tr></thead><tbody>${done.map(l => { const w = wById(l.w); return `<tr><td>${personCell(w)}</td><td>${l.type}</td><td>${l.from === l.to ? dShort(l.from) : dShort(l.from) + " – " + dShort(l.to)}</td><td class="num">${leaveDays(l)}</td><td>${l.note || "—"}</td><td>${l.status === "ok" ? '<span class="tag ok">Disetujui</span>' : '<span class="tag bad">Ditolak</span>'}</td></tr>`; }).join("")}</tbody></table></div></section>` : ""}
  ${tab === "saldo" ? `<div class="note" style="margin-bottom:12px">Cuti tahunan 12 hari setelah 12 bulan kerja (Pasal 79 UU 13/2003 jo. UU 6/2023). Pekerja PKWT di bawah 12 bulan mendapat cuti proporsional sesuai kebijakan agen.</div><section class="card"><div class="bd flush tw"><table class="tbl"><thead><tr><th>Pekerja</th><th>Agen</th><th>Mulai kerja</th><th class="num">Hak</th><th class="num">Terpakai</th><th class="num">Sisa</th></tr></thead><tbody>${W.filter(w => w.ag !== "PHL").slice(0, 40).map(w => `<tr><td>${personCell(w)}</td><td>${AG[w.ag].short}</td><td>${dDate(w.start)}</td><td class="num">12</td><td class="num">${12 - w.leaveBal}</td><td class="num">${w.leaveBal}</td></tr>`).join("")}</tbody></table></div></section><p class="small muted">Menampilkan 40 pekerja pertama.</p>` : ""}`;
};
PAGES.cuti.after = () => {
  $$("[data-lt]").forEach(b => b.onclick = () => { UI.leaveTab = b.dataset.lt; rerender(); });
  $$("[data-lok]").forEach(b => b.onclick = () => {
    const l = LEAVES.find(x => x.id === b.dataset.lok), w = wById(l.w);
    l.status = "ok"; if (l.type === "Cuti tahunan") w.leaveBal -= leaveDays(l);
    let gaps = 0; for (let d = l.from; d <= Math.min(l.to, 6); d++) { const s = shiftOf(code(w, d)); if (SH[s]) { OV[key(w.id, d)] = l.type === "Sakit" ? "SK" : l.type === "Izin" ? "I" : "C"; if (sched(w.sec, d, s) < need(w.sec, d, s)) gaps++; } }
    toast(`Disetujui. ${w.name.split(" ")[0]} mendapat notifikasi.${gaps ? ` ${gaps} shift jadi kosong, isi di roster.` : ""}`); rerender();
  });
  $$("[data-lno]").forEach(b => b.onclick = () => { const l = LEAVES.find(x => x.id === b.dataset.lno); l.status = "no"; toast("Ditolak. Pekerja mendapat notifikasi dengan alasannya."); rerender(); });
};

/* ======================= Pekerja ======================= */
function staffRows(){
  const q = UI.staffQ.toLowerCase();
  return W.filter(w => (!q || w.name.toLowerCase().includes(q) || w.id.toLowerCase().includes(q)) && (!UI.staffSec || w.sec === UI.staffSec) && (!UI.staffAg || w.ag === UI.staffAg) && (!UI.staffBank || w.bank.status === UI.staffBank));
}
function staffTable(){
  const list = staffRows(), show = list.slice(0, UI.staffAll ? 999 : 60);
  return `<div class="bd flush tw"><table class="tbl"><thead><tr><th>Pekerja</th><th>Seksi</th><th>Agen</th><th>Jenis</th><th>Kontrak sampai</th><th>Rekening</th><th>No. HP</th></tr></thead><tbody>
  ${show.map(w => { const left = daysBetween(TODAY, w.end); return `<tr class="click" data-prof="${w.id}"><td>${personCell(w)}</td><td>${w.sec ? w.sec + " · Regu " + w.regu : "Cadangan"}</td><td>${AG[w.ag].short}</td><td>${w.type}</td><td>${w.ag === "PHL" ? "—" : dDate(w.end)}${w.ag !== "PHL" && left <= 30 ? ` <span class="tag ${left <= 14 ? "bad" : "warn"}">${left} hari</span>` : ""}</td><td>${w.bank.status === "agen" ? "" : w.bank.bank + " " + maskNo(w.bank.no) + " "}${bankTag(w.bank.status)}</td><td class="num">${w.phone}</td></tr>`; }).join("") || `<tr><td colspan="7" class="empty">Tidak ada pekerja yang cocok.</td></tr>`}
  </tbody></table></div>${list.length > show.length ? `<div class="bd" style="border-top:1px solid var(--line2)"><button class="btn ghost" id="showall">Tampilkan semua ${list.length} pekerja</button></div>` : ""}`;
}
PAGES.pekerja = () => `
  <div class="pagehead"><div><h1>Pekerja</h1><div class="sub">${W.length} pekerja alih daya dan harian lepas · ${W.filter(w => w.ag !== "PHL").length} PKWT lewat agen</div></div>
    <div class="actions"><button class="btn" id="stexp">Ekspor CSV</button><button class="btn pri" id="stadd">Tambah pekerja</button></div></div>
  <div class="filters">
    <label class="sr" for="stq">Cari</label><input type="search" id="stq" placeholder="Cari nama atau ID" value="${esc(UI.staffQ)}" style="min-width:220px">
    ${selectSec(UI.staffSec, 'id="stsec"')}${selectAg(UI.staffAg, 'id="stag"')}
    <select id="stbank"><option value="">Semua status rekening</option>${[["ok","Terverifikasi"],["pending","Menunggu cek"],["mismatch","Nama tidak cocok"],["agen","Dikelola agen"],["none","Belum ada"]].map(([k, l]) => `<option value="${k}" ${k === UI.staffBank ? "selected" : ""}>${l}</option>`).join("")}</select>
  </div>
  <section class="card" id="sttbl">${staffTable()}</section>`;
PAGES.pekerja.after = () => {
  const bind = () => { $$("[data-prof]").forEach(r => r.onclick = e => { if (e.target.closest("a")) return; location.hash = "profil/" + r.dataset.prof; }); const s = $("#showall"); if (s) s.onclick = () => { UI.staffAll = true; $("#sttbl").innerHTML = staffTable(); bind(); }; };
  bind();
  $("#stq").oninput = e => { UI.staffQ = e.target.value; $("#sttbl").innerHTML = staffTable(); bind(); };
  $("#stsec").onchange = e => { UI.staffSec = e.target.value; rerender(); };
  $("#stag").onchange = e => { UI.staffAg = e.target.value; rerender(); };
  $("#stbank").onchange = e => { UI.staffBank = e.target.value; rerender(); };
  $("#stexp").onclick = () => download("pekerja.csv", csv([["ID","Nama","Jabatan","Seksi","Regu","Agen","Jenis","Mulai","Kontrak sampai","Bank","Status rekening","HP"], ...staffRows().map(w => [w.id, w.name, w.role, w.sec || "", w.regu || "", AG[w.ag].n, w.type, dDate(w.start), w.ag === "PHL" ? "" : dDate(w.end), w.bank.bank, w.bank.status, w.phone])]));
  $("#stadd").onclick = () => modal("Tambah pekerja", `<div class="note">Pekerja baru mendaftar sendiri lewat tautan pendaftaran: data pribadi, KTP dan swafoto, ijazah, rekening bank, BPJS, lalu tanda tangan kontrak. HR hanya menyetujui.</div>
    <div class="grid g2" style="gap:12px"><div class="field"><label for="na">Nama sesuai KTP</label><input type="text" id="na"></div><div class="field"><label for="nh">No. HP (WhatsApp)</label><input type="text" id="nh" placeholder="08xx"></div>
    <div class="field"><label for="ng">Agen</label>${selectAg("STM", 'id="ng"').replace('<option value="">Semua agen</option>', "")}</div><div class="field"><label for="ns">Seksi</label>${selectSec("S3", 'id="ns"', "Cadangan")}</div></div>`,
    `<button class="btn" data-close>Batal</button><button class="btn pri" id="nsend">Kirim tautan pendaftaran</button>`) || ($("#nsend").onclick = () => { closeModal(); toast("Tautan pendaftaran dikirim lewat WhatsApp. Pekerja muncul di daftar setelah KTP dan rekening terverifikasi."); });
};

/* ======================= Profil ======================= */
function payHistory(w){
  const out = [];
  if (w.ag === "BKN") return out;
  for (const b of BATCH) {
    if (!b.who || !b.who.includes(w.id)) continue;
    const fail = (b.fails || []).find(f => f.w === w.id);
    const amt = w.ag === "PHL" ? (4 + Math.round(hash(w.id + b.wk) * 2)) * (R.phlDaily + R.meal) : payLine(w).net * (0.96 + hash(w.id + b.wk) * 0.08);
    out.push({b, amt, fail});
  }
  return out;
}
PAGES.profil = id => {
  if (id !== UI.lastProf) { UI.profTab = UI.profNext || "ring"; UI.lastProf = id; } UI.profNext = null;
  const w = wById(id); if (!w) return `<div class="empty">Pekerja tidak ditemukan. <a href="#pekerja">Kembali ke daftar</a></div>`;
  const tab = UI.profTab, s = w.sec && secById(w.sec), left = daysBetween(TODAY, w.end);
  const req = BREQ.find(b => b.w === w.id && !["Disetujui","Ditolak"].includes(b.status));
  const tabs = [["ring","Ringkasan"],["jadwal","Jadwal & absensi"],["bank","Rekening bank"],["bayar","Riwayat pembayaran"],["kontrak","Kontrak & dokumen"],["kual","Kualifikasi"]];
  let body = "";
  if (tab === "ring") body = `<div class="grid g2"><section class="card"><div class="hd"><h2>Data pekerja</h2></div><div class="bd"><dl class="kv">
    <dt>ID pekerja</dt><dd>${w.id}</dd><dt>NIK</dt><dd class="num">${w.nik}</dd><dt>No. HP</dt><dd class="num">${w.phone}</dd>
    <dt>Jabatan</dt><dd>${w.role}</dd><dt>Seksi</dt><dd>${s ? s.n + " · Regu " + w.regu : "Cadangan harian lepas"}</dd><dt>Leader</dt><dd>${s ? s.leader : "HR pabrik"}</dd>
    <dt>Agen</dt><dd>${AG[w.ag].n}</dd><dt>Mulai kerja</dt><dd>${dDate(w.start)}</dd>
    <dt>BPJS Ketenagakerjaan</dt><dd class="num">${w.bpjsTk}</dd><dt>BPJS Kesehatan</dt><dd class="num">${w.bpjsKes}</dd><dt>NPWP</dt><dd>${w.npwp}</dd><dt>Saldo cuti</dt><dd>${w.ag === "PHL" ? "—" : w.leaveBal + " hari"}</dd>
    </dl></div></section>
    <section class="card"><div class="hd"><h2>Minggu ini</h2><a class="more btn ghost sm" href="#jadwal">Buka roster</a></div><div class="bd flush tw"><table class="tbl"><tbody>${WEEK.map(d => { const c = code(w, d), x = shiftOf(c); return `<tr><td>${dShort(d)}</td><td>${SH[x] ? `<span class="sh ${x}" style="display:inline-block">${SH[x].n} ${SH[x].t}</span>${secOf(w, c) !== w.sec ? " di " + secOf(w, c) : ""}` : `<span class="muted">${LEAVE[x]}</span>`}</td></tr>`; }).join("")}</tbody></table></div></section></div>`;
  if (tab === "jadwal") body = `<section class="card"><div class="hd"><h2>Absensi 7 hari terakhir</h2></div><div class="bd flush tw"><table class="tbl"><thead><tr><th>Tanggal</th><th>Shift</th><th class="num">Masuk</th><th class="num">Pulang</th><th class="num">Jam</th><th class="num">Bal</th><th>Catatan</th></tr></thead><tbody>
    ${[-7,-6,-5,-4,-3,-2,-1].map(d => { const t = ts(w, d); const c = shiftOf(code(w, d)); return t ? `<tr><td>${dShort(d)}</td><td>${SH[t.s].n}</td><td class="num">${hm(t.inM)}</td><td class="num">${hm(t.outM)}</td><td class="num">${t.worked == null ? "—" : dec(t.worked)}</td><td class="num">${t.bales ? fmt(t.bales) : "—"}</td><td>${t.flag ? `<span class="tag ${t.flag === "Mangkir" ? "bad" : "warn"}">${t.flag}</span>` : ""}</td></tr>` : `<tr><td>${dShort(d)}</td><td class="muted" colspan="6">${LEAVE[c] || "Libur"}</td></tr>`; }).join("")}
    </tbody></table></div></section>`;
  if (tab === "bank") body = w.bank.status === "agen" ? `<div class="note">Gaji pekerja ini dibayar oleh ${AG[w.ag].n}. Rekening dikelola agen, pabrik hanya menerima bukti transfer setiap periode.</div>` : `
    <div class="grid g2"><div>
      ${w.bank.status === "none" ? `<div class="note bad">Belum ada rekening. Gaji ditahan sampai rekening ditambahkan dan dicek.</div>` : `<div class="bankcard"><div class="small muted">Rekening gaji</div><div style="font-weight:650">${w.bank.bank}</div><div class="acct">${w.bank.no.replace(/(\d{4})(?=\d)/g, "$1 ")}</div><div>a.n. ${esc(w.bank.holder)}</div><div style="margin-top:6px">${bankTag(w.bank.status)}</div>
      <div class="small muted" style="margin-top:4px">${w.bank.status === "ok" ? "Dicek " + dDate(w.bank.checked) + " · " + w.bank.via : w.bank.status === "mismatch" ? "Nama pemilik rekening berbeda dengan KTP (" + esc(w.name) + "). Gaji ditahan." : "Belum dicek ke bank. Gaji ditahan sampai terverifikasi."}</div></div>`}
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="bchg">${w.bank.status === "none" ? "Tambah rekening" : "Ubah rekening"}</button>${["pending","mismatch"].includes(w.bank.status) ? `<button class="btn" id="bverify">Cek nama rekening</button>` : ""}</div>
      ${req ? `<div class="note warn" style="margin-top:12px">Ada permintaan ${req.kind.toLowerCase()} ke ${req.to.bank} ${maskNo(req.to.no)} yang menunggu persetujuan. <a href="#rekening">Tinjau</a></div>` : ""}
    </div>
    <section class="card"><div class="hd"><h2>Aturan rekening</h2></div><div class="bd small"><ul style="margin:0;padding-left:18px;display:grid;gap:6px">
      <li>Nama pemilik harus sama dengan KTP. Rekening orang lain tidak diterima.</li>
      <li>Setiap perubahan dicek ke bank, lalu disetujui HR dan Finance (dua orang).</li>
      <li>Perubahan setelah tanggal 22 berlaku untuk gajian bulan berikutnya, kecuali disetujui Finance.</li>
      <li>Pekerja mendapat SMS dan WhatsApp setiap kali rekening berubah.</li></ul></div></section></div>
    <section class="card" style="margin-top:16px"><div class="hd"><h2>Riwayat perubahan</h2></div><ul class="list">${AUDIT.filter(a => a.what.includes(w.name)).map(a => `<li><div class="grow">${a.what}<div class="meta">${a.t} · ${a.who}</div></div></li>`).join("") || `<li class="muted">Belum ada perubahan sejak rekening pertama ditambahkan ${w.bank.checked ? dDate(w.bank.checked) : ""}.</li>`}</ul></section>`;
  if (tab === "bayar") { const h = payHistory(w), cur = w.ag !== "BKN" && w.ag !== "PHL" ? payLine(w) : null;
    body = w.ag === "BKN" ? `<div class="note">Gaji dibayar oleh ${AG[w.ag].n}. Bukti transfer dari agen ada di Tagihan agen.</div>` : `<section class="card"><div class="bd flush tw"><table class="tbl"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Periode</th><th>Ke rekening</th><th class="num">Jumlah</th><th>Status</th><th></th></tr></thead><tbody>
    ${cur ? `<tr><td>25 Nov 2026</td><td>Gaji bulanan</td><td>${PERIOD.n}</td><td>${w.bank.bank} ${maskNo(w.bank.no)}</td><td class="num">${rp(cur.net)}</td><td>${holdReason(w) ? `<span class="tag bad">Ditahan</span>` : `<span class="tag info">Dijadwalkan</span>`}</td><td class="right"><button class="btn sm" data-slip="cur">Slip</button></td></tr>` : ""}
    ${h.map((x, i) => `<tr><td>${x.b.date}</td><td>${x.b.kind}</td><td>${x.b.period}</td><td>${w.bank.bank} ${maskNo(w.bank.no)}</td><td class="num">${rp(x.amt)}</td><td>${x.fail ? `<span class="tag bad">Gagal</span><span class="sub">${x.fail.why}</span>` : '<span class="tag ok">Berhasil</span>'}</td><td class="right"><button class="btn sm" data-slip="${i}">Slip</button></td></tr>`).join("")}
    ${!cur && !h.length ? `<tr><td colspan="7" class="empty">Belum ada pembayaran.</td></tr>` : ""}
    </tbody></table></div></section>`; }
  if (tab === "kontrak") body = `<div class="grid g2"><section class="card"><div class="hd"><h2>Kontrak</h2></div><div class="bd"><dl class="kv">
    <dt>Jenis</dt><dd>${w.type === "PKWT" ? "PKWT (perjanjian kerja waktu tertentu) dengan " + AG[w.ag].n : "Perjanjian kerja harian lepas langsung dengan pabrik"}</dd>
    <dt>Periode</dt><dd>${dDate(w.start)} – ${w.ag === "PHL" ? "per hari, maks. 21 hari per bulan" : dDate(w.end)}</dd>
    ${w.ag !== "PHL" ? `<dt>Sisa</dt><dd>${left} hari ${left <= 30 ? '<span class="tag warn">segera berakhir</span>' : ""}</dd><dt>Kompensasi PKWT</dt><dd>${rp(R.umk * Math.max(1, daysBetween(w.start, w.end) / 30.4) / 12)} saat kontrak berakhir</dd>` : ""}
    <dt>Ditempatkan di</dt><dd>${s ? s.n : "Cadangan, semua seksi"}</dd></dl></div></section>
    <section class="card"><div class="hd"><h2>Dokumen</h2></div><ul class="list">${[["KTP (cek Dukcapil)", "ok"], ["Swafoto vs KTP", "ok"], ["Ijazah terakhir", w.f ? "ok" : "ok"], ["Kontrak ditandatangani", w.ag === "PHL" && w === RINA ? "warn" : "ok"], ["Surat keterangan sehat", hash(w.id + "sk") < .1 ? "warn" : "ok"], ["Induksi K3", "ok"]].map(([n, st]) => `<li><div class="grow">${n}</div>${st === "ok" ? '<span class="tag ok">Lengkap</span>' : '<span class="tag warn">Belum ada</span>'}</li>`).join("")}</ul></section></div>`;
  if (tab === "kual") body = `<section class="card"><div class="bd flush tw"><table class="tbl"><thead><tr><th>Kualifikasi</th><th>Dinilai oleh</th><th>Tanggal</th><th>Berlaku sampai</th></tr></thead><tbody>
    ${w.trained.map((m, i) => `<tr><td>${m.includes("-") ? "Packer " + m : m}${w.role === "Operator forklift" ? " (SIO Kemnaker)" : ""}</td><td>${s ? s.leader : "HR"}</td><td>${dDate(new Date(w.start.getTime() + (i + 1) * 20 * 864e5))}</td><td>${w.role === "Operator forklift" ? "12 Mar 2028" : "—"}</td></tr>`).join("")}
    <tr><td>Induksi K3 pabrik</td><td>Petugas K3</td><td>${dDate(w.start)}</td><td>${dDate(new Date(w.start.getTime() + 365 * 864e5))}</td></tr></tbody></table></div></section>
    <p class="small muted">Kualifikasi mesin dipakai roster saat memilih pengganti: pekerja hanya disarankan ke mesin yang sudah dikuasai.</p>`;
  return `<p style="margin:0 0 10px"><a href="#pekerja">← Daftar pekerja</a></p>
  <div class="profilehead"><span class="av lg" aria-hidden="true">${initials(w.name)}</span><div><h1>${esc(w.name)}</h1><div class="muted">${w.id} · ${w.role} · ${AG[w.ag].n}</div><div style="margin-top:5px;display:flex;gap:6px;flex-wrap:wrap">${w.type === "PKWT" ? `<span class="tag">PKWT s/d ${dDate(w.end)}</span>` : '<span class="tag">Harian lepas</span>'}${w.bank.status !== "agen" ? bankTag(w.bank.status) : ""}${req ? '<span class="tag warn">Perubahan rekening menunggu</span>' : ""}</div></div>
    <div style="margin-left:auto;display:flex;gap:8px"><button class="btn" id="pmsg">Kirim pesan</button><a class="btn" href="#jadwal">Lihat di roster</a></div></div>
  <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${k === tab}" data-pt="${k}">${l}</button>`).join("")}</div>${body}`;
};
PAGES.profil.after = id => {
  const w = wById(id); if (!w) return;
  if (w.sec) UI.rosterSec = w.sec;
  $$("[data-pt]").forEach(b => b.onclick = () => { UI.profTab = b.dataset.pt; rerender(); });
  $("#pmsg").onclick = () => { modal("Pesan ke " + esc(w.name), `<div class="field"><label for="pm">Pesan (dikirim ke aplikasi dan WhatsApp ${w.phone})</label><textarea id="pm" rows="4"></textarea></div>`, `<button class="btn" data-close>Batal</button><button class="btn pri" id="pms">Kirim</button>`); $("#pms").onclick = () => { closeModal(); toast("Pesan terkirim."); }; };
  const bc = $("#bchg"); if (bc) bc.onclick = () => bankForm(w);
  const bv = $("#bverify"); if (bv) bv.onclick = () => { modal("Cek nama rekening", `<p style="margin:0">Hasil cek ke ${w.bank.bank} untuk ${maskNo(w.bank.no)}:</p><div class="note ${w.bank.status === "mismatch" ? "bad" : ""}">Nama di bank: <b>${esc(w.bank.status === "mismatch" ? w.bank.holder.toUpperCase() : w.name.toUpperCase())}</b><br>Nama di KTP: <b>${esc(w.name.toUpperCase())}</b></div>${w.bank.status === "mismatch" ? "<p style='margin:0'>Nama tidak cocok. Minta pekerja mengganti dengan rekening atas namanya sendiri.</p>" : ""}`, w.bank.status === "mismatch" ? `<button class="btn" data-close>Tutup</button><button class="btn pri" id="vreq">Minta pekerja ganti rekening</button>` : `<button class="btn" data-close>Batal</button><button class="btn pri" id="vok">Tandai terverifikasi</button>`);
    const ok = $("#vok"); if (ok) ok.onclick = () => { w.bank.status = "ok"; w.bank.checked = TODAY; w.bank.via = "Cek rekening API bank"; AUDIT.unshift({t:"23 Nov 2026 " + new Date().toTimeString().slice(0, 5).replace(":", "."), who:"Ibu Maya (HR)", what:"Memverifikasi rekening " + w.bank.bank + " " + w.name}); closeModal(); toast("Rekening terverifikasi. Gaji tidak lagi ditahan."); rerender(); };
    const rq = $("#vreq"); if (rq) rq.onclick = () => { closeModal(); toast("Permintaan dikirim ke aplikasi pekerja. Gaji tetap ditahan sampai rekening baru disetujui."); }; };
  $$("[data-slip]").forEach(b => b.onclick = () => payslip(w, b.dataset.slip === "cur" ? null : payHistory(w)[+b.dataset.slip]));
};
function bankForm(w){
  modal((w.bank.status === "none" ? "Tambah" : "Ubah") + " rekening · " + esc(w.name), `
    <div class="grid g2" style="gap:12px">
      <div class="field"><label for="bk">Bank</label><select id="bk">${["BCA","BRI","Mandiri","BNI","BSI","BJB","BTN","CIMB Niaga","Bank Jago","SeaBank"].map(b => `<option>${b}</option>`).join("")}</select></div>
      <div class="field"><label for="bn">Nomor rekening</label><input type="text" id="bn" inputmode="numeric" autocomplete="off"></div>
      <div class="field" style="grid-column:1/-1"><label for="bh">Nama pemilik rekening</label><input type="text" id="bh" value="${esc(w.name)}"></div>
    </div>
    <div id="berr"></div>
    <div class="note">Setelah disimpan, rekening dicek ke bank dan perlu disetujui HR dan Finance. Pekerja mendapat notifikasi. Sampai disetujui, gaji tetap ke rekening lama.</div>`,
    `<button class="btn" data-close>Batal</button><button class="btn pri" id="bsave">Ajukan perubahan</button>`);
  $("#bsave").onclick = () => {
    const no = $("#bn").value.replace(/\D/g, ""), holder = $("#bh").value.trim();
    if (no.length < 10 || no.length > 16) { $("#berr").innerHTML = '<div class="note bad">Nomor rekening harus 10 sampai 16 angka.</div>'; return; }
    const r = {id:"BR-0" + (72 + BREQ.length - 3), w:w.id, kind: w.bank.status === "none" ? "Rekening baru" : "Ganti rekening", from: w.bank.no ? {bank:w.bank.bank, no:w.bank.no} : null, to:{bank:$("#bk").value, no, holder}, when:"Senin 23 Nov, " + new Date().toTimeString().slice(0, 5).replace(":", "."), via:"Diinput HR (Ibu Maya)", reason:"Diinput dari profil pekerja", inquiry:null, approvals:[], status:"Menunggu", flags: holder.toLowerCase() !== w.name.toLowerCase() ? ["Nama pemilik berbeda dengan KTP pekerja"] : []};
    BREQ.unshift(r); AUDIT.unshift({t:"23 Nov 2026", who:"Ibu Maya (HR)", what:`Mengajukan ${r.kind.toLowerCase()} ${r.to.bank} untuk ${w.name} (${r.id})`});
    closeModal(); toast(`${r.id} dibuat. Cek nama dan persetujuan ada di Gaji › Rekening bank.`); rerender();
  };
}
function payslip(w, hist){
  const p = payLine(w), f = hist ? (hist.amt / p.net) : 1, per = hist ? hist.b.period : PERIOD.n;
  const lines = w.ag === "PHL" ? [["Upah harian (" + p.days + " hari × " + rp(R.phlDaily) + ")", p.base * f], ["Uang makan", p.meal * f]] :
    [["Upah pokok (" + p.days + " dari 26 hari)", p.base * f], ["Lembur (" + p.otH + " jam)", p.ot * f], ["Tunjangan shift malam (" + p.nights + "×)", p.night * f], ["Uang makan (" + p.days + " hari)", p.meal * f], ["Premi hasil (" + fmt(p.bales) + " bal)", p.premi * f]].filter((x, i) => i === 0 || x[1]);
  const ded = [["BPJS TK: JHT 2%", p.jht], ["BPJS TK: JP 1%", p.jp], ["BPJS Kesehatan 1%", p.kes], ["PPh 21 (TER)", p.pph], ["Kasbon", p.kasbon]].filter(x => x[1]);
  const gross = lines.reduce((a, x) => a + x[1], 0), dsum = ded.reduce((a, x) => a + x[1], 0);
  modal("Slip gaji", `<div class="payslip"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><b>${esc(w.name)}</b><div class="muted">${w.id} · ${w.role} · ${AG[w.ag].n}</div></div><div class="right"><b>${per}</b><div class="muted">${w.bank.bank} ${maskNo(w.bank.no)}</div></div></div>
    <h3 style="margin:14px 0 4px">Pendapatan</h3><table>${lines.map(x => `<tr><td>${x[0]}</td><td>${rp(x[1])}</td></tr>`).join("")}<tr class="t"><td>Bruto</td><td>${rp(gross)}</td></tr></table>
    ${ded.length ? `<h3 style="margin:14px 0 4px">Potongan</h3><table>${ded.map(x => `<tr><td>${x[0]}</td><td>${rp(x[1])}</td></tr>`).join("")}<tr class="t"><td>Total potongan</td><td>${rp(dsum)}</td></tr></table>` : ""}
    <table style="margin-top:12px"><tr class="t"><td style="font-size:15px">Diterima (neto)</td><td style="font-size:15px">${rp(gross - dsum)}</td></tr></table>
    ${w.ag !== "PHL" ? `<p class="muted small" style="margin:10px 0 0">Iuran pemberi kerja (tidak dipotong dari gaji): BPJS TK dan Kesehatan ${rp(p.er)}.</p>` : ""}</div>`,
    `<button class="btn" id="slipdl">Unduh CSV</button><button class="btn pri" data-close>Tutup</button>`);
  $("#slipdl").onclick = () => download(`slip-${w.id}.csv`, csv([["Komponen","Jumlah"], ...lines.map(x => [x[0], Math.round(x[1])]), ...ded.map(x => [x[0], -Math.round(x[1])]), ["Neto", Math.round(gross - dsum)]]));
}

/* ======================= Kontrak ======================= */
PAGES.kontrak = () => {
  const tab = UI.ctTab, list = W.filter(w => w.ag !== "PHL" && daysBetween(TODAY, w.end) <= 60).sort((a, b) => a.end - b.end);
  return `<div class="pagehead"><div><h1>Kontrak</h1><div class="sub">PKWT maksimal 5 tahun termasuk perpanjangan (PP 35/2021). Saat PKWT berakhir, kompensasi 1 bulan upah per 12 bulan kerja.</div></div></div>
  <div class="tabs" role="tablist"><button role="tab" aria-selected="${tab === "pkwt"}" data-ct="pkwt">PKWT berakhir dalam 60 hari (${list.length})</button><button role="tab" aria-selected="${tab === "agen"}" data-ct="agen">Perjanjian alih daya</button></div>
  ${tab === "pkwt" ? `<section class="card"><div class="bd flush tw"><table class="tbl"><thead><tr><th>Pekerja</th><th>Agen</th><th>Seksi</th><th>Mulai</th><th>Berakhir</th><th class="num">Sisa</th><th class="num">Kompensasi PKWT</th><th>Keputusan</th></tr></thead><tbody>
    ${list.map(w => { const left = daysBetween(TODAY, w.end); return `<tr><td>${personCell(w)}</td><td>${AG[w.ag].short}</td><td>${w.sec}</td><td>${dDate(w.start)}</td><td>${dDate(w.end)}</td><td class="num"><span class="tag ${left <= 14 ? "bad" : "warn"}">${left} hari</span></td><td class="num">${rp(R.umk * Math.max(1, daysBetween(w.start, w.end) / 30.4) / 12)}</td><td class="nowrap">${w.decision ? `<span class="tag info">${w.decision}</span>` : `<button class="btn sm" data-ext="${w.id}">Perpanjang 12 bln</button> <button class="btn sm danger" data-end="${w.id}">Tidak diperpanjang</button>`}</td></tr>`; }).join("")}
    </tbody></table></div></section>` : `<section class="card"><div class="bd flush tw"><table class="tbl"><thead><tr><th>Agen</th><th>No. perjanjian</th><th>Lingkup</th><th>Berlaku sampai</th><th class="num">Fee</th><th>Status</th></tr></thead><tbody>
    ${["MKS","STM","BKN"].map((a, i) => { const x = AG[a], left = daysBetween(TODAY, x.contractEnd); return `<tr><td>${x.n}</td><td class="num">PKS/${a}/HR/2025/0${i + 4}</td><td>${SEC.filter(s => s.ag === a).map(s => s.id).join(", ")} · packer, helper${a !== "BKN" ? ", forklift" : ""}</td><td>${dDate(x.contractEnd)}</td><td class="num">${dec(x.fee * 100)}%</td><td>${left <= 60 ? `<span class="tag warn">Berakhir ${left} hari lagi</span>` : '<span class="tag ok">Aktif</span>'}</td></tr>`; }).join("")}
    </tbody></table></div></section>`}`;
};
PAGES.kontrak.after = () => {
  $$("[data-ct]").forEach(b => b.onclick = () => { UI.ctTab = b.dataset.ct; rerender(); });
  $$("[data-ext]").forEach(b => b.onclick = () => { const w = wById(b.dataset.ext); w.decision = "Diperpanjang, menunggu tanda tangan"; toast(`Kontrak perpanjangan dikirim ke ${w.name.split(" ")[0]} untuk ditandatangani di aplikasi. Agen mendapat salinan.`); rerender(); });
  $$("[data-end]").forEach(b => b.onclick = () => { const w = wById(b.dataset.end); w.decision = "Berakhir " + dDate(w.end); toast(`${w.name.split(" ")[0]} tidak diperpanjang. Kompensasi PKWT masuk penggajian terakhir, dan roster setelah ${dDate(w.end)} dikosongkan.`); rerender(); });
};

/* ======================= Penggajian ======================= */
PAGES.penggajian = () => {
  const ag = UI.payAg, rows = payroll(ag);
  const all = payroll(), held = all.filter(p => holdReason(p.w));
  const T = k => rows.reduce((a, p) => a + p[k], 0);
  const st = RUN.status;
  const steps = [["Hitung","Dari timesheet disetujui", "done"], ["Cek","Peringatan dan pengecualian", st === "cek" ? "cur" : "done"], ["Setuju HR","Ibu Maya", st === "setuju1" ? "cur" : ["setuju","dibayar"].includes(st) ? "done" : ""], ["Setuju Finance","Pak Hendro", st === "setuju" ? "done" : st === "dibayar" ? "done" : ""], ["Bayar", PERIOD.pay, st === "dibayar" ? "done" : st === "setuju" ? "cur" : ""]];
  return `<div class="pagehead"><div><h1>Penggajian</h1><div class="sub">Periode ${PERIOD.n} · tutup buku ${PERIOD.cutoff} · dibayar ${PERIOD.pay}</div></div>
    <div class="actions">
      <button class="btn" id="slips">Kirim slip ke aplikasi</button>
      <button class="btn" id="exp">Ekspor</button>
      ${st === "cek" ? `<button class="btn pri" id="ap1">Setujui (HR)</button>` : st === "setuju1" ? `<button class="btn pri" id="ap2">Setujui sebagai Finance (simulasi)</button>` : st === "setuju" ? `<button class="btn pri" id="pay">Buat file transfer</button>` : `<span class="tag ok">Dibayar</span>`}
    </div></div>
  <ol class="steps" style="margin-bottom:16px">${steps.map(s => `<li class="${s[2]}"><b>${s[2] === "done" ? "✓ " : ""}${s[0]}</b>${s[1]}</li>`).join("")}</ol>
  <div class="stats">
    <div class="stat"><div class="k">Pekerja dibayar pabrik</div><div class="v">${all.length}</div><div class="s">${W.filter(w => w.ag === "BKN").length} pekerja ${AG.BKN.short} dibayar agen</div></div>
    <div class="stat"><div class="k">Bruto</div><div class="v">${rpS(all.reduce((a, p) => a + p.gross, 0))}</div><div class="s">upah, lembur, tunjangan, premi</div></div>
    <div class="stat"><div class="k">Neto ditransfer</div><div class="v">${rpS(all.reduce((a, p) => a + p.net, 0) - held.reduce((a, p) => a + p.net, 0))}</div><div class="s">${all.length - held.length} rekening</div></div>
    <div class="stat"><div class="k">Ditahan</div><div class="v ${held.length ? "bad" : ""}">${held.length}</div><div class="s">${rpS(held.reduce((a, p) => a + p.net, 0))} · masalah rekening</div></div>
    <div class="stat"><div class="k">Iuran pemberi kerja</div><div class="v">${rpS(all.reduce((a, p) => a + p.er, 0))}</div><div class="s">BPJS TK dan Kesehatan</div></div>
  </div>
  <section class="card" style="margin-bottom:16px"><div class="hd"><h2>Peringatan sebelum disetujui</h2></div><ul class="list">
    ${held.map(p => `<li><span class="dot bad" style="margin-top:6px"></span><div class="grow"><b>${esc(p.w.name)}</b> · ${holdReason(p.w)}<div class="meta">${rp(p.net)} ditahan, ditransfer setelah rekening disetujui</div></div><a class="btn sm" href="#profil/${p.w.id}" data-bank>Buka rekening</a></li>`).join("")}
    ${TS_OPEN.map(w => `<li><span class="dot warn" style="margin-top:6px"></span><div class="grow"><b>${esc(w.name)}</b> · 1 timesheet periode ini belum disetujui<div class="meta">Dihitung 0 jam sampai disetujui</div></div><a class="btn sm" href="#absensi">Cek</a></li>`).join("")}
    <li><span class="dot ok" style="margin-top:6px"></span><div class="grow">Semua upah per hari di atas UMK ÷ 25. Lembur per pekerja di bawah ${R.otWeek} jam per minggu.</div></li>
  </ul></section>
  <div class="filters"><label class="sr" for="pag">Agen</label><select id="pag"><option value="">Mitra Karya dan Sinar Tenaga</option>${["MKS","STM"].map(a => `<option value="${a}" ${a === ag ? "selected" : ""}>${AG[a].short}</option>`).join("")}</select><span class="small muted">Klik baris untuk melihat slip gaji.</span></div>
  <section class="card"><div class="bd flush tw"><table class="tbl"><thead><tr><th>Pekerja</th><th class="num">Hari</th><th class="num">Upah pokok</th><th class="num">Lembur</th><th class="num">Malam + makan</th><th class="num">Premi</th><th class="num">Bruto</th><th class="num">BPJS</th><th class="num">PPh 21</th><th class="num">Kasbon</th><th class="num">Neto</th><th>Rekening</th></tr></thead><tbody>
  ${rows.slice(0, UI.payAll ? 999 : 50).map(p => `<tr class="click" data-slipw="${p.w.id}"><td>${personCell(p.w, p.w.id + " · " + AG[p.w.ag].short)}</td><td class="num">${p.days}</td><td class="num">${fmt(p.base)}</td><td class="num">${p.ot ? fmt(p.ot) : "—"}</td><td class="num">${fmt(p.night + p.meal)}</td><td class="num">${p.premi ? fmt(p.premi) : "—"}</td><td class="num">${fmt(p.gross)}</td><td class="num">${fmt(p.jht + p.jp + p.kes)}</td><td class="num">${p.pph ? fmt(p.pph) : "—"}</td><td class="num">${p.kasbon ? fmt(p.kasbon) : "—"}</td><td class="num"><b>${fmt(p.net)}</b></td><td>${holdReason(p.w) ? '<span class="tag bad">Ditahan</span>' : p.w.bank.bank}</td></tr>`).join("")}
  </tbody><tfoot><tr><td>${rows.length} pekerja</td><td></td><td class="num">${fmt(T("base"))}</td><td class="num">${fmt(T("ot"))}</td><td class="num">${fmt(T("night") + T("meal"))}</td><td class="num">${fmt(T("premi"))}</td><td class="num">${fmt(T("gross"))}</td><td class="num">${fmt(T("jht") + T("jp") + T("kes"))}</td><td class="num">${fmt(T("pph"))}</td><td class="num">${fmt(T("kasbon"))}</td><td class="num">${fmt(T("net"))}</td><td></td></tr></tfoot></table></div>
  ${rows.length > 50 && !UI.payAll ? `<div class="bd" style="border-top:1px solid var(--line2)"><button class="btn ghost" id="payall">Tampilkan semua ${rows.length} baris</button></div>` : ""}</section>
  <section class="card" style="margin-top:16px"><div class="hd"><h2>Periode sebelumnya</h2><a class="more btn ghost sm" href="#pembayaran">Riwayat pembayaran</a></div><div class="bd flush tw"><table class="tbl"><thead><tr><th>Periode</th><th>Dibayar</th><th class="num">Pekerja</th><th class="num">Neto</th><th>Status</th></tr></thead><tbody>
    ${BATCH.filter(b => b.kind === "Gaji bulanan").map(b => `<tr><td>${b.period}</td><td>${b.date}</td><td class="num">${b.n}</td><td class="num">${rpS(b.amount)}</td><td><span class="tag ok">Dibayar</span>${b.fail ? ` <span class="tag warn">${b.fail} transfer ulang</span>` : ""}</td></tr>`).join("")}
  </tbody></table></div></section>`;
};
PAGES.penggajian.after = () => {
  const pag = $("#pag"); pag.onchange = e => { UI.payAg = e.target.value; rerender(); };
  $$("[data-slipw]").forEach(r => r.onclick = e => { if (e.target.closest("a")) return; payslip(wById(r.dataset.slipw), null); });
  $$("[data-bank]").forEach(a => a.addEventListener("click", () => { UI.profNext = "bank"; UI.lastProf = null; }));
  const pa = $("#payall"); if (pa) pa.onclick = () => { UI.payAll = true; rerender(); };
  const a1 = $("#ap1"); if (a1) a1.onclick = () => { RUN.status = "setuju1"; toast("Disetujui HR. Finance mendapat notifikasi untuk persetujuan kedua."); rerender(); };
  const a2 = $("#ap2"); if (a2) a2.onclick = () => { RUN.status = "setuju"; toast("Disetujui Finance. File transfer siap dibuat."); rerender(); };
  const py = $("#pay"); if (py) py.onclick = () => { exportBank(); RUN.status = "dibayar"; const all = payroll().filter(p => !holdReason(p.w)); addBatchCurrent(all); toast(`File transfer BCA dibuat untuk ${all.length} rekening. Unggah ke KlikBCA Bisnis, lalu status muncul di Riwayat pembayaran.`); rerender(); };
  $("#exp").onclick = () => { modal("Ekspor penggajian", `<p style="margin:0" class="muted">Rekening yang ditahan tidak ikut di file transfer.</p><div style="display:grid;gap:8px">
    <button class="btn" data-x="bank">File transfer massal BCA (KlikBCA Bisnis, CSV)</button>
    <button class="btn" data-x="mandiri">File transfer Mandiri (MCM, CSV)</button>
    <button class="btn" data-x="full">Rekap penggajian lengkap (CSV, untuk Excel)</button>
    <button class="btn" data-x="pph">Daftar PPh 21 untuk e-Bupot 21/26 (CSV)</button>
    <button class="btn" data-x="bpjs">Iuran BPJS per pekerja (CSV, untuk SIPP dan EDABU)</button>
    <button class="btn" data-x="agen">Ringkasan per agen untuk tagihan (CSV)</button></div>`, `<button class="btn" data-close>Tutup</button>`);
  $$("[data-x]").forEach(b => b.onclick = () => doExport(b.dataset.x)); };
  $("#slips").onclick = () => toast(`Slip gaji ${PERIOD.n} dikirim ke aplikasi ${payroll().length} pekerja. Slip bisa dibuka tanpa kuota internet lewat SMS.`);
};
function doExport(x){
  const rows = payroll(), per = "2026-11";
  if (x === "bank") exportBank();
  if (x === "mandiri") download(`mandiri-mcm-${per}.csv`, csv([["Account No","Account Name","Bank","Amount","Currency","Remark"], ...rows.filter(p => !holdReason(p.w)).map(p => [p.w.bank.no, p.w.name.toUpperCase(), p.w.bank.bank, Math.round(p.net), "IDR", "GAJI " + per])]));
  if (x === "full") download(`penggajian-${per}.csv`, csv([["ID","Nama","Agen","Seksi","Hari","Upah pokok","Lembur jam","Lembur","Shift malam","Uang makan","Bal premi","Premi","Bruto","JHT","JP","BPJS Kes","PPh21","Kasbon","Neto","Bank","Rekening","Status"], ...rows.map(p => [p.w.id, p.w.name, AG[p.w.ag].short, p.w.sec || "", p.days, Math.round(p.base), p.otH, Math.round(p.ot), Math.round(p.night), Math.round(p.meal), p.bales, Math.round(p.premi), Math.round(p.gross), Math.round(p.jht), Math.round(p.jp), Math.round(p.kes), p.pph, p.kasbon, Math.round(p.net), p.w.bank.bank, "'" + p.w.bank.no, holdReason(p.w) || "Dibayar"])]));
  if (x === "pph") download(`ebupot-pph21-${per}.csv`, csv([["Masa","NIK","Nama","Kode objek","Bruto","Tarif TER","PPh 21"], ...rows.filter(p => p.w.ag !== "PHL").map(p => ["11/2026", p.w.nik, p.w.name, "21-100-01", Math.round(p.gross), ter(p.gross) * 100 + "%", p.pph])]));
  if (x === "bpjs") download(`iuran-bpjs-${per}.csv`, csv([["No. BPJS TK","No. BPJS Kes","Nama","Upah dilaporkan","JHT pekerja","JHT perusahaan","JP pekerja","JP perusahaan","JKK","JKM","Kes pekerja","Kes perusahaan"], ...rows.filter(p => p.w.ag !== "PHL").map(p => [p.w.bpjsTk, p.w.bpjsKes, p.w.name, R.umk, Math.round(R.umk * R.jhtEe), Math.round(R.umk * R.jhtEr), Math.round(R.umk * R.jpEe), Math.round(R.umk * R.jpEr), Math.round(R.umk * R.jkk), Math.round(R.umk * R.jkm), Math.round(R.umk * R.kesEe), Math.round(R.umk * R.kesEr)])]));
  if (x === "agen") download(`ringkasan-agen-${per}.csv`, csv([["Agen","Pekerja","Bruto","Iuran pemberi kerja","Fee %","Fee","PPN fee"], ...["MKS","STM"].map(a => { const r = payroll(a), g = r.reduce((s, p) => s + p.gross, 0); return [AG[a].n, r.length, Math.round(g), Math.round(r.reduce((s, p) => s + p.er, 0)), AG[a].fee * 100, Math.round(g * AG[a].fee), Math.round(g * AG[a].fee * R.ppn)]; })]));
  closeModal(); toast("File diunduh.");
}
function exportBank(){
  const rows = payroll().filter(p => !holdReason(p.w));
  const code = {BCA:"014", BRI:"002", Mandiri:"008", BNI:"009", BSI:"451", BJB:"110"};
  download("bca-transfer-massal-2026-11.csv", csv([["No","Rekening tujuan","Nama penerima","Kode bank","Bank","Jenis transfer","Nominal","Keterangan","Email"], ...rows.map((p, i) => [i + 1, "'" + p.w.bank.no, p.w.name.toUpperCase(), code[p.w.bank.bank] || "", p.w.bank.bank, p.w.bank.bank === "BCA" ? "Antar rekening BCA" : "BI-FAST", Math.round(p.net), "GAJI NOV26 " + p.w.id, ""])]));
}
function addBatchCurrent(list){
  if (BATCH.some(b => b.id === "TRF-2611")) return;
  BATCH.unshift({id:"TRF-2611", date:"25 Nov 2026", kind:"Gaji bulanan", period:PERIOD.n, bank:"BCA · transfer massal (KlikBCA Bisnis)", n:list.length, amount:list.reduce((a, p) => a + p.net, 0), ok:0, fail:0, status:"Menunggu otorisasi bank", who:list.map(p => p.w.id), wk:"cur"});
}

/* ======================= Riwayat pembayaran ======================= */
PAGES.pembayaran = () => {
  const total = BATCH.filter(b => b.status !== "Menunggu otorisasi bank").reduce((a, b) => a + b.amount, 0);
  return `<div class="pagehead"><div><h1>Riwayat pembayaran</h1><div class="sub">Transfer gaji, harian lepas, transfer ulang, dan pembayaran tagihan agen.</div></div>
    <div class="actions"><button class="btn" id="pexp">Ekspor CSV</button></div></div>
  <div class="stats">
    <div class="stat"><div class="k">Dibayar 90 hari terakhir</div><div class="v">${rpS(total)}</div><div class="s">${BATCH.length} batch</div></div>
    <div class="stat"><div class="k">Transfer gagal</div><div class="v">${BATCH.reduce((a, b) => a + (b.fail || 0), 0)}</div><div class="s">semua sudah ditransfer ulang</div></div>
    <div class="stat"><div class="k">Berikutnya</div><div class="v">25 Nov</div><div class="s">${RUN.status === "dibayar" ? "file transfer dibuat" : "gaji bulanan, menunggu persetujuan"}</div></div>
    <div class="stat"><div class="k">Harian lepas</div><div class="v">Sabtu</div><div class="s">transfer mingguan otomatis</div></div>
  </div>
  <section class="card"><div class="bd flush tw"><table class="tbl"><thead><tr><th>Tanggal</th><th>Batch</th><th>Jenis</th><th>Periode</th><th>Lewat</th><th class="num">Penerima</th><th class="num">Jumlah</th><th>Status</th></tr></thead><tbody>
  ${BATCH.map(b => `<tr class="click" data-batch="${b.id}"><td class="nowrap">${b.date}</td><td class="num">${b.id}</td><td>${b.kind}${b.agency ? `<span class="sub">${AG[b.agency].n}</span>` : ""}</td><td>${b.period}</td><td>${b.bank}</td><td class="num">${b.n}</td><td class="num">${rp(b.amount)}</td><td>${b.fail ? `<span class="tag warn">${b.ok} berhasil, ${b.fail} gagal</span>` : b.status === "Berhasil" ? '<span class="tag ok">Berhasil</span>' : `<span class="tag info">${b.status}</span>`}</td></tr>`).join("")}
  </tbody></table></div></section>`;
};
PAGES.pembayaran.after = () => {
  $("#pexp").onclick = () => download("riwayat-pembayaran.csv", csv([["Tanggal","Batch","Jenis","Periode","Lewat","Penerima","Jumlah","Status"], ...BATCH.map(b => [b.date, b.id, b.kind, b.period, b.bank, b.n, Math.round(b.amount), b.status])]));
  $$("[data-batch]").forEach(r => r.onclick = () => {
    const b = BATCH.find(x => x.id === r.dataset.batch);
    const ppl = (b.who || []).slice(0, 15).map(id => wById(id));
    modal(`${b.id} · ${b.kind}`, `<dl class="kv"><dt>Tanggal</dt><dd>${b.date}</dd><dt>Periode</dt><dd>${b.period}</dd><dt>Lewat</dt><dd>${b.bank}</dd><dt>Jumlah</dt><dd>${rp(b.amount)} ke ${b.n} penerima</dd><dt>Disetujui</dt><dd>Ibu Maya (HR), Pak Hendro (Finance)</dd><dt>Status</dt><dd>${b.status}</dd></dl>
      ${b.fails ? `<div class="note warn"><b>Gagal:</b> ${b.fails.map(f => `${esc(wById(f.w).name)} (${f.why})`).join("; ")}. Dana kembali ke rekening pabrik 24 Okt dan ditransfer ulang 27 Okt setelah rekening diperbaiki.</div>` : ""}
      ${b.agency ? `<div class="note">${b.kind === "Fee agen" ? "Fee " + dec(AG[b.agency].fee * 100) + "% dari bruto ditambah PPN 11%." : "Gaji, iuran BPJS dan fee agen. Agen mengirim bukti transfer ke pekerja paling lambat H+2."} Bukti potong PPh 23 diterbitkan untuk fee.</div>` : `<div class="tw"><table class="tbl"><thead><tr><th>Penerima</th><th>Rekening</th><th class="num">Jumlah</th></tr></thead><tbody>${ppl.map(w => { const h = payHistory(w).find(x => x.b === b); return `<tr><td>${esc(w.name)}<span class="sub">${w.id}</span></td><td>${w.bank.bank} ${maskNo(w.bank.no)}</td><td class="num">${rp(h ? h.amt : payLine(w).net)}</td></tr>`; }).join("")}</tbody></table></div>${b.n > 15 ? `<p class="small muted" style="margin:0">dan ${b.n - 15} penerima lainnya</p>` : ""}`}`, `<button class="btn" data-close>Tutup</button>`, {wide:true});
  });
};

/* ======================= Rekening bank ======================= */
PAGES.rekening = () => {
  const open = BREQ.filter(b => !["Disetujui","Ditolak"].includes(b.status));
  const own = W.filter(w => w.bank.status !== "agen");
  const c = k => own.filter(w => w.bank.status === k).length;
  const f = UI.bankFilter, list = own.filter(w => !f || w.bank.status === f);
  const reqCard = r => { const w = wById(r.w), inq = r.inquiry; return `<li style="display:block">
    <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap"><span class="av sm">${initials(w.name)}</span><div class="grow"><b><a href="#profil/${w.id}" style="color:inherit">${esc(w.name)}</a></b> · ${r.kind} <span class="muted">(${r.id})</span>
      <div class="meta">${w.id} · ${AG[w.ag].short} · ${r.when} · ${r.via}</div>
      <div style="margin-top:6px">${r.from ? `${r.from.bank} ${maskNo(r.from.no)} → ` : ""}<b>${r.to.bank} ${r.to.no.replace(/(\d{4})(?=\d)/g, "$1 ")}</b> a.n. ${esc(r.to.holder)}</div>
      <div class="meta" style="margin-top:2px">Alasan: ${esc(r.reason)}</div>
      <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">${r.flags.map(x => `<span class="tag ${x.includes("Nama") ? "bad" : "warn"}">${x}</span>`).join("")}
      ${inq ? `<span class="tag ${inq.match ? "ok" : "bad"}">Cek bank: ${esc(inq.name)} ${inq.match ? "cocok dengan KTP" : "tidak cocok dengan KTP"}</span>` : ""}
      ${r.approvals.map(a => `<span class="tag info">Disetujui ${a}</span>`).join("")}</div></div>
      <div class="nowrap" style="display:flex;gap:6px;flex-wrap:wrap">${!inq ? `<button class="btn sm" data-inq="${r.id}">Cek nama rekening</button>` : ""}<button class="btn sm danger" data-brej="${r.id}">Tolak</button>${r.approvals.length === 0 ? `<button class="btn sm pri" data-bapp="${r.id}" ${!inq || !inq.match ? "disabled" : ""}>Setujui (HR)</button>` : `<button class="btn sm pri" data-bfin="${r.id}">Setujui sebagai Finance (simulasi)</button>`}</div></div></li>`; };
  return `<div class="pagehead"><div><h1>Rekening bank</h1><div class="sub">Rekening gaji pekerja yang dibayar lewat pabrik. Perubahan dicek ke bank dan perlu dua persetujuan.</div></div>
    <div class="actions"><button class="btn" id="bexp">Ekspor CSV</button><button class="btn" id="bcheck">Cek ulang semua rekening</button></div></div>
  <div class="stats">
    <div class="stat"><div class="k">Terverifikasi</div><div class="v">${c("ok")}</div><div class="s">dari ${own.length} rekening</div></div>
    <div class="stat"><div class="k">Menunggu cek</div><div class="v ${c("pending") ? "warn" : ""}">${c("pending")}</div><div class="s">gaji ditahan</div></div>
    <div class="stat"><div class="k">Nama tidak cocok</div><div class="v ${c("mismatch") ? "bad" : ""}">${c("mismatch")}</div><div class="s">gaji ditahan</div></div>
    <div class="stat"><div class="k">Permintaan perubahan</div><div class="v ${open.length ? "warn" : ""}">${open.length}</div><div class="s">batas untuk gajian 25 Nov: 24 Nov 12.00</div></div>
  </div>
  <section class="card" style="margin-bottom:16px"><div class="hd"><h2>Permintaan perubahan</h2><span class="more small muted">HR cek dan setujui, lalu Finance menyetujui kedua</span></div>
    <ul class="list">${open.map(reqCard).join("") || '<li class="muted">Tidak ada permintaan yang menunggu.</li>'}</ul></section>
  <div class="grid g21">
    <section class="card"><div class="hd"><h2>Semua rekening</h2><div class="more"><label class="sr" for="bf">Status</label><select id="bf"><option value="">Semua status</option>${[["ok","Terverifikasi"],["pending","Menunggu cek"],["mismatch","Nama tidak cocok"],["none","Belum ada"]].map(([k, l]) => `<option value="${k}" ${k === f ? "selected" : ""}>${l}</option>`).join("")}</select></div></div>
      <div class="bd flush tw"><table class="tbl"><thead><tr><th>Pekerja</th><th>Bank</th><th>No. rekening</th><th>Nama pemilik</th><th>Status</th><th>Dicek</th></tr></thead><tbody>
      ${list.slice(0, 40).map(w => `<tr class="click" data-bw="${w.id}"><td>${personCell(w, w.id + " · " + AG[w.ag].short)}</td><td>${w.bank.bank}</td><td class="num">${maskNo(w.bank.no)}</td><td>${esc(w.bank.holder) || "—"}</td><td>${bankTag(w.bank.status)}</td><td class="small muted">${w.bank.checked ? dDate(w.bank.checked) : "—"}</td></tr>`).join("")}
      </tbody></table></div>${list.length > 40 ? `<div class="bd small muted" style="border-top:1px solid var(--line2)">Menampilkan 40 dari ${list.length}. Saring status atau cari di Pekerja.</div>` : ""}</section>
    <div class="grid" style="align-content:start">
      <section class="card"><div class="hd"><h2>Aturan</h2></div><div class="bd small"><ul style="margin:0;padding-left:18px;display:grid;gap:6px">
        <li>Nama pemilik rekening harus sama dengan KTP pekerja.</li><li>Cek nama ke bank dulu, baru bisa disetujui.</li><li>Dua persetujuan: HR lalu Finance. Orang yang mengajukan tidak bisa menyetujui.</li><li>Perubahan dalam 3 hari sebelum gajian ditandai dan dikonfirmasi ke pekerja lewat telepon.</li><li>Pekerja mendapat SMS dan WhatsApp setiap kali rekening berubah.</li></ul></div></section>
      <section class="card"><div class="hd"><h2>Riwayat perubahan</h2></div><ul class="list">${AUDIT.slice(0, 8).map(a => `<li><div class="grow small">${esc(a.what)}<div class="meta">${a.t} · ${esc(a.who)}</div></div></li>`).join("")}</ul></section>
    </div></div>`;
};
PAGES.rekening.after = () => {
  $("#bf").onchange = e => { UI.bankFilter = e.target.value; rerender(); };
  $$("[data-bw]").forEach(r => r.onclick = e => { if (e.target.closest("a")) return; UI.profNext = "bank"; UI.lastProf = null; location.hash = "profil/" + r.dataset.bw; });
  $("#bexp").onclick = () => download("rekening-pekerja.csv", csv([["ID","Nama","Agen","Bank","No. rekening","Nama pemilik","Status","Dicek"], ...W.filter(w => w.bank.status !== "agen").map(w => [w.id, w.name, AG[w.ag].short, w.bank.bank, "'" + w.bank.no, w.bank.holder, w.bank.status, w.bank.checked ? dDate(w.bank.checked) : ""])]));
  $("#bcheck").onclick = () => toast("Cek ulang dijadwalkan malam ini 22.00 lewat API bank. Hasilnya muncul besok pagi.");
  const now = () => "23 Nov 2026 " + new Date().toTimeString().slice(0, 5).replace(":", ".");
  $$("[data-inq]").forEach(b => b.onclick = () => { const r = BREQ.find(x => x.id === b.dataset.inq), w = wById(r.w); const nm = r.to.holder.toUpperCase(); r.inquiry = {name: nm, match: r.to.holder.toLowerCase() === w.name.toLowerCase()}; AUDIT.unshift({t: now(), who:"Sistem (cek rekening " + r.to.bank + ")", what:`Nama di bank untuk ${r.id}: ${nm}`}); rerender(); });
  $$("[data-bapp]").forEach(b => b.onclick = () => { const r = BREQ.find(x => x.id === b.dataset.bapp); r.approvals.push("HR"); r.status = "Menunggu Finance"; AUDIT.unshift({t: now(), who:"Ibu Maya (HR)", what:`Menyetujui ${r.id} untuk ${wById(r.w).name}`}); toast("Disetujui HR. Menunggu persetujuan Finance."); rerender(); });
  $$("[data-bfin]").forEach(b => b.onclick = () => { const r = BREQ.find(x => x.id === b.dataset.bfin), w = wById(r.w); r.approvals.push("Finance"); r.status = "Disetujui"; w.bank = {bank:r.to.bank, no:r.to.no, holder:r.to.holder, status:"ok", checked:TODAY, via:"Cek rekening API bank"}; AUDIT.unshift({t: now(), who:"Pak Hendro (Finance)", what:`Persetujuan kedua ${r.id}, rekening ${w.name} sekarang ${r.to.bank} ${maskNo(r.to.no)}`}); toast(`Rekening ${w.name.split(" ")[0]} diganti. Gajian 25 Nov masuk ke ${r.to.bank} ${maskNo(r.to.no)}. Pekerja mendapat SMS konfirmasi.`); rerender(); });
  $$("[data-brej]").forEach(b => b.onclick = () => { const r = BREQ.find(x => x.id === b.dataset.brej), w = wById(r.w);
    modal("Tolak " + r.id, `<div class="field"><label for="rr">Alasan (dikirim ke pekerja${r.via.includes("agen") ? " dan agen" : ""})</label><select id="rr"><option>Nama pemilik rekening tidak sama dengan KTP. Gunakan rekening atas nama sendiri.</option><option>Nomor rekening tidak ditemukan di bank.</option><option>Tidak bisa dikonfirmasi ke pekerja lewat telepon.</option></select></div>`, `<button class="btn" data-close>Batal</button><button class="btn danger" id="rrok">Tolak permintaan</button>`);
    $("#rrok").onclick = () => { r.status = "Ditolak"; AUDIT.unshift({t: now(), who:"Ibu Maya (HR)", what:`Menolak ${r.id} untuk ${w.name}: ${$("#rr").value}`}); closeModal(); toast(`${r.id} ditolak. Gaji ${w.name.split(" ")[0]} tetap ke rekening lama.`); rerender(); }; });
};

/* ======================= Aturan gaji ======================= */
PAGES.aturan = () => {
  const groups = [...new Set(RULES.map(r => r.group))];
  return `<div class="pagehead"><div><h1>Aturan gaji</h1><div class="sub">Dipakai untuk menghitung timesheet menjadi gaji. Contoh mengikuti PP 35/2021 dan PP 36/2021, dengan UMK contoh.</div></div>
    <div class="actions"><button class="btn" id="redit">Ubah nilai</button></div></div>
  <div class="grid g21">
    <section class="card"><div class="bd flush tw"><table class="tbl"><thead><tr><th>Aktif</th><th>Aturan</th><th>Nilai</th></tr></thead><tbody>
      ${groups.map(g => `<tr><td colspan="3" style="background:#f8f9fb;font-weight:600;font-size:12.5px;color:var(--muted)">${g}</td></tr>` + RULES.filter(r => r.group === g).map(r => `<tr><td><input type="checkbox" data-rule="${r.id}" ${r.on ? "checked" : ""} aria-label="${r.n}"></td><td><b style="font-weight:600">${r.n}</b><span class="sub">${r.d}</span></td><td class="nowrap">${r.v()}</td></tr>`).join("")).join("")}
    </tbody></table></div></section>
    <section class="card" style="align-self:start"><div class="hd"><h2>Uji aturan</h2></div><div class="bd" style="display:grid;gap:12px">
      <div class="grid g2" style="gap:10px">
        <div class="field"><label for="cday">Hari</label><select id="cday"><option value="k">Hari kerja</option><option value="r">Hari istirahat</option><option value="h">Libur nasional</option></select></div>
        <div class="field"><label for="csh">Shift</label><select id="csh">${[..."PSM"].map(x => `<option value="${x}">${SH[x].n}</option>`).join("")}</select></div>
        <div class="field"><label for="cot">Jam lembur</label><input type="number" id="cot" min="0" max="4" value="2"></div>
        <div class="field"><label for="cbal">Bal di atas target</label><input type="number" id="cbal" min="0" value="60"></div>
        <div class="field"><label for="clate">Terlambat (menit)</label><input type="number" id="clate" min="0" value="0"></div>
      </div>
      <div id="calc" class="payslip"></div>
    </div></section>
  </div>`;
};
function calcRule(){
  const day = $("#cday").value, sh = $("#csh").value, ot = Math.max(0, +$("#cot").value || 0), bal = Math.max(0, +$("#cbal").value || 0), late = Math.max(0, +$("#clate").value || 0);
  const on = id => RULES.find(r => r.id === id).on, h = hourly(), L = [];
  if (day === "k") {
    L.push(["Upah pokok harian", daily()]);
    if (ot && on("ot1")) L.push(["Lembur jam 1 × 1,5", h * 1.5]);
    if (ot > 1 && on("ot2")) L.push([`Lembur jam 2–${ot} × 2`, h * 2 * (ot - 1)]);
  } else {
    const hrs = 7 + ot;
    if (on("otr")) { L.push(["7 jam × 2 (hari istirahat/libur)", h * 2 * 7]); if (hrs >= 8) L.push(["Jam ke-8 × 3", h * 3]); if (hrs > 8) L.push([`Jam ke-9–${hrs} × 4`, h * 4 * (hrs - 8)]); }
  }
  if (sh === "M" && on("night")) L.push(["Tunjangan shift malam", R.night]);
  if (on("meal")) L.push(["Uang makan", R.meal]);
  if (bal && on("premi")) L.push([`Premi hasil (${bal} bal)`, bal * R.premi]);
  if (late > R.lateGrace && on("late")) L.push([`Potongan terlambat ${late} menit`, -h * late / 60]);
  if (ot > R.otDay) L.push(["Peringatan: lembur lebih dari " + R.otDay + " jam per hari", 0]);
  const t = L.reduce((a, x) => a + x[1], 0);
  $("#calc").innerHTML = `<table>${L.map(x => `<tr><td>${x[0]}</td><td>${x[1] ? rp(x[1]) : ""}</td></tr>`).join("")}<tr class="t"><td>Total shift ini (sebelum potongan BPJS dan PPh)</td><td>${rp(t)}</td></tr></table><p class="small muted" style="margin:8px 0 0">Upah sejam ${rp(h)} = UMK ${rp(R.umk)} ÷ 173.</p>`;
}
PAGES.aturan.after = () => {
  ["cday","csh","cot","cbal","clate"].forEach(i => $("#" + i).oninput = calcRule); calcRule();
  $$("[data-rule]").forEach(c => c.onchange = () => { RULES.find(r => r.id === c.dataset.rule).on = c.checked; calcRule(); toast(c.checked ? "Aturan diaktifkan." : "Aturan dinonaktifkan. Berlaku untuk periode gaji berikutnya."); });
  $("#redit").onclick = () => { modal("Ubah nilai aturan", `<div class="grid g2" style="gap:12px">${[["umk","UMK per bulan"],["phlDaily","Upah harian lepas"],["meal","Uang makan per hari"],["night","Tunjangan shift malam"],["premi","Premi per bal"],["lateGrace","Toleransi terlambat (menit)"]].map(([k, l]) => `<div class="field"><label for="v-${k}">${l}</label><input type="number" id="v-${k}" value="${R[k]}"></div>`).join("")}</div><div class="note">Perubahan dicatat dengan tanggal berlaku dan nama yang mengubah. Penggajian yang sudah disetujui tidak dihitung ulang.</div>`, `<button class="btn" data-close>Batal</button><button class="btn pri" id="vsave">Simpan</button>`);
    $("#vsave").onclick = () => { ["umk","phlDaily","meal","night","premi","lateGrace"].forEach(k => { const v = +$("#v-" + k).value; if (v >= 0) R[k] = v; }); closeModal(); toast("Nilai disimpan. Roster, penggajian dan slip dihitung ulang."); rerender(); }; };
};

/* ======================= Agen ======================= */
PAGES.agen = () => {
  const docs = {MKS:[["NIB dan izin alih daya (OSS)","ok"],["Sertifikat kepesertaan BPJS","ok"],["Bukti bayar BPJS Okt 2026","ok"],["Bukti transfer gaji Okt 2026","—"]], STM:[["NIB dan izin alih daya (OSS)","ok"],["Sertifikat kepesertaan BPJS","ok"],["Bukti bayar BPJS Okt 2026","warn"],["Bukti transfer gaji Okt 2026","—"]], BKN:[["NIB dan izin alih daya (OSS)","ok"],["Sertifikat kepesertaan BPJS","ok"],["Bukti bayar BPJS Okt 2026","ok"],["Bukti transfer gaji Okt 2026","ok"]]};
  return `<div class="pagehead"><div><h1>Agen penyalur</h1><div class="sub">Perusahaan alih daya yang menempatkan pekerja, dan pekerja harian lepas langsung.</div></div>
    <div class="actions"><button class="btn" id="agadd">Tambah agen</button></div></div>
  <section class="card"><div class="bd flush tw"><table class="tbl"><thead><tr><th>Agen</th><th class="num">Pekerja</th><th>Seksi</th><th>Pembayaran</th><th class="num">Fee</th><th>Perjanjian s/d</th><th class="num">Kehadiran</th><th class="num">Permintaan terpenuhi</th><th>PIC</th></tr></thead><tbody>
  ${Object.values(AG).map(a => `<tr><td><b style="font-weight:600">${a.n}</b><span class="sub">NIB ${a.nib}</span></td><td class="num">${W.filter(w => w.ag === a.id).length}</td><td>${SEC.filter(s => s.ag === a.id).map(s => s.id).join(", ") || "Semua"}</td><td style="max-width:260px">${MODEL[a.model]}</td><td class="num">${a.fee ? dec(a.fee * 100) + "%" : "—"}</td><td>${a.contractEnd ? dDate(a.contractEnd) : "—"}${a.contractEnd && daysBetween(TODAY, a.contractEnd) < 60 ? ' <span class="tag warn">segera</span>' : ""}</td><td class="num">${dec(a.att * 100)}%</td><td class="num">${a.id === "PHL" ? "—" : Math.round(a.fill * 100) + "%"}</td><td>${a.pic}<span class="sub">${a.phone}</span></td></tr>`).join("")}
  </tbody></table></div></section>
  <h2 style="margin:22px 0 10px">Kepatuhan agen</h2>
  <div class="grid g3">${["MKS","STM","BKN"].map(a => `<section class="card"><div class="hd"><h3>${AG[a].n}</h3></div><ul class="list">${docs[a].map(([n, s]) => `<li><div class="grow small">${n}</div>${s === "ok" ? '<span class="tag ok">Ada</span>' : s === "warn" ? '<span class="tag warn">Belum diunggah</span>' : '<span class="tag">Tidak perlu</span>'}</li>`).join("")}</ul>${docs[a].some(d => d[1] === "warn") ? `<div class="bd" style="border-top:1px solid var(--line2)"><button class="btn sm" data-nag="${a}">Minta dokumen</button></div>` : ""}</section>`).join("")}</div>
  <p class="small muted">Bukti bayar BPJS dari agen diminta setiap bulan supaya pabrik tidak ikut menanggung kalau agen menunggak iuran.</p>`;
};
PAGES.agen.after = () => {
  $$("[data-nag]").forEach(b => b.onclick = () => toast(`Permintaan dokumen dikirim ke ${AG[b.dataset.nag].pic}. Tagihan ${AG[b.dataset.nag].short} bulan ini ditahan sampai bukti bayar BPJS diunggah.`));
  $("#agadd").onclick = () => toast("Agen baru didaftarkan dengan NIB, izin alih daya dan perjanjian kerja sama. Belum tersedia di mockup.");
};
PAGES.tagihan = () => {
  const inv = ["MKS","STM","BKN"].map((a, i) => {
    const list = W.filter(w => w.ag === a), hrs = list.length * 26 * 7, g = list.reduce((s, w) => s + payLine(w).gross, 0);
    const diff = a === "STM" ? 56 : 0, sys = a === "BKN" ? g * 1.27 * (1 + AG[a].fee) : g * AG[a].fee * (1 + R.ppn);
    const billed = sys + diff * hourly() * 1.27 * (1 + AG[a].fee);
    return {a, no:`INV/${a}/2026/11/0${i + 31}`, hrs, billedHrs: hrs + diff, diff, sys, billed, status: diff ? "Selisih" : "Cocok"};
  });
  return `<div class="pagehead"><div><h1>Tagihan agen</h1><div class="sub">Periode ${PERIOD.n}. Jam di tagihan dicocokkan dengan timesheet yang disetujui.</div></div></div>
  <section class="card"><div class="bd flush tw"><table class="tbl"><thead><tr><th>No. tagihan</th><th>Agen</th><th>Isi tagihan</th><th class="num">Jam ditagih</th><th class="num">Jam disetujui</th><th class="num">Selisih</th><th class="num">Nilai tagihan</th><th class="num">Hitungan sistem</th><th>Status</th><th></th></tr></thead><tbody>
  ${inv.map(x => `<tr><td class="num">${x.no}</td><td>${AG[x.a].short}</td><td>${AG[x.a].model === "agen" ? "Gaji + BPJS + fee + PPN" : "Fee " + dec(AG[x.a].fee * 100) + "% + PPN"}</td><td class="num">${fmt(x.billedHrs)}</td><td class="num">${fmt(x.hrs)}</td><td class="num">${x.diff ? `<span class="tag bad">+${x.diff} jam</span>` : "0"}</td><td class="num">${rp(x.billed)}</td><td class="num">${rp(x.sys)}</td><td>${x.status === "Cocok" ? '<span class="tag ok">Cocok</span>' : '<span class="tag bad">Selisih ' + rpS(x.billed - x.sys) + "</span>"}</td><td class="right nowrap">${x.diff ? `<button class="btn sm" data-diff="${x.a}">Lihat selisih</button>` : `<button class="btn sm" data-payinv="${x.a}">Setujui bayar</button>`}</td></tr>`).join("")}
  </tbody></table></div></section>
  <div class="note" style="margin-top:12px">Tagihan yang cocok bisa disetujui untuk dibayar lewat Mandiri MCM. Pabrik memotong PPh 23 sebesar 2% dari fee agen dan menerbitkan bukti potong.</div>`;
};
PAGES.tagihan.after = () => {
  $$("[data-payinv]").forEach(b => b.onclick = () => { b.outerHTML = '<span class="tag info">Dijadwalkan 30 Nov</span>'; toast(`Tagihan ${AG[b.dataset.payinv].short} disetujui. Dijadwalkan dibayar 30 Nov dan muncul di Riwayat pembayaran.`); });
  $$("[data-diff]").forEach(b => b.onclick = () => {
    const list = W.filter(w => w.ag === "STM").slice(10, 17), hrs = [14, 7, 7, 8, 7, 7, 6];
    modal("Selisih tagihan Sinar Tenaga", `<p style="margin:0">Agen menagih 56 jam lebih banyak dari timesheet yang disetujui. Rinciannya:</p>
    <div class="tw"><table class="tbl"><thead><tr><th>Pekerja</th><th>Penyebab</th><th class="num">Jam</th></tr></thead><tbody>${list.map((w, i) => `<tr><td>${esc(w.name)}<span class="sub">${w.id}</span></td><td>${["Lembur tanpa SPL (2 hari)","Mangkir 2 Nov, ditagih penuh","Mangkir 9 Nov, ditagih penuh","Tidak absen pulang, belum dikoreksi","Sakit tanpa surat dokter","Mangkir 15 Nov, ditagih penuh","Pulang awal sendiri 3 hari"][i]}</td><td class="num">${hrs[i]}</td></tr>`).join("")}</tbody></table></div>`,
    `<button class="btn" data-close>Tutup</button><button class="btn pri" id="dsend">Kirim rincian ke agen</button>`, {wide:true});
    $("#dsend").onclick = () => { closeModal(); toast("Rincian selisih dikirim ke Ibu Lina Marlina. Tagihan ditahan sampai agen mengirim tagihan revisi."); };
  });
};
route();
