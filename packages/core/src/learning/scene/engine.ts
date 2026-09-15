import {
  isSceneAction,
  SCENE_LIMITS,
  type SceneAction,
  type SceneId,
  STAGE_TARGET,
} from './actions'
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
/**
 * Por onde a cena COMEÇA nesta atividade: o mundo de fábrica com o caso do professor aplicado.
 *
 * ⚠️⚠️ A evidência é zerada depois das ações do caso. Elas passam pelo motor — é o que garante
 * que um caso seja um estado alcançável de verdade, e não uma struct escrita à mão —, e o motor
 * registra descobertas ao longo do caminho. Sem o zeramento, a criança abriria a cena com
 * metas já fechadas: uma experimentação inteira passaria antes do primeiro gesto dela.
 *
 * ⚠️ `reset` é recusado dentro do caso (`isSceneSetup`), senão ele voltaria para cá em laço.
 */
export function openScene(start: SceneStart): SceneState {
  const base = initialScene(start)
  const acoes = start.setup?.actions
  if (!acoes?.length) return base
  const montado = acoes.reduce((estado, acao) => stepScene(start, estado, acao), base)
  const aberto = { ...montado, evidence: initialScene(start).evidence, caption: '' }
  esquecerOGesto(aberto, base)
  return aberto
}

/**
 * Apaga a MEMÓRIA DO GESTO que as ações do caso deixaram para trás.
 *
 * ⚠️⚠️ Zerar a evidência não bastava. Vários grupos guardam "o que já foi feito" — o fantasma da
 * posição anterior, os x já visitados, quantas casas foram trocadas, de que lados a luz já veio —
 * e esses campos ALIMENTAM metas e desenhos. Um caso que leva a nave para (300, 40) deixava o
 * fantasma em (110, 150), o mundo de fábrica: a cena ABRIA com o rastro de um lugar onde a
 * criança nunca esteve, e a primeira vez que ela passasse pelo x de fábrica disparava "mesmo x,
 * altura diferente" comparando com uma posição que o caso tinha substituído.
 *
 * O mundo é do professor; a história é da criança, e ela começa vazia.
 */
