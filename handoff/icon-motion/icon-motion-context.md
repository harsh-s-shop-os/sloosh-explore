# Sloosh icon motion: context and handoff

This document goes with `icon-motion-rules.md`. The rules say *what* each icon does and *why*. This document records what was built on the Explore landing page, lists every animated icon with its exact spec, and explains how to extend it to the whole icon library and a design-system page.

- **Live specimen:** https://claude.ai/artifact/Gvpg4gCRigM1jrevwMN7jg (v2)
- **Reference build:** the `sloosh-explore` prototype
  - `icon-motion.css`: every motion
  - `icon-motion.js`: finds icons, names them, splits them into parts and plays them
  - both are loaded by `index.html` and `sidebar.html`
- **Commits:** 849ced6 (v1), 40e756b (v2, the current rules)

---

## 1. How we got here

1. **Icon audit.** Every icon on the page was moved to Hugeicons, set to 1.75px stroke and sized to the design-system rule (20 alone / 16 in a button or row / 14 small).
2. **v1.** Every icon got its own style, including rotations for plus, minus, moon and others. It also had a "ride" style, where the icon just moves with the button press. That style was dropped, because the press belongs to the button.
3. **v2 (current).** Lobster's corrections:
   - Plain icons **redraw** instead of rotating; plus and minus never rotate.
   - When in doubt, draw.
   - Only icons with an obvious object action get their own motion.
   - Arrows nudge on hover and fly through on press.
   - Chevrons that open things rotate with their state.
   - No motion on scroll-in or on appear.

---

## 2. Inventory: every animated icon

**Part numbers** (`[data-p="n"]`) are the icon's shapes in Hugeicons source order: every `path`/`circle` child of the `<svg>`, counted from 0.

**Coordinates** are in the 24×24 viewBox.

**Easing names:**
- **arrive** = `cubic-bezier(.23,1,.32,1)`
- **hop** = `cubic-bezier(.34,1.56,.64,1)`
- **io** = `cubic-bezier(.65,0,.35,1)`

### 2a. DRAW: plain icons (default)

Every part draws in. Spec:
- `stroke-dasharray: 1`, with `pathLength="1"` on each shape
- `stroke-dashoffset` animates from 1 to 0
- 440ms per part with **io** easing
- each part starts `60ms × part index` after the first
- total time = 440 + 60 × (parts − 1)

| Key | Hugeicons name | Parts | Where on Explore |
|---|---|---|---|
| plus | PlusSign | 1 | Create a space (nav, Spacelab, sidebar) |
| add | Add01 | 2 | Add media, more generations (prompt box) |
| minus | MinusSign | 1 | Fewer generations |
| tick | Tick02 | 1 | Copied, saved, published |
| play | Play | 1 | Clone a video, play stories |
| pause | Pause | 2 | Pause stories |
| image2 | Image02 | 3 | Image tabs |
| image1 | Image01 | 3 | Image mode (prompt box) |
| imgadd | ImageAdd02 | 3 | Create more images |
| folderadd | FolderAdd | 2 | Save assets |
| folder | Folder01 | 1 | Assets |
| sun | Sun03 | 2 | Theme switch (dark mode) |
| moon | Moon02 | 1 | Theme switch (light mode) |
| workflow | WorkflowSquare02 | 5 | Spaces |
| userstar | UserStar01 | 3 | Start your cast |
| aivideo | AiVideo | 3 | Video (sidebar) |
| home | Home01 | 1 | Home |
| crown | Crown | 3 | Upgrade (sidebar) |
| info | InformationCircle | 3 | Prompt box info |
| diamond | Diamond | 1 | Resolution chip |
| share | Share08 | 4 | Spacelab scene only |
| grid | GridView | 4 | Spacelab scene only |

### 2b. ARROW

Each arrow is clipped to its own box (`overflow: hidden` on the svg).

| Key | Hugeicons name | Hover (nudge, 420ms io) | Press (fly-through, 460ms) | Where |
|---|---|---|---|---|
| chev-r | ArrowRight01 | +2.5px x at 40%, then back | out +16px x and fade (ease-in to 38%), jump to −16px, back to 0 (arrive) | Next story, Browse all, All models, All Seedance films |
| chev-l | ArrowLeft01 | −2.5px x | out −16px, back in from +16px | Previous story, Try another image |
| arrow-up | ArrowUp02 | −2.5px y | out −18px y, back in from +18px | Send in the prompt box |

The fly-through's ease-in curve is `cubic-bezier(.55,0,1,.45)`. Pressing an arrow interrupts a running nudge.

### 2c. ROTATE (state)

