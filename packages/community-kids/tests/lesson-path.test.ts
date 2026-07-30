import { describe, expect, test } from 'bun:test'
import { isLessonPath } from '../src/lib/lesson-path'

describe('isLessonPath', () => {
  test('aceita a página de aula e sub-rotas', () => {
    expect(isLessonPath('/cursos/meu-curso/aulas/abc123')).toBe(true)
    expect(isLessonPath('/cursos/meu-curso/aulas/abc123/qualquer')).toBe(true)
  })

  test('recusa rotas que não são de aula', () => {
    expect(isLessonPath('/cursos')).toBe(false)
    expect(isLessonPath('/cursos/meu-curso')).toBe(false)
    expect(isLessonPath('/cursos/meu-curso/aulas')).toBe(false)
    expect(isLessonPath('/perfil')).toBe(false)
    expect(isLessonPath('/estudio')).toBe(false)
    expect(isLessonPath('/')).toBe(false)
  })

  test('tolera null/undefined/vazio', () => {
    expect(isLessonPath(null)).toBe(false)
    expect(isLessonPath(undefined)).toBe(false)
    expect(isLessonPath('')).toBe(false)
  })
})
