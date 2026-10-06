import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

/**
 * Máquina compartilhada dos guardas de COPY (`copy-sem-travessao`, `copy-vocabulario`).
 *
 * Os dois precisam da mesma coisa: ler o `src/` e olhar só o que o USUÁRIO lê, descartando
 * comentários (esses são nossos e podem falar o vocabulário que quisermos). Duplicar a máquina
 * de estados em cada guarda daria dois detectores que envelhecem separados.
 */

export const SRC = join(import.meta.dir, '..', '..', 'src')

/**
 * Arquivos que NÃO falam com o usuário. `instrumentation.ts` só monta mensagem de erro de
 * BOOT, lida por quem opera o deploy no log do Railway.
 */
const FORA = new Set(['instrumentation.ts'])

export function listarFontes(dir: string = SRC, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      listarFontes(full, out)
      continue
    }
    if (!/\.tsx?$/.test(entry) || FORA.has(entry)) continue
    out.push(full)
  }
  return out
}

export interface LinhaVisivel {
  linha: number
  texto: string
}

/**
 * Tira comentários linha a linha, guardando o estado de bloco aberto (os comentários JSX
 * `{/* … *\/}` deste código são multi-linha). ⚠️ `//` só conta como comentário quando NÃO
 * vem logo depois de `:` — senão `https://…` cortaria o resto da linha e esconderia texto
 * de verdade depois dele.
 */
