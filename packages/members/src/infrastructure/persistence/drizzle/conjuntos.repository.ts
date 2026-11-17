import { createHash } from 'node:crypto'
import {
  arquivosDoDocumento,
  type ComandoDeCenario,
  criarDocumentoVazio,
  type DocumentoDeCenario,
  CenarioInvalido as ErroDoNucleo,
  executarLote,
  type FragmentoBasico,
  igual,
  referenciarConjunto,
  validarConteudoDeConjunto,
} from '@sistemazero/molda-cenarios-core/v2'
import { and, asc, eq, ilike, inArray, isNotNull, or, sql } from 'drizzle-orm'
import {
  buscaDoModelo,
  type Conjunto,
  type Espaco,
  LIMITES_DOS_CENARIOS,
  type VersaoDeConjunto,
} from '../../../domain/cenarios/cenarios'
import {
  CenarioArquivoAusenteError,
  CenarioDesatualizadoError,
  CenarioInvalidoError,
  CenariosSemEspacoError,
} from '../../../domain/cenarios/cenarios.errors'
import type {
  CenariosRepository,
  ConjuntosRepository,
  NovoConjunto,
  PublicacaoDeConjunto,
} from '../../../domain/ports/cenarios-repository.port'
import { arrayDeDigestsSql, digestsDoDocumentoJson } from './cenarios-arquivos-json'
import type {
  ExecutorDeCenarios as Executor,
  TransacaoDeCenarios as Transacao,
} from './cenarios-transacao'
import type { Database } from './db'
import {
  cenarioBibliotecas,
  cenarioBlobs,
  cenarioCenarios,
  cenarioConjuntos,
  cenarioConjuntoUsos,
  cenarioConjuntoVersoes,
  cenarioLotes,
} from './schema'

interface TransacoesDoCatalogo {
  comTrava<T>(espacoId: string, tarefa: (tx: Transacao) => Promise<T>): Promise<T>
  espaco(tx: Executor, id: string, agora: Date): Promise<Espaco | null>
  gravarLote(
    tx: Transacao,
    espacoId: string,
    dados: Parameters<CenariosRepository['gravarLote']>[0],
    agora: Date,
  ): ReturnType<CenariosRepository['gravarLote']>
  soltarOrfaos(tx: Transacao, espacoId: string, digests: readonly string[]): Promise<string[]>
}
const colunas = {
  id: cenarioConjuntos.id,
  bibliotecaId: cenarioConjuntos.bibliotecaId,
  nome: cenarioConjuntos.nome,
  pasta: cenarioConjuntos.pasta,
  etiquetas: cenarioConjuntos.etiquetas,
  revisao: cenarioConjuntos.revisao,
  miniatura: cenarioConjuntoVersoes.miniatura,
  bytes: cenarioConjuntoVersoes.bytes,
  objetos: cenarioConjuntoVersoes.objetos,
  atualizadoEm: cenarioConjuntos.updatedAt,
}
const versaoAtual = and(
  eq(cenarioConjuntoVersoes.conjuntoId, cenarioConjuntos.id),
  eq(cenarioConjuntoVersoes.revisao, cenarioConjuntos.revisao),
)!
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const operacaoDaPublicacao = (id: string, operacaoId: string) =>
  `conjunto:${createHash('sha256').update(`${id}:${operacaoId}`).digest('hex')}`

/** Catálogo e publicação compartilham a conexão, a trava e a gravação de lotes dos cenários. */
export class ConjuntosNoPostgres implements ConjuntosRepository {
  constructor(
    private readonly db: Database,
    private readonly transacoes: TransacoesDoCatalogo,
  ) {}

