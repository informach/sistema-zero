// Shim: client do members do @sistemazero/member-shell — a vitrine deste app é
// `audience: 'adult'` (configurada no `shell.ts`; o kids usa `kids`).
import { shell } from './shell'

export const {
  listMyCourses,
  getAvatarReadonly,
  listCatalog,
  getMyCourse,
  getLesson,
  openLessonStudio,
  resolveAttachment,
  resolveEbook,
  markLessonComplete,
  saveVideoPosition,
  saveCourseRating,
  submitQuizAttempt,
  listTeacherThreadsReadonly,
  getTeacherThreadsUnreadReadonly,
} = shell.members