export function linhasVisiveis(fonte: string): LinhaVisivel[] {
  const saida: LinhaVisivel[] = []
  let emBloco = false
  fonte.split('\n').forEach((original, i) => {
    let linha = original
    let limpa = ''
    while (linha.length > 0) {
      if (emBloco) {
        const fim = linha.indexOf('*/')
        if (fim === -1) return
        linha = linha.slice(fim + 2)
        emBloco = false
        continue
      }
      const abre = linha.indexOf('/*')
      const inline = linha.search(/(?<!:)\/\//)
      if (abre !== -1 && (inline === -1 || abre < inline)) {
        limpa += linha.slice(0, abre)
        linha = linha.slice(abre + 2)
        emBloco = true
        continue
      }
      if (inline !== -1) {
        limpa += linha.slice(0, inline)
        break
      }
      limpa += linha
      break
    }
    if (limpa.trim().length > 0) saida.push({ linha: i + 1, texto: limpa.trim() })
  })
  return saida
}

/** Varre o `src/` inteiro e devolve `caminho:linha → trecho` de cada linha que casa. */
export function varrerCopy(casa: (texto: string) => boolean): string[] {
  const achados: string[] = []
  for (const arquivo of listarFontes()) {
    for (const { linha, texto } of linhasVisiveis(readFileSync(arquivo, 'utf8'))) {
      if (!casa(texto)) continue
      achados.push(`${arquivo.slice(arquivo.indexOf('src'))}:${linha} → ${texto.slice(0, 90)}`)
    }
  }
  return achados
}

export interface LiteralVisivel {
  linha: number
  texto: string
  /**
   * Quem recebe o texto, quando isso decide se ele é de tela: `erro` (argumento de
   * `new …Error(…)` num arquivo que só roda no servidor, ver `ERRO_FICA_NO_SERVIDOR`), `log`
   * (`console.*`), `tipo` (literal de um tipo TS) ou `modulo` (caminho de `import`/`export`).
   */
  papel?: 'erro' | 'log' | 'tipo' | 'modulo'
  /**
   * De onde o texto saiu. `jsx` (texto solto entre tags), `rotulo` (valor de `aria-label`,
   * `title`, `alt`, `placeholder`…) e `plural` (o par singular/plural de uma contagem, como
   * `n === 1 ? 'aula' : 'aulas'`) SEMPRE são de tela: nunca caem nas regras de "parece código"
   * (`naoETextoDeTela`). `crase` é uma crase com `${…}`.
   */
  origem?: 'jsx' | 'rotulo' | 'crase' | 'plural'
  /**
   * O literal com cada `${…}` trocado por `#` (só nas crases). É por ele que as regras de
   * "parece código" decidem: o espaço do `texto` (onde cada `${…}` vira espaço, para a régua de
   * palavras ver "curso" em `${n} cursos`) faria um caminho como `/cursos/${slug}` parecer frase.
   */
  esqueleto?: string
}

/**
 * Atributos de JSX cujo valor o usuário lê ou ouve (o leitor de tela fala o `aria-label`).
 * Valor desses atributos é texto de tela mesmo quando parece um identificador ("Aulas").
 */
const ATRIBUTOS_DE_TEXTO = new Set([
  'aria-label',
  'aria-description',
  'aria-roledescription',
  'aria-valuetext',
  'title',
  'alt',
  'placeholder',
  'label',
])

/**
 * Onde a mensagem de `new Error(…)` nunca chega à tela: a página do Next (o error boundary
 * mostra uma frase própria), o route handler (responde JSON com `code`) e o código de servidor.
 * Num componente de cliente ela CHEGA: o Kids faz `setError(cause.message)` no Molda e mostra o
 * erro de carga do Estúdio Completo. Lá a mensagem conta como texto de tela.
 */
const ERRO_FICA_NO_SERVIDOR = /(?:^|[\\/])(?:page\.tsx|route\.ts)$|[\\/]server[\\/]/

/**
 * O começo de um literal que é código JS (ver `empurrar` em `literaisVisiveis`): a função
 * imediata, um `import`, um `var`, o `'use strict'` ou um COMENTÁRIO de JS (`// ----`,
 * o bloco de documentação de JS), que é como começam quase todos os runtimes do Estúdio.
 */
const FONTE_EMBUTIDA = /^\s*(?:;?\s*\(\s*function\b|import\s|var\s|'use strict'|\/\/|\/\*)/

/**
 * Um par singular/plural de contagem ("aula"/"aulas", "lição"/"lições"). Cada palavra sozinha
 * parece identificador; juntas, numa condicional ou numa chamada, são texto de tela.
 */
function formamPlural(a: string, b: string): boolean {
  const [um, outro] = a.length <= b.length ? [a, b] : [b, a]
  if (!/^[a-zà-ÿ]+$/.test(um) || um === outro) return false
  return (
    outro === `${um}s` ||
    outro === `${um}es` ||
    (um.endsWith('ão') && outro === `${um.slice(0, -2)}ões`) ||
    (um.endsWith('l') && outro === `${um.slice(0, -1)}is`)
  )
}

const textoSimples = (no: ts.Node | undefined): string | undefined =>
  no && (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no)) ? no.text : undefined

/**
 * O texto de TELA de um arquivo, lido pelo parser do próprio TypeScript (TSX de verdade, sem
 * regex): os literais de string, as crases (cada `${…}` vira um espaço) e o texto solto de JSX
 * (inclusive o que fica colado numa expressão, como `Voltar à seção: {titulo}`). Comentário
 * não é nó da árvore, então fica de fora sozinho. É a régua do guarda de vocabulário da
 * criança (`copy-vocabulario`), que precisa ignorar o CÓDIGO: `const curso = …`, `/cursos/…` e o
 * `lessonId` são lógica e continuam com os nomes de sempre.
 */
export function literaisVisiveis(fonte: string, nome = 'arquivo.tsx'): LiteralVisivel[] {
  const tipo = nome.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const arquivo = ts.createSourceFile(nome, fonte, ts.ScriptTarget.Latest, true, tipo)
  const saida: LiteralVisivel[] = []
  const erroFicaNoServidor = ERRO_FICA_NO_SERVIDOR.test(nome)
  /** Os literais que formam um par singular/plural (ver `formamPlural`). */
  const plurais = new Set<ts.Node>()
  const linhaDe = (no: ts.Node) =>
    arquivo.getLineAndCharacterOfPosition(no.getStart(arquivo)).line + 1
  const rotuloDe = (no: ts.Node): LiteralVisivel['origem'] => {
    let atual: ts.Node = no
    // `aria-label={aberto ? 'Fechar' : 'Abrir aulas'}` também é rótulo.
    while (
      ts.isJsxExpression(atual.parent) ||
      ts.isParenthesizedExpression(atual.parent) ||
      ts.isConditionalExpression(atual.parent) ||
      ts.isBinaryExpression(atual.parent)
    )
      atual = atual.parent
    const pai = atual.parent
    return ts.isJsxAttribute(pai) && ATRIBUTOS_DE_TEXTO.has(pai.name.getText(arquivo))
      ? 'rotulo'
      : undefined
  }
  const papelDe = (no: ts.Node): LiteralVisivel['papel'] => {
    let atual: ts.Node = no
    // Sobe pelas expressões que só embrulham o texto (crase, parênteses, `+`, condicional).
    while (
      ts.isTemplateSpan(atual.parent) ||
      ts.isTemplateExpression(atual.parent) ||
      ts.isParenthesizedExpression(atual.parent) ||
      ts.isBinaryExpression(atual.parent) ||
      ts.isConditionalExpression(atual.parent)
    )
      atual = atual.parent
    const pai = atual.parent
    if (ts.isLiteralTypeNode(pai)) return 'tipo'
    if (
      ts.isImportDeclaration(pai) ||
      ts.isExportDeclaration(pai) ||
      ts.isExternalModuleReference(pai)
    )
      return 'modulo'
    if (ts.isCallExpression(pai) && pai.expression.kind === ts.SyntaxKind.ImportKeyword)
      return 'modulo'
    if (
      erroFicaNoServidor &&
      ts.isNewExpression(pai) &&
      /Error$/.test(pai.expression.getText(arquivo))
    )
      return 'erro'
    if (
      ts.isCallExpression(pai) &&
      ts.isPropertyAccessExpression(pai.expression) &&
      pai.expression.expression.getText(arquivo) === 'console'
    )
      return 'log'
    return undefined
  }
  /**
   * Um literal que É código JS (`FONTE_EMBUTIDA`: o runtime que o Estúdio injeta no preview,
   * `(function () {…`, `import * as THREE…`, ou um runtime que abre com `// ----` ou com bloco de documentação)
   * é lido pelo parser também, e o que vale são os textos de DENTRO dele: os comentários do
   * runtime ("o código do aluno…") somem, e uma frase de verdade lá dentro (o erro de rede
   * bloqueada que aparece no console do Estúdio, um `fillText('Fim de jogo')`) continua sendo
   * varrida. O markdown dos manuais ("## Jogo 2D…") NÃO é código: é lido como texto.
   */
  const empurrar = (
    no: ts.Node,
    texto: string,
    literal: Omit<LiteralVisivel, 'linha' | 'texto'>,
  ) => {
    if (FONTE_EMBUTIDA.test(texto)) {
      const base = linhaDe(no) - 1
      for (const dentro of literaisVisiveis(texto, 'embutido.js'))
        saida.push({ ...dentro, linha: base + dentro.linha })
      return
    }
    saida.push({ linha: linhaDe(no), texto, ...literal })
  }
  const marcarPlurais = (candidatos: (ts.Node | undefined)[]) => {
    const textos = candidatos.map(textoSimples)
    for (let i = 0; i < candidatos.length; i++)
      for (let j = i + 1; j < candidatos.length; j++) {
        const a = candidatos[i]
        const b = candidatos[j]
        const ta = textos[i]
        const tb = textos[j]
        if (a && b && ta !== undefined && tb !== undefined && formamPlural(ta, tb)) {
          plurais.add(a)
          plurais.add(b)
        }
      }
  }
  const visitar = (no: ts.Node) => {
    if (ts.isConditionalExpression(no)) marcarPlurais([no.whenTrue, no.whenFalse])
    else if (ts.isCallExpression(no)) marcarPlurais([...no.arguments])
    if (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no)) {
      empurrar(no, no.text, {
        papel: papelDe(no),
        origem: rotuloDe(no) ?? (plurais.has(no) ? 'plural' : undefined),
      })
    } else if (ts.isTemplateExpression(no)) {
      // Cada `${…}` vira espaço no `texto` (a régua de palavras) e `#` no `esqueleto` (as regras
      // de código). ⚠️ Dentro de código embutido o espaço pode partir a sintaxe; o parser se
      // recupera e os literais que vêm depois continuam sendo lidos.
      const partes = [no.head.text, ...no.templateSpans.map((span) => span.literal.text)]
      empurrar(no, partes.join(' '), {
        papel: papelDe(no),
        origem: rotuloDe(no) ?? 'crase',
        esqueleto: partes.join('#'),
      })
    } else if (ts.isJsxText(no)) {
      if (no.text.trim()) saida.push({ linha: linhaDe(no), texto: no.text, origem: 'jsx' })
    }
    ts.forEachChild(no, visitar)
  }
  visitar(arquivo)
  return saida
}

