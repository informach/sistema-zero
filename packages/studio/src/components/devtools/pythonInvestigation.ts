/**
 * A aba Investigar no Python clássico (proposta aprovada em 20/11/2026: "Valores agora, caminho
 * até o erro"). Funções puras, baixadas só com a aba ligada:
 * - os nomes que a aba pergunta ao programa (as variáveis que a criança cria no topo do arquivo);
 * - o caminho até o erro, a partir do traceback que o programa já informa;
 * - o texto curto de cada valor, no jeito do Python;
 * - o laço da aba com o programa rodando: a leitura dos valores e Pausar, Continuar e Avançar 1
 *   quadro (`runPythonInvestigation`).
 */
import type { PythonExecutionController } from '../../runtime/python/controller'
import type { InvestigationReading } from '../../state/devtools'

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

/** O que a aba usa do controlador da execução (a leitura pelo observador e a pausa do quadro). */
export type PythonInvestigationController = Pick<
  PythonExecutionController,
  'observe' | 'pause' | 'step'
>

/** Quem manda os botões da aba (o mesmo canal do JavaScript, `setDevtoolsSender`). */
export type PythonInvestigationSender = (command: 'pause' | 'resume' | 'step' | 'look') => void

/**
 * A aba Investigar com o programa rodando (lotes 7 e 11 dos painéis aprovados). Lê os valores a
 * cada meio segundo (parado, depois de cada Avançar; terminado, uma vez) e, no programa que
 * desenha na tela, atende Pausar, Continuar e Avançar 1 quadro pelo quadro do Python, que segura
 * a resposta do próximo quadro (`framePause.ts`).
 *
 * Continuar sem pausa é a pergunta sem efeito: o quadro publicado antes da pausa recusa o comando,
 * e aí a aba diz que o Python ainda não pausa pelo Estúdio. Devolve quem encerra o laço.
 */
export function runPythonInvestigation(options: {
  controller: PythonInvestigationController
  names: readonly string[]
  /** O programa desenha na tela (Turtle, Pygame Zero, pygame-ce, Raylib). */
  draws: boolean
  /** A execução já terminou: uma leitura só, com os valores do fim. */
  completed: boolean
  receive(reading: InvestigationReading): void
  setSender(sender: PythonInvestigationSender | null): void
  intervalMs?: number
}): () => void {
  const { controller, names, completed } = options
  const intervalMs = options.intervalMs ?? 500
  let gone = false
  // O quadro em que o programa está parado (`null`: rodando) e se os valores precisam de uma
  // leitura nova (parado, o programa não muda até Avançar ou Continuar).
  let held: number | null = null
  let fresh = true
  let canPause = false
  let wake: (() => void) | null = null
  let registered = false
  const read = async () => {
    const values: { name: string; text: string }[] = []
    for (const name of names) {
      if (gone) return
      const result = await controller.observe({ type: 'value', path: name })
      const observed = result.observation.type === 'value' ? result.observation.observed : null
      if (observed?.found) values.push({ name, text: pythonValueText(observed.value) })
    }
    if (!gone)
      options.receive({
        frame: held,
        paused: held !== null,
        canPause,
        pauseLater: false,
        values,
        error: null,
      })
  }
  const sender: PythonInvestigationSender = (command) => {
    if (command === 'look' || gone) return
    const action = command === 'step' ? controller.step() : controller.pause(command === 'pause')
    void action
      .then(async (result) => {
        if (gone) return
        if (command !== 'resume' && result === null) {
          // Não parou no prazo (esperando o input, ou sem quadro nenhum): o programa continua, e
          // a pausa pedida não fica armada para um quadro qualquer depois.
          await controller.pause(false)
          held = null
        } else held = command === 'resume' || !result ? null : result.frame
        fresh = true
        wake?.()
      })
      .catch(() => {
        // A execução acabou no meio (Parar, erro): a próxima execução recomeça a aba.
      })
  }
  void (async () => {
    if (options.draws && !completed)
      canPause = await controller.pause(false).then(
        () => true,
        () => false,
      )
    if (gone) return
    if (canPause) {
      options.setSender(sender)
      registered = true
    }
    while (!gone) {
      if (held === null || fresh) {
        fresh = false
        try {
          await read()
        } catch {
          // A execução acabou no meio da leitura (Parar, erro): a próxima execução lê de novo.
          return
        }
      }
      if (completed) return
      await new Promise<void>((resolve) => {
        wake = resolve
        setTimeout(resolve, intervalMs)
      })
      wake = null
    }
  })()
  return () => {
    gone = true
    wake?.()
    if (registered) options.setSender(null)
  }
}

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
