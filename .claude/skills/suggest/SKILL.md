---
name: suggest
description: Use when the user wants micro-improvement suggestions for UI, UX, code quality, accessibility, or performance. Audits the project, presents numbered options, waits for user selection, then implements, tests, commits, and pushes the chosen items. Triggered by /suggest.
---

# suggest

Audit the project like a senior product designer who has studied Netflix, TikTok, YouTube, and behavioral psychology. Think beyond pixels — ask how the user *feels*, what keeps them *coming back*, and what makes the experience *addictive without being manipulative*.

Surface ranked improvements, wait for user selection, implement only what is approved.

---

## Step 1 — Audit

Read these files first:

```
index.html                   ← structure, meta, accessibility
assets/css/style.css         ← design system, states, animations
assets/js/app.js             ← routing, error handling
assets/js/home.js            ← catalog UX, search/filter
assets/js/player.js          ← player UX, keyboard, error states
assets/js/shorts.js          ← shorts feed, gestures, idle
assets/js/watch-progress.js  ← resume logic, history
assets/js/utils.js           ← shared helpers
```

Audit across these **twelve lenses**:

---

### 1. UI Polish
- Inconsistent spacing, font sizes, border-radius
- Missing hover / focus / active states
- Colours not following HSL harmony or `var(--accent)`
- Elements that look unfinished or visually heavy
- Dark-mode contrast issues

---

### 2. UX Flow
- Dead ends — no back button, no empty state, no error message
- Silent actions — click with no feedback
- Anything requiring more than 2 taps to do something common
- State that is lost unexpectedly (scroll position, filter, episode)
- Missing keyboard shortcuts for power users

---

### 3. Micro-animations & Interaction Physics
Ask: does it *feel* right physically?

- Transitions that are instant (abrupt show/hide) — add `ease-out` or `spring`
- Cards that appear all at once — add stagger (20–40ms per item)
- Buttons with no press feedback — add `scale(0.96)` on `:active`
- Drag/scrub without inertia — momentum should continue briefly after release
- Page transitions that feel like teleporting — cross-fade or slide

Reference: **Disney's 12 Principles of Animation** — squash/stretch, anticipation, follow-through. Apply subtly. The UI should feel *alive*, not robotic.

---

### 4. Rabbit Hole & Engagement Loops
The best streaming platforms keep users in a *flow state* — no friction, always a next step.

Ask for each view:
- **What happens when content ends?** Is there a clear "next" action?
- **Autoplay next episode** — does it exist? Should it? (player view)
- **"Up Next" preview** — show the next episode thumbnail before current one ends
- **"Because you watched X"** — related content based on `watch-progress.js` history
- **Shorts rabbit hole** — does scrolling feel infinite and effortless?
- **Continue Watching** — is resume progress surfaced prominently on the home page?
- **Episode completion marker** — do watched episodes show a visual indicator?

Reference: **Variable Reward** (B.F. Skinner) — unpredictable rewards (new content, discoveries) are more addictive than predictable ones. Surface content that feels *discovered*, not just listed.

---

### 5. Psychology & Behavioral Design
Ask: what is the user *feeling* at each moment?

