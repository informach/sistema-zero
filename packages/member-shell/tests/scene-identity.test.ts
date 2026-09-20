import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
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

// ⚠️ Sem o `exploration-stage.tsx` desde o lote 5 do Raio-X: ele deixou de desenhar (as últimas
// quatro cenas do palco compartilhado ganharam palco próprio) e só DESPACHA para os palcos.
const PALCOS = [
  'scene-stages.tsx',
  'scene-art-stages.tsx',
  'scene-core-stages.tsx',
  // Lote 5 do Raio-X (G4): o ateliê de O Jogo do Meu Jeito, as sete cenas de desenho.
  'scene-atelie-stages.tsx',
  'scene-world-stage.tsx',
  // ⚠️⚠️ O SEXTO cromo, achado no full review: as quatro cenas de salto e colisão desenhavam a
  // própria moldura (na verdade nem isso — um `rounded-2xl` sem borda nenhuma), e são as mais
  // usadas do Corre Dino. Ele não estava nesta lista, então o contrato do palco único não o
  // alcançava — e a galeria das 45 mostrava para elas um palco que a criança nunca vê.
  'experience-scene.tsx',
  // Lote 5 do Raio-X: o Corre Dino, primeira metade, saiu do palco compartilhado.
  'scene-dino-stages.tsx',
  // Lote 5 do Raio-X: o Corre Dino, segunda metade (reiniciar, placar, sorteio e aceleração).
  'scene-dino-numbers-stages.tsx',
  // Lote 5 do Raio-X (G6): o motor (reciclagem, estado, tempo, círculos) e a porta do 3D.
  'scene-motor-stages.tsx',
  'scene-3d-stages.tsx',
  // Lote 5 do Raio-X (G5): o núcleo do Iniciante 2D (a tecla, o laço, a ficha, a câmera, o encosto,
  // os tiros, a mira, a diagonal e o mapa).
  'scene-nucleo-stages.tsx',
] as const

/** As bancadas: os controles de cada cena. */
const BANCADAS = [
  'scene-lesson-controls.tsx',
  'scene-core-controls.tsx',
  // Lote 5 do Raio-X (G4): o ateliê, com os nomes do Pinta.
  'scene-atelie-controls.tsx',
  // Lote 5 do Raio-X: a ordem de desenhar, as marcas do impulso e a peça que muda de caixa.
  'scene-dino-controls.tsx',
  // Lote 5 do Raio-X: o toque na tela, a próxima tela, os sorteios e o relógio de 5 segundos.
  'scene-dino-numbers-controls.tsx',
  // Lote 5 do Raio-X (G6): o motor e a porta do 3D.
  'scene-motor-controls.tsx',
  // Lote 5 do Raio-X (G5): a tecla que se segura, o "Andar", o "Atirar" e o "Andar 1 segundo".
  'scene-nucleo-controls.tsx',
] as const

const CROMO = [
  'scene-activity.tsx',
  'scene-core-controls.tsx',
  'scene-atelie-controls.tsx',
  // ⚠️ Lote 2 do Raio-X: as peças que saíram do player continuam sendo cromo, e a régua as alcança.
  'scene-frame.tsx',
  'scene-prediction.tsx',
  'scene-conclusion.tsx',
  'scene-dino-controls.tsx',
  'scene-dino-numbers-controls.tsx',
  'scene-motor-controls.tsx',
  // Lote 5 do Raio-X (G5).
  'scene-nucleo-controls.tsx',
] as const

/**
 * ⚠️ O par de comparação SOBREVIVE no cromo, e é o que separa esta regra de uma repintura.
 * Azul e âmbar (e o vermelho do encosto) não são decoração: eles dizem QUAL medida é qual, no
 * palco, na faixa de estado e no rótulo do controle logo abaixo. Se o cromo os trocasse pelos
 * tokens do app, a leitura da descoberta se desfaria no meio.
 */
// ⚠️ `leaf` entrou nos consertos do review da onda B do lote 5 (G6): na `axis-z` o verde é o EIXO y (as
// cores do AxesHelper do Estúdio), e a faixa e a bancada pintam cada número com a cor do seu eixo. É
// sentido, não paisagem; o contraste sobre o cartão dos dois apps está em `scene-motor-3d-consertos-5b`.
const SENTIDO = /^(a|b|b-ink|a-wash|b-wash|alert|alert-wash|leaf)$/

