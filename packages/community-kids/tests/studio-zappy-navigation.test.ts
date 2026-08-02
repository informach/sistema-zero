import { describe, expect, it } from 'bun:test'
import { studioZappyLessonPath } from '../src/lib/studio-zappy-navigation'

describe('studioZappyLessonPath', () => {
  it('monta uma rota local escapada para a aula', () => {
    expect(
      studioZappyLessonPath({
        courseId: 'course-1',
        courseSlug: 'jogos e lógica',
        lessonId: 'lesson/1',
        title: 'Movimentos',
      }),
    ).toBe('/cursos/jogos%20e%20l%C3%B3gica/aulas/lesson%2F1')
  })

  it('não cria rota para respostas históricas sem slug', () => {
    expect(
      studioZappyLessonPath({ courseId: 'course-1', lessonId: 'lesson-1', title: 'Movimentos' }),
    ).toBeNull()
  })
})
