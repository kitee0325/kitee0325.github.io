# Kitee Website

Personal website and blog for Kitee, built with Docusaurus, React, and TypeScript. The homepage combines an interactive pixel aquarium and illustrated learning cards.

## Tech Stack

- Docusaurus 3
- React 18
- TypeScript
- MDX blog posts
- Mermaid diagrams
- React Three Fiber / Three.js for interactive visual work

## Common Commands

```bash
npm ci
npm run start
npm run start:zh
npm run typecheck
npm run check:aquarium
npm run build
npm run serve
```

`npm run start` serves the default English locale. `npm run start:zh` serves the Simplified Chinese locale.

## Content Layout

- `blog/`: English MDX posts.
- `i18n/zh-Hans/docusaurus-plugin-content-blog/`: Simplified Chinese blog translations.
- `drafts/`: Draft posts that are not ready for the public site.
- `src/pages/index.tsx`: Custom homepage composition.
- `src/features/`: Homepage sections, aquarium simulation, and local WebGL water renderer.
- `src/components/`: Shared homepage and reading components.
- `static/`: Images, videos, PDFs, demos, data files, and 3D models served as static assets.
- `design-assets/`: Versioned image sources, prompts, provenance, and local asset boards; not published.
- `artifacts/` and `plans/`: Ignored local test output and historical working notes.

## Build And Deployment Notes

The production build generates both English and Simplified Chinese locales:

```bash
npm run build
```

Static assets are intentionally large because the site includes videos, PDFs, demos, GIFs, and model files. Build output is written to `build/` and should not be committed.

Blog posts should only live in the public content folders after both English and Simplified Chinese versions are ready. If either language version is missing, keep the article under `drafts/` until it is complete.

## Browser Verification

Use Node 20, matching CI. Playwright is a pinned development dependency. On macOS the scripts use installed Google Chrome with Metal; elsewhere install Chromium with `npx playwright install chromium`. `BROWSER_EXECUTABLE_PATH` can select another Chromium executable. The water-effects recording check also needs `ffmpeg` on PATH.

Build and serve the isolated preview in one terminal:

```bash
npm run build:preview
npm run serve:preview
```

Then run the browser acceptance suite in another terminal:

```bash
npm run check:browser
```

The suite covers both languages, themes, responsive layouts, keyboard input, reduced motion, simulation transitions, fallback paths, and GPU resource cleanup. Screenshots, logs, and recordings go to ignored `artifacts/`. `BROWSER_BASE_URL` overrides the default `http://127.0.0.1:3101`.

`hero-p0` is enabled only by the explicit preview build, whose output is `build-preview/`. Normal `npm run build` excludes it and runs `check:production` to reject leaked preview pages or source asset boards. Never deploy `build-preview/`.

## Release

`main` is the release branch. Merge the verified feature branch into `main`, then push `main`. The GitHub Pages source must be **GitHub Actions** in repository Settings → Pages. The workflow checks types, aquarium logic, and both production locales before uploading only `build/` and deploying it. Pull requests targeting `main` run the same checks without deploying; manual deployment is also restricted to `main`.

Before merging:

```bash
npm run typecheck
npm run check:aquarium
npm run build
```

After pushing, verify the matching commit's Actions run and both live locales. Browser checks use desktop emulation; Safari, real mobile devices, native zoom, and screen readers still require manual testing.
