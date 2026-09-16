import { describe, expect, test } from 'bun:test'
import { SCENE_IDS, type SceneAction, type SceneId } from './actions'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation } from './evaluate'
import {
  type ExperimentationActivity,
  isExperimentationActivity,
  sceneStart,
  sceneTargets,
} from './index'
import { sceneReadout, sceneSituation } from './readout'
import { hydrateSceneState, isSceneState, type SceneState } from './state'

/**
 * As onze cenas do NÚCLEO do Iniciante 2D (15/09/2026).
 *
 * As 24 primeiras nasceram para o Corre Dino, que é o curso 1 da trilha; estas cobrem os
 * degraus da escada que os outros sete cursos do nível pedem — e que voltam nos níveis 2 e 3,
 * vestidos com outro elenco. O que a varredura de `scene.test.ts` já garante para todas as
 * cenas (o caminho de sucesso fecha as metas, o texto veste o elenco, a faixa cabe em três
 * leituras) não se repete aqui: este arquivo cobre o que é PRÓPRIO de cada uma — as regras que
 * fazem a descoberta valer alguma coisa, e que um refactor do motor quebraria em silêncio.
 */

function rodar(scene: SceneId, acoes: SceneAction[]): SceneState {
  return acoes.reduce((estado, acao) => stepScene({ scene }, estado, acao), openScene({ scene }))
}
const descobertas = (s: SceneState) => s.evidence.discoveries

describe('⚠️ a frase embaixo do palco narra a CENA, não o sistema', () => {
  test('⚠️⚠️ recomeçar não deixa recado de persistência no lugar da narração', () => {
    // "Experiência recomeçada. Suas descobertas foram guardadas." ocupava a frase que descreve
    // o que está na tela AGORA — a criança recomeçava e lia sobre o banco de dados. O aviso de
    // que nada se perdeu é do player, e mora no rodapé.
    // ⚠️ As 45, e não uma: a afirmação do lote é sobre a frase de TODA cena. Uma cena nova cuja
    // situação caia num texto ruim com o caption vazio entraria sem ninguém ver.
    for (const scene of SCENE_IDS) {
      const start = { scene }
      const recomeçou = stepScene(start, openScene(start), { type: 'reset' })
      expect(recomeçou.caption, scene).toBe('')
      const frase = sceneSituation(scene, recomeçou)
      expect(frase, scene).not.toContain('guardadas')
      expect(frase.length, scene).toBeGreaterThan(10)
    }
    // E o que ela já descobriu continua lá: recomeçar volta o MUNDO, não a história.
    const start = { scene: 'world' as const }
    const mexeu = stepScene(start, openScene(start), { type: 'create' })
    expect(stepScene(start, mexeu, { type: 'reset' }).evidence.discoveries).toEqual(
      mexeu.evidence.discoveries,
    )
  })
})

