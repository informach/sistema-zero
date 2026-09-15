import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * "Cromo é do APP, mundo é da CENA" — a decisão de desenho do lote 3, como regra.
 *
 * ⚠️⚠️ A dona abriu a Aula 1 em staging e disse que a cena estava "bem destoante do visual da
 * comunidade". A medição mostrou onde: a paleta `--color-scene-*` foi desenhada para ser uma
 * ILUSTRAÇÃO autônoma (papel creme, tinta oliva) e tinha vazado para o CROMO — a faixa de estado
 * usava o cartão creme com a linha oliva, encostada num app que é branco com linha azulada. Era
 * o único elemento de outra família visual em contato com o conteúdo.
 *
 * A regra tem uma direção só, e é deliberado:
 *  - **O cromo não veste a cena.** A moldura, a faixa, a bancada, a frase, o rodapé e o cartão
 *    de conclusão usam os tokens do APLICATIVO (`card`, `border`, `foreground`, `primary`) —
 *    assim a cena entra na identidade do kids e do adulto sem cada um ter regra própria.
 *  - **O mundo continua ilustrado.** Dentro do palco, `--color-scene-*` manda. A cena é o
 *    retrato de um JOGO: pintá-la de branco e azul a transformaria num formulário.
 *
 * Não se enforça o contrário (mundo sem token do app) porque os arquivos de palco também
 * carregam pedaços de cromo legítimos: a alça de arraste que fica POR CIMA do SVG, a frase
 * embaixo do desenho, o campo de texto do leitor de tela. Uma regra bidirecional reprovaria os
 * três e ensinaria a desligar o teste.
 */

const PALCOS = [
  'exploration-stage.tsx',
  'scene-stages.tsx',
  'scene-art-stages.tsx',
  'scene-core-stages.tsx',
  'scene-engine-stages.tsx',
  'scene-world-stage.tsx',
  // ⚠️⚠️ O SEXTO cromo, achado no full review: as quatro cenas de salto e colisão desenhavam a
  // própria moldura (na verdade nem isso — um `rounded-2xl` sem borda nenhuma), e são as mais
  // usadas do Corre Dino. Ele não estava nesta lista, então o contrato do palco único não o
  // alcançava — e a galeria das 45 mostrava para elas um palco que a criança nunca vê.
  'experience-scene.tsx',
] as const

/** As bancadas: os controles de cada cena. */
const BANCADAS = [
  'scene-lesson-controls.tsx',
  'scene-core-controls.tsx',
  'scene-engine-controls.tsx',
] as const

const CROMO = [
  'scene-activity.tsx',
  'scene-core-controls.tsx',
  'scene-engine-controls.tsx',
] as const

/**
 * ⚠️ O par de comparação SOBREVIVE no cromo, e é o que separa esta regra de uma repintura.
 * Azul e âmbar (e o vermelho do encosto) não são decoração: eles dizem QUAL medida é qual, no
 * palco, na faixa de estado e no rótulo do controle logo abaixo. Se o cromo os trocasse pelos
 * tokens do app, a leitura da descoberta se desfaria no meio.
 */
const SENTIDO = /^(a|b|b-ink|a-wash|b-wash|alert|alert-wash)$/

const fonte = (arquivo: string) =>
  readFileSync(join(import.meta.dir, '../src/components', arquivo), 'utf8')

