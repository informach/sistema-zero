import { afterEach, describe, expect, test } from 'bun:test'
import { CODIGO_SEM_ENVELOPE } from '../src/lib/api'
import { downloadLessonAttachment } from '../src/lib/attachment-download'
import { ADULT_LESSON_COPY } from '../src/lib/lesson-copy'
import { KIDS_LESSON_COPY } from '../src/lib/lesson-copy-kids'

/**
 * A recusa do download de um material leva o `code` do envelope (06/10/2026). É por ele que o
 * `erroDoServidor` sabe que a frase veio do servidor: sem o `code`, a regra "erro sem código cai na
 * frase padrão" engolia o recado útil da rota ("Este material não está disponível…").
 */
const fetchOriginal = globalThis.fetch
afterEach(() => {
  globalThis.fetch = fetchOriginal
})

const responder = (status: number, corpo: unknown) => {
  globalThis.fetch = (async () =>
    new Response(corpo === undefined ? 'sem json' : JSON.stringify(corpo), {
      status,
    })) as unknown as typeof fetch
}

describe('downloadLessonAttachment: a recusa leva o code', () => {
  test('a frase do servidor chega à tela, com o code de verdade', async () => {
    responder(503, {
      error: { code: 'WATERMARK_UNAVAILABLE', message: 'Tente baixar de novo daqui a pouco.' },
    })
    const r = await downloadLessonAttachment('/x', 'material')
    expect(r).toEqual({
      ok: false,
      reason: 'refused',
      code: 'WATERMARK_UNAVAILABLE',
      message: 'Tente baixar de novo daqui a pouco.',
    })
    expect(ADULT_LESSON_COPY.erroDoServidor(r, 'Padrão')).toBe(
      'Tente baixar de novo daqui a pouco.',
    )
    expect(KIDS_LESSON_COPY.erroDoServidor(r, 'Padrão')).toBe('Tente baixar de novo daqui a pouco.')
  })

  test('sem envelope (o gateway caiu), o code é o sintético e a tela usa a frase padrão', async () => {
    responder(502, undefined)
    const r = await downloadLessonAttachment('/x', 'material')
    expect(r).toMatchObject({ ok: false, reason: 'refused', code: CODIGO_SEM_ENVELOPE })
    expect(ADULT_LESSON_COPY.erroDoServidor(r, 'Padrão')).toBe('Padrão')
    expect(KIDS_LESSON_COPY.erroDoServidor(r, 'Padrão')).toBe('Padrão')
  })
})
