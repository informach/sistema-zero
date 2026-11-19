import type { PacoteCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import type {
  PerfilDePublicacao,
  PublicacaoParaOJogo,
  ResultadoDaPublicacao,
} from '@sistemazero/molda-cenarios-core/publicacao'

export interface DestinoDaPublicacao {
  perfil: PerfilDePublicacao
  versaoEsperada: number
  operacaoId: string
}
export interface ProgressoDaPublicacao {
  etapa: 'manifesto' | 'recursos' | 'conferencia'
  feitos: number
  total: number
}
export interface PublicacoesDeCenariosHost {
  obter(perfil: PerfilDePublicacao, sinal?: AbortSignal): Promise<PublicacaoParaOJogo | null>
  publicar(
    pacote: PacoteCompilado,
    destino: DestinoDaPublicacao,
    sinal?: AbortSignal,
    progresso?: (p: ProgressoDaPublicacao) => void,
  ): Promise<ResultadoDaPublicacao>
}

export class PublicacaoDesatualizada extends Error {
  constructor(
    mensagem = 'O destino mudou em outro lugar; confira a versão publicada para continuar.',
  ) {
    super(mensagem)
    this.name = 'PublicacaoDesatualizada'
  }
}
