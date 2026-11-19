import { randomUUID } from 'node:crypto'
import {
  criarSnapshotDePublicacao,
  digestDoPedidoDePublicacao,
  MIME_DO_MANIFESTO,
  type PedidoDePublicacao,
  PedidoDePublicacaoSchema,
  PerfilDePublicacaoSchema,
  PublicacaoParaOJogoSchema,
  type RecursoDaPublicacao,
  ReferenciaDeArquivoPublicadoSchema,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { z } from 'zod'
import { type Ator, chaveDoBlob, LIMITES_DOS_CENARIOS } from '../../domain/cenarios/cenarios'
import {
  CenarioInvalidoError,
  CenarioNaoEncontradoError,
  CenariosFechadosError,
  CenariosSemEspacoError,
} from '../../domain/cenarios/cenarios.errors'
import {
  type ArquivoPublicadoConferido,
  type PublicacaoDeCenario,
  PublicacaoDeCenarioConflitanteError,
  type PublicacaoGravada,
} from '../../domain/cenarios/publicacoes'
import type { CenariosPublicacoesRepository } from '../../domain/ports/cenarios-publicacoes-repository.port'
import type { CenariosRepository } from '../../domain/ports/cenarios-repository.port'
import type { ArquivoAEnviar, CenariosService } from './cenarios.service'
import { conferirProcedenciaPublicada } from './publicacoes-procedencia'

const PedidoPersistidoSchema = PedidoDePublicacaoSchema.extend({
  fonte: PedidoDePublicacaoSchema.shape.fonte.extend({ cenario: z.uuid() }),
})
function lerPedido(entrada: unknown) {
  const r = PedidoPersistidoSchema.safeParse(entrada)
  if (!r.success) throw new CenarioInvalidoError(['O pedido de publicação é inválido'])
  return r.data
}
async function snapshotDe(entrada: unknown, manifesto: Uint8Array) {
  try {
    return await criarSnapshotDePublicacao(lerPedido(entrada), manifesto)
  } catch (erro) {
    throw new CenarioInvalidoError([
      (erro instanceof Error ? erro.message : 'O pacote publicado é inválido').slice(0, 600),
    ])
  }
}
export function publicacaoParaOJogo(p: PublicacaoDeCenario) {
  return PublicacaoParaOJogoSchema.parse({
    id: p.id,
    perfil: p.perfil,
    versao: p.versao,
    fonte: p.fonte,
    manifesto: p.manifesto,
  })
}

/** Publica somente conteúdo verificado pelo consumidor interno, nunca por uma afirmação do navegador. */
export class PublicacoesDeCenariosService {
  constructor(
    private readonly repo: CenariosPublicacoesRepository,
    private readonly autoria: Pick<CenariosRepository, 'espaco' | 'reservarBlobs'>,
    private readonly cenarios: Pick<CenariosService, 'aberto' | 'exportacao'>,
    private readonly clock: () => Date,
    private readonly novoId: () => string = randomUUID,
  ) {}

  private exigirEquipe(identidade: Ator): Ator {
    const ator = { ...identidade }
    if (!ator.equipe || ator.suporte || !this.cenarios.aberto(ator))
      throw new CenariosFechadosError(
        'Somente a equipe, fora de uma sessão de suporte, pode publicar no Arquipélago',
      )
    return ator
  }

  private async autorizar(ator: Ator, pedido: PedidoDePublicacao) {
    const preparo = await this.cenarios.exportacao.preparar(
      ator,
      pedido.fonte.cenario,
      pedido.fonte.revisao,
    )
    const espaco = await this.autoria.espaco(preparo.espacoId)
    if (espaco?.tipo !== 'equipe')
      throw new CenarioInvalidoError([
        'O mundo compartilhado deve ser publicado a partir do espaço da equipe',
      ])
    if (preparo.digest !== pedido.fonte.digest)
      throw new CenarioInvalidoError(['A fonte publicada não corresponde ao documento salvo'])
    return { preparo, espaco }
  }

  async preparar(identidade: Ator, entrada: unknown) {
    const ator = this.exigirEquipe(identidade),
      pedido = lerPedido(entrada)
    const digest = await digestDoPedidoDePublicacao(pedido),
      repetida = await this.repo.operacao(pedido.operacaoId)
    if (repetida) {
      if (repetida.digestDaOperacao !== digest || repetida.publicacao.autorId !== ator.usuarioId)
        throw new PublicacaoDeCenarioConflitanteError('Esta operação já publicou outro conteúdo')
      return {
        espacoId: repetida.publicacao.espacoId,
        pedido,
        publicacao: publicacaoParaOJogo(repetida.publicacao),
      }
    }
    const { espaco } = await this.autorizar(ator, pedido),
      atual = await this.repo.atual(pedido.perfil)
    if ((atual?.versao ?? 0) !== pedido.versaoEsperada)
      throw new PublicacaoDeCenarioConflitanteError()
    return { espacoId: espaco.id, pedido, publicacao: null }
  }

  async lerPerfilDaOficina(ator: Ator, entrada: unknown) {
    this.exigirEquipe(ator)
    return this.perfilDoJogo(entrada)
  }

  /** Somente pelas rotas HMAC de leitura: o BFF exige antes o acesso existente ao jogo. */
  async perfilDoJogo(entrada: unknown) {
    const perfil = PerfilDePublicacaoSchema.safeParse(entrada)
    if (!perfil.success) throw new CenarioInvalidoError(['O destino da publicação é inválido'])
    const atual = await this.repo.atual(perfil.data)
    return atual ? publicacaoParaOJogo(atual) : null
  }

  async arquivoDoJogo(publicacaoId: string, digest: string) {
    const referencia = ReferenciaDeArquivoPublicadoSchema.safeParse({ publicacaoId, digest })
    if (!referencia.success) throw new CenarioNaoEncontradoError('O arquivo')
    const versao = await this.repo.porId(publicacaoId)
    const arquivo = versao && (await this.repo.recurso(publicacaoId, digest))
    if (!versao || !arquivo) throw new CenarioNaoEncontradoError('O arquivo')
    return {
      digest: arquivo.digest,
      chave: chaveDoBlob(versao.espacoId, arquivo.digest),
      bytes: arquivo.bytes,
      tipoDoConteudo: arquivo.mime,
    }
  }

  private async reservar(
    espacoId: string,
    recursos: readonly RecursoDaPublicacao[],
  ): Promise<ArquivoAEnviar[]> {
    const agora = this.clock()
    const reserva = await this.autoria.reservarBlobs(
      espacoId,
      recursos.map((r) => ({
        digest: r.digest,
        bytes: r.bytes,
        tipoDoConteudo: r.mime,
        tipo: r.papel === 'manifesto' ? 'manifesto-compilado' : 'recurso-compilado',
      })),
      agora,
      new Date(agora.getTime() + LIMITES_DOS_CENARIOS.reservaVenceMs),
    )
    if (!reserva) throw new CenariosSemEspacoError()
    return reserva.faltam.map((r) => ({
      ...r,
      tipoDoConteudo: r.tipoDoConteudo!,
      chave: chaveDoBlob(espacoId, r.digest),
    }))
  }

  async reservarManifesto(identidade: Ator, entrada: unknown) {
    const ator = this.exigirEquipe(identidade),
      pedido = lerPedido(entrada)
    const { espaco } = await this.autorizar(ator, pedido)
    const atual = await this.repo.atual(pedido.perfil)
    if ((atual?.versao ?? 0) !== pedido.versaoEsperada)
      throw new PublicacaoDeCenarioConflitanteError()
    const arquivos = await this.reservar(espaco.id, [
      { ...pedido.manifesto, mime: MIME_DO_MANIFESTO, papel: 'manifesto' },
    ])
    return { espacoId: espaco.id, arquivos }
  }

  /** Chamada interna: o BFF leu o manifesto no bucket; ainda não confirma os recursos. */
  async reservarRecursosDoManifesto(
    identidade: Ator,
    entrada: unknown,
    manifesto: Uint8Array,
    digests: readonly string[],
  ) {
    const ator = this.exigirEquipe(identidade),
      desejados = new Set(digests)
    if (
      !digests.length ||
      digests.length > LIMITES_DOS_CENARIOS.reservaPorChamada ||
      desejados.size !== digests.length
    )
      throw new CenarioInvalidoError([
        'Escolha até 50 recursos diferentes do inventário por reserva',
      ])
    const snapshot = await snapshotDe(entrada, manifesto)
    const recursos = snapshot.recursos.filter(
      (r) => r.papel === 'recurso' && desejados.has(r.digest),
    )
    if (recursos.length !== desejados.size)
      throw new CenarioInvalidoError(['O recurso não pertence ao inventário da publicação'])
    const { preparo, espaco } = await this.autorizar(ator, snapshot.pedido)
    conferirProcedenciaPublicada(snapshot.cena, preparo)
    const atual = await this.repo.atual(snapshot.pedido.perfil)
    if ((atual?.versao ?? 0) !== snapshot.pedido.versaoEsperada)
      throw new PublicacaoDeCenarioConflitanteError()
    return { espacoId: espaco.id, arquivos: await this.reservar(espaco.id, recursos) }
  }

  async publicarConferido(
    identidade: Ator,
    entrada: unknown,
    manifesto: Uint8Array,
    arquivos: readonly ArquivoPublicadoConferido[],
  ): Promise<PublicacaoGravada> {
    const ator = this.exigirEquipe(identidade)
    const conferidos = arquivos.map((a) => ({ ...a }))
    const snapshot = await snapshotDe(entrada, manifesto)
    const provas = new Map(conferidos.map((a) => [a.digest, a]))
    if (
      provas.size !== conferidos.length ||
      provas.size !== snapshot.recursos.length ||
      snapshot.recursos.some((r) => {
        const p = provas.get(r.digest)
        return !p || p.bytes !== r.bytes || p.tipoDoConteudo !== r.mime
      })
    )
      throw new CenarioInvalidoError([
        'Os arquivos conferidos não correspondem ao pacote publicado',
      ])

    const { pedido, digestDaOperacao } = snapshot
    const repetida = await this.repo.operacao(pedido.operacaoId)
    if (repetida) {
      if (
        repetida.digestDaOperacao !== digestDaOperacao ||
        repetida.publicacao.autorId !== ator.usuarioId
      )
        throw new PublicacaoDeCenarioConflitanteError('Esta operação já publicou outro conteúdo')
      return { publicacao: repetida.publicacao, repetido: true }
    }
    const { preparo, espaco } = await this.autorizar(ator, pedido)
    conferirProcedenciaPublicada(snapshot.cena, preparo)
    return this.repo.gravar(
      {
        id: this.novoId(),
        espacoId: espaco.id,
        autorId: ator.usuarioId,
        pedido,
        digestDaOperacao,
        recursos: snapshot.recursos,
        conferidos,
        licencas: preparo.contexto.bibliotecas,
      },
      this.clock(),
    )
  }
}