function esquecerOGesto(aberto: SceneState, base: SceneState): void {
  // Os fantasmas e os "onde eu estava antes" passam a apontar para onde a cena ABRE.
  aberto.place = { ...aberto.place, fromX: aberto.place.x, fromY: aberto.place.y, visitedX: [] }
  aberto.drive = { ...aberto.drive, fromX: aberto.drive.x, fromY: aberto.drive.y, ticks: 0 }
  aberto.mirror = { ...aberto.mirror, painted: [], lastLine: aberto.mirror.line }
  // ⚠️ Daqui para baixo é tudo CONTADOR do que já foi feito, e cada um alimenta uma meta que
  // fala de repetição ("dois lugares", "todo quadro", "vários"). Deixar um de fora é deixar a
  // criança fechar num gesto o que devia levar vários — foi o achado do full review.
  aberto.stage = { ...aberto.stage, tried: base.stage.tried }
  // ⚠️ As duas raquetes vão junto com o contador de apertos: zerando só `presses`, o retrato
  // se contradizia na abertura ("a de cima andou 0 passo(s)" com ela em 200) e a meta da
  // comparação ficava mais cara do que é.
  aberto.input = {
    ...aberto.input,
    presses: base.input.presses,
    pressX: base.input.pressX,
    holdX: base.input.holdX,
    ticks: 0,
  }
  aberto.box = { ...aberto.box, changes: base.box.changes }
  aberto.hunt = { ...aberto.hunt, looked: [], ticks: 0 }
  aberto.grid = { ...aberto.grid, edits: base.grid.edits, written: [] }
  aberto.view = { ...aberto.view, wasLost: base.view.wasLost }
  aberto.speed = {
    ...aberto.speed,
    ticks: 0,
    samples: { ...aberto.speed.samples, positions: [], velocities: [] },
  }
  aberto.sheet = { ...aberto.sheet, cuts: [] }
  aberto.animation = { ...aberto.animation, swaps: base.animation.swaps, elapsed: 0 }
  aberto.weapon = { ...aberto.weapon, shots: base.weapon.shots, refused: base.weapon.refused }
  aberto.hit = { ...aberto.hit, damage: base.hit.damage, touching: base.hit.touching, away: false }
  aberto.blueprint = { ...aberto.blueprint, edits: base.blueprint.edits }
  aberto.render = { ...aberto.render, frames: base.render.frames, trail: base.render.trail }
  aberto.sound = { ...aberto.sound, count: base.sound.count, jumps: base.sound.jumps }
  aberto.lifeline = { ...aberto.lifeline, hits: base.lifeline.hits }
  // ⚠️⚠️ Os cactos que o caso deixou na pista SÃO o mundo, e os contadores falam DELES: zerar
  // só os números fazia `outside = born − removed − vivos` virar negativo, e a cena `cleanup`
  // — que existe para a criança comparar "na tela" com "nos bastidores" — abria com os dois
  // números se desmentindo ("-2 de 6 já saíram").
  aberto.crowd = { ...aberto.crowd, born: aberto.crowd.cacti.length, removed: 0 }
  aberto.walkPad = { ...aberto.walkPad, best: base.walkPad.best }
  aberto.sight = { ...aberto.sight, shotX: base.sight.shotX, shotY: base.sight.shotY }
  aberto.description = {
    ...aberto.description,
    heard: base.description.heard,
    heardEmpty: base.description.heardEmpty,
  }
  aberto.match = { ...aberto.match, scoreIdle: base.match.scoreIdle }
  aberto.nursery = { ...aberto.nursery, ticks: 0, created: base.nursery.created }
  aberto.brains = { ...aberto.brains, ticks: 0 }
  aberto.machines = { ...aberto.machines, elapsed: base.machines.elapsed }
  aberto.circles = { ...aberto.circles, touched: base.circles.touched }
  aberto.space = { ...aberto.space, moved: [] }
  aberto.orbit = { ...aberto.orbit, fewest: base.orbit.fewest, returned: base.orbit.returned }
  aberto.ray = { ...aberto.ray, hits: [] }
  aberto.ink = { ...aberto.ink, seen: [] }
  aberto.light = { ...aberto.light, sides: [] }
}

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
          // ⚠️ A MESMA porta com dois sentidos, por cena: em `score` e `game-state` ela é o
          // "só enquanto estiver jogando"; em `lives` é o fio que soma ponto. São a mesma
          // ideia (uma condição que guarda a ação), e dar nome novo a cada cena encheria a
          // bancada de fios que a criança nunca ligou.
          if (scene === 'lives') {
            s.lifeline.scoring = action.enabled
            s.caption = action.enabled
              ? 'O fio do ponto está ligado. Avance o relógio e olhe o placar.'
              : 'O fio do ponto saiu: o placar parou de subir.'
            break
          }
          if (s.match.guarded !== action.enabled) s.match.scoreIdle = 0
          s.match.guarded = action.enabled
          break
        case 'life':
          s.lifeline.onHit = action.enabled
          s.caption = action.enabled
            ? 'O fio da vida está ligado: a batida vai custar uma vida.'
            : 'Sem o fio da vida, bater não tira nada.'
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
        // ── Os fios do núcleo do Iniciante 2D ──────────────────────────────────────────────
        case 'loop':
          s.hunt.auto = action.enabled
          if (s.hunt.auto) {
            s.hunt.chosen = maisPerto(s.hunt.distances)
            s.hunt.looked = s.hunt.distances.map((_, i) => i + 1)
            observe(s, 'auto', 'Com o laço ligado, a escolha acompanha quem está mais perto', true)
          }
          s.caption = s.hunt.auto
            ? 'O laço percorre o grupo sozinho e fica com o mais perto.'
            : 'Sem o laço, quem escolhe é você — e é preciso olhar um por um.'
          break
        case 'camera':
          s.view.follow = action.enabled
          if (s.view.follow && s.view.wasLost)
            observe(s, 'follows', 'Com a câmera, o Dino voltou a caber na tela', true)
          s.caption = s.view.follow
            ? 'A câmera segue o Dino: a tela anda junto com ele.'
            : 'A câmera está parada. O Dino pode sair da tela.'
          break
        case 'aim':
          s.sight.chasing = action.enabled
          s.caption = s.sight.chasing
            ? 'A mira está ligada: o tiro vai para onde a seta aponta.'
            : 'A mira está desligada: o tiro sai sempre para o mesmo lado.'
          break
        case 'even':
          s.walkPad.even = action.enabled
          s.walkPad.best = 0
          s.caption = s.walkPad.even
            ? 'A correção está ligada: a diagonal passa a andar o mesmo que o reto.'
            : 'Sem correção: os dois passos da diagonal se somam.'
          break
        case 'recycle':
          s.nursery.recycling = action.enabled
          // ⚠️ O relógio do nascedouro recomeça ao mexer no fio: "o contador PAROU de crescer" só
          // é uma descoberta depois de alguns passos COM a reciclagem ligada. Sem zerar aqui, os
          // passos de antes contariam e a criança ganharia a meta no primeiro toque.
          s.nursery.ticks = 0
          s.caption = s.nursery.recycling
            ? 'O nascedouro passa a reaproveitar o corpo de quem saiu.'
            : 'Sem reciclagem: cada um que nasce é um corpo novo.'
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
      // O núcleo do Iniciante 2D: cada uma dessas cenas mostra o que o TEMPO faz com o estado.
      if (avancarNucleo(s, start.scene, action.seconds)) break
      if (start.scene === 'frames') {
        advanceFrames(s, action.seconds)
        break
      }
      if (start.scene === 'lives') {
        advanceLives(s, action.seconds)
        break
      }
      if (start.scene === 'draw-loop') {
        s.render.frames += 1
        if (!s.render.loop) {
          observe(s, 'frozen', 'Sem repetir o desenho, a tela congela', true)
          s.caption = 'O relógio andou e a tela continua igual: ninguém mandou desenhar de novo.'
          break
        }
        if (s.render.erase) {
          s.render.trail = 1
          observe(s, 'moving', 'Com os dois, o Dino se mexe', true)
          s.caption = 'Limpou e desenhou: um Dino só, num lugar novo. Isso é o movimento.'
          break
        }
        s.render.trail += 1
        if (s.render.trail >= 2) observe(s, 'trail', 'Sem limpar, fica rastro', true)
        s.caption = `Desenhou de novo sem limpar: ${s.render.trail} Dinos na tela.`
        break
      }
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
      if (scene === 'lives') {
        collideLives(s)
        break
      }
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

    /**
     * O endereço na tela. A descoberta é por EIXO, e só conta quando o outro ficou parado —
     * mexer nos dois ao mesmo tempo não diz qual deles levou o Dino para onde.
     */
    case 'place': {
      const { x: antesX, y: antesY } = s.place
      s.place.fromX = antesX
      s.place.fromY = antesY
      s.place.x = action.x
      s.place.y = action.y
      const dx = action.x - antesX
      const dy = action.y - antesY
      // ⚠️ A narração é aplicada NO FIM, depois dos `observe`: eles carimbam o `caption` com o
      // rótulo da meta, e sem isto a criança lia "Mesmo x, altura diferente" no lugar de
      // "y foi de 150 para 190: o Dino DESCEU" — o rótulo serve ao relatório do professor, a
      // narração serve a quem está mexendo.
      let narracao = ''
      if (dx !== 0 && dy === 0) {
        narracao =
          dx > 0
            ? `x foi de ${antesX} para ${action.x}: o Dino andou para a direita, na mesma altura.`
            : `x foi de ${antesX} para ${action.x}: o Dino andou para a esquerda, na mesma altura.`
        if (dx > 0) observe(s, 'right', 'x maior leva para a direita', true)
      } else if (dy !== 0 && dx === 0) {
        narracao =
          dy > 0
            ? `y foi de ${antesY} para ${action.y}: o Dino DESCEU, sem sair do lugar na largura.`
            : `y foi de ${antesY} para ${action.y}: o Dino subiu, sem sair do lugar na largura.`
        if (dy > 0) observe(s, 'down', 'y maior leva para baixo', true)
      } else if (dx !== 0 && dy !== 0) {
        narracao = `Mudaram os dois: o Dino foi para ${dx > 0 ? 'a direita' : 'a esquerda'} e para ${dy > 0 ? 'baixo' : 'cima'}.`
      }
      // "Mesmo x, altura diferente" é o que separa as duas coordenadas na cabeça dela: o
      // mesmo número da largura pode aparecer em alturas diferentes.
      if (s.place.visitedX.includes(action.x) && (dy !== 0 || antesY !== action.y))
        observe(s, 'same-x', 'Mesmo x, altura diferente', true)
      if (!s.place.visitedX.includes(action.x)) {
        s.place.visitedX.push(action.x)
        if (s.place.visitedX.length > 24) s.place.visitedX.shift()
      }
      if (narracao) s.caption = narracao
      break
    }

    /**
     * A tela e o limite dela.
     *
     * ⚠️ A descoberta do LIMITE é ligar a borda, não mexer no número: sem a moldura a cor do
     * fundo cobre a área inteira e a criança não tem como ver onde a tela acaba. É a mesma
     * ordem do roteiro da Aula 1 (preparar a tela e depois revelar a borda).
     */
    case 'stage': {
      const mudou = s.stage.width !== action.width || s.stage.height !== action.height
      s.stage.width = action.width
      s.stage.height = action.height
      if (mudou) {
        s.stage.tried += 1
        observe(s, 'resized', 'A tela mudou de tamanho junto com os números', true)
      }
      if (action.width === STAGE_TARGET.width && action.height === STAGE_TARGET.height)
        observe(
          s,
          'target',
          `Chegou na tela de ${STAGE_TARGET.width} por ${STAGE_TARGET.height}`,
          true,
        )
      s.caption = `Tela de ${action.width} por ${action.height}.${
        s.stage.border ? '' : ' Ligue a borda para ver onde ela acaba.'
      }`
      break
    }

    case 'border':
      s.stage.border = action.visible
      if (action.visible) observe(s, 'border-on', 'A borda mostra onde a tela acaba', true)
      s.caption = action.visible
        ? 'A moldura apareceu: é ali que o jogo acontece.'
        : 'Sem a moldura, a cor do fundo cobre tudo e o limite some.'
      break

    /**
     * O laço de desenho.
     *
     * ⚠️ As três descobertas são estados DIFERENTES do mesmo par de chaves, e cada uma só conta
     * quando o relógio anda: é o tempo passando que mostra a tela congelada, o rastro e o
     * movimento. Ligar a chave sem avançar não descobre nada — e é isso que faz a criança
     * avançar o relógio nas três situações em vez de só clicar.
     */
    case 'loop':
      s.render.loop = action.on
      s.render.trail = 0
      s.caption = action.on
        ? 'Agora o jogo desenha a cada quadro. Avance o relógio.'
        : 'O desenho a cada quadro está desligado. Avance o relógio e veja.'
      break

    case 'erase':
      s.render.erase = action.on
      s.render.trail = 0
      s.caption = action.on
        ? 'A limpeza está ligada: o quadro começa vazio. Avance o relógio.'
        : 'Sem limpar, o desenho de antes continua na tela. Avance o relógio.'
      break

    case 'describe':
      s.description.text = action.text
      s.caption = action.text
        ? 'A descrição está escrita. Ouça a tela para saber o que ela informa.'
        : 'A descrição ficou vazia de novo.'
      break

    /**
     * Ouvir a tela.
     *
     * ⚠️ O reconhecimento do objetivo e do controle é por PALAVRA, e é deliberadamente
     * generoso: ele existe para orientar a criança enquanto ela escreve, não para aprovar
     * ninguém. A conferência que vale continua sendo a do servidor, como nas outras cenas.
     */
    case 'listen': {
      const texto = s.description.text.trim()
      if (!texto) {
        s.description.heard = 'Tela do jogo. Imagem.'
        s.description.heardEmpty = true
        observe(s, 'heard-empty', 'Ouviu a tela sem descrição', true)
        s.caption = 'Foi só isso que a pessoa ouviu: o desenho não informa nada sozinho.'
        break
      }
      s.description.heard = `Tela do jogo. ${texto}`
      const alvo = texto.toLowerCase()
      const diz = (palavras: readonly string[]) => palavras.some((p) => alvo.includes(p))
      const objetivo = diz(OBJETIVO_PALAVRAS)
      const controle = diz(CONTROLE_PALAVRAS)
      if (objetivo) observe(s, 'says-goal', 'A frase diz o que fazer no jogo', true)
      if (controle) observe(s, 'says-control', 'A frase diz como se joga', true)
      s.caption =
        objetivo && controle
          ? 'Agora a descrição informa o objetivo e o controle.'
          : objetivo
            ? 'Ela já sabe o que fazer no jogo. Falta dizer como se joga.'
            : controle
              ? 'Ela já sabe qual é o controle. Falta dizer o que se faz no jogo.'
              : 'A pessoa ouviu a sua frase, mas ela ainda não diz o que fazer nem como jogar.'
      break
    }

    /**
     * Os dois quadros.
     *
     * ⚠️ Trocar de quadro NA MÃO é a descoberta que abre a cena: são dois desenhos inteiros, e
     * a criança precisa ver os dois parados antes de a troca automática juntá-los. Por isso a
     * meta só conta com a troca desligada: com ela ligada, quem trocou foi o relógio.
     */
    case 'frame': {
      const antes = s.animation.frame
      s.animation.frame = action.index
      if (!s.animation.playing && action.index !== antes)
        observe(s, 'two-drawings', 'São dois desenhos inteiros, um de cada vez', true)
      // ⚠️ No quadro 1 não há quadro anterior: é o que o roteiro do Pinta diz com todas as
      // letras, e a cena precisa dizer o mesmo em vez de mostrar um fantasma inventado.
      s.caption =
        scene === 'onion-skin' && action.index === 1 && s.animation.onion
          ? 'No quadro 1 não há quadro anterior para mostrar.'
          : `Quadro ${action.index} de 2 na tela.`
      break
    }

    case 'play':
      s.animation.playing = action.on
      s.animation.elapsed = 0
      s.caption = action.on
        ? 'A troca começou. Avance o relógio e olhe a tela.'
        : 'A troca parou: o quadro fica parado na tela.'
      break

    case 'rate':
      s.animation.rate = action.perSecond
      s.animation.elapsed = 0
      // ⚠️ As trocas contam a partir da velocidade ESCOLHIDA: as duas descobertas são "devagar dá
      // para ver os dois" e "rápido vira movimento", e sem zerar aqui a segunda vinha de graça
      // (bastava ter rodado rápido antes e baixar a velocidade para a primeira fechar na hora).
      s.animation.swaps = 0
      s.caption = `${action.perSecond} ${action.perSecond === 1 ? 'troca' : 'trocas'} por segundo.`
      break

    /**
     * O fantasma do quadro anterior.
     *
     * ⚠️ Ele é GUIA, não desenho: não entra na animação, e no quadro 1 não existe. As duas
     * frases vêm do roteiro da aula, e são o conceito inteiro desta cena.
     */
    case 'onion':
      s.animation.onion = action.on
      if (action.on && s.animation.frame === 2)
        observe(s, 'ghost-on', 'O fantasma mostra o quadro anterior por baixo', true)
      s.caption = !action.on
        ? 'Fantasma desligado: só o quadro de agora aparece.'
        : s.animation.frame === 2
          ? 'O fantasma fraquinho é o quadro 1. Ele é guia, não entra na animação.'
          : 'No quadro 1 não há quadro anterior para mostrar.'
      break

    case 'shift': {
      s.animation.shift = action.offset
      if (!s.animation.onion) observe(s, 'blind-move', 'Mexeu no quadro 2 sem ver o de antes', true)
      else if (action.offset >= PASSO_PARELHO.min && action.offset <= PASSO_PARELHO.max)
        observe(s, 'even-step', 'Com o fantasma, o passo entre os dois ficou parelho', true)
      s.caption = s.animation.onion
        ? `Passo de ${action.offset}, comparando com o fantasma.`
        : `Passo de ${action.offset}, no chute: o quadro 1 não está à vista.`
      break
    }

    case 'mirror':
      s.mirror.on = action.on
      s.mirror.line = action.line
      s.caption = action.on
        ? `Espelho ligado na linha ${action.line}.`
        : 'Espelho desligado: o que você pintar fica só de um lado.'
      break

    /**
     * O traço e o reflexo.
     *
     * ⚠️ O reflexo pode cair FORA do papel, e isso não é erro: é a resposta à pergunta "e se o
     * eixo ficar na beirada?". A cena diz o que aconteceu em vez de mover o eixo sozinha.
     */
    case 'paint': {
      pintar(s, action.column)
      const reflexo = 2 * s.mirror.line - 1 - action.column
      const dentro = reflexo >= 0 && reflexo <= 11 && reflexo !== action.column
      if (!s.mirror.on) {
        observe(s, 'one-side', 'Sem espelho, um traço é um traço só', true)
        s.caption = `Traço na coluna ${action.column}. Um traço, um lado.`
        break
      }
      if (dentro) {
        pintar(s, reflexo)
        if (s.mirror.lastLine !== 0 && s.mirror.lastLine !== s.mirror.line)
          observe(s, 'axis-decides', 'Mudou o eixo e o reflexo mudou de lugar', true)
        observe(s, 'two-sides', 'Com o espelho, um traço vira dois', true)
        s.caption = `Traço na coluna ${action.column} e reflexo na ${reflexo}.`
        // ⚠️ O eixo lembrado é o do último traço que REFLETIU de verdade. Guardar o de um reflexo
        // que caiu fora do papel faria a descoberta seguinte dizer "o reflexo mudou de lugar"
        // comparando com um reflexo que a criança nunca viu.
        s.mirror.lastLine = s.mirror.line
      } else s.caption = 'O reflexo caiu fora do papel: o eixo está muito na beirada.'
      break
    }

    /**
     * A lupa sobre as duas pedras. A terceira descoberta ("de longe parecem iguais") só conta
     * DEPOIS das outras duas: sem ter visto a diferença de perto, voltar para longe não diz nada.
     */
    case 'inspect': {
      s.pixels.kind = action.kind
      s.pixels.zoom = action.zoom
      const d = s.evidence.discoveries
      if (action.zoom >= PERTO && action.kind === 'pixel')
        observe(s, 'stairs', 'De perto, o pixel vira escadinha', true)
      else if (action.zoom >= PERTO && action.kind === 'vector')
        observe(s, 'smooth', 'De perto, o vetor continua liso', true)
      else if (action.zoom <= LONGE && d.includes('stairs') && d.includes('smooth'))
        observe(s, 'alike', 'De longe, as duas parecem iguais', true)
      else
        s.caption = `Lupa de ${action.zoom} na pedra de ${action.kind === 'pixel' ? 'pixel' : 'vetor'}.`
      break
    }

    case 'cut': {
      const nova = !s.sheet.cuts.includes(action.cell)
      s.sheet.cell = action.cell
      if (nova) s.sheet.cuts.push(action.cell)
      observe(s, 'cut', 'Cada pedaço da folha é um desenho inteiro', true)
      if (s.sheet.cuts.length >= 2)
        observe(s, 'two-cells', 'Dois pedaços diferentes, a mesma folha', true)
      s.caption = `Pedaço ${action.cell} de 4 recortado. A folha continua a mesma.`
      break
    }

    case 'sprite': {
      const antes = s.sheet.size
      s.sheet.size = action.size
      if (action.size !== antes)
        observe(s, 'size-apart', 'O tamanho no jogo mudou e a folha ficou igual', true)
      s.caption = `No jogo ele aparece com ${action.size} de altura. Na folha, nada mudou.`
      break
    }

    /* ── O núcleo do Iniciante 2D ───────────────────────────────────────────────────────── */
    case 'velocity': {
      s.drive.vx = action.vx
      s.drive.vy = action.vy
      s.caption =
        action.vx === 0 && action.vy === 0
          ? 'Velocidade zerada. Avance o relógio e veja se ele sai do lugar.'
          : // ⚠️ O sinal é o U+2212 do resto do conteúdo, não o hífen do teclado: as pistas e as
            // outras cenas escrevem "−9", e a criança lê os dois na mesma tela.
            `Velocidade ${sinal(action.vx)} para o lado e ${sinal(action.vy)} para baixo. Avance o relógio.`
      break
    }
    case 'press': {
      s.input.presses += 1
      s.input.pressX = Math.min(440, s.input.pressX + 20)
      observe(s, 'one-step', 'Apertar uma vez andou um passo', true)
      s.caption = `Apertou ${s.input.presses} vez(es): a de cima andou um passo por aperto.`
      break
    }
    case 'hold': {
      s.input.holding = action.on
      s.caption = action.on
        ? 'Segurando. Avance o relógio e veja a de baixo andar enquanto durar.'
        : 'Soltou. A de baixo parou onde estava.'
      break
    }
    case 'store': {
      s.box.value = action.value
      observe(s, 'stored', 'A caixa guardou um número', true)
      s.caption = `A caixa guarda ${action.value}.${s.box.shown ? '' : ' Ninguém está vendo isso ainda.'}`
      break
    }
    case 'change': {
      const antes = s.box.value
      s.box.value = Math.max(
        SCENE_LIMITS.boxValue.min,
        Math.min(SCENE_LIMITS.boxValue.max, s.box.value + action.by),
      )
      s.box.changes += 1
      // ⚠️ Mudar SEM estar na tela é a descoberta: o valor existe mesmo sem ninguém mostrar.
      // ⚠️ Mas ela só vale depois de a criança ter GUARDADO um número, que é a ordem que a
      // instrução pede ("guarde, mude sem mostrar, só depois ligue o mostrar"). A caixa nasce
      // desligada e com zero: sem esta condição, o primeiro toque em "somar 1" fechava a meta
      // antes de existir um valor para a tela esconder, e a cena não tinha ensinado nada.
      if (!s.box.shown && s.evidence.discoveries.includes('stored'))
        observe(s, 'changed-hidden', 'Mudou o valor sem estar na tela', true)
      s.caption = `${antes} ${action.by > 0 ? '+' : '−'} ${Math.abs(action.by)} = ${s.box.value}.`
      break
    }
    case 'show': {
      s.box.shown = action.on
      if (action.on) {
        // ⚠️ Irmã do `changed-hidden`, mesmo conserto: a caixa nasce com zero e fora da tela,
        // então "mostrar não mudou o valor guardado" caía sobre um valor que não existe.
        if (s.evidence.discoveries.includes('stored'))
          observe(s, 'shown', 'Mostrar não mudou o valor guardado', true)
      }
      s.caption = action.on
        ? `A tela passou a mostrar ${s.box.value}. O valor guardado continua o mesmo.`
        : 'A tela parou de mostrar. O valor continua guardado.'
      break
    }
    case 'look': {
      if (!s.hunt.looked.includes(action.id)) s.hunt.looked.push(action.id)
      if (s.hunt.looked.length === s.hunt.distances.length)
        observe(s, 'looked-all', 'Olhou todos do grupo antes de escolher', true)
      s.caption = `O ${action.id}º está a ${s.hunt.distances[action.id - 1]} de distância.`
      break
    }
    case 'choose': {
      s.hunt.chosen = action.id
      const perto = maisPerto(s.hunt.distances)
      if (action.id === perto && s.hunt.looked.length === s.hunt.distances.length)
        observe(s, 'nearest', 'Escolheu o mais perto depois de olhar todos', true)
      s.caption =
        action.id === perto
          ? `Escolheu o ${action.id}º, que é o mais perto agora.`
          : `Escolheu o ${action.id}º. O mais perto é o ${perto}º.`
      break
    }
    case 'define': {
      // ⚠️ Escrever o valor que já estava não é mudar a ficha, e o deslizante do palco chama o
      // `onChange` com o MESMO valor quando a criança bate no batente da faixa.
      const mudou =
        action.field === 'speed'
          ? s.blueprint.speed !== action.value
          : s.blueprint.life !== action.value
      if (action.field === 'speed') s.blueprint.speed = action.value
      else s.blueprint.life = action.value
      if (!mudou) {
        s.caption = `A ficha já estava com ${action.field === 'speed' ? 'velocidade' : 'vida'} ${action.value}.`
        break
      }
      s.blueprint.edits += 1
      if (s.blueprint.born >= 2)
        observe(s, 'all-change', 'Mudou a ficha e TODOS mudaram juntos', true)
      s.caption = `A ficha agora diz ${action.field === 'speed' ? 'velocidade' : 'vida'} ${action.value}. Os ${s.blueprint.born} que nasceram leem esta ficha.`
      break
    }
    case 'spawnOne': {
      s.blueprint.born += 1
      if (s.blueprint.born >= 3) observe(s, 'many', 'Nasceram vários do mesmo molde', true)
      s.caption = `Nasceu mais um. Agora são ${s.blueprint.born}, todos lendo a mesma ficha.`
      break
    }
    case 'walk': {
      s.view.heroX = action.x
      if (!s.view.follow && s.view.heroX > TELA_LARGURA) {
        s.view.wasLost = true
        observe(s, 'lost', 'Sem a câmera, o Dino saiu da tela', true)
      }
      if (s.view.follow && s.view.wasLost && s.view.heroX > TELA_LARGURA)
        observe(s, 'window', 'O mundo continua maior que a tela', true)
      s.caption =
        !s.view.follow && s.view.heroX > TELA_LARGURA
          ? `O Dino está em ${s.view.heroX}, e a tela acaba em ${TELA_LARGURA}. Ele sumiu.`
          : `O Dino está em ${s.view.heroX} do mundo, e continua à vista.`
      break
    }
    case 'approach': {
      if (scene === 'circle-collision') {
        s.circles.distance = Math.min(action.distance, SCENE_LIMITS.centers.max)
        conferirCirculos(s)
        break
      }
      s.hit.distance = action.distance
      s.caption = `Distância ${action.distance}. Avance o relógio e veja o que acontece com a vida.`
      break
    }
    case 'mode': {
      s.hit.mode = action.kind
      s.hit.damage = 0
      s.hit.touching = false
      s.caption =
        action.kind === 'ask'
          ? 'Agora o jogo PERGUNTA "está encostando?" em todo quadro.'
          : 'Agora o jogo espera o ACONTECIMENTO "acabou de encostar".'
      break
    }
    case 'shoot': {
      if (s.weapon.ready > 0) {
        s.weapon.refused += 1
        observe(s, 'waiting', 'Atirar durante a recarga não fez nada', true)
        s.caption = `Ainda recarregando: faltam ${s.weapon.ready.toFixed(1)}s.`
        break
      }
      s.weapon.shots += 1
      s.weapon.ready = s.weapon.seconds
      if (s.weapon.seconds > 0 && s.weapon.shots >= 2)
        observe(s, 'spaced', 'Com recarga, os tiros saem espaçados', true)
      s.caption =
        s.weapon.seconds > 0
          ? `Tiro ${s.weapon.shots}. Agora ele espera ${s.weapon.seconds}s.`
          : `Tiro ${s.weapon.shots}. Sem recarga, dá para atirar de novo na hora.`
      break
    }
    case 'recharge': {
      s.weapon.seconds = action.seconds
      s.weapon.ready = 0
      s.weapon.shots = 0
      s.weapon.refused = 0
      s.caption =
        action.seconds > 0
          ? `Recarga de ${action.seconds}s entre dois tiros.`
          : 'Sem recarga nenhuma: o tiro sai sempre que for pedido.'
      break
    }
    case 'target': {
      // ⚠️ Arrastar o alvo para onde ele já estava não vira a seta — e é o que o deslizante
      // manda quando a criança bate no batente da faixa.
      const moveu = s.sight.targetX !== action.x || s.sight.targetY !== action.y
      s.sight.targetX = action.x
      s.sight.targetY = action.y
      if (!moveu) {
        s.caption = `O alvo já estava em ${action.x}, ${action.y}.`
        break
      }
      observe(s, 'arrow', 'A seta virou junto com o alvo', true)
      s.caption = `O alvo está em ${action.x}, ${action.y}. Olhe para onde a seta aponta.`
      break
    }
    case 'direction': {
      s.walkPad.dx = action.x
      s.walkPad.dy = action.y
      s.caption =
        action.x !== 0 && action.y !== 0
          ? 'Nas duas setas ao mesmo tempo: é a diagonal.'
          : 'Numa seta só: é reto.'
      break
    }
    case 'paint-tile': {
      const linha = s.grid.rows[action.row]
      if (linha) {
        const antes = linha[action.col]
        s.grid.rows[action.row] =
          linha.slice(0, action.col) + action.tile + linha.slice(action.col + 1)
        if (antes !== action.tile) {
          s.grid.edits += 1
          const repetida = s.grid.written.includes(action.tile)
          // ⚠️⚠️ Guarda a LETRA, uma vez só — são três no alfabeto do mapa. Empilhando a cada
          // troca a lista crescia sem teto, e na 25ª casa o retrato passava a ser recusado pelo
          // próprio leitor (`readExperimentSession` devolvia null): a criança lia "esta
          // descoberta mudou, recomece" no meio de um mapa de 60 casas que a pista manda pintar.
          if (!repetida) s.grid.written.push(action.tile)
          observe(s, 'text-is-map', 'Mudou a letra e o desenho mudou junto', true)
          if (repetida) observe(s, 'same-letter', 'A mesma letra virou sempre a mesma coisa', true)
        }
      }
      s.caption = `A casa ${action.row + 1},${action.col + 1} agora é "${action.tile}".`
      break
    }

    /* ── O motor, o 3D e o ateliê ────────────────────────────────────────────────────────── */
    case 'brain': {
      const antes = s.brains.states[action.id - 1]
      // ⚠️⚠️ A diversidade é medida ANTES da mudança. Contando DEPOIS, a própria mudança
      // satisfazia o guard: um único toque a partir dos três parados fechava as duas metas de
      // uma vez, e "cada um ficou no seu próprio estado" caía com dois dos três ainda iguais.
      const distintosAntes = new Set(s.brains.states).size
      s.brains.states[action.id - 1] = action.state
      // A meta diz "cada um no SEU estado", então ela pede os três diferentes — nem dois.
      if (new Set(s.brains.states).size === 3)
        observe(s, 'own', 'Cada um ficou no seu próprio estado', true)
      // ⚠️ "Mudar um não mexe nos outros" só conta quando havia outro para mexer: com os três
      // iguais, a independência não teria sido mostrada.
      if (antes !== action.state && distintosAntes > 1)
        observe(s, 'independent', 'Mudar um cérebro não mexeu nos outros', true)
      s.caption = `O ${action.id}º está ${action.state}. Os três: ${s.brains.states.join(', ')}.`
      break
    }
    case 'count': {
      s.machines.mode = action.kind
      s.machines.fastX = 40
      s.machines.slowX = 40
      s.machines.elapsed = 0
      s.caption =
        action.kind === 'frames'
          ? 'Agora o jogo conta QUADROS. Avance o relógio nas duas máquinas.'
          : 'Agora o jogo conta SEGUNDOS. Avance o relógio nas duas máquinas.'
      break
    }
    case 'radius': {
      // ⚠️ A descoberta desta cena é a CONTA, e a prova dela é o mesmo lugar deixar de ser (ou
      // passar a ser) uma batida só porque o raio mudou. Por isso a comparação é aqui, com a
      // distância PARADA: dentro do `conferirCirculos` (que também roda no relógio) ela não teria
      // como separar o que mudou o resultado.
      const antes = s.circles.distance <= s.circles.a + s.circles.b
      if (action.which === 'a') s.circles.a = action.value
      else s.circles.b = action.value
      if (antes !== s.circles.distance <= s.circles.a + s.circles.b)
        observe(s, 'formula', 'Mudar o raio mudou o instante da batida', true)
      conferirCirculos(s)
      break
    }
    case 'place3d': {
      const antes = { ...s.space }
      s.space.x = action.x
      s.space.y = action.y
      s.space.z = action.z
      const mexeu = (['x', 'y', 'z'] as const).filter((eixo) => antes[eixo] !== action[eixo])
      // ⚠️ Um eixo por vez, como em `coordinates`: mexer nos três ao mesmo tempo não diz qual
      // fez o quê, e é exatamente a confusão que a porta do 3D existe para desfazer.
      if (mexeu.length === 1) {
        const eixo = mexeu[0] as string
        if (!s.space.moved.includes(eixo)) s.space.moved.push(eixo)
        if (eixo === 'z') observe(s, 'depth', 'O z leva para longe e para perto', true)
        if (eixo === 'y' && action.y > antes.y)
          observe(s, 'up', 'No 3D, o y maior é mais ALTO', true)
      }
      // ⚠️ A sombra só é descoberta para quem a viu SE SEPARAR do objeto: com um caso que já
      // abre com ele no ar, qualquer gesto (mexer só no x) fechava a meta.
      if (s.space.y > 0 && s.space.moved.includes('y'))
        observe(s, 'shadow', 'A sombra no chão diz onde ele está', true)
      s.caption = `x ${action.x}, y ${action.y}, z ${action.z}.${
        s.space.y > 0 ? ' A sombra ficou no chão, embaixo dele.' : ''
      }`
      break
    }
    case 'orbit': {
      if (start.scene === 'mesh') {
        s.model.yaw = action.yaw
        s.caption = 'O modelo girou. Olhe as faces por outro lado.'
        break
      }
      const girou = s.orbit.yaw !== action.yaw || s.orbit.pitch !== action.pitch
      s.orbit.yaw = action.yaw
      s.orbit.pitch = action.pitch
      const faces = facesAVista(action.yaw, action.pitch)
      s.orbit.fewest = Math.min(s.orbit.fewest, faces)
      // ⚠️⚠️ As duas metas dizem "GIROU até ver", e a cena ABRE mostrando duas cores — sem o
      // `girou` a de duas caía sozinha, inclusive num `orbit` que não mexia em nada.
      if (girou && faces === 1) observe(s, 'one-face', 'Girou até ver uma cor só', true)
      if (girou && faces === 2) observe(s, 'two-faces', 'Girou até ver exatamente duas cores', true)
      if (girou && (action.yaw !== 1 || action.pitch !== 1)) s.orbit.returned = false
      s.caption = `Daqui dá para ver ${faces} cor(es) do cubo.`
      break
    }
    case 'recenter': {
      // ⚠️ "Voltou à vista de sempre" pede ter SAÍDO dela: apertado como primeiro gesto, o botão
      // fechava a meta sem a câmera ter andado. O `orbit.returned` existe para isso e era campo
      // morto — só escrito, nunca lido.
      const saiu = s.orbit.yaw !== 1 || s.orbit.pitch !== 1
      s.orbit.yaw = 1
      s.orbit.pitch = 1
      s.orbit.returned = saiu || s.orbit.returned
      if (saiu) observe(s, 'back', 'Voltou à vista de sempre com um toque', true)
      s.caption = saiu
        ? 'A câmera voltou para a vista de sempre.'
        : 'A câmera já estava na vista de sempre.'
      break
    }
    case 'wireframe': {
      s.model.wire = action.on
      if (action.on) observe(s, 'points', 'Por baixo, o modelo é feito de pontos ligados', true)
      else if (s.evidence.discoveries.includes('points'))
        observe(s, 'skin', 'A textura é a roupa que cobre os pontos', true)
      s.caption = action.on
        ? 'Raio-X ligado: dá para ver os pontos e as linhas que formam o modelo.'
        : 'Raio-X desligado: a roupa do modelo voltou.'
      break
    }
    case 'point': {
      s.ray.x = action.x
      s.ray.y = action.y
      const caixa = caixaMirada(action.x, action.y)
      s.ray.hit = caixa
      if (caixa) {
        if (!s.ray.hits.includes(caixa)) s.ray.hits.push(caixa)
        observe(s, 'face', 'A face mirada acendeu', true)
        // ⚠️ A meta é a OCLUSÃO, e ela só existe onde há DUAS caixas no caminho: a faixa em que
        // a da frente cobre a de trás. Fora dela, "parou na primeira" não teria o que provar.
        const duasNoCaminho =
          caixa === PICK_BOXES.frente.id && dentro(PICK_BOXES.atras, action.x, action.y)
        if (duasNoCaminho) observe(s, 'first', 'A reta parou na primeira caixa do caminho', true)
      }
      s.caption = caixa
        ? `A mira parou na caixa ${caixa}.`
        : 'A mira passou reto: não havia nada no caminho.'
      break
    }
    case 'ink': {
      if (action.part === 'fill') s.ink.fill = action.on
      else s.ink.stroke = action.on
      const arranjo =
        s.ink.fill && s.ink.stroke ? 'both' : s.ink.fill ? 'fill' : s.ink.stroke ? 'stroke' : 'none'
      if (!s.ink.seen.includes(arranjo)) s.ink.seen.push(arranjo)
      if (arranjo === 'fill')
        observe(s, 'only-fill', 'Miolo sem linha continua sendo desenho', true)
      if (arranjo === 'stroke') observe(s, 'only-stroke', 'A linha sozinha guarda a forma', true)
      if (arranjo === 'both' && s.ink.seen.length > 1)
        observe(s, 'both', 'Os dois juntos são dois desenhos no mesmo traço', true)
      s.caption = `Miolo ${s.ink.fill ? 'pintado' : 'vazio'}, contorno ${s.ink.stroke ? 'à vista' : 'sem cor'}.`
      break
    }
    case 'light': {
      s.light.side = action.side
      if (s.light.shade && !s.light.sides.includes(action.side)) s.light.sides.push(action.side)
      if (s.light.sides.length > 1)
        observe(s, 'side', 'Mudou o lado da luz e a sombra mudou de lado', true)
      s.caption = `A luz vem da ${action.side === 'left' ? 'esquerda' : 'direita'}.`
      break
    }
    case 'shade': {
      const antes = s.light.shade
      s.light.shade = action.on
      if (action.on) {
        if (!s.light.sides.includes(s.light.side)) s.light.sides.push(s.light.side)
        observe(s, 'volume', 'Com as duas cores, a forma ganhou volume', true)
      }
      // ⚠️ A forma NASCE chapada, então desligar a sombra sem nunca tê-la ligado não muda um
      // pixel — e a meta caía nesse nada. "Parece um adesivo" é uma COMPARAÇÃO: só vale depois
      // de a criança ter visto o volume e tirado ele.
      else if (antes) observe(s, 'flat', 'Sem sombra, a forma parece um adesivo', true)
      s.caption = action.on
        ? 'Com a segunda cor mais escura, ela deixa de parecer chapada.'
        : 'Só a cor base: a forma fica chapada.'
      break
    }

    case 'reset':
      // Recomeçar o mundo NUNCA apaga o que a criança já descobriu. E recomeça no CASO desta
      // atividade, não no mundo de fábrica: quem abriu numa tela de 480 por 270 volta para ela.
      return {
        ...openScene(start),
        evidence: s.evidence,
        caption: 'Experiência recomeçada. Suas descobertas foram guardadas.',
      }
  }
  return s
}

