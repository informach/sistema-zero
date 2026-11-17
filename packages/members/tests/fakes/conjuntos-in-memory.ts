import { createHash } from 'node:crypto'
import {
  arquivosDoDocumento,
  conferirFormatoDoCenarioDeConjunto,
  conteudoDoCenarioDeConjunto,
  criarDocumentoVazio,
  documentoParaEditarConjunto,
  CenarioInvalido as ErroDoNucleo,
  executarLote,
  type FragmentoBasico,
  igual,
  referenciarConjunto,
  validarConteudoDeConjunto,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  type Biblioteca,
  buscaDoModelo,
  type Cenario,
  type ConferenciaDeBlob,
  type Conjunto,
  type Espaco,
  type VersaoDeConjunto,
} from '../../src/domain/cenarios/cenarios'
import {
  CenarioArquivoAusenteError,
  CenarioDesatualizadoError,
  CenarioInvalidoError,
  CenariosSemEspacoError,
} from '../../src/domain/cenarios/cenarios.errors'
import type {
  CenariosRepository,
  ConjuntosRepository,
  LoteGravado,
  NovoConjunto,
  PublicacaoDeConjunto,
} from '../../src/domain/ports/cenarios-repository.port'

interface Contexto {
  biblioteca(id: string): Biblioteca | undefined
  espaco(id: string, agora: Date): Espaco | undefined
  arquivo(espacoId: string, digest: string, tipo: 'modelo' | 'textura'): boolean
  imagem(espacoId: string, digest: string): boolean
  confirmarImagem(espacoId: string, conferido: ConferenciaDeBlob, agora: Date): void
  cenarios(espacoId: string): Cenario[]
  fonte(id: string): Cenario | undefined
  prepararFonte(
    c: Conjunto,
    v: VersaoDeConjunto,
    autorId: string,
    agora: Date,
  ): { mundoId: string; cenarioId: string }
  removerFonte(id: string): string[]
  gravar(dados: Parameters<CenariosRepository['gravarLote']>[0], agora: Date): LoteGravado | null
  soltar(espacoId: string, digests: readonly string[], agora: Date): string[]
  mudou(espacoId: string, agora: Date): void
}
type VersaoGuardada = VersaoDeConjunto & {
  operacaoId: string
  cenarios: PublicacaoDeConjunto['cenarios']
}

/** Double de persistência: pré-valida e troca todo o estado sincronicamente, sem renderizar. */
export class ConjuntosEmMemoria implements ConjuntosRepository {
  private readonly atuais = new Map<string, Conjunto & { operacaoId: string }>()
  private readonly versoes = new Map<string, VersaoGuardada>()
  constructor(private readonly contexto: Contexto) {}
  private copia = <T>(v: T): T => structuredClone(v)
  private chave = (id: string, revisao: number) => `${id}:${revisao}`
  private espacoDo = (id: string) => this.contexto.biblioteca(id)?.espacoId
  private noNucleo<T>(tarefa: () => T): T {
    try {
      return tarefa()
    } catch (e) {
      if (e instanceof ErroDoNucleo) throw new CenarioInvalidoError(e.problemas)
      throw e
    }
  }

  bytesDoEspaco(id: string): number {
    return [...this.versoes.values()]
      .filter((v) => this.espacoDo(this.atuais.get(v.conjuntoId)?.bibliotecaId ?? '') === id)
      .reduce((n, v) => n + v.bytes, 0)
  }
  arquivosDoEspaco(id: string): Set<string> {
    const usados = new Set<string>()
    for (const v of this.versoes.values()) {
      if (this.espacoDo(this.atuais.get(v.conjuntoId)?.bibliotecaId ?? '') !== id) continue
      for (const m of [...v.conteudo.modelos, ...v.conteudo.texturas]) usados.add(m.digest)
      if (v.miniatura) usados.add(v.miniatura)
    }
    return usados
  }
  removerDaBiblioteca(id: string): string[] {
    const digests: string[] = []
    for (const c of this.atuais.values())
      if (c.bibliotecaId === id) digests.push(...this.remover(c.id))
    return digests
  }
  private remover(id: string): string[] {
    const digests: string[] = []
    const fonte = this.atuais.get(id)?.cenarioDeEdicaoId
    for (const [chave, v] of this.versoes)
      if (v.conjuntoId === id) {
        digests.push(
          ...v.conteudo.modelos.map((m) => m.digest),
          ...v.conteudo.texturas.map((t) => t.digest),
          ...(v.miniatura ? [v.miniatura] : []),
        )
        this.versoes.delete(chave)
      }
    this.atuais.delete(id)
    if (fonte) digests.push(...this.contexto.removerFonte(fonte))
    return [...new Set(digests)]
  }
  private conferir(espacoId: string, entrada: FragmentoBasico) {
    let f: FragmentoBasico
    try {
      f = validarConteudoDeConjunto(entrada, espacoId)
    } catch (e) {
      if (e instanceof ErroDoNucleo) throw new CenarioInvalidoError(e.problemas)
      throw e
    }
    const refs = arquivosDoDocumento({
      ...criarDocumentoVazio('fonte', 'Fonte'),
      modelos: f.modelos,
      ...(f.texturas.length ? { texturas: f.texturas } : {}),
    })
    const faltam = refs
      .filter((r) => r.tipo !== 'terreno' && !this.contexto.arquivo(espacoId, r.digest, r.tipo))
      .map((r) => r.digest)
    if (faltam.length) throw new CenarioArquivoAusenteError(faltam)
    return f
  }
  private conferirCota(espacoId: string, bytes: number, agora: Date) {
    const espaco = this.contexto.espaco(espacoId, agora)
    if (!espaco || espaco.usadoBytes + bytes > espaco.limiteBytes)
      throw new CenariosSemEspacoError()
  }

