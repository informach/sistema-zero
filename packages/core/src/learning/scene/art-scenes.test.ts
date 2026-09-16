import { describe, expect, test } from 'bun:test'
import type { SceneAction, SceneId } from './actions'
import { isSceneAction } from './actions'
import { stepScene } from './engine'
import { evaluateExperimentation, sceneGoals } from './evaluate'
import { sceneReadout, sceneSituation } from './readout'
import { initialScene, type SceneState } from './state'

/**
 * As seis cenas do lote 4 da proposta (14/09/2026): as cinco de DESENHO, que O Jogo do Meu
 * Jeito pedia e não tinha (o curso inteiro não usava uma única cena nativa), e a das vidas,
 * do dia 4 do Desafio.
 *
 * O que a varredura de `scene.test.ts` já garante para todas as cenas — que o caminho de
 * sucesso fecha as metas, que o texto veste o elenco, que a faixa cabe em três leituras — não
 * se repete aqui. Este arquivo cobre o que é PRÓPRIO de cada uma: as regras que fazem a
 * descoberta valer alguma coisa, e que um refactor do motor quebraria em silêncio.
 */

function rodar(scene: SceneId, acoes: SceneAction[]): SceneState {
  return acoes.reduce((estado, acao) => stepScene({ scene }, estado, acao), initialScene({ scene }))
}
const descobertas = (state: SceneState) => state.evidence.discoveries

describe('frames: dois desenhos viram movimento', () => {
  test('⚠️ trocar de quadro COM a prévia tocando não conta como ver os dois desenhos', () => {
    // A descoberta é "são dois desenhos parados". Com a prévia andando, quem trocou foi o relógio,
    // e a criança não viu cada um sozinho: contar isso seria dar de graça justamente a ideia que a
    // cena existe para construir.
    const naMao = rodar('frames', [{ type: 'frame', index: 2 }])
    expect(descobertas(naMao)).toContain('two-drawings')
    const tocando = rodar('frames', [
      { type: 'play', on: true },
      { type: 'frame', index: 2 },
    ])
    expect(descobertas(tocando)).not.toContain('two-drawings')
  })

  test('a mesma montagem em duas velocidades dá duas descobertas diferentes', () => {
    const devagar = rodar('frames', [
      { type: 'rate', perSecond: 1 },
      { type: 'play', on: true },
      { type: 'advance', seconds: 1 },
      { type: 'advance', seconds: 1 },
    ])
    expect(descobertas(devagar)).toContain('slow-shows-two')
    expect(descobertas(devagar)).not.toContain('movement')
    // O quadro alterna de verdade: duas trocas a partir do 1 voltam ao 1.
    expect(devagar.animation.swaps).toBe(2)
    expect(devagar.animation.frame).toBe(1)
    const rapido = rodar('frames', [
      { type: 'rate', perSecond: 8 },
      { type: 'play', on: true },
      { type: 'advance', seconds: 1 },
    ])
    expect(descobertas(rapido)).toContain('movement')
    expect(rapido.animation.swaps).toBe(8)
  })

  test('⚠️⚠️ mudar a velocidade RECOMEÇA a contagem das trocas', () => {
    // Achado do full review: as trocas eram cumulativas entre velocidades, então quem rodasse
    // rápido primeiro e depois baixasse ganhava "devagar dá para ver os dois" na primeira volta
    // do relógio, sem ter visto um único desenho parado naquela velocidade.
    const rapidoDepoisDevagar = rodar('frames', [
      { type: 'rate', perSecond: 8 },
      { type: 'play', on: true },
      { type: 'advance', seconds: 1 },
      { type: 'rate', perSecond: 1 },
      { type: 'advance', seconds: 0.5 },
    ])
    expect(descobertas(rapidoDepoisDevagar)).toContain('movement')
    expect(descobertas(rapidoDepoisDevagar)).not.toContain('slow-shows-two')
    expect(rapidoDepoisDevagar.animation.swaps).toBe(0)
    // E ela chega lá vendo as trocas NAQUELA velocidade.
    const olhando = stepScene({ scene: 'frames' }, rapidoDepoisDevagar, {
      type: 'advance',
      seconds: 1.5,
    })
    expect(descobertas(olhando)).toContain('slow-shows-two')
  })

  test('⚠️ ligar a prévia sem o tempo passar não descobre nada', () => {
    // É o que faz a criança esperar e mexer na velocidade em vez de só clicar no interruptor.
    const parado = rodar('frames', [
      { type: 'play', on: true },
      { type: 'rate', perSecond: 8 },
    ])
    expect(descobertas(parado)).toEqual([])
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): "quadros por segundo", a Velocidade do Pinta.
    expect(sceneSituation('frames', { ...parado, caption: '' })).toContain('8 quadros por segundo')
  })
})

