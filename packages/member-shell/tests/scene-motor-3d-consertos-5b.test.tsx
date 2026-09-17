import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  openScene,
  PICK_BOXES,
  type SceneAction,
  type SceneActivity,
  type SceneCast,
  type SceneId,
  type SceneState,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  AxisZStage,
  CAMERA_DO_EIXO,
  Camera3dStage,
  PickRayStage,
  projecaoDoEixo,
} from '../src/components/scene-3d-stages'
import { SceneReadoutBand } from '../src/components/scene-frame'
import { MotorSceneControls } from '../src/components/scene-motor-controls'
import {
  CircleCollisionStage,
  DeltaTimeStage,
  PoolStage,
} from '../src/components/scene-motor-stages'
import { cssHexValuesForCustomProperty } from './css-custom-properties'

/**
 * Os consertos dos dois reviews da onda B do lote 5 do Raio-X nos palcos e na bancada do motor e do 3D
 * (G6). Relatório: `community-kids/tmp/storyboard/implementacao/consertos-5b-g6.md`. As regras de motor
 * estão no core (`motor-3d-consertos-5b.test.ts`) e o deslizante que só conta ao soltar, no kids
 * (`tests/lesson-scene-motor-3d.test.tsx`).
 */

const mundo = (scene: SceneId, ...acoes: SceneAction[]): SceneState =>
  acoes.reduce((s, a) => stepScene({ scene }, s, a), openScene({ scene }))
const tempo = (segundos: number): SceneAction[] =>
  Array.from({ length: Math.round(segundos / 0.05) }, () => ({ type: 'advance', seconds: 0.05 }))
const html = (node: React.ReactElement) => renderToStaticMarkup(node)
const nada = () => {}
const NAVE: SceneCast = {
  hero: { name: 'nave', gender: 'f' },
  obstacle: { name: 'asteroide', gender: 'm' },
}
const pontos = (d: string) =>
  [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))

describe('pick-ray: a vista de lado nunca desenha a reta atravessando uma caixa (ALTO)', () => {
  const vistaDeLado = (x: number, y: number) => {
    const d = html(<PickRayStage state={mundo('pick-ray', { type: 'point', x, y })} />)
    // ⚠️ A vista de lado é a SEGUNDA da comparação: vai do marcador dela até o fim.
    const lado = d.slice(d.indexOf('data-vista-de-lado'))
    const caixas = [
      ...lado.matchAll(
        /data-caixa-de-lado="([A-C])"[^>]*><rect class="[^"]*" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g,
      ),
    ].map((m) => ({
      letra: m[1] ?? '',
      x: Number(m[2]),
      y: Number(m[3]),
      w: Number(m[4]),
      h: Number(m[5]),
    }))
    const reta = lado.match(/data-reta="true" class="[^"]*" d="M42 ([\d.]+)H([\d.]+)"/)
    return { d, lado, caixas, fim: Number(reta?.[2]) }
  }

  test('⚠️⚠️ mirando na caixa sozinha, só a C aparece de lado, e a reta para nela', () => {
    const { caixas, fim } = vistaDeLado(100, 125)
    expect(caixas.map((c) => c.letra)).toEqual(['C'])
    expect(fim).toBe(caixas[0]?.x ?? Number.NaN)
  })

  test('⚠️⚠️ em TODA a tela, nenhuma caixa desenhada de lado tem a reta passando por dentro dela', () => {
    let conferidas = 0
    for (let x = 0; x <= 480; x += 20)
      for (let y = 0; y <= 270; y += 10) {
        const { caixas, fim } = vistaDeLado(x, y)
        // ⚠️ Anti-vácuo (full review de 16/09/2026): a regex do `d=` falhando dava `NaN`, e `NaN > x` é
        // falso, então "a reta não entra na caixa" passava sem ter lido reta nenhuma.
        expect(Number.isFinite(fim), `reta lida em ${x}, ${y}`).toBe(true)
        for (const c of caixas) {
          const naAlturaDaReta = y > c.y && y < c.y + c.h
          if (naAlturaDaReta) {
            conferidas++
            // A reta termina ANTES (ou na borda) de qualquer caixa que ela cruzaria.
            expect({ x, y, caixa: c.letra, dentro: fim > c.x }).toEqual({
              x,
              y,
              caixa: c.letra,
              dentro: false,
            })
          }
        }
      }
    // Anti-vácuo: a varredura passou por caixas na altura da reta.
    expect(conferidas).toBeGreaterThan(100)
  })

  test('⚠️ com duas no caminho, as duas aparecem, e nada da reta segue depois da primeira', () => {
    const { caixas, lado, fim } = vistaDeLado(330, 155)
    expect(caixas.map((c) => c.letra).sort()).toEqual(['A', 'B'])
    expect(fim).toBe(caixas.find((c) => c.letra === PICK_BOXES.frente.letra)?.x ?? Number.NaN)
    // O tracejado depois da parada desenhava a reta seguindo em frente.
    expect(lado).not.toContain('stroke-scene-rule')
  })

  test('⚠️ as duas vistas vêm EMPILHADAS, e o título diz que é a linha da mira', () => {
    const { d } = vistaDeLado(100, 125)
    expect(d).toContain('data-empilhada="true"')
    expect(d).not.toContain('sm:grid-cols-2')
    expect(d).toContain('A linha da mira, de lado')
  })
})

