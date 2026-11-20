import { randomUUID } from 'node:crypto'
import {
  arquivosDoDocumento,
  arquivosDosComandos,
  type DocumentoDeCenario,
  documentoParaEditarConjunto,
  inverterLote,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  type Biblioteca,
  buscaDoModelo,
  type Cenario,
  type ConferenciaDeBlob,
  type Espaco,
  LIMITES_DOS_CENARIOS,
  type Modelo,
  type Mundo,
  type Textura,
  TIPO_DO_CONTEUDO,
  type TipoDeBlob,
  type TipoDeConteudo,
  tiposDeBlobCompativeis,
} from '../../src/domain/cenarios/cenarios'
import {
  CenarioArquivoAusenteError,
  CenarioArquivoSaindoError,
  CenarioInvalidoError,
} from '../../src/domain/cenarios/cenarios.errors'
import {
  avancarHistorico,
  type PassoDoHistorico,
  type PilhasDoHistorico,
} from '../../src/domain/cenarios/historico'
import type {
  BlobReservado,
  CenariosRepository,
} from '../../src/domain/ports/cenarios-repository.port'
import { ValidationError } from '../../src/domain/shared/errors'
import { ConjuntosEmMemoria } from './conjuntos-in-memory'

interface BlobGuardado extends BlobReservado {
  confirmado: boolean
  venceEm: Date
}
interface CenarioGuardado extends Cenario {
  criadoPor: string
  lotes: PassoDoHistorico[]
}

