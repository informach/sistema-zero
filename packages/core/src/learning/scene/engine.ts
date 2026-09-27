import {
  isSceneAction,
  type MeshLevel,
  SCENE_LIMITS,
  type SceneAction,
  type SceneId,
  STAGE_TARGET,
  sceneFrameRate,
  sceneLongFrame,
} from './actions'
import {
  FOLHA_DA_NAVE,
  GESTOS_NO_PAPEL,
  LUPA,
  MARCAS_NO_PAPEL,
  mirrorCopyAxes,
  NOME_DO_TRACO,
  onionFireZone,
  sheetCropCell,
  sheetCropCount,
  symmetryCopySeparated,
  TAMANHO_PARECIDO,
} from './atelie'
import { decimal, numero, quantos } from './cast'
import {
  AIM_ORIGIN,
  AIM_SHOT,
  aimDistanceToPath,
  CAMERA_WORLD,
  CONTACT_HEARTS,
  CONTACT_SEEN_FRAMES,
  COOLDOWN_SHOT,
  cameraWindow,
  contactTouching,
  diagonalStride,
  ENEMY_LANE,
  ENEMY_MAX_CACTI,
  enemyOnScreen,
  enemyStep,
  HOLD_LANE,
  HOLD_LONG_STEPS,
  HOLD_RUNNING_STEPS,
  HOLD_TAP_STEPS,
  HUNT_LOOP_SEEN_TICKS,
  holdLaneNext,
  holdLaneSnap,
  huntDistances,
  isTilemapCoinRow,
  TILEMAP_MARKS_MAX,
  tilemapMark,
  tilemapMarkedRows,
} from './nucleo'
import {
  advanceOnce,
  onceDiscoveries,
  onceRunFinished,
  placeOnce,
  triggerOnce,
} from './once-vs-always'
import {
  gameStatePreset,
  isCleanupPreset,
  isRandomPreset,
  isSpawnPreset,
  type OnceVsAlwaysPreset,
  oncePreset,
  type ScenePreset,
} from './presets'
// ⚠️ Só o TIPO: a sessão importa o motor, e um valor daqui fecharia um ciclo de módulos.
import type { SceneCommand } from './session'
import {
  cloneScene,
  DELTA_RACE,
  DRAW_LOOP_LANE,
  HITBOX_DRAWINGS_TOUCH,
  HITBOX_VISIBLE_GAP,
  initialScene,
  LUGARES_NAO_SORTEADOS,
  observe,
  PLACAR_NAO_VISTO,
  POOL_CROSSING,
  RANDOM_SPOTS,
  SCREEN_READER_EMPTY,
  type SceneClock,
  type SceneStart,
  type SceneState,
  SOUND_BEATS_MAX,
  START_TRIES_MAX,
  sceneAreaPercent,
  sceneCactiOnScreen,
  sceneContact,
  sceneDrawingsGap,
  uniqueNamesWarning,
  VELOCITY_TRAIL_MAX,
} from './state'

/**
 * A transição da cena: `(início, estado, ação) → estado novo`. Pura e imutável.
 *
 * É o ÚNICO motor de mundo do sistema — a demonstração e a experimentação passam pelas
 * mesmas regras. O que muda entre elas é de onde as ações vêm (do roteiro ou da criança) e
 * como a evidência é colhida, nunca a física.
 *
 * ⚠️ Ação ilegal para a cena é um no-op silencioso, não um erro: um roteiro escrito para outra
 * cena, ou um pacote adulterado, não derruba a aula da criança no meio.
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
  esquecerOGesto(aberto, base, start.scene)
  // ⚠️⚠️ Um caso não abre com um salto que ainda não saiu do chão. Com `setup: [jump]` (e nenhum
  // relógio depois) o salto ficava INICIADO e parado: o Dino no chão, e o primeiro toque da
  // criança respondia "O Dino já está no ar. Não aconteceu outro salto." — a tela dizendo uma
  // coisa e a frase outra, no primeiro gesto da aula. Sem ter subido nem um pixel não há voo
  // nenhum à vista, então o salto é desfeito e as condições do voo voltam às de quem nunca
  // saltou. Um caso que já deixa o Dino NO AR (salto + relógio) segue valendo: ali o voo aparece.
  if (aberto.flight.time !== null && aberto.flight.y < 1)
    aberto.flight = {
      ...aberto.flight,
      time: null,
      y: 0,
      peak: 0,
      base: 0,
      atForce: aberto.flight.force,
      atGravity: base.flight.atGravity,
    }
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
function esquecerOGesto(aberto: SceneState, base: SceneState, scene: SceneId): void {
  // Os fantasmas e os "onde eu estava antes" passam a apontar para onde a cena ABRE.
  aberto.place = { ...aberto.place, fromX: aberto.place.x, fromY: aberto.place.y }
  aberto.drive = {
    ...aberto.drive,
    fromX: aberto.drive.x,
    fromY: aberto.drive.y,
    anchorX: aberto.drive.x,
    anchorY: aberto.drive.y,
    ticks: 0,
  }
  // ⚠️ As marcas do papel e os dois contadores de gesto também (consertos do review da onda B do lote
  // 5): o caso que pinta abria com "você pintou 1" e as cópias dele no papel. O espelho escolhido fica.
  aberto.mirror = { ...aberto.mirror, marks: [], strokes: 0, copies: 0 }
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
  // ⚠️ Sem zerar `hunt.ticks` (consertos do review da onda B do lote 5): as distâncias da `group-loop`
  // SÃO o relógio (`huntDistances`), e com o zero um caso com tempo abria com os números de um instante
  // e saltava para os do instante 0 no primeiro quadro, trocando o mais perto no salto.
  aberto.hunt = { ...aberto.hunt, looked: [] }
  aberto.grid = { ...aberto.grid, edits: base.grid.edits }
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
  // ⚠️ Os desenhos que o caso deixou na tela (`drawn`) e o x SÃO o mundo, e o `trail` fala deles
  // (lote 5): zerar só o número deixava a faixa dizendo "0 Dinos" com três desenhados.
  aberto.render = {
    ...aberto.render,
    frames: base.render.frames,
    trail: aberto.render.drawn.length,
  }
  aberto.sound = { ...aberto.sound, count: base.sound.count, jumps: base.sound.jumps, beats: [] }
  // ⚠️ A marca do salto anterior (`impulse`) é o fantasma de um salto que a criança não deu.
  // ⚠️⚠️ E o PICO de um salto do caso que já pousou também (consertos do review da onda A do lote 5):
  // o próximo pulo guarda o pico como "a marca de antes", e o PRIMEIRO salto da criança fechava
  // `other-height` contra um salto que ela nunca viu. Com o Dino ainda no ar, o voo é o mundo e fica.
  aberto.flight = {
    ...aberto.flight,
    before: 0,
    beforeForce: 0,
    peak: aberto.flight.time === null ? 0 : aberto.flight.peak,
  }
  aberto.lifeline = { ...aberto.lifeline, hits: base.lifeline.hits }
  // ⚠️⚠️ Os cactos que o caso deixou na pista SÃO o mundo, e os contadores falam DELES: zerar
  // só os números fazia `outside = born − removed − vivos` virar negativo, e a cena `cleanup`
  // — que existe para a criança comparar "na tela" com "nos bastidores" — abria com os dois
  // números se desmentindo ("-2 de 6 já saíram").
  // ⚠️⚠️ Três cenas em que os cactos do caso SÃO memória do gesto (consertos do review da onda A do
  // lote 5): na `random` as raias são as corridas sorteadas e na `acceleration` a fileira são os
  // passos de 5 segundos, e as duas metas de comparação (`velocities`, `old-speed`) caíam no primeiro
  // toque da criança contra cactos que ela não viu nascer. Na `cleanup` quem já saiu da tela está na
  // prateleira, e `invisible-stored` abria com os dois lá. O `elapsed` é o tempo da pista, e o
  // `every-frame` da `spawn` caía no primeiro quadro depois de um caso com 1 s de relógio.
  const cacti =
    scene === 'random' || scene === 'acceleration'
      ? []
      : scene === 'cleanup'
        ? aberto.crowd.cacti.filter((c) => (c.y === undefined ? c.x >= 0 : c.y >= 0))
        : aberto.crowd.cacti
  aberto.crowd = {
    ...aberto.crowd,
    cacti,
    born: cacti.length,
    removed: 0,
    elapsed: 0,
    untimedBorn: 0,
    untimedSeconds: 0,
  }
  aberto.walkPad = { ...aberto.walkPad, best: base.walkPad.best }
  aberto.sight = { ...aberto.sight, shotX: base.sight.shotX, shotY: base.sight.shotY }
  aberto.description = {
    ...aberto.description,
    heard: base.description.heard,
    heardEmpty: base.description.heardEmpty,
    said: base.description.said,
    listens: base.description.listens,
  }
  aberto.match = { ...aberto.match, scoreIdle: base.match.scoreIdle, tries: [] }
  // ⚠️⚠️ Na `pool` os números pintados SÃO a história (lote 5 do Raio-X): um caso que deixasse o tempo
  // passar abriria com o nº 4 na tela e a pilha dos que saíram cheia, sem a criança ter visto nenhum
  // entrar. Fica só a chave da reciclagem, que é o mundo do professor.
  aberto.nursery = { ...base.nursery, recycling: aberto.nursery.recycling }
  aberto.brains = { ...aberto.brains, ticks: 0 }
  // ⚠️ A corrida também (lote 5): as pegadas são o caminho feito, e a posição sem elas desmentiria o
  // desenho. O caso escolhe só COMO o Dino anda.
  aberto.machines = { ...base.machines, mode: aberto.machines.mode }
  aberto.model = { ...aberto.model, sawHalf: false }
  aberto.circles = { ...aberto.circles, touched: base.circles.touched }
  aberto.space = { ...aberto.space, moved: [] }
  aberto.orbit = { ...aberto.orbit, fewest: base.orbit.fewest, returned: base.orbit.returned }
  aberto.ray = { ...aberto.ray, hits: [] }
  aberto.ink = { ...aberto.ink, seen: [] }
  aberto.light = { ...aberto.light, sides: [] }
  // ⚠️ A sobra do relógio também: um caso que termina com meio quadro de tempo faria o primeiro
  // quadro da criança chegar antes do ritmo da cena, só nesta abertura.
  aberto.clock = { carry: 0 }
  esquecerOGestoDaSegundaMetade(aberto)
  esquecerOGestoDoNucleo(aberto)
}

/**
 * Os contadores e rastros que o lote 5 do Raio-X deu ao núcleo do Iniciante 2D (G5).
 *
 * ⚠️⚠️ Os passos desde que a tecla afundou, os corações perdidos, os tiros no ar, o fantasma de cada
 * andada e as linhas onde cada peça foi escrita alimentam metas de COMPARAÇÃO. Um caso que segura a
 * tecla, encosta o cacto ou anda com o Dino deixaria a criança fechar num gesto o que devia levar dois.
 * ⚠️ O que é MUNDO fica: onde as raquetes estão e os cactos que nasceram e andam. O Dino da
 * `diagonal` volta ao começo junto com os fantasmas: sem eles, o lugar dele não tem com o que comparar.
 */
function esquecerOGestoDoNucleo(aberto: SceneState): void {
  const { pressX, holdX } = aberto.input
  // ⚠️ `holding: false` (consertos do review da onda B do lote 5): um caso que deixava a tecla segurada
  // entregava "toque rápido" no primeiro soltar, com a criança sem ter apertado nada.
  aberto.input = {
    ...aberto.input,
    holding: false,
    pressFrom: holdLaneSnap(pressX),
    holdFrom: holdLaneSnap(holdX),
    pressSteps: 0,
    holdSteps: 0,
  }
  // ⚠️ As fotos das réguas vão junto com o `looked`, e o laço recomeça a contar o tempo ligado.
  aberto.hunt = { ...aberto.hunt, blind: false, loopTicks: 0, measured: [0, 0, 0] }
  // ⚠️ Os cactos que o caso deixou na pista contam como nascidos ANTES de qualquer mudança da ficha.
  // ⚠️ E `born` zera (consertos do review da onda B do lote 5): um caso com três nascimentos entregava
  // "nasceram três cactos" no primeiro toque da criança.
  aberto.blueprint = {
    ...aberto.blueprint,
    pending: false,
    editSeq: aberto.blueprint.seq,
    born: 0,
  }
  aberto.hit = {
    ...aberto.hit,
    top: CONTACT_HEARTS,
    bottom: CONTACT_HEARTS,
    frames: 0,
    topTouch: 0,
    bottomTouch: 0,
    touches: 0,
  }
  aberto.weapon = { ...aberto.weapon, time: 0, bullets: [], shotTimes: [], refusedAt: -1 }
  aberto.sight = { ...aberto.sight, flying: false, result: 'nada' }
  aberto.walkPad = { ...aberto.walkPad, ghosts: [], strides: 0, last: 'nada', x: 0, y: 0 }
  aberto.grid = { ...aberto.grid, marks: [], lastRow: -1, lastCol: -1 }
}

/**
 * Os contadores e rastros que o lote 5 do Raio-X deu à segunda metade do Corre Dino e aos números.
 *
 * ⚠️⚠️ Um caso da `velocity` leva o personagem até o lugar de partida ANDANDO (velocidade e tempo):
 * sem apagar o rastro, a cena abriria com pontinhos de um caminho que a criança não fez. A fileira
 * do placar, os lugares sorteados, os tiros e a pista limpa por Reiniciar são memória do gesto.
 */
function esquecerOGestoDaSegundaMetade(aberto: SceneState): void {
  aberto.drive = {
    ...aberto.drive,
    trailX: [aberto.drive.x],
    trailY: [aberto.drive.y],
    prevX: [],
    prevY: [],
    steps: 0,
  }
  aberto.match = { ...aberto.match, seen: [...PLACAR_NAO_VISTO], cleared: 0 }
  aberto.speed = { ...aberto.speed, spots: [...LUGARES_NAO_SORTEADOS] }
  aberto.lifeline = { ...aberto.lifeline, shots: 0, last: 'nada' }
}

