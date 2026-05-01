# Backend To-Do

Ordered by priority — #1 and #2 are the core game loop that everything else builds on.

---

## Study Flow

- [ ] **#1 — Question attempt** `POST /api/questions/:questionId/attempt`
  Submit an answer, validate correctness, return score + explanation + XP delta.
  Creates `QuestionAttempt` + `AttemptAnswer` records. Calls `workSession.recordActivity`.

- [ ] **#2 — Section complete** `POST /api/sections/:sectionId/complete`
  Mark section done (`StudentSection`), advance `StudentCourse.currentSectionId`,
  award XP to `currentPoints` + `lifetimePoints`, increment streak if applicable.

- [ ] **#3 — Student course list + progress**
  - `GET /api/courses` — enrolled courses with XP, streak, currentSection
  - `GET /api/courses/:courseId/progress` — sections completed, current section, points

- [ ] **#4 — Student section/question fetch**
  - `GET /api/sections/:sectionId/questions` — questions + choices, **no `isCorrect` flags**
  - `GET /api/courses/:courseId/chapters` — chapter list with per-section completion status

---

## Rewards

- [ ] **#5 — Teacher reward CRUD**
  - `POST /api/courses/:courseId/rewards` — create reward
  - `GET /api/courses/:courseId/rewards` — list with redemption counts
  - `DELETE /api/rewards/:rewardId` — delete (must own course)

- [ ] **#6 — Student redeem + teacher approve**
  - `GET /api/courses/:courseId/rewards` — student view with own redemption status
  - `POST /api/rewards/:rewardId/redeem` — student requests redemption
  - `GET /api/courses/:courseId/redemptions` — teacher inbox (filterable by `?status=PENDING`)
  - `PATCH /api/redemptions/:redemptionId` — teacher approve/reject

---

## Gamification

- [ ] **#7 — Badge award logic + endpoint**
  Auto-award badges triggered inside attempt/section-complete (check `criteriaType` + `criteriaAmount`).
  - `GET /api/students/me/badges` — earned badges + in-progress with current progress value

- [ ] **#8 — Course leaderboard** `GET /api/courses/:courseId/leaderboard`
  Students ranked by `currentPoints` (or `lifetimePoints`). Accessible to enrolled students and teacher.

---

## Profile

- [ ] **#9 — Student profile update** `PATCH /api/students/me`
  Update `name` and/or `profileImage`. STUDENT-only.
