# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-05-19T20:51:55.436Z
> Files: 43 tracked | Anatomy hits: 0 | Misses: 0

## ../../Users/alexp/.claude/plans/

- `please-read-the-session-imperative-parasol.md` — UI Implementation Plan — Chem App Design (~2898 tok)

## ./


## .claude/


## .claude/rules/


## client/


## client/.expo/


## client/components/

- `AnswerOption.js` — state: 'idle' | 'selected' | 'correct' | 'wrong' | 'muted' (~947 tok)
- `BadgeRow.js` — BadgeTile: BadgeRow (~588 tok)
- `BottomSheet.js` — API routes: GET (1 endpoints) (~840 tok)
- `ChapterBanner.js` — themeMap: ChapterBanner (~1061 tok)
- `ClassCard.js` — Declares ClassCard (~676 tok)
- `FeedbackBar.js` — Declares FeedbackBar (~803 tok)
- `index.js` (~209 tok)
- `PeriodicTableOverlay.js` — [symbol, atomicNum, name, mass, group(col 1-18), period(row 1-7, 9=lanthanides, 10=actinides), categ (~3334 tok)
- `QuestionBankItem.js` — TYPE_LABELS: QuestionBankItem (~484 tok)
- `QuestionCard.js` — Declares QuestionCard (~523 tok)
- `SectionNode.js` — NODE_OFFSETS: starsFromScore, SectionNode (~1252 tok)
- `StudentRow.js` — MEDAL: StudentRow (~610 tok)
- `WeeklyStatsCard.js` — StatCell: WeeklyStatsCard (~915 tok)

## client/components/base/

- `AvatarCircle.js` — Declares AvatarCircle (~298 tok)
- `Card.js` — Declares Card (~220 tok)
- `Chip.js` — colorMap: Chip (~529 tok)
- `index.js` (~170 tok)
- `ProgressBar.js` — Declares ProgressBar (~282 tok)
- `ScreenSurface.js` — Declares ScreenSurface (~147 tok)
- `SectionDivider.js` — Declares SectionDivider (~265 tok)
- `ShadowButton.js` — SHADOW_OFFSET: ShadowButton (~658 tok)
- `StreakBadge.js` — Declares StreakBadge (~222 tok)
- `TabBar.js` — STUDENT_TABS: TabBar (~716 tok)
- `TodoPlaceholder.js` — Declares TodoPlaceholder (~214 tok)
- `XpBadge.js` — Declares XpBadge (~204 tok)

## client/context/


## client/lib/


## client/navigation/

- `MainNavigator.js` — Student screens (~560 tok)

## client/screens/auth/


## client/screens/student/

- `CourseTrailScreen.js` — API routes: GET (3 endpoints) (~1953 tok)
- `DashboardScreen.js` — API routes: GET (4 endpoints) (~1806 tok)
- `ProfileScreen.js` — API routes: GET (2 endpoints) (~1575 tok)
- `SectionScreen.js` — API routes: GET, POST (4 endpoints) (~2352 tok)
- `SettingsScreen.js` — API routes: GET, PATCH (2 endpoints) (~1048 tok)

## client/screens/teacher/

- `ChapterDetailScreen.js` — API routes: GET (1 endpoints) (~1286 tok)
- `ClassDetailScreen.js` — API routes: GET (4 endpoints) (~1383 tok)
- `QuestionBankScreen.js` — API routes: GET (2 endpoints) (~1579 tok)
- `QuestionEditorScreen.js` — API routes: GET, PATCH, POST (3 endpoints) (~2686 tok)
- `TeacherHomeScreen.js` — API routes: GET (2 endpoints) (~1324 tok)

## client/theme/


## docs/


## notes/.obsidian/


## notes/Chem App Design/design_handoff_chem_app/


## notes/Chem App Design/design_handoff_chem_app/student/


## notes/Chem App Design/design_handoff_chem_app/teacher/


## notes/sessions/

- `2026-05-19.md` — Session Notes - May 19 2026 (~1731 tok)

## server/


## server/prisma/

- `schema.prisma` — Declares JoinRequestStatus (~2982 tok)

## server/src/


## server/src/controllers/

- `course.controller.js` — crypto: generateCode, getTeacherCourses, createCourse + 10 more (~3354 tok)
- `stats.controller.js` — prisma: getWeekBounds, maxScoreForQuestion, getWeeklyStats, getQuestionStats, getSuggestedReviews (~2166 tok)
- `student.controller.js` — prisma: getStudentCourses, getStudentCourseProgress, getStudentSectionQuestions + 8 more (~3014 tok)

## server/src/lib/


## server/src/lib/__tests__/


## server/src/middleware/


## server/src/routes/

- `student.routes.js` — API routes: PATCH, GET (3 endpoints) (~150 tok)

## server/src/routes/__tests__/


## server/src/services/

