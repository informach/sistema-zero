import { randomUUID } from 'node:crypto'
import {
  arquivosDoDocumento,
  espacosDoDocumento,
  espacosDosComandos,
  inverterLote,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import {
  type Biblioteca,
  buscaDoModelo,
  type Cenario,
  type ConferenciaDeBlob,
  type Espaco,
  type Modelo,
  type Mundo,
  type ResumoDeCenario,
  type Textura,
  TIPO_DO_CONTEUDO,
  type TipoDeBlob,
  type TipoDeConteudo,
  tiposDeBlobCompativeis,
} from '../../../domain/cenarios/cenarios'
import {
  CenarioArquivoAusenteError,
  CenarioInvalidoError,
} from '../../../domain/cenarios/cenarios.errors'
import { avancarHistorico } from '../../../domain/cenarios/historico'
import type {
  BlobReservado,
  CenariosRepository,
  LoteGravado,
} from '../../../domain/ports/cenarios-repository.port'
import { ValidationError } from '../../../domain/shared/errors'
import {
  arrayDeDigestsSql,
  digestsDoDocumentoJson,
  digestsDosComandosJson,
} from './cenarios-arquivos-json'
import type {
  ExecutorDeCenarios as Executor,
  TransacaoDeCenarios as Transacao,
} from './cenarios-transacao'
import { ConjuntosNoPostgres } from './conjuntos.repository'
import type { Database } from './db'
import {
  cenarioBibliotecas,
  cenarioBlobs,
  cenarioCenarios,
  cenarioConjuntos,
  cenarioConjuntoVersoes,
  cenarioEspacos,
  cenarioLotes,
  cenarioModelos,
  cenarioMundoBibliotecas,
  cenarioMundos,
  cenarioRevisoes,
  cenarioTexturas,
} from './schema'

/**
 * A coluna da linha de FORA, com a tabela escrita por extenso. Numa consulta de uma tabela só o
 * drizzle escreve a coluna sem a tabela (`"id"`), e dentro de uma subconsulta o Postgres a
 * resolveria na tabela de DENTRO quando ela também tem `id`: a contagem daria sempre zero.
 */
const deFora = (tabela: PgTable, coluna: string): SQL => sql`${tabela}.${sql.identifier(coluna)}`

/** Ordem de nomes como a criança espera: sem diferenciar acento nem maiúscula, e "2" antes de "10". */
const ordemDosNomes = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })
function porNome<T extends { nome: string; id: string }>(linhas: T[]): T[] {
  return linhas.sort((a, b) => ordemDosNomes.compare(a.nome, b.nome) || a.id.localeCompare(b.id))
}

/** O que o espaço ocupa: arquivos confirmados e reservas que ainda não venceram. */
const usoDoEspaco = (agora: Date): SQL<number> => sql<number>`coalesce((
  select sum(b.bytes) from ${cenarioBlobs} b
  where b.espaco_id = ${deFora(cenarioEspacos, 'id')}
    and (b.confirmado_em is not null or b.vence_em > ${agora.toISOString()}::timestamptz)
), 0)::float8 + coalesce((
  select sum(v.bytes) from ${cenarioConjuntoVersoes} v
  join ${cenarioConjuntos} s on s.id = v.conjunto_id
  join ${cenarioBibliotecas} b on b.id = s.biblioteca_id
  where b.espaco_id = ${deFora(cenarioEspacos, 'id')}
), 0)::float8`

const colunasDaBiblioteca = {
  id: cenarioBibliotecas.id,
  espacoId: cenarioBibliotecas.espacoId,
  nome: cenarioBibliotecas.nome,
  fonte: cenarioBibliotecas.fonte,
  descricao: cenarioBibliotecas.descricao,
  capaModelo: cenarioBibliotecas.capaModelo,
  licenca: cenarioBibliotecas.licenca,
  atualizadaEm: cenarioBibliotecas.updatedAt,
  modelos: sql<number>`(
    select count(*) from ${cenarioModelos} m
    where m.biblioteca_id = ${deFora(cenarioBibliotecas, 'id')}
  )::int`,
  texturas: sql<number>`(select count(*) from ${cenarioTexturas} t where t.biblioteca_id = ${deFora(cenarioBibliotecas, 'id')})::int`,
  capa: sql<string | null>`coalesce((
    select m.miniatura from ${cenarioModelos} m where m.id = ${deFora(cenarioBibliotecas, 'capa_modelo')}
  ), (
    select m.miniatura from ${cenarioModelos} m
    where m.biblioteca_id = ${deFora(cenarioBibliotecas, 'id')} and m.miniatura is not null
    order by m.busca collate "C", m.id limit 1
  ), (select t.digest from ${cenarioTexturas} t where t.biblioteca_id = ${deFora(cenarioBibliotecas, 'id')} order by t.busca collate "C", t.id limit 1))`,
}

const colunasDoMundo = {
  id: cenarioMundos.id,
  espacoId: cenarioMundos.espacoId,
  bibliotecaConjuntosId: cenarioMundos.bibliotecaConjuntosId,
  nome: cenarioMundos.nome,
  criadoPor: cenarioMundos.criadoPor,
  atualizadoEm: cenarioMundos.updatedAt,
  cenarios: sql<number>`(
    select count(*) from ${cenarioCenarios} c where c.mundo_id = ${deFora(cenarioMundos, 'id')}
  )::int`,
  bibliotecas: sql<string[]>`coalesce((
    select jsonb_agg(mb.biblioteca_id order by mb.biblioteca_id)
    from ${cenarioMundoBibliotecas} mb where mb.mundo_id = ${deFora(cenarioMundos, 'id')}
  ), '[]'::jsonb)`,
  capa: sql<string | null>`(
    select c.capa from ${cenarioCenarios} c
    where c.mundo_id = ${deFora(cenarioMundos, 'id')} and c.capa is not null
    order by c.updated_at desc limit 1
  )`,
}

const colunasDoResumo = {
  id: cenarioCenarios.id,
  mundoId: cenarioCenarios.mundoId,
  nome: cenarioCenarios.nome,
  revisao: cenarioCenarios.revisao,
  capa: cenarioCenarios.capa,
  atualizadoEm: cenarioCenarios.updatedAt,
}

type LinhaDoModelo = typeof cenarioModelos.$inferSelect
const paraModelo = (m: LinhaDoModelo): Modelo => ({
  id: m.id,
  bibliotecaId: m.bibliotecaId,
  nome: m.nome,
  pasta: m.pasta,
  etiquetas: m.etiquetas,
  digest: m.digest,
  bytes: m.bytes,
  triangulos: m.triangulos,
  min: [m.caixa[0], m.caixa[1], m.caixa[2]],
  max: [m.caixa[3], m.caixa[4], m.caixa[5]],
  miniatura: m.miniatura,
})