export function stepScene(
  start: SceneStart,
  previous: SceneState,
  action: SceneAction,
): SceneState {
  if (!isSceneAction(action, start.scene)) return previous
  // A sequência da cena `world` é intencionalmente guiada: primeiro o personagem existe nos
  // bastidores; só então ele pode aparecer na tela. A bancada fecha o segundo gesto, mas o motor
  // também precisa manter esse limite se uma ação chegar por outra superfície.
  if (action.type === 'connect' && action.port === 'draw' && !previous.world.created)
    return previous
  if (
    start.scene === 'random' &&
    isRandomPreset(start.setup?.preset) &&
    !start.setup.preset.speedModule &&
    action.type === 'sample' &&
    action.kind === 'velocity'
  )
    return previous
  const s = cloneScene(previous)
  s.evidence.actions = previous.evidence.actions + 1
  /**
   * ⚠️⚠️ A legenda é do GESTO desta ação, e só dele (review do lote 2 do Raio-X, 16/09/2026).
   *
   * A frase embaixo do palco é a legenda quando ela existe, e a situação quando não (`readout.ts`).
   * Enquanto a legenda só saía quando OUTRA ação escrevia uma nova, ela ficava velha na tela: "A
   * pista recomeça vazia" com cactos na pista, "O convite prometeu toque, mas falta conectar"
   * com o fio já ligado, e a regra da cena ("o placar cresce em qualquer tela") de volta depois
   * do primeiro gesto, justo onde a situação tinha parado de dizê-la. Zerada aqui, ela dura um
   * passo: quem narra um acontecimento escreve de novo, e o resto do tempo a SITUAÇÃO descreve o
   * estado. ⚠️ A pista não é gesto no mundo: pedir ajuda não apaga o que a frase acabou de dizer.
   * ⚠️ E o `observe` não carimba mais a legenda com o rótulo da meta (`state.ts`): o rótulo é a
   * CONCLUSÃO, e ela é da moldura ("✓ Descoberta") e do relatório do professor.
   * ⚠️⚠️ No TEMPO, o passo é o QUADRO (lote 4): uma fatia do ▶ que não fecha quadro nenhum não mudou
   * nada no mundo, e apagar a legenda ali a faria piscar entre a frase do quadro e a situação a
   * cada fatia. Quem zera é o `advance` que roda pelo menos um quadro.
   */
  if (action.type !== 'hint' && action.type !== 'advance') s.caption = ''
  const scene = start.scene

  switch (action.type) {
    case 'key-state':
      s.lighthouse.hasKey = action.hasKey
      s.lighthouse.door = 'closed'
      s.caption = action.hasKey
        ? 'A chave está com o personagem. O que a porta fará?'
        : 'O personagem está sem a chave. O que a porta fará?'
      break
    case 'try-lighthouse-door':
      if (s.lighthouse.hasKey) {
        s.lighthouse.door = 'open'
        s.caption = 'A porta abriu. A luz do farol acendeu!'
        observe(s, 'opened-with-key', 'A porta abriu com a chave')
      } else {
        s.lighthouse.door = 'closed'
        s.caption = 'A porta continua fechada.'
        observe(s, 'locked-without-key', 'A porta ficou fechada sem a chave')
      }
      break
    case 'find-character': {
      const foundIds = s.match.foundIds ?? []
      if (foundIds.includes(action.id)) {
        s.caption = 'Este personagem já foi encontrado. Achados continua igual.'
        break
      }
      s.match.foundIds = [...foundIds, action.id]
      s.match.points = s.match.foundIds.length
      if (s.match.points === 1) observe(s, 'first-find', 'Achados aumentou após encontrar alguém')
      if (s.match.points === 2)
        observe(s, 'second-find', 'Outra descoberta aumentou Achados de novo')
      s.caption = `Você encontrou um personagem. Achados: ${s.match.points}.`
      break
    }
    case 'look-around':
      if (s.match.points > 0) observe(s, 'no-find', 'Procurar sem encontrar não mudou Achados')
      s.caption = 'Você procurou, mas não encontrou ninguém. Achados continua igual.'
      break
    case 'restart-search':
      if (s.match.points > 0) observe(s, 'back-to-zero', 'Uma nova busca começou com zero achados')
      s.match.points = 0
      s.match.foundIds = []
      s.caption = 'Uma nova busca começou. Achados: 0.'
      break
    case 'value-source':
      s.fixedRead.source = action.source
      s.caption =
        action.source === 'fixed'
          ? 'O campo voltou ao número 400.'
          : 'O campo vai ler o centro x da nave no próximo disparo.'
      break
    case 'box-marks':
      s.fixedRead.boxMarks = action.on
      break
    case 'clear-marks':
      s.fixedRead.marks = []
      s.caption = 'As marcas de nascimento saíram. Os tiros que já nasceram continuam subindo.'
      break
    case 'command-target':
      if (action.subject === 'shot') s.collisionPair.shotTarget = action.target
      else s.collisionPair.rockTarget = action.target
      break
    case 'shield':
      s.invincibility.protection = action.frames
      break
    case 'advance-to': {
      const next = [1, 10, 30].find((frame) => frame > s.invincibility.frames)
      if (next === undefined) return previous
      while (s.invincibility.frames < next) umQuadro(s, start, 30)
      s.clock.carry = 0
      break
    }
    case 'step-value':
      s.numberLine.value = action.value
      observarMetasNumberLine(s)
      break
    case 'sum-minus-one':
      if (s.numberLine.value <= -12) return previous
      s.numberLine.value--
      s.numberLine.presses++
      if (s.numberLine.operator === '=') {
        s.numberLine.equalPresses++
        if (s.numberLine.value !== -9) s.numberLine.sawFalseEqual = true
      }
      observarMetasNumberLine(s)
      break
    case 'compare-op':
      if (s.numberLine.operator !== action.operator) {
        s.numberLine.equalPresses = 0
        s.numberLine.sawFalseEqual = false
      }
      s.numberLine.operator = action.operator
      observarMetasNumberLine(s)
      break
    case 'toggle-block':
      s.uniqueNames.topPresent = action.present
      if (!action.present)
        observe(
          s,
          'missing',
          'Sem o bloco que cria o nome, os outros acendem o aviso e a tela para de mudar',
        )
      break
    case 'name-field':
      s.uniqueNames.bottomName = action.name
      if (uniqueNamesWarning(s.uniqueNames) === 'clash')
        observe(s, 'clash', 'Dois blocos criando o mesmo nome: o Estúdio pede um nome diferente')
      if (
        action.name === 'folha-nave' &&
        s.evidence.discoveries.includes('clash') &&
        s.uniqueNames.topPresent
      )
        observe(s, 'own-name', 'Com um nome só dela, a folha fica junto da nave sem briga')
      break
    case 'nudge':
      if (action.piece === 'crater') s.motionAmount.crater = action.amount
      else s.motionAmount.body = action.amount
      s.motionAmount.viewedFrames = 0
      break
    case 'birth-every':
      s.twoClocks.birthEvery = action.frames
      if (s.twoClocks.frames === 0) s.twoClocks.birthAtStart = action.frames
      break
    case 'export-file':
      s.copies.fileColor = s.copies.lessonColor
      observe(s, 'exported', 'O arquivo saiu, e o jogo continuou na aula')
      s.caption = 'O arquivo levou uma cópia. O jogo ainda está na aula.'
      break
    case 'import-file':
      if (s.copies.fileColor === null) return previous
      s.copies.studioColor = s.copies.fileColor
      observe(s, 'imported', 'O mesmo jogo apareceu no Estúdio')
      if (s.copies.lessonColor !== s.copies.studioColor)
        observe(s, 'independent', 'Mudou a cor de um lado, e o outro ficou como estava')
      s.caption = 'O arquivo virou um projeto no Estúdio.'
      break
    case 'recolor': {
      const copies = s.copies
      const before =
        action.side === 'lesson'
          ? copies.lessonColor
          : action.side === 'studio'
            ? copies.studioColor
            : copies.projectColor
      if (before === null || before === action.color) return previous
      if (action.side === 'lesson') copies.lessonColor = action.color
      else if (action.side === 'studio') copies.studioColor = action.color
      else copies.projectColor = action.color
      if (
        scene === 'copy-vs-original' &&
        copies.studioColor !== null &&
        copies.lessonColor !== copies.studioColor
      )
        observe(s, 'independent', 'Mudou a cor de um lado, e o outro ficou como estava')
      if (
        scene === 'published-copy' &&
        copies.posts.length > 0 &&
        copies.posts.at(-1)?.color !== copies.projectColor
      )
        observe(s, 'only-project', 'Mudando a cor no projeto, só a tela da esquerda mudou')
      break
    }
    case 'publish': {
      const copies = s.copies
      if (copies.posts.length >= 12) return previous
      const last = copies.posts.at(-1)
      const post = { id: copies.posts.length + 1, color: copies.projectColor }
      copies.posts.push(post)
      if (!last)
        observe(s, 'first-publish', 'Depois de publicar, as duas telas mostram a mesma nave')
      else if (last.color !== post.color && s.evidence.discoveries.includes('only-project'))
        observe(s, 'republish', 'O Mural ganhou uma publicação nova com a cor nova')
      s.caption = last
        ? `A publicação ${post.id} entrou no Mural. A anterior continua lá.`
        : 'A primeira cópia entrou no Mural.'
      break
    }
    case 'open-mural': {
      const latest = s.copies.posts.at(-1)
      if (!latest) return previous
      s.copies.muralOpenedId = latest.id
      break
    }
    case 'skin': {
      const game = s.skinGame
      game.theme = action.theme
      if (!game.visited.includes(action.theme)) game.visited.push(action.theme)
      if (action.theme === 'road' && game.shootEnabled)
        observe(s, 'skin-only', 'Trocou o tema e as quatro regras continuaram acesas')
      if (game.visited.length === 3 && game.shootEnabled)
        observe(s, 'three-skins', 'Três histórias diferentes, o mesmo jogo')
      s.caption = 'Os desenhos mudaram. As quatro regras do jogo continuam acesas.'
      break
    }
    case 'rule-toggle':
      s.skinGame.shootEnabled = action.enabled
      if (action.enabled) {
        s.skinGame.disabledTried = false
        s.skinGame.disabledFrames = 0
      }
      s.caption = action.enabled
        ? 'A tecla de tiro voltou a funcionar.'
        : 'A regra de atirar apagou. Experimente jogar.'
      break
    case 'play-move':
      s.skinGame.x = Math.max(40, Math.min(520, s.skinGame.x + 24 * action.direction))
      break
    case 'play-shoot':
      if (s.skinGame.shootEnabled) {
        if (s.skinGame.shots.length < 8)
          s.skinGame.shots.push({ id: s.skinGame.nextShotId++, x: s.skinGame.x, y: 240 })
        s.caption = 'A regra está ligada: saiu um tiro.'
      } else {
        s.skinGame.disabledTried = true
        s.caption = 'A tecla foi apertada, mas a regra está desligada: não saiu tiro.'
        if (s.skinGame.disabledFrames >= 10)
          observe(s, 'rule-off', 'Desligando a regra de atirar, a lista mudou e o jogo mudou junto')
      }
      break
    case 'place-in-area': {
      const preset = oncePreset(start.setup?.preset)
      if (!placeOnce(s.once, preset, action.card, action.area)) return previous
      s.caption = 'A ação mudou de área. Comece o jogo para ver quando ela acontece.'
      break
    }
    case 'trigger': {
      const preset = oncePreset(start.setup?.preset)
      if (!triggerOnce(s.once, preset)) return previous
      observarMetasDaArea(s, preset)
      s.caption = 'A tecla disparou a ação que estava esperando.'
      break
    }
    case 'create':
      if (!s.world.created) {
        s.world.created = true
        s.world.drawn = false
        observe(s, 'hidden', 'O Dino existe nos bastidores e ainda não apareceu na tela do jogo.')
      }
      break

    case 'connect':
      switch (action.port) {
        case 'draw':
          s.world.drawn = action.enabled
          observe(
            s,
            s.world.drawn ? 'visible' : 'hidden',
            s.world.drawn
              ? 'O mesmo Dino apareceu na tela do jogo.'
              : 'O Dino continua nos bastidores, fora da tela do jogo.',
          )
          break
        case 'gravity':
          // ⭐⭐ A gravidade age A PARTIR DE AGORA (lote 5 do Raio-X). Ligar o fio zerava a altura e o
          // tempo ("Dino de volta à posição inicial"): o Dino que subia sumia do alto e reaparecia no
          // chão, e "Faça o Dino voltar ao chão" era cumprido por um teletransporte do FIO. Agora o
          // trecho do voo recomeça daqui, com a velocidade que o Dino tinha, e a criança vê a subida
          // frear, parar no alto e virar queda. ⚠️ Sem legenda: o que a gravidade faz é a descoberta.
          if (s.flight.time !== null && s.flight.gravity !== action.enabled)
            recomecarTrecho(s, action.enabled)
          s.flight.gravity = action.enabled
          break
        case 'sound':
          // Sem legenda: a situação diz o que o som escuta, com as mesmas palavras.
          s.sound.onJump = action.enabled
          break
        case 'timer':
          // ⚠️⚠️ O trecho SEM relógio fica guardado antes de a pista recomeçar (lote 5 do Raio-X): o
          // "60 em 2 s" sumia na hora exata de comparar com o "2 em 2 s" que vem depois.
          if (action.enabled && !s.crowd.timer && s.crowd.born > 0) {
            s.crowd.untimedBorn = s.crowd.born
            s.crowd.untimedSeconds = s.crowd.elapsed
          }
          s.crowd.timer = action.enabled
          resetTrack(s)
          // ⚠️ Sem "pista": o Desafio e o Meu Jeito usam esta cena no espaço. E no PASSADO: a frase
          // antiga ("recomeça vazia") ficava embaixo do palco com os cactos já nascendo. ⚠️ Com o
          // nome da PEÇA que a bancada move (lote 5): o fio "Relógio → Nascer cacto" saiu.
          s.caption = action.enabled
            ? 'Tudo recomeçou do zero, com Criar cacto dentro do relógio.'
            : 'Tudo recomeçou do zero, com Criar cacto a cada quadro.'
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
            break
          }
          if (s.match.guarded !== action.enabled) {
            s.match.scoreIdle = 0
            // ⚠️ Na `game-state` a pista é limpa na TROCA (lote 5 do Raio-X): os cactos criados com a
            // peça fora do Se continuavam andando pela tela de início enquanto a criança conferia que
            // "no início nada nasce", e o desenho desmentia a descoberta.
            // ⚠️ E a troca é DITA (consertos do review da onda A do lote 5): o contador zerava calado.
            if (scene === 'game-state') {
              resetTrack(s)
              s.caption = action.enabled
                ? 'Tudo recomeçou do zero, com Criar cacto dentro do Se.'
                : 'Tudo recomeçou do zero, com Criar cacto fora do Se.'
            }
            // ⚠️⚠️ Na `score` o PLACAR recomeça na troca (consertos do review da onda A do lote 5): o 5
            // que a peça solta deixou continuava no cartão e na fileira, e "no início, esperou" era
            // uma ausência que a imagem não marcava. Zerado, o início parado se vê: o placar fica em 0.
            if (scene === 'score') {
              s.match.points = 0
              s.match.clockRemainder = 0
              s.match.scoreFrameTicks = 0
              s.match.scoreClock = action.enabled
                ? s.match.scoreClock === 'frame'
                  ? 'frame'
                  : 'second'
                : s.match.scoreClock === 'frame'
                  ? 'frame'
                  : 'loose'
              s.match.seen = [...PLACAR_NAO_VISTO]
              s.caption = action.enabled
                ? 'O placar recomeçou do zero, com Somar ponto dentro do Se.'
                : 'O placar recomeçou do zero, com Somar ponto solto.'
            }
          }
          s.match.guarded = action.enabled
          break
        case 'life':
          // ⚠️ Sem legenda (review do lote 2): "a batida vai custar uma vida" e "bater não tira nada"
          // eram o resultado da batida, escritos ANTES de a criança bater.
          s.lifeline.onHit = action.enabled
          break
        case 'touch':
          s.match.touch = action.enabled
          break
        case 'restart':
          s.match.restartConnected = action.enabled
          break
        case 'limit':
          // ⚠️ Ligar a condição NÃO puxa a base de volta para −9 (lote 5 do Raio-X): a condição do
          // Estúdio só impede de diminuir, e a placa antiga (`max(−9, base)`) fazia a base pular.
          s.speed.limited = action.enabled
          break
        // ── Os fios do núcleo do Iniciante 2D ──────────────────────────────────────────────
        // ⚠️⚠️ Ligar ou desligar uma regra NÃO narra o que ela faz (review do lote 2 do Raio-X).
        // "O laço percorre o grupo sozinho e fica com o mais perto", "a mira: o tiro vai para onde a
        // seta aponta", "a diagonal passa a andar o mesmo que o reto", "o nascedouro passa a
        // reaproveitar o corpo": cada uma era a resposta da cena escrita ANTES do passo do relógio
        // que a mostra. O estado do fio a situação já diz; o resultado fica para quando acontece.
        case 'loop':
          s.hunt.auto = action.enabled
          // ⚠️ O tempo de laço ligado recomeça a cada liga e desliga (consertos do review da onda B).
          s.hunt.loopTicks = 0
          if (s.hunt.auto) {
            s.hunt.chosen = maisPerto(s.hunt.distances)
            s.hunt.looked = s.hunt.distances.map((_, i) => i + 1)
            s.hunt.measured = [...s.hunt.distances]
            s.hunt.blind = false
            // ⚠️⚠️ SEM a meta `auto` aqui (lote 5 do Raio-X): "a escolha acompanha" caía no ato de
            // ligar, com tudo parado. Ela cai no quadro em que o laço TROCA a escolha sozinho.
          }
          break
        case 'camera':
          ligarACamera(s, action.enabled)
          break
        case 'copy':
          ligarACopia(s, action.enabled)
          break
        case 'aim':
          s.sight.chasing = action.enabled
          break
        case 'even':
          s.walkPad.even = action.enabled
          s.walkPad.best = 0
          break
        case 'recycle':
          s.nursery.recycling = action.enabled
          // ⚠️ O relógio do nascedouro recomeça ao mexer no fio: "o contador PAROU de crescer" só
          // é uma descoberta depois de alguns passos COM a reciclagem ligada. Sem zerar aqui, os
          // passos de antes contariam e a criança ganharia a meta no primeiro toque.
          s.nursery.ticks = 0
          break
      }
      break

    case 'layer': {
      // ⚠️⚠️ Só a TROCA conta, e cada meta pede o gesto inteiro dela (lote 5 do Raio-X). A ação
      // observava os dois lados de uma vez: um toque em "Depois" fechava "floresta na frente" (que é
      // o estado de ABERTURA) e "Dino na frente" juntos, e "Antes" na peça que já estava antes
      // registrava meta sem mudar o desenho. Agora o Dino aparece ao ir para o fim da ordem, e
      // "escondeu de novo" pede levar a floresta de volta para o fim DEPOIS de ter visto o Dino na
      // frente: é o que prova que ninguém foi apagado, só a ordem mudou.
      const antes = s.world.front
      s.world.front = action.front
      if (antes === action.front) break
      // ⚠️ A terceira missão (full review de experiência, M4): o Dino de volta à frente DEPOIS de ter
      // escondido de novo. Era a condição escondida `settled` do avaliador.
      if (action.front && s.evidence.discoveries.includes('covered'))
        observe(s, 'back-in-front', 'O Dino voltou para a frente, como fica no jogo.')
      else if (action.front) observe(s, 'front', 'O Dino apareceu na frente.')
      else if (s.evidence.discoveries.includes('front'))
        observe(s, 'covered', 'Escondeu de novo só trocando a ordem.')
      break
    }

    case 'jump': {
      const jumped = s.flight.time === null
      const sounded = scene === 'jump-sound' && (s.sound.onJump ? jumped : action.input === 'key')
      if (sounded) s.sound.count++
      if (jumped) {
        // ⚠️ A marca do salto que já POUSOU vira a "de antes" (lote 5, `impulse`): as duas ficam no
        // palco, e a comparação que a instrução pede deixa de depender de memória.
        if (scene === 'impulse' && s.flight.peak > 0) {
          s.flight.before = s.flight.peak
          s.flight.beforeForce = s.flight.atForce
        }
        s.flight.time = 0
        s.flight.base = 0
        s.flight.atForce = s.flight.force
        s.flight.atGravity = s.flight.gravity
        s.flight.peak = 0
        s.sound.jumps++
        s.caption =
          scene === 'jump-sound'
            ? sounded
              ? 'Pulou, e o som tocou.'
              : 'Pulou, e nenhum som tocou.'
            : 'O impulso iniciou o salto.'
      } else
        s.caption = sounded
          ? 'O som tocou, e o Dino não pulou de novo.'
          : // ⚠️⚠️ "Já está no ar" só com o Dino NO AR. Com o salto começado e nada subido (o
            // relógio ainda não andou), o segundo toque respondia "já está no ar" com o Dino parado
            // no chão e "altura do salto 0" na faixa. A frase diz o que falta para ver o voo.
            // ⚠️ "Deixe o tempo passar", e não "avance o relógio": nenhum botão tem esse nome.
            s.flight.y < 1
            ? 'O salto já começou. Deixe o tempo passar para ver o Dino subir.'
            : 'O Dino já está no ar. Não aconteceu outro salto.'
      if (scene === 'jump-sound') baterNaLinhaDoTempo(s, action.input, jumped, sounded)
      break
    }

    case 'impulse':
      s.flight.force = action.force
      // ⚠️ Sem "seta": o controle é o deslizante "Impulso do salto". E a legenda EXISTE porque a
      // situação falaria do último salto com o impulso novo ("Impulso 14: chegou a 68"), misturando
      // o número de agora com a altura de antes.
      s.caption = `O próximo salto vai ter impulso ${action.force}.`
      break

    case 'advance': {
      // ⭐⭐ O relógio de quadro fixo (lote 4 do Raio-X): os segundos viram QUADROS inteiros no ritmo
      // da cena (`SCENE_FRAME_RATE`), e a sobra fica guardada para a próxima fatia. O ▶ em fatias
      // irregulares, o passo de um quadro e o roteiro de 1 s dão o mesmo mundo para o mesmo tempo.
      const fps = sceneFrameRate(scene)
      if (fps === null) break
      const quadros = quadrosDoTempo(s.clock, fps, action.seconds)
      // ⚠️⚠️ Nas cenas de salto, sem nada no ar a legenda FICA (review do lote 4). O pouso escreve a
      // frase dele ("De volta ao chão", "a mesma altura") no meio do `advance`, e os quadros seguintes
      // do MESMO `advance` não a apagam; com o ▶ a fatia seguinte apagava em 33 ms. O mesmo tempo
      // dava uma frase no roteiro de 1 s e outra em fatias, e na demonstração a frase do pouso
      // piscava um quadro. Sem voo, o relógio não muda nada na cena de salto: não há o que narrar
      // por cima.
      // ⚠️ O mesmo na `restart` fora da partida (lote 5): no início e no fim nada anda, e a frase da
      // batida ("fim da partida") some numa fatia e fica no `advance` inteiro.
      if (
        quadros > 0 &&
        !(SALTOS.includes(scene) && s.flight.time === null) &&
        !(scene === 'restart' && s.match.screen !== 'playing') &&
        scene !== 'collision-pair' &&
        scene !== 'invincibility' &&
        scene !== 'two-clocks'
      )
        s.caption = ''
      for (let q = 0; q < quadros; q++) umQuadro(s, start, fps)
      break
    }

    case 'move':
      s.contact.distance = action.distance
      moverNaHitbox(s)
      break

    case 'resize':
      redimensionarNaHitbox(s, previous, action.width)
      break

    case 'start':
      // ⚠️ Na `restart` o toque na tela vale em TODA tela (lote 5): no início começa, no fim faz o
      // que a criança escolheu para o toque. É o evento único do Estúdio ("qualquer tecla ou toque").
      if (scene === 'restart') {
        tocarNaTela(s, action.input)
        break
      }
      if (s.match.screen !== 'start') break
      if (scene === 'touch-response' && action.input !== 'tap') break
      if (
        (scene === 'controls' || scene === 'touch-response') &&
        action.input === 'tap' &&
        !s.match.touch
      ) {
        registrarTentativa(s, 'tap', false)
        observe(
          s,
          scene === 'controls' ? 'missing-touch' : 'no-response',
          'Tocou e nada aconteceu.',
        )
        // ⚠️ O que ACONTECEU, e não o que falta: "falta conectar esse controle" era o conserto,
        // escrito no instante em que a previsão ("o que acontece?") é revelada. A tela não muda,
        // então sem esta frase o toque pareceria não ter sido registrado (o selo do palco também).
        s.caption = 'Você tocou, e nada aconteceu.'
        break
      }
      s.match.screen = 'playing'
      s.match.scoreIdle = 0
      // ⚠️⚠️ O Enter vale COM ou SEM o fio do toque: ele sempre esteve ligado ao começo, e é por
      // ele que o professor manda começar ("comece pelo teclado e depois pelo toque"). Contando
      // só com o toque ligado, quem seguia a instrução via a partida começar pelo Enter e depois
      // lia "Ainda falta: Partida iniciada por Enter". A meta continua pedindo o que a criança
      // VÊ: a tela saindo do Início por aquele gesto (fora do Início o `start` nem chega aqui).
      if (scene === 'controls' || scene === 'touch-response')
        registrarTentativa(s, action.input, true)
      if (scene === 'controls' && action.input === 'key')
        observe(s, 'start-key', 'Começou com Enter.')
      else if (scene === 'controls') observe(s, 'start-tap', 'Começou tocando.')
      else if (scene === 'touch-response')
        observe(s, 'responds', 'O toque deixou o arbusto invisível e revelou o coelho.')
      else s.caption = 'A partida começou.'
      if (scene === 'score') verPlacar(s)
      break

    case 'score-place':
      s.match.scoreClock = action.clock
      s.match.guarded = action.guarded
      s.match.points = 0
      s.match.clockRemainder = 0
      s.match.scoreFrameTicks = 0
      s.match.scoreIdle = 0
      s.match.seen = [...PLACAR_NAO_VISTO]
      verPlacar(s)
      s.caption = `Somar ponto foi para ${action.clock === 'frame' ? 'A cada quadro do jogo' : action.clock === 'second' ? 'A cada 1 segundos' : 'fora dos relógios'}${action.guarded ? ', dentro do Se' : ''}. O placar voltou a zero.`
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
        // ⚠️ Sem legenda no fim (review do lote 2): "Confira se os pontos ficam parados" sugeria o
        // resultado da meta `score-end`. A situação diz onde a partida está e o placar.
        if (scene === 'score') verPlacar(s)
      }
      break

    case 'home':
      if (s.match.screen !== 'start') s.match.scoreIdle = 0
      // ⚠️ Na `game-state` a volta ao início limpa a pista (lote 5 do Raio-X): os cactos da partida
      // passavam pela tela de início, e "no início nada nasce" era conferido com cactos na tela.
      if (scene === 'game-state' && s.match.screen !== 'start') resetTrack(s)
      s.match.screen = 'start'
      // ⚠️ Sem "O placar foi preservado": três das quatro cenas de tela não TÊM placar, e na
      // `score` a frase entregava a meta `score-end` a quem só apertou o botão.
      if (scene === 'score') verPlacar(s)
      break

    case 'restart':
      // ⚠️ "Reiniciar o jogo" direto, de qualquer tela (o roteiro do professor e a sessão antiga).
      // A criança chega a ele pelo toque no fim, com a escolha "Reiniciar o jogo" (`tocarNaTela`).
      reiniciarOJogo(s)
      break

    case 'interval':
      if (scene === 'spawn' && isSpawnPreset(start.setup?.preset) && start.setup.preset.falling) {
        const frames = Math.round(action.seconds * 30)
        if (![20, 40, 80].includes(frames)) return previous
      }
      s.crowd.interval = action.seconds
      resetTrack(s)
      if (scene === 'spawn') s.crowd.fallComparison = undefined
      s.caption =
        scene === 'spawn' && isSpawnPreset(start.setup?.preset) && start.setup.preset.falling
          ? `Tudo recomeçou do zero, com o intervalo de ${Math.round(action.seconds * 30)} quadros.`
          : `Tudo recomeçou do zero, com o intervalo de ${decimal(action.seconds)} s.`
      break

    case 'sample':
      if (scene === 'acceleration') passarCincoSegundos(s, action.unit)
      else if (action.kind === 'position')
        sortearLugar(
          s,
          action.unit,
          isRandomPreset(start.setup?.preset) ? start.setup.preset.axis : 'right',
        )
      else sortearVelocidade(s, action.unit)
      break

    case 'hint':
      s.evidence.hints = Math.max(s.evidence.hints, action.level)
      break

    /**
     * O endereço na tela. A descoberta é por EIXO, e só conta quando o outro ficou parado —
     * mexer nos dois ao mesmo tempo não diz qual deles levou o Dino para onde.
     */
    case 'place': {
      if (scene === 'fixed-vs-read') {
        s.fixedRead.heroX = action.x
        break
      }
      const { x: antesX, y: antesY } = s.place
      // ⚠️ O endereço fica preso na tela DO CASO (lote 5): a ação aceita até 800 × 480, a maior tela
      // que um caso escolhe, e o motor prende no tamanho da tela aberta agora.
      const x = Math.min(action.x, s.place.width)
      const y = Math.min(action.y, s.place.height)
      const dx = x - antesX
      const dy = y - antesY
      /**
       * ⚠️⚠️ O fantasma fica onde a SEQUÊNCIA começou (consertos do review da onda A do lote 5). Um
       * toque de 20 numa tela de 800 × 480 são 12 px, e o fantasma, colado no personagem, ficava quase
       * inteiro atrás dele: "desceu" chegava pela legenda, e não pelo desenho. Três toques seguidos no
       * mesmo eixo e no mesmo sentido mostram agora a descida inteira. Sem campo novo: o toque
       * anterior foi de um eixo só quando o fantasma difere do lugar de agora só naquele eixo.
       */
      const seguiuNoX =
        dx !== 0 &&
        dy === 0 &&
        s.place.fromY === antesY &&
        Math.sign(antesX - s.place.fromX) === Math.sign(dx)
      const seguiuNoY =
        dy !== 0 &&
        dx === 0 &&
        s.place.fromX === antesX &&
        Math.sign(antesY - s.place.fromY) === Math.sign(dy)
      if (!seguiuNoX) s.place.fromX = antesX
      if (!seguiuNoY) s.place.fromY = antesY
      s.place.x = x
      s.place.y = y
      // ⚠️ A narração é aplicada NO FIM, depois dos `observe`: o rótulo serve ao relatório do
      // professor, a narração serve a quem está mexendo.
      // ⚠️ "desceu" em minúsculas e "O x ficou igual" (lote 5): "DESCEU, sem sair do lugar na
      // largura" gritava a resposta e dizia a outra coordenada de um jeito que ninguém fala.
      let narracao = ''
      if (dx !== 0 && dy === 0) {
        narracao =
          dx > 0
            ? `x foi de ${antesX} para ${x}: o Dino foi para a direita. O y ficou igual.`
            : `x foi de ${antesX} para ${x}: o Dino foi para a esquerda. O y ficou igual.`
        if (dx > 0 && x >= s.place.width)
          narracao = `x foi de ${antesX} para ${x}: o Dino passou da beirada da direita e saiu da tela.`
        if (dx > 0) observe(s, 'right', 'x maior leva para a direita', true)
      } else if (dy !== 0 && dx === 0) {
        narracao =
          dy > 0
            ? `y foi de ${antesY} para ${y}: o Dino desceu. O x ficou igual.`
            : `y foi de ${antesY} para ${y}: o Dino subiu. O x ficou igual.`
        // ⚠️ Na beirada a caixa inteira sai da tela, e "desceu" não dizia isso (consertos do review da
        // onda A do lote 5): é a pergunta extra da cena, e vale mostrar.
        if (dy > 0 && y >= s.place.height)
          narracao = `y foi de ${antesY} para ${y}: o Dino passou da beirada de baixo e saiu da tela.`
        if (dy > 0) observe(s, 'down', 'y maior leva para baixo', true)
      } else if (dx !== 0 && dy !== 0) {
        narracao = `Mudaram os dois: o Dino foi para ${dx > 0 ? 'a direita' : 'a esquerda'} e para ${dy > 0 ? 'baixo' : 'cima'}.`
      }
      /**
       * ⚠️⚠️ O 0, 0 é CHEGAR nele (lote 5 do Raio-X, 16/09/2026). A terceira meta era "mesmo x,
       * altura diferente", que caía junto com a segunda (o x de fábrica já contava como visitado):
       * três bolinhas para duas descobertas. Agora ela é um caso novo, a pergunta extra que virou
       * meta: com a marca no canto de cima da caixa, em 0, 0 o Dino encosta no canto da tela, por
       * dentro. Vindo de outro lugar: um caso que abre no canto não entrega a meta.
       */
      if (x === 0 && y === 0 && (antesX !== 0 || antesY !== 0))
        observe(s, 'origin', 'O 0, 0 fica no canto de cima, à esquerda', true)
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
      // A tela do CASO na `coordinates` (lote 5): o endereço fica preso nela, e nenhuma meta cai.
      if (scene === 'coordinates') {
        s.place.width = action.width
        s.place.height = action.height
        s.place.x = Math.min(s.place.x, action.width)
        s.place.y = Math.min(s.place.y, action.height)
        s.place.fromX = Math.min(s.place.fromX, action.width)
        s.place.fromY = Math.min(s.place.fromY, action.height)
        break
      }
      const mudou = s.stage.width !== action.width || s.stage.height !== action.height
      s.stage.width = action.width
      s.stage.height = action.height
      if (mudou) s.stage.tried += 1
      /**
       * ⚠️⚠️ Os números só descobrem alguma coisa COM A BORDA À VISTA (lote 5 do Raio-X, 16/09/2026).
       * Sem ela a tela tem a cor do espaço em volta: o número mudava, nada na tela mudava, e "a borda
       * acompanha os números" caía mesmo assim. E "Usar 480 por 270" fechava duas metas num toque sem
       * ninguém ver a tela. A bancada deixa os números fechados até a borda aparecer; o motor confere
       * de novo, porque um caso ou um roteiro podem mudar o tamanho com a borda escondida.
       */
      if (mudou && s.stage.border) observe(s, 'resized', 'A borda acompanha os números', true)
      // ⚠️ E CHEGANDO (`mudou`): reenviar o mesmo valor já na tela do alvo não é chegar nela.
      if (
        mudou &&
        s.stage.border &&
        action.width === STAGE_TARGET.width &&
        action.height === STAGE_TARGET.height
      )
        observe(
          s,
          'target',
          `Chegou na tela de ${STAGE_TARGET.width} por ${STAGE_TARGET.height}`,
          true,
        )
      // ⚠️ Sem legenda (review do lote 2): "Ligue a borda para ver onde ela acaba" era a resposta
      // da previsão ("sem a borda, dá para ver onde a tela acaba?") ANTES de a borda ligar. O
      // tamanho e a borda, a situação já diz.
      break
    }

    case 'border':
      s.stage.border = action.visible
      if (action.visible) observe(s, 'border-on', 'A borda mostra onde a tela acaba', true)
      // ⚠️ Sem legenda: "A moldura apareceu: é ali que o jogo acontece" e "a cor do fundo cobre
      // tudo e o limite some" eram a regra, com "moldura" como segunda palavra para a borda.
      break

    /**
     * O laço de desenho.
     *
     * ⚠️ As três descobertas são estados DIFERENTES do mesmo par de chaves, e cada uma só conta
     * quando o relógio anda: é o tempo passando que mostra a tela congelada, o rastro e o
     * movimento. Ligar a chave sem avançar não descobre nada — e é isso que faz a criança
     * avançar o relógio nas três situações em vez de só clicar.
     */
    // ⚠️ As duas chaves sem legenda (review do lote 2): "Sem limpar, o desenho de antes continua na
    // tela" era a resposta da previsão escrita antes de o relógio andar, e "Avance o relógio" é
    // nome de um botão que não existe. A faixa diz as chaves; a situação, o que está na tela.
    // ⚠️⚠️ Trocar a chave NÃO apaga a tela (lote 5 do Raio-X): o `trail = 0` daqui fazia o desenho do
    // começo sumir no instante em que a criança escolhia "a cada quadro", sem ninguém limpar nada.
    // Quem apaga é o quadro com a limpeza ligada; a chave só muda o que o próximo quadro faz.
    case 'loop':
      s.render.loop = action.on
      break

    case 'erase':
      s.render.erase = action.on
      break

    case 'describe':
      s.description.text = action.text
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
      // ⚠️ Toda escuta conta, inclusive a repetida: é o gatilho da VOZ no palco (lote 5).
      s.description.listens += 1
      if (!texto) {
        s.description.heard = SCREEN_READER_EMPTY
        s.description.heardEmpty = true
        observe(s, 'heard-empty', 'Sem frase, a pessoa ouve só Imagem', true)
        // ⚠️ Sem "o desenho não informa nada sozinho" (review do lote 2): é a resposta do "Agora
        // explique", embaixo do palco antes de a pergunta aparecer.
        s.caption = 'A pessoa ouviu só isso.'
        break
      }
      s.description.heard = `Tela do jogo. ${texto}`
      s.description.said = s.description.heard
      const { goal: objetivo, control: controle } = sceneDescriptionSays(texto)
      if (objetivo) observe(s, 'says-goal', 'A frase diz o que fazer', true)
      if (controle) observe(s, 'says-control', 'A frase diz como jogar', true)
      if (objetivo && sceneDescriptionHasAllControls(texto))
        observe(s, 'says-all-controls', 'A frase conta os três jeitos de pular', true)
      // ⚠️ "A frase" em todas, e sem "ela" (lote 5): a última dizia "mas ela ainda não diz", e quem
      // lê não sabe quem é "ela" (a pessoa? a descrição?).
      s.caption =
        objetivo && controle
          ? 'A frase diz o que fazer e como jogar.'
          : objetivo
            ? 'A frase já diz o que fazer no jogo. Falta dizer como jogar.'
            : controle
              ? 'A frase já diz como jogar. Falta dizer o que fazer no jogo.'
              : 'A frase ainda não diz o que fazer nem como jogar.'
      break
    }

    /**
     * Os dois quadros da nave: o fogo pequeno e o fogo grande.
     *
     * ⚠️ Trocar de quadro NA MÃO é a descoberta que abre a cena: são dois desenhos inteiros, e
     * a criança precisa ver os dois parados antes de a prévia juntá-los. Por isso a meta só conta
     * com a prévia parada: com ela tocando, quem trocou foi o relógio.
     */
    case 'frame': {
      const antes = s.animation.frame
      /**
       * ⚠️⚠️ Escolher um quadro com a prévia TOCANDO no motor PARA a prévia, como o clique numa miniatura
       * do Pinta (consertos do review da onda B do lote 5, MÉDIO-4). A bancada fecha a escolha enquanto
       * a prévia toca de verdade; o motor só chega aqui tocando quando o relógio do player parou POR
       * FORA (a aba escondida, um F5, o vídeo da aula). A tela mostrava a prévia parada, e o pedido de
       * `two-drawings` ("com a prévia parada, passe do quadro 1 para o quadro 2") seguido ao pé da
       * letra não derrubava a meta. ⚠️ ESTE toque não conta nenhuma meta (o quadro de antes veio do
       * relógio, e parar não é `paused-one`); o seguinte, com a prévia já parada, conta.
       */
      const tocava = s.animation.playing
      s.animation.playing = false
      s.animation.elapsed = 0
      s.animation.frame = action.index
      if (!tocava && action.index !== antes)
        observe(s, 'two-drawings', 'Com a prévia parada, olhou o quadro 1 e o quadro 2', true)
      if (tocava) s.caption = `A prévia parou. Na tela está o quadro ${action.index}.`
      // ⚠️⚠️ Chegar ao quadro 2 com o fantasma JÁ ligado também mostra o quadro 1 (review do lote 2).
      // Só o toque no fantasma contava, e quem ligou o fantasma no quadro 1 e depois foi para o 2 via
      // o fantasma e ouvia do "Conferir" que ainda faltava ligá-lo.
      if (scene === 'onion-skin' && action.index === 2 && s.animation.onion)
        observe(s, 'ghost-on', 'Viu o fogo 1 tracejado no quadro 2', true)
      // ⚠️ Sem legenda no quadro 1 com o fantasma (consertos do review da onda B do lote 5, B3): a parte
      // 4 da demonstração e a frase embaixo do palco diziam a MESMA frase, uma em cima da outra. Quem diz
      // que o quadro 1 não tem anterior é a situação, e o `onion` ao ligar.
      break
    }

    /**
     * A PRÉVIA do Pinta, que troca os dois quadros sozinha (lote 5 do Raio-X: era "a troca").
     *
     * ⭐ `paused-one`: PARAR a prévia rápida deixa UM quadro na tela, que é a resposta da previsão
     * ("quando o fogo pulsa rápido, o que está na tela?") agora vista. ⚠️ Só vale parando depois de
     * ver o fogo pulsar NAQUELA velocidade (as mesmas quatro trocas de `movement`): parar no instante
     * em que ligou não mostrou pulsação nenhuma.
     */
    case 'play': {
      if (scene === 'motion-amount') {
        s.motionAmount.playing = action.on
        s.motionAmount.viewedFrames = 0
        break
      }
      const a = s.animation
      if (!action.on && a.playing && !a.sameFrames && a.rate >= 6 && a.swaps >= 4)
        observe(s, 'paused-one', 'Parou a prévia rápida e viu um quadro só', true)
      if (action.on !== a.playing)
        s.caption = action.on
          ? 'A prévia começou.'
          : `A prévia parou. Na tela ficou o quadro ${a.frame}.`
      a.playing = action.on
      a.elapsed = 0
      break
    }

    case 'same-frames':
      s.animation.sameFrames = action.on
      s.animation.swaps = 0
      s.animation.elapsed = 0
      s.caption = action.on
        ? 'O quadro 2 ficou igual ao 1. A prévia pode trocar, mas o fogo não pulsa.'
        : 'O quadro 2 voltou a ter o fogo maior.'
      break

    case 'rate':
      if (scene === 'two-clocks') {
        s.twoClocks.animationRate = action.perSecond as 2 | 8 | 16
        if (s.twoClocks.frames === 0) s.twoClocks.rateAtStart = s.twoClocks.animationRate
        break
      }
      s.animation.rate = action.perSecond
      s.animation.elapsed = 0
      // ⚠️ As trocas contam a partir da velocidade ESCOLHIDA: as duas descobertas são "devagar dá
      // para ver os dois" e "rápido vira movimento", e sem zerar aqui a segunda vinha de graça
      // (bastava ter rodado rápido antes e baixar a velocidade para a primeira fechar na hora).
      s.animation.swaps = 0
      // ⚠️ "quadros por segundo", o nome da Velocidade no Pinta (lote 5): era "trocas por segundo".
      s.caption = `Velocidade: ${quantos(action.perSecond, 'quadro', 'quadros')} por segundo.`
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
        observe(s, 'ghost-on', 'Viu o fogo 1 tracejado no quadro 2', true)
      // ⚠️ Sem "Ele é guia, não entra na animação" (review do lote 2): é a resposta do "Agora
      // explique" ("para que serve o fantasma?"), e a demonstração da Aula 3 a mostrava.
      // ⚠️⚠️ "Tracejado", e não "clarinho por baixo" (consertos do review da onda B do lote 5, A2): o
      // fantasma é só o CONTORNO tracejado do fogo 1, desenhado por cima do fogo 2 inteiro.
      if (action.on)
        s.caption =
          s.animation.frame === 2
            ? 'O fogo tracejado é o do quadro 1.'
            : 'No quadro 1 não há quadro anterior para mostrar.'
      break

    /**
     * O tamanho do fogo 2 (lote 5 do Raio-X). ⚠️⚠️ Era o "passo" de um Dino que ANDAVA entre os
     * quadros, com a régua "passo 52" entregando a medida sem o fantasma. Hoje o corpo fica parado e
     * só o fogo cresce (`onionFireLength`); sem o fantasma a frase não mede nada, e com ele diz o
     * que se VÊ nas duas pontas (quase igual, um pouco maior, passando da borda do quadro).
     * ⚠️ As duas metas pedem o QUADRO 2 na tela: é o fogo dele que muda.
     * ⚠️ O deslizante da bancada manda o valor só ao SOLTAR (`Medida soltar`): arrastar de 40 até 0
     * passava por 28..12 e fechava `even-step` por acidente.
     */
    case 'shift': {
      s.animation.shift = action.offset
      const noDois = s.animation.frame === 2
      const zona = onionFireZone(action.offset)
      if (noDois && !s.animation.onion)
        observe(s, 'blind-move', 'Mudou o fogo 2 sem ver o fogo 1', true)
      else if (noDois && zona === 'pouco')
        observe(s, 'even-step', 'Com o fantasma, deixou o fogo 2 maior e dentro do quadro', true)
      // ⚠️ Sem "mudou de tamanho" (full review de experiência, M7): sem o fantasma a criança vê UM fogo,
      // e é justamente essa a descoberta da parte 1 ("não dá para saber"). A frase não afirma mudança.
      s.caption = !s.animation.onion
        ? 'Sem o fantasma, só o fogo 2 está na tela.'
        : zona === 'quase'
          ? 'Com o fantasma: o fogo 2 está quase igual ao fogo 1.'
          : zona === 'pouco'
            ? 'Com o fantasma: o fogo 2 cresceu um pouco e cabe no quadro.'
            : 'Com o fantasma: o fogo 2 passou da borda do quadro.'
      break
    }

    /** Os dois espelhos do Pinta, sempre no meio (lote 5 do Raio-X). Sem legenda: a faixa diz qual. */
    case 'mirror-mode':
      s.mirror.on = action.mode !== 'off'
      if (action.mode !== 'off') s.mirror.axis = action.mode
      break

    /**
     * O traço e a cópia do espelho, na grade 16 × 16 da nave (lote 5 do Raio-X).
     *
     * As primeiras três metas são sobre QUAL espelho estava ligado no traço: desligado, lado a lado e de
     * cima e de baixo, os dois espelhos do Pinta. O terceiro só conta DEPOIS do lado a lado (a bancada
     * o deixa fechado com o motivo até lá): é o caso novo, que a criança prevê com o que já viu.
     */
    case 'trace':
    case 'dot': {
      const base = action.type === 'trace' ? action.piece : `p:${action.x},${action.y}`
      const nome = action.type === 'trace' ? NOME_DO_TRACO[action.piece] : 'um quadradinho'
      pintarMarca(s, base)
      // ⚠️ Os GESTOS contam, e não as marcas (consertos do review da onda B do lote 5, B4): pintar a asa
      // de novo não é marca nova, e a faixa ficava parada no quarto toque.
      const copias = mirrorCopyAxes(s.mirror.on, s.mirror.axis)
      s.mirror.strokes = Math.min(GESTOS_NO_PAPEL, s.mirror.strokes + 1)
      s.mirror.copies = Math.min(GESTOS_NO_PAPEL, s.mirror.copies + copias.length)
      if (copias.length === 0) {
        observe(s, 'one-side', 'Pintou com o espelho desligado', true)
        s.caption = `Você pintou ${nome}.`
        break
      }
      for (const eixo of copias) pintarMarca(s, `${base}|${eixo}`)
      // ⚠️ Com os DOIS espelhos (duas chaves, como no Pinta) nenhuma meta cai: é o "E se os dois
      // espelhos estivessem ligados?" do fim da cena, que a criança agora pode tentar.
      if (s.mirror.axis === 'xy') {
        s.caption = `Você pintou ${nome}. Os dois espelhos pintaram três cópias.`
        break
      }
      // ⚠️⚠️ A cópia COLADA no traço não conta (consertos do review da onda B do lote 5, A3): a cabine e a
      // ponta moram no meio, e a cópia encostada é o desenho da resposta errada da previsão.
      if (!symmetryCopySeparated(base, s.mirror.axis)) {
        s.caption = `Você pintou ${nome} bem no meio. A cópia encostou no traço.`
        break
      }
      if (s.mirror.axis === 'x') observe(s, 'two-sides', 'Pintou com o Espelho lado a lado', true)
      else if (s.evidence.discoveries.includes('two-sides'))
        observe(s, 'axis-decides', 'Pintou com o espelho de cima e de baixo', true)
      // ⚠️ Sem "do outro lado do meio" (a resposta da previsão) e sem "virada": o desenho mostra onde.
      s.caption = `Você pintou ${nome}. O espelho pintou uma cópia.`
      break
    }

    case 'fill':
      s.mirror.filled = true
      if (s.mirror.on && s.mirror.axis === 'x')
        observe(s, 'fill-ignores-mirror', 'Com o espelho ligado, o Balde encheu um lado só', true)
      s.caption =
        'O Balde encheu só a asa esquerda. O espelho continua ligado, mas não copiou a tinta.'
      break

    case 'clear-paper':
      s.mirror.marks = []
      s.mirror.filled = false
      s.mirror.strokes = 0
      s.mirror.copies = 0
      s.caption = 'O papel ficou em branco.'
      break

    /**
     * A lupa sobre as duas pedras (lote 5 do Raio-X: UMA lupa para as duas).
     *
     * ⚠️⚠️ A pedra que não estava sob a lupa ficava em 2, e a comparação virava memória. Hoje o zoom
     * vale para as DUAS e o `kind` só fica guardado. As metas pedem o que o palco desenha em cada
     * degrau (`LUPA`, a mesma régua da faixa e da frase): em 4 as bordas ficam diferentes, em 6
     * aparecem os pontos da Caneta, e voltar para longe só conta DEPOIS de ter visto de perto.
     */
    case 'inspect': {
      s.pixels.kind = action.kind
      s.pixels.zoom = action.zoom
      if (action.zoom >= LUPA.perto)
        observe(s, 'stairs', 'Aproximou até as bordas ficarem diferentes', true)
      if (action.zoom >= LUPA.pontos)
        observe(s, 'smooth', 'Aproximou até ver os pontos do vetor', true)
      if (action.zoom <= LUPA.longe && s.evidence.discoveries.includes('stairs'))
        observe(s, 'alike', 'Voltou para longe e comparou de novo', true)
      // Sem legenda: a situação diz onde a lupa está, e a borda está no desenho.
      break
    }

    /**
     * O quadro da folha que o recorte pega (lote 5 do Raio-X). ⚠️ Preso ao que cabe na LARGURA de
     * agora (`sheetCropCell`): com 32 são dois quadros, com 16 são quatro lugares. As metas `cut` e
     * `two-cells` saíram: trocar de quadro é o fogo pulsando na demonstração, e não uma descoberta.
     */
    case 'cut': {
      const cell = sheetCropCell(action.cell, s.sheet.width)
      if (!s.sheet.cuts.includes(cell)) s.sheet.cuts.push(cell)
      s.sheet.cell = cell
      s.sheet.loaded = true
      // ⚠️ Com 32, a frase diz o que o JOGO mostra (consertos do review da onda B do lote 5, B9): "o
      // recorte está no quadro 2 de 2" repetia a faixa e não dizia que o fogo mudou.
      s.caption =
        s.sheet.width === FOLHA_DA_NAVE.quadro
          ? `Recorte no quadro ${cell}: no jogo, a nave com o fogo ${cell === 2 ? 'grande' : 'pequeno'}.`
          : s.sheet.width < FOLHA_DA_NAVE.quadro
            ? `O recorte está no lugar ${cell} de ${sheetCropCount(s.sheet.width)}.`
            : 'O recorte já pega a folha inteira.'
      break
    }

    /**
     * A LARGURA do recorte (lote 5 do Raio-X), o que a seção da Aula 6 promete: "comparar largura
     * de recorte 16 e 32 na mesma folha, mantendo o sprite do jogo em 54 × 54". O jogo mostra o
     * recorte ESTICADO no quadrado do sprite, como o Estúdio: 16 é meia nave, 32 uma nave, 64 as duas.
     * ⚠️ A escolha dispara também na largura já marcada: olhar de novo é ver o que está na tela.
     */
    case 'crop': {
      s.sheet.width = action.width
      s.sheet.cell = sheetCropCell(s.sheet.cell, action.width)
      // O jogo, que abre vazio, passa a mostrar o recorte (consertos do review da onda B do lote 5, A4).
      s.sheet.loaded = true
      if (action.width === FOLHA_DA_NAVE.largura) {
        observe(s, 'squeezed', 'Viu o jogo mostrar a folha inteira', true)
        s.caption = 'No jogo: a folha inteira, com as duas naves espremidas.'
      } else if (action.width === FOLHA_DA_NAVE.quadro) {
        observe(s, 'crop-whole', 'Achou o recorte que mostra uma nave inteira', true)
        s.caption = 'Recorte de 32: no jogo aparece uma nave inteira.'
      } else {
        observe(s, 'crop-half', 'Recortou 16 e olhou o jogo', true)
        s.caption = 'Recorte de 16: no jogo aparece metade da nave.'
      }
      break
    }

    /**
     * O tamanho no jogo. ⚠️⚠️ Só conta DEPOIS de achar o recorte de uma nave inteira (lote 5 do
     * Raio-X): a bancada o deixa fechado com o motivo até lá. Antes era a ÚNICA meta da Aula 6, e
     * um toque no + a fechava sem a criança ter olhado a folha nem o recorte.
     */
    case 'sprite': {
      const antes = s.sheet.size
      s.sheet.size = action.size
      // ⚠️⚠️ A nave do jogo precisa ficar VISIVELMENTE maior ou menor (consertos do review da onda B do
      // lote 5, B8): um toque no + (54 para 62) fechava a meta com a nave quase igual, 11 ms depois.
      const diferente = action.size < TAMANHO_PARECIDO.min || action.size > TAMANHO_PARECIDO.max
      if (action.size !== antes && diferente && s.evidence.discoveries.includes('crop-whole'))
        observe(s, 'size-apart', 'Mudou o tamanho no jogo e conferiu a folha', true)
      // ⚠️ Sem "Na folha, nada mudou": é o que a criança confere olhando a folha.
      s.caption = `No jogo, a nave tem ${action.size} por ${action.size}.`
      break
    }

    /* ── O núcleo do Iniciante 2D ───────────────────────────────────────────────────────── */
    case 'velocity': {
      s.drive.vx = action.vx
      s.drive.vy = action.vy
      // O caminho das metas de sentido recomeça a contar daqui (ver `SceneDrive.anchorX`).
      s.drive.anchorX = s.drive.x
      s.drive.anchorY = s.drive.y
      // ⚠️ O rastro recomeça junto (lote 5): o da velocidade anterior fica em cinza, para o −5 e o −6
      // ficarem lado a lado. Um toque que não andou nada não apaga o cinza que já estava lá.
      if (s.drive.trailX.length > 1) {
        s.drive.prevX = s.drive.trailX
        s.drive.prevY = s.drive.trailY
      }
      s.drive.trailX = [s.drive.x]
      s.drive.trailY = [s.drive.y]
      s.drive.steps = 0
      // Sem legenda: a situação diz a velocidade e onde o Dino está, com o sinal de menos certo.
      break
    }
    case 'press': {
      // ⚠️⚠️ Lote 5 do Raio-X: o `press` é um TOQUE rápido na mesma tecla (afunda e solta no mesmo
      // instante). Ele continua legal para os roteiros e as sessões de antes; a bancada só tem a tecla.
      if (s.input.holding) break
      afundarATecla(s)
      soltarATecla(s)
      break
    }
    case 'hold': {
      // ⚠️ Sem legenda (review do lote 2): "veja a de baixo andar enquanto durar" era a opção certa
      // da previsão, no toque em Segurar, antes do relógio que a mostra.
      // ⚠️⚠️ Lote 5 do Raio-X: afundar a tecla é também o "quando apertar" (a de cima dá um passo), e
      // afundar de novo o que já está afundado (a repetição do teclado) não é outro aperto.
      if (action.on && !s.input.holding) afundarATecla(s)
      else if (!action.on && s.input.holding) soltarATecla(s)
      break
    }
    case 'store': {
      guardarNaCaixa(s, action.value)
      break
    }
    case 'change': {
      const antes = s.box.value
      // ⚠️ Sem caixa não há o que somar (lote 5 do Raio-X): o primeiro bloco do jogo é criá-la.
      if (!s.box.created) {
        s.caption = 'Ainda não existe caixa. Guarde um número primeiro.'
        break
      }
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
      // ⚠️ Diz O QUÊ mudou (consertos do review da onda A do lote 5): "2 + 1 = 3." não dizia de quem.
      s.caption = `A caixa pontos foi de ${numero(antes)} para ${numero(s.box.value)}.`
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
      // ⚠️ Sem "O valor guardado continua o mesmo" (review do lote 2): era a meta `shown`.
      break
    }
    case 'look': {
      if (!s.hunt.looked.includes(action.id)) s.hunt.looked.push(action.id)
      // ⚠️ A FOTO do número (consertos do review da onda B do lote 5): sem o laço, a régua fica com ele.
      s.hunt.measured[action.id - 1] = s.hunt.distances[action.id - 1] ?? 0
      if (s.hunt.looked.length === s.hunt.distances.length)
        observe(s, 'looked-all', 'Mediu os três antes de escolher', true)
      // ⚠️ "Medir" (lote 5 do Raio-X): o botão traça uma régua da torre até AQUELE cacto.
      s.caption = `O ${action.id}º está a ${s.hunt.distances[action.id - 1]}.`
      break
    }
    case 'choose':
      escolherOCacto(s, action.id)
      break
    case 'define':
      mudarAFicha(s, action.field, action.value)
      break
    case 'spawnOne':
      nascerDaFicha(s)
      break
    case 'walk':
      andarNoMundo(s, action.x)
      break
    case 'approach': {
      if (scene === 'circle-collision') {
        s.circles.distance = Math.min(action.distance, SCENE_LIMITS.centers.max)
        conferirCirculos(s)
        break
      }
      s.hit.distance = action.distance
      // Sem legenda: a distância e a vida perdida a situação já diz.
      break
    }
    case 'shoot': {
      if (scene === 'fixed-vs-read') {
        const { heroX, source, boxMarks } = s.fixedRead
        const shot = {
          id: s.fixedRead.nextId++,
          x: source === 'fixed' ? 400 : heroX,
          y: 390,
          heroX,
          source,
        }
        s.fixedRead.shots = [...s.fixedRead.shots.slice(-11), shot]
        s.fixedRead.marks = [...s.fixedRead.marks.slice(-11), { ...shot }]
        const fixed = s.fixedRead.marks.filter((mark) => mark.source === 'fixed')
        if (
          fixed.some((first) =>
            fixed.some((other) => first.heroX !== other.heroX && first.x === other.x),
          )
        )
          observe(s, 'same-spot', 'Com o número escrito, os dois tiros nasceram no mesmo lugar')
        if (source === 'read' && heroX !== 400 && shot.x === heroX)
          observe(s, 'follows', 'Com a leitura, o tiro nasceu onde a nave estava')
        if (boxMarks && shot.x === heroX)
          observe(s, 'box-marks', 'O tiro sai do meio da caixa e da borda de cima dela')
        s.caption = `O tiro nasceu em x ${shot.x} e continua subindo desse lugar.`
        break
      }
      if (scene === 'lives') {
        acertarComOTiro(s)
        break
      }
      if (scene === 'aim') {
        atirarNoAlvo(s)
        break
      }
      atirarComRecarga(s)
      break
    }
    case 'recharge': {
      s.weapon.seconds = action.seconds
      s.weapon.ready = 0
      s.weapon.shots = 0
      s.weapon.refused = 0
      s.weapon.shotTimes = []
      s.weapon.refusedAt = -1
      // ⚠️ Lote 5 do Raio-X: mexer na recarga NÃO apaga os tiros que estão voando.
      // Sem legenda: "o tiro sai sempre que for pedido" era a regra; a recarga, a situação diz.
      break
    }
    case 'target': {
      // ⚠️ Arrastar o alvo para onde ele já estava não vira a seta — e é o que o deslizante
      // manda quando a criança bate no batente da faixa.
      const moveu = s.sight.targetX !== action.x || s.sight.targetY !== action.y
      s.sight.targetX = action.x
      s.sight.targetY = action.y
      if (!moveu) {
        s.caption = `O alvo já estava em x ${action.x}, y ${action.y}.`
        break
      }
      observe(s, 'arrow', 'A seta virou quando o alvo mudou de lugar', true)
      // ⚠️ "x" e "y" escritos (lote 5): "alvo 360, 80" não dizia qual número era qual.
      s.caption = `O alvo foi para x ${action.x}, y ${action.y}.`
      break
    }
    case 'direction': {
      // ⚠️ Sem legenda: com as duas setas soltas ela dizia "Numa seta só: é reto". As setas
      // apertadas, a situação diz.
      s.walkPad.dx = action.x
      s.walkPad.dy = action.y
      break
    }
    case 'stride':
      andarUmSegundo(s)
      break
    case 'paint-tile':
      escreverNoMapa(s, action.row, action.col, action.tile)
      break

    /* ── O motor, o 3D e o ateliê ────────────────────────────────────────────────────────── */
    case 'brain': {
      const antes = s.brains.states[action.id - 1]
      // ⭐⭐ O estado MORA NO JOGO (lote 5 do Raio-X, `brain-scope`): uma escolha só, e as três torres
      // mudam juntas. É a crença errada que a cena deixa a criança testar ("o estado é do jogo"), e
      // por isso nenhuma das metas de "cada uma" cai por aqui.
      if (s.brains.shared) {
        const mudou = s.brains.states.some((e) => e !== action.state)
        s.brains.states = s.brains.states.map(() => action.state)
        if (mudou) observe(s, 'shared', 'Com o estado no jogo, as três mudaram juntas', true)
        s.caption = `As três torres agora estão ${estadoNoPlural(action.state)}.`
        break
      }
      // ⚠️⚠️ A diversidade é medida ANTES da mudança. Contando DEPOIS, a própria mudança
      // satisfazia o guard: um único toque a partir dos três parados fechava as duas metas de
      // uma vez, e "cada um ficou no seu próprio estado" caía com dois dos três ainda iguais.
      const distintosAntes = new Set(s.brains.states).size
      s.brains.states[action.id - 1] = action.state
      // A meta diz "cada uma no SEU estado", então ela pede as três diferentes — nem duas.
      if (new Set(s.brains.states).size === 3)
        observe(s, 'own', 'As três ficaram em estados diferentes', true)
      // ⚠️ "Mudar uma não mexe nas outras" só conta quando havia outra para mexer: com as três
      // iguais, a independência não teria sido mostrada.
      // ⚠️⚠️ E só depois de o relógio ter andado (review do lote 2): antes dele ninguém FEZ nada, e
      // a meta caía no meio da montagem pedida pela primeira (o 2º toque fechava `own` e
      // `independent` juntos), deixando a parte 2 do roteiro sem o que mostrar.
      if (antes !== action.state && distintosAntes > 1 && s.brains.ticks > 0)
        observe(s, 'independent', 'Mudou uma torre e as outras não mudaram', true)
      // ⚠️ Só a torre que mudou (lote 5): "As outras continuam como estavam" era a resposta da
      // previsão ("o que as outras duas fazem?"), escrita no primeiro gesto.
      s.caption = `A ${action.id}ª torre agora está ${estadoLido(action.state)}.`
      break
    }
    case 'brain-scope': {
      if (s.brains.shared === action.shared) break
      s.brains.shared = action.shared
      // ⚠️ No jogo há UM estado: as três passam a seguir o da 1ª, e a tela mostra isso na hora. Voltar
      // para "em cada uma" não mexe em nada: cada torre fica com o estado que tinha.
      if (action.shared) {
        const doJogo = s.brains.states[0] ?? 'parado'
        s.brains.states = s.brains.states.map(() => doJogo)
        // ⚠️ A troca DITA (consertos do review da onda B do lote 5): com a 2ª atirando, a frase só dizia
        // "a 2ª parada", e a criança não sabia por que ela tinha parado.
        s.caption = 'Agora o estado mora no jogo: as três seguem a 1ª.'
      }
      break
    }
    case 'count': {
      // ⚠️⚠️ Trocar como o Dino anda RECOMEÇA a corrida (lote 5 do Raio-X): as pegadas e a chegada são
      // de uma corrida só, e continuar do meio misturaria passos das duas regras na mesma pista.
      s.machines = { ...s.machines, mode: action.kind, ...CORRIDA_NA_LARGADA }
      s.caption =
        action.kind === 'frames'
          ? 'Agora o Dino anda a cada quadro. A corrida recomeçou na largada.'
          : 'Agora o Dino anda a cada segundo. A corrida recomeçou na largada.'
      break
    }
    case 'radius': {
      // ⚠️ A descoberta desta cena é a CONTA, e a prova dela é o mesmo lugar deixar de ser (ou
      // passar a ser) uma batida só porque o raio mudou. Por isso a comparação é aqui, com a
      // distância PARADA: dentro do `conferirCirculos` (que também roda no relógio) ela não teria
      // como separar o que mudou o resultado.
      const antes = encostam(s)
      if (action.which === 'a') s.circles.a = action.value
      else s.circles.b = action.value
      if (antes !== encostam(s))
        observe(s, 'formula', 'Com os círculos parados, mudar um raio trocou o resultado', true)
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
        if (eixo === 'z') observe(s, 'depth', 'O z leva para a frente e para o fundo', true)
        if (eixo === 'y' && action.y > antes.y)
          observe(s, 'up', 'No 3D, o y maior é mais ALTO', true)
        // ⚠️⚠️ A sombra diz onde o cubo está quando ela ANDA pelo chão com ele no ar (lote 5 do
        // Raio-X): mexer só no x ou no z, já no ar. Antes a meta caía no mesmo toque do y que fecha
        // `up`, com a sombra parada. ⚠️ E continua pedindo ter mexido na ALTURA: um caso que abre no
        // ar não entrega a sombra a quem só mexeu no x.
        if ((eixo === 'x' || eixo === 'z') && antes.y > 0 && s.space.moved.includes('y'))
          observe(s, 'shadow', 'No ar, a sombra andou pelo chão junto com o cubo', true)
      }
      // Sem legenda: os três números e se o cubo está no ar, a situação já diz.
      break
    }
    case 'orbit': {
      if (start.scene === 'mesh') {
        // ⚠️ Sem "Olhe as faces por outro lado" (review do lote 2): "faces" confundia com o rosto
        // desenhado. ⚠️ Com os pontos à vista (lote 5), a frase diz o que se vê girar; só com a pele,
        // ela diria que há pontos embaixo, que é a resposta da previsão.
        const girou = s.model.yaw !== action.yaw
        s.model.yaw = action.yaw
        if (girou && s.model.see !== 'nada')
          s.caption = 'O modelo girou, e os pontos giraram junto.'
        break
      }
      const girou = s.orbit.yaw !== action.yaw || s.orbit.pitch !== action.pitch
      s.orbit.yaw = action.yaw
      s.orbit.pitch = action.pitch
      const faces = facesAVista(action.yaw, action.pitch)
      s.orbit.fewest = Math.min(s.orbit.fewest, faces)
      // ⚠️⚠️ As metas dizem "GIROU até ver", e a cena ABRE mostrando duas cores — sem o `girou` a
      // de duas caía sozinha, inclusive num `orbit` que não mexia em nada.
      if (girou && faces === 1) observe(s, 'one-face', 'Girou até ver uma cor só', true)
      if (girou && faces === 2) observe(s, 'two-faces', 'Girou até ver exatamente duas cores', true)
      // ⚠️ Lote 5 do Raio-X: a terceira meta é achar TRÊS cores (no canto, por cima ou por baixo).
      if (girou && faces === 3) observe(s, 'three-faces', 'Achou um lugar com três cores', true)
      if (girou && (action.yaw !== 1 || action.pitch !== 1)) s.orbit.returned = false
      // ⚠️⚠️ SEM a conta das cores (lote 2 do Raio-X): "Daqui dá para ver N cor(es) do cubo" saía
      // embaixo do palco a cada giro, e contar as cores é a TAREFA da cena. Sem acontecimento, a
      // frase cai na situação (`readout.ts`), que diz onde a câmera está.
      break
    }
    case 'recenter': {
      // ⚠️ "Voltou à vista de sempre" pede ter SAÍDO dela: apertado como primeiro gesto, o botão
      // fechava a meta sem a câmera ter andado. O `orbit.returned` existe para isso e era campo
      // morto — só escrito, nunca lido. ⚠️ Desde o lote 5 a meta vale só num caso (`soNoCaso`): o
      // botão é atalho, e apertar um atalho não é descoberta.
      const saiu = s.orbit.yaw !== 1 || s.orbit.pitch !== 1
      s.orbit.yaw = 1
      s.orbit.pitch = 1
      s.orbit.returned = saiu || s.orbit.returned
      if (saiu) observe(s, 'back', 'Voltou para onde a câmera começou com um toque', true)
      // ⚠️ "onde começou", e não "a vista de sempre" (consertos do review da onda B do lote 5): a
      // criança não conhece o canto do começo como "de sempre".
      s.caption = saiu ? 'A câmera voltou para onde começou.' : 'A câmera já estava onde começou.'
      break
    }
    case 'see-points':
      verOsPontos(s, action.level)
      break
    case 'point': {
      s.ray.x = action.x
      s.ray.y = action.y
      const caminho = scenePickPath(action.x, action.y)
      const caixa = caminho[0] ?? 0
      s.ray.hit = caixa
      if (caixa) {
        if (!s.ray.hits.includes(caixa)) s.ray.hits.push(caixa)
        // ⚠️⚠️ As duas metas são de lugares DIFERENTES (lote 5 do Raio-X). "A caixa mirada acendeu"
        // caía também onde uma cobre a outra, e mirar direto no pedaço comum fechava as duas no mesmo
        // gesto: o palpite ("qual acende?") só voltava junto com a conclusão.
        if (caminho.length === 1) observe(s, 'face', 'A caixa mirada acendeu', true)
        // ⚠️ A meta é a OCLUSÃO, e ela só existe onde há DUAS caixas no caminho.
        else observe(s, 'first', 'Com duas no caminho, acendeu a mais perto', true)
      }
      // Sem legenda (lote 5): onde a reta bateu e quem ficou atrás, a situação diz.
      break
    }
    case 'ink': {
      if (action.part === 'fill') s.ink.fill = action.on
      else s.ink.stroke = action.on
      const arranjo =
        s.ink.fill && s.ink.stroke ? 'both' : s.ink.fill ? 'fill' : s.ink.stroke ? 'stroke' : 'none'
      if (!s.ink.seen.includes(arranjo)) s.ink.seen.push(arranjo)
      // ⚠️ Os rótulos com as palavras do Pinta (lote 5 do Raio-X): Preenchimento, Contorno e Sem cor.
      if (arranjo === 'fill') observe(s, 'only-fill', 'Deixou o contorno em Sem cor', true)
      if (arranjo === 'stroke') observe(s, 'only-stroke', 'Deixou o preenchimento em Sem cor', true)
      if (arranjo === 'both' && s.ink.seen.length > 1)
        observe(s, 'both', 'Voltou as duas partes com cor', true)
      // Sem legenda: era a situação repetida com uma vírgula a mais.
      break
    }
    case 'light': {
      s.light.side = action.side
      if (s.light.shade && !s.light.sides.includes(action.side)) s.light.sides.push(action.side)
      if (s.light.sides.length > 1)
        observe(s, 'side', 'Mudou o sol de lado e viu a sombra trocar de lado', true)
      break
    }
    case 'shade': {
      const antes = s.light.shade
      s.light.shade = action.on
      if (action.on) {
        if (!s.light.sides.includes(s.light.side)) s.light.sides.push(s.light.side)
        observe(s, 'volume', 'Ligou os tons e viu a bola redonda', true)
        // ⚠️ Lote 5 do Raio-X: o roteiro muda o SOL primeiro e liga os tons depois (na ordem de antes
        // a sombra aparecia do lado errado por um instante). Ligar os tons com o sol do outro lado
        // de onde a sombra já foi vista também é ver a sombra trocar de lado.
        if (s.light.sides.length > 1)
          observe(s, 'side', 'Mudou o sol de lado e viu a sombra trocar de lado', true)
      }
      // ⚠️ A forma NASCE chapada, então desligar a sombra sem nunca tê-la ligado não muda um
      // pixel — e a meta caía nesse nada. "Parece um adesivo" é uma COMPARAÇÃO: só vale depois
      // de a criança ter visto o volume e tirado ele.
      else if (antes) observe(s, 'flat', 'Tirou os tons e viu a bola chapada de novo', true)
      // ⚠️ Sem legenda (review do lote 2): "a segunda cor mais escura deixa de parecer chapada" era a
      // certa da previsão, com um "ela" sem antecedente, e dizia a mesma coisa que a legenda da
      // demonstração logo acima do palco.
      break
    }

    case 'reset': // Recomeçar o mundo NUNCA apaga o que a criança já descobriu. E recomeça no CASO desta
      // atividade, não no mundo de fábrica: quem abriu numa tela de 480 por 270 volta para ela.
      // ⚠️ SEM `caption`: a frase embaixo do palco é a narração da CENA, e um recado de
      // persistência ali ocupava o lugar dela — a criança recomeçava e lia "suas descobertas
      // foram guardadas" onde devia ler o que está na tela agora. O aviso de que nada se perdeu
      // é do player, e mora no rodapé, junto do irmão dele ("Experiência salva na sua conta").
      {
        const restarted = { ...openScene(start), evidence: s.evidence, caption: '' }
        if (scene === 'collision-pair') {
          restarted.collisionPair.shotTarget = s.collisionPair.shotTarget
          restarted.collisionPair.rockTarget = s.collisionPair.rockTarget
        }
        if (scene === 'invincibility')
          restarted.invincibility.protection = s.invincibility.protection
        if (scene === 'number-line') restarted.numberLine.operator = s.numberLine.operator
        if (scene === 'two-clocks') {
          restarted.twoClocks.birthEvery = s.twoClocks.birthEvery
          restarted.twoClocks.animationRate = s.twoClocks.animationRate
          restarted.twoClocks.birthAtStart = s.twoClocks.birthEvery
          restarted.twoClocks.rateAtStart = s.twoClocks.animationRate
        }
        return restarted
      }
  }
  /**
   * ⚠️⚠️ Nas cenas de quadro LONGO o gesto RECOMEÇA o quadro (review do lote 4 do Raio-X, 16/09/2026).
   *
   * A sobra de antes do gesto não pode valer para o estado de depois. Com o ▶ rodando, a criança faz
   * o gesto num ponto qualquer do quadro de 1 s, e o quadro que fechava 0,04 s depois rodava a lógica
   * inteira no estado NOVO: na `score`, "no início o placar ficou parado" e "no fim o valor ficou
   * guardado" caíam 0,05 s depois de bater (23% das vezes abaixo de 0,25 s), somando ao estado novo
   * um segundo que a criança viu quase todo no antigo. Recomeçado, o primeiro quadro do estado novo
   * fecha 1 s inteiro depois do gesto.
   * ⚠️ Só nas de 1 ou 2 por segundo: nas de 4 e 5 o adiantamento máximo é um quadro de 0,25 s, a
   * mesma ordem das fatias de antes do lote 4, e recomeçar lá atrasaria cada toque sem necessidade.
   * ⚠️ O tempo e a pista não são gesto no mundo. Efeito aceito: gestos seguidos adiam o quadro
   * seguinte (nenhuma das cinco cenas tem deslizante, então arrastar não trava o relógio).
   */
  if (action.type !== 'advance' && action.type !== 'hint' && sceneLongFrame(scene))
    s.clock.carry = 0
  observarMetaEquivalenteDoCaso(start, s)
  return s
}

