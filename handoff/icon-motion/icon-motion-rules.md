# Sloosh icon motion: rules

The rule set for animating icons across Sloosh. It was built and tested on the Explore landing page, and it applies to every icon in the product.

- **Live specimen** (hover or press any card): https://claude.ai/artifact/Gvpg4gCRigM1jrevwMN7jg
- **Reference build:** `sloosh-explore/icon-motion.css` and `icon-motion.js`
- **Full inventory and implementation notes:** `icon-motion-context.md`

---

## 1. Base rules for every icon

| Rule | Value |
|---|---|
| Library | Hugeicons only (`@hugeicons/core-free-icons`, stroke style). No custom-drawn icons. |
| Stroke | 1.75px everywhere, through one token: `--icon-stroke: 1.75`. |
| Size: icon on its own | 20px |
| Size: icon inside a text button or row | 16px |
| Size: small (chips, tiles, meta) | 14px |
| Colour | `currentColor`. The icon takes the colour of its text. |

## 2. When an icon moves

1. **Only when the user touches it.** An icon moves when the user hovers or presses the thing it sits in, or when a click changes state.
2. **Nothing moves on its own.** No motion on scroll-in, on page load or on appear. Icons get no more attention than the text next to them.
3. **The trigger is the container, not the glyph.** Hovering anywhere on the button, tab, chip or tag plays its icon.
4. **One at a time.** Only the icon in the hovered thing moves. Neighbours stay still.
5. **Touch screens** have no hover, so the motion plays on press.
6. **The press belongs to the button.** The keycap going down moves the button with everything in it. That is not icon motion. The icon adds its own motion on top.
7. **Same icon, same motion, everywhere.** Different icons can move differently.
8. **Scenes keep their own timing.** Icons inside scripted animations (hero, Spacelab, Agents scenes) follow the scene, not the pointer.
9. **Sound stays on the button press.** Icons never get their own sound.

## 3. Which motion an icon gets

Work through these questions in order and stop at the first yes.

```
Is it an arrow (chevron left/right, arrow up/down/left/right, send)?
  → ARROW: nudge on hover, fly-through on press
Is it a chevron that opens or closes something (dropdown, accordion, disclosure)?
  → ROTATE with the open state
Does the object it shows have one obvious action (a plug plugs in, a bell rings)?
  → CONTEXTUAL: the object does that action
Otherwise, or when in doubt
  → DRAW: the icon redraws itself
```

### DRAW (the default)

The icon redraws its strokes one after another, like a pen. Use it for every plain icon: plus, minus, tick, image, folder, home, info and so on.

- **Plus and minus never rotate.** Plain icons never rotate.
- **Timing:** each stroke takes 0.44s. Each next stroke starts 0.06s after the one before it, in the order the Hugeicons file draws them.

### ARROW

- **Hover:** the arrow nudges 2.5px the way it points, then comes back (0.42s).
- **Press or click:** the arrow flies out of its box the way it points and comes back in from the opposite side (0.46s). The arrow is clipped to its own box, so it really leaves view. It reads as "something happened", even before the system responds.

### ROTATE

- **Only for chevrons that open something.** The chevron turns 180° while the thing is open and turns back when it closes (0.2s). It follows the state; it isn't a hover effect.
- **Agreed exception:** reload and repeat turn once (half a turn, 0.56s), because going round is what they mean.

### CONTEXTUAL

The object acts out its action. Keep this list tight: if the action isn't obvious within a second, use DRAW. Approved so far:

| Icon | Action |
|---|---|
| Plug | Pushes up into the socket; the cable stretches with it |
| Link | The two halves pull apart, then click together |
| Video camera | The lens pushes out; the record dot blinks |
| Copy | The front sheet slides out of the back one |
| Sparkles | Each star shrinks and turns; the small one goes a beat later |
| AI chat bubble | The bubble leans in like it's talking; the letters write themselves |
| Magic wand | A flick from the handle; the sparks pop one after another |
| Flask | The test tube swirls |
| Lock | The shackle lifts and clicks shut |
| Credit card | A quick swipe |
| Book | The right page turns |
| Clock | The hands sweep one lap |
| Mouse | It clicks down; the click mark draws |
| Expand | The four corners push out, then settle |
| Reload, Repeat | Go round once (the rotation exception) |

Candidates when the full library gets mapped: a bell rings, a bulb lights, volume waves pulse, a trash lid lifts, a gear turns, an eye blinks. Each one needs sign-off before it ships. Anything else gets DRAW.

### SWAP (state changes)

When a click replaces one icon with another (play↔pause, sun↔moon, copy→tick), the new icon blurs and scales in over 0.3s, then plays its own motion. The automatic swap back (tick→copy after 1.5s) uses the same swap.

### IDLE (one exception)

The only icon allowed to move on its own is the Sparkle on "Try Gemini Omni". It twinkles every 5.5s, only while it's on screen and nobody is hovering it. Nothing else idles without sign-off.

## 4. Size and feel

- **Duration:** 0.4–0.7s per icon. Draw icons with many parts run a little longer because of the stagger.
- **Travel and turn:** small. Up to about 2.5px of travel, small tilts, and a scale between 0.5 and 1.3 for parts. Only arrows (flying out) and state rotations move further.
- **Easing:** three curves only.
  - **arrive** `cubic-bezier(0.23, 1, 0.32, 1)`: for things settling into place.
  - **hop** `cubic-bezier(0.34, 1.56, 0.64, 1)`: a small overshoot, for playful returns.
  - **in-out** `cubic-bezier(0.65, 0, 0.35, 1)`: for draws, sweeps and swirls.
- **Every motion ends exactly where it started.** An icon never rests in a moved state; only an open chevron stays turned.
- **No interruptions.** A motion that's already running finishes; hovering again doesn't restart it. The one exception is pressing an arrow, which cuts in and flies.

## 5. Not decided yet

- **Reduced motion** (`prefers-reduced-motion`): not handled yet, by choice for now. The proposal is to fall back to no motion, with swaps becoming a plain cross-fade.
- **Contextual candidates** listed in section 3 need sign-off before they ship.
