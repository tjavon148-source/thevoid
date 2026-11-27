/* Live demo: a purpose-built replica on made-up sample data. No network, no storage, no extension code. */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r) => (r || document).querySelector(s);

  /* ---------- sample data (made up) ---------- */
  const DAYS = {
    2: [88, -30], 3: [-62, -71, -51], 4: [112], 5: [56], 6: [120, -36],
    9: [144], 10: [254, -30], 11: [30, 26], 12: [312, 198, 58], 13: [108],
    16: [80, -40], 17: [240, -40], 18: [-36], 19: [208, 100], 20: [48, -38]
  };
  const STOPS = [11.75, 12, 13.25, 13, 13.5, 12.5, 12, 13, 13.5, 12.5, 13, 12.75, 14, 13, 12.25, 12, 11.75, 12, 12, 12.25, 14, 12.25, 11.5, 13.25, 13.75, 12, 12.5];
  const SETUPS = ["Breakout", "Pullback", "Reversal", "Opening range"];
  const NOTES = ["Waited for the retest and sized down. Followed the plan.", "Entered early, before the candle closed. Next time wait for the close.", "Clean level, clean exit. No hesitation.", "Cut it at the stop without moving it. Fine.", "Took profit a little early. The plan said to trade the first target.", ""];
  const TIMES = ["09:34", "10:12", "10:41", "11:05", "11:48", "13:20"];
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const WEEKS = [{ label: "Nov 16 – Nov 22", days: [16, 17, 18, 19, 20], cur: true }, { label: "Nov 9 – Nov 15", days: [9, 10, 11, 12, 13], due: true }, { label: "Nov 2 – Nov 8", days: [2, 3, 4, 5, 6] }];
  const TRADES = [];
  (function build() {
    let i = 0;
    Object.keys(DAYS).map(Number).forEach(d => DAYS[d].forEach((pnl, k) => {
      const qty = 2, stop = STOPS[i], side = (i * 7 + d) % 3 === 0 ? "Short" : "Long";
      const entry = 27180 + ((d * 37 + k * 53) % 420) + 0.25 * ((i * 3) % 4);
      const pts = pnl / (qty * 2), exit = side === "Long" ? entry + pts : entry - pts, sg = side === "Long" ? 1 : -1;
      TRADES.push({ id: i + 1, day: d, time: TIMES[(i * 5 + k) % TIMES.length], side, qty, entry, exit, stop: entry - sg * stop, target: entry + sg * stop * 2, pnl, hold: 4 + (i * 7) % 33, setup: SETUPS[(i * 3 + d) % 4], note: NOTES[(i + d) % NOTES.length], tags: [], recap: i % 4 === 0 });
      i++;
    }));
  })();
  const dayTrades = d => TRADES.filter(t => t.day === d);
  const dayPnl = d => dayTrades(d).reduce((a, t) => a + t.pnl, 0);
  const TODAY = 20;

  /* ---------- helpers ---------- */
  const money = (n, dec) => (n < 0 ? "−" : "+") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0 });
  const plain = n => "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const px = n => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cls = n => (n < 0 ? "dn" : n > 0 ? "up" : "");
  const dlabel = d => DOW[new Date(2026, 10, d).getDay()] + " Nov " + d;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const riskPts = t => Math.abs(t.entry - t.stop);
  const rOf = t => { const r = riskPts(t) * t.qty * 2; return r ? t.pnl / r : 0; };

  const IC = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    trades: '<path d="M4 6h16M4 12h10M4 18h16"/>',
    accounts: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/>',
    weekly: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/>',
    checklist: '<path d="M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17M11 6h9M11 12h9M11 18h9"/>',
    news: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    vault: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
    import: '<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', up: '<path d="M6 14l6-6 6 6"/>', down: '<path d="M6 10l6 6 6-6"/>', chev: '<path d="M6 9l6 6 6-6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>', plus: '<path d="M12 5v14M5 12h14"/>', grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', img: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M5 17l5-4 4 3 3-2 3 3"/>'
  };
  const ic = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;

  const state = { view: "dashboard", from: "dashboard", range: "month", day: null, tid: null, edit: false, hidden: [], tFilter: "all", rFilter: "all", q: "", collapsed: [],
    unlocked: false, pin: "", folder: "all", note: null, nmode: "read", ntab: "shots", clTab: "pre", checks: {}, review: { w: "", f: "", r: "" }, cats: { Setups: true, Reviews: true } };
  const rangeDays = () => state.range === "today" ? [TODAY] : state.range === "week" ? WEEKS[0].days : state.range === "all" ? Object.keys(DAYS).map(Number) : Object.keys(DAYS).map(Number);
  const rangeTrades = () => { const ds = rangeDays(); return TRADES.filter(t => ds.includes(t.day)); };

  function stats(ts) {
    const w = ts.filter(t => t.pnl > 0), l = ts.filter(t => t.pnl < 0);
    const net = ts.reduce((a, t) => a + t.pnl, 0), gw = w.reduce((a, t) => a + t.pnl, 0), gl = Math.abs(l.reduce((a, t) => a + t.pnl, 0));
    const ds = [...new Set(ts.map(t => t.day))], dp = ds.map(dayPnl), dw = dp.filter(x => x > 0).length, best = dp.length ? Math.max(...dp) : 0;
    return { net, n: ts.length, w: w.length, l: l.length, wr: ts.length ? w.length / ts.length * 100 : 0, avgW: w.length ? gw / w.length : 0, avgL: l.length ? gl / l.length : 0,
      pf: gl ? gw / gl : null, days: ds.length, dw, dwr: ds.length ? dw / ds.length * 100 : 0, best, bestPct: net > 0 ? best / net * 100 : 0, avgR: ts.length ? ts.reduce((a, t) => a + rOf(t), 0) / ts.length : 0 };
  }
  function countUp(root) {
    root.querySelectorAll("[data-to]").forEach(el => {
      const to = parseFloat(el.dataset.to), dec = +el.dataset.dec || 0, pre = el.dataset.pre || "", suf = el.dataset.suf || "", sign = el.dataset.sign === "1";
      const fmt = v => (sign ? (v < 0 ? "−" : "+") : v < 0 ? "−" : "") + pre + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
      if (reduce) { el.textContent = fmt(to); return; }
      const t0 = performance.now(), dur = 800;
      (function f(now) { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(f); })(t0);
    });
  }
  const num = (v, o) => `<span data-to="${v}" ${Object.entries(o || {}).map(([k, x]) => `data-${k}="${x}"`).join(" ")}>${v}</span>`;
  let toastT; function toast(m) { let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); } t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }

  /* ---------- nav ---------- */
  const NAV = [["dashboard", "Dashboard"], ["trades", "Trades"], ["accounts", "Accounts"], ["weekly", "Weekly Reviews"], ["checklist", "Checklist", "dot"], ["news", "News"], ["vault", "The Vault", "vault push"], ["import", "Import"], ["settings", "Settings"]];
  const navOf = v => v === "trade" || v === "day" ? "trades" : v;
  function renderNav() {
    $("#nav").innerHTML = NAV.map(n => `<button class="nv ${n[2] || ""}" role="tab" data-nav="${n[0]}" aria-selected="${navOf(state.view) === n[0]}">${ic(n[0])}${n[1]}${n[2] === "dot" ? '<i class="dot" aria-hidden="true"></i>' : ""}</button>`).join("");
  }

  /* ---------- dashboard ---------- */
  const gauge = p => `<svg class="g" width="54" height="32" viewBox="0 0 54 32" aria-hidden="true"><path d="M4 29A23 23 0 0150 29" fill="none" stroke="#1f1f29" stroke-width="6" stroke-linecap="round"/><path d="M4 29A23 23 0 0150 29" fill="none" stroke="#3ddc97" stroke-width="6" stroke-linecap="round" pathLength="100" stroke-dasharray="${Math.max(2, Math.min(100, p))} 100"/></svg>`;
  const ring = p => `<svg class="g" width="42" height="42" viewBox="0 0 42 42" aria-hidden="true" style="top:34px"><circle cx="21" cy="21" r="16" fill="none" stroke="#1f1f29" stroke-width="6"/><circle cx="21" cy="21" r="16" fill="none" stroke="#3ddc97" stroke-width="6" pathLength="100" stroke-dasharray="${Math.min(100, p)} 100" transform="rotate(-90 21 21)"/></svg>`;
  function dashboard() {
    const s = stats(rangeTrades()), ds = rangeDays();
    const rl = { today: "Today · " + dlabel(TODAY), week: "This week · Nov 16–22", month: "Nov 2026", all: "All time" }[state.range];
    const ratio = s.avgL ? s.avgW / s.avgL : null;
    const defs = [
      ["tp", "Total P&amp;L", `<span class="${cls(s.net)}">${num(s.net, { dec: 2, pre: "$", sign: 1 })}</span>`, s.n + " trades", ""],
      ["tw", "Trade win %", num(s.wr, { dec: 1, suf: "%" }), s.w + "W · " + s.l + "L", gauge(s.wr)],
      ["aw", "Avg win / avg loss", ratio ? num(ratio, { dec: 2 }) : "–", `<span class="up">${plain(s.avgW)}</span> / <span class="dn">−${plain(s.avgL)}</span>`, `<div class="bar2"><i style="width:${s.avgW + s.avgL ? s.avgW / (s.avgW + s.avgL) * 100 : 0}%"></i></div>`],
      ["dw", "Day win %", num(s.dwr, { dec: 1, suf: "%" }), s.dw + " of " + s.days + " days", gauge(s.dwr)],
      ["pf", "Profit factor", s.pf ? num(s.pf, { dec: 2 }) : "–", "win $ / loss $", s.pf ? ring(Math.min(100, s.pf / (s.pf + 1) * 100)) : ""],
      ["bd", "Best day % of profit", num(s.bestPct, { dec: 1, suf: "%" }), "best day " + money(s.best, 2), ""]
    ];
    const cards = defs.filter(d => !state.hidden.includes(d[0])).map(d => `<div class="card"><div class="l">${d[1]}</div><div class="v">${d[2]}</div><div class="s">${d[3]}</div>${d[4]}${state.edit ? `<button class="hide" data-hide="${d[0]}" aria-label="Hide ${d[1].replace("&amp;", "and")} card">Hide</button>` : ""}</div>`).join("");
    const first = new Date(2026, 10, 1).getDay(), cells = [];
    ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach(x => cells.push(`<div class="dow">${x}</div>`)); cells.push('<div class="dow">&nbsp;</div>');
    let week = [], wi = 0;
    const flush = () => { const wp = week.reduce((a, d) => a + dayPnl(d), 0), wn = week.reduce((a, d) => a + dayTrades(d).length, 0); wi++;
      cells.push(wn ? `<div class="wk">Week ${wi}<b class="${cls(wp)}">${money(wp)}</b>${wn} trades</div>` : `<div class="wk">Week ${wi}<b>—</b></div>`); week = []; };
    for (let i = 0; i < first; i++) cells.push('<div class="day"></div>');
    for (let d = 1, col = first; d <= 30; d++, col++) {
      const ts = dayTrades(d), p = dayPnl(d), c = !ts.length ? "" : p < 0 ? "l" : p > 250 ? "W" : "w";
      const inr = ds.includes(d) && state.range !== "month" && state.range !== "all" ? " inr" : "";
      if (ts.length) { week.push(d); cells.push(`<button class="day ${c}${inr}${state.day === d ? " sel" : ""}" data-day="${d}" aria-label="${dlabel(d)}: ${money(p)}, ${ts.length} ${ts.length > 1 ? "trades" : "trade"}"><span class="n">${d}</span><span class="p">${money(p)}</span><span class="c">${ts.length} ${ts.length > 1 ? "trades" : "trade"}</span></button>`); }
      else cells.push(`<div class="day"><span class="n">${d}</span></div>`);
      if (col % 7 === 6 || d === 30) { if (col % 7 !== 6) for (let k = col % 7; k < 6; k++) cells.push('<div class="day"></div>'); flush(); }
    }
    const bySetup = SETUPS.map(n => ({ n, ts: rangeTrades().filter(t => t.setup === n) })).filter(x => x.ts.length).map(x => { const st = stats(x.ts); return `<tr><td>${x.n}</td><td>${st.n}</td><td>${Math.round(st.wr)}%</td><td>${st.avgR >= 0 ? "+" : "−"}${Math.abs(st.avgR).toFixed(2)}R</td><td class="${cls(st.net)}">${money(st.net, 1)}</td></tr>`; }).join("");
    return `<div class="vh"><h2>Dashboard</h2><div class="tools"><button class="lnk" data-share="month">Share card</button>
      <div class="seg" role="group" aria-label="Range">${["today", "week", "month", "all"].map(r => `<button data-range="${r}" aria-pressed="${state.range === r}">${r[0].toUpperCase() + r.slice(1)}</button>`).join("")}</div>
      <button class="lnk" data-edit="1">${state.edit ? "Done" : "Edit"}</button></div></div>
      <p class="cap">${rl}</p>
      <div class="cards">${cards}</div>
      <div class="grid2">
        <div class="panel"><h3><span class="t">${state.range === "week" ? "This week" : "Nov 2026"}</span><span>Monthly P/L <b class="${cls(stats(TRADES).net)}">${money(stats(TRADES).net, 2)}</b></span></h3><div class="cal">${cells.join("")}</div></div>
        <div class="panel"><h3><span class="t">Equity curve</span></h3>${curveHTML()}<div class="tip" id="tip">Move across the curve.</div>
          <h3 style="margin-top:14px"><span class="t">By setup</span></h3><div class="tbl"><table><thead><tr><th>Setup</th><th>Trades</th><th>Win%</th><th>Avg R</th><th>Net</th></tr></thead><tbody>${bySetup}</tbody></table></div></div>
      </div>
      <div class="panel" id="dayp" style="margin-top:12px">${dayPanel()}</div>`;
  }
  function curvePts() { const ts = rangeTrades(); let c = 0; const pts = [{ c: 0, l: "Start" }]; ts.forEach(t => { c += t.pnl; pts.push({ c, l: dlabel(t.day) + " " + t.time + " · " + t.side }); }); return pts; }
  const CW = 600, CH = 215, CPL = 46, CPR = 10, CPT = 12, CPB = 16;
  function curveHTML() {
    const pts = curvePts(), mn = Math.min(0, ...pts.map(p => p.c)), mx = Math.max(1, ...pts.map(p => p.c));
    const X = i => CPL + (CW - CPL - CPR) * (pts.length > 1 ? i / (pts.length - 1) : 0), Y = v => CPT + (CH - CPT - CPB) * (1 - (v - mn) / (mx - mn));
    const d = pts.map((p, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.c).toFixed(1)).join(" ");
    const lab = (v) => `<span class="ax" style="top:${(Y(v) / CH * 100).toFixed(1)}%;transform:translateY(-50%)">${v < 0 ? "−" : ""}$${Math.abs(Math.round(v)).toLocaleString("en-US")}</span>`;
    return `<div class="eq" id="eq"><svg viewBox="0 0 ${CW} ${CH}" preserveAspectRatio="none" role="img" aria-label="Equity curve of the sample account, ending at ${money(pts[pts.length - 1].c, 1)}">
      <defs><linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ddc97" stop-opacity=".28"/><stop offset="1" stop-color="#3ddc97" stop-opacity="0"/></linearGradient></defs>
      <line x1="${CPL}" x2="${CW - CPR}" y1="${Y(0)}" y2="${Y(0)}" stroke="#2b1a20" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>
      <path d="${d} L${X(pts.length - 1)} ${Y(0)} L${X(0)} ${Y(0)}Z" fill="url(#eqg)"/>
      <path class="line" pathLength="1" d="${d}" fill="none" stroke="#3ddc97" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>
      ${lab(mx)}${lab(0)}${mn < 0 ? lab(mn) : ""}<i class="hv" id="hv" style="left:${(X(pts.length - 1) / CW * 100).toFixed(2)}%;top:${(Y(pts[pts.length - 1].c) / CH * 100).toFixed(2)}%"></i></div>`;
  }
  function wireCurve() {
    const eq = $("#eq"); if (!eq) return;
    requestAnimationFrame(() => requestAnimationFrame(() => eq.classList.add("on")));
    const pts = curvePts(), mn = Math.min(0, ...pts.map(p => p.c)), mx = Math.max(1, ...pts.map(p => p.c));
    const X = i => CPL + (CW - CPL - CPR) * (pts.length > 1 ? i / (pts.length - 1) : 0), Y = v => CPT + (CH - CPT - CPB) * (1 - (v - mn) / (mx - mn));
    const move = e => { const r = eq.getBoundingClientRect(); const k = Math.max(0, Math.min(1, ((e.clientX - r.left) / r.width * CW - CPL) / (CW - CPL - CPR))); const i = Math.round(k * (pts.length - 1));
      const h = $("#hv"); h.style.left = (X(i) / CW * 100) + "%"; h.style.top = (Y(pts[i].c) / CH * 100) + "%"; $("#tip").innerHTML = esc(pts[i].l) + " · <b class='" + cls(pts[i].c) + "'>" + money(pts[i].c, 1) + "</b>"; };
    eq.addEventListener("pointermove", move); eq.addEventListener("pointerdown", move);
  }
  function dayPanel() {
    if (!state.day) return '<div class="empty">Pick a day on the calendar to see its trades.</div>';
    const ts = dayTrades(state.day);
    return `<h3 style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span>${dlabel(state.day)}</span><span>${ts.length} ${ts.length > 1 ? "trades" : "trade"} · <b class="${cls(dayPnl(state.day))}">${money(dayPnl(state.day), 1)}</b></span></h3>${tradeTable(ts)}`;
  }
  function tradeTable(ts) {
    return `<div class="tbl"><table><thead><tr><th>Time</th><th>Side</th><th>Contract</th><th>Qty</th><th>Entry</th><th>Exit</th><th>Net</th><th>R</th><th>Setup</th></tr></thead><tbody>${ts.map(t =>
      `<tr class="rowbtn" tabindex="0" role="button" data-trade="${t.id}" aria-label="Open trade, ${t.side} ${t.time}, ${money(t.pnl, 1)}"><td>${t.time}</td><td>${t.side}</td><td>MNQZ6</td><td>${t.qty}</td><td>${px(t.entry)}</td><td>${px(t.exit)}</td><td class="${cls(t.pnl)}">${money(t.pnl, 2)}</td><td class="${cls(rOf(t))}">${rOf(t) >= 0 ? "+" : "−"}${Math.abs(rOf(t)).toFixed(2)}R</td><td>${esc(t.setup)}</td></tr>`).join("")}</tbody></table></div>`;
  }

  /* ---------- trades (grouped by week) ---------- */
  const TF = { all: "All time", today: "Today", this: "This week", last: "Last week", month: "This month" };
  const RF = { all: "All", wins: "Wins", losses: "Losses", open: "Open", recap: "Recap" };
  function filtered() {
    const dset = { all: null, today: [TODAY], this: WEEKS[0].days, last: WEEKS[1].days, month: null }[state.tFilter];
    const q = state.q.trim().toLowerCase();
    return TRADES.filter(t => (!dset || dset.includes(t.day)) && (state.rFilter === "all" || (state.rFilter === "wins" && t.pnl > 0) || (state.rFilter === "losses" && t.pnl < 0) || (state.rFilter === "recap" && t.recap)) && (state.rFilter !== "open") &&
      (!q || (t.setup + " " + t.note + " MNQ").toLowerCase().includes(q)));
  }
  function trades() {
    const ts = filtered(), s = stats(ts);
    const grp = k => `<div class="seg" role="group" aria-label="${k === "t" ? "Time range" : "Result"}">${Object.entries(k === "t" ? TF : RF).map(([id, l]) => `<button data-${k}f="${id}" aria-pressed="${(k === "t" ? state.tFilter : state.rFilter) === id}">${l}</button>`).join("")}</div>`;
    const weeks = WEEKS.map((w, wi) => {
      const wts = ts.filter(t => w.days.includes(t.day)); if (!wts.length) return "";
      const wp = wts.reduce((a, t) => a + t.pnl, 0), days = [...new Set(wts.map(t => t.day))].sort((a, b) => b - a), open = !state.collapsed.includes(wi);
      const cards = days.map(d => { const dt = wts.filter(t => t.day === d), p = dt.reduce((a, t) => a + t.pnl, 0), wr = Math.round(dt.filter(t => t.pnl > 0).length / dt.length * 100);
        return `<button class="dcard" data-dayview="${d}" aria-label="${dlabel(d)}, ${money(p)}"><div class="top"><span>${dlabel(d)}</span><span class="badge ${p >= 0 ? "w" : "l"}">${p >= 0 ? "Win day" : "Loss day"}</span></div><div class="st"><span>Trades<b>${dt.length}</b></span><span>Win rate<b>${wr}%</b></span></div><div class="nt"><span>Net P&amp;L</span><b class="${cls(p)}">${money(p, 2)}</b></div></button>`; }).join("");
      return `<div class="wkhead"><button class="tg" data-wk="${wi}" aria-expanded="${open}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC.chev}</svg>${w.label}</button><span class="badge ${wp >= 0 ? "w" : "l"}">${wp >= 0 ? "Win week" : "Loss week"}</span><span class="meta">${days.length} days · ${wts.length} trades</span><span class="sp"></span><span class="tot ${cls(wp)}">${money(wp, 2)}</span>${w.due ? '<span class="badge amber">Review due</span>' : ""}</div>${open ? `<div class="daygrid">${cards}</div>` : ""}`;
    }).join("");
    return `<div class="vh"><h2>Trades</h2><button class="btn2" data-soon="Logging a trade by hand is in the extension.">${ic("plus")}Log trade</button></div>
      <div class="filters">${grp("t")}${grp("r")}<input type="search" id="q" placeholder="Search setup, notes, contract…" value="${esc(state.q)}" aria-label="Search trades"></div>
      <div class="strip"><div>Net P&amp;L<b class="${cls(s.net)}">${money(s.net, 2)}</b></div><div>Trades<b>${s.n}</b></div><div>Win rate<b>${Math.round(s.wr)}%</b></div><div>Trading days<b>${s.days}</b></div><div>Best day<b class="up">${s.n ? money(s.best, 2) : "—"}</b></div></div>
      ${weeks || '<div class="empty">No trades match these filters.</div>'}`;
  }
  function dayView() {
    const d = state.day, ts = dayTrades(d);
    return `<div class="tp-head"><button class="iconbtn" data-nav="trades" aria-label="Back to trades">${ic("back")}</button><h2>${dlabel(d)}</h2><span class="sp"></span><span class="${cls(dayPnl(d))}" style="font-family:var(--display);font-weight:650">${money(dayPnl(d), 2)}</span></div>
      <p class="tp-sub">${ts.length} ${ts.length > 1 ? "trades" : "trade"}. Click a trade to review it.</p><div class="panel">${tradeTable(ts)}</div>`;
  }

  /* ---------- trade page ---------- */
  function candles(t, small) {
    let s = (t.id * 9301 + 49297) % 233280; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const N = 46, a = 10, b = 34, sg = t.side === "Long" ? 1 : -1; let c = t.entry - sg * 5; const cs = [];
    const target = i => i <= a ? t.entry - sg * (a - i) * 0.5 : i <= b ? t.entry + (t.exit - t.entry) * ((i - a) / (b - a)) : t.exit + sg * (i - b) * 0.15;
    for (let i = 0; i < N; i++) { const o = c, edge = i === a || i === b; c = target(i) + (edge ? 0 : (rnd() - 0.5) * 3.2); cs.push({ o, c, h: Math.max(o, c) + rnd() * 1.5, l: Math.min(o, c) - rnd() * 1.5 }); }
    const all = cs.flatMap(x => [x.h, x.l]).concat([t.stop, t.target]), mn = Math.min(...all) - 1, mx = Math.max(...all) + 1, W = 560, H = 260, X = i => 14 + i * ((W - 28) / (N - 1)), Y = v => 10 + (H - 20) * (1 - (v - mn) / (mx - mn));
    const body = cs.map((x, i) => { const up = x.c >= x.o, col = up ? "#2fbf92" : "#ff5c68"; return `<line x1="${X(i)}" x2="${X(i)}" y1="${Y(x.h)}" y2="${Y(x.l)}" stroke="${col}"/><rect x="${X(i) - 4}" y="${Y(Math.max(x.o, x.c))}" width="8" height="${Math.max(1.5, Math.abs(Y(x.o) - Y(x.c)))}" fill="${col}"/>`; }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Sample chart with entry, exit, stop and target" style="background:#101520">${small ? "" : `<line x1="14" x2="${W - 14}" y1="${Y(t.stop)}" y2="${Y(t.stop)}" stroke="#ff5c68" stroke-dasharray="4 4" opacity=".7"/><line x1="14" x2="${W - 14}" y1="${Y(t.target)}" y2="${Y(t.target)}" stroke="#3ddc97" stroke-dasharray="4 4" opacity=".7"/>`}${body}${small ? "" : `<circle cx="${X(a)}" cy="${Y(t.entry)}" r="5.5" fill="#fff"/><circle cx="${X(b)}" cy="${Y(t.exit)}" r="5.5" fill="${t.pnl >= 0 ? "#3ddc97" : "#ff5c68"}"/>`}</svg>`;
  }
  const HOW = ["Followed plan", "Moved stop", "Exited early", "Exited late", "Added to loser", "Revenge trade"];
  const hm = m => Math.floor(m) + "m " + String((m * 7) % 60).padStart(2, "0") + "s";
  function tradePage() {
    const t = TRADES.find(x => x.id === state.tid), r = rOf(t), sg = t.side === "Long" ? 1 : -1, pts = (t.exit - t.entry) * sg;
    const [hh, mm] = t.time.split(":").map(Number), end = new Date(2026, 10, t.day, hh, mm + t.hold, 22);
    const stamp = (d, sec) => `Nov ${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${sec}`;
    return `<div class="tp-head"><button class="iconbtn" data-back="1" aria-label="Back">${ic("back")}</button><span class="tag ${t.side.toLowerCase()}">${t.side.toUpperCase()}</span><h2>${t.qty}× MNQ</h2><span class="sp"></span>
        <button class="lnk" data-share="trade">Share card</button><button class="iconbtn" data-step="-1" aria-label="Previous trade">${ic("up")}</button><button class="iconbtn" data-step="1" aria-label="Next trade">${ic("down")}</button><span class="kbd" aria-hidden="true">J / K</span></div>
      <p class="tp-sub">${dlabel(t.day)} · MNQZ6</p>
      <div class="tp"><div class="panel"><div class="seg" role="group" aria-label="Media"><button data-ttab="shots" aria-pressed="${state.ntab !== "vids"}">Screenshots</button><button data-ttab="vids" aria-pressed="${state.ntab === "vids"}">Videos</button></div>
          <div class="shotbox" style="margin-top:12px">${state.ntab === "vids" ? `<div class="empty" style="padding:70px 20px;text-align:center">${t.recap ? "Sample recap video: in the extension you attach or link a recording of the trade." : "No recap video yet. Attach one or link it in the extension."}</div>` : candles(t)}</div>
          <div class="drop">Paste a screenshot (Ctrl+V), drop an image, or click to browse. Not available in this demo.</div></div>
        <div style="display:grid;gap:14px"><div class="panel"><div class="rtop"><span>Net P&amp;L</span><span>R multiple</span></div><div class="rtop" style="align-items:baseline"><div class="bigpnl ${cls(t.pnl)}" style="margin:2px 0 14px">${money(t.pnl, 2)}</div><b id="rv" class="${cls(r)}" style="font-family:var(--display);font-size:1.3rem;color:#fff">${r >= 0 ? "+" : "−"}${Math.abs(r).toFixed(2)}R</b></div>
            <div class="kv2"><div><span>Entered</span><b>${stamp(new Date(2026, 10, t.day, hh, mm, 55), "55")}</b></div><div><span>Exited</span><b>${stamp(end, "22")}</b></div><div><span>Hold</span><b>${hm(t.hold)}</b></div><div><span>Points / contract</span><b class="${cls(pts)}">${pts >= 0 ? "+" : "−"}${Math.abs(pts).toFixed(2)}</b></div></div></div>
          <div class="panel"><h3><span class="t">Review</span></h3><div class="two"><div><label class="lab" style="margin-top:0" for="rsetup">Setup</label><input type="text" id="rsetup" value="${esc(t.setup)}" placeholder="e.g. Liquidity sweep"></div><div><label class="lab" style="margin-top:0" for="rstop">Initial stop price</label><input type="text" id="rstop" inputmode="decimal" value="${t.stop.toFixed(2)}" placeholder="enter to get R"></div></div>
            <p class="hint2">Enter your original stop to get R.</p><span class="lab">How did it go?</span><div class="chips" id="how">${HOW.map(h => `<button class="chipb" data-how="${h}" aria-pressed="${t.tags.includes(h)}">${h}</button>`).join("")}</div>
            <label class="lab" for="mnote">Notes</label><textarea id="mnote" maxlength="400" placeholder="Why you took it, what you saw, what you would change…"></textarea></div></div></div>`;
  }
  function wireTrade() {
    const t = TRADES.find(x => x.id === state.tid); if (!t) return;
    $("#mnote").value = t.note; $("#mnote").addEventListener("input", e => { t.note = e.target.value; });
    $("#rsetup").addEventListener("input", e => { t.setup = e.target.value; });
    $("#rstop").addEventListener("input", e => { const v = parseFloat(e.target.value), el = $("#rv"); if (!isFinite(v) || v === t.entry) { el.textContent = "—"; el.className = ""; return; } const old = t.stop; t.stop = v; const r = rOf(t); t.stop = old; el.textContent = (r >= 0 ? "+" : "−") + Math.abs(r).toFixed(2) + "R"; el.className = cls(r); });
  }
  const openTrade = (id, from) => { state.from = from || state.view; state.tid = id; state.view = "trade"; state.ntab = "shots"; render(); };

  /* ---------- vault ---------- */
  const TEMPLATES = { "Setup playbook": "## Setup: name it\n### When it works\n- \n### Entry\n- \n### Stop\n- \n### Target\n- \n### When to skip it\n- ", "Pre-market plan": "## Pre-market plan\n### Bias\n- \n### Levels\n- \n### News\n- \n### Max loss today\n- ", "Post-session review": "## Post-session review\n### What went well\n- \n### What to fix\n- \n### One rule for tomorrow\n- " };
  const NOTE_LIST = [
    { id: 1, folder: "Playbook", title: "My rules", pin: true, body: "## My rules\n### Before the first order\n- Tick the pre-session checklist.\n- Know the max loss for the day.\n### While trading\n- Trade the plan. Size down after two losses.\n- Never move a stop further away.\n### Done for the day\n- Stop at the daily limit. Write the review." },
    { id: 2, folder: "Breakout", title: "Opening range breakout", body: "## Opening range breakout\n### When it works\n- Clean first 15 minutes, volume rising.\n### Entry\n- Close above the range high on the 1m.\n### Stop\n- Back inside the range.\n### Target\n- 2R, then trail.\n### When to skip it\n- Red-folder news inside 30 minutes." },
    { id: 3, folder: "Pullback", title: "First pullback to the 9 EMA", body: "## First pullback\n### When it works\n- Strong trend day, higher timeframe agrees.\n### Entry\n- Rejection candle at the moving average.\n### Stop\n- Below the pullback low.\n### When to skip it\n- Choppy, overlapping candles." },
    { id: 4, folder: "Weekly", title: "Week of Nov 9", body: "## Week of Nov 9\n### What went well\n- Waited for confirmation on the big day.\n### What to fix\n- Two early entries.\n### One rule for next week\n- No entry before the candle closes." }
  ];
  const FOLDERS = [{ cat: "Setups", items: ["Breakout", "Pullback"] }, { cat: "Reviews", items: ["Weekly", "Post-session"] }, { cat: null, items: ["Playbook"] }];
  const nextNote = { n: 5 };
  function render_md(b) { let out = "", ul = false; b.split("\n").forEach(l => { if (/^- /.test(l)) { if (!ul) { out += "<ul>"; ul = true; } out += `<li>${esc(l.slice(2)) || "&nbsp;"}</li>`; } else { if (ul) { out += "</ul>"; ul = false; } if (/^## /.test(l)) out += `<h3>${esc(l.slice(3))}</h3>`; else if (/^### /.test(l)) out += `<h4>${esc(l.slice(4))}</h4>`; else if (l.trim()) out += `<p>${esc(l)}</p>`; } }); return out + (ul ? "</ul>" : ""); }
  function vault() {
    if (!state.unlocked) {
      return `<div class="vh"><h2>The Vault</h2></div><div class="lock"><h3>Enter your PIN</h3><p>Sample PIN: 1 2 3 4. The Vault shows nothing from your journal until it is unlocked.</p>
        <div class="dots" id="dots" role="img" aria-label="${state.pin.length} of 4 digits entered">${[0, 1, 2, 3].map(i => `<i class="${i < state.pin.length ? "f" : ""}"></i>`).join("")}</div>
        <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-pin="${n}" aria-label="${n}">${n}</button>`).join("")}<span></span><button data-pin="0" aria-label="0">0</button><button data-pin="del" aria-label="Delete">⌫</button></div><p id="pinmsg" style="margin-top:14px;min-height:1.4em" aria-live="polite"></p></div>`;
    }
    const count = f => NOTE_LIST.filter(n => n.folder === f).length;
    const side = `<div class="vside"><h4>Folders <span style="display:flex;gap:6px"><button class="iconbtn" style="width:24px;height:24px" data-soon="Folders and categories can be added in the extension." aria-label="Add category">${ic("grid")}</button><button class="iconbtn" style="width:24px;height:24px" data-soon="Folders and categories can be added in the extension." aria-label="Add folder">${ic("plus")}</button></span></h4>
      <button class="fo" data-folder="all" aria-pressed="${state.folder === "all"}">Everything<em>${NOTE_LIST.length}</em></button>
      ${FOLDERS.map(g => (g.cat ? `<div class="cat">${g.cat}</div>` : "") + g.items.map(f => `<button class="fo ${g.cat ? "ind" : ""}" data-folder="${f}" aria-pressed="${state.folder === f}">${f}<em>${count(f)}</em></button>`).join("")).join("")}</div>`;
    let main;
    const n = NOTE_LIST.find(x => x.id === state.note);
    if (n) {
      main = `<div class="vmain"><div style="display:flex;justify-content:space-between;align-items:center"><button class="lnk" data-notes="1">← ${state.folder === "all" ? "Everything" : state.folder}</button><span class="chips"><button class="iconbtn" data-soon="Pin and delete work in the extension." aria-label="Pin note">📌</button></span></div>
        <div class="ntitle">${esc(n.title)}</div><div class="nmeta">Note · edited Today</div>
        <div class="nlay"><div><div style="display:flex;justify-content:flex-end;margin-bottom:10px"><div class="seg" role="group" aria-label="Mode"><button data-nmode="write" aria-pressed="${state.nmode === "write"}">Write</button><button data-nmode="read" aria-pressed="${state.nmode === "read"}">Read</button></div></div>
          <div class="read">${state.nmode === "write" ? `<textarea id="nbody" aria-label="Note text"></textarea>` : render_md(n.body)}</div></div>
          <div class="sidep"><div class="seg" role="group" aria-label="Media"><button data-ntab="shots" aria-pressed="${state.ntab !== "vids"}">Screenshots <span style="color:#ff8f98">1</span></button><button data-ntab="vids" aria-pressed="${state.ntab === "vids"}">Videos</button></div>
            <div class="shotbox" style="margin-top:12px">${state.ntab === "vids" ? '<div class="empty" style="padding:60px 16px;text-align:center">No videos yet. Vault videos are included in the Vault backup.</div>' : candles(TRADES[11])}</div>
            <div class="thumbs"><div class="thumb">${candles(TRADES[11], true)}</div><button class="btn2" data-soon="Adding screenshots is available in the extension.">${ic("plus")}Add screenshot</button></div></div></div></div>`;
    } else {
      const list = NOTE_LIST.filter(x => state.folder === "all" || x.folder === state.folder).sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0));
      main = `<div class="vmain"><div class="rowc"><div><b style="font-size:1.1rem">${state.folder === "all" ? "Everything" : state.folder}</b><br><span>${list.length} ${list.length === 1 ? "note" : "notes"}</span></div>
        <label style="display:flex;gap:8px;align-items:center;font-size:12.5px;color:var(--a-muted)">New from template <select id="tpl" aria-label="New note from template" style="width:auto"><option value="">Choose…</option>${Object.keys(TEMPLATES).map(k => `<option>${k}</option>`).join("")}</select></label></div>
        <div class="notes">${list.map(x => `<button class="nc" data-note="${x.id}"><b>${esc(x.title)}${x.pin ? '<em class="pin" style="font-style:normal">Pinned</em>' : ""}</b><span>${esc(x.body.split("\n").filter(l => l && !l.startsWith("#")).map(l => l.replace(/^- /, "")).join(" · ").slice(0, 110)) || "Empty note"}</span></button>`).join("") || '<div class="empty">Nothing in this folder yet.</div>'}</div></div>`;
    }
    return `<div class="vbar"><button class="lnk" data-nav="dashboard">← Journal</button><h2>The Vault</h2><span class="sp"></span><button class="iconbtn" data-lock="1" aria-label="Lock the Vault">${ic("lock")}</button></div><div class="vl">${side}${main}</div>`;
  }

  /* ---------- checklist, reviews, accounts, news, import, settings ---------- */
  const CL = { pre: [["Context", [["Checked the news calendar; noted red-folder events and their times", 1], ["Marked higher-timeframe levels and liquidity", 1], ["Wrote a one-line bias for the session (long / short / none) and why", 1]]], ["Risk", [["Know today's max loss and max trades before the first order", 1], ["Account and size confirmed (right account, right contract month)", 1]]], ["Mindset", [["Rested and fed; no tilt carried over from the last session", 0], ["Decided what a no-trade day looks like for me", 0]]]],
    intr: [["Before you click", [["Is this one of my setups?", 1], ["Stop is placed before size is chosen", 1], ["Risk is inside the daily limit", 1], ["Not chasing; the level is still there", 0]]]] };
  function checklist() {
    const key = state.clTab, groups = CL[key], all = groups.flatMap(g => g[1].map(i => i)), done = all.filter((i, idx) => state.checks[key + idx]).length;
    const req = all.filter(i => i[1]).length, reqDone = all.filter((i, idx) => i[1] && state.checks[key + idx]).length; let idx = 0;
    return `<div class="vh"><h2>Checklist</h2><div class="tools"><div class="seg" role="group" aria-label="List"><button data-cl="pre" aria-pressed="${key === "pre"}">Pre-session</button><button data-cl="intr" aria-pressed="${key === "intr"}">In-trade</button></div><button class="lnk" data-soon="Editing the list is available in the extension.">Edit list</button></div></div>
      <div class="panel"><div class="rowc"><b style="font-size:13px;font-weight:600;color:var(--a-muted)">${key === "pre" ? "Pre-session" : "In-trade"} · Fri Nov 20</b><span>${reqDone}/${req} required · ${done}/${all.length} total</span></div><div class="progress"><i style="width:${all.length ? done / all.length * 100 : 0}%"></i></div></div>
      <div class="panel cl" style="margin-top:14px;padding:18px 20px">${groups.map(g => `<h4>${g[0]}</h4>${g[1].map(i => { const k = key + (idx++); return `<label class="ck"><input type="checkbox" data-ck="${k}" ${state.checks[k] ? "checked" : ""}> <span>${esc(i[0])}${i[1] ? " <small>req</small>" : ""}</span></label>`; }).join("")}`).join("")}</div>
      <div class="rowc" style="margin-top:12px"><span class="warnline">Finish the required items before your first order. Clears every trading day.</span><button class="lnk" data-reset="1">Reset</button></div>`;
  }
  function weekly() {
    return `<div class="vh"><h2>Weekly Reviews</h2></div><div class="list">${WEEKS.map((w, i) => { const p = w.days.reduce((a, d) => a + dayPnl(d), 0); return `<div class="panel rowc"><div><b>${w.label}</b><br><span>${w.days.reduce((a, d) => a + dayTrades(d).length, 0)} trades · <b class="${cls(p)}" style="font-size:13px">${money(p, 2)}</b></span></div>${w.cur ? '<span class="badge amber">This week</span>' : w.due ? '<span class="badge amber">Review due</span>' : '<span class="badge w">Reviewed</span>'}</div>`; }).join("")}</div>
      <div class="panel" style="margin-top:14px"><h3><span class="t">Review: Nov 9 – Nov 15</span><span style="color:var(--a-muted)">Streak: 1 week</span></h3>
        <label class="lab" style="margin-top:0" for="rw">What went well?</label><textarea id="rw" placeholder="One or two things you want to repeat">${esc(state.review.w)}</textarea>
        <label class="lab" for="rf">What do you fix next?</label><textarea id="rf" placeholder="The habit that cost you the most">${esc(state.review.f)}</textarea>
        <label class="lab" for="rr">One rule for next week</label><input type="text" id="rr" value="${esc(state.review.r)}" placeholder="Short enough to remember mid-trade">
        <div class="mrow"><button class="btn2" data-soon="Saved in this page only. The extension keeps reviews on your computer.">Save review</button></div></div>`;
  }
  const accounts = () => `<div class="vh"><h2>Accounts</h2><button class="btn2" data-soon="Adding accounts is available in the extension.">${ic("plus")}Add account</button></div><div class="list">${[["Evaluation 50K", 1203, 16], ["Live micro", 545, 11]].map(a => `<div class="panel rowc"><div><b>${a[0]}</b><br><span>${a[2]} trades</span></div><b class="up" style="font-size:1.4rem">${money(a[1], 2)}</b></div>`).join("")}</div><p class="hint2" style="margin-top:12px">Sample accounts. Each account keeps its own results, and the dashboard can show one or all.</p>`;
  const news = () => `<div class="vh"><h2>News</h2></div><div class="panel"><h3><span class="t">Fri Nov 20 · sample events</span></h3><div class="tbl"><table><thead><tr><th>Time (ET)</th><th>Impact</th><th>Event</th></tr></thead><tbody>${[["08:30", "h", "Core inflation report"], ["09:45", "m", "Business activity survey"], ["10:00", "m", "Consumer sentiment"], ["13:00", "h", "Central bank speaker"], ["14:00", "m", "Meeting minutes"]].map(e => `<tr><td>${e[0]}</td><td><i class="impact ${e[1]}"></i>${e[1] === "h" ? "High" : "Medium"}</td><td>${e[2]}</td></tr>`).join("")}</tbody></table></div><p class="hint2">Made-up list for the demo. In the extension the checklist reminds you to note red-folder times.</p></div>`;
  const imp = () => `<div class="vh"><h2>Import</h2></div><div class="imp"><h3>Drop a Tradovate Orders CSV here</h3><p>Entries and exits are paired into trades for you. Your file never leaves your browser.</p><p style="margin-top:14px"><button class="btn2" data-soon="The demo makes no file access. Import is in the extension.">Choose file</button></p></div>`;
  const settings = () => `<div class="vh"><h2>Settings</h2></div><div class="panel"><div class="two"><div><label class="lab" style="margin-top:0" for="s1">Time zone</label><input type="text" id="s1" value="America/New_York"></div><div><label class="lab" style="margin-top:0" for="s2">Fee per contract (round trip)</label><input type="text" id="s2" value="$1.00"></div><div><label class="lab" for="s3">Max loss per day</label><input type="text" id="s3" value="$300"></div><div><label class="lab" for="s4">Max trades per day</label><input type="text" id="s4" value="6"></div></div><p class="hint2">Sample values. The extension also backs up to a folder on your computer.</p></div>`;

  /* ---------- share card ---------- */
  function shareCard(kind) {
    const t = kind === "trade" ? TRADES.find(x => x.id === state.tid) : null, s = stats(TRADES);
    const brand = '<div class="br"><svg viewBox="0 0 1024 1024" aria-hidden="true"><circle cx="512" cy="512" r="340" fill="none" stroke="#e0102a" stroke-width="64"/><path d="M313 140 L512 690 L711 140" fill="none" stroke="#f3eeee" stroke-width="64" stroke-linecap="round" stroke-linejoin="round"/></svg>THE VOID</div>';
    const body = t ? `<div class="lbl">${t.side} ${t.qty}× MNQ · ${dlabel(t.day)}</div><div class="big ${cls(t.pnl)}">${money(t.pnl, 2)}</div><div class="row"><div>R multiple<b>${rOf(t) >= 0 ? "+" : "−"}${Math.abs(rOf(t)).toFixed(2)}R</b></div><div>Setup<b>${esc(t.setup)}</b></div></div>`
      : `<div class="lbl">Nov 2026</div><div class="big ${cls(s.net)}">${money(s.net, 2)}</div><div class="row"><div>Win rate<b>${Math.round(s.wr)}%</b></div><div>Trades<b>${s.n}</b></div><div>Profit factor<b>${s.pf.toFixed(2)}</b></div></div>`;
    const box = $("#modal-box"); box.innerHTML = `<h2 id="m-title" style="font-family:var(--display);font-size:1.1rem;margin-bottom:12px">Share card</h2><div class="sc">${brand}${body}<div class="fn">Sample data from the demo. Not a record of anyone's results.</div></div><div class="mrow"><button class="btn2" data-soon="Saving the image is available in the extension.">Save image</button><button class="btn2" data-close="1">Close</button></div>`;
    lastFocus = document.activeElement; $("#modal").hidden = false; document.documentElement.style.overflow = "hidden"; box.focus();
  }
  let lastFocus = null;
  function closeModal() { $("#modal").hidden = true; document.documentElement.style.overflow = ""; if (lastFocus && document.contains(lastFocus)) lastFocus.focus(); }

  /* ---------- render ---------- */
  const HINT = { dashboard: "Click any day on the calendar, switch the range, or press Share card.", trades: "Open a day, then a trade. Filter and search work too.", day: "Click a trade to review it.", trade: "Pick how it went, add notes, change the stop to see R.", vault: "Try the PIN pad. The sample PIN is 1 2 3 4.", checklist: "Tick items. The extension clears the list every trading day." };
  function render(keepFocus) {
    renderNav();
    const v = state.view, el = $("#view"), pane = $(".main-pane"), keep = keepFocus ? pane.scrollTop : 0;
    const V = { dashboard, trades, day: dayView, trade: tradePage, vault, checklist, weekly, accounts, news, import: imp, settings };
    el.innerHTML = V[v]();
    $("#hint").textContent = HINT[v] || "Everything here runs on sample data.";
    if (v === "dashboard") { countUp(el); wireCurve(); }
    if (v === "trade") wireTrade();
    if (v === "vault" && state.unlocked && state.note && state.nmode === "write") { const n = NOTE_LIST.find(x => x.id === state.note); const ta = $("#nbody"); if (ta) { ta.value = n.body; ta.addEventListener("input", e => { n.body = e.target.value; }); } }
    pane.scrollTop = keep;
    if (!keepFocus) { el.focus({ preventScroll: true }); pane.scrollTop = 0; }
  }
  const go = v => { state.view = v; render(); };

  /* ---------- events ---------- */
  document.addEventListener("click", e => {
    const q = s => e.target.closest(s); let b;
    if ((b = q("[data-nav]"))) go(b.dataset.nav);
    else if ((b = q("[data-range]"))) { state.range = b.dataset.range; render(true); $('[data-range="' + state.range + '"]').focus(); }
    else if ((b = q("[data-edit]"))) { state.edit = !state.edit; if (!state.edit) state.hidden = state.hidden; render(true); }
    else if ((b = q("[data-hide]"))) { state.hidden.push(b.dataset.hide); render(true); }
    else if ((b = q("[data-share]"))) shareCard(b.dataset.share);
    else if ((b = q("[data-day]"))) { state.day = +b.dataset.day; render(true); $('[data-day="' + state.day + '"]').focus(); $("#dayp").scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }); }
    else if ((b = q("[data-dayview]"))) { state.day = +b.dataset.dayview; state.view = "day"; render(); }
    else if ((b = q("[data-trade]"))) openTrade(+b.dataset.trade);
    else if ((b = q("[data-back]"))) { state.view = state.from === "day" ? "day" : state.from === "dashboard" ? "dashboard" : "trades"; render(); }
    else if ((b = q("[data-step]"))) { const ids = TRADES.map(t => t.id), i = ids.indexOf(state.tid) + +b.dataset.step; if (i >= 0 && i < ids.length) { state.tid = ids[i]; render(true); } }
    else if ((b = q("[data-ttab]"))) { state.ntab = b.dataset.ttab; render(true); }
    else if ((b = q("[data-how]"))) { const t = TRADES.find(x => x.id === state.tid), h = b.dataset.how, i = t.tags.indexOf(h); if (i < 0) t.tags.push(h); else t.tags.splice(i, 1); b.setAttribute("aria-pressed", i < 0); }
    else if ((b = q("[data-tf]"))) { state.tFilter = b.dataset.tf; render(true); $('[data-tf="' + state.tFilter + '"]').focus(); }
    else if ((b = q("[data-rf]"))) { state.rFilter = b.dataset.rf; render(true); $('[data-rf="' + state.rFilter + '"]').focus(); }
    else if ((b = q("[data-wk]"))) { const i = +b.dataset.wk, k = state.collapsed.indexOf(i); if (k < 0) state.collapsed.push(i); else state.collapsed.splice(k, 1); render(true); $('[data-wk="' + i + '"]').focus(); }
    else if ((b = q("[data-soon]"))) toast(b.dataset.soon);
    else if ((b = q("[data-close]")) || e.target.id === "modal") closeModal();
    else if ((b = q("[data-pin]"))) pin(b.dataset.pin);
    else if ((b = q("[data-lock]"))) { state.unlocked = false; state.pin = ""; state.note = null; render(); }
    else if ((b = q("[data-folder]"))) { state.folder = b.dataset.folder; state.note = null; render(true); $('[data-folder="' + state.folder + '"]').focus(); }
    else if ((b = q("[data-note]"))) { state.note = +b.dataset.note; state.nmode = "read"; state.ntab = "shots"; render(); }
    else if ((b = q("[data-notes]"))) { state.note = null; render(); }
    else if ((b = q("[data-nmode]"))) { state.nmode = b.dataset.nmode; render(true); }
    else if ((b = q("[data-ntab]"))) { state.ntab = b.dataset.ntab; render(true); }
    else if ((b = q("[data-cl]"))) { state.clTab = b.dataset.cl; render(true); }
    else if ((b = q("[data-reset]"))) { state.checks = {}; render(true); }
  });
  document.addEventListener("change", e => {
    if (e.target.matches("[data-ck]")) { state.checks[e.target.dataset.ck] = e.target.checked; render(true); const n = $('[data-ck="' + e.target.dataset.ck + '"]'); if (n) n.focus(); }
    else if (e.target.id === "tpl" && e.target.value) { const n = { id: nextNote.n++, folder: state.folder === "all" ? "Playbook" : state.folder, title: e.target.value, body: TEMPLATES[e.target.value] }; NOTE_LIST.push(n); state.note = n.id; state.nmode = "write"; render(); toast("Note added from the template. It lives in this page only."); }
  });
  document.addEventListener("input", e => {
    if (e.target.id === "q") { state.q = e.target.value; const pos = e.target.selectionStart; render(true); const i = $("#q"); i.focus(); i.setSelectionRange(pos, pos); }
    else if (e.target.id === "rw") state.review.w = e.target.value; else if (e.target.id === "rf") state.review.f = e.target.value; else if (e.target.id === "rr") state.review.r = e.target.value;
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !$("#modal").hidden) closeModal();
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("tr[data-trade]")) { e.preventDefault(); openTrade(+e.target.dataset.trade); }
    if (!$("#modal").hidden && e.key === "Tab") { const f = [...$("#modal-box").querySelectorAll("button")]; if (!f.length) return; const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    const typing = e.target.matches && e.target.matches("input,textarea,select");
    if (state.view === "trade" && !typing && $("#modal").hidden && (e.key === "j" || e.key === "k")) { const ids = TRADES.map(t => t.id), i = ids.indexOf(state.tid) + (e.key === "j" ? 1 : -1); if (i >= 0 && i < ids.length) { state.tid = ids[i]; render(true); } }
    if (state.view === "vault" && !state.unlocked && $("#modal").hidden && /^[0-9]$/.test(e.key)) pin(e.key);
    if (state.view === "vault" && !state.unlocked && $("#modal").hidden && e.key === "Backspace") pin("del");
  });
  function pin(k) {
    if (k === "del") state.pin = state.pin.slice(0, -1); else if (state.pin.length < 4) state.pin += k;
    $("#dots").innerHTML = [0, 1, 2, 3].map(i => `<i class="${i < state.pin.length ? "f" : ""}"></i>`).join("");
    if (state.pin.length === 4) {
      if (state.pin === "1234") { state.unlocked = true; state.pin = ""; setTimeout(() => render(), 180); }
      else { $("#dots").classList.add("bad"); $("#pinmsg").textContent = "Wrong PIN. The sample PIN is 1 2 3 4."; setTimeout(() => { state.pin = ""; if ($("#dots")) { $("#dots").classList.remove("bad"); $("#dots").innerHTML = "<i></i><i></i><i></i><i></i>"; } }, 450); }
    }
  }
  render(true);
})();