| Icon | Spec | Where |
|---|---|---|
| ArrowDown01 (chevron down) | `rotate(180deg)` while open; 200ms arrive. This lives in `kit.css` (`.ni:hover > .nl .chev`), not in icon-motion. | Nav Spaces dropdown |
| reload: ArrowReloadHorizontal | Whole icon rotates 0→180°, 560ms hop, origin 12 12. The icon looks the same after 180°, so there is no jump at the end. | Surprise me again, Regenerate |
| repeat: Repeat | Same as reload | Spacelab scene only |

### 2d. CONTEXTUAL

Motion values are listed at their keyframe percentages.

| Key | Hugeicons name | Parts that move | Motion | Duration | Where |
|---|---|---|---|---|---|
| plug | Plug01 | 0 prongs, 1 body, 3 mark; 2 cable | 0/1/3 move `translateY(-2.5)` at 35% and settle back (hop). Cable `scaleY(1.5)` at 35%, origin 12 22. | 540 | MCP tag |
| link | Link01 | 0 lower half, 1 upper half | p0 moves (−2,2) at 35%, then (0.6,−0.6) at 70%, then 0. p1 moves the mirror (2,−2) and (−0.6,0.6). io. | 520 | Connect your agent |
| video | Video01 | 1 lens, 2 record dot | Lens `translateX(2.5)` at 35%, hop. Dot opacity 1→0 at 20%→1 at 35%→0 at 50%→1 at 70%, linear. | 520 / 560 | Make it a video, Make your ad, Video tabs |
| copy | Copy01 | 0 front sheet | `translate(-5,-5)` with opacity 0 at 22%, then back to place with hop | 480 | Copy server address |
| sparkles | Sparkles | 0 big star (origin 15 9), 1 small star (origin 7 17, +90ms) | `scale(.5) rotate(40deg)` at 35%, ending at `scale(1) rotate(90deg)`. The star looks the same after 90°. | 560 | Try Gemini Omni, Try Seedance, Studio, Models; idle loop |
| aichat | AiChat02 | 0 bubble (origin 3 21), 1 "AI" letters | Bubble `rotate(-7deg) scale(1.06)` at 40% then back (hop). Letters draw in over 420ms, starting at +80ms. | 520 | Agents |
| wand | MagicWand01 | 0 wand (origin 20.5 21), 1–3 sparks (fill-box centre) | Wand `rotate(-14deg)` at 30%, back with hop. Sparks `scale(.2)` at 30% to `scale(1) rotate(90deg)`, starting at +80/160/220ms. | 520 / 480 | Enhance chip |
| flask | Chemistry01 | 1 tube, 3 rim (origin 14 4) | rotate 16° at 30%, −8° at 65%, then 0. io. | 620 | Spacelab tag |
| lock | SquareLock02 | 1 shackle | `translateY(-2.5)` at 35%, then back with hop | 500 | "Your photo stays private" |
| card | CreditCard | whole icon | `translateX(2.5) rotate(-5deg)` at 35%, then back with hop | 480 | "No card required" |
| book | BookOpen01 | 1 right page (origin 12 12) | `scaleX(.15) skewY(-6deg)` at 45%, then back. io. | 560 | Docs (sidebar) |
| clock | Clock01 | 1 hands (origin 12 12) | rotate 0→360°, io | 640 | Spacelab scene only |
| mouse | MouseLeftClick01 | 0, 2, 3 body; 1 click mark | Body `translateY(1.2)` at 25%, then back. Mark draws over 300ms, starting at +90ms. | 420 | Spacelab scene only |
| expand | ArrowExpand | 0+6 TL, 2+4 TR, 1+5 BL, 3+7 BR | Each corner moves out 1.6px diagonally at 40%, then back. io. | 480 | Spacelab scene only |

### 2e. SWAP

The incoming icon animates from `opacity:0; scale(.5); blur(3px)` to its rest state over 300ms with **arrive** easing, then plays its own motion.

| Control | Icons | How the state flips on Explore |
|---|---|---|
| Stories pause/play | pause ↔ play | `.stories.paused` toggles `.pz` / `.pl` |
| Theme switch | sun ↔ moon | `html[data-theme]` toggles `.sun` / `.moon` |
| Copy server address | copy → tick → copy | `.addr.copied` for 1.5s |

### 2f. IDLE

The Sparkles icon on the "Try Gemini Omni" button plays every 5.5s. It runs only while the button is at least 60% on screen, the pointer isn't on it, and the tab is visible.

### 2g. Left alone on purpose

