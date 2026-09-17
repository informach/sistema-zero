import { describe, expect, test } from 'bun:test'
import { isSceneAction, type SceneAction, type SceneId } from './actions'
import {
  framesPreviewSlice,
  LUPA,
  MARCAS_NO_PAPEL,
  mirrorAxes,
  mirrorModeFor,
  NAVE_FOGO,
  onionFireLength,
  onionFireZone,
  symmetryCells,
  symmetryCopySeparated,
  symmetryMarkCells,
} from './atelie'
import { SCENE_MODELS } from './catalog'
import { openScene, stepScene } from './engine'
import { sceneReadout, sceneSituation } from './readout'
import { hydrateSceneState, initialScene, isSceneState, type SceneState } from './state'

/**
 * O ateliê de O Jogo do Meu Jeito, redesenhado no lote 5 do Raio-X (16/09/2026): a nave 32 × 32
 * com o fogo que pulsa, o fantasma que compara os dois fogos, os dois espelhos do Pinta no meio da
 * grade, uma lupa para as duas pedras e a largura do recorte na folha de 64 × 32. Proposta em
 * `community-kids/tmp/storyboard/analise/g4-atelie.md`.
 *
 * O que `pedidos-no-motor.test.ts` já garante (o pedido de cada meta derruba a meta, a previsão
 * revela antes da conclusão) não se repete aqui: este arquivo cobre as regras que fazem cada
 * descoberta valer, e que um refactor do motor quebraria em silêncio.
 */

function rodar(scene: SceneId, acoes: SceneAction[]): SceneState {
  return acoes.reduce((estado, acao) => stepScene({ scene }, estado, acao), initialScene({ scene }))
}
const descobertas = (state: SceneState) => state.evidence.discoveries
const faixa = (scene: SceneId, s: SceneState) =>
  sceneReadout(scene, s)
    .map((l) => `${l.label} ${l.value}`)
    .join(' · ')

