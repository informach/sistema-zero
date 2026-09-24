import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { LighthouseKeyControls, LighthouseKeyStage } from '../src/components/scene-lighthouse-key'

describe('experiência da porta do farol', () => {
  const start = { scene: 'lighthouse-key' } as const

  test('a cena muda visualmente só após testar a porta com chave', () => {
    const initial = openScene(start)
    const before = renderToStaticMarkup(<LighthouseKeyStage state={initial} />)
    expect(before).toContain('Porta fechada')
    const carrying = stepScene(start, initial, { type: 'key-state', hasKey: true })
    const controls = renderToStaticMarkup(
      <LighthouseKeyControls state={carrying} dispatch={() => {}} />,
    )
    expect(controls).toContain('Deixar a chave')
    expect(controls).toContain('Testar a porta')
    const opened = stepScene(start, carrying, { type: 'try-lighthouse-door' })
    const after = renderToStaticMarkup(<LighthouseKeyStage state={opened} />)
    expect(after).toContain('A luz acendeu!')
    expect(after).toContain('A porta está aberta e a luz está acesa')
  })
})
