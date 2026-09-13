import { isSceneAction, type SceneAction, type SceneId } from './actions'
import {
  cloneScene,
  initialScene,
  observe,
  type SceneStart,
  type SceneState,
  sceneContact,
} from './state'

/**
 * A transição da cena: `(início, estado, ação) → estado novo`. Pura e imutável.
 *
 * É o ÚNICO motor de mundo do sistema — a demonstração e a experimentação passam pelas
 * mesmas regras. O que muda entre elas é de onde as ações vêm (do roteiro ou da criança) e
 * como a evidência é colhida, nunca a física.
 *
 * ⚠️ Ação ilegal para a cena é um no-op silencioso, não um erro: um roteiro antigo ou um
 * pacote adulterado não derruba a aula da criança no meio.
 */
export function stepScene(
  start: SceneStart,
  previous: SceneState,
  action: SceneAction,
): SceneState {
  if (!isSceneAction(action, start.scene)) return previous
  const s = cloneScene(previous)
  s.evidence.actions = previous.evidence.actions + 1
  const scene = start.scene

  switch (action.type) {
    case 'create':
      if (!s.world.created) {
        s.world.created = true
        observe(
          s,
          s.world.drawn ? 'visible' : 'hidden',
          s.world.drawn
            ? 'O Dino foi criado e aparece na tela.'
            : 'O Dino existe nos bastidores, sem desenho na tela.',
        )
      }
      break

    case 'connect':
      switch (action.port) {
        case 'draw':
          s.world.drawn = action.enabled
          if (s.world.created)
            observe(
              s,
              s.world.drawn ? 'visible' : 'hidden',
              s.world.drawn
                ? 'O mesmo Dino agora aparece na tela.'
                : 'O Dino continua existindo sem aparecer.',
            )
          break
        case 'gravity':
          s.flight.gravity = action.enabled
          s.flight.y = 0
          s.flight.time = null
          s.caption = 'Dino de volta à posição inicial. Repita o mesmo salto para comparar.'
          break
        case 'sound':
          s.sound.onJump = action.enabled
          s.caption = s.sound.onJump
            ? 'O fio do som escuta o acontecimento Pulou.'
            : 'O fio do som escuta a tecla Espaço.'
          break
        case 'timer':
          s.crowd.timer = action.enabled
          resetTrack(s)
          s.caption = 'A pista recomeça vazia para comparar o mesmo tempo.'
          break
        case 'cleanup':
          s.crowd.cleanup = action.enabled
          break
        case 'condition':
          if (s.match.guarded !== action.enabled) s.match.scoreIdle = 0
          s.match.guarded = action.enabled
          break
        case 'touch':
          s.match.touch = action.enabled
          break
        case 'restart':
          s.match.restartConnected = action.enabled
          break
        case 'limit':
          s.speed.limited = action.enabled
          if (s.speed.limited) s.speed.base = Math.max(-9, s.speed.base)
          break
      }
      break

    case 'layer':
      // Observa dos DOIS lados da troca: a criança precisa ver o estado que sai e o que entra.
      observeLayer(s)
      s.world.front = action.front
      observeLayer(s)
      break

    case 'jump': {
      const jumped = s.flight.time === null
      const sounded = scene === 'jump-sound' && (s.sound.onJump ? jumped : action.input === 'key')
      if (sounded) s.sound.count++
      if (jumped) {
        s.flight.time = 0
        s.flight.atForce = s.flight.force
        s.flight.atGravity = s.flight.gravity
        s.flight.peak = 0
        s.sound.jumps++
        s.caption = sounded ? 'Pulou! O som acompanhou.' : 'O impulso iniciou o salto.'
      } else
        s.caption = sounded
          ? 'Som! Mas não aconteceu outro salto.'
          : 'O Dino já está no ar. Não aconteceu outro salto.'
      if (scene === 'jump-sound') {
        if (!jumped && sounded) observe(s, 'false-sound', 'A tecla fez som, mesmo sem outro salto.')
        if (!jumped && !sounded && s.sound.onJump)
          observe(s, 'quiet-air', 'Sem novo salto, o som esperou.')
        if (jumped && sounded && s.sound.onJump)
          observe(
            s,
            action.input === 'key' ? 'key-sound' : 'tap-sound',
            action.input === 'key' ? 'Salto por Espaço com som.' : 'Salto por toque com som.',
          )
      }
      break
    }

    case 'impulse':
      s.flight.force = action.force
      s.caption = 'A seta mudou o impulso do próximo salto.'
      break

    case 'advance': {
      advanceFlight(s, scene, action.seconds)
      s.crowd.elapsed += action.seconds
      if (scene === 'spawn' || scene === 'cleanup' || scene === 'game-state')
        advanceCrowd(s, scene, action.seconds)
      if (scene === 'score') advanceScore(s, action.seconds)
      if (scene === 'random' || scene === 'acceleration')
        for (const c of s.crowd.cacti) c.x += c.velocity * action.seconds * 30
      break
    }

    case 'move':
      s.contact.distance = action.distance
      if (scene === 'hitbox')
        observe(
          s,
          sceneContact(s.contact) ? 'contact' : 'separate',
          sceneContact(s.contact) ? 'As áreas encostaram: batida!' : 'As áreas estão separadas.',
        )
      else if (s.match.screen === 'playing' && sceneContact(s.contact)) {
        s.match.screen = 'end'
        observe(s, 'ended', 'O cacto encostou e a partida terminou.')
      }
      break

    case 'resize': {
      const before = sceneContact(s.contact)
      observe(s, 'area-before', 'Antes: esta área, com o cacto nesta posição.', false)
      s.contact.width = action.width
      const after = sceneContact(s.contact)
      observe(
        s,
        after ? 'contact' : 'separate',
        after ? 'A área nova encostou no cacto.' : 'A área nova não encosta no cacto.',
      )
      if (before !== after) {
        // O contraste só ensina se o "antes" for o da largura ANTERIOR. Refaz o retrato com a
        // medida antiga, em vez de guardar um que já nasceu com a largura nova.
        s.evidence.observations = s.evidence.observations.filter(
          (o) => o.id !== 'area-before' && o.id !== 'area-contrast',
        )
        const old = cloneScene(s)
        old.contact.width = previous.contact.width
        observe(old, 'area-before', 'Antes: mesma posição, outra área.', false)
        const snapshot = old.evidence.observations.find((o) => o.id === 'area-before')
        if (snapshot) s.evidence.observations.push(snapshot)
        observe(s, 'area-contrast', 'A posição e o desenho ficaram iguais. A área mudou a batida.')
      }
      break
    }

    case 'start':
      if (s.match.screen !== 'start') break
      if (scene === 'controls' && action.input === 'tap' && !s.match.touch) {
        observe(s, 'missing-touch', 'O convite prometeu toque, mas falta conectar esse controle.')
        break
      }
      s.match.screen = 'playing'
      s.match.scoreIdle = 0
      if (scene === 'controls' && s.match.touch)
        observe(
          s,
          action.input === 'key' ? 'start-key' : 'start-tap',
          action.input === 'key' ? 'Enter iniciou a partida.' : 'O toque iniciou a partida.',
        )
      else s.caption = 'A partida começou.'
      break

    case 'collide':
      if (s.match.screen === 'playing') {
        s.match.screen = 'end'
        s.match.scoreIdle = 0
        s.contact.distance = 25
        if (scene === 'restart') observe(s, 'ended', 'O cacto encostou: fim da partida.')
        else s.caption = 'Fim da partida. Confira se os pontos ficam parados.'
      }
      break

    case 'home':
      if (s.match.screen !== 'start') s.match.scoreIdle = 0
      s.match.screen = 'start'
      s.caption = 'De volta ao início. O placar foi preservado.'
      break

    case 'restart':
      if (s.match.screen === 'end' && s.match.restartConnected) {
        s.match.screen = 'playing'
        s.match.points = 0
        s.contact.distance = 240
        resetTrack(s)
        observe(s, 'restarted', 'Nova partida: pontos zerados e cacto de volta ao começo.')
      } else s.caption = 'A ligação de Jogar de novo ainda não inicia outra partida.'
      break

    case 'interval':
      s.crowd.interval = action.seconds
      resetTrack(s)
      s.caption = 'Pista vazia novamente. Compare o mesmo passo do relógio.'
      break

    case 'clock': {
      const before = s.speed.base
      s.speed.base = s.speed.limited ? Math.max(-9, s.speed.base - 1) : s.speed.base - 1
      s.speed.ticks++
      s.caption = `Base do próximo cacto: ${s.speed.base}. As setas dos antigos continuam iguais.`
      if (s.speed.limited && before === -9 && s.speed.base === -9)
        observe(s, 'base-limit', 'O relógio avançou, mas a base permaneceu em −9.')
      if (s.crowd.cacti.some((c) => c.velocity !== s.speed.base && c.velocity > s.speed.base))
        observe(s, 'old-speed', 'O cacto anterior guardou a velocidade recebida ao nascer.')
      break
    }

    case 'sample':
      sampleCactus(s, scene, action)
      break

    case 'hint':
      s.evidence.hints = Math.max(s.evidence.hints, action.level)
      break

    case 'reset':
      // Recomeçar o mundo NUNCA apaga o que a criança já descobriu.
      return {
        ...initialScene(start),
        evidence: s.evidence,
        caption: 'Experiência recomeçada. Suas descobertas foram guardadas.',
      }
  }
  return s
}

