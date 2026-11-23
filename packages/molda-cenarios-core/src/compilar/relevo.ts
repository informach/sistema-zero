/**
 * O relevo de um mundo grande desenhado em pedaços, com menos detalhe longe (plano "Mundos de
 * 2 km", lote 1, 23/11/2026, `docs/plans/2026-11-23-mundos-de-2km.md`). Funções puras, as mesmas
 * para o carregador de cena (JavaScript), o gerador dos casos do Python e os testes.
 *
 * A grade de células do terreno vira uma árvore de quatro em quatro: um pedaço de nível 0 tem
 * `celulasPorNo` células de lado, com uma célula por quadrado; o de nível N cobre 2^N vezes isso,
 * com o mesmo número de quadrados (um a cada 2^N células). Um pedaço se divide quando o foco está
 * a menos de `fator` vezes o tamanho dele. Dois pedaços vizinhos nunca diferem mais de um nível:
 * é o que deixa as saias do desenho fecharem as frestas.
 */

export interface FormaDoRelevo {
  origem: { x: number; z: number }
  passo: number
  colunas: number
  linhas: number
}

export interface NoDoRelevo {
  nivel: number
  /** Posição do pedaço em unidades do próprio nível (a célula do canto é `ix × 2^nivel × celulasPorNo`). */
  ix: number
  iz: number
}

export interface OpcoesDoRelevo {
  /** Células de lado num pedaço de nível 0 (e quadrados de lado em qualquer nível). */
  celulasPorNo: number
  /** Divide quando a distância ao foco é menor que `fator × tamanho do pedaço`. */
  fator: number
  /** Metros: pedaço mais longe que isto não é desenhado (a neblina cobre). */
  alcance: number
  /** Teto de pedaços desenhados. */
  maximoDeNos: number
}

/** O espaçamento da grade (metros) pelo lado maior do mundo: 1 m até 1 km, 2 m até 2 km. */
export function passoDoTerreno(ladoEmMetros: number): number {
  if (!(Number.isFinite(ladoEmMetros) && ladoEmMetros > 0))
    throw new Error('O tamanho do mundo é inválido.')
  if (ladoEmMetros <= 1024) return 1
  if (ladoEmMetros <= 2048) return 2
  throw new Error('O mundo passa de 2 km de lado.')
}

/** O nível mais alto (o pedaço que cobre a grade inteira). */
export function nivelMaximoDoRelevo(forma: FormaDoRelevo, celulasPorNo: number): number {
  const lado = Math.max(forma.colunas, forma.linhas)
  let nivel = 0
  while (celulasPorNo * 2 ** nivel < lado) nivel++
  return nivel
}

/** As células (de, até, sem incluir o fim) que o pedaço cobre, cortadas na grade. */
export function celulasDoNo(
  forma: FormaDoRelevo,
  no: NoDoRelevo,
  celulasPorNo: number,
): { x0: number; z0: number; x1: number; z1: number } {
  const lado = celulasPorNo * 2 ** no.nivel
  return {
    x0: no.ix * lado,
    z0: no.iz * lado,
    x1: Math.min(forma.colunas, (no.ix + 1) * lado),
    z1: Math.min(forma.linhas, (no.iz + 1) * lado),
  }
}

const chave = (n: NoDoRelevo) => `${n.nivel}:${n.ix}:${n.iz}`

/**
 * Os pedaços a desenhar para o foco (x, z em metros), do mais perto ao mais longe. Divide primeiro
 * o que está mais perto (em proporção ao tamanho), mantém vizinhos com no máximo um nível de
 * diferença e respeita o teto: se o teto não deixa, o detalhe cai em todos, nunca numa parte só.
 */
export function selecionarNosDoRelevo(
  forma: FormaDoRelevo,
  foco: { x: number; z: number },
  opcoes: OpcoesDoRelevo,
): NoDoRelevo[] {
  const { celulasPorNo, alcance, maximoDeNos } = opcoes
  if (!Number.isSafeInteger(celulasPorNo) || celulasPorNo < 1)
    throw new Error('O tamanho do pedaço de relevo é inválido.')
  if (!Number.isSafeInteger(maximoDeNos) || maximoDeNos < 1)
    throw new Error('O teto de pedaços de relevo é inválido.')
  let fator = opcoes.fator
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    const folhas = dividir(forma, foco, celulasPorNo, fator, maximoDeNos)
    if (folhas.length <= maximoDeNos || fator <= 0) {
      const perto = (n: NoDoRelevo) => distanciaAoNo(forma, n, celulasPorNo, foco)
      return folhas
        .map((n) => ({ n, d: perto(n) }))
        .filter(({ d }) => d <= alcance)
        .sort((a, b) => a.d - b.d || a.n.nivel - b.n.nivel || a.n.iz - b.n.iz || a.n.ix - b.n.ix)
        .map(({ n }) => n)
    }
    fator *= 0.8
    if (fator < 1e-3) fator = 0
  }
  throw new Error('Não deu para escolher os pedaços de relevo dentro do teto.')
}