describe('frames: a prévia que para mostra UM quadro', () => {
  const rapido = (segundos: number): SceneAction[] => [
    { type: 'rate', perSecond: 8 },
    { type: 'play', on: true },
    ...Array.from({ length: segundos * 20 }, () => ({ type: 'advance', seconds: 0.05 }) as const),
  ]

  test('⚠️⚠️ `paused-one` só cai parando DEPOIS de ver o fogo pulsar naquela velocidade', () => {
    // Parar no instante em que ligou não mostrou pulsação nenhuma.
    const cedo = rodar('frames', [...rapido(0), { type: 'play', on: false }])
    expect(descobertas(cedo)).not.toContain('paused-one')
    const devagar = rodar('frames', [
      { type: 'rate', perSecond: 2 },
      { type: 'play', on: true },
      { type: 'advance', seconds: 1 },
      { type: 'advance', seconds: 1 },
      { type: 'play', on: false },
    ])
    expect(descobertas(devagar)).not.toContain('paused-one')
    const visto = rodar('frames', [...rapido(1), { type: 'play', on: false }])
    expect(descobertas(visto)).toContain('movement')
    expect(descobertas(visto)).toContain('paused-one')
    // E o que a criança lê é o quadro que ficou.
    expect(visto.caption).toBe(`A prévia parou. Na tela ficou o quadro ${visto.animation.frame}.`)
  })

  test('as palavras do Pinta: Prévia e Velocidade em quadros por segundo', () => {
    const tocando = rodar('frames', rapido(1))
    expect(faixa('frames', tocando)).toBe(
      'quadro 1 de 2 · velocidade 8 quadros por segundo · prévia tocando',
    )
    expect(faixa('frames', initialScene({ scene: 'frames' }))).toContain('prévia parada')
    expect(rodar('frames', [{ type: 'play', on: true }]).caption).toBe('A prévia começou.')
  })

  test('⚠️⚠️ TODA parte do roteiro termina com a prévia parada: a faixa nunca diz "tocando" sobre um quadro só', () => {
    // O relógio do player para no fim de cada parte. ⚠️ Mudou de propósito (consertos do review da onda
    // B do lote 5, M1): a parte 4 terminava TOCANDO, e até a criança apertar "Ver a parte 5" a faixa
    // dizia "prévia: tocando" sobre um fogo congelado. Agora ela para, e a parte 5 toca de novo e para
    // no meio de uma troca, mudando o desenho.
    const roteiro = SCENE_MODELS.frames.script
    let s = openScene({ scene: 'frames' })
    const fimDaParte: SceneState[] = []
    for (const parte of roteiro) {
      for (const acao of parte.actions) s = stepScene({ scene: 'frames' }, s, acao)
      fimDaParte.push(s)
    }
    for (const [i, fim] of fimDaParte.entries()) {
      expect(fim.animation.playing, `parte ${i + 1}`).toBe(false)
      expect(faixa('frames', fim), `parte ${i + 1}`).toContain('prévia parada')
    }
    expect(descobertas(fimDaParte[3] as SceneState)).toContain('paused-one')
    // A parte 5 toca: há trocas NELA, e a prévia para num quadro inteiro.
    const quinta = roteiro[4]?.actions ?? []
    expect(quinta.some((a) => a.type === 'play' && a.on)).toBe(true)
    expect(quinta.filter((a) => a.type === 'advance').length).toBeGreaterThan(0)
  })

  test('⚠️⚠️ com a prévia tocando no motor e o relógio parado por fora, o pedido de `two-drawings` derruba a meta', () => {
    // Consertos do review da onda B do lote 5 (MÉDIO-4): a aba escondida e o F5 param o relógio do
    // player sem mandar `play off`. A tela mostra a prévia parada, e passar do quadro 1 para o 2 não
    // derrubava a meta, porque o motor seguia "tocando".
    const tocando = rodar('frames', rapido(1))
    const reaberto = hydrateSceneState(JSON.parse(JSON.stringify(tocando))) as SceneState
    expect(reaberto.animation.playing).toBe(true)
    const um = stepScene({ scene: 'frames' }, reaberto, { type: 'frame', index: 1 })
    // O primeiro toque PARA a prévia e mostra o quadro escolhido, sem contar meta nenhuma: o quadro
    // de antes veio do relógio.
    expect(um.animation.playing).toBe(false)
    expect(um.animation.frame).toBe(1)
    expect(um.caption).toBe('A prévia parou. Na tela está o quadro 1.')
    expect(descobertas(um)).not.toContain('two-drawings')
    expect(descobertas(um)).not.toContain('paused-one')
    const dois = stepScene({ scene: 'frames' }, um, { type: 'frame', index: 2 })
    expect(descobertas(dois)).toContain('two-drawings')
  })

  test('⚠️⚠️ com menos movimento, a fatia da prévia mostra EXATAMENTE um quadro da animação', () => {
    // Consertos do review da onda B do lote 5 (A1, decisão da orquestração): com a fatia de 0,2 s a 8
    // por segundo, o que aparecia era a paridade amostrada, e "rápido" ficava igual a "devagar".
    const trocasVistas = (rate: number, fatia: number, fatias: number) => {
      let s = rodar('frames', [
        { type: 'rate', perSecond: rate },
        { type: 'play', on: true },
      ])
      const vistos: number[] = []
      for (let i = 0; i < fatias; i++) {
        s = stepScene({ scene: 'frames' }, s, { type: 'advance', seconds: fatia })
        vistos.push(s.animation.frame)
      }
      return vistos.filter((q, i) => i > 0 && q !== vistos[i - 1]).length
    }
    for (const rate of [2, 4, 8, 12]) {
      const fatia = framesPreviewSlice(rate)
      // Cada fatia troca o quadro: em N fatias, N − 1 trocas à vista, no ritmo pedido.
      expect(trocasVistas(rate, fatia, 16), `${rate} por segundo`).toBe(15)
    }
    // Anti-vácuo: com a fatia comum de 0,2 s, a 8 por segundo o quadro à vista quase não muda.
    expect(trocasVistas(8, 0.2, 16)).toBeLessThan(15)
  })
})

