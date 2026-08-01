import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import type { JSStatement } from '#ir'
import { parseJS } from '../../../parsers/js'
import {
  type CanvasSpy,
  characterAt,
  installCanvasSpy,
  loadRuntime,
  startPlaying,
} from './kitHarness'

/**
 * Caixa de colisão REDONDA (v0.55.0) — "não seria possível escolher para cada
 * sprite se quer usar círculo ou retângulo?".
 *
 * A promessa é estreita de propósito: o círculo vale para ENCOSTAR (encostar, o
 * par que se encosta, o golpe, o pisar e o clique). O empurrão sólido, os tiles
 * e as bordas seguem quadrados — resolver colisão em círculo é outro algoritmo
 * e mudaria todo jogo de plataforma que já existe.
 */

let spy: CanvasSpy & { restore: () => void }

beforeAll(() => {
  spy = installCanvasSpy()
})

afterAll(() => {
  spy.restore()
})

beforeEach(() => {
  document.body.innerHTML = ''
  spy.clear()
})

describe('gk — encostar respeita a FORMA da caixa', () => {
  it('sem escolher nada, continua tudo quadrado (nada muda para quem já tem jogo)', async () => {
    const h = loadRuntime()
    await startPlaying(h)

    const a = characterAt(h, 0, 0, 40, 40)
    const b = characterAt(h, 38, 38, 40, 40) // só os CANTOS se cruzam

    expect(h.api.touching(a, b)).toBe(true)
  })

  it('redondo × redondo: o canto vazio deixa de encostar', async () => {
    const h = loadRuntime()
    await startPlaying(h)

    const a = characterAt(h, 0, 0, 40, 40)
    const b = characterAt(h, 38, 38, 40, 40)
    h.api.setHitboxShape(a, 'circulo', 0)
    h.api.setHitboxShape(b, 'circulo', 0)

    // Centros em (20,20) e (58,58): distância ~53,7 contra 20+20 de raio.
    expect(h.api.touching(a, b)).toBe(false)

    // De frente, na mesma linha, os dois círculos se encostam normalmente.
    h.api.placeCharacter(b, 35, 0)
    expect(h.api.touching(a, b)).toBe(true)
  })

  it('redondo × quadrado mede pelo ponto mais perto do retângulo', async () => {
    const h = loadRuntime()
    await startPlaying(h)

    const bola = characterAt(h, 0, 0, 40, 40)
    h.api.setHitboxShape(bola, 'circulo', 0)
    const parede = characterAt(h, 38, 38, 40, 40)

    expect(h.api.touching(bola, parede)).toBe(false)
    // A ordem dos dois não pode mudar a resposta.
    expect(h.api.touching(parede, bola)).toBe(false)

    h.api.placeCharacter(parede, 30, 10)
    expect(h.api.touching(bola, parede)).toBe(true)
    expect(h.api.touching(parede, bola)).toBe(true)
  })

  it('a forma volta a ser quadrada quando a criança escolhe quadrada', async () => {
    const h = loadRuntime()
    await startPlaying(h)

    const a = characterAt(h, 0, 0, 40, 40)
    const b = characterAt(h, 38, 38, 40, 40)
    h.api.setHitboxShape(a, 'circulo', 0)
    expect(h.api.touching(a, b)).toBe(false)

    h.api.setHitboxShape(a, 'retangulo', 0)
    expect(h.api.touching(a, b)).toBe(true)
  })

  it('o raio pedido manda; 0 = calculado pelo tamanho, e acompanha o sprite crescer', async () => {
    const h = loadRuntime()
    await startPlaying(h)

    const bola = characterAt(h, 0, 0, 40, 40)
    const alvo = characterAt(h, 60, 0, 10, 10)
    h.api.setHitboxShape(bola, 'circulo', 0)
    h.api.setHitboxShape(alvo, 'circulo', 0)
    expect(h.api.touching(bola, alvo)).toBe(false)

    // Raio explícito alcança o alvo.
    h.api.setHitboxShape(bola, 'circulo', 60)
    expect(h.api.touching(bola, alvo)).toBe(true)

    // De volta ao automático, CRESCER o sprite cresce o círculo — era o bug do
    // raio congelado no nascimento.
    h.api.setHitboxShape(bola, 'circulo', 0)
    expect(h.api.touching(bola, alvo)).toBe(false)
    h.api.setProperty(bola, 'w', 200)
    h.api.setProperty(bola, 'h', 200)
    expect(h.api.touching(bola, alvo)).toBe(true)
  })

  it('a caixa deslocada ("só os pés") move o círculo junto', async () => {
    const h = loadRuntime()
    await startPlaying(h)

    const heroi = characterAt(h, 0, 0, 40, 80)
    h.api.setHitboxShape(heroi, 'circulo', 0)
    // Caixa só nos pés: círculo de raio 10 centrado em (20, 70).
    h.api.setHitbox(heroi, 0, 60, 40, 20)

    const naCabeca = characterAt(h, 15, 0, 10, 10)
    const nosPes = characterAt(h, 15, 65, 10, 10)
    expect(h.api.touching(heroi, naCabeca)).toBe(false)
    expect(h.api.touching(heroi, nosPes)).toBe(true)
  })

  it('o clique no personagem também fica redondo (o canto não conta)', async () => {
    const h = loadRuntime()
    await startPlaying(h)

    const bolha = characterAt(h, 0, 0, 40, 40)
    expect(h.api.pointIn(2, 2, bolha)).toBe(true) // quadrada: o canto vale

    h.api.setHitboxShape(bolha, 'circulo', 0)
    expect(h.api.pointIn(2, 2, bolha)).toBe(false)
    expect(h.api.pointIn(20, 20, bolha)).toBe(true)
  })

  it('"se encostam (círculo)?" agora concorda com a caixa redonda', async () => {
    const h = loadRuntime()
    await startPlaying(h)

    const a = characterAt(h, 0, 0, 40, 40)
    const b = characterAt(h, 38, 38, 40, 40)
    // O bloco manual mede o MESMO círculo, mesmo sem ninguém mudar a forma.
    expect(h.api.touchCircle(a, b)).toBe(false)

    h.api.setHitboxShape(a, 'circulo', 0)
    h.api.setHitboxShape(b, 'circulo', 0)
    expect(h.api.touchCircle(a, b)).toBe(h.api.touching(a, b))
  })
})

