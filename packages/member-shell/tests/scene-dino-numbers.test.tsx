import { describe, expect, test } from 'bun:test'
import {
  openScene,
  type SceneAction,
  type SceneCast,
  type SceneId,
  type SceneState,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { LivesStage } from '../src/components/scene-art-stages'
import { VariableStage, VelocityStage } from '../src/components/scene-core-stages'
import { DinoNumbersControls } from '../src/components/scene-dino-numbers-controls'
import {
  AccelerationStage,
  RandomStage,
  RestartStage,
  ScoreStage,
} from '../src/components/scene-dino-numbers-stages'

/**
 * Os palcos e a bancada do Corre Dino, segunda metade, e dos números (lote 5 do Raio-X, G3).
 *
 * ⚠️ O desenho é a resposta da cena: cada teste confere que o que o MOTOR guardou aparece no palco
 * (a herança dos cactos, a marquinha "2×", a conta da condição, a causa de cada contagem) e que a
 * bancada fecha com o motivo em vez de esconder.
 */

const mundo = (scene: SceneId, ...acoes: SceneAction[]): SceneState => {
  let s = openScene({ scene })
  for (const a of acoes) s = stepScene({ scene }, s, a)
  return s
}
const tempo = (segundos: number): SceneAction[] =>
  Array.from({ length: Math.round(segundos / 0.05) }, () => ({ type: 'advance', seconds: 0.05 }))
const html = (node: React.ReactElement) => renderToStaticMarkup(node)
const nada = () => {}
const NAVE: SceneCast = {
  hero: { name: 'nave', gender: 'f' },
  obstacle: { name: 'asteroide', gender: 'm' },
}

describe('restart', () => {
  // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5): "Tocar na tela do jogo", para não
  // ouvir dois "Tocar na tela" seguidos no Tab (o do palco e o da bancada).
  test('⚠️⚠️ a tela inteira é o botão "Tocar na tela do jogo", menos JOGANDO e menos na demonstração', () => {
    const inicio = mundo('restart')
    expect(html(<RestartStage state={inicio} dispatch={nada} />)).toContain(
      'aria-label="Tocar na tela do jogo"',
    )
    // Na demonstração a criança assiste.
    expect(html(<RestartStage state={inicio} />)).not.toContain(
      'aria-label="Tocar na tela do jogo"',
    )
    const jogando = mundo('restart', { type: 'start', input: 'tap' })
    expect(html(<RestartStage state={jogando} dispatch={nada} />)).not.toContain(
      'aria-label="Tocar na tela do jogo"',
    )
  })

  test('⚠️⚠️ voltar ao início com cactos na pista ACENDE o cartão e os cactos ficam à vista', () => {
    const tap: SceneAction = { type: 'start', input: 'tap' }
    const herdou = mundo('restart', tap, ...tempo(3), tap)
    const desenho = html(<RestartStage state={herdou} />)
    expect(herdou.crowd.cacti.length).toBeGreaterThan(0)
    expect((desenho.match(/data-figure="cacto"/g) ?? []).length).toBe(herdou.crowd.cacti.length)
    expect(desenho).toContain('INÍCIO')
    // A cena não tem placar: a Aula 9 vem antes dele.
    expect(desenho).not.toMatch(/ponto/i)
  })

  test('a escolha do fim é uma ESCOLHA (sem aria-pressed) e o toque JOGANDO fica fechado com o motivo', () => {
    const jogando = mundo('restart', { type: 'start', input: 'tap' })
    const bancada = html(
      <DinoNumbersControls
        scene="restart"
        state={jogando}
        dispatch={nada}
        goals={[]}
        onRunning={nada}
      />,
    )
    expect(bancada).toContain('Ir para o início')
    expect(bancada).toContain('Reiniciar o jogo')
    expect(bancada).not.toContain('aria-pressed')
    expect(bancada).toContain('aria-disabled="true"')
    expect(bancada).toContain('aria-describedby="restart-toque-nota"')
  })
})

describe('score', () => {
  test('⚠️ a fileira embaixo do palco guarda o placar visto em cada tela', () => {
    const solto = mundo('score', ...tempo(2.1))
    const desenho = html(<ScoreStage state={solto} />)
    expect(desenho).toMatch(/Início (<!-- -->)?2/)
    expect(desenho).toMatch(/Jogando (<!-- -->)?–/)
  })
})

describe('random', () => {
  test('⚠️⚠️ o lugar que repetiu ganha "2×" na régua, e a descrição diz quantas vezes', () => {
    const s = mundo(
      'random',
      ...[0.3, 0.75, 0.35].map(
        (unit): SceneAction => ({ type: 'sample', kind: 'position', unit, guided: false }),
      ),
    )
    const desenho = html(<RandomStage state={s} />)
    expect(desenho).toMatch(/2(<!-- -->)?×/)
    expect(desenho).toContain('Na régua: 520, 2 vezes; 550.')
  })
})

describe('acceleration', () => {
  const passar: SceneAction = { type: 'sample', kind: 'velocity', unit: 0, guided: false }

  test('⚠️⚠️ a conta da condição fica à vista: em −9 ela diz não, e o número vai colado em cada cacto', () => {
    const s = mundo('acceleration', passar, passar, passar, passar)
    const desenho = html(<AccelerationStage state={s} />)
    expect(desenho).toContain('não')
    for (const v of ['−6', '−7', '−8', '−9']) expect(desenho).toContain(v)
    const sem = mundo('acceleration', { type: 'connect', port: 'limit', enabled: false }, passar)
    expect(html(<AccelerationStage state={sem} />)).toContain('sem a condição')
  })

  test('a bancada tem UM relógio só e a condição com o estado no rótulo', () => {
    const bancada = html(
      <DinoNumbersControls
        scene="acceleration"
        state={mundo('acceleration')}
        dispatch={nada}
        goals={[]}
        onRunning={nada}
      />,
    )
    expect((bancada.match(/Passar 5 segundos/g) ?? []).length).toBe(1)
    expect(bancada).toContain('A condição Se velocidade &gt; −9')
  })
})

describe('hitbox e random: fechado não é escondido', () => {
  test('⚠️ o Tamanho da área abre depois do BATEU, e a nota diz o GESTO que abre', () => {
    const bancada = html(
      <DinoNumbersControls
        scene="hitbox"
        state={mundo('hitbox')}
        dispatch={nada}
        goals={[]}
        onRunning={nada}
      />,
    )
    expect(bancada).toContain('Tamanho da área do Dino')
    expect(bancada).toContain('130%')
    expect(bancada).toContain('Abre depois que você aproximar o cacto um toque de cada vez.')
    // A nota não entrega QUANDO bate (é a pergunta da previsão).
    expect(bancada).not.toMatch(/antes de os desenhos/i)
  })

  test('⚠️ o sorteio de velocidade fica fechado com o motivo até o lugar repetir', () => {
    const bancada = html(
      <DinoNumbersControls
        scene="random"
        state={mundo('random')}
        dispatch={nada}
        goals={[]}
        onRunning={nada}
      />,
    )
    expect(bancada).toContain('aria-describedby="random-velocidade-nota"')
    expect(bancada).toContain('Abre depois de sortear o lugar mais algumas vezes.')
  })
})

describe('velocity', () => {
  test('⚠️⚠️ o palco escreve a conta do último quadro e um pontinho por quadro', () => {
    const s = mundo('velocity', { type: 'velocity', vx: 5, vy: 0 }, ...tempo(0.2))
    const desenho = html(<VelocityStage state={s} />)
    expect(desenho).toMatch(/x: 60 \+ 5 = 65/)
    expect(desenho).toContain('fora da tela')
    expect((desenho.match(/<circle class="fill-scene-a"/g) ?? []).length).toBe(2)
  })
})

describe('variable', () => {
  test('⚠️⚠️ os três blocos acendem conforme acontecem, e a caixa só existe depois de criada', () => {
    const antes = html(<VariableStage state={mundo('variable')} cast={NAVE} />)
    expect(antes).toContain('ainda não existe')
    expect(antes).not.toContain('Pontos:')
    const mudou = mundo(
      'variable',
      { type: 'store', value: 0 },
      { type: 'change', by: 1 },
      { type: 'change', by: 1 },
      { type: 'change', by: 1 },
    )
    const semMostrar = html(<VariableStage state={mudou} cast={NAVE} />)
    expect(semMostrar).toContain('mudou 3 vezes')
    expect(semMostrar).not.toContain('Pontos:')
    expect(semMostrar).toContain('data-figure="nave"')
    expect(semMostrar).toContain('data-figure="asteroide"')
    const mostrou = stepScene({ scene: 'variable' }, mudou, { type: 'show', on: true })
    expect(html(<VariableStage state={mostrou} cast={NAVE} />)).toMatch(/Pontos: (<!-- -->)?3/)
  })
})

describe('lives', () => {
  test('⚠️⚠️ o acerto leva "+1" até o placar, e a batida leva a seta até o coração apagado', () => {
    const acerto = mundo('lives', { type: 'shoot' })
    const desenhoDoAcerto = html(<LivesStage state={acerto} cast={NAVE} />)
    expect(desenhoDoAcerto).toContain('+1')
    expect(desenhoDoAcerto).toContain('acerto')
    expect(desenhoDoAcerto).not.toContain('batida')
    const batida = stepScene(
      { scene: 'lives' },
      stepScene({ scene: 'lives' }, acerto, { type: 'connect', port: 'life', enabled: true }),
      { type: 'collide' },
    )
    const desenhoDaBatida = html(<LivesStage state={batida} cast={NAVE} />)
    expect(desenhoDaBatida).toContain('batida')
    expect(desenhoDaBatida).not.toContain('+1')
    // O tiro é uma bolinha, e não um papel do elenco: só a nave e o asteroide são figuras.
    const figuras = [...desenhoDaBatida.matchAll(/data-figure="([a-z]+)"/g)].map((m) => m[1])
    expect(new Set(figuras)).toEqual(new Set(['nave', 'asteroide']))
  })

  test('sem o fio da vida a batida não aponta coração nenhum', () => {
    const s = mundo('lives', { type: 'collide' })
    expect(html(<LivesStage state={s} />)).not.toContain('>batida<')
  })
})