describe('onion-skin: o fogo cresce, e o corpo fica', () => {
  test('⚠️⚠️ a régua do fogo é a ALTURA desenhada: quase igual, um pouco maior, passou da borda', () => {
    expect(onionFireLength(0)).toBe(NAVE_FOGO.pequeno)
    expect(onionFireZone(8)).toBe('quase')
    expect(onionFireZone(12)).toBe('pouco')
    expect(onionFireZone(28)).toBe('pouco')
    // Em 28 o fogo encosta exatamente na borda do quadro; em 32 passa dela e é cortado.
    expect(NAVE_FOGO.saida + onionFireLength(28)).toBe(NAVE_FOGO.borda)
    expect(onionFireZone(32)).toBe('passou')
    // O fogo de fábrica (40) passa da borda: sem o fantasma ela chuta, e com ele vê que chutou.
    expect(onionFireZone(initialScene({ scene: 'onion-skin' }).animation.shift)).toBe('passou')
  })

  test('⚠️ as duas metas do fogo pedem o QUADRO 2 na tela', () => {
    // No quadro 1 o fogo 2 não está desenhado: mudar o tamanho dele ali não é ver nada.
    const noUm = rodar('onion-skin', [{ type: 'shift', offset: 20 }])
    expect(descobertas(noUm)).toEqual([])
    const comFantasmaNoUm = rodar('onion-skin', [
      { type: 'onion', on: true },
      { type: 'shift', offset: 20 },
    ])
    expect(descobertas(comFantasmaNoUm)).not.toContain('even-step')
  })

  test('⚠️⚠️ sem o fantasma, NENHUM número do fogo na faixa nem na frase', () => {
    // "passo do quadro 2 52" dava a medida que a cena diz que não dá para saber.
    const cego = rodar('onion-skin', [
      { type: 'frame', index: 2 },
      { type: 'shift', offset: 20 },
    ])
    const texto = `${faixa('onion-skin', cego)} | ${cego.caption} | ${sceneSituation('onion-skin', { ...cego, caption: '' })}`
    expect(texto).not.toMatch(/\d{2}|um pouco|quase|passou/)
    expect(sceneReadout('onion-skin', cego).every((l) => l.tone !== 'alert')).toBe(true)
    const comparado = stepScene({ scene: 'onion-skin' }, cego, { type: 'onion', on: true })
    expect(faixa('onion-skin', comparado)).toContain('o fogo 2 cresceu um pouco')
  })
})