  async conjuntos(bibliotecaId: string, filtro: Parameters<ConjuntosRepository['conjuntos']>[1]) {
    const condicao = and(
      eq(cenarioConjuntos.bibliotecaId, bibliotecaId),
      ...(filtro.pasta !== undefined ? [eq(cenarioConjuntos.pasta, filtro.pasta)] : []),
      ...filtro.termos.map((t) => ilike(cenarioConjuntos.busca, `%${t}%`)),
    )!
    const [itens, total] = await Promise.all([
      this.db
        .select(colunas)
        .from(cenarioConjuntos)
        .innerJoin(cenarioConjuntoVersoes, versaoAtual)
        .where(condicao)
        .orderBy(asc(cenarioConjuntos.busca), asc(cenarioConjuntos.id))
        .offset(filtro.inicio)
        .limit(filtro.limite),
      this.db.select({ total: sql<number>`count(*)::int` }).from(cenarioConjuntos).where(condicao),
    ])
    return { itens, total: total[0]?.total ?? 0 }
  }

  async conjunto(id: string, executor: Executor = this.db): Promise<Conjunto | null> {
    const [r] = await executor
      .select(colunas)
      .from(cenarioConjuntos)
      .innerJoin(cenarioConjuntoVersoes, versaoAtual)
      .where(eq(cenarioConjuntos.id, id))
      .limit(1)
    return r ?? null
  }

  async versaoDoConjunto(
    id: string,
    revisao: number,
    executor: Executor = this.db,
  ): Promise<VersaoDeConjunto | null> {
    const [r] = await executor
      .select({
        conjuntoId: cenarioConjuntoVersoes.conjuntoId,
        revisao: cenarioConjuntoVersoes.revisao,
        nome: cenarioConjuntoVersoes.nome,
        conteudo: cenarioConjuntoVersoes.conteudo,
        miniatura: cenarioConjuntoVersoes.miniatura,
        bytes: cenarioConjuntoVersoes.bytes,
        objetos: cenarioConjuntoVersoes.objetos,
        autorId: cenarioConjuntoVersoes.autorId,
        criadoEm: cenarioConjuntoVersoes.createdAt,
      })
      .from(cenarioConjuntoVersoes)
      .where(
        and(eq(cenarioConjuntoVersoes.conjuntoId, id), eq(cenarioConjuntoVersoes.revisao, revisao)),
      )
      .limit(1)
    return r ?? null
  }

  private async donoDaBiblioteca(id: string, executor: Executor = this.db) {
    const [b] = await executor
      .select({ espacoId: cenarioBibliotecas.espacoId })
      .from(cenarioBibliotecas)
      .where(eq(cenarioBibliotecas.id, id))
      .limit(1)
    return b?.espacoId ?? null
  }

  private async conferirConteudo(
    tx: Transacao,
    espacoId: string,
    valor: FragmentoBasico,
  ): Promise<FragmentoBasico> {
    let conteudo: FragmentoBasico
    try {
      conteudo = validarConteudoDeConjunto(valor, espacoId)
    } catch (e) {
      if (e instanceof ErroDoNucleo) throw new CenarioInvalidoError(e.problemas)
      throw e
    }
    const referencias = arquivosDoDocumento({
      ...criarDocumentoVazio('conteudo', 'Conteúdo'),
      modelos: conteudo.modelos,
      ...(conteudo.texturas.length ? { texturas: conteudo.texturas } : {}),
    })
    const digests = [...new Set(referencias.map((r) => r.digest))]
    if (digests.length) {
      const confirmados = await tx
        .select({ digest: cenarioBlobs.digest, tipo: cenarioBlobs.tipo })
        .from(cenarioBlobs)
        .where(
          and(
            eq(cenarioBlobs.espacoId, espacoId),
            inArray(cenarioBlobs.digest, digests),
            isNotNull(cenarioBlobs.confirmadoEm),
          ),
        )
      const presentes = new Set(confirmados.map((r) => `${r.tipo}:${r.digest}`))
      const ausentes = [
        ...new Set(
          referencias.filter((r) => !presentes.has(`${r.tipo}:${r.digest}`)).map((r) => r.digest),
        ),
      ]
      if (ausentes.length) throw new CenarioArquivoAusenteError(ausentes)
    }
    return conteudo
  }

