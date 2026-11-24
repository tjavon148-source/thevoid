/* Shared behaviour: link targets, smooth scroll, hover tilt. */
// Fill these in when the links exist. Until then Discord buttons scroll to the buy section.
window.LINKS = { buy: "https://whop.com/the-void-619c/the-void-b1/", discord: "https://discord.gg/DbBtK3ny2" };
(function () {
  const L = window.LINKS;
  document.querySelectorAll(".js-buy").forEach(a => { if (L.buy) { a.href = L.buy; a.target = "_blank"; a.rel = "noopener"; } });
  document.querySelectorAll(".js-discord").forEach(a => { if (L.discord) { a.href = L.discord; a.target = "_blank"; a.rel = "noopener"; } });
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.VOID = { reduce, fine: window.matchMedia("(hover: hover) and (pointer: fine)").matches, lenis: null };

  if (!reduce && VOID.fine) {
    document.querySelectorAll(".t3d").forEach(el => {
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.classList.add("live");
        el.style.setProperty("--mx", (x * 100) + "%"); el.style.setProperty("--my", (y * 100) + "%");
        el.style.transform = "perspective(1100px) rotateX(" + ((.5 - y) * 7).toFixed(2) + "deg) rotateY(" + ((x - .5) * 9).toFixed(2) + "deg) scale(1.015)";
      });
      el.addEventListener("pointerleave", () => { el.classList.remove("live"); el.style.transform = ""; });
    });
  }
  // Smooth scroll on every page that loads Lenis (home only keeps it tied to ScrollTrigger in home.js).
  window.VOID.initLenis = function (gsapTicker, onScroll) {
    if (reduce || !window.Lenis) return null;
    const lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    if (onScroll) lenis.on("scroll", onScroll);
    if (gsapTicker) gsapTicker(lenis); else { const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
      const id = a.getAttribute("href"), t = id.length > 1 ? document.querySelector(id) : null;
      if (id === "#top") { e.preventDefault(); lenis.scrollTo(0); } else if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -62 }); }
    }));
    window.VOID.lenis = lenis; return lenis;
  };
})();
