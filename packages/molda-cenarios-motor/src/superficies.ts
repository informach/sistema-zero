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

export interface SuperficieDoObjeto {
  id: string
  geometria: BufferGeometry
  material: Material | Material[]
  matriz: Matrix4
}

/** Consulta a geometria desenhada, sem duplicar malhas da cena nem alterar boundsTree. */
export class SuperficiesDosObjetos {
  private readonly consulta = new SceneSurfaceQuery()
  private entradas: (SuperficieDoObjeto & { caixa: Box3 })[] = []
  private sonda: Mesh | null = null
  private readonly normal = new Vector3()
  private readonly matrizNormal = new Matrix3()

  definir(fontes: readonly SuperficieDoObjeto[]) {
    this.entradas = fontes.map((f) => {
      if (!f.geometria.boundingBox) f.geometria.computeBoundingBox()
      return { ...f, caixa: f.geometria.boundingBox!.clone().applyMatrix4(f.matriz) }
    })
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

  acertar(
    raio: Raycaster,
    ignorados: ReadonlySet<string> = new Set(),
    somenteTopo = true,
  ): { id: string; ponto: Vector3; distancia: number } | null {
    const sonda = this.sonda
    if (!sonda) return null
    let resposta: { id: string; ponto: Vector3; distancia: number } | null = null
    for (const entrada of this.entradas) {
      if (ignorados.has(entrada.id) || !raio.ray.intersectsBox(entrada.caixa)) continue
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
    this.sonda = null
  }
}
