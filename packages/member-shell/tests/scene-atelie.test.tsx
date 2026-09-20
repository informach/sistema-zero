import { describe, expect, test } from 'bun:test'
import {
  initialScene,
  SCENE_MODELS,
  type SceneAction,
  type SceneId,
  type SceneState,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  FillStrokeStage,
  FramesStage,
  OnionSkinStage,
  PixelVectorStage,
  rasterizarPedra,
  ShadingStage,
  SheetStage,
  SymmetryStage,
} from '../src/components/scene-atelie-stages'
import { tempoDeLeitura } from '../src/components/use-scene-clock'

/**
 * O palco do ATELIÊ de O Jogo do Meu Jeito, redesenhado no lote 5 do Raio-X (16/09/2026, G4).
 *
 * Cada teste trava uma das mentiras que o relatório g4 achou no desenho antigo: o Dino que andava
 * entre os quadros, a régua do fantasma sem o fantasma, as duas pedras de silhuetas diferentes, a
 * folha de quatro Dinos, a sombra verde-oliva. O comportamento da bancada é conferido no kids
 * (`lesson-scene-design.test.tsx`, "as cinco cenas de desenho e a das vidas").
 */

const estado = (scene: SceneId, acoes: SceneAction[] = []): SceneState =>
  acoes.reduce((s, a) => stepScene({ scene }, s, a), initialScene({ scene }))
const atributos = (html: string, nome: string) =>
  [...html.matchAll(new RegExp(`${nome}="([^"]*)"`, 'g'))].map((m) => m[1])

describe('frames e onion-skin: o corpo fica, e só o fogo muda', () => {
  test('com o quadro 2 copiado do 1, miniaturas e prévia mostram o fogo pequeno', () => {
    const html = renderToStaticMarkup(
      <FramesStage
        state={estado('frames', [
          { type: 'same-frames', on: true },
          { type: 'frame', index: 2 },
        ])}
      />,
    )
    expect(atributos(html, 'data-fogo')).toEqual(['5', '5', '5'])
    expect(html).toContain('Os dois quadros são iguais')
  })

  test('⚠️⚠️ o corpo da nave é IDÊNTICO nos dois quadros; o que muda é o tamanho do fogo', () => {
    const um = renderToStaticMarkup(<FramesStage state={estado('frames')} />)
    const dois = renderToStaticMarkup(
      <FramesStage state={estado('frames', [{ type: 'frame', index: 2 }])} />,
    )
    const corpo = (html: string) =>
      html
        .slice(html.indexOf('data-previa'), html.length)
        .match(/data-corpo-da-nave[\s\S]*?<\/g>/)?.[0]
    expect(corpo(um)).toBeTruthy()
    expect(corpo(um)).toBe(corpo(dois))
    // As miniaturas da faixa: o quadro 1 com o fogo pequeno e o 2 com o grande, sempre à vista.
    expect(atributos(um, 'data-miniatura')).toEqual(['1', '2'])
    expect(atributos(um, 'data-fogo').slice(0, 2)).toEqual(['5', '9'])
    // E a prévia mostra o fogo do quadro que está na tela, sem sair do lugar.
    expect(atributos(um, 'data-fogo').at(-1)).toBe('5')
    expect(atributos(dois, 'data-fogo').at(-1)).toBe('9')
  })

  test('⚠️⚠️ sem o fantasma, nem régua nem ponta do fogo 1; com ele, as duas pontas marcadas', () => {
    const cego = renderToStaticMarkup(
      <OnionSkinStage state={estado('onion-skin', [{ type: 'frame', index: 2 }])} />,
    )
    expect(cego).not.toContain('data-pontas')
    expect(cego).not.toContain('data-fantasma')
    // O fogo de fábrica passa da borda do quadro, e o desenho mostra o corte.
    expect(cego).toContain('data-cortado')
    const comparado = renderToStaticMarkup(
      <OnionSkinStage
        state={estado('onion-skin', [
          { type: 'frame', index: 2 },
          { type: 'onion', on: true },
          { type: 'shift', offset: 20 },
        ])}
      />,
    )
    expect(comparado).toContain('data-pontas')
    expect(comparado).toContain('data-fantasma')
    expect(comparado).not.toContain('data-cortado')
    // No quadro 1 não há fantasma nenhum, mesmo ligado.
    const noUm = renderToStaticMarkup(
      <OnionSkinStage state={estado('onion-skin', [{ type: 'onion', on: true }])} />,
    )
    expect(noUm).not.toContain('data-fantasma')
  })
})

