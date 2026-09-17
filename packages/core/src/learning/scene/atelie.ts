/**
 * O ATELIÊ de O Jogo do Meu Jeito, redesenhado no lote 5 do Raio-X (16/09/2026).
 *
 * ⭐⭐ As sete cenas de desenho existem para ser a PONTE entre a aula e o Pinta, e falhavam
 * exatamente aí: desenhavam o Dino do Corre Dino num curso em que a criança desenha uma nave de
 * 32 × 32 com fogo, mandavam mover um eixo de espelho que o Pinta não tem e mediam uma pedra de
 * pixel com outra silhueta que a de vetor. Este arquivo guarda as RÉGUAS que o motor, a faixa e o
 * palco precisam dizer do mesmo jeito: o tamanho do fogo, o espelho no meio da grade, a lupa e o
 * recorte da folha. Os desenhos em si moram no `scene-atelie-stages.tsx` do member-shell.
 *
 * ⚠️ Puro e sem estado: nada aqui lê o `SceneState` inteiro, para o validador do `state.ts`
 * poder usar a régua das marcas sem ciclo de importação.
 */

/* ── A nave 32 × 32 e o fogo (`frames`, `onion-skin`, `sheet-vs-sprite`) ─────────────────────── */

/**
 * O fogo da nave, em quadradinhos da grade de 32. O corpo termina na linha 20 (`saida`), e o quadro
 * acaba na 32 (`borda`): sobram 12 linhas para o fogo crescer. O fogo PEQUENO tem 5 e o GRANDE 9, as
 * duas naves da folha de quadros da Aula 3.
 */
export const NAVE_FOGO = { saida: 20, borda: 32, pequeno: 5, grande: 9 } as const

/**
 * A fatia do relógio da `frames` com MENOS MOVIMENTO: um quadro da prévia por fatia (consertos do
 * review da onda B do lote 5, decisão da orquestração).
 *
 * ⚠️⚠️ A prévia É o conteúdo que a criança mandou tocar. Com a fatia comum de 0,2 s, a 8 quadros por
 * segundo cada fatia passava 1,6 troca, e o que aparecia era a PARIDADE amostrada: um pisca lento e
 * irregular, igual ao "devagar" (medido: 5 trocas em 2 s a 8 por segundo). Com a fatia do tamanho de
 * UM quadro da animação, cada fatia mostra exatamente um quadro, no ritmo pedido.
 * ⚠️ Quem chama manda EXATAMENTE esta fatia ao motor e guarda a sobra (`useSceneClock` com `exato`):
 * mandando o tempo medido do navegador, 6 quadros de 60 Hz a 12 por segundo são 1,2 troca, e a cada
 * cinco fatias duas trocas caíam juntas (o fogo ficava parado uma fatia).
 */
export function framesPreviewSlice(rate: number): number {
  return 1 / Math.max(1, rate)
}

/**
 * O tamanho do fogo 2 na `onion-skin`, a partir do `shift` do quadro 2 (0 a 60, de 4 em 4 na
 * bancada): cada 4 é UM quadradinho a mais que o fogo 1.
 *
 * ⚠️⚠️ O `shift` era o "passo" de um Dino que ANDAVA entre os quadros, o gesto que a Aula 3 chama de
 * erro ("se a nave inteira mexeu, desfaça"). O número continua o mesmo (sessões e o DTO seguem
 * valendo); o que ele mede passou a ser o quanto o fogo CRESCE, com o corpo parado.
 */
export function onionFireLength(shift: number): number {
  return NAVE_FOGO.pequeno + Math.floor(Math.max(0, shift) / 4)
}

/** O que o fantasma deixa ver: o fogo 2 quase igual ao 1, um pouco maior, ou passando da borda. */
export type OnionFireZone = 'quase' | 'pouco' | 'passou'

/**
 * A régua do "cresceu um pouco" (a meta `even-step`). ⚠️ Pela ALTURA desenhada, e não por uma faixa
 * de números à parte: menos de 3 quadradinhos a mais não pulsa ("quase"), e o fogo que passa da borda
 * do quadro é cortado ("passou"). Com os 4 por quadradinho da bancada, "pouco" é de 12 a 28.
 */
export function onionFireZone(shift: number): OnionFireZone {
  const tamanho = onionFireLength(shift)
  if (tamanho - NAVE_FOGO.pequeno < 3) return 'quase'
  return NAVE_FOGO.saida + tamanho <= NAVE_FOGO.borda ? 'pouco' : 'passou'
}

/* ── O espelho na grade 16 × 16 (`symmetry`) ─────────────────────────────────────────────────── */

