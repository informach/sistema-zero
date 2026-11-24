import { canonicalJson } from '@sistemazero/core/creations'
import { digestDoDocumentoDeCenario } from '@sistemazero/molda-cenarios-core/compilar'
import type { PerfilDePublicacao } from '@sistemazero/molda-cenarios-core/publicacao'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { TIPO_DO_CONTEUDO, tiposDeBlobCompativeis } from '../../../domain/cenarios/cenarios'
import {
  CenarioArquivoAusenteError,
  CenarioDesatualizadoError,
  CenarioInvalidoError,
  CenarioNaoEncontradoError,
} from '../../../domain/cenarios/cenarios.errors'
import {
  type NovaPublicacaoDeCenario,
  type PublicacaoDeCenario,
  PublicacaoDeCenarioConflitanteError,
  type PublicacaoGravada,
  PublicacaoSemArquivosError,
  type VersaoDeCenarioPublicada,
  type VoltaDePublicacaoDeCenario,
} from '../../../domain/cenarios/publicacoes'
import type { CenariosPublicacoesRepository } from '../../../domain/ports/cenarios-publicacoes-repository.port'
import {
  type ExecutorDeCenarios,
  type TransacaoDeCenarios,
  travarEspacoDeCenarios,
} from './cenarios-transacao'
import type { Database } from './db'
import {
  cenarioBibliotecas,
  cenarioBlobs,
  cenarioBlobsSaindo,
  cenarioCenarios,
  cenarioEspacos,
  cenarioMundos,
  cenarioPerfisPublicados,
  cenarioPublicacaoArquivos,
  cenarioPublicacoes,
} from './schema'

const publicacao = (linha: typeof cenarioPublicacoes.$inferSelect): PublicacaoDeCenario => ({
  id: linha.id,
  espacoId: linha.espacoId,
  perfil: { tipo: linha.perfil, ilha: linha.ilha },
  versao: linha.versao,
  fonte: { cenario: linha.fonteCenarioId, revisao: linha.fonteRevisao, digest: linha.fonteDigest },
  manifesto: { digest: linha.manifestoDigest, bytes: linha.manifestoBytes },
  autorId: linha.autorId,
  criadoEm: linha.createdAt,
})