describe('cromo é do app, mundo é da cena', () => {
  test('⚠️⚠️ nenhum arquivo de cromo veste o papel nem a tinta da cena', () => {
    const achados: string[] = []
    for (const arquivo of CROMO)
      for (const m of fonte(arquivo).matchAll(
        /\b(?:bg|text|border|fill|stroke|ring|from|to)-scene-([a-z-]+)/g,
      )) {
        const token = m[1] ?? ''
        if (!SENTIDO.test(token)) achados.push(`${arquivo}: ${m[0]}`)
      }
    expect(achados).toEqual([])
  })

  test('a varredura mede alguma coisa: o par de comparação continua no cromo', () => {
    // Anti-vácuo. Um regex que não casa nada passaria no teste acima para sempre, inclusive
    // depois de alguém devolver o creme para a faixa.
    const tudo = CROMO.map(fonte).join('\n')
    expect(tudo).toMatch(/\btext-scene-(a|b-ink)\b/)
  })

  test('⚠️⚠️ o PALCO é um só: nenhuma família desenha a própria moldura', () => {
    // Havia CINCO cromos de palco, e três chamavam a própria cópia de `Moldura`: a caixa, o
    // `<svg role="img">`, o `<title>`/`<desc>` e o rodapé de legenda, repetidos. Enquanto foi
    // assim, ajustar o desenho custava cinco edições — e é por isso que a faixa cortada só foi
    // consertada numa família e a caixa vazia sobreviveu a quatro revisões.
    for (const arquivo of PALCOS) {
      const css = fonte(arquivo)
      expect(css, arquivo).toContain('<SceneCanvas')
      // Um `<svg role="img">` escrito aqui é uma moldura nova nascendo.
      expect(css, arquivo).not.toContain('role="img"')
      expect(css, arquivo).not.toMatch(/rounded-2xl[^"'`]*\bbg-scene-ground\b/)
    }
  })

  test('⚠️⚠️ o selo do palco compartilhado só nomeia quem CAI nele', () => {
    /**
     * O mapa tinha 30 entradas e 25 estavam MORTAS: cada cena que ganhou palco próprio deixou o
     * rótulo dela para trás, e quem fosse reescrever "O salto do Dino" mudaria um texto que
     * ninguém lê. A varredura deriva os dois lados do CÓDIGO (os `if (m === …)` que devolvem
     * palco próprio e a lista do laboratório), nunca de uma segunda lista escrita aqui.
     */
    const palco = fonte('exploration-stage.tsx')
    const proprios = new Set(
      [...palco.matchAll(/if \(m === '([a-z0-9-]+)'\)/g)].map((m) => m[1] as string),
    )
    for (const s of ['gravity', 'impulse', 'hitbox', 'jump-sound']) proprios.add(s)
    const mapa = palco.slice(palco.indexOf('const STAGE_LABEL'))
    // ⚠️ O corpo do mapa vai até a primeira chave de fecho: nenhum valor dele tem `}` dentro.
    const corpo = mapa.slice(0, mapa.indexOf('}'))
    const rotulos = [...corpo.matchAll(/^ {2}'?([a-z0-9-]+)'?: '/gm)].map((m) => m[1] as string)
    expect(rotulos.length).toBeGreaterThan(0)
    expect(rotulos.filter((r) => proprios.has(r))).toEqual([])
  })

  test('⚠️ o enquadramento é por FAMÍLIA, e quem foge do comum diz o seu', () => {
    // Unificar o `viewBox` não é mudar um número: as centenas de coordenadas dos `d="…"` de cada
    // desenho estão nas unidades da família dela, então seria redesenhar 45 cenas. O que dá para
    // travar é que ninguém emoldure um desenho numa caixa de outro tamanho — o defeito que quase
    // passou nos cinco palcos do ateliê, 40 unidades mais baixos que o comum.
    for (const arquivo of PALCOS) {
      const css = fonte(arquivo)
      if (/const (VIEW|STAGE) = \{/.test(css)) expect(css, arquivo).toMatch(/view=\{/)
    }
  })

  test('⚠️⚠️ o controle da cena é o Button do app, e não um <button> com classes próprias', () => {
    // É o seletor `button[data-slot="button"]` que dá a TODO controle do kids o relevo 3D do
    // Brilliant. Sem ele, os botões da cena eram os únicos chapados da tela — e isso lê como
    // "outro aplicativo" mais do que qualquer cor.
    const palco = fonte('exploration-stage.tsx')
    const trecho = palco.slice(palco.indexOf('export function SceneButton'))
    expect(trecho.slice(0, 900)).toContain('<Button')
    // E o TOM entra por variante, nunca por uma classe de fundo no call site: o `cn` é
    // tailwind-merge, então `bg-primary` escrito lá APAGA a classe da variante — e com ela o
    // seletor que o app usa para dar o relevo.
    for (const arquivo of CROMO) expect(fonte(arquivo), arquivo).not.toMatch(/!bg-/)
  })

  test('⚠️⚠️ a cena `world` tem o GESTO em destaque', () => {
    /**
     * É o botão do print que abriu este trabalho: "＋ Criar Dino" — a ação que MOVE a cena —
     * era um botãozinho de ferramenta dentro de uma caixa tracejada, enquanto "Ver de novo" era
     * o azul grande do rodapé. A criança abria a PRIMEIRA experimentação do curso carro-chefe e
     * o caminho para a frente era a coisa mais fraca da tela.
     */
    const pecas = fonte('exploration-pieces.tsx')
    const criar = pecas.slice(pecas.indexOf("dispatch({ type: 'create' })") - 300)
    expect(criar.slice(0, 400)).toContain(`tom="gesto"`)
  })

  test('⚠️⚠️ os três TONS existem e são usados', () => {
    /**
     * Foi o defeito que o próprio lote introduziu, e a razão deste teste: ao trocar as classes
     * `!bg-primary` por variantes, dois call sites ficaram SEM tom — e a ação em DESTAQUE do
     * rodapé ("Já descobri" / "Ver de novo") virou botão de ferramenta, que é exatamente a
     * inversão de hierarquia que o lote existe para consertar.
     *
     * ⚠️ O que dá para travar aqui é o vocabulário, não cada call site: o tom certo em cada botão
     * é decisão de desenho, e um teste que tentasse adivinhar isso viraria uma segunda lista de
     * cenas para manter em dia — o defeito que o lote 3 inteiro ataca.
     */
    const palco = fonte('exploration-stage.tsx')
    for (const tom of ['ferramenta', 'discreta', 'ligado', 'gesto'])
      expect(palco, `o tom ${tom} sumiu da tabela`).toContain(`${tom}:`)
    const tudo = CROMO.map(fonte).join(' ')
    // ⚠️ As duas formas de escrever a prop: `tom="gesto"` no caso fixo e `tom={x ? 'ligado' : …}`
    // no caso de estado.
    for (const tom of ['gesto', 'ligado', 'discreta'])
      expect(tudo, `nenhum controle usa o tom ${tom}`).toMatch(new RegExp(`tom="${tom}"|'${tom}'`))
  })
})

describe('a bancada tem um vocabulário só', () => {
  test('⚠️⚠️ toda medida é a peça `Medida`, com os botões de passo', () => {
    /**
     * A régua desta casa é que toque, teclado e leitor de tela levem ao MESMO lugar. As vinte e
     * uma cenas com bancada própria tinham os botões −/+; as QUATORZE que moravam dentro do
     * player escreviam `<label><input type="range">` à mão e não tinham nenhum. Era a régua se
     * perdendo numa cópia que ninguém comparou — que é como ela sempre se perde.
     */
    for (const arquivo of BANCADAS) {
      expect(fonte(arquivo), arquivo).not.toContain('type="range"')
      expect(fonte(arquivo), arquivo).toContain('<Medida')
    }
  })

  test('⚠️ as peças moram num lugar só, e o player não tem bancada', () => {
    for (const arquivo of BANCADAS)
      expect(fonte(arquivo), arquivo).not.toMatch(/function (Medida|Chave|Escolha)\b/)
    const vocabulario = fonte('scene-bench.tsx')
    for (const peca of ['Medida', 'Chave', 'Escolha'])
      expect(vocabulario, `a peça ${peca} sumiu do vocabulário`).toContain(
        `export function ${peca}`,
      )
    // O player carrega sessão, gravação, previsão, pergunta anexa e rodapé. Quatorze bancadas
    // ali dentro fizeram dele um arquivo de 1.900 linhas que ninguém lia inteiro — foi assim
    // que a caixa de botões vazia sobreviveu a quatro revisões.
    const player = fonte('scene-activity.tsx')
    expect(player).not.toContain('type="range"')
    for (const peca of ['<Medida', '<Chave', '<Escolha']) expect(player).not.toContain(peca)
  })
})
