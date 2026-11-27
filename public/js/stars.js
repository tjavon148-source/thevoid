/* Starfield: three drifting depth layers, a few red stars, rare shooting stars.
   Sits behind everything (fixed, z-index -1). Off switches:
   - add ?stars=off to any page address to see the site without it
   - set ENABLED = false below to turn it off for everyone
   Respects reduced-motion (one still frame) and pauses while the tab is hidden. */
(function () {
  const ENABLED = true;
  if (!ENABLED || /[?&]stars=off\b/.test(location.search)) return;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = innerWidth < 700 || matchMedia("(pointer: coarse)").matches;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none";
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const LAYERS = [ // depth: size, speed, scroll parallax, brightness
    { n: 1.0, size: 0.9, drift: 2.0, par: 0.04, a: 0.6 },
    { n: 0.5, size: 1.3, drift: 4.5, par: 0.10, a: 0.85 },
    { n: 0.2, size: 1.9, drift: 8.0, par: 0.20, a: 1.0 },
  ];
  let W = 0, H = 0, dpr = 1, stars = [];
  const rnd = (a, b) => a + Math.random() * (b - a);

  function build() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const total = Math.min(small ? 110 : 260, Math.round((W * H) / (small ? 7000 : 5500)));
    const sum = LAYERS.reduce((s, l) => s + l.n, 0);
    stars = [];
    LAYERS.forEach((L, li) => {
      const count = Math.round((total * L.n) / sum);
      for (let i = 0; i < count; i++) {
        const red = Math.random() < 0.05;
        stars.push({ li, x: rnd(0, W), y: rnd(0, H), r: L.size * rnd(0.7, 1.3), tw: rnd(0, 6.28), ts: rnd(0.4, 1.6),
          rgb: red ? "255,82,96" : (Math.random() < 0.5 ? "243,238,238" : "255,225,225") });
      }
    });
  }

  let shoot = null, nextShoot = performance.now() + rnd(5000, 9000);
  function spawnShoot() {
    const fromLeft = Math.random() < 0.5, ang = rnd(0.35, 0.7);   // downward slant, radians
    const speed = rnd(900, 1400), dir = fromLeft ? 1 : -1;
    shoot = { x: fromLeft ? rnd(0, W * 0.5) : rnd(W * 0.5, W), y: rnd(0, H * 0.4), vx: dir * speed * Math.cos(ang),
      vy: speed * Math.sin(ang), life: 0, max: rnd(0.7, 1.1), len: rnd(110, 190) };
  }

  let last = performance.now(), sy = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    ctx.clearRect(0, 0, W, H);
    sy += ((window.scrollY || 0) - sy) * 0.08;   // eased scroll for a soft parallax
    const t = now / 1000;
    for (const s of stars) {
      const L = LAYERS[s.li];
      if (!reduce) { s.x -= L.drift * dt; if (s.x < -2) { s.x = W + 2; s.y = rnd(0, H); } }
      const y = (((s.y - sy * L.par) % H) + H) % H;
      const tw = reduce ? 1 : 0.65 + 0.35 * Math.sin(t * s.ts + s.tw);
      ctx.fillStyle = `rgba(${s.rgb},${(L.a * tw).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, 6.2832); ctx.fill();
    }
    if (!reduce) {
      if (!shoot && now > nextShoot) spawnShoot();
      if (shoot) {
        shoot.life += dt; shoot.x += shoot.vx * dt; shoot.y += shoot.vy * dt;
        const k = shoot.life / shoot.max, a = Math.sin(Math.min(k, 1) * Math.PI);   // fade in, fade out
        const m = Math.hypot(shoot.vx, shoot.vy), tx = shoot.x - (shoot.vx / m) * shoot.len, ty = shoot.y - (shoot.vy / m) * shoot.len;
        const g = ctx.createLinearGradient(shoot.x, shoot.y, tx, ty);
        g.addColorStop(0, `rgba(255,240,240,${(0.95 * a).toFixed(3)})`);
        g.addColorStop(0.35, `rgba(255,70,86,${(0.55 * a).toFixed(3)})`);
        g.addColorStop(1, "rgba(224,16,42,0)");
        ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(tx, ty); ctx.stroke();
        if (k >= 1 || shoot.x < -300 || shoot.x > W + 300 || shoot.y > H + 300) { shoot = null; nextShoot = now + rnd(9000, 20000); }
      }
    }
    if (!reduce) requestAnimationFrame(frame);
  }

  build();
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (reduce) frame(performance.now()); }, 150); });
  if (reduce) frame(performance.now()); else requestAnimationFrame(frame);
})();
