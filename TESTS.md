# Test Suite Overview

**431 tests across 11 suites** — all passing. Run with `npm test` from the `server/` directory.

All route tests use `supertest` against the Express app with Prisma mocked via `jest.mock`. The `questionTemplate.test.js` suite is a pure unit test with no mocks.

---

## 1. `auth.routes.test.js`

Authentication and session management.

### `POST /api/auth/signup`
- Rejects missing or invalid `role`, `name`, `email`, and short passwords
- 409 if email already in use
- 201 creates STUDENT and TEACHER accounts; response includes JWT token, omits password

### `POST /api/auth/login`
- 400 if `role` missing; 401 for unknown user or wrong password
- 200 returns JWT without `sessionToken` when `stayLoggedIn` is false or omitted
- 200 returns both JWT and `sessionToken` when `stayLoggedIn: true` — for both STUDENT and TEACHER

### `POST /api/auth/refresh`
- 400 if `sessionToken` missing; 401 for unknown, expired session, or deleted user
- 200 returns fresh JWT and user object for valid STUDENT and TEACHER sessions

### `POST /api/auth/logout`
- 401 if no token; 200 for JWT-only logout (no DB call)
- 200 deletes the auth session when `sessionToken` is provided — for both roles

### `GET /api/auth/me`
- 401 for missing or invalid token; 404 if user no longer exists
- 200 returns user data with role appended, password excluded — for both roles

---

## 2. `course.routes.test.js`

Course lifecycle, enrollment, and content structure.

### `POST /api/courses`
- Guards: 401, 403 for STUDENT
- 400 for missing or blank name
- 500 if a unique course code cannot be generated after 10 attempts
- 201 creates course with correct `teacherId`

### `POST /api/courses/:courseId/join-requests`
- Guards: 401, 403 for TEACHER
- 404 if course not found; 409 if already enrolled; 409 if request already submitted
- 201 creates PENDING join request

### `POST /api/courses/:courseId/join-requests/:requestId/approve`
- Guards: 401, 403 for STUDENT
- 404 if course or join request not found; 403 if teacher doesn't own course
- 409 if request already approved or rejected
- 201 marks request as APPROVED and creates `StudentCourse` enrollment

### `GET /api/courses/:courseId/join-requests`
- Guards: 401, 403 for STUDENT
- 404 if course not found; 403 if teacher doesn't own course
- 200 returns only PENDING requests with embedded student info; 200 empty array when none

### `POST /api/courses/:courseId/clone`
- Guards: 401, 403 for STUDENT
- 404 if course not found; 403 if teacher doesn't own course
- 500 if unique code unavailable
- 201 deep-clones the entire course tree (chapters → sections → questions → choices)
- Verifies cloned course name has `(Copy)` suffix; original question IDs are not carried over

### `GET /api/courses`
- 401 if no token
- 200 returns teacher's courses filtered by `teacherId`; 200 returns student enrollments; empty arrays when none

### `GET /api/courses/:courseId/chapters`
- Guards: 401; 404 if course not found; 403 if teacher doesn't own
- 200 for enrolled STUDENT; 200 for TEACHER ordered by `orderIndex`; empty array when no chapters

---

## 3. `chapter.routes.test.js`

Chapter and section management for teachers.

### `POST /api/courses/:courseId/chapters`
- Guards: 401, 403 for STUDENT
- 400 for missing `name` or `description`
- 404 if course not found; 403 if teacher doesn't own
- 201 creates chapter; `orderIndex` is auto-computed from current chapter count

### `PATCH /api/courses/:courseId/chapters/swap`
- Guards: 401, 403 for STUDENT
- 400 if either ID missing or both IDs are the same
- 404 if course not found or either chapter doesn't belong to it; 403 ownership
- 200 swaps `orderIndex` values and returns the new indices for both chapters

### `POST /api/chapters/:chapterId/sections`
- Guards: 401, 403 for STUDENT
- 400 for missing `name` or `description`; 404 if chapter not found; 403 ownership
- 201 creates section; `orderIndex` auto-computed from section count

### `PATCH /api/chapters/:chapterId/sections/swap`
- Guards: 401, 403 for STUDENT
- 400 if IDs missing or identical
- 404 if chapter not found or either section doesn't belong to it; 403 ownership
- 200 swaps `orderIndex` values

