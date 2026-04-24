# Design System

A Duolingo-style mobile app for college chemistry. This document is the single source of truth for visual design — colors, typography, spacing, shadows, and component patterns. Use this as a reference when building any screen or component.

**Vibe:** Modern, educational, fun, rewarding. Purple and gold (school colors) anchor the palette, with teal/coral/green as feedback accents. Everything has real depth via layered drop shadows, and buttons feel tactile with chunky offset shadows that respond to press.

---

## 1. Color Palette

All colors are organized into ramps (50 lightest → 900 darkest). Use CSS custom properties or export a `colors.js` constants file and import it everywhere. Never hardcode hex values in components.

### Primary — Purple (school color)

| Token | Hex | Usage |
|---|---|---|
| `purple-50` | `#F3EEFF` | Surface tints, lesson card backgrounds |
| `purple-100` | `#DDD0FF` | Subtle borders, hover states |
| `purple-200` | `#C4ADFF` | Ghost button borders |
| `purple-400` | `#9B6EF5` | Primary button fill, accents |
| `purple-600` | `#6C3FC4` | Headers, icons, primary brand |
| `purple-800` | `#3D1A82` | Display headlines |
| `purple-900` | `#21084F` | Darkest text, phone frame |

### Secondary — Gold (school color)

| Token | Hex | Usage |
|---|---|---|
| `gold-50` | `#FFF8E1` | Streak card background |
| `gold-100` | `#FFECB3` | Subtle highlights |
| `gold-200` | `#FFD966` | Border accents |
| `gold-400` | `#FFC107` | Secondary button fill, XP gain |
| `gold-600` | `#E59A00` | Gold text on light, chunky shadow |
| `gold-800` | `#8A5C00` | Text on gold fills |

### Feedback Colors

| Token | Hex | Usage |
|---|---|---|
| `teal-50` / `teal-400` / `teal-600` | `#E0F7F4` / `#26C6B0` / `#00897B` | Correct answers, success |
| `coral-50` / `coral-400` / `coral-600` | `#FFF0EC` / `#FF6E50` / `#D63F1F` | Wrong answers, destructive |
| `green-50` / `green-400` / `green-600` | `#F0FDE8` / `#66BB3A` / `#388E1A` | XP gains, completed |
| `blue-50` / `blue-400` / `blue-600` | `#EBF5FF` / `#2F9EE8` / `#1565B0` | Info, tips |

### Neutrals

| Token | Hex | Usage |
|---|---|---|
| `neutral-50` | `#F8F7FF` | Page background |
| `neutral-100` | `#EEECF8` | Card surfaces, inset bars |
| `neutral-200` | `#D9D5EE` | Borders, dividers |
| `neutral-600` | `#6B6491` | Secondary text, captions |
| `neutral-800` | `#2D2453` | Body text |
| `neutral-900` | `#120B35` | Button text, phone frame |

**Button text rule:** All button labels use `neutral-900` (`#120B35`) regardless of background color. This ensures readability across purple, gold, teal, and coral buttons.

---

## 2. Typography

Two fonts, both imported from Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- **Nunito** — Display font (rounded, friendly sans-serif). Used for headings, buttons, labels, numbers, anything that should feel energetic or important.
- **Outfit** — Body font (clean, modern sans-serif). Used for paragraphs, descriptions, captions, form inputs.

### Type Scale

| Style | Font | Size | Weight | Line-height | Use |
|---|---|---|---|---|---|
| Display | Nunito | 28px | 900 | 1.1 | Hero titles, app logo |
| H1 | Nunito | 22px | 900 | 1.15 | Screen titles |
| H2 | Nunito | 20px | 800 | 1.2 | Unit headings |
| H3 | Nunito | 16px | 700 | 1.3 | Lesson titles |
| Body | Outfit | 15px | 400 | 1.6 | Paragraphs, descriptions |
| Small | Outfit | 13px | 500 | 1.5 | Secondary info |
| Caption | Outfit | 12px | 500 | 1.4 | Meta info, hints |
| Label | Nunito | 11px | 800 | 1.2 | Section labels (UPPERCASE, letter-spacing 0.1em) |
| Button | Nunito | 15px | 800 | 1.0 | All buttons |

Use sentence case everywhere except labels (which are ALL CAPS with letter-spacing).

---

## 3. Spacing & Layout

Use a consistent scale. Prefer `rem` for vertical rhythm, `px` for component-internal gaps.

