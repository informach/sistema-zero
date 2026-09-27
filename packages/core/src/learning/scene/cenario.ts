import type { SceneFigure, SceneRole } from './cast'

/**
 * O CENÁRIO da cena: o JOGO que ela retrata.
 *
 * ⭐⭐ É a alavanca que liga a cena de aula ao jogo do curso, e nasceu de um pedido direto: "se eu
 * estou usando a experiência no corredinho, a cena tem que ser com o visual e os elementos do
 * jogo real da extensão Jogo 2D que a gente ensina no curso". Antes existia só um eixo
 * `'terra' | 'espaco'`, derivado das figuras do elenco, e ele dizia apenas se havia chão — o que
 * bastava enquanto o mundo era um retângulo de cor, e deixou de bastar quando o mundo passou a
 * ser a arte do jogo (`@sistemazero/studio/arte`).
 *
 * ⚠️⚠️ O core NÃO conhece a arte, e isso é de propósito: a direção da dependência é
 * `member-shell → studio → core`, e o core não importa o studio. Aqui mora o NOME do fundo
 * (`'floresta'`); quem o resolve em desenho é o member-shell, que depende dos dois. Trazer a arte
 * para cá inverteria a seta e arrastaria o pacote do editor para dentro do núcleo.
 *
 * ⚠️ `temChao` substituiu a comparação `=== 'espaco'` que estava espalhada pelos palcos. Com
 * vários cenários, `gorilas` tem chão e não é o Corre Dino: cada palco precisaria de um `if` novo,
 * e é exatamente esse puxadinho que o campo evita. Quem pergunta usa `cenarioTemChao`.
 */

export interface SceneCenario {
  /** O fundo que o palco pinta. O nome é resolvido na arte do jogo pelo member-shell. */
  readonly fundo: 'floresta' | 'estrelas' | 'cidade' | 'jardim' | 'farol'
  /**
   * Há chão para pisar.
   *
   * ⚠️ Não é enfeite: é o que decide se as figuras se apoiam na linha do chão ou FLUTUAM um
   * pouco acima dela (`pisoDoMundo` no member-shell). No espaço não há chão, e uma nave
   * "estacionada" numa linha pontilhada foi um achado de review.
   */
  readonly temChao: boolean
  /**
   * O fundo é ESCURO, e a tinta da cena precisa clarear para continuar legível.
   *
   * ⚠️⚠️ É pergunta DIFERENTE de `temChao`, e confundir as duas é um defeito de verdade: a
   * `gorilas` tem chão (o telhado do prédio) e um céu NOTURNO. Enquanto o palco só conhecia terra
   * e espaço as duas andavam juntas, e a folha de estilo escolhia a paleta escura por "não tem
   * chão" — o que poria tinta escura sobre a cidade à noite.
   */
  readonly fundoEscuro: boolean
  /** A figura de fábrica de cada papel neste cenário. */
  readonly figuras: Readonly<Record<SceneRole, SceneFigure>>
}

/**
 * Os jogos que os cursos ensinam.
 *
 * ⚠️ `meu-jeito` tem fundo de ESTRELAS, e não de floresta: nos cursos a pedra e a chama SÃO o
 * asteroide e o fogo dele (O Jogo do Meu Jeito desenha a pedra com crateras e a chama atrás
 * dela). Era isso que a régua antiga já dizia ao mandar pedra e chama sozinhas para o espaço, e
 * trocar o fundo aqui mudaria o curso inteiro de lugar.
 */
export const SCENE_CENARIOS = {
  'corre-dino': {
    fundo: 'floresta',
    temChao: true,
    fundoEscuro: false,
    figuras: { hero: 'dino', obstacle: 'cacto', scenery: 'floresta' },
  },
  nave: {
    fundo: 'estrelas',
    temChao: false,
    fundoEscuro: true,
    figuras: { hero: 'nave', obstacle: 'asteroide', scenery: 'tiro' },
  },
  gorilas: {
    fundo: 'cidade',
    temChao: true,
    fundoEscuro: true,
    figuras: { hero: 'gorila', obstacle: 'banana', scenery: 'predio' },
  },
  'meu-jeito': {
    fundo: 'estrelas',
    temChao: false,
    fundoEscuro: true,
    figuras: { hero: 'pedra', obstacle: 'chama', scenery: 'pedra' },
  },
  jardim: {
    fundo: 'jardim',
    temChao: true,
    fundoEscuro: false,
    figuras: { hero: 'coelho', obstacle: 'arbusto', scenery: 'flores' },
  },
  farol: {
    fundo: 'farol',
    temChao: true,
    fundoEscuro: false,
    figuras: { hero: 'personagem-farol', obstacle: 'chave-farol', scenery: 'farol' },
  },
} as const satisfies Record<string, SceneCenario>

export type SceneCenarioId = keyof typeof SCENE_CENARIOS

export const SCENE_CENARIO_IDS = Object.keys(SCENE_CENARIOS) as SceneCenarioId[]

export const isSceneCenario = (v: unknown): v is SceneCenarioId =>
  typeof v === 'string' && Object.hasOwn(SCENE_CENARIOS, v)

/**
 * O cenário tem chão para pisar?
 *
 * ⚠️ Aceita AUSENTE e responde que sim, porque a ausência tem significado: o palco que não
 * desenha papel do elenco (o espelho, a lupa, o mapa de letras, o 3D, o ateliê) não passa cenário
 * nenhum, e o chão dele é o de sempre. Lançar ali derrubaria um terço das cenas.
 */
export const cenarioTemChao = (id: SceneCenarioId | undefined) =>
  id === undefined ? true : SCENE_CENARIOS[id].temChao

/**
 * O fundo deste cenário é escuro?
 *
 * ⚠️ É esta a pergunta que a paleta da cena faz, e NÃO `cenarioTemChao`: a folha redeclara papel,
 * tinta e linha para o escuro, e quem decide isso é a cor do céu, não a existência de chão.
 */
export const cenarioEscuro = (id: SceneCenarioId | undefined) =>
  id === undefined ? false : SCENE_CENARIOS[id].fundoEscuro

/** O nome do fundo deste cenário, para o palco resolver na arte do jogo. */
export const fundoDoCenario = (id: SceneCenarioId) => SCENE_CENARIOS[id].fundo

/**
 * A que cenário cada figura pertence, DERIVADO do registro.
 *
 * ⚠️ Era um par de listas soltas (`FIGURAS_DO_ESPACO` e `FIGURAS_DA_TERRA`) que precisavam ser
 * mantidas em sincronia à mão com o resto. Derivar mata a classe: figura nova entra num cenário e
 * a tabela acompanha sozinha. Figura que aparece em mais de um cenário fica com o PRIMEIRO, que é
 * a ordem em que os cursos aparecem na jornada.
 */
export const CENARIO_DA_FIGURA: Readonly<Partial<Record<SceneFigure, SceneCenarioId>>> =
  Object.freeze(
    SCENE_CENARIO_IDS.reduce<Partial<Record<SceneFigure, SceneCenarioId>>>((mapa, id) => {
      for (const figura of Object.values(SCENE_CENARIOS[id].figuras)) {
        if (!mapa[figura as SceneFigure]) mapa[figura as SceneFigure] = id
      }
      return mapa
    }, {}),
  )
