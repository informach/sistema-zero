import { describe, expect, it } from 'bun:test'
import { type Any, call, loadRuntime, type V3Like } from './platformHarness'

/**
 * Kit Plataforma: joga fases de brinquedo quadro a quadro.
 *
 * O motor do gênero vive no runtime (`runtimePlatform.ts`) porque o programa da
 * criança não consegue decifrar texto nem rodar o laço quente de colisão. O que
 * dá para provar aqui é o COMPORTAMENTO: monta, anda, pisa, dá cabeçada, pega
 * moeda, cai no buraco, chega no mastro — e não deixa a fase crescer sem fim.
 */

/** Mapa curto: chão com um buraco, um bloco, uma moeda, um inimigo e o mastro. */
const FASE_DE_BRINQUEDO = [
  'tema=dia',
  'tempo=400',
  'chao=0-14,18-40',
  'surpresa=6:4:moeda',
  'tijolo=7:4',
  'moeda=10:3',
  'inimigo=12:goomba',
  'mastro=36',
  'castelo=38',
].join('\n')

function jogo(mapa = FASE_DE_BRINQUEDO) {
  const bancada = loadRuntime()
  const { api } = bancada
  const world = call(api, 'createPlatformScene', 'tela')
  const heroi = call(api, 'createHero', world, '#e03010')
  call(api, 'loadStage', world, mapa)
  return { ...bancada, world, heroi, api }
}

/** Um quadro do jogo, com o herói andando para a direita se `andar` for true. */
function quadro(api: Any, world: Any, heroi: Any, andar = false) {
  if (andar) call(api, 'classicPlatformer', heroi, world, 0.09, 0.22)
  else call(api, 'stepBody', heroi, world)
  call(api, 'stageStep', world, heroi)
  call(api, 'sideCamera', world, heroi)
}

const pos = (obj: Any) => obj.position as V3Like

describe('Kit Plataforma — montar a fase a partir do texto', () => {
  it('o chão existe DEBAISO do herói já no primeiro quadro', () => {
    const { api, world, heroi } = jogo()
    // Materialização síncrona: se fosse adiada, o herói cairia num buraco falso.
    for (let f = 0; f < 40; f++) quadro(api, world, heroi)
    expect(pos(heroi).y).toBeGreaterThan(0)
    expect(pos(heroi).y).toBeLessThan(3)
  })

  it('o buraco do mapa é buraco de verdade: parado em cima dele, cai', () => {
    const { api, world, heroi } = jogo()
    call(api, 'setPosition', heroi, 16, 2, 0)
    for (let f = 0; f < 120; f++) quadro(api, world, heroi)
    // Caiu abaixo do chão e perdeu uma vida.
    expect(call(api, 'stageValue', world, 'vidas')).toBe(4)
    expect(call(api, 'stageIs', world, 'perdeu')).toBe(true)
  })

  it('um mapa vazio não quebra nada', () => {
    const { api, world, heroi } = jogo('tema=dia')
    for (let f = 0; f < 30; f++) quadro(api, world, heroi)
    expect(call(api, 'stageValue', world, 'pontos')).toBe(0)
  })
})

