import { recortarMalha, SceneSurfaceQuery } from '@sistemazero/molda/palco'
import {
  type BaseDeTerreno,
  CELULAS_DA_PECA,
  criarFonteDeAlturas,
  type FonteDeAlturas,
  malhaDaPecaDeTerreno,
  type PecaDeAlturas,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Raycaster,
  ShapeUtils,
  Vector2,
  Vector3,
} from 'three'

/** Renderização e seleção das mesmas amostras; não conhece o jogo nem busca arquivos. */
export class TerrenoDoPalco {
  readonly grupo = new Group()
  readonly altura: FonteDeAlturas
  private readonly superficies: Mesh<BufferGeometry, MeshStandardMaterial>[] = []
  private readonly consulta = new SceneSurfaceQuery()
  private readonly caixa = new Box3()
  private readonly material = new MeshStandardMaterial({ vertexColors: true, roughness: 1 })
  private descartado = false

  constructor(
    readonly base: BaseDeTerreno,
    recursos: ReadonlyMap<string, PecaDeAlturas>,
  ) {
    this.altura = criarFonteDeAlturas(base, recursos)
    this.grupo.position.set(base.origem.x, 0, base.origem.z)
    const cor = new Color(),
      grama = new Color('#a4d48c'),
      areia = new Color('#d5c995'),
      fundo = new Color('#8d947d')
    const passo = base.passo
    const furos = (base.recortes ?? []).flatMap((p) =>
      ShapeUtils.triangulateShape(
        p.map((v) => new Vector2(v.x, v.z)),
        [],
      ).map((is) => is.map((i) => p[i]!)),
    )
    const adicionar = (
      vertices: Float32Array,
      indices: Uint16Array,
      uvs: Float32Array,
      ox: number,
      oz: number,
    ) => {
      const normais = new Float32Array(vertices.length),
        cores = new Float32Array(vertices.length)
      const normal = new Vector3()
      for (let i = 0; i < vertices.length; i += 3) {
        const x = base.origem.x + ox + vertices[i]!,
          z = base.origem.z + oz + vertices[i + 2]!,
          y = vertices[i + 1]!
        normal
          .set(
            -(this.altura(x + passo, z) - this.altura(x - passo, z)) / (2 * passo),
            1,
            -(this.altura(x, z + passo) - this.altura(x, z - passo)) / (2 * passo),
          )
          .normalize()
        normais.set([normal.x, normal.y, normal.z], i)
        cor.copy(y < 0 ? fundo : areia).lerp(grama, Math.max(0, Math.min(1, y / 3)))
        cores.set([cor.r, cor.g, cor.b], i)
      }
      let geometria = new BufferGeometry()
        .setAttribute('position', new BufferAttribute(vertices, 3))
        .setAttribute('normal', new BufferAttribute(normais, 3))
        .setAttribute('color', new BufferAttribute(cores, 3))
        .setAttribute('uv', new BufferAttribute(uvs, 2))
        .setIndex(new BufferAttribute(indices, 1))
      if (furos.length) {
        const original = geometria
        geometria = recortarMalha(
          original,
          [],
          furos.map((f) =>
            f.map((p) => ({ x: p.x - base.origem.x - ox, z: p.z - base.origem.z - oz })),
          ),
        )
        original.dispose()
      }
      geometria.computeBoundingBox()
      geometria.computeBoundingSphere()
      const malha = new Mesh(geometria, this.material)
      malha.position.set(ox, 0, oz)
      malha.receiveShadow = true
      this.grupo.add(malha)
      this.superficies.push(malha)
    }
    try {
      const ocupados = new Set<string>()
      for (const ref of base.pecas) {
        ocupados.add(`${ref.coluna}:${ref.linha}`)
        const dados = malhaDaPecaDeTerreno(base, ref, recursos.get(ref.digest)!)
        adicionar(
          dados.vertices,
          dados.indices,
          dados.uvs,
          dados.origem.x - base.origem.x,
          dados.origem.z - base.origem.z,
        )
      }
      // O piso ocupa apenas as peças omitidas. Nenhuma superfície fica sob outra coplanar.
      const vertices: number[] = [],
        indices: number[] = [],
        uvs: number[] = []
      for (let linha = 0; linha < base.linhas / CELULAS_DA_PECA; linha++)
        for (let coluna = 0; coluna < base.colunas / CELULAS_DA_PECA; coluna++) {
          if (ocupados.has(`${coluna}:${linha}`)) continue
          const x = coluna * CELULAS_DA_PECA * passo,
            z = linha * CELULAS_DA_PECA * passo,
            lado = CELULAS_DA_PECA * passo,
            i = vertices.length / 3
          vertices.push(
            x,
            base.fundo,
            z,
            x + lado,
            base.fundo,
            z,
            x,
            base.fundo,
            z + lado,
            x + lado,
            base.fundo,
            z + lado,
          )
          indices.push(i, i + 2, i + 1, i + 1, i + 2, i + 3)
          uvs.push(
            x / (base.colunas * passo),
            z / (base.linhas * passo),
            (x + lado) / (base.colunas * passo),
            z / (base.linhas * passo),
            x / (base.colunas * passo),
            (z + lado) / (base.linhas * passo),
            (x + lado) / (base.colunas * passo),
            (z + lado) / (base.linhas * passo),
          )
        }
      if (vertices.length)
        adicionar(
          Float32Array.from(vertices),
          Uint16Array.from(indices),
          Float32Array.from(uvs),
          0,
          0,
        )
      this.consulta.setSources(this.superficies.map((m) => m.geometry))
      this.grupo.updateMatrixWorld(true)
    } catch (e) {
      this.descartar()
      throw e
    }
  }

  fontesDoTeste() {
    this.grupo.updateWorldMatrix(true, true)
    return this.superficies.map((m) => ({ geometria: m.geometry, matriz: m.matrixWorld }))
  }

  pontoSobRaio(raio: Raycaster): Vector3 | null {
    if (this.descartado) return null
    this.grupo.updateWorldMatrix(true, true)
    let distancia = Infinity,
      ponto: Vector3 | null = null
    for (const malha of this.superficies) {
      this.caixa.copy(malha.geometry.boundingBox!).applyMatrix4(malha.matrixWorld)
      if (!raio.ray.intersectsBox(this.caixa)) continue
      for (const hit of this.consulta.intersect(malha, raio))
        if (hit.distance < distancia) {
          distancia = hit.distance
          ponto = hit.point.clone()
        }
    }
    return ponto
  }

  descartar() {
    if (this.descartado) return
    this.descartado = true
    this.consulta.dispose()
    for (const m of this.superficies) {
      this.grupo.remove(m)
      m.geometry.dispose()
    }
    this.superficies.length = 0
    this.material.dispose()
    this.grupo.removeFromParent()
  }
}