/** Nomes alternativos de metas, aplicados somente quando a aula os escolhe. */
function observarMetaEquivalenteDoCaso(start: SceneStart, state: SceneState): void {
  const targets = start.setup?.goals
  if (!targets?.length) return
  const equivalents: Partial<Record<SceneId, readonly (readonly [string, string])[]>> = {
    'stage-size': [['follows', 'resized']],
    impulse: [['compare', 'other-height']],
    hitbox: [
      ['early-hit', 'contact'],
      ['fair-hit', 'area-contrast'],
    ],
    acceleration: [['spawned-ten', 'variation-limit']],
    velocity: [['still', 'stopped']],
  }
  for (const [alias, original] of equivalents[start.scene] ?? []) {
    if (!targets.includes(alias) || !state.evidence.discoveries.includes(original)) continue
    if (alias === 'early-hit' && sceneAreaPercent(state.contact.width) !== 100) continue
    if (alias === 'fair-hit' && sceneAreaPercent(state.contact.width) > 80) continue
    observe(state, alias, original)
  }
}

function observarMetasNumberLine(state: SceneState): void {
  const { value, operator, presses, equalPresses, sawFalseEqual } = state.numberLine
  if (presses >= 3 && value <= -8)
    observe(
      state,
      'colder',
      'Somar -1 anda uma casa para a esquerda, e para a esquerda é mais rápido',
    )
  if (operator === '>' && value === -5)
    observe(state, 'greater', '-5 é maior que -9, porque mora à direita dele na régua')
  if (operator === '>' && value === -9)
    observe(state, 'stops', 'No -9 a pergunta diz não, e a base para ali')
  if (operator === '=' && value === -9 && equalPresses >= 4 && sawFalseEqual)
    observe(state, 'silent', 'Com o igual, a resposta é não em todo lugar menos num')
}

