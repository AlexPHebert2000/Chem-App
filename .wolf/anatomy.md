# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-05-21T23:07:25.165Z
> Files: 33 tracked | Anatomy hits: 0 | Misses: 0

## ../../Users/alexp/.claude/plans/

- `currently-fill-in-the-jazzy-pebble.md` — Fix Fill-in-the-Blank Questions (~1297 tok)
- `i-want-to-deploy-floofy-puppy.md` — Deploy Chem-App to AWS + EAS Hosted Distribution (~1557 tok)
- `please-read-the-session-imperative-parasol.md` — Multi-Class Switching + Per-Class Stats Plan (~4215 tok)

## ./


## .claude/


## .claude/rules/


## client/

- `App.js` — Declares App (~300 tok)
- `babel.config.js` (~31 tok)

## client/.expo/


## client/components/

- `AnswerOption.js` — state: 'idle' | 'selected' | 'correct' | 'wrong' | 'muted' (~985 tok)
- `BottomSheet.js` — API routes: GET (1 endpoints) (~934 tok)
- `FeedbackBar.js` — Declares FeedbackBar (~754 tok)
- `PeriodicTableOverlay.js` — ELEMENTS: ElementCell, SeriesMarkerCell, DetailCard, PeriodicTableOverlay (~6048 tok)
- `SectionNode.js` — 'done' | 'next' | 'locked' (~1312 tok)

## client/components/base/

- `ProgressBar.js` — Declares ProgressBar (~406 tok)
- `ScreenSurface.js` — Declares ScreenSurface (~260 tok)
- `ShadowButton.js` — SHADOW_OFFSET: ShadowButton (~699 tok)

## client/context/

- `AuthContext.js` — API routes: POST (4 endpoints) (~945 tok)

## client/lib/

- `exportCsv.js` — Exports doExport (~346 tok)

## client/navigation/

- `MainNavigator.js` — Student screens (~869 tok)

## client/screens/auth/


## client/screens/student/

- `HomeScreen.js` — API routes: GET (3 endpoints) (~4515 tok)
- `ProfileScreen.js` — initials: resolveBadgeTheme, badgeDesc, DonutChart + 8 more (~8140 tok)
- `SectionScreen.js` — API routes: GET, POST (6 endpoints) (~4019 tok)
- `SettingsScreen.js` — API routes: GET, PATCH (5 endpoints) (~8712 tok)

## client/screens/teacher/

- `ChapterDetailScreen.js` — Sheet: OptionRow, Stars, TypeChip + 6 more (~9299 tok)
- `CourseDetailScreen.js` — Sheet: OptionRow, FormField, StatCell, ChapterCard (~7087 tok)
- `QuestionBankScreen.js` — Sheet: OptionRow, Stars, TypeChip, FilterChip, QuestionCard (~7032 tok)
- `QuestionEditorScreen.js` — API routes: GET (2 endpoints) (~8465 tok)
- `TeacherHomeScreen.js` — API routes: GET, POST (3 endpoints) (~9840 tok)

## client/theme/


## docs/


## notes/.obsidian/


## notes/Chem App Design/design_handoff_chem_app/


## notes/Chem App Design/design_handoff_chem_app/student/


## notes/Chem App Design/design_handoff_chem_app/teacher/


## notes/sessions/


## server/


## server/prisma/

- `seed.js` — bcrypt: daysAgo, hoursAgo, minutesAfter + 7 more (~16541 tok)

## server/src/


## server/src/controllers/

- `auth.controller.js` — bcrypt: signToken, getModel, signup + 5 more (~1498 tok)
- `export.controller.js` — exportStudentsCsv, exportChapterCsv, exportSectionCsv — CSV export for full course, single chapter, single section (~8500 tok)
- `question.controller.js` — prisma: ownedQuestion, validateMultipleChoice, validateFillInBlank + 8 more (~6035 tok)
- `student.controller.js` — prisma: getStudentCourses, getStudentCourseProgress, getStudentSectionQuestions + 9 more (~3301 tok)

## server/src/lib/


## server/src/lib/__tests__/


## server/src/middleware/


## server/src/routes/

- `auth.routes.js` — API routes: POST, GET, PATCH (6 endpoints) (~141 tok)
- `chapter.routes.js` — API routes: GET, POST, PATCH (5 endpoints) (~243 tok)
- `section.routes.js` — API routes: GET, POST, DELETE, PATCH (6 endpoints) (~438 tok)

## server/src/routes/__tests__/


## server/src/services/

