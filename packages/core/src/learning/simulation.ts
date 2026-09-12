import type { LearningAnswers, LearningResult } from './index'

export const LEARNING_SCENES = [
  'world',
  'layers',
  'jump',
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
export type LearningScene = (typeof LEARNING_SCENES)[number]
export type SimulationFamily = 'world' | 'motion' | 'events' | 'population' | 'collision' | 'speed'
export interface SimulationActivity {
  type: 'simulation'
  version: 1
  scene: LearningScene
  parameters?: Record<string, number>
}
export interface SimulationControl {
  key: string
  label: string
  min: number
  max: number
  step: number
  initial: number
  options?: readonly string[]
}
interface SceneDefinition {
  title: string
  family: SimulationFamily
  instruction: string
  success: string
  controls: readonly SimulationControl[]
}
const toggle = (
  key: string,
  label: string,
  off: string,
  on: string,
  initial = 0,
): SimulationControl => ({ key, label, min: 0, max: 1, step: 1, initial, options: [off, on] })
const range = (
  key: string,
  label: string,
  min: number,
  max: number,
  step: number,
  initial: number,
): SimulationControl => ({ key, label, min, max, step, initial })
const screen: SimulationControl = {
  key: 'screen',
  label: 'Tela do jogo',
  min: 0,
  max: 2,
  step: 1,
  initial: 0,
  options: ['Início', 'Jogando', 'Fim'],
}
export const LEARNING_SCENE_DEFINITIONS: Record<LearningScene, SceneDefinition> = {
  world: {
    title: 'Existir e aparecer',
    family: 'world',
    instruction: 'Crie o Dino. Compare com o desenho desligado e ligado.',
    success: 'O Dino pode existir nos bastidores antes de aparecer na tela!',
    controls: [
      toggle('created', 'Dino nos bastidores', 'Ainda não criei', 'Dino criado'),
      toggle('visible', 'Desenhar o Dino', 'Desligado', 'Ligado'),
    ],
  },
  layers: {
    title: 'Quem fica na frente?',
    family: 'world',
    instruction: 'Troque a ordem das figuras e veja onde o Dino aparece.',
    success: 'Sua ordem colocou o Dino na frente da floresta!',
    controls: [
      toggle('front', 'Última figura desenhada', 'Floresta', 'Dino'),
      toggle('clear', 'Limpar o quadro anterior', 'Desligado', 'Ligado', 1),
    ],
  },
  jump: {
    title: 'Um salto que volta',
    family: 'motion',
    instruction: 'Faça um salto sem gravidade. Ligue a gravidade e tente de novo.',
    success: 'Com gravidade, o Dino muda de direção e volta ao chão!',
    controls: [
      range('gravity', 'Gravidade', 0, 1.5, 0.1, 0),
      range('force', 'Força do salto', 3, 16, 1, 9),
    ],
  },
  'jump-sound': {
    title: 'O som acompanha o salto',
    family: 'events',
    instruction: 'Teste espaço no ar. Depois ligue o som ao pulo e experimente o toque no chão.',
    success: 'O som acompanha o salto, mesmo quando o controle muda!',
    controls: [
      toggle('source', 'O som escuta', 'Tecla espaço', 'Acontecimento: pulou'),
      toggle('airborne', 'Dino começa', 'No chão', 'No ar', 1),
      toggle('input', 'Controle usado', 'Espaço', 'Toque'),
    ],
  },
  spawn: {
    title: 'O ritmo dos cactos',
    family: 'population',
    instruction: 'Compare criar a cada quadro com esperar um intervalo entre os cactos.',
    success: 'O relógio abriu espaço entre os cactos!',
    controls: [
      toggle('timer', 'Criar cactos', 'A cada quadro', 'Com um relógio'),
      range('interval', 'Pausa entre cactos (s)', 0.2, 2, 0.1, 1.4),
    ],
  },
  cleanup: {
    title: 'A faxina dos invisíveis',
    family: 'population',
    instruction: 'Veja os cactos saírem da tela. Ligue a limpeza e compare o grupo guardado.',
    success: 'Agora os cactos que saem da tela também saem do grupo!',
    controls: [toggle('cleanup', 'Retirar do grupo ao sair da tela', 'Desligado', 'Ligado')],
  },
  'game-state': {
    title: 'O relógio espera a partida',
    family: 'events',
    instruction: 'Coloque o relógio dentro de “se jogando”. Teste no início e na partida.',
    success: 'O relógio espera no início e funciona durante a partida!',
    controls: [
      screen,
      toggle('guarded', 'Relógio dentro de “se jogando”', 'Fora da condição', 'Dentro da condição'),
    ],
  },
  controls: {
    title: 'Uma dica que funciona',
    family: 'events',
    instruction: 'A tela promete um toque. Teste e ajuste o controle para cumprir essa promessa.',
    success: 'Seu convite funciona com tecla e toque!',
    controls: [
      toggle('touch', 'Começar a partida com', 'Só Enter', 'Tecla ou toque'),
      toggle('input', 'Experimentar', 'Enter', 'Toque', 1),
    ],
  },
  restart: {
    title: 'Jogar e recomeçar',
    family: 'events',
    instruction: 'Provoque a batida. Conecte o reinício para jogar outra partida.',
    success: 'Você completou o ciclo: jogar, perder e começar outra vez!',
    controls: [toggle('restart', 'Depois da batida', 'Fica no fim', 'Pode recomeçar')],
  },
  hitbox: {
    title: 'A área da batida',
    family: 'collision',
    instruction: 'Mude a área do Dino e aproxime o cacto. Compare quando eles encostam.',
    success: 'Você comparou o desenho com a área que decide a batida!',
    controls: [
      range('scale', 'Tamanho da área do Dino', 0.4, 1.4, 0.1, 1),
      range('distance', 'Distância até o cacto', 10, 160, 5, 50),
    ],
  },
  score: {
    title: 'Pontos na hora certa',
    family: 'events',
    instruction: 'Proteja o placar com “se jogando”. Teste as três telas.',
    success: 'Seu placar conta durante a partida e espera nas outras telas!',
    controls: [screen, toggle('guarded', 'Somar pontos', 'Em qualquer tela', 'Só se jogando')],
  },
  random: {
    title: 'Surpresas dentro da faixa',
    family: 'speed',
    instruction:
      'Experimente os resultados dos sorteios. Mude primeiro o nascimento, depois a velocidade.',
    success: 'Cada sorteio muda o cacto dentro da faixa que você escolheu!',
    controls: [
      range('position', 'Nascimento sorteado entre 500 e 560', 500, 560, 10, 500),
      range('sample', 'Sorteio inteiro entre 0 e 1', 0, 1, 1, 0),
    ],
  },
  acceleration: {
    title: 'Acelerar com um limite',
    family: 'speed',
    instruction: 'Avance até a base chegar a −9. Avance mais uma vez e veja o sorteio separado.',
    success: 'A base parou em −9. O sorteio ainda pode deixar o novo cacto mais rápido!',
    controls: [
      range('ticks', 'Passos do relógio (5 s cada)', 0, 6, 1, 0),
      toggle('limited', 'Limitar a base em −9', 'Sem limite', 'Com limite', 1),
      range('sample', 'Sorteio inteiro descontado da base', 0, 1, 1, 1),
    ],
  },
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function parameter(values: Record<string, number>, key: string): number {
  const value = values[key]
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`Missing simulation parameter: ${key}`)
  return value
}

export function isLearningScene(value: unknown): value is LearningScene {
  return typeof value === 'string' && LEARNING_SCENES.some((scene) => scene === value)
}

export function isSimulationParameters(
  scene: LearningScene,
  value: unknown,
  partial = false,
): value is Record<string, number> {
  if (!record(value)) return false
  const controls = LEARNING_SCENE_DEFINITIONS[scene].controls
  return (
    (partial || controls.every((control) => control.key in value)) &&
    Object.entries(value).every(([key, number]) => {
      const control = controls.find((candidate) => candidate.key === key)
      return (
        control !== undefined &&
        typeof number === 'number' &&
        Number.isFinite(number) &&
        number >= control.min &&
        number <= control.max &&
        Math.abs(
          (number - control.min) / control.step - Math.round((number - control.min) / control.step),
        ) < 0.00001
      )
    })
  )
}

export function isSimulationActivity(value: unknown): value is SimulationActivity {
  return (
    record(value) &&
    value.type === 'simulation' &&
    value.version === 1 &&
    isLearningScene(value.scene) &&
    (value.parameters === undefined || isSimulationParameters(value.scene, value.parameters, true))
  )
}

export function initialSimulationParameters(activity: SimulationActivity): Record<string, number> {
  return Object.fromEntries(
    LEARNING_SCENE_DEFINITIONS[activity.scene].controls.map((control) => [
      control.key,
      activity.parameters?.[control.key] ?? control.initial,
    ]),
  )
}

export function readSimulationParameters(
  activity: SimulationActivity,
  answers: LearningAnswers,
): Record<string, number> {
  return isSimulationParameters(activity.scene, answers.simulation)
    ? answers.simulation
    : initialSimulationParameters(activity)
}

/** A trial is a bounded snapshot of a configuration the learner ran, not a claim of mastery. */
export function simulationTrials(
  activity: SimulationActivity,
  answers: LearningAnswers,
): Record<string, number>[] {
  if (!Array.isArray(answers.simulationTrials) || answers.simulationTrials.length > 100) return []
  const trials: Record<string, number>[] = []
  for (const encoded of answers.simulationTrials) {
    try {
      const value: unknown = JSON.parse(encoded)
      if (!isSimulationParameters(activity.scene, value)) return []
      trials.push(value)
    } catch {
      return []
    }
  }
  return trials
}

export function recordSimulationTrial(
  activity: SimulationActivity,
  answers: LearningAnswers,
  parameters: Record<string, number>,
): LearningAnswers {
  if (!isSimulationParameters(activity.scene, parameters)) return answers
  const trial = JSON.stringify(parameters)
  const existing = simulationTrials(activity, answers).map((value) => JSON.stringify(value))
  return {
    ...answers,
    simulation: parameters,
    simulationTrials: [...new Set([...existing, trial])].slice(-100),
  }
}

export interface SimulationGoal {
  id: string
  label: string
  complete: boolean
}

export function simulationGoals(
  activity: SimulationActivity,
  answers: LearningAnswers,
): SimulationGoal[] {
  const trials = simulationTrials(activity, answers)
  const some = (test: (parameters: Record<string, number>) => boolean) => trials.some(test)
  const goal = (id: string, label: string, complete: boolean): SimulationGoal => ({
    id,
    label,
    complete,
  })
  switch (activity.scene) {
    case 'world':
      return [
        goal(
          'hidden',
          'Teste o Dino criado, com o desenho desligado.',
          some((p) => parameter(p, 'created') === 1 && parameter(p, 'visible') === 0),
        ),
        goal(
          'visible',
          'Ligue o desenho e teste novamente.',
          some((p) => parameter(p, 'created') === 1 && parameter(p, 'visible') === 1),
        ),
      ]
    case 'layers':
      return [
        goal(
          'behind',
          'Teste a floresta por cima do Dino.',
          some((p) => parameter(p, 'front') === 0),
        ),
        goal(
          'front',
          'Coloque o Dino por cima e limpe cada quadro.',
          some((p) => parameter(p, 'front') === 1 && parameter(p, 'clear') === 1),
        ),
      ]
    case 'jump':
      return [
        goal(
          'zero',
          'Faça um salto com a gravidade em zero.',
          some((p) => parameter(p, 'gravity') === 0),
        ),
        goal(
          'gravity',
          'Ligue a gravidade e acompanhe a volta ao chão.',
          some((p) => parameter(p, 'gravity') > 0),
        ),
      ]
    case 'jump-sound':
      return [
        goal(
          'key',
          'Ligue o som à tecla e teste espaço com o Dino no ar.',
          some(
            (p) =>
              parameter(p, 'source') === 0 &&
              parameter(p, 'airborne') === 1 &&
              parameter(p, 'input') === 0,
          ),
        ),
        goal(
          'jump',
          'Ligue o som ao pulo e teste o toque com o Dino no chão.',
          some(
            (p) =>
              parameter(p, 'source') === 1 &&
              parameter(p, 'airborne') === 0 &&
              parameter(p, 'input') === 1,
          ),
        ),
      ]
    case 'spawn':
      return [
        goal(
          'frames',
          'Crie um cacto a cada quadro.',
          some((p) => parameter(p, 'timer') === 0),
        ),
        goal(
          'timer',
          'Experimente o relógio entre os nascimentos.',
          some((p) => parameter(p, 'timer') === 1),
        ),
      ]
    case 'cleanup':
      return [
        goal(
          'kept',
          'Veja o grupo sem a limpeza.',
          some((p) => parameter(p, 'cleanup') === 0),
        ),
        goal(
          'removed',
          'Ligue a limpeza e acompanhe o grupo.',
          some((p) => parameter(p, 'cleanup') === 1),
        ),
      ]
    case 'game-state':
      return [
        goal(
          'unguarded',
          'Teste o relógio fora da condição, na tela de início.',
          some((p) => parameter(p, 'screen') === 0 && parameter(p, 'guarded') === 0),
        ),
        goal(
          'waiting',
          'Proteja o relógio e teste a tela de início.',
          some((p) => parameter(p, 'screen') === 0 && parameter(p, 'guarded') === 1),
        ),
        goal(
          'playing',
          'Com a proteção ligada, teste a tela jogando.',
          some((p) => parameter(p, 'screen') === 1 && parameter(p, 'guarded') === 1),
        ),
      ]
    case 'controls':
      return [
        goal(
          'blocked',
          'Teste o toque quando só Enter é aceito.',
          some((p) => parameter(p, 'input') === 1 && parameter(p, 'touch') === 0),
        ),
        goal(
          'touch',
          'Aceite tecla ou toque e experimente o toque.',
          some((p) => parameter(p, 'input') === 1 && parameter(p, 'touch') === 1),
        ),
        goal(
          'keyboard',
          'Experimente também o Enter.',
          some((p) => parameter(p, 'input') === 0 && parameter(p, 'touch') === 1),
        ),
      ]
    case 'restart':
      return [
        goal(
          'end',
          'Veja o que acontece sem o reinício.',
          some((p) => parameter(p, 'restart') === 0),
        ),
        goal(
          'again',
          'Ligue o reinício e complete outra rodada.',
          some((p) => parameter(p, 'restart') === 1),
        ),
      ]
    case 'hitbox':
      return [
        goal(
          'sizes',
          'Compare dois tamanhos da área do Dino.',
          new Set(trials.map((p) => parameter(p, 'scale'))).size >= 2,
        ),
        goal(
          'contact',
          'Aproxime o cacto até as áreas encostarem.',
          some((p) => parameter(p, 'distance') <= 24 * parameter(p, 'scale') + 18),
        ),
        goal(
          'apart',
          'Afaste o cacto até separar as áreas.',
          some((p) => parameter(p, 'distance') > 24 * parameter(p, 'scale') + 18),
        ),
      ]
    case 'score':
      return [0, 1, 2].map((value) =>
        goal(
          `screen-${value}`,
          `Com “só se jogando”, teste a tela ${screen.options?.[value]?.toLowerCase()}.`,
          some((p) => parameter(p, 'guarded') === 1 && parameter(p, 'screen') === value),
        ),
      )
    case 'random':
      return [
        goal(
          'samples',
          'Compare duas velocidades mantendo o mesmo nascimento.',
          trials.some((a) =>
            trials.some(
              (b) =>
                parameter(a, 'sample') !== parameter(b, 'sample') &&
                parameter(a, 'position') === parameter(b, 'position'),
            ),
          ),
        ),
        goal(
          'positions',
          'Compare dois nascimentos mantendo a mesma velocidade.',
          trials.some((a) =>
            trials.some(
              (b) =>
                parameter(a, 'position') !== parameter(b, 'position') &&
                parameter(a, 'sample') === parameter(b, 'sample'),
            ),
          ),
        ),
      ]
    case 'acceleration':
      return [
        goal(
          'limit',
          'Com o limite ligado, teste quatro passos do relógio.',
          some((p) => parameter(p, 'limited') === 1 && parameter(p, 'ticks') === 4),
        ),
        goal(
          'after',
          'Avance mais um passo com o limite ligado.',
          some((p) => parameter(p, 'limited') === 1 && parameter(p, 'ticks') > 4),
        ),
        goal(
          'variation',
          'No limite, experimente um sorteio maior que zero.',
          some(
            (p) =>
              parameter(p, 'limited') === 1 &&
              parameter(p, 'ticks') >= 4 &&
              parameter(p, 'sample') > 0,
          ),
        ),
      ]
  }
}

export function evaluateSimulation(
  activity: SimulationActivity,
  answers: LearningAnswers,
): LearningResult {
  const goals = simulationGoals(activity, answers)
  const missing = goals.find((goal) => !goal.complete)
  return {
    participated: simulationTrials(activity, answers).length > 0,
    passed: missing === undefined,
    feedback: missing?.label ?? LEARNING_SCENE_DEFINITIONS[activity.scene].success,
    verifiedBy: 'client',
    evidence: 'exploration',
  }
}

export interface SimulationFrame {
  dinoY: number
  dinoVisible: boolean
  dinoFront: boolean
  cacti: { id: string; x: number }[]
  stored: number
  points: number
  screen: number
  sound: boolean
  base: number
  velocity: number
  collision: boolean
  caption: string
}

/** The renderer and the explanation use the same small, deterministic model. */
export function simulationFrame(
  scene: LearningScene,
  p: Record<string, number>,
  progress: number,
): SimulationFrame {
  const t = Math.max(0, Math.min(1, progress))
  const frame: SimulationFrame = {
    dinoY: 0,
    dinoVisible: true,
    dinoFront: true,
    cacti: [],
    stored: 0,
    points: 0,
    screen: 1,
    sound: false,
    base: -5,
    velocity: -5,
    collision: false,
    caption: '',
  }
  switch (scene) {
    case 'world':
      frame.dinoVisible = parameter(p, 'created') === 1 && parameter(p, 'visible') === 1
      frame.stored = parameter(p, 'created')
      frame.caption =
        parameter(p, 'created') === 0
          ? 'Ainda não há Dino nos bastidores.'
          : parameter(p, 'visible') === 0
            ? 'O Dino existe, mas seu desenho está desligado.'
            : 'O mesmo Dino agora aparece na tela.'
      break
    case 'layers':
      frame.dinoFront = parameter(p, 'front') === 1
      frame.caption =
        parameter(p, 'front') === 0
          ? 'A floresta foi desenhada por último e cobre o Dino.'
          : 'O Dino foi desenhado por último e aparece na frente.'
      break
    case 'jump': {
      const duration =
        parameter(p, 'gravity') > 0 ? (2 * parameter(p, 'force')) / parameter(p, 'gravity') : 50
      const time = duration * t
      frame.dinoY = Math.max(
        0,
        parameter(p, 'force') * time - (parameter(p, 'gravity') * time * time) / 2,
      )
      frame.caption =
        parameter(p, 'gravity') === 0
          ? 'Sem gravidade, o Dino continua subindo.'
          : t >= 1
            ? 'A gravidade trouxe o Dino de volta ao chão.'
            : 'O salto sobe, muda de direção e volta.'
      break
    }
    case 'jump-sound':
      frame.dinoY = parameter(p, 'airborne') === 1 ? 70 : Math.sin(t * Math.PI) * 100
      frame.sound =
        t > 0 &&
        (parameter(p, 'source') === 0
          ? parameter(p, 'input') === 0
          : parameter(p, 'airborne') === 0)
      frame.caption =
        parameter(p, 'airborne') === 1
          ? frame.sound
            ? 'Tocou som, mas não aconteceu outro salto.'
            : 'Sem um novo salto, o som espera.'
          : frame.sound
            ? 'O salto aconteceu e o som acompanhou!'
            : 'O toque fez pular, mas o som só escutava espaço.'
      break
    case 'spawn':
    case 'cleanup': {
      const seconds = 6 * t
      const interval =
        scene === 'spawn' ? (parameter(p, 'timer') === 1 ? parameter(p, 'interval') : 1 / 30) : 0.6
      const born = Math.floor(seconds / interval)
      const alive = Math.min(born, Math.ceil(3 / interval))
      frame.stored = scene === 'cleanup' && parameter(p, 'cleanup') === 1 ? alive : born
      frame.cacti = Array.from({ length: Math.min(alive, 16) }, (_, i) => ({
        id: `cactus-${born - i}`,
        x: 425 - ((seconds - (born - i) * interval) / 3) * 480,
      }))
      frame.caption =
        scene === 'spawn'
          ? `${born} cactos criados. ${parameter(p, 'timer') === 1 ? 'O intervalo deixa espaço para passar.' : 'A cada quadro nasce outro cacto!'}`
          : `${alive} na tela · ${frame.stored} no grupo. ${parameter(p, 'cleanup') === 1 ? 'Quem sai também deixa o grupo.' : 'Os invisíveis continuam guardados.'}`
      break
    }
    case 'game-state':
    case 'score': {
      const enabled = parameter(p, 'guarded') === 0 || parameter(p, 'screen') === 1
      frame.screen = parameter(p, 'screen')
      frame.points = enabled ? Math.floor(t * 5) : 0
      frame.cacti =
        scene === 'game-state' && enabled && t > 0
          ? [
              { id: 'first', x: 430 - t * 300 },
              { id: 'second', x: 540 - t * 300 },
            ]
          : []
      frame.caption = enabled
        ? parameter(p, 'screen') === 1
          ? 'O relógio trabalha durante a partida.'
          : 'O relógio está trabalhando fora da partida!'
        : 'O relógio espera: esta tela não é jogando.'
      break
    }
    case 'controls':
      frame.screen = t > 0 && (parameter(p, 'input') === 0 || parameter(p, 'touch') === 1) ? 1 : 0
      frame.caption =
        frame.screen === 1
          ? 'O controle iniciou a partida!'
          : 'A tela prometeu toque, mas este controle só aceita Enter.'
      break
    case 'restart':
      frame.screen = t < 0.15 ? 0 : t < 0.6 || (t >= 0.9 && parameter(p, 'restart') === 1) ? 1 : 2
      frame.collision = t >= 0.6 && frame.screen === 2
      frame.cacti =
        frame.screen === 1
          ? [{ id: t < 0.6 ? 'first-run' : 'restarted', x: 430 - (t < 0.6 ? t : t - 0.9) * 540 }]
          : []
      frame.caption =
        t >= 0.9 && parameter(p, 'restart') === 1
          ? 'Uma nova partida começou!'
          : frame.screen === 2
            ? 'A partida terminou. Sem reinício, ela fica aqui.'
            : 'Início → jogando → fim → outra tentativa.'
      break
    case 'hitbox':
      frame.cacti = [{ id: 'movable', x: 110 + parameter(p, 'distance') }]
      frame.collision = parameter(p, 'distance') <= 24 * parameter(p, 'scale') + 18
      frame.caption = frame.collision
        ? 'As áreas encostaram: o jogo detecta a batida.'
        : 'As áreas estão separadas: ainda não houve batida.'
      break
    case 'random':
      frame.velocity = -5 - parameter(p, 'sample')
      frame.cacti = [
        {
          id: 'sample',
          x: parameter(p, 'position') - t * Math.abs(frame.velocity) * 42,
        },
      ]
      frame.caption = `Nasce em x ${parameter(p, 'position')} · vx ${frame.velocity}. Quanto mais negativo, mais anda para a esquerda.`
      break
    case 'acceleration':
      frame.base =
        parameter(p, 'limited') === 1
          ? Math.max(-9, -5 - parameter(p, 'ticks'))
          : -5 - parameter(p, 'ticks')
      frame.velocity = frame.base - parameter(p, 'sample')
      frame.cacti = [
        { id: 'new', x: 430 - t * Math.abs(frame.velocity) * 30 },
        { id: 'previous', x: 280 - t * 5 * 30 },
      ]
      frame.caption = `Base ${frame.base} · sorteio ${parameter(p, 'sample')} · novo cacto: vx ${frame.velocity}. Os cactos anteriores mantêm a velocidade recebida.`
      break
  }
  return frame
}