/** Repositório em memória com a MESMA régua do Drizzle: cota, tetos, CAS e operação repetida. */
export class CenariosEmMemoria implements CenariosRepository {
  private readonly catalogoConjuntos: ConjuntosEmMemoria
  constructor() {
    this.catalogoConjuntos = new ConjuntosEmMemoria({
      biblioteca: (id) => this.bibliotecasGuardadas.get(id),
      espaco: (id, agora) => {
        this.atualizarUso(id, agora)
        return this.espacosGuardados.get(id)
      },
      arquivo: (espacoId, digest, tipo) => {
        const b = this.blobs.get(this.chave(espacoId, digest))
        return Boolean(b?.confirmado && b.tipo === tipo)
      },
      imagem: (espacoId, digest) => {
        const b = this.blobs.get(this.chave(espacoId, digest))
        return Boolean(
          b?.confirmado &&
            ['miniatura', 'capa', 'textura'].includes(b.tipo) &&
            b.bytes <= 256 * 1024,
        )
      },
      confirmarImagem: (espacoId, conferido, agora) => {
        const b = this.blobs.get(this.chave(espacoId, conferido.digest))
        if (b && ['miniatura', 'capa', 'textura'].includes(b.tipo))
          this.confirmarBlobsNoEstado(espacoId, [conferido], agora)
      },
      cenarios: (espacoId) =>
        [...this.cenariosGuardados.values()]
          .filter((c) => this.mundosGuardados.get(c.mundoId)?.espacoId === espacoId)
          .map(({ lotes: _l, criadoPor: _p, ...c }) => this.copia(c)),
      fonte: (id) => this.cenariosGuardados.get(id),
      prepararFonte: (c, v, autorId, agora) => {
        const espacoId = this.bibliotecasGuardadas.get(c.bibliotecaId)!.espacoId
        const cenarioId = randomUUID()
        const documento = documentoParaEditarConjunto(v.conteudo, cenarioId, c.nome, espacoId)
        let mundo = [...this.mundosGuardados.values()].find(
          (m) => m.bibliotecaConjuntosId === c.bibliotecaId,
        )
        if (!mundo) {
          mundo = {
            id: randomUUID(),
            espacoId,
            bibliotecaConjuntosId: c.bibliotecaId,
            nome: 'Conjuntos da biblioteca',
            criadoPor: autorId,
            atualizadoEm: agora,
            cenarios: 0,
            bibliotecas: [],
            capa: null,
          }
          this.mundosGuardados.set(mundo.id, mundo)
        }
        mundo.bibliotecas = [
          ...new Set([
            ...mundo.bibliotecas,
            c.bibliotecaId,
            ...v.conteudo.modelos.map((m) => m.biblioteca),
            ...v.conteudo.texturas.map((t) => t.biblioteca),
          ]),
        ].filter((id) => this.bibliotecasGuardadas.get(id)?.espacoId === espacoId)
        this.cenariosGuardados.set(cenarioId, {
          id: cenarioId,
          mundoId: mundo.id,
          nome: c.nome,
          documento,
          revisao: 0,
          capa: null,
          criadoPor: autorId,
          atualizadoEm: agora,
          lotes: [],
        })
        this.contarCenarios(mundo.id)
        return { mundoId: mundo.id, cenarioId }
      },
      removerFonte: (id) => {
        const mundoId = this.cenariosGuardados.get(id)?.mundoId
        const digests = this.removerCenarioDoEstado(id)
        if (mundoId && this.mundosGuardados.get(mundoId)?.cenarios === 0)
          this.mundosGuardados.delete(mundoId)
        return digests
      },
      gravar: (dados, agora) => this.gravarLoteNoEstado(dados, agora),
      soltar: (espacoId, digests, agora) => this.soltarOrfaos(espacoId, digests, agora),
      mudou: (espacoId, agora) => this.atualizarUso(espacoId, agora),
    })
  }
  conjuntos: CenariosRepository['conjuntos'] = (...args) =>
    this.catalogoConjuntos.conjuntos(...args)
  conjunto: CenariosRepository['conjunto'] = (...args) => this.catalogoConjuntos.conjunto(...args)
  conjuntoDoCenario: CenariosRepository['conjuntoDoCenario'] = (...args) =>
    this.catalogoConjuntos.conjuntoDoCenario(...args)
  prepararEdicaoDeConjunto: CenariosRepository['prepararEdicaoDeConjunto'] = (...args) =>
    this.catalogoConjuntos.prepararEdicaoDeConjunto(...args)
  versaoDoConjunto: CenariosRepository['versaoDoConjunto'] = (...args) =>
    this.catalogoConjuntos.versaoDoConjunto(...args)
  criarConjunto: CenariosRepository['criarConjunto'] = (...args) =>
    this.catalogoConjuntos.criarConjunto(...args)
  editarConjunto: CenariosRepository['editarConjunto'] = (...args) =>
    this.catalogoConjuntos.editarConjunto(...args)
  publicarConjunto: CenariosRepository['publicarConjunto'] = (...args) =>
    this.catalogoConjuntos.publicarConjunto(...args)
  definirMiniaturaDoConjunto: CenariosRepository['definirMiniaturaDoConjunto'] = (...args) =>
    this.catalogoConjuntos.definirMiniaturaDoConjunto(...args)
  apagarConjunto: CenariosRepository['apagarConjunto'] = (...args) =>
    this.catalogoConjuntos.apagarConjunto(...args)
  readonly espacosGuardados = new Map<string, Espaco>()
  readonly bibliotecasGuardadas = new Map<string, Biblioteca & { criadoPor: string }>()
  readonly modelosGuardados = new Map<string, Modelo & { busca: string }>()
  readonly texturasGuardadas = new Map<string, Textura & { busca: string }>()
  readonly blobs = new Map<string, BlobGuardado>()
  readonly mundosGuardados = new Map<string, Mundo>()
  readonly cenariosGuardados = new Map<string, CenarioGuardado>()
  private readonly retratosGuardados = new Map<string, Map<number, string>>()
  private readonly pilhas = new Map<string, PilhasDoHistorico>()
  private readonly fotografias = new Map<
    string,
    Array<{ revisao: number; documento: DocumentoDeCenario }>
  >()

  private chave = (espacoId: string, digest: string) => `${espacoId}|${digest}`
  private copia = <T>(valor: T): T => structuredClone(valor)

