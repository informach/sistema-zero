/**
 * Ponte de tokens (07/09/2026): o Pensa LÊ os semânticos `--sz-tool-*` de
 * `@sistemazero/ui/tool-chrome.css` no claro (`.pensa-planner`) e no escuro (`.pensa-theme-dark`),
 * com o fallback de sempre por baixo; e nenhuma regra SEM camada pode vencer as receitas
 * compartilhadas do botão do menu e do "voltar". Lido como texto, como o `headingFont.test.ts`.
 */
import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'

const css = await Bun.file(join(import.meta.dir, 'pensa.css')).text()

function bloco(ancora: string): string {
  const i = css.indexOf(ancora)
  if (i < 0) throw new Error(`âncora não encontrada: ${ancora}`)
  const abre = css.indexOf('{', i)
  return css.slice(abre + 1, css.indexOf('}', abre))
}

/**
 * ⚠️ O `bloco()` acima lê só o PRIMEIRO bloco do seletor no texto, e é por isso que um
 * override posterior (`.pensa-planner .pensa-project-card { border-width: 2px }` no fim do
 * arquivo) escapava dos testes da camada do cartão. Este varre o arquivo INTEIRO e devolve
 * todas as regras cujo seletor casa, corpo e seletor. As regras dentro de `@container`/
 * `@media` casam normalmente: o cabeçalho da at-rule não fecha antes da primeira `{` de
 * dentro, então a tentativa que começa nele falha e o motor avança para a regra interna.
 */