- **Meta logo and other brand logos:** they are not icons. The logo rows have their own hover scale.
- **Icons inside scripted scenes** (`.mm`, `.ma`, `.mm-in`, Spacelab collaborator cursors): the scene drives them.

---

## 3. Triggers: exact behaviour

| Input | Behaviour |
|---|---|
| Mouse/pen enters a host | Plays hover motion (arrows nudge) |
| Pointer down on a host (any pointer) | Plays press motion (arrows fly; others play their normal motion) |
| Touch | Press only, never hover |
| Keyboard focus (`:focus-visible`) | Same as hover |
| Enter / Space on a focused host | Same as press |
| Motion already running | Finishes. Re-hover is ignored. Pressing an arrow interrupts. |

**Hosts** (the "container" whose hover or press plays the icon):
- `a`, `button`, `[role=button|tab|radio|switch|checkbox]`, `label`, `summary`
- plus small labelled containers: tags/eyebrows, the prompt chips, trust-line items
- an icon belongs to its **nearest** host; a host plays only its own icons

---

## 4. Implementing across the product (agents only)

This section is for the dev agent porting the rules to the React design system (`Sloosh-design`). The prototype is plain CSS/JS. Keep the behaviour and rebuild the structure natively.

**Recommended shape in the design system**

1. **An `<Icon>` wrapper** around every Hugeicons render. It takes a `motion` value: `"draw" | "arrow-r" | "arrow-l" | "arrow-u" | "arrow-d" | "rotate-state" | "<contextual key>" | "none"`.
   - Default to `"draw"`. Set `pathLength="1"` on every shape and `--i` (part index) on each part.
2. **A motion registry** (one file) mapping Hugeicons component name → motion key, plus duration.
   - Unknown icons fall back to `"draw"`. That's the "when in doubt, draw" rule in code.
3. **Trigger from the host, not the icon.**
   - Buttons, tabs, chips and menu items set a `data-icon-play` attribute (or call a ref method) on pointerenter, pointerdown, focus-visible and Enter/Space.
   - Only that host's own icons play.
   - Run the play with a class toggle plus a timeout, or with WAAPI. Never use CSS `:hover` selectors on the icon: they restart on every re-enter and can't express press vs hover.
4. **State rotation** (chevrons): drive it from the component's own `open` / `aria-expanded` prop with a 200ms transition. It's not part of the play system.
5. **Swap:** the component that flips the icon (toggle, copy button, play/pause) mounts the new icon with the swap class, then calls its play. Easier in React than the prototype's MutationObserver.
6. **Contextual keyframes:** copy them from `icon-motion.css`. Part indices follow Hugeicons source order. If a Hugeicons version changes an icon's path order, re-check that icon's part map.

**Gotchas found while building**

- **Transforms on SVG children** use viewBox units: `translateX(2.5px)` means 2.5 units of the 24-unit grid. Set `transform-origin` in viewBox coordinates (e.g. `12px 22px`). For "rotate around its own centre", use `transform-box: fill-box`.
- **Fly-through relies on clipping** at the svg box: `overflow: hidden` on the arrow's svg only. Every other icon needs `overflow: visible` so overshoots aren't cut off.
- **Draw needs `fill: none` shapes.** Filled (solid) Hugeicons variants can't draw; give them `"none"` or a fade.
- **Rotation only where the end state looks identical to the start** (plus at 90° was v1, now removed; star 90°; reload 180°; sun rays 45°). Otherwise the reset jumps when the class drops.
- **Stroke width** is overridden globally through `--icon-stroke`. Keep `stroke-width` attributes on the shapes so the selector matches.
- **Icons rendered later** (menus, prompt chips) must get the same treatment. In React the wrapper handles this. The prototype needed a MutationObserver.

**Design-system page (what to show)**

1. The decision flow (rules §3) as a diagram.
2. One live card per motion type (draw, arrow, rotate-state, contextual, swap, idle), each with hover/press demos at real size and enlarged.
3. The full registry table (§2 of this document), generated from the registry file so it can't drift.
4. Tokens: `--icon-stroke`, the three easings, the draw timing (440ms / 60ms stagger), swap timing (300ms), the arrow values (2.5px nudge, 16px fly).
5. A "proposing a new contextual icon" note: describe the object's one action in a sentence; if it doesn't fit in one sentence, it's a draw.

---

## 5. Open items

- **Reduced motion:** not implemented. Proposal: no motion, with swaps as a plain 150ms cross-fade.
- **Contextual candidates** for the wider library (bell, bulb, volume, trash, gear, eye) need sign-off. Everything else is draw.
- **reload/repeat** are the one rotation outside chevrons. They're kept on purpose, and a one-line change makes them draw if that's preferred.
