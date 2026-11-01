import { chaveDeVoz } from '@sistemazero/core/learning/scene'
import type { CourseDetailView, LessonDetailView, SessionUserWithAvatar } from '../../src/lib/types'
export const course: CourseDetailView = {
  slug: 'ensaio',
  title: 'Ensaio da aula',
  subtitle: null,
  description: null,
  coverImageUrl: null,
  access: { accessType: 'enrollment', expiresAt: null },
  progress: { completedLessons: 0, totalLessons: 2, percent: 0, lastCompletedAt: null },
  continueLessonId: 'primeira',
  myRating: null,
  salesPageUrl: null,
  modules: [
    {
      id: 'modulo',
      title: 'Primeiro módulo',
      summary: null,
      chest: null,
      sortOrder: 0,
      lessons: [
        {
          id: 'primeira',
          title: 'Primeira aula',
          slug: 'primeira',
          sortOrder: 0,
          completed: false,
          locked: false,
          estimatedMinutes: null,
        },
      ],
    },
  ],
}
export const lesson: LessonDetailView = {
  id: 'primeira',
  slug: 'primeira',
  title: 'Primeira aula',
  courseSlug: 'ensaio',
  moduleId: 'modulo',
  estimatedMinutes: null,
  completed: false,
  positionSeconds: null,
  attachments: [],
  blocks: [
    {
      id: 'dialogo',
      kind: 'dialogue',
      sortOrder: 0,
      content: {
        kind: 'dialogue',
        text: 'Vamos experimentar o jogo pronto.',
        pose: 'speaking',
        vozes: { [chaveDeVoz('Vamos experimentar o jogo pronto.')]: '/qa/tone.wav' },
      },
    },
    {
      id: 'jogo',
      kind: 'embed',
      sortOrder: 1,
      content: {
        kind: 'embed',
        html: '<button onclick="this.textContent=Number(this.textContent)+1" style="font:24px sans-serif">0</button>',
      },
    },
  ],
}
export const user: SessionUserWithAvatar = {
  id: 'pessoa-teste',
  firstName: 'Pessoa',
  lastName: 'de teste',
  email: 'pessoa@example.test',
  role: 'student',
  status: 'active',
  avatarUrl: null,
}