| Token | Value | Use |
|---|---|---|
| `space-1` | 4px | Tight internal gaps |
| `space-2` | 8px | Small gaps between chips, icons |
| `space-3` | 12px | Card internal padding (small) |
| `space-4` | 16px | Standard card padding, section gaps |
| `space-5` | 24px | Major section separation |
| `space-6` | 32px | Screen-level spacing |

**Screen padding:** 16px horizontal, 20px top/bottom.
**Card grids:** 12–14px gaps between cards, max 2 columns on mobile.

### Border Radius

| Token | Value | Use |
|---|---|---|
| `radius-sm` | 8px | Icon containers, small chips |
| `radius-md` | 12px | Most elements (inputs, buttons-square) |
| `radius-lg` | 16px | Cards |
| `radius-xl` | 24px | Quiz cards, featured surfaces |
| `radius-full` | 9999px | Pills, badges, round buttons |

---

## 4. Shadows — Depth System

Shadows use **purple-tinted rgba** (`rgba(61, 26, 130, X)`) instead of neutral gray. This gives the whole app a cohesive brand feel and warmer atmosphere.

### Standard depth scale (for cards, surfaces, modals)

```css
--shadow-sm: 0 2px 4px rgba(61, 26, 130, 0.08), 0 1px 2px rgba(61, 26, 130, 0.06);
--shadow-md: 0 4px 8px rgba(61, 26, 130, 0.12), 0 2px 4px rgba(61, 26, 130, 0.08);
--shadow-lg: 0 8px 20px rgba(61, 26, 130, 0.15), 0 3px 6px rgba(61, 26, 130, 0.1);
--shadow-xl: 0 16px 32px rgba(61, 26, 130, 0.18), 0 4px 8px rgba(61, 26, 130, 0.1);
```

**When to use each:**
- `shadow-sm` — chips, icons, small floating elements
- `shadow-md` — standard cards, XP bar, element cards (default for most components)
- `shadow-lg` — quiz cards, featured content, raised panels
- `shadow-xl` — modals, phone frame, top-level overlays

### Chunky shadows (for buttons and quiz options)

The signature "pressable" feel comes from a solid-color offset shadow below the element, plus an ambient soft shadow. When pressed, the element translates down and the shadow shortens — it feels like a real button.

```css
--shadow-chunky-purple: 0 4px 0 #4A2690, 0 8px 16px rgba(61, 26, 130, 0.25);
--shadow-chunky-gold:   0 4px 0 #C78A00, 0 8px 16px rgba(229, 154, 0, 0.35);
--shadow-chunky-teal:   0 4px 0 #00695C, 0 6px 12px rgba(0, 137, 123, 0.3);
--shadow-chunky-coral:  0 4px 0 #A02D14, 0 6px 12px rgba(214, 63, 31, 0.3);
```

Press animation:
```css
.btn:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 rgba(0,0,0,0.2);
}
```

---

## 5. Components

### Buttons

All buttons use Nunito 800, 15px, black text (`neutral-900`), rounded-full shape. Pair the fill color with its matching chunky shadow.

**Primary** — Purple 400 fill, chunky-purple shadow. Main CTA.
**Secondary** — Gold 400 fill, chunky-gold shadow. "Check Answer," secondary CTA.
**Success** — Teal 400 fill, chunky-teal shadow. Positive confirmations.
**Danger** — Coral 400 fill, chunky-coral shadow. Destructive actions.
**Ghost** — White fill, 2px purple-200 border, subtle purple-100 chunky shadow. Tertiary actions.

All buttons: padding `14px 28px` (or `12px 24px` for ghost/smaller variants), `gap: 6px` for icon + label.

### Cards

Base card: white background, `1.5px solid neutral-200` border, `radius-lg`, `shadow-md`, `padding: 14px`.

**Lesson card** — Diagonal gradient `purple-50 → white`, purple-100 border. Contains: 36×36 purple-600 icon tile (radius-sm, shadow-sm), title (Nunito 800, purple-800, 14px), meta (neutral-600, 11px), and optional progress bar (4px tall, purple-400 fill, neutral-200 track, pill-shaped).

**Streak card** — Diagonal gradient `gold-50 → white`, gold-200 border. Big number in Nunito 900, 32px, gold-600 ("🔥 7"), then label in Nunito 700, 13px, gold-800.

### XP Bar (profile header)

Horizontal container: white, `1.5px solid purple-100`, `radius-md`, `shadow-md`, `padding: 12px 14px`, flex layout with 12px gap.