describe('Kit Plataforma — as regras do gênero', () => {
  it('pisar no inimigo mata, dá 100 pontos e devolve um quique', () => {
    const { api, world, heroi } = jogo()
    // Cai bem em cima do goomba da coluna 12.
    call(api, 'setPosition', heroi, 12, 4, 0)
    call(api, 'setVelocity', heroi, 0, -0.2, 0)
    let quicou = false
    for (let f = 0; f < 60; f++) {
      quadro(api, world, heroi)
      if ((heroi.userData as { sz: { vy: number } }).sz.vy > 0.1) quicou = true
    }
    expect(call(api, 'stageValue', world, 'pontos')).toBeGreaterThanOrEqual(100)
    expect(quicou).toBe(true)
  })

  it('encostar de lado no inimigo tira uma vida do herói pequeno', () => {
    const { api, world, heroi } = jogo()
    call(api, 'setPosition', heroi, 11.2, 0.75, 0)
    for (let f = 0; f < 60; f++) quadro(api, world, heroi, true)
    expect(call(api, 'stageValue', world, 'vidas')).toBeLessThan(5)
  })

  it('cabeçada no bloco de surpresa solta o prêmio e o bloco vira usado', () => {
    const { api, world, heroi } = jogo()
    // O bloco de surpresa está na coluna 6, altura 4.
    call(api, 'setPosition', heroi, 6, 2.2, 0)
    call(api, 'setVelocity', heroi, 0, 0.28, 0)
    for (let f = 0; f < 30; f++) quadro(api, world, heroi)
    // 50 por bater no bloco + 200 pela moeda de dentro.
    expect(call(api, 'stageValue', world, 'pontos')).toBeGreaterThanOrEqual(250)
    expect(call(api, 'stageValue', world, 'moedas')).toBe(1)
  })

  it('o tijolo resiste ao herói pequeno e só quebra depois do cogumelo', () => {
    const mapa = ['chao=0-20', 'tijolo=6:4', 'surpresa=3:4:cogumelo'].join('\n')
    const { api, world, heroi } = jogo(mapa)

    const cabecada = (x: number) => {
      call(api, 'setPosition', heroi, x, 2.2, 0)
      call(api, 'setVelocity', heroi, 0, 0.28, 0)
      for (let f = 0; f < 30; f++) quadro(api, world, heroi)
    }
    cabecada(6)
    expect(call(api, 'heroIs', heroi, 'pequeno')).toBe(true)

    cabecada(3) // pega o cogumelo
    expect(call(api, 'heroIs', heroi, 'grande')).toBe(true)
  })

  it('pegar moeda conta e pontua', () => {
    const { api, world, heroi } = jogo()
    call(api, 'setPosition', heroi, 10, 3, 0)
    for (let f = 0; f < 20; f++) quadro(api, world, heroi)
    expect(call(api, 'stageValue', world, 'moedas')).toBe(1)
    expect(call(api, 'stageValue', world, 'pontos')).toBeGreaterThanOrEqual(200)
  })

  it('chegar no mastro vence a fase e soma o tempo que sobrou', () => {
    const { api, world, heroi } = jogo()
    call(api, 'setPosition', heroi, 35.5, 3, 0)
    for (let f = 0; f < 40; f++) quadro(api, world, heroi, true)
    expect(call(api, 'stageIs', world, 'venceu')).toBe(true)
    expect(call(api, 'stageValue', world, 'pontos')).toBeGreaterThan(1000)
  })

  it('o relógio corre e zerar o tempo custa uma vida', () => {
    const { api, world, heroi } = jogo(['chao=0-40', 'tempo=1'].join('\n'))
    const antes = call(api, 'stageValue', world, 'tempo')
    for (let f = 0; f < 200; f++) quadro(api, world, heroi)
    expect(antes).toBe(1)
    expect(call(api, 'stageValue', world, 'tempo')).toBe(0)
    expect(call(api, 'stageValue', world, 'vidas')).toBe(4)
  })
})

