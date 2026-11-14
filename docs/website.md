# Project website / Projektwebsite

Static, dependency-free EN/DE site in `website/`. All paths are relative so it works under a GitHub Pages repository path. No build required. No analytics, external fonts or embedded services.

GitHub Pages is deployed by **Release preview** after the package checks and GitHub release succeed. Push a version tag matching `manifest` and `package.json`, such as `v1.0.7`. The website is taken from exactly the same tag. Ordinary branch pushes check the source without publishing it. A manual release dry run (`publish` off) also leaves the website unchanged.

GitHub Pages must use **GitHub Actions** as its source. The repository is configured for this; for a fork, select it under **Settings → Pages**.

Public base URL: `https://videowall.gh.gammaproduction.de/`.

Roku dashboard URLs after deployment:

| Purpose | English | Deutsch |
| --- | --- | --- |
| Playlist workshop | `/editor.html` | `/de/editor.html` |
| Website | `/` | `/de/` |
| Support | `/support.html` | `/de/support.html` |
| Privacy | `/privacy.html` | `/de/privacy.html` |
| Terms | `/terms.html` | `/de/terms.html` |
| Legal notice | `/imprint.html` | `/de/imprint.html` |

Prefix each path with the base URL without its final slash. Privacy and terms are project-specific drafts, not a legal opinion. Provider: Gerry Weißbach; address supplied by the owner, contact email from the existing Gamma Production imprint. Review these details before publication. The older external imprint still displays a different address.

Preview headlessly with `python3 -m http.server 8765 --directory website` and visit `http://localhost:8765/`. To edit content, edit the HTML directly. Store upload descriptions and artwork are in [store-assets](store-assets/README.md).

The browser-only workshop imports filenames/M3U, edits order and timing, exports UTF-8 M3U, and previews placeholders. Run `npm run test:website` for import/export contract tests. Media file contents are never read; only an explicitly selected M3U is read as text.
