/**
 * Contrato de `src/styles/tool-chrome.css` (07/09/2026), lido como TEXTO (o pacote não tem DOM
 * de teste, e uma folha de tokens se prova pela forma): os tokens do escuro são os mesmos do
 * claro, os cinco escopos de tema de cada ferramenta estão nos dois blocos, o escuro vem DEPOIS
 * do claro (empate de especificidade no `html.dark`), todo token usado está declarado, nada de
 * `in oklch`/`!important`, uma camada `components` só, e quem embarca ferramentas importa a
 * folha DEPOIS dos primitivos e ANTES do CSS dos pacotes.
 *
 * Desde 11/09/2026 (o desenho das telas-modelo): as faixas existem nos dois temas, as cores de
 * assinatura moram só nas constantes, as pílulas novas são chapadas, o alvo cresce para 44px
 * no toque e o botão do menu é um quadrado dentro do conteúdo, não mais a aba colada.
 */
import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'

const HERE = import.meta.dir
const css = await Bun.file(join(HERE, '../src/styles/tool-chrome.css')).text()
const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')

function bloco(ancora: string): { seletor: string; corpo: string } {
  const i = semComentarios.indexOf(ancora)
  if (i < 0) throw new Error(`âncora não encontrada: ${ancora}`)
  const abre = semComentarios.indexOf('{', i)
  const fecha = semComentarios.indexOf('}', abre)
  const anterior = semComentarios.lastIndexOf('}', i)
  return {
    seletor: semComentarios.slice(anterior + 1, abre).trim(),
    corpo: semComentarios.slice(abre + 1, fecha),
  }
}

const tokensDe = (corpo: string): string[] =>
  [...corpo.matchAll(/(--sz-tool-[\w-]+)\s*:/g)].map((m) => m[1] ?? '').sort()

const ESCOPOS_CLAROS = [
  ':root',
  '[data-sz-theme="light"]',
  '[data-pinta-theme="light"]',
  '[data-molda-theme="light"]',
  '.pensa-theme-light',
]
const ESCOPOS_ESCUROS = [
  '.dark',
  '[data-sz-theme="dark"]',
  '[data-pinta-theme="dark"]',
  '[data-molda-theme="dark"]',
  '.pensa-theme-dark',
]

