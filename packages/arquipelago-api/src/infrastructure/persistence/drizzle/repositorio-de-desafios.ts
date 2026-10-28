import type {
  MetadadosDoDesafio,
  SituacaoDoCadastro,
  VistaDoObjetivo,
} from '@sistemazero/arquipelago-contracts'
import { canonicalJson } from '@sistemazero/core/creations'
import { and, asc, eq, isNull, type SQL, sql } from 'drizzle-orm'
import type {
  ConclusaoGuardada,
  DesafioDoDiaGuardado,
  DesafioNoBanco,
  DesafioPublicado,
  FiltroDosDesafios,
  PublicacaoGuardada,
  RepositorioDeDesafios,
  RepositorioDoJogadorNosDesafios,
  ResultadoDaEscrita,
  SituacaoDasMoedas,
} from '../../../domain/desafios.port'
import type { Database } from './db'
import {
  desafioDoDia,
  desafioProgresso,
  desafioPublicacoes,
  desafios,
  desafiosConcluidos,
} from './schema'

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
              metadadosPublicados: sql`jsonb_build_object('slug', ${desafios.slug}, 'publico', ${desafios.publico}, 'ilha', ${desafios.ilha}, 'tipo', ${desafios.tipo}, 'quadro', ${desafios.quadro}, 'ordem', ${desafios.ordem})`,
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
              metadados: paraDominio(linha, null).metadados,
              conteudo: e.publicacao.conteudo,
              blocosDerivados: e.publicacao.blocosDerivados,
              blocosExigidos: e.publicacao.blocosExigidos,
              vista: e.publicacao.vista,
              analise: e.publicacao.analise,
              publicadoEm: e.agora,
              publicadoPor: e.por,
            })
            // Repetir a publicação da mesma revisão mantém a primeira cópia.
            .onConflictDoNothing({
              target: [desafioPublicacoes.desafioId, desafioPublicacoes.revisao],
            })
          const [publicada] = await tx
            .select({ blocos: desafioPublicacoes.blocosExigidos })
            .from(desafioPublicacoes)
            .where(
              and(
                eq(desafioPublicacoes.desafioId, e.id),
                eq(desafioPublicacoes.revisao, e.revisaoBase),
              ),
            )
          if (!publicada) throw new Error('Publicação não encontrada após gravação')
          return { ok: true as const, desafio: paraDominio(linha, publicada.blocos) }
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
          revisao: sql`${desafios.revisao} + 1`,
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
    const publicados = new Map<
      string,
      { blocos: string[]; conteudo: unknown; metadados: MetadadosDoDesafio }
    >()
    if (publicadas.length > 0) {
      const pares = publicadas.map((l) => sql`(${l.id}::uuid, ${l.revisaoPublicada}::int)`)
      const achadas = await this.db
        .select({
          desafioId: desafioPublicacoes.desafioId,
          blocos: desafioPublicacoes.blocosExigidos,
          conteudo: desafioPublicacoes.conteudo,
          metadados: desafioPublicacoes.metadados,
        })
        .from(desafioPublicacoes)
        .where(
          sql`(${desafioPublicacoes.desafioId}, ${desafioPublicacoes.revisao}) in (${sql.join(pares, sql`, `)})`,
        )
      for (const a of achadas) publicados.set(a.desafioId, a)
    }
    return linhas.map((l) => {
      const publicado = publicados.get(l.id)
      const d = paraDominio(l, publicado?.blocos ?? null)
      d.alteradoDepoisDePublicar =
        !!publicado &&
        (canonicalJson(d.conteudo) !== canonicalJson(publicado.conteudo) ||
          canonicalJson(d.metadados) !== canonicalJson(publicado.metadados))
      return d
    })
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
    metadadosPublicados: l.metadadosPublicados ?? null,
    alteradoDepoisDePublicar: false,
    conteudo: l.conteudo,
    atualizadoEm: l.atualizadoEm,
    atualizadoPor: l.atualizadoPor,
    blocosPublicados,
  }
}

/** O lado de quem joga: publicações, tentativas e conclusões. */
export class DrizzleRepositorioDoJogadorNosDesafios implements RepositorioDoJogadorNosDesafios {
  constructor(private readonly db: Database) {}

  async listarPublicados(publico: MetadadosDoDesafio['publico']): Promise<DesafioPublicado[]> {
    return this.publicados(
      and(
        sql`${desafioPublicacoes.metadados}->>'publico' = ${publico}`,
        eq(desafios.situacao, 'publicado'),
      ),
    )
  }