/** As cenas de salto: sem nada no ar, o relógio não apaga a frase (ver o `advance`). */
const SALTOS: readonly SceneId[] = ['gravity', 'impulse', 'jump-sound']

/**
 * Quantos quadros INTEIROS cabem no tempo que passou, somado à sobra da fatia anterior.
 *
 * ⚠️⚠️ A sobra é guardada em FRAÇÃO DE QUADRO, de 0 a 1 (review do lote 4). Guardada em segundos,
 * ela valia até `1 / fps` do ritmo de QUANDO foi gravada: se o lote 5 subir uma cena de 1 para 10
 * por segundo, uma sessão salva com 0,9 s de sobra soltaria nove quadros na primeira fatia (nove
 * corpos de uma vez na `pool`). Em fração, mudar o ritmo só muda quanto falta para o próximo quadro.
 *
 * ⚠️⚠️ O `1e-6` é de QUADRO, e é o que faz fatias diferentes chegarem ao mesmo número: 20 fatias de
 * 0,05 s somam 0,9999999999999999 no binário, e sem a folga o quinto quadro de 1 s a 5 por segundo
 * só viria na fatia seguinte. A folga é muito menor que qualquer fatia do player (a tremida de um
 * quadro de 60 Hz é de décimos de milésimo), então ela só acerta o arredondamento. A sobra que ela
 * deixa negativa por um fio vira zero: o validador exige sobra ≥ 0.
 */
function quadrosDoTempo(relogio: SceneClock, fps: number, segundos: number): number {
  const total = relogio.carry + segundos * fps
  const quadros = Math.floor(total + 1e-6)
  relogio.carry = Math.max(0, total - quadros)
  return quadros
}

/**
 * UM quadro da cena: a lógica "por quadro" roda uma vez, e a lógica por segundo anda `1 / fps`.
 *
 * ⚠️ Tudo aqui é por QUADRO, e não mais por chamada de `advance`: é a mesma função para o ▶, para o
 * passo de um quadro e para o roteiro. Número por segundo entra dividido pelo ritmo (`40 / fps`), e
 * não multiplicado por `1 / fps`: com os ritmos inteiros da tabela a conta fica exata (a `circle-
 * collision` anda 2 por quadro e para em 60 contra 60, sem arredondar nada).
 */
function umQuadro(s: SceneState, start: SceneStart, fps: number): void {
  const scene = start.scene
  if (scene === 'fixed-vs-read') {
    s.fixedRead.shots = s.fixedRead.shots
      .map((shot) => ({ ...shot, y: Math.max(-50, shot.y - 6) }))
      .filter((shot) => shot.y > -50)
    return
  }
  if (scene === 'collision-pair') {
    const pair = s.collisionPair
    pair.frames++
    if (!pair.collided && pair.frames >= 10) {
      pair.collided = true
      pair.pairedAliases = pair.shotTarget === 'alias' && pair.rockTarget === 'alias'
      pair.shots = pair.shotTarget === 'group' ? [] : pair.shots.filter((id) => id !== 1)
      pair.rocks = pair.rockTarget === 'group' ? [] : pair.rocks.filter((id) => id !== 1)
      if (pair.shotTarget === 'group' && pair.rockTarget === 'group') {
        observe(s, 'whole-group', 'Escolhendo o grupo, sumiu todo mundo')
        s.caption = 'Um par bateu; os dois comandos tiraram os grupos inteiros.'
      }
      if (pair.shotTarget === 'alias' && pair.rockTarget === 'alias') {
        observe(s, 'just-the-pair', 'Escolhendo os apelidos, sumiram só os dois que se bateram')
        s.caption = 'O par que se encostou saiu. Os outros continuam no caminho.'
      }
    }
    if (pair.pairedAliases && pair.rocks.includes(0) && pair.rocks.includes(2) && pair.frames >= 30)
      observe(s, 'others-stay', 'As outras pedras continuaram o caminho delas')
    return
  }
  if (scene === 'invincibility') {
    const shield = s.invincibility
    shield.frames++
    if (shield.remaining > 0) shield.remaining--
    if (shield.frames === 1 || shield.frames === 10 || shield.frames === 30) {
      shield.struck.push(shield.frames)
      if (shield.remaining === 0) {
        shield.hearts = Math.max(0, shield.hearts - 1)
        shield.damaged.push(shield.frames)
        shield.remaining = shield.protection
      }
      s.caption = `A pedra do quadro ${shield.frames} bateu e saiu. Restam ${shield.hearts} vidas.`
    }
    if (shield.frames >= 30) {
      if (shield.protection === 0 && shield.hearts === 0)
        observe(s, 'no-shield', 'Sem proteção, as três batidas tiraram as três vidas')
      if (shield.protection === 45 && shield.hearts === 2)
        observe(s, 'window', 'Com 45 quadros, só a primeira batida tirou vida')
      if (shield.protection === 15 && shield.hearts === 1)
        observe(s, 'expires', 'Com 15 quadros, a proteção acabou antes da terceira pedra')
    }
    return
  }
  if (scene === 'unique-names') {
    s.uniqueNames.frames++
    if (!uniqueNamesWarning(s.uniqueNames))
      s.uniqueNames.previewX = s.uniqueNames.previewX >= 320 ? 120 : s.uniqueNames.previewX + 8
    return
  }
  if (scene === 'motion-amount') {
    const motion = s.motionAmount
    motion.frames++
    if (motion.playing) {
      motion.previewFrame = motion.previewFrame === 0 ? 1 : 0
      motion.viewedFrames++
      if (motion.viewedFrames >= 2) {
        if (motion.crater === 0 && motion.body === 0)
          observe(s, 'no-change', 'Os dois quadros iguais deixam a Prévia parada')
        if (motion.crater >= 3 && motion.crater <= 6 && motion.body === 0)
          observe(s, 'local-move', 'A cratera andando um pouco já faz a pedra parecer que rola')
        if (motion.body >= 10)
          observe(
            s,
            'too-much',
            'Com a pedra inteira andando muito, o desenho pula em vez de rolar',
          )
      }
    }
    return
  }
  if (scene === 'two-clocks') {
    const clocks = s.twoClocks
    clocks.frames++
    clocks.rocks = clocks.rocks.filter((rock) => clocks.frames - rock.bornAt <= 90)
    if (clocks.frames % clocks.birthEvery === 0) {
      clocks.born++
      clocks.lastBornAt = clocks.frames
      clocks.rocks.push({ id: clocks.born, bornAt: clocks.frames })
      s.caption = `Pedra ${clocks.born} nasceu no quadro 0 do próprio giro.`
      if (clocks.born >= 3)
        observe(s, 'each-one', 'Cada pedra começou no quadro 0, na hora em que ela nasceu')
    }
    if (
      clocks.birthEvery === 20 &&
      clocks.animationRate === 8 &&
      clocks.birthAtStart === 20 &&
      clocks.rateAtStart === 8 &&
      clocks.frames >= 60 &&
      clocks.born > Math.floor(clocks.frames / 40)
    )
      observe(
        s,
        'more-rocks',
        'Mudando só o relógio de nascer, veio mais pedra, e cada uma continuou girando no mesmo ritmo',
      )
    if (
      clocks.birthEvery === 40 &&
      clocks.animationRate === 16 &&
      clocks.birthAtStart === 40 &&
      clocks.rateAtStart === 16 &&
      clocks.frames >= 80 &&
      clocks.born === Math.floor(clocks.frames / 40)
    )
      observe(
        s,
        'faster-spin',
        'Mudando só a animação, as pedras giraram mais rápido, e continuou nascendo na mesma hora',
      )
    return
  }
  if (scene === 'same-rules-new-skin') {
    const game = s.skinGame
    game.frames++
    game.obstacleY += 3
    game.shots = game.shots
      .map((shot) => ({ ...shot, y: shot.y - 10 }))
      .filter((shot) => shot.y >= 0)
    const hit = game.shots.findIndex(
      (shot) => Math.abs(shot.x - game.obstacleX) <= 28 && Math.abs(shot.y - game.obstacleY) <= 20,
    )
    if (hit >= 0) {
      game.shots.splice(hit, 1)
      game.points++
      game.obstacleY = 0
      game.obstacleX = 80 + ((game.frames * 47) % 400)
    } else if (game.obstacleY >= 260) {
      if (Math.abs(game.x - game.obstacleX) <= 38) game.lives = Math.max(0, game.lives - 1)
      game.obstacleY = 0
      game.obstacleX = 80 + ((game.frames * 47) % 400)
    }
    if (!game.shootEnabled) {
      game.disabledFrames++
      if (game.disabledFrames >= 10 && game.disabledTried)
        observe(s, 'rule-off', 'Desligando a regra de atirar, a lista mudou e o jogo mudou junto')
    }
    return
  }
  if (scene === 'random') {
    s.crowd.elapsed += 1 / fps
    if (s.speed.fallingY !== undefined && s.speed.fallingY < 300) {
      s.speed.fallingY = Math.min(300, s.speed.fallingY + 3)
      if (s.speed.fallingY >= 0) {
        observe(s, 'above', 'A pedra entrou caindo pela borda de cima.')
        s.caption = 'A pedra atravessou a borda de cima e entrou na tela.'
      }
    }
    return
  }
  if (scene === 'once-vs-always') {
    const preset = oncePreset(start.setup?.preset)
    advanceOnce(s.once, preset)
    observarMetasDaArea(s, preset)
    s.caption = `Jogo rodando: as ações seguiram as áreas escolhidas.`
    return
  }
  // O núcleo do Iniciante 2D: cada uma dessas cenas mostra o que o TEMPO faz com o estado.
  if (avancarNucleo(s, scene, fps)) return
  if (scene === 'frames') {
    advanceFrames(s, 1 / fps)
    return
  }
  if (scene === 'lives') {
    advanceLives(s, 1 / fps)
    return
  }
  if (scene === 'draw-loop') {
    quadroDoDesenho(s)
    return
  }
  advanceFlight(s, scene, 1 / fps)
  s.crowd.elapsed += 1 / fps
  if (scene === 'spawn' || scene === 'cleanup' || scene === 'game-state')
    advanceCrowd(
      s,
      scene,
      fps,
      scene === 'spawn' && isSpawnPreset(start.setup?.preset) && start.setup.preset.falling,
      scene === 'cleanup' &&
        isCleanupPreset(start.setup?.preset) &&
        start.setup.preset.exit === 'top',
      scene === 'game-state' ? gameStatePreset(start.setup?.preset).waitingSeconds : 2,
    )
  if (scene === 'score') advanceScore(s, 1 / fps)
  // ⚠️ `random` e `acceleration` não têm mais relógio geral (lote 5): o tempo delas mora no gesto.
  if (scene === 'restart') avancarAPartida(s, fps)
}