- **Avatar:** 36×36 circle, purple-600 fill, white Nunito 900 initials, shadow-sm
- **Name + bar:** Nunito 800, 14px name; below it an 8px-tall progress bar (neutral-100 track with inset shadow for depth, filled with a `purple-400 → gold-400` gradient)
- **Level badge:** Gold-400 pill with `0 2px 0 gold-600` chunky shadow, black text, Nunito 800, 12px

### Chips / Badges

Small pills for topics and status. Nunito 700, 12px, `radius-full`, `padding: 5px 12px`, `shadow-sm`, 1.5px border matching the ramp. Use light-50 background + 600 text color.

Variants: purple, gold, teal, coral, green. All follow the same pattern — pick based on semantic meaning (teal = mastered/correct, coral = needs review, gold = streak/XP, etc.).

### Quiz Question Card

Big featured card: white, `1.5px solid neutral-200`, `radius-xl` (24px), `shadow-lg`, `padding: 18px`.

**Question text** — Nunito 800, 15px, neutral-800, line-height 1.4.

**Answer options** — Stacked vertically with 10px gap. Each option is a pressable row:
- Default: white bg, neutral-200 border, chunky shadow `0 2px 0 neutral-200`
- Selected: purple-50 bg, purple-400 border, chunky shadow `0 2px 0 purple-400`
- Correct: teal-50 bg, teal-400 border, chunky shadow `0 2px 0 teal-400`
- Wrong: coral-50 bg, coral-400 border, chunky shadow `0 2px 0 coral-400`

Each option has a 22×22 circular "dot" with the answer letter (A/B/C/D), Nunito 800, 11px, matching the current state color. Press state: translateY(1px), shadow shortens.

### Element Card (periodic table / flashcard)

Horizontal layout with a 6px-wide purple-600 accent strip on the left, then content: large element symbol (Nunito 900, 36px, purple-600), name (Nunito 700, 14px, neutral-800), atomic number and mass (Outfit, 12px, neutral-600). `radius-lg`, `shadow-md`, purple-100 border.

### Phone-level chrome

**Header bar** (top of most screens) — Linear gradient `purple-600 → purple-400`, 135deg. Contains logo (Nunito 900, 15px, white), streak pill (gold-400 fill, chunky gold shadow, black text), and XP progress (gold-400 fill on a `rgba(0,0,0,0.2)` track, 6px tall). Shadow: `0 4px 12px rgba(61, 26, 130, 0.25)` to float above content.

**Lesson list items** — White, `1.5px solid neutral-200`, `radius-md`, `shadow-sm`, `padding: 10px 12px`, 10px gap between icon / info / stars. Locked items: opacity 0.5, neutral-200 icon, no shadow.

---

## 6. Implementation Notes for Claude Code

**File structure suggestion:**
```
/theme
  colors.js          // Export all color tokens
  typography.js      // Font constants, scale
  shadows.js         // Shadow constants
  spacing.js         // Spacing scale
  index.js           // Re-export everything as theme
/components
  Button.jsx         // All button variants
  Card.jsx           // Base card + variants
  Chip.jsx
  QuizOption.jsx
  XPBar.jsx
  LessonCard.jsx
  ElementCard.jsx
```

**Global rules:**
- Import fonts once in the root layout; don't re-import per component.
- Never hardcode colors, shadows, or font sizes — always reference theme tokens.
- Button text is always black (`neutral-900`), regardless of fill color.
- All interactive elements (buttons, quiz options, list items) should have a press state that translates down slightly and shortens the chunky shadow.
- Use sentence case for all UI copy except section labels (which are uppercase with letter-spacing).
- Progress bars are always 4–8px tall, pill-shaped, with a muted track and a vibrant (often gradient) fill.
- Icons inside colored tiles: set explicit size (e.g. 16px for small tiles, 24px for medium), never inherit.
- For React Native: translate shadows using `elevation` (Android) + `shadowColor/shadowOffset/shadowOpacity/shadowRadius` (iOS). The chunky-shadow effect requires a wrapper `View` with a colored background offset behind the button.

**Animation defaults:**
- Button press: `transform: translateY(3px)`, transition 100ms ease
- Card hover (web): `transform: translateY(-2px)`, shadow steps up one level, transition 150ms
- Progress bar fill: transition 400ms ease on width changes
- Avoid long, complex animations — keep everything snappy and responsive

**Accessibility:**
- Minimum tap target: 44×44px
- Button text contrast: black on all fill colors exceeds WCAG AA
- Never convey state with color alone — add icons (✓, ✕), text labels, or shape changes
- Font sizes never below 11px; body text stays at 15px for comfortable reading
