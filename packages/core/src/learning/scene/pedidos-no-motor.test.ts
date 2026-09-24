import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { blockPrediction, type InteractiveBlock } from '../index'
import { SCENE_IDS, SCENE_LIMITS, type SceneAction, type SceneId, sceneFrameRate } from './actions'
import { sceneDefaultGoalIds, sceneModel } from './catalog'
import { facesAVista, maisPerto, openScene, stepScene } from './engine'
import { type SceneActivity, sceneStart, sceneTargets } from './index'
import { AIM_ORIGIN, enemyOnScreen, tilemapCoinRow } from './nucleo'
import { ONCE_VS_ALWAYS_PRESETS } from './presets'
import { SCENE_QUESTIONS } from './questions'
import { drawLoopOnScreen, sceneSituation } from './readout'
import {
  DELTA_RACE,
  type SceneStart,
  type SceneState,
  sceneAreaPercent,
  sceneAreaWidth,
  sceneCactiOnScreen,
  sceneContact,
  sceneDrawingsGap,
  uniqueNamesWarning,
} from './state'

/**
 * O PEDIDO de cada meta, seguido ao pé da letra no MOTOR, e a meta que RESPONDE a previsão,
 * olhada no instante em que cai (review do lote 2 do Raio-X, 16/09/2026).
 *
 * ⚠️⚠️ Por que existe: o lote 2 escreveu um pedido para cada uma das 122 metas e um `revealOn` para
 * cada uma das 45 previsões, e o review rodou os dois no motor. Dezesseis não se sustentavam: o
 * pedido da `hitbox` deixava a terceira meta impossível, o da `pool` prendia a criança com "algumas
 * vezes", o da `cooldown` terminava num tiro recusado, a `impulse` dizia "E foi isso mesmo!" com
 * 83 de altura na tela para a aposta "mais de 150". Texto que o "Conferir" mostra como gesto
 * precisa ser um gesto que FUNCIONA, e a única prova disso é o motor.
 *
 * ⚠️ Cada pedido aqui é o texto do catálogo (conferido letra por letra) e a tradução literal dele
 * em ações. Mudou o texto? O teste reprova até alguém reescrever as ações, que é o ponto: quem
 * muda a frase precisa conferir que ela continua sendo um gesto que derruba a meta.
 *
 * O tempo é o do ▶: fatias de 0,05 s. "Deixe o tempo passar" sem medida é um segundo.
 * ⚠️ Desde o lote 4 o motor conta QUADROS no ritmo de cada cena (`SCENE_FRAME_RATE`): um tempo menor
 * que um quadro não muda nada, e "um quadro" aqui é `quadro()`, nunca um número de segundos cravado.
 */

const FATIA = 0.05

/** O que a criança faz com as mãos: ações, o tempo passando, e esperar até ver alguma coisa. */
class Maos {
  estado: SceneState
  constructor(
    readonly start: SceneStart,
    estado: SceneState,
    /** Cada estado depois de cada ação, para achar o instante em que uma meta caiu. */
    readonly historico: SceneState[] = [],
  ) {
    this.estado = estado
  }
  faz(acao: SceneAction) {
    this.estado = stepScene(this.start, this.estado, acao)
    this.historico.push(this.estado)
  }
  tempo(segundos = 1) {
    for (let t = 0; t < Math.round(segundos / FATIA); t++)
      this.faz({ type: 'advance', seconds: FATIA })
  }
  /** O tempo de UM quadro desta cena, pelo ▶. */
  quadro() {
    this.tempo(1 / (sceneFrameRate(this.start.scene) ?? 1))
  }
  /** Deixa o tempo passar até ver `cond`, como quem espera com o ▶ ligado. */
  ate(cond: (s: SceneState) => boolean, maxSegundos = 15) {
    for (let t = 0; t < maxSegundos / FATIA && !cond(this.estado); t++)
      this.faz({ type: 'advance', seconds: FATIA })
    expect(cond(this.estado)).toBe(true)
  }
  viu = (meta: string) => this.estado.evidence.discoveries.includes(meta)
}

interface Pedido {
  /** O texto do catálogo, letra por letra. */
  texto: string
  /** O gesto que o texto pede, a partir de QUALQUER estado. */
  faz: (m: Maos) => void
  /**
   * O controle desta meta só ABRE depois de outra meta (a bancada o deixa fechado com o motivo
   * escrito). Seguido da abertura da cena, o pedido esbarraria num controle que a criança não
   * alcança; ele só é conferido no caminho do "Conferir".
   */
  abreDepois?: string
}

interface Cena {
  pedidos: Record<string, Pedido>
  /** A resposta da previsão está NA TELA no instante em que a meta `revealOn` cai. */
  mostra: (s: SceneState) => boolean
  /**
   * ⚠️ A revelação cai junto com a conclusão, e só o redesenho resolve (lote 5). Com o motivo.
   * Sem isto, o teste exige que o palpite volte ANTES de a cena concluir.
   */
  revelaNaConclusao?: string
}

const ligado = (m: Maos, port: string, enabled: boolean) =>
  m.faz({ type: 'connect', port, enabled } as SceneAction)

/* ── Os gestos da segunda metade do Corre Dino (lote 5 do Raio-X) ─────────────────────────────── */
/** `restart`: toca na tela e deixa o tempo passar até a partida estar no FIM. */
const noFimDaPartida = (m: Maos) => {
  for (let t = 0; t < 3 && m.estado.match.screen !== 'end'; t++) {
    if (m.estado.match.screen !== 'playing') m.faz({ type: 'start', input: 'tap' })
    m.tempo(3)
  }
  expect(m.estado.match.screen).toBe('end')
}
/** `score`: aperta "Próxima tela" (Início → Jogando → Fim → Início) até a tela pedida. */
const ateATela = (m: Maos, tela: 'start' | 'playing' | 'end') => {
  for (let t = 0; t < 3 && m.estado.match.screen !== tela; t++) {
    const agora = m.estado.match.screen
    m.faz(
      agora === 'start'
        ? { type: 'start', input: 'key' }
        : agora === 'playing'
          ? { type: 'collide' }
          : { type: 'home' },
    )
  }
}
/** `acceleration`: "Passar 5 segundos", com o número do sorteio escolhido. */
const passarCinco = (m: Maos, unit: number) =>
  m.faz({ type: 'sample', kind: 'velocity', unit, guided: false })

