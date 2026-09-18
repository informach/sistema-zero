import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  cenarioEscuro,
  fundoDoCenario,
  SCENE_CENARIO_IDS,
  type SceneCenarioId,
} from '@sistemazero/core/learning/scene'
import { DEFAULT_PALETTE, PALETTE_LABELS, PALETTES } from '@sistemazero/core/palette'
import { FUNDOS } from '@sistemazero/studio/arte'
import { derive } from '@sistemazero/ui/tokens'
import { cssHexValuesForCustomProperty } from './css-custom-properties'

/**
 * O contraste da cena, medido — não estimado.
 *
 * ⚠️⚠️ Este teste nasceu de um defeito que eu mesmo introduzi e só apareceu no full review: ao
 * fazer o papel da cena SEGUIR O TEMA (14/09/2026), a primeira versão misturou 6/10/14% do
 * `--primary` sobre as bases originais e derrubou o contraste em silêncio. Sobre o céu o âmbar
 * caiu de 4,91 para 4,42 e sobre a grama de 4,64 para 4,03 — os dois abaixo dos 4,5 que texto
 * pequeno exige. Nada quebrou, nada ficou vermelho: só ficou mais difícil de ler, que é o tipo
 * de estrago que passa por revisão de olho.
 *
 * A conta refaz o `color-mix(in oklab, …)` do CSS e vale para os temas de perfil que leem esta
 * folha. Mexeu na paleta? Este teste diz se ainda dá para ler.
 */

/**
 * A cor de ação de CADA paleta de perfil, que é o que entra na mistura como `--primary`.
 *
 * ⚠️ A lista não pode ter hexadecimal manual: o mesmo vocabulário chega ao banco, ao cookie, ao
 * seletor e ao CSS gerado. Acrescentar uma cor em `PALETTES` a põe automaticamente nesta conta.
 * `reserva` é o ÚNICO literal deliberado, o fallback de `var(--primary, …)` para quem renderiza
 * a cena fora de um host que já tenha emitido `data-sz-palette`.
 */
const TEMAS_DO_PERFIL = Object.fromEntries(
  PALETTES.map((palette) => [PALETTE_LABELS[palette], derive(palette).action]),
) as Record<string, string>
const TEMAS = {
  ...TEMAS_DO_PERFIL,
  /** O fallback do `var(--primary, …)`: qualquer superfície sem tema. */
  reserva: '#315f92',
}

/** O que se escreve por cima do papel da cena. */
const TINTAS = {
  ink: '#42503a',
  'ink-soft': '#5b6b54',
  'a (azul)': '#315f92',
  'b-ink (âmbar)': '#85601f',
  alert: '#ae3e2c',
} as const

/** Texto pequeno em AA. A linha do chão e os pontinhos são traço, e não entram nesta conta. */
const AA = 4.5

const hex = (h: string) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255)
const paraLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const paraSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

function paraOklab([r0, g0, b0]: number[]): number[] {
  const [r, g, b] = [r0 ?? 0, g0 ?? 0, b0 ?? 0].map(paraLinear) as [number, number, number]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}