  async lerPublicado(desafioId: string): Promise<DesafioPublicado | null> {
    const [d] = await this.publicados(
      and(eq(desafios.id, desafioId), eq(desafios.situacao, 'publicado')),
    )
    return d ?? null
  }

  private async publicados(filtro: SQL | undefined): Promise<DesafioPublicado[]> {
    const linhas = await this.db
      .select({ desafio: desafios, publicacao: desafioPublicacoes })
      .from(desafios)
      .innerJoin(
        desafioPublicacoes,
        and(
          eq(desafioPublicacoes.desafioId, desafios.id),
          eq(desafioPublicacoes.revisao, desafios.revisaoPublicada),
        ),
      )
      .where(filtro)
      .orderBy(
        sql`${desafioPublicacoes.metadados}->>'ilha'`,
        sql`(${desafioPublicacoes.metadados}->>'ordem')::int`,
        sql`${desafioPublicacoes.metadados}->>'slug'`,
      )
    return linhas.map((l) => ({
      ...semPublicacao(l.desafio, l.publicacao.metadados),
      publicacao: publicacaoDe(l.publicacao),
    }))
  }

  async lerPublicacao(desafioId: string, revisao: number) {
    const [l] = await this.db
      .select({ desafio: desafios, publicacao: desafioPublicacoes })
      .from(desafioPublicacoes)
      .innerJoin(desafios, eq(desafios.id, desafioPublicacoes.desafioId))
      .where(
        and(eq(desafioPublicacoes.desafioId, desafioId), eq(desafioPublicacoes.revisao, revisao)),
      )
    return l
      ? {
          publicacao: publicacaoDe(l.publicacao),
          desafio: semPublicacao(l.desafio, l.publicacao.metadados),
        }
      : null
  }

  async conclusoes(
    jogadorId: string,
    publico: MetadadosDoDesafio['publico'],
  ): Promise<ConclusaoGuardada[]> {
    const linhas = await this.db
      .select({
        c: desafiosConcluidos,
        metadados: desafioPublicacoes.metadados,
      })
      .from(desafiosConcluidos)
      .innerJoin(
        desafioPublicacoes,
        and(
          eq(desafioPublicacoes.desafioId, desafiosConcluidos.desafioId),
          eq(desafioPublicacoes.revisao, desafiosConcluidos.revisao),
        ),
      )
      .where(
        and(eq(desafiosConcluidos.jogadorId, jogadorId), eq(desafiosConcluidos.publico, publico)),
      )
    return linhas.map(({ c, metadados }) => ({
      desafioId: c.desafioId,
      ilha: metadados.ilha,
      tipo: metadados.tipo,
      quadro: metadados.quadro,
      revisao: c.revisao,
      concluidoEm: c.concluidoEm,
      extraConcluidoEm: c.extraConcluidoEm,
      recompensaVistaEm: c.recompensaVistaEm,
      moedas: c.moedas,
      moedasSituacao: c.moedasSituacao as SituacaoDasMoedas,
      moedasExtra: c.moedasExtra,
      moedasExtraSituacao: c.moedasExtraSituacao as SituacaoDasMoedas,
      moedasTetoSemana: c.moedasTetoSemana,
      moedasExtraTetoSemana: c.moedasExtraTetoSemana,
    }))
  }

  async progresso(jogadorId: string, desafioId: string) {
    const [p] = await this.db
      .select()
      .from(desafioProgresso)
      .where(
        and(eq(desafioProgresso.jogadorId, jogadorId), eq(desafioProgresso.desafioId, desafioId)),
      )
    return p
      ? {
          revisao: p.revisao,
          ultimosResultados: p.ultimosResultados as { id: string; passou: boolean }[],
        }
      : null
  }

  async guardarTentativa(e: Parameters<RepositorioDoJogadorNosDesafios['guardarTentativa']>[0]) {
    await this.db
      .insert(desafioProgresso)
      .values({
        jogadorId: e.jogadorId,
        desafioId: e.desafioId,
        revisao: e.revisao,
        ultimosResultados: e.resultados,
        atualizadoEm: e.agora,
      })
      .onConflictDoUpdate({
        target: [desafioProgresso.jogadorId, desafioProgresso.desafioId],
        set: { revisao: e.revisao, ultimosResultados: e.resultados, atualizadoEm: e.agora },
      })
  }