const OBSERVACOES_DAS_AREAS: Record<string, string> = {
  once: 'A ação em Ao iniciar aconteceu uma vez.',
  always: 'A ação em Enquanto estiver rodando continuou acontecendo.',
  both: 'Uma ação preparou o jogo e a outra continuou acontecendo.',
  'on-event': 'A ação esperou sem acontecer durante o jogo.',
  'key-fires': 'A tecla disparou a ação na hora.',
  flood: 'A ação em Enquanto estiver rodando aconteceu várias vezes.',
}

function observarMetasDaArea(s: SceneState, preset: OnceVsAlwaysPreset): void {
  for (const id of onceDiscoveries(s.once, preset))
    if (!s.evidence.discoveries.includes(id)) observe(s, id, OBSERVACOES_DAS_AREAS[id] ?? id, true)
}

/** Um quadro do laço de desenho: repetir o desenho, limpar antes, ou nenhum dos dois. */
function quadroDoDesenho(s: SceneState): void {
  const { start, step, places } = DRAW_LOOP_LANE
  const r = s.render
  r.frames += 1
  /**
   * ⭐⭐ O Dino ANDA a cada quadro, desenhado ou não (lote 5 do Raio-X, 16/09/2026): o x dele está
   * nos bastidores, e é a faixa que o mostra. Antes a posição só existia no palco (`frames % casas`
   * com o desenho ligado), então "a tela congela" era uma tela parada que podia ser defeito, e ligar o
   * desenho depois de alguns quadros fazia o Dino dar um SALTO inexplicado. Agora o salto é a própria
   * descoberta: o desenho aparece onde o Dino já estava.
   */
  const proxima = (Math.round((r.x - start) / step) + 1) % places
  r.x = start + Math.max(0, proxima) * step
  // ⚠️⚠️ A ordem é a do jogo: primeiro limpa (se a limpeza está ligada), depois desenha (se o desenho
  // é a cada quadro). Limpar SEM desenhar deixa a tela VAZIA, que é a resposta certa da pergunta do
  // modelo ("E se limpar sem desenhar? O que sobra na tela?"); a cena já mostrou o Dino inteiro ali.
  if (r.erase) r.drawn = []
  // ⚠️ Uma casa aparece uma vez só: o rastro que dá a volta cobre o desenho velho na mesma casa.
  if (r.loop) r.drawn = [...r.drawn.filter((x) => x !== r.x), r.x].slice(-places)
  r.trail = r.drawn.length
  r.empty = r.drawn.length === 0
  if (!r.loop) {
    if (r.erase) {
      s.caption = 'Limpou e não desenhou: a tela ficou vazia.'
      return
    }
    // ⚠️ Tela vazia parada não é "a tela não muda": não há desenho nenhum para ver parado.
    if (r.empty) {
      s.caption = 'O relógio andou e a tela continua vazia.'
      return
    }
    observe(s, 'frozen', 'Sem desenhar de novo, a tela não muda', true)
    // ⚠️ O que se VÊ: o número andou e o desenho não. Sem "ninguém desenhou de novo" (review do lote
    // 2): era o PORQUÊ, que é da explicação.
    s.caption = `Quadro ${r.frames}: o x do Dino mudou e a tela continua igual.`
    return
  }
  if (r.erase) {
    observe(s, 'moving', 'Limpando e desenhando, o Dino anda', true)
    // ⚠️ Sem "Isso é o movimento": a regra fica para o sucesso e a explicação.
    s.caption = 'Limpou e desenhou: um Dino só, no lugar novo.'
    return
  }
  if (r.trail >= 2) observe(s, 'trail', 'Sem limpar, os desenhos velhos ficam', true)
  s.caption =
    r.trail >= places
      ? 'A tela encheu de Dinos. Nada foi apagado.'
      : `Desenhou sem limpar: ${quantos(r.trail, 'Dino', 'Dinos')} na tela.`
}

/** Qual do grupo está mais perto. Um só lugar: o motor e a leitura precisam concordar. */
export function maisPerto(distancias: readonly number[]): number {
  let melhor = 1
  distancias.forEach((d, i) => {
    if (d < (distancias[melhor - 1] ?? Number.POSITIVE_INFINITY)) melhor = i + 1
  })
  return melhor
}

/**
 * UM quadro das cenas do núcleo do Iniciante 2D e do motor.
 *
 * ⚠️ Devolve `true` quando ELA tratou o tempo — é o que faz o quadro das outras cenas continuar
 * exatamente como estava. Cada uma aqui ensina uma coisa diferente sobre o tempo: a posição que
 * anda sozinha, a tecla que vale enquanto durar, a recarga que espera.
 */
function avancarNucleo(s: SceneState, scene: SceneId, fps: number): boolean {
  switch (scene) {
    case 'velocity': {
      s.drive.fromX = s.drive.x
      s.drive.fromY = s.drive.y
      // ⚠️⚠️ UMA soma por quadro, `x + vx` (lote 4 do Raio-X). Era `vx × 10 × segundos`: com o ▶ em
      // fatias de 0,05 s cada "quadro" andava meio vx, e a faixa contava "quadros 21" numa etapa de
      // 1 s. A explicação da cena é "a cada quadro o jogo faz posição mais velocidade", e agora a
      // faixa e o desenho mostram exatamente isso.
      // ⚠️ Os limites passam da tela (lote 5): o cacto nasce depois de 480 e a pedra acima do 0.
      const { driveX, driveY } = SCENE_LIMITS
      const queriaX = s.drive.x + s.drive.vx
      const queriaY = s.drive.y + s.drive.vy
      s.drive.x = Math.max(driveX.min, Math.min(driveX.max, queriaX))
      s.drive.y = Math.max(driveY.min, Math.min(driveY.max, queriaY))
      s.drive.ticks += 1
      const naBorda = s.drive.x !== queriaX || s.drive.y !== queriaY
      const andouNoQuadro = s.drive.x !== s.drive.fromX || s.drive.y !== s.drive.fromY
      // ⚠️ O quadro PARADO também é uma soma (consertos do review da onda A do lote 5): com velocidade 0
      // o palco não mostrava conta nem pontinho, e "a cada quadro soma 0" era a única parte do roteiro
      // sem nada desenhado. O pontinho se repete no mesmo lugar e a conta diz "+ 0".
      if (andouNoQuadro || (s.drive.vx === 0 && s.drive.vy === 0)) {
        s.drive.steps += 1
        s.drive.trailX = [...s.drive.trailX, s.drive.x].slice(-VELOCITY_TRAIL_MAX)
        s.drive.trailY = [...s.drive.trailY, s.drive.y].slice(-VELOCITY_TRAIL_MAX)
      }
      const { x, y, anchorX, anchorY, vx, vy } = s.drive
      // ⚠️⚠️ Tudo medido desde a ÂNCORA (onde a velocidade foi escolhida), nunca por fatia. Com
      // velocidade ±1 o personagem anda 0,5 px a cada 0,05 s do ▶, e a folga de meio pixel por
      // fatia deixava as quatro metas impossíveis: a nave andava 20 px na tela e nada caía.
      const andou = Math.abs(x - anchorX) + Math.abs(y - anchorY)
      // ⚠️ A folga de meio pixel ficou de propósito: um retrato de antes do lote 4 pode ter a
      // posição quebrada, e a meta segue pedindo movimento de verdade desde a âncora.
      if (andou > 0.5) {
        observe(s, 'moves', 'A posição mudou sozinha, com o relógio', true)
        // ⚠️ "Levou para a ESQUERDA" pede ter andado PARA O LADO: com o x travado em 0 um
        // movimento só vertical fechava a meta do sinal.
        if (vx < 0 && anchorX - x > 0.5)
          observe(s, 'left', 'Velocidade negativa levou para a esquerda', true)
        // ⚠️⚠️ As metas VERTICAIS pedem o personagem ter andado naquele sentido, com a mesma
        // folga de meio pixel: com o y no batente (0 ou 270) o sinal está certo e nada se mexe,
        // e a meta não pode cair sobre um passo que a criança não viu. O Dia 2 do Desafio pede
        // exatamente isto (para baixo, e depois o sinal trocado).
        // ⚠️⚠️ E TRÊS quadros naquele sentido (consertos do review da onda A do lote 5): no Dia 2 a
        // segunda descoberta caía no primeiro passo de 9 (5 px na tela), a atividade concluía e o ▶
        // parava ali, sem a criança ter visto o tiro descer.
        const tresQuadros = s.drive.steps >= 3
        if (vy > 0 && y - anchorY > 0.5 && tresQuadros)
          observe(s, 'down', 'Velocidade positiva levou para baixo', true)
        if (vy < 0 && anchorY - y > 0.5 && tresQuadros)
          observe(s, 'up', 'Velocidade negativa levou para cima', true)
        // ⚠️⚠️ A frase conta o caminho desde a ÂNCORA, e não o da última fatia: a demonstração é
        // tocada em fatias de ~0,05 s, e a frase final dizia "o Dino foi de 108 para 110" depois
        // de a criança ver o Dino andar de 60 a 110. Os DOIS eixos, e o sentido do y vem do
        // NÚMERO. Sem pronome: "ele" não concorda com a nave.
        // ⚠️⚠️ Lote 5: a frase conta QUADROS ("4 quadros: o x foi de 400 para 380"), porque o
        // assunto é que cada quadro é uma soma, e o sentido do y vem sem sujeito ("Subiu."), que o
        // elenco não precisa flexionar. Parado na borda, ela diz a borda, e não um caminho velho.
        s.caption =
          naBorda && !andouNoQuadro
            ? 'Chegou na borda: não dá para ir mais para lá.'
            : fraseDoCaminho(s.drive.steps, { x, y, anchorX, anchorY })
      } else if (vx === 0 && vy === 0) {
        // ⚠️⚠️ A cena NASCE com velocidade zero, então "com zero fica parado" caía no primeiro
        // toque em "Um passo", sem a criança ter mexido em nada. É uma COMPARAÇÃO: só vale depois
        // de ela ter visto o relógio mover alguma coisa.
        if (s.evidence.discoveries.includes('moves')) {
          observe(s, 'stopped', 'Com velocidade zero, o Dino fica parado', true)
        }
        // ⚠️ Sem "a velocidade é zero" (review do lote 2): era a meta `stopped` como explicação.
        s.caption = `O relógio andou, e o Dino continua em x ${numero(Math.round(x))}, y ${numero(Math.round(y))}.`
      } else if (naBorda) s.caption = 'Chegou na borda: não dá para ir mais para lá.'
      return true
    }
    // ⭐⭐ O núcleo do Iniciante 2D redesenhado no lote 5 do Raio-X (G5): as regras moram no fim deste
    // arquivo, uma função por cena, e aqui fica só o despacho do quadro.
    case 'hold-vs-press':
      quadroDaTecla(s)
      return true
    case 'group-loop':
      quadroDoLaco(s, fps)
      return true
    case 'enemy-type':
      quadroDaFicha(s, fps)
      return true
    case 'contact':
      quadroDoEncosto(s)
      return true
    case 'cooldown':
      quadroDaRecarga(s, fps)
      return true
    case 'aim':
      quadroDaMira(s, fps)
      return true
    case 'pool': {
      const n = s.nursery
      n.ticks += 1
      // ⭐⭐ O cacto ATRAVESSA a tela (lote 5 do Raio-X): entra pela direita, anda `POOL_CROSSING`
      // quadros e sai pela esquerda. Sem reciclagem ele vai para a pilha dos que saíram e entra OUTRO,
      // com o número seguinte; reciclando, o MESMO número entra de novo. Antes era um corpo por
      // chamada, sem ninguém andar, e o vazamento só existia na frase.
      if (n.onScreen === 0) {
        n.created += 1
        n.onScreen = n.created
        n.alive = 1
        n.progress = 0
      } else if (n.progress + 1 < POOL_CROSSING) {
        n.progress += 1
      } else {
        n.progress = 0
        if (n.recycling) {
          n.last = 'voltou'
          // ⚠️⚠️ Só um cacto que JÁ ESTAVA na tela volta (review do lote 2): ligar a reciclagem de
          // saída e esperar o primeiro entrar não é reaproveitar nada.
          observe(s, 'recycled', 'O mesmo cacto saiu e entrou de novo', true)
        } else {
          n.created += 1
          n.onScreen = n.created
          n.last = 'novo'
          if (n.created >= 3)
            observe(s, 'grows', 'A cada vez, um cacto novo: o número só subiu', true)
        }
      }
      // ⚠️ "PAROU" pede ter visto crescer, e 4 s inteiros com a reciclagem ligada (o fio zera o
      // `ticks`). Ligando a reciclagem de saída, a meta caía sobre um número que nunca tinha subido.
      if (n.recycling && n.ticks >= 4 * fps && s.evidence.discoveries.includes('grows'))
        observe(s, 'steady', 'O número de fabricados parou', true)
      // Sem legenda: o número pintado e a pilha, a situação e o palco dizem.
      return true
    }
    case 'entity-state': {
      s.brains.ticks += 1
      if (new Set(s.brains.states).size > 1)
        observe(s, 'acts', 'Com o relógio andando, cada torre fez o que o seu estado manda', true)
      // ⚠️ Uma frase por torre (lote 5 do Raio-X), cada uma com ponto: ela é o primeiro degrau da
      // pista, e "1º está virando para o alvo; 2º soltou um tiro" misturava três sujeitos numa frase.
      s.caption = s.brains.states
        .map((estado, i) => `A ${i + 1}ª ${acaoDoEstado(estado)}.`)
        .join(' ')
      return true
    }
    case 'delta-time': {
      const m = s.machines
      const { chegada, passo } = DELTA_RACE
      // ⚠️⚠️ A corrida ACABA na chegada (lote 5 do Raio-X): o desenho tinha teto e o número não, e com
      // o ▶ ligado os dois grudavam na borda enquanto a faixa dizia 1040 contra 540. Chegou, o relógio
      // não mexe em mais nada (o rápido chega primeiro ou junto, nunca depois).
      if (m.fastX >= chegada) return true
      m.elapsed += 1 / fps
      // ⚠️ A 10 quadros por segundo da cena: o rápido DESENHA um quadro a cada quadro da cena, o
      // devagar a cada dois. Cada quadro desenhado é um passo do Dino (uma pegada). Mudou o ritmo da
      // cena na tabela, mude aqui: a corrida é contada em quadros desenhados, não em segundos.
      m.fastFrames += 1
      m.fastX = Math.min(chegada, m.fastX + passo)
      if (m.fastFrames % 2 === 0) {
        m.slowFrames += 1
        // "A cada segundo" o devagar dá o DOBRO do passo: a mesma distância no mesmo tempo, com a
        // velocidade do rápido (ninguém parece mais lento do que era).
        m.slowX = Math.min(chegada, m.slowX + (m.mode === 'seconds' ? passo * 2 : passo))
      }
      if (m.mode === 'frames' && m.fastX - m.slowX > 30)
        observe(s, 'apart', 'A cada quadro, os dois computadores se separaram', true)
      // ⚠️ O contraste é a lição inteira: "chegaram juntos" só significa alguma coisa para quem viu
      // os dois se afastarem antes. E é na CHEGADA, que é o que a meta diz.
      if (
        m.mode === 'seconds' &&
        m.fastX >= chegada &&
        m.slowX >= chegada &&
        s.evidence.discoveries.includes('apart')
      )
        observe(s, 'together', 'A cada segundo, os dois chegaram juntos', true)
      // Sem legenda: onde cada um está e quem chegou, a situação diz.
      return true
    }
    case 'circle-collision': {
      // ⚠️⚠️ 20 por segundo em quadros de 10: a distância anda 2 INTEIROS por quadro (lote 4 do
      // Raio-X). Enquanto ela andava `20 × segundos` por fatia, a soma de 80 fatias de 60 Hz com
      // tremida parava em 60,0000001 contra 60 de soma dos raios, e a batida do roteiro sumia em ~9 de
      // cada 10 vezes; a ponte do lote 1 arredondava a comparação no milionésimo. Com a distância
      // inteira (os raios e o `approach` também são), a conta bate exata e a ponte saiu.
      // ⚠️⚠️ O relógio só aproxima ATÉ a batida (consertos do review da onda B do lote 5). Seguindo em
      // frente, quem demorava a pausar via a distância chegar a 0 e os dois fundidos num disco só, e o
      // pedido seguinte ("com os dois só encostando, diminua um raio") ficava impossível sem achar a
      // medida da distância. Com um raio menor os dois se separam, e o ▶ volta a aproximar até a nova
      // batida. O player para o ▶ aí (`sceneClockReachedStop`).
      if (!encostam(s)) s.circles.distance = Math.max(0, s.circles.distance - 20 / fps)
      conferirCirculos(s)
      return true
    }
    default:
      return false
  }
}

/** Mexeu nesse eixo? Meio pixel de folga, como o resto do motor. */
const mexeuNoEixo = (agora: number, antes: number) => Math.abs(agora - antes) > 0.5

/**
 * O estado de uma torre como a criança LÊ: "mirando", e não o id "mirar".
 *
 * ⚠️ EXPORTADA porque a faixa, a frase, o palco e a bancada escreviam o mesmo estado de três
 * jeitos na mesma tela ("1º mirar" na faixa, "mirando" no palco, "O 1º está mirar" na frase).
 * ⚠️ No FEMININO desde o lote 5 do Raio-X ("parada"): quem tem estado é a TORRE, e a legenda da
 * bancada forma frase ("A 1ª está parada").
 */
export function sceneBrainLabel(estado: string): string {
  return BRAIN_LABEL[estado] ?? estado
}
const BRAIN_LABEL: Record<string, string> = {
  parado: 'parada',
  mirar: 'mirando',
  atirar: 'atirando',
  recarregar: 'recarregando',
}
const estadoLido = sceneBrainLabel
/** "As três estão paradas": só o particípio flexiona, o gerúndio não. */
const estadoNoPlural = (estado: string) => (estado === 'parado' ? 'paradas' : estadoLido(estado))

/** O que uma torre FAZ no estado em que está, em um quadro. É o que a cena `entity-state` mostra. */
function acaoDoEstado(estado: string): string {
  if (estado === 'mirar') return 'virou para o alvo'
  if (estado === 'atirar') return 'soltou um tiro'
  if (estado === 'recarregar') return 'encheu um pouco a recarga'
  return 'não fez nada'
}

/** A corrida da `delta-time` na largada: trocar como o Dino anda recomeça daqui. */
const CORRIDA_NA_LARGADA = { fastX: 0, slowX: 0, elapsed: 0, fastFrames: 0, slowFrames: 0 } as const

/**
 * "Ver os pontos" do modelo, num degrau (lote 5 do Raio-X). A mesma porta para o gesto novo e para o
 * raio-X de antes.
 *
 * ⚠️⚠️ A pele POR CIMA dos pontos é uma comparação, e pede dois gestos: ver os pontos (metade ou tudo)
 * e DEPOIS a pele voltando sobre eles (a metade vindo de quem já viu os pontos, ou o nada vindo de
 * quem passou pela metade). Com um gesto só, "metade" fechava as duas metas juntas, e o palpite da
 * previsão voltava junto com a conclusão.
 */
function verOsPontos(s: SceneState, nivel: MeshLevel): void {
  if (s.model.see === nivel) return
  const jaViuOsPontos = s.evidence.discoveries.includes('points')
  s.model.see = nivel
  if (nivel !== 'nada') observe(s, 'points', 'Viu os pontos e as linhas que formam o modelo', true)
  if ((nivel === 'metade' && jaViuOsPontos) || (nivel === 'nada' && s.model.sawHalf))
    observe(s, 'skin', 'Viu a pele por cima dos mesmos pontos', true)
  if (nivel === 'metade') s.model.sawHalf = true
  // Sem legenda: "os pontos e as linhas que formam o modelo" era a certa da previsão.
}

/**
 * Quantas faces do cubo aparecem desta posição de câmera. De frente, uma; no canto, três.
 *
 * ⚠️ EXPORTADA porque o palco e os testes também precisam dela. É a régua ÚNICA: a cópia que
 * existia no `readout` saiu no lote 2 do Raio-X, junto com a leitura "cores à vista".
 */
export function facesAVista(yaw: number, pitch: number): number {
  const canto = yaw % 2 === 1
  if (pitch === 1) return canto ? 2 : 1
  return canto ? 3 : 2
}

/**
 * As três caixas da cena `pick-ray`, nas MESMAS coordenadas em que o palco as desenha (a tela de
 * 480 × 270 do que o jogador vê) e com a PROFUNDIDADE de cada uma (`z`: 1 é a mais perto do olho).
 *
 * ⚠️⚠️ A B fica NA FRENTE e cobre um pedaço da A — é nessa faixa comum que a cena inteira acontece.
 * ⚠️⚠️ E a da frente é a MENOR (lote 5 do Raio-X): com a da frente também maior, "a reta atravessa
 * e escolhe a maior" dava o mesmo resultado neste palco, e a explicação errada não podia ser
 * desmentida. As LETRAS não seguem a distância: "a primeira" não pode ser lida no nome.
 * Mexeu aqui, mexa no palco (`scene-3d-stages` do member-shell).
 */
export const PICK_BOXES = {
  atras: { id: 1, letra: 'A', x: 200, y: 50, w: 170, h: 140, z: 3 },
  frente: { id: 2, letra: 'B', x: 290, y: 120, w: 100, h: 80, z: 1 },
  sozinha: { id: 3, letra: 'C', x: 50, y: 80, w: 100, h: 90, z: 2 },
} as const
const dentro = (c: { x: number; y: number; w: number; h: number }, x: number, y: number) =>
  x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h

/**
 * As caixas que a reta da mira atravessaria, da MAIS PERTO para a mais longe. A primeira é a que
 * acende: a reta para nela.
 *
 * ⚠️ EXPORTADA porque a faixa ("caixas no caminho") e a vista de lado do palco contam a mesma coisa.
 */
export function scenePickPath(x: number, y: number): number[] {
  return Object.values(PICK_BOXES)
    .filter((c) => dentro(c, x, y))
    .sort((a, b) => a.z - b.z)
    .map((c) => c.id)
}

/** A letra de uma caixa da `pick-ray` ("A", "B", "C"), pelo id que o estado guarda. */
export function scenePickLetter(id: number): string {
  return Object.values(PICK_BOXES).find((c) => c.id === id)?.letra ?? ''
}

/**
 * A distância encosta na soma dos raios? É a ÚNICA régua do motor, e a mesma conta do palco e da
 * faixa (`distance <= a + b`).
 *
 * ⚠️ Sem arredondar desde o lote 4: a ponte do lote 1 comparava no milionésimo porque a soma
 * binária das fatias deixava a distância em 60,0000001. Com o quadro fixo ela anda 2 inteiros por
 * quadro, e o motor, o palco e a faixa voltaram a fazer a MESMA conta (a faixa nunca arredondou, e
 * dizia "ainda não" no instante em que o motor dava a batida).
 */
const encostam = (s: SceneState) => s.circles.distance <= s.circles.a + s.circles.b

/**
 * A conta da colisão na mão: a distância entre os centros contra a soma dos raios.
 *
 * ⚠️ Sem legenda (review do lote 2): ela repetia a faixa com o veredito ("encostaram") que a
 * situação tinha deixado de dizer. Os números, a situação diz; o "bateu", o palco e a faixa.
 */
function conferirCirculos(s: SceneState): void {
  if (encostam(s)) {
    s.circles.touched = true
    observe(s, 'touch', 'A distância chegou na soma dos raios', true)
  }
}

/**
 * Os COMEÇOS de palavra que dizem O QUE se faz no jogo. Lista de orientação, não de gabarito.
 *
 * ⚠️⚠️ Por RADICAL, e não por palavra inteira: a lista de palavras exatas reprovava frases certas
 * de criança num bloco OBRIGATÓRIO ("Salte por cima dos cactos usando a barra de espaço" não
 * dizia o objetivo; "Um dinossauro que foge dos cactos. Use as setinhas" não dizia nada), e ela
 * ficava presa em "Ainda falta" tendo escrito o que a aula pediu. O radical casa só no COMEÇO da
 * palavra, então "socorro" não vira "corr".
 */
const OBJETIVO_RADICAIS = [
  'pul',
  'salt',
  'corr',
  'desv',
  'fug',
  'fuj',
  'escap',
  'atir',
  'peg',
  'colet',
  'voe',
  'voa',
  'ande',
  'anda',
  'mova',
  'move',
  'acert',
  'cheg',
  'ganh',
  'marq',
  'salv',
  // ⚠️ `evit` e `sobreviv` vieram de frases reais de criança que o review pegou reprovando
  // ("Evite os cactos clicando", "Sobreviva o máximo que puder").
  'evit',
  'sobreviv',
] as const
/**
 * Formas que não começam pelo radical do verbo. ⚠️ "foge" fica EXATA: um radical "fog" casaria
 * "fogo", e uma frase sobre o fogo da nave passaria a dizer o objetivo. ⚠️ E as de "bater" também:
 * um radical "bat" casaria "batata" ("Não bata nos cactos" diz o objetivo; a batata, não).
 */
