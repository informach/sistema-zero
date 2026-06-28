// Shim: client do members do @sistemazero/member-shell — a vitrine deste app é `kids` (configurada no shell.ts`; o kids usa `kids`).
import { shell } from './shell'

export const {
  listMyCourses,
  listCatalog,
  checkStudioAccessReadonly,
  getProfileAllowanceReadonly,
  getMyCourse,
  getLesson,
  resolveAttachment,
  resolveEbook,
  markLessonComplete,
  saveVideoPosition,
  saveCourseRating,
  submitQuizAttempt,
  getGamification,
  getGamificationReadonly,
  getAvatarReadonly,
  getPublicProfile,
  getRoomReadonly,
  getMissionsReadonly,
  getLeagueReadonly,
} = shell.members