function deOklab([L0, a0, b0]: number[]): number[] {
  const [L, a, bb] = [L0 ?? 0, a0 ?? 0, b0 ?? 0]
  const l = (L + 0.3963377774 * a + 0.2158037573 * bb) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * bb) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * bb) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.min(1, Math.max(0, paraSrgb(c))))
}
/** O mesmo que o `color-mix(in oklab, a pct%, b)` do navegador faz. */
function misturar(a: string, b: string, pct: number): number[] {
  const A = paraOklab(hex(a))
  const B = paraOklab(hex(b))
  return deOklab(A.map((v, i) => v * pct + (B[i] ?? 0) * (1 - pct)))
}
const luminancia = (rgb: number[]) => {
  const [r, g, b] = rgb.map(paraLinear) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contraste = (x: number[], y: number[]) => {
  const a = luminancia(x) + 0.05
  const b = luminancia(y) + 0.05
  return Math.max(a, b) / Math.min(a, b)
}

/**
 * ⚠️ As receitas saem do CSS de VERDADE, lidas por regex. Copiá-las para cá faria o teste
 * medir a intenção de quem o escreveu, e não a folha que o navegador carrega — exatamente o
 * jeito de o teste continuar verde depois que alguém mudar a paleta.
 */
function receitasDoCss(): { nome: string; pct: number; base: string }[] {
  const css = readFileSync(join(import.meta.dir, '../src/styles/scene.css'), 'utf8')
  const alvos = ['ground', 'sky', 'grass']
  return alvos.map((nome) => {
    const re = new RegExp(
      `--color-scene-${nome}:\\s*color-mix\\(in oklab,\\s*var\\(--primary[^)]*\\)\\s*(\\d+)%,\\s*(#[0-9a-f]{6})\\s*\\)`,
      'i',
    )
    const achado = css.match(re)
    if (!achado?.[1] || !achado[2])
      throw new Error(`Receita de --color-scene-${nome} não encontrada em scene.css`)
    return { nome, pct: Number(achado[1]) / 100, base: achado[2] }
  })
}

describe('o papel da cena continua legível em todos os temas', () => {
  const receitas = receitasDoCss()

  test('a conta confere com o que o navegador faz', () => {
    // Prova que a implementação do `color-mix` acima não está inventando: misturar uma cor com
    // ela mesma devolve ela, e 100% devolve o primeiro termo.
    expect(misturar('#808080', '#808080', 0.5).map((c) => Math.round(c * 255))).toEqual([
      128, 128, 128,
    ])
    expect(misturar('#1b5cf3', '#ffffff', 1).map((c) => Math.round(c * 255))).toEqual([27, 92, 243])
    // E a régua de contraste bate com valores conhecidos (preto no branco = 21).
    expect(contraste(hex('#000000'), hex('#ffffff'))).toBeCloseTo(21, 1)
  })

  test('⚠️⚠️ nenhuma tinta da cena cai abaixo de AA em nenhum tema', () => {
    const falhas: string[] = []
    let medidos = 0
    for (const { nome, pct, base } of receitas)
      for (const [tema, primary] of Object.entries(TEMAS)) {
        const papel = misturar(primary, base, pct)
        for (const [tinta, cor] of Object.entries(TINTAS)) {
          const r = contraste(hex(cor), papel)
          medidos++
          if (r < AA) falhas.push(`${tinta} sobre ${nome} no tema ${tema}: ${r.toFixed(2)}`)
        }
      }
    expect(falhas).toEqual([])
    // Guarda de que a varredura mediu alguma coisa: todas as paletas + fallback, em cada papel.
    expect(medidos).toBe(receitas.length * Object.keys(TEMAS).length * Object.keys(TINTAS).length)
  })

  test('a mistura segue TODAS as cores do perfil', () => {
    // O contraste sozinho tem uma saída fácil e errada: zerar a mistura passa em tudo e mata a
    // promessa de a cena seguir o tema. O papel muda para cada paleta, mesmo nas matizes vizinhas.
    for (const { nome, pct, base } of receitas) {
      const padrao = misturar(derive(DEFAULT_PALETTE).action, base, pct)
      for (const palette of PALETTES) {
        if (palette === DEFAULT_PALETTE) continue
        const tema = misturar(derive(palette).action, base, pct)
        const distancia = Math.max(...padrao.map((c, i) => Math.abs(c - (tema[i] ?? 0)) * 255))
        expect({ nome, palette, distancia }).toMatchObject({ distancia: expect.any(Number) })
        if (distancia <= 0)
          throw new Error(`${nome}: ${PALETTE_LABELS[palette]} não muda o papel da cena`)
      }
    }
  })

  test('a mistura continua PERCEPTÍVEL entre Azul e Rosa', () => {
    // Azul e Rosa são as duas paletas cromáticas aprovadas à mão. Nas paletas vizinhas o papel
    // recebe apenas 5% de cor, então a diferença pode ser menor que um degrau grande de RGB;
    // exigir 8 de todas elas seria medir uma preferência visual que o produto não prometeu.
    for (const { nome, pct, base } of receitas) {
      const azul = misturar(derive('blue').action, base, pct)
      const rosa = misturar(derive('pink').action, base, pct)
      const distancia = Math.max(...azul.map((c, i) => Math.abs(c - (rosa[i] ?? 0)) * 255))
      if (distancia < 8) throw new Error(`${nome}: Azul e Rosa dão quase o mesmo papel`)
    }
  })

  test('a ação de cada paleta chega a --primary nos dois apps de aluno', () => {
    const acoesCanonicas = PALETTES.map((palette) => derive(palette).action).sort()
    const hosts = [
      ['kids', '../../community-kids/src/app/globals.css'],
      ['adulto', '../../community/src/app/globals.css'],
    ] as const
    for (const [app, caminho] of hosts) {
      const acoesDoHost = cssHexValuesForCustomProperty(join(import.meta.dir, caminho), '--primary')
      expect({ app, acoesDoHost: acoesDoHost.sort() }).toEqual({ app, acoesDoHost: acoesCanonicas })
    }
  })

  /**
   * ⚠⚠⚠ O par de comparação também vive no CROMO, e o cromo ficou BRANCO no lote 3.
   *
   * O âmbar e o azul foram calibrados contra o papel CREME da cena. Desde 15/09/2026 a faixa de
   * estado e os rótulos da bancada vestem o cartão do aplicativo, então os mesmos tons passaram a
   * ser lidos sobre outro fundo — e a promessa do lote era refazer a conta, não estimá-la. Os
   * fundos saem do CSS de VERDADE dos dois apps de aluno, e não de uma cópia aqui.
   */
  test('⚠️⚠️ o par de comparação continua legível sobre o cartão dos DOIS apps', () => {
    const cartoes = [
      ['kids', '../../community-kids/src/app/globals.css'],
      ['adulto', '../../community/src/app/globals.css'],
    ] as const
    const falhas: string[] = []
    let medidos = 0
    for (const [app, caminho] of cartoes) {
      // Todas as declarações finais do cartão: segue aliases/imports até os
      // literais do tema padrão e de qualquer tema que os redefina.
      const fundos = cssHexValuesForCustomProperty(join(import.meta.dir, caminho), '--pen-cartao')
      if (!fundos.length) throw new Error(`--pen-cartao não encontrado no globals.css do ${app}`)
      for (const fundo of fundos)
        for (const [tinta, cor] of Object.entries(TINTAS)) {
          // `ink` e `ink-soft` são do MUNDO: eles não aparecem no cromo desde o lote 3.
          if (tinta.startsWith('ink')) continue
          const r = contraste(hex(cor), hex(fundo))
          medidos++
          if (r < AA) falhas.push(`${tinta} sobre o cartão do ${app} (${fundo}): ${r.toFixed(2)}`)
        }
    }
    expect(falhas).toEqual([])
    // Dois apps × as três tintas de SENTIDO (azul, âmbar e o vermelho do encosto). Sobe se um
    // tema novo redefinir o cartão — e aí a conta tem de ser refeita mesmo.
    expect(medidos).toBeGreaterThanOrEqual(6)
  })

  test('⚠️ o par de comparação NÃO segue o tema', () => {
    // Azul e âmbar dizem QUAL medida é qual. Se algum dia entrarem num `color-mix`, a leitura
    // da descoberta muda com o tema — e é isso que esta asserção impede.
    const css = readFileSync(join(import.meta.dir, '../src/styles/scene.css'), 'utf8')
    for (const token of [
      '--color-scene-a:',
      '--color-scene-b:',
      '--color-scene-b-ink:',
      '--color-scene-alert:',
    ]) {
      const linha = css.split('\n').find((l) => l.trim().startsWith(token))
      expect(linha).toBeDefined()
      expect(linha).not.toContain('color-mix')
      expect(linha).not.toContain('var(--primary')
    }
  })
})

/**
 * O MUNDO ESPAÇO (Raio-X, lote 3, 16/09/2026): a mesma conta, sobre o papel escuro.
 *
 * ⚠️⚠️ No espaço a paleta inteira é redeclarada num bloco (`.sz-scene-espaco`), e o par de
 * comparação CLAREIA para continuar legível — o azul de sempre dá ≈2,7:1 no céu de estrelas. As
 * receitas saem do bloco de VERDADE, como lá em cima.
 */
describe('o mundo espaço continua legível em todos os temas', () => {
  const css = readFileSync(join(import.meta.dir, '../src/styles/scene.css'), 'utf8')
  const inicio = css.indexOf('.sz-scene-espaco {')
  const bloco = css.slice(inicio, css.indexOf('}', inicio))
  const receita = (nome: string) => {
    const achado = bloco.match(
      new RegExp(
        `--color-scene-${nome}:\\s*color-mix\\(in oklab,\\s*var\\(--primary[^)]*\\)\\s*(\\d+)%,\\s*(#[0-9a-f]{6})\\s*\\)`,
        'i',
      ),
    )
    if (!achado?.[1] || !achado[2]) throw new Error(`Receita de ${nome} não encontrada no espaço`)
    return { nome, pct: Number(achado[1]) / 100, base: achado[2] }
  }
  const literal = (fonte: string, nome: string) => {
    const achado = fonte.match(new RegExp(`--color-scene-${nome}:\\s*(#[0-9a-f]{6})\\s*;`, 'i'))
    if (!achado?.[1]) throw new Error(`--color-scene-${nome} não encontrado`)
    return achado[1]
  }
  const PAPEIS = ['ground', 'sky', 'grass', 'card'].map(receita)

  test('o bloco existe e o papel é ESCURO de verdade', () => {
    expect(inicio).toBeGreaterThan(-1)
    // Anti-vácuo: "fundo escuro de estrelas" é o pedido. Um espaço claro passaria no contraste
    // com tinta escura e desmancharia o mundo.
    // ⚠️ 0,07 e não 0,06: a lima do admin escuro clareia o painel até 0,063, que continua escuro
    // (um cinza médio é 0,2). O teto existe para pegar um espaço CLARO, não para medir a lima.
    for (const { nome, pct, base } of PAPEIS)
      for (const primary of Object.values(TEMAS))
        expect({ nome, claro: luminancia(misturar(primary, base, pct)) > 0.07 }).toEqual({
          nome,
          claro: false,
        })
  })

  test('⚠️⚠️ a tinta, o par e o encosto passam de AA sobre todo papel do espaço', () => {
    const tintas = ['ink', 'ink-soft', 'a', 'b-ink', 'alert'].map(
      (t) => [t, literal(bloco, t)] as const,
    )
    const falhas: string[] = []
    let medidos = 0
    for (const { nome, pct, base } of PAPEIS)
      for (const [tema, primary] of Object.entries(TEMAS)) {
        const papel = misturar(primary, base, pct)
        for (const [tinta, cor] of tintas) {
          const r = contraste(hex(cor), papel)
          medidos++
          if (r < AA)
            falhas.push(`${tinta} sobre ${nome} (espaço) no tema ${tema}: ${r.toFixed(2)}`)
        }
      }
    expect(falhas).toEqual([])
    // Todos os papéis × todas as paletas e fallback × todas as tintas.
    expect(medidos).toBe(PAPEIS.length * Object.keys(TEMAS).length * tintas.length)
  })

  test('⚠️ as figuras e as linhas se veem no céu de estrelas (3:1, que é o de gráfico)', () => {
    const graficos: [string, string][] = [
      // ⚠️ `star`, `leaf-soft`, `rock-light` e `stone-light` saíram do CSS: a arte do jogo pinta
      // as figuras com as cores dela, e eles só existiam para o `FundoEspaco` e as figuras à mão.
      ...['rock', 'stone', 'flame', 'flame-core', 'fin', 'window'].map(
        (t) => [t, literal(css, t)] as [string, string],
      ),
      ...['rule', 'line', 'b'].map((t) => [`${t} (espaço)`, literal(bloco, t)] as [string, string]),
    ]
    const clareado = css.match(
      /\.sz-scene-espaco svg \.text-primary \{\s*color:\s*color-mix\(in oklab,\s*var\(--primary[^)]*\)\s*(\d+)%,\s*(#[0-9a-f]{6})\s*\)/i,
    )
    if (!clareado?.[1] || !clareado[2]) throw new Error('O personagem clareado não foi encontrado')
    const falhas: string[] = []
    const ceu = receita('sky')
    for (const [tema, primary] of Object.entries(TEMAS)) {
      const papel = misturar(primary, ceu.base, ceu.pct)
      for (const [nome, cor] of graficos) {
        const r = contraste(hex(cor), papel)
        if (r < 3) falhas.push(`${nome} no céu (tema ${tema}): ${r.toFixed(2)}`)
      }
      // O casco da nave e o Dino vestem o `text-primary`: no espaço, o clareado.
      const personagem = misturar(primary, clareado[2], Number(clareado[1]) / 100)
      const r = contraste(personagem, papel)
      if (r < 3) falhas.push(`o personagem no céu (tema ${tema}): ${r.toFixed(2)}`)
    }
    expect(falhas).toEqual([])
  })

  test('⚠️ e as figuras também se veem no BRANCO da bancada', () => {
    // As peças da bancada (a ordem de desenhar do `layers`) mostram a mesma figura sobre o cartão
    // do app. O contorno escuro de cada uma é o que a segura ali.
    const falhas: string[] = []
    for (const t of ['rock-dark', 'stone-dark', 'flame-deep', 'fin']) {
      const r = contraste(hex(literal(css, t)), hex('#ffffff'))
      if (r < 3) falhas.push(`${t} no branco: ${r.toFixed(2)}`)
    }
    expect(falhas).toEqual([])
  })

  test('o papel do espaço SEGUE cada cor do perfil, e o par NÃO', () => {
    for (const { nome, pct, base } of PAPEIS) {
      const padrao = misturar(derive(DEFAULT_PALETTE).action, base, pct)
      for (const palette of PALETTES) {
        if (palette === DEFAULT_PALETTE) continue
        const tema = misturar(derive(palette).action, base, pct)
        const distancia = Math.max(...padrao.map((c, i) => Math.abs(c - (tema[i] ?? 0)) * 255))
        if (distancia <= 0) throw new Error(`${nome}: ${PALETTE_LABELS[palette]} não muda o espaço`)
      }
    }
    // A régua visual forte também vale no mundo escuro para as duas paletas aprovadas à mão.
    for (const { nome, pct, base } of PAPEIS) {
      const azul = misturar(derive('blue').action, base, pct)
      const rosa = misturar(derive('pink').action, base, pct)
      const distancia = Math.max(...azul.map((c, i) => Math.abs(c - (rosa[i] ?? 0)) * 255))
      if (distancia < 8) throw new Error(`${nome}: Azul e Rosa dão quase o mesmo espaço`)
    }
    for (const token of ['a', 'b', 'b-ink', 'alert']) {
      const linha = bloco.split('\n').find((l) => l.trim().startsWith(`--color-scene-${token}:`))
      expect(linha).toBeDefined()
      expect(linha).not.toContain('color-mix')
      expect(linha).not.toContain('var(--primary')
    }
  })
})

/**
 * A TINTA DA CENA contra o MUNDO DE VERDADE (18/09/2026).
 *
 * ⚠️⚠️ Este bloco existe porque os dois de cima passaram a medir meio vácuo: eles conferem a tinta
 * contra os tokens `--color-scene-sky`/`ground`/`grass` do CSS, e esses tokens deixaram de pintar o
 * fundo quando o palco passou a desenhar a arte do Jogo 2D. A conta continuava certa e deixou de
 * ser sobre o que a criança vê. Aqui as cores saem do DESENHO: o fundo é rodado de verdade e as
 * cores que cobrem área grande são medidas contra a tinta.
 *
 * ⚠️ Só as DOMINANTES entram na conta (≥ 4% da área). Estrela, janela acesa e tracinho de grama
 * são detalhe pequeno, e é para eles que o texto do palco tem halo de 3px (`paint-order`, no
 * `scene.css`) — cobrá-los aqui reprovaria um desenho legível.
 */
describe('a tinta da cena continua legível sobre o MUNDO desenhado', () => {
  const css = readFileSync(join(import.meta.dir, '../src/styles/scene.css'), 'utf8')
  const blocoEspaco = css.slice(
    css.indexOf('.sz-scene-espaco {'),
    css.indexOf('}', css.indexOf('.sz-scene-espaco {')),
  )

  /** Quanta área cada cor pinta neste fundo, do maior para o menor. */
  function coresDominantes(cenario: SceneCenarioId, detalhe: 'cheio' | 'calmo') {
    const w = 560
    const h = 300
    const area = new Map<string, number>()
    let atual = '#000000'
    const soma = (cor: string, quanto: number) => {
      if (!/^#[0-9a-f]{6}$/i.test(cor)) return
      area.set(cor, (area.get(cor) ?? 0) + quanto)
    }
    // Um pincel que só MEDE: cada retângulo soma a área dele; cada caminho soma a caixa que ele
    // cobre. É grosseiro de propósito — serve para separar "o céu" de "uma estrelinha".
    let minX = 0
    let minY = 0
    let maxX = 0
    let maxY = 0
    const ponto = (x: number, y: number) => {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
    const zerar = () => {
      minX = Number.POSITIVE_INFINITY
      minY = Number.POSITIVE_INFINITY
      maxX = Number.NEGATIVE_INFINITY
      maxY = Number.NEGATIVE_INFINITY
    }
    zerar()
    const nada = () => {}
    const medidor = {
      fillStyle: '#000000' as string | CanvasGradient | CanvasPattern,
      strokeStyle: '#000000' as string | CanvasGradient | CanvasPattern,
      lineWidth: 1,
      lineCap: 'butt' as CanvasLineCap,
      lineJoin: 'miter' as CanvasLineJoin,
      globalAlpha: 1,
      shadowColor: '',
      shadowBlur: 0,
      save: nada,
      restore: nada,
      translate: nada,
      scale: nada,
      rotate: nada,
      beginPath: zerar,
      closePath: nada,
      moveTo: ponto,
      lineTo: ponto,
      quadraticCurveTo: (a: number, b: number, c: number, d: number) => {
        ponto(a, b)
        ponto(c, d)
      },
      bezierCurveTo: (a: number, b: number, c: number, d: number, e: number, f: number) => {
        ponto(a, b)
        ponto(c, d)
        ponto(e, f)
      },
      arc: (x: number, y: number, r: number) => {
        ponto(x - r, y - r)
        ponto(x + r, y + r)
      },
      ellipse: (x: number, y: number, rx: number, ry: number) => {
        ponto(x - rx, y - ry)
        ponto(x + rx, y + ry)
      },
      rect: (x: number, y: number, rw: number, rh: number) => {
        ponto(x, y)
        ponto(x + rw, y + rh)
      },
      roundRect: (x: number, y: number, rw: number, rh: number) => {
        ponto(x, y)
        ponto(x + rw, y + rh)
      },
      fill: () => {
        if (maxX > minX) soma(atual, (maxX - minX) * (maxY - minY))
      },
      stroke: nada,
      clip: nada,
      fillRect: (_x: number, _y: number, rw: number, rh: number) => soma(atual, Math.abs(rw * rh)),
      strokeRect: nada,
      createLinearGradient: () => ({
        // O céu é um degradê: cada parada dele pinta um pedaço grande da faixa.
        addColorStop: (_o: number, cor: string) => soma(cor, (w * h) / 3),
      }),
    }
    Object.defineProperty(medidor, 'fillStyle', {
      get: () => atual,
      set: (v: string) => {
        atual = typeof v === 'string' ? v : atual
      },
    })
    FUNDOS[fundoDoCenario(cenario)](
      medidor as unknown as Parameters<(typeof FUNDOS)['floresta']>[0],
      { w, h, chao: 240 },
      { t: 0, chao: 240, velocidade: 4, detalhe },
    )
    const total = w * h
    return [...area.entries()]
      .filter(([, a]) => a / total >= 0.04)
      .sort((a, b) => b[1] - a[1])
      .map(([cor]) => cor)
  }

  /**
   * A cor FINAL de um token, resolvida como o navegador resolve.
   *
   * ⚠️ Pegar só o `#xxxxxx` da receita mede a BASE do `color-mix`, não o que sai na tela — e a
   * base da tinta e a do papel são parecidas, então a conta dava 1,3:1 num par perfeitamente
   * legível. A mistura é a mesma que o resto deste arquivo já usa.
   */
  const corDoToken = (token: string, escuro: boolean) => {
    const fonte = escuro ? blocoEspaco : css
    // ⚠️⚠️ `\\s` e não `\s`: num TEMPLATE LITERAL o `\s` não é escape válido e vira só `s`, então a
    // regex procurava `--color-scene-ink:s*(#…)` e nunca casava. O resto do arquivo já escapava
    // assim; escrever direto foi o que quebrou aqui.
    const mix = fonte.match(
      new RegExp(
        `--color-scene-${token}:\\s*color-mix\\(in oklab,\\s*var\\(--primary[^)]*\\)\\s*(\\d+)%,\\s*(#[0-9a-f]{6})\\s*\\)`,
        'i',
      ),
    )
    if (mix?.[1] && mix[2]) return misturar(TEMAS.reserva, mix[2], Number(mix[1]) / 100)
    const puro = fonte.match(new RegExp(`--color-scene-${token}:\\s*(#[0-9a-f]{6})\\s*;`, 'i'))
    if (!puro?.[1]) throw new Error(`--color-scene-${token} não encontrado`)
    return hex(puro[1])
  }
  const tintaDe = (escuro: boolean) => corDoToken('ink', escuro)

  /** O halo que o `scene.css` põe atrás de todo texto de palco, e a cor dele. */
  function halo(escuro: boolean) {
    const regra = css.slice(css.indexOf('.sz-scene-frame svg text {'))
    const bloco = regra.slice(0, regra.indexOf('}'))
    expect(bloco).toContain('paint-order: stroke fill')
    const token = bloco.match(/stroke:\s*var\(--color-scene-([a-z-]+)\)/)?.[1]
    if (!token) throw new Error('o halo do texto do palco não sai de um token da cena')
    return corDoToken(token, escuro)
  }

  test('⭐⭐ TODO texto de palco tem halo, e não só o do espaço', () => {
    // ⚠️⚠️ É o que sustenta a legibilidade agora que o mundo é ilustrado em toda cena. Enquanto o
    // Corre Dino era um retângulo de cor o halo era dispensável ali; com a faixa de TERRA marrom
    // do jogo, a tinta escura sobre ela mede 2,04:1 (medido no teste abaixo).
    expect(css).toContain('.sz-scene-frame svg text {')
    expect(css).not.toContain('.sz-scene-espaco svg text {')
  })

  test('⭐⭐ a tinta tem 4,5:1 contra o HALO, que é o que fica atrás da letra', () => {
    for (const escuro of [false, true]) {
      const razao = contraste(tintaDe(escuro), halo(escuro))
      expect({ escuro, ok: razao >= 4.5, razao: Number(razao.toFixed(2)) }).toEqual({
        escuro,
        ok: true,
        razao: Number(razao.toFixed(2)),
      })
    }
  })

  test('⚠️⚠️ e é por isso que o halo é OBRIGATÓRIO: o mundo sozinho não garante contraste', () => {
    // Anti-vácuo do par acima, e a razão de ele existir: sem halo, a tinta do Corre Dino cai
    // abaixo de 4,5:1 sobre a terra e a grama do fundo do jogo. Se um dia todas as cores do mundo
    // passarem sozinhas, este teste falha e o halo pode ser reconsiderado — não antes.
    const tinta = tintaDe(false)
    const fracas = coresDominantes('corre-dino', 'calmo').filter(
      (c) => contraste(tinta, hex(c)) < 4.5,
    )
    expect(fracas.length).toBeGreaterThan(0)
  })

  test('a varredura ENCONTRA cores dominantes (anti-vácuo)', () => {
    // Sem isto, um medidor quebrado devolveria lista vazia e o teste abaixo passaria por vácuo.
    for (const cenario of SCENE_CENARIO_IDS) {
      const cores = coresDominantes(cenario, 'calmo')
      expect({ cenario, quantas: cores.length > 0 }).toEqual({ cenario, quantas: true })
    }
  })

  test('⚠️⚠️ cada cenário escolhe a tinta pela COR do fundo, não por ter chão', () => {
    // O caso que a `gorilas` criou: chão de telhado e céu noturno. Com a tinta clara ela fica
    // legível; com a escura (a de quem "tem chão") ficaria sobre a cidade à noite.
    const falhas: string[] = []
    for (const cenario of SCENE_CENARIO_IDS) {
      const tinta = tintaDe(cenarioEscuro(cenario))
      const trocada = tintaDe(!cenarioEscuro(cenario))
      const dominantes = coresDominantes(cenario, 'cheio').map(hex)
      const boa = dominantes.filter((c) => contraste(tinta, c) >= 4.5).length
      const ruim = dominantes.filter((c) => contraste(trocada, c) >= 4.5).length
      if (boa < ruim) falhas.push(`${cenario}: a tinta trocada seria MAIS legível que a escolhida`)
    }
    expect(falhas).toEqual([])
  })
})
