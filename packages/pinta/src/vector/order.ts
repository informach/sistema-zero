import type { VectorShape } from './model'

/**
 * Ordem de empilhamento (z-order) do vetor: o array vai do FUNDO para a FRENTE
 * (índice 0 = atrás de tudo), e a seleção anda como UMA peça só.
 *
 * A régua, decidida com a dona (17/08/2026):
 * - um passo pula o CLUSTER vizinho inteiro (cluster = grupo, ou a forma solta);
 * - vale para qualquer seleção múltipla, não só para grupo, preservando a ordem
 *   relativa entre as escolhidas;
 * - vizinho ESCONDIDO não consome o passo (senão o botão parece morto);
 * - arranjo inalterado devolve `null` — quem chama não commita, e assim não
 *   nasce uma entrada de desfazer que não desfaz nada.
 *
 * ⚠️ Consequência aceita: mover TORNA o bloco contíguo. Agrupar nunca reordenou
 * nada (é só uma etiqueta), então uma forma de fora pode estar empilhada no meio
 * de um grupo; ao mover, ela sai do meio. É a tradução de "o grupo é uma peça só".
 */

/**
 * Grupo inteiro, ou a forma solta — mesma ideia do `alignShapes` (`groupId ?? id`),
 * com os dois em ESPAÇOS separados. ⚠️ Sem o prefixo, um `groupId` que por azar
 * fosse igual ao `id` de outra forma grudaria as duas (`newId` não colide na
 * prática, mas um `.pinta.json` importado escreve o que quiser nesses campos).
 */
function clusterKey(shape: VectorShape): string {
  return shape.groupId === undefined ? `s:${shape.id}` : `g:${shape.groupId}`
}

/**
 * As formas que vão andar juntas: as escolhidas MAIS os irmãos de grupo delas.
 * Expandir aqui dentro é o que deixa o painel Camadas mandar só o id da linha.
 */
function movingBlock(shapes: readonly VectorShape[], ids: readonly string[]): Set<string> {
  const chosen = new Set(ids)
  const keys = new Set<string>()
  for (const s of shapes) if (chosen.has(s.id)) keys.add(clusterKey(s))
  const block = new Set<string>()
  for (const s of shapes) if (keys.has(clusterKey(s))) block.add(s.id)
  return block
}

/** Mesmas formas, nas mesmas posições (comparação por identidade). */
function sameOrder(a: readonly VectorShape[], b: readonly VectorShape[]): boolean {
  return a.length === b.length && a.every((shape, i) => shape === b[i])
}

/** Monta a pilha nova com o bloco inteiro em `at` (posição no array SEM o bloco). */
function rebuild(
  shapes: readonly VectorShape[],
  block: ReadonlySet<string>,
  at: number,
): VectorShape[] | null {
  const movers = shapes.filter((s) => block.has(s.id))
  const others = shapes.filter((s) => !block.has(s.id))
  const next = [...others.slice(0, at), ...movers, ...others.slice(at)]
  return sameOrder(shapes, next) ? null : next
}

/**
 * Um passo (±1) ou direto para o topo/fundo, com a seleção andando como uma peça.
 * `ids` pode trazer um membro só de um grupo: o grupo inteiro vem junto.
 */
export function moveShapesOrder(
  shapes: readonly VectorShape[],
  ids: readonly string[],
  to: 1 | -1 | 'front' | 'back',
): VectorShape[] | null {
  const block = movingBlock(shapes, ids)
  if (block.size === 0 || block.size === shapes.length) return null

  const others = shapes.filter((s) => !block.has(s.id))
  if (to === 'front') return rebuild(shapes, block, others.length)
  if (to === 'back') return rebuild(shapes, block, 0)

  const positions = new Map(shapes.map((s, i) => [s.id, i] as const))
  const chosen = [...block].map((id) => positions.get(id) ?? 0)
  const top = Math.max(...chosen)
  const bottom = Math.min(...chosen)
  // Vizinho = a 1ª forma VISÍVEL depois do bloco no sentido do movimento.
  // Escondida não conta: o passo tem que render mudança na tela.
  const visibleAt = (i: number): boolean => others[i]?.hidden !== true
  const positionOf = (i: number): number => positions.get(others[i]?.id ?? '') ?? 0

  if (to === 1) {
    let neighbour = -1
    for (let i = 0; i < others.length; i += 1) {
      if (positionOf(i) > top && visibleAt(i)) {
        neighbour = i
        break
      }
    }
    // Ninguém visível acima: o bloco ainda pode subir juntando-se no topo.
    if (neighbour === -1) return rebuild(shapes, block, others.length)
    const key = clusterKey(others[neighbour] as VectorShape)
    let last = neighbour
    for (let i = neighbour + 1; i < others.length; i += 1) {
      if (clusterKey(others[i] as VectorShape) === key) last = i
    }
    return rebuild(shapes, block, last + 1)
  }

  let neighbour = -1
  for (let i = others.length - 1; i >= 0; i -= 1) {
    if (positionOf(i) < bottom && visibleAt(i)) {
      neighbour = i
      break
    }
  }
  if (neighbour === -1) return rebuild(shapes, block, 0)
  const key = clusterKey(others[neighbour] as VectorShape)
  let first = neighbour
  for (let i = neighbour - 1; i >= 0; i -= 1) {
    if (clusterKey(others[i] as VectorShape) === key) first = i
  }
  return rebuild(shapes, block, first)
}

/**
 * Soltar no lugar da forma `overId` (arrasto pela alça do painel Camadas). Segue
 * o PONTEIRO, uma linha por vez — pular o cluster inteiro é regra do passo de ±1,
 * aqui quem manda é o dedo.
 *
 * ⭐ **Dentro do grupo o arrasto é FINO.** Se a linha sob o dedo é irmã de grupo
 * da que está sendo arrastada, move-se só a arrastada, reordenando as partes por
 * dentro; cruzar para FORA volta a mover o grupo inteiro. Sem isso, a régua "o
 * grupo é uma peça só" tirava a única forma de restacar as partes de um
 * personagem agrupado — sobrava desagrupar, arrumar e reagrupar.
 *
 * Os quatro BOTÕES de ordem seguem grossos de propósito (`moveShapesOrder` move a
 * seleção, que já é o grupo): o grosso é deles, o fino é do arrasto.
 */
export function dropShapesOrder(
  shapes: readonly VectorShape[],
  ids: readonly string[],
  overId: string,
): VectorShape[] | null {
  const grupoTodo = movingBlock(shapes, ids)
  if (grupoTodo.size === 0) return null

  // Irmão do próprio grupo → reordena DENTRO dele: o bloco vira só o que foi
  // pedido (a linha arrastada). Soltar sobre si mesma continua sendo no-op.
  const dentroDoGrupo = grupoTodo.has(overId)
  const pedidos = new Set(ids)
  if (dentroDoGrupo && pedidos.has(overId)) return null
  const block = dentroDoGrupo ? pedidos : grupoTodo
  if (block.size === 0) return null

  const positions = new Map(shapes.map((s, i) => [s.id, i] as const))
  const over = positions.get(overId)
  if (over === undefined) return null
  const top = Math.max(...[...block].map((id) => positions.get(id) ?? 0))

  const others = shapes.filter((s) => !block.has(s.id))
  const at = others.findIndex((s) => s.id === overId)
  if (at === -1) return null
  // Vindo de baixo, o bloco passa a ficar ACIMA da linha sob o dedo; vindo de
  // cima, ocupa o lugar dela. É o mesmo "atravessar" do arrasto de uma forma só.
  return rebuild(shapes, block, top < over ? at + 1 : at)
}
