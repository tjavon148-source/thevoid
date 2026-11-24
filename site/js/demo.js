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
  const TRADES = [];
  (function build() {
    let i = 0;
    Object.keys(DAYS).map(Number).forEach(d => DAYS[d].forEach((pnl, k) => {
      const qty = 2, stop = STOPS[i], side = (i * 7 + d) % 3 === 0 ? "Short" : "Long";
      const entry = 27180 + ((d * 37 + k * 53) % 420) + 0.25 * ((i * 3) % 4);
      const pts = pnl / (qty * 2), exit = side === "Long" ? entry + pts : entry - pts;
      const sg = side === "Long" ? 1 : -1;
      TRADES.push({ id: i + 1, day: d, date: "2026-11-" + String(d).padStart(2, "0"), time: TIMES[(i * 5 + k) % TIMES.length], side, qty, entry, exit, stop: entry - sg * stop, target: entry + sg * stop * 2, pnl, risk: stop * qty * 2, r: pnl / (stop * qty * 2), setup: SETUPS[(i * 3 + d) % 4], note: NOTES[(i + d) % NOTES.length] });
      i++;
    }));
  })();
  const dayTrades = d => TRADES.filter(t => t.day === d);
  const dayPnl = d => dayTrades(d).reduce((a, t) => a + t.pnl, 0);
  const TODAY = 20, WEEK = [16, 17, 18, 19, 20];

  /* ---------- helpers ---------- */
  const money = (n, dec) => (n < 0 ? "−" : "+") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0 });
  const plain = n => "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const px = n => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cls = n => (n < 0 ? "dn" : n > 0 ? "up" : "");
  const dlabel = d => DOW[new Date(2026, 10, d).getDay()] + " Nov " + d;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const state = { view: "dashboard", range: "month", day: null, filter: null, unlocked: false, pin: "", folder: 0 };
  const rangeDays = () => state.range === "today" ? [TODAY] : state.range === "week" ? WEEK : Object.keys(DAYS).map(Number);
  const rangeTrades = () => { const ds = rangeDays(); return TRADES.filter(t => ds.includes(t.day)); };

  function stats(ts) {
    const w = ts.filter(t => t.pnl > 0), l = ts.filter(t => t.pnl < 0);
    const net = ts.reduce((a, t) => a + t.pnl, 0), gw = w.reduce((a, t) => a + t.pnl, 0), gl = Math.abs(l.reduce((a, t) => a + t.pnl, 0));
    const ds = [...new Set(ts.map(t => t.day))], dp = ds.map(dayPnl), dw = dp.filter(x => x > 0).length;
    const best = dp.length ? Math.max(...dp) : 0;
    return { net, n: ts.length, w: w.length, l: l.length, wr: ts.length ? w.length / ts.length * 100 : 0, avgW: w.length ? gw / w.length : 0, avgL: l.length ? gl / l.length : 0,
      pf: gl ? gw / gl : null, days: ds.length, dw, dwr: ds.length ? dw / ds.length * 100 : 0, best, bestPct: net > 0 ? best / net * 100 : 0, avgR: ts.length ? ts.reduce((a, t) => a + t.r, 0) / ts.length : 0 };
  }

  /* numbers count up */
  function countUp(root) {
    root.querySelectorAll("[data-to]").forEach(el => {
      const to = parseFloat(el.dataset.to), dec = +el.dataset.dec || 0, pre = el.dataset.pre || "", suf = el.dataset.suf || "", sign = el.dataset.sign === "1";
      const fmt = v => (sign ? (v < 0 ? "−" : "+") : v < 0 ? "−" : "") + pre + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
      if (reduce) { el.textContent = fmt(to); return; }
      const t0 = performance.now(), dur = 900;
      (function f(now) { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(f); })(t0);
    });
  }
  const num = (v, o) => `<span data-to="${v}" ${Object.entries(o || {}).map(([k, x]) => `data-${k}="${x}"`).join(" ")}>${v}</span>`;

  /* ---------- nav ---------- */
  const NAV = [["cockpit", "Cockpit"], ["dashboard", "Dashboard"], ["trades", "Trades"], ["accounts", "Accounts"], ["weekly", "Weekly reviews"], ["checklist", "Checklist"], ["sep"], ["vault", "The Vault", "gold"], ["import", "Import"], ["settings", "Settings"]];
  const SOON = {
    cockpit: ["Cockpit", "A big session clock with your trading windows, today's result, daily limits and a quick mood check-in."],
    accounts: ["Accounts", "Track several accounts side by side, each with its own results."],
    weekly: ["Weekly reviews", "Write the review, set one rule for next week, and watch your streak."],
    checklist: ["Checklist", "A pre-trade checklist you tick through before you click."],
    import: ["Import", "Drop in a Tradovate Orders CSV. Entries and exits are paired into trades for you."],
    settings: ["Settings", "Time zone, fee per contract, risk limits and backups to a folder on your computer."]
  };
  function renderNav() {
    $("#nav").innerHTML = NAV.map(n => n[0] === "sep" ? '<div class="sep"></div>' :
      `<button class="nv ${n[2] || ""}" role="tab" data-nav="${n[0]}" aria-selected="${state.view === n[0]}">${n[1]}</button>`).join("");
  }

  /* ---------- dashboard ---------- */
  function dashboard() {
    const s = stats(rangeTrades()), ds = rangeDays();
    const rl = { today: "Today · " + dlabel(TODAY), week: "This week · Nov 16–20", month: "Nov 2026" }[state.range];
    const card = (l, v, sub, extra) => `<div class="card"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${sub}</div>${extra || ""}</div>`;
    const ratio = s.avgL ? s.avgW / s.avgL : null;
    const cards = [
      card("TOTAL P&amp;L", `<span class="${cls(s.net)}">${num(s.net, { dec: 2, pre: "$", sign: 1 })}</span>`, s.n + " trades"),
      card("TRADE WIN %", num(s.wr, { dec: 1, suf: "%" }), s.w + "W · " + s.l + "L"),
      card("AVG WIN / AVG LOSS", ratio ? num(ratio, { dec: 2 }) : "–", plain(s.avgW) + " / −" + plain(s.avgL), `<div class="bar2"><i style="width:${s.avgW + s.avgL ? s.avgW / (s.avgW + s.avgL) * 100 : 0}%"></i></div>`),
      card("DAY WIN %", num(s.dwr, { dec: 1, suf: "%" }), s.dw + " of " + s.days + " days"),
      card("PROFIT FACTOR", s.pf ? num(s.pf, { dec: 2 }) : "–", "win $ / loss $"),
      card("BEST DAY % OF PROFIT", num(s.bestPct, { dec: 1, suf: "%" }), "best day " + money(s.best, 1))
    ].join("");
    const first = new Date(2026, 10, 1).getDay(), cells = [];
    ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach(x => cells.push(`<div class="dow">${x}</div>`)); cells.push('<div class="dow wkh">Week</div>');
    let week = [], wi = 0, rows = "";
    const flush = () => { const wp = week.reduce((a, d) => a + dayPnl(d), 0), wn = week.reduce((a, d) => a + dayTrades(d).length, 0); wi++;
      cells.push(wn ? `<div class="wk">Week ${wi}<b class="${cls(wp)}">${money(wp)}</b>${wn} trades</div>` : `<div class="wk">Week ${wi}<b>–</b></div>`); week = []; };
    for (let i = 0; i < first; i++) cells.push('<div class="day"></div>');
    for (let d = 1, col = first; d <= 30; d++, col++) {
      const ts = dayTrades(d), p = dayPnl(d), cl = !ts.length ? "" : p < 0 ? "l" : p > 250 ? "W" : "w";
      const inr = ds.includes(d) && state.range !== "month" ? " inr" : "";
      if (ts.length) { week.push(d); cells.push(`<button class="day ${cl}${inr}${state.day === d ? " sel" : ""}" data-day="${d}" aria-label="${dlabel(d)}: ${money(p)}, ${ts.length} ${ts.length > 1 ? "trades" : "trade"}"><span class="n">${d}</span><span class="p">${money(p)}</span><span class="c">${ts.length} ${ts.length > 1 ? "trades" : "trade"}</span></button>`); }
      else cells.push(`<div class="day"><span class="n">${d}</span></div>`);
      if (col % 7 === 6 || d === 30) { if (col % 7 !== 6) for (let k = col % 7; k < 6; k++) cells.push('<div class="day"></div>'); flush(); }
    }
    const bySetup = SETUPS.map(n => ({ n, ts: rangeTrades().filter(t => t.setup === n) })).filter(x => x.ts.length).map(x => { const st = stats(x.ts); return `<tr><td>${x.n}</td><td>${st.n}</td><td>${Math.round(st.wr)}%</td><td>${st.avgR >= 0 ? "+" : "−"}${Math.abs(st.avgR).toFixed(2)}R</td><td class="${cls(st.net)}">${money(st.net, 1)}</td></tr>`; }).join("");
    return `<div class="vh"><h2>Dashboard</h2><div><div class="seg" role="group" aria-label="Range">${["today", "week", "month"].map(r => `<button data-range="${r}" aria-pressed="${state.range === r}">${r[0].toUpperCase() + r.slice(1)}</button>`).join("")}</div></div></div>
      <p class="cap" style="margin:-6px 0 12px">${rl}</p>
      <div class="cards">${cards}</div>
      <div class="grid2">
        <div class="panel"><h3><span>${state.range === "month" ? "NOV 2026" : "NOV 2026 · " + rl.split(" ·")[0].toUpperCase()}</span><span class="${cls(s.net)}">MONTHLY P/L ${money(stats(TRADES).net, 1)}</span></h3><div class="cal">${cells.join("")}</div></div>
        <div class="panel"><h3><span>EQUITY CURVE</span></h3>${curveSVG()}<div class="tip" id="tip">Move across the curve.</div>
          <h3 style="margin-top:14px"><span>BY SETUP</span></h3><div class="tbl"><table><thead><tr><th>SETUP</th><th>TRADES</th><th>WIN%</th><th>AVG R</th><th>NET</th></tr></thead><tbody>${bySetup}</tbody></table></div></div>
      </div>
      <div class="panel dayp" id="dayp">${dayPanel()}</div>`;
  }
  function curvePts() {
    const ts = rangeTrades(); let c = 0; const pts = [{ c: 0, l: "Start" }];
    ts.forEach(t => { c += t.pnl; pts.push({ c, l: dlabel(t.day) + " " + t.time + " · " + t.side }); });
    return pts;
  }
  function curveSVG() {
    const pts = curvePts(), W = 600, H = 170, pl = 8, pr = 8, pt = 14, pb = 18;
    const mn = Math.min(0, ...pts.map(p => p.c)), mx = Math.max(1, ...pts.map(p => p.c));
    const X = i => pl + (W - pl - pr) * (pts.length > 1 ? i / (pts.length - 1) : 0), Y = v => pt + (H - pt - pb) * (1 - (v - mn) / (mx - mn));
    const d = pts.map((p, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.c).toFixed(1)).join(" ");
    return `<svg class="curve" id="curve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Equity curve of the sample account, ending at ${money(pts[pts.length - 1].c, 1)}">
      <defs><linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ddc97" stop-opacity=".3"/><stop offset="1" stop-color="#3ddc97" stop-opacity="0"/></linearGradient></defs>
      <line x1="${pl}" x2="${W - pr}" y1="${Y(0)}" y2="${Y(0)}" stroke="#2b161b" stroke-dasharray="3 4"/>
      <path class="area" d="${d} L${X(pts.length - 1)} ${H - pb} L${X(0)} ${H - pb}Z"/><path class="line" pathLength="1" d="${d}"/>
      <circle id="cdot" r="4" fill="#fff" cx="${X(pts.length - 1)}" cy="${Y(pts[pts.length - 1].c)}"/>
      <text x="${pl}" y="${pt - 3}">${money(mx)}</text><text x="${pl}" y="${H - 4}">${mn < 0 ? money(mn) : "$0"}</text></svg>`;
  }
  function wireCurve() {
    const svg = $("#curve"); if (!svg) return;
    requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add("on")));
    const pts = curvePts(), W = 600, H = 170, pl = 8, pr = 8, pt = 14, pb = 18, mn = Math.min(0, ...pts.map(p => p.c)), mx = Math.max(1, ...pts.map(p => p.c));
    const X = i => pl + (W - pl - pr) * (pts.length > 1 ? i / (pts.length - 1) : 0), Y = v => pt + (H - pt - pb) * (1 - (v - mn) / (mx - mn));
    const move = e => { const r = svg.getBoundingClientRect(); const k = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); const i = Math.round(k * (pts.length - 1));
      const dot = $("#cdot"); dot.setAttribute("cx", X(i)); dot.setAttribute("cy", Y(pts[i].c)); $("#tip").innerHTML = esc(pts[i].l) + " · <b class='" + cls(pts[i].c) + "'>" + money(pts[i].c, 1) + "</b>"; };
    svg.addEventListener("pointermove", move); svg.addEventListener("pointerdown", move);
  }
  function dayPanel() {
    if (!state.day) return '<div class="empty">Pick a day on the calendar to see its trades.</div>';
    const ts = dayTrades(state.day);
    return `<h3 style="font-family:var(--mono);font-size:11px;color:var(--muted);font-weight:500;margin-bottom:8px;display:flex;justify-content:space-between"><span>${dlabel(state.day).toUpperCase()}</span><span>${ts.length} ${ts.length > 1 ? "trades" : "trade"} · <b class="${cls(dayPnl(state.day))}">${money(dayPnl(state.day), 1)}</b></span></h3>${tradeTable(ts)}`;
  }
  function tradeTable(ts) {
    return `<div class="tbl"><table><thead><tr><th>TIME</th><th>SIDE</th><th>CONTRACT</th><th>QTY</th><th>ENTRY</th><th>EXIT</th><th>NET</th><th>R</th><th>SETUP</th></tr></thead><tbody>${ts.map(t =>
      `<tr class="rowbtn" tabindex="0" role="button" data-trade="${t.id}" aria-label="Open trade ${t.id}, ${t.side} ${t.time}, ${money(t.pnl, 1)}"><td>${state.view === "trades" ? dlabel(t.day).slice(4) + " " : ""}${t.time}</td><td>${t.side}</td><td>MNQZ6</td><td>${t.qty}</td><td>${px(t.entry)}</td><td>${px(t.exit)}</td><td class="${cls(t.pnl)}">${money(t.pnl, 2)}</td><td class="${cls(t.r)}">${t.r >= 0 ? "+" : "−"}${Math.abs(t.r).toFixed(2)}R</td><td>${esc(t.setup)}</td></tr>`).join("")}</tbody></table></div>`;
  }

  /* ---------- trades ---------- */
  function trades() {
    const ts = TRADES.filter(t => !state.filter || t.setup === state.filter).slice().sort((a, b) => b.day - a.day || (a.time < b.time ? 1 : -1));
    return `<div class="vh"><h2>Trades</h2><div class="chips" role="group" aria-label="Filter by setup"><button class="chipb" data-filter="" aria-pressed="${!state.filter}">All ${TRADES.length}</button>${SETUPS.map(s => `<button class="chipb" data-filter="${s}" aria-pressed="${state.filter === s}">${s}</button>`).join("")}</div></div>
      <div class="panel">${tradeTable(ts)}</div>`;
  }

  /* ---------- vault ---------- */
  const FOLDERS = [["Playbook", [["My three rules", "Trade the plan. Size down after two losses. Stop for the day at the daily limit."], ["Morning routine", "Read the news calendar, mark two levels on the chart, tick the checklist, then trade."]]], ["Screenshots", [["Nov 12 breakout", "Pasted chart image goes here. Notes can sit under each screenshot."]]], ["Videos", [["Level walkthrough", "A linked video with timestamped notes. 02:14 mark the retest. 05:40 where I would have waited."]]]];
  function vault() {
    if (!state.unlocked) {
      return `<div class="vh"><h2>The Vault</h2></div><div class="lock"><h3>Enter your PIN</h3><p>Sample PIN: 1 2 3 4. The Vault shows nothing from your journal until it is unlocked.</p>
        <div class="dots" id="dots" role="img" aria-label="${state.pin.length} of 4 digits entered">${[0, 1, 2, 3].map(i => `<i class="${i < state.pin.length ? "f" : ""}"></i>`).join("")}</div>
        <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-pin="${n}" aria-label="${n}">${n}</button>`).join("")}<span></span><button data-pin="0" aria-label="0">0</button><button data-pin="del" aria-label="Delete">⌫</button></div><p id="pinmsg" style="margin-top:14px;min-height:1.4em" aria-live="polite"></p></div>`;
    }
    const f = FOLDERS[state.folder];
    return `<div class="vh"><h2>The Vault</h2><button class="chipb" data-lock="1">Lock</button></div><div class="vlayout"><div>${FOLDERS.map((x, i) => `<button class="folder" data-folder="${i}" aria-pressed="${state.folder === i}">${x[0]}</button>`).join("")}</div><div>${f[1].map(n => `<div class="note"><b>${esc(n[0])}</b>${esc(n[1])}</div>`).join("")}</div></div>`;
  }

  /* ---------- render ---------- */
  const HINT = { dashboard: "Click any day on the calendar. Click a trade to open it.", trades: "Click a trade to open it, or filter by setup.", vault: "Try the PIN pad. The sample PIN is 1 2 3 4.", soon: "This part is in the full extension, not in the demo." };
  function render(keepFocus) {
    renderNav();
    const v = state.view, el = $("#view");
    el.innerHTML = v === "dashboard" ? dashboard() : v === "trades" ? trades() : v === "vault" ? vault() :
      `<div class="soon"><h3>${SOON[v][0]}</h3><p>${SOON[v][1]}</p><p class="fine">Included in the extension. Not part of this demo.</p></div>`;
    $("#hint").textContent = HINT[v] || HINT.soon;
    if (v === "dashboard") { countUp(el); wireCurve(); }
    if (!keepFocus) el.focus({ preventScroll: true });
  }

  /* ---------- trade modal ---------- */
  let lastFocus = null;
  function priceSVG(t) {
    let s = (t.id * 9301 + 49297) % 233280; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const N = 44, a = 8, b = 32, sg = t.side === "Long" ? 1 : -1, pts = [];
    for (let i = 0; i < N; i++) { let base = i <= a ? t.entry - sg * (a - i) * 0.5 * (rnd() * .6 + .7) : i >= b ? t.exit + (i - b) * 0.4 * (rnd() - .4) : t.entry + (t.exit - t.entry) * ((i - a) / (b - a)); pts.push(base + (rnd() - .5) * 2.6); }
    pts[a] = t.entry; pts[b] = t.exit;
    const all = pts.concat([t.stop, t.target]), mn = Math.min(...all) - 1.5, mx = Math.max(...all) + 1.5, X = i => 10 + i * (480 / (N - 1)), Y = v => 8 + 134 * (1 - (v - mn) / (mx - mn));
    return `<svg class="pchart" viewBox="0 0 500 150" preserveAspectRatio="none" role="img" aria-label="Sample price path with entry, exit, stop and target">
      <line x1="10" x2="490" y1="${Y(t.stop)}" y2="${Y(t.stop)}" stroke="#ff5c68" stroke-dasharray="4 4" opacity=".7"/><line x1="10" x2="490" y1="${Y(t.target)}" y2="${Y(t.target)}" stroke="#3ddc97" stroke-dasharray="4 4" opacity=".7"/>
      <path d="${pts.map((p, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p).toFixed(1)).join(" ")}" fill="none" stroke="#e9dfe1" stroke-width="1.6"/>
      <circle cx="${X(a)}" cy="${Y(t.entry)}" r="5" fill="#fff"/><circle cx="${X(b)}" cy="${Y(t.exit)}" r="5" fill="${t.pnl >= 0 ? "#3ddc97" : "#ff5c68"}"/></svg>`;
  }
  function openTrade(id, from) {
    const t = TRADES.find(x => x.id === id); if (!t) return;
    lastFocus = from || document.activeElement;
    const box = $("#modal-box");
    box.innerHTML = `<div class="mh"><div><h2 id="m-title">MNQZ6 · ${t.side} · ${dlabel(t.day)}, ${t.time}</h2><div class="big ${cls(t.pnl)}">${money(t.pnl, 2)}</div><span class="${cls(t.r)}" style="font-family:var(--mono)">${t.r >= 0 ? "+" : "−"}${Math.abs(t.r).toFixed(2)}R</span></div><button class="x" data-close="1" aria-label="Close">×</button></div>
      <div class="kv"><div><span>ENTRY</span><b>${px(t.entry)}</b></div><div><span>EXIT</span><b>${px(t.exit)}</b></div><div><span>STOP</span><b>${px(t.stop)}</b></div><div><span>TARGET (2R)</span><b>${px(t.target)}</b></div><div><span>QTY</span><b>${t.qty}</b></div><div><span>RISK</span><b>${plain(t.risk)}</b></div></div>
      ${priceSVG(t)}
      <span class="mlabel">Setup (click to change)</span><div class="chips" id="msetups">${SETUPS.map(s => `<button class="chipb" data-setup="${s}" aria-pressed="${t.setup === s}">${s}</button>`).join("")}</div>
      <label class="mlabel" for="mnote">Notes (stay in this page only)</label><textarea id="mnote" maxlength="400" placeholder="What did you see, and what would you do again?"></textarea>
      <div class="rv">Attach a recap video or link one. Available in the extension.</div>`;
    $("#mnote").value = t.note; $("#mnote").addEventListener("input", e => { t.note = e.target.value; });
    box.dataset.id = id; $("#modal").hidden = false; document.documentElement.style.overflow = "hidden"; box.focus();
  }
  function closeModal() { $("#modal").hidden = true; document.documentElement.style.overflow = ""; render(true); if (lastFocus && document.contains(lastFocus)) lastFocus.focus(); }

  /* ---------- events ---------- */
  document.addEventListener("click", e => {
    const q = s => e.target.closest(s);
    let b;
    if ((b = q("[data-nav]"))) { state.view = b.dataset.nav; render(); }
    else if ((b = q("[data-range]"))) { state.range = b.dataset.range; render(true); $('[data-range="' + state.range + '"]').focus(); }
    else if ((b = q("[data-day]"))) { state.day = +b.dataset.day; render(true); $('[data-day="' + state.day + '"]').focus(); $("#dayp").scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }); }
    else if ((b = q("[data-trade]"))) openTrade(+b.dataset.trade, b);
    else if ((b = q("[data-filter]"))) { state.filter = b.dataset.filter || null; render(true); $('[data-filter="' + (state.filter || "") + '"]').focus(); }
    else if ((b = q("[data-setup]"))) { const t = TRADES.find(x => x.id === +$("#modal-box").dataset.id); t.setup = b.dataset.setup; $("#msetups").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x.dataset.setup === t.setup)); }
    else if ((b = q("[data-close]")) || e.target.id === "modal") closeModal();
    else if ((b = q("[data-pin]"))) pin(b.dataset.pin);
    else if ((b = q("[data-lock]"))) { state.unlocked = false; state.pin = ""; render(); }
    else if ((b = q("[data-folder]"))) { state.folder = +b.dataset.folder; render(true); $('[data-folder="' + state.folder + '"]').focus(); }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !$("#modal").hidden) closeModal();
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("tr[data-trade]")) { e.preventDefault(); openTrade(+e.target.dataset.trade, e.target); }
    if (!$("#modal").hidden && e.key === "Tab") { const f = [...$("#modal-box").querySelectorAll("button,textarea")]; if (!f.length) return; const i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
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
