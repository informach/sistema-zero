import { describe, expect, it } from 'bun:test'
import { type Any, call, loadRuntime, meta, type V3Like } from './platformHarness'

/**
 * Lote "Reino Cogumelo": o vocabulario de plataforma classica no Jogo 3D.
 *
 * Espelha o que o `game-2d/runtime/classicPlatformer.ts` ja provou em 2D --
 * inercia, corrida, pulo de altura variavel e LADO da colisao -- traduzido para
 * o corredor lateral em X do 3D. Cada `it` daqui falhava antes do lote (a sonda
 * da Fase 0 mediu: pulo de altura fixa, velocidade caindo a zero em um quadro,
 * a seta para cima empurrando em Z, e nenhum campo de lado publicado).
 */

function arena() {
  const bancada = loadRuntime()
  const { api } = bancada
  const world = call(api, 'createScene', 'tela')
  const chao = call(api, 'createBlock', world, { width: 400, height: 1, depth: 8 })
  call(api, 'setPosition', chao, 0, -0.5, 0)
  call(api, 'setSolid', chao)
  const heroi = call(api, 'createBox', world, { size: 1 })
  call(api, 'setPosition', heroi, 0, 0.5, 0)
  call(api, 'body', heroi, -0.02)
  for (let f = 0; f < 5; f++) call(api, 'stepBody', heroi, world)
  return { ...bancada, world, chao, heroi }
}

describe('game-3d — teclado com borda (keyPressed)', () => {
  it('keyPressed só é verdadeiro no quadro do aperto, keyDown enquanto segura', () => {
    const { api, fire } = loadRuntime()
    fire('keydown', { code: 'Space', preventDefault() {} })
    expect(call(api, 'keyDown', 'Space')).toBe(true)
    expect(call(api, 'keyPressed', 'Space')).toBe(true)

    // Um keydown repetido (auto-repeat do sistema) NÃO conta como aperto novo.
    fire('keydown', { code: 'Space', preventDefault() {} })
    expect(call(api, 'keyPressed', 'Space')).toBe(true)

    fire('keyup', { code: 'Space' })
    expect(call(api, 'keyDown', 'Space')).toBe(false)
    fire('keydown', { code: 'Space', preventDefault() {} })
    expect(call(api, 'keyPressed', 'Space')).toBe(true)
  })
})