/** A largura da tela do jogo. A cena `camera` existe para mostrar que o MUNDO é maior que ela. */
const TELA_LARGURA = STAGE_TARGET.width

/** Qual do grupo está mais perto. Um só lugar: o motor e a leitura precisam concordar. */
export function maisPerto(distancias: readonly number[]): number {
  let melhor = 1
  distancias.forEach((d, i) => {
    if (d < (distancias[melhor - 1] ?? Number.POSITIVE_INFINITY)) melhor = i + 1
  })
  return melhor
}

/**
 * O relógio das onze cenas do núcleo do Iniciante 2D.
 *
 * ⚠️ Devolve `true` quando ELA tratou o tempo — é o que faz o `advance` das outras cenas
 * continuar exatamente como estava. Cada uma aqui ensina uma coisa diferente sobre o tempo:
 * a posição que anda sozinha, a tecla que vale enquanto durar, a recarga que espera.
 */
function avancarNucleo(s: SceneState, scene: SceneId, seconds: number): boolean {
  switch (scene) {
    case 'velocity': {
      s.drive.fromX = s.drive.x
      s.drive.fromY = s.drive.y
      s.drive.x = Math.max(0, Math.min(480, s.drive.x + s.drive.vx * 10 * seconds))
      s.drive.y = Math.max(0, Math.min(270, s.drive.y + s.drive.vy * 10 * seconds))
      s.drive.ticks += 1
      const andou = Math.abs(s.drive.x - s.drive.fromX) + Math.abs(s.drive.y - s.drive.fromY)
      if (andou > 0.5) {
        observe(s, 'moves', 'A posição mudou sozinha, com o relógio', true)
        // ⚠️ "Levou para a ESQUERDA" pede ter andado PARA O LADO: o guard soma os dois eixos,
        // e com o x travado em 0 um movimento só vertical fechava a meta do sinal.
        if (s.drive.vx < 0 && s.drive.x !== s.drive.fromX)
          observe(s, 'left', 'Velocidade negativa levou para a esquerda', true)
        // ⚠️ Os DOIS eixos: narrando só o x, uma cena com velocidade para baixo dizia "foi de
        // 60 para 60" enquanto o Dino descia na tela — e é a frase que a criança lê.
        s.caption = mexeuNoEixo(s.drive.x, s.drive.fromX)
          ? mexeuNoEixo(s.drive.y, s.drive.fromY)
            ? `O relógio andou e ele foi de ${Math.round(s.drive.fromX)}, ${Math.round(s.drive.fromY)} para ${Math.round(s.drive.x)}, ${Math.round(s.drive.y)}.`
            : `O relógio andou e ele foi de ${Math.round(s.drive.fromX)} para ${Math.round(s.drive.x)}.`
          : `O relógio andou e ele desceu de ${Math.round(s.drive.fromY)} para ${Math.round(s.drive.y)}.`
      } else if (s.drive.vx === 0 && s.drive.vy === 0) {
        // ⚠️⚠️ A cena NASCE com velocidade zero, então "com zero ele fica parado" caía no
        // primeiro toque em "Um passo", sem a criança ter mexido em nada. É uma COMPARAÇÃO:
        // só vale depois de ela ter visto o relógio mover alguma coisa.
        if (s.evidence.discoveries.includes('moves'))
          observe(s, 'stopped', 'Com velocidade zero, ele fica parado', true)
        s.caption = 'O relógio andou e ele não saiu do lugar: a velocidade é zero.'
      }
      return true
    }
    case 'hold-vs-press': {
      s.input.ticks += 1
      if (s.input.holding) {
        s.input.holdX = Math.min(440, s.input.holdX + 40 * seconds)
        observe(s, 'while-held', 'Segurando, ela anda enquanto durar', true)
      }
      // ⚠️ A comparação só vale depois de a criança ter feito as DUAS coisas: sem isso, a
      // diferença entre as duas raquetes seria só "uma delas nunca andou".
      if (s.input.presses > 0 && s.input.holdX > s.input.pressX + 20)
        observe(s, 'apart', 'No mesmo tempo, as duas foram parar em lugares diferentes', true)
      s.caption = s.input.holding
        ? `Segurando: a de baixo está em ${Math.round(s.input.holdX)}.`
        : `Solto: a de cima em ${s.input.pressX}, a de baixo em ${Math.round(s.input.holdX)}.`
      return true
    }
    case 'enemy-type': {
      s.caption = `${s.blueprint.born} no chão, todos com velocidade ${s.blueprint.speed} e vida ${s.blueprint.life}.`
      return true
    }
    case 'contact': {
      const encostando = s.hit.distance <= 40
      if (encostando) {
        if (s.hit.mode === 'ask') {
          s.hit.damage += 1
          if (s.hit.damage >= 3)
            observe(s, 'drain', 'A pergunta contínua tirou vida em todo quadro', true)
        } else if (!s.hit.touching) {
          s.hit.damage += 1
          // ⚠️⚠️ A meta é "afastar e VOLTAR", e ela pede as DUAS metades: uma primeira batida
          // (`once`) e um passo do relógio com os dois genuinamente LONGE (`away`). Sem o
          // segundo, alternar os dois botões da pergunta — que zeram o `touching` — fechava a
          // meta com o cacto parado, encostado, sem nada ter se afastado.
          if (s.evidence.discoveries.includes('once') && s.hit.away)
            observe(s, 'apart', 'Afastar e voltar faz o acontecimento valer de novo', true)
          observe(s, 'once', 'O acontecimento tirou vida uma vez só', true)
        }
      } else if (s.evidence.discoveries.includes('once')) s.hit.away = true
      s.hit.touching = encostando
      s.caption = encostando
        ? `Encostado. Já se foram ${s.hit.damage} de vida.`
        : `Longe. A vida parou em ${s.hit.damage} perdida(s).`
      return true
    }
    case 'cooldown': {
      if (s.weapon.ready > 0) s.weapon.ready = Math.max(0, s.weapon.ready - seconds)
      if (s.weapon.seconds === 0 && s.weapon.shots >= 3)
        observe(s, 'burst', 'Sem recarga, os tiros saem todos juntos', true)
      s.caption =
        s.weapon.ready > 0
          ? `Recarregando: faltam ${s.weapon.ready.toFixed(1)}s.`
          : 'Pronto para atirar.'
      return true
    }
    case 'aim': {
      if (!s.sight.chasing) {
        s.caption = 'O tiro vai reto para a direita, porque ninguém ligou a mira.'
        return true
      }
      s.sight.shotX = s.sight.targetX
      s.sight.shotY = s.sight.targetY
      observe(s, 'follows', 'Com a mira ligada, o tiro foi na direção da seta', true)
      s.caption = 'O tiro seguiu a seta e chegou no alvo.'
      return true
    }
    case 'diagonal': {
      const diagonal = s.walkPad.dx !== 0 && s.walkPad.dy !== 0
      // Sem correção, andar nos dois eixos soma os dois passos: é a dor da cena.
      const passo = diagonal
        ? s.walkPad.even
          ? 1
          : Math.SQRT2
        : s.walkPad.dx || s.walkPad.dy
          ? 1
          : 0
      s.walkPad.distance = Number((passo * 60 * seconds).toFixed(2))
      s.walkPad.best = Math.max(s.walkPad.best, s.walkPad.distance)
      if (diagonal && !s.walkPad.even && s.walkPad.distance > 0)
        observe(s, 'faster', 'Na diagonal ele andou mais no mesmo tempo', true)
      if (diagonal && s.walkPad.even && s.walkPad.distance > 0)
        observe(s, 'same', 'Com a correção, a diagonal anda o mesmo que o reto', true)
      s.caption =
        s.walkPad.distance === 0
          ? 'Nenhuma seta apertada: ele fica parado.'
          : `Neste passo ele andou ${s.walkPad.distance}.`
      return true
    }
    case 'pool': {
      s.nursery.ticks += 1
      // Um nasce e um sai a cada passo: sem reciclagem, o contador de CRIADOS sobe para sempre.
      if (s.nursery.recycling) {
        if (s.nursery.created === 0) s.nursery.created = 1
        s.nursery.alive = 1
        observe(s, 'recycled', 'Com reciclagem, o mesmo corpo volta a ser usado', true)
        // ⚠️ "PAROU de crescer" pede ter visto crescer: ligando a reciclagem de saída, a meta
        // caía sobre um contador que nunca tinha subido.
        if (s.nursery.ticks >= 4 && s.evidence.discoveries.includes('grows'))
          observe(s, 'steady', 'O número de criados parou de crescer', true)
      } else {
        s.nursery.created += 1
        s.nursery.alive = 1
        if (s.nursery.created >= 3)
          observe(s, 'grows', 'O contador de criados só sobe, e nunca desce', true)
      }
      s.caption = `Vivos: ${s.nursery.alive}. Criados desde o começo: ${s.nursery.created}.`
      return true
    }
    case 'entity-state': {
      s.brains.ticks += 1
      const fazendo = s.brains.states.map((estado, i) => `${i + 1}º ${acaoDoEstado(estado)}`)
      if (new Set(s.brains.states).size > 1)
        observe(s, 'acts', 'O estado de cada um decidiu o que ele fez agora', true)
      s.caption = fazendo.join('; ')
      return true
    }
    case 'delta-time': {
      s.machines.elapsed += seconds
      // A máquina rápida dá DOIS passos no tempo em que a devagar dá um. Contando quadros, ela
      // anda o dobro; contando segundos, as duas andam o mesmo.
      // ⚠️ Com teto: o relógio pode andar muitas vezes, e sem ele o retrato guardado sairia da
      // faixa que o validador aceita — a sessão da criança deixaria de hidratar.
      const andar = (v: number, quanto: number) => Math.min(SCENE_LIMITS.machineX.max, v + quanto)
      if (s.machines.mode === 'frames') {
        s.machines.fastX = andar(s.machines.fastX, 40 * seconds)
        s.machines.slowX = andar(s.machines.slowX, 20 * seconds)
        if (Math.abs(s.machines.fastX - s.machines.slowX) > 30)
          observe(s, 'apart', 'Contando quadros, as duas máquinas se afastaram', true)
      } else {
        s.machines.fastX = andar(s.machines.fastX, 30 * seconds)
        s.machines.slowX = andar(s.machines.slowX, 30 * seconds)
        // ⚠️ O contraste é a lição inteira: "chegaram juntas" só significa alguma coisa para
        // quem viu as duas se afastarem antes. Trocar para segundos de saída fechava a meta
        // sobre duas máquinas que nunca estiveram separadas.
        if (s.machines.elapsed >= 1 && s.evidence.discoveries.includes('apart'))
          observe(s, 'together', 'Contando tempo, as duas chegaram juntas', true)
      }
      s.caption = `A rápida em ${Math.round(s.machines.fastX)}, a devagar em ${Math.round(s.machines.slowX)}.`
      return true
    }
    case 'circle-collision': {
      s.circles.distance = Math.max(0, s.circles.distance - 20 * seconds)
      conferirCirculos(s)
      return true
    }
    default:
      return false
  }
}

