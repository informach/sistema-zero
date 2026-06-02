/** Progresso derivado de um curso (não materializado — calculado por agregação). */
export interface CourseProgress {
  completedLessons: number
  totalLessons: number
  /** 0–100, inteiro. Curso sem aulas → 0 (sem divisão por zero). */
  percent: number
}

export function computeProgress(completedLessons: number, totalLessons: number): CourseProgress {
  const completed = Math.max(0, Math.min(completedLessons, totalLessons))
  const percent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0
  return { completedLessons: completed, totalLessons, percent }
}