describe('velocity: a posição muda porque a velocidade soma nela', () => {
  test('⚠️ a velocidade sozinha NÃO move nada: quem move é o relógio', () => {
    // É a confusão que a cena existe para desfazer. Se escolher o número já andasse, a criança
    // aprenderia que "velocidade" é um empurrão, e não o quanto se anda em cada quadro.
    const escolhida = rodar('velocity', [{ type: 'velocity', vx: 5, vy: 0 }])
    expect(escolhida.drive.x).toBe(openScene({ scene: 'velocity' }).drive.x)
    expect(descobertas(escolhida)).toHaveLength(0)
  })

  test('o sinal decide o lado, e zero deixa parado com o relógio andando', () => {
    const direita = rodar('velocity', [
      { type: 'velocity', vx: 5, vy: 0 },
      { type: 'advance', seconds: 1 },
    ])
    expect(direita.drive.x).toBeGreaterThan(direita.drive.fromX)
    expect(descobertas(direita)).toContain('moves')

    const esquerda = rodar('velocity', [
      { type: 'velocity', vx: -5, vy: 0 },
      { type: 'advance', seconds: 1 },
    ])
    expect(descobertas(esquerda)).toContain('left')

    // ⚠️⚠️ A cena NASCE com velocidade zero: "com zero ele fica parado" é uma COMPARAÇÃO, e sem
    // ter visto o relógio mover alguma coisa antes, o primeiro toque em "Um passo" fechava a
    // meta sem a criança ter mexido em nada.
    const semComparar = rodar('velocity', [{ type: 'advance', seconds: 1 }])
    expect(descobertas(semComparar)).toHaveLength(0)

    const parado = rodar('velocity', [
      { type: 'velocity', vx: 5, vy: 0 },
      { type: 'advance', seconds: 1 },
      { type: 'velocity', vx: 0, vy: 0 },
      { type: 'advance', seconds: 1 },
    ])
    expect(parado.drive.x).toBe(parado.drive.fromX)
    expect(descobertas(parado)).toContain('stopped')
  })

  test('⚠️⚠️ a fala narra o eixo que SE MEXEU, não sempre o x', () => {
    // Numa demonstração de velocidade para baixo a legenda dizia "foi de 60 para 60" enquanto o
    // Dino descia na tela — e é a frase que a criança lê, logo abaixo do palco.
    const desceu = rodar('velocity', [
      { type: 'velocity', vx: 0, vy: 3 },
      { type: 'advance', seconds: 1 },
    ])
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): a frase conta QUADROS e diz o sentido sem sujeito.
    expect(desceu.caption).toContain('Desceu.')
    expect(desceu.caption).not.toContain('de 60 para 60')
    expect(sceneSituation('velocity', { ...desceu, caption: '' })).toContain('para baixo')
  })

  test('⚠️ "levou para a ESQUERDA" pede ter andado para o LADO', () => {
    // O guard somava os dois eixos, então com o x travado no batente um movimento só vertical
    // fechava a meta do sinal — e o sinal é a cena.
    const soDesceu = rodar('velocity', [
      { type: 'velocity', vx: -5, vy: 5 },
      { type: 'advance', seconds: 1 },
      { type: 'advance', seconds: 1 },
      { type: 'advance', seconds: 1 },
      { type: 'advance', seconds: 1 },
    ])
    expect(soDesceu.drive.x).toBe(0)
    const antes = soDesceu.evidence.discoveries.length
    const maisUm = stepScene({ scene: 'velocity' }, soDesceu, { type: 'advance', seconds: 1 })
    expect(maisUm.drive.x).toBe(maisUm.drive.fromX)
    expect(maisUm.evidence.discoveries).toHaveLength(antes)
  })

  test('⚠️⚠️ para baixo e para cima: cada meta pede o personagem andando NAQUELE sentido', () => {
    // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5): TRÊS quadros (0,6 s a 5 por
    // segundo), e não um. No Dia 2 a meta caía num passo de 5 px e o ▶ parava ali.
    const umQuadro = rodar('velocity', [
      { type: 'velocity', vx: 0, vy: 5 },
      { type: 'advance', seconds: 0.2 },
    ])
    expect(descobertas(umQuadro)).not.toContain('down')
    const desceu = rodar('velocity', [
      { type: 'velocity', vx: 0, vy: 5 },
      { type: 'advance', seconds: 0.6 },
    ])
    expect(descobertas(desceu)).toContain('down')
    expect(descobertas(desceu)).not.toContain('up')
    const subiu = rodar('velocity', [
      { type: 'velocity', vx: 0, vy: -5 },
      { type: 'advance', seconds: 0.6 },
    ])
    expect(descobertas(subiu)).toContain('up')
    expect(descobertas(subiu)).not.toContain('down')

    // No batente de baixo o sinal está certo e NADA se mexe: a meta não cai num passo invisível,
    // nem quando o outro eixo anda (quem andou foi o x).
    const start = {
      scene: 'velocity' as const,
      setup: {
        actions: [
          { type: 'velocity' as const, vx: 0, vy: 10 },
          // ⚠️ Mudou de propósito (lote 4 do Raio-X): a 5 quadros por segundo, vy 10 anda 50 por
          // segundo (era 100). Três segundos levam o personagem ao batente de baixo.
          { type: 'advance' as const, seconds: 3 },
        ],
      },
    }
    const noChao = openScene(start)
    expect(noChao.drive.y).toBe(270)
    const parado = stepScene(start, noChao, { type: 'advance', seconds: 0.2 })
    expect(descobertas(parado)).toHaveLength(0)
    const soOLado = [
      { type: 'velocity' as const, vx: 5, vy: 10 },
      { type: 'advance' as const, seconds: 0.2 },
    ].reduce((e, a) => stepScene(start, e, a), noChao)
    expect(descobertas(soOLado)).toContain('moves')
    expect(descobertas(soOLado)).not.toContain('down')
  })

  test('⚠️⚠️ a fala diz SUBIU quando o y diminui, e não usa pronome', () => {
    // A frase dizia sempre "ele desceu de A para B", inclusive com o y diminuindo: no Dia 2 do
    // Desafio a nave subia na tela e a criança lia "desceu de 145 para 135".
    const subiu = rodar('velocity', [
      { type: 'velocity', vx: 0, vy: -5 },
      { type: 'advance', seconds: 0.2 },
    ])
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): "Um quadro: o y foi de 135 para 130. Subiu.", sem
    // sujeito, que o elenco não precisa flexionar.
    expect(subiu.caption).toContain('Subiu.')
    expect(subiu.caption).not.toContain('Desceu')
    // ⚠️ Mudou de propósito (lote 4 do Raio-X): 0,2 s é UM quadro a 5 por segundo, e um quadro é uma
    // soma (`y + vy`): 135 − 5 = 130. Antes o motor andava `vy × 10 × segundos`.
    expect(subiu.caption).toContain('de 135 para 130')
    const desceu = rodar('velocity', [
      { type: 'velocity', vx: 0, vy: 5 },
      { type: 'advance', seconds: 0.2 },
    ])
    expect(desceu.caption).toContain('Desceu.')
    expect(desceu.caption).not.toContain('Subiu')
    const nave = { hero: { name: 'nave', gender: 'f' as const } }
    expect(sceneSituation('velocity', subiu, nave)).toBe(
      'Um quadro: o y foi de 135 para 130. Subiu.',
    )
    expect(subiu.caption).not.toMatch(/\bele\b/)
  })

  test('⚠️⚠️ Dia 2 do Desafio: quem segue a instrução (para baixo, depois o sinal trocado) conclui', () => {
    // O caso cobrava `left` e a instrução mandava mexer na velocidade PARA BAIXO: a atividade
    // obrigatória nunca fechava para quem fazia exatamente o que a tela pedia.
    const activity: ExperimentationActivity = {
      type: 'experimentation',
      scene: 'velocity',
      cast: { hero: { name: 'nave', gender: 'f' } },
      setup: { goals: ['down', 'up'] },
    }
    expect(isExperimentationActivity(activity)).toBe(true)
    const start = sceneStart(activity)
    const alvo = sceneTargets(activity)
    // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5): cada sentido pede TRÊS quadros.
    const seguindo = (
      [
        { type: 'velocity', vx: 0, vy: 9 },
        { type: 'advance', seconds: 0.6 },
        { type: 'advance', seconds: 0.2 },
        { type: 'velocity', vx: 0, vy: -9 },
        { type: 'advance', seconds: 0.6 },
      ] as const
    ).reduce((e, a) => stepScene(start, e, a), openScene(start))
    expect(evaluateExperimentation('velocity', seguindo, true, activity.cast, alvo).passed).toBe(
      true,
    )
    // E mexer só no lado não fecha a missão vertical.
    const soOLado = (
      [
        { type: 'velocity', vx: 5, vy: 0 },
        { type: 'advance', seconds: 0.2 },
        { type: 'velocity', vx: -5, vy: 0 },
        { type: 'advance', seconds: 0.2 },
      ] as const
    ).reduce((e, a) => stepScene(start, e, a), openScene(start))
    expect(evaluateExperimentation('velocity', soOLado, true, activity.cast, alvo).passed).toBe(
      false,
    )
  })

  test('⚠️⚠️ velocidade ±1 no ▶: as quatro metas de sentido caem, em fatias de 0,04 e de 0,05', () => {
    // O "+" da bancada anda de 1 em 1, então "tocar no + e apertar ▶" é o PRIMEIRO gesto natural.
    // Com |v| = 1 o personagem anda 0,5 px por fatia de 0,05 s, e a folga de meio pixel medida por
    // fatia deixava as quatro metas impossíveis: a nave andava 20 px e nada caía (review do lote 1).
    for (const fatia of [0.04, 0.05]) {
      const quarenta = (vx: number, vy: number): SceneAction[] => [
        { type: 'velocity', vx, vy },
        ...Array.from({ length: 40 }, () => ({ type: 'advance' as const, seconds: fatia })),
      ]
      const estado = rodar('velocity', [
        ...quarenta(1, 0),
        ...quarenta(-1, 0),
        ...quarenta(0, 1),
        ...quarenta(0, -1),
      ])
      for (const meta of ['moves', 'left', 'down', 'up'])
        expect(descobertas(estado), `${meta} em fatias de ${fatia}`).toContain(meta)
    }
    // ⚠️ E uma fatia só não fecha nada: 0,05 s não chega a um quadro (lote 4), e o personagem nem sai
    // do lugar.
    const umaFatia = rodar('velocity', [
      { type: 'velocity', vx: 0, vy: -1 },
      { type: 'advance', seconds: 0.05 },
    ])
    expect(descobertas(umaFatia)).toHaveLength(0)
  })

  test('⚠️⚠️ a frase conta o caminho desde que a velocidade foi escolhida, não a última fatia', () => {
    // A demonstração é tocada em fatias: o Dino andava de 60 a 110 e a frase final dizia "foi de
    // 108 para 110", com "velocidade 5" escrito ao lado.
    // ⚠️ Mudou de propósito (lote 4 do Raio-X): 1 s são 5 quadros de `x + 5`, de 60 para 85 (era
    // `vx × 10 × segundos`, 110). O que o teste guarda continua: a frase conta desde a âncora.
    const tocado = rodar('velocity', [
      { type: 'velocity', vx: 5, vy: 0 },
      ...Array.from({ length: 20 }, () => ({ type: 'advance' as const, seconds: 0.05 })),
    ])
    // ⚠️ Mudou de propósito (lote 5): a frase conta os quadros desde a âncora.
    expect(tocado.caption).toBe('5 quadros: o x foi de 60 para 85.')
    const pedra = { hero: { name: 'pedra', gender: 'f' as const } }
    const desceu = rodar('velocity', [
      { type: 'velocity', vx: 0, vy: 3 },
      ...Array.from({ length: 40 }, () => ({ type: 'advance' as const, seconds: 0.05 })),
    ])
    expect(sceneSituation('velocity', desceu, pedra)).toBe(
      '10 quadros: o y foi de 135 para 165. Desceu.',
    )
    // Trocar a velocidade recomeça a conta DALI, e zero diz que parou, sem pronome.
    const parou = [
      { type: 'velocity' as const, vx: 0, vy: 0 },
      { type: 'advance' as const, seconds: 1 },
    ].reduce((e, a) => stepScene({ scene: 'velocity' }, e, a), desceu)
    // ⚠️ Mudou de propósito (review do lote 2): sem "a velocidade é zero", que era a meta `stopped`
    // escrita como explicação. A frase diz onde o Dino ficou.
    expect(parou.caption).toBe('O relógio andou, e o Dino continua em x 60, y 165.')
    expect(parou.caption).not.toContain('zero')
    expect(descobertas(parou)).toContain('stopped')
  })

  test('⚠️⚠️ retrato ANTIGO sem âncora: ela nasce onde o personagem está, sem caminho inventado', () => {
    // Uma âncora do padrão de fábrica (x 60) num retrato com a nave em x 200 afirmaria 140 px de
    // caminho: o próximo passo do relógio fecharia "a posição mudou sozinha" com a velocidade ZERO.
    const base = openScene({ scene: 'velocity' })
    const { anchorX: _x, anchorY: _y, ...driveAntigo } = { ...base.drive, x: 200, y: 40 }
    const hidratado = hydrateSceneState({ ...base, drive: driveAntigo }) as SceneState
    expect(isSceneState(hidratado)).toBe(true)
    expect(hidratado.drive.anchorX).toBe(200)
    expect(hidratado.drive.anchorY).toBe(40)
    const passo = stepScene({ scene: 'velocity' }, hidratado, { type: 'advance', seconds: 1 })
    expect(descobertas(passo)).toHaveLength(0)
  })

  test('⚠️⚠️ `down` e `up` são metas SÓ DE CASO: a missão de fábrica é a do lado', () => {
    // Somadas às outras três, a missão sem caso passou a cobrar cinco metas que a instrução, as
    // pistas e a demonstração não pediam (e a prévia do admin mostrava as cinco).
    const fabrica: ExperimentationActivity = { type: 'experimentation', scene: 'velocity' }
    expect([...sceneTargets(fabrica)]).toEqual(['moves', 'left', 'stopped'])
    const lado = rodar('velocity', [
      { type: 'velocity', vx: 5, vy: 0 },
      { type: 'advance', seconds: 1 },
      { type: 'velocity', vx: -5, vy: 0 },
      { type: 'advance', seconds: 1 },
      { type: 'velocity', vx: 0, vy: 0 },
      { type: 'advance', seconds: 1 },
    ])
    expect(
      evaluateExperimentation('velocity', lado, true, undefined, sceneTargets(fabrica)).passed,
    ).toBe(true)
    // Sem lista, o avaliador também fica na missão de fábrica.
    expect(evaluateExperimentation('velocity', lado).passed).toBe(true)
    // O caso continua podendo cobrar as duas.
    const caso: ExperimentationActivity = { ...fabrica, setup: { goals: ['down', 'up'] } }
    expect(isExperimentationActivity(caso)).toBe(true)
    expect([...sceneTargets(caso)]).toEqual(['down', 'up'])
  })

  test('⚠️ o negativo sai com o sinal de menos do conteúdo, como a instrução escreve ("−9")', () => {
    const subindo = rodar('velocity', [{ type: 'velocity', vx: 0, vy: -9 }])
    const velocidade = sceneReadout('velocity', subindo).find((l) => l.label === 'velocidade')
    // ⚠️ Mudou de propósito (lote 5): os dois eixos sempre, com os nomes do bloco (vx e vy).
    expect(velocidade?.value).toBe('vx 0 · vy −9')
    expect(velocidade?.value).not.toContain('-9')
    expect(sceneSituation('velocity', { ...subindo, caption: '' })).toContain('−9 para baixo')
  })

  test('⚠️⚠️ o "Ainda falta" diz o GESTO, e não o resultado que o palpite perguntou', () => {
    // Depois de pôr 9 e avançar, "Já descobri" respondia "Ainda falta: Velocidade negativa levou
    // para cima" — a resposta da previsão antes do gesto que a revela.
    const alvo = ['down', 'up']
    const desceu = rodar('velocity', [
      { type: 'velocity', vx: 0, vy: 9 },
      { type: 'advance', seconds: 0.2 },
    ])
    const feedback = evaluateExperimentation('velocity', desceu, true, undefined, alvo).feedback
    expect(feedback).not.toContain('levou para cima')
    // ⚠️ Mudou de propósito (review do lote 2): o pedido não supõe mais a ordem ("Agora troque… de
    // novo") e não manda "avançar o relógio", que não é nome de botão.
    expect(feedback).toBe(
      'Ponha a velocidade para baixo num número negativo e deixe o tempo passar.',
    )
  })
})