describe('gk — molde redondo (é assim que tiro e inimigo ficam redondos)', () => {
  it('quem nasce do molde já vem redondo, inclusive depois de reciclado', async () => {
    const h = loadRuntime()
    await startPlaying(h)

    h.api.defineMold('bolha', { w: 40, h: 40, shape: 'circulo' })
    const alvo = characterAt(h, 38, 38, 40, 40)

    const primeira = h.api.spawnFromMold('bolha', 0, 0) as Record<string, unknown>
    expect(h.api.touching(primeira, alvo)).toBe(false) // redonda: o canto não pega

    h.api.recycle(primeira)
    const reciclada = h.api.spawnFromMold('bolha', 0, 0) as Record<string, unknown>
    expect(reciclada).toBe(primeira) // é o MESMO objeto do pool
    expect(h.api.touching(reciclada, alvo)).toBe(false)
  })

  it('molde sem forma continua quadrado', async () => {
    const h = loadRuntime()
    await startPlaying(h)

    h.api.defineMold('caixote', { w: 40, h: 40 })
    const alvo = characterAt(h, 38, 38, 40, 40)
    const caixote = h.api.spawnFromMold('caixote', 0, 0) as Record<string, unknown>

    expect(h.api.touching(caixote, alvo)).toBe(true)
  })
})

describe('gk — o overlay desenha a forma de verdade', () => {
  it('círculo em quem é círculo, retângulo no resto', async () => {
    const h = loadRuntime()
    await startPlaying(h)

    const bola = characterAt(h, 100, 50, 40, 40)
    h.api.setHitboxShape(bola, 'circulo', 0)
    characterAt(h, 10, 10, 20, 20)
    h.api.showHitboxes()

    h.nextFrame(16)

    // arc(cx, cy, r, ...) — centro da caixa, raio pelo menor lado.
    expect(spy.arcs.map((a) => a.slice(0, 3))).toContainEqual([120, 70, 20])
    expect(spy.strokes).toContainEqual([10, 10, 20, 20])
  })
})

describe('gk — código gerado e a volta pela Ponte', () => {
  function compile(stmts: JSStatement[]): string {
    return compileStatements(stmts, 0).trim()
  }

  it('molde sem forma gera o MESMO código de antes (projeto antigo intocado)', () => {
    const semForma: JSStatement[] = [
      {
        type: 'gk:defineMold',
        name: 'inimigo',
        w: 40,
        h: 40,
        health: 20,
        speed: 120,
        damage: 10,
        color: '#e94f4f',
        image: '',
        look: '',
      },
    ]
    expect(compile(semForma)).toBe(
      'SZGameKit.defineMold("inimigo", { w: 40, h: 40, health: 20, speed: 120, damage: 10, color: "#e94f4f", image: "", look: "" });',
    )
  })

  it('molde redondo leva a forma, e a Ponte devolve os dois casos', () => {
    const redondo: JSStatement[] = [
      {
        type: 'gk:defineMold',
        name: 'bolha',
        w: 40,
        h: 40,
        health: 20,
        speed: 120,
        damage: 10,
        color: '#e94f4f',
        image: '',
        look: '',
        shape: 'circulo',
      },
    ]
    const code = compile(redondo)
    expect(code).toContain('shape: "circulo"')

    const back = parseJS(code).map((s) => ({ ...s, __id: undefined }))
    expect(back[0]).toMatchObject({ type: 'gk:defineMold', name: 'bolha', shape: 'circulo' })
  })

  it('a forma do personagem faz o round-trip completo', () => {
    const ir: JSStatement[] = [
      { type: 'gk:setHitboxShape', charVar: 'heroi', shape: 'circulo', radius: 12 },
    ]
    const code = compile(ir)
    expect(code).toBe('SZGameKit.setHitboxShape(heroi, "circulo", 12);')

    const back = parseJS(code).map((s) => ({ ...s, __id: undefined }))
    expect(back[0]).toMatchObject({
      type: 'gk:setHitboxShape',
      charVar: 'heroi',
      shape: 'circulo',
      radius: { type: 'num', value: 12 },
    })
  })

  it('forma desconhecida (código à mão) NÃO vira este bloco', () => {
    // Cai no "chamar método" genérico do núcleo, como qualquer chamada que os
    // blocos da extensão não representam — nunca num bloco com forma inválida.
    const back = parseJS('SZGameKit.setHitboxShape(heroi, "triangulo", 0);')
    expect(back[0]?.type).not.toBe('gk:setHitboxShape')
  })
})
