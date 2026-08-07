import { describe, expect, it } from 'bun:test'

/**
 * Guarda de UMA regra, e ela vale por 19 títulos.
 *
 * O Preflight do Tailwind zera `h1..h6 { font-weight: inherit }` e a família cai
 * na herdada (Nunito, do corpo do host). Enquanto a família do Pensa morou só na
 * classe `.pensa-display`, bastava um título nascer sem ela para sair em Nunito
 * ao lado de um `<h2 className="sz-ui-display">` do Estúdio em Baloo — foi
 * exatamente o que aconteceu com "Meus planos" e com outros 18 títulos do pacote
 * (08/2026), e o que a dona do produto viu como "a fonte não parece a certa".
 *
 * Em jsdom a folha externa não é computada, então não dá para conferir isso
 * renderizando. O que dá para travar é a existência da regra no ELEMENTO: com
 * ela, esquecer a classe deixa de ser possível.
 */

const css = await Bun.file(new URL('./pensa.css', import.meta.url)).text()

describe('a fonte dos títulos mora no elemento, não na classe', () => {
  const regra = css.match(/\.pensa-planner h1,[\s\S]{0,200}?\{([\s\S]*?)\}/)

  it('existe uma regra de elemento para h1..h4', () => {
    expect(regra).not.toBeNull()
    // Os quatro precisam estar no seletor — um de fora é um título órfão.
    const seletor = css.slice(
      css.indexOf('.pensa-planner h1,'),
      css.indexOf('.pensa-planner h1,') + 200,
    )
    for (const tag of ['h1', 'h2', 'h3', 'h4']) {
      expect(seletor).toContain(`.pensa-planner ${tag}`)
    }
  })

  it('a regra declara família display E peso — não só o peso', () => {
    const corpo = regra?.[1] ?? ''
    // `--font-display` é o canal do host kids (Baloo 2); o fallback literal
    // atende playground/admin, onde a variável não existe.
    expect(corpo).toContain('--font-display')
    expect(corpo).toContain('Baloo 2')
    expect(corpo).toContain('font-weight: 700')
  })

  it('o peso é 700, o mesmo do .pin-display e do .sz-ui-display', () => {
    // 800 deixaria o título do Pensa mais gordo que o dos irmãos lado a lado.
    expect(css).not.toContain('font-weight: 800')
  })
})
