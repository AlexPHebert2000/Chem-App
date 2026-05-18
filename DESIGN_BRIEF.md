# Chem App — Design Brief

## 1. What This App Is

**Chem App** is a mobile-first chemistry learning platform for high school and university students. Teachers create courses with chapters, sections, and questions. Students join via a class code, work through questions, get instant feedback, and earn points and badges. The app runs on iOS, Android, and web via React Native + Expo.

---

## 2. Users

| Role | Goals | Emotional State |
|------|-------|-----------------|
| **Teacher** | Build courses, manage questions, track student progress | Productive, task-focused — wants efficiency |
| **Student** | Learn chemistry, answer questions, earn points | Motivated by progress and reward — wants clarity and encouragement |

---

## 3. Current Design System (What Exists Today)

### Stack
- React Native `StyleSheet` — no Tailwind, no MUI, no styled-components
- Custom theme tokens in `/client/theme/` (colors, typography, spacing, shadows)

### Color Palette
| Role | Color | Hex |
|------|-------|-----|
| Primary / Brand | Purple | `#6B3FBF` (purple600) |
| Secondary accent | Gold | `#D4A017` (gold400) |
| Success / Correct | Teal | `#00BFA5` (teal400) |
| Error / Wrong | Coral | `#E8472A` (coral400) |
| Completed / XP | Green | `#43A047` (green400) |
| Info | Blue | `#1E88E5` (blue400) |
| Background | Near-white purple | `neutral50` |
| Text | Deep purple-gray | `neutral900` |

Purple undertone runs through the entire neutral scale (not pure gray).

### Typography
| Style | Font | Size |
|-------|------|------|
| Display | Nunito Black 900 | 28px |
| H1 | Nunito Black 900 | 22px |
| H2 | Nunito ExtraBold 800 | 20px |
| H3 | Nunito Bold 700 | 16px |
| Label | Nunito ExtraBold 800 | 11px, uppercase, tracked |
| Button | Nunito ExtraBold 800 | 15px |
| Body | Outfit Regular 400 | 15px / 24px leading |
| Small | Outfit Medium 500 | 13px |
| Caption | Outfit Medium 500 | 12px |

### Spacing & Shape
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32px
- Border radius: sm=8, md=12, lg=16, xl=24, full=9999
- Cards: `borderWidth: 1.5`, `borderRadius: 16`, purple border
- Inputs: `borderRadius: 12`, purple border + text
- Screen padding: 16px horizontal, 20px vertical

### Signature Pattern: Chunky Shadow Button
The app's most distinctive element. Every primary action uses a two-layer button:
- A darker shadow layer sits 4px below
- The button layer sits on top
- On press: button moves down to meet the shadow
- Colors: purple, gold, teal, coral variants

---

## 4. Current Screen Inventory

### Auth
- **Login** — Email/password, role toggle (Student/Teacher), "Stay logged in" checkbox
- **Signup** — Name, email, password, role selection

### Student Flow
- **Student Dashboard** — Greeting, list of enrolled courses (StudentCourseCard with shadow)
- **Student Course** — Chapter list → Section list with completion dots
- **Student Section** — Question view: question text, answer choices, feedback banner, XP delta, periodic table modal

### Teacher Flow
- **Teacher Dashboard** — Course list (TeacherCourseCard), create course modal, CSV export, Question Bank link
- **Class Screen** — Chapter list for a course, add chapter modal
- **Chapter Screen** — Section list for a chapter, add section modal
- **Section Screen** — Question list, add questions from bank or inline
- **Create Question** — Tabbed form: Multiple Choice / Fill-in-Blank / Dynamic
- **Question Detail / Preview** — View and edit question metadata
- **Question Bank** — Full list of teacher's questions with tag filters

---

## 5. Design Problems to Solve

### 5.1 Auth Screens Feel Generic
The Login and Signup screens have no visual personality. They could belong to any app. The brand (purple, gold, chemistry theme) is absent at the moment users first encounter it.

**What's needed:** A recognizable, on-brand entry experience. Could use a logo, a chemistry-themed illustration or icon, a branded header block, or a strong color wash. The form itself can stay simple — the surrounding framing needs the personality.

---

### 5.2 Student Dashboard Lacks Energy
Students are supposed to feel motivated. The dashboard is a plain list of course cards. There is no visible progress summary, no current streak display, no welcoming headline that feels personal.

