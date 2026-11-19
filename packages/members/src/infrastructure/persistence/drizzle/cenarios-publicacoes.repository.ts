import { canonicalJson } from '@sistemazero/core/creations'
import { digestDoDocumentoDeCenario } from '@sistemazero/molda-cenarios-core/compilar'
import type { PerfilDePublicacao } from '@sistemazero/molda-cenarios-core/publicacao'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
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
} from '../../../domain/cenarios/publicacoes'
import type { CenariosPublicacoesRepository } from '../../../domain/ports/cenarios-publicacoes-repository.port'
import { type ExecutorDeCenarios, travarEspacoDeCenarios } from './cenarios-transacao'
import type { Database } from './db'
import {
  cenarioBibliotecas,
  cenarioBlobs,
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
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`cenarios-perfil:${dados.pedido.perfil.tipo}:${dados.pedido.perfil.ilha}`}, 0))`,
      )
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
}