  private usado(espacoId: string, agora: Date): number {
    let total = 0
    for (const [chave, b] of this.blobs)
      if (chave.startsWith(`${espacoId}|`) && (b.confirmado || b.venceEm > agora)) total += b.bytes
    return total + this.catalogoConjuntos.bytesDoEspaco(espacoId)
  }
  private atualizarUso(espacoId: string, agora: Date) {
    const espaco = this.espacosGuardados.get(espacoId)
    if (espaco) espaco.usadoBytes = this.usado(espacoId, agora)
  }
  /** Digests que nenhum modelo nem cenário do espaço usa mais: saem do espaço. */
  private soltarOrfaos(espacoId: string, digests: readonly string[], agora: Date): string[] {
    const usados = this.catalogoConjuntos.arquivosDoEspaco(espacoId)
    for (const t of this.texturasGuardadas.values())
      if (this.bibliotecasGuardadas.get(t.bibliotecaId)?.espacoId === espacoId) usados.add(t.digest)
    for (const m of this.modelosGuardados.values()) {
      if (this.bibliotecasGuardadas.get(m.bibliotecaId)?.espacoId !== espacoId) continue
      usados.add(m.digest)
      if (m.miniatura) usados.add(m.miniatura)
    }
    for (const c of this.cenariosGuardados.values()) {
      if (this.mundosGuardados.get(c.mundoId)?.espacoId !== espacoId) continue
      for (const r of arquivosDoDocumento(c.documento)) usados.add(r.digest)
      for (const l of c.lotes)
        for (const r of arquivosDosComandos([...l.comandos, ...(l.inversos ?? [])]))
          usados.add(r.digest)
      for (const r of this.fotografias.get(c.id) ?? []) {
        for (const a of arquivosDoDocumento(r.documento)) usados.add(a.digest)
      }
      if (c.capa) usados.add(c.capa)
      for (const digest of this.retratosGuardados.get(c.id)?.values() ?? []) usados.add(digest)
    }
    const orfaos = [...new Set(digests)].filter(
      (d) => !usados.has(d) && this.blobs.has(this.chave(espacoId, d)),
    )
    for (const d of orfaos) {
      this.blobs.delete(this.chave(espacoId, d))
      this.saindo.set(this.chave(espacoId, d), agora)
    }
    this.atualizarUso(espacoId, agora)
    return orfaos
  }
  /** Arquivos sem dono esperando o BFF apagar o objeto (lápide por espaço e hash). */
  readonly saindo = new Map<string, Date>()
  async arquivosSairam(espacoId: string, digests: readonly string[]) {
    for (const d of digests) this.saindo.delete(this.chave(espacoId, d))
  }
  private contar(bibliotecaId: string) {
    const biblioteca = this.bibliotecasGuardadas.get(bibliotecaId)
    if (!biblioteca) return
    const dela = [...this.modelosGuardados.values()].filter((m) => m.bibliotecaId === bibliotecaId)
    biblioteca.modelos = dela.length
    const texturas = [...this.texturasGuardadas.values()].filter(
      (t) => t.bibliotecaId === bibliotecaId,
    )
    biblioteca.texturas = texturas.length
    if (biblioteca.capaModelo && !this.modelosGuardados.has(biblioteca.capaModelo))
      biblioteca.capaModelo = null
    biblioteca.capa =
      (biblioteca.capaModelo
        ? this.modelosGuardados.get(biblioteca.capaModelo)?.miniatura
        : null) ??
      dela.find((m) => m.miniatura)?.miniatura ??
      texturas[0]?.digest ??
      null
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
    for (const b of this.bibliotecasGuardadas.values()) this.contar(b.id)
    return this.copia(
      [...this.bibliotecasGuardadas.values()]
        .filter((b) => b.espacoId === espacoId)
        .map(({ criadoPor: _c, ...b }) => b),
    )
  }
  async biblioteca(id: string) {
    this.contar(id)
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
    const existente = dados.fonte ? doEspaco.find((b) => b.fonte === dados.fonte) : null
    if (existente) return this.biblioteca(existente.id)
    if (doEspaco.length >= teto) return null
    this.bibliotecasGuardadas.set(dados.id, {
      id: dados.id,
      espacoId: dados.espacoId,
      nome: dados.nome,
      fonte: dados.fonte ?? null,
      descricao: dados.descricao ?? '',
      capaModelo: null,
      licenca: dados.licenca,
      modelos: 0,
      texturas: 0,
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
    if (dados.descricao !== undefined) b.descricao = dados.descricao
    if (dados.capaModelo !== undefined) b.capaModelo = dados.capaModelo
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
    for (const t of [...this.texturasGuardadas.values()])
      if (t.bibliotecaId === id) {
        digests.push(t.digest)
        this.texturasGuardadas.delete(t.id)
      }
    digests.push(...this.catalogoConjuntos.removerDaBiblioteca(id))
    this.bibliotecasGuardadas.delete(id)
    for (const mundo of this.mundosGuardados.values())
      mundo.bibliotecas = mundo.bibliotecas.filter((x) => x !== id)
    return this.soltarOrfaos(b.espacoId, digests, agora)
  }

  async texturas(bibliotecaId: string, filtro: Parameters<CenariosRepository['texturas']>[1]) {
    const todos = [...this.texturasGuardadas.values()]
      .filter((t) => t.bibliotecaId === bibliotecaId)
      .filter((t) => filtro.pasta === undefined || t.pasta === filtro.pasta)
      .filter((t) => filtro.digest === undefined || t.digest === filtro.digest)
      .filter((t) => filtro.termos.every((termo) => t.busca.includes(termo)))
      .sort((a, b) => (a.busca < b.busca ? -1 : a.busca > b.busca ? 1 : a.id.localeCompare(b.id)))
    return {
      itens: this.copia(todos.slice(filtro.inicio, filtro.inicio + filtro.limite)),
      total: todos.length,
    }
  }
  async textura(id: string) {
    return this.copia(this.texturasGuardadas.get(id) ?? null)
  }
  async criarTexturas(
    bibliotecaId: string,
    texturas: Parameters<CenariosRepository['criarTexturas']>[1],
    teto: number,
    _criadoPor: string,
    agora: Date,
    conferidos: readonly ConferenciaDeBlob[],
  ) {
    const biblioteca = this.bibliotecasGuardadas.get(bibliotecaId)
    if (!biblioteca) return null
    const existentes = [...this.texturasGuardadas.values()].filter(
      (t) => t.bibliotecaId === bibliotecaId,
    )
    const novos = texturas.filter(
      (t, i) =>
        !existentes.some((e) => e.digest === t.digest) &&
        texturas.findIndex((e) => e.digest === t.digest) === i,
    )
    if (existentes.length + novos.length > teto) return null
    await this.confirmarBlobs(biblioteca.espacoId, conferidos, agora)
    for (const t of novos)
      this.texturasGuardadas.set(t.id, { ...t, bibliotecaId, busca: buscaDoModelo(t) })
    biblioteca.atualizadaEm = agora
    this.contar(bibliotecaId)
    return this.copia(novos.map((t) => this.texturasGuardadas.get(t.id)!))
  }
  async editarTextura(
    id: string,
    dados: Parameters<CenariosRepository['editarTextura']>[1],
    agora: Date,
  ) {
    const atual = this.texturasGuardadas.get(id)
    if (!atual) return null
    Object.assign(atual, dados)
    atual.busca = buscaDoModelo(atual)
    const biblioteca = this.bibliotecasGuardadas.get(atual.bibliotecaId)
    if (biblioteca) biblioteca.atualizadaEm = agora
    return this.copia(atual)
  }
  async apagarTexturas(bibliotecaId: string, ids: readonly string[], agora: Date) {
    const biblioteca = this.bibliotecasGuardadas.get(bibliotecaId)
    if (!biblioteca) return []
    const digests: string[] = []
    for (const t of [...this.texturasGuardadas.values()])
      if (t.bibliotecaId === bibliotecaId && ids.includes(t.id)) {
        this.texturasGuardadas.delete(t.id)
        digests.push(t.digest)
      }
    this.contar(bibliotecaId)
    return this.soltarOrfaos(biblioteca.espacoId, digests, agora)
  }

  async modelos(bibliotecaId: string, filtro: Parameters<CenariosRepository['modelos']>[1]) {
    const todos = [...this.modelosGuardados.values()]
      .filter((m) => m.bibliotecaId === bibliotecaId)
      .filter((m) => filtro.pasta === undefined || m.pasta === filtro.pasta)
      .filter((m) => filtro.digest === undefined || m.digest === filtro.digest)
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
  async modelosNoEspaco(
    espacoId: string,
    filtro: Parameters<CenariosRepository['modelosNoEspaco']>[1],
  ) {
    const dentro = (v: number, f?: { min?: number; max?: number }) =>
      (f?.min === undefined || v >= f.min) && (f?.max === undefined || v <= f.max)
    const todos = [...this.modelosGuardados.values()]
      .filter((m) => this.bibliotecasGuardadas.get(m.bibliotecaId)?.espacoId === espacoId)
      .filter((m) => filtro.pasta === undefined || m.pasta === filtro.pasta)
      .filter((m) => filtro.etiqueta === undefined || m.etiquetas.includes(filtro.etiqueta))
      .filter((m) => filtro.ids === undefined || filtro.ids.includes(m.id))
      .filter((m) => dentro(m.max[1] - m.min[1], filtro.altura))
      .filter((m) => dentro(Math.max(m.max[0] - m.min[0], m.max[2] - m.min[2]), filtro.lado))
      .filter((m) => filtro.termos.every((t) => m.busca.includes(t)))
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
  async organizacao(bibliotecaId: string) {
    const modelos = [
      ...this.modelosGuardados.values(),
      ...this.texturasGuardadas.values(),
      ...this.catalogoConjuntos
        .organizacaoDaBiblioteca(bibliotecaId)
        .map((c) => ({ ...c, bibliotecaId })),
    ].filter((m) => m.bibliotecaId === bibliotecaId)
    return {
      pastas: [...new Set(modelos.map((m) => m.pasta))].sort(),
      etiquetas: [...new Set(modelos.flatMap((m) => m.etiquetas))].sort(),
    }
  }
  async reservarBlobs(
    espacoId: string,
    blobs: readonly BlobReservado[],
    agora: Date,
    venceEm: Date,
  ) {
    const espaco = this.espacosGuardados.get(espacoId)
    if (!espaco) return null
    let saindo = false
    for (const b of blobs) {
      const desde = this.saindo.get(this.chave(espacoId, b.digest))
      if (!desde) continue
      if (desde.getTime() <= agora.getTime() - LIMITES_DOS_CENARIOS.saidaDoArquivoMs)
        this.saindo.delete(this.chave(espacoId, b.digest))
      else saindo = true
    }
    if (saindo) throw new CenarioArquivoSaindoError()
    for (const b of blobs) {
      const existente = this.blobs.get(this.chave(espacoId, b.digest))
      if (
        existente &&
        (existente.confirmado || existente.venceEm > agora) &&
        (existente.bytes !== b.bytes ||
          !tiposDeBlobCompativeis(existente.tipo, b.tipo) ||
          (existente.tipoDoConteudo ?? TIPO_DO_CONTEUDO[existente.tipo]) !==
            (b.tipoDoConteudo ?? TIPO_DO_CONTEUDO[b.tipo]))
      )
        throw new ValidationError('O arquivo já foi reservado com outro tamanho ou tipo')
    }
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
  async confirmarBlobs(espacoId: string, conferidos: readonly ConferenciaDeBlob[], agora: Date) {
    this.confirmarBlobsNoEstado(espacoId, conferidos, agora)
  }
  private confirmarBlobsNoEstado(
    espacoId: string,
    conferidos: readonly ConferenciaDeBlob[],
    agora: Date,
  ) {
    for (const c of conferidos) {
      const blob = this.blobs.get(this.chave(espacoId, c.digest))
      if (
        blob &&
        blob.venceEm > agora &&
        blob.bytes === c.bytes &&
        (blob.tipoDoConteudo ?? TIPO_DO_CONTEUDO[blob.tipo]) === c.tipoDoConteudo
      )
        blob.confirmado = true
    }
    this.atualizarUso(espacoId, agora)
  }
  async blobsConfirmados(espacoId: string, digests: readonly string[]) {
    const mapa = new Map<
      string,
      { tipo: TipoDeBlob; bytes: number; tipoDoConteudo: TipoDeConteudo }
    >()
    for (const d of digests) {
      const blob = this.blobs.get(this.chave(espacoId, d))
      if (blob?.confirmado)
        mapa.set(d, {
          tipo: blob.tipo,
          bytes: blob.bytes,
          tipoDoConteudo: blob.tipoDoConteudo ?? TIPO_DO_CONTEUDO[blob.tipo],
        })
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
    return this.copia(
      [...this.mundosGuardados.values()].filter(
        (m) => m.espacoId === espacoId && !m.bibliotecaConjuntosId,
      ),
    )
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
    const doEspaco = [...this.mundosGuardados.values()].filter(
      (m) => m.espacoId === dados.espacoId && !m.bibliotecaConjuntosId,
    )
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
    if (!this.mundosGuardados.has(id)) return []
    const apagados: string[] = []
    for (const c of [...this.cenariosGuardados.values()])
      if (c.mundoId === id) apagados.push(...(await this.apagarCenario(c.id)))
    this.mundosGuardados.delete(id)
    return apagados
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
    return this.gravarLoteNoEstado(dados, agora)
  }
  private gravarLoteNoEstado(dados: Parameters<CenariosRepository['gravarLote']>[0], agora: Date) {
    const c = this.cenariosGuardados.get(dados.cenarioId)
    if (!c) return null
    const repetido = c.lotes.find((l) => l.operacaoId === dados.operacaoId)
    if (repetido) return { revisao: repetido.revisao, repetido: true }
    if (c.revisao !== dados.revisaoEsperada) return null
    this.catalogoConjuntos.conferirCenarioDeEdicao(c.id, dados.documento)
    const inversos = inverterLote(c.documento, dados.documento)
    const atual = this.copia(this.pilhas.get(c.id) ?? { passado: [], futuro: [] })
    const historico =
      inversos.length || dados.movimento
        ? avancarHistorico(atual, c.revisao + 1, dados.movimento)
        : atual
    if (!historico) return null
    if (!this.fotografias.has(c.id))
      this.fotografias.set(c.id, [{ revisao: c.revisao, documento: this.copia(c.documento) }])
    this.pilhas.set(c.id, historico)
    c.revisao += 1
    c.documento = this.copia(dados.documento)
    c.nome = dados.documento.nome
    c.atualizadoEm = agora
    c.lotes.push({
      revisao: c.revisao,
      operacaoId: dados.operacaoId,
      comandos: this.copia(dados.comandos),
      inversos,
      autorId: dados.autorId,
      criadoEm: agora,
    })
    if (c.revisao % 50 === 0)
      this.fotografias.get(c.id)!.push({ revisao: c.revisao, documento: this.copia(c.documento) })
    const mundo = this.mundosGuardados.get(c.mundoId)
    if (mundo) mundo.atualizadoEm = agora
    return { revisao: c.revisao, repetido: false }
  }
  async pilhasDoHistorico(id: string) {
    return this.copia(this.pilhas.get(id) ?? { passado: [], futuro: [] })
  }
  async inicioDoHistorico(id: string) {
    return this.fotografias.get(id)?.[0]?.revisao ?? null
  }
  async passoDoHistorico(id: string, revisao: number) {
    return this.copia(
      this.cenariosGuardados.get(id)?.lotes.find((l) => l.revisao === revisao) ?? null,
    )
  }
  async revisoes(id: string, antes: number | undefined, limite: number) {
    return this.copia(
      (this.cenariosGuardados.get(id)?.lotes ?? [])
        .filter((l) => antes === undefined || l.revisao < antes)
        .toReversed()
        .slice(0, limite)
        .map(({ revisao, autorId, criadoEm }) => ({ revisao, autorId, criadoEm })),
    )
  }
  async fotografia(id: string, revisao: number) {
    return this.copia(
      this.fotografias
        .get(id)
        ?.filter((r) => r.revisao <= revisao)
        .at(-1) ?? null,
    )
  }
  async lotesEntre(id: string, depois: number, ate: number) {
    return this.copia(
      (this.cenariosGuardados.get(id)?.lotes ?? [])
        .filter((l) => l.revisao > depois && l.revisao <= ate)
        .map(({ revisao, comandos }) => ({ revisao, comandos })),
    )
  }
  async retratos(cenarioId: string, revisoes: readonly number[]) {
    const fontes = this.retratosGuardados.get(cenarioId)
    return new Map(revisoes.flatMap((r) => (fontes?.has(r) ? [[r, fontes.get(r)!] as const] : [])))
  }
  async definirCapa(dados: Parameters<CenariosRepository['definirCapa']>[0], agora: Date) {
    const { cenarioId, revisao, digest } = dados
    const c = this.cenariosGuardados.get(cenarioId)
    const mundo = c && this.mundosGuardados.get(c.mundoId)
    if (!c || !mundo) return null
    const inicio = (await this.inicioDoHistorico(cenarioId)) ?? c.revisao
    if (!Number.isInteger(revisao) || revisao < inicio || revisao > c.revisao)
      throw new CenarioInvalidoError(['Revisão fora do histórico deste cenário'])
    const retratos = this.retratosGuardados.get(cenarioId) ?? new Map<number, string>(),
      existente = retratos.get(revisao)
    if (existente) return { revisao, digest: existente, atual: revisao === c.revisao, apagar: [] }
    if (dados.recurso) {
      const cf = dados.recurso.conferido
      if (
        dados.recurso.espacoId !== mundo.espacoId ||
        !cf ||
        cf.digest !== digest ||
        cf.bytes < 1 ||
        cf.bytes > 512 * 1024 ||
        !['image/png', 'image/webp'].includes(cf.tipoDoConteudo)
      )
        throw new CenarioArquivoAusenteError([digest])
      this.confirmarBlobsNoEstado(mundo.espacoId, [cf], agora)
    }
    const imagem = this.blobs.get(this.chave(mundo.espacoId, digest))
    if (
      !imagem?.confirmado ||
      imagem.bytes > 512 * 1024 ||
      !['miniatura', 'capa', 'textura'].includes(imagem.tipo)
    )
      throw new CenarioArquivoAusenteError([digest])
    retratos.set(revisao, digest)
    this.retratosGuardados.set(cenarioId, retratos)
    const atual = revisao === c.revisao,
      anterior = c.capa
    if (atual) {
      c.capa = digest
      c.atualizadoEm = agora
    }
    this.contarCenarios(c.mundoId)
    return {
      revisao,
      digest,
      atual,
      apagar:
        atual && anterior && anterior !== digest
          ? this.soltarOrfaos(mundo.espacoId, [anterior], agora)
          : [],
    }
  }
  async apagarCenario(id: string) {
    const c = this.cenariosGuardados.get(id)
    const mundo = c && this.mundosGuardados.get(c.mundoId)
    if (!mundo) return []
    return this.soltarOrfaos(mundo.espacoId, this.removerCenarioDoEstado(id), new Date())
  }
  private removerCenarioDoEstado(id: string): string[] {
    const c = this.cenariosGuardados.get(id)
    const mundo = c && this.mundosGuardados.get(c.mundoId)
    if (!c || !mundo) return []
    const candidatos = new Set<string>()
    const incluir = (d: DocumentoDeCenario) => {
      for (const r of arquivosDoDocumento(d)) candidatos.add(r.digest)
    }
    incluir(c.documento)
    for (const r of this.fotografias.get(c.id) ?? []) incluir(r.documento)
    for (const l of c.lotes)
      for (const r of arquivosDosComandos([...l.comandos, ...(l.inversos ?? [])]))
        candidatos.add(r.digest)
    if (c.capa) candidatos.add(c.capa)
    for (const digest of this.retratosGuardados.get(id)?.values() ?? []) candidatos.add(digest)
    this.retratosGuardados.delete(id)
    this.cenariosGuardados.delete(id)
    this.pilhas.delete(id)
    this.fotografias.delete(id)
    this.contarCenarios(c.mundoId)
    return [...candidatos]
  }
}
