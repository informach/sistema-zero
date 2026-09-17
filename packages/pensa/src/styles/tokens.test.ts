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

// Full review de 11/09/2026: o "Continuar" do cartão do plano estica a área clicável para o
// cartão inteiro por um `::after`. Se o botão andar (`transform` do aperto da pílula, ou o
// `translate` do relevo das galerias), ele vira o bloco de referência do `::after`, que encolhe
// para o tamanho da pílula no meio do gesto: o clique solta no cartão e o plano não abre
// (medido no navegador). A regra que o segura fica FORA de camada, para vencer as receitas.
describe('o cartão do plano abre em qualquer ponto', () => {
  it('o botão com a área esticada não anda no hover nem no aperto', () => {
    const regra = bloco('.pensa-project-card__open:is(:hover, :active) {')
    expect(regra).toMatch(/transform:\s*none/)
    expect(regra).toMatch(/translate:\s*none/)
    expect(css).toContain('.pensa-project-card__open::after {')
    // Nenhuma `@layer` de verdade antes da regra (os comentários citam a camada das receitas).
    const antes = css
      .slice(0, css.indexOf('.pensa-project-card__open:is(:hover, :active)'))
      .replace(/\/\*[\s\S]*?\*\//g, '')
    expect(antes).not.toMatch(/@layer\s+[\w-]+\s*\{/)
  })

  it('a área esticada cobre a MOLDURA: o inset é o negativo da borda, e o raio é o mesmo', () => {
    // 17/09/2026: com `inset: 0` a camada parava no padding box e a borda de 1px do cartão virava
    // uma faixa onde o ponteiro saía dela e voltava (cursor piscando entre seta e mãozinha, e o
    // clique na beirada não abria o plano). Medido no playground: 1px nas arestas, 1,41px na
    // diagonal dos cantos. A camada tem que ser a caixa de BORDA, e o raio o externo.
    const cartao = bloco('.pensa-project-card {')
    const camada = bloco('.pensa-project-card__open::after {')
    const borda = /border:\s*(\d+)px\s+solid/.exec(cartao)?.[1]
    expect(borda).toBeDefined()
    // ⚠️ O inset é ancorado nas QUATRO bordas (`-1px` e ponto final). Sem o `;` no fim,
    // `inset: -1px 0 0 0` passava e deixava a faixa morta nos outros três lados.
    expect(camada).toMatch(new RegExp(`inset:\\s*-${borda}px\\s*;`))
    const raio = /border-radius:\s*([^;]+);/.exec(cartao)?.[1]?.trim()
    expect(raio).toBeDefined()
    expect(camada).toContain(`border-radius: ${raio}`)
  })

  it('a borda do cartão é declarada UMA vez: um override posterior quebraria o par', () => {
    // O `-1px` é o negativo da borda declarada em `.pensa-project-card`. Uma regra
    // posterior com mais especificidade (`.pensa-planner .pensa-project-card`) mudaria a
    // borda sem que a comparação acima visse — o teste lia só o primeiro bloco.
    const doCartao = regras(/\.pensa-project-card(?![\w-])/)
    expect(doCartao.length).toBeGreaterThan(0)
    const comBorda = doCartao.filter(
      (regra) => declara(regra.corpo, 'border') || declara(regra.corpo, 'border-width'),
    )
    expect(comBorda.map((regra) => regra.seletor)).toEqual(['.pensa-project-card'])
  })

  it('o cartão não recorta nada: `overflow` cortaria o -1px em silêncio', () => {
    // O plano RECUSOU `overflow: hidden` no cartão justamente por isso, e nenhum teste via.
    for (const regra of regras(/\.pensa-project-card(?![\w-])/)) {
      expect(declara(regra.corpo, 'overflow')).toBe(false)
      expect(declara(regra.corpo, 'overflow-x')).toBe(false)
      expect(declara(regra.corpo, 'overflow-y')).toBe(false)
    }
  })

  it('nada torna o BOTÃO o bloco de referência: a camada encolheria para a pílula', () => {
    // `transform`/`translate` já estão travados no teste acima, mas `position`, `contain`,
    // `filter` e `will-change` fazem o MESMO estrago e escapavam: com
    // `.pensa-project-card__open { position: relative }` os oito pontos do cartão viram
    // `null` (medido no navegador) e o defeito volta inteiro.
    const proibidas = ['position', 'contain', 'filter', 'backdrop-filter', 'will-change']
    const doBotao = regras(/\.pensa-project-card__open(?![\w-])/).filter(
      (regra) => !regra.seletor.includes('::after'),
    )
    expect(doBotao.length).toBeGreaterThan(0)
    for (const regra of doBotao) {
      for (const prop of proibidas) {
        expect({ seletor: regra.seletor, prop, declara: declara(regra.corpo, prop) }).toEqual({
          seletor: regra.seletor,
          prop,
          declara: false,
        })
      }
      // E o que mexe o botão só pode valer `none`.
      for (const prop of ['transform', 'translate', 'rotate', 'scale', 'perspective']) {
        const valor = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(regra.corpo)?.[1]
        if (valor) expect(valor.trim()).toBe('none')
      }
    }
  })

  it('a lixeira sobe acima da área esticada, senão existe sem nunca receber um clique', () => {
    // A MESMA camada invisível que faz o cartão inteiro abrir engole qualquer botão novo
    // do cartão: ela é pintada depois. Sem `position` + `z-index` aqui, o defeito é mudo —
    // o botão aparece, o hover responde, e o clique abre o plano em vez de apagar.
    const regra = bloco('.pensa-planner .pensa-project-card__remove {')
    expect(regra).toMatch(/position:\s*relative/)
    expect(regra).toMatch(/z-index:\s*[1-9]/)
    // E o alvo não encolhe: a regra de elemento dos botões daria 44 de altura e 40 de largura.
    expect(regra).toMatch(/min-height:\s*var\(--sz-tool-hit/)
  })
})
