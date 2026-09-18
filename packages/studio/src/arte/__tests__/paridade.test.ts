import { describe, expect, it } from 'bun:test'
import { FIGURAS } from '../catalogo'
import type { Ambiente, Figura } from '../pincel'
import { PincelGravador } from './gravador'
import { type AmbienteDoRuntime, desenhosDoRuntime } from './runtimeAtual'

/**
 * A PARIDADE: a arte portada desenha o mesmo que a arte do runtime, operação por operação.
 *
 * ⭐⭐ Este é o entregável central do lote, e o portão do dia em que o runtime do jogo passar a
 * ser GERADO deste módulo. Enquanto as duas cópias coexistirem, é ele que impede as duas de
 * divergirem — e ele morde de verdade: a comparação é a sequência inteira de chamadas e de
 * trocas de estado, com os números arredondados na terceira casa.
 *
 * ⚠️ Os FUNDOS não entram na comparação exata, e isso é deliberado e está documentado em
 * `fundos/floresta.ts`: o parallax do runtime sorteia com `Math.random()` e MUTA a posição a cada
 * quadro, o que não serve a uma cena que renderiza no servidor e re-renderiza a cada gesto. Deles
 * o teste cobra o que precisa continuar igual: as cores, na ordem em que são pintadas.
 */

const AMB: AmbienteDoRuntime = { t: 1234, chao: 220, largura: 480, altura: 270, gravidade: 0.6 }
const AMBIENTE: Ambiente = { t: AMB.t, chao: AMB.chao, gravidadeParaCima: false }

const runtime = desenhosDoRuntime(AMB)

function opsDoRuntime(desenho: string, sprite: unknown) {
  const p = new PincelGravador()
  const ctx = Object.assign(p, { canvas: { width: AMB.largura, height: AMB.altura } })
  const fn = runtime[desenho]
  if (!fn) throw new Error(`o runtime não expôs ${desenho}`)
  fn(ctx, sprite)
  return p.ops
}

function opsDoModulo(nome: keyof typeof FIGURAS, f: Figura, amb: Ambiente = AMBIENTE) {
  const p = new PincelGravador()
  FIGURAS[nome].desenhar(p, f, amb)
  return p.ops
}

const CAIXA = { x: 40, y: 90, w: 61, h: 64 }