  async concluir(e: Parameters<RepositorioDoJogadorNosDesafios['concluir']>[0]): Promise<boolean> {
    const gravadas = await this.db
      .insert(desafiosConcluidos)
      .values({
        jogadorId: e.jogadorId,
        desafioId: e.desafioId,
        publico: e.publico,
        revisao: e.revisao,
        concluidoEm: e.agora,
        moedas: e.moedas,
        moedasSituacao: e.moedas > 0 ? 'pendente' : 'nenhuma',
        moedasExtra: e.moedasExtra,
        moedasExtraSituacao: 'nenhuma',
      })
      .onConflictDoNothing({ target: [desafiosConcluidos.jogadorId, desafiosConcluidos.desafioId] })
      .returning({ desafioId: desafiosConcluidos.desafioId })
    return gravadas.length > 0
  }

  async marcarExtra(jogadorId: string, desafioId: string, agora: Date): Promise<boolean> {
    const linhas = await this.db
      .update(desafiosConcluidos)
      .set({
        extraConcluidoEm: agora,
        moedasExtraSituacao: sql`case when ${desafiosConcluidos.moedasExtra} > 0 then 'pendente' else 'nenhuma' end`,
      })
      .where(
        and(
          eq(desafiosConcluidos.jogadorId, jogadorId),
          eq(desafiosConcluidos.desafioId, desafioId),
          isNull(desafiosConcluidos.extraConcluidoEm),
        ),
      )
      .returning({ desafioId: desafiosConcluidos.desafioId })
    return linhas.length > 0
  }

  async marcarMoedas(
    jogadorId: string,
    desafioId: string,
    premio: 'principal' | 'extra',
    situacao: SituacaoDasMoedas,
    semana?: string,
  ) {
    const tetoSemana = situacao === 'teto' ? (semana ?? null) : null
    await this.db
      .update(desafiosConcluidos)
      .set(
        premio === 'principal'
          ? { moedasSituacao: situacao, moedasTetoSemana: tetoSemana }
          : { moedasExtraSituacao: situacao, moedasExtraTetoSemana: tetoSemana },
      )
      .where(
        and(
          eq(desafiosConcluidos.jogadorId, jogadorId),
          eq(desafiosConcluidos.desafioId, desafioId),
        ),
      )
  }

  async marcarRecompensaVista(jogadorId: string, desafioId: string, agora: Date) {
    await this.db
      .update(desafiosConcluidos)
      .set({ recompensaVistaEm: agora })
      .where(
        and(
          eq(desafiosConcluidos.jogadorId, jogadorId),
          eq(desafiosConcluidos.desafioId, desafioId),
          isNull(desafiosConcluidos.recompensaVistaEm),
        ),
      )
  }

  async desafioDoDia(jogadorId: string, dia: string): Promise<DesafioDoDiaGuardado | null> {
    const [linha] = await this.db
      .select({ desafioId: desafioDoDia.desafioId, feitoEm: desafioDoDia.feitoEm })
      .from(desafioDoDia)
      .where(and(eq(desafioDoDia.jogadorId, jogadorId), eq(desafioDoDia.dia, dia)))
    return linha ?? null
  }

  async guardarDesafioDoDia(e: {
    jogadorId: string
    dia: string
    desafioId: string
    agora: Date
  }): Promise<DesafioDoDiaGuardado> {
    await this.db
      .insert(desafioDoDia)
      .values({ jogadorId: e.jogadorId, dia: e.dia, desafioId: e.desafioId, escolhidoEm: e.agora })
      .onConflictDoNothing()
    const guardado = await this.desafioDoDia(e.jogadorId, e.dia)
    if (!guardado) throw new Error('desafio do dia sumiu depois de gravar')
    return guardado
  }

  async marcarDesafioDoDiaFeito(jogadorId: string, dia: string, desafioId: string, agora: Date) {
    await this.db
      .update(desafioDoDia)
      .set({ feitoEm: agora })
      .where(
        and(
          eq(desafioDoDia.jogadorId, jogadorId),
          eq(desafioDoDia.dia, dia),
          eq(desafioDoDia.desafioId, desafioId),
          isNull(desafioDoDia.feitoEm),
        ),
      )
  }
}

function semPublicacao(
  l: Linha,
  metadados: MetadadosDoDesafio,
): Omit<DesafioPublicado, 'publicacao'> {
  return { id: l.id, metadados, situacao: l.situacao as SituacaoDoCadastro }
}

function publicacaoDe(p: typeof desafioPublicacoes.$inferSelect): PublicacaoGuardada {
  return {
    desafioId: p.desafioId,
    revisao: p.revisao,
    conteudo: p.conteudo,
    blocosExigidos: p.blocosExigidos,
    vista: p.vista as VistaDoObjetivo[],
  }
}