describe('symmetry: os dois espelhos do Pinta, no meio da grade', () => {
  test('desligado pinta um traço; lado a lado copia na coluna espelhada; cima e baixo na linha', () => {
    const solto = rodar('symmetry', [{ type: 'trace', piece: 'asa' }])
    expect(solto.mirror.marks).toEqual(['asa'])
    expect(descobertas(solto)).toEqual(['one-side'])
    const lado = rodar('symmetry', [
      { type: 'mirror-mode', mode: 'x' },
      { type: 'trace', piece: 'asa' },
    ])
    expect(lado.mirror.marks).toEqual(['asa', 'asa|x'])
    // A asa ocupa as colunas 1 a 3; a cópia, 12 a 14 (o meio é entre a 7 e a 8).
    expect(symmetryMarkCells('asa|x').map(([x]) => x)).toEqual(
      symmetryMarkCells('asa').map(([x]) => 15 - x),
    )
    const cimaBaixo = symmetryMarkCells('asa|y')
    expect(cimaBaixo.map(([, y]) => y)).toEqual(symmetryMarkCells('asa').map(([, y]) => 15 - y))
  })

  test('⚠️⚠️ o espelho de cima e de baixo só conta DEPOIS do lado a lado', () => {
    // É o caso novo que a criança prevê com o que já viu; a bancada o deixa fechado até lá.
    const direto = rodar('symmetry', [
      { type: 'mirror-mode', mode: 'y' },
      { type: 'trace', piece: 'ponta' },
    ])
    expect(descobertas(direto)).not.toContain('axis-decides')
    const emOrdem = rodar('symmetry', [
      { type: 'mirror-mode', mode: 'x' },
      { type: 'trace', piece: 'asa' },
      { type: 'mirror-mode', mode: 'y' },
      { type: 'dot', x: 2, y: 3 },
    ])
    expect(descobertas(emOrdem)).toEqual(['two-sides', 'axis-decides'])
    expect(emOrdem.mirror.marks.at(-1)).toBe('p:2,3|y')
  })

  test('pintar de novo não duplica, a cópia do último traço é a NOVA, e o papel tem teto', () => {
    const repetido = rodar('symmetry', [
      { type: 'mirror-mode', mode: 'x' },
      { type: 'trace', piece: 'asa' },
      { type: 'trace', piece: 'cabine' },
      { type: 'trace', piece: 'asa' },
    ])
    expect(repetido.mirror.marks).toEqual(['cabine', 'cabine|x', 'asa', 'asa|x'])
    const novas = symmetryCells(repetido.mirror.marks).filter((c) => c.nova)
    expect(novas.map((c) => [c.x, c.y])).toEqual(symmetryMarkCells('asa|x'))
    const cheio = rodar('symmetry', [
      { type: 'mirror-mode', mode: 'x' },
      ...Array.from(
        { length: 40 },
        (_, i): SceneAction => ({ type: 'dot', x: i % 8, y: Math.floor(i / 8) }),
      ),
    ])
    expect(cheio.mirror.marks.length).toBe(MARCAS_NO_PAPEL)
    expect(isSceneState(cheio)).toBe(true)
    expect(
      rodar('symmetry', [{ type: 'trace', piece: 'asa' }, { type: 'clear-paper' }]).mirror.marks,
    ).toEqual([])
  })

  test('⚠️ desligar o espelho guarda qual era; o `mirror` e o `paint` antigos continuam legais', () => {
    const desligado = rodar('symmetry', [
      { type: 'mirror-mode', mode: 'y' },
      { type: 'mirror-mode', mode: 'off' },
    ])
    expect(desligado.mirror.on).toBe(false)
    expect(desligado.mirror.axis).toBe('y')
    // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5, B4): a faixa conta os GESTOS.
    expect(faixa('symmetry', desligado)).toBe(
      'espelho desligado · seus traços 0 · cópias do espelho 0',
    )
    // O `mirror` de antes do lote 5 liga o lado a lado; o `paint {column}` vira um traço de pé.
    const antigo = rodar('symmetry', [
      { type: 'mirror', on: true, line: 9 },
      { type: 'paint', column: 3 },
    ])
    expect(antigo.mirror.marks).toEqual(['c:3', 'c:3|x'])
    expect(descobertas(antigo)).toEqual(['two-sides'])
    expect(isSceneAction({ type: 'dot', x: 16, y: 0 }, 'symmetry')).toBe(false)
    expect(isSceneAction({ type: 'trace', piece: 'rabo' }, 'symmetry')).toBe(false)
    expect(isSceneAction({ type: 'mirror-mode', mode: 'z' }, 'symmetry')).toBe(false)
    expect(isSceneAction({ type: 'clear-paper' }, 'frames')).toBe(false)
  })

  test('⚠️ o retrato com marca que ninguém sabe desenhar é recusado', () => {
    const s = initialScene({ scene: 'symmetry' })
    expect(isSceneState({ ...s, mirror: { ...s.mirror, marks: ['asa|z'] } })).toBe(false)
    expect(isSceneState({ ...s, mirror: { ...s.mirror, marks: ['p:16,2'] } })).toBe(false)
    expect(isSceneState({ ...s, mirror: { ...s.mirror, axis: 'z' } })).toBe(false)
  })
})

describe('pixel-vector: UMA lupa para as duas pedras', () => {
  test('⚠️⚠️ o limite de "perto" é o MESMO no motor, na faixa e na frase', () => {
    const dois = rodar('pixel-vector', [{ type: 'inspect', kind: 'pixel', zoom: LUPA.perto - 1 }])
    expect(descobertas(dois)).toEqual([])
    expect(faixa('pixel-vector', dois)).toContain('de longe')
    const tres = rodar('pixel-vector', [{ type: 'inspect', kind: 'pixel', zoom: LUPA.perto }])
    expect(descobertas(tres)).toEqual(['stairs'])
    expect(faixa('pixel-vector', tres)).toContain('de perto')
    expect(sceneSituation('pixel-vector', { ...tres, caption: '' })).toContain('Olhe as bordas')
    const pontos = rodar('pixel-vector', [{ type: 'inspect', kind: 'pixel', zoom: LUPA.pontos }])
    expect(descobertas(pontos)).toEqual(['stairs', 'smooth'])
  })

  test('⚠️ qual pedra a lupa "olhava" não decide mais nada', () => {
    const pixel = rodar('pixel-vector', [{ type: 'inspect', kind: 'pixel', zoom: 7 }])
    const vetor = rodar('pixel-vector', [{ type: 'inspect', kind: 'vector', zoom: 7 }])
    expect(descobertas(pixel)).toEqual(descobertas(vetor))
    expect(faixa('pixel-vector', pixel)).toBe(faixa('pixel-vector', vetor))
  })
})

