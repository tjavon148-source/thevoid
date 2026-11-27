/* The scroll story: four chapters of sample-data UI.
   Wide screens with motion: one device frame is pinned and the chapters scrub through it with the scroll.
   Phones: each chapter is its own card and plays once when it comes into view.
   Reduced motion: nothing is hidden, every screen shows its final state. All numbers are sample data. */
(function () {
  "use strict";
  const M = window.M, story = document.getElementById("story");
  if (!M || !story) return;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const chapters = $$(".ch", story), screens = chapters.map(c => $(".scr", c)), copies = chapters.map(c => $(".ch-copy", c));
  const homes = screens.map(s => s.parentNode);

  /* ---------- sample equity curve (same trades as the live demo) ---------- */
  const CUM = [0, 88, 58, -4, -75, -126, -14, 42, 162, 126, 270, 524, 494, 524, 550, 862, 1060, 1118, 1226, 1306, 1266, 1506, 1466, 1430, 1638, 1738, 1786, 1748];
  (function curve() {
    const svg = $(".eq svg", story); if (!svg) return;
    const lo = -160, hi = 1850, X = i => (i / (CUM.length - 1)) * 300, Y = v => 84 - ((v - lo) / (hi - lo)) * 80;
    const d = CUM.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join(" ");
    $(".line", svg).setAttribute("d", d);
    $(".area", svg).setAttribute("d", d + ` L300 90 L0 90 Z`);
    $(".zero", svg).setAttribute("y1", Y(0)); $(".zero", svg).setAttribute("y2", Y(0));
  })();

  /* ---------- sample candles behind the panel (deterministic) ---------- */
  function chart() {
    const svg = document.getElementById("dv-chart"); if (!svg || svg.childNodes.length) return;
    let s = 7, p = 27180; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const N = 120, W = 800 * 1.25, w = W / N, C = [];
    for (let i = 0; i < N; i++) { const o = p, c = o + (rnd() - .47) * 26, h = Math.max(o, c) + rnd() * 12, l = Math.min(o, c) - rnd() * 12; C.push([o, h, l, c]); p = c; }
    const lo = Math.min(...C.map(c => c[2])) - 20, hi = Math.max(...C.map(c => c[1])) + 20, Y = v => 440 - ((v - lo) / (hi - lo)) * 400;
    let up = "", dn = "", wu = "", wd = "";
    C.forEach(([o, h, l, c], i) => {
      const x = i * w + w / 2, top = Y(Math.max(o, c)), bh = Math.max(1.5, Math.abs(Y(o) - Y(c))), bw = w * .62;
      const body = `M${(x - bw / 2).toFixed(1)} ${top.toFixed(1)}h${bw.toFixed(1)}v${bh.toFixed(1)}h${(-bw).toFixed(1)}Z`, wick = `M${x.toFixed(1)} ${Y(h).toFixed(1)}V${Y(l).toFixed(1)}`;
      if (c >= o) { up += body; wu += wick; } else { dn += body; wd += wick; }
    });
    svg.innerHTML = `<g class="pan"><g opacity=".14" stroke="#fff" stroke-width="1" vector-effect="non-scaling-stroke">${[80, 160, 240, 320, 400].map(y => `<line x1="0" x2="${W}" y1="${y}" y2="${y}" vector-effect="non-scaling-stroke"/>`).join("")}</g>
      <path class="wk" d="${wu}" stroke="#26a69a"/><path class="wk" d="${wd}" stroke="#ef5350"/><path d="${up}" fill="#26a69a"/><path d="${dn}" fill="#ef5350"/></g>`;
  }

  /* ---------- one inner timeline per chapter (progress 0..1) ---------- */
  const rise = (y = 14) => [{ opacity: 0, transform: `translateY(${y}px)` }, { opacity: 1, transform: "none" }];
  const counters = (tl, el, start, end) => $$("[data-count]", el).forEach((b, i) => {
    tl.call(M.counter(b, parseFloat(b.dataset.count), { dec: +b.dataset.dec || 0, prefix: b.textContent.includes("$") ? "$" : "", suffix: b.dataset.suffix || "", sign: "sign" in b.dataset }), start + i * .03, end + i * .03, "out");
  });
  const BUILD = [
    function importTl(el) {
      const tl = new M.Timeline();
      tl.to($(".drop", el), [{ opacity: 0, transform: "translateY(-46px) rotate(-3deg) scale(.96)" }, { opacity: 1, transform: "none" }], 0, .2)
        .to($(".ok", el), [{ opacity: 0, transform: "scale(.5)" }, { opacity: 1, transform: "none" }], .18, .27)
        .to($(".fh", el), [{ opacity: 0 }, { opacity: 1 }], .2, .28)
        .stagger($$(".pair .fr", el), [{ opacity: 0, transform: "translateX(-12px)" }, { opacity: 1, transform: "none" }], .22, .32, .035)
        .stagger($$(".bk", el), [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], .48, .58, .04, "inOut")
        .to($(".paired", el), [{ opacity: 0, letterSpacing: ".3em" }, { opacity: 1, letterSpacing: "normal" }], .58, .68)
        .stagger($$(".tr", el), rise(16), .62, .74, .05);
      counters(tl, el, .64, .9);
      return tl;
    },
    function dayTl(el) {
      const tl = new M.Timeline(), note = $(".note", el), on = $(".tg.on", el);
      tl.to($(".cal-h", el), rise(8), 0, .1)
        .stagger($$(".dw", el), [{ opacity: 0 }, { opacity: 1 }], .02, .1, .01)
        .stagger($$(".t", el), [{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "none" }], .04, .16, .017)
        .to($(".t.sel", el), [{ boxShadow: "0 0 0 0 rgba(255,59,71,0)" }, { boxShadow: "0 0 0 2px #ff3b47, 0 0 24px rgba(255,59,71,.55)" }], .36, .46)
        .to($(".card", el), [{ opacity: 0, transform: "translateY(26px) scale(.97)" }, { opacity: 1, transform: "none" }], .42, .58)
        .to(on, [{ background: "rgba(255,255,255,.03)", borderColor: "rgba(255,255,255,.14)", color: "#c9bec1" }, { background: "rgba(61,220,151,.14)", borderColor: "rgba(61,220,151,.5)", color: "#bff5dc" }], .62, .68);
      counters(tl, $(".card-h", el), .48, .66);
      if (note) tl.call(M.typer(note), .7, .97);
      return tl;
    },
    function patTl(el) {
      const tl = new M.Timeline();
      tl.stagger($$(".st", el), rise(18), 0, .16, .04);
      counters(tl, $(".stats", el), .04, .42);
      tl.to($(".eq .lbl", el), [{ opacity: 0 }, { opacity: 1 }], .2, .3)
        .to($(".eq .line", el), [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], .24, .72, "inOut")
        .to($(".eq .area", el), [{ opacity: 0 }, { opacity: 1 }], .42, .78)
        .to($(".setups .lbl", el), [{ opacity: 0 }, { opacity: 1 }], .5, .58)
        .stagger($$(".su i", el), [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], .54, .74, .05)
        .stagger($$(".su b", el), [{ opacity: 0 }, { opacity: 1 }], .6, .7, .05);
      return tl;
    },
    function vaultTl(el) {
      const tl = new M.Timeline();
      tl.stagger($$(".nt", el), rise(14), 0, .14, .04)
        .to($(".notes", el), [{ opacity: 1 }, { opacity: .22 }], .36, .52)
        .to($(".lock", el), [{ opacity: 0 }, { opacity: 1 }], .38, .52)
        .to($(".lk", el), [{ opacity: 0, transform: "scale(.7)" }, { opacity: 1, transform: "none" }], .44, .56)
        .to($(".shackle", el), [{ transform: "translateY(-7px)" }, { transform: "translateY(-7px)", offset: .6 }, { transform: "none" }], .5, .66, "cubic-bezier(.34,1.56,.64,1)")
        .to($(".lock b", el), rise(8), .58, .68)
        .stagger($$(".dots i", el), [{ opacity: 0, transform: "scale(0)" }, { opacity: 1, transform: "none" }], .64, .72, .025)
        .stagger($$(".pad span", el), [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], .68, .8, .012);
      return tl;
    }
  ];

  /* ---------- modes ---------- */
  let live = [];
  const teardown = () => { live.forEach(s => s && s.kill()); live = []; story.classList.remove("pinned"); screens.forEach((s, i) => homes[i].appendChild(s)); $$(".dv-tabs b", story).forEach(b => b.classList.remove("on")); };

  function pinned() {
    story.classList.add("pinned"); chart();
    const box = document.getElementById("dv-screens"); screens.forEach(s => box.appendChild(s));
    const tabs = $$(".dv-tabs b", story), N = chapters.length, seg = 1 / N;
    const inner = screens.map((s, i) => BUILD[i](s));

    /* arrival: the device rises and the panel slides over the chart as the section scrolls in */
    const intro = new M.Timeline()
      .to("#device", [{ opacity: 0, transform: "translateY(70px) scale(.92) rotateX(10deg)" }, { opacity: 1, transform: "none" }], 0, 1, "out")
      .to("#dv-panel", [{ transform: "translateX(24%)", opacity: 0 }, { transform: "none", opacity: 1 }], .35, 1, "out")
      .to("#chapters", rise(30), .3, 1);
    live.push(M.scene(document.getElementById("story-pin"), intro, { mode: "through", from: 1, to: .08 }));

    /* the chapters */
    const tl = new M.Timeline();
    tl.to("#rail-fill", [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], 0, 1, "linear")
      .to("#dv-chart .pan", [{ transform: "translateX(0)" }, { transform: "translateX(-18%)" }], 0, 1, "linear");
    let cur = -1;
    tl.call(l => { const k = Math.min(N - 1, Math.floor(l * N)); if (k !== cur) { cur = k; tabs.forEach((b, i) => b.classList.toggle("on", i === k)); } }, 0, 1);
    chapters.forEach((c, i) => {
      const s = i * seg, e = s + seg, first = i === 0, last = i === N - 1;
      // copy: in at the chapter start, out just before the next one
      const a = first ? s : s - .02, b = last ? e : e + .005;
      const span = (x) => (x - a) / (b - a);
      const kc = [];
      kc.push(first ? { opacity: 1, transform: "none", offset: 0 } : { opacity: 0, transform: "translateY(36px)", offset: 0 });
      if (!first) { kc.push({ opacity: 0, transform: "translateY(36px)", offset: span(s + .006), easing: M.EASE.out }); kc.push({ opacity: 1, transform: "none", offset: span(s + .045) }); }
      if (!last) { kc.push({ opacity: 1, transform: "none", offset: span(e - .03), easing: M.EASE.in }); kc.push({ opacity: 0, transform: "translateY(-36px)", offset: 1 }); }
      else kc.push({ opacity: 1, transform: "none", offset: 1 });
      tl.to(copies[i], kc, a, b, "linear");
      // screen: wipes up into the panel, then fades back as the next one arrives
      const ks = [];
      ks.push(first ? { opacity: 1, clipPath: "inset(0 0 0 0)", transform: "none", offset: 0 } : { opacity: 1, clipPath: "inset(100% 0 0 0)", transform: "translateY(30px)", offset: 0 });
      if (!first) ks.push({ opacity: 1, clipPath: "inset(0 0 0 0)", transform: "none", offset: span(s + .04), easing: M.EASE.out });
      if (!last) { ks.push({ opacity: 1, clipPath: "inset(0 0 0 0)", transform: "none", offset: span(e - .02) }); ks.push({ opacity: 0, clipPath: "inset(0 0 0 0)", transform: "scale(.97)", offset: 1 }); }
      else ks.push({ opacity: 1, clipPath: "inset(0 0 0 0)", transform: "none", offset: 1 });
      tl.to(screens[i], ks, a, b, "linear");
      // the screen's own story, inside its window
      tl.call(l => inner[i].seek(l), s + (first ? .005 : .03), e - .06);
    });
    const sc = M.scene(document.getElementById("story-pin"), tl, { mode: "pin", top: 62 });
    const killInner = () => inner.forEach(t => t.kill());
    live.push(sc, { kill: killInner });
  }

  function stacked() {
    screens.forEach((s, i) => live.push(M.scene(chapters[i].querySelector(".ch-screen"), BUILD[i](s), { mode: "play", ms: 2600, threshold: .3 })));
  }

  function setup() {
    teardown();
    if (M.reduce) return;               // final states, nothing hidden
    if (M.wide()) pinned(); else stacked();
  }
  setup();
  const mql = window.matchMedia("(min-width: 1000px)");
  mql.addEventListener("change", setup);
})();
