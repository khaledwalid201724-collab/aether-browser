# Aether website

A static, dependency-free site for downloading Aether and browsing its extension store.

## Run it locally

```bash
./site/serve.sh
```

Then open <http://localhost:8000/>. The script automatically:

- copies the newest built AppImage into `site/downloads/`,
- writes `SHA256SUMS`,
- packs every bundled extension into `site/downloads/extensions/*.zip`.

Pass another port as the first argument, e.g. `./site/serve.sh 8080`.

## Publish it

The site is plain HTML/CSS/JS, so any static host works:

1. Copy this `site/` directory to your host (or connect a GitHub repo to Pages/Netlify/Cloudflare Pages).
2. The canonical links, `robots.txt` and `sitemap.xml` already point at **https://aether-browser.com/**. Change them here only if you move the site to a different domain.
3. The Store's “Visit the Aether website” button and the Settings website field also default to that domain. You can still override the address from Aether Settings if needed.
4. Submit the domain to search engines (Google Search Console, Bing Webmaster Tools). `sitemap.xml` and `robots.txt` are already included.

The 211 MB AppImage cannot be committed to GitHub (100 MB per-file limit), so the download buttons point at the **v1.0.0 GitHub Release** asset and `SHA256SUMS` is attached there too. Run `./scripts/publish-site.sh` from the project root to sync the site and create the release.

## Pages

- `index.html` — landing page with download button and SEO metadata
- `store.html` — web catalog of Aether extensions
- `downloads/` — direct AppImage and ZIP downloads
- `manifest.webmanifest` — PWA metadata
