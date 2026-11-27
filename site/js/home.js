/* Home: sticky buy bar, hero parallax and the fall into the black hole, real-screenshot reveals.
   Uses the motion engine (motion.js). Lenis smooth scroll loads only on wide screens with a fine pointer. */
(function () {
  "use strict";
  const V = window.VOID, M = window.M, reduce = V.reduce;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const hero = document.getElementById("hero"), wrap = document.getElementById("hero-wrap");

  /* sticky buy bar on phones: visible once the hero has scrolled away, hidden from just before the price section onwards */
  const bar = document.getElementById("buybar"), get = document.getElementById("get");
  if (bar && wrap && get && "IntersectionObserver" in window) {
    let heroIn = true, nearGet = false;
    const set = () => { const on = !heroIn && !nearGet; bar.classList.toggle("on", on); bar.inert = !on; };
    bar.hidden = false; bar.inert = true;
    new IntersectionObserver(([e]) => { heroIn = e.isIntersecting; set(); }, { rootMargin: "0px 0px -40% 0px" }).observe(wrap);
    new IntersectionObserver(([e]) => { nearGet = e.isIntersecting || e.boundingClientRect.top < 0; set(); }, { rootMargin: "0px 0px 50% 0px" }).observe(get);
  }

  /* demo card tiles ripple diagonally */
  $$(".dc-cal i").forEach((t, i) => t.style.setProperty("--k", (i % 5) + Math.floor(i / 5)));

  /* mouse parallax for the floating sample panels */
  if (!reduce && V.fine && hero) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const step = () => { cx += (tx - cx) * .07; cy += (ty - cy) * .07; hero.style.setProperty("--px", cx.toFixed(3)); hero.style.setProperty("--py", cy.toFixed(3));
      raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > .002) ? requestAnimationFrame(step) : 0; };
    hero.addEventListener("pointermove", e => { const r = hero.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - .5) * 2; ty = ((e.clientY - r.top) / r.height - .5) * 2; if (!raf) raf = requestAnimationFrame(step); });
  }

  /* dust: tiny specks drifting at different depths */
  const floats = hero && hero.querySelector(".floats");
  if (!reduce && floats) {
    const n = window.innerWidth < 700 ? 10 : 26;
    for (let i = 0; i < n; i++) {
      const d = document.createElement("i"); d.className = "dust";
      const s = 1 + Math.random() * 2.2;
      d.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${s}px;height:${s}px;opacity:${(.15 + Math.random() * .5).toFixed(2)}`;
      d.animate([{ transform: "translate(0,0)" }, { transform: `translate(${(Math.random() - .5) * 60}px,${-30 - Math.random() * 70}px)` }],
        { duration: 9000 + Math.random() * 9000, direction: "alternate", iterations: Infinity, easing: "ease-in-out", delay: -Math.random() * 9000 });
      floats.appendChild(d);
    }
  }
  if (reduce || !M) return;

  /* ---------- falling in: the words are pulled into the O while the horizon grows over the screen ---------- */
  let fall = null;
  function buildFall() {
    if (fall) { fall.kill(); fall = null; }
    if (!hero || !wrap) return;
    const wide = M.wide();
    wrap.classList.toggle("falls", wide);
    const o = $("#o").getBoundingClientRect(), ox = o.left + o.width / 2, oy = o.top + o.height / 2;
    const toO = (el, s) => { const r = el.getBoundingClientRect(); return `translate(${(ox - (r.left + r.width / 2)).toFixed(1)}px, ${(oy - (r.top + r.height / 2)).toFixed(1)}px) scale(${s})`; };
    const tl = new M.Timeline();
    tl.to(".floats", [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(1.5)" }], 0, .45, "in")
      .to(".scrollhint", [{ opacity: .7 }, { opacity: 0 }], 0, .1, "linear");
    const copy = $(".hero-copy", hero);   // its children keep their CSS entrance; the wrapper is what gets pulled in
    tl.to(copy, [{ transform: "none", opacity: 1 }, { transform: toO(copy, .12), opacity: 0 }], .02, .5, "in");
    [".the", ".lv", ".li", ".ld"].forEach((s, i) => { const el = $(s, hero); tl.to(el, [{ transform: "none", opacity: 1 }, { transform: toO(el, .08), opacity: 0 }], .22 + i * .03, .62 + i * .03, "in"); });
    tl.call(l => window.HOLE && window.HOLE.fall(wide ? l : l * .45), .18, wide ? .92 : 1, "in");
    if (wide) tl.to("#hole", [{ opacity: 1 }, { opacity: 0 }], .86, 1, "linear");
    fall = M.scene(wrap, tl, wide ? { mode: "pin", top: 62 } : { mode: "leave", top: 62 });
  }

  /* ---------- real screenshots: the dashboard tilts up into place; product rows open like a screen powering on ---------- */
  let reveals = [];
  function buildReveals() {
    reveals.forEach(s => s && s.kill()); reveals = [];
    if (!M.wide()) return;                                   // phones use the CSS scroll-driven focus-in
    const stage = $(".stage");
    if (stage) {
      const tl = new M.Timeline()
        .to("#tilt", [{ transform: "perspective(1400px) rotateX(24deg) scale(.86) translateY(60px)", opacity: .25 }, { transform: "none", opacity: 1 }], 0, 1, "inOut")
        .stagger(".beats li", [{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], .55, .85, .08);
      reveals.push(M.scene(stage, tl, { mode: "through", from: 1, to: .12 }));
    }
    $$(".split").forEach(row => {
      const shot = $(".shot", row), img = shot && $("img", shot); if (!img) return;
      const tl = new M.Timeline()
        .to(shot, [{ opacity: 0 }, { opacity: 1 }], 0, .25, "linear")
        .to(img, [{ clipPath: "inset(42% 14% 42% 14% round 10px)", transform: "scale(1.14) translateY(4%)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", transform: "none" }], .08, 1, "out")
        .stagger($$(".copy li", row), [{ opacity: 0, transform: "translateX(-18px)" }, { opacity: 1, transform: "none" }], .2, .6, .08);
      reveals.push(M.scene(row, tl, { mode: "through", from: .88, to: .3 }));
    });
  }

  function lenis() {
    if (!V.fine || !M.wide() || window.Lenis) return;
    const s = document.createElement("script"); s.src = "/vendor/lenis.min.js";
    s.onload = () => V.initLenis(null, M.request); document.head.appendChild(s);
  }

  /* build once the page has loaded, so positions are measured from rest */
  let built = false;
  const rebuild = () => { buildFall(); buildReveals(); M.request(); };
  const build = () => { if (built) return; built = true; rebuild(); lenis(); };
  if (document.readyState === "complete") build(); else window.addEventListener("load", build);
  let rt, lastW = window.innerWidth;
  window.addEventListener("resize", () => { if (window.innerWidth === lastW) return; lastW = window.innerWidth; clearTimeout(rt); rt = setTimeout(() => { if (built) { window.scrollTo(0, window.scrollY); rebuild(); lenis(); } }, 200); });
})();
