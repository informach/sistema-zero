import type { SceneAction, SceneGroup, SceneId } from './actions'

/**
 * Os 14 modelos de cena: o catálogo ÚNICO do sistema.
 *
 * Antes o conteúdo de uma cena estava espalhado por três lugares — `LEARNING_SCENE_DEFINITIONS`
 * (a v1, com controles), `EXPLORATION_DEFINITIONS` (a v2/v3, com metas e dicas) e um segundo
 * catálogo escondido dentro de `experienceScript()`, que trazia os roteiros de demonstração.
 * Um modelo tinha, portanto, duas casas e nenhuma delas completa. Aqui ele tem uma só.
 *
 * O texto é conteúdo pedagógico da dona: foi transportado literalmente, não reescrito.
 */

/** Um passo do roteiro de uma demonstração. */
export interface SceneStep {
  id: string
  /** O que a criança LÊ enquanto o passo acontece. */
  caption: string
  /** Que parte da tela merece atenção neste passo. */
  highlight?: 'scene' | 'tools' | 'compare'
  actions: SceneAction[]
  /** Só avança quando esta descoberta acontecer de verdade. */
  waitFor?: string
}

/** Uma coisa que a criança precisa PERCEBER. O motor emite o id no instante em que acontece;
 *  a avaliação só conta quais apareceram. */
export interface SceneGoal {
  id: string
  label: string
}

export interface SceneModel {
  id: SceneId
  group: SceneGroup
  /** O que a criança vai fazer, em uma frase. É o nome que o professor bate o olho e escolhe. */
  title: string
  instruction: string
  /** O que ela pode mexer. Hoje isto só aparecia DEPOIS da escolha, no resumo. */
  manipulates: string
  success: string
  /** A pergunta do "e se…", para quem terminar antes. */
  extra: string
  goals: readonly SceneGoal[]
  /** Escada de três degraus: observação → estratégia → passo literal. */
  hints: readonly [string, string, string]
  /** O roteiro da demonstração desta cena. A demonstração autorada substitui; sem ela, é este. */
  script: readonly SceneStep[]
}

