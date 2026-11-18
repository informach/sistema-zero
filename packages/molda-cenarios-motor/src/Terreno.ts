import { recortarMalha, SceneSurfaceQuery } from '@sistemazero/molda/palco'
import {
  abrirEdicaoDeTerreno,
  type BaseDeTerreno,
  CELULAS_DA_PECA,
  criarFonteDeAlturas,
  type EstadoDoTerreno,
  type FonteDeAlturas,
  malhaDeGradeNaPeca,
  type PecaDeAlturas,
  type RecursoDeTerreno,
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
  type Texture,
  Vector2,
  Vector3,
} from 'three'
import { MaterialDoSolo } from './material-solo'

/** Renderização e seleção das mesmas amostras; não conhece o jogo nem busca arquivos. */
export class TerrenoDoPalco {
  readonly grupo = new Group()
  readonly altura: FonteDeAlturas
  readonly estado: EstadoDoTerreno
  private readonly superficies: Mesh<BufferGeometry, MeshStandardMaterial>[] = []
  private readonly consulta = new SceneSurfaceQuery()
  private readonly caixa = new Box3()
  private readonly material: MeshStandardMaterial
  private readonly acabamento: MaterialDoSolo | null
  private descartado = false

  constructor(
    readonly base: BaseDeTerreno,
    recursos: ReadonlyMap<string, RecursoDeTerreno>,
  ) {
    const alturas = new Map<string, PecaDeAlturas>()
    for (const [digest, recurso] of recursos)
      if (recurso.tipo === 'alturas') alturas.set(digest, recurso.alturas)
    this.altura = criarFonteDeAlturas(base, alturas)
    this.estado = abrirEdicaoDeTerreno(base, recursos)
    this.acabamento = base.solo ? new MaterialDoSolo(base.solo.camadas) : null
    this.material =
      this.acabamento?.material ?? new MeshStandardMaterial({ vertexColors: true, roughness: 1 })
    this.grupo.position.set(base.origem.x, 0, base.origem.z)
    const cor = new Color(),
      grama = new Color('#a4d48c'),
      areia = new Color('#d5c995'),
      fundo = new Color('#8d947d')
    const passo = base.passo
    const coresDoSolo = base.solo?.camadas.map((c) => new Color(c.cor))
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
      if (!indices.length) return
      const normais = new Float32Array(vertices.length),
        cores = new Float32Array(vertices.length),
        pesosA = coresDoSolo ? new Uint8Array((vertices.length / 3) * 4) : null,
        pesosB = coresDoSolo ? new Uint8Array((vertices.length / 3) * 4) : null
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
        if (coresDoSolo) {
          cor.setRGB(0, 0, 0)
          const ix = Math.max(0, Math.min(base.colunas, Math.round((x - base.origem.x) / passo))),
            iz = Math.max(0, Math.min(base.linhas, Math.round((z - base.origem.z) / passo))),
            inicio = (iz * (base.colunas + 1) + ix) * coresDoSolo.length
          for (let c = 0; c < coresDoSolo.length; c++) {
            const peso = this.estado.pintura.pesos[inicio + c]! / 255,
              camada = coresDoSolo[c]!
            cor.r += camada.r * peso
            cor.g += camada.g * peso
            cor.b += camada.b * peso
            const pesos = c < 4 ? pesosA! : pesosB!
            pesos[(i / 3) * 4 + (c % 4)] = this.estado.pintura.pesos[inicio + c]!
          }
        } else cor.copy(y < 0 ? fundo : areia).lerp(grama, Math.max(0, Math.min(1, y / 3)))
        cores.set([cor.r, cor.g, cor.b], i)
      }
      let geometria = new BufferGeometry()
        .setAttribute('position', new BufferAttribute(vertices, 3))
        .setAttribute('normal', new BufferAttribute(normais, 3))
        .setAttribute('color', new BufferAttribute(cores, 3))
        .setAttribute('uv', new BufferAttribute(uvs, 2))
        .setIndex(new BufferAttribute(indices, 1))
      if (pesosA && pesosB) {
        geometria.setAttribute('mcnPesosA', new BufferAttribute(pesosA, 4, true))
        geometria.setAttribute('mcnPesosB', new BufferAttribute(pesosB, 4, true))
      }
      geometria.computeBoundingBox()
      const volume = geometria.boundingBox!
      const recortes = furos.filter(
        (f) =>
          Math.max(...f.map((p) => p.x)) >= base.origem.x + ox + volume.min.x &&
          Math.min(...f.map((p) => p.x)) <= base.origem.x + ox + volume.max.x &&
          Math.max(...f.map((p) => p.z)) >= base.origem.z + oz + volume.min.z &&
          Math.min(...f.map((p) => p.z)) <= base.origem.z + oz + volume.max.z,
      )
      if (recortes.length) {
        const original = geometria
        geometria = recortarMalha(
          original,
          [],
          recortes.map((f) =>
            f.map((p) => ({ x: p.x - base.origem.x - ox, z: p.z - base.origem.z - oz })),
          ),
        )
        original.dispose()
      }
      if (!geometria.getAttribute('position')?.count) {
        geometria.dispose()
        return
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
      const posicoes = new Map(
        [...base.pecas, ...(base.solo?.pecas ?? []), ...(base.buracos ?? [])].map((p) => [
          `${p.coluna}:${p.linha}`,
          p,
        ]),
      )
      for (const ref of posicoes.values()) {
        ocupados.add(`${ref.coluna}:${ref.linha}`)
        const campo = this.estado.campo,
          mascara = this.estado.buracos
        const dados = malhaDeGradeNaPeca(
          base,
          ref,
          (x, z) =>
            campo.alturas[
              (ref.linha * CELULAS_DA_PECA + z) * (base.colunas + 1) +
                ref.coluna * CELULAS_DA_PECA +
                x
            ]!,
          (x, z) => mascara.celulas[z * base.colunas + x] === 1,
        )
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

  definirTexturas(obter: (id: string) => Texture | undefined) {
    this.acabamento?.definirTexturas(obter)
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
    if (this.acabamento) this.acabamento.descartar()
    else this.material.dispose()
    this.grupo.removeFromParent()
  }
}
