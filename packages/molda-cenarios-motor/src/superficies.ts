import { SceneSurfaceQuery } from '@sistemazero/molda/palco'
import {
  type Box3,
  type BufferGeometry,
  type Material,
  Matrix3,
  type Matrix4,
  Mesh,
  type Raycaster,
  Vector3,
} from 'three'
import { IndiceDeCaixas } from './indice-de-caixas'

export interface SuperficieDoObjeto {
  id: string
  /** Identidade da peça desenhada; o id público pode ser a raiz de uma montagem. */
  chave?: string
  pendente?: boolean
  relativa?: Matrix4
  geometria: BufferGeometry
  material: Material | Material[]
  matriz: Matrix4
}

/** Consulta a geometria desenhada, sem duplicar malhas da cena nem alterar boundsTree. */
export class SuperficiesDosObjetos {
  private readonly consulta = new SceneSurfaceQuery()
  private entradas: (SuperficieDoObjeto & { caixa: Box3 })[] = []
  private readonly indice = new IndiceDeCaixas()
  private readonly porChave = new Map<string, number[]>()
  private sonda: Mesh | null = null
  private readonly normal = new Vector3()
  private readonly matrizNormal = new Matrix3()

  limites(destino: Box3): Box3 {
    return this.indice.limites(destino)
  }

  definir(fontes: readonly SuperficieDoObjeto[]) {
    this.porChave.clear()
    this.entradas = fontes.map((f, i) => {
      if (!f.geometria.boundingBox) f.geometria.computeBoundingBox()
      const chave = f.chave ?? f.id,
        anteriores = this.porChave.get(chave) ?? []
      anteriores.push(i)
      this.porChave.set(chave, anteriores)
      return {
        ...f,
        matriz: f.matriz.clone(),
        caixa: f.geometria.boundingBox!.clone().applyMatrix4(f.matriz),
      }
    })
    this.indice.definir(this.entradas.map((e) => e.caixa))
    this.consulta.setSources(fontes.map((f) => f.geometria))
    if (fontes.length && !this.sonda) {
      this.sonda = new Mesh(fontes[0]!.geometria, fontes[0]!.material)
      this.sonda.matrixAutoUpdate = false
    }
    if (fontes.length && this.sonda) {
      this.sonda.geometry = fontes[0]!.geometria
      this.sonda.material = fontes[0]!.material
    }
    if (!fontes.length) this.sonda = null
  }

  atualizar(chave: string, matriz: Matrix4): void {
    for (const i of this.porChave.get(chave) ?? []) {
      const e = this.entradas[i]!
      if (e.relativa) e.matriz.multiplyMatrices(matriz, e.relativa)
      else e.matriz.copy(matriz)
      e.caixa.copy(e.geometria.boundingBox!).applyMatrix4(e.matriz)
      this.indice.atualizar(i, e.caixa)
    }
  }

  escolher(raio: Raycaster) {
    return this.acertar(raio, new Set(), false, true)
  }

  acertar(
    raio: Raycaster,
    ignorados: ReadonlySet<string> = new Set(),
    somenteTopo = true,
    incluirPendentes = false,
  ): { id: string; ponto: Vector3; distancia: number } | null {
    const sonda = this.sonda
    if (!sonda) return null
    let resposta: { id: string; ponto: Vector3; distancia: number } | null = null
    for (const i of this.indice.consultar(raio.ray)) {
      const entrada = this.entradas[i]!
      if (ignorados.has(entrada.id) || (entrada.pendente && !incluirPendentes)) continue
      sonda.geometry = entrada.geometria
      sonda.material = entrada.material
      sonda.matrixWorld.copy(entrada.matriz)
      this.matrizNormal.getNormalMatrix(entrada.matriz)
      for (const hit of this.consulta.intersect(sonda, raio)) {
        if (resposta && hit.distance >= resposta.distancia) continue
        if (
          somenteTopo &&
          (!hit.face ||
            this.normal.copy(hit.face.normal).applyNormalMatrix(this.matrizNormal).y < 0.1)
        )
          continue
        resposta = { id: entrada.id, ponto: hit.point.clone(), distancia: hit.distance }
      }
    }
    return resposta
  }

  descartar() {
    this.consulta.dispose()
    this.entradas = []
    this.porChave.clear()
    this.indice.definir([])
    this.sonda = null
  }
}