describe('game-3d — plataforma clássica: inércia, corrida e pulo variável', () => {
  it('anda só no eixo X: a seta para cima não empurra em Z', () => {
    const { api, fire, world, heroi } = arena()
    fire('keydown', { code: 'ArrowUp', preventDefault() {} })
    for (let f = 0; f < 30; f++) call(api, 'classicPlatformer', heroi, world, 0.08, 0.2)
    fire('keyup', { code: 'ArrowUp' })
    expect(Math.abs((heroi.position as V3Like).z)).toBeLessThan(0.001)
  })

  it('tem inércia: a velocidade sobe aos poucos e desce aos poucos ao soltar', () => {
    const { api, fire, world, heroi } = arena()
    fire('keydown', { code: 'ArrowRight', preventDefault() {} })
    call(api, 'classicPlatformer', heroi, world, 0.08, 0.2)
    const primeiroQuadro = meta(heroi).vx
    for (let f = 0; f < 30; f++) call(api, 'classicPlatformer', heroi, world, 0.08, 0.2)
    const emVelocidadeMaxima = meta(heroi).vx
    // Acelera: o primeiro quadro está longe do máximo.
    expect(primeiroQuadro).toBeGreaterThan(0)
    expect(primeiroQuadro).toBeLessThan(emVelocidadeMaxima * 0.6)
    expect(emVelocidadeMaxima).toBeCloseTo(0.08, 3)

    // Desacelera: soltar não zera de uma vez.
    fire('keyup', { code: 'ArrowRight' })
    call(api, 'classicPlatformer', heroi, world, 0.08, 0.2)
    const logoAposSoltar = meta(heroi).vx
    expect(logoAposSoltar).toBeGreaterThan(0)
    expect(logoAposSoltar).toBeLessThan(emVelocidadeMaxima)
  })

  it('correr com Shift chega ao dobro da velocidade de caminhada', () => {
    const { api, fire, world, heroi } = arena()
    const velocidadeApos = (comCorrida: boolean) => {
      call(api, 'setPosition', heroi, 0, 0.5, 0)
      call(api, 'setVelocity', heroi, 0, 0, 0)
      fire('keydown', { code: 'ArrowRight', preventDefault() {} })
      if (comCorrida) fire('keydown', { code: 'ShiftLeft', preventDefault() {} })
      for (let f = 0; f < 90; f++) call(api, 'classicPlatformer', heroi, world, 0.08, 0.2)
      const v = meta(heroi).vx
      fire('keyup', { code: 'ArrowRight' })
      fire('keyup', { code: 'ShiftLeft' })
      return v
    }
    const andando = velocidadeApos(false)
    const correndo = velocidadeApos(true)
    expect(correndo / andando).toBeCloseTo(2, 1)
  })

  it('o pulo é mais alto quanto mais tempo o botão fica apertado', () => {
    const { api, fire, world, heroi } = arena()
    const altura = (quadrosComBotao: number) => {
      call(api, 'setPosition', heroi, 0, 0.5, 0)
      call(api, 'setVelocity', heroi, 0, 0, 0)
      for (let f = 0; f < 5; f++) call(api, 'classicPlatformer', heroi, world, 0.08, 0.2)
      const chaoY = (heroi.position as V3Like).y
      fire('keydown', { code: 'Space', preventDefault() {} })
      let topo = chaoY
      for (let f = 0; f < 150; f++) {
        if (f === quadrosComBotao) fire('keyup', { code: 'Space' })
        call(api, 'classicPlatformer', heroi, world, 0.08, 0.2)
        topo = Math.max(topo, (heroi.position as V3Like).y)
      }
      fire('keyup', { code: 'Space' })
      return topo - chaoY
    }
    const toque = altura(1)
    const segurado = altura(40)
    expect(segurado).toBeGreaterThan(toque * 1.6)
  })

  it('com o botão preso não repica sozinho: precisa soltar e apertar de novo', () => {
    const { api, fire, world, heroi } = arena()
    fire('keydown', { code: 'Space', preventDefault() {} })
    let pulos = 0
    let subindoAntes = false
    for (let f = 0; f < 200; f++) {
      call(api, 'classicPlatformer', heroi, world, 0.08, 0.2)
      const subindo = meta(heroi).vy > 0.1
      if (subindo && !subindoAntes) pulos++
      subindoAntes = subindo
    }
    fire('keyup', { code: 'Space' })
    expect(pulos).toBe(1)
  })
})

