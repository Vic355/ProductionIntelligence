/* =====================================================================
   Menu page, clearer staff profiles, small layout tidy-ups.
   Loaded after app.js and lembur.js.
   ===================================================================== */

/* ---------- simple line icons (24×24, stroke) ---------- */
const ICO = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  need: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  send: '<path d="M4 12l16-8-6 16-3-7z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  leave: '<path d="M4 20h16"/><path d="M6 20c0-6 3-11 6-14 3 3 6 8 6 14"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.5 0 4.2 1.6 4.5 4.5"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  ot: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  heat: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  kpi: '<path d="M3 20h18"/><path d="M5 16l5-5 4 3 6-7"/>',
  gauge: '<path d="M4 17a8 8 0 1116 0"/><path d="M12 17l4-6"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  pay: '<rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.5"/><path d="M6 10v5M18 10v5"/>',
  hist: '<path d="M3 12a9 9 0 103-6.7L3 8"/><path d="M3 3v5h5M12 8v4l3 2"/>',
  bank: '<path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  rules: '<path d="M5 4h14v16H5z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  agency: '<path d="M4 20V6l8-3 8 3v14"/><path d="M9 20v-5h6v5M8 9h2M14 9h2"/>',
  bill: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  menu: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'
};
const ico = (k, cls = "ico") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICO[k] || ""}</svg>`;

/* page id → icon and one-line description */
const PAGEINFO = {
  beranda: ["home", "Ringkasan hari ini dan hal yang perlu ditindak"],
  jadwal: ["cal", "Roster mingguan per seksi, isi shift kosong"],
  kebutuhan: ["need", "Kebutuhan orang dari rencana produksi"],
  permintaan: ["send", "Minta tambahan orang ke Penukal atau Gemna"],
  absensi: ["clock", "Jam masuk dan pulang, cek lalu setujui"],
  cuti: ["leave", "Pengajuan cuti, sakit dan izin"],
  pekerja: ["users", "Semua orang beserta data pribadinya"],
  kontrak: ["doc", "PKWT yang akan berakhir dan perpanjangan"],
  lembur: ["ot", "Perintah lembur (SPL) per tugas"],
  monitor: ["heat", "Jam dan biaya lembur per tim"],
  kpi: ["kpi", "KPI departemen dibanding lembur"],
  volume: ["gauge", "Hasil operator dari hitungan mesin"],
  hp: ["phone", "Aplikasi HP pekerja"],
  penggajian: ["pay", "Gaji periode ini, slip dan file bank"],
  pembayaran: ["hist", "Transfer yang sudah dikirim"],
  rekening: ["bank", "Rekening pekerja dan perubahannya"],
  aturan: ["rules", "UMK, lembur, BPJS dan PPh 21"],
  agen: ["agency", "Penukal dan Gemna: kinerja dan dokumen"],
  tagihan: ["bill", "Tagihan agen dicocokkan dengan absensi"]
};

/* live badge per page, kept cheap and safe */
function pageBadge(id){
  try {
    if (id === "cuti") { const n = LEAVES.filter(l => l.status === "pending").length; return n ? [n + " menunggu", "warn"] : null; }
    if (id === "rekening") { const n = BREQ.filter(b => !["Disetujui","Ditolak"].includes(b.status)).length; return n ? [n + " perlu disetujui", "warn"] : null; }
    if (id === "kontrak") { const n = W.filter(w => w.type === "PKWT" && w.ag !== "KRY" && daysBetween(TODAY, w.end) <= 30).length; return n ? [n + " berakhir ≤ 30 hari", "warn"] : null; }
    if (id === "pekerja") return [W.length + " orang", ""];
    if (id === "penggajian") return ["Gajian 25 Nov", "info"];
  } catch (e) {}
  return null;
}

/* ---------- people helpers shared by menu and profile ---------- */
UI.recent = UI.recent || [];
const KEC = ["Cikarang Barat","Cikarang Utara","Cibitung","Tambun Selatan","Setu","Serang Baru","Karangbahagia","Cikarang Timur"];
const STREET = ["Jl. Melati","Jl. Kenanga","Gg. Mawar","Jl. Pramuka","Perum Griya Asri Blok C","Jl. Raya Industri","Kp. Pasir Gombong","Jl. Swadaya"];
const REL = ["Suami","Istri","Ibu","Ayah","Kakak","Adik"];
const ECN = {f:["Sri Wahyuni","Dewi Lestari","Nur Aini","Siti Aminah","Yuli Astuti","Rina Marlina"], m:["Agus Setiawan","Budi Santoso","Dedi Kurniawan","Asep Saepudin","Joko Susilo","Ujang Rahmat"]};
function pdOf(w){
  if (w.pd) return w.pd;
  const h = k => hash(w.id + k);
  const age = 19 + Math.floor(h("age") * 24);
  const born = new Date(Date.UTC(2026 - age, Math.floor(h("bm") * 12), 1 + Math.floor(h("bd") * 27)));
  const married = age > 24 && h("mar") < .6, kids = married ? Math.floor(h("kid") * 3) : 0;
  const ecF = married ? !w.f : h("ecg") < .5, ecL = ecF ? ECN.f : ECN.m, ec = ecL[Math.floor(h("ecn") * ecL.length)];
  return w.pd = {
    born, gender: w.f ? "Perempuan" : "Laki-laki",
    addr: `${STREET[Math.floor(h("st") * STREET.length)]} No. ${1 + Math.floor(h("no") * 80)}, RT 0${1 + Math.floor(h("rt") * 9)}/RW 0${1 + Math.floor(h("rw") * 9)}, Kec. ${KEC[Math.floor(h("kec") * KEC.length)]}, Kab. Bekasi`,
    email: h("em") < .55 ? w.name.split(" ")[0].toLowerCase() + Math.floor(h("en") * 90 + 10) + "@gmail.com" : "",
    ecName: ec.split(" ").slice(0, 2).join(" "), ecRel: married ? (w.f ? "Suami" : "Istri") : (ecF ? ["Ibu","Kakak","Adik"] : ["Ayah","Kakak","Adik"])[Math.floor(h("rel") * 3)], ecPhone: "08" + (11 + Math.floor(h("ep") * 48)) + "-••••-" + (1000 + Math.floor(h("eq") * 8999)),
    ptkp: (married ? "K/" : "TK/") + kids, edu: ["SMP","SMA","SMK","SMK","SMA","D3"][Math.floor(h("edu") * 6)],
    faskes: "Puskesmas " + KEC[Math.floor(h("fk") * KEC.length)], blood: ["A","B","O","AB"][Math.floor(h("bl") * 4)]
  };
}
const ageOf = d => Math.floor(daysBetween(d, TODAY) / 365.25);
const tenure = d => { const m = Math.max(0, Math.floor(daysBetween(d, TODAY) / 30.44)); return m >= 12 ? Math.floor(m / 12) + " th " + (m % 12) + " bln" : m + " bulan"; };
const placeOf = w => w.ag === "KRY" ? deptById(w.dept).full + (w.oregu ? " · Regu " + w.oregu : "") : w.sec ? secById(w.sec).n + " · Regu " + w.regu : "Cadangan harian lepas";
const kindOf = w => w.ag === "KRY" ? "Karyawan tetap pabrik (PKWTT), dibayar per jam" : w.type === "PKWT" ? "PKWT lewat " + AG[w.ag].n : "Harian lepas langsung dengan pabrik";

function peopleMatch(q){
  q = q.trim().toLowerCase(); if (q.length < 2) return [];
  return W.filter(w => w.name.toLowerCase().includes(q) || w.id.toLowerCase().includes(q) || w.role.toLowerCase().includes(q)).slice(0, 8);
}

/* ======================= Menu ======================= */
PAGES.menu = () => {
  const groups = NAV.filter(g => g.id !== "menu");
  const recent = UI.recent.map(wById).filter(Boolean);
  const showcase = recent.length ? recent : [W.find(w => w.sec === "S3" && w.role === "Packer"), typeof EMP !== "undefined" ? EMP.find(w => w.dept === "S3") : null, W.find(w => w.ag === "PHL"), W.find(w => w.sec === "S1" && w.role === "Operator forklift")].filter(Boolean);
  return `
  <div class="pagehead"><div><h1>Menu</h1><div class="sub">Semua fitur dan data pekerja di satu tempat.</div></div></div>
  <div class="menusearch">${ico("search")}<label class="sr" for="mq">Cari menu atau pekerja</label><input type="search" id="mq" placeholder="Cari menu, nama atau ID pekerja" autocomplete="off" value="${esc(UI.menuQ || "")}"></div>
  <div id="mpeople"></div>
  <div class="menucols">
    <div class="menugroups">${groups.map(g => `<section class="mgroup" data-mg><h2>${g.n}</h2><div class="tiles">${g.pages.map(([id, l]) => { const [ic, d] = PAGEINFO[id] || ["doc", ""], b = pageBadge(id); return `<a class="tile" href="#${id}" data-mt="${esc((l + " " + d + " " + g.n).toLowerCase())}">${ico(ic)}<div><b>${l}</b><span>${d}</span>${b ? `<span class="tag ${b[1]}" style="margin-top:6px">${b[0]}</span>` : ""}</div></a>`; }).join("")}</div></section>`).join("")}
    <p class="empty" id="mnone" hidden>Tidak ada menu yang cocok.</p></div>
    <aside>
      <section class="card"><div class="hd"><h2>${recent.length ? "Baru dilihat" : "Contoh profil"}</h2><a class="more btn ghost sm" href="#pekerja">Semua pekerja</a></div>
        <ul class="list">${showcase.map(w => `<li><a class="prow" href="#profil/${w.id}"><span class="av sm" aria-hidden="true">${initials(w.name)}</span><span class="grow"><b>${esc(w.name)}</b><span class="meta">${w.role} · ${AG[w.ag].short}</span></span><span class="faint">›</span></a></li>`).join("")}</ul></section>
      <section class="card" style="margin-top:16px"><div class="hd"><h2>Ringkasan orang</h2></div><div class="bd"><dl class="kv">
        <dt>Alih daya</dt><dd>${W.filter(w => AG[w.ag] && ["MKS","STM"].includes(w.ag)).length} orang · Penukal ${W.filter(w => w.ag === "MKS").length}, Gemna ${W.filter(w => w.ag === "STM").length}</dd>
        <dt>Harian lepas</dt><dd>${W.filter(w => w.ag === "PHL").length} orang</dd>
        <dt>Karyawan per jam</dt><dd>${W.filter(w => w.ag === "KRY").length} orang</dd>
        <dt>Rekening bermasalah</dt><dd>${W.filter(w => ["pending","mismatch","none"].includes(w.bank.status)).length} orang</dd></dl></div></section>
    </aside>
  </div>`;
};
PAGES.menu.after = () => {
  const q = $("#mq");
  const apply = () => {
    const v = (UI.menuQ = q.value).trim().toLowerCase();
    let shown = 0;
    $$("[data-mg]").forEach(g => { let n = 0; g.querySelectorAll("[data-mt]").forEach(t => { const ok = !v || t.dataset.mt.includes(v); t.hidden = !ok; n += ok; }); g.hidden = !n; shown += n; });
    const ppl = peopleMatch(v);
    $("#mpeople").innerHTML = ppl.length ? `<section class="card" style="margin-bottom:16px"><div class="hd"><h2>Pekerja</h2><span class="muted small">${ppl.length === 8 ? "8 teratas" : ppl.length + " cocok"}</span></div><ul class="list">${ppl.map(w => `<li><a class="prow" href="#profil/${w.id}"><span class="av sm" aria-hidden="true">${initials(w.name)}</span><span class="grow"><b>${esc(w.name)}</b><span class="meta">${w.id} · ${w.role} · ${placeOf(w)} · ${AG[w.ag].short}</span></span><span class="btn sm">Buka profil</span></a></li>`).join("")}</ul></section>` : "";
    $("#mnone").hidden = !!shown || !!ppl.length;
  };
  q.oninput = apply; apply();
  q.onkeydown = e => { if (e.key === "Enter") { const a = $("#mpeople a.prow") || $(".tile:not([hidden])"); if (a) location.hash = a.getAttribute("href").slice(1); } };
  if (!matchMedia("(max-width:700px)").matches) q.focus();
};
NAV.unshift({id:"menu", n:`<span class="navmenu">${ico("menu")}Menu</span>`, pages:[["menu","Semua menu"]]});

/* ======================= Profile sections ======================= */
function profSection(title, key, rows){
  return `<section class="card psec"><div class="hd"><h2>${title}</h2>${key ? `<button class="btn sm more" data-edit="${key}">Ubah</button>` : ""}</div><div class="bd"><dl class="kv wide">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v || '<span class="faint">—</span>'}</dd>`).join("")}</dl></div></section>`;
}
function profPribadi(w){
  const p = pdOf(w), s = w.sec && secById(w.sec);
  return profSection("Identitas", "pribadi", [
    ["Nama sesuai KTP", esc(w.name)], ["Jenis kelamin", p.gender], ["Tanggal lahir", dDate(p.born) + ` <span class="muted">(${ageOf(p.born)} tahun)</span>`], ["NIK", `<span class="num">${w.nik}</span> <span class="tag ok">Cek Dukcapil</span>`],
    ["Pendidikan terakhir", p.edu], ["Golongan darah", p.blood]])
  + profSection("Kontak", "kontak", [["No. HP (WhatsApp)", `<span class="num">${w.phone}</span>`], ["Email", esc(p.email)], ["Alamat", esc(p.addr)], ["Kontak darurat", `${esc(p.ecName)} (${p.ecRel}) · <span class="num">${p.ecPhone}</span>`]])
  + profSection("Pekerjaan", null, [["ID pekerja", w.id], ["Jabatan", w.role], ["Penempatan", placeOf(w)], ["Atasan langsung", w.ag === "KRY" ? deptById(w.dept).mgr : s ? s.leader : "HR pabrik"],
    ["Hubungan kerja", kindOf(w)], ["Mulai kerja", dDate(w.start) + ` <span class="muted">(${tenure(w.start)})</span>`], ["Upah", w.ag === "KRY" ? rp(w.rate) + " per jam" : w.ag === "PHL" ? rp(R.phlDaily) + " per hari" : "UMK " + rp(R.umk) + " per bulan"]])
  + profSection("Pajak dan BPJS", "pajak", [["Status PTKP", p.ptkp], ["NPWP", w.npwp], ["BPJS Ketenagakerjaan", `<span class="num">${w.bpjsTk}</span>`], ["BPJS Kesehatan", `<span class="num">${w.bpjsKes}</span>`], ["Faskes tingkat 1", p.faskes]])
  + `<p class="small muted">Perubahan data pribadi dicatat di riwayat dan dikirim ke aplikasi pekerja. Pekerja juga bisa mengubah kontak dan alamat sendiri dari HP.</p>`;
}
function profCuti(w){
  const ls = LEAVES.filter(l => l.w === w.id).sort((a, b) => b.from - a.from), pend = ls.filter(l => l.status === "pending");
  const st = l => l.status === "ok" ? '<span class="tag ok">Disetujui</span>' : l.status === "pending" ? '<span class="tag warn">Menunggu</span>' : '<span class="tag bad">Ditolak</span>';
  return `<div class="stats"><div class="stat"><div class="k">Saldo cuti tahunan</div><div class="v">${w.ag === "PHL" ? "—" : w.leaveBal + " hari"}</div><div class="s">${w.ag === "PHL" ? "harian lepas tidak dapat cuti tahunan" : "berlaku sampai 31 Des 2026"}</div></div>
    <div class="stat"><div class="k">Menunggu persetujuan</div><div class="v ${pend.length ? "warn" : ""}">${pend.length}</div><div class="s">pengajuan</div></div>
    <div class="stat"><div class="k">Sakit tahun ini</div><div class="v">${Math.floor(hash(w.id + "sk") * 4)} hari</div><div class="s">dengan surat dokter</div></div></div>
  <section class="card"><div class="hd"><h2>Pengajuan</h2><button class="btn sm more" id="pleave">Ajukan atas nama pekerja</button></div><div class="bd flush tw"><table class="tbl"><thead><tr><th>Jenis</th><th>Tanggal</th><th class="num">Hari</th><th>Catatan</th><th>Status</th></tr></thead><tbody>
    ${ls.map(l => `<tr><td>${l.type}</td><td>${l.from === l.to ? dShort(l.from) : dShort(l.from) + " – " + dShort(l.to)}</td><td class="num">${l.to - l.from + 1}</td><td>${esc(l.note || "")}</td><td>${st(l)}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">Belum ada pengajuan cuti atau izin.</td></tr>`}
  </tbody></table></div></section>${pend.length ? `<p class="small"><a href="#cuti">Setujui atau tolak di Cuti & izin</a></p>` : ""}`;
}
function profEdit(w, key){
  const p = pdOf(w);
  const F = {
    pribadi: ["Identitas", [["name","Nama sesuai KTP",w.name],["edu","Pendidikan terakhir",p.edu],["blood","Golongan darah",p.blood]], "Nama dan NIK dicek ulang ke Dukcapil sebelum disimpan."],
    kontak: ["Kontak", [["phone","No. HP (WhatsApp)",w.phone],["email","Email",p.email],["addr","Alamat",p.addr],["ecName","Kontak darurat",p.ecName],["ecRel","Hubungan",p.ecRel],["ecPhone","No. HP kontak darurat",p.ecPhone]], "Pekerja mendapat notifikasi setiap kali kontak berubah."],
    pajak: ["Pajak dan BPJS", [["ptkp","Status PTKP",p.ptkp],["npwp","NPWP",w.npwp],["faskes","Faskes tingkat 1",p.faskes]], "Status PTKP mengubah potongan PPh 21 mulai gajian berikutnya."]
  }[key];
  modal("Ubah " + F[0].toLowerCase() + " · " + esc(w.name), `<div class="grid g2" style="gap:12px">${F[1].map(([k, l, v]) => `<div class="field" ${k === "addr" ? 'style="grid-column:1/-1"' : ""}><label for="pe-${k}">${l}</label><input type="text" id="pe-${k}" value="${esc(v || "")}"></div>`).join("")}</div><div class="note">${F[2]}</div>`,
    `<button class="btn" data-close>Batal</button><button class="btn pri" id="pesave">Simpan</button>`);
  $("#pesave").onclick = () => {
    for (const [k] of F[1]) { const v = $("#pe-" + k).value.trim(); if (["name","phone","npwp"].includes(k)) w[k] = v || w[k]; else p[k] = v; }
    AUDIT.unshift({t:"23 Nov 2026 " + new Date().toTimeString().slice(0, 5).replace(":", "."), who: roleOf().n + " (" + roleOf().t + ")", what:"Mengubah " + F[0].toLowerCase() + " " + w.name});
    closeModal(); toast(F[0] + " disimpan. Perubahan dicatat di riwayat."); rerender();
  };
}

/* ---------- route: hide one-item sub menus, remember viewed profiles ---------- */
{
  const _r = route;
  route = function(){
    _r();
    const [page, arg] = location.hash.slice(1).split("/");
    const sn = $("#subnav"); if (!sn.hidden && sn.children.length <= 1) sn.hidden = true;
    if (page === "profil" && arg && wById(arg)) UI.recent = [arg, ...UI.recent.filter(x => x !== arg)].slice(0, 6);
  };
  if (document.readyState !== "loading") route();
}
