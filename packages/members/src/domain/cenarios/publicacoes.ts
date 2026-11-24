import type { LicencaDaBiblioteca } from '@sistemazero/molda-cenarios-core/compilar'
import type {
  MimeDaPublicacao,
  PedidoDePublicacao,
  PedidoDeVolta,
  PerfilDePublicacao,
  RecursoDaPublicacao,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { DomainError } from '../shared/errors'

export interface PublicacaoDeCenario {
  id: string
  espacoId: string
  perfil: PerfilDePublicacao
  versao: number
  fonte: PedidoDePublicacao['fonte']
  manifesto: PedidoDePublicacao['manifesto']
  autorId: string
  criadoEm: Date
}
/** Prova recebida exclusivamente do BFF autenticado, depois de conferir os bytes no bucket. */
export interface ArquivoPublicadoConferido {
  digest: string
  bytes: number
  tipoDoConteudo: MimeDaPublicacao
}
export interface PublicacaoGravada {
  publicacao: PublicacaoDeCenario
  repetido: boolean
}
export interface NovaPublicacaoDeCenario {
  id: string
  espacoId: string
  autorId: string
  pedido: PedidoDePublicacao
  digestDaOperacao: string
  recursos: readonly RecursoDaPublicacao[]
  conferidos: readonly ArquivoPublicadoConferido[]
  licencas: readonly LicencaDaBiblioteca[]
}
/** Uma versão guardada da ilha, marcada se é a que está no ar (lida numa consulta só). */
export interface VersaoDeCenarioPublicada extends PublicacaoDeCenario {
  atual: boolean
}
/** Voltar a ilha para uma versão anterior: o manifesto e os arquivos dela, numa versão nova. */
export interface VoltaDePublicacaoDeCenario {
  id: string
  /** O espaço da versão escolhida: os arquivos já estão nele. */
  espacoId: string
  autorId: string
  pedido: PedidoDeVolta
  digestDaOperacao: string
}
export class PublicacaoDeCenarioConflitanteError extends DomainError {
  readonly code = 'PUBLICACAO_CENARIO_CONFLITANTE'
  constructor(
    message = 'O destino mudou em outro lugar; confira a versão publicada antes de continuar',
  ) {
    super(message)
  }
}

/** Algum arquivo da versão escolhida já saiu do espaço (ou está saindo): ela não volta ao ar. → 409. */
export class PublicacaoSemArquivosError extends DomainError {
  readonly code = 'PUBLICACAO_CENARIO_SEM_ARQUIVOS'
  constructor(readonly digests: readonly string[]) {
    super(
      'Alguns arquivos desta versão já saíram do espaço da equipe, então ela não pode voltar ao ar. Publique uma revisão de novo.',
    )
  }
}
