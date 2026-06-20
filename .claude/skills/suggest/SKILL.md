---
name: suggest
description: Use when the user wants micro-improvement suggestions for UI, UX, code quality, accessibility, or performance. Audits the project, presents numbered options, waits for user selection, then implements, tests, commits, and pushes the chosen items. Triggered by /suggest.
---

# suggest

Audit the project across multiple lenses, surface a ranked list of micro-improvements, and implement only what the user approves.

---

## Step 1 — Audit

Read the following files before generating suggestions:

```
index.html                   ← view structure, accessibility, meta tags
assets/css/style.css         ← design consistency, missing states, animations
assets/js/app.js             ← routing, error handling
assets/js/home.js            ← catalog UX, search/filter behaviour
assets/js/player.js          ← player UX, keyboard shortcuts, error states
assets/js/shorts.js          ← shorts feed UX, gestures, idle states
assets/js/watch-progress.js  ← resume logic
assets/js/utils.js           ← shared helpers
```

Audit across these **seven lenses**:

### 1. UI Polish
- Inconsistent spacing, font sizes, border-radius
- Missing hover/focus/active states on interactive elements
- Colours that don't follow HSL harmony or `var(--accent)` token
- Elements that look unfinished or visually heavy
- Dark-mode contrast issues

### 2. UX Flow
- Dead ends (no back button, no empty state message)
- Actions that give no feedback (silent clicks, no loading indicator)
- Anything that requires more than 2 taps/clicks to do something common
- Missing keyboard shortcuts for power users
- Progress/state that is lost unexpectedly

### 3. Micro-animations
- State transitions that are abrupt (instant show/hide)
- List items that appear without stagger
- Buttons that don't respond visually to press
- Skeleton loaders missing while data fetches

### 4. Mobile & Touch
- Touch targets smaller than 44×44px (Fitts's Law)
- Horizontal overflow or cramped layouts on small screens
- Swipe gestures that are missing or inconsistent with platform norms
- Font sizes below 14px on mobile

### 5. Accessibility
- Interactive elements missing `aria-label` or `role`
- Images missing `alt` text
- No visible focus ring on keyboard navigation
- Color-only information (no icon/text backup)
- Missing `lang` attribute or bilingual `<title>` tag

### 6. Code Quality (SonarQube rules)
- Functions over 20 lines
- Module boundary violations (logic in wrong file)
- Repeated code that belongs in `utils.js`
- Commented-out (zombie) code
- `var` declarations, `==` comparisons, unhandled promises

### 7. Data & Content
- Movies missing `km` translations
- Posters pointing to broken URLs
- Episode lists with wrong `final` flag
- Missing or weak bilingual `<meta description>` / `<title>` tags in `index.html`

---

## Step 2 — Present suggestions

Format each suggestion exactly like this — clear, scannable, no fluff:

```
SUGGESTIONS — pick numbers to implement (e.g. "do 1 3 5"):

  #  │ Lens        │ What                                           │ Effort
─────┼─────────────┼────────────────────────────────────────────────┼────────
  1  │ UX Flow     │ Show skeleton loader while catalog fetches     │ Small
  2  │ UI Polish   │ Add hover lift effect to home-cards            │ Small
  3  │ Animation   │ Fade-in stagger on catalog cards (CSS only)    │ Small
  4  │ Mobile      │ Increase episode tab touch target to 44px      │ Small
  5  │ A11y        │ Add aria-label to mute toggle in shorts        │ Small
  6  │ Code        │ Extract duplicated fetch logic into utils.js   │ Medium
  7  │ UI Polish   │ Add active state ring to filter pills          │ Small
  8  │ UX Flow     │ Persist scroll position on Back from player    │ Medium
  9  │ Content     │ Add <meta name="description"> bilingual tag    │ Small
 10  │ Animation   │ Smooth height transition on episode list open  │ Small
```

Show **8–12 items** per run. Order by: impact first, effort second (Small before Medium).
Do not show items that are already implemented — check before listing.

**Effort scale:**
- `Small` — CSS change or 1–5 line JS tweak, no new abstraction
- `Medium` — new function or refactor across 1–2 files
- `Large` — architectural change (don't suggest unless critical)

---

## Step 3 — Wait for user selection

Stop after presenting the list. Do not implement anything yet.

The user will reply with numbers: `"do 1 3 5"` or `"all"` or `"1"`.

---

## Step 4 — Implement selected items

For each selected item, in order:

1. Make the change (smallest focused edit possible — no scope creep)
2. Run `node --check assets/js/<file>.js` if any JS was touched
3. Validate JSON if any `db/` file was touched
4. Move to the next item

After all items are done:

5. Run `npm test` — fix any failures before continuing
6. Confirm all changes with `git diff --stat`

---

## Step 5 — Commit and push

Group all implemented items into one commit:

```
git add <only the files changed>
git commit -m "ux: <concise summary of what was improved>"
git push
```

Commit message format: `ux:`, `ui:`, `a11y:`, `refactor:`, or `fix:` prefix depending on dominant change type. If mixed, use `ux:`.

---

## Rules

- **One suggestion = one focused change.** No bundling unrelated improvements into one item.
- **Never implement unrequested items.** If you notice something while implementing, add it to the next `/suggest` run — don't silently fix it now.
- **Never break bilingual parity.** Any UI text added must have both `en` and `km` versions.
- **Tests must pass before committing.** `npm test` green = prerequisite for push.
- **Boy Scout Rule applies.** If the file you edit has a trivial nearby mess (wrong indent, zombie comment), clean it — but only that, nothing more.
- **No speculative abstractions.** If the fix is 3 lines of CSS, write 3 lines of CSS — don't build a theme system.
