import { randomUUID } from 'node:crypto'
import type { ComandoDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import {
  type Biblioteca,
  buscaDoModelo,
  type Cenario,
  type Espaco,
  type Modelo,
  type Mundo,
  type TipoDeBlob,
} from '../../src/domain/cenarios/cenarios'
import type {
  BlobReservado,
  CenariosRepository,
} from '../../src/domain/ports/cenarios-repository.port'

interface BlobGuardado extends BlobReservado {
  confirmado: boolean
  venceEm: Date
}
interface CenarioGuardado extends Cenario {
  criadoPor: string
  lotes: { revisao: number; operacaoId: string; comandos: ComandoDeCenario[]; autorId: string }[]
}

/** Repositório em memória com a MESMA régua do Drizzle: cota, tetos, CAS e operação repetida. */
export class CenariosEmMemoria implements CenariosRepository {
  readonly espacosGuardados = new Map<string, Espaco>()
  readonly bibliotecasGuardadas = new Map<string, Biblioteca & { criadoPor: string }>()
  readonly modelosGuardados = new Map<string, Modelo & { busca: string }>()
  readonly blobs = new Map<string, BlobGuardado>()
  readonly mundosGuardados = new Map<string, Mundo>()
  readonly cenariosGuardados = new Map<string, CenarioGuardado>()

  private chave = (espacoId: string, digest: string) => `${espacoId}|${digest}`
  private copia = <T>(valor: T): T => structuredClone(valor)

  private usado(espacoId: string, agora: Date): number {
    let total = 0
    for (const [chave, b] of this.blobs)
      if (chave.startsWith(`${espacoId}|`) && (b.confirmado || b.venceEm > agora)) total += b.bytes
    return total
  }
  private atualizarUso(espacoId: string, agora: Date) {
    const espaco = this.espacosGuardados.get(espacoId)
    if (espaco) espaco.usadoBytes = this.usado(espacoId, agora)
  }
  /** Digests que nenhum modelo nem cenário do espaço usa mais: saem do espaço. */
  private soltarOrfaos(espacoId: string, digests: readonly string[], agora: Date): string[] {
    const usados = new Set<string>()
    for (const m of this.modelosGuardados.values()) {
      if (this.bibliotecasGuardadas.get(m.bibliotecaId)?.espacoId !== espacoId) continue
      usados.add(m.digest)
      if (m.miniatura) usados.add(m.miniatura)
    }
    for (const c of this.cenariosGuardados.values()) {
      if (this.mundosGuardados.get(c.mundoId)?.espacoId !== espacoId) continue
      for (const m of c.documento.modelos) usados.add(m.digest)
      if (c.capa) usados.add(c.capa)
    }
    const orfaos = [...new Set(digests)].filter((d) => !usados.has(d))
    for (const d of orfaos) this.blobs.delete(this.chave(espacoId, d))
    this.atualizarUso(espacoId, agora)
    return orfaos
  }
  private contar(bibliotecaId: string) {
    const biblioteca = this.bibliotecasGuardadas.get(bibliotecaId)
    if (!biblioteca) return
    const dela = [...this.modelosGuardados.values()].filter((m) => m.bibliotecaId === bibliotecaId)
    biblioteca.modelos = dela.length
    biblioteca.capa = dela.find((m) => m.miniatura)?.miniatura ?? null
  }

  async espacoDaConta(contaId: string, limiteBytes: number): Promise<Espaco> {
    for (const e of this.espacosGuardados.values())
      if (e.tipo === 'conta' && e.contaId === contaId) return this.copia(e)
    const espaco: Espaco = { id: contaId, tipo: 'conta', contaId, usadoBytes: 0, limiteBytes }
    this.espacosGuardados.set(espaco.id, espaco)
    return this.copia(espaco)
  }
  async espacoDaEquipe(limiteBytes: number): Promise<Espaco> {
    for (const e of this.espacosGuardados.values()) if (e.tipo === 'equipe') return this.copia(e)
    const espaco: Espaco = {
      id: randomUUID(),
      tipo: 'equipe',
      contaId: null,
      usadoBytes: 0,
      limiteBytes,
    }
    this.espacosGuardados.set(espaco.id, espaco)
    return this.copia(espaco)
  }
  async espaco(id: string) {
    const espaco = this.espacosGuardados.get(id)
    return espaco ? this.copia(espaco) : null
  }

  async bibliotecas(espacoId: string) {
    return this.copia(
      [...this.bibliotecasGuardadas.values()]
        .filter((b) => b.espacoId === espacoId)
        .map(({ criadoPor: _c, ...b }) => b),
    )
  }
  async biblioteca(id: string) {
    const b = this.bibliotecasGuardadas.get(id)
    if (!b) return null
    const { criadoPor: _c, ...resto } = b
    return this.copia(resto)
  }
  async criarBiblioteca(
    dados: Parameters<CenariosRepository['criarBiblioteca']>[0],
    teto: number,
    agora: Date,
  ) {
    const doEspaco = [...this.bibliotecasGuardadas.values()].filter(
      (b) => b.espacoId === dados.espacoId,
    )
    if (doEspaco.length >= teto) return null
    this.bibliotecasGuardadas.set(dados.id, {
      id: dados.id,
      espacoId: dados.espacoId,
      nome: dados.nome,
      licenca: dados.licenca,
      modelos: 0,
      capa: null,
      atualizadaEm: agora,
      criadoPor: dados.criadoPor,
    })
    return this.biblioteca(dados.id)
  }
  async editarBiblioteca(
    id: string,
    dados: Parameters<CenariosRepository['editarBiblioteca']>[1],
    agora: Date,
  ) {
    const b = this.bibliotecasGuardadas.get(id)
    if (!b) return null
    if (dados.nome !== undefined) b.nome = dados.nome
    if (dados.licenca !== undefined) b.licenca = dados.licenca
    b.atualizadaEm = agora
    return this.biblioteca(id)
  }
  async apagarBiblioteca(id: string, agora: Date) {
    const b = this.bibliotecasGuardadas.get(id)
    if (!b) return []
    const digests: string[] = []
    for (const m of [...this.modelosGuardados.values()])
      if (m.bibliotecaId === id) {
        digests.push(m.digest, ...(m.miniatura ? [m.miniatura] : []))
        this.modelosGuardados.delete(m.id)
      }
    this.bibliotecasGuardadas.delete(id)
    for (const mundo of this.mundosGuardados.values())
      mundo.bibliotecas = mundo.bibliotecas.filter((x) => x !== id)
    return this.soltarOrfaos(b.espacoId, digests, agora)
  }

  async modelos(bibliotecaId: string, filtro: Parameters<CenariosRepository['modelos']>[1]) {
    const todos = [...this.modelosGuardados.values()]
      .filter((m) => m.bibliotecaId === bibliotecaId)
      .filter((m) => filtro.pasta === undefined || m.pasta === filtro.pasta)
      .filter((m) => filtro.termos.every((t) => m.busca.includes(t)))
      // A mesma ordem do banco: pelo texto de busca, byte a byte.
      .sort((a, b) => (a.busca < b.busca ? -1 : a.busca > b.busca ? 1 : a.id.localeCompare(b.id)))
    return {
      itens: this.copia(
        todos.slice(filtro.inicio, filtro.inicio + filtro.limite).map(({ busca: _b, ...m }) => m),
      ),
      total: todos.length,
    }
  }
  async modelo(id: string) {
    const m = this.modelosGuardados.get(id)
    if (!m) return null
    const { busca: _b, ...resto } = m
    return this.copia(resto)
  }
  async reservarBlobs(
    espacoId: string,
    blobs: readonly BlobReservado[],
    agora: Date,
    venceEm: Date,
  ) {
    const espaco = this.espacosGuardados.get(espacoId)
    if (!espaco) return null
    const faltam = blobs.filter((b) => !this.blobs.get(this.chave(espacoId, b.digest))?.confirmado)
    const novos = faltam.filter((b) => {
      const guardado = this.blobs.get(this.chave(espacoId, b.digest))
      return !guardado || guardado.venceEm <= agora
    })
    const acrescimo = novos.reduce((soma, b) => soma + b.bytes, 0)
    if (this.usado(espacoId, agora) + acrescimo > espaco.limiteBytes) return null
    for (const b of faltam)
      this.blobs.set(this.chave(espacoId, b.digest), { ...b, confirmado: false, venceEm })
    this.atualizarUso(espacoId, agora)
    return { faltam: this.copia(faltam) }
  }
  async confirmarBlobs(espacoId: string, digests: readonly string[], agora: Date) {
    for (const d of digests) {
      const blob = this.blobs.get(this.chave(espacoId, d))
      if (blob) blob.confirmado = true
    }
    this.atualizarUso(espacoId, agora)
  }
  async blobsConfirmados(espacoId: string, digests: readonly string[]) {
    const mapa = new Map<string, { tipo: TipoDeBlob; bytes: number }>()
    for (const d of digests) {
      const blob = this.blobs.get(this.chave(espacoId, d))
      if (blob?.confirmado) mapa.set(d, { tipo: blob.tipo, bytes: blob.bytes })
    }
    return mapa
  }
  async criarModelos(
    bibliotecaId: string,
    modelos: Parameters<CenariosRepository['criarModelos']>[1],
    teto: number,
    _criadoPor: string,
    agora: Date,
  ) {
    const biblioteca = this.bibliotecasGuardadas.get(bibliotecaId)
    if (!biblioteca) return null
    const dela = [...this.modelosGuardados.values()].filter((m) => m.bibliotecaId === bibliotecaId)
    const existentes = new Set(dela.map((m) => m.digest))
    const novos = modelos.filter(
      (m, i) => !existentes.has(m.digest) && modelos.findIndex((x) => x.digest === m.digest) === i,
    )
    if (dela.length + novos.length > teto) return null
    for (const m of novos)
      this.modelosGuardados.set(m.id, { ...m, bibliotecaId, busca: buscaDoModelo(m) })
    this.contar(bibliotecaId)
    biblioteca.atualizadaEm = agora
    return this.copia(novos.map((m) => ({ ...m, bibliotecaId })))
  }
  async editarModelo(id: string, dados: Parameters<CenariosRepository['editarModelo']>[1]) {
    const m = this.modelosGuardados.get(id)
    if (!m) return null
    if (dados.nome !== undefined) m.nome = dados.nome
    if (dados.pasta !== undefined) m.pasta = dados.pasta
    if (dados.etiquetas !== undefined) m.etiquetas = [...dados.etiquetas]
    m.busca = buscaDoModelo(m)
    return this.modelo(id)
  }
  async apagarModelos(bibliotecaId: string, ids: readonly string[], agora: Date) {
    const biblioteca = this.bibliotecasGuardadas.get(bibliotecaId)
    if (!biblioteca) return []
    const digests: string[] = []
    for (const id of ids) {
      const m = this.modelosGuardados.get(id)
      if (!m || m.bibliotecaId !== bibliotecaId) continue
      digests.push(m.digest, ...(m.miniatura ? [m.miniatura] : []))
      this.modelosGuardados.delete(id)
    }
    this.contar(bibliotecaId)
    biblioteca.atualizadaEm = agora
    return this.soltarOrfaos(biblioteca.espacoId, digests, agora)
  }

  private contarCenarios(mundoId: string) {
    const mundo = this.mundosGuardados.get(mundoId)
    if (!mundo) return
    const dele = [...this.cenariosGuardados.values()].filter((c) => c.mundoId === mundoId)
    mundo.cenarios = dele.length
    mundo.capa =
      dele
        .filter((c) => c.capa)
        .sort((a, b) => b.atualizadoEm.getTime() - a.atualizadoEm.getTime())[0]?.capa ?? null
  }
  async mundos(espacoId: string) {
    return this.copia([...this.mundosGuardados.values()].filter((m) => m.espacoId === espacoId))
  }
  async mundo(id: string) {
    const m = this.mundosGuardados.get(id)
    return m ? this.copia(m) : null
  }
  async criarMundo(
    dados: Parameters<CenariosRepository['criarMundo']>[0],
    teto: number,
    agora: Date,
  ) {
    const doEspaco = [...this.mundosGuardados.values()].filter((m) => m.espacoId === dados.espacoId)
    if (doEspaco.length >= teto) return null
    this.mundosGuardados.set(dados.id, {
      ...dados,
      cenarios: 0,
      bibliotecas: [],
      capa: null,
      atualizadoEm: agora,
    })
    return this.mundo(dados.id)
  }
  async editarMundo(
    id: string,
    dados: Parameters<CenariosRepository['editarMundo']>[1],
    agora: Date,
  ) {
    const m = this.mundosGuardados.get(id)
    if (!m) return null
    if (dados.nome !== undefined) m.nome = dados.nome
    if (dados.bibliotecas !== undefined) m.bibliotecas = [...dados.bibliotecas]
    m.atualizadoEm = agora
    return this.mundo(id)
  }
  async apagarMundo(id: string) {
    if (!this.mundosGuardados.delete(id)) return false
    for (const c of [...this.cenariosGuardados.values()])
      if (c.mundoId === id) this.cenariosGuardados.delete(c.id)
    return true
  }

  async cenarios(mundoId: string) {
    return this.copia(
      [...this.cenariosGuardados.values()]
        .filter((c) => c.mundoId === mundoId)
        .map(({ documento: _d, lotes: _l, criadoPor: _c, ...resumo }) => resumo),
    )
  }
  async cenario(id: string) {
    const c = this.cenariosGuardados.get(id)
    if (!c) return null
    const { lotes: _l, criadoPor: _c, ...resto } = c
    return this.copia(resto)
  }
  async criarCenario(
    dados: Parameters<CenariosRepository['criarCenario']>[0],
    teto: number,
    agora: Date,
  ) {
    const doMundo = [...this.cenariosGuardados.values()].filter((c) => c.mundoId === dados.mundoId)
    if (doMundo.length >= teto) return null
    this.cenariosGuardados.set(dados.id, {
      id: dados.id,
      mundoId: dados.mundoId,
      nome: dados.nome,
      revisao: 0,
      capa: null,
      atualizadoEm: agora,
      documento: this.copia(dados.documento),
      criadoPor: dados.criadoPor,
      lotes: [],
    })
    this.contarCenarios(dados.mundoId)
    const { documento: _d, ...resumo } = (await this.cenario(dados.id))!
    return resumo
  }
  async operacaoAplicada(cenarioId: string, operacaoId: string) {
    return (
      this.cenariosGuardados.get(cenarioId)?.lotes.find((l) => l.operacaoId === operacaoId)
        ?.revisao ?? null
    )
  }
  async gravarLote(dados: Parameters<CenariosRepository['gravarLote']>[0], agora: Date) {
    const c = this.cenariosGuardados.get(dados.cenarioId)
    if (!c) return null
    const repetido = c.lotes.find((l) => l.operacaoId === dados.operacaoId)
    if (repetido) return { revisao: repetido.revisao, repetido: true }
    if (c.revisao !== dados.revisaoEsperada) return null
    c.revisao += 1
    c.documento = this.copia(dados.documento)
    c.nome = dados.documento.nome
    c.atualizadoEm = agora
    c.lotes.push({
      revisao: c.revisao,
      operacaoId: dados.operacaoId,
      comandos: this.copia(dados.comandos),
      autorId: dados.autorId,
    })
    const mundo = this.mundosGuardados.get(c.mundoId)
    if (mundo) mundo.atualizadoEm = agora
    return { revisao: c.revisao, repetido: false }
  }
  async definirCapa(cenarioId: string, digest: string, agora: Date) {
    const c = this.cenariosGuardados.get(cenarioId)
    if (!c) return false
    c.capa = digest
    c.atualizadoEm = agora
    this.contarCenarios(c.mundoId)
    return true
  }
  async apagarCenario(id: string) {
    const c = this.cenariosGuardados.get(id)
    if (!c) return false
    this.cenariosGuardados.delete(id)
    this.contarCenarios(c.mundoId)
    return true
  }
}
