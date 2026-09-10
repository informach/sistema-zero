import { describe, expect, test } from 'bun:test'
// Fonte da verdade (members) por caminho RELATIVO de módulo puro — o admin NÃO depende
// do members no package.json e não deve passar a depender por causa de teste (mesmo
// precedente do `career-tier-conformance` aqui e do `badge-conformance` do kids).
import { LESSON_BLOCK_KINDS as MEMBERS_KINDS } from '../../members/src/domain/course/lesson-block'
import {
  buildContent,
  EMPTY_BLOCK,
} from '../src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/lesson-editor-client'
import { LESSON_BLOCK_KINDS as ADMIN_KINDS } from '../src/lib/types'

/**
 * Um `kind` de bloco novo exige edição manual em vários arquivos, e quem esquece um
 * NÃO recebe erro: o `default: return null` dos renderizadores some com o bloco em
 * silêncio e o `default` do `buildContent` do editor grava um QUIZ. Numa aula "em
 * breve" — onde o bloco é o ÚNICO servido — esquecer significa aula 100% em branco.
 *
 * A completude do `KIND_LABELS` é cobrada pelo COMPILADOR (`Record<LessonBlockKind,
 * string>` no editor), então aqui fica o elo que o tipo não alcança: os dois arrays.
 */
describe('conformance admin×members — tipos de bloco de aula', () => {
  test('LESSON_BLOCK_KINDS do admin ≡ o do members (conjunto E ORDEM)', () => {
    // A ORDEM importa: é a sequência do `<select>` de tipo no editor de aula.
    expect([...ADMIN_KINDS]).toEqual([...MEMBERS_KINDS])
  })

  test('todo tipo tem case no buildContent (o default grava QUIZ em silêncio)', () => {
    // Este é o elo mais traiçoeiro da lista: um kind sem `case` não dá erro
    // nenhum, só grava um quiz no lugar do bloco que a autora escolheu. Aqui a
    // regressão aparece na hora, e para TODO tipo futuro de graça.
    // O Estúdio lê o snapshot do editor embutido; aqui basta um objeto vazio.
    const projetoVazio = {} as Parameters<typeof buildContent>[1]
    for (const kind of ADMIN_KINDS) {
      expect(buildContent({ ...EMPTY_BLOCK, kind }, projetoVazio).kind).toBe(kind)
    }
  })
})
