#!/usr/bin/env python3
"""Screenshots + console/overflow check. Usage: python3 tools/shoot.py <outdir> <path> [<path>...]"""
import sys, subprocess, time, pathlib
from playwright.sync_api import sync_playwright
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
paths = sys.argv[2:] or ["/"]
srv = subprocess.Popen(["python3","-m","http.server","8123","-d","site"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
try:
  with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for name,vp,mob in (("d",{"width":1440,"height":900},False),("m",{"width":390,"height":844},True)):
      ctx = b.new_context(viewport=vp, device_scale_factor=1, is_mobile=mob, has_touch=mob)
      for path in paths:
        pg = ctx.new_page(); errs=[]
        pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto("http://localhost:8123"+path); pg.wait_for_timeout(4200)
        slug = (path.strip("/") or "home").replace("/","-")
        pg.screenshot(path=str(out/f"{slug}-{name}-0.png"))
        h = pg.evaluate("document.documentElement.scrollHeight"); ow = pg.evaluate("document.documentElement.scrollWidth")
        n=0
        if path=="/" and not mob:
            for y in (1100, 2300, 3600, 5200, 6800):
                pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(900); n+=1; pg.screenshot(path=str(out/f"{slug}-{name}-{n}.png"))
        elif not mob:
            pg.screenshot(path=str(out/f"{slug}-{name}-full.png"), full_page=True)
        else:
            pg.screenshot(path=str(out/f"{slug}-{name}-full.png"), full_page=True)
        print(name, path, "height",h,"scrollWidth",ow,"vw",vp["width"],"errors",errs[:3])
        pg.close()
    b.close()
finally: srv.terminate()
