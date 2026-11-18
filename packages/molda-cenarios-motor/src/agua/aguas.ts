import {
  type AguaDeCenario,
  type ConsultaDeAgua,
  type DocumentoDeCenario,
  prepararConsultaDaAgua,
  type RegioesDeTerreno,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  Box3,
  BufferAttribute,
  type BufferGeometry,
  Frustum,
  Group,
  Matrix4,
  Mesh,
  type PerspectiveCamera,
  type Raycaster,
  Vector3,
} from 'three'
import type { ModeloCarregado } from '../modelos'
import type { TerrenoDoPalco } from '../Terreno'
import type { FonteDeColisao } from '../teste/colisoes'
import { MundoDoTeste } from '../teste/colisoes'
import { AlturasDaAgua } from './alturas'
import { geometriaDaAgua } from './geometria'
import { MaterialDaAgua } from './material'

export interface EstadoDasAguas {
  carregando: number
  falhas: { id: string; nome: string; mensagem: string }[]
}
const METADADOS = new Set([
  'id',
  'nome',
  'grupo',
  'camada',
  'bloqueado',
  'oculto',
  'propriedades',
  'nado',
])
interface Entrada {
  chave: string
  modelo: ModeloCarregado | null
  raiz: Group
  caixa: Box3
  consulta: ConsultaDeAgua
  material: MaterialDaAgua
  geometrias: BufferGeometry[]
  solidos: Mesh[]
  vertical: boolean
  fundo: MundoDoTeste | null
}

/** Superfícies da oficina e margens físicas explícitas; não cria leito nem piso submerso. */
export class AguasDoPalco {
  readonly grupo = new Group()
  private readonly entradas = new Map<string, Entrada>()
  private terreno: TerrenoDoPalco | null = null
  private alturas: AlturasDaAgua | null = null
  private readonly frustum = new Frustum()
  private readonly projecao = new Matrix4()
  private descartado = false
  constructor(private readonly maxTextura: number) {}

  definir(
    documento: DocumentoDeCenario,
    terreno: TerrenoDoPalco | null,
    modelo: (id: string) => ModeloCarregado | null,
    escondidos: ReadonlySet<string>,
  ): EstadoDasAguas {
    const estado: EstadoDasAguas = { carregando: 0, falhas: [] }
    if (this.descartado) return estado
    const aguas = documento.aguas.filter((a) => !escondidos.has(a.id)),
      precisaAlturas = Boolean(
        terreno && aguas.some((a) => a.tipo !== 'cachoeira' && !('modelo' in a && a.modelo)),
      )
    if (this.terreno !== terreno || precisaAlturas !== Boolean(this.alturas)) {
      this.limpar()
      this.terreno = terreno
      if (precisaAlturas && terreno)
        this.alturas = new AlturasDaAgua(
          terreno.base,
          terreno.estado.campo,
          this.maxTextura,
          (x, z) => terreno.temAlturasNaPeca(x, z),
        )
    }
    const vivos = new Set(aguas.map((a) => a.id))
    for (const id of this.entradas.keys()) if (!vivos.has(id)) this.remover(id)
    for (const a of aguas) {
      const carregado = 'modelo' in a && a.modelo ? modelo(a.modelo) : null,
        chave = JSON.stringify([
          Object.fromEntries(Object.entries(a).filter(([k]) => !METADADOS.has(k))),
          documento.base.tipo === 'plano' ? documento.base : null,
        ]),
        anterior = this.entradas.get(a.id)
      if (anterior?.chave === chave && anterior.modelo === carregado) continue
      this.remover(a.id)
      try {
        if (documento.base.tipo === 'perfil')
          throw new Error('Converta o relevo antes de montar a água neste cenário.')
        if ('modelo' in a && a.modelo && !carregado) {
          estado.carregando++
          continue
        }
        const entrada = this.criar(a, documento, carregado)
        entrada.chave = chave
        this.entradas.set(a.id, entrada)
        this.grupo.add(entrada.raiz)
      } catch (erro) {
        estado.falhas.push({
          id: a.id,
          nome: a.nome,
          mensagem: erro instanceof Error ? erro.message : 'Não consegui preparar esta água.',
        })
      }
    }
    return estado
  }

