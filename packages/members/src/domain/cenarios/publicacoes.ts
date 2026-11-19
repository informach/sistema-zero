import type { LicencaDaBiblioteca } from '@sistemazero/molda-cenarios-core/compilar'
import type {
  MimeDaPublicacao,
  PedidoDePublicacao,
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
export class PublicacaoDeCenarioConflitanteError extends DomainError {
  readonly code = 'PUBLICACAO_CENARIO_CONFLITANTE'
  constructor(
    message = 'O destino mudou em outro lugar; confira a versão publicada antes de continuar',
  ) {
    super(message)
  }
}
