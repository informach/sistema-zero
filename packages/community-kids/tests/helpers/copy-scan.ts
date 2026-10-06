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
   * `new …Error(…)`), `log` (`console.*`), `tipo` (literal de um tipo TS) ou `modulo`
   * (caminho de `import`/`export`).
   */
  papel?: 'erro' | 'log' | 'tipo' | 'modulo'
}

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
  const linhaDe = (no: ts.Node) =>
    arquivo.getLineAndCharacterOfPosition(no.getStart(arquivo)).line + 1
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
    if (ts.isCallExpression(pai) && ts.isImportKeyword(pai.expression)) return 'modulo'
    if (ts.isNewExpression(pai) && /Error$/.test(pai.expression.getText(arquivo))) return 'erro'
    if (
      ts.isCallExpression(pai) &&
      ts.isPropertyAccessExpression(pai.expression) &&
      pai.expression.expression.getText(arquivo) === 'console'
    )
      return 'log'
    return undefined
  }
  const visitar = (no: ts.Node) => {
    if (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no)) {
      saida.push({ linha: linhaDe(no), texto: no.text, papel: papelDe(no) })
    } else if (ts.isTemplateExpression(no)) {
      const texto = [no.head.text, ...no.templateSpans.map((span) => span.literal.text)].join(' ')
      saida.push({ linha: linhaDe(no), texto, papel: papelDe(no) })
    } else if (ts.isJsxText(no)) {
      if (no.text.trim()) saida.push({ linha: linhaDe(no), texto: no.text })
    }
    ts.forEachChild(no, visitar)
  }
  visitar(arquivo)
  return saida
}

/**
 * Um literal que não é texto de tela: caminho, identificador, classe CSS, tipo, `import`,
 * mensagem de `new Error(…)` (o error boundary mostra uma frase própria, nunca a do erro) ou de
 * `console.*` (log).
 */
export function naoETextoDeTela({ texto, papel }: LiteralVisivel): boolean {
  if (papel) return true
  const t = texto.trim()
  if (!t) return true
  if (/^[/@.#]/.test(t)) return true
  if (!/\s/.test(t) && /^[\w\-./:[\]#=?&%]+$/.test(t)) return true
  const tokens = t.split(/\s+/)
  const classe = /^[a-z0-9\-:[\]()/.%_!#=,>&@*]+$/
  return tokens.every((token) => classe.test(token)) && tokens.some((token) => /[-:]/.test(token))
}
