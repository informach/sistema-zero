import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray, isNotNull, type SQL, sql } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import {
  type Biblioteca,
  buscaDoModelo,
  type Cenario,
  type Espaco,
  type Modelo,
  type Mundo,
  type ResumoDeCenario,
  type TipoDeBlob,
} from '../../../domain/cenarios/cenarios'
import type {
  BlobReservado,
  CenariosRepository,
  LoteGravado,
} from '../../../domain/ports/cenarios-repository.port'
import type { Database } from './db'
import {
  cenarioBibliotecas,
  cenarioBlobs,
  cenarioCenarios,
  cenarioEspacos,
  cenarioLotes,
  cenarioModelos,
  cenarioMundoBibliotecas,
  cenarioMundos,
} from './schema'

type Transacao = Parameters<Parameters<Database['transaction']>[0]>[0]
type Executor = Database | Transacao

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
  capa: sql<string | null>`coalesce((
    select m.miniatura from ${cenarioModelos} m where m.id = ${deFora(cenarioBibliotecas, 'capa_modelo')}
  ), (
    select m.miniatura from ${cenarioModelos} m
    where m.biblioteca_id = ${deFora(cenarioBibliotecas, 'id')} and m.miniatura is not null
    order by m.busca collate "C", m.id limit 1
  ))`,
}