describe('game-3d — de que lado a colisão bateu', () => {
  it('pousar em cima de um sólido conta uma batida com os pés', () => {
    const { api, heroi } = arena()
    const lados: string[] = []
    call(api, 'forEachHit', heroi, 'pes', (c: Any) => lados.push(c.side as string))
    expect(lados).toEqual(['pes'])
  })

  it('bater por baixo conta uma batida com a cabeça, e não com os pés', () => {
    const { api } = loadRuntime()
    const world = call(api, 'createScene', 'tela')
    const bloco = call(api, 'createBlock', world, { width: 1, height: 1, depth: 2 })
    call(api, 'setPosition', bloco, 0, 3, 0)
    call(api, 'setSolid', bloco)
    const heroi = call(api, 'createBox', world, { size: 1 })
    call(api, 'setPosition', heroi, 0, 1.9, 0)
    call(api, 'body', heroi, 0)
    call(api, 'setVelocity', heroi, 0, 0.3, 0)
    call(api, 'stepBody', heroi, world)

    const cabeca: unknown[] = []
    const pes: unknown[] = []
    call(api, 'forEachHit', heroi, 'cabeca', (c: unknown) => cabeca.push(c))
    call(api, 'forEachHit', heroi, 'pes', (c: unknown) => pes.push(c))
    expect(cabeca).toHaveLength(1)
    expect(pes).toHaveLength(0)
    expect(call(api, 'hitIs', cabeca[0], bloco)).toBe(true)
    expect(call(api, 'hitIs', cabeca[0], heroi)).toBe(false)
  })

  it('bater de lado conta esquerda ou direita conforme o sentido', () => {
    const { api } = loadRuntime()
    const world = call(api, 'createScene', 'tela')
    const parede = call(api, 'createBlock', world, { width: 1, height: 6, depth: 2 })
    call(api, 'setPosition', parede, 3, 0, 0)
    call(api, 'setSolid', parede)
    const corpo = call(api, 'createBox', world, { size: 1 })
    call(api, 'setPosition', corpo, 1.9, 0, 0)
    call(api, 'body', corpo, 0)
    call(api, 'setVelocity', corpo, 0.3, 0, 0)
    call(api, 'stepBody', corpo, world)

    const lados: string[] = []
    call(api, 'forEachHit', corpo, 'qualquer', (c: Any) => lados.push(c.side as string))
    // Andando para a direita, quem bate é o lado direito do corpo.
    expect(lados).toEqual(['direita'])
  })

  it('as batidas são do quadro corrente: um passo sem tocar em nada limpa a lista', () => {
    const { api, world, heroi } = arena()
    const antes: unknown[] = []
    call(api, 'forEachHit', heroi, 'qualquer', (c: unknown) => antes.push(c))
    expect(antes.length).toBeGreaterThan(0)

    call(api, 'setPosition', heroi, 0, 40, 0) // longe de tudo
    call(api, 'stepBody', heroi, world)
    const depois: unknown[] = []
    call(api, 'forEachHit', heroi, 'qualquer', (c: unknown) => depois.push(c))
    expect(depois).toEqual([])
  })

  it('resolveCollision avulso (fora do stepBody) não cria lista de batidas', () => {
    const { api } = loadRuntime()
    const world = call(api, 'createScene', 'tela')
    const a = call(api, 'createBox', world, { size: 1 })
    const b = call(api, 'createBox', world, { size: 1 })
    call(api, 'setPosition', a, 0, 0, 0)
    call(api, 'setPosition', b, 0.4, 0, 0)
    call(api, 'resolveCollision', a, b)
    // Sem stepBody não há quadro: nada de vazar array em quem nunca lê batidas.
    expect((a.userData as { sz: Any }).sz.hits).toBeUndefined()
  })
})

describe('game-3d — plataforma que carrega e plataforma que se atravessa', () => {
  it('quem está em cima de uma plataforma que carrega anda junto com ela', () => {
    const { api } = loadRuntime()
    const world = call(api, 'createScene', 'tela')
    const plataforma = call(api, 'createBlock', world, { width: 4, height: 1, depth: 3 })
    call(api, 'setPosition', plataforma, 0, 0, 0)
    call(api, 'setSolid', plataforma)
    call(api, 'carryRiders', plataforma)
    const heroi = call(api, 'createBox', world, { size: 1 })
    call(api, 'setPosition', heroi, 0, 1, 0)
    call(api, 'body', heroi, -0.02)
    call(api, 'stepBody', heroi, world)

    const xAntes = (heroi.position as V3Like).x
    for (let f = 0; f < 30; f++) {
      call(api, 'slideBetween', plataforma, 'x', -5, 5, 0.05)
      call(api, 'stepBody', heroi, world)
    }
    const andouPlataforma = (plataforma.position as V3Like).x
    const andouHeroi = (heroi.position as V3Like).x - xAntes
    // Um quadro de atraso é esperado (a carona lê onde a plataforma ESTAVA).
    expect(andouHeroi / andouPlataforma).toBeGreaterThan(0.9)
  })

  it('uma plataforma atravessável deixa subir por baixo e segura por cima', () => {
    const { api } = loadRuntime()
    const world = call(api, 'createScene', 'tela')
    const plataforma = call(api, 'createBlock', world, { width: 6, height: 1, depth: 3 })
    call(api, 'setPosition', plataforma, 0, 3, 0)
    call(api, 'setSolid', plataforma)
    call(api, 'passUnder', plataforma)

    // Subindo por baixo: atravessa.
    const subindo = call(api, 'createBox', world, { size: 1 })
    call(api, 'setPosition', subindo, 0, 1, 0)
    call(api, 'body', subindo, 0)
    call(api, 'setVelocity', subindo, 0, 0.2, 0)
    for (let f = 0; f < 40; f++) call(api, 'stepBody', subindo, world)
    expect((subindo.position as V3Like).y).toBeGreaterThan(4)

    // Caindo de cima: pousa.
    const caindo = call(api, 'createBox', world, { size: 1 })
    call(api, 'setPosition', caindo, 0, 8, 0)
    call(api, 'body', caindo, -0.02)
    for (let f = 0; f < 200; f++) call(api, 'stepBody', caindo, world)
    expect((caindo.position as V3Like).y).toBeCloseTo(4, 1)
    expect(meta(caindo).grounded).toBe(true)
  })
})

