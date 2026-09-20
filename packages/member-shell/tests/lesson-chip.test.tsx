import { describe, expect, test } from 'bun:test'
import type { InteractiveBlock } from '@sistemazero/core/learning'
import { renderToStaticMarkup } from 'react-dom/server'
import { InteractiveLessonBlock } from '../src/components/learning-activity'

/**
 * O selo de TIPO dos blocos interativos.
 *
 * ⚠️ Bloco `interactive` NUNCA passa pelo `renderBlocks` do app — o `LessonSections` o manda
 * direto para cá —, então `sz-lesson-chip` + `data-chip` é o ÚNICO caminho para o chip colorido
 * do kids. O CSS de lá casa pelo VALOR do `data-chip`: renomear um deles apaga a cor em
 * silêncio, e nenhum teste de CSS existe para pegar isso. Por isso os dois pares ficam
 * travados aqui, no pacote que os EMITE.
 */
function bloco(activity: InteractiveBlock['activity'], title = 'O salto'): InteractiveBlock {
  return {
    kind: 'interactive',
    title,
    instructions: 'Mexa no impulso.',
    hints: [],
    required: false,
    activity,
  }
}
function marcacao(content: InteractiveBlock) {
  return renderToStaticMarkup(
    <InteractiveLessonBlock
      block={{
        id: 'bloco',
        blockRevision: 'revision',
        kind: 'interactive',
        sortOrder: 0,
        content,
      }}
    />,
  )
}

describe('o selo de tipo do bloco interativo', () => {
  test.each([
    [{ type: 'experimentation', scene: 'impulse' } as const, 'experimentation', 'Experimente'],
    [{ type: 'html', html: '<p>oi</p>' } as const, 'html', 'Brinque'],
  ])('%o vira o chip %s', (activity, chip, rotulo) => {
    const html = marcacao(bloco(activity))
    expect(html).toContain('sz-lesson-chip')
    expect(html).toContain(`data-chip="${chip}"`)
    expect(html).toContain(rotulo)
  })

  test('cada família de atividade tem seu gancho de raiz', () => {
    // A cena e o HTML são vestidos por seletores diferentes no app; sem os dois
    // ganchos o kids não alcançaria metade dos blocos interativos.
    expect(marcacao(bloco({ type: 'experimentation', scene: 'impulse' }))).toContain(
      'sz-lesson-scene',
    )
    expect(marcacao(bloco({ type: 'html', html: '<p>oi</p>' }))).toContain('sz-lesson-activity')
  })

  test('o rótulo é o VERBO, nunca o nome do formato', () => {
    // A criança lê o que fazer, como nos demais chips da aula.
    const html = marcacao(bloco({ type: 'experimentation', scene: 'impulse' }))
    expect(html).not.toContain('Experimentação')
  })
})