/** Mexeu nesse eixo? Meio pixel de folga, como o resto do motor. */
const mexeuNoEixo = (agora: number, antes: number) => Math.abs(agora - antes) > 0.5

/** O menos do CONTEÚDO (U+2212), não o hífen do teclado. */
const sinal = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))

/** O que um personagem FAZ no estado em que está. É o que a cena `entity-state` mostra. */
function acaoDoEstado(estado: string): string {
  if (estado === 'mirar') return 'está virando para o alvo'
  if (estado === 'atirar') return 'soltou um tiro'
  if (estado === 'recarregar') return 'está esperando a recarga'
  return 'está parado'
}

/**
 * Quantas faces do cubo aparecem desta posição de câmera. De frente, uma; no canto, três.
 *
 * ⚠️ EXPORTADA porque o palco também precisa dela (ele DESENHA o número na tela). Era a terceira
 * cópia da mesma régua; a segunda, no `readout`, existe porque a leitura não pode importar o
 * motor — essa continua sendo comparada com esta no `engine-scenes.test.ts`.
 */
export function facesAVista(yaw: number, pitch: number): number {
  const canto = yaw % 2 === 1
  if (pitch === 1) return canto ? 2 : 1
  return canto ? 3 : 2
}

/**
 * As três caixas da cena `pick-ray`, nas MESMAS coordenadas em que o palco as desenha.
 *
 * ⚠️⚠️ A 2 fica NA FRENTE e SOBREPÕE a 1 — é nessa faixa comum que a cena inteira acontece.
 * Enquanto as três eram disjuntas, "a reta parou na primeira caixa do caminho" caía num ponto
 * onde não havia nada atrás, e a pista mandava a criança procurar um alinhamento que a tela
 * não tinha. Mexeu aqui, mexa no `PickRayStage` do member-shell.
 */
