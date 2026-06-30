# HarborNavi Site

Prelaunch landing page for `harbornavi.com`.

This project is intentionally separate from the HarborNavi product coordination repository. HarborNavi docs remain the source of truth for GTM and product decisions; this repo is only the public landing page implementation.

## Routes

- `/home`: combined HarborNavi positioning.
- `/package`: package alert beta positioning.
- `/pets`: pet highlights beta positioning.
- `/privacy`: v0 privacy placeholder for prelaunch waitlist testing.

## Commands

```bash
npm install
npm run dev
npm run build
```

Use `npm run preview` after `npm run build` when checking production-style routing locally.
Astro dev serves `/package/` correctly, but bare `/package` can collide with `package.json` in dev mode. Production preview and static output serve `/package` correctly.

## V0 Notes

- Hero visuals are generated storyboard placeholders under `public/assets/`.
- The waitlist form is a placeholder until Tally is connected.
- Analytics is a front-end event interface only; no paid pixels are installed yet.