const OBJETIVO_EXATAS = ['foge', 'fogem', 'foges', 'bata', 'batam', 'bater'] as const
/**
 * Os começos de palavra que dizem COMO se joga.
 *
 * ⚠️ `toq` e `cliq` existem porque "toque" e "clique" não começam por "toc" e "clic". E
 * "espaço" é EXATA: o radical casaria "espaçonave", que é justamente o personagem do Desafio.
 */
const CONTROLE_RADICAIS = [
  'seta',
  'setinha',
  'tecl',
  'barra',
  'clic',
  'cliq',
  'toc',
  'toq',
  'apert',
  'mouse',
  'dedo',
  'enter',
] as const
/**
 * ⚠️ As letras W, A, S e D valem sozinhas, MENOS o "a", que é artigo em quase toda frase: com ele
 * qualquer descrição diria "como se joga". "A e D" continua passando pelo "d".
 */
const CONTROLE_EXATAS = ['espaco', 'espacos', 'wasd', 'w', 's', 'd'] as const

/**
 * O que a descrição da criança diz: o objetivo do jogo e o controle.
 *
 * Sem acento e sem diferença de maiúscula, palavra por palavra. EXPORTADA para ter teste com
 * frases reais de criança, as que devem passar e as que não devem.
 */
/** A revisita só conta quando a descrição lida nomeia os três controles do jogo. */
export function sceneDescriptionHasAllControls(texto: string): boolean {
  const frase = texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  return (
    /\bespaco\b/u.test(frase) &&
    /\bseta\s+(?:para\s+)?cima\b/u.test(frase) &&
    /\b(?:toque|tocar|tocando)\s+(?:na\s+)?tela\b/u.test(frase)
  )
}

export function sceneDescriptionSays(texto: string): { goal: boolean; control: boolean } {
  const palavras = texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
  const diz = (radicais: readonly string[], exatas: readonly string[]) =>
    palavras.some(
      (p, i) =>
        (exatas.includes(p) && !espacoDeLugar(p, palavras[i - 1])) ||
        radicais.some((r) => p.startsWith(r)),
    )
  return {
    goal: diz(OBJETIVO_RADICAIS, OBJETIVO_EXATAS),
    control: diz(CONTROLE_RADICAIS, CONTROLE_EXATAS),
  }
}

/**
 * ⚠️ "no espaço" e "pelo espaço" são LUGAR, e não a tecla (lote 5 do Raio-X, 16/09/2026): "Uma nave
 * voando no espaço" dizia "como jogar" sem dizer tecla nenhuma. Só a preposição de lugar colada
 * tira o "espaço" da conta; "aperte o espaço", "com o espaço" e "barra de espaço" continuam valendo.
 * Quem escreve "clique no espaço" já passa pelo "clic".
 */
const LUGAR_ANTES_DE_ESPACO: readonly string[] = ['no', 'nos', 'pelo', 'pelos', 'ao', 'num']
function espacoDeLugar(palavra: string, anterior: string | undefined): boolean {
  return (
    (palavra === 'espaco' || palavra === 'espacos') &&
    anterior !== undefined &&
    LUGAR_ANTES_DE_ESPACO.includes(anterior)
  )
}

/** Pista vazia: o mesmo reset usado ao ligar o relógio, mudar o intervalo e recomeçar. */
function resetTrack(s: SceneState): void {
  s.crowd.remainder = 0
  s.crowd.born = 0
  s.crowd.removed = 0
  s.crowd.cacti = []
  s.crowd.elapsed = 0
  if (s.crowd.fallFrames !== undefined) s.crowd.fallFrames = 0
}

/** A gravidade do modelo didático do salto, por tique de 1/30 s. */
const GRAVIDADE_POR_TIQUE = 0.6

/**
 * A altura a partir da qual o Dino sem gravidade "não para mais" (`floating`, lote 5 do Raio-X).
 *
 * ⚠️ Era 120: a meta caía 0,44 s depois do pulo, com o Dino no meio da subida, e o palpite "sobe e
 * volta ao chão" era retomado antes de dar para ver que ele não volta. 360 é mais de cinco vezes o
 * pulo com gravidade (67,5) e ainda cabe inteiro no palco, onde o Dino sai por cima em 600.
 */
export const SALTO_SEM_VOLTA = 360
/** A altura em que o Dino SAI por cima do palco da `gravity`. O palco desenha nesta escala. */
export const TOPO_DO_SALTO = 600
/**
 * ⚠️⚠️ A altura em que o player PARA o ▶ do Dino sem gravidade (consertos do review da onda A do lote 5).
 * Era o próprio topo (600): ligada ali, a gravidade ainda levava o Dino até ~670, acima da régua, e a
 * subida freando acontecia fora do palco num piscar ("estava no alto, caiu"). Parando em 500, a subida
 * extra (até ~570) cabe inteira no palco: sobe mais devagar, para, cai.
 */
export const PARADA_DO_SALTO = 500

/**
 * O Dino da `gravity` acabou de passar da altura de parada, sem gravidade?
 *
 * ⚠️⚠️ É a régua do PLAYER para parar o ▶ (lote 5 do Raio-X): sem gravidade o voo não termina, o
 * relógio rodava sem fim e o número passava de 1350 com o Dino fora da tela. Parado lá em cima, a
 * criança liga a gravidade e vê o Dino voltar. Olha a PASSAGEM (antes abaixo, depois acima), e não a
 * altura: senão apertar ▶ de novo pararia na primeira fatia e a criança nunca veria o número continuar
 * subindo. Desde os consertos da onda A, a passagem é por `PARADA_DO_SALTO`, e não pelo topo.
 */
export function sceneJumpLeftView(scene: SceneId, before: SceneState, after: SceneState): boolean {
  return (
    scene === 'gravity' &&
    after.flight.time !== null &&
    !after.flight.atGravity &&
    before.flight.y < PARADA_DO_SALTO &&
    after.flight.y >= PARADA_DO_SALTO
  )
}

/**
 * O relógio desta cena não tem mais o que fazer, e o player PARA o ▶ (consertos do review da onda B do
 * lote 5).
 *
 * ⚠️⚠️ `circle-collision`: o relógio só aproxima ATÉ a batida (`umQuadro`). Sem parar o ▶ ali, o botão
 * seguia dizendo "Parar o tempo" sobre dois círculos parados, e quem usa leitor de tela só ouvia a
 * frase da batida ao pausar. ⚠️ Olha o ESTADO, e não a passagem (ao contrário do `sceneJumpLeftView`):
 * encostados, apertar ▶ de novo não mexe em nada, e o ▶ para na primeira fatia dizendo a situação.
 */
export function sceneClockReachedStop(scene: SceneId, after: SceneState): boolean {
  return scene === 'circle-collision' && encostam(after)
}

/**
 * O que um FIO ligado ou desligado com o Dino no ar faz com o ▶ do player: `true` solta, `false` para, e
 * `null` deixa como está.
 *
 * ⚠️⚠️ Consertos do review da onda A do lote 5 (B1). O player soltava o ▶ em QUALQUER ligação com o Dino
 * no ar, inclusive DESLIGAR a gravidade. Parado no topo, a criança ligava a gravidade, desligava com o
 * Dino ainda subindo acima de 600, e o ▶ rodava sem fim (y 7122 em 30 s): o `sceneJumpLeftView` olha a
 * PASSAGEM pelo topo, e ela já tinha acontecido. Agora só LIGAR solta; desligar a gravidade acima do topo
 * para, porque dali o voo sem gravidade não volta nunca. Player e bancada da vez leem a mesma régua.
 */
export function sceneConnectRunsClock(
  scene: SceneId,
  action: SceneAction,
  after: SceneState,
): boolean | null {
  if (action.type !== 'connect' || after.flight.time === null) return null
  if (action.enabled) return true
  if (scene === 'gravity' && action.port === 'gravity' && after.flight.y >= PARADA_DO_SALTO)
    return false
  return null
}

/**
 * O que um GESTO da criança faz com o ▶: `true` solta o tempo, `false` para, `null` deixa como está.
 *
 * ⚠️⚠️ Uma régua só para o player e para o "Agora é sua vez" (full review de 16/09/2026): as duas
 * superfícies copiavam as mesmas três regras com o comentário "como no player", e cópia de regra
 * diverge. `jump` solta o tempo também para quem pediu menos movimento (sem isso "Toque no Dino para
 * pular" deixava o Dino parado no chão); `connect` segue a `sceneConnectRunsClock`; e o toque que
 * COMEÇA a partida da `restart` e da `score` solta o tempo, porque a partida é os cactos chegando.
 * `after` é o estado DEPOIS do gesto. Aceita qualquer comando do player (o `undo`, a pista), que não
 * mexe no ▶.
 */
export function sceneGestureRunsClock(
  scene: SceneId,
  command: SceneCommand,
  after: SceneState,
): boolean | null {
  if (scene === 'once-vs-always' && command.type === 'place-in-area') return false
  if (command.type === 'jump') return true
  if (command.type === 'connect') return sceneConnectRunsClock(scene, command, after)
  if (
    (scene === 'restart' || scene === 'score') &&
    command.type === 'start' &&
    after.match.screen === 'playing'
  )
    return true
  return null
}

/**
 * O ▶ para depois DESTE tique? `before` e `after` são o estado de antes e de depois do `advance`.
 *
 * ⚠️⚠️ A régua única do player e do "Agora é sua vez" (full review de 16/09/2026). Elas tinham duas
 * cópias e já divergiam: na `gravity`, na `impulse` e na `jump-sound` com o Dino no CHÃO, o player
 * parava no primeiro tique e a bancada da vez nunca parava (o botão seguia "Parar o tempo" e a bancada
 * redesenhava 25 vezes por segundo sem mudança). Para quando: numa cena de salto não há voo depois do
 * tique (o salto acabou, ou nem começou); o Dino sem gravidade passou do alto do palco
 * (`sceneJumpLeftView`); ou a cena chegou ao fim do que o relógio mostra (`sceneClockReachedStop`).
 */
export function sceneClockShouldStop(
  scene: SceneId,
  before: SceneState,
  after: SceneState,
  preset?: ScenePreset,
): boolean {
  if (scene === 'once-vs-always') return onceRunFinished(after.once, oncePreset(preset))
  const salta = isSceneAction({ type: 'jump', input: 'tap' }, scene)
  if (salta && (after.flight.time === null || sceneJumpLeftView(scene, before, after))) return true
  return sceneClockReachedStop(scene, after)
}

/** Onde o trecho atual do voo está, no tique `t`: a altura e a velocidade. */
function noTrecho(s: SceneState, t: number): { y: number; v: number } {
  const g = s.flight.atGravity ? GRAVIDADE_POR_TIQUE : 0
  return {
    y: s.flight.base + s.flight.atForce * t - 0.5 * g * t * t,
    v: s.flight.atForce - g * t,
  }
}

/** O tique do trecho atual, arredondado no milionésimo (ver `advanceFlight`). */
const tiqueDoTrecho = (s: SceneState) => Math.round((s.flight.time ?? 0) * 30 * 1e6) / 1e6

/**
 * Recomeça o trecho do voo AQUI, com a velocidade de agora e a gravidade nova (lote 5 do Raio-X).
 *
 * ⚠️ `atForce` passa a ser a velocidade no começo do trecho, e não mais o impulso do salto: só a
 * `gravity` troca a gravidade no ar, e a `impulse` (a que compara impulsos) nunca passa por aqui.
 */
function recomecarTrecho(s: SceneState, gravidade: boolean): void {
  const { y, v } = noTrecho(s, tiqueDoTrecho(s))
  s.flight.base = Math.max(0, y)
  s.flight.atForce = v
  s.flight.atGravity = gravidade
  s.flight.time = 0
}

/**
 * O salto, em segundos de modelo. As unidades seguem um modelo didático de 30 Hz
 * (g = 0,6 por tique) com posição analítica — a duração da animação nunca é esticada para
 * caber num tempo de reprodução escolhido.
 *
 * ⚠️ Desde o lote 5 o voo é feito de TRECHOS (`flight.base`): ligar ou desligar a gravidade no ar
 * começa outro, da altura e da velocidade de agora. Um salto que sai do chão é um trecho só, com a
 * mesma conta de antes.
 */
function advanceFlight(s: SceneState, scene: SceneId, seconds: number): void {
  if (s.flight.time === null) return
  s.flight.time += seconds
  // ⚠️ Em tiques do modelo, arredondados no milionésimo (lote 4): trinta quadros de 1/30 s somam
  // 29,999999999999996 tiques no binário, e o salto de impulso 9 pousaria um quadro DEPOIS do topo
  // da conta (`t >= 30`). Com o quadro fixo cada quadro é um tique inteiro, e a conta volta a bater.
  const t = tiqueDoTrecho(s)
  const g = s.flight.atGravity ? GRAVIDADE_POR_TIQUE : 0
  const { base, atForce: v } = s.flight
  const { y } = noTrecho(s, t)
  // O ponto mais alto DESTE trecho até agora; o do voo é o maior dos trechos.
  const tTopo = g > 0 ? Math.min(t, Math.max(0, v / g)) : v > 0 ? t : 0
  s.flight.peak = Math.max(s.flight.peak, noTrecho(s, tTopo).y)
  // Com gravidade o pouso tem hora certa; sem ela, só pousa quem já vinha descendo.
  const pousou = g > 0 ? t >= (v + Math.sqrt(v * v + 2 * g * base)) / g : v < 0 && y <= 0
  if (!pousou) {
    s.flight.y = Math.max(0, y)
    if (scene === 'gravity' && !s.flight.atGravity && s.flight.y >= SALTO_SEM_VOLTA)
      observe(s, 'floating', 'Sem gravidade, não parou de subir.')
    return
  }
  s.flight.y = 0
  s.flight.base = 0
  s.flight.time = null
  // ⚠️ "Com gravidade, o pulo voltou ao chão" é uma COMPARAÇÃO (lote 5 do Raio-X): vale para quem viu
  // o pulo sem gravidade antes, e cai também quando a gravidade foi ligada no meio do voo.
  if (scene === 'gravity' && s.flight.atGravity && s.evidence.discoveries.includes('floating'))
    observe(s, 'landed', 'Com gravidade, o pulo voltou ao chão.')
  if (scene === 'impulse') pousoDoImpulso(s)
  if (scene === 'jump-sound') s.caption = 'O Dino voltou ao chão.'
}

/**
 * Quanto as duas marcas precisam se afastar para "outra altura" valer (lote 5 do Raio-X). Com 9 e 10
 * a meta caía com 68 contra 83, uns 10 px no palco: diferença que a criança não enxerga.
 */
export const DIFERENCA_DE_ALTURA = 40

/** O pouso na `impulse`: a primeira marca, e a comparação com a marca de antes. */
function pousoDoImpulso(s: SceneState): void {
  const { before, beforeForce, atForce, peak } = s.flight
  if (!s.evidence.discoveries.includes('first-height'))
    observe(s, 'first-height', 'Um salto chegou ao chão.')
  if (before <= 0) return
  if (Math.abs(beforeForce - atForce) < 1)
    s.caption = 'Esse impulso alcançou a mesma altura. Mude o impulso para comparar.'
  // ⚠️⚠️ Uma das duas marcas é a do impulso MAIS FORTE (review do lote 2): a previsão pergunta até
  // onde chega o salto com impulso 14, e o palpite retomado dizia "E foi isso mesmo!" com 83 na tela.
  // ⚠️⚠️ E as duas marcas BEM separadas (lote 5): 14 contra 13 são 163 contra 141.
  else if (
    Math.max(beforeForce, atForce) >= SCENE_LIMITS.impulse.max &&
    Math.abs(peak - before) >= DIFERENCA_DE_ALTURA
  )
    observe(s, 'other-height', 'Outro impulso, marca bem diferente.')
}

/**
 * Um aperto na `jump-sound`: vira uma batida da linha do tempo e, conforme o que aconteceu, uma meta.
 *
 * ⚠️ Só entra na linha o aperto que FEZ alguma coisa (um pulo, um som, ou os dois): o toque no ar com
 * o som no pulo não pula nem toca, e uma coluna vazia na linha do tempo não se lê.
 */
function baterNaLinhaDoTempo(
  s: SceneState,
  input: 'key' | 'tap',
  pulou: boolean,
  tocou: boolean,
): void {
  if (pulou || tocou)
    s.sound.beats = [...s.sound.beats, { pulo: pulou, som: tocou }].slice(-SOUND_BEATS_MAX)
  if (!pulou && tocou) observe(s, 'false-sound', 'Som sem pulo.')
  if (pulou && !tocou) observe(s, 'silent-jump', 'Pulo sem som.')
  if (!pulou && !tocou && s.sound.onJump) observe(s, 'quiet-air', 'Sem novo pulo, o som esperou.')
  if (pulou && tocou && s.sound.onJump)
    observe(
      s,
      input === 'key' ? 'key-sound' : 'tap-sound',
      input === 'key' ? 'Pulo por Espaço com som.' : 'Pulo por toque com som.',
    )
  const d = s.evidence.discoveries
  if (d.includes('key-sound') && d.includes('tap-sound'))
    observe(s, 'every-jump', 'Um som em cada pulo, por tecla e por toque.')
}

/** Uma tentativa de começar na `controls`: vira um selo do palco. */
function registrarTentativa(s: SceneState, input: 'key' | 'tap', comecou: boolean): void {
  s.match.tries = [...s.match.tries, { input, began: comecou }].slice(-START_TRIES_MAX)
}

/**
 * UM quadro dos cactos: nascendo, andando e saindo.
 *
 * ⚠️ O deslocamento do nascimento (a parte do quadro que já passou quando o intervalo fechou)
 * preserva a distância entre eles. ⚠️ "A cada quadro" (sem o relógio ligado) é um cacto por quadro
 * DA CENA: é o ritmo dela (`SCENE_FRAME_RATE`, 30 no `spawn`) que dá os 30 por segundo da parede.
 */
function advanceCrowd(
  s: SceneState,
  scene: SceneId,
  fps: number,
  falling = false,
  exitTop = false,
  waitingSeconds = 2,
): void {
  const seconds = 1 / fps
  const bornBefore = s.crowd.born
  const active = scene !== 'game-state' || !s.match.guarded || s.match.screen === 'playing'
  const interval =
    scene === 'spawn'
      ? s.crowd.timer
        ? s.crowd.interval
        : 1 / fps
      : scene === 'game-state'
        ? s.crowd.interval
        : 0.6
  for (const c of s.crowd.cacti) {
    if (exitTop) c.y = (c.y ?? 0) - 100 / fps
    else if (falling) c.y = (c.y ?? -30) + 3
    else c.x -= 100 / fps
  }
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
        x: exitTop
          ? 120 + ((s.crowd.born - 1) % 3) * 80
          : falling
            ? 120 + ((s.crowd.born - 1) % 5) * 85
            : 480 - (seconds - (i * interval - before)) * 100,
        ...(exitTop ? { y: 270 } : falling ? { y: -30 } : {}),
        velocity: falling ? 3 : -5,
      })
    }
  }
  if (s.crowd.cleanup) {
    const outside =
      s.crowd.born -
      s.crowd.removed -
      s.crowd.cacti.filter((c) => (exitTop ? (c.y ?? 0) >= 0 : c.x >= 0)).length
    s.crowd.removed += outside
    s.crowd.cacti = s.crowd.cacti.filter((c) => (exitTop ? (c.y ?? 0) >= 0 : c.x >= 0))
    if (outside > 0 && scene === 'cleanup' && s.crowd.removed >= 2)
      observe(s, 'rule-removes', 'A regra retirou automaticamente quem saiu da tela.')
  }
  // ⚠️⚠️ DOIS na prateleira dos bastidores (lote 5 do Raio-X): com um só, a meta caía no primeiro
  // quadro em que um cacto passava da borda, antes de a prateleira ter o que mostrar.
  if (
    scene === 'cleanup' &&
    !s.crowd.cleanup &&
    s.crowd.born - s.crowd.removed - sceneCactiOnScreen(s.crowd) >= 2
  )
    observe(s, 'invisible-stored', 'Saiu da tela e ficou no grupo.')
  // ⚠️⚠️ "Criação em cada quadro" pede a PAREDE de cactos à vista: pelo menos 1 s de relógio e
  // 20 cactos. Com um "Um passo" (0,2 s) nasciam 6, empilhados num tufo que a criança não
  // conseguia contar, e a meta caía afirmando o que ela não tinha visto (relatório g2).
  // ⚠️ Com a folga do binário (lote 4): trinta quadros de 1/30 s somam 0,9999999999999999.
  if (scene === 'spawn' && s.crowd.timer && s.crowd.elapsed + 1e-9 >= 0.1 && s.crowd.born > 1)
    observe(s, 'with-timer', 'O intervalo abriu espaço entre os cactos.')
  if (scene === 'spawn' && !s.crowd.timer && s.crowd.elapsed + 1e-9 >= 1 && s.crowd.born >= 20)
    observe(s, 'every-frame', 'Em cada quadro nasce outro cacto.')
  if (scene === 'spawn' && falling && s.crowd.timer) {
    s.crowd.fallFrames = Math.min(10000, (s.crowd.fallFrames ?? 0) + 1)
    const first = s.crowd.cacti.find((c) => c.id === 1)
    const travel = first?.y === undefined ? undefined : first.y + 30
    const intervalFrames = Math.round(s.crowd.interval * fps)
    if (travel !== undefined && travel >= 180) {
      if (intervalFrames === 40 && s.crowd.fallBaseline === undefined) s.crowd.fallBaseline = travel
      if (intervalFrames === 20 && s.crowd.fallBaseline === travel) {
        s.crowd.fallComparison = travel
        observe(s, 'same-fall', 'Com mais pedras nascendo, cada pedra desce na mesma velocidade.')
      }
    }
  }
  if (scene === 'game-state') {
    if (!s.match.guarded && s.match.screen === 'start' && s.crowd.born > bornBefore)
      observe(s, 'outside', 'Nasceram cactos antes de começar.')
    // ⚠️⚠️ "Nada nasceu" pede ter ESPERADO (lote 5 do Raio-X): caía num passo de 0,2 s com a peça
    // dentro, e nesse tempo nem SEM a condição nasceria cacto (o relógio é de 0,6 s). Dois segundos na
    // tela de início com Criar cacto dentro do Se, e nenhum nascimento desde a troca (que limpa a
    // pista). O tempo parado reusa o `scoreIdle`, que a troca da peça e a volta ao início zeram.
    if (s.match.guarded && s.match.screen === 'start') {
      s.match.scoreIdle += seconds
      if (s.match.scoreIdle + 1e-9 >= waitingSeconds && s.crowd.born === 0)
        observe(
          s,
          'waiting',
          waitingSeconds === 4
            ? 'O relógio tocou três vezes e nenhuma pedra nasceu.'
            : 'No início, nada nasceu por 2 segundos.',
        )
    }
    if (s.match.guarded && s.match.screen === 'playing' && s.crowd.born > bornBefore)
      observe(s, 'playing', 'Jogando, voltou a nascer.')
  }
  // Quem saiu de cena continua contado, não desenhado: milhares de SVGs não ensinam nada.
  s.crowd.cacti = s.crowd.cacti.filter((c) =>
    exitTop ? (c.y ?? 0) >= -270 : falling ? (c.y ?? -30) <= 300 : c.x >= -480,
  )
}

function advanceScore(s: SceneState, seconds: number): void {
  const enabled = !s.match.guarded || s.match.screen === 'playing'
  if (enabled) {
    const porQuadro = s.match.scoreClock === 'frame'
    s.match.clockRemainder += seconds * (porQuadro ? 60 : 1)
    const points = Math.floor(s.match.clockRemainder + 1e-9)
    s.match.points += points
    s.match.clockRemainder -= points
    if (porQuadro && points > 0) {
      s.match.scoreFrameTicks = (s.match.scoreFrameTicks ?? 0) + points
      if (s.match.scoreFrameTicks >= 60)
        observe(s, 'score-runaway', 'No quadro, o placar disparou: 60 por segundo', true)
    }
    verPlacar(s)
    // ⚠️ Sem "o placar cresce em qualquer tela" (review do lote 2): a regra, escrita com o placar
    // ainda em 0, e com "condição", que é jargão. Onde a peça está e o placar, a situação diz.
    if (s.match.guarded && s.match.screen === 'playing' && points > 0)
      observe(s, 'score-playing', 'Os pontos cresceram durante a partida.')
    // ⚠️⚠️ O ERRO à vista (lote 5 do Raio-X): com a peça solta, o placar cresce na tela de INÍCIO.
    // É a comparação que a Aula 11 quer ("espere no menu: pontos não crescem"), e antes nenhuma meta
    // a exigia: dava para pôr a peça no lugar certo logo de cara e conferir três telas já certas.
    if (
      !s.match.guarded &&
      s.match.scoreClock !== 'frame' &&
      s.match.screen === 'start' &&
      points > 0
    )
      observe(s, 'score-idle-wrong', 'Solto, o placar cresceu no início.')
    return
  }
  s.match.scoreIdle += seconds
  verPlacar(s)
  if (s.match.scoreIdle + 1e-9 < 0.5) return
  // ⚠️⚠️ "O início esperou" é COMPARAÇÃO (lote 5): só vale depois de a criança ter visto o placar
  // solto crescer no início. Antes disso, a tela parada não diz nada sobre a peça.
  if (s.match.screen === 'start') {
    observe(s, 'score-waiting', 'Dentro do Se de jogando, o início esperou.')
    if (s.evidence.discoveries.includes('score-idle-wrong')) {
      observe(s, 'score-start', 'Dentro do Se, o início esperou.')
    }
    return
  }
  // ⚠️⚠️ "Parou no valor" também é COMPARAÇÃO (consertos do review da onda A do lote 5, A6): com o botão
  // único "Próxima tela", dois toques levavam do Início ao Fim sem nenhum segundo jogando, e a meta
  // afirmava que um placar em 0 "parou". Só vale depois de ver os pontos crescerem jogando.
  if (s.evidence.discoveries.includes('score-playing')) {
    observe(s, 'score-end', 'No fim, o placar parou no valor.')
    observe(s, 'score-kept', 'No fim, o placar parou no valor.')
  }
}