export const PICK_BOXES = {
  atras: { id: 1, x: 220, y: 60, w: 140, h: 110 },
  frente: { id: 2, x: 300, y: 120, w: 150, h: 120 },
  sozinha: { id: 3, x: 60, y: 70, w: 110, h: 100 },
} as const
const dentro = (c: { x: number; y: number; w: number; h: number }, x: number, y: number) =>
  x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h

/** Onde a mira bateu. A da FRENTE é conferida primeiro: a reta para na primeira coisa. */
function caixaMirada(x: number, y: number): number {
  if (dentro(PICK_BOXES.frente, x, y)) return PICK_BOXES.frente.id
  if (dentro(PICK_BOXES.atras, x, y)) return PICK_BOXES.atras.id
  if (dentro(PICK_BOXES.sozinha, x, y)) return PICK_BOXES.sozinha.id
  return 0
}

/** A conta da colisão na mão: a distância entre os centros contra a soma dos raios. */
function conferirCirculos(s: SceneState): void {
  const soma = s.circles.a + s.circles.b
  const encostando = s.circles.distance <= soma
  if (encostando) {
    s.circles.touched = true
    observe(s, 'touch', 'A distância ficou menor que a soma dos raios', true)
  }
  s.caption = `Distância ${Math.round(s.circles.distance)} contra ${soma} de soma dos raios: ${
    encostando ? 'encostaram' : 'ainda não encostaram'
  }.`
}