/** Metros do foco ao retângulo do pedaço, em x e z (0 dentro dele). */
export function distanciaAoNo(
  forma: FormaDoRelevo,
  no: NoDoRelevo,
  celulasPorNo: number,
  foco: { x: number; z: number },
): number {
  const c = celulasDoNo(forma, no, celulasPorNo),
    x0 = forma.origem.x + c.x0 * forma.passo,
    x1 = forma.origem.x + c.x1 * forma.passo,
    z0 = forma.origem.z + c.z0 * forma.passo,
    z1 = forma.origem.z + c.z1 * forma.passo,
    dx = foco.x < x0 ? x0 - foco.x : foco.x > x1 ? foco.x - x1 : 0,
    dz = foco.z < z0 ? z0 - foco.z : foco.z > z1 ? foco.z - z1 : 0
  return Math.hypot(dx, dz)
}

function dividir(
  forma: FormaDoRelevo,
  foco: { x: number; z: number },
  celulasPorNo: number,
  fator: number,
  maximoDeNos: number,
): NoDoRelevo[] {
  const nivelMaximo = nivelMaximoDoRelevo(forma, celulasPorNo)
  const folhas = new Map<string, NoDoRelevo>()
  const dentro = (n: NoDoRelevo) => {
    const lado = celulasPorNo * 2 ** n.nivel
    return n.ix >= 0 && n.iz >= 0 && n.ix * lado < forma.colunas && n.iz * lado < forma.linhas
  }
  const raiz = { nivel: nivelMaximo, ix: 0, iz: 0 }
  folhas.set(chave(raiz), raiz)
  const tamanho = (n: NoDoRelevo) => celulasPorNo * 2 ** n.nivel * forma.passo
  const prioridade = (n: NoDoRelevo) => distanciaAoNo(forma, n, celulasPorNo, foco) / tamanho(n)

  /** A folha que contém a célula (cx, cz), do nível `de` para cima; `null` fora da grade. */
  const folhaEm = (cx: number, cz: number, de: number): NoDoRelevo | null => {
    if (cx < 0 || cz < 0 || cx >= forma.colunas || cz >= forma.linhas) return null
    for (let nivel = de; nivel <= nivelMaximo; nivel++) {
      const lado = celulasPorNo * 2 ** nivel,
        n = folhas.get(`${nivel}:${Math.floor(cx / lado)}:${Math.floor(cz / lado)}`)
      if (n) return n
    }
    return null
  }

  /** Divide o pedaço, dividindo antes os vizinhos mais grossos (a árvore fica equilibrada). */
  const partir = (n: NoDoRelevo): NoDoRelevo[] => {
    const lado = celulasPorNo * 2 ** n.nivel,
      cx = n.ix * lado,
      cz = n.iz * lado
    for (const [vx, vz] of [
      [cx - 1, cz],
      [cx + lado, cz],
      [cx, cz - 1],
      [cx, cz + lado],
    ] as const) {
      const vizinho = folhaEm(vx, vz, n.nivel)
      if (vizinho && vizinho.nivel > n.nivel) partir(vizinho)
    }
    if (!folhas.delete(chave(n))) return []
    const filhos: NoDoRelevo[] = []
    for (const [dx, dz] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ] as const) {
      const f = { nivel: n.nivel - 1, ix: n.ix * 2 + dx, iz: n.iz * 2 + dz }
      if (!dentro(f)) continue
      folhas.set(chave(f), f)
      filhos.push(f)
    }
    return filhos
  }

  const fila: NoDoRelevo[] = [raiz]
  while (fila.length > 0) {
    // O mais perto, em proporção ao tamanho, primeiro.
    let melhor = 0
    for (let i = 1; i < fila.length; i++)
      if (prioridade(fila[i] as NoDoRelevo) < prioridade(fila[melhor] as NoDoRelevo)) melhor = i
    const n = fila.splice(melhor, 1)[0] as NoDoRelevo
    if (!folhas.has(chave(n)) || n.nivel === 0) continue
    if (prioridade(n) >= fator) continue
    if (folhas.size + 3 > maximoDeNos) break
    fila.push(...partir(n))
  }
  return [...folhas.values()]
}
