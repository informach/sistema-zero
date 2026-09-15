import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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
 * A conta refaz o `color-mix(in oklab, …)` do CSS e vale para os três temas que existem hoje.
 * Mexeu na paleta? Este teste diz se ainda dá para ler.
 */

/** A cor de ação de cada tema, que é o que entra na mistura como `--primary`. */
const TEMAS = {
  Padrão: '#1b5cf3',
  Pink: '#c8246f',
  /** O fallback do `var(--primary, …)`: ensaio de autoria e qualquer superfície sem tema. */
  reserva: '#315f92',
} as const

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

describe('o papel da cena continua legível nos três temas', () => {
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
    // Guarda de que a varredura mediu alguma coisa: 3 papéis × 3 temas × 5 tintas.
    expect(medidos).toBe(45)
  })

  test('a mistura é PERCEPTÍVEL: o papel muda de verdade entre os dois temas', () => {
    // O contraste sozinho tem uma saída fácil e errada: zerar a mistura passa em tudo e mata a
    // promessa de a cena seguir o tema. Aqui se cobra que Padrão e Pink deem papéis distintos.
    for (const { nome, pct, base } of receitas) {
      const padrao = misturar(TEMAS.Padrão, base, pct)
      const pink = misturar(TEMAS.Pink, base, pct)
      const distancia = Math.max(...padrao.map((c, i) => Math.abs(c - (pink[i] ?? 0)) * 255))
      expect({ nome, distancia }).toMatchObject({ distancia: expect.any(Number) })
      if (distancia < 8) throw new Error(`${nome}: os dois temas dão quase o mesmo papel`)
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
      const css = readFileSync(join(import.meta.dir, caminho), 'utf8')
      // Todas as declarações do cartão: a do tema padrão e a de qualquer tema que a redefina.
      const fundos = [...css.matchAll(/--pen-cartao:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1] ?? '')
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