/** O placar que a criança VIU nesta tela da `score`: a fileira "Início · Jogando · Fim". */
function verPlacar(s: SceneState): void {
  const tela = s.match.screen === 'start' ? 0 : s.match.screen === 'playing' ? 1 : 2
  s.match.seen[tela] = s.match.points
}

/* ── A segunda metade do Corre Dino e os números (lote 5 do Raio-X, 16/09/2026) ─────────────── */

/** Onde o Dino fica na pista da `restart`, e de onde um cacto já o alcança. */
const PARTIDA = { dino: 60, alcance: 34, nasce: 480, porSegundo: 160, intervalo: 1 } as const

/**
 * UM quadro da partida da `restart`: os cactos vêm, nascem mais, e o primeiro que chega bate.
 *
 * ⚠️⚠️ Os cactos só andam JOGANDO. No início e no fim eles ficam onde estão, e é isso que a cena
 * existe para mostrar: quem só troca de tela começa a partida seguinte com a pista da anterior, e
 * bate na hora (o cacto que bateu continua em cima do Dino).
 */
function avancarAPartida(s: SceneState, fps: number): void {
  if (s.match.screen !== 'playing') return
  for (const c of s.crowd.cacti) c.x -= PARTIDA.porSegundo / fps
  s.crowd.remainder += 1 / fps
  if (s.crowd.remainder + 1e-9 >= PARTIDA.intervalo) {
    s.crowd.remainder = Math.max(0, s.crowd.remainder - PARTIDA.intervalo)
    nascerNaPartida(s)
  }
  if (s.crowd.cacti.some((c) => c.x <= PARTIDA.dino + PARTIDA.alcance)) {
    s.match.screen = 'end'
    observe(s, 'ended', 'A batida levou para o fim.')
    s.caption = 'Um cacto bateu no Dino: fim da partida.'
  }
}

function nascerNaPartida(s: SceneState): void {
  s.crowd.born += 1
  s.crowd.cacti.push({ id: s.crowd.born, x: PARTIDA.nasce, velocity: -5 })
  // ⚠️ Com corte no motor: o validador aceita até 320, e a pista não tem lugar para mais que isto.
  s.crowd.cacti = s.crowd.cacti.slice(-8)
}

/**
 * O TOQUE NA TELA da `restart`: o evento único do Estúdio ("qualquer tecla ou toque").
 *
 * No início começa a partida. No fim faz o que a criança ESCOLHEU (`match.restartConnected`):
 * "Mudar o estado do jogo para inicio" só troca de tela, "Reiniciar o jogo" limpa a pista.
 */
function tocarNaTela(s: SceneState, input: 'key' | 'tap'): void {
  const tela = s.match.screen
  if (tela === 'playing') return
  if (tela === 'end') {
    if (s.match.restartConnected) {
      reiniciarOJogo(s)
      return
    }
    s.match.screen = 'start'
    s.caption = `Voltou para o início, e ${quantos(s.crowd.cacti.length, 'cacto continua', 'cactos continuam')} na pista.`
    return
  }
  const herdados = s.crowd.cacti.length
  const voltouDaAbertura = input === 'key' && s.match.cleared > 0
  s.match.screen = 'playing'
  s.crowd.remainder = 0
  // ⚠️⚠️ A comparação é OBRIGATÓRIA (lote 5): "Reiniciar começou com a pista limpa" só depois de a
  // criança ter visto a partida começar com os cactos da anterior. Sem isso, a pista vazia de quem
  // só apertou Recomeçar parecia obra do Reiniciar.
  if (herdados > 0) {
    observe(s, 'screen-only', 'Só trocar de tela deixou os cactos na pista.')
    s.caption = `A partida começou com ${quantos(herdados, 'cacto', 'cactos')} da partida anterior na pista.`
    /**
     * ⚠️⚠️ O cacto que bateu CONTINUA em cima do Dino (consertos do review da onda A do lote 5): a partida
     * herdada começava e acabava no primeiro quadro, com a imagem e a frase do PRIMEIRO fim, e quem
     * piscou não via que tinha havido uma partida nova. Ela acaba aqui, no toque, com a frase dela. É o
     * mesmo mundo que o primeiro quadro dava (e não depende do tempo), então o servidor refaz igual.
     */
    if (s.crowd.cacti.some((c) => c.x <= PARTIDA.dino + PARTIDA.alcance)) {
      s.match.screen = 'end'
      observe(s, 'ended', 'A batida levou para o fim.')
      // ⚠️ Sem "um deles" (pronome que o elenco não flexiona) e sem adjetivo colado ao obstáculo.
      s.caption = `A partida nova começou com ${quantos(herdados, 'cacto', 'cactos')} da partida anterior e acabou na hora, com uma batida.`
    }
  } else {
    if (s.match.cleared > 0 && s.evidence.discoveries.includes('screen-only')) {
      observe(s, 'clean-track', 'Reiniciar começou com a pista limpa.')
      s.caption = 'A partida começou com a pista limpa.'
    } else s.caption = 'A partida começou.'
    if (voltouDaAbertura)
      observe(
        s,
        'back-to-menu',
        'Reiniciar levou para a abertura, e foi preciso outro Enter para jogar.',
      )
    nascerNaPartida(s)
  }
  s.match.cleared = 0
}

/** "Reiniciar o jogo": a pista limpa e a tela de início, como o bloco do Estúdio. */
function reiniciarOJogo(s: SceneState): void {
  const tirados = s.crowd.cacti.length
  resetTrack(s)
  s.match.screen = 'start'
  s.match.points = 0
  s.match.cleared = tirados
  s.caption = 'Reiniciou o jogo: a pista ficou vazia e a abertura voltou.'
}

/**
 * A distância da `hitbox`. ⚠️⚠️ "BATEU" só é descoberta com um VÃO à vista entre os desenhos (lote 5):
 * com a área grande da abertura, as áreas encostam antes de os desenhos se tocarem, e é essa a batida
 * injusta. Trazer o cacto até em cima do Dino também encosta as áreas, mas não mostra nada.
 */
function moverNaHitbox(s: SceneState): void {
  if (!sceneContact(s.contact)) {
    observarAreaPequena(s)
    return
  }
  const vao = sceneDrawingsGap(s.contact)
  if (vao >= HITBOX_VISIBLE_GAP) observe(s, 'contact', 'BATEU com os desenhos ainda longe.')
  s.caption =
    vao > 0
      ? `BATEU! Os desenhos ainda têm um vão de ${Math.round(vao)}.`
      : 'BATEU! Os desenhos também se encostam.'
}

/**
 * A área do Dino na `hitbox`. ⚠️⚠️ O contraste só vale com a área DIMINUINDO a partir de uma batida
 * vista (lote 5): é o conserto da Aula 10 ("área de colisão 80%"). Aumentar a área até bater era o
 * roteiro antigo, na direção contrária à da aula.
 */
function redimensionarNaHitbox(s: SceneState, previous: SceneState, largura: number): void {
  const antes = sceneContact(s.contact)
  s.contact.width = largura
  const depois = sceneContact(s.contact)
  const diminuiu = largura < previous.contact.width
  s.caption = `A área do Dino ficou em ${sceneAreaPercent(largura)}%.${antes && !depois ? ' Não bateu.' : ''}`
  observarAreaPequena(s)
  if (!(antes && !depois && diminuiu && s.evidence.discoveries.includes('contact'))) return
  // O contraste só ensina se o "antes" for o da largura ANTERIOR: o retrato é refeito com ela.
  s.evidence.observations = s.evidence.observations.filter(
    (o) => o.id !== 'area-before' && o.id !== 'area-contrast',
  )
  const old = cloneScene(s)
  old.contact.width = previous.contact.width
  observe(old, 'area-before', 'Antes: mesma posição, área maior.', false)
  const snapshot = old.evidence.observations.find((o) => o.id === 'area-before')
  if (snapshot) s.evidence.observations.push(snapshot)
  observe(s, 'area-contrast', 'Área menor, mesmo lugar: a batida sumiu.')
}

function observarAreaPequena(s: SceneState): void {
  if (
    s.contact.distance <= HITBOX_DRAWINGS_TOUCH &&
    sceneAreaPercent(s.contact.width) <= 40 &&
    !sceneContact(s.contact)
  ) {
    observe(s, 'too-small', 'Os desenhos se tocam, mas o jogo não marcou a batida.')
    s.caption = 'Os desenhos se tocam, mas as áreas pontilhadas não. O jogo não marcou a batida.'
  }
}

/**
 * "Sortear lugar" na `random`: um lugar de 500 a 560, de 10 em 10, com a velocidade fixa em −5.
 *
 * ⚠️⚠️ O sorteio é DE VERDADE (lote 5 do Raio-X): o número vem do gesto (`unit`, o `Math.random` do
 * navegador) e o motor só o transforma em lugar, então o servidor refaz o mesmo mundo. Eram quatro
 * exemplos fixos (500 e 560, −5 e −6), e a cena que pergunta se o lugar pode repetir nunca repetia.
 * No caso base há sete lugares, então oito sorteios repetem com certeza. O caso da pedra tem
 * 61 lugares; nele repetir é possível, mas não é uma meta obrigatória.
 */
function sortearLugar(s: SceneState, unidade: number, axis: 'right' | 'above'): void {
  const i = Math.min(
    s.speed.spots.length - 1,
    Math.max(0, Math.floor(unidade * s.speed.spots.length)),
  )
  const x =
    axis === 'above'
      ? 90 + i * 5
      : RANDOM_SPOTS.first + i * (s.speed.spots.length === 61 ? 1 : RANDOM_SPOTS.step)
  s.speed.spots[i] = (s.speed.spots[i] ?? 0) + 1
  s.speed.samples.x = x
  if (!s.speed.samples.positions.includes(x))
    s.speed.samples.positions = [...s.speed.samples.positions, x].slice(-12)
  if (axis === 'above') s.speed.fallingY = -30
  const repetiu = (s.speed.spots[i] ?? 0) >= 2
  s.caption = repetiu ? `Saiu ${x} de novo.` : `Saiu ${x}.`
  if (s.speed.samples.positions.length >= 2) observe(s, 'positions', 'Saíram lugares diferentes.')
  if (repetiu) observe(s, 'repeat', 'Um lugar repetiu.')
}

/**
 * "Sortear velocidade" na `random`: −5 ou −6, com o lugar fixo em 500, e o cacto CORRE 1 segundo
 * na raia dele (30 quadros, a régua da `velocity`). ⚠️ O tempo é do gesto, e não de um ▶ geral: a
 * diferença entre −5 e −6 vira DISTÂNCIA na tela (150 contra 180), e não uma seta 9 px maior.
 */
function sortearVelocidade(s: SceneState, unidade: number): void {
  const velocidade = unidade < 0.5 ? -5 : -6
  const corrida = velocidade * 30
  s.speed.samples.velocity = velocidade
  if (!s.speed.samples.velocities.includes(velocidade)) s.speed.samples.velocities.push(velocidade)
  s.crowd.born += 1
  s.crowd.cacti.push({ id: s.crowd.born, x: RANDOM_SPOTS.first + corrida, velocity: velocidade })
  // As raias: as quatro últimas corridas.
  s.crowd.cacti = s.crowd.cacti.slice(-4)
  s.caption = `Saiu ${numero(velocidade)}: em 1 segundo, o cacto andou ${Math.abs(corrida)}.`
  const raias = new Set(s.crowd.cacti.map((c) => c.velocity))
  if (raias.has(-5) && raias.has(-6))
    observe(s, 'velocities', 'O cacto −6 chegou mais longe que o −5.')
}

/**
 * Um passo do relógio de 5 segundos na base da `acceleration`, com a CONDIÇÃO do Estúdio.
 *
 * ⚠️⚠️ A condição IMPEDE diminuir ("Se velocidade > −9: some −1"), e não prende o valor (lote 5 do
 * Raio-X). A placa antiga fazia `max(−9, base)`: quem passava de −9 sem ela e depois ligava via a base
 * PULAR de volta para −9, algo que a condição do jogo nunca faz.
 */
function passarABase(s: SceneState): { antes: number } {
  const antes = s.speed.base
  if (!s.speed.limited || antes > -9) s.speed.base = antes - 1
  s.speed.ticks += 1
  if (s.speed.limited && antes === -9 && s.speed.base === -9)
    observe(s, 'base-limit', 'A base parou em −9.')
  if (!s.speed.limited && s.speed.base < -9)
    observe(s, 'past-limit', 'Sem a condição, a base passou de −9.')
  return { antes }
}

/**
 * "Passar 5 segundos" na `acceleration`: a base anda um passo e UM cacto novo nasce com ela, menos o
 * sorteio (0 ou 1). ⚠️ O sorteio é do gesto (`unit`), como na `random`, com uma garantia: com a base
 * parada em −9, cada sorteio ainda pode dar 0 ou 1. O pedido não promete quando virá −10.
 */
function passarCincoSegundos(s: SceneState, unidade: number): void {
  const { antes } = passarABase(s)
  const base = s.speed.base
  const sorteio = unidade < 0.5 ? 0 : 1
  const velocidade = base - sorteio
  s.speed.samples.velocity = velocidade
  s.crowd.born += 1
  s.crowd.cacti.push({ id: s.crowd.born, x: 500, velocity: velocidade, base })
  // A fileira: os oito últimos, na ordem em que nasceram.
  s.crowd.cacti = s.crowd.cacti.slice(-8)
  s.caption = `Passaram 5 segundos: a base está em ${numero(base)}, e o cacto novo nasceu com ${numero(velocidade)}.`
  /**
   * ⚠️⚠️ A ordem invertida tranca duas metas (consertos do review da onda A do lote 5, A1). Quem desliga
   * a condição antes leva a base para −10, e religar não a puxa de volta (é a condição do Estúdio):
   * `base-limit` e `variation-limit` pedem a base CHEGANDO em −9 e ficam impossíveis até Recomeçar. A
   * bancada fecha a chave até lá; esta frase é para a sessão guardada antes do lote e para um caso que
   * abre com a base abaixo de −9. Diz o estado e o gesto que destrava, sem a regra.
   */
  const d = s.evidence.discoveries
  if (s.speed.limited && antes < -9 && !(d.includes('base-limit') && d.includes('variation-limit')))
    s.caption = `Passaram 5 segundos: a base continua em ${numero(base)}. Recomece para ver a base parar em −9.`
  if (s.speed.limited && antes === -9 && velocidade === -10)
    observe(s, 'variation-limit', 'Mesmo parada em −9, saiu um cacto −10.')
  if (new Set(s.crowd.cacti.map((c) => c.velocity)).size >= 2)
    observe(s, 'old-speed', 'Os cactos velhos não mudaram de número.')
}

/**
 * "Guardar" na `variable`. ⚠️⚠️ A PRIMEIRA vez cria a caixa ("Criar variável pontos = 0", lote 5 do
 * Raio-X), e guardar zero ali é descoberta: é o primeiro bloco do jogo. Depois, só conta um número
 * DIFERENTE (o deslizante no batente reenvia o mesmo), e mudar pelo deslizante também é mudança.
 */
function guardarNaCaixa(s: SceneState, valor: number): void {
  const criada = s.box.created
  const antes = s.box.value
  s.box.created = true
  s.box.value = valor
  if (!criada) {
    observe(s, 'stored', 'A caixa guardou um número', true)
    s.caption = `A caixa pontos foi criada e guarda ${valor}.`
    return
  }
  if (valor === antes) return
  const guardouAntes = s.evidence.discoveries.includes('stored')
  observe(s, 'stored', 'A caixa guardou um número', true)
  s.box.changes += 1
  if (!s.box.shown && guardouAntes)
    observe(s, 'changed-hidden', 'Mudou o valor sem estar na tela', true)
  s.caption = `A caixa agora guarda ${valor}.`
}

/**
 * O ACERTO do tiro nas `lives` (lote 5 do Raio-X): +1 no placar, e as vidas ficam. ⚠️ É a causa do
 * ponto no Desafio (tiro no asteroide), e não o tempo jogado, que é a do Corre Dino.
 */
function acertarComOTiro(s: SceneState): void {
  const l = s.lifeline
  if (l.lives === 0) {
    s.caption = 'A partida já acabou. Recomece para jogar de novo.'
    return
  }
  l.shots += 1
  l.points += 1
  l.last = 'tiro'
  s.caption = `O tiro acertou um cacto: o placar foi para ${l.points}, e as vidas continuam em ${l.lives}.`
}

/** A frase do caminho desde a âncora da `velocity`, em quadros. */
function fraseDoCaminho(
  passos: number,
  p: { x: number; y: number; anchorX: number; anchorY: number },
): string {
  const quadros = passos === 1 ? 'Um quadro' : `${passos} quadros`
  const n = (v: number) => numero(Math.round(v))
  const lado = mexeuNoEixo(p.x, p.anchorX)
  const cima = mexeuNoEixo(p.y, p.anchorY)
  if (lado && cima)
    return `${quadros}: o x foi de ${n(p.anchorX)} para ${n(p.x)}, e o y de ${n(p.anchorY)} para ${n(p.y)}.`
  if (lado) return `${quadros}: o x foi de ${n(p.anchorX)} para ${n(p.x)}.`
  return `${quadros}: o y foi de ${n(p.anchorY)} para ${n(p.y)}. ${p.y > p.anchorY ? 'Desceu' : 'Subiu'}.`
}

/**
 * Põe uma marca no papel do espelho (lote 5 do Raio-X). ⚠️ A marca repetida vai para o FIM, e não é
 * duplicada: pintar a asa de novo não é outro traço no papel, e a cópia do último traço (a que o
 * palco destaca) é sempre a última da lista. O corte é no motor, com o mesmo teto do validador.
 */
function pintarMarca(s: SceneState, marca: string): void {
  s.mirror.marks = [...s.mirror.marks.filter((m) => m !== marca), marca].slice(-MARCAS_NO_PAPEL)
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
  // Parada, a situação já diz que o quadro está parado na tela.
  if (!a.playing) return
  a.elapsed += seconds
  // ⚠️ Com a folga do binário (lote 4): três quadros de 1/24 s somam 0,12499999999999999, e a oito
  // trocas por segundo a troca do terceiro quadro escorregaria para o quarto.
  const trocas = Math.floor(a.elapsed * a.rate + 1e-6)
  if (trocas > 0) {
    a.elapsed = Math.max(0, a.elapsed - trocas / a.rate)
    a.swaps += trocas
    a.frame = ((a.frame - 1 + trocas) % 2) + 1
  }
  if (a.rate <= 2 && a.swaps >= 2 && !a.sameFrames)
    observe(s, 'slow-shows-two', 'Devagar, viu um quadro e depois o outro', true)
  if (a.rate >= 6 && a.swaps >= 4) {
    if (a.sameFrames)
      observe(s, 'same-frames', 'Com os dois quadros iguais, o fogo parou de pulsar', true)
    else observe(s, 'movement', 'Rápido, viu o fogo pulsar', true)
  }
  // ⚠️⚠️ O que ESTÁ na tela, em qualquer velocidade (review do lote 2). A frase dizia "o olho junta
  // os dois e vira movimento" com 4 trocas por segundo, onde a meta nem cai, e "dá para ver um
  // desenho, depois o outro" no primeiro passo, antes da segunda troca: a regra antes de ver.
  // ⚠️ "quadros por segundo" e "prévia", as palavras do Pinta (lote 5 do Raio-X).
  s.caption = a.sameFrames
    ? `A prévia troca ${quantos(a.rate, 'quadro', 'quadros')} por segundo, mas os dois quadros são iguais.`
    : `A prévia troca ${quantos(a.rate, 'quadro', 'quadros')} por segundo: quadro ${a.frame} na tela.`
}

/**
 * O placar sobe sozinho enquanto houver vida: um ponto por segundo, e o quadro desta cena É o
 * segundo (`SCENE_FRAME_RATE`). ⚠️ O resto continua guardado, com a folga do binário, para um
 * retrato de antes do lote 4 (quando o resto vinha de fatias de 0,05 s) terminar o segundo dele: o
 * roteiro prometia "2 s de ponto" e a tela mostrava 1 por causa de um 1,999999.
 */
function advanceLives(s: SceneState, seconds: number): void {
  const l = s.lifeline
  // ⚠️ Sem "falta o fio do ponto" (review do lote 2): o conserto dito no lugar do que se vê. Sem
  // vidas, a situação já diz que a partida acabou.
  if (l.lives === 0) return
  if (!l.scoring) {
    s.caption = `O relógio andou, e o placar continua em ${l.points}.`
    return
  }
  l.remainder += seconds
  const ganhos = Math.floor(l.remainder + 1e-9)
  l.remainder = Math.max(0, l.remainder - ganhos)
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
  l.last = 'batida'
  if (!l.onHit) {
    // ⚠️ O que aconteceu, e não o porquê ("o fio da vida está desligado" era a explicação).
    s.caption = `Bateu, e as vidas continuam em ${l.lives}.`
    return
  }
  l.lives -= 1
  observe(s, 'life-lost', 'A batida tirou uma vida', true)
  if (l.points > 0) observe(s, 'points-stay', 'Os pontos ficaram, mesmo perdendo vida', true)
  // Sem vidas, a situação diz que a partida acabou e com quantos pontos.
  if (l.lives === 0) observe(s, 'over', 'Sem vidas, a partida acabou.', true)
  else
    s.caption = `Uma vida saiu. ${l.lives === 1 ? 'Resta 1' : `Restam ${l.lives}`}, e o placar continua em ${l.points}.`
}

/* ── O núcleo do Iniciante 2D, redesenhado no lote 5 do Raio-X (16/09/2026, G5) ────────────────── */
/*
 * Uma função por gesto e uma por quadro, para as nove cenas. As réguas (a pista das raquetes, o vaivém
 * dos cactos, os corações, a velocidade do tiro) moram no `nucleo.ts`, que o palco e a faixa também
 * leem. Proposta de cada cena: `community-kids/tmp/storyboard/analise/g5-nucleo-2d.md`.
 */

/**
 * `hold-vs-press`: a tecla AFUNDA. É o "Quando apertar a tecla" (a raquete de cima dá UM passo) e o
 * começo do "a tecla está apertada?" (a de baixo passa a andar em cada quadro).
 *
 * ⚠️⚠️ Uma tecla só, ligada às duas raquetes (lote 5 do Raio-X). Com dois botões, segurar por 3 s não
 * mexia a de cima nem uma vez, e a criança saía achando que "apertar" e "segurar" eram teclas
 * diferentes, e não dois jeitos de ESCUTAR a mesma tecla. Os fantasmas marcam onde cada uma estava.
 *
 * ⚠️⚠️ As DUAS voltam ao começo da pista quando a tecla afunda (consertos do review da onda B do lote
 * 5). Andando de onde estavam, a de baixo dava a volta na pista em meio segundo na segunda segurada e
 * terminava ATRÁS da de cima: o desenho dizia "a de baixo andou menos" na hora da pergunta "por que
 * pararam em lugares diferentes?". Do começo, toda comparação sai lado a lado e 13 passos cabem antes
 * de qualquer volta (o palco escreve a volta quando ela acontece).
 */
function afundarATecla(s: SceneState): void {
  const i = s.input
  i.holding = true
  i.pressFrom = holdLaneSnap(i.pressX)
  i.holdFrom = holdLaneSnap(i.holdX)
  i.holdX = HOLD_LANE.start
  i.pressX = holdLaneNext(HOLD_LANE.start)
  i.presses += 1
  i.pressSteps = 1
  i.holdSteps = 0
}

/**
 * A tecla sobe. ⚠️ As duas metas de SOLTAR pedem o gesto inteiro: um toque rápido (a de baixo não
 * chegou a andar mais que um passo) ou uma segurada de pelo menos 1 s com a de cima parada no primeiro
 * passo. Antes "as duas em lugares diferentes" pedia a de baixo passar a de cima, e não caía com o
 * rótulo verdadeiro na tela (240 × 120).
 */
function soltarATecla(s: SceneState): void {
  const i = s.input
  i.holding = false
  if (i.holdSteps <= HOLD_TAP_STEPS)
    observe(s, 'one-step', 'Toque rápido: a de cima deu um passo', true)
  if (i.holdSteps >= HOLD_LONG_STEPS && i.pressSteps === 1)
    observe(s, 'apart', 'Segurando, a de cima deu um passo só', true)
}

/** Um quadro da `hold-vs-press`: a pergunta "a tecla está apertada?" é feita de novo. */
function quadroDaTecla(s: SceneState): void {
  const i = s.input
  i.ticks += 1
  if (!i.holding) return
  i.holdX = holdLaneNext(i.holdX)
  i.holdSteps += 1
  // ⚠️ Três quadros (0,75 s): num quadro só as duas raquetes estão no MESMO passo, e a resposta da
  // previsão ("a de cima dá um passo só") ainda não está à vista.
  if (i.holdSteps >= HOLD_RUNNING_STEPS)
    observe(s, 'while-held', 'Segurando, a de baixo não parou de andar', true)
}

