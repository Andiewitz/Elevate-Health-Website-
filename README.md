# Elevate Health Chiropractic — Redesign

A private Astro redesign for Elevate Health Chiropractic in South Burlington, Vermont. Uses DM Sans, the practice's downloaded logo and photography, and its charcoal/white/red brand palette.

## Project structure

- `src/pages/index.astro` — homepage content and interactions
- `src/styles/global.css` — responsive styling
- `src/components/Icon.astro` — small inline icon component
- `public/images/` — downloaded assets from the original practice website
- `dist/` — generated static build
- `.openai/hosting.json` — Site hosting configuration

## Local preview

From this directory, run:

```powershell
npm install
npm run dev
```

Then open `http://localhost:4321`.

Run `npm run build` to generate `dist/`.

Appointment actions use the practice's real telephone number and email. Email opens the visitor's email client; there is no simulated contact form or booking backend. Content is adapted from https://www.elevatehealthchiropractic.com/. Confirm clinical statements, insurance participation, and appointment availability with the practice before public launch.