const paraTextura = (t: typeof cenarioTexturas.$inferSelect): Textura => ({
  id: t.id,
  bibliotecaId: t.bibliotecaId,
  nome: t.nome,
  pasta: t.pasta,
  etiquetas: t.etiquetas,
  digest: t.digest,
  bytes: t.bytes,
  largura: t.largura,
  altura: t.altura,
  repeticaoMetros: t.repeticaoMetros,
})

export class DrizzleCenariosRepository implements CenariosRepository {
  private readonly catalogoConjuntos: ConjuntosNoPostgres
  constructor(private readonly db: Database) {
    this.catalogoConjuntos = new ConjuntosNoPostgres(db, {
      comTrava: (espacoId, tarefa) => this.comTrava(espacoId, tarefa),
      espaco: (tx, id, agora) => this.lerEspaco(tx, eq(cenarioEspacos.id, id), agora),
      gravarLote: (tx, espacoId, dados, agora) =>
        this.gravarLoteSobTrava(tx, espacoId, dados, agora),
      soltarOrfaos: (tx, espacoId, digests) => this.soltarOrfaos(tx, espacoId, digests),
      arquivosDosCenarios: (tx, ids) => this.arquivosDosCenarios(tx, ids),
      confirmarBlobs: (tx, espacoId, conferidos, agora) =>
        this.confirmarBlobsCom(tx, espacoId, conferidos, agora),
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

  /** Uma escrita por vez em cada espaço: é o que segura a cota e os tetos de quantidade. */
  private comTrava<T>(espacoId: string, tarefa: (tx: Transacao) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`cenarios-espaco:${espacoId}`}, 0))`,
      )
      return tarefa(tx)
    })
  }

  private async lerEspaco(
    executor: Executor,
    condicao: SQL,
    agora = new Date(),
  ): Promise<Espaco | null> {
    const [linha] = await executor
      .select({
        id: cenarioEspacos.id,
        tipo: cenarioEspacos.tipo,
        contaId: cenarioEspacos.contaId,
        limiteBytes: cenarioEspacos.limiteBytes,
        usadoBytes: usoDoEspaco(agora),
      })
      .from(cenarioEspacos)
      .where(condicao)
      .limit(1)
    return linha ? { ...linha, usadoBytes: Number(linha.usadoBytes) } : null
  }

  async espacoDaConta(contaId: string, limiteBytes: number, agora: Date): Promise<Espaco> {
    const condicao = and(eq(cenarioEspacos.tipo, 'conta'), eq(cenarioEspacos.contaId, contaId))!
    const existente = await this.lerEspaco(this.db, condicao, agora)
    if (existente) return existente
    // O espaço da conta tem o id DA CONTA: os arquivos dela moram em `cenarios/<conta>/`, um
    // caminho que a exclusão de conta conhece sem precisar consultar nada.
    await this.db
      .insert(cenarioEspacos)
      .values({ id: contaId, tipo: 'conta', contaId, limiteBytes, createdAt: agora })
      .onConflictDoNothing()
    return (await this.lerEspaco(this.db, condicao, agora))!
  }

  async espacoDaEquipe(limiteBytes: number, agora: Date): Promise<Espaco> {
    const condicao = eq(cenarioEspacos.tipo, 'equipe')
    const existente = await this.lerEspaco(this.db, condicao, agora)
    if (existente) return existente
    await this.db
      .insert(cenarioEspacos)
      .values({ id: randomUUID(), tipo: 'equipe', contaId: null, limiteBytes, createdAt: agora })
      .onConflictDoNothing()
    return (await this.lerEspaco(this.db, condicao, agora))!
  }

  espaco(id: string): Promise<Espaco | null> {
    return this.lerEspaco(this.db, eq(cenarioEspacos.id, id))
  }

  // ---- bibliotecas --------------------------------------------------------

  async bibliotecas(espacoId: string): Promise<Biblioteca[]> {
    // Listas pequenas (há teto por espaço): a ordem é dada aqui, e não pelo banco, porque a
    // ordenação do Postgres depende de como o servidor foi criado ("Árvore" iria para o fim).
    return porNome(
      await this.db
        .select(colunasDaBiblioteca)
        .from(cenarioBibliotecas)
        .where(eq(cenarioBibliotecas.espacoId, espacoId)),
    )
  }

  private async lerBiblioteca(executor: Executor, id: string): Promise<Biblioteca | null> {
    const [linha] = await executor
      .select(colunasDaBiblioteca)
      .from(cenarioBibliotecas)
      .where(eq(cenarioBibliotecas.id, id))
      .limit(1)
    return linha ?? null
  }
  biblioteca(id: string): Promise<Biblioteca | null> {
    return this.lerBiblioteca(this.db, id)
  }

  criarBiblioteca(
    dados: Parameters<CenariosRepository['criarBiblioteca']>[0],
    teto: number,
    agora: Date,
  ): Promise<Biblioteca | null> {
    return this.comTrava(dados.espacoId, async (tx) => {
      if (dados.fonte) {
        const [existente] = await tx
          .select(colunasDaBiblioteca)
          .from(cenarioBibliotecas)
          .where(
            and(
              eq(cenarioBibliotecas.espacoId, dados.espacoId),
              eq(cenarioBibliotecas.fonte, dados.fonte),
            ),
          )
          .limit(1)
        if (existente) return existente
      }
      const [conta] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(cenarioBibliotecas)
        .where(eq(cenarioBibliotecas.espacoId, dados.espacoId))
      if ((conta?.n ?? 0) >= teto) return null
      await tx.insert(cenarioBibliotecas).values({ ...dados, createdAt: agora, updatedAt: agora })
      return this.lerBiblioteca(tx, dados.id)
    })
  }

  async editarBiblioteca(
    id: string,
    dados: Parameters<CenariosRepository['editarBiblioteca']>[1],
    agora: Date,
  ): Promise<Biblioteca | null> {
    const biblioteca = await this.biblioteca(id)
    if (!biblioteca) return null
    return this.comTrava(biblioteca.espacoId, async (tx) => {
      if (dados.capaModelo) {
        const [modelo] = await tx
          .select({ id: cenarioModelos.id })
          .from(cenarioModelos)
          .innerJoin(cenarioBibliotecas, eq(cenarioBibliotecas.id, cenarioModelos.bibliotecaId))
          .where(
            and(
              eq(cenarioModelos.id, dados.capaModelo),
              eq(cenarioBibliotecas.espacoId, biblioteca.espacoId),
              isNotNull(cenarioModelos.miniatura),
            ),
          )
          .limit(1)
        if (!modelo) return null
      }
      const [linha] = await tx
        .update(cenarioBibliotecas)
        .set({ ...dados, updatedAt: agora })
        .where(eq(cenarioBibliotecas.id, id))
        .returning({ id: cenarioBibliotecas.id })
      return linha ? this.lerBiblioteca(tx, id) : null
    })
  }

  /** Dos digests dados, apaga do espaço os que nenhum modelo nem cenário usa mais. */
  private async soltarOrfaos(
    tx: Transacao,
    espacoId: string,
    digests: readonly string[],
  ): Promise<string[]> {
    const candidatos = [...new Set(digests)]
    if (!candidatos.length) return []
    const orfaos = await tx
      .delete(cenarioBlobs)
      .where(
        and(
          eq(cenarioBlobs.espacoId, espacoId),
          inArray(cenarioBlobs.digest, candidatos),
          sql`not exists (select 1 from ${cenarioConjuntoVersoes} v
            join ${cenarioConjuntos} s on s.id = v.conjunto_id
            join ${cenarioBibliotecas} b on b.id = s.biblioteca_id
            where b.espaco_id = ${espacoId} and (v.miniatura = ${cenarioBlobs.digest}
              or exists (select 1 from jsonb_array_elements_text(${digestsDoDocumentoJson(sql`v.conteudo`)}) as e(digest) where e.digest = ${cenarioBlobs.digest})))`,
          sql`not exists (select 1 from ${cenarioTexturas} t join ${cenarioBibliotecas} b on b.id = t.biblioteca_id where b.espaco_id = ${espacoId} and t.digest = ${cenarioBlobs.digest})`,
          sql`not exists (
            select 1 from ${cenarioModelos} m
            join ${cenarioBibliotecas} b on b.id = m.biblioteca_id
            where b.espaco_id = ${espacoId}
              and (m.digest = ${cenarioBlobs.digest} or m.miniatura = ${cenarioBlobs.digest})
          )`,
          sql`not exists (
            select 1 from ${cenarioLotes} l
            join ${cenarioCenarios} c on c.id = l.cenario_id
            join ${cenarioMundos} w on w.id = c.mundo_id
            where w.espaco_id = ${espacoId}
              and exists (
                select 1 from jsonb_array_elements_text(${digestsDosComandosJson(sql`(l.comandos || coalesce(l.inversos, '[]'::jsonb))`)}) as e(digest)
                where e.digest = ${cenarioBlobs.digest}
              )
          )`,
          sql`not exists (
            select 1 from ${cenarioRevisoes} r
            join ${cenarioCenarios} c on c.id = r.cenario_id
            join ${cenarioMundos} w on w.id = c.mundo_id
            where w.espaco_id = ${espacoId}
              and exists (select 1 from jsonb_array_elements_text(${digestsDoDocumentoJson(sql`r.documento`)}) as e(digest)
                where e.digest = ${cenarioBlobs.digest})
          )`,
          sql`not exists (
            select 1 from ${cenarioCenarios} c
            join ${cenarioMundos} w on w.id = c.mundo_id
            where w.espaco_id = ${espacoId}
              and (
                c.capa = ${cenarioBlobs.digest}
                or exists (select 1 from jsonb_array_elements_text(${digestsDoDocumentoJson(sql`c.documento`)}) as e(digest)
                  where e.digest = ${cenarioBlobs.digest})
              )
          )`,
        ),
      )
      .returning({ digest: cenarioBlobs.digest })
    return orfaos.map((o) => o.digest)
  }

  async apagarBiblioteca(id: string): Promise<string[]> {
    const biblioteca = await this.lerBiblioteca(this.db, id)
    if (!biblioteca) return []
    return this.comTrava(biblioteca.espacoId, async (tx) => {
      const dela = await tx
        .select({ digest: cenarioModelos.digest, miniatura: cenarioModelos.miniatura })
        .from(cenarioModelos)
        .where(eq(cenarioModelos.bibliotecaId, id))
      const texturas = await tx
        .select({ digest: cenarioTexturas.digest })
        .from(cenarioTexturas)
        .where(eq(cenarioTexturas.bibliotecaId, id))
      const conjuntos = await this.catalogoConjuntos.arquivosDaBiblioteca(tx, id)
      await tx.delete(cenarioConjuntos).where(eq(cenarioConjuntos.bibliotecaId, id))
      await tx.delete(cenarioBibliotecas).where(eq(cenarioBibliotecas.id, id))
      return this.soltarOrfaos(tx, biblioteca.espacoId, [
        ...dela.flatMap((m) => (m.miniatura ? [m.digest, m.miniatura] : [m.digest])),
        ...texturas.map((t) => t.digest),
        ...conjuntos,
      ])
    })
  }

  // ---- modelos e arquivos -------------------------------------------------

  async modelos(bibliotecaId: string, filtro: Parameters<CenariosRepository['modelos']>[1]) {
    const condicao = and(
      eq(cenarioModelos.bibliotecaId, bibliotecaId),
      filtro.pasta !== undefined ? eq(cenarioModelos.pasta, filtro.pasta) : undefined,
      filtro.digest !== undefined ? eq(cenarioModelos.digest, filtro.digest) : undefined,
      // Os termos já chegam só com letras e números: não há curinga a escapar.
      ...filtro.termos.map((termo) => sql`${cenarioModelos.busca} like ${`%${termo}%`}`),
    )
    const [linhas, [conta]] = await Promise.all([
      this.db
        .select()
        .from(cenarioModelos)
        .where(condicao)
        // Paginado no banco, por isso pelo texto de busca (sem acento, minúsculo) comparado
        // byte a byte: dá a mesma ordem em qualquer servidor.
        .orderBy(sql`${cenarioModelos.busca} collate "C"`, asc(cenarioModelos.id))
        .limit(filtro.limite)
        .offset(filtro.inicio),
      this.db.select({ n: sql<number>`count(*)::int` }).from(cenarioModelos).where(condicao),
    ])
    return { itens: linhas.map(paraModelo), total: conta?.n ?? 0 }
  }

  async modelo(id: string): Promise<Modelo | null> {
    const [linha] = await this.db
      .select()
      .from(cenarioModelos)
      .where(eq(cenarioModelos.id, id))
      .limit(1)
    return linha ? paraModelo(linha) : null
  }

  async organizacao(bibliotecaId: string): Promise<{ pastas: string[]; etiquetas: string[] }> {
    const modelos = await this.db
      .select({ pasta: cenarioModelos.pasta, etiquetas: cenarioModelos.etiquetas })
      .from(cenarioModelos)
      .where(eq(cenarioModelos.bibliotecaId, bibliotecaId))
    const texturas = await this.db
      .select({ pasta: cenarioTexturas.pasta, etiquetas: cenarioTexturas.etiquetas })
      .from(cenarioTexturas)
      .where(eq(cenarioTexturas.bibliotecaId, bibliotecaId))
    const conjuntos = await this.db
      .select({ pasta: cenarioConjuntos.pasta, etiquetas: cenarioConjuntos.etiquetas })
      .from(cenarioConjuntos)
      .where(eq(cenarioConjuntos.bibliotecaId, bibliotecaId))
    const linhas = [...modelos, ...texturas, ...conjuntos]
    return {
      pastas: [...new Set(linhas.map((l) => l.pasta))].sort(),
      etiquetas: [...new Set(linhas.flatMap((l) => l.etiquetas))].sort(),
    }
  }

  reservarBlobs(
    espacoId: string,
    blobs: readonly BlobReservado[],
    agora: Date,
    venceEm: Date,
  ): Promise<{ faltam: BlobReservado[] } | null> {
    return this.comTrava(espacoId, async (tx) => {
      const espaco = await this.lerEspaco(tx, eq(cenarioEspacos.id, espacoId), agora)
      if (!espaco) return null
      const guardados = await tx
        .select({
          digest: cenarioBlobs.digest,
          bytes: cenarioBlobs.bytes,
          tipo: cenarioBlobs.tipo,
          tipoDoConteudo: cenarioBlobs.tipoDoConteudo,
          confirmadoEm: cenarioBlobs.confirmadoEm,
          venceEm: cenarioBlobs.venceEm,
        })
        .from(cenarioBlobs)
        .where(
          and(
            eq(cenarioBlobs.espacoId, espacoId),
            inArray(
              cenarioBlobs.digest,
              blobs.map((b) => b.digest),
            ),
          ),
        )
      const porDigest = new Map(guardados.map((g) => [g.digest, g]))
      for (const b of blobs) {
        const existente = porDigest.get(b.digest)
        if (
          existente &&
          (existente.confirmadoEm || existente.venceEm > agora) &&
          (existente.bytes !== b.bytes ||
            !tiposDeBlobCompativeis(existente.tipo, b.tipo) ||
            (existente.tipoDoConteudo ?? TIPO_DO_CONTEUDO[existente.tipo]) !==
              (b.tipoDoConteudo ?? TIPO_DO_CONTEUDO[b.tipo]))
        )
          throw new ValidationError('O arquivo já foi reservado com outro tamanho ou tipo')
      }
      const faltam = blobs.filter((b) => !porDigest.get(b.digest)?.confirmadoEm)
      // Só pesa na cota o que ainda não estava contado: reserva nova ou já vencida.
      const acrescimo = faltam
        .filter((b) => {
          const guardado = porDigest.get(b.digest)
          return !guardado || guardado.venceEm <= agora
        })
        .reduce((soma, b) => soma + b.bytes, 0)
      if (espaco.usadoBytes + acrescimo > espaco.limiteBytes) return null
      for (const b of faltam)
        await tx
          .insert(cenarioBlobs)
          .values({
            espacoId,
            ...b,
            tipoDoConteudo: b.tipoDoConteudo ?? TIPO_DO_CONTEUDO[b.tipo],
            confirmadoEm: null,
            venceEm,
            createdAt: agora,
          })
          .onConflictDoUpdate({
            target: [cenarioBlobs.espacoId, cenarioBlobs.digest],
            set: {
              tipo: b.tipo,
              bytes: b.bytes,
              tipoDoConteudo: b.tipoDoConteudo ?? TIPO_DO_CONTEUDO[b.tipo],
              venceEm,
            },
            setWhere: sql`${cenarioBlobs.confirmadoEm} is null`,
          })
      return { faltam: [...faltam] }
    })
  }

  async confirmarBlobs(
    espacoId: string,
    conferidos: readonly ConferenciaDeBlob[],
    agora: Date,
  ): Promise<void> {
    await this.confirmarBlobsCom(this.db, espacoId, conferidos, agora)
  }

  private async confirmarBlobsCom(
    executor: Executor,
    espacoId: string,
    conferidos: readonly ConferenciaDeBlob[],
    agora: Date,
  ): Promise<void> {
    const pecas = conferidos.filter((c) => c.tipoDoConteudo === 'application/octet-stream')
    for (const c of pecas) {
      if (
        !c.terreno ||
        !Number.isFinite(c.terreno.min) ||
        !Number.isFinite(c.terreno.max) ||
        c.terreno.min < -10000 ||
        c.terreno.max > 10000 ||
        c.terreno.max <= c.terreno.min ||
        c.bytes !== 8474
      )
        throw new CenarioArquivoAusenteError([c.digest])
      await executor
        .update(cenarioBlobs)
        .set({ confirmadoEm: agora, terreno: c.terreno })
        .where(
          and(
            eq(cenarioBlobs.espacoId, espacoId),
            eq(cenarioBlobs.digest, c.digest),
            eq(cenarioBlobs.tipo, 'terreno'),
            eq(cenarioBlobs.bytes, c.bytes),
            eq(cenarioBlobs.tipoDoConteudo, c.tipoDoConteudo),
            gt(cenarioBlobs.venceEm, agora),
            isNull(cenarioBlobs.confirmadoEm),
          ),
        )
    }
    const outros = conferidos.filter((c) => c.tipoDoConteudo !== 'application/octet-stream')
    if (!outros.length) return
    await executor
      .update(cenarioBlobs)
      .set({ confirmadoEm: agora })
      .where(
        and(
          eq(cenarioBlobs.espacoId, espacoId),
          or(
            ...outros.map((c) =>
              and(
                eq(cenarioBlobs.digest, c.digest),
                eq(cenarioBlobs.bytes, c.bytes),
                sql`coalesce(${cenarioBlobs.tipoDoConteudo}, case when ${cenarioBlobs.tipo} = 'modelo' then 'model/gltf-binary' else 'image/webp' end) = ${c.tipoDoConteudo}`,
              ),
            ),
          ),
          gt(cenarioBlobs.venceEm, agora),
          sql`${cenarioBlobs.confirmadoEm} is null`,
        ),
      )
  }

  async blobsConfirmados(espacoId: string, digests: readonly string[]) {
    const mapa = new Map<
      string,
      { tipo: TipoDeBlob; bytes: number; tipoDoConteudo: TipoDeConteudo }
    >()
    if (!digests.length) return mapa
    const linhas = await this.db
      .select({
        digest: cenarioBlobs.digest,
        tipo: cenarioBlobs.tipo,
        bytes: cenarioBlobs.bytes,
        tipoDoConteudo: cenarioBlobs.tipoDoConteudo,
      })
      .from(cenarioBlobs)
      .where(
        and(
          eq(cenarioBlobs.espacoId, espacoId),
          inArray(cenarioBlobs.digest, [...new Set(digests)]),
          isNotNull(cenarioBlobs.confirmadoEm),
        ),
      )
    for (const l of linhas)
      mapa.set(l.digest, {
        tipo: l.tipo,
        bytes: l.bytes,
        tipoDoConteudo: l.tipoDoConteudo ?? TIPO_DO_CONTEUDO[l.tipo],
      })
    return mapa
  }

  async criarModelos(
    bibliotecaId: string,
    modelos: Parameters<CenariosRepository['criarModelos']>[1],
    teto: number,
    criadoPor: string,
    agora: Date,
  ): Promise<Modelo[] | null> {
    const biblioteca = await this.lerBiblioteca(this.db, bibliotecaId)
    if (!biblioteca) return null
    return this.comTrava(biblioteca.espacoId, async (tx) => {
      const existentes = await tx
        .select({ digest: cenarioModelos.digest })
        .from(cenarioModelos)
        .where(eq(cenarioModelos.bibliotecaId, bibliotecaId))
      const jaTem = new Set(existentes.map((e) => e.digest))
      const novos = modelos.filter(
        (m, i) => !jaTem.has(m.digest) && modelos.findIndex((x) => x.digest === m.digest) === i,
      )
      if (existentes.length + novos.length > teto) return null
      if (!novos.length) return []
      const linhas = await tx
        .insert(cenarioModelos)
        .values(
          novos.map((m) => ({
            id: m.id,
            bibliotecaId,
            nome: m.nome,
            pasta: m.pasta,
            etiquetas: m.etiquetas,
            busca: buscaDoModelo(m),
            digest: m.digest,
            bytes: m.bytes,
            triangulos: m.triangulos,
            caixa: [...m.min, ...m.max] as [number, number, number, number, number, number],
            miniatura: m.miniatura,
            criadoPor,
            createdAt: agora,
            updatedAt: agora,
          })),
        )
        .returning()
      await tx
        .update(cenarioBibliotecas)
        .set({ updatedAt: agora })
        .where(eq(cenarioBibliotecas.id, bibliotecaId))
      return linhas.map(paraModelo)
    })
  }

  async editarModelo(
    id: string,
    dados: Parameters<CenariosRepository['editarModelo']>[1],
    agora: Date,
  ): Promise<Modelo | null> {
    const atual = await this.modelo(id)
    if (!atual) return null
    const depois = { ...atual, ...dados }
    const [linha] = await this.db
      .update(cenarioModelos)
      .set({
        nome: depois.nome,
        pasta: depois.pasta,
        etiquetas: depois.etiquetas,
        busca: buscaDoModelo(depois),
        updatedAt: agora,
      })
      .where(eq(cenarioModelos.id, id))
      .returning()
    return linha ? paraModelo(linha) : null
  }

  async apagarModelos(
    bibliotecaId: string,
    ids: readonly string[],
    agora: Date,
  ): Promise<string[]> {
    const biblioteca = await this.lerBiblioteca(this.db, bibliotecaId)
    if (!biblioteca || !ids.length) return []
    return this.comTrava(biblioteca.espacoId, async (tx) => {
      const apagados = await tx
        .delete(cenarioModelos)
        .where(
          and(eq(cenarioModelos.bibliotecaId, bibliotecaId), inArray(cenarioModelos.id, [...ids])),
        )
        .returning({ digest: cenarioModelos.digest, miniatura: cenarioModelos.miniatura })
      await tx
        .update(cenarioBibliotecas)
        .set({ updatedAt: agora })
        .where(eq(cenarioBibliotecas.id, bibliotecaId))
      return this.soltarOrfaos(
        tx,
        biblioteca.espacoId,
        apagados.flatMap((m) => (m.miniatura ? [m.digest, m.miniatura] : [m.digest])),
      )
    })
  }

  // ---- mundos -------------------------------------------------------------

  async texturas(bibliotecaId: string, filtro: Parameters<CenariosRepository['texturas']>[1]) {
    const condicao = and(
      eq(cenarioTexturas.bibliotecaId, bibliotecaId),
      filtro.pasta !== undefined ? eq(cenarioTexturas.pasta, filtro.pasta) : undefined,
      filtro.digest !== undefined ? eq(cenarioTexturas.digest, filtro.digest) : undefined,
      ...filtro.termos.map((termo) => sql`${cenarioTexturas.busca} like ${`%${termo}%`}`),
    )
    const [linhas, [conta]] = await Promise.all([
      this.db
        .select()
        .from(cenarioTexturas)
        .where(condicao)
        .orderBy(sql`${cenarioTexturas.busca} collate "C"`, asc(cenarioTexturas.id))
        .limit(filtro.limite)
        .offset(filtro.inicio),
      this.db.select({ n: sql<number>`count(*)::int` }).from(cenarioTexturas).where(condicao),
    ])
    return { itens: linhas.map(paraTextura), total: conta?.n ?? 0 }
  }

  async textura(id: string): Promise<Textura | null> {
    const [linha] = await this.db
      .select()
      .from(cenarioTexturas)
      .where(eq(cenarioTexturas.id, id))
      .limit(1)
    return linha ? paraTextura(linha) : null
  }

  async criarTexturas(
    bibliotecaId: string,
    texturas: Parameters<CenariosRepository['criarTexturas']>[1],
    teto: number,
    criadoPor: string,
    agora: Date,
    conferidos: readonly ConferenciaDeBlob[],
  ): Promise<Textura[] | null> {
    const biblioteca = await this.lerBiblioteca(this.db, bibliotecaId)
    if (!biblioteca) return null
    return this.comTrava(biblioteca.espacoId, async (tx) => {
      const existentes = await tx
        .select({ digest: cenarioTexturas.digest })
        .from(cenarioTexturas)
        .where(eq(cenarioTexturas.bibliotecaId, bibliotecaId))
      const jaTem = new Set(existentes.map((e) => e.digest))
      const novos = texturas.filter(
        (t, i) => !jaTem.has(t.digest) && texturas.findIndex((x) => x.digest === t.digest) === i,
      )
      if (existentes.length + novos.length > teto) return null
      if (!novos.length) return []
      await this.confirmarBlobsCom(tx, biblioteca.espacoId, conferidos, agora)
      const confirmados = await tx
        .select({ digest: cenarioBlobs.digest, bytes: cenarioBlobs.bytes })
        .from(cenarioBlobs)
        .where(
          and(
            eq(cenarioBlobs.espacoId, biblioteca.espacoId),
            inArray(
              cenarioBlobs.digest,
              novos.map((t) => t.digest),
            ),
            isNotNull(cenarioBlobs.confirmadoEm),
            sql`${cenarioBlobs.tipo} in ('miniatura', 'capa', 'textura')`,
          ),
        )
      const mapa = new Map(confirmados.map((c) => [c.digest, c.bytes]))
      const ausentes = novos.filter((t) => mapa.get(t.digest) !== t.bytes).map((t) => t.digest)
      if (ausentes.length) throw new CenarioArquivoAusenteError(ausentes)
      const linhas = await tx
        .insert(cenarioTexturas)
        .values(
          novos.map((t) => ({
            ...t,
            bibliotecaId,
            busca: buscaDoModelo(t),
            criadoPor,
            createdAt: agora,
            updatedAt: agora,
          })),
        )
        .returning()
      await tx
        .update(cenarioBibliotecas)
        .set({ updatedAt: agora })
        .where(eq(cenarioBibliotecas.id, bibliotecaId))
      return linhas.map(paraTextura)
    })
  }

  async editarTextura(
    id: string,
    dados: Parameters<CenariosRepository['editarTextura']>[1],
    agora: Date,
  ): Promise<Textura | null> {
    const atual = await this.textura(id)
    if (!atual) return null
    const depois = { ...atual, ...dados }
    const [linha] = await this.db
      .update(cenarioTexturas)
      .set({ ...dados, busca: buscaDoModelo(depois), updatedAt: agora })
      .where(eq(cenarioTexturas.id, id))
      .returning()
    return linha ? paraTextura(linha) : null
  }

  async apagarTexturas(
    bibliotecaId: string,
    ids: readonly string[],
    agora: Date,
  ): Promise<string[]> {
    const biblioteca = await this.lerBiblioteca(this.db, bibliotecaId)
    if (!biblioteca || !ids.length) return []
    return this.comTrava(biblioteca.espacoId, async (tx) => {
      const apagadas = await tx
        .delete(cenarioTexturas)
        .where(
          and(
            eq(cenarioTexturas.bibliotecaId, bibliotecaId),
            inArray(cenarioTexturas.id, [...ids]),
          ),
        )
        .returning({ digest: cenarioTexturas.digest })
      await tx
        .update(cenarioBibliotecas)
        .set({ updatedAt: agora })
        .where(eq(cenarioBibliotecas.id, bibliotecaId))
      return this.soltarOrfaos(
        tx,
        biblioteca.espacoId,
        apagadas.map((t) => t.digest),
      )
    })
  }

  async mundos(espacoId: string): Promise<Mundo[]> {
    return porNome(
      await this.db
        .select(colunasDoMundo)
        .from(cenarioMundos)
        .where(
          and(eq(cenarioMundos.espacoId, espacoId), isNull(cenarioMundos.bibliotecaConjuntosId)),
        ),
    )
  }

  private async lerMundo(executor: Executor, id: string): Promise<Mundo | null> {
    const [linha] = await executor
      .select(colunasDoMundo)
      .from(cenarioMundos)
      .where(eq(cenarioMundos.id, id))
      .limit(1)
    return linha ?? null
  }
  mundo(id: string): Promise<Mundo | null> {
    return this.lerMundo(this.db, id)
  }

  criarMundo(
    dados: Parameters<CenariosRepository['criarMundo']>[0],
    teto: number,
    agora: Date,
  ): Promise<Mundo | null> {
    return this.comTrava(dados.espacoId, async (tx) => {
      const [conta] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(cenarioMundos)
        .where(
          and(
            eq(cenarioMundos.espacoId, dados.espacoId),
            isNull(cenarioMundos.bibliotecaConjuntosId),
          ),
        )
      if ((conta?.n ?? 0) >= teto) return null
      await tx.insert(cenarioMundos).values({ ...dados, createdAt: agora, updatedAt: agora })
      return this.lerMundo(tx, dados.id)
    })
  }

  editarMundo(
    id: string,
    dados: Parameters<CenariosRepository['editarMundo']>[1],
    agora: Date,
  ): Promise<Mundo | null> {
    return this.db.transaction(async (tx) => {
      const [linha] = await tx
        .update(cenarioMundos)
        .set({ ...(dados.nome !== undefined ? { nome: dados.nome } : {}), updatedAt: agora })
        .where(eq(cenarioMundos.id, id))
        .returning({ id: cenarioMundos.id })
      if (!linha) return null
      if (dados.bibliotecas !== undefined) {
        await tx.delete(cenarioMundoBibliotecas).where(eq(cenarioMundoBibliotecas.mundoId, id))
        if (dados.bibliotecas.length)
          await tx
            .insert(cenarioMundoBibliotecas)
            .values(dados.bibliotecas.map((bibliotecaId) => ({ mundoId: id, bibliotecaId })))
      }
      return this.lerMundo(tx, id)
    })
  }

  async apagarMundo(id: string): Promise<string[]> {
    const mundo = await this.mundo(id)
    if (!mundo) return []
    return this.comTrava(mundo.espacoId, async (tx) => {
      const cenarios = await tx
        .select({ id: cenarioCenarios.id })
        .from(cenarioCenarios)
        .where(eq(cenarioCenarios.mundoId, id))
      const candidatos = await this.arquivosDosCenarios(
        tx,
        cenarios.map((c) => c.id),
      )
      await tx.delete(cenarioMundos).where(eq(cenarioMundos.id, id))
      return this.soltarOrfaos(tx, mundo.espacoId, candidatos)
    })
  }

  /** Extrai só referências conhecidas, sem baixar documentos inteiros nem varrer propriedades. */
  private async arquivosDosCenarios(tx: Executor, ids: readonly string[]): Promise<string[]> {
    if (!ids.length) return []
    const cabecas = await tx
      .select({
        digests: arrayDeDigestsSql(digestsDoDocumentoJson(sql`${cenarioCenarios.documento}`)),
        capa: cenarioCenarios.capa,
      })
      .from(cenarioCenarios)
      .where(inArray(cenarioCenarios.id, [...ids]))
    const fotos = await tx
      .select({
        digests: arrayDeDigestsSql(digestsDoDocumentoJson(sql`${cenarioRevisoes.documento}`)),
      })
      .from(cenarioRevisoes)
      .where(inArray(cenarioRevisoes.cenarioId, [...ids]))
    const comandos = sql`(${cenarioLotes.comandos} || coalesce(${cenarioLotes.inversos}, '[]'::jsonb))`
    const lotes = await tx
      .select({
        digests: arrayDeDigestsSql(digestsDosComandosJson(comandos)),
      })
      .from(cenarioLotes)
      .where(inArray(cenarioLotes.cenarioId, [...ids]))
    return [
      ...new Set([
        ...cabecas.flatMap((c) => [...c.digests, ...(c.capa ? [c.capa] : [])]),
        ...fotos.flatMap((f) => f.digests),
        ...lotes.flatMap((l) => l.digests),
      ]),
    ]
  }

  // ---- cenários -----------------------------------------------------------

  async cenarios(mundoId: string): Promise<ResumoDeCenario[]> {
    return porNome(
      await this.db
        .select(colunasDoResumo)
        .from(cenarioCenarios)
        .where(eq(cenarioCenarios.mundoId, mundoId)),
    )
  }

  async cenario(id: string): Promise<Cenario | null> {
    const [linha] = await this.db
      .select({ ...colunasDoResumo, documento: cenarioCenarios.documento })
      .from(cenarioCenarios)
      .where(eq(cenarioCenarios.id, id))
      .limit(1)
    return linha ?? null
  }

  async criarCenario(
    dados: Parameters<CenariosRepository['criarCenario']>[0],
    teto: number,
    agora: Date,
  ): Promise<ResumoDeCenario | null> {
    const mundo = await this.lerMundo(this.db, dados.mundoId)
    if (!mundo) return null
    return this.comTrava(mundo.espacoId, async (tx) => {
      const [conta] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(cenarioCenarios)
        .where(eq(cenarioCenarios.mundoId, dados.mundoId))
      if ((conta?.n ?? 0) >= teto) return null
      const [linha] = await tx
        .insert(cenarioCenarios)
        .values({ ...dados, revisao: 0, capa: null, createdAt: agora, updatedAt: agora })
        .returning(colunasDoResumo)
      if (linha)
        await this.catalogoConjuntos.atualizarUsos(tx, linha.id, dados.documento, mundo.espacoId)
      await tx
        .update(cenarioMundos)
        .set({ updatedAt: agora })
        .where(eq(cenarioMundos.id, dados.mundoId))
      return linha ?? null
    })
  }

  async pilhasDoHistorico(cenarioId: string) {
    const [c] = await this.db
      .select({ historico: cenarioCenarios.historico })
      .from(cenarioCenarios)
      .where(eq(cenarioCenarios.id, cenarioId))
      .limit(1)
    return c?.historico ?? { passado: [], futuro: [] }
  }
  async inicioDoHistorico(cenarioId: string) {
    const [r] = await this.db
      .select({ revisao: cenarioRevisoes.revisao })
      .from(cenarioRevisoes)
      .where(eq(cenarioRevisoes.cenarioId, cenarioId))
      .orderBy(asc(cenarioRevisoes.revisao))
      .limit(1)
    return r?.revisao ?? null
  }

  async passoDoHistorico(cenarioId: string, revisao: number) {
    const [l] = await this.db
      .select({
        revisao: cenarioLotes.revisao,
        operacaoId: cenarioLotes.operacaoId,
        comandos: cenarioLotes.comandos,
        inversos: cenarioLotes.inversos,
        autorId: cenarioLotes.autorId,
        criadoEm: cenarioLotes.createdAt,
      })
      .from(cenarioLotes)
      .where(and(eq(cenarioLotes.cenarioId, cenarioId), eq(cenarioLotes.revisao, revisao)))
      .limit(1)
    return l ?? null
  }

  revisoes(cenarioId: string, antes: number | undefined, limite: number) {
    return this.db
      .select({
        revisao: cenarioLotes.revisao,
        autorId: cenarioLotes.autorId,
        criadoEm: cenarioLotes.createdAt,
      })
      .from(cenarioLotes)
      .where(
        and(
          eq(cenarioLotes.cenarioId, cenarioId),
          antes === undefined ? undefined : lt(cenarioLotes.revisao, antes),
        ),
      )
      .orderBy(desc(cenarioLotes.revisao))
      .limit(limite)
  }

  async fotografia(cenarioId: string, revisao: number) {
    const [r] = await this.db
      .select({ revisao: cenarioRevisoes.revisao, documento: cenarioRevisoes.documento })
      .from(cenarioRevisoes)
      .where(and(eq(cenarioRevisoes.cenarioId, cenarioId), lte(cenarioRevisoes.revisao, revisao)))
      .orderBy(desc(cenarioRevisoes.revisao))
      .limit(1)
    return r ?? null
  }

  lotesEntre(cenarioId: string, depois: number, ate: number) {
    return this.db
      .select({ revisao: cenarioLotes.revisao, comandos: cenarioLotes.comandos })
      .from(cenarioLotes)
      .where(
        and(
          eq(cenarioLotes.cenarioId, cenarioId),
          gt(cenarioLotes.revisao, depois),
          lte(cenarioLotes.revisao, ate),
        ),
      )
      .orderBy(asc(cenarioLotes.revisao))
  }

  async operacaoAplicada(cenarioId: string, operacaoId: string): Promise<number | null> {
    const [linha] = await this.db
      .select({ revisao: cenarioLotes.revisao })
      .from(cenarioLotes)
      .where(and(eq(cenarioLotes.cenarioId, cenarioId), eq(cenarioLotes.operacaoId, operacaoId)))
      .limit(1)
    return linha?.revisao ?? null
  }

  async gravarLote(
    dados: Parameters<CenariosRepository['gravarLote']>[0],
    agora: Date,
  ): Promise<LoteGravado | null> {
    const [dono] = await this.db
      .select({ espacoId: cenarioMundos.espacoId })
      .from(cenarioCenarios)
      .innerJoin(cenarioMundos, eq(cenarioMundos.id, cenarioCenarios.mundoId))
      .where(eq(cenarioCenarios.id, dados.cenarioId))
      .limit(1)
    if (!dono) return null
    return this.comTrava(dono.espacoId, (tx) =>
      this.gravarLoteSobTrava(tx, dono.espacoId, dados, agora),
    )
  }

  /** Mesma gravação sob a trava já tomada por uma publicação de conjunto. */
  private async gravarLoteSobTrava(
    tx: Transacao,
    espacoId: string,
    dados: Parameters<CenariosRepository['gravarLote']>[0],
    agora: Date,
  ): Promise<LoteGravado | null> {
    const [repetido] = await tx
      .select({ revisao: cenarioLotes.revisao })
      .from(cenarioLotes)
      .where(
        and(
          eq(cenarioLotes.cenarioId, dados.cenarioId),
          eq(cenarioLotes.operacaoId, dados.operacaoId),
        ),
      )
      .limit(1)
    if (repetido) return { revisao: repetido.revisao, repetido: true }
    const [antes] = await tx
      .select({
        documento: cenarioCenarios.documento,
        revisao: cenarioCenarios.revisao,
        historico: cenarioCenarios.historico,
      })
      .from(cenarioCenarios)
      .where(eq(cenarioCenarios.id, dados.cenarioId))
      .for('update')
    if (!antes || antes.revisao !== dados.revisaoEsperada) return null
    if (
      [...espacosDosComandos(dados.comandos), ...espacosDoDocumento(dados.documento)].some(
        (origem) => origem !== espacoId,
      )
    )
      throw new CenarioInvalidoError(['Não é possível colar objetos de outro espaço'])
    const inversos = inverterLote(antes.documento, dados.documento)
    const historico =
      inversos.length || dados.movimento
        ? avancarHistorico(antes.historico, antes.revisao + 1, dados.movimento)
        : antes.historico
    if (!historico) return null
    // O BFF só pode confirmar peças que este documento passa a referenciar.
    const base = dados.documento.base
    const recursos = dados.recursosConferidos ?? []
    const usados = new Set(base.tipo === 'terreno' ? base.pecas.map((p) => p.digest) : [])
    if (
      recursos.some((r) => !usados.has(r.digest) || r.tipoDoConteudo !== 'application/octet-stream')
    )
      throw new CenarioArquivoAusenteError(recursos.map((r) => r.digest))
    await this.confirmarBlobsCom(tx, espacoId, recursos, agora)
    if (base.tipo === 'terreno' && usados.size) {
      const confirmados = await tx
        .select({ digest: cenarioBlobs.digest, terreno: cenarioBlobs.terreno })
        .from(cenarioBlobs)
        .where(
          and(
            eq(cenarioBlobs.espacoId, espacoId),
            inArray(cenarioBlobs.digest, [...usados]),
            eq(cenarioBlobs.tipo, 'terreno'),
            isNotNull(cenarioBlobs.confirmadoEm),
          ),
        )
      const presentes = new Set(
        confirmados
          .filter((p) => p.terreno?.min === base.min && p.terreno?.max === base.max)
          .map((p) => p.digest),
      )
      const ausentes = [...usados].filter((d) => !presentes.has(d))
      if (ausentes.length) throw new CenarioArquivoAusenteError(ausentes)
    }
    // A biblioteca pode ter sido apagada entre a conferência do serviço e esta trava.
    const conhecidos = new Set(
      arquivosDoDocumento(antes.documento).map((r) => `${r.tipo}:${r.digest}`),
    )
    const referencias = arquivosDoDocumento(dados.documento).filter(
      (r) => r.tipo !== 'terreno' && !conhecidos.has(`${r.tipo}:${r.digest}`),
    )
    const novos = [...new Set(referencias.map((r) => r.digest))]
    if (novos.length) {
      const confirmados = await tx
        .select({ digest: cenarioBlobs.digest, tipo: cenarioBlobs.tipo })
        .from(cenarioBlobs)
        .where(
          and(
            eq(cenarioBlobs.espacoId, espacoId),
            inArray(cenarioBlobs.digest, novos),
            isNotNull(cenarioBlobs.confirmadoEm),
            inArray(cenarioBlobs.tipo, ['modelo', 'textura']),
          ),
        )
      const presentes = new Set(confirmados.map((b) => `${b.tipo}:${b.digest}`))
      const ausentes = [
        ...new Set(
          referencias.filter((r) => !presentes.has(`${r.tipo}:${r.digest}`)).map((r) => r.digest),
        ),
      ]
      if (ausentes.length) throw new CenarioArquivoAusenteError(ausentes)
    }
    // Adota a cabeça anterior de projetos existentes; não presume um começo vazio.
    const [fotografia] = await tx
      .select({ revisao: cenarioRevisoes.revisao })
      .from(cenarioRevisoes)
      .where(eq(cenarioRevisoes.cenarioId, dados.cenarioId))
      .limit(1)
    if (!fotografia)
      await tx.insert(cenarioRevisoes).values({
        cenarioId: dados.cenarioId,
        revisao: antes.revisao,
        documento: antes.documento,
        createdAt: agora,
      })
    // Troca só se a revisão guardada ainda é a que quem editava conhecia.
    const [linha] = await tx
      .update(cenarioCenarios)
      .set({
        documento: dados.documento,
        nome: dados.documento.nome,
        revisao: dados.revisaoEsperada + 1,
        historico,
        updatedAt: agora,
      })
      .where(
        and(
          eq(cenarioCenarios.id, dados.cenarioId),
          eq(cenarioCenarios.revisao, dados.revisaoEsperada),
        ),
      )
      .returning({ revisao: cenarioCenarios.revisao, mundoId: cenarioCenarios.mundoId })
    if (!linha) return null
    await this.catalogoConjuntos.atualizarUsos(tx, dados.cenarioId, dados.documento, espacoId)
    await tx.insert(cenarioLotes).values({
      cenarioId: dados.cenarioId,
      revisao: linha.revisao,
      operacaoId: dados.operacaoId,
      comandos: dados.comandos,
      inversos,
      autorId: dados.autorId,
      createdAt: agora,
    })
    if (linha.revisao % 50 === 0)
      await tx
        .insert(cenarioRevisoes)
        .values({
          cenarioId: dados.cenarioId,
          revisao: linha.revisao,
          documento: dados.documento,
          createdAt: agora,
        })
        .onConflictDoNothing()
    await tx
      .update(cenarioMundos)
      .set({ updatedAt: agora })
      .where(eq(cenarioMundos.id, linha.mundoId))
    return { revisao: linha.revisao, repetido: false }
  }

  async definirCapa(cenarioId: string, digest: string, agora: Date): Promise<boolean> {
    const mudados = await this.db
      .update(cenarioCenarios)
      .set({ capa: digest, updatedAt: agora })
      .where(eq(cenarioCenarios.id, cenarioId))
      .returning({ id: cenarioCenarios.id })
    return mudados.length > 0
  }

  async apagarCenario(id: string): Promise<string[]> {
    const cenario = await this.cenario(id)
    const mundo = cenario && (await this.mundo(cenario.mundoId))
    if (!mundo) return []
    return this.comTrava(mundo.espacoId, async (tx) => {
      const candidatos = await this.arquivosDosCenarios(tx, [id])
      await tx.delete(cenarioCenarios).where(eq(cenarioCenarios.id, id))
      return this.soltarOrfaos(tx, mundo.espacoId, candidatos)
    })
  }
}