describe('hold-vs-press: o acontecimento contra a pergunta contínua', () => {
  // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): UMA tecla move as duas raquetes. As regras finas
  // (fantasmas, volta na pista, metas de soltar) estão em `nucleo-lote5.test.ts`.
  test('afundar a tecla é o aperto: a de cima dá UM passo, uma vez por toque', () => {
    const um = rodar('hold-vs-press', [{ type: 'press' }])
    const dois = rodar('hold-vs-press', [{ type: 'press' }, { type: 'press' }])
    // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5): cada aperto recomeça as duas
    // raquetes no começo da pista, e o fantasma fica onde a de cima estava. Um passo POR toque continua.
    expect(um.input.pressX).toBe(40 + 30)
    expect(dois.input.pressX).toBe(40 + 30)
    expect(dois.input.pressFrom).toBe(um.input.pressX)
    expect(descobertas(um)).toContain('one-step')
  })

  test('⚠️ segurar sem o relógio não anda: a pergunta é feita A CADA QUADRO', () => {
    const segurando = rodar('hold-vs-press', [{ type: 'hold', on: true }])
    expect(segurando.input.holdX).toBe(openScene({ scene: 'hold-vs-press' }).input.holdX)
    const comTempo = rodar('hold-vs-press', [
      { type: 'hold', on: true },
      { type: 'advance', seconds: 1 },
    ])
    expect(comTempo.input.holdX).toBeGreaterThan(segurando.input.holdX)
    expect(descobertas(comTempo)).toContain('while-held')
  })

  test('⚠️ "a de cima deu um passo só" pede a segurada INTEIRA: segurar e soltar', () => {
    // Sem soltar, a criança ainda não viu o fim do gesto; e o `press` das sessões de antes é um toque.
    const segurando = rodar('hold-vs-press', [
      { type: 'hold', on: true },
      { type: 'advance', seconds: 1 },
      { type: 'advance', seconds: 1 },
    ])
    expect(descobertas(segurando)).not.toContain('apart')
    const soltou = rodar('hold-vs-press', [
      { type: 'hold', on: true },
      { type: 'advance', seconds: 1 },
      { type: 'hold', on: false },
    ])
    expect(soltou.input.pressSteps).toBe(1)
    expect(descobertas(soltou)).toContain('apart')
  })
})