describe('a arte portada desenha o MESMO que o runtime do jogo', () => {
  it('o Dino, correndo no chão', () => {
    const sprite = {
      ...CAIXA,
      skin: { kind: 'dino', color: '#5fb45f', fullH: CAIXA.h, ducking: false, onGround: true },
    }
    expect(opsDoModulo('dino', { ...CAIXA, cor: '#5fb45f' })).toEqual(
      opsDoRuntime('drawDino', sprite),
    )
  })

  it('o Dino no ar — a pose das perninhas e a sombra que encolhe', () => {
    const noAr = { ...CAIXA, y: 40 }
    const sprite = {
      ...noAr,
      skin: { kind: 'dino', color: '#5fb45f', fullH: noAr.h, ducking: false, onGround: false },
    }
    expect(opsDoModulo('dino', { ...noAr, cor: '#5fb45f', noAr: true })).toEqual(
      opsDoRuntime('drawDino', sprite),
    )
  })

  it('o Dino agachado', () => {
    const sprite = {
      ...CAIXA,
      skin: { kind: 'dino', color: '#7ad0ff', fullH: CAIXA.h, ducking: true, onGround: true },
    }
    expect(opsDoModulo('dino', { ...CAIXA, cor: '#7ad0ff', agachado: true })).toEqual(
      opsDoRuntime('drawDino', sprite),
    )
  })

  it('o Dino com a gravidade invertida — a sombra vai para o teto', () => {
    // O runtime lê o TOPO do mundo visível nesse caso; o módulo recebe o mesmo número pelo chão.
    const ambInvertido: AmbienteDoRuntime = { ...AMB, gravidade: -0.6, chao: 0 }
    const outro = desenhosDoRuntime(ambInvertido)
    const p = new PincelGravador()
    const sprite = {
      ...CAIXA,
      skin: { kind: 'dino', color: '#5fb45f', fullH: CAIXA.h, ducking: false, onGround: true },
    }
    const fn = outro.drawDino
    if (!fn) throw new Error('sem drawDino')
    fn(Object.assign(p, { canvas: { width: 480, height: 270 } }), sprite)
    expect(
      opsDoModulo(
        'dino',
        { ...CAIXA, cor: '#5fb45f' },
        { t: AMB.t, chao: 0, gravidadeParaCima: true },
      ),
    ).toEqual(p.ops)
  })

  it('o cacto, com os dois braços e a florzinha', () => {
    const caixa = { x: 300, y: 163, w: 31, h: 57 }
    const sprite = { ...caixa, skin: { kind: 'obstacle', shape: 'cactus', flap: 0 } }
    expect(opsDoModulo('cacto', caixa)).toEqual(opsDoRuntime('drawObstacleSprite', sprite))
  })

  it('a pedra', () => {
    const caixa = { x: 300, y: 188, w: 44, h: 32 }
    const sprite = { ...caixa, skin: { kind: 'obstacle', shape: 'rock', flap: 0 } }
    expect(opsDoModulo('pedra', caixa)).toEqual(opsDoRuntime('drawObstacleSprite', sprite))
  })

  it('o pássaro, com a asa batendo na mesma fase', () => {
    const caixa = { x: 300, y: 120, w: 57, h: 35 }
    const sprite = { ...caixa, skin: { kind: 'obstacle', shape: 'bird', flap: 1.7 } }
    expect(opsDoModulo('passaro', { ...caixa, fase: 1.7 })).toEqual(
      opsDoRuntime('drawObstacleSprite', sprite),
    )
  })

  it('o ovo, com o brilho no mesmo ponto do pisca', () => {
    const caixa = { x: 200, y: 180, w: 30, h: 38 }
    const sprite = { ...caixa, skin: { kind: 'egg', bob: 2.3 } }
    expect(opsDoModulo('ovo', { ...caixa, fase: 2.3 })).toEqual(
      opsDoRuntime('drawEggSprite', sprite),
    )
  })

  it('a nave, com o foguinho no mesmo tamanho', () => {
    const caixa = { x: 210, y: 170, w: 54, h: 62 }
    const sprite = { ...caixa, skin: { kind: 'ship', body: '#35e8ff', wings: '#2568ff' } }
    expect(opsDoModulo('nave', { ...caixa, cor: '#35e8ff', corSecundaria: '#2568ff' })).toEqual(
      opsDoRuntime('drawShip', sprite),
    )
  })

  it('a nave com as cores que a criança escolheu', () => {
    const caixa = { x: 210, y: 170, w: 80, h: 92 }
    const sprite = { ...caixa, skin: { kind: 'ship', body: '#ff7aa8', wings: '#ffd23f' } }
    expect(opsDoModulo('nave', { ...caixa, cor: '#ff7aa8', corSecundaria: '#ffd23f' })).toEqual(
      opsDoRuntime('drawShip', sprite),
    )
  })

  it('o asteroide, com o mesmo giro e os mesmos lados', () => {
    const caixa = { x: 120, y: 60, w: 36, h: 36 }
    const sprite = {
      ...caixa,
      skin: { kind: 'asteroid', color: '#8d8f9b', sides: 9, spin: 0.7, spinSpeed: 0.0013 },
    }
    expect(
      opsDoModulo('asteroide', {
        ...caixa,
        cor: '#8d8f9b',
        lados: 9,
        fase: 0.7,
        giroPorMs: 0.0013,
      }),
    ).toEqual(opsDoRuntime('drawAsteroidSprite', sprite))
  })

  it('o gorila, com os braços levantados', () => {
    const caixa = { x: 60, y: 100, w: 30, h: 36 }
    const sprite = { ...caixa, skin: { kind: 'gorilla', color: '#6b4a2b', side: 'left' } }
    expect(opsDoModulo('gorila', { ...caixa, cor: '#6b4a2b' })).toEqual(
      opsDoRuntime('drawGorilla', sprite),
    )
  })
})

describe('a comparação MORDE (anti-vácuo)', () => {
  it('uma cor trocada em um desenho já reprova', () => {
    const sprite = {
      ...CAIXA,
      skin: { kind: 'dino', color: '#5fb45f', fullH: CAIXA.h, ducking: false, onGround: true },
    }
    // Mesma figura, uma cor diferente: se a comparação não fosse exata, isto passaria.
    expect(opsDoModulo('dino', { ...CAIXA, cor: '#000000' })).not.toEqual(
      opsDoRuntime('drawDino', sprite),
    )
  })

  it('o relógio muda o desenho: dois instantes não produzem as mesmas operações', () => {
    const aqui = opsDoModulo('dino', { ...CAIXA, cor: '#5fb45f' })
    const depois = opsDoModulo('dino', { ...CAIXA, cor: '#5fb45f' }, { ...AMBIENTE, t: AMB.t + 90 })
    expect(depois).not.toEqual(aqui)
  })

  it('o gravador registra de verdade: um desenho qualquer produz dezenas de operações', () => {
    expect(opsDoModulo('dino', { ...CAIXA }).length).toBeGreaterThan(40)
  })
})

describe('as figuras que nasceram aqui desenham alguma coisa', () => {
  // A árvore, a chama e a banana não têm par no runtime (ver o comentário de cada uma).
  for (const nome of ['arvore', 'chama', 'banana', 'tiro'] as const) {
    it(`${nome} desenha`, () => {
      const caixa = FIGURAS[nome].caixa
      const ops = opsDoModulo(nome, { x: 0, y: 0, w: caixa.w, h: caixa.h })
      expect(ops.filter((o) => o.op === 'fill').length).toBeGreaterThan(0)
    })
  }
})