/** As palavras que dizem O QUE se faz no jogo. Lista de orientação, não de gabarito. */
const OBJETIVO_PALAVRAS = [
  'pule',
  'pular',
  'corra',
  'correr',
  'desvie',
  'desviar',
  'escape',
  'escapar',
  'fuja',
  'fugir',
  'atire',
  'atirar',
  'colete',
  'coletar',
  'pegue',
  'pegar',
  'acerte',
  'acertar',
  'chegue',
  'chegar',
  'ganhe',
  'marque',
  'salve',
] as const
/** As palavras que dizem COMO se joga. */
const CONTROLE_PALAVRAS = [
  'espaço',
  'espaco',
  'enter',
  'seta',
  'setas',
  'clique',
  'clicar',
  'toque',
  'tocar',
  'aperte',
  'apertar',
  'apertando',
  'barra',
  'mouse',
  'tecla',
] as const

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
    // ⚠️ O `1e-9` existe para que 0,1 s dez vezes conte o cacto que a soma binária deixaria
    // faltando por um fio. Mas ele empurra o `count` para cima SEM ser descontado do resto, e
    // aí o resto sai negativo por um fio (−2,22e−16) — um estado que o próprio validador
    // recusa (`isSceneState` exige resto ≥ 0). A criança assistia a demonstração inteira e
    // ouvia que ela "mudou, abra de novo"; e recomeçar reproduzia o mesmo estado.
    const count = Math.floor((before + seconds + 1e-9) / interval)
    s.crowd.remainder = Math.max(0, before + seconds - count * interval)
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