export const SCENE_MODELS: Record<SceneId, SceneModel> = {
  world: {
    id: 'world',
    group: 'world',
    title: 'Faça o Dino aparecer',
    instruction: 'Crie o Dino nos bastidores. Depois ligue seu desenho à tela.',
    manipulates: 'Dino nos bastidores e ligação de desenho',
    success: 'É o mesmo Dino: existir e aparecer são coisas diferentes!',
    extra: 'E se você desligar o desenho? O Dino ainda existe?',
    goals: [
      { id: 'hidden', label: 'Dino existe sem aparecer' },
      { id: 'visible', label: 'O mesmo Dino aparece' },
    ],
    hints: [
      'Olhe os bastidores: o Dino já existe?',
      'Compare o Dino guardado com a tela do jogo.',
      'Toque em Desenhar e depois na Tela para ligar os dois.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'O Dino existe nos bastidores.',
        highlight: 'scene',
        actions: [{ type: 'create' }],
      },
      {
        id: 'step-2',
        caption: 'Ligar o desenho faz o mesmo Dino aparecer.',
        highlight: 'scene',
        actions: [{ type: 'connect', port: 'draw', enabled: true }],
      },
    ],
  },
  layers: {
    id: 'layers',
    group: 'world',
    title: 'Quem fica na frente?',
    instruction: 'Troque as peças de lugar. A última desenhada fica na frente!',
    manipulates: 'Ordem das peças Floresta e Dino',
    success: 'Agora o Dino aparece na frente da floresta!',
    extra: 'E se a floresta voltar para o último lugar?',
    goals: [
      { id: 'covered', label: 'Floresta na frente' },
      { id: 'front', label: 'Dino na frente' },
    ],
    hints: [
      'O Dino está escondido atrás de quê?',
      'Olhe a última peça na faixa de desenho.',
      'Escolha o Dino e toque no espaço Depois.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'A floresta cobre o Dino.',
        highlight: 'scene',
        actions: [{ type: 'layer', front: false }],
      },
      {
        id: 'step-2',
        caption: 'Quem é desenhado depois fica na frente.',
        highlight: 'scene',
        actions: [{ type: 'layer', front: true }],
      },
    ],
  },
  gravity: {
    id: 'gravity',
    group: 'motion',
    title: 'Faça o Dino voltar ao chão',
    instruction: 'Toque no Dino para pular. Observe o que acontece sem aplicar a gravidade.',
    manipulates: 'Dino e ligação da gravidade ao personagem',
    success: 'A gravidade fez o Dino mudar de direção e voltar ao chão!',
    extra: 'E se você desligar a aplicação e repetir o mesmo pulo?',
    goals: [
      { id: 'floating', label: 'Subida sem aplicar gravidade' },
      { id: 'landed', label: 'Volta ao chão com gravidade' },
    ],
    hints: [
      'O Dino está voltando ou continua subindo?',
      'Repita o mesmo impulso com a gravidade aplicada.',
      'Ligue Gravidade ao Dino. Depois toque nele para saltar.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Observe o salto sem gravidade.',
        highlight: 'scene',
        actions: [
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 0.6 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Agora a gravidade traz o mesmo Dino de volta.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'gravity', enabled: true },
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 2 },
        ],
        waitFor: 'landed',
      },
    ],
  },
  impulse: {
    id: 'impulse',
    group: 'motion',
    title: 'Escolha a altura do salto',
    instruction: 'Toque no Dino. Depois mude a seta do impulso e compare outro salto.',
    manipulates: 'Seta do impulso inicial e Dino',
    success: 'Com a mesma gravidade, um impulso maior alcança outra altura!',
    extra: 'E se você escolher uma altura entre as duas marcas?',
    goals: [
      { id: 'first-height', label: 'Um salto completo' },
      { id: 'other-height', label: 'Outra altura com a mesma gravidade' },
    ],
    hints: [
      'A marca mostra a altura do salto anterior.',
      'Mude só a seta. A gravidade continua igual.',
      'Escolha Baixo ou Alto e toque no Dino para comparar.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Guarde a altura deste salto.',
        highlight: 'scene',
        actions: [
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 2 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Só o impulso mudou. A gravidade continua igual.',
        highlight: 'scene',
        actions: [
          { type: 'impulse', force: 14 },
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 2 },
        ],
      },
    ],
  },
  'jump-sound': {
    id: 'jump-sound',
    group: 'events',
    title: 'O som acompanha o salto',
    instruction: 'Aperte Espaço para saltar. Aperte de novo no ar e observe o som.',
    manipulates: 'Fio do som, Dino e comando Espaço',
    success: 'O som acompanha o salto de verdade, por tecla ou toque!',
    extra: 'E se você der outro comando enquanto o Dino ainda está no ar?',
    goals: [
      { id: 'false-sound', label: 'Som sem novo salto' },
      { id: 'quiet-air', label: 'Sem salto, o som espera' },
      { id: 'key-sound', label: 'Som no salto por tecla' },
      { id: 'tap-sound', label: 'Som no salto por toque' },
    ],
    hints: [
      'Um comando no ar consegue fazer outro salto?',
      'Compare ligar o som à tecla e ao acontecimento Pulou.',
      'Ligue Som a Pulou. Experimente Espaço e tocar no Dino.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'A tecla pode soar mesmo com o Dino no ar.',
        highlight: 'scene',
        actions: [
          { type: 'jump', input: 'key' },
          { type: 'advance', seconds: 0.1 },
          { type: 'jump', input: 'key' },
        ],
      },
      {
        id: 'step-2',
        caption: 'Ligado ao acontecimento Pulou, o som acompanha o salto.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'sound', enabled: true },
          { type: 'advance', seconds: 1 },
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 1 },
        ],
      },
    ],
  },
  spawn: {
    id: 'spawn',
    group: 'population',
    title: 'Abra espaço entre os cactos',
    instruction: 'Avance o relógio. Depois ligue um intervalo ao nascimento dos cactos.',
    manipulates: 'Relógio, ligação de nascimento e marcas de intervalo',
    success: 'O intervalo abriu espaço sem mudar a velocidade dos cactos!',
    extra: 'E se o relógio esperar um pouco mais entre dois cactos?',
    goals: [
      { id: 'every-frame', label: 'Criação em cada quadro' },
      { id: 'spaced', label: 'Criação com intervalo' },
    ],
    hints: [
      'Veja quantos cactos nascem enquanto o relógio anda.',
      'Compare o mesmo tempo com e sem intervalo.',
      'Ligue Relógio a Nascer e avance dois segundos.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Veja quantos cactos nascem sem intervalo.',
        highlight: 'scene',
        actions: [{ type: 'advance', seconds: 2 }],
      },
      {
        id: 'step-2',
        caption: 'No mesmo tempo, o intervalo reduz os nascimentos.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'timer', enabled: true },
          { type: 'advance', seconds: 2 },
        ],
      },
    ],
  },
  cleanup: {
    id: 'cleanup',
    group: 'population',
    title: 'Cuide dos cactos invisíveis',
    instruction: 'Avance o relógio até um cacto sair. Ele também saiu dos bastidores?',
    manipulates: 'Regra de remoção na saída e relógio',
    success: 'A regra retira do grupo cada cacto que sai da tela!',
    extra: 'E se você desligar a regra e deixar outros cactos saírem?',
    goals: [
      { id: 'invisible-stored', label: 'Fora da tela, ainda no grupo' },
      { id: 'removed', label: 'Regra retira automaticamente' },
    ],
    hints: [
      'Compare a pista com os cactos guardados nos bastidores.',
      'Sair da tela e sair do grupo são coisas diferentes.',
      'Encaixe Remover na borda de saída. Avance o relógio novamente.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Sair da tela ainda deixa o cacto guardado.',
        highlight: 'scene',
        actions: [{ type: 'advance', seconds: 6 }],
      },
      {
        id: 'step-2',
        caption: 'A regra remove quem saiu.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'cleanup', enabled: true },
          { type: 'advance', seconds: 2 },
        ],
      },
    ],
  },
  'game-state': {
    id: 'game-state',
    group: 'events',
    title: 'O relógio espera você começar',
    instruction: 'Avance o relógio no início. Depois leve-o para dentro de Se jogando.',
    manipulates: 'Peça do relógio, região Se jogando e início da partida',
    success: 'O relógio espera no início e funciona na partida!',
    extra: 'E se você voltar ao início depois de jogar?',
    goals: [
      { id: 'outside', label: 'Relógio funcionando no início' },
      { id: 'waiting', label: 'Relógio espera no início' },
      { id: 'playing', label: 'Relógio funciona jogando' },
    ],
    hints: [
      'Por que há cactos antes de você começar?',
      'A região Se jogando só deixa agir durante a partida.',
      'Leve Relógio para Se jogando. Compare o início e a partida.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'O relógio está funcionando antes de jogar.',
        highlight: 'scene',
        actions: [{ type: 'advance', seconds: 1 }],
      },
      {
        id: 'step-2',
        caption: 'Dentro de Jogando, ele espera o início.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'condition', enabled: true },
          { type: 'advance', seconds: 1 },
          { type: 'start', input: 'tap' },
          { type: 'advance', seconds: 1 },
        ],
      },
    ],
  },
  controls: {
    id: 'controls',
    group: 'events',
    title: 'Faça o convite funcionar',
    instruction: 'A tela diz Toque ou Enter. Experimente tocar para começar.',
    manipulates: 'Tela inicial e fio do controle por toque',
    success: 'Você começou a partida por toque e por Enter!',
    extra: 'E se você desligar só o toque? O Enter ainda funciona?',
    goals: [
      { id: 'missing-touch', label: 'Toque ainda não conectado' },
      { id: 'start-tap', label: 'Partida iniciada por toque' },
      { id: 'start-key', label: 'Partida iniciada por Enter' },
    ],
    hints: [
      'O convite promete dois caminhos. Os dois funcionam?',
      'Olhe qual entrada está ligada a Começar.',
      'Ligue Toque a Começar. Teste os dois caminhos, voltando ao início.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Tocar ainda não inicia a partida.',
        highlight: 'scene',
        actions: [{ type: 'start', input: 'tap' }],
      },
      {
        id: 'step-2',
        caption: 'A ligação adiciona o toque ao mesmo início.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'touch', enabled: true },
          { type: 'start', input: 'tap' },
        ],
      },
    ],
  },
  restart: {
    id: 'restart',
    group: 'events',
    title: 'Jogue outra vez',
    instruction: 'Comece uma partida e aproxime o cacto para descobrir o que falta no fim.',
    manipulates: 'Início, cacto e ligação de reinício',
    success: 'Outra partida começou, com pontos e obstáculos reiniciados!',
    extra: 'E se você jogar e recomeçar mais uma vez?',
    goals: [
      { id: 'ended', label: 'Colisão encerrou a partida' },
      { id: 'restarted', label: 'Outra partida iniciada pela ação de reinício' },
    ],
    hints: [
      'A partida terminou. Como sair dessa tela?',
      'A ligação de Jogar de novo precisa iniciar outra rodada.',
      'Ligue Jogar de novo a Início e acione o botão no fim.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'O contato encerra a partida.',
        highlight: 'scene',
        actions: [
          { type: 'start', input: 'tap' },
          { type: 'move', distance: 25 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Jogar de novo prepara uma nova partida.',
        highlight: 'scene',
        actions: [{ type: 'connect', port: 'restart', enabled: true }, { type: 'restart' }],
      },
    ],
  },
  hitbox: {
    id: 'hitbox',
    group: 'collision',
    title: 'Onde a batida acontece?',
    instruction: 'Aproxime o cacto. Depois mude a área do Dino, sem mudar seu desenho.',
    manipulates: 'Posição do cacto e alça da área de contato',
    success: 'O desenho ficou igual. A área mudou o momento da batida!',
    extra: 'E se a área ficar menor? Aproxime o cacto de novo.',
    goals: [
      { id: 'contact', label: 'Áreas em contato' },
      { id: 'separate', label: 'Áreas separadas' },
      { id: 'area-contrast', label: 'Mesma posição, áreas diferentes' },
    ],
    hints: [
      'Olhe as bordas das duas áreas.',
      'Deixe o cacto no mesmo lugar e mude só a área do Dino.',
      'Aproxime até a marca do meio. Compare as alças Menor e Maior.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'As áreas se tocam antes de os desenhos se misturarem.',
        highlight: 'scene',
        actions: [{ type: 'move', distance: 25 }],
      },
      {
        id: 'step-2',
        caption: 'Mesma posição, outra área. O resultado muda?',
        highlight: 'scene',
        actions: [
          { type: 'move', distance: 60 },
          { type: 'resize', width: 100 },
        ],
      },
    ],
  },
  score: {
    id: 'score',
    group: 'events',
    title: 'Pontos só durante a partida',
    instruction: 'Veja quando o placar cresce. Leve Somar ponto para dentro de Se jogando.',
    manipulates: 'Peça de pontuação, região Se jogando e relógio',
    success: 'Os pontos crescem jogando e ficam guardados fora da partida!',
    extra: 'E se você voltar ao início? Veja se o placar continua parado.',
    goals: [
      { id: 'score-playing', label: 'Pontos aumentam jogando' },
      { id: 'score-start', label: 'Pontos esperam no início' },
      { id: 'score-end', label: 'Valor fica parado no fim' },
    ],
    hints: [
      'O placar deve crescer antes de começar?',
      'Compare o mesmo passo do relógio no início, jogando e no fim.',
      'Leve Somar ponto para Se jogando. Teste os três momentos.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'O placar espera enquanto não estamos jogando.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'condition', enabled: true },
          { type: 'advance', seconds: 1 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Jogando, ele cresce. No fim, conserva o valor.',
        highlight: 'scene',
        actions: [
          { type: 'start', input: 'key' },
          { type: 'advance', seconds: 3 },
          { type: 'collide' },
          { type: 'advance', seconds: 1 },
        ],
      },
    ],
  },
  random: {
    id: 'random',
    group: 'speed',
    title: 'Cada cacto pode nascer diferente',
    instruction: 'Acione os exemplos do sorteador. Compare primeiro onde os cactos nascem.',
    manipulates: 'Sorteador de posição e velocidade, marcas dos resultados',
    success: 'O sorteio muda o resultado dentro dos limites escolhidos!',
    extra: 'Sorteie livremente. Um resultado pode se repetir!',
    goals: [
      { id: 'positions', label: 'Posições diferentes, mesma velocidade' },
      { id: 'velocities', label: 'Velocidades −5 e −6, mesma posição' },
    ],
    hints: [
      'A faixa mostra onde um cacto pode nascer.',
      'Compare uma coisa por vez: posição ou velocidade.',
      'Acione os dois exemplos de posição. Depois compare os dois de velocidade.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Dois exemplos de lugar, com a mesma velocidade.',
        highlight: 'scene',
        actions: [
          { type: 'sample', kind: 'position', unit: 0, guided: true },
          { type: 'sample', kind: 'position', unit: 1, guided: true },
        ],
      },
      {
        id: 'step-2',
        caption: 'Mesmo lugar, duas velocidades possíveis.',
        highlight: 'scene',
        actions: [
          { type: 'sample', kind: 'velocity', unit: 0, guided: true },
          { type: 'sample', kind: 'velocity', unit: 1, guided: true },
        ],
      },
    ],
  },
  acceleration: {
    id: 'acceleration',
    group: 'speed',
    title: 'Acelere com um limite',
    instruction: 'Crie um cacto. Avance o relógio e veja a velocidade dos próximos.',
    manipulates: 'Relógio, placa de limite e nascimento de cactos',
    success: 'A base para em −9. O sorteio ainda pode criar um novo cacto a −10!',
    extra: 'E os cactos antigos? Compare suas setas com a do novo cacto.',
    goals: [
      { id: 'base-limit', label: 'Base chega a −9 e permanece' },
      { id: 'variation-limit', label: 'No limite, sorteio produz −10' },
      { id: 'old-speed', label: 'Cacto anterior conserva sua velocidade' },
    ],
    hints: [
      'A seta de cada cacto mostra a velocidade que ele recebeu ao nascer.',
      'Compare a base do próximo cacto com a seta de um antigo.',
      'Encaixe o limite −9. Avance cinco passos e crie o exemplo com desconto 1.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Este cacto guarda a velocidade de nascimento.',
        highlight: 'scene',
        actions: [{ type: 'sample', kind: 'velocity', unit: 0, guided: true }],
      },
      {
        id: 'step-2',
        caption: 'O limite vale para a base dos próximos.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'limit', enabled: true },
          { type: 'clock' },
          { type: 'clock' },
          { type: 'clock' },
          { type: 'clock' },
          { type: 'clock' },
          { type: 'sample', kind: 'velocity', unit: 1, guided: true },
        ],
      },
    ],
  },
}

export function sceneModel(scene: SceneId): SceneModel {
  return SCENE_MODELS[scene]
}

/** Os ids de meta de uma cena — o `waitFor` de um roteiro precisa ser um deles. */
export function sceneGoalIds(scene: SceneId): string[] {
  return SCENE_MODELS[scene].goals.map((g) => g.id)
}
