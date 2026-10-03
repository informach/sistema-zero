import { describe, expect, test } from 'bun:test'
import { publicInteractiveBlock } from '@sistemazero/core/learning'
import { openScene, stepScene } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { SceneActivityView } from '../src/components/scene-activity'
import { FoundCounterControls, FoundCounterStage } from '../src/components/scene-found-counter'

describe('experiência Achados no jardim', () => {
  const start = { scene: 'found-counter' } as const

  test('a cena oferece toque nos três esconderijos e no espaço vazio', () => {
    const markup = renderToStaticMarkup(
      <FoundCounterStage state={openScene(start)} dispatch={() => {}} />,
    )
    expect(markup).toContain('Achados está em 0')
    expect(markup).toContain('Tocar no arbusto')
    expect(markup).toContain('Tocar nas pedras')
    expect(markup).toContain('Tocar nas flores')
    expect(markup).toContain('Procurar em um espaço vazio do jardim')
    expect(markup).toContain('Procurar aqui')
    expect(markup).toMatch(/sz-scene-frame[^"]*relative/)
  })

  test('o fundo do jardim COBRE o palco: a raiz do SVG apontado leva o "slice"', () => {
    // ⚠️ Anti-vácuo: sem o atributo na RAIZ, o `<image>` de fora ajusta por "meet" e o palco de
    // 560 × 300 ganha ~13 px de beirada vazia de cada lado (a borda escura do console deixou à vista).
    const markup = renderToStaticMarkup(<FoundCounterStage state={openScene(start)} />)
    const fundo = markup.match(/<image data-fundo="jardim" href="([^"]+)"/)
    expect(fundo).not.toBeNull()
    expect(decodeURIComponent(fundo![1] ?? '')).toMatch(
      /^data:image\/svg\+xml;charset=utf-8,<svg [^>]*preserveAspectRatio="xMidYMid slice"/,
    )
  })

  test('mostra somente a contagem atual; recomeçar continua disponível', () => {
    const found = stepScene(start, openScene(start), { type: 'find-character', id: 1 })
    const markup = renderToStaticMarkup(<FoundCounterStage state={found} />)
    expect(markup).toContain('Achados está em 1')
    expect(markup).toContain('Personagens visíveis: raposa')
    expect(markup).not.toContain('Tocar nas pedras')
    const playable = renderToStaticMarkup(<FoundCounterStage state={found} dispatch={() => {}} />)
    expect(playable).toContain('Tocar de novo na raposa')
    expect(renderToStaticMarkup(<FoundCounterControls dispatch={() => {}} />)).toContain(
      'Recomeçar a busca',
    )
  })

  test('a experiência inteira mostra apenas o recomeço que registra a nova busca', () => {
    const activity = { type: 'experimentation', scene: 'found-counter', cenario: 'jardim' } as const
    const content = publicInteractiveBlock({
      kind: 'interactive',
      required: true,
      semPerguntaFinal: true,
      title: 'Quantos já encontramos?',
      instructions: 'O que acontece com Achados quando você encontra alguém?',
      hints: [],
      activity,
    })
    const markup = renderToStaticMarkup(
      <SceneActivityView
        block={{ id: 'experiencia-achados', kind: 'interactive', sortOrder: 0, content }}
        content={content}
        activity={activity}
      />,
    )
    expect(markup).toContain('Recomeçar a busca')
    expect(markup).not.toContain('>Recomeçar</span>')
  })
})