const CENAS: Record<SceneId, Cena> = {
  'copy-vs-original': {
    pedidos: {
      exported: {
        texto: 'Aperte Exportar e olhe o lado da aula.',
        faz: (m) => m.faz({ type: 'export-file' }),
      },
      imported: {
        texto: 'Com o arquivo pronto, aperte Importar.',
        faz: (m) => {
          if (!m.estado.copies.fileColor) m.faz({ type: 'export-file' })
          m.faz({ type: 'import-file' })
        },
      },
      independent: {
        texto: 'Com jogo nos dois lados, pinte a nave de um lado só.',
        faz: (m) => {
          if (!m.estado.copies.fileColor) m.faz({ type: 'export-file' })
          if (!m.estado.copies.studioColor) m.faz({ type: 'import-file' })
          m.faz({ type: 'recolor', side: 'studio', color: 'rosa' })
        },
      },
    },
    mostra: (s) => s.copies.fileColor !== null && s.copies.lessonColor !== null,
  },
  'published-copy': {
    pedidos: {
      'first-publish': {
        texto: 'Aperte Publicar e olhe as duas telas.',
        faz: (m) => m.faz({ type: 'publish' }),
      },
      'only-project': {
        texto: 'Depois de publicar, troque a cor da nave e olhe as duas telas.',
        faz: (m) => {
          if (!m.estado.copies.posts.length) m.faz({ type: 'publish' })
          m.faz({ type: 'recolor', side: 'project', color: 'rosa' })
        },
      },
      republish: {
        texto: 'Com a cor trocada, aperte Publicar de novo.',
        faz: (m) => {
          if (!m.estado.copies.posts.length) m.faz({ type: 'publish' })
          if (m.estado.copies.projectColor === m.estado.copies.posts.at(-1)?.color)
            m.faz({ type: 'recolor', side: 'project', color: 'rosa' })
          m.faz({ type: 'publish' })
        },
      },
    },
    mostra: (s) =>
      s.copies.posts.length > 0 && s.copies.posts.at(-1)?.color !== s.copies.projectColor,
  },
  'same-rules-new-skin': {
    pedidos: {
      'skin-only': {
        texto: 'Troque o tema para carrinho e olhe a lista de regras.',
        faz: (m) => m.faz({ type: 'skin', theme: 'road' }),
      },
      'three-skins': {
        texto: 'Passe pelos três temas.',
        faz: (m) => {
          m.faz({ type: 'skin', theme: 'road' })
          m.faz({ type: 'skin', theme: 'sea' })
        },
      },
      'rule-off': {
        texto: 'Desligue a regra de atirar e jogue um pouco.',
        faz: (m) => {
          m.faz({ type: 'rule-toggle', enabled: false })
          m.faz({ type: 'play-shoot' })
          m.tempo(1)
        },
      },
    },
    mostra: (s) => s.skinGame.theme === 'road' && s.skinGame.shootEnabled,
  },
  'fixed-vs-read': {
    pedidos: {
      'same-spot': {
        texto: 'Com o x em o número 400, atire, leve a nave para outro lugar e atire de novo.',
        faz: (m) => {
          m.faz({ type: 'value-source', source: 'fixed' })
          m.faz({ type: 'shoot' })
          m.faz({ type: 'place', x: m.estado.fixedRead.heroX === 640 ? 200 : 640, y: 0 })
          m.faz({ type: 'shoot' })
        },
      },
      follows: {
        texto: 'Troque para o centro x da nave, leve a nave para outro lugar e atire.',
        faz: (m) => {
          m.faz({ type: 'value-source', source: 'read' })
          m.faz({ type: 'place', x: m.estado.fixedRead.heroX === 640 ? 200 : 640, y: 0 })
          m.faz({ type: 'shoot' })
        },
      },
      'box-marks': {
        texto: 'Ligue as marcas da caixa da nave e atire com o centro x da nave.',
        faz: (m) => {
          m.faz({ type: 'value-source', source: 'read' })
          m.faz({ type: 'box-marks', on: true })
          m.faz({ type: 'shoot' })
        },
      },
    },
    mostra: (s) => s.fixedRead.marks.filter((mark) => mark.source === 'fixed').length >= 2,
  },
  'collision-pair': {
    pedidos: {
      'whole-group': {
        texto: 'Deixe os dois seletores no grupo inteiro e deixe a trombada acontecer.',
        faz: (m) => {
          m.faz({ type: 'command-target', subject: 'shot', target: 'group' })
          m.faz({ type: 'command-target', subject: 'rock', target: 'group' })
          m.faz({ type: 'reset' })
          m.tempo(1)
        },
      },
      'just-the-pair': {
        texto:
          'Troque os dois seletores para os apelidos, volte ao começo e deixe a trombada acontecer.',
        faz: (m) => {
          m.faz({ type: 'command-target', subject: 'shot', target: 'alias' })
          m.faz({ type: 'command-target', subject: 'rock', target: 'alias' })
          m.faz({ type: 'reset' })
          m.tempo(1)
        },
      },
      'others-stay': {
        texto:
          'Com os apelidos escolhidos, deixe o tempo passar até as outras duas pedras saírem pela borda de baixo.',
        faz: (m) => {
          if (!m.estado.collisionPair.pairedAliases) {
            m.faz({ type: 'command-target', subject: 'shot', target: 'alias' })
            m.faz({ type: 'command-target', subject: 'rock', target: 'alias' })
            m.faz({ type: 'reset' })
            m.tempo(1)
          }
          m.tempo(2)
        },
      },
    },
    mostra: (s) => s.collisionPair.collided && s.collisionPair.rocks.length === 0,
  },
  invincibility: {
    pedidos: {
      'no-shield': {
        texto: 'Deixe a proteção em 0 e avance até passar a terceira pedra.',
        faz: (m) => {
          m.faz({ type: 'shield', frames: 0 })
          m.faz({ type: 'reset' })
          m.tempo(1)
        },
      },
      window: {
        texto: 'Ponha a proteção em 45, volte ao começo e avance até passar a terceira pedra.',
        faz: (m) => {
          m.faz({ type: 'shield', frames: 45 })
          m.faz({ type: 'reset' })
          m.tempo(1)
        },
      },
      expires: {
        texto: 'Ponha a proteção em 15, volte ao começo e avance até passar a terceira pedra.',
        faz: (m) => {
          m.faz({ type: 'shield', frames: 15 })
          m.faz({ type: 'reset' })
          m.tempo(1)
        },
      },
    },
    mostra: (s) => s.invincibility.struck.length === 3 && s.invincibility.hearts === 2,
  },
  'number-line': {
    pedidos: {
      colder: {
        texto: 'Aperte Somar -1 três vezes e olhe onde o marcador para.',
        faz: (m) => {
          m.faz({ type: 'reset' })
          for (let i = 0; i < 3; i++) m.faz({ type: 'sum-minus-one' })
        },
      },
      greater: {
        texto: 'Volte ao começo e troque o sinal para o biquinho que aponta para a direita.',
        faz: (m) => {
          m.faz({ type: 'reset' })
          m.faz({ type: 'compare-op', operator: '>' })
        },
      },
      stops: {
        texto: 'Com o biquinho escolhido, leve o marcador até o -9.',
        faz: (m) => {
          m.faz({ type: 'compare-op', operator: '>' })
          m.faz({ type: 'step-value', value: -9 })
        },
      },
      silent: {
        texto: 'Volte ao começo, ponha o sinal no igual e aperte Somar -1 quatro vezes.',
        faz: (m) => {
          m.faz({ type: 'reset' })
          m.faz({ type: 'compare-op', operator: '=' })
          for (let i = 0; i < 4; i++) m.faz({ type: 'sum-minus-one' })
        },
      },
    },
    mostra: (s) => s.numberLine.value === -5 && s.numberLine.operator === '>',
  },
  'unique-names': {
    pedidos: {
      missing: {
        texto: 'Tire o bloco de cima e olhe os três blocos e a tela.',
        faz: (m) => m.faz({ type: 'toggle-block', present: false }),
      },
      clash: {
        texto: 'Ponha o bloco de cima de volta e escolha nave também no bloco de baixo.',
        faz: (m) => {
          m.faz({ type: 'toggle-block', present: true })
          m.faz({ type: 'name-field', name: 'nave' })
        },
      },
      'own-name': {
        texto: 'No bloco de baixo, troque nave por folha-nave.',
        faz: (m) => {
          if (!m.viu('clash')) m.faz({ type: 'name-field', name: 'nave' })
          m.faz({ type: 'name-field', name: 'folha-nave' })
        },
      },
    },
    mostra: (s) => uniqueNamesWarning(s.uniqueNames) === 'clash',
  },
  'motion-amount': {
    pedidos: {
      'no-change': {
        texto: 'Deixe os dois controles em 0 e olhe a Prévia.',
        faz: (m) => {
          m.faz({ type: 'nudge', piece: 'crater', amount: 0 })
          m.faz({ type: 'nudge', piece: 'body', amount: 0 })
          m.faz({ type: 'play', on: true })
          m.tempo(0.25)
        },
      },
      'local-move': {
        texto: 'Deixe o tanto da pedra inteira em 0 e ponha o da cratera entre 3 e 6.',
        faz: (m) => {
          m.faz({ type: 'nudge', piece: 'body', amount: 0 })
          m.faz({ type: 'nudge', piece: 'crater', amount: 4 })
          m.faz({ type: 'play', on: true })
          m.tempo(0.25)
        },
      },
      'too-much': {
        texto: 'Ponha o tanto que a pedra inteira anda em 10 ou mais.',
        faz: (m) => {
          m.faz({ type: 'nudge', piece: 'body', amount: 10 })
          m.faz({ type: 'play', on: true })
          m.tempo(0.25)
        },
      },
    },
    mostra: (s) =>
      s.motionAmount.previewFrame === 0 && s.motionAmount.crater === 0 && s.motionAmount.body === 0,
  },
  'two-clocks': {
    pedidos: {
      'more-rocks': {
        texto: 'Deixe a animação em 8, ponha o relógio em 20 e deixe o tempo passar.',
        faz: (m) => {
          m.faz({ type: 'rate', perSecond: 8 })
          m.faz({ type: 'birth-every', frames: 20 })
          m.faz({ type: 'reset' })
          m.tempo(2)
        },
      },
      'faster-spin': {
        texto: 'Deixe o relógio em 40, ponha a animação em 16 e deixe o tempo passar.',
        faz: (m) => {
          m.faz({ type: 'birth-every', frames: 40 })
          m.faz({ type: 'rate', perSecond: 16 })
          m.faz({ type: 'reset' })
          m.tempo(3)
        },
      },
      'each-one': {
        texto:
          'Deixe o tempo passar até nascerem três pedras e olhe o número em cima de cada uma na hora em que ela entra.',
        faz: (m) => m.ate((state) => state.twoClocks.born >= 3, 5),
      },
    },
    mostra: (s) =>
      s.twoClocks.born >= 3 && s.twoClocks.birthEvery === 20 && s.twoClocks.animationRate === 8,
  },
  'once-vs-always': {
    pedidos: {
      once: {
        texto: 'Ponha a ação de preparação em Ao iniciar e comece o jogo.',
        faz: (m) => {
          if (m.estado.once.frames) m.faz({ type: 'reset' })
          m.faz({ type: 'place-in-area', card: 'paint', area: 'start' })
          m.tempo(1)
        },
      },
      always: {
        texto: 'Ponha a ação de movimento em Enquanto estiver rodando e comece o jogo.',
        faz: (m) => {
          if (m.estado.once.frames) m.faz({ type: 'reset' })
          m.faz({ type: 'place-in-area', card: 'move', area: 'loop' })
          m.tempo(1)
        },
      },
      'lives-loop': {
        texto:
          'Depois de testar Ao iniciar, ponha Dar três vidas à nave em Enquanto estiver rodando e comece o jogo.',
        faz: (m) => {
          m.faz({ type: 'place-in-area', card: 'lives', area: 'start' })
          m.tempo(1.5)
          m.faz({ type: 'reset' })
          m.faz({ type: 'place-in-area', card: 'lives', area: 'loop' })
          m.tempo(2.25)
        },
      },
      both: {
        texto:
          'Deixe a preparação em Ao iniciar e o movimento em Enquanto estiver rodando; comece o jogo.',
        faz: (m) => {
          if (m.estado.once.frames) m.faz({ type: 'reset' })
          m.faz({ type: 'place-in-area', card: 'create', area: 'start' })
          m.faz({ type: 'place-in-area', card: 'move', area: 'loop' })
          m.tempo(1.5)
        },
      },
      'on-event': {
        texto: 'Ponha a ação do evento em Quando acontecer e comece o jogo sem apertar a tecla.',
        faz: (m) => {
          m.faz({ type: 'place-in-area', card: 'event', area: 'event' })
          m.tempo(1)
        },
      },
      'key-fires': {
        texto: 'Com a ação do evento em Quando acontecer, aperte a tecla.',
        faz: (m) => {
          m.faz({ type: 'place-in-area', card: 'event', area: 'event' })
          m.faz({ type: 'trigger' })
        },
      },
      flood: {
        texto: 'Ponha Criar um tiro em Enquanto estiver rodando e comece o jogo.',
        faz: (m) => {
          m.faz({ type: 'place-in-area', card: 'event', area: 'loop' })
          m.tempo(1.5)
        },
      },
    },
    mostra: (s) => s.once.frames > 0 && s.once.fires.paint === 1,
  },
  coordinates: {
    pedidos: {
      right: {
        texto: 'Aumente só o x.',
        faz: (m) => m.faz({ type: 'place', x: m.estado.place.x + 20, y: m.estado.place.y }),
      },
      down: {
        texto: 'Aumente só o y.',
        faz: (m) => m.faz({ type: 'place', x: m.estado.place.x, y: m.estado.place.y + 20 }),
      },
      // ⚠️ Lote 5: `origin` entrou no lugar de `same-x`, que caía junto com `down`. Com ela a
      // revelação deixou de coincidir com a conclusão, e a exceção desta cena saiu da lista.
      origin: {
        texto: 'Leve o Dino para x 0 e y 0.',
        faz: (m) => {
          const { x, y } = m.estado.place
          // Já no canto: chegar pede sair dele primeiro.
          if (x === 0 && y === 0) m.faz({ type: 'place', x: 20, y: 0 })
          if (m.estado.place.x !== 0) m.faz({ type: 'place', x: 0, y: m.estado.place.y })
          m.faz({ type: 'place', x: 0, y: 0 })
        },
      },
    },
    mostra: (s) => s.place.y > s.place.fromY && s.place.x === s.place.fromX,
  },
  'screen-reader': {
    pedidos: {
      'heard-empty': {
        texto: 'Aperte Ouvir a tela com o campo vazio.',
        faz: (m) => {
          m.faz({ type: 'describe', text: '' })
          m.faz({ type: 'listen' })
        },
      },
      'says-goal': {
        texto: 'Escreva o que se faz no jogo e aperte Ouvir a tela de novo.',
        faz: (m) => {
          m.faz({ type: 'describe', text: 'Pule os cactos' })
          m.faz({ type: 'listen' })
        },
      },
      'says-control': {
        texto: 'Escreva também qual tecla usar e aperte Ouvir a tela de novo.',
        faz: (m) => {
          m.faz({ type: 'describe', text: 'Pule os cactos apertando espaço' })
          m.faz({ type: 'listen' })
        },
      },
      'says-all-controls': {
        texto: 'Escreva também a seta para cima e o toque na tela, e aperte Ouvir a tela de novo.',
        faz: (m) => {
          m.faz({
            type: 'describe',
            text: 'Corra com o dino e pule os cactos apertando espaço, com a seta para cima ou com toque na tela.',
          })
          m.faz({ type: 'listen' })
        },
      },
    },
    mostra: (s) => s.description.heard === 'Tela do jogo. Imagem.',
  },
  'stage-size': {
    pedidos: {
      'border-on': {
        texto: 'Ligue a borda da tela.',
        faz: (m) => m.faz({ type: 'border', visible: true }),
      },
      resized: {
        texto: 'Com a borda à vista, mude a largura ou a altura.',
        faz: (m) => {
          m.faz({ type: 'border', visible: true })
          m.faz({ type: 'stage', width: m.estado.stage.width - 20, height: m.estado.stage.height })
        },
      },
      target: {
        texto: 'Deixe a tela em 480 por 270.',
        faz: (m) => m.faz({ type: 'stage', width: 480, height: 270 }),
        // ⚠️ Lote 5: os números nascem FECHADOS até a borda aparecer, e o motor só conta a chegada
        // com a borda à vista.
        abreDepois: 'border-on',
      },
    },
    mostra: (s) => s.stage.border,
  },
  'draw-loop': {
    pedidos: {
      frozen: {
        // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5): "aperte Avançar 1 quadro", o
        // botão que a instrução nomeia. Um quadro basta.
        texto:
          'Com o Dino na tela, desenhe só no começo, sem limpar a tela, e aperte Avançar 1 quadro.',
        faz: (m) => {
          // "Com o Dino na tela": se a limpeza deixou a tela vazia, é preciso desenhar antes.
          if (drawLoopOnScreen(m.estado) === 0) {
            m.faz({ type: 'loop', on: true })
            m.quadro()
          }
          m.faz({ type: 'loop', on: false })
          m.faz({ type: 'erase', on: false })
          m.quadro()
        },
      },
      trail: {
        texto: 'Desenhe o Dino a cada quadro, sem limpar a tela, e deixe o tempo passar.',
        faz: (m) => {
          m.faz({ type: 'loop', on: true })
          m.faz({ type: 'erase', on: false })
          m.tempo()
        },
      },
      moving: {
        texto: 'Desenhe o Dino a cada quadro, ligue Limpar a tela antes e deixe o tempo passar.',
        faz: (m) => {
          m.faz({ type: 'loop', on: true })
          m.faz({ type: 'erase', on: true })
          m.tempo()
        },
      },
    },
    mostra: (s) => drawLoopOnScreen(s) >= 2,
  },
  // ⚠️ O ateliê foi redesenhado no lote 5 do Raio-X (G4): a prévia e a velocidade do Pinta, o fogo que
  // cresce, os dois espelhos no meio da grade, uma lupa para as duas pedras e a largura do recorte.
  frames: {
    pedidos: {
      'two-drawings': {
        texto: 'Com a prévia parada, passe do quadro 1 para o quadro 2.',
        faz: (m) => {
          m.faz({ type: 'play', on: false })
          m.faz({ type: 'frame', index: 1 })
          m.faz({ type: 'frame', index: 2 })
        },
      },
      'slow-shows-two': {
        texto: 'Ponha a velocidade em 2, ligue a prévia e espere.',
        faz: (m) => {
          m.faz({ type: 'rate', perSecond: 2 })
          m.faz({ type: 'play', on: true })
          m.tempo(3)
        },
      },
      movement: {
        texto: 'Ponha a velocidade em 8 e deixe a prévia tocar.',
        faz: (m) => {
          m.faz({ type: 'rate', perSecond: 8 })
          m.faz({ type: 'play', on: true })
          m.tempo()
        },
      },
      'paused-one': {
        texto: 'Com a prévia rápida tocando, pare a prévia.',
        faz: (m) => {
          // "Com a prévia rápida tocando" é o ponto de partida: quem não está nele, chega nele.
          const { playing, rate } = m.estado.animation
          if (!playing || rate < 8) {
            m.faz({ type: 'rate', perSecond: 8 })
            m.faz({ type: 'play', on: true })
            m.tempo()
          }
          m.faz({ type: 'play', on: false })
        },
      },
      'same-frames': {
        texto: 'Deixe o quadro 2 igual ao quadro 1 e ligue a prévia rápida.',
        faz: (m) => {
          m.faz({ type: 'same-frames', on: true })
          m.faz({ type: 'rate', perSecond: 8 })
          m.faz({ type: 'play', on: true })
          m.tempo()
        },
      },
    },
    // A resposta ("um quadro de cada vez") é a prévia PARADA com um quadro só na tela.
    mostra: (s) => !s.animation.playing,
  },
  'onion-skin': {
    pedidos: {
      'blind-move': {
        texto: 'No quadro 2, com o fantasma desligado, mude o tamanho do fogo 2.',
        faz: (m) => {
          m.faz({ type: 'frame', index: 2 })
          m.faz({ type: 'onion', on: false })
          m.faz({ type: 'shift', offset: m.estado.animation.shift === 48 ? 40 : 48 })
        },
      },
      'ghost-on': {
        texto: 'Vá para o quadro 2 e ligue o fantasma.',
        faz: (m) => {
          m.faz({ type: 'frame', index: 2 })
          m.faz({ type: 'onion', on: true })
        },
      },
      'even-step': {
        texto:
          'No quadro 2, com o fantasma ligado, deixe o fogo 2 um pouco maior que o fogo 1, sem passar da borda.',
        faz: (m) => {
          m.faz({ type: 'frame', index: 2 })
          m.faz({ type: 'onion', on: true })
          m.faz({ type: 'shift', offset: 20 })
        },
      },
    },
    mostra: (s) => s.animation.onion && s.animation.frame === 2,
  },
  symmetry: {
    pedidos: {
      // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5): os dois espelhos são duas chaves,
      // e cada pedido diz QUAIS ficam ligados ("os dois desligados", "só o lado a lado").
      'one-side': {
        texto: 'Com os dois espelhos desligados, pinte a asa.',
        faz: (m) => {
          m.faz({ type: 'mirror-mode', mode: 'off' })
          m.faz({ type: 'trace', piece: 'asa' })
        },
      },
      'two-sides': {
        texto: 'Deixe ligado só o Espelho lado a lado e pinte a asa.',
        faz: (m) => {
          m.faz({ type: 'mirror-mode', mode: 'x' })
          m.faz({ type: 'trace', piece: 'asa' })
        },
      },
      'axis-decides': {
        texto: 'Deixe ligado só o espelho de cima e de baixo e pinte a asa.',
        faz: (m) => {
          m.faz({ type: 'mirror-mode', mode: 'y' })
          m.faz({ type: 'trace', piece: 'asa' })
        },
        // A opção "cima e baixo" da bancada abre depois do lado a lado.
        abreDepois: 'two-sides',
      },
      'fill-ignores-mirror': {
        texto: 'Deixe ligado o Espelho lado a lado e encha a asa com o Balde de tinta.',
        faz: (m) => {
          m.faz({ type: 'mirror-mode', mode: 'x' })
          m.faz({ type: 'fill' })
        },
      },
    },
    mostra: (s) => s.mirror.on && s.mirror.axis === 'x' && s.mirror.marks.includes('asa|x'),
  },
  'pixel-vector': {
    pedidos: {
      // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5, M5): "perto" é 4.
      stairs: {
        texto: 'Deixe Aproximar em 4 vezes ou mais.',
        faz: (m) => m.faz({ type: 'inspect', kind: m.estado.pixels.kind, zoom: 4 }),
      },
      smooth: {
        texto: 'Deixe Aproximar em 6 vezes ou mais.',
        faz: (m) => m.faz({ type: 'inspect', kind: m.estado.pixels.kind, zoom: 6 }),
      },
      alike: {
        texto: 'Depois de aproximar, volte Aproximar para 1 ou 2 vezes.',
        faz: (m) => {
          m.faz({ type: 'inspect', kind: m.estado.pixels.kind, zoom: 4 })
          m.faz({ type: 'inspect', kind: m.estado.pixels.kind, zoom: 1 })
        },
      },
    },
    // "Só a de pixel vira degraus": com a lupa em 4 as duas pedras estão de perto, lado a lado.
    mostra: (s) => s.pixels.zoom >= 4,
  },
  'sheet-vs-sprite': {
    pedidos: {
      squeezed: {
        texto: 'Escolha a largura 64 e olhe o jogo.',
        faz: (m) => m.faz({ type: 'crop', width: 64 }),
      },
      'crop-half': {
        texto: 'Escolha a largura 16 e olhe o jogo.',
        faz: (m) => m.faz({ type: 'crop', width: 16 }),
      },
      'crop-whole': {
        texto: 'Escolha a largura 32 e olhe o jogo.',
        faz: (m) => m.faz({ type: 'crop', width: 32 }),
      },
      // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5, B8): a nave do jogo BEM maior ou
      // bem menor (fora de 40 a 70); 64 e 72 eram um toque no + da bancada.
      'size-apart': {
        texto: 'Com o recorte de 32, deixe a nave do jogo bem maior ou bem menor e olhe a folha.',
        faz: (m) => {
          m.faz({ type: 'crop', width: 32 })
          m.faz({ type: 'sprite', size: m.estado.sheet.size === 80 ? 30 : 80 })
        },
      },
    },
    // A resposta da previsão do modelo ("metade da nave") é o recorte de 16 no jogo.
    mostra: (s) => s.sheet.width === 16,
  },
  world: {
    pedidos: {
      hidden: {
        texto: 'Crie o Dino nos bastidores.',
        faz: (m) => {
          if (!m.estado.world.created) m.faz({ type: 'create' })
        },
      },
      visible: {
        texto: 'Mostre o Dino na tela do jogo.',
        faz: (m) => {
          if (!m.estado.world.created) m.faz({ type: 'create' })
          ligado(m, 'draw', true)
        },
      },
    },
    mostra: (s) => s.world.created && !s.world.drawn,
  },
  layers: {
    pedidos: {
      front: {
        texto: 'Leve o Dino para o fim da ordem de desenhar.',
        faz: (m) => m.faz({ type: 'layer', front: true }),
      },
      covered: {
        texto: 'Com o Dino no fim da ordem de desenhar, leve a floresta para o fim.',
        faz: (m) => {
          m.faz({ type: 'layer', front: true })
          m.faz({ type: 'layer', front: false })
        },
      },
      // ⚠️ A terceira missão (full review de experiência, M4): "de novo" é o Dino ter ido, a floresta ter
      // voltado e o Dino ir outra vez.
      'back-in-front': {
        texto: 'Leve o Dino de novo para o fim da ordem de desenhar.',
        faz: (m) => {
          m.faz({ type: 'layer', front: true })
          m.faz({ type: 'layer', front: false })
          m.faz({ type: 'layer', front: true })
        },
      },
    },
    mostra: (s) => s.world.front,
  },
  gravity: {
    pedidos: {
      floating: {
        texto: 'Com a gravidade desligada, faça o Dino pular e espere.',
        faz: (m) => {
          ligado(m, 'gravity', false)
          if (m.estado.flight.time !== null) m.ate((s) => s.flight.time === null)
          m.faz({ type: 'jump', input: 'tap' })
          m.tempo(2)
        },
      },
      landed: {
        texto: 'Com o Dino no ar, ligue a gravidade e espere.',
        faz: (m) => {
          if (m.estado.flight.time === null) m.faz({ type: 'jump', input: 'tap' })
          ligado(m, 'gravity', true)
          m.ate((s) => s.flight.time === null)
        },
        abreDepois: 'floating',
      },
    },
    mostra: (s) => !s.flight.atGravity && s.flight.y > 0,
  },
  impulse: {
    pedidos: {
      'first-height': {
        texto: 'Faça o Dino pular e espere o salto terminar.',
        faz: (m) => {
          m.faz({ type: 'jump', input: 'tap' })
          m.ate((s) => s.flight.time === null)
        },
      },
      'other-height': {
        texto: 'Pule com impulso 9 e depois com impulso 14.',
        faz: (m) => {
          m.faz({ type: 'impulse', force: 9 })
          m.faz({ type: 'jump', input: 'tap' })
          m.ate((s) => s.flight.time === null)
          m.faz({ type: 'impulse', force: 14 })
          m.faz({ type: 'jump', input: 'tap' })
          m.ate((s) => s.flight.time === null)
        },
      },
    },
    mostra: (s) => s.flight.peak >= 150 && s.flight.before > 0,
    revelaNaConclusao: 'são duas metas, e a resposta precisa dos dois saltos.',
  },
  'jump-sound': {
    pedidos: {
      'false-sound': {
        texto: 'Com Tocar efeito em Quando apertar Espaço, aperte Espaço duas vezes no mesmo pulo.',
        faz: (m) => {
          ligado(m, 'sound', false)
          m.ate((s) => s.flight.time === null)
          m.faz({ type: 'jump', input: 'key' })
          m.tempo(0.2)
          m.faz({ type: 'jump', input: 'key' })
        },
      },
      'silent-jump': {
        texto: 'Com Tocar efeito em Quando apertar Espaço, pule tocando no Dino.',
        faz: (m) => {
          ligado(m, 'sound', false)
          m.ate((s) => s.flight.time === null)
          m.faz({ type: 'jump', input: 'tap' })
        },
      },
      'quiet-air': {
        texto: 'Com Tocar efeito em Quando o Dino pular, aperte Espaço duas vezes no mesmo pulo.',
        faz: (m) => {
          ligado(m, 'sound', true)
          m.ate((s) => s.flight.time === null)
          m.faz({ type: 'jump', input: 'key' })
          m.tempo(0.2)
          m.faz({ type: 'jump', input: 'key' })
        },
      },
      'key-sound': {
        texto: 'Com Tocar efeito em Quando o Dino pular, pule pela tecla Espaço.',
        faz: (m) => {
          ligado(m, 'sound', true)
          m.ate((s) => s.flight.time === null)
          m.faz({ type: 'jump', input: 'key' })
        },
      },
      'tap-sound': {
        texto: 'Com Tocar efeito em Quando o Dino pular, pule tocando no Dino.',
        faz: (m) => {
          ligado(m, 'sound', true)
          m.ate((s) => s.flight.time === null)
          m.faz({ type: 'jump', input: 'tap' })
        },
      },
      'every-jump': {
        texto:
          'Leve Tocar efeito para Quando o Dino pular. Depois pule pela tecla Espaço e tocando no Dino.',
        faz: (m) => {
          ligado(m, 'sound', true)
          m.ate((s) => s.flight.time === null)
          m.faz({ type: 'jump', input: 'key' })
          m.ate((s) => s.flight.time === null)
          m.faz({ type: 'jump', input: 'tap' })
        },
      },
    },
    mostra: (s) => s.sound.count > s.sound.jumps,
  },
  spawn: {
    pedidos: {
      'every-frame': {
        texto: 'Com Criar cacto em A cada quadro, deixe o tempo passar um segundo inteiro.',
        faz: (m) => {
          if (m.estado.crowd.timer) ligado(m, 'timer', false)
          m.tempo(1.2)
        },
      },
      'with-timer': {
        texto:
          'Leve Criar cacto para dentro do relógio e deixe o tempo passar até nascerem dois cactos.',
        faz: (m) => {
          ligado(m, 'timer', true)
          m.ate((s) => s.crowd.born >= 2)
        },
      },
    },
    mostra: (s) => !s.crowd.timer && s.crowd.born >= 20,
  },
  cleanup: {
    pedidos: {
      'invisible-stored': {
        texto: 'Deixe o tempo passar até dois cactos saírem da tela.',
        faz: (m) => {
          if (m.estado.crowd.cleanup) ligado(m, 'cleanup', false)
          m.ate(
            (s) =>
              s.crowd.born - s.crowd.removed - sceneCactiOnScreen(s.crowd) >= 2 && !s.crowd.cleanup,
          )
        },
      },
      'rule-removes': {
        texto: 'Ligue Tirar do grupo quem sair da tela e deixe o tempo passar até dois saírem.',
        faz: (m) => {
          ligado(m, 'cleanup', true)
          m.tempo(2)
        },
        abreDepois: 'invisible-stored',
      },
    },
    mostra: (s) => s.crowd.born - s.crowd.removed - sceneCactiOnScreen(s.crowd) >= 2,
  },
  'game-state': {
    pedidos: {
      outside: {
        texto: 'No início, com Criar cacto fora do Se, deixe o tempo passar.',
        faz: (m) => {
          if (m.estado.match.screen !== 'start') m.faz({ type: 'home' })
          ligado(m, 'condition', false)
          m.tempo()
        },
      },
      waiting: {
        texto:
          'Leve Criar cacto para dentro de Se o estado do jogo é jogando e deixe o tempo passar 2 segundos no início.',
        faz: (m) => {
          ligado(m, 'condition', true)
          if (m.estado.match.screen !== 'start') m.faz({ type: 'home' })
          m.tempo(2)
        },
      },
      playing: {
        texto: 'Com Criar cacto dentro do Se, comece a partida e deixe o tempo passar.',
        faz: (m) => {
          ligado(m, 'condition', true)
          if (m.estado.match.screen !== 'start') m.faz({ type: 'home' })
          m.faz({ type: 'start', input: 'tap' })
          m.tempo()
        },
      },
    },
    mostra: (s) => s.match.screen === 'start' && s.crowd.born > 0,
  },
  controls: {
    pedidos: {
      'missing-touch': {
        texto: 'Com Começar em Quando apertar a tecla, toque na tela de início.',
        faz: (m) => {
          ligado(m, 'touch', false)
          if (m.estado.match.screen !== 'start') m.faz({ type: 'home' })
          m.faz({ type: 'start', input: 'tap' })
        },
      },
      'start-tap': {
        texto:
          'Leve Começar para Quando apertar qualquer tecla ou tocar na tela, e toque na tela de início.',
        faz: (m) => {
          ligado(m, 'touch', true)
          if (m.estado.match.screen !== 'start') m.faz({ type: 'home' })
          m.faz({ type: 'start', input: 'tap' })
        },
      },
      'start-key': {
        texto: 'Na tela de início, aperte Enter.',
        faz: (m) => {
          if (m.estado.match.screen !== 'start') m.faz({ type: 'home' })
          m.faz({ type: 'start', input: 'key' })
        },
      },
    },
    mostra: (s) => s.match.screen === 'start',
  },
  // ⚠️ Mudou de propósito (lote 5 do Raio-X): o toque na tela é o gesto em todas as telas, e o
  // "Reiniciar" só vale depois de a criança ver a partida começar com os cactos da anterior.
  restart: {
    pedidos: {
      ended: {
        texto: 'Toque na tela e deixe o tempo passar.',
        faz: (m) => {
          for (let t = 0; t < 3 && m.estado.match.screen !== 'playing'; t++)
            m.faz({ type: 'start', input: 'tap' })
          m.tempo(3)
        },
      },
      'screen-only': {
        texto:
          'No fim, com Mudar o estado do jogo para inicio escolhido, toque na tela duas vezes.',
        faz: (m) => {
          noFimDaPartida(m)
          ligado(m, 'restart', false)
          m.faz({ type: 'start', input: 'tap' })
          m.faz({ type: 'start', input: 'tap' })
        },
      },
      'clean-track': {
        texto:
          'Depois de jogar de novo com Mudar o estado do jogo para inicio, escolha Reiniciar o jogo e, no fim, toque na tela duas vezes.',
        faz: (m) => {
          if (!m.viu('screen-only')) CENAS.restart.pedidos['screen-only']?.faz(m)
          noFimDaPartida(m)
          ligado(m, 'restart', true)
          m.faz({ type: 'start', input: 'tap' })
          m.faz({ type: 'start', input: 'tap' })
        },
      },
      'back-to-menu': {
        texto:
          'Escolha Reiniciar o jogo, aperte Enter no fim e depois aperte Enter de novo para jogar.',
        faz: (m) => {
          noFimDaPartida(m)
          ligado(m, 'restart', true)
          m.faz({ type: 'start', input: 'key' })
          m.faz({ type: 'start', input: 'key' })
        },
      },
    },
    // A resposta: a partida começou com os cactos da anterior na pista.
    // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5): a partida herdada acaba no toque,
    // com a frase dela, e a tela da resposta é o FIM com os cactos ainda lá.
    mostra: (s) => s.match.screen !== 'start' && s.crowd.cacti.length > 0,
  },
  // ⚠️ Mudou de propósito (lote 5): a área abre GRANDE e o gesto é diminuir; `separate` saiu.
  hitbox: {
    pedidos: {
      contact: {
        texto: 'Aproxime o cacto do Dino com a Distância do cacto, um toque de cada vez.',
        faz: (m) => {
          for (let t = 0; t < 30 && !sceneContact(m.estado.contact); t++)
            m.faz({ type: 'move', distance: Math.max(20, m.estado.contact.distance - 10) })
          expect(sceneContact(m.estado.contact)).toBe(true)
        },
      },
      'area-contrast': {
        texto: 'Sem mexer na Distância do cacto, diminua o Tamanho da área do Dino.',
        faz: (m) => {
          // De 10 em 10 por cento, como o botão da bancada.
          for (let t = 0; t < 12 && sceneContact(m.estado.contact); t++)
            m.faz({
              type: 'resize',
              width: sceneAreaWidth(Math.max(50, sceneAreaPercent(m.estado.contact.width) - 10)),
            })
        },
        // O Tamanho da área só abre depois do BATEU.
        abreDepois: 'contact',
      },
      'too-small': {
        texto: 'Encoste o cacto no desenho do Dino e deixe o Tamanho da área do Dino em 40%.',
        faz: (m) => {
          m.faz({ type: 'move', distance: 40 })
          m.faz({ type: 'resize', width: sceneAreaWidth(40) })
        },
      },
    },
    // A resposta: BATEU com um vão entre os desenhos.
    mostra: (s) => sceneContact(s.contact) && sceneDrawingsGap(s.contact) > 0,
  },
  // ⚠️ Mudou de propósito (lote 5): o placar solto crescendo no início vem primeiro, e as telas trocam
  // pela "Próxima tela".
  score: {
    pedidos: {
      'score-runaway': {
        texto:
          'Ponha Somar ponto dentro do A cada quadro do jogo e deixe passar um segundo inteiro.',
        faz: (m) => {
          m.faz({ type: 'score-place', clock: 'frame', guarded: false })
          m.tempo(1)
        },
      },
      'score-idle-wrong': {
        texto: 'Com Somar ponto solto, deixe o tempo passar na tela de início.',
        faz: (m) => {
          m.faz({ type: 'score-place', clock: 'loose', guarded: false })
          ateATela(m, 'start')
          m.tempo(1.2)
        },
      },
      'score-start': {
        // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5): mais curto, o mesmo gesto.
        texto:
          'Com a peça solta, deixe o tempo passar no início. Depois leve Somar ponto para o bloco “o estado do jogo é jogando ?” e espere de novo.',
        faz: (m) => {
          m.faz({ type: 'score-place', clock: 'loose', guarded: false })
          ateATela(m, 'start')
          m.tempo(1.2)
          ligado(m, 'condition', true)
          m.tempo(1.2)
        },
      },
      'score-playing': {
        texto:
          'Com Somar ponto dentro do Se, aperte Próxima tela até Jogando e deixe o tempo passar.',
        faz: (m) => {
          ligado(m, 'condition', true)
          ateATela(m, 'playing')
          m.tempo(1.2)
        },
      },
      'score-end': {
        // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5, A6): é comparação com os pontos
        // crescendo jogando.
        texto:
          'Depois de ver os pontos crescerem jogando, aperte Próxima tela até Fim e deixe o tempo passar.',
        faz: (m) => {
          if (!m.viu('score-playing')) CENAS.score.pedidos['score-playing']?.faz(m)
          ateATela(m, 'end')
          m.tempo(1.2)
        },
      },
      'score-waiting': {
        texto: 'Leve Somar ponto para dentro do Se e deixe o tempo passar na tela de início.',
        faz: (m) => {
          m.faz({ type: 'score-place', clock: 'second', guarded: true })
          ateATela(m, 'start')
          m.tempo(1)
        },
      },
      'score-kept': {
        texto:
          'Depois de ver os pontos crescerem jogando, aperte Próxima tela até Fim e deixe o tempo passar.',
        faz: (m) => CENAS.score.pedidos['score-end']?.faz(m),
      },
    },
    mostra: (s) => s.match.screen === 'start' && !s.match.guarded && s.match.points > 0,
  },
  lives: {
    pedidos: {
      'life-lost': {
        // ⚠️ Mudou de propósito (full review de experiência, M8): a peça que muda de caixa, e não o fio.
        texto: 'Leve Perder uma vida para Quando bater e bata no cacto.',
        faz: (m) => {
          ligado(m, 'life', true)
          m.faz({ type: 'collide' })
        },
      },
      'points-stay': {
        texto:
          'Leve Somar ponto para Enquanto tem vida e deixe o tempo passar. Depois bata no cacto com Perder uma vida em Quando bater.',
        faz: (m) => {
          ligado(m, 'condition', true)
          m.tempo(1.2)
          ligado(m, 'life', true)
          m.faz({ type: 'collide' })
        },
      },
      over: {
        texto: 'Com Perder uma vida em Quando bater, bata até não sobrar nenhuma vida.',
        faz: (m) => {
          ligado(m, 'life', true)
          for (let t = 0; t < 5 && m.estado.lifeline.lives > 0; t++) m.faz({ type: 'collide' })
        },
      },
    },
    mostra: (s) => s.lifeline.points > 0 && s.lifeline.lives < 3,
  },
  // ⚠️ Mudou de propósito (lote 5): sorteio de verdade. O número do gesto vem escolhido aqui para o
  // teste ser o mesmo sempre; a criança aperta e o navegador sorteia.
  random: {
    pedidos: {
      positions: {
        // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5, B2): "até sair um lugar
        // diferente". O pior caso cabe aqui: o mesmo lugar duas vezes antes de outro.
        texto: 'Aperte Sortear lugar até sair um lugar diferente.',
        faz: (m) => {
          for (const unit of [0.05, 0.05, 0.95]) {
            if (m.estado.speed.samples.positions.length >= 2) break
            m.faz({ type: 'sample', kind: 'position', unit, guided: false })
          }
        },
      },
      repeat: {
        texto: 'Aperte Sortear lugar mais oito vezes.',
        faz: (m) => {
          // Oito sorteios em sete lugares: algum repete, qualquer que seja a ordem.
          for (let t = 0; t < 8; t++)
            m.faz({ type: 'sample', kind: 'position', unit: ((t % 7) + 0.5) / 7, guided: false })
        },
      },
      velocities: {
        texto: 'Aperte Sortear velocidade até sair um cacto −5 e um −6.',
        faz: (m) => {
          for (const unit of [0.2, 0.8])
            m.faz({ type: 'sample', kind: 'velocity', unit, guided: false })
        },
        // O Sortear velocidade só abre depois de um lugar repetir.
        abreDepois: 'repeat',
      },
    },
    // A resposta: uma marquinha com 2×.
    mostra: (s) => s.speed.spots.some((n) => n >= 2),
  },
  // ⚠️ Mudou de propósito (lote 5): um relógio só ("Passar 5 segundos") e a condição do Estúdio.
  acceleration: {
    pedidos: {
      'base-limit': {
        texto: 'Com a condição ligada, aperte Passar 5 segundos cinco vezes.',
        faz: (m) => {
          ligado(m, 'limit', true)
          for (let t = 0; t < 5; t++) passarCinco(m, 0.3)
        },
      },
      'variation-limit': {
        texto:
          'Com a base em −9 e a condição ligada, aperte Passar 5 segundos até nascer um cacto −10.',
        faz: (m) => {
          ligado(m, 'limit', true)
          for (let t = 0; t < 10 && m.estado.speed.base > -9; t++) passarCinco(m, 0.3)
          passarCinco(m, 0.8)
        },
      },
      'old-speed': {
        texto: 'Aperte Passar 5 segundos três vezes e olhe o número embaixo de cada cacto.',
        faz: (m) => {
          for (let t = 0; t < 3; t++) passarCinco(m, 0.3)
        },
      },
      'past-limit': {
        texto: 'Desligue a condição e aperte Passar 5 segundos cinco vezes.',
        faz: (m) => {
          ligado(m, 'limit', false)
          for (let t = 0; t < 5; t++) passarCinco(m, 0.3)
        },
        // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5, A1): a chave da condição fica
        // FECHADA até o −10 sair com a base parada, porque desligar antes tranca as duas outras metas.
        abreDepois: 'variation-limit',
      },
    },
    mostra: (s) => s.speed.base === -9 && s.crowd.cacti.some((c) => c.velocity === -10),
  },
  velocity: {
    pedidos: {
      moves: {
        texto: 'Escolha uma velocidade diferente de zero e deixe o tempo passar.',
        faz: (m) => {
          m.faz({ type: 'velocity', vx: 5, vy: 0 })
          m.tempo()
        },
      },
      left: {
        texto: 'Ponha um número negativo na velocidade para o lado e deixe o tempo passar.',
        faz: (m) => {
          m.faz({ type: 'velocity', vx: -5, vy: 0 })
          m.tempo()
        },
      },
      stopped: {
        texto:
          'Depois de ver o Dino andar, ponha as duas velocidades em zero e deixe o tempo passar.',
        faz: (m) => {
          if (!m.viu('moves')) {
            m.faz({ type: 'velocity', vx: 5, vy: 0 })
            m.tempo()
          }
          m.faz({ type: 'velocity', vx: 0, vy: 0 })
          m.tempo()
        },
      },
      up: {
        texto: 'Ponha a velocidade para baixo num número negativo e deixe o tempo passar.',
        faz: (m) => {
          m.faz({ type: 'velocity', vx: 0, vy: -5 })
          m.tempo()
        },
      },
      down: {
        texto: 'Ponha a velocidade para baixo num número positivo e deixe o tempo passar.',
        faz: (m) => {
          m.faz({ type: 'velocity', vx: 0, vy: 5 })
          m.tempo()
        },
      },
    },
    mostra: (s) => s.drive.x < s.drive.anchorX,
  },
  // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): UMA tecla. Afundar é o aperto da de cima; segurar
  // é a pergunta da de baixo em cada quadro; soltar fecha as duas metas do gesto inteiro.
  'hold-vs-press': {
    pedidos: {
      'one-step': {
        texto: 'Toque a tecla bem rápido e solte.',
        faz: (m) => {
          m.faz({ type: 'hold', on: false })
          m.faz({ type: 'hold', on: true })
          m.faz({ type: 'hold', on: false })
        },
      },
      'while-held': {
        texto: 'Segure a tecla e conte até três.',
        faz: (m) => {
          m.faz({ type: 'hold', on: false })
          m.faz({ type: 'hold', on: true })
          // Contar até três devagar leva uns dois segundos (e a bancada solta o ▶ ao afundar a tecla).
          m.tempo(2)
          m.faz({ type: 'hold', on: false })
        },
      },
      apart: {
        texto: 'Segure a tecla, conte até três e solte.',
        faz: (m) => {
          m.faz({ type: 'hold', on: false })
          m.faz({ type: 'hold', on: true })
          m.tempo(2)
          m.faz({ type: 'hold', on: false })
        },
      },
    },
    // A resposta da previsão ("dá um passo só") à vista: segurando, a de baixo já andou e a de cima não.
    mostra: (s) => s.input.holding && s.input.holdSteps >= 3 && s.input.pressSteps === 1,
  },
  variable: {
    pedidos: {
      stored: {
        texto: 'Guarde um número na caixa.',
        faz: (m) => m.faz({ type: 'store', value: 10 }),
      },
      'changed-hidden': {
        // ⚠️ Mudou de propósito (lote 5): "Somar 1 ponto", o acerto do jogo do Desafio. E de novo
        // (consertos do review da onda A do lote 5): os nomes dos blocos do desenho.
        texto: 'Depois de guardar, aperte Somar 1 em pontos com Mostrar placar desligado.',
        faz: (m) => {
          if (!m.viu('stored')) m.faz({ type: 'store', value: 10 })
          if (m.estado.box.shown) m.faz({ type: 'show', on: false })
          m.faz({ type: 'change', by: 1 })
        },
      },
      shown: {
        texto: 'Depois de guardar, ligue Mostrar placar.',
        faz: (m) => {
          if (!m.viu('stored')) m.faz({ type: 'store', value: 10 })
          m.faz({ type: 'show', on: true })
        },
      },
    },
    // A resposta: a caixa mudou e a tela não mostra.
    mostra: (s) => !s.box.shown && s.box.changes > 0,
  },
  'group-loop': {
    pedidos: {
      'looked-all': {
        texto: 'Aperte Medir em cada cacto do grupo.',
        faz: (m) => {
          for (const id of [1, 2, 3]) m.faz({ type: 'look', id })
        },
      },
      nearest: {
        texto: 'Depois de medir cada cacto do grupo, escolha o cacto de menor distância.',
        faz: (m) => {
          for (const id of [1, 2, 3]) m.faz({ type: 'look', id })
          m.faz({ type: 'choose', id: maisPerto(m.estado.hunt.distances) })
        },
      },
      auto: {
        texto: 'Ligue o laço e deixe o tempo passar por 3 segundos.',
        faz: (m) => {
          ligado(m, 'loop', true)
          m.tempo(3)
        },
        abreDepois: 'nearest',
      },
    },
    mostra: (s) =>
      s.hunt.looked.length === 3 && s.hunt.chosen === maisPerto(s.hunt.distances) && !s.hunt.auto,
  },
  'enemy-type': {
    pedidos: {
      many: {
        texto: 'Aperte Fazer nascer mais um três vezes.',
        faz: (m) => {
          for (let t = 0; t < 3; t++) m.faz({ type: 'spawnOne' })
        },
      },
      'all-change': {
        texto: 'Faça nascer mais de um cacto, mude a velocidade na ficha e deixe o tempo passar.',
        faz: (m) => {
          while (m.estado.blueprint.cacti.length < 2) m.faz({ type: 'spawnOne' })
          m.faz({ type: 'define', field: 'speed', value: m.estado.blueprint.speed === 7 ? 5 : 7 })
          m.tempo()
        },
      },
      copied: {
        texto:
          'Ligue Copiar a ficha ao nascer, mude a velocidade na ficha, faça nascer mais um cacto e deixe o tempo passar.',
        faz: (m) => {
          ligado(m, 'copy', true)
          m.faz({ type: 'define', field: 'speed', value: m.estado.blueprint.speed === 2 ? 4 : 2 })
          m.faz({ type: 'spawnOne' })
          m.tempo()
        },
        // ⚠️ Lote 5 (G5): a chave da cópia abre depois da primeira descoberta da ficha lida.
        abreDepois: 'all-change',
      },
    },
    // ⚠️ Lote 5 (G5): a revelação deixou de coincidir com a conclusão (a cópia vem depois).
    mostra: (s) =>
      s.blueprint.cacti.filter((c) => enemyOnScreen(c.x)).length >= 2 && s.blueprint.speed !== 3,
  },
  camera: {
    pedidos: {
      lost: {
        texto: 'Com a câmera parada, leve o Dino para depois de 480.',
        faz: (m) => {
          ligado(m, 'camera', false)
          m.faz({ type: 'walk', x: 600 })
        },
      },
      follows: {
        texto:
          'Leve o Dino para depois de 480 com a câmera parada e então faça a câmera seguir o Dino.',
        faz: (m) => {
          ligado(m, 'camera', false)
          m.faz({ type: 'walk', x: 600 })
          ligado(m, 'camera', true)
        },
      },
      window: {
        texto:
          'Com a câmera parada, leve o Dino para depois de 480. Depois faça a câmera seguir o Dino e ande mais um pouco.',
        faz: (m) => {
          ligado(m, 'camera', false)
          m.faz({ type: 'walk', x: 600 })
          ligado(m, 'camera', true)
          m.faz({ type: 'walk', x: 640 })
        },
      },
    },
    mostra: (s) => !s.view.follow && s.view.heroX > SCENE_LIMITS.placeX.max,
  },
  contact: {
    pedidos: {
      drain: {
        texto: 'Encoste o cacto no Dino e deixe o tempo passar.',
        faz: (m) => {
          m.faz({ type: 'approach', distance: 0 })
          m.tempo()
        },
      },
      once: {
        texto: 'Encoste o cacto no Dino, deixe o tempo passar e olhe a pista de baixo.',
        faz: (m) => {
          m.faz({ type: 'approach', distance: 0 })
          m.tempo()
        },
      },
      apart: {
        texto:
          'Depois de encostar, afaste o cacto e deixe o tempo passar. Depois encoste de novo e deixe o tempo passar.',
        faz: (m) => {
          // "Depois de encostar": com o ▶ ligado até a pista de baixo perder o primeiro coração.
          if (!m.viu('once')) {
            m.faz({ type: 'approach', distance: 0 })
            m.ate((s) => s.evidence.discoveries.includes('once'))
          }
          // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5): "deixe o tempo passar" é um
          // segundo, e `apart` cai no terceiro quadro da encostada nova (0,5 s eram dois quadros).
          m.faz({ type: 'approach', distance: 100 })
          m.tempo()
          m.faz({ type: 'approach', distance: 0 })
          m.tempo()
        },
      },
    },
    // ⚠️ Mudou de propósito (lote 5, G5): a pista de cima perdeu um coração em cada um de três quadros.
    mostra: (s) => s.hit.topTouch >= 3,
  },
  cooldown: {
    pedidos: {
      burst: {
        texto: 'Tire a recarga e aperte Atirar três vezes bem rápido.',
        faz: (m) => {
          m.faz({ type: 'recharge', seconds: 0 })
          for (let t = 0; t < 3; t++) m.faz({ type: 'shoot' })
        },
      },
      waiting: {
        texto: 'Ponha uma recarga e aperte Atirar duas vezes bem rápido.',
        faz: (m) => {
          m.faz({ type: 'recharge', seconds: 1 })
          m.faz({ type: 'shoot' })
          m.faz({ type: 'shoot' })
        },
      },
      spaced: {
        texto:
          'Ponha uma recarga e aperte Atirar. Deixe o tempo passar até aparecer Pronto para atirar e aperte Atirar de novo.',
        faz: (m) => {
          m.faz({ type: 'recharge', seconds: 1 })
          m.faz({ type: 'shoot' })
          // ⚠️ Mudou de propósito (lote 5, G5): "Pronto para atirar" é a frase da SITUAÇÃO.
          m.ate((s) => sceneSituation('cooldown', s).startsWith('Pronto para atirar.'))
          m.faz({ type: 'shoot' })
        },
      },
    },
    mostra: (s) => s.weapon.shots === 1 && s.weapon.refused >= 1,
  },
  aim: {
    pedidos: {
      arrow: {
        texto: 'Mude o alvo de lugar e olhe a seta.',
        faz: (m) =>
          m.faz({
            type: 'target',
            x: m.estado.sight.targetX === 120 ? 200 : 120,
            y: m.estado.sight.targetY,
          }),
      },
      'straight-miss': {
        texto:
          'Com a mira desligada e o alvo acima ou abaixo do Dino, aperte Atirar e olhe o tiro voar.',
        faz: (m) => {
          ligado(m, 'aim', false)
          if (Math.abs(m.estado.sight.targetY - AIM_ORIGIN.y) < 40)
            m.faz({ type: 'target', x: m.estado.sight.targetX, y: 230 })
          m.faz({ type: 'shoot' })
          m.tempo()
        },
      },
      follows: {
        texto: 'Ligue a mira, aperte Atirar e olhe o tiro voar.',
        faz: (m) => {
          ligado(m, 'aim', true)
          m.faz({ type: 'shoot' })
          m.tempo()
        },
      },
    },
    // ⚠️ Mudou de propósito (lote 5, G5): a previsão pergunta o caminho do tiro sem a mira. A revelação
    // deixou de coincidir com a conclusão (o tiro com a mira vem depois).
    mostra: (s) => !s.sight.aimed && s.sight.result === 'errou',
  },
  diagonal: {
    pedidos: {
      straight: {
        texto: 'Aperte uma seta só e aperte Andar 1 segundo.',
        faz: (m) => {
          m.faz({ type: 'direction', x: 1, y: 0 })
          m.faz({ type: 'stride' })
        },
      },
      faster: {
        texto:
          'Ande 1 segundo com uma seta só. Depois aperte duas setas juntas e ande 1 segundo de novo.',
        faz: (m) => {
          m.faz({ type: 'direction', x: 1, y: 0 })
          m.faz({ type: 'stride' })
          m.faz({ type: 'direction', x: 1, y: 1 })
          m.faz({ type: 'stride' })
        },
      },
      same: {
        texto: 'Ligue a correção da diagonal, aperte duas setas juntas e ande 1 segundo.',
        faz: (m) => {
          ligado(m, 'even', true)
          m.faz({ type: 'direction', x: 1, y: 1 })
          m.faz({ type: 'stride' })
        },
        abreDepois: 'faster',
      },
    },
    // ⚠️ Mudou de propósito (lote 5, G5): o Dino passou do círculo de 60 do reto.
    mostra: (s) => s.walkPad.last === 'diagonal' && s.walkPad.distance > 60,
  },
  tilemap: {
    pedidos: {
      'text-is-map': {
        texto: 'Escolha uma letra e toque numa casa do texto que tem outra letra.',
        faz: (m) => m.faz({ type: 'paint-tile', row: 0, col: 0, tile: '#' }),
      },
      'coin-row': {
        texto: 'Escolha a letra o e escreva três o seguidos numa linha do meio.',
        faz: (m) => {
          for (const col of [3, 4, 5]) m.faz({ type: 'paint-tile', row: 2, col, tile: 'o' })
        },
      },
      'same-letter': {
        texto: 'Escreva numa outra linha uma peça que você já escreveu.',
        faz: (m) => {
          if (m.estado.grid.marks.length === 0)
            m.faz({ type: 'paint-tile', row: 0, col: 0, tile: '#' })
          const marca = m.estado.grid.marks[0] ?? '#0'
          const linha = Number(marca[1]) === 1 ? 2 : 1
          m.faz({ type: 'paint-tile', row: linha, col: 7, tile: marca[0] ?? '#' })
        },
      },
    },
    // ⚠️ Mudou de propósito (lote 5, G5): a previsão pergunta por "...ooo....", e a meta que a revela
    // é a das moedas, que ficaram na linha do meio.
    mostra: (s) => tilemapCoinRow(s.grid.rows) !== null,
  },
  pool: {
    pedidos: {
      grows: {
        texto: 'Com Reciclar quem saiu desligado, deixe o tempo passar até fabricados chegar a 3.',
        faz: (m) => {
          ligado(m, 'recycle', false)
          m.ate((s) => s.nursery.created >= 3)
        },
      },
      recycled: {
        // Mudou de propósito (lote 5 do Raio-X): o cacto ATRAVESSA a tela, e é na saída que ele volta.
        texto:
          'Ligue Reciclar quem saiu e deixe o tempo passar até o cacto da tela chegar na saída.',
        faz: (m) => {
          ligado(m, 'recycle', true)
          const numero = m.estado.nursery.onScreen
          m.ate(
            (s) =>
              s.nursery.onScreen > 0 &&
              s.nursery.progress === 0 &&
              s.nursery.last === 'voltou' &&
              (numero === 0 || s.nursery.onScreen === numero),
          )
        },
      },
      steady: {
        texto:
          'Com Reciclar quem saiu desligado, deixe o tempo passar até fabricados chegar a 3. Depois ligue Reciclar quem saiu e deixe o tempo passar por 4 segundos.',
        faz: (m) => {
          ligado(m, 'recycle', false)
          m.ate((s) => s.nursery.created >= 3)
          ligado(m, 'recycle', true)
          // Mudou de propósito (review do lote 4): o pedido diz o número. ⚠️ A 10 quadros por
          // segundo (lote 5) o gesto não recomeça o quadro: 4 s são 40 quadros, uma fatia a mais no
          // máximo.
          m.tempo(4.05)
        },
      },
    },
    mostra: (s) => s.nursery.created >= 3 && s.nursery.alive === 1,
  },
  'entity-state': {
    pedidos: {
      own: {
        texto: 'Com o estado morando em cada uma, ponha as três torres em estados diferentes.',
        faz: (m) => {
          if (m.estado.brains.shared) m.faz({ type: 'brain-scope', shared: false })
          m.faz({ type: 'brain', id: 1, state: 'mirar' })
          m.faz({ type: 'brain', id: 2, state: 'atirar' })
          m.faz({ type: 'brain', id: 3, state: 'recarregar' })
        },
      },
      acts: {
        texto: 'Com pelo menos duas torres em estados diferentes, deixe o tempo passar.',
        faz: (m) => {
          if (m.estado.brains.shared) m.faz({ type: 'brain-scope', shared: false })
          if (new Set(m.estado.brains.states).size < 2)
            m.faz({
              type: 'brain',
              id: 1,
              state: m.estado.brains.states[1] === 'mirar' ? 'atirar' : 'mirar',
            })
          m.quadro()
        },
      },
      independent: {
        texto:
          'Com o estado morando em cada uma e duas torres em estados diferentes, deixe o tempo passar. Depois mude o estado de uma só.',
        faz: (m) => {
          if (m.estado.brains.shared) m.faz({ type: 'brain-scope', shared: false })
          if (new Set(m.estado.brains.states).size < 2)
            m.faz({
              type: 'brain',
              id: 1,
              state: m.estado.brains.states[1] === 'mirar' ? 'atirar' : 'mirar',
            })
          m.quadro()
          const atual = m.estado.brains.states[1]
          m.faz({ type: 'brain', id: 2, state: atual === 'atirar' ? 'recarregar' : 'atirar' })
        },
      },
      shared: {
        texto: 'Mude onde o estado mora para no jogo e troque o estado de uma torre.',
        faz: (m) => {
          m.faz({ type: 'brain-scope', shared: true })
          const atual = m.estado.brains.states[0]
          m.faz({ type: 'brain', id: 1, state: atual === 'atirar' ? 'recarregar' : 'atirar' })
        },
      },
    },
    mostra: (s) => new Set(s.brains.states).size > 1 && s.brains.ticks >= 1,
  },
  'delta-time': {
    pedidos: {
      apart: {
        texto: 'Com o Dino andando a cada quadro, deixe o tempo passar por dois segundos.',
        faz: (m) => {
          if (m.estado.machines.mode !== 'frames') m.faz({ type: 'count', kind: 'frames' })
          m.tempo(2)
        },
      },
      together: {
        texto:
          'Depois de ver os dois se separarem, troque para "a cada segundo" e deixe o tempo passar até a chegada.',
        faz: (m) => {
          if (!m.viu('apart')) {
            if (m.estado.machines.mode !== 'frames') m.faz({ type: 'count', kind: 'frames' })
            m.tempo(2)
          }
          m.faz({ type: 'count', kind: 'seconds' })
          m.ate((s) => s.machines.fastX >= DELTA_RACE.chegada)
        },
      },
    },
    mostra: (s) => s.machines.mode === 'frames' && s.machines.fastX - s.machines.slowX > 30,
  },
  'circle-collision': {
    pedidos: {
      touch: {
        texto:
          'Aproxime os dois círculos: deixe o tempo passar ou diminua a distância entre os centros.',
        faz: (m) => m.ate((s) => s.evidence.discoveries.includes('touch')),
      },
      formula: {
        texto: 'Com os dois só encostando, diminua um dos raios sem mexer na distância.',
        faz: (m) => {
          const { a, b } = m.estado.circles
          // "só encostando": a distância na soma dos raios.
          m.faz({ type: 'approach', distance: a + b })
          m.faz({ type: 'radius', which: 'a', value: a - 5 })
        },
      },
    },
    mostra: (s) => Number(s.circles.distance.toFixed(6)) <= s.circles.a + s.circles.b,
  },
  'axis-z': {
    pedidos: {
      up: {
        texto: 'Aumente só o y.',
        faz: (m) => {
          const { x, y, z } = m.estado.space
          m.faz({ type: 'place3d', x, y: y + 20, z })
        },
      },
      depth: {
        texto: 'Mexa só no z.',
        faz: (m) => {
          const { x, y, z } = m.estado.space
          m.faz({ type: 'place3d', x, y, z: z - 20 })
        },
      },
      shadow: {
        // Mudou de propósito (lote 5 do Raio-X): a sombra ANDA no chão com o cubo no ar.
        texto: 'Levante o cubo com o y. Depois, com o cubo no ar, mexa só no x ou só no z.',
        faz: (m) => {
          const { x, y, z } = m.estado.space
          m.faz({ type: 'place3d', x, y: y + 20, z })
          m.faz({ type: 'place3d', x: x + 20, y: y + 20, z })
        },
      },
    },
    mostra: (s) => s.space.y > 0,
  },
  'camera-3d': {
    pedidos: {
      'one-face': {
        texto: 'Mova a câmera até ver uma cor só.',
        faz: (m) => m.faz({ type: 'orbit', yaw: 0, pitch: 1 }),
      },
      'two-faces': {
        texto: 'Leve a câmera para outro lugar com exatamente duas cores.',
        faz: (m) => {
          const { yaw, pitch } = m.estado.orbit
          const destino = [3, 5, 7].find((y) => y !== yaw || pitch !== 1) ?? 3
          expect(facesAVista(destino, 1)).toBe(2)
          m.faz({ type: 'orbit', yaw: destino, pitch: 1 })
        },
      },
      'three-faces': {
        // Lote 5 do Raio-X: no lugar de "voltou à vista de sempre", que era apertar um atalho.
        texto: 'Leve a câmera para um canto e mude a altura.',
        faz: (m) => {
          const { yaw, pitch } = m.estado.orbit
          const canto = yaw % 2 === 1 ? yaw : (yaw + 1) % 8
          if (canto !== yaw) m.faz({ type: 'orbit', yaw: canto, pitch })
          m.faz({ type: 'orbit', yaw: canto, pitch: m.estado.orbit.pitch === 2 ? 0 : 2 })
        },
      },
      back: {
        // Mudou de propósito (consertos do review da onda B do lote 5): o botão diz onde a câmera começou.
        texto: 'Com a câmera longe de onde começou, aperte Voltar para onde a câmera começou.',
        faz: (m) => {
          if (m.estado.orbit.yaw === 1 && m.estado.orbit.pitch === 1)
            m.faz({ type: 'orbit', yaw: 2, pitch: 2 })
          m.faz({ type: 'recenter' })
        },
      },
    },
    mostra: (s) => facesAVista(s.orbit.yaw, s.orbit.pitch) === 1,
  },
  mesh: {
    pedidos: {
      points: {
        // Mudou de propósito (consertos do review da onda B do lote 5): o controle se chama "A pele".
        texto: 'Deixe a pele transparente.',
        faz: (m) => m.faz({ type: 'see-points', level: 'metade' }),
      },
      skin: {
        // Mudou de propósito (lote 5 do Raio-X): a pele POR CIMA dos pontos pede a metade.
        texto: 'Depois de deixar a pele transparente, volte a pele inteira e olhe o modelo.',
        faz: (m) => {
          m.faz({ type: 'see-points', level: 'metade' })
          m.faz({ type: 'see-points', level: 'nada' })
        },
      },
    },
    mostra: (s) => s.model.see !== 'nada',
  },
  'pick-ray': {
    pedidos: {
      face: {
        texto: 'Aponte a mira para a caixa sozinha.',
        faz: (m) => m.faz({ type: 'point', x: 100, y: 125 }),
      },
      first: {
        texto: 'Aponte a mira onde uma caixa cobre a outra.',
        faz: (m) => m.faz({ type: 'point', x: 330, y: 155 }),
      },
    },
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): a exceção `revelaNaConclusao` saiu. A caixa acesa onde
    // uma cobre a outra não fecha mais `face`, e o palpite volta antes da conclusão.
    mostra: (s) => s.ray.hit === 2,
  },
  'fill-stroke': {
    pedidos: {
      'only-fill': {
        texto: 'Deixe só o contorno em Sem cor.',
        faz: (m) => {
          if (!m.estado.ink.fill) m.faz({ type: 'ink', part: 'fill', on: true })
          m.faz({ type: 'ink', part: 'stroke', on: false })
        },
      },
      'only-stroke': {
        texto: 'Deixe só o preenchimento em Sem cor.',
        faz: (m) => {
          if (!m.estado.ink.stroke) m.faz({ type: 'ink', part: 'stroke', on: true })
          m.faz({ type: 'ink', part: 'fill', on: false })
        },
      },
      both: {
        texto: 'Depois de deixar uma parte em Sem cor, volte as duas com cor.',
        faz: (m) => {
          if (m.estado.ink.seen.length <= 1) m.faz({ type: 'ink', part: 'stroke', on: false })
          m.faz({ type: 'ink', part: 'stroke', on: true })
          m.faz({ type: 'ink', part: 'fill', on: true })
        },
      },
    },
    mostra: (s) => s.ink.fill && !s.ink.stroke,
  },
  shading: {
    pedidos: {
      flat: {
        texto: 'Ligue a sombra e a luz e depois desligue.',
        faz: (m) => {
          m.faz({ type: 'shade', on: true })
          m.faz({ type: 'shade', on: false })
        },
      },
      volume: {
        texto: 'Ligue a sombra e a luz.',
        faz: (m) => m.faz({ type: 'shade', on: true }),
      },
      side: {
        texto: 'Com a sombra e a luz ligadas, mude o sol de lado.',
        faz: (m) => {
          m.faz({ type: 'shade', on: true })
          m.faz({ type: 'light', side: m.estado.light.side === 'left' ? 'right' : 'left' })
        },
      },
    },
    mostra: (s) => s.light.shade,
  },
}