describe('sheet-vs-sprite: a largura do recorte na folha da nave', () => {
  test('cada largura mostra uma coisa no jogo, e o tamanho no jogo espera a nave inteira', () => {
    const inteira = rodar('sheet-vs-sprite', [{ type: 'crop', width: 64 }])
    expect(descobertas(inteira)).toEqual(['squeezed'])
    expect(inteira.sheet.loaded).toBe(true)
    const antesDoRecorte = rodar('sheet-vs-sprite', [{ type: 'sprite', size: 80 }])
    // ⚠️ Um toque no + fechava a única meta da Aula 6 sem a criança olhar a folha nem o recorte.
    expect(descobertas(antesDoRecorte)).toEqual([])
    const tudo = rodar('sheet-vs-sprite', [
      { type: 'crop', width: 16 },
      { type: 'crop', width: 32 },
      { type: 'sprite', size: 80 },
    ])
    expect(descobertas(tudo)).toEqual(['crop-half', 'crop-whole', 'size-apart'])
    expect(tudo.caption).toBe('No jogo, a nave tem 80 por 80.')
    expect(faixa('sheet-vs-sprite', tudo)).toBe(
      'recorte 32 por 32 · no jogo 80 por 80 · quadro 1 de 2',
    )
  })

  test('⚠️ o quadro recortado fica preso ao que cabe na largura', () => {
    const naFolhaInteira = rodar('sheet-vs-sprite', [{ type: 'cut', cell: 2 }])
    expect(naFolhaInteira.sheet.cell).toBe(1)
    const naMetade = rodar('sheet-vs-sprite', [
      { type: 'crop', width: 16 },
      { type: 'cut', cell: 4 },
      { type: 'crop', width: 32 },
    ])
    expect(naMetade.sheet.cell).toBe(2)
    expect(isSceneAction({ type: 'crop', width: 24 }, 'sheet-vs-sprite')).toBe(false)
  })

  test('⚠️⚠️ a abertura é o jogo VAZIO: a resposta da previsão da Aula 6 não está na tela antes do palpite', () => {
    // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5, A4): a cena abria com o recorte
    // de 64, e o jogo já mostrava as duas naves espremidas embaixo da pergunta "se o jogo mostrar a
    // folha inteira, o que aparece?". A parte 1 da demonstração não mudava um pixel.
    const abertura = openScene({ scene: 'sheet-vs-sprite' })
    expect(abertura.sheet.loaded).toBe(false)
    expect(sceneSituation('sheet-vs-sprite', abertura)).not.toMatch(/esprem|duas naves/)
    expect(sceneSituation('sheet-vs-sprite', abertura)).toContain('o jogo está vazio')
    expect(faixa('sheet-vs-sprite', abertura)).toBe('recorte nenhum · no jogo 54 por 54')
    // A parte 1 do roteiro é a que CARREGA a folha inteira, e é ela que mostra as naves espremidas.
    const [primeira] = SCENE_MODELS['sheet-vs-sprite'].script
    const depois = (primeira?.actions ?? []).reduce(
      (s, a) => stepScene({ scene: 'sheet-vs-sprite' }, s, a),
      abertura,
    )
    expect(depois.sheet.loaded).toBe(true)
    expect(descobertas(depois)).toEqual(['squeezed'])
  })
})