describe('pixel-vector: a MESMA silhueta nas duas pedras', () => {
  test('⚠️⚠️ a pedra de pixel é a curva da de vetor rasterizada, com a mesma caixa e a mesma área', () => {
    const celulas = rasterizarPedra()
    const xs = celulas.map(([x]) => x)
    const ys = celulas.map(([, y]) => y)
    // Os quadradinhos ocupam a mesma caixa da curva (de 2 a 13 nos dois eixos, pelos centros).
    expect([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]).toEqual([
      2, 13, 2, 13,
    ])
    // E a mesma área: a de pixel era um oval achatado de 13 × 7, bem menor que a de vetor.
    expect(celulas.length).toBeGreaterThan(110)
    expect(celulas.length).toBeLessThan(140)
  })

  test('as duas pedras na mesma lupa; a grade de pixel a partir de 3, os pontos da Caneta a partir de 6', () => {
    const tres = renderToStaticMarkup(
      <PixelVectorStage
        state={estado('pixel-vector', [{ type: 'inspect', kind: 'pixel', zoom: 3 }])}
      />,
    )
    expect(atributos(tres, 'data-lupa')).toEqual(['3', '3'])
    expect(tres).not.toContain('data-ponto')
    const seis = renderToStaticMarkup(
      <PixelVectorStage
        state={estado('pixel-vector', [{ type: 'inspect', kind: 'pixel', zoom: 6 }])}
      />,
    )
    expect(atributos(seis, 'data-ponto')).toHaveLength(4)
  })
})

describe('sheet-vs-sprite: o jogo mostra o RECORTE esticado, e a folha não muda', () => {
  test('⚠️⚠️ 64 mostra a folha inteira, 16 meia nave, 32 o quadro escolhido', () => {
    const recorte = (acoes: SceneAction[]) => {
      const html = renderToStaticMarkup(<SheetStage state={estado('sheet-vs-sprite', acoes)} />)
      return {
        viewBox: html.match(/data-sprite-no-jogo="\d+"[^>]*viewBox="([^"]+)"/)?.[1],
        folha: html.includes('folha 64 por 32'),
      }
    }
    // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5, A4): o jogo ABRE vazio, e é o
    // recorte de 64 que mostra a folha inteira.
    expect(recorte([])).toEqual({ viewBox: undefined, folha: true })
    expect(recorte([{ type: 'crop', width: 64 }])).toEqual({ viewBox: '0 0 64 32', folha: true })
    expect(recorte([{ type: 'crop', width: 16 }])).toEqual({ viewBox: '0 0 16 32', folha: true })
    expect(
      recorte([
        { type: 'crop', width: 32 },
        { type: 'cut', cell: 2 },
        { type: 'sprite', size: 80 },
      ]),
    ).toEqual({ viewBox: '32 0 32 32', folha: true })
  })
})

