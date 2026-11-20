/**
 * A aba Investigar no Python clássico (proposta aprovada em 20/11/2026: "Valores agora, caminho
 * até o erro"). Funções puras, baixadas só com a aba ligada:
 * - os nomes que a aba pergunta ao programa (as variáveis que a criança cria no topo do arquivo);
 * - o caminho até o erro, a partir do traceback que o programa já informa;
 * - o texto curto de cada valor, no jeito do Python.
 */

/** Quantos nomes a aba pergunta (um por quadro do programa: 24 nomes ≈ 0,4 s a 60 por segundo). */
export const PYTHON_INVESTIGATION_MAX_NAMES = 24

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/

/**
 * As variáveis criadas no topo do arquivo, na ordem em que aparecem: `x = …`, `x: int = …`,
 * `a, b = …` e `x += …` sem recuo. Nomes que começam com `_` são do próprio programa por dentro
 * e ficam de fora. Um nome que não existir na hora da leitura não aparece (a sonda diz que não
 * achou).
 */
export function pythonTopLevelNames(source: string): string[] {
  const names: string[] = []
  for (const raw of source.split(/\r?\n/)) {
    if (!raw || /^\s/.test(raw) || raw.startsWith('#')) continue
    const line = raw.replace(/#.*$/, '')
    const match =
      /^([A-Za-z_][\w\s,()[\]]*?)\s*(?::[^=]*)?(?:[-+*/%&|^]|\/\/|\*\*|<<|>>)?=(?!=)/.exec(line)
    if (!match?.[1]) continue
    for (const part of match[1].replace(/[()[\]]/g, ' ').split(',')) {
      const name = part.trim()
      if (NAME.test(name) && !name.startsWith('_') && !names.includes(name)) names.push(name)
    }
    if (names.length >= PYTHON_INVESTIGATION_MAX_NAMES) break
  }
  return names.slice(0, PYTHON_INVESTIGATION_MAX_NAMES)
}

/** Onde o primeiro `nome = …` do topo do arquivo está (o "Mostrar o bloco" do valor). */
export function pythonDeclarationLine(source: string, name: string): number | null {
  const lines = source.split(/\r?\n/)
  for (const [index, raw] of lines.entries()) {
    if (!raw || /^\s/.test(raw)) continue
    if (pythonTopLevelNames(raw).includes(name)) return index + 1
  }
  return null
}

/**
 * Os passos do traceback que são do projeto da criança (`/studio/project/…`), de dentro para
 * fora (o passo onde o erro aconteceu primeiro), como a aba do JavaScript recebe a pilha.
 */
export function pythonTraceSteps(traceback: string): { file: string; line: number }[] {
  const steps: { file: string; line: number }[] = []
  for (const match of traceback.matchAll(/File "\/studio\/project\/([^"]+)", line (\d+)/g)) {
    const file = match[1]
    const line = Number(match[2])
    if (file && Number.isSafeInteger(line) && line > 0) steps.push({ file, line })
  }
  return steps.reverse()
}

const LONG = 80

/** O valor como o Python o escreveria, curto: `True`, `None`, `'texto'`, `[1, 2]`. */
export function pythonValueText(value: unknown): string {
  const show = (item: unknown, depth: number): string => {
    if (item === null || item === undefined) return 'None'
    if (item === true) return 'True'
    if (item === false) return 'False'
    if (typeof item === 'number') return Number.isInteger(item) ? String(item) : String(item)
    if (typeof item === 'string') return `'${item}'`
    if (depth > 2) return '…'
    if (Array.isArray(item)) return `[${item.map((entry) => show(entry, depth + 1)).join(', ')}]`
    if (typeof item === 'object')
      return `{${Object.entries(item as Record<string, unknown>)
        .map(([key, entry]) => `'${key}': ${show(entry, depth + 1)}`)
        .join(', ')}}`
    return String(item)
  }
  const text = show(value, 0).replace(/\s+/g, ' ')
  return text.length > LONG ? `${text.slice(0, LONG)}…` : text
}
