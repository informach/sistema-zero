/**
 * Contrato de `src/styles/tool-chrome.css` (07/09/2026), lido como TEXTO (o pacote não tem DOM
 * de teste, e uma folha de tokens se prova pela forma): os tokens do escuro são os mesmos do
 * claro, os cinco escopos de tema de cada ferramenta estão nos dois blocos, o escuro vem DEPOIS
 * do claro (empate de especificidade no `html.dark`), todo token usado está declarado, nada de
 * `in oklch`/peso 800/`!important`, uma camada `components` só, e quem embarca ferramentas
 * importa a folha DEPOIS dos primitivos e ANTES do CSS dos pacotes.
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

  it('sem `in oklch`, sem peso 800, sem !important, sem bloco de tema do Tailwind', () => {
    expect(semComentarios).not.toMatch(/color-mix\(in oklch/)
    expect(semComentarios).not.toMatch(/font-weight:\s*800/)
    expect(semComentarios).not.toContain('!important')
    expect(semComentarios).not.toContain('@theme')
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

  it('o botão do menu: 44px com borda; pressionado = tinta e borda suaves do acento', () => {
    const base = bloco('.sz-tool-btn-menu {')
    expect(base.corpo).toContain('min-height: var(--sz-tool-control)')
    expect(base.corpo).toContain('border: var(--sz-tool-border) solid')
    const pressionado = bloco('.sz-tool-btn-menu[aria-pressed="true"] {')
    expect(pressionado.corpo).toContain('var(--sz-tool-accent-tint)')
    expect(pressionado.corpo).toContain('var(--sz-tool-accent-line)')
    expect(pressionado.corpo).toContain('color: var(--sz-tool-accent)')
  })

  it('a legend dos chips flutua (inline com os chips, não numa linha acima)', () => {
    expect(bloco('.sz-tool-chips > legend {').corpo).toContain('float: left')
  })

  it('o botão do menu é uma ABA colada na linha da sidebar (margem negativa do respiro da barra)', () => {
    expect(bloco(':root {').corpo).toContain('--sz-tool-inset: 0px')
    expect(semComentarios).toContain('margin-inline-start: calc(-1 * var(--sz-tool-inset))')
    expect(semComentarios).toContain('border-start-start-radius: 0')
    expect(semComentarios).toContain('border-end-start-radius: 0')
  })
})

describe('quem embarca ferramentas importa a folha na ordem certa', () => {
  const hosts: Array<[string, string]> = [
    ['../../community-kids/src/app/globals.css', 'studio/src/styles/studio.css'],
    ['../../pinta/playground/styles.css', 'pinta.css'],
    ['../../studio/playground/styles.css', 'studio.css'],
    ['../../molda/playground/styles.css', 'molda.css'],
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