/** A grade do papel do espelho: 16 × 16, com o meio entre as colunas (e as linhas) 7 e 8. */
export const PAPEL_DO_ESPELHO = 16

/** Os três traços prontos, todos do lado ESQUERDO da nave (a cópia lado a lado cai à direita). */
export const TRACOS_DA_NAVE: Readonly<
  Record<'asa' | 'ponta' | 'cabine', readonly (readonly [number, number])[]>
> = {
  asa: [
    [2, 9],
    [3, 9],
    [1, 10],
    [2, 10],
    [3, 10],
    [1, 11],
    [2, 11],
    [3, 11],
    [2, 12],
    [3, 12],
  ],
  ponta: [
    [7, 1],
    [7, 2],
    [6, 3],
    [6, 4],
  ],
  cabine: [
    [7, 5],
    [7, 6],
    [7, 7],
  ],
}

/** O nome do traço na frase: "Você pintou a asa." */
export const NOME_DO_TRACO: Readonly<Record<'asa' | 'ponta' | 'cabine', string>> = {
  asa: 'a asa',
  ponta: 'a ponta',
  cabine: 'a cabine',
}

/**
 * Uma MARCA no papel: um traço pronto (`asa`) ou um quadradinho tocado (`p:3,10`), com a cópia do
 * espelho marcada no fim (`asa|x` lado a lado, `asa|y` de cima e de baixo, `asa|xy` a cópia na
 * diagonal, que só existe com os DOIS espelhos ligados). ⚠️ O validador do retrato usa ESTA régua:
 * uma marca que o palco não sabe desenhar não entra no estado.
 */
export const MARCA_DO_PAPEL = /^(asa|ponta|cabine|p:(1[0-5]|[0-9]),(1[0-5]|[0-9]))(\|(xy|x|y))?$/

/** O eixo do espelho no estado: o lado a lado (`x`), o de cima e de baixo (`y`) ou os dois (`xy`). */
export type MirrorAxis = 'x' | 'y' | 'xy'

/**
 * Os espelhos ligados, como no Pinta: o lado a lado e o de cima e de baixo são DUAS chaves
 * independentes (consertos do review da onda B do lote 5), e com as duas ligadas o eixo do estado é
 * `xy`. ⚠️ `on` desligado guarda o último eixo escolhido, então quem pergunta "está ligado?" é esta
 * função, nunca o `axis` sozinho.
 */
export function mirrorAxes(on: boolean, axis: MirrorAxis): { x: boolean; y: boolean } {
  return { x: on && axis !== 'y', y: on && axis !== 'x' }
}

/** O modo do `mirror-mode` para as duas chaves: nenhuma, uma ou as duas. */
export function mirrorModeFor(x: boolean, y: boolean): 'off' | MirrorAxis {
  return x && y ? 'xy' : x ? 'x' : y ? 'y' : 'off'
}

/** As cópias que UM traço deixa no papel com os espelhos de agora: nenhuma, uma ou três. */
export function mirrorCopyAxes(on: boolean, axis: MirrorAxis): MirrorAxis[] {
  if (!on) return []
  return axis === 'xy' ? ['x', 'y', 'xy'] : [axis]
}

/** Quantas marcas o papel guarda. ⚠️ O motor corta aqui (a mais antiga sai), e o validador também. */
export const MARCAS_NO_PAPEL = 64

/** Os quadradinhos de UMA marca, já com a cópia refletida quando a marca é de espelho. */
export function symmetryMarkCells(marca: string): [number, number][] {
  if (!MARCA_DO_PAPEL.test(marca)) return []
  const [base = '', eixo] = marca.split('|')
  const ultimo = PAPEL_DO_ESPELHO - 1
  let celulas: [number, number][]
  if (base.startsWith('p:')) {
    const [x = 0, y = 0] = base.slice(2).split(',').map(Number)
    celulas = [[x, y]]
  } else celulas = (TRACOS_DA_NAVE[base as 'asa'] ?? []).map(([x, y]): [number, number] => [x, y])
  if (eixo === 'x') return celulas.map(([x, y]) => [ultimo - x, y])
  if (eixo === 'y') return celulas.map(([x, y]) => [x, ultimo - y])
  if (eixo === 'xy') return celulas.map(([x, y]) => [ultimo - x, ultimo - y])
  return celulas
}

/**
 * A cópia deste traço fica SEPARADA dele, do outro lado do meio? (consertos do review da onda B do
 * lote 5, A3).
 *
 * ⚠️⚠️ A cabine (coluna 7) e a ponta (colunas 6 e 7) moram coladas no meio: com o Espelho lado a lado
 * a cópia cai na coluna 8 e ENCOSTA no traço. O desenho que aparece é o distrator da previsão ("grudada
 * na primeira, deixando a asa mais grossa"), e a tela respondia "a outra asa apareceu do outro lado do
 * meio" sem asa nenhuma pintada. A régua: nenhum quadradinho do traço na coluna (ou linha) 7 ou 8, as
 * duas que tocam o meio; a cópia da 6 cai na 9, com duas casas vazias entre elas.
 */
