import type {
  AmostraSemId,
  ArquivoDeTerreno,
  DocumentoDeCenario,
  EncaixeDeComposicao,
  FonteDeAlturas,
  FormaDeCenario,
  InstanciaDeCenario,
  ModeloDoCenario,
  OperacaoDeAguaPreparada,
  OperacaoDeCaminhoPreparada,
  PontoDeEncaixe,
  ReceitaDeEspalhamento,
  TexturaDoCenario,
  Transformacao,
  VolumeDeComposicao,
} from '@sistemazero/molda-cenarios-core/v2'
import type { EstadoDasTexturas } from './texturas'

export type Ferramenta = 'selecionar' | 'mover' | 'girar' | 'tamanho' | 'espalhar'
export type Vista = 'livre' | 'cima' | 'frente' | 'lado'
export type Tema = 'light' | 'dark'
export type ModoDeSelecao = 'ponto' | 'retangulo' | 'laco'
export type DonoDosPontos = 'caminhos' | 'jogo' | 'regioes'

export interface ConfiguracaoDoEspalhamento {
  /** Mantém a paleta carregada enquanto parâmetros ou destino precisam ser corrigidos. */
  pausa?: string
  receita: Omit<ReceitaDeEspalhamento, 'traco'>
  modelos: readonly ModeloDoCenario[]
  formas: readonly FormaDeCenario[]
  texturas: readonly TexturaDoCenario[]
}
export interface EstadoDoEspalhamento {
  quantidade: number
  ativa: boolean
  pronta: boolean
  saturou: boolean
  faltouEspaco: boolean
  limiteDoTraco: boolean
  erro: string | null
}
export interface GestoDeEspalhamento {
  /** Identidade da cabeça na qual o gesto começou, somente para o ciclo local de edição. */
  documentoDeOrigem: DocumentoDeCenario
  modelos: readonly ModeloDoCenario[]
  formas: readonly FormaDeCenario[]
  texturas: readonly TexturaDoCenario[]
  receita: ReceitaDeEspalhamento
  amostras: readonly AmostraSemId[]
}

export type Encaixe = Pick<EncaixeDeComposicao, 'grade' | 'angulo'> &
  Partial<Omit<EncaixeDeComposicao, 'grade' | 'angulo'>>

export interface Ponto3 {
  x: number
  y: number
  z: number
  apoio?: InstanciaDeCenario['apoio']
}

export interface MudancaDeTransformacao {
  id: string
  /** Em coordenadas de MUNDO. Quem grava converte para o apoio do objeto. */
  transformacao: Transformacao
  apoio?: InstanciaDeCenario['apoio']
}

export interface Estatisticas {
  objetos: number
  triangulos: number
  desenhos: number
  /** Modelos da tabela do cenário que ainda estão chegando. */
  carregando: number
  geometrias: number
  texturas: number
}

export interface OpcoesDoPalco {
  aoAmbiente?(estado: import('./ambiente/ambiente').EstadoDoAmbiente): void
  aoColisoesVisiveis?(estado: import('./jogo/colisoes-visiveis').EstadoDasColisoesVisiveis): void
  aoSelecionarMarcador?(id: string): void
  aoMarcadores?(estado: import('./jogo/marcadores').EstadoDosMarcadores): void
  aoEditarPontosDeCaminho?(
    gesto: import('./curvas/edicao-de-pontos').GestoDePontosDeCaminho,
    dono: DonoDosPontos,
  ): void
  aoCancelarPontosDeCaminho?(dono: DonoDosPontos): void
  aoErroDePontosDeCaminho?(mensagem: string, dono: DonoDosPontos): void
  aoCapturarPontoDaAgua?(ponto: Ponto3): void
  aoSelecionarAgua?(id: string): void
  aoSelecionarCaminho?(id: string): void
  aoCaminhos?(estado: import('./curvas/caminhos').EstadoDosCaminhos): void
  aoAguas?(estado: import('./agua/aguas').EstadoDasAguas): void
  aoPreverTerreno?(estado: import('./escultura-tipos').EstadoDaEscultura): void
  aoEsculpir?(gesto: import('./escultura-tipos').GestoDeTerreno): void
  aoTeste?(estado: import('./teste/tipos').EstadoDoTeste | null): void
  /** Retratos isolados de composições, sem chão, céu ou elementos de edição. */
  fotografia?: boolean
  /** Os bytes do GLB de um modelo da tabela do cenário. O host decide de onde vêm. */
  carregarModelo(modelo: ModeloDoCenario, sinal?: AbortSignal): Promise<ArrayBuffer>
  carregarTextura?(textura: TexturaDoCenario, sinal: AbortSignal): Promise<ArrayBuffer>
  aoTexturas?(estado: EstadoDasTexturas): void
  carregarTerreno?(digest: string, sinal: AbortSignal): Promise<ArrayBuffer>
  aoTerreno?(evento: {
    estado: 'carregando' | 'pronto' | 'erro'
    chave: string
    erro?: unknown
  }): void
  /** Toque num objeto (ou no vazio, com `null`). `somar` = Shift ou Ctrl apertado. */
  aoSelecionar?(id: string | null, somar: boolean): void
  aoSelecionarArea?(ids: readonly string[], somar: boolean): void
  aoPreverSelecao?(pontos: readonly (readonly [number, number])[]): void
  aoPreverEspalhamento?(estado: EstadoDoEspalhamento): void
  aoEspalhar?(gesto: GestoDeEspalhamento): void
  /** Fim de um gesto de mover, girar ou mudar o tamanho. */
  // biome-ignore lint/suspicious/noConfusingVoidType: consumidores sem retorno continuam válidos; false recusa a prévia
  aoTransformar?(mudancas: MudancaDeTransformacao[]): boolean | void
  aoGesto?(ativo: boolean): void
  aoMedir?(estatisticas: Estatisticas): void
  aoFalhar?(modelo: ModeloDoCenario, erro: unknown): void
  tema?: Tema
  movimentoReduzido?: boolean
}

