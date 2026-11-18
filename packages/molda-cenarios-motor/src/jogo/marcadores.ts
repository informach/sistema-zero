import {
  alturaDoChao,
  type DocumentoDeCenario,
  type FonteDeAlturas,
  indiceDaOrganizacao,
  type MarcadorDeCenario,
  type RegioesDeTerreno,
  transformacaoDoMarcador,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  Box3,
  BufferGeometry,
  type Camera,
  Color,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  type Raycaster,
  Vector3,
} from 'three'
import type { AlvoDeEdicao } from '../alvos-de-edicao'
import { IndiceDeCaixas } from '../indice-de-caixas'
import { desenhoDoMarcador } from './desenho-de-marcador'

export interface EstadoDosMarcadores {
  carregando: number
  falhas: { id: string; nome: string; mensagem: string }[]
}
interface Entrada {
  chave: string
  marcador: MarcadorDeCenario
  linhas: Float32Array
  matriz: Matrix4
  local: Box3
  caixa: Box3
  cor: Color
  deslocamento: number
  indice: number
  relevoOriginal?: Float64Array
}
const MAX_VERTICES = 600_000
const CORES = {
  ponto: '#628cff',
  inicio: '#3ccf91',
  zona: '#ae83ed',
  rota: '#efbb52',
  camera: '#65b9ee',
  luz: '#f2cc5c',
  regua: '#69c7d7',
  escala: '#ed9b73',
}

/** Guias de edição em um único desenho. Não registra malha de colisão nem muda o documento. */
export class MarcadoresDoPalco {
  readonly grupo = new Group()
  private geometria = new BufferGeometry()
  private readonly material = new LineBasicMaterial({
    vertexColors: true,
    depthTest: false,
    transparent: true,
    opacity: 0.9,
  })
  private readonly desenho = new LineSegments(this.geometria, this.material)
  private readonly entradas = new Map<string, Entrada>()
  private ordem: Entrada[] = []
  private readonly indice = new IndiceDeCaixas()
  private readonly ponto = new Vector3()
  private readonly de = new Vector3()
  private readonly ate = new Vector3()
  private readonly noRaio = new Vector3()
  private readonly naLinha = new Vector3()
  private readonly volume = new Box3()
  private capacidade = 0
  private atributos: { position: Float32BufferAttribute; color: Float32BufferAttribute } | null =
    null
  private fonte: FonteDeAlturas | undefined
  private documento: DocumentoDeCenario | null = null
  private destruido = false