export function symmetryCopySeparated(base: string, eixo: 'x' | 'y'): boolean {
  const celulas = symmetryMarkCells(base)
  const meio = PAPEL_DO_ESPELHO / 2
  return (
    celulas.length > 0 &&
    celulas.every(([x, y]) => {
      const v = eixo === 'x' ? x : y
      return v < meio - 1 || v > meio
    })
  )
}

/** Um quadradinho pintado, e se ele é CÓPIA do espelho (e se é a cópia do último traço). */
export interface SymmetryCell {
  x: number
  y: number
  copia: boolean
  nova: boolean
}

/**
 * Os quadradinhos do papel, na ordem de pintura. ⚠️ Quadradinho que é original E cópia conta como
 * original: foi a criança que o pintou. `nova` marca as cópias do ÚLTIMO traço, que o palco destaca.
 * ⚠️ São as cópias DEPOIS da última marca da criança (com os dois espelhos um traço deixa três), e não
 * só a última da lista: o motor põe o traço e em seguida as cópias dele no fim (`pintarMarca`).
 */
export function symmetryCells(marcas: readonly string[]): SymmetryCell[] {
  const porCasa = new Map<string, SymmetryCell>()
  let ultimoTraco = -1
  marcas.forEach((marca, i) => {
    if (!marca.includes('|')) ultimoTraco = i
  })
  marcas.forEach((marca, i) => {
    const copia = marca.includes('|')
    const nova = copia && ultimoTraco >= 0 && i > ultimoTraco
    for (const [x, y] of symmetryMarkCells(marca)) {
      const chave = `${x},${y}`
      const antes = porCasa.get(chave)
      if (!antes) porCasa.set(chave, { x, y, copia, nova })
      else if (antes.copia && !copia) porCasa.set(chave, { x, y, copia: false, nova: false })
      else if (nova) porCasa.set(chave, { ...antes, nova: antes.copia })
    }
  })
  return [...porCasa.values()]
}

/** O teto dos dois contadores de gesto do espelho: o motor corta aqui, e o validador também. */
export const GESTOS_NO_PAPEL = 999

/* ── A lupa (`pixel-vector`) ────────────────────────────────────────────────────────────────── */

/**
 * ⚠️⚠️ UMA régua para o motor, a faixa, a frase e o palco. O limite de "perto" era 5 no motor e na
 * faixa, e com a lupa em 4 os degraus já estavam claros na tela enquanto o texto dizia "de longe,
 * igual". Em 6, os pontos da Caneta.
 * ⚠️⚠️ `perto` subiu de 3 para 4 (consertos do review da onda B do lote 5, M5): em 3 a pedra de pixel
 * tinha ~70 px na coluna e ~40 px no celular, e com a fresta clara entre os quadradinhos parecia uma
 * peneira, e não degraus, justo onde a previsão se revela. Em 4 a silhueta em degraus manda; a grade
 * fina por cima só entra em `grade` (5), com os quadradinhos já grandes.
 */
export const LUPA = { perto: 4, grade: 5, pontos: 6, longe: 2 } as const

/* ── A folha de dois quadros (`sheet-vs-sprite`) ───────────────────────────────────────────── */

/** A folha da nave: dois quadros de 32 × 32 lado a lado, 64 × 32 no total. */
export const FOLHA_DA_NAVE = { largura: 64, altura: 32, quadro: 32 } as const

/**
 * Os tamanhos no jogo PARECIDOS com o de fábrica (54): fora desta faixa a nave do jogo fica
 * visivelmente maior ou menor (consertos do review da onda B do lote 5, B8). ⚠️ Um toque no + (62)
 * fechava "mudou o tamanho no jogo e conferiu a folha" com a nave do jogo quase igual.
 */
export const TAMANHO_PARECIDO = { min: 40, max: 70 } as const

/** Quantos recortes daquela largura cabem na folha (16 → 4, 32 → 2, 64 → 1). */
export function sheetCropCount(largura: number): number {
  return Math.max(1, Math.floor(FOLHA_DA_NAVE.largura / Math.max(1, largura)))
}

/** Onde o recorte está, preso ao que cabe na largura de agora. */
export function sheetCropCell(cell: number, largura: number): number {
  return Math.min(Math.max(1, cell), sheetCropCount(largura))
}