### `GET /api/chapters/:chapterId/sections`
- Guards: 401, 403 for STUDENT
- 404 if chapter not found; 403 if teacher doesn't own
- 200 returns sections ordered by `orderIndex` with question counts; empty array when none

---

## 4. `question.routes.test.js`

Question bank CRUD (teacher) and answer submission (student).

### `GET /api/questions`
- Guards: 401, 403 for STUDENT
- 200 returns all questions owned by the requesting teacher; verifies `findMany` called with `{ where: { teacherId } }`

### `POST /api/questions`
- Guards: 401, 403 for STUDENT
- 400 for missing/invalid `type`, `content`, `correctExplanation`, `incorrectExplanation`, `difficulty` (missing or out of 1–5 range)
- 400 for MC with fewer than 2 choices, no correct choice, or more than one correct choice
- 201 creates MC question with `teacherId` in data, no `sectionId`
- 201 creates FIB question

### `GET /api/questions/:questionId/preview`
- Guards: 401, 403 for STUDENT
- 404 if question not found; 400 if question type is not DYNAMIC; 403 if teacher doesn't own question
- 200 returns rendered content, difficulty, explanations, and choices (teacher sees `isCorrect` — this is an intentional preview)

### `GET /api/questions/:questionId`
- Guards: 401, 403 for STUDENT
- 404 if question not found; 403 if teacher doesn't own question
- 200 returns question for the owning teacher

### `PATCH /api/questions/:questionId`
- Guards: 401, 403 for STUDENT
- 400 for all required field validations (type, content, explanations, difficulty)
- 404 if question not found; 403 if teacher doesn't own question (ownership checked directly on question, no section chain)
- 200 deletes old choices, updates question, recreates choices; verifies correct call count for choices
- 500 if DB throws during update

### `POST /api/questions/:questionId/attempt` — MULTIPLE_CHOICE
- Guards: 401, 403 for TEACHER
- 400 for missing `sessionId`, missing/empty `choiceIds`
- 404 if question or session not found; 404 if session belongs to different student
- 409 if session already ended
- 403 if question's sections don't belong to the session's course; 403 if student not enrolled
- 400 if a `choiceId` doesn't belong to the question
- 400 if more than one choice submitted for MC
- 201 with score 1 for correct, score 0 for wrong; verifies `questionAttempt.create` called with correct score
- 201 response includes `isCorrect`, `explanation` (correct or incorrect), and `xpDelta`
- Verifies `recordActivity` is called (session `questionsAnswered` incremented)

### `POST /api/questions/:questionId/attempt` — FILL_IN_BLANK
- 400 if not all blanks answered; 400 if more than one answer per blank (duplicate)
- 201 with score equal to the number of correctly answered blanks

---

## 5. `dynamic-question.routes.test.js`

DYNAMIC question type — creation, rendering for students, and answer submission.

### `POST /api/questions` — DYNAMIC type
- 201 creates without choices; verifies `answerExpression` stored in Prisma create data
- 400 if `answerExpression` missing
- 400 if `validateTemplate` returns an error (template syntax invalid)
- 400 if `distractorCount` is out of the 1–10 range

### `GET /api/sections/:sectionId/questions` — DYNAMIC questions (STUDENT)
- 200 returns rendered content (brackets resolved to concrete values) instead of raw template
- Verifies DYNAMIC choices do not include the `isCorrect` field (hidden from student)
- Verifies a `QuestionResolution` is upserted for each DYNAMIC question per student

