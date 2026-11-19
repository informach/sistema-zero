import type {
  PerfilDePublicacao,
  RecursoDaPublicacao,
} from '@sistemazero/molda-cenarios-core/publicacao'
import type {
  NovaPublicacaoDeCenario,
  PublicacaoDeCenario,
  PublicacaoGravada,
} from '../cenarios/publicacoes'

export interface CenariosPublicacoesRepository {
  operacao(operacaoId: string): Promise<{
    digestDaOperacao: string
    publicacao: PublicacaoDeCenario
  } | null>
  /** Mesma trava do espaço da autoria: fonte, arquivos, operação e CAS do perfil são atômicos.
   * Repetição precede CAS. Conflito/arquivo ausente não deixam confirmação parcial de arquivos.
   * As referências das versões antigas continuam protegidas após apagar a fonte. */
  gravar(dados: NovaPublicacaoDeCenario, agora: Date): Promise<PublicacaoGravada>
  atual(perfil: PerfilDePublicacao): Promise<PublicacaoDeCenario | null>
  porId(id: string): Promise<PublicacaoDeCenario | null>
  recursos(publicacaoId: string): Promise<readonly RecursoDaPublicacao[]>
}