/** O passo que faz a troca ficar suave. Fora dele a animação salta ou quase não anda. */
const PASSO_PARELHO = { min: 12, max: 28 } as const
/** A lupa que revela a borda, e a que devolve as duas pedras ao tamanho de longe. */
const PERTO = 5
const LONGE = 2

/** Pinta uma coluna, sem repetir e sem deixar a lista crescer sem fim. */
function pintar(s: SceneState, column: number): void {
  if (s.mirror.painted.includes(column)) return
  s.mirror.painted.push(column)
  if (s.mirror.painted.length > 24) s.mirror.painted.shift()
}

/**
 * A troca automática dos dois quadros.
 *
 * ⚠️ As duas descobertas são a MESMA montagem em velocidades diferentes, e cada uma precisa do
 * relógio andando: é o tempo passando que mostra "são dois desenhos" e "isso virou movimento".
 * Ligar a troca sem avançar não descobre nada, e é isso que faz a criança mexer na velocidade.
 */
function advanceFrames(s: SceneState, seconds: number): void {
  const a = s.animation
  if (!a.playing) {
    s.caption = `A troca está parada: o quadro ${a.frame} fica na tela.`
    return
  }
  a.elapsed += seconds
  const trocas = Math.floor(a.elapsed * a.rate)
  if (trocas > 0) {
    a.elapsed -= trocas / a.rate
    a.swaps += trocas
    a.frame = ((a.frame - 1 + trocas) % 2) + 1
  }
  if (a.rate <= 2 && a.swaps >= 2)
    observe(s, 'slow-shows-two', 'Devagar, dá para ver os dois desenhos', true)
  if (a.rate >= 6 && a.swaps >= 4) observe(s, 'movement', 'Rápido, os dois viram movimento', true)
  s.caption =
    a.rate <= 2
      ? `${a.rate} por segundo: dá para ver um desenho, depois o outro.`
      : `${a.rate} por segundo: o olho junta os dois e vira movimento.`
}