  private async conferirCota(tx: Transacao, espacoId: string, bytes: number, agora: Date) {
    const espaco = await this.transacoes.espaco(tx, espacoId, agora)
    if (!espaco || espaco.usadoBytes + bytes > espaco.limiteBytes)
      throw new CenariosSemEspacoError()
  }

  async criarConjunto(dados: NovoConjunto, teto: number, agora: Date): Promise<Conjunto | null> {
    const espacoId = await this.donoDaBiblioteca(dados.bibliotecaId)
    if (!espacoId) return null
    return this.transacoes.comTrava(espacoId, async (tx) => {
      if ((await this.donoDaBiblioteca(dados.bibliotecaId, tx)) !== espacoId) return null
      const conteudo = await this.conferirConteudo(tx, espacoId, dados.conteudo)
      const [existente] = await tx
        .select({ id: cenarioConjuntos.id })
        .from(cenarioConjuntos)
        .where(
          and(
            eq(cenarioConjuntos.bibliotecaId, dados.bibliotecaId),
            eq(cenarioConjuntos.operacaoId, dados.operacaoId),
          ),
        )
        .limit(1)
      if (existente) {
        const primeira = await this.versaoDoConjunto(existente.id, 1, tx)
        if (!primeira || !igual(primeira.conteudo, conteudo) || primeira.nome !== dados.nome)
          throw new CenarioInvalidoError(['Esta operação já criou outro conteúdo'])
        return this.conjunto(existente.id, tx)
      }
      const [quantidade] = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(cenarioConjuntos)
        .where(eq(cenarioConjuntos.bibliotecaId, dados.bibliotecaId))
      if ((quantidade?.total ?? 0) >= teto) throw new CenariosSemEspacoError()
      const bytes = new TextEncoder().encode(JSON.stringify(conteudo)).length
      await this.conferirCota(tx, espacoId, bytes, agora)
      await tx.insert(cenarioConjuntos).values({
        id: dados.id,
        operacaoId: dados.operacaoId,
        bibliotecaId: dados.bibliotecaId,
        nome: dados.nome,
        pasta: dados.pasta,
        etiquetas: dados.etiquetas,
        busca: buscaDoModelo(dados),
        revisao: 1,
        criadoPor: dados.autorId,
        createdAt: agora,
        updatedAt: agora,
      })
      await tx.insert(cenarioConjuntoVersoes).values({
        conjuntoId: dados.id,
        revisao: 1,
        operacaoId: dados.operacaoId,
        nome: dados.nome,
        conteudo,
        miniatura: null,
        bytes,
        objetos: conteudo.instancias.length,
        autorId: dados.autorId,
        createdAt: agora,
      })
      return this.conjunto(dados.id, tx)
    })
  }

  async editarConjunto(
    id: string,
    dados: Parameters<ConjuntosRepository['editarConjunto']>[1],
    agora: Date,
  ): Promise<Conjunto | null> {
    const atual = await this.conjunto(id)
    if (!atual) return null
    const espacoId = await this.donoDaBiblioteca(atual.bibliotecaId)
    if (!espacoId) return null
    return this.transacoes.comTrava(espacoId, async (tx) => {
      const antes = await this.conjunto(id, tx)
      if (!antes) return null
      await tx
        .update(cenarioConjuntos)
        .set({ ...dados, busca: buscaDoModelo({ ...antes, ...dados }), updatedAt: agora })
        .where(eq(cenarioConjuntos.id, id))
      return this.conjunto(id, tx)
    })
  }

