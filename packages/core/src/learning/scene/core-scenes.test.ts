import { describe, expect, test } from 'bun:test'
import type { SceneAction, SceneId } from './actions'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation } from './evaluate'
import { sceneSituation } from './readout'
import { isSceneState, type SceneState } from './state'

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
    expect(desceu.caption).toContain('desceu')
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
})

describe('hold-vs-press: o acontecimento contra a pergunta contínua', () => {
  test('apertar anda UM passo, por aperto', () => {
    const um = rodar('hold-vs-press', [{ type: 'press' }])
    const dois = rodar('hold-vs-press', [{ type: 'press' }, { type: 'press' }])
    expect(dois.input.pressX - um.input.pressX).toBe(um.input.pressX - 40)
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

  test('⚠️ a comparação só conta depois de a criança ter feito as DUAS coisas', () => {
    // Sem isto, "as duas em lugares diferentes" fecharia sozinha só porque uma delas nunca
    // andou — e a cena estaria premiando a ausência de gesto.
    const soSegurou = rodar('hold-vs-press', [
      { type: 'hold', on: true },
      { type: 'advance', seconds: 1 },
      { type: 'advance', seconds: 1 },
    ])
    expect(descobertas(soSegurou)).not.toContain('apart')
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
    const semGuardar = rodar('variable', [{ type: 'change', by: 1 }])
    expect(semGuardar.box.value).toBe(1)
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

describe('group-loop: para escolher um do grupo é preciso olhar todos', () => {
  test('⚠️ escolher o mais perto SEM ter olhado todos não conta', () => {
    // O acerto por sorte não é a descoberta: o que a cena ensina é o percurso.
    const chute = rodar('group-loop', [{ type: 'choose', id: 2 }])
    expect(descobertas(chute)).not.toContain('nearest')

    const percorrido = rodar('group-loop', [
      { type: 'look', id: 1 },
      { type: 'look', id: 2 },
      { type: 'look', id: 3 },
      { type: 'choose', id: 2 },
    ])
    expect(descobertas(percorrido)).toContain('looked-all')
    expect(descobertas(percorrido)).toContain('nearest')
  })

  test('o laço ligado escolhe sozinho o mais perto', () => {
    const comLaço = rodar('group-loop', [{ type: 'connect', port: 'loop', enabled: true }])
    expect(comLaço.hunt.chosen).toBe(2)
    expect(descobertas(comLaço)).toContain('auto')
  })
})

describe('enemy-type: uma ficha, muitos inimigos', () => {
  test('⚠️ mudar a ficha com NINGUÉM nascido não ensina nada', () => {
    const vazio = rodar('enemy-type', [{ type: 'define', field: 'speed', value: 7 }])
    expect(descobertas(vazio)).not.toContain('all-change')
  })

  test('com vários no chão, um número muda todos', () => {
    const cheio = rodar('enemy-type', [
      { type: 'spawnOne' },
      { type: 'spawnOne' },
      { type: 'spawnOne' },
      { type: 'define', field: 'speed', value: 7 },
    ])
    expect(cheio.blueprint.born).toBe(3)
    expect(descobertas(cheio)).toContain('many')
    expect(descobertas(cheio)).toContain('all-change')
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
  test('a pergunta contínua tira vida em TODO quadro', () => {
    const drenado = rodar('contact', [
      { type: 'approach', distance: 20 },
      { type: 'advance', seconds: 1 },
      { type: 'advance', seconds: 1 },
      { type: 'advance', seconds: 1 },
    ])
    expect(drenado.hit.damage).toBe(3)
    expect(descobertas(drenado)).toContain('drain')
  })

  test('o acontecimento tira UMA vez, e afastar faz valer de novo', () => {
    const umaVez = rodar('contact', [
      { type: 'mode', kind: 'event' },
      { type: 'approach', distance: 20 },
      { type: 'advance', seconds: 1 },
      { type: 'advance', seconds: 1 },
      { type: 'advance', seconds: 1 },
    ])
    expect(umaVez.hit.damage).toBe(1)
    expect(descobertas(umaVez)).toContain('once')

    const voltou = rodar('contact', [
      { type: 'mode', kind: 'event' },
      { type: 'approach', distance: 20 },
      { type: 'advance', seconds: 1 },
      { type: 'approach', distance: 150 },
      { type: 'advance', seconds: 1 },
      { type: 'approach', distance: 20 },
      { type: 'advance', seconds: 1 },
    ])
    expect(voltou.hit.damage).toBe(2)
    expect(descobertas(voltou)).toContain('apart')
  })

  test('⚠️⚠️ TROCAR a pergunta não é afastar: a meta pede o cacto ter saído de perto', () => {
    // O `mode` zera o `touching` de propósito (senão o acontecimento nunca dispararia no modo
    // novo), e alternar os dois botões com o cacto parado em cima do Dino fazia o motor ler
    // duas batidas onde houve uma — fechando "afastar e voltar" sem nada ter se afastado.
    const alternou = rodar('contact', [
      { type: 'approach', distance: 20 },
      { type: 'mode', kind: 'event' },
      { type: 'advance', seconds: 1 },
      { type: 'mode', kind: 'ask' },
      { type: 'mode', kind: 'event' },
      { type: 'advance', seconds: 1 },
    ])
    expect(alternou.hit.distance).toBe(20)
    expect(descobertas(alternou)).not.toContain('apart')
  })

  test('⚠️⚠️ TROCAR a pergunta não é afastar: a meta pede o cacto ter saído de perto', () => {
    // O `mode` zera o `touching` de propósito (senão o acontecimento nunca dispararia no modo
    // novo), e alternar os dois botões com o cacto parado em cima do Dino fazia o motor ler
    // duas batidas onde houve uma — fechando "afastar e voltar" sem nada ter se afastado.
    const alternou = rodar('contact', [
      { type: 'approach', distance: 20 },
      { type: 'mode', kind: 'event' },
      { type: 'advance', seconds: 1 },
      { type: 'mode', kind: 'ask' },
      { type: 'mode', kind: 'event' },
      { type: 'advance', seconds: 1 },
    ])
    expect(alternou.hit.distance).toBe(20)
    expect(descobertas(alternou)).not.toContain('apart')
  })

  test('⚠️ AFASTAR sozinho não é a descoberta: ela é a vida cair de novo na volta', () => {
    const soAfastou = rodar('contact', [
      { type: 'mode', kind: 'event' },
      { type: 'approach', distance: 20 },
      { type: 'advance', seconds: 1 },
      { type: 'approach', distance: 150 },
      { type: 'advance', seconds: 1 },
    ])
    expect(soAfastou.hit.damage).toBe(1)
    expect(descobertas(soAfastou)).not.toContain('apart')
  })
})

describe('cooldown: o relógio que faz esperar', () => {
  test('sem recarga, todo pedido vira tiro', () => {
    const rajada = rodar('cooldown', [{ type: 'shoot' }, { type: 'shoot' }, { type: 'shoot' }])
    expect(rajada.weapon.shots).toBe(3)
    expect(rajada.weapon.refused).toBe(0)
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
  test('⚠️ sem a mira ligada, o relógio não leva o tiro ao alvo', () => {
    const reto = rodar('aim', [
      { type: 'target', x: 120, y: 220 },
      { type: 'advance', seconds: 1 },
    ])
    expect(descobertas(reto)).not.toContain('follows')
    expect(descobertas(reto)).toContain('arrow')

    const mirado = rodar('aim', [
      { type: 'target', x: 120, y: 220 },
      { type: 'connect', port: 'aim', enabled: true },
      { type: 'advance', seconds: 1 },
    ])
    expect(mirado.sight.shotX).toBe(120)
    expect(descobertas(mirado)).toContain('follows')
  })
})

describe('diagonal: dois passos no tempo de um', () => {
  test('a diagonal anda MAIS que o reto no mesmo quadro', () => {
    const reto = rodar('diagonal', [
      { type: 'direction', x: 1, y: 0 },
      { type: 'advance', seconds: 1 },
    ])
    const diagonal = rodar('diagonal', [
      { type: 'direction', x: 1, y: 1 },
      { type: 'advance', seconds: 1 },
    ])
    expect(diagonal.walkPad.distance).toBeGreaterThan(reto.walkPad.distance)
    expect(descobertas(diagonal)).toContain('faster')
  })

  test('com a correção, os dois caminhos andam o mesmo', () => {
    const reto = rodar('diagonal', [
      { type: 'direction', x: 1, y: 0 },
      { type: 'advance', seconds: 1 },
    ])
    const corrigida = rodar('diagonal', [
      { type: 'connect', port: 'even', enabled: true },
      { type: 'direction', x: 1, y: 1 },
      { type: 'advance', seconds: 1 },
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

  test('trocar uma letra muda o mapa, e a mesma letra vira sempre a mesma coisa', () => {
    const editado = rodar('tilemap', [
      { type: 'paint-tile', row: 3, col: 4, tile: '#' },
      { type: 'paint-tile', row: 3, col: 5, tile: '#' },
      { type: 'paint-tile', row: 3, col: 6, tile: '#' },
    ])
    expect(editado.grid.rows[3]).toBe('....###...')
    expect(descobertas(editado)).toContain('text-is-map')
    expect(descobertas(editado)).toContain('same-letter')
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
