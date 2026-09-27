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
import { NucleoSceneControls } from '../src/components/scene-nucleo-controls'
import {
  AimStage,
  CameraStage,
  ContactStage,
  CooldownStage,
  DiagonalStage,
  EnemyTypeStage,
  GroupLoopStage,
  HoldVsPressStage,
  TilemapStage,
} from '../src/components/scene-nucleo-stages'

/**
 * Os consertos dos reviews da onda B do lote 5 do Raio-X (16/09/2026) nos palcos e nas bancadas do
 * NÚCLEO do Iniciante 2D. Relatório: `community-kids/tmp/storyboard/implementacao/consertos-5b-g5.md`.
 *
 * ⚠️ Renderização estática: aqui se confere o que o desenho e a bancada ESCREVEM. Os gestos de verdade
 * (o leitor de tela na tecla, o arrasto do alvo com dedo e mouse) moram no kids
 * (`tests/lesson-scene-nucleo.test.tsx`), com DOM.
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
const bancada = (scene: SceneId, state: SceneState, cast?: SceneCast) =>
  html(
    <NucleoSceneControls
      scene={scene}
      state={state}
      dispatch={nada}
      cast={cast}
      onRunning={nada}
    />,
  )
const ligar = (port: string, enabled = true) => ({ type: 'connect', port, enabled }) as SceneAction
const medirOsTres: SceneAction[] = [
  { type: 'look', id: 1 },
  { type: 'look', id: 2 },
  { type: 'look', id: 3 },
]

describe('hold-vs-press', () => {
  test('⚠️⚠️ MÉDIO: a tecla e o "Andar" não viram rolagem nem seleção no toque longo', () => {
    const tecla = bancada('hold-vs-press', mundo('hold-vs-press'))
    for (const classe of ['touch-none', 'select-none', '[-webkit-touch-callout:none]', 'min-w-56'])
      expect(tecla).toContain(classe)
    // A região viva do caminho do leitor de tela existe desde a abertura (vazia).
    expect(tecla).toContain('aria-live="polite"')
    const andar = bancada('camera', mundo('camera'))
    expect(andar.match(/touch-none select-none/g)?.length).toBe(2)
  })

  test('BAIXO: "raquete" na abertura, e a volta escrita depois de 14 passos', () => {
    const abertura = html(<HoldVsPressStage state={mundo('hold-vs-press')} />)
    expect(abertura.match(/data-nome-da-raquete/g)?.length).toBe(2)
    const segurando = mundo('hold-vs-press', { type: 'hold', on: true }, ...tempo(4))
    expect(segurando.input.holdSteps).toBe(16)
    const desenho = html(<HoldVsPressStage state={segurando} />)
    expect(desenho).not.toContain('data-nome-da-raquete')
    expect(desenho).toContain('16 passos · ↻ 1 volta')
    expect(desenho).toContain('A de baixo deu 1 volta na pista.')
  })
})

describe('group-loop', () => {
  test('⚠️⚠️ MÉDIO: sem o laço a régua é uma FOTO, e desbota com "medido antes"', () => {
    const medido = mundo('group-loop', ...medirOsTres)
    const agora = html(<GroupLoopStage state={medido} />)
    expect(agora).not.toContain('data-medido-antes')
    const depois = mundo('group-loop', ...medirOsTres, ...tempo(1))
    const desenho = html(<GroupLoopStage state={depois} />)
    expect(desenho.match(/data-medido-antes/g)?.length).toBe(3)
    expect(desenho).toContain('medido antes')
    for (const d of medido.hunt.distances) expect(desenho).toContain(`>${d}</text>`)
    expect(desenho).toContain(`O 1º estava a ${medido.hunt.distances[0]} quando você mediu`)
    // Com o laço, as três réguas são de agora.
    const laco = mundo('group-loop', ...medirOsTres, ...tempo(1), ligar('loop'), ...tempo(0.5))
    expect(html(<GroupLoopStage state={laco} />)).not.toContain('data-medido-antes')
  })

  test('⚠️⚠️ MÉDIO-1: com o laço ligado, "Escolher" fica FECHADO com o motivo', () => {
    const laco = mundo('group-loop', ...medirOsTres, { type: 'choose', id: 2 }, ligar('loop'))
    const b = bancada('group-loop', laco)
    expect(b.match(/aria-disabled="true"[^>]*>Escolher o/g)?.length).toBe(3)
    expect(b).toContain('O laço está escolhendo sozinho.')
    // E o leitor ouve quanto mediu (era só a cor do botão).
    const um = bancada('group-loop', mundo('group-loop', { type: 'look', id: 2 }))
    expect(um).toContain('medido: 112')
    expect(um).toContain('ainda sem medida')
  })

  test('BAIXO: o número do cacto fica embaixo dele, longe da régua e do anel', () => {
    const desenho = html(<GroupLoopStage state={mundo('group-loop', ...medirOsTres)} />)
    expect(desenho.match(/data-numero-do-cacto=/g)?.length).toBe(3)
  })
})

describe('enemy-type', () => {
  test('⚠️⚠️ MÉDIO: quem não enxerga ouve a velocidade de cada cacto', () => {
    const copia = mundo(
      'enemy-type',
      { type: 'spawnOne' },
      { type: 'spawnOne' },
      ligar('copy'),
      { type: 'define', field: 'speed', value: 8 },
      { type: 'spawnOne' },
    )
    expect(html(<EnemyTypeStage state={copia} />)).toContain(
      'Os cactos andam com velocidade 8, 3 e 3.',
    )
    const ficha = mundo('enemy-type', { type: 'spawnOne' }, { type: 'spawnOne' })
    expect(html(<EnemyTypeStage state={ficha} />)).toContain(
      'Cada cacto anda com velocidade 3, a da ficha.',
    )
  })

  test('BAIXO: o rótulo do cacto na borda desliza para dentro da tela', () => {
    const borda = mundo('enemy-type', { type: 'spawnOne' })
    const [cacto] = borda.blueprint.cacti
    if (!cacto) throw new Error('o cacto não nasceu')
    borda.blueprint.cacti[0] = { ...cacto, x: -20 }
    const desenho = html(<EnemyTypeStage state={borda} />)
    const x = Number(
      desenho.match(/class="fill-scene-a" x="([\d.-]+)" y="[\d.-]+" text-anchor/)?.[1],
    )
    expect(x).toBeGreaterThanOrEqual(64)
  })
})

describe('camera', () => {
  test('BAIXO: no fim do mundo a bolinha do Dino fica dentro do mapa', () => {
    const fim = mundo('camera', { type: 'walk', x: 1200 })
    const cx = Number(
      html(<CameraStage state={fim} />).match(
        /data-dino-no-mapa="true" class="[^"]*" cx="([\d.]+)"/,
      )?.[1],
    )
    expect(cx).toBeLessThanOrEqual(30 + 500 - 7)
  })
})

describe('contact', () => {
  test('BAIXO: a frase conta os corações PERDIDOS, como a faixa', () => {
    const encostado = mundo('contact', { type: 'approach', distance: 0 }, ...tempo(1))
    expect(html(<ContactStage state={encostado} />)).toContain(
      'Em cima, 4 corações a menos. Embaixo, 1 coração a menos.',
    )
  })
})

describe('cooldown', () => {
  test('⚠️⚠️ MÉDIO: o aperto recusado aparece ao lado do botão, e dura 1 s', () => {
    const recusado = mundo(
      'cooldown',
      { type: 'recharge', seconds: 1 },
      { type: 'shoot' },
      { type: 'shoot' },
    )
    expect(bancada('cooldown', recusado)).toContain('Não saiu: recarregando')
    expect(bancada('cooldown', mundo('cooldown'))).not.toContain('Não saiu')
    const meio = mundo(
      'cooldown',
      { type: 'recharge', seconds: 1 },
      { type: 'shoot' },
      { type: 'shoot' },
      ...tempo(0.6),
    )
    expect(html(<CooldownStage state={meio} />)).toContain('data-nao-saiu')
    expect(bancada('cooldown', meio)).toContain('Não saiu: recarregando')
    const passou = mundo(
      'cooldown',
      { type: 'recharge', seconds: 1 },
      { type: 'shoot' },
      { type: 'shoot' },
      ...tempo(1.1),
    )
    expect(html(<CooldownStage state={passou} />)).not.toContain('data-nao-saiu')
    expect(bancada('cooldown', passou)).not.toContain('Não saiu')
  })

  test('BAIXO: a barra diz o ESTADO da recarga', () => {
    const estado = (s: SceneState) =>
      html(<CooldownStage state={s} />).match(/data-estado-da-recarga="true"[^>]*>([^<]+)</)?.[1]
    expect(estado(mundo('cooldown'))).toBe('sem recarga')
    expect(estado(mundo('cooldown', { type: 'recharge', seconds: 1 }, { type: 'shoot' }))).toBe(
      'recarregando',
    )
    expect(
      estado(mundo('cooldown', { type: 'recharge', seconds: 1 }, { type: 'shoot' }, ...tempo(1.1))),
    ).toBe('pronta')
  })
})

describe('aim', () => {
  test('⚠️⚠️ ALTO: a alça do alvo é HTML com `touch-action: none`, e só na experimentação', () => {
    const experimenta = html(<AimStage state={mundo('aim')} dispatch={nada} />)
    expect(experimenta).toContain('data-alca-do-alvo')
    expect(experimenta).toMatch(/data-alca-do-alvo="true"[^>]*touch-action:none/)
    // O `<g>` do desenho não segura mais o dedo: no Chromium o `touch-action` ali não valia.
    expect(experimenta).toContain('<g data-alvo="true">')
    expect(html(<AimStage state={mundo('aim')} />)).not.toContain('data-alca-do-alvo')
  })

  test('BAIXO: o traço do tiro é grosso, e o rótulo da seta tem contorno', () => {
    const errou = mundo('aim', { type: 'shoot' }, ...tempo(1))
    const desenho = html(<AimStage state={errou} />)
    expect(desenho).toMatch(/data-caminho-do-tiro="errou"[^>]*stroke-width="5"/)
    expect(desenho).toMatch(/paint-order="stroke"[^>]*>direção até o alvo</)
  })
})

describe('diagonal', () => {
  test('BAIXO: o fim da andada é pintado DEPOIS do Dino, e o Dino olha para onde andou', () => {
    const esquerda = mundo('diagonal', { type: 'direction', x: -1, y: 1 }, { type: 'stride' })
    const desenho = html(<DiagonalStage state={esquerda} />)
    expect(desenho.indexOf('data-fim-da-andada')).toBeGreaterThan(desenho.indexOf('data-figure='))
    expect(desenho).toContain('data-olha-para="esquerda"')
    const direita = mundo('diagonal', { type: 'direction', x: 1, y: 0 }, { type: 'stride' })
    expect(html(<DiagonalStage state={direita} />)).toContain('data-olha-para="direita"')
  })
})

describe('tilemap', () => {
  test('BAIXO: grade de verdade, a casa apagada tracejada e o bloco de rocha no espaço', () => {
    const apagada = mundo('tilemap', { type: 'paint-tile', row: 5, col: 2, tile: '.' })
    const desenho = html(<TilemapStage state={apagada} dispatch={nada} />)
    expect(desenho).toContain('role="grid"')
    expect(desenho.match(/role="row"/g)?.length).toBe(6)
    expect(desenho.match(/role="gridcell"/g)?.length).toBe(60)
    expect(desenho).toMatch(/data-casa-acesa="\."[^>]*stroke-dasharray="6 5"/)
    expect(desenho).toContain('Arraste o mapa para o lado')
    const NAVE: SceneCast = { hero: { name: 'nave', gender: 'f' } }
    const espaco = html(<TilemapStage state={mundo('tilemap')} cast={NAVE} />)
    expect(espaco).toContain('fill-scene-rock')
    expect(espaco).not.toContain('fill-scene-bark')
  })
})

describe('⚠️⚠️ a meta que abre o controle vem da lista da atividade TAMBÉM (`metaAberta`, full review)', () => {
  // O "Agora é sua vez" passa todas as metas completas para nada ficar esperando, e as bancadas do
  // núcleo e do motor liam só `discoveries`: com um roteiro do professor mais curto, a chave ficava
  // fechada na bancada que prometia estar aberta.
  const chaveDaCopia = (markup: string) =>
    /<button[^>]*>Copiar a ficha ao nascer: [^<]*<\/button>/.exec(markup)?.[0] ?? ''

  test('enemy-type: sem a meta vista, a cópia fica fechada; com a meta completa na lista, abre', () => {
    const aberto = mundo('enemy-type')
    const fechada = chaveDaCopia(bancada('enemy-type', aberto))
    expect(fechada).toContain('aria-disabled="true"')
    const tudoAberto = chaveDaCopia(
      html(
        <NucleoSceneControls
          scene="enemy-type"
          state={aberto}
          dispatch={nada}
          goals={[{ id: 'all-change', complete: true }]}
          onRunning={nada}
        />,
      ),
    )
    expect(tudoAberto).not.toBe('')
    expect(tudoAberto).not.toContain('aria-disabled')
  })
})