  /** Refaz o índice de uso da cabeça e confere revisões que ainda existem no catálogo. */
  async atualizarUsos(
    tx: Transacao,
    cenarioId: string,
    doc: DocumentoDeCenario,
    espacoId: string,
  ): Promise<void> {
    const fixadas = new Map(doc.definicoesConjuntos?.map((d) => [d.id, d]))
    for (const d of fixadas.values()) await this.conferirConteudo(tx, espacoId, d.conteudo)
    const conjuntos = [
      ...new Set(
        (doc.montagens ?? [])
          .map((m) => fixadas.get(m.definicao)?.conjunto)
          .filter((id): id is string => Boolean(id && uuid.test(id))),
      ),
    ]
    await tx.delete(cenarioConjuntoUsos).where(eq(cenarioConjuntoUsos.cenarioId, cenarioId))
    if (!conjuntos.length) return
    const catalogo = await tx
      .select({
        id: cenarioConjuntos.id,
        bibliotecaId: cenarioConjuntos.bibliotecaId,
        espacoId: cenarioBibliotecas.espacoId,
      })
      .from(cenarioConjuntos)
      .innerJoin(cenarioBibliotecas, eq(cenarioBibliotecas.id, cenarioConjuntos.bibliotecaId))
      .where(inArray(cenarioConjuntos.id, conjuntos))
    const porId = new Map(catalogo.map((c) => [c.id, c]))
    const versoes = await tx
      .select()
      .from(cenarioConjuntoVersoes)
      .where(
        or(
          ...[...fixadas.values()]
            .filter((d) => uuid.test(d.conjunto))
            .map((d) =>
              and(
                eq(cenarioConjuntoVersoes.conjuntoId, d.conjunto),
                eq(cenarioConjuntoVersoes.revisao, d.revisao),
              ),
            ),
        ),
      )
    const porVersao = new Map(versoes.map((v) => [`${v.conjuntoId}:${v.revisao}`, v]))
    const usos = []
    for (const m of doc.montagens ?? []) {
      const d = fixadas.get(m.definicao)!,
        c = porId.get(d.conjunto)
      if (!c) continue // Snapshot arquivado permanece utilizável quando o catálogo foi removido.
      const v = porVersao.get(`${d.conjunto}:${d.revisao}`)
      if (
        c.espacoId !== espacoId ||
        c.bibliotecaId !== d.biblioteca ||
        !v ||
        v.nome !== d.nome ||
        !igual(v.conteudo, d.conteudo)
      )
        throw new CenarioInvalidoError(['A definição fixada diverge da revisão da biblioteca'])
      usos.push({ cenarioId, montagemId: m.id, conjuntoId: d.conjunto, revisao: d.revisao })
    }
    if (usos.length) await tx.insert(cenarioConjuntoUsos).values(usos)
  }

  private comandoDeAtualizacao(
    doc: DocumentoDeCenario,
    conjunto: Conjunto,
    versao: VersaoDeConjunto,
  ): ComandoDeCenario {
    const { definicao } = referenciarConjunto(doc, {
      biblioteca: conjunto.bibliotecaId,
      conjunto: conjunto.id,
      revisao: versao.revisao,
      nome: versao.nome,
      conteudo: versao.conteudo,
    })
    return { tipo: 'conjunto.atualizar', definicao }
  }