/** Uma classe utilitária (`w-full`, `md:flex`, `-mt-2`, `kids-#`): o `-`/`:` fica POR DENTRO. */
const CLASSE_UTILITARIA = /^!?-?[a-z0-9[\]().%_!#=,>&@*/]+(?:[-:][a-z0-9[\]().%_!#=,>&@*/]+)+$/

/**
 * Um literal que não é texto de tela: caminho, identificador, classe CSS, tipo, `import`,
 * mensagem de `new Error(…)` que fica no servidor ou de `console.*` (log).
 *
 * ⚠️ Texto de JSX, rótulo (`aria-label`…) e par de plural nunca caem aqui: em JSX o texto que vem
 * depois de `{expr}` começa com ". " ou "/", e "parece caminho" escondia "{x}. Continue nos
 * cursos" (review de 06/10/2026, provado por mutação).
 */
export function naoETextoDeTela({ texto, papel, origem, esqueleto }: LiteralVisivel): boolean {
  if (papel) return true
  if (!texto.trim()) return true
  if (origem === 'jsx' || origem === 'rotulo' || origem === 'plural') return false
  const t = (esqueleto ?? texto).trim()
  // Caminho (`/cursos/…`), pacote (`@sistemazero/…`), âncora (`#secao`) e seletor ou extensão
  // (`.sz-aula`, `.png`), sempre SEM espaço: "## Jogo 2D" é o título de um manual em markdown,
  // e um literal que começa com `/` e tem espaço é frase. Um ponto seguido de espaço é pontuação.
  if (!/\s/.test(t) && /^(?:\/|@|#|\.[\w-])/.test(t)) return true
  // Uma palavra solta é identificador (`'meus-cursos'`, `'aulas'`), MENOS: a de inicial
  // maiúscula ("Aluno", "Atividades"), que é rótulo; a de uma crase (`${n} cursos` sobra
  // "cursos"); e a que tem espaço nas pontas (`n + ' aulas'` é um pedaço de frase).
  if (
    origem !== 'crase' &&
    texto === texto.trim() &&
    !/\s/.test(t) &&
    !/^[A-ZÀ-Ý]/.test(t) &&
    /^[\w\-./:[\]#=?&%]+$/.test(t)
  )
    return true
  // Lista de classes CSS: toda palavra com cara de classe e alguma com `-` ou `:` POR DENTRO.
  // "aula: comece aqui" e "parte - 2" não passam (o `:` na ponta e o `-` solto são de frase).
  const tokens = t.split(/\s+/)
  const classe = /^[a-z0-9\-:[\]()/.%_!#=,>&@*]+$/
  return (
    tokens.every((token) => classe.test(token)) &&
    tokens.some((token) => CLASSE_UTILITARIA.test(token))
  )
}