function startForGoal(scene: SceneId, goal: string): SceneStart {
  if (scene === 'once-vs-always' && goal === 'lives-loop')
    return { scene, setup: { preset: ONCE_VS_ALWAYS_PRESETS['uma-ficha-vidas'] } }
  if (scene === 'once-vs-always' && ['on-event', 'key-fires', 'flood'].includes(goal))
    return { scene, setup: { preset: ONCE_VS_ALWAYS_PRESETS['tres-caixas-tiro'] } }
  return { scene }
}

/**
 * Da abertura, segue os pedidos na ordem do "Conferir": a primeira meta que falta, e só ela.
 *
 * ⚠️ A ordem é a do CATÁLOGO, e não a da lista do caso: o "Conferir" percorre as metas do modelo
 * filtradas pelo caso (`sceneGoals`). É por isso que `up` vem antes de `down` na `velocity`.
 */
function caminhoDoConferir(start: SceneStart, alvos: readonly string[], cena: Cena) {
  const m = new Maos(start, openScene(start))
  const ordem = sceneModel(start.scene)
    .goals.map((g) => g.id)
    .filter((id) => alvos.includes(id))
  for (const meta of ordem) {
    if (m.viu(meta)) continue
    const pedido = cena.pedidos[meta]
    expect(pedido, `${start.scene}: pedido de ${meta} na tabela`).toBeDefined()
    pedido?.faz(m)
    expect(m.viu(meta), `${start.scene}: seguir "${pedido?.texto}" derruba ${meta}`).toBe(true)
  }
  return m
}