describe('variable: guardar, mudar e mostrar são três coisas', () => {
  test('⚠️ mudar com a tela DESLIGADA é a descoberta; com ela ligada, não conta', () => {
    const escondido = rodar('variable', [
      { type: 'store', value: 10 },
      { type: 'change', by: 5 },
    ])
    expect(escondido.box.value).toBe(15)
    expect(descobertas(escondido)).toContain('changed-hidden')

    const àVista = rodar('variable', [
      { type: 'show', on: true },
      { type: 'change', by: 5 },
    ])
    expect(descobertas(àVista)).not.toContain('changed-hidden')
  })

  test('⚠️ sem ter GUARDADO nada, somar não fecha a meta: a caixa já nasce fora da tela', () => {
    // A ordem é a que a instrução pede (guardar, mudar sem mostrar, só então mostrar). Sem
    // isto, o primeiro toque em "somar" fechava a descoberta antes de existir um valor.
    // ⚠️ Mudou de propósito (lote 5): sem a caixa CRIADA não há o que somar, e o número fica em 0.
    const semGuardar = rodar('variable', [{ type: 'change', by: 1 }])
    expect(semGuardar.box.value).toBe(0)
    expect(semGuardar.box.created).toBe(false)
    expect(descobertas(semGuardar)).not.toContain('changed-hidden')
  })

  test('mostrar não muda o valor guardado', () => {
    const antes = rodar('variable', [{ type: 'store', value: 7 }])
    const depois = rodar('variable', [
      { type: 'store', value: 7 },
      { type: 'show', on: true },
    ])
    expect(depois.box.value).toBe(antes.box.value)
    expect(descobertas(depois)).toContain('shown')
  })

  test('⚠️ ligar a tela com a caixa VAZIA não mostra nada, e não é descoberta', () => {
    // Irmã do `changed-hidden`, mesmo conserto: a caixa nasce com zero.
    const s = rodar('variable', [{ type: 'show', on: true }])
    expect(descobertas(s)).toHaveLength(0)
  })
})

