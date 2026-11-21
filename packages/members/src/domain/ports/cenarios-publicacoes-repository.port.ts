import type {
  PerfilDePublicacao,
  RecursoDaPublicacao,
} from '@sistemazero/molda-cenarios-core/publicacao'
import type {
  NovaPublicacaoDeCenario,
  PublicacaoDeCenario,
  PublicacaoGravada,
  VersaoDeCenarioPublicada,
  VoltaDePublicacaoDeCenario,
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
  /** Mesmas travas e mesma ordem de `gravar` (espaço, depois perfil). Repetição precede CAS; a
   * versão escolhida precisa ser anterior à atual, da mesma ilha, com todos os arquivos ainda
   * confirmados no espaço e nenhum saindo. Copia manifesto e arquivos para a versão nova. */
  voltar(dados: VoltaDePublicacaoDeCenario, agora: Date): Promise<PublicacaoGravada>
  atual(perfil: PerfilDePublicacao): Promise<PublicacaoDeCenario | null>
  /** As versões da ilha, da mais nova à mais antiga, com a atual marcada numa consulta só. */
  listarVersoes(
    perfil: PerfilDePublicacao,
    limite: number,
  ): Promise<readonly VersaoDeCenarioPublicada[]>
  porId(id: string): Promise<PublicacaoDeCenario | null>
  recursos(publicacaoId: string): Promise<readonly RecursoDaPublicacao[]>
  recurso(publicacaoId: string, digest: string): Promise<RecursoDaPublicacao | null>
}
