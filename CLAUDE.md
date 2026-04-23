# CLAUDE.md — test-claude-remote

## Project overview

Static web application that visually simulates and validates a CI/CD pipeline.
Deployed on GitHub Pages at `https://mdrolo.github.io/test-claude-remote/`.

## Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Markup     | Vanilla HTML5 (no framework, no build step)     |
| Styles     | Vanilla CSS3 — custom properties, CSS variables |
| Logic      | Vanilla JavaScript ES2020 (no bundler, no npm)  |
| Deployment | GitHub Actions → GitHub Pages                   |
| Hosting    | GitHub Pages (static, CDN-backed)               |

**Zero dependencies.** No npm, no node_modules, no bundler, no transpiler.
Everything ships as-is from the repository root.

## File structure

```
/
├── index.html          # Single-page app shell
├── style.css           # All styles — dark + light theme via [data-theme]
├── app.js              # All logic — pipeline simulation + theme toggle
├── CLAUDE.md           # This file
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Pages deployment (auto on push to main)
```

## Key conventions

### CSS theming
- Default theme is **dark** (`:root` variables).
- Light theme overrides are applied via `[data-theme="light"]` on `<html>`.
- All colors go through CSS custom properties — never use hardcoded hex values in component rules.
- Theme preference is persisted in `localStorage` (key: `theme`) and auto-detected via `prefers-color-scheme` on first visit.

### JavaScript
- No classes, no modules — single IIFE-free script file.
- State lives in a single `state` object at the top of `app.js`.
- DOM helpers `$` / `$$` are thin wrappers around `querySelector` / `querySelectorAll`.
- Pipeline stages are driven by `data-stage` and `data-test` attributes in the HTML.
- Adding a new stage only requires: a new card in `index.html` + adding the stage key to the `STAGES` array in `app.js`.

### Simulated pipeline behavior
- Each test has a `data-duration` attribute (milliseconds). Actual delay is divided by 4 for demo speed.
- Pass rate is 90% per test (`Math.random() > 0.1`).
- When running the full pipeline, a failing stage stops subsequent stages (fail-fast).
- Individual stages can be run in isolation via their own "Exécuter" button.

## Deployment

Push to `main` → GitHub Actions workflow (`.github/workflows/deploy.yml`) triggers automatically → deploys the repo root as a static site.

To trigger manually without a code change: `git commit --allow-empty -m "chore: trigger deploy" && git push`.

The `deploy.yml` uses the official GitHub Pages action stack:
`actions/checkout@v4` → `actions/configure-pages@v5` → `actions/upload-pages-artifact@v3` → `actions/deploy-pages@v4`.

## What NOT to do

- Do not introduce a build step, bundler (Vite, Webpack, Parcel), or package manager — the zero-dependency constraint is intentional.
- Do not inline `<style>` or `<script>` tags in `index.html` — keep concerns separated across the three files.
- Do not add a `gh-pages` branch — deployment is handled via GitHub Actions artifacts, not branch-based Pages.
- Do not use `!important` in CSS — all theming is handled cleanly via variable overrides.