describe('group-loop: para escolher um do grupo é preciso medir todos', () => {
  test('⚠️ escolher o mais perto SEM ter medido todos não conta', () => {
    // O acerto por sorte não é a descoberta: o que a cena ensina é o percurso.
    const chute = rodar('group-loop', [{ type: 'choose', id: 2 }])
    expect(descobertas(chute)).not.toContain('nearest')
    expect(chute.hunt.blind).toBe(true)

    const percorrido = rodar('group-loop', [
      { type: 'look', id: 1 },
      { type: 'look', id: 2 },
      { type: 'look', id: 3 },
      { type: 'choose', id: 2 },
    ])
    expect(descobertas(percorrido)).toContain('looked-all')
    expect(descobertas(percorrido)).toContain('nearest')
  })

  test('⚠️⚠️ o laço ligado escolhe o mais perto, e a meta só cai quando a escolha MUDA sozinha', () => {
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): "a escolha acompanha" caía no ato de ligar, com
    // tudo parado. Agora os cactos andam com o relógio, e a meta pede a troca.
    const comLaço = rodar('group-loop', [{ type: 'connect', port: 'loop', enabled: true }])
    expect(comLaço.hunt.chosen).toBe(2)
    expect(descobertas(comLaço)).not.toContain('auto')
    // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5): da fase 0 o 2º segue o mais perto
    // por 1,6 s, e a troca só conta com 1 s de laço ligado.
    const andou = rodar('group-loop', [
      { type: 'connect', port: 'loop', enabled: true },
      { type: 'advance', seconds: 2 },
    ])
    expect(andou.hunt.chosen).not.toBe(2)
    expect(descobertas(andou)).toContain('auto')
  })
})