describe('symmetry, fill-stroke e shading', () => {
  test('o Balde enche só a asa esquerda, mesmo com o Espelho lado a lado ligado', () => {
    const state = estado('symmetry', [
      { type: 'mirror-mode', mode: 'x' },
      { type: 'trace', piece: 'asa' },
      { type: 'fill' },
    ])
    const html = renderToStaticMarkup(<SymmetryStage state={state} />)
    expect(atributos(html, 'data-meio')).toEqual(['x'])
    expect(atributos(html, 'data-balde')).toEqual(['asa-esquerda'])
    expect(html).toContain('O Balde encheu só a asa esquerda.')
    expect(atributos(html, 'data-copia')).toContain('true')
  })

  test('o espelho no MEIO: a cópia na coluna espelhada, com a linha do meio só com o espelho ligado', () => {
    const solto = renderToStaticMarkup(
      <SymmetryStage state={estado('symmetry', [{ type: 'trace', piece: 'asa' }])} />,
    )
    expect(solto).not.toContain('data-meio')
    const lado = renderToStaticMarkup(
      <SymmetryStage
        state={estado('symmetry', [
          { type: 'mirror-mode', mode: 'x' },
          { type: 'trace', piece: 'cabine' },
        ])}
      />,
    )
    expect(atributos(lado, 'data-meio')).toEqual(['x'])
    expect(atributos(lado, 'data-casa').sort()).toEqual(['7,5', '7,6', '7,7', '8,5', '8,6', '8,7'])
    // Sem `dispatch` (a demonstração) a grade não recebe toque.
    expect(lado).not.toContain('data-toque-na-grade')
  })

  test('⚠️⚠️ "Sem cor" é o xadrez, não o branco; e a sombra fica do lado CONTRÁRIO ao do sol', () => {
    const semPreenchimento = renderToStaticMarkup(
      <FillStrokeStage state={estado('fill-stroke', [{ type: 'ink', part: 'fill', on: false }])} />,
    )
    expect(semPreenchimento).toContain('data-preenchimento="sem-cor"')
    expect(semPreenchimento).toContain('data-xadrez')
    const mediaX = (html: string, tom: string) => {
      const xs = [...html.matchAll(new RegExp(`data-tom="${tom}" x="(\\d+)"`, 'g'))].map((m) =>
        Number(m[1]),
      )
      return xs.reduce((a, b) => a + b, 0) / xs.length
    }
    const solEsquerda = renderToStaticMarkup(
      <ShadingStage state={estado('shading', [{ type: 'shade', on: true }])} />,
    )
    expect(mediaX(solEsquerda, 'sombra')).toBeGreaterThan(mediaX(solEsquerda, 'luz'))
    const solDireita = renderToStaticMarkup(
      <ShadingStage
        state={estado('shading', [
          { type: 'light', side: 'right' },
          { type: 'shade', on: true },
        ])}
      />,
    )
    expect(mediaX(solDireita, 'sombra')).toBeLessThan(mediaX(solDireita, 'luz'))
    // ⚠️ Os três tons são da FAMÍLIA do azul (`scene-a`), e nunca a tinta verde-oliva de antes.
    const bola = solEsquerda.slice(
      solEsquerda.indexOf('data-bola'),
      solEsquerda.indexOf('data-sol'),
    )
    expect(bola).not.toContain('scene-ink')
    expect(bola).toContain('var(--color-scene-a)')
  })

  test('⚠️⚠️ a demonstração inline segura cada legenda do ateliê por 2,5 s ou mais', () => {
    // A `fill-stroke` passava inteira em ~1,4 s e a `shading` em ~1,8 s: a legenda trocava antes de
    // uma criança que lê devagar terminar a primeira frase (relatório g4, padrão 6).
    for (const scene of ['fill-stroke', 'shading'] as const)
      for (const parte of SCENE_MODELS[scene].script) {
        expect(tempoDeLeitura(parte.caption), parte.caption).toBeGreaterThanOrEqual(2.5)
        expect(tempoDeLeitura(parte.caption), parte.caption).toBeLessThanOrEqual(5)
      }
  })
})