describe('camera-3d: o cubo lê como objeto (MÉDIO) e a câmera tem nome (BAIXO)', () => {
  test('⚠️⚠️ de canto, a aresta mais perto é mais ALTA que as de trás (perspectiva leve)', () => {
    const inicio = openScene({ scene: 'camera-3d' })
    const d = html(
      <Camera3dStage state={{ ...inicio, orbit: { ...inicio.orbit, yaw: 1, pitch: 1 } }} />,
    )
    const frente = d.match(
      /<g data-cubo="[^"]*" data-lados="[^"]*"><path class="fill-scene-a" d="([^"]+)"/,
    )
    const cantos = pontos(frente?.[1] ?? '')
    expect(cantos).toHaveLength(4)
    const altura = (x: number) => {
      const naColuna = cantos.filter((p) => Math.abs(p.x - x) < 1)
      return Math.max(...naColuna.map((p) => p.y)) - Math.min(...naColuna.map((p) => p.y))
    }
    const xs = [...new Set(cantos.map((p) => Math.round(p.x)))]
    expect(xs).toHaveLength(2)
    // O meio do palco (210) é o canto mais perto do olho.
    const perto = xs.reduce((a, b) => (Math.abs(a - 210) < Math.abs(b - 210) ? a : b))
    const longe = xs.find((x) => x !== perto) as number
    expect(altura(perto)).toBeGreaterThan(altura(longe) * 1.1)
  })

  test('a sombra achatada embaixo do cubo, menos olhando por baixo', () => {
    const inicio = openScene({ scene: 'camera-3d' })
    const com = (pitch: number) =>
      html(<Camera3dStage state={{ ...inicio, orbit: { ...inicio.orbit, pitch } }} />)
    expect(com(1)).toContain('data-sombra-do-cubo')
    expect(com(2)).toContain('data-sombra-do-cubo')
    expect(com(0)).not.toContain('data-sombra-do-cubo')
  })

  test('o mapa nomeia a câmera, e o atalho diz para onde ela volta', () => {
    const d = html(<Camera3dStage state={openScene({ scene: 'camera-3d' })} />)
    expect(d).toContain('data-legenda-da-camera')
    expect(d).toContain('>câmera</text>')
    const bancada = html(
      <MotorSceneControls
        scene="camera-3d"
        state={openScene({ scene: 'camera-3d' })}
        dispatch={nada}
      />,
    )
    expect(bancada).toContain('Voltar para onde a câmera começou')
    expect(bancada).not.toContain('vista de sempre')
  })
})