describe('enemy-type: uma ficha, muitos cactos', () => {
  test('⚠️ mudar a ficha com NINGUÉM nascido não ensina nada', () => {
    const vazio = rodar('enemy-type', [
      { type: 'define', field: 'speed', value: 7 },
      { type: 'advance', seconds: 1 },
    ])
    expect(descobertas(vazio)).not.toContain('all-change')
  })

  test('com vários na pista, um número muda todos, e a criança VÊ no quadro seguinte', () => {
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): a meta espera um quadro do relógio, com os
    // cactos andando no número novo.
    const mudou = rodar('enemy-type', [
      { type: 'spawnOne' },
      { type: 'spawnOne' },
      { type: 'spawnOne' },
      { type: 'define', field: 'speed', value: 7 },
    ])
    expect(mudou.blueprint.born).toBe(3)
    expect(descobertas(mudou)).toContain('many')
    expect(descobertas(mudou)).not.toContain('all-change')
    const viu = stepScene({ scene: 'enemy-type' }, mudou, { type: 'advance', seconds: 0.1 })
    expect(descobertas(viu)).toContain('all-change')
  })
})

describe('camera: o mundo é maior que a tela', () => {
  test('⚠️ a câmera só é solução depois de a DOR acontecer', () => {
    // Ligar a câmera antes de o herói sumir não fecha "com a câmera ele volta a caber": não
    // houve nada a que voltar. É a regra da casa — dor antes da solução.
    const semDor = rodar('camera', [{ type: 'connect', port: 'camera', enabled: true }])
    expect(descobertas(semDor)).not.toContain('follows')

    const comDor = rodar('camera', [
      { type: 'walk', x: 700 },
      { type: 'connect', port: 'camera', enabled: true },
    ])
    expect(descobertas(comDor)).toContain('lost')
    expect(descobertas(comDor)).toContain('follows')
  })
})

