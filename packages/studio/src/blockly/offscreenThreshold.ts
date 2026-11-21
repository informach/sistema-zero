/**
 * A partir de quantos blocos a montagem sob demanda liga (`offscreenBodies.ts`) e a abertura sem
 * desenhar a cauda distante (`deferredTail.ts`). Num arquivo próprio para o painel decidir sem
 * carregar os módulos: eles só entram no projeto que passa disto, fora do pacote de abertura do
 * modo Blocos. Os jogos dos cursos têm de 70 a 80 blocos.
 */
export const OFFSCREEN_BODIES_MIN_BLOCKS = 1500

let onDemandMounting = true

/**
 * Só para a comparação de dois braços (lote 3 da missão, `scripts/measure-classic-opening.mjs` e o
 * `?montagem=inteira` do playground): desliga a abertura adiada e a montagem sob demanda, e o
 * MESMO build abre o projeto grande pelo caminho de sempre, o dos projetos pequenos. Assim o CI
 * compara o estado e o código dos dois caminhos sem construir um segundo build.
 */
export function setOnDemandMountingForTests(enabled: boolean): void {
  onDemandMounting = enabled
}

/** A abertura adiada e a montagem sob demanda podem ligar (sempre, fora da comparação acima). */
export function onDemandMountingEnabled(): boolean {
  return onDemandMounting
}

/**
 * "Procurar no programa" aparece a partir disto (lote 3 da missão, 21/11/2026). Mora aqui, e não
 * no módulo da busca, porque o `BlocklyPanel` já importa este arquivo: o módulo e o componente da
 * busca ficam fora do pacote de abertura do modo Blocos. Os jogos dos cursos têm de 70 a 80
 * blocos, e a tela da aula não muda.
 */
export const WORKSPACE_SEARCH_MIN_BLOCKS = 300

/**
 * A folga, em px de tela, que a primeira carga deixa acima dos blocos (`showBlocksFromTop`). Mora
 * aqui porque o plano da abertura adiada prevê essa vista: importar o `cornerSpacer` do módulo
 * carregado sob demanda partiria o pacote do modo Blocos em mais um arquivo.
 */
export const BLOCKS_FROM_TOP_PADDING = 24

/**
 * Conta barata, sobre o estado já serializado, para decidir se vale carregar o módulo da abertura
 * adiada. Pode contar a mais (um `"type":` dentro de um estado extra), nunca a menos: o módulo
 * confere a conta exata antes de adiar qualquer coisa.
 */
export function mayHaveManyBlocks(serialized: string): boolean {
  let count = 0
  for (let at = serialized.indexOf('"type":'); at >= 0; at = serialized.indexOf('"type":', at + 7))
    if (++count >= OFFSCREEN_BODIES_MIN_BLOCKS) return true
  return false
}

/** O desenho adiado de um workspace (`deferredTail.ts`), visto por quem não carrega o módulo. */
export interface DeferredDrawing {
  /** Desenha tudo o que falta (antes de medir o projeto inteiro: organizar, a foto dos blocos). */
  drawAll(): void
  dispose(): void
}

const deferredDrawings = new WeakMap<object, DeferredDrawing>()

export function trackDeferredDrawing(workspace: object, drawing: DeferredDrawing | null): void {
  if (drawing) deferredDrawings.set(workspace, drawing)
  else deferredDrawings.delete(workspace)
}

/** Desenha o que ainda não foi desenhado. Workspace sem abertura adiada: nada a fazer. */
export function drawDeferredBlocks(workspace: object): void {
  deferredDrawings.get(workspace)?.drawAll()
}

/** Solta o desenho adiado deste workspace (o canvas vai ser descartado). */
export function disposeDeferredDrawing(workspace: object): void {
  deferredDrawings.get(workspace)?.dispose()
}
