import { createLessonProRuntimeBuild } from '@sistemazero/member-shell/routes/lesson-pro-runtime'
import { getLesson, openLessonStudio } from '@/server/members'
import { getSession } from '@/server/session'
export const runtime = 'nodejs'
export const POST = createLessonProRuntimeBuild({
  audience: 'adult',
  getLesson,
  openLessonStudio,
  getSession,
})