describe('fill-stroke e shading: a demonstração nunca passa por um estado sem narração', () => {
  test('⚠️⚠️ a pedra não some no meio da parte 2 (o contorno volta ANTES de o preenchimento sair)', () => {
    let s = openScene({ scene: 'fill-stroke' })
    for (const parte of SCENE_MODELS['fill-stroke'].script)
      for (const acao of parte.actions) {
        s = stepScene({ scene: 'fill-stroke' }, s, acao)
        expect(s.ink.fill || s.ink.stroke, parte.id).toBe(true)
      }
  })

  test('⚠️⚠️ na parte 3 o sol muda ANTES de os tons voltarem: a sombra nunca aparece do lado errado', () => {
    let s = openScene({ scene: 'shading' })
    const [, , terceira] = SCENE_MODELS.shading.script
    for (const parte of SCENE_MODELS.shading.script.slice(0, 2))
      for (const acao of parte.actions) s = stepScene({ scene: 'shading' }, s, acao)
    for (const acao of terceira?.actions ?? []) {
      s = stepScene({ scene: 'shading' }, s, acao)
      if (s.light.shade) expect(s.light.side).toBe('right')
    }
    expect(s.evidence.discoveries).toContain('side')
  })

  test('as palavras do Pinta na faixa: Preenchimento, Contorno, Sem cor; o sol e os tons de azul', () => {
    const semContorno = rodar('fill-stroke', [{ type: 'ink', part: 'stroke', on: false }])
    expect(faixa('fill-stroke', semContorno)).toBe('preenchimento azul · contorno Sem cor')
    const redonda = rodar('shading', [{ type: 'shade', on: true }])
    expect(faixa('shading', redonda)).toBe('o sol está na esquerda · tons de azul 3')
    expect(sceneSituation('shading', { ...redonda, caption: '' })).toBe(
      'Sol na esquerda, sombra na direita.',
    )
  })
})

describe('⚠️⚠️ o retrato de antes do lote 5 abre', () => {
  test('sem `mirror.axis`, `mirror.marks` e `sheet.width`, o retrato é completado e vale', () => {
    const atual = initialScene({ scene: 'sheet-vs-sprite' })
    const { axis: _a, marks: _m, ...espelhoAntigo } = atual.mirror
    const { width: _w, loaded: _l, ...folhaAntiga } = atual.sheet
    const { strokes: _s, copies: _c, ...espelhoSemGestos } = espelhoAntigo
    const antigo = {
      ...atual,
      mirror: espelhoSemGestos,
      sheet: { ...folhaAntiga, cell: 3, size: 48 },
    }
    expect(isSceneState(antigo)).toBe(false)
    const hidratado = hydrateSceneState(antigo) as SceneState
    expect(isSceneState(hidratado)).toBe(true)
    expect(hidratado.mirror.marks).toEqual([])
    expect(hidratado.mirror.axis).toBe('x')
    expect(hidratado.sheet.width).toBe(64)
    // ⚠️ Consertos do review da onda B do lote 5: o retrato de antes MOSTRAVA o recorte, e reabrir não
    // esvazia o jogo; os contadores de gesto do espelho começam do zero.
    expect(hidratado.sheet.loaded).toBe(true)
    expect([hidratado.mirror.strokes, hidratado.mirror.copies]).toEqual([0, 0])
    // O que o retrato trazia de mundo continua igual.
    expect(hidratado.sheet.size).toBe(48)
  })
})

