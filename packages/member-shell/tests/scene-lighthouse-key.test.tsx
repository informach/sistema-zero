import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { LighthouseKeyControls, LighthouseKeyStage } from '../src/components/scene-lighthouse-key'

describe('experiência da porta do farol', () => {
  const start = { scene: 'lighthouse-key' } as const

  test('o aviso do jogo e a resposta marcada vêm só da tentativa', () => {
    const initial = openScene(start)
    const before = renderToStaticMarkup(<LighthouseKeyStage state={initial} />)
    expect(before).toContain('Encontre a chave e vá ao farol.')
    expect(before).toContain('viewBox="0 0 480 360"')
    const regraAntes = renderToStaticMarkup(
      <LighthouseKeyControls state={initial} dispatch={() => {}} />,
    )
    expect(regraAntes).toContain('A regra da porta')
    expect(regraAntes).not.toContain('data-estado=')

    const carrying = stepScene(start, initial, { type: 'key-state', hasKey: true })
    const controls = renderToStaticMarkup(
      <LighthouseKeyControls state={carrying} dispatch={() => {}} />,
    )
    expect(controls).toContain('Deixar a chave')
    expect(controls).toContain('Testar a porta')
    expect(controls).not.toContain('✓ escolhido')

    const opened = stepScene(start, carrying, { type: 'try-lighthouse-door' })
    const after = renderToStaticMarkup(<LighthouseKeyStage state={opened} />)
    expect(after).toContain('Você acendeu o farol! Olhe o barco chegando.')
    expect(after).toContain('A porta está aberta e a luz está acesa')
    const regraAberta = renderToStaticMarkup(
      <LighthouseKeyControls state={opened} dispatch={() => {}} />,
    )
    expect(regraAberta).toMatch(
      /data-estado="escolhido"[^>]*>.*✓ escolhido: .*então.* acender o farol/,
    )
    expect(regraAberta).toMatch(/data-estado="ignorado"[^>]*>.*senão/)

    // Trocar a chave limpa a marca: a próxima tentativa é que decide.
    const changed = stepScene(start, opened, { type: 'key-state', hasKey: false })
    expect(
      renderToStaticMarkup(<LighthouseKeyControls state={changed} dispatch={() => {}} />),
    ).not.toContain('✓ escolhido')

    const locked = stepScene(start, changed, { type: 'try-lighthouse-door' })
    expect(renderToStaticMarkup(<LighthouseKeyStage state={locked} />)).toContain(
      'A porta não abriu. Falta a chave.',
    )
    expect(
      renderToStaticMarkup(<LighthouseKeyControls state={locked} dispatch={() => {}} />),
    ).toMatch(/data-estado="escolhido"[^>]*>.*✓ escolhido: .*senão.* avisar que falta a chave/)
  })
})