describe('o pedido de cada meta, seguido ao pé da letra no motor', () => {
  test('⚠️ a tabela cobre as 45 cenas e TODA meta, com o texto do catálogo letra por letra', () => {
    const equivalentes = new Set([
      'stage-size · follows',
      'impulse · compare',
      'spawn · same-fall',
      'hitbox · early-hit',
      'hitbox · fair-hit',
      'random · above',
      'acceleration · spawned-ten',
      'velocity · still',
    ])
    for (const scene of SCENE_IDS) {
      const cena = CENAS[scene]
      const metas = sceneModel(scene).goals.filter(
        (meta) => !equivalentes.has(`${scene} · ${meta.id}`),
      )
      for (const meta of metas) {
        expect(cena.pedidos[meta.id]?.texto, `${scene} · ${meta.id}`).toBe(meta.pedido)
      }
      expect(Object.keys(cena.pedidos).sort(), scene).toEqual(metas.map((g) => g.id).sort())
    }
  })

  test('⚠️⚠️ da abertura, cada pedido derruba a sua meta (menos os de controle que abre depois)', () => {
    let conferidos = 0
    for (const scene of SCENE_IDS)
      for (const [meta, pedido] of Object.entries(CENAS[scene].pedidos)) {
        if (pedido.abreDepois) continue
        const start = startForGoal(scene, meta)
        const m = new Maos(start, openScene(start))
        pedido.faz(m)
        expect(m.viu(meta), `${scene}: da abertura, "${pedido.texto}" derruba ${meta}`).toBe(true)
        conferidos++
      }
    // A guarda de que a varredura LEU os pedidos: laço vazio aprova tudo.
    expect(conferidos).toBeGreaterThan(90)
  })

  test('⚠️⚠️ na ordem do "Conferir", todo pedido derruba a meta que falta, nas 45 cenas', () => {
    for (const scene of SCENE_IDS)
      caminhoDoConferir({ scene }, sceneDefaultGoalIds(scene), CENAS[scene])
  })

  test('⚠️⚠️ e a meta que o motor confere NÃO cai por quem só mexeu', () => {
    const start = (scene: SceneId) => ({ scene })
    // draw-loop: limpar SEM desenhar deixava a tela vazia, e o pedido antigo repetia um gesto que
    // não derrubava a meta. Seguindo o pedido de hoje a partir desse estado, ela cai.
    const vazia = new Maos(start('draw-loop'), openScene(start('draw-loop')))
    vazia.faz({ type: 'erase', on: true })
    vazia.quadro()
    vazia.faz({ type: 'erase', on: false })
    expect(drawLoopOnScreen(vazia.estado)).toBe(0)
    CENAS['draw-loop'].pedidos.frozen?.faz(vazia)
    expect(vazia.viu('frozen')).toBe(true)

    // impulse: outro impulso qualquer NÃO responde "com impulso 14".
    const dez = new Maos(start('impulse'), openScene(start('impulse')))
    CENAS.impulse.pedidos['first-height']?.faz(dez)
    dez.faz({ type: 'impulse', force: 10 })
    dez.faz({ type: 'jump', input: 'tap' })
    dez.ate((s) => s.flight.time === null)
    expect(dez.viu('other-height')).toBe(false)

    // enemy-type: mudar a ficha SEM deixar o tempo passar não é "todos mudaram".
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): a vida passou a valer (os corações estão em cima de
    // cada cacto), e a meta espera o quadro seguinte, em que a criança vê os cactos mudarem.
    const vida = new Maos(start('enemy-type'), openScene(start('enemy-type')))
    vida.faz({ type: 'spawnOne' })
    vida.faz({ type: 'spawnOne' })
    vida.faz({ type: 'define', field: 'life', value: 5 })
    expect(vida.viu('all-change')).toBe(false)
    vida.quadro()
    expect(vida.viu('all-change')).toBe(true)

    // cooldown: esperar a recarga inteira de "Um passo" em "Um passo" (0,2 s) deixava um resto
    // de 1,1e−16 s, "falta 0 s", e o segundo tiro era recusado.
    const passos = new Maos(start('cooldown'), openScene(start('cooldown')))
    passos.faz({ type: 'recharge', seconds: 1 })
    passos.faz({ type: 'shoot' })
    for (let t = 0; t < 5; t++) passos.faz({ type: 'advance', seconds: 0.2 })
    passos.faz({ type: 'shoot' })
    expect(passos.viu('spaced')).toBe(true)
    expect(passos.estado.weapon.refused).toBe(0)

    // symmetry: ⚠️ Mudou de propósito (lote 5 do Raio-X, G4). O eixo móvel saiu (o Pinta não tem), e
    // a terceira meta é o espelho de cima e de baixo, só depois do lado a lado. ⚠️⚠️ E só com a cópia
    // SEPARADA do traço (consertos do review da onda B do lote 5, A3): a cabine mora nas linhas 5 a 7, e
    // a cópia de cima e de baixo cai na 8, encostada; a ponta (linhas 1 a 4) e o quadradinho da linha 4
    // ficam longe do meio.
    for (const [traco, separada] of [
      [{ type: 'trace', piece: 'asa' }, true],
      [{ type: 'trace', piece: 'ponta' }, true],
      [{ type: 'trace', piece: 'cabine' }, false],
      [{ type: 'dot', x: 12, y: 4 }, true],
    ] as const) {
      const antes = new Maos(start('symmetry'), openScene(start('symmetry')))
      antes.faz({ type: 'mirror-mode', mode: 'y' })
      antes.faz(traco)
      expect(antes.viu('axis-decides'), `${traco.type} antes do lado a lado`).toBe(false)
      const s = new Maos(start('symmetry'), openScene(start('symmetry')))
      CENAS.symmetry.pedidos['two-sides']?.faz(s)
      s.faz({ type: 'mirror-mode', mode: 'y' })
      s.faz(traco)
      expect(s.viu('axis-decides'), `${JSON.stringify(traco)} depois do lado a lado`).toBe(separada)
    }

    // onion-skin: chegar ao quadro 2 com o fantasma JÁ ligado também é ver o fantasma.
    const antes = new Maos(start('onion-skin'), openScene(start('onion-skin')))
    antes.faz({ type: 'onion', on: true })
    antes.faz({ type: 'frame', index: 2 })
    expect(antes.viu('ghost-on')).toBe(true)

    // pool: sem nenhum cacto na tela, não há o que reaproveitar. ⚠️ Mudou de propósito (lote 5 do
    // Raio-X): o primeiro cacto entra e ATRAVESSA; só na saída dele (1 s depois) o mesmo número volta.
    const pool = new Maos(start('pool'), openScene(start('pool')))
    pool.faz({ type: 'connect', port: 'recycle', enabled: true })
    pool.quadro()
    expect(pool.estado.nursery.onScreen).toBe(1)
    expect(pool.viu('recycled')).toBe(false)
    pool.tempo(0.9)
    expect(pool.viu('recycled')).toBe(false)
    pool.quadro()
    expect(pool.viu('recycled')).toBe(true)
    expect(pool.estado.nursery.created).toBe(1)
  })
})

