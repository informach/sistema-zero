import { recortarMalha, SceneSurfaceQuery } from '@sistemazero/molda/palco'
import {
  abrirEdicaoDeTerreno,
  alturaDoCampo,
  type BaseDeTerreno,
  CELULAS_DA_PECA,
  criarFonteDeAlturas,
  dominioDoChao,
  type EstadoDoTerreno,
  type FonteDeAlturas,
  malhaDeGradeNaPeca,
  type PapelDaPeca,
  type PecaDeAlturas,
  pecasDaRegiao,
  pontoNoBuraco,
  type RecursoDeTerreno,
  type RegiaoDoCampo,
  unirRegioes,
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
import { intersecaoComCampo } from './intersecao-campo'
import { MaterialDoSolo } from './material-solo'

type Malha = Mesh<BufferGeometry, MeshStandardMaterial>
export type RegioesDoTerreno = Partial<Record<PapelDaPeca, RegiaoDoCampo | null>>

/** Renderização e seleção das mesmas amostras; não conhece o jogo nem busca arquivos. */
export class TerrenoDoPalco {
  readonly grupo = new Group()
  readonly altura: FonteDeAlturas
  readonly alturaPublicada: FonteDeAlturas
  private campoAtual: EstadoDoTerreno
  get estado() {
    return this.campoAtual
  }
  private readonly superficies: Mesh<BufferGeometry, MeshStandardMaterial>[] = []
  private readonly consulta = new SceneSurfaceQuery()
  private readonly caixa = new Box3()
  private readonly material: MeshStandardMaterial
  private readonly acabamento: MaterialDoSolo | null
  private readonly pecas = new Map<string, Malha>()
  private readonly ativas = new Set<string>()
  private readonly alturasAtivas = new Set<string>()
  private piso: Malha | null = null
  private readonly criarMalha: (
    vertices: Float32Array,
    indices: Uint16Array,
    uvs: Float32Array,
    ox: number,
    oz: number,
  ) => Malha | null
  private readonly prepararPiso: () => void
  private previa: {
    estado: EstadoDoTerreno
    ativas: Set<string>
    alturas: Set<string>
    alteradas: Set<string>
  } | null = null
  private descartado = false

  constructor(
    readonly base: BaseDeTerreno,
    recursos: ReadonlyMap<string, RecursoDeTerreno>,
  ) {
    const alturas = new Map<string, PecaDeAlturas>()
    for (const [digest, recurso] of recursos)
      if (recurso.tipo === 'alturas') alturas.set(digest, recurso.alturas)
    const original = criarFonteDeAlturas(base, alturas)
    this.alturaPublicada = original
    this.campoAtual = abrirEdicaoDeTerreno(base, recursos)
    this.altura = (x, z) => (this.previa ? this.lerAlturaDoCampo(x, z) : original(x, z))
    const dominio = dominioDoChao(base)
    this.altura.temChao = (p) =>
      dominio(p) && !pontoNoBuraco(base, this.campoAtual.buracos, p.x, p.z)
    for (const ref of base.pecas) this.alturasAtivas.add(`${ref.coluna}:${ref.linha}`)
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
    this.criarMalha = (
      vertices: Float32Array,
      indices: Uint16Array,
      uvs: Float32Array,
      ox: number,
      oz: number,
    ) => {
      if (!indices.length) return null
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
        return null
      }
      geometria.computeBoundingBox()
      geometria.computeBoundingSphere()
      const malha = new Mesh(geometria, this.material)
      malha.position.set(ox, 0, oz)
      malha.receiveShadow = true
      return malha
    }
    try {
      const ocupados = this.ativas
      const posicoes = new Map(
        [...base.pecas, ...(base.solo?.pecas ?? []), ...(base.buracos ?? [])].map((p) => [
          `${p.coluna}:${p.linha}`,
          p,
        ]),
      )
      for (const ref of posicoes.values()) {
        ocupados.add(`${ref.coluna}:${ref.linha}`)
        this.instalarPeca(ref.coluna, ref.linha)
      }
      // O piso ocupa apenas as peças omitidas. Nenhuma superfície fica sob outra coplanar.
      this.prepararPiso = () => {
        if (this.piso) this.retirarMalha(this.piso)
        this.piso = null
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
          this.piso = this.criarMalha(
            Float32Array.from(vertices),
            Uint16Array.from(indices),
            Float32Array.from(uvs),
            0,
            0,
          )
        this.adicionarMalha(this.piso)
      }
      this.prepararPiso()
      this.indexar()
    } catch (e) {
      this.descartar()
      throw e
    }
  }

  private adicionarMalha(malha: Malha | null) {
    if (!malha) return
    this.grupo.add(malha)
    this.superficies.push(malha)
  }
  private retirarMalha(malha: Malha) {
    this.grupo.remove(malha)
    const indice = this.superficies.indexOf(malha)
    if (indice >= 0) this.superficies.splice(indice, 1)
    malha.geometry.dispose()
  }
  private instalarPeca(coluna: number, linha: number) {
    const chave = `${coluna}:${linha}`,
      antiga = this.pecas.get(chave)
    if (antiga) {
      this.retirarMalha(antiga)
      this.pecas.delete(chave)
    }
    if (!this.ativas.has(chave)) return
    const campo = this.estado.campo,
      mascara = this.estado.buracos,
      base = this.base,
      propria = this.alturasAtivas.has(chave)
    const dados = malhaDeGradeNaPeca(
      base,
      { coluna, linha },
      (x, z) =>
        propria
          ? campo.alturas[
              (linha * CELULAS_DA_PECA + z) * (base.colunas + 1) + coluna * CELULAS_DA_PECA + x
            ]!
          : base.fundo,
      (x, z) => mascara.celulas[z * base.colunas + x] === 1,
    )
    const malha = this.criarMalha(
      dados.vertices,
      dados.indices,
      dados.uvs,
      dados.origem.x - base.origem.x,
      dados.origem.z - base.origem.z,
    )
    if (malha) {
      this.pecas.set(chave, malha)
      this.adicionarMalha(malha)
    }
  }
  private indexar() {
    this.consulta.setSources(this.superficies.map((m) => m.geometry))
    this.grupo.updateMatrixWorld(true)
  }
  private lerAlturaDoCampo(x: number, z: number) {
    const c = this.estado.campo,
      gx = (x - c.origem.x) / c.passo,
      gz = (z - c.origem.z) / c.passo
    if (!Number.isFinite(gx) || !Number.isFinite(gz))
      throw new Error('O ponto de altura é inválido')
    if (gx < 0 || gz < 0 || gx > c.colunas || gz > c.linhas) return this.base.fundo
    const coluna = Math.min(c.colunas / CELULAS_DA_PECA - 1, Math.floor(gx / CELULAS_DA_PECA)),
      linha = Math.min(c.linhas / CELULAS_DA_PECA - 1, Math.floor(gz / CELULAS_DA_PECA))
    return this.alturasAtivas.has(`${coluna}:${linha}`) ? alturaDoCampo(c, x, z) : this.base.fundo
  }

  /** O campo recebido é uma cópia de trabalho; os recursos publicados permanecem imutáveis. */
  prever(estado: EstadoDoTerreno, regioes: RegioesDoTerreno) {
    if (this.descartado) return
    const c = estado.campo,
      b = this.base
    if (
      c.colunas !== b.colunas ||
      c.linhas !== b.linhas ||
      c.passo !== b.passo ||
      c.origem.x !== b.origem.x ||
      c.origem.z !== b.origem.z ||
      c.min !== b.min ||
      c.max !== b.max ||
      estado.pintura.camadas !== (b.solo?.camadas.length ?? 1) ||
      estado.pintura.colunas !== b.colunas ||
      estado.pintura.linhas !== b.linhas ||
      estado.buracos.colunas !== b.colunas ||
      estado.buracos.linhas !== b.linhas
    )
      throw new Error('A prévia não corresponde ao terreno aberto')
    let regiao: RegiaoDoCampo | null = null
    for (const r of Object.values(regioes)) regiao = unirRegioes(regiao, r ?? null)
    if (!regiao) return
    if (!this.previa) {
      if (estado === this.campoAtual)
        throw new Error('Use uma cópia de trabalho para prever o terreno')
      this.previa = {
        estado: this.campoAtual,
        ativas: new Set(this.ativas),
        alturas: new Set(this.alturasAtivas),
        alteradas: new Set(),
      }
    }
    this.campoAtual = estado
    for (const p of pecasDaRegiao(c, regiao)) this.ativas.add(`${p.coluna}:${p.linha}`)
    for (const p of pecasDaRegiao(c, regioes.alturas ?? null))
      this.alturasAtivas.add(`${p.coluna}:${p.linha}`)
    const normais = {
      x0: Math.max(0, regiao.x0 - 1),
      z0: Math.max(0, regiao.z0 - 1),
      x1: Math.min(c.colunas, regiao.x1 + 1),
      z1: Math.min(c.linhas, regiao.z1 + 1),
    }
    for (const p of pecasDaRegiao(c, normais)) {
      this.previa.alteradas.add(`${p.coluna}:${p.linha}`)
      this.instalarPeca(p.coluna, p.linha)
    }
    this.prepararPiso()
    this.indexar()
  }

  cancelarPrevia() {
    const previa = this.previa
    if (!previa || this.descartado) return
    this.previa = null
    this.campoAtual = previa.estado
    this.ativas.clear()
    for (const chave of previa.ativas) this.ativas.add(chave)
    this.alturasAtivas.clear()
    for (const chave of previa.alturas) this.alturasAtivas.add(chave)
    for (const chave of previa.alteradas) {
      const [coluna, linha] = chave.split(':').map(Number)
      this.instalarPeca(coluna!, linha!)
    }
    this.prepararPiso()
    this.indexar()
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

  pontoParaEditar(raio: Raycaster, publicado = false): Vector3 | null {
    if (this.descartado) return null
    const alturas = publicado && this.previa ? this.previa.alturas : this.alturasAtivas,
      campo = publicado && this.previa ? this.previa.estado.campo : this.estado.campo
    return intersecaoComCampo(this.base, raio, (x, z, saida) => {
      const coluna = Math.floor(x / CELULAS_DA_PECA),
        linha = Math.floor(z / CELULAS_DA_PECA)
      if (!alturas.has(`${coluna}:${linha}`)) {
        saida.fill(this.base.fundo)
        return
      }
      const c = campo,
        i = z * (c.colunas + 1) + x
      saida[0] = c.alturas[i]!
      saida[1] = c.alturas[i + 1]!
      saida[2] = c.alturas[i + c.colunas + 1]!
      saida[3] = c.alturas[i + c.colunas + 2]!
    })
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
    this.pecas.clear()
    this.previa = null
    this.piso = null
    if (this.acabamento) this.acabamento.descartar()
    else this.material.dispose()
    this.grupo.removeFromParent()
  }
}
