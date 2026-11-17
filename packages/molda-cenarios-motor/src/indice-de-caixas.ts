import { Box3, type Ray, Vector3 } from 'three'

interface No {
  caixa: Box3
  pai: number
  esquerda: number
  direita: number
  item: number
}

/** BVH de volumes de instâncias. Refit altera somente a folha e seus ancestrais. */
export class IndiceDeCaixas {
  private nos: No[] = []
  private folhas: number[] = []
  get quantidade() {
    return this.folhas.length
  }

  definir(caixas: readonly Box3[]): void {
    this.nos = []
    this.folhas = new Array(caixas.length)
    const centros = caixas.map((c) => c.getCenter(new Vector3()))
    const construir = (ids: number[], pai: number): number => {
      const indice = this.nos.length,
        caixa = new Box3()
      for (const i of ids) caixa.union(caixas[i]!)
      const no: No = { caixa, pai, esquerda: -1, direita: -1, item: -1 }
      this.nos.push(no)
      if (ids.length === 1) {
        no.item = ids[0]!
        this.folhas[no.item] = indice
        return indice
      }
      const extensao = caixa.getSize(new Vector3())
      const eixo =
        extensao.x >= extensao.y && extensao.x >= extensao.z
          ? 'x'
          : extensao.y >= extensao.z
            ? 'y'
            : 'z'
      ids.sort((a, b) => centros[a]![eixo] - centros[b]![eixo] || a - b)
      const meio = Math.floor(ids.length / 2)
      no.esquerda = construir(ids.slice(0, meio), indice)
      no.direita = construir(ids.slice(meio), indice)
      return indice
    }
    if (caixas.length)
      construir(
        caixas.map((_, i) => i),
        -1,
      )
  }

  atualizar(item: number, caixa: Box3): void {
    const folha = this.folhas[item]
    if (folha === undefined) throw new RangeError('Volume fora do índice')
    let no = this.nos[folha]!
    if (no.caixa.equals(caixa)) return
    no.caixa.copy(caixa)
    while (no.pai !== -1) {
      no = this.nos[no.pai]!
      no.caixa.copy(this.nos[no.esquerda]!.caixa).union(this.nos[no.direita]!.caixa)
    }
  }

  limites(destino: Box3): Box3 {
    return this.nos.length ? destino.copy(this.nos[0]!.caixa) : destino.makeEmpty()
  }

  consultar(raio: Ray): number[] {
    const pilha = this.nos.length ? [0] : [],
      resposta: number[] = []
    while (pilha.length) {
      const no = this.nos[pilha.pop()!]!
      if (no.caixa.isEmpty() || !raio.intersectsBox(no.caixa)) continue
      if (no.item !== -1) resposta.push(no.item)
      else pilha.push(no.direita, no.esquerda)
    }
    // Empates seguem a ordem das fontes: não alteramos qual face/objeto o Three escolheria.
    return resposta.sort((a, b) => a - b)
  }

  sobrepor(caixa: Box3): number[] {
    const pilha = this.nos.length ? [0] : [],
      resposta: number[] = []
    while (pilha.length) {
      const no = this.nos[pilha.pop()!]!
      if (no.caixa.isEmpty() || !caixa.intersectsBox(no.caixa)) continue
      if (no.item !== -1) resposta.push(no.item)
      else pilha.push(no.direita, no.esquerda)
    }
    return resposta.sort((a, b) => a - b)
  }
}