/** O placar sobe sozinho enquanto houver vida. O resto do segundo fica guardado para o ponto
 *  não depender do tamanho do passo do relógio. */
function advanceLives(s: SceneState, seconds: number): void {
  const l = s.lifeline
  if (!l.scoring || l.lives === 0) {
    s.caption =
      l.lives === 0
        ? 'A partida acabou: o placar parou onde estava.'
        : 'O relógio andou, e o placar continua parado: falta o fio do ponto.'
    return
  }
  l.remainder += seconds
  const ganhos = Math.floor(l.remainder)
  l.remainder -= ganhos
  l.points += ganhos
  s.caption = `O relógio andou e o placar está em ${l.points}.`
}

/**
 * A batida.
 *
 * ⚠️ "Os pontos ficaram" só conta quando havia ponto para perder: sem placar nenhum, a criança
 * não teria como ver que as duas contagens são independentes.
 */
function collideLives(s: SceneState): void {
  const l = s.lifeline
  if (l.lives === 0) {
    s.caption = 'A partida já acabou. Recomece para bater de novo.'
    return
  }
  l.hits += 1
  if (!l.onHit) {
    s.caption = 'A batida não custou nada: o fio da vida está desligado.'
    return
  }
  l.lives -= 1
  observe(s, 'life-lost', 'A batida tirou uma vida', true)
  if (l.points > 0) observe(s, 'points-stay', 'Os pontos ficaram, mesmo perdendo vida', true)
  if (l.lives === 0) observe(s, 'over', 'Sem vidas, a partida acabou', true)
  else s.caption = `Uma vida saiu. Restam ${l.lives}, e o placar continua em ${l.points}.`
}
