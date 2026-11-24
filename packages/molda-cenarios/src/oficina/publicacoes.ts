import type { PacoteCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import type {
  PerfilDePublicacao,
  PublicacaoParaOJogo,
  ResultadoDaPublicacao,
  VersaoPublicada,
  VersoesPublicadas,
} from '@sistemazero/molda-cenarios-core/publicacao'

export interface DestinoDaPublicacao {
  perfil: PerfilDePublicacao
  versaoEsperada: number
  operacaoId: string
}
/** Voltar a ilha para uma versão guardada: ela entra no ar como versão nova (atual + 1). */
export interface DestinoDaVolta {
  perfil: PerfilDePublicacao
  /** A versão no ar que a pessoa viu na lista (o mesmo CAS de uma publicação). */
  versaoEsperada: number
  /** Repetir o mesmo pedido devolve a mesma versão nova, sem criar outra. */
  operacaoId: string
  /** A versão guardada escolhida na lista; a resposta precisa trazer o conteúdo dela. */
  versao: Pick<VersaoPublicada, 'id' | 'fonte' | 'manifesto'>
}
export interface ProgressoDaPublicacao {
  etapa: 'manifesto' | 'recursos' | 'conferencia'
  feitos: number
  total: number
}
export interface PublicacoesDeCenariosHost {
  obter(perfil: PerfilDePublicacao, sinal?: AbortSignal): Promise<PublicacaoParaOJogo | null>
  /** As versões guardadas da ilha, da mais nova à mais antiga, com a que está no ar marcada. */
  listarVersoes(perfil: PerfilDePublicacao, sinal?: AbortSignal): Promise<VersoesPublicadas>
  publicar(
    pacote: PacoteCompilado,
    destino: DestinoDaPublicacao,
    sinal?: AbortSignal,
    progresso?: (p: ProgressoDaPublicacao) => void,
  ): Promise<ResultadoDaPublicacao>
  /** "Voltar para esta versão": os arquivos já estão no espaço, nada é enviado de novo. */
  voltarParaVersao(destino: DestinoDaVolta, sinal?: AbortSignal): Promise<ResultadoDaPublicacao>
}

export class PublicacaoDesatualizada extends Error {
  constructor(
    mensagem = 'O destino mudou em outro lugar; confira a versão publicada para continuar.',
  ) {
    super(mensagem)
    this.name = 'PublicacaoDesatualizada'
  }
}

/** O pedido que segue ao servidor: só ids e a versão esperada, capturados antes de qualquer await. */
export function pedidoDaVolta(destino: DestinoDaVolta) {
  return {
    operacaoId: destino.operacaoId,
    perfil: { tipo: destino.perfil.tipo, ilha: destino.perfil.ilha },
    versaoEsperada: destino.versaoEsperada,
    publicacaoId: destino.versao.id,
  }
}
