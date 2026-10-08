# Sloosh Explore (V1 base)

Static prototype of the Explore / landing page, built on V1 and the content skeleton. No build step.

- `/` (index.html): **Nav A, top nav.** The logo is home; four doors: Studio, Spaces, Agents, Cast.
- `/sidebar` (sidebar.html): **Nav B, app sidebar.** Home, Studio (Image, Video), Spaces (+ create), Agents, then Library (Cast, Assets).
- Both share one page body. Phones use the same bottom tab bar: Home, Studio, Spaces, Agents, Assets.

Run locally: `npx serve .` (or `python3 -m http.server`). Deploy on Vercel: framework **Other**, no build command, output `.`.

Files: `index.html`, `sidebar.html`, `explore.css` / `explore.js` (this page), `kit.css` / `kit.js` (DS4 tokens, keycaps, sounds, logo eyes), `media/`.
