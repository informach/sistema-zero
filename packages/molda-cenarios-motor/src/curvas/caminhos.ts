import {
  type CaminhoDeCenario,
  type DocumentoDeCenario,
  malhaPlanaDoCaminho,
  type PecaEstruturalDoCaminho,
  type PontoNoChao,
  prepararEncontrosDosCaminhos,
  type RegioesDeTerreno,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  type Box3,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Group,
  Matrix4,
  type Texture,
} from 'three'
import type { ModeloCarregado } from '../modelos'
import type { SuperficieDoObjeto } from '../superficies'
import type { TerrenoDoPalco } from '../Terreno'
import type { FonteDeColisao } from '../teste/colisoes'
import { prepararAcabamentos } from './acabamentos'
import { montarEstrutura, type PartePreparadaDeCaminho } from './estruturas'
import { conformarParteAoChao, type ParteConformada } from './geometria'
import { agruparPecas } from './lotes'
import { montarPisoDeModelo } from './pisos'

export interface EstadoDosCaminhos {
  carregando: number
  falhas: { id: string; nome: string; mensagem: string }[]
  avisos: { id: string; mensagem: string }[]
}
interface Entrada {
  chave: string
  modelo: ModeloCarregado | null
  textura: Texture | null
  raiz: Group
  superficies: SuperficieDoObjeto[]
  colisoes: FonteDeColisao[]
  conformadas: ParteConformada[]
  partes: Map<string, PecaEstruturalDoCaminho>
  estrutural: boolean
  avisos: string[]
  sincronizar(): void
  descartar(): void
}
const METADADOS = new Set(['id', 'nome', 'grupo', 'camada', 'bloqueado', 'oculto', 'propriedades'])

/** Dono das cópias de caminho; modelos, materiais e texturas do catálogo permanecem compartilhados. */
export class CaminhosDoPalco {
  readonly grupo = new Group()
  private readonly entradas = new Map<string, Entrada>()
  private terreno: TerrenoDoPalco | null = null
  private readonly cubo = new BoxGeometry(1, 1, 1)
  private chaveDosEncontros = ''
  private encontros = prepararEncontrosDosCaminhos([])
  private descartado = false

  definir(
    documento: DocumentoDeCenario,
    terreno: TerrenoDoPalco | null,
    modelo: (id: string) => ModeloCarregado | null,
    textura: (id: string) => Texture | null,
    escondidos: ReadonlySet<string>,
  ): EstadoDosCaminhos {
    const estado: EstadoDosCaminhos = { carregando: 0, falhas: [], avisos: [] }
    if (this.descartado) return estado
    if (this.terreno !== terreno) {
      this.limpar()
      this.terreno = terreno
    }
    const caminhos = documento.caminhos,
      vivos = new Set(caminhos.map((c) => c.id))
    const chaveDosEncontros = JSON.stringify(
      caminhos
        .filter((c) => !escondidos.has(c.id) && ['trilha', 'estrada', 'praca'].includes(c.tipo))
        .map((c) => [c.id, c.tipo, c.pontos, c.largura, c.suave, c.fechada]),
    )
    if (this.chaveDosEncontros !== chaveDosEncontros) {
      this.encontros = prepararEncontrosDosCaminhos(caminhos, escondidos)
      this.chaveDosEncontros = chaveDosEncontros
    }
    for (const id of this.entradas.keys()) if (!vivos.has(id)) this.remover(id)
    for (const [ordem, c] of caminhos.entries()) {
      const recortes = this.encontros.exclusoes.get(c.id) ?? [],
        carregado = c.acabamento ? modelo(c.acabamento) : null,
        imagem = c.aparencia?.textura ? textura(c.aparencia.textura.id) : null,
        chave = JSON.stringify([
          Object.fromEntries(Object.entries(c).filter(([k]) => !METADADOS.has(k))),
          documento.base.tipo === 'plano' ? documento.base : null,
          recortes,
          this.encontros.falhas.get(c.id),
        ]),
        anterior = this.entradas.get(c.id)
      if (
        anterior?.chave === chave &&
        anterior.modelo === carregado &&
        anterior.textura === imagem
      ) {
        anterior.raiz.visible = !escondidos.has(c.id)
        anterior.raiz.traverse((objeto) => {
          objeto.renderOrder = ordem + 1
        })
        estado.avisos.push(...anterior.avisos.map((mensagem) => ({ id: c.id, mensagem })))
        continue
      }
      this.remover(c.id)
      try {
        const falhaDoEncontro = this.encontros.falhas.get(c.id)
        if (falhaDoEncontro) throw Error(falhaDoEncontro)
        if (documento.base.tipo === 'perfil')
          throw Error('Converta o relevo antes de montar caminhos.')
        if ((c.acabamento && !carregado) || (c.aparencia?.textura && !imagem)) {
          estado.carregando++
          continue
        }
        const entrada = this.criar(c, documento, carregado, imagem, ordem, recortes)
        entrada.chave = chave
        entrada.raiz.visible = !escondidos.has(c.id)
        this.entradas.set(c.id, entrada)
        this.grupo.add(entrada.raiz)
        estado.avisos.push(...entrada.avisos.map((mensagem) => ({ id: c.id, mensagem })))
      } catch (erro) {
        estado.falhas.push({
          id: c.id,
          nome: c.nome,
          mensagem: erro instanceof Error ? erro.message : 'Não consegui montar este caminho.',
        })
      }
    }
    return estado
  }