  async conjuntos(bibliotecaId: string, f: Parameters<ConjuntosRepository['conjuntos']>[1]) {
    const itens = [...this.atuais.values()]
      .filter(
        (c) =>
          c.bibliotecaId === bibliotecaId &&
          (f.pasta === undefined || c.pasta === f.pasta) &&
          f.termos.every((t) => buscaDoModelo(c).includes(t)),
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }))
    return {
      itens: this.copia(
        itens.slice(f.inicio, f.inicio + f.limite).map(({ operacaoId: _op, ...c }) => c),
      ),
      total: itens.length,
    }
  }
  async conjunto(id: string): Promise<Conjunto | null> {
    const c = this.atuais.get(id)
    if (!c) return null
    const { operacaoId: _op, ...resto } = c
    return this.copia(resto)
  }
  async conjuntoDoCenario(id: string): Promise<Conjunto | null> {
    const c = [...this.atuais.values()].find((c) => c.cenarioDeEdicaoId === id)
    return c ? this.conjunto(c.id) : null
  }
  conferirCenarioDeEdicao(id: string, doc: Cenario['documento']): void {
    const c = [...this.atuais.values()].find((c) => c.cenarioDeEdicaoId === id)
    if (!c) return
    try {
      conferirFormatoDoCenarioDeConjunto(doc)
    } catch (e) {
      if (e instanceof ErroDoNucleo) throw new CenarioInvalidoError(e.problemas)
      throw e
    }
    if (
      doc.montagens?.some((m) =>
        doc.definicoesConjuntos?.some((d) => d.id === m.definicao && d.conjunto === c.id),
      )
    )
      throw new CenarioInvalidoError(['Um conjunto não pode conter uma cópia de si mesmo'])
  }
  async prepararEdicaoDeConjunto(id: string, autorId: string, agora: Date) {
    const c = this.atuais.get(id)
    if (!c) return null
    if (c.cenarioDeEdicaoId) {
      const f = this.contexto.fonte(c.cenarioDeEdicaoId)
      return f ? { mundoId: f.mundoId, cenarioId: f.id } : null
    }
    const fonte = this.noNucleo(() =>
      this.contexto.prepararFonte(c, this.versoes.get(this.chave(id, c.revisao))!, autorId, agora),
    )
    c.cenarioDeEdicaoId = fonte.cenarioId
    c.revisaoPublicadaDoCenario = 0
    return fonte
  }
  async versaoDoConjunto(id: string, revisao: number): Promise<VersaoDeConjunto | null> {
    const v = this.versoes.get(this.chave(id, revisao))
    if (!v) return null
    const { operacaoId: _op, cenarios: _c, ...resto } = v
    return this.copia(resto)
  }
  async criarConjunto(dados: NovoConjunto, teto: number, agora: Date): Promise<Conjunto | null> {
    const espacoId = this.espacoDo(dados.bibliotecaId)
    if (!espacoId) return null
    const conteudo = this.conferir(espacoId, dados.conteudo)
    const existente = [...this.atuais.values()].find(
      (c) => c.bibliotecaId === dados.bibliotecaId && c.operacaoId === dados.operacaoId,
    )
    if (existente) {
      const primeira = this.versoes.get(this.chave(existente.id, 1))!
      if (!igual(primeira.conteudo, conteudo) || primeira.nome !== dados.nome)
        throw new CenarioInvalidoError(['Esta operação já criou outro conteúdo'])
      return this.conjunto(existente.id)
    }
    if (
      [...this.atuais.values()].filter((c) => c.bibliotecaId === dados.bibliotecaId).length >= teto
    )
      throw new CenariosSemEspacoError()
    const bytes = new TextEncoder().encode(JSON.stringify(conteudo)).length
    this.conferirCota(espacoId, bytes, agora)
    this.atuais.set(dados.id, {
      id: dados.id,
      bibliotecaId: dados.bibliotecaId,
      operacaoId: dados.operacaoId,
      nome: dados.nome,
      pasta: dados.pasta,
      etiquetas: this.copia(dados.etiquetas),
      revisao: 1,
      cenarioDeEdicaoId: null,
      revisaoPublicadaDoCenario: null,
      miniatura: null,
      bytes,
      objetos: conteudo.instancias.length,
      atualizadoEm: agora,
    })
    this.versoes.set(this.chave(dados.id, 1), {
      conjuntoId: dados.id,
      revisao: 1,
      nome: dados.nome,
      conteudo: this.copia(conteudo),
      miniatura: null,
      bytes,
      objetos: conteudo.instancias.length,
      autorId: dados.autorId,
      criadoEm: agora,
      operacaoId: dados.operacaoId,
      cenarios: [],
    })
    this.contexto.mudou(espacoId, agora)
    return this.conjunto(dados.id)
  }
  async editarConjunto(
    id: string,
    dados: Parameters<ConjuntosRepository['editarConjunto']>[1],
    agora: Date,
  ) {
    const c = this.atuais.get(id)
    if (!c) return null
    Object.assign(c, this.copia(dados), { atualizadoEm: agora })
    return this.conjunto(id)
  }
  async publicarConjunto(
    dados: Parameters<ConjuntosRepository['publicarConjunto']>[0],
    teto: number,
    agora: Date,
  ): Promise<PublicacaoDeConjunto | null> {
    const c = this.atuais.get(dados.id),
      espacoId = c && this.espacoDo(c.bibliotecaId)
    if (!c || !espacoId) return null
    const conteudo = this.conferir(espacoId, dados.conteudo)
    const repetida = [...this.versoes.values()].find(
      (v) => v.conjuntoId === c.id && v.operacaoId === dados.operacaoId,
    )
    if (repetida) {
      if (!igual(repetida.conteudo, conteudo))
        throw new CenarioInvalidoError(['Esta operação já publicou outro conteúdo'])
      const { operacaoId: _op, ...conjunto } = c
      return this.copia({ conjunto, cenarios: repetida.cenarios })
    }
    if (c.revisao !== dados.revisaoEsperada) throw new CenarioDesatualizadoError(c.revisao)
    if (c.revisao >= teto) throw new CenariosSemEspacoError()
    const fonte = c.cenarioDeEdicaoId ? this.contexto.fonte(c.cenarioDeEdicaoId) : undefined
    let documentoDaFonte = null
    let revisaoPublicadaDoCenario = fonte?.revisao ?? null
    if (dados.rascunho) {
      if (!fonte || fonte.id !== dados.rascunho.cenarioId)
        throw new CenarioInvalidoError(['Este rascunho não pertence ao conjunto'])
      if (fonte.revisao !== dados.rascunho.revisao)
        throw new CenarioDesatualizadoError(fonte.revisao)
      let salvo: FragmentoBasico
      try {
        salvo = conteudoDoCenarioDeConjunto(fonte.documento, espacoId)
      } catch (e) {
        if (e instanceof ErroDoNucleo) throw new CenarioInvalidoError(e.problemas)
        throw e
      }
      if (!igual(salvo, conteudo))
        throw new CenarioInvalidoError(['O conteúdo deve corresponder ao rascunho salvo'])
    } else if (fonte) {
      if (fonte.revisao !== c.revisaoPublicadaDoCenario)
        throw new CenarioInvalidoError([
          'Há alterações não publicadas no conjunto. Abra o rascunho para continuar.',
        ])
      const novo = this.noNucleo(() =>
        documentoParaEditarConjunto(conteudo, fonte.id, c.nome, espacoId),
      )
      if (!igual(novo, fonte.documento)) {
        documentoDaFonte = novo
        revisaoPublicadaDoCenario = fonte.revisao + 1
      }
    }
    const bytes = new TextEncoder().encode(JSON.stringify(conteudo)).length
    this.conferirCota(espacoId, bytes, agora)
    const revisao = c.revisao + 1
    const afetados = this.contexto
      .cenarios(espacoId)
      .filter((cenario) =>
        cenario.documento.montagens?.some((m) =>
          cenario.documento.definicoesConjuntos?.some(
            (d) => d.id === m.definicao && d.biblioteca === c.bibliotecaId && d.conjunto === c.id,
          ),
        ),
      )
    const planos = afetados.map((cenario) => {
      try {
        const { definicao } = referenciarConjunto(cenario.documento, {
          biblioteca: c.bibliotecaId,
          conjunto: c.id,
          revisao,
          nome: c.nome,
          conteudo,
        })
        const comandos = [{ tipo: 'conjunto.atualizar' as const, definicao }]
        const depois = executarLote(
          { documento: cenario.documento, revisao: cenario.revisao },
          { revisaoEsperada: cenario.revisao, comandos },
        )
        return { cenario, comandos, depois }
      } catch (e) {
        if (e instanceof ErroDoNucleo) throw new CenarioInvalidoError(e.problemas)
        throw e
      }
    })
    const operacaoId = `conjunto:${createHash('sha256').update(`${c.id}:${dados.operacaoId}`).digest('hex')}`
    if (documentoDaFonte && fonte)
      this.contexto.gravar(
        {
          cenarioId: fonte.id,
          revisaoEsperada: fonte.revisao,
          documento: documentoDaFonte,
          comandos: [{ tipo: 'cenario.restaurar', documento: documentoDaFonte }],
          operacaoId: `${operacaoId}:fonte`,
          autorId: dados.autorId,
        },
        agora,
      )
    for (const p of planos) {
      const r = this.contexto.gravar(
        {
          cenarioId: p.cenario.id,
          revisaoEsperada: p.cenario.revisao,
          documento: p.depois.documento,
          comandos: p.comandos,
          operacaoId,
          autorId: dados.autorId,
        },
        agora,
      )
      if (!r) throw new CenarioDesatualizadoError(p.cenario.revisao)
    }
    const cenarios = planos.map((p) => ({ id: p.cenario.id, revisao: p.depois.revisao }))
    this.versoes.set(this.chave(c.id, revisao), {
      conjuntoId: c.id,
      revisao,
      nome: c.nome,
      conteudo: this.copia(conteudo),
      miniatura: null,
      bytes,
      objetos: conteudo.instancias.length,
      autorId: dados.autorId,
      criadoEm: agora,
      operacaoId: dados.operacaoId,
      cenarios,
    })
    Object.assign(c, {
      revisao,
      revisaoPublicadaDoCenario,
      miniatura: null,
      bytes,
      objetos: conteudo.instancias.length,
      atualizadoEm: agora,
    })
    this.contexto.mudou(espacoId, agora)
    const { operacaoId: _op, ...conjunto } = c
    return this.copia({ conjunto, cenarios })
  }
  async definirMiniaturaDoConjunto(
    id: string,
    revisao: number,
    digest: string,
    agora: Date,
    recurso?: Parameters<ConjuntosRepository['definirMiniaturaDoConjunto']>[4],
  ) {
    const c = this.atuais.get(id),
      v = this.versoes.get(this.chave(id, revisao)),
      espacoId = c && this.espacoDo(c.bibliotecaId)
    if (!c || !v || !espacoId) return false
    if (recurso) {
      const f = recurso.conferido
      if (
        recurso.espacoId !== espacoId ||
        f.digest !== digest ||
        f.bytes < 1 ||
        f.bytes > 256 * 1024 ||
        !['image/png', 'image/webp'].includes(f.tipoDoConteudo)
      )
        throw new CenarioArquivoAusenteError([digest])
      this.contexto.confirmarImagem(espacoId, f, agora)
    }
    if (!this.contexto.imagem(espacoId, digest)) throw new CenarioArquivoAusenteError([digest])
    const anterior = v.miniatura
    v.miniatura = digest
    if (c.revisao === revisao) {
      c.miniatura = digest
      c.atualizadoEm = agora
    }
    if (anterior && anterior !== digest) this.contexto.soltar(espacoId, [anterior], agora)
    return true
  }
  async apagarConjunto(id: string, agora: Date) {
    const c = this.atuais.get(id),
      espacoId = c && this.espacoDo(c.bibliotecaId)
    if (!espacoId) return []
    const orfaos = this.contexto.soltar(espacoId, this.remover(id), agora)
    this.contexto.mudou(espacoId, agora)
    return orfaos
  }
}