describe('⚠️⚠️ consertos do review da onda B do lote 5 (G4)', () => {
  test('symmetry (A3): a cópia COLADA no traço não derruba meta nenhuma, e a frase conta o que houve', () => {
    // A cabine (coluna 7) e a ponta (6 e 7) moram no meio: com o lado a lado a cópia encosta, e é o
    // desenho da resposta ERRADA da previsão ("grudada na primeira").
    expect(symmetryCopySeparated('cabine', 'x')).toBe(false)
    expect(symmetryCopySeparated('ponta', 'x')).toBe(false)
    expect(symmetryCopySeparated('asa', 'x')).toBe(true)
    expect(symmetryCopySeparated('p:7,3', 'x')).toBe(false)
    expect(symmetryCopySeparated('p:6,3', 'x')).toBe(true)
    expect(symmetryCopySeparated('cabine', 'y')).toBe(false)
    const cabine = rodar('symmetry', [
      { type: 'mirror-mode', mode: 'x' },
      { type: 'trace', piece: 'cabine' },
    ])
    expect(descobertas(cabine)).toEqual([])
    expect(cabine.caption).toBe('Você pintou a cabine bem no meio. A cópia encostou no traço.')
    // A cabine continua pintando, com a cópia.
    expect(cabine.mirror.marks).toEqual(['cabine', 'cabine|x'])
    const toqueNoMeio = rodar('symmetry', [
      { type: 'mirror-mode', mode: 'x' },
      { type: 'dot', x: 7, y: 10 },
    ])
    expect(descobertas(toqueNoMeio)).toEqual([])
    const asa = stepScene({ scene: 'symmetry' }, cabine, { type: 'trace', piece: 'asa' })
    expect(descobertas(asa)).toEqual(['two-sides'])
    // E no de cima e de baixo a cabine também encosta (linha 7 copia para a 8).
    const cimaBaixo = [
      { type: 'mirror-mode', mode: 'y' },
      { type: 'trace', piece: 'cabine' },
    ] as const
    expect(descobertas(rodar('symmetry', [...cimaBaixo]))).toEqual([])
    expect(
      descobertas([...cimaBaixo].reduce((s, a) => stepScene({ scene: 'symmetry' }, s, a), asa)),
    ).not.toContain('axis-decides')
  })

  test('symmetry (decisão 3): os dois espelhos são DUAS chaves; com as duas ligadas, três cópias e nenhuma meta', () => {
    expect(mirrorModeFor(true, true)).toBe('xy')
    expect(mirrorModeFor(false, true)).toBe('y')
    expect(mirrorModeFor(false, false)).toBe('off')
    expect(mirrorAxes(true, 'xy')).toEqual({ x: true, y: true })
    expect(mirrorAxes(false, 'xy')).toEqual({ x: false, y: false })
    expect(mirrorAxes(true, 'y')).toEqual({ x: false, y: true })
    const dois = rodar('symmetry', [
      { type: 'mirror-mode', mode: 'x' },
      { type: 'trace', piece: 'asa' },
      { type: 'mirror-mode', mode: 'xy' },
      { type: 'trace', piece: 'asa' },
    ])
    // A asa do lado a lado contou; com os DOIS ligados, nada mais cai (o de cima e de baixo pede ele só).
    expect(descobertas(dois)).toEqual(['two-sides'])
    expect(dois.caption).toBe('Você pintou a asa. Os dois espelhos pintaram três cópias.')
    expect(dois.mirror.marks.slice(-4)).toEqual(['asa', 'asa|x', 'asa|y', 'asa|xy'])
    // A cópia na diagonal é a asa virada nos dois sentidos, e as TRÊS cópias do último traço são novas.
    expect(symmetryMarkCells('asa|xy')).toEqual(
      symmetryMarkCells('asa').map(([x, y]) => [15 - x, 15 - y]),
    )
    expect(symmetryCells(dois.mirror.marks).filter((c) => c.nova)).toHaveLength(30)
    expect(isSceneState(dois)).toBe(true)
    expect(isSceneAction({ type: 'mirror-mode', mode: 'xy' }, 'symmetry')).toBe(true)
    expect(faixa('symmetry', dois)).toBe('espelho os dois · seus traços 2 · cópias do espelho 4')
    expect(sceneSituation('symmetry', { ...dois, caption: '' })).toBe(
      'Os dois espelhos ligados, na grade da nave.',
    )
  })

  test('symmetry (B4): a faixa conta cada GESTO, mesmo o traço repetido; apagar o papel zera', () => {
    const s = rodar('symmetry', [
      { type: 'trace', piece: 'asa' },
      { type: 'trace', piece: 'ponta' },
      { type: 'trace', piece: 'cabine' },
      { type: 'mirror-mode', mode: 'x' },
      { type: 'mirror-mode', mode: 'x' },
      { type: 'trace', piece: 'asa' },
    ])
    // Antes: "você pintou 3 · no papel 4" depois do quarto toque (a asa repetida não entrava).
    expect(faixa('symmetry', s)).toBe('espelho lado a lado · seus traços 4 · cópias do espelho 1')
    // As MARCAS no papel não repetem o traço (3 da criança, 4 com a cópia); a faixa conta o gesto.
    // ⚠️ `symmetryCounts` saiu (full review de 16/09/2026): só este teste a usava.
    expect(s.mirror.marks.filter((m) => !m.includes('|'))).toHaveLength(3)
    expect(s.mirror.marks).toHaveLength(4)
    const limpo = stepScene({ scene: 'symmetry' }, s, { type: 'clear-paper' })
    expect([limpo.mirror.strokes, limpo.mirror.copies]).toEqual([0, 0])
    const torto = { ...s, mirror: { ...s.mirror, strokes: -1 } }
    expect(isSceneState(torto)).toBe(false)
  })

  test('symmetry (BAIXO-1): o caso que pinta abre com o papel em branco e os contadores em zero', () => {
    const aberto = openScene({
      scene: 'symmetry',
      setup: {
        actions: [
          { type: 'mirror-mode', mode: 'x' },
          { type: 'trace', piece: 'asa' },
        ],
      },
    })
    expect(aberto.mirror.marks).toEqual([])
    expect([aberto.mirror.strokes, aberto.mirror.copies]).toEqual([0, 0])
    // O espelho escolhido pelo professor fica.
    expect(mirrorAxes(aberto.mirror.on, aberto.mirror.axis)).toEqual({ x: true, y: false })
  })

  test('onion-skin (A2, B3): o fantasma é TRACEJADO, e no quadro 1 o motor não repete a frase da parte 4', () => {
    const noDois = rodar('onion-skin', [
      { type: 'frame', index: 2 },
      { type: 'onion', on: true },
    ])
    expect(noDois.caption).toBe('O fogo tracejado é o do quadro 1.')
    expect(sceneSituation('onion-skin', { ...noDois, caption: '' })).toBe(
      'Fantasma ligado: o quadro 2 na tela, e o fogo do quadro 1 tracejado.',
    )
    const volta = stepScene({ scene: 'onion-skin' }, noDois, { type: 'frame', index: 1 })
    expect(volta.caption).toBe('')
    const parte4 = SCENE_MODELS['onion-skin'].script[3]?.caption
    expect(sceneSituation('onion-skin', volta)).not.toBe(parte4)
    // Nenhum texto do modelo diz "por baixo" nem "clarinho" para um desenho que está por cima.
    const textos = JSON.stringify(SCENE_MODELS['onion-skin'])
    expect(textos).not.toMatch(/por baixo|clarinho|fraquinho/)
  })

  test('sheet-vs-sprite (B8, B9, B7): a nave do jogo bem maior, o fogo nomeado ao trocar o quadro, oito trocas', () => {
    const recortado = rodar('sheet-vs-sprite', [{ type: 'crop', width: 32 }])
    // Um toque no + (8) da bancada: 62 ainda é quase a nave de fábrica.
    const umToque = stepScene({ scene: 'sheet-vs-sprite' }, recortado, { type: 'sprite', size: 62 })
    expect(descobertas(umToque)).not.toContain('size-apart')
    const grande = stepScene({ scene: 'sheet-vs-sprite' }, umToque, { type: 'sprite', size: 78 })
    expect(descobertas(grande)).toContain('size-apart')
    const pequena = stepScene({ scene: 'sheet-vs-sprite' }, recortado, { type: 'sprite', size: 38 })
    expect(descobertas(pequena)).toContain('size-apart')
    const quadro2 = stepScene({ scene: 'sheet-vs-sprite' }, recortado, { type: 'cut', cell: 2 })
    expect(quadro2.caption).toBe('Recorte no quadro 2: no jogo, a nave com o fogo grande.')
    const cortes = SCENE_MODELS['sheet-vs-sprite'].script[2]?.actions ?? []
    expect(cortes.filter((a) => a.type === 'cut')).toHaveLength(8)
  })

  test('fill-stroke (B11) e shading (B14): cada parte muda UMA coisa, e a legenda não fala de dois tons', () => {
    // A volta do contorno era a primeira ação da parte seguinte, e por meio segundo a legenda 1
    // ("sobra o preenchimento") ficava sobre a pedra já com as duas cores.
    for (const parte of SCENE_MODELS['fill-stroke'].script)
      expect(parte.actions, parte.caption).toHaveLength(1)
    expect(SCENE_MODELS.shading.script[1]?.caption).toBe('Com um tom só, a bola parece um adesivo.')
  })

  test('pixel-vector (M5): "perto" é 4, e a grade entra em 5', () => {
    expect(LUPA.perto).toBe(4)
    expect(LUPA.grade).toBe(5)
    expect(
      descobertas(rodar('pixel-vector', [{ type: 'inspect', kind: 'pixel', zoom: 3 }])),
    ).toEqual([])
  })
})