**What's needed:**
- A hero/header area that shows the student's name, streak, and total points prominently
- Course cards that feel alive — show progress bar, last-accessed section, XP earned
- Empty state (no courses yet) that is encouraging rather than just informational

---

### 5.3 Question Flow is Functional but Not Delightful
The section/question experience is the core loop. It works but feels clinical. Feedback banners are color-coded but small. The XP delta could be more celebratory.

**What's needed:**
- Bigger, more expressive result feedback — correct answer should feel like a win
- Smoother transition between questions
- The "section complete" state could be a proper end-screen with total XP earned, streak update, and a clear CTA back to the course

---

### 5.4 Teacher Dashboard is Dense and Flat
The teacher dashboard is a flat list of course cards with no visual hierarchy. Creating a new course or finding the question bank requires scanning the screen.

**What's needed:**
- Clear primary action (Create Course / Question Bank) always visible without scanning
- Course cards that surface useful at-a-glance info: number of students, chapters, last updated
- Better empty state for new teachers

---

### 5.5 Navigation Depth is Not Communicated
The course structure goes: Course → Chapter → Section → Questions. Students and teachers can lose their sense of place after 3–4 taps deep.

**What's needed:**
- Breadcrumb or subtitle on ScreenHeader that shows the parent (e.g. "Chapter 2 › Section 3")
- Back navigation should feel reliable and obvious

---

### 5.6 Minor Visual Inconsistencies
- Some components use hardcoded `#fff` instead of theme tokens
- Emoji usage for feedback is inconsistent in visual weight (🎉 vs ✗)
- Modal overlay opacity varies across screens
- Some screens use `neutral50` background, others use `#fff`

**What's needed:** A single pass to normalize these against the existing theme tokens.

---

## 6. Design Goals (Priority Order)

1. **Brand identity on entry** — Login/Signup should feel like Chem App, not a generic form
2. **Student motivation** — Dashboard and question flow should make progress feel visible and rewarding
3. **Teacher efficiency** — Key actions (create, access question bank) should be immediately findable
4. **Spatial clarity** — Users should always know where they are in the course hierarchy
5. **Visual consistency** — Normalize the small deviations against the existing theme

---

## 7. Design Constraints

- **React Native** — No web CSS. All styles via `StyleSheet.create()` and theme tokens.
- **Cross-platform** — Must look good on iOS, Android, and web (Expo Web)
- **Existing theme** — The color palette, fonts (Nunito + Outfit), spacing scale, and shadow button pattern are established and should be extended, not replaced
- **Chunky shadow pattern** — This is the app's visual signature. Preserve it on primary actions.
- **No third-party UI library** — The project uses no MUI/Shadcn/NativeBase. Custom components only.

---

## 8. Screens to Prioritize

In order of user impact:

| Priority | Screen | Why |
|----------|--------|-----|
| 1 | **Login / Signup** | First impression; currently has no brand identity |
| 2 | **Student Dashboard** | Most-visited screen; motivation hub |
| 3 | **Student Section (question flow)** | Core loop; feedback moments need more delight |
| 4 | **Section Complete state** | High emotional moment; currently undersized |
| 5 | **Teacher Dashboard** | Efficiency problem; primary actions buried |
| 6 | **ScreenHeader** | Used everywhere; breadcrumb addition pays off globally |

---

## 9. Tone and Personality

The app should feel:
- **Encouraging** — Students are doing hard work. Celebrate small wins.
- **Focused** — No clutter. Chemistry is already demanding; the UI shouldn't add cognitive load.
- **Confident** — The purple + gold palette is bold. Lean into it, don't dilute it with too much white space or gray.
- **A little playful** — The chunky shadow buttons, teal/coral feedback colors, and gamification elements give permission for some personality. Use it.

Avoid:
- Flat, corporate gray monotone
- Generic sans-serif form layouts with no visual identity
- Excessive celebration animations that interrupt the study flow

---

## 10. Reference Points

The existing design already has good bones. The improvements should feel like the same design system, turned up — not a redesign from scratch. The chunky shadow button, the purple/teal/coral semantic colors, and the Nunito headline font are all worth keeping. The gaps are primarily in: missing brand moments, missing progress visualization, and missing emotional feedback at key milestones.