  async publicarConjunto(
    dados: Parameters<ConjuntosRepository['publicarConjunto']>[0],
    tetoVersoes: number,
    agora: Date,
  ): Promise<PublicacaoDeConjunto | null> {
    const conjunto = await this.conjunto(dados.id)
    if (!conjunto) return null
    const espacoId = await this.donoDaBiblioteca(conjunto.bibliotecaId)
    if (!espacoId) return null
    return this.transacoes.comTrava(espacoId, async (tx) => {
      const atual = await this.conjunto(dados.id, tx)
      if (!atual) return null
      const conteudo = await this.conferirConteudo(tx, espacoId, dados.conteudo)
      const operacao = operacaoDaPublicacao(dados.id, dados.operacaoId)
      const [repetida] = await tx
        .select()
        .from(cenarioConjuntoVersoes)
        .where(
          and(
            eq(cenarioConjuntoVersoes.conjuntoId, dados.id),
            eq(cenarioConjuntoVersoes.operacaoId, dados.operacaoId),
          ),
        )
        .limit(1)
      if (repetida) {
        if (!igual(repetida.conteudo, conteudo))
          throw new CenarioInvalidoError(['Esta operação já publicou outro conteúdo'])
        const cenarios = await tx
          .select({ id: cenarioLotes.cenarioId, revisao: cenarioLotes.revisao })
          .from(cenarioLotes)
          .where(eq(cenarioLotes.operacaoId, operacao))
        return { conjunto: atual, cenarios }
      }
      if (atual.revisao !== dados.revisaoEsperada)
        throw new CenarioDesatualizadoError(atual.revisao)
      if (atual.revisao >= tetoVersoes)
        throw new CenariosSemEspacoError('Este conjunto chegou ao limite de versões')
      const bytes = new TextEncoder().encode(JSON.stringify(conteudo)).length
      await this.conferirCota(tx, espacoId, bytes, agora)
      const versao: VersaoDeConjunto = {
        conjuntoId: dados.id,
        revisao: atual.revisao + 1,
        nome: atual.nome,
        conteudo,
        miniatura: null,
        bytes,
        objetos: conteudo.instancias.length,
        autorId: dados.autorId,
        criadoEm: agora,
      }
      const afetados = await tx
        .selectDistinct({ id: cenarioConjuntoUsos.cenarioId })
        .from(cenarioConjuntoUsos)
        .where(eq(cenarioConjuntoUsos.conjuntoId, dados.id))
      const ids = afetados.map((a) => a.id),
        revisoes = new Map<string, number>()
      // Duas passadas limitadas: confere todas antes de publicar; não mantém documentos de todos os jogos na memória.
      const paraCadaCabeca = async (aplicar: boolean) => {
        for (let inicio = 0; inicio < ids.length; inicio += 8) {
          const cabecas = await tx
            .select({
              id: cenarioCenarios.id,
              documento: cenarioCenarios.documento,
              revisao: cenarioCenarios.revisao,
            })
            .from(cenarioCenarios)
            .where(inArray(cenarioCenarios.id, ids.slice(inicio, inicio + 8)))
          for (const cabeca of cabecas) {
            let comando: ComandoDeCenario
            let depois: ReturnType<typeof executarLote>
            try {
              comando = this.comandoDeAtualizacao(cabeca.documento, atual, versao)
              depois = executarLote(
                { documento: cabeca.documento, revisao: cabeca.revisao },
                { revisaoEsperada: cabeca.revisao, comandos: [comando] },
              )
            } catch (e) {
              if (e instanceof ErroDoNucleo) throw new CenarioInvalidoError(e.problemas)
              throw e
            }
            if (!aplicar) {
              revisoes.set(cabeca.id, cabeca.revisao)
              continue
            }
            if (revisoes.get(cabeca.id) !== cabeca.revisao)
              throw new CenarioDesatualizadoError(cabeca.revisao)
            const gravado = await this.transacoes.gravarLote(
              tx,
              espacoId,
              {
                cenarioId: cabeca.id,
                revisaoEsperada: cabeca.revisao,
                documento: depois.documento,
                comandos: [comando],
                operacaoId: operacao,
                autorId: dados.autorId,
              },
              agora,
            )
            if (!gravado) throw new CenarioDesatualizadoError(cabeca.revisao)
          }
        }
      }
      await paraCadaCabeca(false)
      await tx.insert(cenarioConjuntoVersoes).values({
        conjuntoId: dados.id,
        revisao: versao.revisao,
        operacaoId: dados.operacaoId,
        nome: versao.nome,
        conteudo,
        miniatura: null,
        bytes,
        objetos: versao.objetos,
        autorId: dados.autorId,
        createdAt: agora,
      })
      await tx
        .update(cenarioConjuntos)
        .set({ revisao: versao.revisao, updatedAt: agora })
        .where(eq(cenarioConjuntos.id, dados.id))
      await paraCadaCabeca(true)
      return {
        conjunto: (await this.conjunto(dados.id, tx))!,
        cenarios: [...revisoes].map(([id, revisao]) => ({ id, revisao: revisao + 1 })),
      }
    })
  }