function observeLayer(s: SceneState): void {
  observe(
    s,
    s.world.front ? 'front' : 'covered',
    s.world.front
      ? 'Dino desenhado por último: aparece na frente.'
      : 'Floresta desenhada por último: cobre o Dino.',
  )
}

/** Pista vazia: o mesmo reset usado ao ligar o relógio, mudar o intervalo e recomeçar. */
function resetTrack(s: SceneState): void {
  s.crowd.remainder = 0
  s.crowd.born = 0
  s.crowd.removed = 0
  s.crowd.cacti = []
  s.crowd.elapsed = 0
}

/**
 * O salto, em segundos de modelo. As unidades seguem um modelo didático de 30 Hz
 * (g = 0,6 por tique) com posição analítica — a duração da animação nunca é esticada para
 * caber num tempo de reprodução escolhido.
 */
function advanceFlight(s: SceneState, scene: SceneId, seconds: number): void {
  if (s.flight.time === null) return
  s.flight.time += seconds
  const t = s.flight.time * 30
  const g = s.flight.atGravity ? 0.6 : 0
  s.flight.y = Math.max(0, s.flight.atForce * t - 0.5 * g * t * t)
  const peakTime = g > 0 ? Math.min(t, s.flight.atForce / g) : t
  s.flight.peak = s.flight.atForce * peakTime - 0.5 * g * peakTime * peakTime
  if (scene === 'gravity' && !s.flight.atGravity && s.flight.y >= 120)
    observe(s, 'floating', 'Sem aplicar gravidade, o Dino continua subindo.')
  if (g > 0 && t >= (2 * s.flight.atForce) / g) {
    s.flight.y = 0
    s.flight.time = null
    if (scene === 'gravity') observe(s, 'landed', 'Com gravidade aplicada, voltou ao chão.')
    if (scene === 'impulse') {
      const first = s.evidence.observations.find((o) => o.id === 'first-height')
      if (!first) observe(s, 'first-height', 'Primeiro salto: guarde esta marca de altura.')
      else if (Math.abs(first.force - s.flight.atForce) >= 1)
        observe(s, 'other-height', 'Outro impulso, outra altura. A gravidade ficou igual.')
      else s.caption = 'Esse impulso alcançou a mesma altura. Mude a seta para comparar.'
    }
    if (scene === 'jump-sound') s.caption = 'De volta ao chão. Você pode saltar por outro controle.'
  }
}

