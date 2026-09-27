/**
 * Ponte de tokens (07/09/2026): os tokens-chave do Pinta LEEM os semânticos `--sz-tool-*` de
 * `@sistemazero/ui/tool-chrome.css` (um valor só para Pinta, Estúdio e Pensa) no claro E no
 * escuro, com o fallback de sempre por baixo. Lido como texto: uma folha se prova pela forma.
 */
import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'

const css = await Bun.file(join(import.meta.dir, 'pinta.css')).text()

const CHAVES = [
  '--color-pin-bg',
  '--color-pin-surface',
  '--color-pin-border',
  '--color-pin-text',
  '--color-pin-muted',
  '--color-pin-text-soft',
  '--color-pin-accent',
  '--color-pin-accent-fg',
  '--pin-gradient',
  '--pin-cta',
]

describe('pinta.css lê os tokens compartilhados', () => {
  for (const chave of CHAVES) {
    it(`${chave} aponta para um --sz-tool-* no claro e no escuro`, () => {
      // `\s*` depois de `var(`: o biome quebra os valores longos em várias linhas.
      const usos = [...css.matchAll(new RegExp(`${chave}:\\s*var\\(\\s*(--sz-tool-[\\w-]+)`, 'g'))]
      expect(usos.length).toBe(2)
    })
  }

  it('color-mix sempre em oklab (em oklch o matiz gira e dá rosa)', () => {
    expect(css).not.toMatch(/color-mix\(in oklch/)
  })
})

/**
 * 18/09/2026 — "quando seleciono um objeto e arrasto, se tiver texto, ele fica selecionado".
 *
 * MEDIDO no playground com o ponteiro de verdade: um arrasto que começa na área do editor grifa
 * os rótulos das dicas, da caixa e dos painéis — e a seleção termina no `<text>` do próprio
 * desenho, que é o "texto" da queixa. A correção de 06/09 leu o mesmo relato como o objeto de
 * texto entrando no laço e consertou aquilo; este é o outro andar, e até agora o pacote inteiro
 * não tinha uma linha de `user-select`.
 */
describe('a área de trabalho não entra na seleção de texto do navegador', () => {
  // ⚠⚠ Compara o seletor NORMALIZADO (achado do full review de 18/09/2026): o biome quebra
  // seletor longo em várias linhas, e o `trim()` sozinho não alcança a quebra do MEIO — a regra
  // "não encontrada" deixou o arquivo vermelho assim que o seletor dos campos cresceu.
  const norma = (texto: string): string => texto.trim().replace(/\s+/g, ' ')

  /** Todas as regras da folha, sem comentários, com a POSIÇÃO de cada uma. */
  function regras(): Array<{ seletor: string; corpo: string; em: number }> {
    const limpo = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const re = /([^{}]+)\{([^{}]*)\}/g
    const achadas: Array<{ seletor: string; corpo: string; em: number }> = []
    let m = re.exec(limpo)
    while (m) {
      achadas.push({ seletor: norma(m[1] ?? ''), corpo: m[2] ?? '', em: m.index })
      m = re.exec(limpo)
    }
    return achadas
  }

  function regraDe(seletor: string): { seletor: string; corpo: string; em: number } {
    const achada = regras().find((regra) => regra.seletor === norma(seletor))
    if (!achada) throw new Error(`regra não encontrada: ${seletor}`)
    return achada
  }

  function corpoDe(seletor: string): string {
    return regraDe(seletor).corpo
  }

  it('a ÁREA declara `user-select: none`, com o prefixo do WebKit junto', () => {
    // ⚠️ Lido SEM os comentários: o comentário desta regra explica o defeito citando
    // `user-select: none`, e um teste que lesse o texto cru passaria sem a declaração existir.
    const corpo = corpoDe('[data-pinta-theme] .pin-work')
    expect(corpo).toMatch(/(?:^|;)\s*user-select:\s*none/)
    // O iPad é o alvo principal do Pinta; sem o prefixo o Safari antigo segue grifando.
    expect(corpo).toMatch(/(?:^|;)\s*-webkit-user-select:\s*none/)
  })

  it('a regra fica FORA de camada: a utilitária `select-none` perderia sozinha', () => {
    // O arquivo inteiro é sem `@layer` de propósito (é o que faz ele vencer as utilitárias).
    // Se um dia alguém embrulhar a folha numa camada, esta trava avisa antes do defeito voltar.
    expect(css).not.toMatch(/@layer\s+[\w-]+\s*\{/)
  })

  it('e os campos VOLTAM a ser selecionáveis: `none` herdado num input trava a digitação', () => {
    // ⚠⚠ É o preço de a regra morar na área inteira — e ela mora ali porque, só no palco, os
    // rótulos em volta continuavam azuis (medido). Sem a devolução, a criança perde o clique
    // duplo e o arrastar dentro do nome do desenho e do campo do hex.
    // ⚠ O seletor é procurado NORMALIZADO, então ele pode quebrar de linha à vontade.
    const corpo = corpoDe(
      '[data-pinta-theme] .pin-work :is(input, textarea, [contenteditable]:not([contenteditable="false"]))',
    )
    expect(corpo).toMatch(/(?:^|;)\s*user-select:\s*text/)
    expect(corpo).toMatch(/(?:^|;)\s*-webkit-user-select:\s*text/)
  })

  it('a devolução aceita `contenteditable` SEM valor e `plaintext-only`', () => {
    // ⚠ `[contenteditable="true"]` era estrito demais: o atributo vale sem valor nenhum e
    // também como `plaintext-only`, e a forma estrita deixaria os dois de fora. Hoje o pacote
    // não tem nenhum, mas o dia em que tiver não pode ser o dia em que a digitação trava.
    const dosCampos = regras().find((regra) => /user-select:\s*text/.test(regra.corpo))
    expect(dosCampos?.seletor).toContain('[contenteditable]:not([contenteditable="false"])')
    expect(dosCampos?.seletor).not.toContain('[contenteditable="true"]')
  })
})