describe('a meta que responde a previsão, olhada no instante em que cai', () => {
  test('⚠️⚠️ nas 45 cenas, a resposta da previsão está NA TELA quando o palpite volta', () => {
    for (const scene of SCENE_IDS) {
      const cena = CENAS[scene]
      const { revealOn, correctChoiceId } = SCENE_QUESTIONS[scene].prediction
      const alvos = sceneDefaultGoalIds(scene)
      const m = caminhoDoConferir({ scene }, alvos, cena)
      const instante = m.historico.find((s) => s.evidence.discoveries.includes(revealOn ?? ''))
      expect(instante, `${scene}: a meta ${revealOn} cai no caminho do Conferir`).toBeDefined()
      if (!instante) continue
      expect(cena.mostra(instante), `${scene}: a tela mostra "${correctChoiceId}"`).toBe(true)
      const concluiu = alvos.every((g) => instante.evidence.discoveries.includes(g))
      if (cena.revelaNaConclusao) expect(concluiu, `${scene}: ainda conclui junto?`).toBe(true)
      else
        expect(concluiu, `${scene}: o palpite volta ANTES da conclusão, e não junto com ela`).toBe(
          false,
        )
    }
  })

  test('⚠️ as exceções têm motivo e são poucas: o redesenho do lote 5 é que as resolve', () => {
    const excecoes = SCENE_IDS.filter((s) => CENAS[s].revelaNaConclusao)
    expect(excecoes.length).toBeLessThanOrEqual(8)
    for (const s of excecoes) expect(CENAS[s].revelaNaConclusao?.length ?? 0).toBeGreaterThan(20)
  })
})

