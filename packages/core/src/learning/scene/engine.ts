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
      if (action.width === 480 && action.height === 270)
        observe(s, 'target', 'Chegou na tela de 480 por 270', true)
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
