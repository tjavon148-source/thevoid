# The Void site
Marketing site for The Void (gethevoid.com). Start with CLAUDE.md and BRIEF.md.
Assets are in `assets/`, the current single-page version is in `reference/`.

## How the site is built and deployed
- Edit `src/pages/*.html`, `src/partials/*` and files in `public/`, then run `python3 tools/build.py`. It writes the finished site into `site/`, which is committed.
- Cloudflare serves `site/` as-is (see `wrangler.jsonc`), so there is no build step on Cloudflare. Always commit `site/` together with the source.
- `tools/shoot.py` takes desktop and phone screenshots; `tools/interact.py` clicks through the demo.
