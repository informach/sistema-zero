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
 * card** (era `.pensa-project-card strong`; hoje o h3 `.pensa-project-card__name`): título aos
 * olhos da criança, mas `strong`
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

/** O seletor da regra dos títulos do Pensa: as receitas compartilhadas ficam de fora dela. */
const FORA = ':where(:not([class*="sz-tool-"]))'
const H1 = `.pensa-planner h1${FORA},`

describe('os títulos do Pensa saem na fonte display, não na do corpo', () => {
  it('h1..h4 declaram a família — os quatro, no mesmo seletor', () => {
    const inicio = css.indexOf(H1)
    expect(inicio).toBeGreaterThan(-1)
    // O seletor precisa listar os quatro; um de fora é um título órfão.
    const seletor = css.slice(inicio, css.indexOf('{', inicio))
    for (const tag of ['h1', 'h2', 'h3', 'h4']) {
      expect(seletor).toContain(`.pensa-planner ${tag}${FORA}`)
    }
    for (const marca of DISPLAY) expect(corpoDaRegra(H1)).toContain(marca)
  })

  it('o nome do plano no card também — é título, e declara a família na regra dele', () => {
    // Esta é a regra que faltava (quando o nome era um <strong>), e o motivo de o arquivo existir.
    for (const marca of DISPLAY) {
      expect(corpoDaRegra('.pensa-project-card__name {')).toContain(marca)
    }
  })

  it('os títulos do Pensa pesam 700; os das telas-modelo vêm da receita compartilhada (800)', () => {
    // Os títulos PRÓPRIOS do Pensa (etapas, artefatos) seguem em 700. Os das telas-modelo
    // (`.sz-tool-title`, `.sz-tool-section-title`, `.sz-tool-card-title`, 11/09/2026) são os mesmos
    // das galerias do Estúdio e do Pinta, em Baloo 800 pela receita; por isso a regra de 700 os
    // deixa de FORA (sem a exclusão, o título "Meus projetos" sairia mais magro que o dos irmãos).
    expect(corpoDaRegra(H1)).toContain('font-weight: 700')
    expect(css).toContain(FORA)
  })
})