describe('⚠️⚠️ consertos do review da onda B do lote 5 (G4): o desenho', () => {
  /** Os números de um atributo `d` ou `transform`. */
  const numeros = (texto: string) =>
    [...texto.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]))

  test('onion-skin (A2): o fantasma é SÓ o contorno tracejado, sem o claro que cobria o começo do fogo 2', () => {
    const html = renderToStaticMarkup(
      <OnionSkinStage
        state={estado('onion-skin', [
          { type: 'frame', index: 2 },
          { type: 'onion', on: true },
          { type: 'shift', offset: 20 },
        ])}
      />,
    )
    const fantasma = html.match(/<g data-fogo="5" data-fantasma[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? ''
    expect(fantasma).toContain('stroke-dasharray')
    expect(fantasma).not.toContain('fill-scene-card')
    expect(fantasma).not.toContain('opacity')
    // E o fogo 2 continua inteiro, com o miolo amarelo desde a saída do corpo.
    expect(html).toContain('fill-scene-flame-core')
  })

  test('onion-skin (B2): com o fogo cortado, a marca do fogo 2 fica fora do quadro, longe do risco do corte', () => {
    const html = renderToStaticMarkup(
      <OnionSkinStage
        state={estado('onion-skin', [
          { type: 'frame', index: 2 },
          { type: 'onion', on: true },
          { type: 'shift', offset: 48 },
        ])}
      />,
    )
    expect(html).toContain('data-cortado')
    const pontas = html.slice(html.indexOf('data-pontas'))
    const marcaDoFogo2 = pontas.match(/class="stroke-scene-b" d="([^"]+)"/)?.[1] ?? ''
    const [x, y] = numeros(marcaDoFogo2)
    const risco = html.match(/class="stroke-scene-alert" d="([^"]+)"/)?.[1] ?? ''
    const [, yDoRisco, larguraDoRisco = 0] = numeros(risco)
    const [xDoRisco = 0] = numeros(risco)
    // A marca começa DEPOIS do fim do risco vermelho, e acima dele.
    expect(x).toBeGreaterThan(xDoRisco + larguraDoRisco)
    expect(y).toBeLessThan(yDoRisco ?? 0)
  })

  test('symmetry (decisão 3): com os dois espelhos, as DUAS linhas do meio aparecem', () => {
    const html = renderToStaticMarkup(
      <SymmetryStage
        state={estado('symmetry', [
          { type: 'mirror-mode', mode: 'xy' },
          { type: 'trace', piece: 'asa' },
        ])}
      />,
    )
    expect(atributos(html, 'data-meio')).toEqual(['xy'])
    expect(html.match(/>meio</g)).toHaveLength(2)
    expect(html).toContain('Os dois espelhos ligados')
    // A asa e as três cópias: 40 quadradinhos, 30 deles do espelho e todos da cópia NOVA.
    expect(atributos(html, 'data-casa')).toHaveLength(40)
    expect(html.match(/data-copia-nova/g)).toHaveLength(30)
  })

  test('pixel-vector (M5): sem fresta clara entre os quadradinhos, e a grade fina só a partir de 5', () => {
    const lupa = (zoom: number) =>
      renderToStaticMarkup(
        <PixelVectorStage
          state={estado('pixel-vector', [{ type: 'inspect', kind: 'pixel', zoom }])}
        />,
      )
    const quatro = lupa(4)
    expect(quatro).not.toContain('class="fill-scene-a stroke-scene-card"')
    expect(quatro).not.toContain('data-grade-da-pedra')
    expect(lupa(5)).toContain('data-grade-da-pedra')
  })

  test('pixel-vector (B6): na lupa 8, as alças da Caneta ficam DENTRO do painel', () => {
    const html = renderToStaticMarkup(
      <PixelVectorStage
        state={estado('pixel-vector', [{ type: 'inspect', kind: 'pixel', zoom: 8 }])}
      />,
    )
    const vetor = html.slice(html.indexOf('data-pedra="vector"'))
    const [px = 0, py = 0, pw = 0, ph = 0] = numeros(
      vetor.match(/<rect class="fill-scene-card stroke-scene-card-line" ([^>]+)>/)?.[1] ?? '',
    )
    const [cx = 0, cy = 0, escala = 1, mx = 0, my = 0] = numeros(
      vetor.match(/transform="(translate[^"]+)"/)?.[1] ?? '',
    )
    const alcas = [
      ...vetor.matchAll(
        /<rect class="fill-scene-card stroke-scene-ink-soft" x="([^"]+)" y="([^"]+)"/g,
      ),
    ]
    expect(alcas).toHaveLength(4)
    for (const [, x, y] of alcas) {
      const tx = cx + (Number(x) + mx) * escala
      const ty = cy + (Number(y) + my) * escala
      expect(tx).toBeGreaterThanOrEqual(px)
      expect(tx + 6).toBeLessThanOrEqual(px + pw)
      expect(ty).toBeGreaterThanOrEqual(py)
      expect(ty + 6).toBeLessThanOrEqual(py + ph)
    }
  })

  test('sheet-vs-sprite (A4): o jogo abre VAZIO, sem janela de recorte e com o "?"', () => {
    const vazio = renderToStaticMarkup(<SheetStage state={estado('sheet-vs-sprite')} />)
    expect(vazio).not.toContain('data-sprite-no-jogo')
    expect(vazio).not.toContain('data-recorte')
    expect(vazio).toContain('data-jogo-vazio')
    expect(vazio).toContain('sem recorte')
    expect(vazio).not.toMatch(/esprem/)
  })

  test('shading (M7): a luz é um brilho REDONDO, e não uma listra de borda a borda', () => {
    for (const lado of ['left', 'right'] as const) {
      const html = renderToStaticMarkup(
        <ShadingStage
          state={estado('shading', [
            { type: 'light', side: lado },
            { type: 'shade', on: true },
          ])}
        />,
      )
      const casas = (tom: string) =>
        [...html.matchAll(new RegExp(`data-tom="${tom}" x="(\\d+)" y="(\\d+)"`, 'g'))].map((m) => [
          Number(m[1]),
          Number(m[2]),
        ])
      const luz = casas('luz')
      expect(luz.length).toBeGreaterThan(4)
      const meio = luz.reduce(
        ([a = 0, b = 0], [x = 0, y = 0]) => [a + x / luz.length, b + y / luz.length],
        [0, 0],
      )
      // Uma listra atravessava a bola: longe do meio dela havia luz. O brilho cabe num círculo pequeno.
      const casa = 17
      for (const [x = 0, y = 0] of luz)
        expect(Math.hypot(x - (meio[0] ?? 0), y - (meio[1] ?? 0)) / casa).toBeLessThan(3)
      expect(casas('sombra').length).toBeGreaterThan(4)
    }
  })

  test('fill-stroke (B12): a pedra tem mais pontos que o ovo de quatro curvas', () => {
    const html = renderToStaticMarkup(<FillStrokeStage state={estado('fill-stroke')} />)
    const d = html.match(/data-pedra-do-asteroide[^>]* d="([^"]+)"/)?.[1] ?? ''
    expect((d.match(/Q/g) ?? []).length).toBeGreaterThanOrEqual(6)
  })
})