  private criar(
    c: CaminhoDeCenario,
    doc: DocumentoDeCenario,
    modelo: ModeloCarregado | null,
    textura: Texture | null,
    ordem: number,
    excluir: readonly (readonly PontoNoChao[])[],
  ): Entrada {
    const estrutural = c.tipo === 'ponte' || c.tipo === 'cerca' || c.tipo === 'muro'
    const raiz = new Group(),
      conformadas: ParteConformada[] = [],
      superficies: SuperficieDoObjeto[] = [],
      colisoes: FonteDeColisao[] = [],
      partes = new Map<string, PecaEstruturalDoCaminho>(),
      avisos: string[] = [],
      limpezas: (() => void)[] = [],
      sincronizacoes: (() => void)[] = [],
      descartar = () => {
        for (const p of conformadas) p.descartar()
        for (const limpar of limpezas) limpar()
        raiz.clear()
      }
    try {
      let pecas: PartePreparadaDeCaminho[]
      if (estrutural) {
        const estrutura = montarEstrutura(c, doc, this.terreno, modelo, this.cubo)
        limpezas.push(() => estrutura.descartar())
        avisos.push(...estrutura.avisos)
        for (const [id, parte] of estrutura.referencias) partes.set(id, parte)
        pecas = estrutura.partes
      } else if (modelo) {
        const piso = montarPisoDeModelo(c, modelo, doc.base, this.terreno?.estado ?? null, excluir)
        conformadas.push(...piso.partes)
        pecas = piso.partes.map((p) => ({
          ...p,
          conformada: p,
          matriz: new Matrix4().makeTranslation(piso.origem.x, 0, piso.origem.z),
        }))
      } else {
        const piso = malhaPlanaDoCaminho(c),
          g = new BufferGeometry()
            .setAttribute(
              'position',
              new BufferAttribute(Float32Array.from(piso.malha.atributos.position!.valores), 3),
            )
            .setAttribute(
              'uv',
              new BufferAttribute(Float32Array.from(piso.malha.atributos.uv!.valores), 2),
            )
            .setIndex(new BufferAttribute(Uint32Array.from(piso.malha.indices!), 1))
        const origem = piso.origem
        try {
          const parte = conformarParteAoChao(
            { geometria: g, matriz: new Matrix4() },
            new Matrix4().makeTranslation(origem.x, 0, origem.z),
            doc.base,
            this.terreno?.estado ?? null,
            origem,
            excluir,
          )
          pecas = [
            {
              ...parte,
              conformada: parte,
              matriz: new Matrix4().makeTranslation(origem.x, 0, origem.z),
            },
          ]
          conformadas.push(parte)
        } finally {
          g.dispose()
        }
      }
      const decal = !estrutural && (!modelo || modelo.caixa.max.y - modelo.caixa.min.y < 1e-5),
        acabamento = prepararAcabamentos(c, pecas, textura, decal)
      limpezas.push(() => acabamento.descartar())
      sincronizacoes.push(() => acabamento.atualizar())
      const desenho = agruparPecas(acabamento.pecas, ordem, estrutural || Boolean(modelo))
      raiz.add(desenho.raiz)
      limpezas.push(() => desenho.descartar())
      sincronizacoes.push(() => desenho.atualizar())
      for (const p of acabamento.pecas) {
        superficies.push({
          id: c.id,
          geometria: p.geometria,
          material: p.material,
          matriz: p.matriz,
          ...(p.parte ? { parte: p.parte } : {}),
        })
        if ((modelo || estrutural) && c.colisao !== 'nenhuma')
          colisoes.push({ geometria: p.geometria, matriz: p.matriz })
      }
      return {
        chave: '',
        modelo,
        textura,
        raiz,
        superficies,
        colisoes,
        conformadas,
        partes,
        estrutural,
        avisos,
        sincronizar: () => {
          for (const f of sincronizacoes) f()
        },
        descartar,
      }
    } catch (erro) {
      descartar()
      throw erro
    }
  }

  atualizarTerreno(regioes?: RegioesDeTerreno): BufferGeometry[] {
    if (!this.terreno) return []
    // Buracos e cobertura mudam a topologia. O próximo definir refaz apenas as entradas vivas.
    if (!regioes || regioes.buracos) {
      this.limpar()
      return []
    }
    if (!regioes.alturas) return []
    for (const [id, entrada] of this.entradas) if (entrada.estrutural) this.remover(id)
    const alteradas: BufferGeometry[] = []
    for (const entrada of this.entradas.values()) {
      let mudou = false
      for (const p of entrada.conformadas)
        if (p.atualizarAlturas(this.terreno.estado.campo, regioes.alturas)) {
          alteradas.push(p.geometria)
          mudou = true
        }
      if (mudou) entrada.sincronizar()
    }
    return alteradas
  }
  superficies(): SuperficieDoObjeto[] {
    return [...this.entradas.values()].filter((e) => e.raiz.visible).flatMap((e) => e.superficies)
  }
  fontesDoTeste(): FonteDeColisao[] {
    return [...this.entradas.values()].filter((e) => e.raiz.visible).flatMap((e) => e.colisoes)
  }
  parte(id: string, chave: string) {
    return this.entradas.get(id)?.partes.get(chave) ?? null
  }
  limitesDo(id: string, destino: Box3) {
    destino.makeEmpty()
    const entrada = this.entradas.get(id)
    if (entrada?.raiz.visible) destino.setFromObject(entrada.raiz)
    return destino
  }
  esquecerModelo(modelo: ModeloCarregado) {
    for (const [id, e] of this.entradas) if (e.modelo === modelo) this.remover(id)
  }
  private remover(id: string) {
    const e = this.entradas.get(id)
    if (!e) return
    this.grupo.remove(e.raiz)
    e.descartar()
    this.entradas.delete(id)
  }
  limpar() {
    if (this.descartado) return
    for (const id of this.entradas.keys()) this.remover(id)
  }
  descartar() {
    if (this.descartado) return
    this.limpar()
    this.cubo.dispose()
    this.descartado = true
  }
}
