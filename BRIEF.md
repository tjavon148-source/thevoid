# Build brief: gethevoid.com

## Product facts (do not change without asking)
- Name: **The Void**. Tagline: "The trading journal that lives on your chart."
- A Chrome extension that overlays TradingView. Imports Tradovate order CSVs, pairs fills into trades, dashboard (month calendar, equity curve, win rate, profit factor), trade review (setup tags, notes, R multiple, recap videos), weekly reviews, pre-trade checklist, cockpit (session clock, daily limits, mood check-in), share cards, multiple accounts, backups to a folder, and a PIN-locked Vault for private notes.
- Data stays in the user's own browser. It never connects to a broker, never places trades, gives no signals.
- Price: **$15 one time**, no subscription. Checkout: https://whop.com/the-void-619c/the-void-b1/ (Whop). After paying, Whop's Claim Access page links the buyer's Discord account and the bot gives the Buyer role, which unlocks the download channel.
- Domain: https://gethevoid.com (Cloudflare). Discord invite: TBD (placeholder constant `LINKS.discord`).
- Support email (to set up): support@gethevoid.com.
- Not affiliated with TradingView, Tradovate, any prop firm or data provider. Keep the full disclaimer in the footer (see reference/v2-home.template.html).

## Brand
- Black and red. Tokens: bg #050305, bg-2 #0d0709, ink #f3eeee, muted #a99ca0, red #e0102a, red-hot #ff3b47, red-deep #5c000f, line #2b161b.
- Fonts: Bricolage Grotesque (display, variable wdth/wght), Instrument Sans (body), DM Mono (price and small data labels only).
- Signature: the "O" of VOID is a live WebGL black hole (see the shader in reference/v2-home.template.html). Keep it. Everything else stays quieter than the hero.
- Logo: assets/brand/mark.svg (red ring cut by a V). Share image: assets/brand/og.png.

## What exists
- reference/v2-home.template.html is the current single-page site (hero black hole, pinned dashboard reveal with three highlight beats, trade and vault split rows, toolbox list, how-to-get-it, FAQ, footer). It has `{{DASH}}`, `{{TRADE}}`, `{{VAULT}}` image placeholders; the real images are in assets/screens/. Port it, do not copy it blindly: improve structure and performance.
- Libraries already proven: GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13. Add Three.js or OGL only where it earns its weight.

## Goal
Turn the single page into a small, genuinely impressive product site that sells a $15 download to traders arriving from TikTok on phones. Highest priority is trust and clarity; effects serve the product, never hide it.

## Site map
1. **Home**: cinematic story. Hero black hole, then a scroll-driven sequence (chart goes dark, journal rises, numbers assemble, vault locks). One claim and one visual per beat. Pinned dashboard reveal stays. Clear Buy CTA near the top and again after the story.
2. **Live demo** (/demo): clickable replica of dashboard, trades list, trade detail and vault lock screen, running on built-in sample data. No real extension code, no network calls. Click a day, open a trade, switch Today/Week/Month. Label "Sample data". This is the key conversion feature.
3. **Setup** (/setup): public install guide with steps, screenshots and an embedded video slot. Steps: unzip, chrome://extensions, Developer mode, Load unpacked, pin the extension, open TradingView, import Orders CSV, first settings (time zone, fee per contract, risk limits). Mention the Chrome developer-mode startup popup is normal. Say to back up before updating.
4. **Changelog** (/changelog): honest, short entries. Start with 0.1.0.
5. **Legal**: /terms, /privacy, /refunds (drafts; flag as needing the owner's lawyer review before launch). Privacy: the site uses cookieless analytics only.
6. **Pricing/Buy section** on Home: $15 one time, what is included, refund line, FAQ, Whop checkout button.

## Visual and motion
- Smooth scroll (Lenis), scroll storytelling (GSAP), subtle 3D tilt on screenshots, page transitions between routes, numbers counting up and an equity curve that draws itself in the demo.
- Optional: a Three.js/OGL object (the logo ring or floating dashboard) reacting to the cursor.
- No autoplay audio. Respect prefers-reduced-motion everywhere (static fallback). Phones get a lighter version (lower DPR, fewer effects, no pin if it hurts usability).

## Technical
- Static site, no backend. Suggested: Astro (static output) with islands for the interactive parts, or Vite plus plain TS. Choose what keeps the demo simple and the bundle small and say why.
- Deploy: GitHub repo with Cloudflare auto-deploy on push to main (Workers static assets or Pages). The current live site is a Cloudflare project named `thevoid`; attach gethevoid.com there.
- Analytics: Cloudflare Web Analytics only (cookieless). No other trackers.
- SEO: titles, descriptions, canonical gethevoid.com, Open Graph and Twitter cards (og.png), sitemap.xml, robots.txt, structured data for SoftwareApplication. Target phrases: "Tradovate CSV journal", "TradingView trading journal extension".
- Fonts self-hosted (woff2) for speed and privacy where possible.
- Accessibility: keyboard focus visible, semantic headings, alt text, contrast AA, no motion-only information.

## Quality gates (check before every deploy)
- No console errors on desktop and a 390px phone viewport; no horizontal overflow.
- Lighthouse mobile: Performance 85+, Accessibility 95+, SEO 95+ (report actual numbers).
- Screenshot every page at 1440 and 390 and look at them. Check text over the WebGL hero stays readable.
- Links: Buy button goes to the Whop URL; Discord buttons fall back to scrolling to the buy section until the invite exists.
- Copy: no earnings claims, no fake social proof, disclaimer present.

## Process
1. Propose two or three visual directions for the Home story (short descriptions and a quick static comparison), let the owner pick one, then build.
2. Build order: foundation and deploy pipeline, Home, Demo, Setup, Changelog, Legal, polish and performance.
3. After each milestone, deploy and give the owner the live URL and a two-line summary.