/** Os cactos nascendo, andando e saindo. O deslocamento do nascimento preserva a distância
 *  entre eles mesmo quando o relógio avança dois segundos de uma vez. */
function advanceCrowd(s: SceneState, scene: SceneId, seconds: number): void {
  const bornBefore = s.crowd.born
  const active = scene !== 'game-state' || !s.match.guarded || s.match.screen === 'playing'
  const interval = scene === 'spawn' ? (s.crowd.timer ? s.crowd.interval : 1 / 30) : 0.6
  for (const c of s.crowd.cacti) c.x -= seconds * 100
  if (active) {
    const before = s.crowd.remainder
    const count = Math.floor((before + seconds + 1e-9) / interval)
    s.crowd.remainder = before + seconds - count * interval
    for (let i = 1; i <= count; i++) {
      s.crowd.born++
      s.crowd.cacti.push({
        id: s.crowd.born,
        x: 480 - (seconds - (i * interval - before)) * 100,
        velocity: -5,
      })
    }
  }
  if (s.crowd.cleanup) {
    const outside = s.crowd.born - s.crowd.removed - s.crowd.cacti.filter((c) => c.x >= 0).length
    s.crowd.removed += outside
    s.crowd.cacti = s.crowd.cacti.filter((c) => c.x >= 0)
    if (outside > 0 && scene === 'cleanup')
      observe(s, 'removed', 'A regra retirou automaticamente os cactos que saíram.')
  }
  if (scene === 'cleanup' && !s.crowd.cleanup && s.crowd.cacti.some((c) => c.x < 0))
    observe(s, 'invisible-stored', 'Saiu da tela, mas continua no grupo dos bastidores.')
  if (scene === 'spawn' && s.crowd.elapsed >= 0.1 && s.crowd.born > 1)
    observe(
      s,
      s.crowd.timer ? 'spaced' : 'every-frame',
      s.crowd.timer
        ? 'O intervalo abriu espaço entre os cactos.'
        : 'Em cada quadro nasce outro cacto.',
    )
  if (scene === 'game-state') {
    if (!s.match.guarded && s.match.screen === 'start' && s.crowd.born > bornBefore)
      observe(s, 'outside', 'O relógio criou cactos antes da partida.')
    if (s.match.guarded && s.match.screen === 'start')
      observe(s, 'waiting', 'No início, o relógio espera.')
    if (s.match.guarded && s.match.screen === 'playing' && s.crowd.born > bornBefore)
      observe(s, 'playing', 'Jogando, o relógio cria cactos.')
  }
  // Quem saiu de cena continua contado, não desenhado: milhares de SVGs não ensinam nada.
  s.crowd.cacti = s.crowd.cacti.filter((c) => c.x >= -480)
}