/** A troca do apontador de uma ilha: publicar e voltar uma versão passam pela mesma fila. */
async function travarPerfil(tx: TransacaoDeCenarios, perfil: PerfilDePublicacao) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`cenarios-perfil:${perfil.tipo}:${perfil.ilha}`}, 0))`,
  )
}

export class DrizzlePublicacoesDeCenariosRepository implements CenariosPublicacoesRepository {
  constructor(private readonly db: Database) {}
  private async operacaoCom(executor: ExecutorDeCenarios, operacaoId: string) {
    const [linha] = await executor
      .select()
      .from(cenarioPublicacoes)
      .where(eq(cenarioPublicacoes.operacaoId, operacaoId))
      .limit(1)
    return linha
      ? { digestDaOperacao: linha.digestDaOperacao, publicacao: publicacao(linha) }
      : null
  }
  operacao(operacaoId: string) {
    return this.operacaoCom(this.db, operacaoId)
  }
  async porId(id: string) {
    const [linha] = await this.db
      .select()
      .from(cenarioPublicacoes)
      .where(eq(cenarioPublicacoes.id, id))
      .limit(1)
    return linha ? publicacao(linha) : null
  }
  private async atualCom(executor: ExecutorDeCenarios, perfil: PerfilDePublicacao) {
    const [linha] = await executor
      .select({ versao: cenarioPublicacoes })
      .from(cenarioPerfisPublicados)
      .innerJoin(
        cenarioPublicacoes,
        eq(cenarioPublicacoes.id, cenarioPerfisPublicados.publicacaoId),
      )
      .where(
        and(
          eq(cenarioPerfisPublicados.perfil, perfil.tipo),
          eq(cenarioPerfisPublicados.ilha, perfil.ilha),
        ),
      )
      .limit(1)
    return linha ? publicacao(linha.versao) : null
  }
  atual(perfil: PerfilDePublicacao) {
    return this.atualCom(this.db, perfil)
  }
  async listarVersoes(
    perfil: PerfilDePublicacao,
    limite: number,
  ): Promise<VersaoDeCenarioPublicada[]> {
    // Uma consulta só: a marca de "no ar" e a lista vêm do mesmo instante do banco.
    const linhas = await this.db
      .select({ versao: cenarioPublicacoes, apontada: cenarioPerfisPublicados.publicacaoId })
      .from(cenarioPublicacoes)
      .leftJoin(
        cenarioPerfisPublicados,
        and(
          eq(cenarioPerfisPublicados.perfil, cenarioPublicacoes.perfil),
          eq(cenarioPerfisPublicados.ilha, cenarioPublicacoes.ilha),
          eq(cenarioPerfisPublicados.publicacaoId, cenarioPublicacoes.id),
        ),
      )
      .where(
        and(eq(cenarioPublicacoes.perfil, perfil.tipo), eq(cenarioPublicacoes.ilha, perfil.ilha)),
      )
      .orderBy(desc(cenarioPublicacoes.versao))
      .limit(limite)
    return linhas.map((l) => ({ ...publicacao(l.versao), atual: l.apontada !== null }))
  }
  async recursos(publicacaoId: string) {
    return this.db
      .select({
        digest: cenarioPublicacaoArquivos.digest,
        bytes: cenarioPublicacaoArquivos.bytes,
        mime: cenarioPublicacaoArquivos.mime,
        papel: cenarioPublicacaoArquivos.papel,
      })
      .from(cenarioPublicacaoArquivos)
      .where(eq(cenarioPublicacaoArquivos.publicacaoId, publicacaoId))
  }
  async recurso(publicacaoId: string, digest: string) {
    const [linha] = await this.db
      .select({
        digest: cenarioPublicacaoArquivos.digest,
        bytes: cenarioPublicacaoArquivos.bytes,
        mime: cenarioPublicacaoArquivos.mime,
        papel: cenarioPublicacaoArquivos.papel,
      })
      .from(cenarioPublicacaoArquivos)
      .where(
        and(
          eq(cenarioPublicacaoArquivos.publicacaoId, publicacaoId),
          eq(cenarioPublicacaoArquivos.digest, digest),
        ),
      )
      .limit(1)
    return linha ?? null
  }

  gravar(entrada: NovaPublicacaoDeCenario, data: Date): Promise<PublicacaoGravada> {
    const dados = structuredClone(entrada),
      agora = new Date(data)
    return this.db.transaction(async (tx) => {
      await travarEspacoDeCenarios(tx, dados.espacoId)
      await travarPerfil(tx, dados.pedido.perfil)
      const repetida = await this.operacaoCom(tx, dados.pedido.operacaoId)
      if (repetida) {
        if (
          repetida.digestDaOperacao !== dados.digestDaOperacao ||
          repetida.publicacao.autorId !== dados.autorId
        )
          throw new PublicacaoDeCenarioConflitanteError('Esta operação já publicou outro conteúdo')
        return { publicacao: repetida.publicacao, repetido: true }
      }
      const [fonte] = await tx
        .select({ documento: cenarioCenarios.documento, revisao: cenarioCenarios.revisao })
        .from(cenarioCenarios)
        .innerJoin(cenarioMundos, eq(cenarioMundos.id, cenarioCenarios.mundoId))
        .innerJoin(cenarioEspacos, eq(cenarioEspacos.id, cenarioMundos.espacoId))
        .where(
          and(
            eq(cenarioCenarios.id, dados.pedido.fonte.cenario),
            eq(cenarioEspacos.id, dados.espacoId),
            eq(cenarioEspacos.tipo, 'equipe'),
          ),
        )
        .limit(1)
      if (!fonte) throw new CenarioNaoEncontradoError('O cenário')
      if (fonte.revisao !== dados.pedido.fonte.revisao)
        throw new CenarioDesatualizadoError(fonte.revisao)
      if ((await digestDoDocumentoDeCenario(fonte.documento)) !== dados.pedido.fonte.digest)
        throw new PublicacaoDeCenarioConflitanteError('A fonte da publicação mudou')
      const licencas = dados.licencas.length
        ? await tx
            .select({
              id: cenarioBibliotecas.id,
              nome: cenarioBibliotecas.nome,
              licenca: cenarioBibliotecas.licenca,
            })
            .from(cenarioBibliotecas)
            .where(
              and(
                eq(cenarioBibliotecas.espacoId, dados.espacoId),
                inArray(
                  cenarioBibliotecas.id,
                  dados.licencas.map((l) => l.id),
                ),
              ),
            )
        : []
      const ordenar = (valores: readonly unknown[]) => valores.map((v) => canonicalJson(v)).sort()
      if (canonicalJson(ordenar(licencas)) !== canonicalJson(ordenar(dados.licencas)))
        throw new CenarioInvalidoError([
          'As licenças da publicação mudaram; confira a fonte novamente',
        ])
      const atual = await this.atualCom(tx, dados.pedido.perfil)
      if ((atual?.versao ?? 0) !== dados.pedido.versaoEsperada)
        throw new PublicacaoDeCenarioConflitanteError()

      const blobs = await tx
        .select()
        .from(cenarioBlobs)
        .where(
          and(
            eq(cenarioBlobs.espacoId, dados.espacoId),
            inArray(
              cenarioBlobs.digest,
              dados.recursos.map((r) => r.digest),
            ),
          ),
        )
      const porDigest = new Map(blobs.map((b) => [b.digest, b])),
        provas = new Map(dados.conferidos.map((c) => [c.digest, c]))
      const ausentes = dados.recursos.filter((r) => {
        const b = porDigest.get(r.digest),
          prova = provas.get(r.digest)
        return (
          !b ||
          !prova ||
          b.bytes !== r.bytes ||
          prova.bytes !== r.bytes ||
          prova.tipoDoConteudo !== r.mime ||
          (b.tipoDoConteudo ?? TIPO_DO_CONTEUDO[b.tipo]) !== r.mime ||
          !tiposDeBlobCompativeis(
            b.tipo,
            r.papel === 'manifesto' ? 'manifesto-compilado' : 'recurso-compilado',
          ) ||
          (!b.confirmadoEm && b.venceEm <= agora)
        )
      })
      if (ausentes.length) throw new CenarioArquivoAusenteError(ausentes.map((r) => r.digest))
      await tx
        .update(cenarioBlobs)
        .set({ confirmadoEm: agora })
        .where(
          and(
            eq(cenarioBlobs.espacoId, dados.espacoId),
            isNull(cenarioBlobs.confirmadoEm),
            inArray(
              cenarioBlobs.digest,
              dados.recursos.map((r) => r.digest),
            ),
          ),
        )
      const [linha] = await tx
        .insert(cenarioPublicacoes)
        .values({
          id: dados.id,
          espacoId: dados.espacoId,
          perfil: dados.pedido.perfil.tipo,
          ilha: dados.pedido.perfil.ilha,
          versao: dados.pedido.versaoEsperada + 1,
          fonteCenarioId: dados.pedido.fonte.cenario,
          fonteRevisao: dados.pedido.fonte.revisao,
          fonteDigest: dados.pedido.fonte.digest,
          manifestoDigest: dados.pedido.manifesto.digest,
          manifestoBytes: dados.pedido.manifesto.bytes,
          operacaoId: dados.pedido.operacaoId,
          digestDaOperacao: dados.digestDaOperacao,
          autorId: dados.autorId,
          createdAt: agora,
        })
        .returning()
      await tx.insert(cenarioPublicacaoArquivos).values(
        dados.recursos.map((r) => ({
          ...r,
          publicacaoId: dados.id,
          espacoId: dados.espacoId,
        })),
      )
      await tx
        .insert(cenarioPerfisPublicados)
        .values({
          perfil: dados.pedido.perfil.tipo,
          ilha: dados.pedido.perfil.ilha,
          publicacaoId: dados.id,
        })
        .onConflictDoUpdate({
          target: [cenarioPerfisPublicados.perfil, cenarioPerfisPublicados.ilha],
          set: { publicacaoId: dados.id },
        })
      return { publicacao: publicacao(linha!), repetido: false }
    })
  }
  voltar(entrada: VoltaDePublicacaoDeCenario, data: Date): Promise<PublicacaoGravada> {
    const dados = structuredClone(entrada),
      agora = new Date(data),
      perfil = dados.pedido.perfil
    return this.db.transaction(async (tx) => {
      // As mesmas travas, na mesma ordem, de uma publicação: as duas nunca se intercalam.
      await travarEspacoDeCenarios(tx, dados.espacoId)
      await travarPerfil(tx, perfil)
      const repetida = await this.operacaoCom(tx, dados.pedido.operacaoId)
      if (repetida) {
        if (
          repetida.digestDaOperacao !== dados.digestDaOperacao ||
          repetida.publicacao.autorId !== dados.autorId
        )
          throw new PublicacaoDeCenarioConflitanteError('Esta operação já publicou outro conteúdo')
        return { publicacao: repetida.publicacao, repetido: true }
      }
      const [escolhida] = await tx
        .select({ versao: cenarioPublicacoes, tipo: cenarioEspacos.tipo })
        .from(cenarioPublicacoes)
        .innerJoin(cenarioEspacos, eq(cenarioEspacos.id, cenarioPublicacoes.espacoId))
        .where(
          and(
            eq(cenarioPublicacoes.id, dados.pedido.publicacaoId),
            eq(cenarioPublicacoes.espacoId, dados.espacoId),
            eq(cenarioPublicacoes.perfil, perfil.tipo),
            eq(cenarioPublicacoes.ilha, perfil.ilha),
          ),
        )
        .limit(1)
      if (!escolhida) throw new CenarioNaoEncontradoError('A versão')
      if (escolhida.tipo !== 'equipe')
        throw new CenarioInvalidoError([
          'O mundo compartilhado deve ser publicado a partir do espaço da equipe',
        ])
      const alvo = publicacao(escolhida.versao)
      const atual = await this.atualCom(tx, perfil)
      if ((atual?.versao ?? 0) !== dados.pedido.versaoEsperada)
        throw new PublicacaoDeCenarioConflitanteError()
      if (atual?.id === alvo.id) throw new CenarioInvalidoError(['Esta versão já está no ar'])

      const recursos = await tx
        .select({
          digest: cenarioPublicacaoArquivos.digest,
          bytes: cenarioPublicacaoArquivos.bytes,
          mime: cenarioPublicacaoArquivos.mime,
          papel: cenarioPublicacaoArquivos.papel,
        })
        .from(cenarioPublicacaoArquivos)
        .where(eq(cenarioPublicacaoArquivos.publicacaoId, alvo.id))
      const digests = recursos.map((r) => r.digest)
      const blobs = digests.length
        ? await tx
            .select()
            .from(cenarioBlobs)
            .where(
              and(eq(cenarioBlobs.espacoId, dados.espacoId), inArray(cenarioBlobs.digest, digests)),
            )
        : []
      const saindo = digests.length
        ? await tx
            .select({ digest: cenarioBlobsSaindo.digest })
            .from(cenarioBlobsSaindo)
            .where(
              and(
                eq(cenarioBlobsSaindo.espacoId, dados.espacoId),
                inArray(cenarioBlobsSaindo.digest, digests),
              ),
            )
        : []
      const porDigest = new Map(blobs.map((b) => [b.digest, b])),
        saindoAgora = new Set(saindo.map((s) => s.digest))
      // Os arquivos já estão no espaço: só confere que continuam confirmados e que nenhum saiu.
      const ausentes = recursos.filter((r) => {
        const b = porDigest.get(r.digest)
        return (
          !b?.confirmadoEm ||
          saindoAgora.has(r.digest) ||
          b.bytes !== r.bytes ||
          (b.tipoDoConteudo ?? TIPO_DO_CONTEUDO[b.tipo]) !== r.mime
        )
      })
      if (
        ausentes.length ||
        !recursos.some((r) => r.papel === 'manifesto' && r.digest === alvo.manifesto.digest)
      )
        throw new PublicacaoSemArquivosError(ausentes.map((r) => r.digest))

      const [linha] = await tx
        .insert(cenarioPublicacoes)
        .values({
          id: dados.id,
          espacoId: dados.espacoId,
          perfil: perfil.tipo,
          ilha: perfil.ilha,
          versao: dados.pedido.versaoEsperada + 1,
          fonteCenarioId: alvo.fonte.cenario,
          fonteRevisao: alvo.fonte.revisao,
          fonteDigest: alvo.fonte.digest,
          manifestoDigest: alvo.manifesto.digest,
          manifestoBytes: alvo.manifesto.bytes,
          operacaoId: dados.pedido.operacaoId,
          digestDaOperacao: dados.digestDaOperacao,
          autorId: dados.autorId,
          createdAt: agora,
        })
        .returning()
      await tx
        .insert(cenarioPublicacaoArquivos)
        .values(recursos.map((r) => ({ ...r, publicacaoId: dados.id, espacoId: dados.espacoId })))
      await tx
        .insert(cenarioPerfisPublicados)
        .values({ perfil: perfil.tipo, ilha: perfil.ilha, publicacaoId: dados.id })
        .onConflictDoUpdate({
          target: [cenarioPerfisPublicados.perfil, cenarioPerfisPublicados.ilha],
          set: { publicacaoId: dados.id },
        })
      return { publicacao: publicacao(linha!), repetido: false }
    })
  }
}
