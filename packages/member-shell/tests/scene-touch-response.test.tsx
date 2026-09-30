import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { LessonSceneControls } from '../src/components/scene-lesson-controls'
import { TouchResponseStage } from '../src/components/scene-touch-response'

describe('palco O toque faz o jogo responder', () => {
  test('o esconderijo é tocável; ligar o controle sozinho não revela o personagem', () => {
    const start = { scene: 'touch-response' } as const
    const initial = openScene(start)
    const stage = renderToStaticMarkup(<TouchResponseStage state={initial} dispatch={() => {}} />)
    expect(stage).toContain('Tocar no arbusto')
    expect(stage).toContain('O personagem está escondido')
    const connected = stepScene(start, initial, { type: 'connect', port: 'touch', enabled: true })
    expect(renderToStaticMarkup(<TouchResponseStage state={connected} />)).toContain(
      'O personagem está escondido',
    )
    const controls = renderToStaticMarkup(
      <LessonSceneControls
        scene="touch-response"
        state={connected}
        dispatch={() => {}}
        goals={[]}
        onRunning={() => {}}
      />,
    )
    expect(controls).toContain('Desligar a reação ao toque')
  })

  const start = { scene: 'touch-response' } as const
  test('"Ligar a reação ao toque" é a AÇÃO PRINCIPAL da bancada: botão cheio, no tom de gesto', () => {
    // Console v2 (30/09/2026): o gesto do momento sai na largura toda (`sz-scene-acao-principal`,
    // `tom="gesto"` = variante cheia com `px-6`). Ligado, ele volta ao tom "ligado" (contorno).
    const botaoDe = (markup: string, texto: string) => {
      const fim = markup.indexOf(texto)
      expect(fim).toBeGreaterThan(-1)
      const inicio = markup.lastIndexOf('<button', fim)
      return markup.slice(inicio, fim)
    }
    const desligado = renderToStaticMarkup(
      <LessonSceneControls
        scene="touch-response"
        state={openScene(start)}
        dispatch={() => {}}
        goals={[]}
        onRunning={() => {}}
      />,
    )
    const principal = botaoDe(desligado, 'Ligar a reação ao toque')
    expect(principal).toContain('sz-scene-acao-principal')
    expect(principal).toContain('px-6')
    expect(principal).not.toContain('border-primary')

    const ligado = renderToStaticMarkup(
      <LessonSceneControls
        scene="touch-response"
        state={stepScene(start, openScene(start), {
          type: 'connect',
          port: 'touch',
          enabled: true,
        })}
        dispatch={() => {}}
        goals={[]}
        onRunning={() => {}}
      />,
    )
    const chave = botaoDe(ligado, 'Desligar a reação ao toque')
    expect(chave).toContain('sz-scene-acao-principal')
    expect(chave).toContain('border-primary')
    expect(chave).not.toContain('px-6')
  })

  test('o fundo do jardim COBRE o palco: a raiz do SVG apontado leva o "slice"', () => {
    // ⚠️ Anti-vácuo: sem o atributo na RAIZ, o `<image>` de fora ajusta por "meet" e o palco de
    // 560 × 300 ganha ~13 px de beirada vazia de cada lado (a borda escura do console deixou à vista).
    const markup = renderToStaticMarkup(<TouchResponseStage state={openScene(start)} />)
    const fundo = markup.match(/<image data-fundo="jardim" href="([^"]+)"/)
    expect(fundo).not.toBeNull()
    expect(decodeURIComponent(fundo![1] ?? '')).toMatch(
      /^data:image\/svg\+xml;charset=utf-8,<svg [^>]*preserveAspectRatio="xMidYMid slice"/,
    )
  })

  test('depois do toque, o coelho aparece e o controle mostra como repetir', () => {
    const start = { scene: 'touch-response' } as const
    const state = stepScene(
      start,
      stepScene(start, openScene(start), {
        type: 'connect',
        port: 'touch',
        enabled: true,
      }),
      { type: 'start', input: 'tap' },
    )
    expect(
      renderToStaticMarkup(<TouchResponseStage state={state} dispatch={() => {}} />),
    ).toContain('O coelho apareceu')
    expect(
      renderToStaticMarkup(
        <LessonSceneControls
          scene="touch-response"
          state={state}
          dispatch={() => {}}
          goals={[]}
          onRunning={() => {}}
        />,
      ),
    ).toContain('Testar de novo com a reação ligada')
  })
})
