# The Void site
Marketing site for The Void (gethevoid.com). Start with CLAUDE.md and BRIEF.md.
Assets are in `assets/`, the current single-page version is in `reference/`.

## How the site is built and deployed
- Edit `src/pages/*.html`, `src/partials/*` and files in `public/`, then run `python3 tools/build.py`. It writes the finished site into `site/`, which is committed.
- Cloudflare serves `site/` as-is (see `wrangler.jsonc`), so there is no build step on Cloudflare. Always commit `site/` together with the source.
- `tools/shoot.py` takes desktop and phone screenshots; `tools/interact.py` clicks through the demo.

## Motion
- `public/js/motion.js` is a small scroll engine on the Web Animations API (no GSAP). Timelines are scrubbed by scroll on wide screens and played once on phones; reduced motion shows final states.
- `public/js/home.js`: hero fall into the black hole, screenshot reveals, buy bar. `public/js/story.js`: the four-chapter walkthrough (sample data).
- `public/js/hole.js` exposes `window.HOLE.fall(0..1)`. Add `?gl=force` to a URL to render the shader on software WebGL (screenshots only).
- GSAP and ScrollTrigger stay in `public/vendor` but are no longer loaded.
