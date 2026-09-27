import { expect, test } from 'bun:test'
import { openScene, stepScene } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { PublishedCopyStage } from '../src/components/scene-copies'
import { SameRulesStage } from '../src/components/scene-same-rules'

test('o Mural desenha as duas publicações e mantém a cor da primeira', () => {
  const start = { scene: 'published-copy' } as const
  let state = stepScene(start, openScene(start), { type: 'publish' })
  state = stepScene(start, state, { type: 'recolor', side: 'project', color: 'rosa' })
  state = stepScene(start, state, { type: 'publish' })
  const html = renderToStaticMarkup(<PublishedCopyStage state={state} />)
  expect(html).toContain('Publicação 1')
  expect(html).toContain('Publicação 2')
  expect(html).toContain('primeira permanece azul')
  expect(html).toContain('última está rosa')
})

test('nave, carrinho e submarino mostram desenhos diferentes com a mesma lista de regras', () => {
  const start = { scene: 'same-rules-new-skin' } as const
  const space = openScene(start)
  const road = stepScene(start, space, { type: 'skin', theme: 'road' })
  const sea = stepScene(start, road, { type: 'skin', theme: 'sea' })
  const htmls = [space, road, sea].map((state) =>
    renderToStaticMarkup(<SameRulesStage state={state} />),
  )
  for (const html of htmls) {
    expect(html).toContain('as setas movem')
    expect(html).toContain('a tecla atira')
    expect(html).toContain('o obstáculo vem')
    expect(html).toContain('encostou, perde vida')
  }
  expect(htmls[0]).toContain('data-figure="nave"')
  expect(htmls[1]).toContain('fill="#ff6b79"')
  expect(htmls[2]).toContain('fill="#ffbf62"')
})
