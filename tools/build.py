#!/usr/bin/env python3
"""Stamps src/pages/*.html with the shared head, header and footer and writes the site into ./site.
Run: python3 tools/build.py   (then commit ./site). Cloudflare serves ./site as-is, no build step there."""
import re, shutil, pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
src, out = root / "src", root / "site"
BASE = "https://gethevoid.com"
if out.exists(): shutil.rmtree(out)
shutil.copytree(root / "public", out)
header, footer = (src / "partials/header.html").read_text(), (src / "partials/footer.html").read_text()
sitemap = []
for f in sorted((src / "pages").glob("*.html")):
    raw = f.read_text()
    meta = dict(re.findall(r"<!--\s*(\w+):\s*(.*?)\s*-->", raw.split("-->\n\n", 1)[0] + "-->"))
    body = re.sub(r"^(<!--.*?-->\s*)+", "", raw, flags=re.S)
    name, path = f.stem, meta.get("path", "/")
    h = header
    for k in ("demo", "setup", "changelog"):
        h = h.replace("{{cur:%s}}" % k, 'aria-current="page"' if meta.get("nav") == k else "")
    canon = BASE + path
    head = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{meta["title"]}</title>
<meta name="description" content="{meta["desc"]}">
<link rel="canonical" href="{canon}">
<meta name="theme-color" content="#050305">
<meta property="og:type" content="website"><meta property="og:site_name" content="The Void">
<meta property="og:title" content="{meta["title"]}"><meta property="og:description" content="{meta["desc"]}">
<meta property="og:url" content="{canon}"><meta property="og:image" content="{BASE}/og.png">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{BASE}/og.png">
{'<meta name="robots" content="noindex">' if meta.get("noindex") else ''}
<link rel="icon" href="/mark.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/icon-512.png">
<link rel="preload" href="/fonts/bricolage-grotesque-latin-wdth-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/site.css">
{meta.get("head","")}
</head>
<body>
'''
    body = body.replace("{{header}}", h).replace("{{footer}}", footer)
    page = head + body + "\n</body>\n</html>\n"
    dest = out / ("index.html" if path == "/" else path.strip("/") + "/index.html")
    dest.parent.mkdir(parents=True, exist_ok=True); dest.write_text(page)
    if not meta.get("noindex"): sitemap.append(canon)
(out / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(f"<url><loc>{u}</loc></url>\n" for u in sitemap) + "</urlset>\n")
(out / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {BASE}/sitemap.xml\n")
print("built", len(sitemap), "pages into", out)
