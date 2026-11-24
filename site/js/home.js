/* Home: floating panels (mouse + scroll parallax), dust, smooth scroll and the pinned dashboard story. */
(function () {
  const V = window.VOID, reduce = V.reduce;
  const hero = document.getElementById("hero");

  /* mouse parallax for the floating panels */
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

  function motion() {
    if (reduce || !window.gsap || !window.ScrollTrigger) return;
    const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);
    V.initLenis(l => { gsap.ticker.add(t => l.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }, ScrollTrigger.update);

    /* hero panels lift away at different speeds as you scroll */
    gsap.utils.toArray(".fl").forEach(el => {
      const d = parseFloat(getComputedStyle(el).getPropertyValue("--d")) || 1;
      gsap.to(el, { "--sy": (-110 * d) + "px", ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
    });

    const sec = document.getElementById("stage-sec"), tilt = document.getElementById("tilt");
    const lis = gsap.utils.toArray("#beats li"), hls = gsap.utils.toArray(".hl"), sfl = gsap.utils.toArray(".sfl");
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", () => {
      sec.classList.add("pin-on");
      gsap.set(tilt, { transformPerspective: 1400, transformOrigin: "50% 65%", rotationX: 20, scale: 0.82, y: 40 });
      gsap.set(lis, { autoAlpha: 0, y: 14 }); gsap.set(hls, { opacity: 0 }); gsap.set(sfl, { autoAlpha: 0, y: 60 });
      const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: sec, start: "top top+=62", end: "+=2600", scrub: 0.6, pin: true, anticipatePin: 1, invalidateOnRefresh: true } });
      tl.to(tilt, { rotationX: 0, scale: 1, y: 0, duration: 1.2, ease: "power2.out" });
      tl.to(sfl, { autoAlpha: 1, y: 0, duration: 1, stagger: .15, ease: "power2.out" }, 0.2);
      sfl.forEach((el, i) => tl.to(el, { y: (i % 2 ? 1 : -1) * 70, duration: 5.2, ease: "none" }, 1.2));
      lis.forEach((li, i) => {
        tl.to(li, { autoAlpha: 1, y: 0, duration: 0.35 }, ">-0.1").to(hls[i], { opacity: 1, duration: 0.35 }, "<")
          .to({}, { duration: 0.7 })
          .to(li, { autoAlpha: 0, y: -14, duration: 0.3 }).to(hls[i], { opacity: 0, duration: 0.3 }, "<");
      });
      return () => { sec.classList.remove("pin-on"); gsap.set([tilt, ...lis, ...hls, ...sfl], { clearProps: "all" }); };
    });
    window.addEventListener("load", () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  if (document.readyState === "complete") motion(); else window.addEventListener("load", motion);
})();
