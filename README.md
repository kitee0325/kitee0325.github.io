# Kitee Website

Personal website, blog, and project gallery for Kitee. The site is built with Docusaurus, React, and TypeScript, with custom homepage sections for the profile, featured writing, WebGL background, and visualization project videos.

## Tech Stack

- Docusaurus 3
- React 18
- TypeScript
- MDX blog posts
- Mermaid diagrams
- React Three Fiber / Three.js for interactive visual work

## Common Commands

```bash
npm install
npm run start
npm run start:zh
npm run typecheck
npm run build
npm run serve
```

`npm run start` serves the default English locale. `npm run start:zh` serves the Simplified Chinese locale.

## Content Layout

- `blog/`: English MDX posts.
- `i18n/zh-Hans/docusaurus-plugin-content-blog/`: Simplified Chinese blog translations.
- `drafts/`: Draft posts that are not ready for the public site.
- `src/pages/index.tsx`: Custom homepage composition.
- `src/features/`: Homepage feature sections and the WebGL background.
- `src/components/`: Shared homepage and reading components.
- `static/`: Images, videos, PDFs, demos, data files, and 3D models served as static assets.

## Build And Deployment Notes

The production build generates both English and Simplified Chinese locales:

```bash
npm run build
```

Static assets are intentionally large because the site includes videos, PDFs, demos, GIFs, and model files. Build output is written to `build/` and should not be committed.

Blog posts should only live in the public content folders after both English and Simplified Chinese versions are ready. If either language version is missing, keep the article under `drafts/` until it is complete.

For GitHub Pages deployment, use the Docusaurus deploy script when needed:

```bash
GIT_USER=kitee0325 npm run deploy
```
