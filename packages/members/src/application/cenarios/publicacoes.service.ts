import { randomUUID } from 'node:crypto'
import {
  digestDoPedidoDePublicacao,
  lerResumoDaPublicacao,
  MIME_DO_MANIFESTO,
  type PedidoDePublicacao,
  PedidoDePublicacaoSchema,
  PerfilDePublicacaoSchema,
  PublicacaoParaOJogoSchema,
  type RecursoDaPublicacao,
  RecursosAReservarSchema,
  ReferenciaDeArquivoPublicadoSchema,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { z } from 'zod'
import {
  type Ator,
  chaveDoBlob,
  equipeNaPropriaConta,
  LIMITES_DOS_CENARIOS,
} from '../../domain/cenarios/cenarios'
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

/** Arquivos por leitura do jogo: um pedido cobre um lote do pacote publicado. */
export const LIMITE_DE_ARQUIVOS_POR_LEITURA = 100
const PedidoPersistidoSchema = PedidoDePublicacaoSchema.extend({
  fonte: PedidoDePublicacaoSchema.shape.fonte.extend({ cenario: z.uuid() }),
})
function lerPedido(entrada: unknown) {
  const r = PedidoPersistidoSchema.safeParse(entrada)
  if (!r.success) throw new CenarioInvalidoError(['O pedido de publicação é inválido'])
  return r.data
}
/** O inventário e a procedência que o BFF tirou do manifesto conferido no armazenamento. */
function resumoDe(pedido: PedidoDePublicacao, entrada: unknown) {
  try {
    return lerResumoDaPublicacao(pedido, entrada)
  } catch (erro) {
    throw new CenarioInvalidoError([
      (erro instanceof z.ZodError
        ? (erro.issues[0]?.message ?? 'O inventário publicado é inválido')
        : erro instanceof Error
          ? erro.message
          : 'O inventário publicado é inválido'
      ).slice(0, 600),
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
    private readonly cenarios: Pick<CenariosService, 'modoAdmite' | 'exportacao'>,
    private readonly clock: () => Date,
    private readonly novoId: () => string = randomUUID,
  ) {}

  private exigirEquipe(identidade: Ator): Ator {
    const ator = { ...identidade }
    if (!equipeNaPropriaConta(ator) || !this.cenarios.modoAdmite(ator))
      throw new CenariosFechadosError(
        'Somente a equipe, na própria conta e fora de suporte, pode publicar no Arquipélago',
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

  /** O jogo lê a versão atual da ilha e a imediatamente anterior (quem estava jogando quando a
   * nova entrou). Versões mais antigas não abrem mais pelo jogo, mesmo com o id em mãos. */
  private async publicacaoLegivel(publicacaoId: string) {
    const versao = await this.repo.porId(publicacaoId)
    if (!versao) return null
    const atual = await this.repo.atual(versao.perfil)
    if (!atual || versao.versao < atual.versao - 1) return null
    return versao
  }

  async arquivoDoJogo(publicacaoId: string, digest: string) {
    const referencia = ReferenciaDeArquivoPublicadoSchema.safeParse({ publicacaoId, digest })
    if (!referencia.success) throw new CenarioNaoEncontradoError('O arquivo')
    const versao = await this.publicacaoLegivel(publicacaoId)
    const arquivo = versao && (await this.repo.recurso(publicacaoId, digest))
    if (!versao || !arquivo) throw new CenarioNaoEncontradoError('O arquivo')
    return {
      digest: arquivo.digest,
      chave: chaveDoBlob(versao.espacoId, arquivo.digest),
      bytes: arquivo.bytes,
      tipoDoConteudo: arquivo.mime,
    }
  }

  /** Vários arquivos da mesma versão numa ida: o jogo baixa o pacote sem gastar um pedido por
   * arquivo no limite da conta. Todos precisam pertencer à versão. */
  async arquivosDoJogo(publicacaoId: string, digests: readonly string[]) {
    const pedidos = [...digests]
    if (
      !pedidos.length ||
      pedidos.length > LIMITE_DE_ARQUIVOS_POR_LEITURA ||
      new Set(pedidos).size !== pedidos.length ||
      pedidos.some(
        (digest) => !ReferenciaDeArquivoPublicadoSchema.safeParse({ publicacaoId, digest }).success,
      )
    )
      throw new CenarioNaoEncontradoError('O arquivo')
    const versao = await this.publicacaoLegivel(publicacaoId)
    if (!versao) throw new CenarioNaoEncontradoError('O arquivo')
    const daVersao = new Map((await this.repo.recursos(publicacaoId)).map((r) => [r.digest, r]))
    return {
      arquivos: pedidos.map((digest) => {
        const arquivo = daVersao.get(digest)
        if (!arquivo) throw new CenarioNaoEncontradoError('O arquivo')
        return {
          digest,
          chave: chaveDoBlob(versao.espacoId, digest),
          bytes: arquivo.bytes,
          tipoDoConteudo: arquivo.mime,
        }
      }),
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

  /** Chamada interna: o BFF leu o manifesto no bucket, conferiu o hash e escolheu estes recursos
   * do inventário dele; aqui só entra metadado de recurso compilado, nunca o manifesto. */
  async reservarRecursosDoManifesto(identidade: Ator, entrada: unknown, recursos: unknown) {
    const ator = this.exigirEquipe(identidade),
      pedido = lerPedido(entrada)
    const lidos = RecursosAReservarSchema.safeParse(recursos)
    if (!lidos.success)
      throw new CenarioInvalidoError([
        'Escolha até 50 recursos compilados diferentes do inventário por reserva',
      ])
    const { espaco } = await this.autorizar(ator, pedido)
    const atual = await this.repo.atual(pedido.perfil)
    if ((atual?.versao ?? 0) !== pedido.versaoEsperada)
      throw new PublicacaoDeCenarioConflitanteError()
    return { espacoId: espaco.id, arquivos: await this.reservar(espaco.id, lidos.data) }
  }

  async publicarConferido(
    identidade: Ator,
    entrada: unknown,
    resumoRecebido: unknown,
    arquivos: readonly ArquivoPublicadoConferido[],
  ): Promise<PublicacaoGravada> {
    const ator = this.exigirEquipe(identidade)
    const conferidos = arquivos.map((a) => ({ ...a }))
    const pedido = lerPedido(entrada)
    const resumo = resumoDe(pedido, structuredClone(resumoRecebido))
    const provas = new Map(conferidos.map((a) => [a.digest, a]))
    if (
      provas.size !== conferidos.length ||
      provas.size !== resumo.recursos.length ||
      resumo.recursos.some((r) => {
        const p = provas.get(r.digest)
        return !p || p.bytes !== r.bytes || p.tipoDoConteudo !== r.mime
      })
    )
      throw new CenarioInvalidoError([
        'Os arquivos conferidos não correspondem ao pacote publicado',
      ])
    const digestDaOperacao = await digestDoPedidoDePublicacao(pedido)
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
    conferirProcedenciaPublicada(resumo, preparo)
    return this.repo.gravar(
      {
        id: this.novoId(),
        espacoId: espaco.id,
        autorId: ator.usuarioId,
        pedido,
        digestDaOperacao,
        recursos: resumo.recursos,
        conferidos,
        licencas: preparo.contexto.bibliotecas,
      },
      this.clock(),
    )
  }
}