describe('onion-skin: o fantasma do quadro de antes', () => {
  test('⚠️⚠️ no quadro 1 não há quadro anterior, e ligar o fantasma lá não descobre nada', () => {
    // A frase vem do roteiro da aula com todas as letras. Mostrar um fantasma no quadro 1
    // seria inventar um desenho que não existe, e é o tipo de mentira que a criança percebe
    // quando abre o Pinta de verdade.
    const noUm = rodar('onion-skin', [{ type: 'onion', on: true }])
    expect(descobertas(noUm)).not.toContain('ghost-on')
    expect(noUm.caption).toBe('No quadro 1 não há quadro anterior para mostrar.')
    const noDois = rodar('onion-skin', [
      { type: 'frame', index: 2 },
      { type: 'onion', on: true },
    ])
    expect(descobertas(noDois)).toContain('ghost-on')
  })

  test('o fogo "um pouco maior" só conta com o fantasma ligado', () => {
    // Sem a guia, acertar o fogo é sorte; com ela, é comparação. A cena mede a comparação.
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): o `shift` é o quanto o FOGO do quadro 2 cresce.
    const chute = rodar('onion-skin', [
      { type: 'frame', index: 2 },
      { type: 'shift', offset: 20 },
    ])
    expect(descobertas(chute)).toContain('blind-move')
    expect(descobertas(chute)).not.toContain('even-step')
    const comparado = rodar('onion-skin', [
      { type: 'frame', index: 2 },
      { type: 'onion', on: true },
      { type: 'shift', offset: 20 },
    ])
    expect(descobertas(comparado)).toContain('even-step')
    // E um fogo que passa da borda do quadro, mesmo com a guia, não é "um pouco maior".
    const saltado = rodar('onion-skin', [
      { type: 'frame', index: 2 },
      { type: 'onion', on: true },
      { type: 'shift', offset: 52 },
    ])
    expect(descobertas(saltado)).not.toContain('even-step')
  })
})

/*
 * ⚠️⚠️ `symmetry`, `pixel-vector` e `sheet-vs-sprite` foram REDESENHADAS no lote 5 do Raio-X
 * (16/09/2026): o espelho do Pinta no meio da grade, uma lupa para as duas pedras e a largura do
 * recorte na folha da nave. As regras novas estão em `atelie-lote5.test.ts`; aqui ficou o que
 * continua valendo delas.
 */
describe('pixel-vector: de perto, a borda conta', () => {
  test('⚠️ "voltou para longe" só conta DEPOIS de ver as bordas de perto', () => {
    // Voltar a lupa para 1 sem nunca ter chegado perto não é uma descoberta: é o estado em que
    // a cena abre.
    const soLonge = rodar('pixel-vector', [{ type: 'inspect', kind: 'vector', zoom: 1 }])
    expect(descobertas(soLonge)).toEqual([])
    // ⚠️ Mudou de propósito (lote 5): a lupa vale para as DUAS pedras, e o `kind` não decide mais.
    const completo = rodar('pixel-vector', [
      { type: 'inspect', kind: 'pixel', zoom: 6 },
      { type: 'inspect', kind: 'pixel', zoom: 1 },
    ])
    expect(descobertas(completo)).toEqual(['stairs', 'smooth', 'alike'])
  })

  test('⚠️⚠️ a faixa e a frase NÃO escrevem o que a borda virou: quem mostra é a lupa', () => {
    // Mudou de propósito (lote 2 do Raio-X, 16/09/2026). A faixa dizia "borda: escadinha / lisa /
    // de longe, igual" — o resultado que a cena existe para a criança ver —, e com a lupa em 4
    // afirmava "de longe, igual" com a escadinha à vista.
    for (const kind of ['pixel', 'vector'] as const)
      for (const zoom of [1, 4, 6]) {
        const s = rodar('pixel-vector', [{ type: 'inspect', kind, zoom }])
        const texto = [
          ...sceneReadout('pixel-vector', s).map((l) => `${l.label} ${l.value}`),
          sceneSituation('pixel-vector', { ...s, caption: '' }),
        ].join(' | ')
        expect(texto).not.toMatch(/escadinha|degrau|lisa|igua|ponto/)
        expect(texto).toContain(`${zoom}`)
      }
  })
})

describe('sheet-vs-sprite: a folha não é o tamanho no jogo', () => {
  test('⚠️⚠️ mudar o tamanho no jogo NÃO mexe na folha nem no recorte', () => {
    // É a cena inteira em uma asserção: se o recorte acompanhasse o tamanho, a criança
    // aprenderia o contrário do que a aula quer ensinar.
    // ⚠️ Mudou de propósito (lote 5): a meta só vale depois de achar o recorte de uma nave inteira.
    const antes = rodar('sheet-vs-sprite', [
      { type: 'crop', width: 32 },
      { type: 'cut', cell: 2 },
    ])
    const depois = stepScene({ scene: 'sheet-vs-sprite' }, antes, { type: 'sprite', size: 80 })
    expect(depois.sheet.cell).toBe(antes.sheet.cell)
    expect(depois.sheet.width).toBe(antes.sheet.width)
    expect(depois.sheet.cuts).toEqual(antes.sheet.cuts)
    expect(depois.sheet.size).toBe(80)
    expect(descobertas(depois)).toContain('size-apart')
  })
})

