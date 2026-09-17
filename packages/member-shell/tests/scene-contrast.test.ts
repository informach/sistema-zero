import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_PALETTE, PALETTE_LABELS, PALETTES } from '@sistemazero/core/palette'
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
      ...['rock', 'stone', 'flame', 'flame-core', 'fin', 'window', 'star'].map(
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