describe('game-3d — estampa procedural e sombra', () => {
  it('paintPattern desenha a estampa no canvas e a reaproveita na segunda chamada', () => {
    const { api, paintCalls } = loadRuntime()
    const world = call(api, 'createScene', 'tela')
    const a = call(api, 'createBox', world, { size: 1 })
    const b = call(api, 'createBox', world, { size: 1 })

    call(api, 'paintPattern', a, 'tijolo', '#b5651d', '#f2d0a4')
    const desenhosDaPrimeira = paintCalls.length
    expect(desenhosDaPrimeira).toBeGreaterThan(3)

    call(api, 'paintPattern', b, 'tijolo', '#b5651d', '#f2d0a4')
    // Mesma chave: sai do cache, não desenha de novo.
    expect(paintCalls.length).toBe(desenhosDaPrimeira)
    expect((a.material as Any).map).toBe((b.material as Any).map)

    call(api, 'paintPattern', b, 'tijolo', '#000000', '#ffffff')
    expect(paintCalls.length).toBeGreaterThan(desenhosDaPrimeira)
    expect((b.material as Any).map).not.toBe((a.material as Any).map)
  })

  it('todas as estampas do dropdown desenham alguma coisa', () => {
    const { api, paintCalls } = loadRuntime()
    const world = call(api, 'createScene', 'tela')
    const alvo = call(api, 'createBox', world, { size: 1 })
    const estampas = [
      'tijolo',
      'pedra',
      'terra',
      'grama',
      'interrogacao',
      'cano',
      'nuvem',
      'agua',
      'lava',
      'moeda',
      'xadrez',
      'listras',
    ]
    for (const estampa of estampas) {
      const antes = paintCalls.length
      call(api, 'paintPattern', alvo, estampa, '#123456', '#abcdef')
      expect(paintCalls.length).toBeGreaterThan(antes)
    }
  })

  it('noShadow tira o objeto do passe de sombra sem escondê-lo', () => {
    const { api } = loadRuntime()
    const world = call(api, 'createScene', 'tela')
    const bloco = call(api, 'createBlock', world, { width: 1, height: 1, depth: 1 })
    expect(bloco.castShadow).toBe(true)
    call(api, 'noShadow', bloco)
    expect(bloco.castShadow).toBe(false)
    expect(bloco.receiveShadow).toBe(true)
  })
})

describe('game-3d — gaveta por objeto', () => {
  it('guarda e lê valores por chave, sem misturar objetos', () => {
    const { api } = loadRuntime()
    const world = call(api, 'createScene', 'tela')
    const a = call(api, 'createBox', world, { size: 1 })
    const b = call(api, 'createBox', world, { size: 1 })
    call(api, 'setObjectValue', a, 'vida', 3)
    call(api, 'setObjectValue', b, 'vida', 1)
    call(api, 'setObjectValue', a, 'direcao', -1)
    expect(call(api, 'objectValue', a, 'vida')).toBe(3)
    expect(call(api, 'objectValue', b, 'vida')).toBe(1)
    expect(call(api, 'objectValue', a, 'direcao')).toBe(-1)
    expect(call(api, 'objectValue', b, 'direcao')).toBe(0)
  })
})