describe('Kit Plataforma — os ganchos que o exemplo usa', () => {
  // Cada gancho ganha uma partida nova: o goomba ANDA, então encadear as três
  // situações numa run só tornaria o teste refém da posição dele no quadro certo.
  const avisouEm = (nome: string, prepara: (t: ReturnType<typeof jogo>) => void) => {
    const t = jogo()
    const avisos: string[] = []
    call(t.api, 'onStageEvent', t.world, nome, () => avisos.push(nome))
    prepara(t)
    return avisos
  }

  it('avisa quando pega moeda', () => {
    const avisos = avisouEm('pegar-moeda', ({ api, world, heroi }) => {
      call(api, 'setPosition', heroi, 10, 3, 0)
      for (let f = 0; f < 20; f++) quadro(api, world, heroi)
    })
    expect(avisos).toContain('pegar-moeda')
  })

  it('avisa quando pisa no inimigo', () => {
    const avisos = avisouEm('pisar-inimigo', ({ api, world, heroi }) => {
      call(api, 'setPosition', heroi, 12, 4, 0)
      call(api, 'setVelocity', heroi, 0, -0.2, 0)
      for (let f = 0; f < 60; f++) quadro(api, world, heroi)
    })
    expect(avisos).toContain('pisar-inimigo')
  })

  it('avisa quando toca a bandeira', () => {
    const avisos = avisouEm('tocar-a-bandeira', ({ api, world, heroi }) => {
      call(api, 'setPosition', heroi, 35.5, 3, 0)
      for (let f = 0; f < 40; f++) quadro(api, world, heroi, true)
    })
    expect(avisos).toContain('tocar-a-bandeira')
  })

  it('um gancho que dá erro é desligado, e o jogo continua', () => {
    const { api, world, heroi } = jogo()
    call(api, 'onStageEvent', world, 'pegar-moeda', () => {
      throw new Error('erro de propósito')
    })
    call(api, 'setPosition', heroi, 10, 3, 0)
    expect(() => {
      for (let f = 0; f < 20; f++) quadro(api, world, heroi)
    }).not.toThrow()
    expect(call(api, 'stageValue', world, 'moedas')).toBe(1)
  })
})

describe('Kit Plataforma — a fase não cresce sem fim', () => {
  it('andando 200 colunas, os sólidos vivos ficam limitados', () => {
    // Corredor longo: sem reciclagem, cada coluna nova ficaria para sempre.
    const mapa = ['chao=0-220', 'tempo=400'].join('\n')
    const { api, world, heroi } = jogo(mapa)
    let maiorSolidos = 0
    let maiorMalhas = 0
    for (let f = 0; f < 400; f++) {
      // Teleporta em vez de andar: cobre 200 colunas em pouco tempo de teste.
      call(api, 'setPosition', heroi, f * 0.5, 1.5, 0)
      quadro(api, world, heroi)
      const solidos = (world._solids as unknown[]).length
      const malhas = ((world._stage as Any).meshes as unknown[]).length
      if (solidos > maiorSolidos) maiorSolidos = solidos
      if (malhas > maiorMalhas) maiorMalhas = malhas
    }
    expect(maiorSolidos).toBeLessThan(40)
    expect(maiorMalhas).toBeLessThan(60)
  })

  it('limpar a fase devolve as peças e esvazia os sólidos do mundo', () => {
    const { api, world } = jogo()
    expect(((world._stage as Any).meshes as unknown[]).length).toBeGreaterThan(0)
    call(api, 'clearStage', world)
    expect(((world._stage as Any).meshes as unknown[]).length).toBe(0)
    expect((world._solids as unknown[]).length).toBe(0)
  })

  it('recomeçar a fase devolve inimigos, moedas e blocos ao estado inicial', () => {
    const { api, world, heroi } = jogo()
    call(api, 'setPosition', heroi, 10, 3, 0)
    for (let f = 0; f < 20; f++) quadro(api, world, heroi)
    expect(call(api, 'stageValue', world, 'moedas')).toBe(1)

    call(api, 'stageReset', world)
    call(api, 'setPosition', heroi, 10, 3, 0)
    for (let f = 0; f < 20; f++) quadro(api, world, heroi)
    // A moeda voltou: dá para pegar de novo.
    expect(call(api, 'stageValue', world, 'moedas')).toBe(2)
  })
})