function regras(casa: RegExp): Array<{ seletor: string; corpo: string }> {
  const achadas: Array<{ seletor: string; corpo: string }> = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  // ⚠️ Sem tirar os comentários, o texto que antecede a regra entra no "seletor" — e os
  // comentários deste arquivo citam `::after` e nomes de classe o tempo todo.
  const limpo = css.replace(/\/\*[\s\S]*?\*\//g, '')
  let m = re.exec(limpo)
  while (m) {
    const seletor = (m[1] ?? '').trim()
    if (!seletor.startsWith('@') && casa.test(seletor)) {
      achadas.push({ seletor, corpo: m[2] ?? '' })
    }
    m = re.exec(limpo)
  }
  return achadas
}

/** Declara a propriedade `prop` neste corpo? (início da declaração, não substring.) */
function declara(corpo: string, prop: string): boolean {
  return new RegExp(`(^|;)\\s*${prop}\\s*:`).test(corpo)
}

const CHAVES = [
  '--pz-bg',
  '--pz-surface',
  '--pz-surface-2',
  '--pz-ink',
  '--pz-muted',
  '--pz-line',
  '--pz-accent',
  '--pz-gradient',
  '--pz-cta',
  '--pz-on-fill',
]

describe('pensa.css lê os tokens compartilhados', () => {
  const claro = bloco('.pensa-planner {')
  const escuro = bloco('.pensa-theme-dark {')

  for (const chave of CHAVES) {
    it(`${chave} aponta para um --sz-tool-* no claro e no escuro`, () => {
      const re = new RegExp(`${chave}:\\s*var\\(\\s*--sz-tool-`)
      expect(claro).toMatch(re)
      expect(escuro).toMatch(re)
    })
  }

  it('o círculo antigo do menu e a regra `> button` do detalhe morreram (venceriam a receita)', () => {
    expect(css).not.toContain('.pensa-round-btn')
    expect(css).not.toContain('.pensa-project-header > button')
  })

  it('as regras de ELEMENTO (sem camada) cedem a vez ao chrome compartilhado', () => {
    // Todas as receitas `.sz-tool-*` ficam fora, e pelo `:where()` (sem somar especificidade).
    // Sem isso, o `font: inherit` apagaria o peso das pílulas, o `min-height: 44px` deixaria o
    // quadrado do menu com 40x44 e a regra dos títulos tiraria o 800 do título da galeria.
    const fora = ':where(:not([class*="sz-tool-"]))'
    expect(css).toContain(`.pensa-planner :focus-visible${fora} {`)
    expect(css).toContain(`.pensa-planner button${fora} {`)
    expect(css).toContain(`.pensa-planner button${fora},\n.pensa-planner input,`)
    for (const tag of ['h1', 'h2', 'h3', 'h4']) {
      expect(css).toContain(`.pensa-planner ${tag}${fora}`)
    }
    // E nenhuma regra de botão, título ou foco SEM a exclusão: toda ocorrência do seletor de
    // elemento vem com ela (uma regra nova esquecida venceria as receitas em silêncio).
    const vezes = (texto: string) => css.split(texto).length - 1
    for (const seletor of [
      '.pensa-planner button',
      '.pensa-planner :focus-visible',
      '.pensa-planner h1',
      '.pensa-planner h2',
      '.pensa-planner h3',
      '.pensa-planner h4',
    ]) {
      expect(vezes(`${seletor}${fora}`)).toBe(vezes(`${seletor}`) - vezes(`${seletor}:disabled`))
    }
  })

  it('nenhum cabeçalho desconta mais o respiro: o menu é o quadrado dentro do conteúdo', () => {
    // A aba colada na linha da sidebar saiu em 11/09/2026 (o desenho das telas-modelo).
    expect(css).not.toContain('--sz-tool-inset')
  })

  it('color-mix sempre em oklab (em oklch o matiz gira e dá rosa)', () => {
    expect(css).not.toMatch(/color-mix\(in oklch/)
  })
})

// 19/09/2026, decisão dela: o cartão do plano NÃO é clicável. O "Continuar" tinha um `::after`
// de `inset: -1px` que esticava a área clicável até a borda ("clicar em qualquer ponto abre"), e
// com ele o cartão declarava `cursor: pointer`. Ela relatou o contrário do que o código dizia —
// "estou clicando no card e não está acontecendo nada; só quando clico em continuar que abre" —
// e pediu a mãozinha só nos botões. A camada saiu, e com ela o cursor do cartão e o `z-index` da
// lixeira, que existiam por causa dela. ⚠️⚠️ Isto REVOGA as travas de 17 e 18/09 (o inset como
// negativo da borda, o cursor no ancestral), escritas para matar o "cursor tremendo": sem camada
// esticada não há duas fronteiras arredondadas para o ponteiro atravessar, e a alternância deixa
// de ter causa em vez de ser compensada.
describe('o cartão do plano NÃO é clicável', () => {
  it('não existe camada esticando a área clicável de botão nenhum', () => {
    // O padrão inteiro sai junto: sem `::after` absoluto no botão, ninguém cobre o cartão.
    expect(css).not.toContain('.pensa-project-card__open::after')
    const doBotao = regras(/\.pensa-project-card__open/)
    expect(doBotao.length).toBeGreaterThan(0) // anti-vácuo: renomear a classe não zera o laço
    for (const regra of doBotao) {
      expect({ seletor: regra.seletor, tem: declara(regra.corpo, 'inset') }).toEqual({
        seletor: regra.seletor,
        tem: false,
      })
    }
  })

  it('NENHUMA regra do cartão declara cursor: a mãozinha é dos botões', () => {
    // ⚠️⚠️ Varre TODAS as regras do cartão, não só a de seletor exato (achado do full review de
    // 19/09/2026, provado por mutação): `.pensa-planner .pensa-project-card` é o idioma que o
    // resto deste arquivo usa para vencer a regra de elemento, e ele escapava de uma âncora
    // `/^…$/`. Com ela, devolver a mãozinha ao cartão passava verde — justo a regressão que o
    // lote inteiro existe para impedir.
    // ⚠ Pelo `regras()`, que TIRA os comentários: o comentário da regra explica a decisão
    // citando `cursor: pointer`, e uma leitura crua passaria por ele.
    const doCartao = regras(/\.pensa-project-card(?![\w-])/)
    expect(doCartao.length).toBeGreaterThan(0)
    for (const regra of doCartao) {
      expect({ seletor: regra.seletor, cursor: declara(regra.corpo, 'cursor') }).toEqual({
        seletor: regra.seletor,
        cursor: false,
      })
    }
    // Anti-vácuo: quem clica CONTINUA com a mãozinha. A lixeira declara a dela; o "Continuar"
    // herda da `.sz-tool-pill` do `tool-chrome.css`, que é receita compartilhada.
    const lixeira = bloco('.pensa-planner .pensa-project-card__remove {')
    expect(lixeira).toMatch(/cursor:\s*pointer/)
    // E o alvo não encolhe: a regra de elemento dos botões daria 44 de altura e 40 de largura.
    expect(lixeira).toMatch(/min-height:\s*var\(--sz-tool-hit/)
  })

  it('NENHUMA regra faz o "Continuar" andar: movimento só pode valer `none`', () => {
    // O motivo mudou com a camada, mas a regra fica: a pílula vive dentro das faixas
    // (`.sz-tool-bands`), onde a receita compartilhada sobe a peça 1px no hover — e esta é a
    // pílula que mora na moldura do cartão onde ela relatou o cursor tremendo TRÊS vezes. O
    // relevo (a sombra) fica; o movimento, não. Decisão de risco, não de medição.
    // ⚠️ Varre TODAS as regras do botão, e não só o primeiro bloco (achado do full review de
    // 19/09/2026): uma regra posterior com mais especificidade devolveria o 1px em silêncio.
    const doBotao = regras(/\.pensa-project-card__open(?![\w-])/)
    expect(doBotao.length).toBeGreaterThan(0)
    for (const regra of doBotao) {
      for (const prop of ['transform', 'translate', 'rotate', 'scale', 'perspective']) {
        // ⚠ Nada de `new RegExp` com template aqui: `\s` dentro de uma template string vira
        // só "s", o regex nunca casa e o teste fica verde com o movimento de volta (foi o que
        // aconteceu na primeira versão deste caso, pega na prova por mutação).
        const valor = regra.corpo
          .split(';')
          .map((declaracao) => declaracao.split(':'))
          .find(([nome]) => (nome ?? '').trim() === prop)?.[1]
        if (valor) {
          expect({ seletor: regra.seletor, prop, valor: valor.trim() }).toEqual({
            seletor: regra.seletor,
            prop,
            valor: 'none',
          })
        }
      }
    }
    // E a regra que zera o movimento existe mesmo, fora de camada (senão as receitas venceriam).
    const regra = bloco('.pensa-project-card__open:is(:hover, :active) {')
    expect(regra).toMatch(/transform:\s*none/)
    expect(regra).toMatch(/translate:\s*none/)
    const antes = css
      .slice(0, css.indexOf('.pensa-project-card__open:is(:hover, :active)'))
      .replace(/\/\*[\s\S]*?\*\//g, '')
    expect(antes).not.toMatch(/@layer\s+[\w-]+\s*\{/)
  })

  it('só quem CLICA declara cursor: a mãozinha não volta para o cartão', () => {
    // ⚠️⚠️ Isto SUBSTITUI a régua de 18/09 ("nenhuma regra desta folha pede seta"), que existia
    // por causa da camada esticada: qualquer ponto que escapasse dela virava seta, então `auto`
    // era o inimigo. Sem a camada o mundo inverteu — `auto` é o certo no cartão, e `pointer`
    // fora de um botão é que passou a ser a mentira. Achado do full review de 19/09/2026: a
    // versão antiga, mantida, LIBERAVA a regressão que o lote inteiro veio impedir.
    const comCursor = regras(/./).filter(({ corpo }) => declara(corpo, 'cursor'))
    expect(comCursor.length).toBeGreaterThan(3)
    for (const regra of comCursor) {
      const valor = regra.corpo
        .split(';')
        .map((declaracao) => declaracao.split(':'))
        .find(([nome]) => (nome ?? '').trim() === 'cursor')?.[1]
        ?.trim()
      // "Quem clica" = um botão, por tag ou pelo nome da peça. O cartão e os selos não entram.
      const ehBotao = /(button|summary|__open|__remove)/.test(regra.seletor)
      expect({ seletor: regra.seletor, valor, ehBotao }).toEqual({
        seletor: regra.seletor,
        valor: valor === 'not-allowed' ? 'not-allowed' : 'pointer',
        ehBotao: true,
      })
    }
  })
})
