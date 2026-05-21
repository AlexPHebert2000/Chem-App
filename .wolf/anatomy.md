# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-05-20T17:12:09.730Z
> Files: 26 tracked | Anatomy hits: 0 | Misses: 0

## ../../Users/alexp/.claude/plans/


## ./


## .claude/


## .claude/rules/


## client/


## client/.expo/


## client/components/

- `ClassCard.js` — ACCENT: MicroStat, ClassCard (~1578 tok)
- `FeedbackBar.js` — Declares FeedbackBar (~759 tok)
- `PeriodicTableOverlay.js` — ELEMENTS: ElementCell, SeriesMarkerCell, DetailCard, PeriodicTableOverlay (~5813 tok)
- `QuestionBankItem.js` — TYPE_LABELS: QuestionBankItem (~485 tok)
- `QuestionCard.js` — Declares QuestionCard (~293 tok)

## client/components/base/

- `ProgressBar.js` — Declares ProgressBar (~401 tok)

## client/context/


## client/lib/


## client/navigation/

- `MainNavigator.js` — Student screens (~784 tok)

## client/screens/auth/


## client/screens/student/

- `HomeScreen.js` — API routes: GET (3 endpoints) (~2308 tok)
- `SectionScreen.js` — API routes: GET, POST (6 endpoints) (~3068 tok)
- `StudentClassScreen.js` — API routes: GET (3 endpoints) (~4355 tok)

## client/screens/teacher/

- `ChapterDetailScreen.js` — Sheet: OptionRow, Stars, TypeChip + 6 more (~8152 tok)
- `ClassDetailScreen.js` — Sheet: OptionRow, FormField, StatCell, ChapterCard (~7098 tok)
- `CourseDetailScreen.js` — Sheet: OptionRow, FormField, StatCell, ChapterCard (~7177 tok)
- `QuestionBankScreen.js` — API routes: GET (1 endpoints) (~5658 tok)
- `QuestionEditorScreen.js` — API routes: GET (2 endpoints) (~8211 tok)
- `TeacherHomeScreen.js` — API routes: GET, POST (3 endpoints) (~9481 tok)

## client/theme/


## docs/


## notes/.obsidian/


## notes/Chem App Design/design_handoff_chem_app/


## notes/Chem App Design/design_handoff_chem_app/student/


## notes/Chem App Design/design_handoff_chem_app/teacher/


## notes/sessions/


## server/


## server/prisma/

- `schema.prisma` — Declares JoinRequestStatus (~2983 tok)
- `seed.js` — bcrypt: daysAgo, hoursAgo, minutesAfter, clear, seed (~8093 tok)

## server/src/


## server/src/controllers/

- `course.controller.js` — crypto: generateCode, getTeacherCourses, createCourse + 11 more (~4797 tok)
- `question.controller.js` — prisma: ownedQuestion, validateMultipleChoice, validateFillInBlank + 7 more (~5353 tok)
- `student.controller.js` — prisma: getStudentCourses, getStudentCourseProgress, getStudentSectionQuestions + 9 more (~3196 tok)
- `study.controller.js` — prisma: startWorkSession, endWorkSession (~397 tok)

## server/src/lib/


## server/src/lib/__tests__/


## server/src/middleware/


## server/src/routes/

- `course.routes.js` — API routes: GET, POST, PATCH (24 endpoints) (~1025 tok)

## server/src/routes/__tests__/

- `course.routes.test.js` — API routes: POST (11 endpoints) (~5811 tok)
- `student.routes.test.js` — API routes: GET (3 endpoints) (~5036 tok)

## server/src/services/

- `workSession.service.js` — prisma: getOrCreateWorkSession, recordActivity, closeWorkSession (~480 tok)