/**
 * ⚠️ As previsões dos manifestos atuais, com o caso do professor: as que ele escreveu (o Dia 2 pergunta
 * pelo −9, o Dia 3 pelo y da pedra) e as que o bloco herda do modelo.
 */
describe('as previsões das aulas atuais, no motor', () => {
  const docs = resolve(import.meta.dir, '../../../../../docs/aulas-interativas/aulas')
  // Estas perguntas são sobre a última comparação: Enter após a troca e tiro no laço.
  // Revelá-las antes responderia sem a criança ter feito o gesto perguntado.
  const REVELA_AO_FINAL = new Set([
    'corre-dino-aula-08.manifesto.json · controls',
    'desafio-dia-2.manifesto.json · once-vs-always',
  ])
  const blocos: { onde: string; bloco: InteractiveBlock & { activity: SceneActivity } }[] = []
  const andar = (valor: unknown, onde: string) => {
    if (Array.isArray(valor)) for (const v of valor) andar(v, onde)
    else if (valor && typeof valor === 'object') {
      const b = valor as { kind?: string; activity?: { type?: string } }
      if (b.kind === 'interactive' && b.activity?.type === 'experimentation')
        blocos.push({ onde, bloco: valor as InteractiveBlock & { activity: SceneActivity } })
      for (const v of Object.values(valor)) andar(v, onde)
    }
  }
  for (const nome of readdirSync(docs).filter((name) => name.endsWith('.manifesto.json')))
    andar(JSON.parse(readFileSync(resolve(docs, nome), 'utf8')), nome)

  test('a varredura LEU os blocos (laço vazio aprova tudo)', () => {
    expect(blocos.length).toBeGreaterThan(25)
  })

  test('o piloto compara a mesma ficha em Ao iniciar e Enquanto estiver rodando', () => {
    const piloto = blocos.find(
      ({ onde, bloco }) =>
        onde === 'desafio-dia-1.manifesto.json' && bloco.activity.scene === 'once-vs-always',
    )
    const setup = piloto?.bloco.activity.setup
    expect(setup?.goals).toEqual(['once', 'always'])
    expect(setup?.preset).toEqual(ONCE_VS_ALWAYS_PRESETS['duas-caixas-nave'])
    expect(setup?.goalCopy?.once?.pedido).toContain('Ao iniciar')
    expect(setup?.goalCopy?.always?.pedido).toContain('Enquanto estiver rodando')
  })

  test('⚠️⚠️ experimentação: o palpite volta antes da conclusão, seguindo os pedidos na ordem do caso', () => {
    let conferidas = 0
    for (const { onde, bloco } of blocos) {
      const { activity } = bloco
      if (activity.type !== 'experimentation') continue
      const previsao = blockPrediction(bloco)
      if (!previsao?.revealOn) continue
      const cena = CENAS[activity.scene]
      const alvos = sceneTargets(activity)
      if (
        (activity.setup && 'preset' in activity.setup) ||
        alvos.some((goal) => !cena.pedidos[goal])
      ) {
        // Presets autorais têm metas próprias que a tabela da cena padrão não encena.
        // A conclusão deles é exercitada em learning.test.ts e nos testes do preset.
        expect(alvos, `${onde} · ${activity.scene}: meta do palpite`).toContain(previsao.revealOn)
        continue
      }
      const m = caminhoDoConferir(sceneStart(activity), alvos, cena)
      const instante = m.historico.find((s) =>
        s.evidence.discoveries.includes(previsao.revealOn as string),
      )
      expect(instante, `${onde} · ${activity.scene}: ${previsao.revealOn} cai`).toBeDefined()
      const concluiu = alvos.every((g) => instante?.evidence.discoveries.includes(g))
      if (
        alvos.length > 1 &&
        !cena.revelaNaConclusao &&
        !REVELA_AO_FINAL.has(`${onde} · ${activity.scene}`)
      )
        expect(concluiu, `${onde} · ${activity.scene}: o palpite volta antes da conclusão`).toBe(
          false,
        )
      conferidas++
    }
    expect(conferidas).toBeGreaterThanOrEqual(10)
  })
})

