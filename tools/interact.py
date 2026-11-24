import subprocess,time,pathlib
from playwright.sync_api import sync_playwright
S=pathlib.Path("/tmp/claude-0/-home-claude/368d227d-44c8-5f2c-8866-a5d5815165ad/scratchpad/s3");S.mkdir(exist_ok=True)
srv=subprocess.Popen(["python3","-m","http.server","8124","-d","site"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
try:
 with sync_playwright() as p:
  b=p.chromium.launch();pg=b.new_page(viewport={"width":1440,"height":900});errs=[]
  pg.on("pageerror",lambda e:errs.append(str(e)));pg.on("console",lambda m:errs.append(m.text) if m.type=="error" else None)
  pg.goto("http://localhost:8124/demo/");pg.wait_for_timeout(1500)
  pg.click('[data-range="week"]');pg.wait_for_timeout(1500)
  print("week net:",pg.inner_text(".cards .card .v").strip())
  pg.click('[data-range="month"]');pg.click('[data-day="12"]');pg.wait_for_timeout(300)
  pg.click('#dayp tr[data-trade]');pg.wait_for_timeout(400);pg.screenshot(path=str(S/"modal.png"))
  pg.keyboard.press("Escape");print("modal hidden:",pg.is_hidden("#modal"))
  pg.click('[data-nav="trades"]');pg.click('[data-filter="Pullback"]');print("rows:",pg.locator("tbody tr").count())
  pg.click('[data-nav="vault"]')
  for k in "9999":pg.click(f'[data-pin="{k}"]')
  pg.wait_for_timeout(600);print("msg:",pg.inner_text("#pinmsg"))
  for k in "1234":pg.click(f'[data-pin="{k}"]')
  pg.wait_for_timeout(500);print("unlocked:",pg.locator(".note").count());
  pg.click('[data-nav="cockpit"]');print("soon:",pg.inner_text(".soon h3"))
  pg.goto("http://localhost:8124/setup/");pg.screenshot(path=str(S/"setup.png"),full_page=True)
  print("errors",errs)
finally:srv.terminate()
