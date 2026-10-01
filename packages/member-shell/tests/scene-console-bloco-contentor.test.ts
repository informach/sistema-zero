import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Os painéis do console que ROLAM precisam ser posicionados (01/10/2026).
 *
 * Um texto só para o leitor (`sr-only` do Tailwind) é `position: absolute`, e um elemento absoluto
 * toma como bloco contentor o ancestral POSICIONADO mais perto. A lista "O que você já descobriu"
 * tem um por descoberta trancada ("Descoberta 2, trancada."), parado onde a lista o deixa. Sem o
 * `relative` nos painéis, esse ancestral era o diálogo ampliado (`position: fixed`), e o span,
 * abaixo da janela, esticava a área de rolagem do DIÁLOGO em vez de a do painel: no Linux do CI
 * (fonte mais larga) o `scrollIntoView` do resultado rolava o diálogo em 51px e o "Voltar à aula"
 * saía da janela (e2e "fichas cabem em 1366x768, painel 320"). Medido: `scrollHeight` do diálogo
 * 810 contra 768 de janela, só por causa desse span.
 *
 * O e2e das cenas é a prova de verdade; este teste só impede que a declaração suma numa limpeza.
 */
const css = readFileSync(resolve(import.meta.dir, '..', 'src', 'styles', 'scene.css'), 'utf8')

/** O corpo da PRIMEIRA regra cujo seletor é exatamente o pedido (sem `@container` em volta). */
const corpoDaRegra = (seletor: string) => {
  const inicio = css.indexOf(`\n${seletor} {`)
  if (inicio < 0) return null
  const fim = css.indexOf('}', inicio)
  return css.slice(inicio, fim)
}

describe('os painéis que rolam contêm os seus sr-only absolutos', () => {
  test('o mundo e a conversa com a ação são posicionados', () => {
    const corpo = corpoDaRegra('.sz-scene-console-visual,\n.sz-scene-console-actions')
    expect(corpo).not.toBeNull()
    expect(corpo).toMatch(/position:\s*relative/)
  })

  test('o cartão da cena, que rola no ampliado empilhado, também', () => {
    const corpo = corpoDaRegra('.sz-scene-workspace-card')
    expect(corpo).not.toBeNull()
    expect(corpo).toMatch(/position:\s*relative/)
  })

  test('a lista de descobertas ainda tem o texto só para o leitor que motivou a regra', () => {
    const fonte = readFileSync(
      resolve(import.meta.dir, '..', 'src', 'components', 'scene-descobertas.tsx'),
      'utf8',
    )
    expect(fonte).toContain('className="sr-only"')
  })
})