### `POST /api/questions/:questionId/attempt` — DYNAMIC
- 201 `isCorrect: true` when the correct dynamic choice ID submitted; `xpDelta` = difficulty × 10
- 201 `isCorrect: false` for wrong choice; `xpDelta: 0`; returns `incorrectExplanation`
- Verifies `QuestionAttempt` created with correct score and student/question IDs
- Verifies no `AttemptAnswer` records created (dynamic questions don't store per-choice answers)
- 400 if no `QuestionResolution` exists for this student+question pair
- 400 if submitted `choiceId` not in the resolution choices
- 400 if more than one `choiceId` submitted

---

## 6. `section.routes.test.js`

Section question management — viewing, assigning, and removing questions.

### `GET /api/sections/:sectionId/questions`
- 401 if no token
- TEACHER: 404 if section not found; 403 if teacher doesn't own course; 200 with questions
- STUDENT: 200 with questions stripped of `isCorrect` field on all choices

### `POST /api/sections/:sectionId/questions/:questionId` (assign from bank)
- Guards: 401, 403 for STUDENT
- 404 if section not found; 403 if teacher doesn't own the section's course
- 404 if question not found; 403 if teacher doesn't own the question
- 409 if question is already assigned to this section
- 200 updates both `Section.questionIds` and `Question.sectionIds` arrays atomically

### `DELETE /api/sections/:sectionId/questions/:questionId` (remove from section)
- Guards: 401, 403 for STUDENT
- 404 if section not found; 403 if teacher doesn't own the section's course
- 404 if question not found; 403 if teacher doesn't own the question
- 200 removes question ID from both array sides; asserts `section.update` called with `{ set: [] }` and `question.update` called with `{ set: [] }`

### `PATCH /api/sections/:sectionId/questions/:questionId` (backward-compat update)
- Guards: 401, 403 for STUDENT
- 400 field validation (type, difficulty range)
- 404 if question not found; 403 if teacher doesn't own the question (ownership checked directly on question — no section chain)
- 200 updates question and rebuilds choices via `question.update`

---

## 7. `section-complete.routes.test.js`

Section completion and XP calculation.

### `POST /api/sections/:sectionId/complete`
- Guards: 401, 403 for TEACHER
- 404 if section not found; 403 if student not enrolled
- 409 if section already completed
- 200 with XP = 0 when section has no questions
- 200 with partial score when only some questions answered correctly (only full-score answers grant XP)
- 200 aggregates XP across MC and FIB questions; XP per correct question = difficulty × 10
- 200 DYNAMIC question uses `maxScore=1`; a score of 1 grants full XP (difficulty × 10)
- 200 uses only the latest attempt when a question was retried; earlier attempts are ignored
- 200 `nextSectionId` resolves to the first section of the next chapter when the current chapter has no more sections
- XP per correct question = `difficulty × 10`; score = `(correct / total) × 100`
- Verifies `studentCourse` points incremented and `currentSectionId` advances to next section
- 200 `nextSectionId: null` when completing the final section in the course

---

## 8. `reward.routes.test.js`

Reward creation, redemption, and teacher confirmation.

### `POST /api/courses/:courseId/rewards`
- Guards: 401, 403 for STUDENT
- 400 for missing `name` or `redemptionLimit`; 404 if course not found; 403 ownership
- 201 creates reward linked to course

### `DELETE /api/courses/:courseId/rewards/:rewardId`
- Guards: 401, 403 for STUDENT; 404 course; 403 ownership; 404 reward
- 200 deletes reward and cascades to remove all student redemptions

### `GET /api/courses/:courseId/rewards`
- TEACHER: 404 if course not found; 403 ownership; 200 with rewards and redemption counts
- STUDENT: 403 if not enrolled; 200 returns rewards with current student's redemptions

### `POST /api/rewards/:rewardId/redeem`
- Guards: 401, 403 for TEACHER; 404 if reward not found; 403 if not enrolled
- 409 if already redeemed; 409 if redemption limit reached
- 201 creates redemption with `teacherConfirmation: false`

### `GET /api/courses/:courseId/redemptions`
- Guards: 401, 403 for STUDENT; 404 if course not found; 403 if teacher doesn't own
- 200 returns all redemptions for the course
- 200 filters to unconfirmed only when `?status=PENDING` query param is passed (verifies `teacherConfirmation: false` in where clause)

### `PATCH /api/redemptions/:redemptionId`
- Guards: 401, 403 for STUDENT
- 400 if `action` is missing or invalid (not `approve`/`reject`)
- 404 if redemption not found; 403 if teacher doesn't own the course; 409 if already approved
- 200 with `{ action: 'approve' }` — sets `teacherConfirmation: true`
- 204 with `{ action: 'reject' }` — deletes the redemption record

---

## 9. `student.routes.test.js`

Student-facing course, progress, leaderboard, and badge data.

### `GET /api/courses` (student)
- Guards: 401
- 200 returns enrolled courses with `currentPoints`, `lifetimePoints`, `streak`, `currentSectionId`, and embedded `currentSection`
- 200 empty array when not enrolled in any course

### `GET /api/courses/:courseId/progress`
- Guards: 401, 403 for TEACHER; 404 if course not found; 403 if not enrolled
- 200 returns `courseId`, points, streak, `totalSections`, `completedSections`, and per-section `score`
- 200 with `completedSections: 0` and empty `sections` array when none finished

### `GET /api/courses/:courseId/chapters` (student)
- 404 if course not found; 403 if not enrolled
- 200 returns chapters with sections; each section includes `questionCount`, `completed` flag, and `score`
- `completed: false` and `score: null` for sections not yet finished

### `GET /api/sections/:sectionId/questions` (student)
- 404 if section not found; 403 if not enrolled in the section's course
- 200 returns questions with choices; `isCorrect` is stripped from all choices
- `correctExplanation` and `incorrectExplanation` are NOT stripped (students see them)

### `GET /api/courses/:courseId/leaderboard`
- Guards: 401; 404 if course not found
- STUDENT: 403 if not enrolled; 200 returns ranked entries with `rank`, `name`, `currentPoints`
- TEACHER: 403 if teacher doesn't own the course; 200 returns full ranked leaderboard
- Response entries do not include `password`

### `PATCH /api/students/me`
- Guards: 401, 403 for TEACHER
- 400 if no fields provided; 400 if name is a blank string
- 200 updates `name` only; 200 updates `profileImage` only; 200 updates both
- Response does not include `password`

### `GET /api/students/me/badges`
- Guards: 401, 403 for TEACHER
- 200 returns empty array when student has no badges
- 200 returns earned badges (with `dateAchieved`) and in-progress badges (with `progress` count) including embedded badge details (`name`, `color`, `criteriaType`, `criteriaAmount`)

---

## 10. `study.routes.test.js`

Work session lifecycle.

### `POST /api/study/start`
- Guards: 401, 403 for TEACHER; 400 if `courseId` missing; 403 if not enrolled
- 200 returns existing open session (`isNew: false`) without creating a new one
- 200 creates a new session (`isNew: true`) when no open session exists
- 200 closes a stale session (inactive > 1 hour) and creates a fresh one — verifies `session.update` called with `endedAt` before `session.create`

### `POST /api/study/end`
- Guards: 401, 403 for TEACHER; 400 if `sessionId` missing
- 404 if session not found; 404 if session belongs to a different student
- 400 if session already ended
- 200 sets `endedAt`; verifies `session.update` called with correct `where: { id }` and `endedAt`

---

## 11. `questionTemplate.test.js`

Unit tests for the DYNAMIC question template engine (no HTTP, no mocks).

### `parseBrackets`
- Parses `[el(min,max).property]`, `[num(min,max)]`, `[compound(category).property]` brackets
- Handles spaces around commas, negative numbers, decimal bounds (extracts precision)
- Assigns sequential `position` values to multiple brackets
- Returns empty array for content with no brackets
- Sets `parseError` for malformed bracket syntax

### `resolveAll`
- Resolves each bracket to a concrete value (element, number, compound)
- `el` brackets resolve to a random element in the specified atomic number range
- `num` brackets resolve to a random number respecting `precision`
- Cross-references (`[1.symbol]`, `[1.number]`) resolve to a property of the already-resolved slot
- `const` brackets (e.g., `[NA]`) resolve to the Avogadro constant with display formatting

### `renderContent`
- Substitutes resolved values back into the template string
- Cross-references render the same value as their source bracket
- `const` brackets render as their `displayValue` (e.g., `6.022 × 10²³`)

### `evaluateAnswer`
- Evaluates arithmetic answer expressions referencing slot values (`[1]`, `[1.mass]`)
- Handles `+`, `-`, `*`, `/` and correct operator precedence
- Rounds result to the same decimal precision as the question's input slots
- Returns the Avogadro constant value for `[NA]` in arithmetic
- Handles scientific notation in intermediate values (e.g., `e+23`)
- `[gt(...)]` / `[lt(...)]` expressions return the correct inequality bound
- Returns `null` for expressions that produce `NaN` or `Infinity`

### `generateDistractors`
- Produces the requested number of distinct wrong-answer strings
- Distractors are numeric variants of the correct answer (±percentage offsets)
- Never duplicates the correct answer or each other
- Respects the same decimal precision as the correct answer

### `buildDynamicChoices`
- Returns an array with exactly one correct choice and the generated distractors
- Each choice has `id`, `content`, and `isCorrect` fields
- The correct choice is included exactly once

### `validateTemplate`
- Returns `null` for a valid content + answerExpression pair
- Returns an error string if content has no brackets
- Returns an error string if the answer expression references an out-of-range slot position
- Returns an error string if the answer expression produces `NaN` or `Infinity` on a sample run
