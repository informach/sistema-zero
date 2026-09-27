import { describe, expect, test } from 'bun:test'
import {
  CAMERA_LANDMARKS,
  CONTACT_HEARTS,
  huntDistances,
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
 * Os palcos e a bancada do núcleo do Iniciante 2D (lote 5 do Raio-X, G5).
 *
 * ⚠️ O desenho é a resposta da cena: cada teste confere que o que o MOTOR guardou aparece no palco (a
 * tecla afundada, a régua do cacto medido, os cactos que andam, os marcos que passam pela tela, os
 * corações de cada pista, os tiros no ar, o caminho do tiro, os fantasmas da andada, a casa acesa) e
 * que a bancada fecha com o motivo em vez de esconder. O gesto de verdade (segurar, arrastar) é
 * conferido no kids, com DOM.
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
const contar = (texto: string, re: RegExp) => (texto.match(re) ?? []).length
const NAVE: SceneCast = {
  hero: { name: 'nave', gender: 'f' },
  obstacle: { name: 'asteroide', gender: 'm' },
}

describe('hold-vs-press', () => {
  test('⚠️⚠️ a tecla AFUNDA segurada, e cada pista diz quantos passos deu desde o aperto', () => {
    const solta = html(<HoldVsPressStage state={mundo('hold-vs-press')} />)
    expect(solta).toContain('data-tecla="solta"')
    // Antes do primeiro aperto não há fantasma nem contagem.
    expect(solta).not.toContain('data-fantasma')
    expect(solta).not.toContain('passo')
    const segurando = mundo('hold-vs-press', { type: 'hold', on: true }, ...tempo(1))
    const desenho = html(<HoldVsPressStage state={segurando} />)
    expect(desenho).toContain('data-tecla="segurada"')
    expect(contar(desenho, /data-fantasma/g)).toBe(2)
    expect(desenho).toContain('1 passo<')
    expect(desenho).toContain(`${segurando.input.holdSteps} passos<`)
    expect(segurando.input.holdSteps).toBeGreaterThanOrEqual(4)
  })

  test('UMA tecla na bancada, com o estado no rótulo', () => {
    const b = bancada('hold-vs-press', mundo('hold-vs-press'))
    expect(contar(b, /<button/g)).toBe(1)
    expect(b).toContain('A tecla: solta')
    expect(b).toContain('aria-pressed="false"')
  })
})

describe('group-loop', () => {
  test('⚠️⚠️ o número só aparece depois de MEDIR, e a régua vai até AQUELE cacto', () => {
    const inicio = html(<GroupLoopStage state={mundo('group-loop')} />)
    expect(contar(inicio, /data-sem-medida/g)).toBe(3)
    expect(inicio).not.toContain('data-regua')
    const medido = mundo('group-loop', { type: 'look', id: 2 })
    const desenho = html(<GroupLoopStage state={medido} />)
    expect(desenho).toContain('data-regua="2"')
    expect(contar(desenho, /data-regua=/g)).toBe(1)
    expect(contar(desenho, /data-sem-medida/g)).toBe(2)
    expect(desenho).toContain(`>${medido.hunt.distances[1]}</text>`)
  })

  test('o anel diz se a escolha foi às cegas ou depois de medir', () => {
    const cega = html(<GroupLoopStage state={mundo('group-loop', { type: 'choose', id: 1 })} />)
    expect(cega).toContain('data-escolhido="sem-medir"')
    const medida = mundo(
      'group-loop',
      { type: 'look', id: 1 },
      { type: 'look', id: 2 },
      { type: 'look', id: 3 },
      { type: 'choose', id: 1 },
    )
    expect(html(<GroupLoopStage state={medida} />)).toContain('data-escolhido="medido"')
  })

  test('⚠️ os três cactos cabem no quadro em todo o vaivém', () => {
    // O vaivém repete a cada 60 s (períodos de 4, 5 e 3 s): o topo do cacto (60 acima do chão dele)
    // não passa de 0, e o chão não passa de 300.
    const base = mundo('group-loop')
    let medidos = 0
    for (let quadro = 0; quadro <= 600; quadro += 2) {
      const estado = { ...base, hunt: { ...base.hunt, distances: huntDistances(quadro, 10) } }
      const desenho = html(<GroupLoopStage state={estado} />)
      for (const m of desenho.matchAll(
        /data-figure="cacto" transform="translate\(([\d.-]+) ([\d.-]+)\)/g,
      )) {
        const y = Number(m[2])
        expect(y - 60).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(300)
        medidos++
      }
    }
    expect(medidos).toBe(301 * 3)
  })

  test('o laço nasce fechado com o motivo, e abre com o mais perto escolhido', () => {
    const fechado = bancada('group-loop', mundo('group-loop'))
    expect(fechado).toContain('O laço: desligado')
    expect(fechado).toContain('aria-disabled="true"')
    expect(fechado).toContain('Abre depois que você achar o cacto mais perto.')
    expect(fechado).toContain('Medir o 1º')
  })
})

describe('enemy-type', () => {
  test('⚠️⚠️ os cactos ANDAM, com os corações e a velocidade de cada um', () => {
    const tres = mundo(
      'enemy-type',
      { type: 'spawnOne' },
      { type: 'spawnOne' },
      { type: 'spawnOne' },
    )
    const antes = html(<EnemyTypeStage state={tres} />)
    expect(contar(antes, /data-cacto-da-ficha=/g)).toBe(3)
    const depois = mundo('enemy-type', { type: 'spawnOne' }, ...tempo(1))
    expect(depois.blueprint.cacti[0]?.x).toBeLessThan(tres.blueprint.cacti[0]?.x ?? 0)
    // Três corações por cacto (a vida de fábrica), e a etiqueta de cópia só com a cópia ligada.
    expect(contar(antes, /fill-scene-alert/g)).toBe(3 * tres.blueprint.life + tres.blueprint.life)
    expect(antes).not.toContain('cópia<')
    const copia = mundo(
      'enemy-type',
      { type: 'spawnOne' },
      { type: 'connect', port: 'copy', enabled: true },
    )
    expect(html(<EnemyTypeStage state={copia} />)).toContain('cópia<')
  })

  test('a chave da cópia fica à vista FECHADA até a primeira descoberta, e diz o gesto que abre', () => {
    const b = bancada('enemy-type', mundo('enemy-type'))
    expect(b).toContain('Copiar a ficha ao nascer: desligado')
    expect(b).toContain('Abre depois que você mudar a ficha com os cactos andando.')
    const nave = bancada('enemy-type', mundo('enemy-type'), NAVE)
    expect(nave).toContain('velocidade na ficha')
    expect(nave).not.toMatch(/cacto/)
  })
})

describe('camera', () => {
  test('⚠️⚠️ com a câmera seguindo, são os MARCOS que passam pela tela', () => {
    const marcosNaTela = (s: SceneState) => html(<CameraStage state={s} />)
    const parado = mundo('camera', { type: 'connect', port: 'camera', enabled: true })
    const andou = mundo(
      'camera',
      { type: 'connect', port: 'camera', enabled: true },
      { type: 'walk', x: 800 },
    )
    const xs = (desenho: string) =>
      [...desenho.matchAll(/data-marco="[a-z]+" transform="translate\(([\d.-]+)/g)].map((m) =>
        Number(m[1]),
      )
    // Cada marco aparece duas vezes: na tela grande e no mapa (que não anda).
    expect(contar(marcosNaTela(parado), /data-marco=/g)).toBeGreaterThanOrEqual(
      CAMERA_LANDMARKS.length,
    )
    expect(xs(marcosNaTela(andou))).not.toEqual(xs(marcosNaTela(parado)))
    expect(marcosNaTela(andou)).toContain('data-figure="dino"')
  })

  test('sem a câmera, o Dino que saiu vira a seta na borda', () => {
    const fora = mundo('camera', { type: 'walk', x: 700 })
    const desenho = html(<CameraStage state={fora} cast={NAVE} />)
    expect(desenho).toContain('data-seta-da-borda')
    expect(desenho).toContain('a nave foi para lá')
    expect(desenho).not.toContain('data-figure="nave"')
  })

  test('"Andar" nos dois sentidos, e a chave com o estado', () => {
    const b = bancada('camera', mundo('camera'))
    expect(b).toContain('aria-label="Andar com o Dino para a direita"')
    expect(b).toContain('A câmera segue o Dino: desligada')
  })
})

describe('contact', () => {
  test('⚠️⚠️ as DUAS regras ao mesmo tempo, dez corações em cada pista', () => {
    const desenho = html(<ContactStage state={mundo('contact')} />)
    expect(desenho).toContain('data-pista-do-encosto="de-cima"')
    expect(desenho).toContain('data-pista-do-encosto="de-baixo"')
    expect(desenho).toContain('o Dino está encostando no cacto?')
    expect(desenho).toContain('Quando o Dino começar a encostar no cacto')
    expect(contar(desenho, /fill-scene-alert"/g)).toBe(2 * CONTACT_HEARTS)
  })

  test('encostado por 1 s: em cima caem vários corações, embaixo um só', () => {
    const encostado = mundo('contact', { type: 'approach', distance: 0 }, ...tempo(1))
    expect(encostado.hit.top).toBeLessThan(CONTACT_HEARTS - 1)
    expect(encostado.hit.bottom).toBe(CONTACT_HEARTS - 1)
    const desenho = html(<ContactStage state={encostado} />)
    expect(contar(desenho, /data-encosto/g)).toBe(2)
    // ⚠️ O coração VAZIO é o mesmo desenho do jogo em contorno (`CoracaoDoJogo`), no vermelho da
    // vida — era um cinza `stroke-scene-grid` inventado só aqui. O que o teste prova é a CONTA.
    expect(contar(desenho, /fill-none stroke-scene-alert/g)).toBe(
      CONTACT_HEARTS - encostado.hit.top + (CONTACT_HEARTS - encostado.hit.bottom),
    )
  })

  test('a bancada tem a distância e os dois atalhos, e a escolha da pergunta saiu', () => {
    const b = bancada('contact', mundo('contact'), NAVE)
    expect(b).toContain('Encostar o asteroide na nave')
    expect(b).not.toContain('A pergunta que o jogo faz')
  })
})

describe('cooldown', () => {
  test('⚠️⚠️ sem recarga os tiros saem COLADOS; com recarga aparece o vão', () => {
    const colados = mundo('cooldown', { type: 'shoot' }, { type: 'shoot' }, { type: 'shoot' })
    expect(contar(html(<CooldownStage state={colados} />), /data-tiro-voando/g)).toBe(3)
    const [a, b] = [...colados.weapon.bullets].sort((x, y) => x - y)
    expect((b ?? 0) - (a ?? 0)).toBeLessThanOrEqual(20)
    const comVao = mundo(
      'cooldown',
      { type: 'recharge', seconds: 1 },
      { type: 'shoot' },
      ...tempo(1),
      { type: 'shoot' },
    )
    const [c, d] = [...comVao.weapon.bullets].sort((x, y) => x - y)
    expect((d ?? 0) - (c ?? 0)).toBeGreaterThanOrEqual(100)
  })

  test('o aperto recusado pisca "não saiu" e some', () => {
    const recusado = mundo(
      'cooldown',
      { type: 'recharge', seconds: 1 },
      { type: 'shoot' },
      { type: 'shoot' },
    )
    expect(html(<CooldownStage state={recusado} />)).toContain('data-nao-saiu')
    const passou = mundo(
      'cooldown',
      { type: 'recharge', seconds: 1 },
      { type: 'shoot' },
      { type: 'shoot' },
      // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5): o aviso dura 1 s (era meio).
      ...tempo(1.1),
    )
    expect(html(<CooldownStage state={passou} />)).not.toContain('data-nao-saiu')
  })

  test('a recarga em palavras e em quadros, como o bloco do Estúdio', () => {
    const b = bancada('cooldown', mundo('cooldown', { type: 'recharge', seconds: 1 }))
    expect(b).toContain('1 segundo (60 quadros)')
    expect(b).toContain('>Atirar</button>')
  })
})

describe('aim', () => {
  test('⚠️⚠️ o tiro VOA, deixa o caminho, e o alvo se arrasta só na experimentação', () => {
    const voando = mundo(
      'aim',
      { type: 'target', x: 120, y: 220 },
      { type: 'shoot' },
      ...tempo(0.2),
    )
    const desenho = html(<AimStage state={voando} />)
    expect(desenho).toContain('data-tiro-da-mira')
    expect(desenho).toContain('role="img"')
    const errou = mundo('aim', { type: 'target', x: 120, y: 220 }, { type: 'shoot' }, ...tempo(1))
    expect(html(<AimStage state={errou} />)).toContain('data-caminho-do-tiro="errou"')
    const acertou = mundo(
      'aim',
      { type: 'target', x: 120, y: 220 },
      { type: 'connect', port: 'aim', enabled: true },
      { type: 'shoot' },
      ...tempo(1),
    )
    const acerto = html(<AimStage state={acertou} dispatch={nada} />)
    expect(acerto).toContain('data-estouro')
    expect(acerto).toContain('role="group"')
  })

  test('a mira e o "Atirar" na bancada, com o nome do bloco', () => {
    const b = bancada('aim', mundo('aim'))
    expect(b).toContain('A mira: desligada')
    expect(b).toContain('>Atirar</button>')
  })
})

describe('diagonal', () => {
  test('⚠️⚠️ o círculo de 1 segundo, o rastro e o fantasma da andada anterior', () => {
    const inicio = html(<DiagonalStage state={mundo('diagonal')} />)
    expect(inicio).toContain('data-circulo-de-um-segundo')
    expect(inicio).not.toContain('data-rastro')
    const duas = mundo(
      'diagonal',
      { type: 'direction', x: 1, y: 0 },
      { type: 'stride' },
      { type: 'direction', x: 1, y: 1 },
      { type: 'stride' },
    )
    const desenho = html(<DiagonalStage state={duas} />)
    expect(desenho).toContain('data-fantasma-da-andada="reto"')
    expect(contar(desenho, /data-rastro/g)).toBeGreaterThan(0)
    expect(desenho).toContain('diagonal: 85')
  })

  test('as setas dizem o nome e o estado, e a correção fecha com o gesto que abre', () => {
    const b = bancada('diagonal', mundo('diagonal', { type: 'direction', x: 1, y: 0 }))
    expect(b).toContain('aria-label="Seta para a direita" aria-pressed="true"')
    expect(b).toContain('aria-label="Seta para baixo" aria-pressed="false"')
    expect(b).toContain('Andar 1 segundo')
    expect(b).toContain('Abre depois que você andar reto e depois com duas setas juntas.')
  })
})

describe('tilemap', () => {
  test('⚠️⚠️ texto e desenho com as MESMAS colunas, a casa escrita acesa nos dois lados', () => {
    const escrito = mundo('tilemap', { type: 'paint-tile', row: 2, col: 9, tile: '#' })
    const desenho = html(<TilemapStage state={escrito} dispatch={nada} />)
    // A 10ª coluna inteira dentro do quadro de 464.
    expect(desenho).toContain('viewBox="0 0 464 632"')
    expect(contar(desenho, /data-letra=/g)).toBe(60)
    expect(desenho).toContain('data-letra="2-9"')
    expect(contar(desenho, /stroke-scene-a"/g)).toBeGreaterThanOrEqual(2)
    // As letras são botões, com a letra que vai ser escrita no nome.
    expect(contar(desenho, /aria-label="Linha \d, casa \d+: /g)).toBe(60)
    expect(desenho).toContain('Escrever bloco.')
    expect(desenho).toContain('A letra que você escreve')
    expect(desenho).toContain('data-figure="dino"')
  })

  test('na demonstração as letras não são botões e a paleta não aparece', () => {
    const desenho = html(<TilemapStage state={mundo('tilemap')} />)
    expect(desenho).not.toContain('<button')
    expect(desenho).not.toContain('A letra que você escreve')
  })

  test('a tilemap não tem bancada: as letras SÃO os controles', () => {
    expect(bancada('tilemap', mundo('tilemap'))).toBe('')
  })
})