const colunasDoMundo = {
  id: cenarioMundos.id,
  espacoId: cenarioMundos.espacoId,
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

export class DrizzleCenariosRepository implements CenariosRepository {
  constructor(private readonly db: Database) {}

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
          sql`not exists (
            select 1 from ${cenarioModelos} m
            join ${cenarioBibliotecas} b on b.id = m.biblioteca_id
            where b.espaco_id = ${espacoId}
              and (m.digest = ${cenarioBlobs.digest} or m.miniatura = ${cenarioBlobs.digest})
          )`,
          sql`not exists (
            select 1 from ${cenarioCenarios} c
            join ${cenarioMundos} w on w.id = c.mundo_id
            where w.espaco_id = ${espacoId}
              and (
                c.capa = ${cenarioBlobs.digest}
                or exists (
                  select 1 from jsonb_array_elements(c.documento -> 'modelos') e
                  where e ->> 'digest' = ${cenarioBlobs.digest}
                )
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
      await tx.delete(cenarioBibliotecas).where(eq(cenarioBibliotecas.id, id))
      return this.soltarOrfaos(
        tx,
        biblioteca.espacoId,
        dela.flatMap((m) => (m.miniatura ? [m.digest, m.miniatura] : [m.digest])),
      )
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
    const linhas = await this.db
      .select({ pasta: cenarioModelos.pasta, etiquetas: cenarioModelos.etiquetas })
      .from(cenarioModelos)
      .where(eq(cenarioModelos.bibliotecaId, bibliotecaId))
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
          .values({ espacoId, ...b, confirmadoEm: null, venceEm, createdAt: agora })
          .onConflictDoUpdate({
            target: [cenarioBlobs.espacoId, cenarioBlobs.digest],
            set: { tipo: b.tipo, bytes: b.bytes, venceEm },
            setWhere: sql`${cenarioBlobs.confirmadoEm} is null`,
          })
      return { faltam: [...faltam] }
    })
  }

  async confirmarBlobs(espacoId: string, digests: readonly string[], agora: Date): Promise<void> {
    if (!digests.length) return
    await this.db
      .update(cenarioBlobs)
      .set({ confirmadoEm: agora })
      .where(
        and(
          eq(cenarioBlobs.espacoId, espacoId),
          inArray(cenarioBlobs.digest, [...digests]),
          sql`${cenarioBlobs.confirmadoEm} is null`,
        ),
      )
  }

  async blobsConfirmados(espacoId: string, digests: readonly string[]) {
    const mapa = new Map<string, { tipo: TipoDeBlob; bytes: number }>()
    if (!digests.length) return mapa
    const linhas = await this.db
      .select({ digest: cenarioBlobs.digest, tipo: cenarioBlobs.tipo, bytes: cenarioBlobs.bytes })
      .from(cenarioBlobs)
      .where(
        and(
          eq(cenarioBlobs.espacoId, espacoId),
          inArray(cenarioBlobs.digest, [...new Set(digests)]),
          isNotNull(cenarioBlobs.confirmadoEm),
        ),
      )
    for (const l of linhas) mapa.set(l.digest, { tipo: l.tipo, bytes: l.bytes })
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

  async mundos(espacoId: string): Promise<Mundo[]> {
    return porNome(
      await this.db
        .select(colunasDoMundo)
        .from(cenarioMundos)
        .where(eq(cenarioMundos.espacoId, espacoId)),
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
        .where(eq(cenarioMundos.espacoId, dados.espacoId))
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

  async apagarMundo(id: string): Promise<boolean> {
    const apagados = await this.db
      .delete(cenarioMundos)
      .where(eq(cenarioMundos.id, id))
      .returning({ id: cenarioMundos.id })
    return apagados.length > 0
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
      await tx
        .update(cenarioMundos)
        .set({ updatedAt: agora })
        .where(eq(cenarioMundos.id, dados.mundoId))
      return linha ?? null
    })
  }

  async operacaoAplicada(cenarioId: string, operacaoId: string): Promise<number | null> {
    const [linha] = await this.db
      .select({ revisao: cenarioLotes.revisao })
      .from(cenarioLotes)
      .where(and(eq(cenarioLotes.cenarioId, cenarioId), eq(cenarioLotes.operacaoId, operacaoId)))
      .limit(1)
    return linha?.revisao ?? null
  }

  gravarLote(
    dados: Parameters<CenariosRepository['gravarLote']>[0],
    agora: Date,
  ): Promise<LoteGravado | null> {
    return this.db.transaction(async (tx) => {
      // Troca só se a revisão guardada ainda é a que quem editava conhecia.
      const [linha] = await tx
        .update(cenarioCenarios)
        .set({
          documento: dados.documento,
          nome: dados.documento.nome,
          revisao: dados.revisaoEsperada + 1,
          updatedAt: agora,
        })
        .where(
          and(
            eq(cenarioCenarios.id, dados.cenarioId),
            eq(cenarioCenarios.revisao, dados.revisaoEsperada),
          ),
        )
        .returning({ revisao: cenarioCenarios.revisao, mundoId: cenarioCenarios.mundoId })
      if (!linha) {
        // Perdeu a vez. Se foi para a MESMA operação (resposta perdida e reenvio), está feito.
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
        return repetido ? { revisao: repetido.revisao, repetido: true } : null
      }
      await tx.insert(cenarioLotes).values({
        cenarioId: dados.cenarioId,
        revisao: linha.revisao,
        operacaoId: dados.operacaoId,
        comandos: dados.comandos,
        autorId: dados.autorId,
        createdAt: agora,
      })
      await tx
        .update(cenarioMundos)
        .set({ updatedAt: agora })
        .where(eq(cenarioMundos.id, linha.mundoId))
      return { revisao: linha.revisao, repetido: false }
    })
  }

  async definirCapa(cenarioId: string, digest: string, agora: Date): Promise<boolean> {
    const mudados = await this.db
      .update(cenarioCenarios)
      .set({ capa: digest, updatedAt: agora })
      .where(eq(cenarioCenarios.id, cenarioId))
      .returning({ id: cenarioCenarios.id })
    return mudados.length > 0
  }

  async apagarCenario(id: string): Promise<boolean> {
    const apagados = await this.db
      .delete(cenarioCenarios)
      .where(eq(cenarioCenarios.id, id))
      .returning({ id: cenarioCenarios.id })
    return apagados.length > 0
  }
}