describe('contact: a pergunta contínua contra o acontecimento', () => {
  // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): as DUAS regras em duas pistas ao mesmo tempo, com 10
  // corações cada, e o encosto quando os DESENHOS se tocam (distância 0). Os números antigos (vida
  // perdida numa pista só, encosto em 40) saíram junto com a Escolha da pergunta.
  test('a regra de cima tira um coração em TODO quadro; a de baixo, um só', () => {
    const encostado = rodar('contact', [
      { type: 'approach', distance: 0 },
      { type: 'advance', seconds: 1 },
      { type: 'advance', seconds: 1 },
    ])
    // 2 s a 4 por segundo = 8 quadros encostados.
    expect(encostado.hit.top).toBe(10 - 8)
    expect(encostado.hit.bottom).toBe(10 - 1)
    expect(descobertas(encostado)).toContain('drain')
    expect(descobertas(encostado)).toContain('once')
  })

  test('afastar e encostar de novo tira mais um embaixo', () => {
    const voltou = rodar('contact', [
      { type: 'approach', distance: 0 },
      { type: 'advance', seconds: 1 },
      { type: 'approach', distance: 150 },
      { type: 'advance', seconds: 1 },
      { type: 'approach', distance: 0 },
      { type: 'advance', seconds: 1 },
    ])
    expect(voltou.hit.bottom).toBe(10 - 2)
    expect(descobertas(voltou)).toContain('apart')
  })

  test('⚠️⚠️ TROCAR a pergunta (a ação antiga) não é afastar, e não zera mais nada', () => {
    const alternou = rodar('contact', [
      { type: 'approach', distance: 0 },
      { type: 'advance', seconds: 1 },
      { type: 'mode', kind: 'event' },
      { type: 'mode', kind: 'ask' },
      { type: 'advance', seconds: 1 },
    ])
    expect(alternou.hit.distance).toBe(0)
    expect(alternou.hit.bottom).toBe(10 - 1)
    expect(descobertas(alternou)).not.toContain('apart')
  })

  test('⚠️ AFASTAR sozinho não é a descoberta: ela é o coração cair de novo na volta', () => {
    const soAfastou = rodar('contact', [
      { type: 'approach', distance: 0 },
      { type: 'advance', seconds: 1 },
      { type: 'approach', distance: 150 },
      { type: 'advance', seconds: 1 },
    ])
    expect(soAfastou.hit.bottom).toBe(10 - 1)
    expect(descobertas(soAfastou)).not.toContain('apart')
  })
})

describe('cooldown: o relógio que faz esperar', () => {
  test('sem recarga, todo aperto vira tiro, e três seguidos saem colados', () => {
    const rajada = rodar('cooldown', [{ type: 'shoot' }, { type: 'shoot' }, { type: 'shoot' }])
    expect(rajada.weapon.shots).toBe(3)
    expect(rajada.weapon.refused).toBe(0)
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): cai no terceiro tiro, sem depender do relógio.
    expect(descobertas(rajada)).toContain('burst')
    expect(rajada.weapon.bullets).toEqual([0, 20, 40])
  })

  test('⚠️ com recarga, o pedido durante a espera NÃO vira tiro (e é a descoberta)', () => {
    const esperando = rodar('cooldown', [
      { type: 'recharge', seconds: 1 },
      { type: 'shoot' },
      { type: 'shoot' },
    ])
    expect(esperando.weapon.shots).toBe(1)
    expect(esperando.weapon.refused).toBe(1)
    expect(descobertas(esperando)).toContain('waiting')

    const depois = rodar('cooldown', [
      { type: 'recharge', seconds: 1 },
      { type: 'shoot' },
      { type: 'advance', seconds: 1 },
      { type: 'shoot' },
    ])
    expect(depois.weapon.shots).toBe(2)
    expect(descobertas(depois)).toContain('spaced')
  })
})

describe('aim: a seta do atirador até o alvo', () => {
  test('⚠️ sem a mira ligada, o tiro vai reto e erra; com ela, vai pela seta e acerta', () => {
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): o tiro sai com o GESTO "Atirar" e voa; o relógio
    // sozinho não põe mais bolinha nenhuma em cima do alvo.
    const reto = rodar('aim', [
      { type: 'target', x: 120, y: 220 },
      { type: 'shoot' },
      { type: 'advance', seconds: 1 },
    ])
    expect(descobertas(reto)).not.toContain('follows')
    expect(descobertas(reto)).toContain('arrow')
    expect(descobertas(reto)).toContain('straight-miss')

    const mirado = rodar('aim', [
      { type: 'target', x: 120, y: 220 },
      { type: 'connect', port: 'aim', enabled: true },
      { type: 'shoot' },
      { type: 'advance', seconds: 1 },
    ])
    expect(mirado.sight.shotX).toBe(120)
    expect(descobertas(mirado)).toContain('follows')
  })
})

