# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-04-24

## User Preferences

- **Shared components over inline**: Repeated JSX patterns (shadow buttons, empty states, modals, cards) should be extracted to `client/components/` rather than duplicated per-screen.
- **chunkyShadowColors is the standard**: `ShadowButton.js` uses `chunkyShadowColors.purple` from `theme/shadows.js`. Do NOT use `colors.purple800` as the shadow offset color — use the chunky shadow map instead.

## Key Learnings

- **XP formula (question attempt):** `xpDelta = isCorrect ? difficulty * 10 : 0`. FIB `maxScore` = distinct `blankIndex` count; MC `maxScore` = 1. XP is tracked on `Session.pointsEarned` per-session via `recordActivity`; `StudentCourse` points are updated at section-complete time (#2), not per attempt.

- **Project:** Chem-App — Duolingo-style mobile chemistry learning app (teachers create courses, students earn XP/badges)
- **Question schema (2026-04-24):** Questions have NO `orderIndex` (randomized). Choices have NO `position`. Two explanations per question: `correctExplanation` and `incorrectExplanation` — never a single `solutionExplanation`.
- **Course clone:** `POST /api/courses/:courseId/clone` deep-copies all chapters → sections → questions → choices into a new course with a fresh code.
- **Edit question flow:** `CreateQuestionScreen` handles both create and edit via optional `question` route param. `SectionScreen` uses `useFocusEffect` to re-fetch on focus — no callback needed. `QuestionDetailScreen` navigates to edit with `{ sectionId, question }`.
- **api.js methods:** `get`, `post`, `patch` — add more here if needed (put, delete not yet present).
- **Design system:** Purple + gold palette. All tokens in `client/theme/`. Never hardcode colors, font sizes, or shadows in components — always import from theme.
- **Fonts:** Nunito (headings/buttons/labels) + Outfit (body/captions). Both loaded once in `App.js` via `useFonts`. Font variant names follow expo-google-fonts convention e.g. `Nunito_800ExtraBold`.
- **Button text rule:** Always `colors.neutral900` (`#120B35`) regardless of button fill color.
- **Chunky shadows:** The "pressable" button effect requires a colored offset View behind the button (not a CSS box-shadow). `chunkyShadowColors` in `theme/shadows.js` has the offset colors; press state = `translateY(3)`.
- **Screen background:** `colors.neutral50` (`#F8F7FF`) — not plain white.

## Key Learnings (continued)

- **Question bank architecture (2026-05-13):** Questions are now teacher-owned globally (`teacherId` on Question). `Question.sectionIds` is a string array; `Section.questionIds` is a string array. `attemptQuestion` uses `prisma.section.findMany({ where: { id: { in: question.sectionIds } }, include: { chapter: true } })` — NOT `findUnique`. `getSectionQuestions` fetches `{ id: { in: section.questionIds } }` — NOT `{ sectionId }`. `createQuestion` lives at `POST /api/questions` with no sectionId param; `updateQuestion` is at `PATCH /api/questions/:questionId` and checks ownership via `question.teacherId` only.

## Do-Not-Repeat

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->

- [2026-04-24] **ALWAYS CHECK FIRST — native Windows MongoDB service**: A `mongod.exe` Windows service (service name: `MongoDB`) was installed and running on `127.0.0.1:27017`. Windows specific-bind takes priority over Docker's `0.0.0.0:27017`, so ALL connections to `127.0.0.1:27017` hit the standalone Windows instance, not the Docker RS. This caused every RS connection attempt to fail silently. Fix: stop and disable the Windows MongoDB service. Verify with `netstat -ano | findstr :27017` — there should only be Docker's PID on that port.

- [2026-04-24] **MongoDB connection string on Windows + Docker Desktop + WSL2**: Use `replicaSet=rs0&directConnection=true` together. `replicaSet=rs0` alone causes persistent heartbeat connections that are reset by the WSL2 NAT proxy (ReplicaSetNoPrimary). `directConnection=true` alone gives Prisma Single topology and triggers P2031 on all writes. Only the combination works: directConnection skips the RS monitor while replicaSet validates the set name so Prisma sees RS topology.

## Decision Log

<!-- Significant technical decisions with rationale. Why X was chosen over Y. -->

- [2026-05-12] **Answer expression syntax uses `[N]`/`[N.property]` bracket notation**: Slot refs in `answerExpression` are always written as `[1]` (bare value) or `[1.number]` (property). Plain numbers in expressions are always literals. This eliminates the old heuristic where `N <= maxPosition` guessed if a number was a slot ref. The `safeArithmetic` token regex also handles `e+23`-style scientific notation.

- [2026-05-12] **[NA] Avogadro constant**: Added as a `const` bracket type in `questionTemplate.js`. `CONSTANTS` map holds name → `{ value, displayValue }`. Renders as `"6.022 × 10²³"` in question text, substitutes as `6.02214076e23` in answer arithmetic. `safeArithmetic` token regex updated to handle `e+23`-style scientific notation. Distractor generation treats `const` like arithmetic (numeric ±% variants).

## Key Learnings (Design v2 — 2026-05-18)

- **Design v2 branch**: All new UI lives on `design/v2-ui`. Never merge into main without review. The design came from `notes/Chem App.zip` (extracted to `notes/Chem App Design/`).
- **No LinearGradient**: `expo-linear-gradient` is NOT installed. Use solid color approximations (e.g. `colors.purple700` bg instead of a purple gradient). If gradients are needed, install the package first.
- **New primitive components (design v2)**: BottomSheet, TabBar, ScreenTopBar, StatTile, TypeChip, ProgressBar, Toast, OptionRow, SegmentedControl, DifficultySelector, ChapterBanner, SectionNode, PathConnector, AnswerOption, FeedbackBar, HamburgerDrawer, ClassCard, QuestionBankCard, SearchInput. All in `client/components/`.
- **ShadowButton presets**: `preset` prop accepts 'primary'|'secondary'|'success'|'danger'|'ghost'. Also supports `children` for custom content inside the button.
- **Student navigation (v2)**: StudentDashboard → StudentCourse (trail) → StudentQuestion. Plus StudentProfile accessible from TabBar. Routes: 'StudentProfile', 'StudentQuestion' added to MainNavigator.
- **Teacher class cards**: `ClassCard` (new) uses `course.accent` ('purple'|'teal'|'gold'|'coral'). Assign by cycling index since API doesn't return accent. Replaces `TeacherCourseCard` in teacher dashboard.
- **colors.js extended**: Added purple500/700, gold300/700, teal700, coral700, neutral300 to the color ramp in v2.
