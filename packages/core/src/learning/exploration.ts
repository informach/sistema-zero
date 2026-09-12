import { type ExplorationState, replayExploration } from './exploration-model'
import type { LearningAnswers, LearningResult } from './index'
import type { LearningScene, SimulationFamily } from './simulation'

export const EXPLORATION_MISSIONS = [
  'world',
  'layers',
  'gravity',
  'impulse',
  'jump-sound',
  'spawn',
  'cleanup',
  'game-state',
  'controls',
  'restart',
  'hitbox',
  'score',
  'random',
  'acceleration',
] as const
export type ExplorationMission = (typeof EXPLORATION_MISSIONS)[number]
export interface ExplorationActivity {
  type: 'exploration'
  version: 2
  mission: ExplorationMission
  /** Reviewed recording; optional until media production is complete. */
  instructionAudioUrl?: string
  /** Curated starting condition for the two motion missions; never changes gravity. */
  initialImpulse?: number
}
export interface ExplorationGoal {
  id: string
  label: string
}
export interface ExplorationDefinition {
  scene: LearningScene
  family: SimulationFamily
  title: string
  instruction: string
  manipulates: string
  success: string
  extra: string
  goals: readonly ExplorationGoal[]
  hints: readonly [string, string, string]
}
const goal = (id: string, label: string): ExplorationGoal => ({ id, label })
export const EXPLORATION_DEFINITIONS: Record<ExplorationMission, ExplorationDefinition> = {
  world: {
    scene: 'world',
    family: 'world',
    title: 'Faça o Dino aparecer',
    instruction: 'Crie o Dino nos bastidores. Depois ligue seu desenho à tela.',
    manipulates: 'Dino nos bastidores e ligação de desenho',
    success: 'É o mesmo Dino: existir e aparecer são coisas diferentes!',
    extra: 'E se você desligar o desenho? O Dino ainda existe?',
    goals: [goal('hidden', 'Dino existe sem aparecer'), goal('visible', 'O mesmo Dino aparece')],
    hints: [
      'Olhe os bastidores: o Dino já existe?',
      'Compare o Dino guardado com a tela do jogo.',
      'Toque em Desenhar e depois na Tela para ligar os dois.',
    ],
  },
  layers: {
    scene: 'layers',
    family: 'world',
    title: 'Quem fica na frente?',
    instruction: 'Troque as peças de lugar. A última desenhada fica na frente!',
    manipulates: 'Ordem das peças Floresta e Dino',
    success: 'Agora o Dino aparece na frente da floresta!',
    extra: 'E se a floresta voltar para o último lugar?',
    goals: [goal('covered', 'Floresta na frente'), goal('front', 'Dino na frente')],
    hints: [
      'O Dino está escondido atrás de quê?',
      'Olhe a última peça na faixa de desenho.',
      'Escolha o Dino e toque no espaço Depois.',
    ],
  },
  gravity: {
    scene: 'jump',
    family: 'motion',
    title: 'Faça o Dino voltar ao chão',
    instruction: 'Toque no Dino para pular. Observe o que acontece sem aplicar a gravidade.',
    manipulates: 'Dino e ligação da gravidade ao personagem',
    success: 'A gravidade fez o Dino mudar de direção e voltar ao chão!',
    extra: 'E se você desligar a aplicação e repetir o mesmo pulo?',
    goals: [
      goal('floating', 'Subida sem aplicar gravidade'),
      goal('landed', 'Volta ao chão com gravidade'),
    ],
    hints: [
      'O Dino está voltando ou continua subindo?',
      'Repita o mesmo impulso com a gravidade aplicada.',
      'Ligue Gravidade ao Dino. Depois toque nele para saltar.',
    ],
  },
  impulse: {
    scene: 'jump',
    family: 'motion',
    title: 'Escolha a altura do salto',
    instruction: 'Toque no Dino. Depois mude a seta do impulso e compare outro salto.',
    manipulates: 'Seta do impulso inicial e Dino',
    success: 'Com a mesma gravidade, um impulso maior alcança outra altura!',
    extra: 'E se você escolher uma altura entre as duas marcas?',
    goals: [
      goal('first-height', 'Um salto completo'),
      goal('other-height', 'Outra altura com a mesma gravidade'),
    ],
    hints: [
      'A marca mostra a altura do salto anterior.',
      'Mude só a seta. A gravidade continua igual.',
      'Escolha Baixo ou Alto e toque no Dino para comparar.',
    ],
  },
  'jump-sound': {
    scene: 'jump-sound',
    family: 'events',
    title: 'O som acompanha o salto',
    instruction: 'Aperte Espaço para saltar. Aperte de novo no ar e observe o som.',
    manipulates: 'Fio do som, Dino e comando Espaço',
    success: 'O som acompanha o salto de verdade, por tecla ou toque!',
    extra: 'E se você der outro comando enquanto o Dino ainda está no ar?',
    goals: [
      goal('false-sound', 'Som sem novo salto'),
      goal('quiet-air', 'Sem salto, o som espera'),
      goal('key-sound', 'Som no salto por tecla'),
      goal('tap-sound', 'Som no salto por toque'),
    ],
    hints: [
      'Um comando no ar consegue fazer outro salto?',
      'Compare ligar o som à tecla e ao acontecimento Pulou.',
      'Ligue Som a Pulou. Experimente Espaço e tocar no Dino.',
    ],
  },
  spawn: {
    scene: 'spawn',
    family: 'population',
    title: 'Abra espaço entre os cactos',
    instruction: 'Avance o relógio. Depois ligue um intervalo ao nascimento dos cactos.',
    manipulates: 'Relógio, ligação de nascimento e marcas de intervalo',
    success: 'O intervalo abriu espaço sem mudar a velocidade dos cactos!',
    extra: 'E se o relógio esperar um pouco mais entre dois cactos?',
    goals: [goal('every-frame', 'Criação em cada quadro'), goal('spaced', 'Criação com intervalo')],
    hints: [
      'Veja quantos cactos nascem enquanto o relógio anda.',
      'Compare o mesmo tempo com e sem intervalo.',
      'Ligue Relógio a Nascer e avance dois segundos.',
    ],
  },
  cleanup: {
    scene: 'cleanup',
    family: 'population',
    title: 'Cuide dos cactos invisíveis',
    instruction: 'Avance o relógio até um cacto sair. Ele também saiu dos bastidores?',
    manipulates: 'Regra de remoção na saída e relógio',
    success: 'A regra retira do grupo cada cacto que sai da tela!',
    extra: 'E se você desligar a regra e deixar outros cactos saírem?',
    goals: [
      goal('invisible-stored', 'Fora da tela, ainda no grupo'),
      goal('removed', 'Regra retira automaticamente'),
    ],
    hints: [
      'Compare a pista com os cactos guardados nos bastidores.',
      'Sair da tela e sair do grupo são coisas diferentes.',
      'Encaixe Remover na borda de saída. Avance o relógio novamente.',
    ],
  },
  'game-state': {
    scene: 'game-state',
    family: 'events',
    title: 'O relógio espera você começar',
    instruction: 'Avance o relógio no início. Depois leve-o para dentro de Se jogando.',
    manipulates: 'Peça do relógio, região Se jogando e início da partida',
    success: 'O relógio espera no início e funciona na partida!',
    extra: 'E se você voltar ao início depois de jogar?',
    goals: [
      goal('outside', 'Relógio funcionando no início'),
      goal('waiting', 'Relógio espera no início'),
      goal('playing', 'Relógio funciona jogando'),
    ],
    hints: [
      'Por que há cactos antes de você começar?',
      'A região Se jogando só deixa agir durante a partida.',
      'Leve Relógio para Se jogando. Compare o início e a partida.',
    ],
  },
  controls: {
    scene: 'controls',
    family: 'events',
    title: 'Faça o convite funcionar',
    instruction: 'A tela diz Toque ou Enter. Experimente tocar para começar.',
    manipulates: 'Tela inicial e fio do controle por toque',
    success: 'Você começou a partida por toque e por Enter!',
    extra: 'E se você desligar só o toque? O Enter ainda funciona?',
    goals: [
      goal('missing-touch', 'Toque ainda não conectado'),
      goal('start-tap', 'Partida iniciada por toque'),
      goal('start-key', 'Partida iniciada por Enter'),
    ],
    hints: [
      'O convite promete dois caminhos. Os dois funcionam?',
      'Olhe qual entrada está ligada a Começar.',
      'Ligue Toque a Começar. Teste os dois caminhos, voltando ao início.',
    ],
  },
  restart: {
    scene: 'restart',
    family: 'events',
    title: 'Jogue outra vez',
    instruction: 'Comece uma partida e aproxime o cacto para descobrir o que falta no fim.',
    manipulates: 'Início, cacto e ligação de reinício',
    success: 'Outra partida começou, com pontos e obstáculos reiniciados!',
    extra: 'E se você jogar e recomeçar mais uma vez?',
    goals: [
      goal('ended', 'Colisão encerrou a partida'),
      goal('restarted', 'Outra partida iniciada pela ação de reinício'),
    ],
    hints: [
      'A partida terminou. Como sair dessa tela?',
      'A ligação de Jogar de novo precisa iniciar outra rodada.',
      'Ligue Jogar de novo a Início e acione o botão no fim.',
    ],
  },
  hitbox: {
    scene: 'hitbox',
    family: 'collision',
    title: 'Onde a batida acontece?',
    instruction: 'Aproxime o cacto. Depois mude a área do Dino, sem mudar seu desenho.',
    manipulates: 'Posição do cacto e alça da área de contato',
    success: 'O desenho ficou igual. A área mudou o momento da batida!',
    extra: 'E se a área ficar menor? Aproxime o cacto de novo.',
    goals: [
      goal('contact', 'Áreas em contato'),
      goal('separate', 'Áreas separadas'),
      goal('area-contrast', 'Mesma posição, áreas diferentes'),
    ],
    hints: [
      'Olhe as bordas das duas áreas.',
      'Deixe o cacto no mesmo lugar e mude só a área do Dino.',
      'Aproxime até a marca do meio. Compare as alças Menor e Maior.',
    ],
  },
  score: {
    scene: 'score',
    family: 'events',
    title: 'Pontos só durante a partida',
    instruction: 'Veja quando o placar cresce. Leve Somar ponto para dentro de Se jogando.',
    manipulates: 'Peça de pontuação, região Se jogando e relógio',
    success: 'Os pontos crescem jogando e ficam guardados fora da partida!',
    extra: 'E se você voltar ao início? Veja se o placar continua parado.',
    goals: [
      goal('score-playing', 'Pontos aumentam jogando'),
      goal('score-start', 'Pontos esperam no início'),
      goal('score-end', 'Valor fica parado no fim'),
    ],
    hints: [
      'O placar deve crescer antes de começar?',
      'Compare o mesmo passo do relógio no início, jogando e no fim.',
      'Leve Somar ponto para Se jogando. Teste os três momentos.',
    ],
  },
  random: {
    scene: 'random',
    family: 'speed',
    title: 'Cada cacto pode nascer diferente',
    instruction: 'Acione os exemplos do sorteador. Compare primeiro onde os cactos nascem.',
    manipulates: 'Sorteador de posição e velocidade, marcas dos resultados',
    success: 'O sorteio muda o resultado dentro dos limites escolhidos!',
    extra: 'Sorteie livremente. Um resultado pode se repetir!',
    goals: [
      goal('positions', 'Posições diferentes, mesma velocidade'),
      goal('velocities', 'Velocidades −5 e −6, mesma posição'),
    ],
    hints: [
      'A faixa mostra onde um cacto pode nascer.',
      'Compare uma coisa por vez: posição ou velocidade.',
      'Acione os dois exemplos de posição. Depois compare os dois de velocidade.',
    ],
  },
  acceleration: {
    scene: 'acceleration',
    family: 'speed',
    title: 'Acelere com um limite',
    instruction: 'Crie um cacto. Avance o relógio e veja a velocidade dos próximos.',
    manipulates: 'Relógio, placa de limite e nascimento de cactos',
    success: 'A base para em −9. O sorteio ainda pode criar um novo cacto a −10!',
    extra: 'E os cactos antigos? Compare suas setas com a do novo cacto.',
    goals: [
      goal('base-limit', 'Base chega a −9 e permanece'),
      goal('variation-limit', 'No limite, sorteio produz −10'),
      goal('old-speed', 'Cacto anterior conserva sua velocidade'),
    ],
    hints: [
      'A seta de cada cacto mostra a velocidade que ele recebeu ao nascer.',
      'Compare a base do próximo cacto com a seta de um antigo.',
      'Encaixe o limite −9. Avance cinco passos e crie o exemplo com desconto 1.',
    ],
  },
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
export function isExplorationActivity(value: unknown): value is ExplorationActivity {
  return (
    record(value) &&
    value.type === 'exploration' &&
    value.version === 2 &&
    EXPLORATION_MISSIONS.some((mission) => mission === value.mission) &&
    (value.initialImpulse === undefined ||
      ((value.mission === 'gravity' || value.mission === 'impulse') &&
        typeof value.initialImpulse === 'number' &&
        Number.isInteger(value.initialImpulse) &&
        value.initialImpulse >= 5 &&
        value.initialImpulse <= 14)) &&
    (value.instructionAudioUrl === undefined ||
      (typeof value.instructionAudioUrl === 'string' &&
        value.instructionAudioUrl.length <= 4000 &&
        /^(https:\/\/|\/[^/])/.test(value.instructionAudioUrl)))
  )
}
export function explorationGoals(activity: ExplorationActivity, state: ExplorationState) {
  return EXPLORATION_DEFINITIONS[activity.mission].goals.map((g) => ({
    ...g,
    complete: state.discoveries.includes(g.id),
  }))
}
export function evaluateExploration(
  activity: ExplorationActivity,
  answers: LearningAnswers,
): LearningResult {
  const { state, valid } = replayExploration(activity, answers)
  const missing = explorationGoals(activity, state).find((g) => !g.complete)
  const finalReady =
    activity.mission === 'layers'
      ? state.front
      : activity.mission === 'jump-sound'
        ? state.soundOnJump
        : true
  return {
    participated: valid && state.actions > 0,
    passed: valid && missing === undefined && finalReady,
    feedback: !valid
      ? 'Esta descoberta mudou. Recomece a experiência; seu projeto está guardado.'
      : (missing?.label ??
        (!finalReady
          ? 'Deixe a montagem com a descoberta que você fez.'
          : EXPLORATION_DEFINITIONS[activity.mission].success)),
    verifiedBy: 'client',
    evidence: 'exploration',
  }
}