  constructor() {
    this.desenho.frustumCulled = false
    this.desenho.renderOrder = 998
    this.grupo.add(this.desenho)
    this.reservar(64)
    this.geometria.setDrawRange(0, 0)
  }
  private reservar(n: number) {
    if (n <= this.capacidade) return
    const capacidade = Math.min(MAX_VERTICES, Math.max(64, 2 ** Math.ceil(Math.log2(n))))
    if (n > capacidade) throw Error('As guias excedem o orçamento de desenho do cenário.')
    const nova = new BufferGeometry(),
      atributos = {
        position: new Float32BufferAttribute(capacidade * 3, 3).setUsage(DynamicDrawUsage),
        color: new Float32BufferAttribute(capacidade * 3, 3).setUsage(DynamicDrawUsage),
      }
    for (const [nome, atributo] of Object.entries(atributos)) nova.setAttribute(nome, atributo)
    // Trocar atributos de uma geometria viva deixaria os buffers anteriores sem dono.
    this.geometria.dispose()
    this.geometria = nova
    this.atributos = atributos
    this.desenho.geometry = nova
    this.capacidade = capacidade
  }
  definir(doc: DocumentoDeCenario, fonte?: FonteDeAlturas, aspecto = 1.5): EstadoDosMarcadores {
    const estado: EstadoDosMarcadores = { carregando: 0, falhas: [] }
    if (this.destruido) return estado
    this.documento = doc
    const flags = indiceDaOrganizacao(doc).flags,
      vivos = new Set<string>()
    if (doc.base.tipo === 'terreno' && !fonte) {
      this.limpar()
      estado.carregando = doc.marcadores.filter((m) => !flags.get(m.id)?.oculto).length
      return estado
    }
    const mudouFonte = this.fonte !== fonte
    this.fonte = fonte
    this.ordem = []
    let vertices = 0
    for (const m of doc.marcadores) {
      if (flags.get(m.id)?.oculto) continue
      try {
        const c = m.configuracao,
          rota = c?.tipo === 'rota',
          chave = JSON.stringify([
            c ?? null,
            rota ? [m.posicao, m.giro, m.noChao] : null,
            c?.tipo === 'camera' ? aspecto : null,
          ]),
          anterior = this.entradas.get(m.id),
          t = transformacaoDoMarcador(doc, m, fonte)
        let e = anterior
        if (!e || e.chave !== chave || (rota && mudouFonte)) {
          const linhas = desenhoDoMarcador(doc, m, fonte, aspecto)
          e = {
            chave,
            marcador: m,
            linhas,
            matriz: new Matrix4(),
            local: new Box3().setFromArray(linhas),
            caixa: new Box3(),
            cor: new Color(CORES[c?.tipo ?? 'ponto']),
            deslocamento: 0,
            indice: 0,
          }
        }
        if (vertices + e.linhas.length / 3 > MAX_VERTICES)
          throw Error('As guias excedem 600 mil vértices. Divida a composição em outros cenários.')
        e.marcador = m
        e.matriz.makeRotationY(m.giro).setPosition(t.posicao.x, t.posicao.y, t.posicao.z)
        e.caixa.copy(e.local).applyMatrix4(e.matriz)
        e.deslocamento = vertices
        e.indice = this.ordem.length
        vertices += e.linhas.length / 3
        this.entradas.set(m.id, e)
        this.ordem.push(e)
        vivos.add(m.id)
      } catch (erro) {
        estado.falhas.push({
          id: m.id,
          nome: m.nome,
          mensagem: erro instanceof Error ? erro.message : 'Não consegui desenhar este marcador.',
        })
      }
    }
    for (const id of this.entradas.keys()) if (!vivos.has(id)) this.entradas.delete(id)
    this.reservar(vertices)
    const { position: pos, color: cor } = this.atributos!
    pos.clearUpdateRanges()
    cor.clearUpdateRanges()
    for (const e of this.ordem) this.gravar(e)
    this.geometria.setDrawRange(0, vertices)
    this.indice.definir(this.ordem.map((e) => e.caixa))
    return estado
  }
  private gravar(e: Entrada, previa = false) {
    const { position: pos, color: cor } = this.atributos!
    const rota =
        previa &&
        e.marcador.configuracao?.tipo === 'rota' &&
        e.marcador.configuracao.seguirTerreno &&
        this.documento,
      base = this.documento?.base,
      altura = (x: number, z: number) => alturaDoChao(base!, x, z, this.fonte),
      p = e.marcador.posicao,
      c = Math.cos(e.marcador.giro),
      s = Math.sin(e.marcador.giro),
      alturaAtual = rota ? altura(e.matriz.elements[12]!, e.matriz.elements[14]!) : 0
    if (rota && !e.relevoOriginal) {
      e.relevoOriginal = new Float64Array(e.linhas.length / 3)
      const raiz = altura(p.x, p.z)
      for (let i = 0; i < e.linhas.length; i += 3)
        e.relevoOriginal[i / 3] =
          altura(
            p.x + c * e.linhas[i]! + s * e.linhas[i + 2]!,
            p.z - s * e.linhas[i]! + c * e.linhas[i + 2]!,
          ) - raiz
    }
    e.caixa.makeEmpty()
    for (let i = 0; i < e.linhas.length; i += 3) {
      this.ponto.fromArray(e.linhas, i).applyMatrix4(e.matriz)
      // O relevo não é um volume rígido nem cresce ao redimensionar a rota.
      if (rota)
        this.ponto.y +=
          altura(this.ponto.x, this.ponto.z) -
          alturaAtual -
          e.relevoOriginal![i / 3]! * e.matriz.elements[5]!
      e.caixa.expandByPoint(this.ponto)
      const indice = e.deslocamento + i / 3
      pos.setXYZ(indice, this.ponto.x, this.ponto.y, this.ponto.z)
      cor.setXYZ(indice, e.cor.r, e.cor.g, e.cor.b)
    }
    pos.addUpdateRange(e.deslocamento * 3, e.linhas.length)
    cor.addUpdateRange(e.deslocamento * 3, e.linhas.length)
    pos.needsUpdate = true
    cor.needsUpdate = true
  }
  alvos(): Map<string, AlvoDeEdicao> {
    return new Map(
      this.ordem.map((e) => [
        e.marcador.id,
        {
          pecas: [],
          caixa: e.local,
          matriz: e.matriz,
          uniforme:
            e.marcador.configuracao?.tipo === 'escala' ||
            (e.marcador.configuracao?.tipo === 'zona' &&
              e.marcador.configuracao.forma.tipo === 'esfera'),
          atualizar: () => {
            this.gravar(e, true)
            this.indice.atualizar(e.indice, e.caixa)
          },
        },
      ]),
    )
  }
  marcador(id: string): Readonly<MarcadorDeCenario> | undefined {
    return this.entradas.get(id)?.marcador
  }
  limitesDo(id: string, destino: Box3): Box3 {
    const e = this.entradas.get(id)
    return e && this.grupo.visible ? destino.copy(e.caixa) : destino.makeEmpty()
  }
  limites(destino: Box3): Box3 {
    return this.grupo.visible ? this.indice.limites(destino) : destino.makeEmpty()
  }
  escolher(
    raio: Raycaster,
    camera: Camera,
    altura: number,
  ): { id: string; ponto: Vector3; distancia: number } | null {
    if (this.destruido || !this.grupo.visible || altura <= 1 || !this.ordem.length) return null
    this.indice.limites(this.volume)
    const maxDistancia =
        this.volume.getCenter(this.ponto).distanceTo(raio.ray.origin) +
        this.volume.getSize(this.de).length() / 2,
      perspectiva = !('isOrthographicCamera' in camera && camera.isOrthographicCamera),
      porPixel = 2 / (altura * Math.abs(camera.projectionMatrix.elements[5]!)),
      margem = Math.min(100_000, porPixel * (perspectiva ? maxDistancia : 1) * 6),
      pos = this.geometria.getAttribute('position')
    let acerto: { id: string; ponto: Vector3; distancia: number } | null = null
    for (const n of this.indice.consultar(raio.ray, margem)) {
      const e = this.ordem[n]!,
        fim = e.deslocamento + e.linhas.length / 3
      for (let i = e.deslocamento; i < fim; i += 2) {
        this.de.fromBufferAttribute(pos, i)
        this.ate.fromBufferAttribute(pos, i + 1)
        const distanciaQuadrada = raio.ray.distanceSqToSegment(
            this.de,
            this.ate,
            this.noRaio,
            this.naLinha,
          ),
          distancia = this.noRaio.distanceTo(raio.ray.origin),
          limite = porPixel * (perspectiva ? distancia : 1) * 6
        if (
          distanciaQuadrada > limite * limite ||
          distancia < raio.near ||
          distancia > raio.far ||
          (acerto && distancia >= acerto.distancia)
        )
          continue
        const z = this.ponto.copy(this.naLinha).project(camera).z
        if (!Number.isFinite(z) || z < -1 || z > 1) continue
        acerto = { id: e.marcador.id, ponto: this.naLinha.clone(), distancia }
      }
    }
    return acerto
  }
  atualizarTerreno(regioes?: RegioesDeTerreno) {
    if (regioes && !regioes.alturas && !regioes.buracos) return
    const base = this.documento?.base,
      r = regioes?.alturas
    for (const e of this.entradas.values())
      if (e.marcador.configuracao?.tipo === 'rota' && e.marcador.configuracao.seguirTerreno) {
        if (
          !r ||
          base?.tipo !== 'terreno' ||
          (e.marcador.posicao.x >= base.origem.x + r.x0 * base.passo &&
            e.marcador.posicao.x <= base.origem.x + r.x1 * base.passo &&
            e.marcador.posicao.z >= base.origem.z + r.z0 * base.passo &&
            e.marcador.posicao.z <= base.origem.z + r.z1 * base.passo) ||
          (e.caixa.max.x >= base.origem.x + r.x0 * base.passo &&
            e.caixa.min.x <= base.origem.x + r.x1 * base.passo &&
            e.caixa.max.z >= base.origem.z + r.z0 * base.passo &&
            e.caixa.min.z <= base.origem.z + r.z1 * base.passo)
        )
          e.chave = ''
      }
  }
  limpar() {
    this.entradas.clear()
    this.ordem = []
    this.indice.definir([])
    this.geometria.setDrawRange(0, 0)
  }
  descartar() {
    if (this.destruido) return
    this.limpar()
    this.geometria.dispose()
    this.geometria.deleteAttribute('position')
    this.geometria.deleteAttribute('color')
    this.atributos = null
    this.material.dispose()
    this.grupo.clear()
    this.documento = null
    this.fonte = undefined
    this.destruido = true
  }
}