/**
 * `group-loop`: escolher um cacto. ⚠️ Escolher sem medir os três é ACEITO, e a frase diz quem ficou sem
 * medir (antes ela elogiava o atalho: "Escolheu o 2º, que é o mais perto agora").
 */
function escolherOCacto(s: SceneState, id: number): void {
  const h = s.hunt
  // ⚠️⚠️ Com o laço ligado, quem escolhe é o laço (consertos do review da onda B do lote 5). A escolha à
  // mão durava um quadro, e antes derrubava `auto` sem ninguém chegar mais perto. A bancada fecha o
  // botão com a mesma frase; o motor recusa para a sessão antiga e para o roteiro.
  if (h.auto) {
    s.caption = 'O laço está escolhendo sozinho.'
    return
  }
  h.chosen = id
  const semMedir = [1, 2, 3].filter((n) => !h.looked.includes(n))
  h.blind = semMedir.length > 0
  // ⚠️⚠️ O mais perto é o dos números que a criança MEDIU (a foto de cada régua): é a comparação que ela
  // fez. Com o relógio parado são os de agora; com o tempo passando sem o laço, a frase diz "quando
  // você mediu" em vez de afirmar o mais perto de um instante que ela não viu.
  const perto = maisPerto(h.measured)
  const velhas = h.measured.some((d, i) => d !== h.distances[i])
  if (!h.blind && id === perto) observe(s, 'nearest', 'Escolheu o mais perto depois de medir', true)
  const lista = semMedir.map((n) => `o ${n}º`)
  const quem =
    lista.length > 1 ? `${lista.slice(0, -1).join(', ')} e ${lista.at(-1)}` : (lista[0] ?? '')
  // ⚠️ "Você escolheu o 2º sem medir o 2º e o 3º" lia como erro de digitação: quando o escolhido é um
  // dos que faltam, a frase separa as duas coisas.
  s.caption = h.blind
    ? semMedir.includes(id)
      ? `Você escolheu o ${id}º sem medir. Ainda falta medir ${quem}.`
      : `Você escolheu o ${id}º sem medir ${quem}.`
    : id === perto
      ? velhas
        ? `O ${id}º tinha o menor número quando você mediu.`
        : `O ${id}º é o mais perto dos três.`
      : `Você escolheu o ${id}º. Compare os três números de novo.`
}

/**
 * Um quadro da `group-loop`: os cactos vão e voltam, e o laço mede os três de novo.
 *
 * ⚠️⚠️ A meta `auto` cai quando o laço TROCA a escolha sozinho (lote 5 do Raio-X). Caía no ato de
 * ligar, com tudo parado: "a escolha acompanha quem está mais perto" era afirmada sobre um movimento
 * que não existia (a cena nem tinha relógio).
 */
function quadroDoLaco(s: SceneState, fps: number): void {
  const h = s.hunt
  const antes = maisPerto(h.distances)
  h.ticks += 1
  h.distances = huntDistances(h.ticks, fps)
  if (!h.auto) return
  // O laço mede os três de novo: as réguas mostram o número de AGORA.
  h.measured = [...h.distances]
  h.loopTicks = Math.min(HUNT_LOOP_SEEN_TICKS, h.loopTicks + 1)
  h.chosen = maisPerto(h.distances)
  // ⚠️⚠️ Consertos do review da onda B do lote 5: a troca é a do MAIS PERTO (e não a da escolha, que um
  // "Escolher" à mão mudava), e só depois de 1 s de laço ligado. Logo depois de ligar, a troca lia como
  // o laço desfazendo a escolha certa da criança, e a cena concluía antes de ela ver o laço seguir.
  if (h.chosen !== antes && h.loopTicks >= HUNT_LOOP_SEEN_TICKS)
    observe(s, 'auto', 'Com o laço, a escolha mudou sozinha quando outro chegou mais perto', true)
}

/** `enemy-type`: nasce um cacto da ficha, com uma CÓPIA dos números dela (que só vale no modo cópia). */
function nascerDaFicha(s: SceneState): void {
  const b = s.blueprint
  // ⚠️⚠️ A pista cheia não RECUSA mais: sai o cacto mais antigo para o novo nascer (consertos do review
  // da onda B do lote 5). "Fazer nascer mais um" é o gesto em destaque, a criança chega a 8 sem
  // esforço, e a chave da cópia só abre depois: com a recusa, `copied` (que pede um cacto nascido DEPOIS
  // da mudança) ficava impossível sem Recomeçar, e nada na tela dizia isso.
  const cheia = b.cacti.length >= ENEMY_MAX_CACTI
  if (cheia) {
    const maisAntigo = Math.min(...b.cacti.map((c) => c.seq))
    b.cacti = b.cacti.filter((c) => c.seq !== maisAntigo)
  }
  // ⚠️ Um ao lado do outro, e não empilhados: com o relógio parado três nascimentos caíam no mesmo x.
  let x: number = ENEMY_LANE.spawnX
  while (x > ENEMY_LANE.min && b.cacti.some((c) => Math.abs(c.x - x) < ENEMY_LANE.gap - 10))
    x -= ENEMY_LANE.gap
  b.seq += 1
  b.born += 1
  const id = b.cacti.reduce((maior, c) => Math.max(maior, c.id), 0) + 1
  b.cacti.push({ id, x: Math.max(ENEMY_LANE.min, x), speed: b.speed, life: b.life, seq: b.seq })
  if (b.born >= 3) observe(s, 'many', 'Nasceram três cactos da mesma ficha', true)
  // ⚠️ Sem "todos lendo a mesma ficha" (review do lote 2): a resposta da explicação. "um cacto"
  // concorda com o elenco ("uma pedra").
  // ⚠️ Sem "outro" nem "antigo" soltos: longe do nome, o elenco não os flexiona ("uma pedra… outro").
  s.caption = cheia
    ? 'A pista estava cheia. Saiu o cacto que nasceu primeiro, e nasceu mais um cacto.'
    : b.cacti.length === 1
      ? 'Nasceu um cacto.'
      : `Nasceu mais um cacto. Agora são ${b.cacti.length}.`
}

/**
 * `enemy-type`: um número da ficha muda. ⚠️ Escrever o valor que já estava não é mudar (o deslizante
 * no batente reenvia o mesmo número). ⚠️⚠️ A meta não cai AQUI (lote 5 do Raio-X): ela espera o
 * quadro seguinte, em que os cactos que já andavam andam com o número novo e a criança vê a mudança.
 * Mudar a VIDA passou a valer de novo: os corações estão em cima de cada cacto.
 */
function mudarAFicha(s: SceneState, campo: 'speed' | 'life', valor: number): void {
  const b = s.blueprint
  const nome = campo === 'speed' ? 'velocidade' : 'vida'
  if ((campo === 'speed' ? b.speed : b.life) === valor) {
    s.caption = `A ficha já estava com ${nome} ${valor}.`
    return
  }
  if (campo === 'speed') b.speed = valor
  else b.life = valor
  b.edits += 1
  b.seq += 1
  b.editSeq = b.seq
  b.pending = true
  // ⚠️ Sem "Os 3 que nasceram leem esta ficha": era a resposta do "Agora explique".
  s.caption = `A ficha agora diz ${nome} ${valor}.`
}

/**
 * `enemy-type`: a chave "Copiar a ficha ao nascer". ⚠️ Ao ligar, cada cacto que já anda guarda a ficha
 * de AGORA (como se tivesse acabado de nascer): senão um número mudado antes, lido pela ficha, faria
 * os antigos pularem para um valor velho no instante da troca.
 */
function ligarACopia(s: SceneState, ligada: boolean): void {
  const b = s.blueprint
  if (b.copy === ligada) return
  b.copy = ligada
  if (ligada)
    for (const c of b.cacti) {
      c.speed = b.speed
      c.life = b.life
    }
  b.editSeq = b.seq
  b.pending = false
}

/**
 * Um quadro da `enemy-type`: os cactos andam para a esquerda e reaparecem à direita.
 *
 * ⚠️⚠️ As duas regras, cada uma com a sua meta, e as duas só depois de um quadro (a criança vê o
 * efeito): lendo a ficha, os cactos que JÁ andavam mudaram juntos (pelo menos dois na tela); copiando
 * ao nascer, um antigo continua com o número de antes e um novo, nascido depois da mudança, já nasce
 * com o número novo. É a regra do cacto da `acceleration`, que o Corre Dino ensina: "o antigo conserva
 * a velocidade que recebeu".
 */
function quadroDaFicha(s: SceneState, fps: number): void {
  const b = s.blueprint
  b.ticks += 1
  for (const c of b.cacti) {
    c.x -= enemyStep(b.copy ? c.speed : b.speed, fps)
    if (c.x < ENEMY_LANE.exitX) c.x += ENEMY_LANE.returnX - ENEMY_LANE.exitX
    c.x = Number(c.x.toFixed(3))
  }
  const naTela = b.cacti.filter((c) => enemyOnScreen(c.x))
  const antigos = naTela.filter((c) => c.seq < b.editSeq)
  if (b.pending && !b.copy && antigos.length >= 2)
    observe(s, 'all-change', 'Mudou a ficha e os cactos que já andavam mudaram juntos', true)
  b.pending = false
  if (!b.copy) return
  const igualAFicha = (c: { speed: number; life: number }) =>
    c.speed === b.speed && c.life === b.life
  const velho = antigos.some((c) => !igualAFicha(c))
  const novo = naTela.some((c) => c.seq > b.editSeq && igualAFicha(c))
  if (velho && novo) observe(s, 'copied', 'Copiando ao nascer, só os novos mudaram', true)
}

/**
 * `camera`: o Dino anda no mundo.
 *
 * ⚠️⚠️ `window` cai quando a JANELA muda de lugar com a câmera seguindo, depois de o Dino ter sumido
 * sem ela (lote 5 do Raio-X). Caía só por andar além de 480 com a câmera ligada, e afirmava "o mundo
 * continua maior que a tela" sem nada ter passado pela tela.
 */
function andarNoMundo(s: SceneState, x: number): void {
  const v = s.view
  const antes = cameraWindow(v.heroX, v.follow)
  v.heroX = x
  if (!v.follow && x > CAMERA_WORLD.screen) {
    v.wasLost = true
    observe(s, 'lost', 'Sem a câmera, o Dino saiu da tela', true)
  }
  if (v.follow && v.wasLost && cameraWindow(v.heroX, v.follow) !== antes)
    observe(s, 'window', 'Com a câmera seguindo, o cenário passou e o Dino ficou na tela', true)
  // Sem legenda: onde o Dino está e o pedaço que a tela mostra, a faixa e a situação dizem.
}

/**
 * `camera`: a chave "A câmera segue o Dino". ⚠️ "Voltou para a tela" pede o Dino FORA da tela parada no
 * instante de ligar: um Dino que já tinha voltado andando não voltou por causa da câmera.
 */
function ligarACamera(s: SceneState, ligada: boolean): void {
  const v = s.view
  const fora = !v.follow && v.heroX > CAMERA_WORLD.screen
  v.follow = ligada
  if (ligada && fora && v.wasLost)
    observe(s, 'follows', 'Com a câmera seguindo, o Dino voltou para a tela', true)
}

/**
 * Um quadro da `contact`: as DUAS regras ao mesmo tempo, uma pista cada.
 *
 * ⚠️⚠️ Em cima, "o Dino está encostando?" é perguntado em todo quadro e tira um coração em cada um; em
 * baixo, "Quando o Dino começar a encostar" só acontece no quadro em que longe vira perto. `drain` e
 * `once` caem no MESMO terceiro quadro de uma encostada: é a comparação lado a lado. Uma pista sem
 * coração ("fim de jogo") recomeça cheia quando o cacto se afasta, senão três encostadas curtas
 * deixariam "em todo quadro" impossível.
 */
function quadroDoEncosto(s: SceneState): void {
  const h = s.hit
  const encostando = contactTouching(h.distance)
  if (encostando) {
    if (!h.touching) {
      h.touches += 1
      h.frames = 0
      h.topTouch = 0
      h.bottomTouch = 0
      if (h.bottom > 0) {
        h.bottom -= 1
        h.bottomTouch += 1
      }
    }
    h.frames += 1
    if (h.top > 0) {
      h.top -= 1
      h.topTouch += 1
      h.damage += 1
    }
    if (h.topTouch >= CONTACT_SEEN_FRAMES)
      observe(s, 'drain', '"Está encostando?" tirou um coração em todo quadro', true)
    // ⚠️⚠️ "Afastou e voltou" pede as DUAS metades: a primeira batida vista (`once`, numa encostada
    // ANTERIOR) e um quadro com os dois genuinamente LONGE (`away`). E cai no MESMO terceiro quadro da
    // encostada nova que `drain` e `once` (consertos do review da onda B do lote 5): no primeiro quadro a
    // cena concluía com "em cima 1 a menos, embaixo 2", o contrário da regra, na hora da pergunta.
    if (
      h.frames >= CONTACT_SEEN_FRAMES &&
      h.bottomTouch === 1 &&
      h.away &&
      s.evidence.discoveries.includes('once')
    )
      observe(s, 'apart', 'Afastou, encostou de novo e perdeu mais um coração', true)
    if (h.frames >= CONTACT_SEEN_FRAMES && h.bottomTouch === 1)
      observe(s, 'once', '"Começar a encostar" tirou um coração só', true)
  } else {
    h.frames = 0
    if (s.evidence.discoveries.includes('once')) h.away = true
    // ⚠️⚠️ Um "fim de jogo" recomeça as DUAS pistas juntas (consertos do review da onda B do lote 5): um
    // jogo novo para as duas regras. Enchendo só a pista zerada, a de cima voltava a 10 com a de baixo
    // em 8, e a encostada seguinte mostrava a de baixo perdendo MAIS.
    if (h.top === 0 || h.bottom === 0) {
      h.top = CONTACT_HEARTS
      h.bottom = CONTACT_HEARTS
    }
  }
  h.touching = encostando
  // Sem legenda: há quantos quadros estão encostados e os corações de cada pista, a situação e a faixa dizem.
}

/**
 * `cooldown`: o aperto em "Atirar".
 *
 * ⚠️⚠️ Os tiros VOAM (lote 5 do Raio-X). O tiro novo sai da boca da arma, e um tiro ainda colado nela é
 * empurrado para a frente (sem recarga eles saem colados, a `COOLDOWN_SHOT.glued`); com recarga, o
 * anterior já andou e aparece o vão. `burst` cai no TERCEIRO tiro sem recarga dentro de 1 s de relógio
 * (antes só caía quando o relógio andava, e o roteiro do modelo terminava com 1 de 3 metas). O aperto
 * recusado não vira fila: o palco pisca "não saiu" por meio segundo e ele some.
 */
function atirarComRecarga(s: SceneState): void {
  const w = s.weapon
  if (w.ready > 0) {
    w.refused += 1
    w.refusedAt = w.time
    observe(s, 'waiting', 'Apertar durante a recarga não fez tiro nenhum', true)
    s.caption = 'Ainda recarregando. Esse aperto não virou tiro.'
    return
  }
  w.shots += 1
  w.ready = w.seconds
  const anterior = w.bullets.length > 0 ? Math.min(...w.bullets) : null
  const tiros = [0, ...w.bullets].sort((a, b) => a - b)
  for (let i = 1; i < tiros.length; i++)
    tiros[i] = Math.max(tiros[i] ?? 0, (tiros[i - 1] ?? 0) + COOLDOWN_SHOT.glued)
  w.bullets = tiros.filter((x) => x <= COOLDOWN_SHOT.end).slice(0, COOLDOWN_SHOT.max)
  w.shotTimes = [...w.shotTimes, w.time].slice(-3)
  const [primeiro] = w.shotTimes
  if (w.seconds === 0 && w.shotTimes.length === 3 && w.time - (primeiro ?? 0) <= 1 + 1e-9)
    observe(s, 'burst', 'Sem recarga, os tiros saíram colados', true)
  // ⚠️ O vão só conta com a recarga DESTE ajuste (`shots` recomeça na recarga) e com o tiro anterior
  // ainda à vista: um tiro que saiu da tela não mostra vão nenhum.
  if (w.seconds > 0 && w.shots >= 2 && anterior !== null && anterior >= COOLDOWN_SHOT.glued * 2)
    observe(s, 'spaced', 'Com recarga, apareceu um vão entre os tiros', true)
  s.caption = w.seconds > 0 ? `Tiro ${w.shots}. A arma está recarregando.` : `Tiro ${w.shots}.`
}

/**
 * Um quadro da `cooldown`: a recarga desce, os tiros andam. ⚠️⚠️ Abaixo de um milésimo a recarga
 * ACABOU (review do lote 2): somas binárias deixam um resto de 1e−16, e o tiro de quem esperou a barra
 * inteira era recusado. ⚠️ Sem legenda (lote 5): a situação diz "Pronto para atirar" ou quanto falta, e
 * uma legenda por quadro apagava a frase do tiro 0,1 s depois de ela aparecer.
 */
function quadroDaRecarga(s: SceneState, fps: number): void {
  const w = s.weapon
  w.time = Number((w.time + 1 / fps).toFixed(6))
  if (w.ready > 0) w.ready = Math.max(0, w.ready - 1 / fps)
  if (w.ready < 0.001) w.ready = 0
  w.bullets = w.bullets
    .map((x) => Number((x + COOLDOWN_SHOT.speed / fps).toFixed(3)))
    .filter((x) => x <= COOLDOWN_SHOT.end)
}

/**
 * `aim`: o aperto em "Atirar". ⚠️⚠️ O tiro sai do Dino e VOA (lote 5 do Raio-X): pela seta até o alvo
 * com a mira ligada, reto para a direita sem ela. A direção é a do instante do disparo; mudar a chave ou
 * o alvo com o tiro no ar não o desvia.
 */
function atirarNoAlvo(s: SceneState): void {
  const m = s.sight
  const dx = m.targetX - AIM_ORIGIN.x
  const dy = m.targetY - AIM_ORIGIN.y
  const distancia = Math.hypot(dx, dy)
  m.flying = true
  m.aimed = m.chasing
  m.result = 'nada'
  m.bulletX = AIM_ORIGIN.x
  m.bulletY = AIM_ORIGIN.y
  const pelaSeta = m.chasing && distancia > 0
  m.bulletVX = pelaSeta ? (dx / distancia) * AIM_SHOT.speed : AIM_SHOT.speed
  m.bulletVY = pelaSeta ? (dy / distancia) * AIM_SHOT.speed : 0
  // Com o alvo em cima do Dino, o tiro acerta no disparo.
  if (distancia <= AIM_SHOT.hit) acertarOAlvo(s, false)
}

/**
 * ⚠️ `voou`: o tiro andou até o alvo. Com o alvo em cima do Dino ele acerta no disparo, sem seta nem voo,
 * e "o tiro foi pela seta" não pode cair ali (consertos do review da onda B do lote 5).
 */
function acertarOAlvo(s: SceneState, voou = true): void {
  const m = s.sight
  m.flying = false
  m.result = 'acertou'
  m.bulletX = m.targetX
  m.bulletY = m.targetY
  m.shotX = m.targetX
  m.shotY = m.targetY
  if (m.aimed && voou) observe(s, 'follows', 'Com a mira, o tiro foi pela seta e acertou', true)
  // ⚠️ Sem legenda: o acerto acontece no meio do relógio, e uma frase escrita num quadro dependeria de
  // quantas fatias o ▶ mandou depois dele. "O tiro acertou o alvo." é a SITUAÇÃO que diz.
}

/**
 * Um quadro da `aim`: o tiro anda um trecho. ⚠️ O acerto é conferido no TRECHO inteiro, e não no ponto
 * de chegada: a 30 por quadro o tiro pularia por cima de um alvo de raio 18.
 */
function quadroDaMira(s: SceneState, fps: number): void {
  const m = s.sight
  if (!m.flying) return
  const ax = m.bulletX
  const ay = m.bulletY
  const bx = ax + m.bulletVX / fps
  const by = ay + m.bulletVY / fps
  m.bulletX = Number(bx.toFixed(3))
  m.bulletY = Number(by.toFixed(3))
  if (aimDistanceToPath(ax, ay, bx, by, m.targetX, m.targetY) <= AIM_SHOT.hit) {
    acertarOAlvo(s)
    return
  }
  const { aimX, aimY } = SCENE_LIMITS
  if (bx >= aimX.min && bx <= aimX.max && by >= aimY.min && by <= aimY.max) return
  m.flying = false
  m.result = 'errou'
  m.shotX = Math.max(aimX.min, Math.min(aimX.max, m.bulletX))
  m.shotY = Math.max(aimY.min, Math.min(aimY.max, m.bulletY))
  // ⚠️ `straight-miss` é a meta que responde a previsão ("para onde vai o tiro com a mira desligada?").
  if (!m.aimed) observe(s, 'straight-miss', 'Sem a mira, o tiro foi reto e errou', true)
}

/**
 * `diagonal`: "Andar 1 segundo" com as setas apertadas, sempre a partir do começo.
 *
 * ⚠️⚠️ As metas são COMPARAÇÕES com o que está no palco (lote 5 do Raio-X): `faster` pede um fantasma
 * de andada RETA (antes caía no primeiro passo diagonal, sem nada com que comparar, e com o ▶ marcando
 * 3,39, MENOS que os 12 do reto no "Um passo"); `same` pede o fantasma da diagonal SEM correção.
 */
function andarUmSegundo(s: SceneState): void {
  const p = s.walkPad
  const andada = diagonalStride(p.dx, p.dy, p.even)
  if (!andada) {
    s.caption = 'Nenhuma seta apertada: o Dino não saiu do lugar.'
    return
  }
  const viu = (tipo: string) => p.ghosts.some((g) => g.kind === tipo)
  const retoAntes = viu('reto')
  const diagonalAntes = viu('diagonal')
  p.x = andada.x
  p.y = andada.y
  p.distance = andada.distance
  p.best = Math.max(p.best, andada.distance)
  p.last = andada.kind
  p.strides += 1
  p.ghosts = [
    ...p.ghosts.filter((g) => g.kind !== andada.kind),
    { kind: andada.kind, x: andada.x, y: andada.y },
  ]
  if (andada.kind === 'reto') observe(s, 'straight', 'Andando reto, o Dino parou no círculo', true)
  if (andada.kind === 'diagonal' && retoAntes)
    observe(s, 'faster', 'Na diagonal, o Dino passou do círculo', true)
  if (andada.kind === 'corrigida' && diagonalAntes)
    observe(s, 'same', 'Com a correção, a diagonal parou no círculo', true)
  // Sem legenda: quanto o Dino andou e onde parou, a situação diz; o círculo e o fantasma mostram.
}

/** O nome de cada letra do mapa, como a legenda do palco. */
const PECA_DO_MAPA: Record<string, string> = { '.': 'vazio', '#': 'bloco', o: 'moeda' }

/**
 * `tilemap`: escrever uma letra numa casa do texto.
 *
 * ⚠️⚠️ Lote 5 do Raio-X: `same-letter` pede a mesma PEÇA (`#` ou `o`) em duas LINHAS (caía apagando
 * duas casas com "."), e `coin-row` é a meta nova do "...ooo...." da previsão: três moedas seguidas numa
 * linha do meio. ⚠️ Linhas diferentes, e não casas: escrever "ooo" numa linha só não fecha as duas
 * metas no mesmo toque.
 */
function escreverNoMapa(s: SceneState, row: number, col: number, tile: string): void {
  const g = s.grid
  const linha = g.rows[row]
  if (!linha) return
  g.lastRow = row
  g.lastCol = col
  const nome = PECA_DO_MAPA[tile] ?? tile
  // ⚠️ "A casa 4,5" se lia como número decimal (review do lote 2).
  if (linha[col] === tile) {
    s.caption = `Linha ${row + 1}, casa ${col + 1}: já era ${nome}.`
    return
  }
  g.rows[row] = linha.slice(0, col) + tile + linha.slice(col + 1)
  g.edits += 1
  observe(s, 'text-is-map', 'Trocou uma letra e o desenho mudou', true)
  // ⚠️⚠️ A marca é da CASA e sai quando a casa recebe outra letra (consertos do review da onda B do lote
  // 5): marcada só pela linha, um `#` apagado continuava contando para "a mesma peça em duas linhas".
  const casa = `${row}:${col}`
  g.marks = g.marks.filter((m) => m.slice(1) !== casa)
  if (tile === '#' || tile === 'o') {
    g.marks = [...g.marks, tilemapMark(tile, row, col)].slice(-TILEMAP_MARKS_MAX)
    if (tilemapMarkedRows(g.rows, g.marks, tile).length >= 2)
      observe(
        s,
        'same-letter',
        'Escreveu a mesma peça em duas linhas, e as duas ficaram iguais',
        true,
      )
  }
  // ⚠️ Só a LINHA ESCRITA (consertos do review da onda B do lote 5): olhando o mapa inteiro, um caso com
  // "ooo" numa linha fechava a meta no primeiro `o` que a criança escrevia em qualquer outra.
  if (tile === 'o' && isTilemapCoinRow(g.rows, row))
    observe(s, 'coin-row', 'Três o seguidos numa linha do meio viraram três moedas no ar', true)
  s.caption = `Linha ${row + 1}, casa ${col + 1}: agora é ${nome}.`
}