const fonte = (arquivo: string) =>
  readFileSync(join(import.meta.dir, '../src/components', arquivo), 'utf8')

describe('cromo é do app, mundo é da cena', () => {
  test('⚠️⚠️ as listas à mão são a PASTA inteira: palco ou bancada novos entram sozinhos na régua', () => {
    // Full review de 16/09/2026 (M10): as listas acima eram mantidas à mão, e um arquivo de palco ou de
    // bancada que ninguém lembrasse de acrescentar ficava FORA de todas as varreduras deste arquivo
    // (moldura única, `Texto` do palco, tokens do cromo), em silêncio.
    const pasta = readdirSync(join(import.meta.dir, '../src/components'))
    const palcos = pasta.filter(
      (f) => /^scene-.+-stages?\.tsx$/.test(f) || f === 'scene-stages.tsx',
    )
    const palcosListados: readonly string[] = PALCOS
    expect(palcosListados.filter((f) => f !== 'experience-scene.tsx').sort()).toEqual(palcos.sort())
    const bancadas = pasta.filter((f) => /^scene-.+-controls\.tsx$/.test(f))
    const bancadasListadas: readonly string[] = BANCADAS
    expect([...bancadasListadas].sort()).toEqual(bancadas.sort())
    // O cromo alcança toda bancada.
    const cromo: readonly string[] = CROMO
    for (const bancada of bancadas.filter((f) => f !== 'scene-lesson-controls.tsx'))
      expect(cromo, bancada).toContain(bancada)
  })

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

  test('⚠️⚠️ todo texto de palco passa pela LETRA do palco (`Texto`), e nunca por `fontSize` literal', () => {
    /**
     * Conserto "letra no celular" (16/09/2026): os palcos são SVG escalados para a largura da coluna, e
     * um `fontSize="13"` escrito à mão vira 6,8px num celular de 390px. O `Texto` do `scene-canvas` passa
     * o tamanho por `palco.letra`, que garante `PISO_DA_LETRA` na tela. A varredura das 45 cenas
     * (`scene-letra-celular.test.tsx`) mede o que foi desenhado; esta cobra a porta no código, para um
     * texto novo que só aparece num estado que as varreduras não visitam.
     */
    for (const arquivo of PALCOS) {
      const codigo = fonte(arquivo)
      expect(codigo, arquivo).not.toMatch(/<text[\s>]/)
      expect(codigo, arquivo).not.toMatch(/fontSize=/)
    }
    // Anti-vácuo: os palcos escrevem, e escrevem pelo `Texto`.
    expect(PALCOS.map(fonte).join('\n')).toMatch(/<Texto[\s\S]{0,200}tamanho=\{/)
  })

  test('⚠️⚠️ o palco compartilhado ACABOU: o `ExplorationStage` só despacha', () => {
    /**
     * O mapa de selos (`STAGE_LABEL`) tinha 30 entradas e 25 estavam MORTAS: cada cena que ganhou
     * palco próprio deixava o rótulo para trás. No lote 5 do Raio-X as últimas quatro que caíam no
     * palco compartilhado (`restart`, `score`, `random`, `acceleration`) ganharam palco próprio, e o
     * desenho comum saiu inteiro. Um `<svg>`, um `SceneCanvas` ou um selo escrito aqui é um palco
     * compartilhado nascendo de novo, com a pista que servia para nenhuma das cenas.
     */
    const palco = fonte('exploration-stage.tsx')
    expect(palco).not.toContain('STAGE_LABEL')
    expect(palco).not.toContain('<SceneCanvas')
    expect(palco).not.toMatch(/<svg\b/)
    // Anti-vácuo: o despacho continua aqui, e chega às quatro da segunda metade do Corre Dino.
    for (const palcoProprio of ['RestartStage', 'ScoreStage', 'RandomStage', 'AccelerationStage'])
      expect(palco).toContain(`<${palcoProprio}`)
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
    // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5): depois de criar, o botão FICA,
    // fechado e discreto, em vez de virar um `<p>` (o foco caía no `body`). Antes de criar, `gesto`.
    expect(criar.slice(0, 400)).toMatch(
      /tom="gesto"|tom=\{state\.world\.created \? 'discreta' : 'gesto'\}/,
    )
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
