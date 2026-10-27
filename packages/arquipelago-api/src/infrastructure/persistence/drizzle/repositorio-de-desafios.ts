import type { MetadadosDoDesafio, SituacaoDoCadastro } from '@sistemazero/arquipelago-contracts'
import { and, asc, eq, type SQL, sql } from 'drizzle-orm'
import type {
  DesafioNoBanco,
  FiltroDosDesafios,
  RepositorioDeDesafios,
  ResultadoDaEscrita,
} from '../../../domain/desafios.port'
import type { Database } from './db'
import { desafioPublicacoes, desafios } from './schema'

type Linha = typeof desafios.$inferSelect

/** Postgres: violação de unicidade. O nome do índice diz qual regra foi quebrada. */
function conflitoDoCadastro(erro: unknown): 'slug-em-uso' | 'quadro-ocupado' | null {
  const e = erro as {
    code?: string
    constraint_name?: string
    constraint?: string
    cause?: unknown
  }
  const alvo = e?.code === '23505' ? e : (e?.cause as typeof e | undefined)
  if (alvo?.code !== '23505') return null
  const indice = alvo.constraint_name ?? alvo.constraint ?? ''
  if (indice === 'desafios_quadro_unico') return 'quadro-ocupado'
  if (indice === 'desafios_slug_unico') return 'slug-em-uso'
  return null
}

export class DrizzleRepositorioDeDesafios implements RepositorioDeDesafios {
  constructor(private readonly db: Database) {}

  async listar(filtro: FiltroDosDesafios): Promise<DesafioNoBanco[]> {
    const condicoes: SQL[] = []
    if (filtro.publico) condicoes.push(eq(desafios.publico, filtro.publico))
    if (filtro.ilha) condicoes.push(eq(desafios.ilha, filtro.ilha))
    if (filtro.tipo) condicoes.push(eq(desafios.tipo, filtro.tipo))
    if (filtro.situacao) condicoes.push(eq(desafios.situacao, filtro.situacao))
    const linhas = await this.db
      .select()
      .from(desafios)
      .where(condicoes.length > 0 ? and(...condicoes) : undefined)
      .orderBy(asc(desafios.publico), asc(desafios.ilha), asc(desafios.ordem), asc(desafios.slug))
    return this.comPublicados(linhas)
  }

  async ler(id: string): Promise<DesafioNoBanco | null> {
    const [linha] = await this.db.select().from(desafios).where(eq(desafios.id, id))
    if (!linha) return null
    const [comBlocos] = await this.comPublicados([linha])
    return comBlocos ?? null
  }

  async criar(e: Parameters<RepositorioDeDesafios['criar']>[0]): Promise<ResultadoDaEscrita> {
    try {
      const [linha] = await this.db
        .insert(desafios)
        .values({
          id: e.id,
          ...colunasDosMetadados(e.metadados),
          situacao: 'rascunho',
          revisao: 1,
          revisaoPublicada: null,
          conteudo: e.conteudo,
          criadoEm: e.agora,
          atualizadoEm: e.agora,
          atualizadoPor: e.por,
        })
        .returning()
      if (!linha) throw new Error('insert sem retorno')
      return { ok: true, desafio: paraDominio(linha, null) }
    } catch (erro) {
      const motivo = conflitoDoCadastro(erro)
      if (motivo) return { ok: false, motivo }
      throw erro
    }
  }

  async gravar(e: Parameters<RepositorioDeDesafios['gravar']>[0]): Promise<ResultadoDaEscrita> {
    try {
      const [linha] = await this.db
        .update(desafios)
        .set({
          ...colunasDosMetadados(e.metadados),
          conteudo: e.conteudo,
          revisao: sql`${desafios.revisao} + 1`,
          atualizadoEm: e.agora,
          atualizadoPor: e.por,
        })
        .where(and(eq(desafios.id, e.id), eq(desafios.revisao, e.revisaoBase)))
        .returning()
      return linha ? { ok: true, desafio: await this.lerCom(linha) } : this.perdeu(e.id)
    } catch (erro) {
      const motivo = conflitoDoCadastro(erro)
      if (motivo) return { ok: false, motivo }
      throw erro
    }
  }