describe('axis-z: o chão, o cubo e as cores (MÉDIOS)', () => {
  test('⚠️⚠️ o chão passa do alcance dos deslizantes: no canto, o cubo pousa DENTRO dele', () => {
    const noCanto = mundo('axis-z', { type: 'place3d', x: -120, y: 0, z: -120 })
    const d = html(<AxisZStage state={noCanto} />)
    const projetar = projecaoDoEixo(CAMERA_DO_EIXO)
    const canto = projetar({ x: -160, y: 0, z: -160 })
    expect(d).toContain(`M${canto.px.toFixed(1)} ${canto.py.toFixed(1)}L`)
  })

  test('⚠️ o cubo tem cor de papelão, e não o azul do eixo z', () => {
    const d = html(<AxisZStage state={mundo('axis-z')} />)
    // Com o z em 0 o cubo é desenhado DEPOIS dos eixos: vai do marcador dele até o fim.
    const cubo = d.slice(d.indexOf('data-cubo='))
    expect(cubo).toContain('fill-scene-stone')
    expect(cubo).not.toContain('fill-scene-a ')
  })

  test('⚠️ o verde do eixo y (`leaf`), que entrou no cromo, passa de AA no cartão dos DOIS apps', () => {
    const css = readFileSync(join(import.meta.dir, '../src/styles/scene.css'), 'utf8')
    const folha = css.match(/--color-scene-leaf:\s*(#[0-9a-f]{6})\s*;/i)?.[1] ?? ''
    expect(folha).toMatch(/^#[0-9a-f]{6}$/i)
    const cartoes = [
      '../../community-kids/src/app/globals.css',
      '../../community/src/app/globals.css',
    ].flatMap((c) => cssHexValuesForCustomProperty(join(import.meta.dir, c), '--pen-cartao'))
    expect(cartoes.length).toBeGreaterThanOrEqual(2)
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5]
        .map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [
        number,
        number,
        number,
      ]
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    for (const cartao of cartoes) {
      const [claro, escuro] = [lum(cartao), lum(folha)].sort((a, b) => b - a) as [number, number]
      expect((claro + 0.05) / (escuro + 0.05)).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('⚠️ a faixa e a bancada pintam cada número com a cor do SEU eixo', () => {
    const activity: SceneActivity = { type: 'experimentation', scene: 'axis-z' }
    const faixa = html(<SceneReadoutBand activity={activity} state={mundo('axis-z')} />)
    const tons = [...faixa.matchAll(/<dd class="[^"]*?(text-scene-[a-z-]+)[^"]*"/g)].map(
      (m) => m[1],
    )
    expect(tons).toEqual(['text-scene-alert', 'text-scene-leaf', 'text-scene-a'])
    const bancada = html(
      <MotorSceneControls scene="axis-z" state={mundo('axis-z')} dispatch={nada} />,
    )
    const saidas = [...bancada.matchAll(/<output\b[^>]*class="[^"]*?(text-scene-[a-z-]+)"/g)].map(
      (m) => m[1],
    )
    expect(saidas).toEqual(['text-scene-alert', 'text-scene-leaf', 'text-scene-a'])
  })
})

describe('circle-collision: o "bateu" junto da batida e o passo do raio (BAIXOS)', () => {
  test('"bateu" mora na linha da distância, logo acima do contato, e não no canto', () => {
    const encostados = mundo('circle-collision', ...tempo(6))
    const d = html(<CircleCollisionStage state={encostados} />)
    expect(d).toMatch(/>distância 60<tspan data-bateu="true"[^>]*> · bateu<\/tspan><\/text>/)
    expect(d).not.toMatch(/x="536"[^>]*>bateu/)
    expect(
      html(<CircleCollisionStage state={openScene({ scene: 'circle-collision' })} />),
    ).not.toContain('data-bateu')
  })

  test('os botões dos raios andam de 10 em 10', () => {
    const bancada = html(
      <MotorSceneControls
        scene="circle-collision"
        state={openScene({ scene: 'circle-collision' })}
        dispatch={nada}
      />,
    )
    expect(bancada).toContain('Diminuir raio do azul em 10')
    expect(bancada).toContain('Aumentar raio do laranja em 10')
  })
})

describe('pool: a reciclagem espera o palpite ser testado (MÉDIO) e a entrada à vista (BAIXO)', () => {
  const chave = (s: SceneState, cast?: SceneCast) =>
    html(<MotorSceneControls scene="pool" state={s} dispatch={nada} cast={cast} />)

  test('⚠️⚠️ a chave fica FECHADA, com o motivo, até 3 cactos passarem', () => {
    const abertura = chave(openScene({ scene: 'pool' }))
    expect(abertura).toContain('aria-disabled="true"')
    expect(abertura).toContain('Abre depois que 3 cactos passarem.')
    // Com o elenco, o motivo fala do asteroide.
    expect(chave(openScene({ scene: 'pool' }), NAVE)).toContain('3 asteroides')
    const tres = mundo('pool', ...tempo(3.15))
    expect(tres.evidence.discoveries).toContain('grows')
    expect(chave(tres)).not.toContain('aria-disabled')
  })

  test('⚠️ nunca fechada LIGADA: um caso que abre reciclando deixa desligar', () => {
    const caso = openScene({
      scene: 'pool',
      setup: { actions: [{ type: 'connect', port: 'recycle', enabled: true }] },
    } as never)
    expect(caso.nursery.recycling).toBe(true)
    expect(chave(caso)).not.toContain('aria-disabled')
  })

  test('⚠️ "entrada" fica ACIMA do arco da volta, e os números da pilha em 13', () => {
    const s = mundo('pool', ...tempo(3.05))
    const voltando: SceneState = {
      ...s,
      nursery: { ...s.nursery, recycling: true, last: 'voltou', progress: 1 },
    }
    const d = html(<PoolStage state={voltando} />)
    const arco = d.match(
      /data-volta="true"[^>]*d="M([\d.]+) ([\d.]+)C([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/,
    )
    expect(arco).not.toBeNull()
    const [x0, y0, x1, y1, x2, y2, x3, y3] = (arco ?? []).slice(1).map(Number) as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ]
    // ⚠️ O tamanho passa pela letra do palco e sai DEPOIS dos outros atributos (conserto "letra no
    // celular"): na coluna do computador o 12 vira 12,9, o mínimo que dá 12px na tela.
    const rotulo = d.match(
      /x="([\d.]+)" y="([\d.]+)" text-anchor="end" font-size="[\d.]+">entrada</,
    )
    const fimDoRotulo = Number(rotulo?.[1])
    const base = Number(rotulo?.[2])
    // O rótulo tem ~48 unidades de largura, terminando em `x`: o arco não pode passar por cima dele.
    let menorY = Number.POSITIVE_INFINITY
    for (let t = 0; t <= 1; t += 0.01) {
      const u = 1 - t
      const bx = u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3
      const by = u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3
      if (bx >= fimDoRotulo - 48 && bx <= fimDoRotulo) menorY = Math.min(menorY, by)
    }
    expect(base + 3).toBeLessThan(menorY)
    expect(d).toMatch(/text-anchor="middle" font-weight="700" font-size="13">1</)
  })
})

describe('delta-time: a nave deitada e as marcas (BAIXO)', () => {
  test('com o elenco de nave, a figura vai deitada com o bico para a chegada', () => {
    const d = html(<DeltaTimeStage state={mundo('delta-time', ...tempo(1))} cast={NAVE} />)
    expect(d).toMatch(/transform="rotate\(90 [\d.]+ [\d.]+\)"><g data-figure="nave"/)
    // ⚠️ `data-pegadas` é contrato dos testes e ninguém lê; o texto é que não pode dizer "pegada".
    expect(d.replaceAll('data-pegadas', '')).not.toMatch(/pegada/)
    expect(d).toContain('marcas')
    // O Dino segue de pé.
    expect(html(<DeltaTimeStage state={mundo('delta-time', ...tempo(1))} />)).not.toContain(
      'rotate(90',
    )
  })
})
