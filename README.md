# Bubble Borough

Bubble Borough runs through Node. The repository layout separates the playable aquarium from the public website:

- `game/`: the canonical game document, existing `assets/` and `public/` systems, mobile compatibility document, and game-specific Supabase function/configuration.
- `website/`: one server-rendered HTML shell, homepage content partial, route registry, CSS, and authentication/installed-app compatibility script.
- `scripts/`: Node server, build tools, audits, and regression tests.
- `docs/`: architecture, game system documentation, and release checks.

Run `npm start` and use the URL printed by the server. `/` opens the website; `/play` opens the game. `/fish`, `/decor`, `/news`, `/faqs`, and `/about` are recognized public website routes. They temporarily share homepage content and are not indexable.

GitHub Pages serves the root landing page at `index.html`, public pages under `website/`, and the game at `game/index.html`. Game artwork and runtime files live only in `game/assets/` and `game/public/`; do not create root-level asset or public copies.

For hosted Node use, set `HOST`, `PORT`, and `NODE_ENV=production` as appropriate and run `node scripts/start-web.cjs --no-open`. TLS and preferred-host redirects remain the responsibility of the existing deployment/reverse proxy. There is no website generation step.

Production Node delivery compresses text with Brotli/gzip and revalidates static assets using content ETags. HTML and development responses use `no-store`. Compression is prepared asynchronously on first use and reused in a bounded 64 MiB server cache. Existing version-query URLs are revalidated rather than treated as immutable; GitHub Pages controls its own delivery headers.

Run `npm run check:website` for routing/compatibility checks, `npm run check:app` for the game bundle/assets, and `npm test` for the standard regression command. See [the architecture and migration report](docs/public-website-implementation.md) for known baseline failures and production verification limits.