  private criar(
    a: AguaDeCenario,
    doc: DocumentoDeCenario,
    modelo: ModeloCarregado | null,
  ): Entrada {
    let fundo: MundoDoTeste | null = null
    const raiz = new Group(),
      solidos: Mesh[] = [],
      laminas: Mesh[] = [],
      geometrias: BufferGeometry[] = [],
      glb = (a.tipo === 'lago' || a.tipo === 'represa') && a.modelo,
      material = new MaterialDaAgua(a.aparencia, {
        fundo: glb || a.tipo === 'cachoeira' ? null : this.alturas,
        plano: !glb && a.tipo !== 'cachoeira' && doc.base.tipo === 'plano' ? 0 : undefined,
        profundidade: a.tipo === 'mar' ? 100000 : a.tipo === 'cachoeira' ? 1 : a.profundidade,
        movimento: a.tipo === 'rio' ? 'rio' : a.tipo === 'cachoeira' ? 'queda' : 'horizontal',
        largura: a.tipo === 'rio' || a.tipo === 'cachoeira' ? a.largura : 1,
        correnteza: a.tipo === 'rio' ? a.correnteza : 0,
        profundidadePorVertice: Boolean(glb),
      })
    try {
      if (glb && modelo && (a.tipo === 'lago' || a.tipo === 'represa')) {
        const encaixe = a.encaixeModelo
        if (!encaixe)
          throw new Error('Confira o nível local e os materiais de água e margens deste modelo.')
        const nomes = new Set(modelo.partes.map((p) => p.material.name))
        if (
          [...encaixe.materiaisDaAgua, ...encaixe.materiaisSolidos].some((nome) => !nomes.has(nome))
        )
          throw new Error('Um dos materiais declarados não existe na versão carregada do modelo.')
        raiz.position.set(a.centro.x, a.nivel - encaixe.nivelLocal * a.escala, a.centro.z)
        raiz.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), a.giro)
        raiz.scale.setScalar(a.escala)
        for (const p of modelo.partes) {
          const agua = encaixe.materiaisDaAgua.includes(p.material.name),
            geometria = agua ? p.geometria.clone() : p.geometria,
            malha = new Mesh(geometria, agua ? material.material : p.material)
          if (agua) {
            geometrias.push(geometria)
            laminas.push(malha)
          }
          malha.matrixAutoUpdate = false
          malha.matrix.copy(p.matriz)
          malha.receiveShadow = true
          raiz.add(malha)
          if (encaixe.materiaisSolidos.includes(p.material.name)) solidos.push(malha)
        }
      } else {
        const g = geometriaDaAgua(a, doc.base),
          malha = new Mesh(g.geometria, material.material)
        geometrias.push(g.geometria)
        raiz.position.copy(g.origem)
        raiz.add(malha)
        malha.receiveShadow = true
      }
      raiz.updateWorldMatrix(true, true)
      const caixa = new Box3().setFromObject(raiz)
      let fundoDoModelo: ((x: number, z: number) => number) | undefined
      if (glb && (a.tipo === 'lago' || a.tipo === 'represa')) {
        fundo = new MundoDoTeste(
          solidos.map((s) => ({ geometria: s.geometry, matriz: s.matrixWorld })),
        )
        const mundo = fundo,
          de = new Vector3(),
          ate = new Vector3()
        fundoDoModelo = (x, z) =>
          mundo.rastrear(de.set(x, caixa.max.y + 1, z), ate.set(x, caixa.min.y - 1, z))?.ponto.y ??
          a.nivel - a.profundidade
        for (const lamina of laminas) {
          const posicoes = lamina.geometry.getAttribute('position'),
            profundidades = new Float32Array(posicoes.count),
            ponto = new Vector3()
          for (let i = 0; i < posicoes.count; i++) {
            ponto.fromBufferAttribute(posicoes, i).applyMatrix4(lamina.matrixWorld)
            profundidades[i] = Math.max(0, a.nivel - fundoDoModelo(ponto.x, ponto.z))
          }
          lamina.geometry.setAttribute(
            'mcnProfundidadeModelo',
            new BufferAttribute(profundidades, 1),
          )
        }
      }
      return {
        chave: '',
        modelo,
        raiz,
        caixa,
        consulta: prepararConsultaDaAgua(a, fundoDoModelo),
        material,
        geometrias,
        solidos,
        vertical: a.tipo === 'cachoeira',
        fundo,
      }
    } catch (erro) {
      fundo?.descartar()
      material.descartar()
      for (const g of geometrias) g.dispose()
      throw erro
    }
  }

  atualizarTerreno(regioes?: RegioesDeTerreno) {
    if (!this.terreno || !this.alturas) return
    this.alturas.atualizar(
      this.terreno.estado.campo,
      regioes ? (regioes.alturas ?? null) : undefined,
    )
    this.alturas.definirPecas((x, z) => this.terreno!.temAlturasNaPeca(x, z))
  }
  fontesDoTeste(): FonteDeColisao[] {
    this.grupo.updateWorldMatrix(true, true)
    return [...this.entradas.values()].flatMap((e) =>
      e.solidos.map((s) => ({ geometria: s.geometry, matriz: s.matrixWorld })),
    )
  }
  consultasDoTeste(): ReadonlyMap<string, ConsultaDeAgua> {
    return new Map([...this.entradas].map(([id, e]) => [id, e.consulta]))
  }
  limitesDo(id: string, destino: Box3): Box3 {
    const entrada = this.entradas.get(id)
    return entrada ? destino.copy(entrada.caixa) : destino.makeEmpty()
  }
  pontoSobRaio(raio: Raycaster) {
    this.grupo.updateWorldMatrix(true, true)
    let resultado: { id: string; ponto: Vector3; distancia: number } | null = null
    for (const [id, e] of this.entradas)
      for (const hit of raio.intersectObject(e.raiz, true)) {
        if (resultado && hit.distance >= resultado.distancia) continue
        if (
          e.vertical ||
          e.modelo ||
          e.consulta.em(hit.point.x, hit.point.z, this.terreno?.altura ?? (() => 0))
        )
          resultado = { id, ponto: hit.point.clone(), distancia: hit.distance }
      }
    return resultado
  }
  quadro(camera: PerspectiveCamera, segundos: number, movimentoReduzido: boolean) {
    if (this.descartado || !this.entradas.size) return false
    this.frustum.setFromProjectionMatrix(
      this.projecao.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    )
    let animado = false
    for (const e of this.entradas.values())
      if (this.frustum.intersectsBox(e.caixa)) {
        e.material.atualizar(segundos, movimentoReduzido)
        if (e.material.animado && !movimentoReduzido) animado = true
      }
    return animado
  }
  esquecerModelo(modelo: ModeloCarregado) {
    for (const [id, e] of this.entradas) if (e.modelo === modelo) this.remover(id)
  }
  private remover(id: string) {
    const e = this.entradas.get(id)
    if (!e) return
    this.grupo.remove(e.raiz)
    e.fundo?.descartar()
    e.material.descartar()
    for (const g of e.geometrias) g.dispose()
    this.entradas.delete(id)
  }
  limpar() {
    for (const id of this.entradas.keys()) this.remover(id)
    this.alturas?.descartar()
    this.alturas = null
    this.terreno = null
  }
  descartar() {
    this.limpar()
    this.descartado = true
  }
}
