import { describe, expect, it } from 'bun:test'

/**
 * Trava a fonte dos TÍTULOS do Pensa — os headings e o nome do plano no card.
 *
 * O Preflight do Tailwind zera `h1..h6 { font-weight: inherit }` e deixa a
 * família cair na herdada (Nunito, do corpo do host), e o host kids não define
 * nada para heading. Ou seja: sem uma regra explícita no CSS do pacote, todo
 * título do Pensa sai em Nunito 400 ao lado de um `<h1 className="sz-ui-display">`
 * do Estúdio em Baloo 2 700. Nada mais guardava isso.
 *
 * ⚠️ O caso que ESCAPOU na prática não foi um heading, foi o **nome do plano no
 * card** (`.pensa-project-card strong`): título aos olhos da criança, mas `strong`
 * aos olhos do CSS, então ficou de fora do grupo de headings e saiu em Nunito —
 * exatamente como o nome do jogo no `ProjectCard` do Estúdio, que estava em
 * `font-semibold` (Nunito 600) em vez de `sz-ui-display`. Por isso este arquivo
 * cobre os dois: "é heading" não é o mesmo que "é título".
 *
 * Em jsdom a folha externa não é computada, então não dá para conferir isso
 * renderizando; o que dá para travar é a declaração no CSS.
 */

const css = await Bun.file(new URL('./pensa.css', import.meta.url)).text()

/** Corpo da primeira regra cujo seletor contém `agulha`. */
function corpoDaRegra(agulha: string): string {
  const inicio = css.indexOf(agulha)
  if (inicio < 0) return ''
  const abre = css.indexOf('{', inicio)
  const fecha = css.indexOf('}', abre)
  return abre < 0 || fecha < 0 ? '' : css.slice(abre + 1, fecha)
}

const DISPLAY = ['--font-display', 'Baloo 2']

describe('os títulos do Pensa saem na fonte display, não na do corpo', () => {
  it('h1..h4 declaram a família — os quatro, no mesmo seletor', () => {
    const inicio = css.indexOf('.pensa-planner h1,')
    expect(inicio).toBeGreaterThan(-1)
    // O seletor precisa listar os quatro; um de fora é um título órfão.
    const seletor = css.slice(inicio, css.indexOf('{', inicio))
    for (const tag of ['h1', 'h2', 'h3', 'h4']) {
      expect(seletor).toContain(`.pensa-planner ${tag}`)
    }
    for (const marca of DISPLAY) expect(corpoDaRegra('.pensa-planner h1,')).toContain(marca)
  })

  it('o nome do plano no card também — é título, ainda que seja um <strong>', () => {
    // Esta é a regra que faltava, e o motivo de o arquivo existir.
    for (const marca of DISPLAY) {
      expect(corpoDaRegra('.pensa-project-card strong')).toContain(marca)
    }
  })

  it('o peso dos títulos é 700, o mesmo do .pin-display e do .sz-ui-display', () => {
    // 800 deixaria o título do Pensa mais gordo que o dos irmãos lado a lado.
    expect(corpoDaRegra('.pensa-planner h1,')).toContain('font-weight: 700')
    expect(/font-weight:\s*800/.test(css)).toBe(false)
  })
})