  async publicar(e: Parameters<RepositorioDeDesafios['publicar']>[0]): Promise<ResultadoDaEscrita> {
    try {
      return await this.db
        .transaction(async (tx) => {
          // A trava: só publica a revisão que a equipe analisou.
          const [linha] = await tx
            .update(desafios)
            .set({
              situacao: 'publicado',
              revisaoPublicada: e.revisaoBase,
              atualizadoEm: e.agora,
              atualizadoPor: e.por,
            })
            .where(and(eq(desafios.id, e.id), eq(desafios.revisao, e.revisaoBase)))
            .returning()
          if (!linha) return { ok: false as const, motivo: 'revisao' as const, atual: null }
          await tx
            .insert(desafioPublicacoes)
            .values({
              desafioId: e.id,
              revisao: e.revisaoBase,
              conteudo: e.publicacao.conteudo,
              blocosDerivados: e.publicacao.blocosDerivados,
              blocosExigidos: e.publicacao.blocosExigidos,
              vista: e.publicacao.vista,
              analise: e.publicacao.analise,
              publicadoEm: e.agora,
              publicadoPor: e.por,
            })
            // Republicar a mesma revisão (ex.: depois de reativar) mantém a primeira cópia.
            .onConflictDoNothing({
              target: [desafioPublicacoes.desafioId, desafioPublicacoes.revisao],
            })
          return { ok: true as const, desafio: paraDominio(linha, e.publicacao.blocosExigidos) }
        })
        .then(async (r) => (r.ok ? r : this.perdeu(e.id)))
    } catch (erro) {
      const motivo = conflitoDoCadastro(erro)
      if (motivo) return { ok: false, motivo }
      throw erro
    }
  }

  async mudarSituacao(
    e: Parameters<RepositorioDeDesafios['mudarSituacao']>[0],
  ): Promise<ResultadoDaEscrita> {
    const nova =
      e.situacao === 'arquivado'
        ? sql`'arquivado'`
        : sql`case when ${desafios.revisaoPublicada} is null then 'rascunho' else 'publicado' end`
    try {
      const [linha] = await this.db
        .update(desafios)
        .set({
          situacao: nova as unknown as SituacaoDoCadastro,
          atualizadoEm: e.agora,
          atualizadoPor: e.por,
        })
        .where(and(eq(desafios.id, e.id), eq(desafios.revisao, e.revisaoBase)))
        .returning()
      return linha ? { ok: true, desafio: await this.lerCom(linha) } : this.perdeu(e.id)
    } catch (erro) {
      // Reativar um quadro que outro desafio passou a ocupar.
      const motivo = conflitoDoCadastro(erro)
      if (motivo) return { ok: false, motivo }
      throw erro
    }
  }

  private async perdeu(id: string): Promise<ResultadoDaEscrita> {
    return { ok: false, motivo: 'revisao', atual: await this.ler(id) }
  }

  private async lerCom(linha: Linha): Promise<DesafioNoBanco> {
    const [d] = await this.comPublicados([linha])
    if (!d) throw new Error('desafio sumiu')
    return d
  }

  /** Junta os blocos congelados da última publicação de cada desafio (uma consulta). */
  private async comPublicados(linhas: Linha[]): Promise<DesafioNoBanco[]> {
    const publicadas = linhas.filter((l) => l.revisaoPublicada !== null)
    const blocos = new Map<string, string[]>()
    if (publicadas.length > 0) {
      const pares = publicadas.map((l) => sql`(${l.id}::uuid, ${l.revisaoPublicada}::int)`)
      const achadas = await this.db
        .select({
          desafioId: desafioPublicacoes.desafioId,
          blocos: desafioPublicacoes.blocosExigidos,
        })
        .from(desafioPublicacoes)
        .where(
          sql`(${desafioPublicacoes.desafioId}, ${desafioPublicacoes.revisao}) in (${sql.join(pares, sql`, `)})`,
        )
      for (const a of achadas) blocos.set(a.desafioId, a.blocos)
    }
    return linhas.map((l) => paraDominio(l, blocos.get(l.id) ?? null))
  }
}

function colunasDosMetadados(m: MetadadosDoDesafio) {
  return {
    slug: m.slug,
    publico: m.publico,
    ilha: m.ilha,
    tipo: m.tipo,
    quadro: m.quadro,
    ordem: m.ordem,
  }
}

function paraDominio(l: Linha, blocosPublicados: string[] | null): DesafioNoBanco {
  return {
    id: l.id,
    metadados: {
      slug: l.slug,
      publico: l.publico as MetadadosDoDesafio['publico'],
      ilha: l.ilha as MetadadosDoDesafio['ilha'],
      tipo: l.tipo as MetadadosDoDesafio['tipo'],
      quadro: l.quadro,
      ordem: l.ordem,
    },
    situacao: l.situacao as SituacaoDoCadastro,
    revisao: l.revisao,
    revisaoPublicada: l.revisaoPublicada,
    conteudo: l.conteudo,
    atualizadoEm: l.atualizadoEm,
    atualizadoPor: l.atualizadoPor,
    blocosPublicados,
  }
}
