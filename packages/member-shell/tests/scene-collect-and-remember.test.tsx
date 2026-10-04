import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  CollectionMemoryControls,
  CollectionMemoryStage,
} from '../src/components/scene-collect-and-remember'

describe('experiência de memória da coleta', () => {
  const start = { scene: 'collect-and-remember' } as const
  const initial = openScene(start)
  const without = stepScene(start, initial, { type: 'collect-key' })
  const withMemory = stepScene(
    start,
    stepScene(start, initial, { type: 'remember-collection', enabled: true }),
    { type: 'collect-key' },
  )

  test('o palco é o jogo: o mesmo aviso e o mesmo sumiço nos dois modos', () => {
    const first = renderToStaticMarkup(<CollectionMemoryStage state={without} />)
    const second = renderToStaticMarkup(<CollectionMemoryStage state={withMemory} />)
    for (const html of [first, second]) {
      // A faixa do aviso, desenhada como o jogo a desenha, sem o halo que borrava o branco.
      expect(html).toContain('Você pegou a chave! Agora vá ao farol.')
      expect(html).toContain('data-sem-halo')
      expect(html).toContain('data-chave="coletada"')
      // temChave e a chave moram nos ladrilhos do console: o palco não os repete num cartão.
      expect(html).not.toContain('Informação guardada')
      expect(html).not.toContain('Aviso do jogo')
    }
    // O que distingue os dois modos é a informação guardada, e só o leitor a ouve no palco.
    expect(first).toContain('temChave guarda falso')
    expect(second).toContain('temChave guarda verdadeiro')
    const antes = renderToStaticMarkup(<CollectionMemoryStage state={initial} />)
    expect(antes).toContain('Encontre a chave e vá ao farol.')
    expect(antes).toContain('data-chave="no-chao"')
  })

  test('a regra mostra a linha de guardar só com o interruptor ligado', () => {
    const desligado = renderToStaticMarkup(
      <CollectionMemoryControls state={initial} dispatch={() => {}} />,
    )
    expect(desligado).toContain('Alterar temChave para verdadeiro')
    expect(desligado).toContain('data-estado="fora"')
    expect(desligado).toContain('(desligado)')
    const ligado = renderToStaticMarkup(
      <CollectionMemoryControls
        state={stepScene(start, initial, { type: 'remember-collection', enabled: true })}
        dispatch={() => {}}
      />,
    )
    expect(ligado).toContain('Alterar temChave para verdadeiro')
    expect(ligado).not.toContain('data-estado="fora"')
    expect(ligado).toContain('Guardar a coleta: ligado')
  })

  test('o interruptor fecha depois da coleta e diz por que precisa recomeçar', () => {
    const html = renderToStaticMarkup(
      <CollectionMemoryControls state={without} dispatch={() => {}} />,
    )
    expect(html).toContain('Guardar a coleta: desligado')
    expect(html).toContain('aria-pressed="false"')
    expect(html).toContain('aria-disabled="true"')
    expect(html).toContain('Recomece a partida para mudar essa regra.')
  })

  test('o azul cheio segue o passo que leva a partida adiante', () => {
    const gesto = (state: typeof initial) =>
      renderToStaticMarkup(<CollectionMemoryControls state={state} dispatch={() => {}} />).match(
        /data-tom="gesto"[^>]*>([^<]+)</,
      )?.[1]
    expect(gesto(initial)).toBe('Encostar na chave')
    expect(gesto(withMemory)).toBe('Afastar')
    expect(gesto(stepScene(start, withMemory, { type: 'leave-key' }))).toBe('Recomeçar a partida')
  })
})