export interface Palco {
  /** Prévia da mesma fila de comandos, sem criar revisões enquanto os controles mudam. */
  preverAmbiente(
    origem: DocumentoDeCenario,
    comandos: readonly import('./edicao-com-terreno').ComandoDePreviaDoAmbiente[],
    dono?: import('./edicao-com-terreno').DonoDaPreviaDoAmbiente,
  ): void
  finalizarPreviaDeAmbiente(
    cancelar?: boolean,
    dono?: import('./edicao-com-terreno').DonoDaPreviaDoAmbiente,
  ): void
  /** Inspeção dos triângulos reais usados pelo Testar, somente na edição. */
  definirColisoesVisiveis(visiveis: boolean): void
  /** Vista de edição em coordenadas mundiais, sem editar a câmera do Testar. */
  capturarCamera(): import('@sistemazero/molda-cenarios-core/v2').VistaDeCamera
  restaurarCamera(vista: import('@sistemazero/molda-cenarios-core/v2').VistaDeCamera): void
  /** Guias editoriais; nunca aparecem em Testar ou em retratos. */
  definirGuiasDoJogo(visiveis: boolean): void
  definirCapturaDeCaminho(
    configuracao: import('./curvas/edicao-de-pontos').CapturaDeCaminho | null,
    dono?: DonoDosPontos,
  ): void
  preverCaminho(origem: DocumentoDeCenario, operacao: OperacaoDeCaminhoPreparada): void
  finalizarPreviaDeCaminho(cancelar?: boolean): void
  /** null encerra a captura; [] inicia uma sequência. Os pontos são somente alças locais. */
  definirCapturaDeAgua(pontos: readonly Ponto3[] | null): void
  preverAgua(origem: DocumentoDeCenario, operacao: OperacaoDeAguaPreparada): void
  finalizarPreviaDeAgua(cancelar?: boolean): void
  definirEscultura(configuracao: import('./escultura-tipos').ConfiguracaoDaEscultura | null): void
  finalizarEscultura(cancelar?: boolean): void
  /** Disponibiliza bytes autorais verificados antes da confirmação do lote no servidor. */
  prepararRecursosDoTerreno(
    arquivos: readonly ArquivoDeTerreno[],
    sinal?: AbortSignal,
  ): Promise<void>
  /** Libera somente o preparo cancelado indicado; nunca remove arquivos da cabeça atual. */
  descartarRecursosDoTerreno(digests: readonly string[]): void
  iniciarTeste(
    configuracao: import('./teste/tipos').ConfiguracaoDoTeste,
    sinal?: AbortSignal,
  ): Promise<void>
  comandarTeste(comando: import('./teste/tipos').ComandoDoTeste): void
  entradaDoTeste(entrada: Partial<import('./teste/tipos').EntradaDoTeste>): void
  estadoDoTeste(): import('./teste/tipos').EstadoDoTeste | null
  encerrarTeste(): void
  definirDocumento(documento: DocumentoDeCenario): void
  recarregarTexturas(): void
  definirSelecao(ids: readonly string[]): void
  definirFerramenta(ferramenta: Ferramenta): void
  definirModoDeSelecao(modo: ModoDeSelecao): void
  definirEspalhamento(configuracao: ConfiguracaoDoEspalhamento | null): void
  recarregarModelos(): void
  definirEncaixe(encaixe: Encaixe): void
  /** Sem a ferramenta de medidas por eixo (faixa básica), as alças do tamanho só mudam por igual. */
  definirTamanhoSoUniforme(soUniforme: boolean): void
  definirTema(tema: Tema): void
  definirVista(vista: Vista): void
  /** O ponto do chão debaixo de uma posição da tela, já no encaixe da grade. */
  pontoNoChao(clientX: number, clientY: number): Ponto3 | null
  /** A cópia translúcida do modelo arrastado da gaveta, onde ele vai pousar. */
  mostrarPreviaDeModelo(modelo: ModeloDoCenario, clientX: number, clientY: number): void
  /** Esconde a prévia do arraste; `soltar` também esquece o modelo carregado para ela. */
  esconderPreviaDeModelo(soltar?: boolean): void
  /** Os pontos de encaixe que a geometria do modelo dá (sem os escritos à mão); nulo antes de carregar. */
  pontosDeEncaixeDaGeometria(modeloId: string): PontoDeEncaixe[] | null
  /** Mostra as bolinhas dos pontos de encaixe de uma peça posta e as acompanha (nulo apaga). */
  realcarPontosDeEncaixe(id: string | null): void
  /** Volume medido do GLB já carregado, sem expor objetos do Three ao host. */
  volumeDoModelo(id: string): VolumeDeComposicao | null
  /** Ausente enquanto os bytes do relevo não estão prontos; não substitui altura por zero. */
  fonteDeAlturas(): FonteDeAlturas | undefined
  /** Cópia independente para receitas, arquivos e troca de resolução. */
  estadoDoTerreno(): import('@sistemazero/molda-cenarios-core/v2').EstadoDoTerreno | null
  /** Enquadra os objetos dados, ou o cenário inteiro. */
  enquadrar(ids?: readonly string[]): void
  /** Uma foto do palco agora, sem as alças de edição. */
  capturar(largura?: number): Promise<Blob | null>
  /** Aguarda os arquivos reais; recusa falhas, cancelamento e tempo esgotado. */
  aguardarRecursos(sinal?: AbortSignal): Promise<void>
  destruir(): void
}