describe('⚠️⚠️ meio gesto NÃO derruba a meta (varredura gerada dos pedidos, full review de 16/09/2026)', () => {
  /**
   * A régua "a meta só cai quando a criança VIU o que a meta afirma" era cobrada por listas à mão (sete
   * cenas aqui e casos soltos por arquivo). Esta varredura GRAVA os gestos de cada pedido seguido ao pé
   * da letra desde a abertura e exige que a meta NÃO caia antes do ÚLTIMO gesto do pedido: o tempo
   * passando depois dele pode mostrá-la (é o ▶ da criança), um gesto a menos não. Pedido de um gesto só
   * passa por construção. Exceção nova precisa de motivo aqui.
   */
  const EXCECOES: Record<string, string> = {
    // Todas as cinco são o mesmo caso: o pedido pede FOLGA (um gesto a mais, ou um fim de gesto que a
    // meta não afirma), e a meta cai quando o que ela diz já está na tela.
    'acceleration · old-speed':
      'dois cactos na pista já mostram o velho com o número dele; o terceiro aperto é folga para quem olha devagar',
    'hold-vs-press · while-held':
      'a meta é do tempo COM a tecla segurada ("conte até três"); soltar a tecla é o fim do gesto, não o que a meta afirma',
    'entity-state · own':
      '`parado` também é estado: com duas torres mudadas as três já ficam diferentes na tela, e a terceira ordem é folga',
    'fill-stroke · both':
      'o miolo nunca perdeu a cor: ligar o contorno de volta já deixa as duas partes com cor, e o último gesto não muda nada',
  }

  class Gravador extends Maos {
    readonly gestos: SceneAction[] = []
    override faz(acao: SceneAction) {
      this.gestos.push(acao)
      super.faz(acao)
    }
  }

  test('em toda cena, cada meta cai só depois do último gesto do seu pedido', () => {
    const cedo: string[] = []
    let conferidos = 0
    for (const scene of SCENE_IDS)
      for (const [meta, pedido] of Object.entries(CENAS[scene].pedidos)) {
        if (pedido.abreDepois) continue
        const start = startForGoal(scene, meta)
        const m = new Gravador(start, openScene(start))
        pedido.faz(m)
        if (!m.viu(meta)) continue
        const caiu = m.historico.findIndex((s) => s.evidence.discoveries.includes(meta))
        const ultimoGesto = m.gestos.findLastIndex((a) => a.type !== 'advance')
        conferidos++
        if (caiu < ultimoGesto && !EXCECOES[`${scene} · ${meta}`])
          cedo.push(
            `${scene} · ${meta}: caiu no gesto ${caiu + 1} de ${ultimoGesto + 1} (${JSON.stringify(m.gestos[caiu])})`,
          )
      }
    expect(conferidos).toBeGreaterThan(90)
    expect(cedo).toEqual([])
  })

  test('⚠️ a lista de exceções não guarda meta que já não cai cedo (exceção velha esconde regressão)', () => {
    const velhas: string[] = []
    for (const chave of Object.keys(EXCECOES)) {
      const [scene, meta] = chave.split(' · ') as [SceneId, string]
      const pedido = CENAS[scene]?.pedidos[meta]
      if (!pedido) {
        velhas.push(`${chave}: sem pedido`)
        continue
      }
      const m = new Gravador({ scene }, openScene({ scene }))
      pedido.faz(m)
      const caiu = m.historico.findIndex((s) => s.evidence.discoveries.includes(meta))
      const ultimoGesto = m.gestos.findLastIndex((a) => a.type !== 'advance')
      if (!(caiu >= 0 && caiu < ultimoGesto)) velhas.push(chave)
    }
    expect(velhas).toEqual([])
  })
})