- **Zeigarnik Effect** — unfinished episodes stay in memory. Show progress bars on cards (e.g. 47% watched) to pull users back.
- **Loss Aversion** — users fear losing progress more than they value gaining it. Surface "resume from 23:14" prominently.
- **Peak-End Rule** (Kahneman) — users judge an experience by its peak moment and how it ends. Make the episode-end state satisfying (completion animation, "What's next?").
- **Mere Exposure Effect** — familiarity breeds preference. Consistent UI patterns reduce cognitive load and build trust.
- **Social Proof** — ratings, episode counts, "Popular" badges signal value without requiring the user to decide.
- **Endowed Progress** — a progress bar that starts at 10% feels more motivating than one starting at 0%. Consider showing series completion (e.g. "3 of 25 episodes watched").
- **Autonomy Paradox** (Hick's Law) — too many choices cause paralysis. The catalog should surface *fewer, curated* options first, then let users drill in.

---

### 6. Emotional Design (Norman's 3 Levels)
Every UI element operates on three levels simultaneously:

| Level | Question | Example |
|---|---|---|
| **Visceral** | Does it look and feel premium on first glance? | Poster quality, dark theme depth, typography weight |
| **Behavioural** | Does it work exactly as expected with no surprises? | Play button plays, back button goes back, progress saves |
| **Reflective** | Does it make the user feel something about themselves? | Quest system giving XP, Khmer language feeling honored |

Look for moments where the visceral or reflective level is missing.

---

### 7. Philosophy & Tone
This project has a philosophical identity (Stoicism, Existentialism, Dualism in the About page, quest mechanics). Ask:

- Does the UI *feel* like it has a soul, or does it feel generic?
- **Wabi-Sabi** — is there authentic imperfection? Or does it feel corporate-polished?
- **Shibui** — is anything unnecessarily decorative? Remove it.
- **Zen Minimalism** — every element should justify its existence. Audit for clutter.
- **Existential Agency** — does the user always feel *in control*? No dark patterns, no forced flows.
- The quest system already gives the app a unique identity. Are there other places where this philosophical layer could surface naturally (not forced)?

---

### 8. Algorithm & Content Discovery
Ask: how does the user find their next thing to watch?

- **Cold start** — new user with no history: what do they see? Is it compelling?
- **Recency bias** — are newer additions surfaced first? Should they be?
- **Completion-weighted recommendations** — a user who finished a 25-ep drama should see similar series, not random content
- **Genre affinity** — `watch-progress.js` stores history; can this drive a "For You" section?
- **Search quality** — does search match on genres, descriptions, not just titles?
- **Filter UX** — can a user narrow to "Chinese ancient drama, 2023, 20+ episodes" in 3 taps?

---

### 9. Shorts Feed Psychology (TikTok model)
The shorts feed is a vertical rabbit hole. Apply these patterns:

- **Immediate value** — first frame of video must hook. Is there a thumbnail/preview before play?
- **Frictionless scroll** — swipe up must feel instant. Any lag breaks the trance.
- **Sound design** — mute state should be visible and togglable in one tap (already exists — check if it's prominent enough)
- **Loop without announcement** — short videos should loop silently. Does the current player loop?
- **Progress bar scrubbing** — thin, always-visible, drag-to-seek (check sensitivity)
- **"Float Like" badge** — the compliment mechanic. Is it visible during peak moments?
- **Idle nudge** — 8-second nudge exists. Is the copy engaging or robotic?

---

### 10. Mobile & Touch
- Touch targets < 44×44px (Fitts's Law)
- Horizontal overflow on small screens
- Font sizes < 14px
- Swipe gestures inconsistent with platform (iOS/Android norms)
- Tap delay (300ms) — should be eliminated with `touch-action: manipulation`

---

### 11. Accessibility
- Missing `aria-label`, `role`, `alt`
- No visible focus ring
- Color-only information
- Missing `lang` attribute
- Screen reader order differs from visual order

---

### 12. Code Quality (SonarQube)
- Functions > 20 lines
- Module boundary violations
- Repeated code not in `utils.js`
- Zombie (commented-out) code
- `var`, `==`, unhandled promises

---

## Step 2 — Present suggestions

Format with lens tag and *why it matters* — not just what to do:

```
SUGGESTIONS — pick numbers (e.g. "do 1 3 5" or "all"):

  #  │ Lens          │ What                                              │ Why it matters              │ Effort
─────┼───────────────┼───────────────────────────────────────────────────┼─────────────────────────────┼────────
  1  │ Rabbit Hole   │ Autoplay next episode after 3s countdown          │ Peak-End Rule + flow state  │ Medium
  2  │ Psychology    │ Show % progress bar on home-card for started films│ Zeigarnik — pulls them back │ Small
  3  │ Shorts        │ Loop short videos silently after completion        │ TikTok rabbit hole          │ Small
  4  │ Animation     │ Stagger catalog cards on load (30ms per card)     │ Feels alive, not dumped     │ Small
  5  │ UI Polish     │ Active scale(0.96) on all button :active states   │ Interaction physics         │ Small
  6  │ Philosophy    │ Subtle Khmer decorative motif in page headers     │ Reflective design — identity│ Small
  7  │ Discovery     │ "Continue Watching" row above catalog grid        │ Loss aversion + resume hook │ Medium
  8  │ Mobile        │ touch-action: manipulation on all tap targets     │ Remove 300ms tap delay      │ Small
  9  │ A11y          │ aria-label on poster images (title in KM + EN)    │ Screen reader parity        │ Small
 10  │ Psychology    │ "X of 25 episodes watched" on drama cards         │ Endowed progress effect     │ Small
```

Show **8–12 items**. Order by impact. Add the *why* column — it makes the user feel informed, not just told.

**Effort scale:**
- `Small` — CSS or 1–5 line JS change
- `Medium` — new function, across 1–2 files
- `Large` — architectural (only suggest if critical)

---

## Step 3 — Wait

Stop. Do not implement. User selects: `"do 1 3"` / `"all"` / `"2"`.

---

## Step 4 — Implement

Per selected item:
1. Smallest focused change — no scope creep
2. `node --check` any touched JS
3. JSON validate any touched `db/` files

After all done:
4. `npm test` — must pass before commit

---

## Step 5 — Commit and push

```bash
git add <only changed files>
git commit -m "ux: <summary>"
git push
```

Prefix: `ux:` `ui:` `a11y:` `refactor:` `fix:` — use dominant type.

---

## Rules

- **One suggestion = one focused change.** No bundling.
- **Never implement unrequested items.** Log them for the next `/suggest` run.
- **Bilingual parity always.** Any new UI text needs `en` + `km`.
- **Tests green before commit.**
- **No dark patterns.** Engagement mechanics must respect user autonomy — no manipulative loops, no artificial urgency, no deceptive UI.
- **Philosophy first.** If a suggestion conflicts with the app's Zen/Stoic/Existential identity, skip it.
- **No speculative abstractions.** 3 lines of CSS over a new system.