describe('tool-chrome.css: tokens', () => {
  const claro = bloco('.pensa-theme-light {')
  const escuro = bloco('.pensa-theme-dark {')
  const geometria = bloco(':root {')

  it('o escuro declara EXATAMENTE os tokens do claro (derivados inclusive)', () => {
    expect(tokensDe(escuro.corpo)).toEqual(tokensDe(claro.corpo))
    expect(tokensDe(claro.corpo).length).toBeGreaterThan(15)
  })

  it('os cinco escopos de tema de cada ferramenta estão nos dois blocos', () => {
    for (const s of ESCOPOS_CLAROS) expect(claro.seletor).toContain(s)
    for (const s of ESCOPOS_ESCUROS) expect(escuro.seletor).toContain(s)
  })

  it('o escuro vem DEPOIS do claro (no html.dark vence a ordem)', () => {
    expect(semComentarios.indexOf('.pensa-theme-dark {')).toBeGreaterThan(
      semComentarios.indexOf('.pensa-theme-light {'),
    )
  })

  it('todo token usado no arquivo está declarado (claro + geometria)', () => {
    const declarados = new Set([...tokensDe(claro.corpo), ...tokensDe(geometria.corpo)])
    const usados = new Set(
      [...semComentarios.matchAll(/var\(\s*(--sz-tool-[\w-]+)/g)].map((m) => m[1] ?? ''),
    )
    expect(usados.size).toBeGreaterThan(20)
    for (const u of usados) expect(declarados.has(u)).toBe(true)
  })

  it('sem `in oklch`, sem !important, sem bloco de tema do Tailwind', () => {
    expect(semComentarios).not.toMatch(/color-mix\(in oklch/)
    expect(semComentarios).not.toContain('!important')
    expect(semComentarios).not.toContain('@theme')
  })

  it('as três faixas existem nos DOIS temas, e o escuro é literal (o kids já mediu)', () => {
    for (const faixa of ['creme', 'ceu', 'lilas']) {
      expect(claro.corpo).toContain(`--sz-tool-band-${faixa}: var(--sz-kids-`)
      expect(escuro.corpo).toMatch(new RegExp(`--sz-tool-band-${faixa}: oklch\\(`))
    }
    // O fio do cartão some no claro e aparece no escuro (a `--borda-carta` do kids).
    expect(claro.corpo).toContain('--sz-tool-card-edge: transparent')
    expect(escuro.corpo).toContain('--sz-tool-card-edge: var(--sz-tool-line)')
  })

  it('as cores de assinatura e o amarelo do novo moram SÓ nas constantes (fundo não troca de tema)', () => {
    for (const nome of ['sig-estudio', 'sig-pinta', 'sig-pensa', 'sig-molda', 'new', 'on-new']) {
      expect(geometria.corpo).toContain(`--sz-tool-${nome}:`)
      expect(claro.corpo).not.toContain(`--sz-tool-${nome}:`)
      expect(escuro.corpo).not.toContain(`--sz-tool-${nome}:`)
    }
  })

  it('o alvo das receitas novas é 40px no mouse e 44px com o dedo', () => {
    expect(geometria.corpo).toContain('--sz-tool-hit: 2.5rem')
    const i = semComentarios.indexOf('@media (any-pointer: coarse)')
    expect(i).toBeGreaterThan(-1)
    // Fora da camada: é token, e o bloco de constantes também é sem camada.
    expect(i).toBeLessThan(semComentarios.indexOf('@layer components {'))
    expect(semComentarios.slice(i)).toMatch(
      /^@media \(any-pointer: coarse\) \{\s*:root \{\s*--sz-tool-hit: 2\.75rem;\s*\}/,
    )
  })
})

describe('tool-chrome.css: receitas', () => {
  it('uma camada components só, e nenhuma receita fora dela', () => {
    const camadas = semComentarios.match(/@layer components \{/g) ?? []
    expect(camadas.length).toBe(1)
    expect(semComentarios.indexOf('.sz-tool-')).toBeGreaterThan(
      semComentarios.indexOf('@layer components {'),
    )
  })

  it('o botão do menu é o QUADRADO da imagem, com a mesma forma da seta de voltar', () => {
    // Um bloco só para os três: menu, voltar e os outros quadrados de ícone.
    const quadrado = bloco('.sz-tool-back {')
    expect(quadrado.seletor).toContain('.sz-tool-btn-menu')
    expect(quadrado.seletor).toContain('.sz-tool-icon-btn')
    expect(quadrado.corpo).toContain('width: var(--sz-tool-hit)')
    expect(quadrado.corpo).toContain('height: var(--sz-tool-hit)')
    expect(quadrado.corpo).toContain('border-radius: var(--sz-tool-radius-control)')
    // Branco dentro da faixa, céu diluído sobre barra branca (a mesma variável).
    expect(quadrado.corpo).toContain('background: var(--sz-tool-quiet)')
    expect(bloco('.sz-tool-band {').corpo).toContain('--sz-tool-quiet: var(--sz-tool-surface)')
    const pressionado = bloco('.sz-tool-btn-menu[aria-pressed="true"] {')
    expect(pressionado.corpo).toContain('var(--sz-tool-accent-tint)')
    expect(pressionado.corpo).toContain('var(--sz-tool-accent-line)')
    expect(pressionado.corpo).toContain('color: var(--sz-tool-accent)')
  })

  it('o botão do menu deixou de ser a ABA colada na barra lateral (11/09/2026)', () => {
    expect(semComentarios).not.toContain('--sz-tool-inset')
    expect(semComentarios).not.toContain('border-start-start-radius: 0')
    expect(semComentarios).not.toContain('border-end-start-radius: 0')
    expect(semComentarios).not.toMatch(/margin-inline-start:\s*calc\(-1/)
  })

  it('a legend dos chips flutua (inline com os chips, não numa linha acima)', () => {
    expect(bloco('.sz-tool-chips > legend {').corpo).toContain('float: left')
  })

  it('as pílulas, os chips, a busca, o ordenar e o selo são pílulas no alvo novo', () => {
    // `.sz-tool-select {` casa primeiro com o bloco que ele divide com a busca.
    for (const ancora of [
      '.sz-tool-pill {',
      '.sz-tool-chip {',
      '.sz-tool-select {',
      '.sz-tool-status {',
    ]) {
      const { corpo } = bloco(ancora)
      expect(corpo).toContain('min-height: var(--sz-tool-hit)')
      expect(corpo).toContain('border-radius: var(--sz-tool-radius-pill)')
    }
  })

  it('as pílulas são CHAPADAS: nenhuma variante tem gradiente nem a sombra dura do 3D', () => {
    const pilulas = [...semComentarios.matchAll(/\.sz-tool-pill[^{]*\{([^}]*)\}/g)]
    expect(pilulas.length).toBeGreaterThanOrEqual(8) // anti-vácuo: base, variantes e hovers
    for (const [, corpo = ''] of pilulas) {
      expect(corpo).not.toContain('gradient')
      expect(corpo).not.toMatch(/box-shadow:\s*0 \d+px 0/)
    }
  })

  it('o chip ativo é o azul da marca cheio, e continua cheio no hover', () => {
    const ativo = bloco('.sz-tool-chip[aria-pressed="true"],')
    expect(ativo.seletor).toContain(':hover')
    expect(ativo.corpo).toContain('background: var(--sz-tool-cta)')
    expect(ativo.corpo).toContain('color: var(--sz-tool-on-cta)')
  })
})

describe('quem embarca ferramentas importa a folha na ordem certa', () => {
  const hosts: Array<[string, string]> = [
    ['../../community-kids/src/app/globals.css', 'studio/src/styles/studio.css'],
    ['../../pinta/playground/styles.css', 'pinta.css'],
    ['../../studio/playground/styles.css', 'studio.css'],
    ['../../molda/playground/styles.css', 'molda.css'],
    ['../../pensa/playground/styles.css', 'pensa.css'],
  ]
  for (const [arquivo, cssDoPacote] of hosts) {
    it(`${arquivo}: theme-kids -> tool-chrome -> ${cssDoPacote}`, async () => {
      const texto = await Bun.file(join(HERE, arquivo)).text()
      const iKids = texto.indexOf('theme-kids.css')
      const iTool = texto.indexOf('tool-chrome.css')
      const iPacote = texto.indexOf(cssDoPacote)
      expect(iKids).toBeGreaterThan(-1)
      expect(iTool).toBeGreaterThan(iKids)
      expect(iPacote).toBeGreaterThan(iTool)
    })
  }
})