function advanceScore(s: SceneState, seconds: number): void {
  const enabled = !s.match.guarded || s.match.screen === 'playing'
  if (enabled) {
    s.match.clockRemainder += seconds
    const points = Math.floor(s.match.clockRemainder + 1e-9)
    s.match.points += points
    s.match.clockRemainder -= points
    if (s.match.guarded && s.match.screen === 'playing' && points > 0)
      observe(s, 'score-playing', 'Os pontos cresceram durante a partida.')
    else if (!s.match.guarded)
      s.caption = 'A soma está fora da condição: o placar cresce em qualquer tela.'
    return
  }
  s.match.scoreIdle += seconds
  if (s.match.scoreIdle + 1e-9 >= 0.5)
    observe(
      s,
      s.match.screen === 'start' ? 'score-start' : 'score-end',
      s.match.screen === 'start'
        ? 'No início, o placar ficou parado.'
        : 'No fim, o valor da rodada ficou guardado.',
    )
}

function sampleCactus(
  s: SceneState,
  scene: SceneId,
  action: Extract<SceneAction, { type: 'sample' }>,
): void {
  const sample = action.unit < 0.5 ? 0 : 1
  const x = action.kind === 'position' ? Math.round(500 + action.unit * 60) : 500
  const velocity =
    action.kind === 'velocity' ? (scene === 'acceleration' ? s.speed.base : -5) - sample : -5
  s.speed.samples.x = x
  s.speed.samples.velocity = velocity
  s.crowd.born++
  s.crowd.cacti.push({ id: s.crowd.born, x, velocity })
  s.crowd.cacti = s.crowd.cacti.slice(-12)
  s.caption = `${action.guided ? 'Exemplo guiado' : 'Sorteio'}: posição ${x}, velocidade ${velocity}.`
  if (scene === 'random') {
    if (action.kind === 'position') {
      if (!s.speed.samples.positions.includes(x)) s.speed.samples.positions.push(x)
      observe(s, `position-${Math.min(s.speed.samples.positions.length, 2)}`, s.caption, false)
      if (s.speed.samples.positions.length >= 2)
        observe(s, 'positions', 'Dois lugares de nascimento, sempre com velocidade −5.')
    } else {
      if (!s.speed.samples.velocities.includes(velocity)) s.speed.samples.velocities.push(velocity)
      observe(s, `velocity-${velocity}`, s.caption, false)
      if (s.speed.samples.velocities.length >= 2)
        observe(s, 'velocities', 'Base −5, descontando 0 ou 1: −5 e −6, da mesma posição.')
    }
  } else if (s.speed.limited && s.speed.base === -9 && velocity === -10)
    observe(s, 'variation-limit', 'A base parou em −9. Descontar 1 criou um cacto a −10.')
  s.speed.samples.positions = s.speed.samples.positions.slice(0, 2)
}
