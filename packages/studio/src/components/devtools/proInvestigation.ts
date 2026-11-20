/**
 * A aba Investigar no Pro (proposta aprovada em 20/11/2026: "caminho até o erro, com arquivo e
 * linha"; Pausar e Valores não entram no Pro). Funções puras: a pilha do erro que parou o jogo
 * (no formato do Chromium, do Firefox e do Safari) vira os passos que são arquivos do projeto.
 */

export interface ProErrorStep {
  file: string
  line: number
  column: number
}

/** `https://…/src/main.js?t=1:12:5` no fim de cada linha da pilha. */
const FRAME = /(https?:\/\/[^\s()]+?):(\d+):(\d+)\)?\s*$/

/**
 * Os passos da pilha que são arquivos do projeto, do erro (o primeiro) para fora, como a pilha
 * vem. Um endereço que não é arquivo do projeto (a biblioteca, o próprio navegador) fica de
 * fora. O endereço só serve pelo caminho: `/src/main.js` é o arquivo `src/main.js`.
 */
export function proErrorSteps(
  stack: string,
  isProjectFile: (path: string) => boolean,
): ProErrorStep[] {
  const steps: ProErrorStep[] = []
  for (const raw of stack.split(/\r?\n/).slice(0, 60)) {
    const match = FRAME.exec(raw.trim())
    if (!match?.[1]) continue
    let path: string
    try {
      path = decodeURIComponent(new URL(match[1]).pathname).replace(/^\/+/, '')
    } catch {
      continue
    }
    if (!isProjectFile(path)) continue
    steps.push({ file: path, line: Number(match[2]), column: Number(match[3]) })
  }
  return steps
}

/** A linha do arquivo como a criança a escreveu (sem espaços nas pontas, até 120 letras). */
export function proLineText(content: string | undefined, line: number): string {
  const text = content?.split(/\r?\n/)[line - 1]?.trim() ?? ''
  return text.length > 120 ? `${text.slice(0, 120)}…` : text
}