describe('lives: ponto e vida mudam por motivos diferentes', () => {
  test('sem o fio da vida, bater não custa nada', () => {
    const semFio = rodar('lives', [{ type: 'collide' }])
    expect(semFio.lifeline.lives).toBe(3)
    expect(semFio.lifeline.hits).toBe(1)
    expect(descobertas(semFio)).toEqual([])
  })

  test('⚠️ "os pontos ficaram" exige ponto para perder', () => {
    // Bater com o placar zerado não mostra independência nenhuma: zero continua zero.
    const semPlacar = rodar('lives', [
      { type: 'connect', port: 'life', enabled: true },
      { type: 'collide' },
    ])
    expect(descobertas(semPlacar)).toContain('life-lost')
    expect(descobertas(semPlacar)).not.toContain('points-stay')
    const comPlacar = rodar('lives', [
      { type: 'connect', port: 'condition', enabled: true },
      { type: 'advance', seconds: 2 },
      { type: 'connect', port: 'life', enabled: true },
      { type: 'collide' },
    ])
    expect(comPlacar.lifeline.points).toBe(2)
    expect(comPlacar.lifeline.lives).toBe(2)
    expect(descobertas(comPlacar)).toContain('points-stay')
  })

  test('sem vidas a partida acaba, e o placar para de subir', () => {
    const fim = rodar('lives', [
      { type: 'connect', port: 'condition', enabled: true },
      { type: 'connect', port: 'life', enabled: true },
      { type: 'advance', seconds: 3 },
      { type: 'collide' },
      { type: 'collide' },
      { type: 'collide' },
      { type: 'advance', seconds: 5 },
    ])
    expect(fim.lifeline.lives).toBe(0)
    // O placar guardou o que foi feito antes do fim, e não subiu depois dele.
    expect(fim.lifeline.points).toBe(3)
    expect(descobertas(fim)).toContain('over')
    expect(evaluateExperimentation('lives', fim).passed).toBe(true)
    expect(sceneGoals('lives', fim).every((g) => g.complete)).toBe(true)
  })

  test('⚠️ a porta `condition` significa outra coisa aqui, e não vaza para as outras cenas', () => {
    // Ela é o "só enquanto estiver jogando" em `score` e `game-state`, e o fio do ponto em
    // `lives`. Um `if` esquecido faria a cena das vidas mexer no relógio da partida.
    const vidas = rodar('lives', [{ type: 'connect', port: 'condition', enabled: true }])
    expect(vidas.lifeline.scoring).toBe(true)
    expect(vidas.match.guarded).toBe(false)
    const placar = rodar('score', [{ type: 'connect', port: 'condition', enabled: true }])
    expect(placar.match.guarded).toBe(true)
    expect(placar.lifeline.scoring).toBe(false)
  })
})

describe('a legalidade das ações novas é por CENA', () => {
  test('⚠️ o gesto de uma cena é no-op na outra, e o estado não se mexe', () => {
    // `isSceneAction` é a única fonte de legalidade, e o motor trata ilegal como no-op para
    // que roteiro antigo ou pacote adulterado não derrube a aula no meio.
    const pares: [SceneId, SceneAction][] = [
      ['frames', { type: 'paint', column: 3 }],
      ['symmetry', { type: 'play', on: true }],
      ['pixel-vector', { type: 'cut', cell: 2 }],
      ['sheet-vs-sprite', { type: 'inspect', kind: 'pixel', zoom: 6 }],
      ['lives', { type: 'shift', offset: 20 }],
      ['world', { type: 'frame', index: 2 }],
    ]
    for (const [scene, acao] of pares) {
      expect(isSceneAction(acao, scene)).toBe(false)
      const inicial = initialScene({ scene })
      expect(stepScene({ scene }, inicial, acao)).toEqual(inicial)
    }
  })

  test('os números fora da faixa são recusados pela mesma régua', () => {
    expect(isSceneAction({ type: 'rate', perSecond: 40 }, 'frames')).toBe(false)
    expect(isSceneAction({ type: 'rate', perSecond: 8 }, 'frames')).toBe(true)
    expect(isSceneAction({ type: 'paint', column: 12 }, 'symmetry')).toBe(false)
    expect(isSceneAction({ type: 'mirror', on: true, line: 0 }, 'symmetry')).toBe(false)
    expect(isSceneAction({ type: 'inspect', kind: 'lapis', zoom: 3 }, 'pixel-vector')).toBe(false)
    expect(isSceneAction({ type: 'cut', cell: 2.5 }, 'sheet-vs-sprite')).toBe(false)
    expect(isSceneAction({ type: 'sprite', size: 200 }, 'sheet-vs-sprite')).toBe(false)
    expect(isSceneAction({ type: 'frame', index: 3 }, 'frames')).toBe(false)
  })
})
