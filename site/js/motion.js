/* The Void motion engine. No dependencies.
   - One motion language: EASE.out for entrances, EASE.inOut for anything scrubbed by scroll.
   - Timelines are built from paused Web Animations (compositor-friendly) and positioned by a 0..1 progress,
     so the same timeline can be scrubbed by scroll (wide screens) or played once in time (phones).
   - Scroll scenes read every rect first, then write, so there is no layout thrash.
   - Reduced motion: nothing is hidden, nothing moves. The page is the final state.
   Also: word reveals, magnetic buttons and the glass cursor glow, used on every page. */
(function () {
  "use strict";
  const mq = q => window.matchMedia(q).matches;
  const reduce = mq("(prefers-reduced-motion: reduce)");
  const fine = mq("(hover: hover) and (pointer: fine)");
  const EASE = { out: "cubic-bezier(.16,1,.3,1)", inOut: "cubic-bezier(.65,0,.35,1)", in: "cubic-bezier(.7,0,.84,0)", linear: "linear" };
  const FN = {
    out: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOut: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    in: t => t * t * t, linear: t => t
  };
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const list = t => (!t ? [] : typeof t === "string" ? [...document.querySelectorAll(t)] : t instanceof Element ? [t] : [...t]);

  class Timeline {
    constructor() { this.items = []; this.p = -1; this.raf = 0; }
    /* animate targets with keyframes between progress start and end */
    to(targets, keyframes, start, end, easing = "out") {
      list(targets).forEach(el => {
        const a = el.animate(keyframes, { duration: 1000, fill: "both", easing: EASE[easing] || easing });
        a.pause(); a.currentTime = 0;
        this.items.push({ a, start, end, l: -1 });
      });
      return this;
    }
    /* same, offset by `each` per element */
    stagger(targets, keyframes, start, end, each, easing) {
      list(targets).forEach((el, i) => this.to(el, keyframes, start + i * each, end + i * each, easing));
      return this;
    }
    /* run fn(eased local progress) between start and end (counters, typing, nested timelines) */
    call(fn, start, end, easing = "linear") { this.items.push({ fn, start, end, e: FN[easing] || FN.linear, l: -1 }); return this; }
    seek(p) {
      if (p === this.p) return; this.p = p;
      for (const it of this.items) {
        const l = clamp((p - it.start) / ((it.end - it.start) || 1e-6));
        if (l === it.l) continue; it.l = l;
        if (it.a) it.a.currentTime = l * 1000; else it.fn(it.e(l));
      }
    }
    play(ms = 1600) {
      cancelAnimationFrame(this.raf);
      const t0 = performance.now();
      const step = now => { const k = clamp((now - t0) / ms); this.seek(k); if (k < 1) this.raf = requestAnimationFrame(step); };
      this.raf = requestAnimationFrame(step);
    }
    kill() { cancelAnimationFrame(this.raf); this.items.forEach(it => it.a && it.a.cancel()); this.items = []; this.p = -1; }
  }

  /* ---------- scroll scenes ---------- */
  const scenes = [];
  let dirty = true, ticking = false;
  const vh = () => window.innerHeight;
  function progressOf(s, r) {
    if (s.mode === "pin") { const top = s.top || 0, span = r.height - (vh() - top); return span > 0 ? clamp((top - r.top) / span) : 0; }
    if (s.mode === "leave") return clamp(((s.top || 0) - r.top) / Math.max(1, r.height));
    /* "through": from the element's top at `from` x viewport to its top at `to` x viewport */
    const from = (s.from ?? 1) * vh(), to = (s.to ?? .3) * vh();
    return clamp((from - r.top) / (from - to));
  }
  function update() {
    ticking = false; if (!dirty) return; dirty = false;
    const live = scenes.filter(s => s.on);
    const rects = live.map(s => s.el.getBoundingClientRect());         // read everything first
    live.forEach((s, i) => { const r = rects[i]; if (r.bottom < -vh() || r.top > vh() * 2) return; s.tl.seek(progressOf(s, r)); }); // then write
  }
  const request = () => { dirty = true; if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);

  /* register a scene. mode: "pin" | "through" | "leave" | "play" */
  function scene(el, tl, opts = {}) {
    if (!el || !tl) return null;
    const s = Object.assign({ el, tl, on: true }, opts);
    if (s.mode === "play") {
      tl.seek(0);
      const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { tl.play(s.ms || 1800); io.disconnect(); } }, { threshold: s.threshold || .35 });
      io.observe(el); s.io = io;
    } else { scenes.push(s); request(); }
    s.kill = () => { s.on = false; if (s.io) s.io.disconnect(); const i = scenes.indexOf(s); if (i > -1) scenes.splice(i, 1); tl.kill(); };
    return s;
  }

  /* ---------- helpers ---------- */
  /* number counter: returns fn(l) that writes the value at progress l */
  function counter(el, to, { dec = 0, prefix = "", suffix = "", sign = false } = {}) {
    let last = "";
    return l => {
      const v = to * l, abs = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
      const s = (sign ? (v < 0 ? "−" : "+") : v < 0 ? "−" : "") + prefix + abs + suffix;
      if (s !== last) { el.textContent = s; last = s; }
    };
  }
  /* typing: returns fn(l) that reveals the element's own text */
  function typer(el) {
    const full = el.dataset.full || (el.dataset.full = el.textContent); let n = -1;
    return l => { const k = Math.round(full.length * l); if (k !== n) { n = k; el.textContent = full.slice(0, k); el.classList.toggle("typing", k > 0 && k < full.length); } };
  }

  /* ---------- word reveals: [data-reveal="words"] splits text into masked words; [data-reveal] fades up ---------- */
  function splitWords(el) {
    if (el.dataset.split) return; el.dataset.split = "1";
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const parts = n.textContent.split(/(\s+)/); const frag = document.createDocumentFragment();
          parts.forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            const w = document.createElement("span"); w.className = "w"; const i = document.createElement("span"); i.textContent = p; w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.matches("br")) walk(n);
      });
    };
    walk(el);
    el.querySelectorAll(".w > span").forEach((s, i) => s.style.setProperty("--i", i));
  }
  function reveals(root = document) {
    const els = [...root.querySelectorAll("[data-reveal]")];
    if (reduce || !("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("in")); return; }
    els.forEach(e => { if (e.dataset.reveal === "words") splitWords(e); });
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -12% 0px" });
    els.forEach(e => io.observe(e));
  }

  /* ---------- magnetic buttons and glass glow (fine pointers only) ---------- */
  function magnetic(root = document) {
    if (reduce || !fine) return;
    root.querySelectorAll(".btn.primary, .magnetic").forEach(el => {
      if (el.dataset.mag) return; el.dataset.mag = "1";
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        el.style.setProperty("--bx", x + "px"); el.style.setProperty("--by", y + "px");
        el.style.transform = `translate(${((x / r.width) - .5) * 10}px, ${((y / r.height) - .5) * 8}px)`;
        el.classList.add("mag");
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; el.classList.remove("mag"); });
    });
  }
  function glow() {
    if (reduce || !fine) return;
    let cur = null;
    document.addEventListener("pointermove", e => {
      const g = e.target.closest && e.target.closest(".glass");
      if (cur && cur !== g) cur.classList.remove("lit");
      cur = g; if (!g) return;
      const r = g.getBoundingClientRect();
      g.style.setProperty("--gx", (e.clientX - r.left) + "px"); g.style.setProperty("--gy", (e.clientY - r.top) + "px");
      g.classList.add("lit");
    }, { passive: true });
  }

  window.M = { reduce, fine, EASE, FN, clamp, Timeline, scene, counter, typer, reveals, magnetic, request, wide: () => mq("(min-width: 1000px)") };
  const boot = () => { reveals(); magnetic(); glow(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