describe('diagonal: dois passos no tempo de um', () => {
  // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): o gesto é "Andar 1 segundo" (`stride`), sem relógio,
  // e as metas pedem o fantasma da andada com que comparar.
  test('a diagonal anda MAIS que o reto no mesmo segundo', () => {
    const reto = rodar('diagonal', [{ type: 'direction', x: 1, y: 0 }, { type: 'stride' }])
    const diagonal = rodar('diagonal', [
      { type: 'direction', x: 1, y: 0 },
      { type: 'stride' },
      { type: 'direction', x: 1, y: 1 },
      { type: 'stride' },
    ])
    expect(diagonal.walkPad.distance).toBeGreaterThan(reto.walkPad.distance)
    expect(descobertas(diagonal)).toContain('faster')
  })

  test('com a correção, os dois caminhos andam o mesmo', () => {
    const reto = rodar('diagonal', [{ type: 'direction', x: 1, y: 0 }, { type: 'stride' }])
    const corrigida = rodar('diagonal', [
      { type: 'direction', x: 1, y: 1 },
      { type: 'stride' },
      { type: 'connect', port: 'even', enabled: true },
      { type: 'stride' },
    ])
    expect(corrigida.walkPad.distance).toBe(reto.walkPad.distance)
    expect(descobertas(corrigida)).toContain('same')
  })
})

describe('tilemap: o desenho nasce das letras', () => {
  test('⚠️ escrever a MESMA letra que já estava ali não conta como troca', () => {
    const igual = rodar('tilemap', [{ type: 'paint-tile', row: 5, col: 0, tile: '#' }])
    expect(igual.grid.edits).toBe(0)
    expect(descobertas(igual)).toHaveLength(0)
  })

  test('⚠️⚠️ a lista de letras NÃO cresce com o mapa: o retrato tem que continuar legível', () => {
    // O mapa tem 60 casas e a pista manda pintar um chão inteiro. Empilhando uma entrada por
    // TROCA, a lista passava do teto que o validador aceita e o retrato virava ilegível para o
    // próprio leitor — a criança lia "esta descoberta mudou, recomece" no meio do desenho.
    const muitas = rodar(
      'tilemap',
      Array.from({ length: 40 }, (_, i) => ({
        type: 'paint-tile' as const,
        row: (i % 5) as number,
        col: (i % 10) as number,
        tile: '#',
      })),
    )
    expect(muitas.grid.written).toEqual(['#'])
    expect(isSceneState(muitas)).toBe(true)
  })

  test('⚠️⚠️ três letras DIFERENTES não provam que "a mesma letra vira a mesma coisa"', () => {
    // A meta contava TROCAS, e afirma uma constância que três letras distintas não mostram.
    const variadas = rodar('tilemap', [
      { type: 'paint-tile', row: 2, col: 1, tile: '#' },
      { type: 'paint-tile', row: 2, col: 2, tile: 'o' },
      { type: 'paint-tile', row: 5, col: 3, tile: '.' },
    ])
    expect(variadas.grid.edits).toBe(3)
    expect(descobertas(variadas)).not.toContain('same-letter')
  })

  test('trocar uma letra muda o mapa, e a mesma peça em outra linha vira a mesma coisa', () => {
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): a mesma peça em DUAS LINHAS. Três blocos na mesma
    // linha não fecham mais a meta (e "ooo" numa linha só fecharia junto com as moedas).
    const editado = rodar('tilemap', [
      { type: 'paint-tile', row: 3, col: 4, tile: '#' },
      { type: 'paint-tile', row: 3, col: 5, tile: '#' },
      { type: 'paint-tile', row: 3, col: 6, tile: '#' },
    ])
    expect(editado.grid.rows[3]).toBe('....###...')
    expect(descobertas(editado)).toContain('text-is-map')
    expect(descobertas(editado)).not.toContain('same-letter')
    const outraLinha = stepScene({ scene: 'tilemap' }, editado, {
      type: 'paint-tile',
      row: 1,
      col: 0,
      tile: '#',
    })
    expect(descobertas(outraLinha)).toContain('same-letter')
  })
})

describe('⚠️ toda cena nova tem caminho de passar, e ele passa pelas metas', () => {
  const nucleo: SceneId[] = [
    'velocity',
    'hold-vs-press',
    'variable',
    'group-loop',
    'enemy-type',
    'camera',
    'contact',
    'cooldown',
    'aim',
    'diagonal',
    'tilemap',
  ]
  for (const scene of nucleo)
    test(`${scene}: abre sem nenhuma meta fechada`, () => {
      // A outra metade — que existe caminho para fechar TODAS — é o que o `scenePaths` de
      // `tests/fixtures` garante, na varredura de `scene.test.ts`.
      const inicial = openScene({ scene })
      expect(descobertas(inicial)).toHaveLength(0)
      expect(evaluateExperimentation(scene, inicial).passed).toBe(false)
    })
})