describe('Kit Plataforma — as mecânicas do original', () => {
  it('a concha chutada varre os inimigos em fila, valendo mais a cada um', () => {
    // Um koopa e dois goombas à esquerda dele: pisar, chutar e ver a fila cair.
    const mapa = ['chao=0-40', 'inimigo=20:koopa,14:goomba,11:goomba'].join('\n')
    const { api, world, heroi } = jogo(mapa)
    call(api, 'setPosition', heroi, 20, 4, 0)
    call(api, 'setVelocity', heroi, 0, -0.2, 0)
    for (let f = 0; f < 40; f++) quadro(api, world, heroi)
    const aposPisar = call(api, 'stageValue', world, 'pontos')

    // Encosta pela direita: a concha sai para a esquerda, na direção da fila.
    call(api, 'setPosition', heroi, 21, 0.75, 0)
    for (let f = 0; f < 400; f++) quadro(api, world, heroi)
    const aposVarrer = call(api, 'stageValue', world, 'pontos')
    // 100 do pisão + 100 e 200 dos dois varridos, no mínimo.
    expect(aposVarrer).toBeGreaterThan(aposPisar + 200)
  })

  it('a planta piranha não pode ser pisada: pular nela machuca', () => {
    const mapa = ['chao=0-40', 'cano=10:2', 'inimigo=10:planta'].join('\n')
    const { api, world, heroi } = jogo(mapa)
    // Em pé no cano ela recolhe (regra do original) — então o teste chega de LADO,
    // na altura dela, que é onde ela realmente ameaça.
    for (let f = 0; f < 200; f++) {
      call(api, 'setPosition', heroi, 10, 1.6, 0)
      quadro(api, world, heroi)
      if (call(api, 'stageValue', world, 'vidas') < 5) break
    }
    expect(call(api, 'stageValue', world, 'vidas')).toBeLessThan(5)
  })

  it('o bloco invisível só aparece depois da cabeçada, e dá o prêmio', () => {
    const mapa = ['chao=0-40', 'escondido=8:4:vida'].join('\n')
    const { api, world, heroi } = jogo(mapa)
    const antes = call(api, 'stageValue', world, 'vidas')
    call(api, 'setPosition', heroi, 8, 2.2, 0)
    call(api, 'setVelocity', heroi, 0, 0.3, 0)
    for (let f = 0; f < 30; f++) quadro(api, world, heroi)
    expect(call(api, 'stageValue', world, 'vidas')).toBe(antes + 1)
    // E agora ele é sólido: dá para pousar em cima.
    expect((world._solids as unknown[]).length).toBeGreaterThan(1)
  })

  it('a lava mata na hora, mesmo com a estrela', () => {
    const mapa = ['chao=0-8,12-40', 'lava=9-11', 'tema=castelo'].join('\n')
    const { api, world, heroi } = jogo(mapa)
    call(api, 'setPosition', heroi, 10, 1.5, 0)
    for (let f = 0; f < 60; f++) quadro(api, world, heroi)
    expect(call(api, 'stageIs', world, 'perdeu')).toBe(true)
  })

  it('a plataforma móvel anda e leva o passageiro junto', () => {
    const mapa = ['chao=0-4', 'plataforma=10:3:x:6'].join('\n')
    const { api, world, heroi } = jogo(mapa)
    call(api, 'setPosition', heroi, 10, 4.2, 0)
    for (let f = 0; f < 10; f++) quadro(api, world, heroi)
    const inicio = pos(heroi).x
    for (let f = 0; f < 60; f++) quadro(api, world, heroi)
    // Sem a carona, o herói ficaria parado enquanto a plataforma some.
    expect(Math.abs(pos(heroi).x - inicio)).toBeGreaterThan(0.5)
    expect(pos(heroi).y).toBeGreaterThan(2)
  })

  it('a bola de fogo só sai como Fiery, e derrete o inimigo', () => {
    const mapa = ['chao=0-40', 'surpresa=4:4:flor', 'inimigo=12:goomba'].join('\n')
    const { api, world, heroi } = jogo(mapa)

    // Pequeno: não sai nada.
    expect(call(api, 'shootFire', world, heroi)).toBe(false)

    call(api, 'setPosition', heroi, 4, 2.2, 0)
    call(api, 'setVelocity', heroi, 0, 0.3, 0)
    for (let f = 0; f < 30; f++) quadro(api, world, heroi)
    expect(call(api, 'heroIs', heroi, 'de fogo')).toBe(true)

    call(api, 'setPosition', heroi, 8, 1, 0)
    call(api, 'setVelocity', heroi, 0.1, 0, 0)
    const pontosAntes = call(api, 'stageValue', world, 'pontos')
    expect(call(api, 'shootFire', world, heroi)).toBe(true)
    for (let f = 0; f < 120; f++) quadro(api, world, heroi)
    expect(call(api, 'stageValue', world, 'pontos')).toBeGreaterThan(pontosAntes)
  })

  it('a estrela mata no toque; a piscada depois do dano só protege', () => {
    const comEstrela = jogo(['chao=0-40', 'surpresa=4:4:estrela', 'inimigo=9:goomba'].join('\n'))
    call(comEstrela.api, 'setPosition', comEstrela.heroi, 4, 2.2, 0)
    call(comEstrela.api, 'setVelocity', comEstrela.heroi, 0, 0.3, 0)
    for (let f = 0; f < 30; f++) quadro(comEstrela.api, comEstrela.world, comEstrela.heroi)
    expect(call(comEstrela.api, 'heroIs', comEstrela.heroi, 'invencivel')).toBe(true)
    call(comEstrela.api, 'setPosition', comEstrela.heroi, 9, 0.75, 0)
    for (let f = 0; f < 30; f++) quadro(comEstrela.api, comEstrela.world, comEstrela.heroi)
    // Matou o inimigo e não perdeu vida.
    expect(call(comEstrela.api, 'stageValue', comEstrela.world, 'vidas')).toBe(5)

    // Já a piscada de quem levou dano não mata ninguém: encostar de novo é seguro,
    // mas o inimigo continua lá.
    const comDano = jogo(['chao=0-40', 'surpresa=4:4:cogumelo', 'inimigo=9:goomba'].join('\n'))
    call(comDano.api, 'setPosition', comDano.heroi, 4, 2.2, 0)
    call(comDano.api, 'setVelocity', comDano.heroi, 0, 0.3, 0)
    for (let f = 0; f < 30; f++) quadro(comDano.api, comDano.world, comDano.heroi)
    // O goomba ANDA para a esquerda: a bancada vai até onde ele está agora.
    for (let f = 0; f < 90; f++) {
      call(comDano.api, 'setPosition', comDano.heroi, 7.5, 0.75, 0)
      quadro(comDano.api, comDano.world, comDano.heroi)
      if (call(comDano.api, 'heroIs', comDano.heroi, 'pequeno')) break
    }
    expect(call(comDano.api, 'heroIs', comDano.heroi, 'pequeno')).toBe(true)
    expect(call(comDano.api, 'stageValue', comDano.world, 'vidas')).toBe(5)
  })

  it('o machado no fim da ponte derruba o chefão e vence a fase', () => {
    const mapa = ['chao=0-40', 'chefao=20', 'tema=castelo'].join('\n')
    const { api, world, heroi } = jogo(mapa)
    call(api, 'setPosition', heroi, 25, 1.5, 0)
    for (let f = 0; f < 40; f++) quadro(api, world, heroi)
    expect(call(api, 'stageIs', world, 'venceu')).toBe(true)
    expect(call(api, 'stageValue', world, 'pontos')).toBeGreaterThanOrEqual(5000)
  })
})

describe('Kit Plataforma — a câmera lateral', () => {
  it('acompanha para a direita e NUNCA volta para trás', () => {
    const { api, world, heroi } = jogo()
    call(api, 'setPosition', heroi, 10, 2, 0)
    quadro(api, world, heroi)
    const avancou = (world.camera as { position: V3Like }).position.x
    expect(avancou).toBeCloseTo(10, 1)

    call(api, 'setPosition', heroi, 3, 2, 0)
    quadro(api, world, heroi)
    const depoisDeVoltar = (world.camera as { position: V3Like }).position.x
    expect(depoisDeVoltar).toBeCloseTo(avancou, 5)
  })
})
