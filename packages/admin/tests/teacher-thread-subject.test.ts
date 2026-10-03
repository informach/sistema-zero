import { describe, expect, test } from 'bun:test'
import { threadSubject } from '../src/lib/teacher-thread-subject'

describe('threadSubject', () => {
  test('põe o curso na frente da aula e da seção', () => {
    expect(threadSubject({ courseTitle: 'Cadê Todo Mundo?', title: 'Aula 1 · Bem-vindo' })).toBe(
      'Cadê Todo Mundo? · Aula 1 · Bem-vindo',
    )
  })

  test('sem curso (members antigo, curso apagado ou recado geral) fica só o título', () => {
    expect(threadSubject({ title: 'Aula 1 · Bem-vindo' })).toBe('Aula 1 · Bem-vindo')
    expect(threadSubject({ courseTitle: null, title: 'Aula 1 · Bem-vindo' })).toBe(
      'Aula 1 · Bem-vindo',
    )
    expect(threadSubject({ courseTitle: '  ', title: null })).toBeNull()
  })

  test('sem título fica só o curso', () => {
    expect(threadSubject({ courseTitle: 'Cadê Todo Mundo?', title: null })).toBe('Cadê Todo Mundo?')
  })

  test('não repete o curso quando o título já começa por ele', () => {
    expect(
      threadSubject({ courseTitle: 'Cadê Todo Mundo?', title: 'Cadê Todo Mundo? · Aula 1' }),
    ).toBe('Cadê Todo Mundo? · Aula 1')
    expect(threadSubject({ courseTitle: 'Jogo', title: 'Jogo' })).toBe('Jogo')
  })
})