  async definirMiniaturaDoConjunto(
    id: string,
    revisao: number,
    digest: string,
    agora: Date,
  ): Promise<boolean> {
    const conjunto = await this.conjunto(id)
    if (!conjunto) return false
    const espacoId = await this.donoDaBiblioteca(conjunto.bibliotecaId)
    if (!espacoId) return false
    return this.transacoes.comTrava(espacoId, async (tx) => {
      const versao = await this.versaoDoConjunto(id, revisao, tx)
      if (!versao) return false
      const [imagem] = await tx
        .select({ digest: cenarioBlobs.digest })
        .from(cenarioBlobs)
        .where(
          and(
            eq(cenarioBlobs.espacoId, espacoId),
            eq(cenarioBlobs.digest, digest),
            inArray(cenarioBlobs.tipo, ['miniatura', 'capa', 'textura']),
            isNotNull(cenarioBlobs.confirmadoEm),
            sql`${cenarioBlobs.bytes} <= ${LIMITES_DOS_CENARIOS.miniaturaBytes}`,
          ),
        )
        .limit(1)
      if (!imagem) throw new CenarioArquivoAusenteError([digest])
      await tx
        .update(cenarioConjuntoVersoes)
        .set({ miniatura: digest })
        .where(
          and(
            eq(cenarioConjuntoVersoes.conjuntoId, id),
            eq(cenarioConjuntoVersoes.revisao, revisao),
          ),
        )
      if (revisao === conjunto.revisao)
        await tx
          .update(cenarioConjuntos)
          .set({ updatedAt: agora })
          .where(eq(cenarioConjuntos.id, id))
      if (versao.miniatura && versao.miniatura !== digest)
        await this.transacoes.soltarOrfaos(tx, espacoId, [versao.miniatura])
      return true
    })
  }

  async arquivosDaBiblioteca(tx: Executor, bibliotecaId: string): Promise<string[]> {
    const versoes = await tx
      .select({
        miniatura: cenarioConjuntoVersoes.miniatura,
        digests: arrayDeDigestsSql(digestsDoDocumentoJson(sql`${cenarioConjuntoVersoes.conteudo}`)),
      })
      .from(cenarioConjuntoVersoes)
      .innerJoin(cenarioConjuntos, eq(cenarioConjuntos.id, cenarioConjuntoVersoes.conjuntoId))
      .where(eq(cenarioConjuntos.bibliotecaId, bibliotecaId))
    return [
      ...new Set(versoes.flatMap((v) => [...v.digests, ...(v.miniatura ? [v.miniatura] : [])])),
    ]
  }

  async apagarConjunto(id: string, _agora: Date): Promise<string[]> {
    const conjunto = await this.conjunto(id)
    if (!conjunto) return []
    const espacoId = await this.donoDaBiblioteca(conjunto.bibliotecaId)
    if (!espacoId) return []
    return this.transacoes.comTrava(espacoId, async (tx) => {
      const versoes = await tx
        .select({
          miniatura: cenarioConjuntoVersoes.miniatura,
          digests: arrayDeDigestsSql(
            digestsDoDocumentoJson(sql`${cenarioConjuntoVersoes.conteudo}`),
          ),
        })
        .from(cenarioConjuntoVersoes)
        .where(eq(cenarioConjuntoVersoes.conjuntoId, id))
      await tx.delete(cenarioConjuntos).where(eq(cenarioConjuntos.id, id))
      return this.transacoes.soltarOrfaos(
        tx,
        espacoId,
        versoes.flatMap((v) => [...v.digests, ...(v.miniatura ? [v.miniatura] : [])]),
      )
    })
  }
}
