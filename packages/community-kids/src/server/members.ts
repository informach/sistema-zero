// Shim: client do members do @sistemazero/member-shell — a vitrine deste app é `kids` (configurada no shell.ts`; o kids usa `kids`).
import { shell } from './shell'

export const {
  listMyCourses,
  listCatalog,
  getMyCourse,
  getLesson,
  resolveAttachment,
  resolveEbook,
  markLessonComplete,
  saveVideoPosition,
  saveCourseRating,
  submitQuizAttempt,
} = shell.members
