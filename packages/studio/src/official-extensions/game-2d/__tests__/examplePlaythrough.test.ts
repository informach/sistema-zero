import { describe, expect, it } from 'bun:test'
import {
  animatedHeroExample,
  asteroidsClassicExample,
  asteroidsExample,
  aventuraHeroiExample,
  balloonExample,
  batalhaMonstrinhosExample,
  cameraAdventureExample,
  catchCoinExample,
  chuvaDeMeteorosExample,
  codeDrawnExample,
  dinoRunExample,
  dueloDeHeroisExample,
  enemyPlatformerExample,
  escaladaDoGuerreiroExample,
  gorilasExample,
  gorilasVsRobotExample,
  muralhaDoReinoExample,
  platformerExample,
  pongExample,
  portasDoCasteloExample,
  stickHeroExample,
  tilemapExample,
  treinadorDeCriaturasExample,
  valeEnsolaradoExample,
  vilaNinjaExample,
} from '../examples'
import { type CapturedSprite, exampleHarness } from './examplePlaythroughHarness'

describe('playthrough dos exemplos exatos do Jogo 2D', () => {
  it('Pegue a moeda coleta cinco vezes, vence e reinicia a partida limpa', () => {
    const game = exampleHarness(catchCoinExample, () => 0.5)
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)
    const [firstHero, firstCoin] = game.sprites
    expect(firstHero).toBeDefined()
    expect(firstCoin).toBeDefined()

    for (let point = 1; point <= 5; point += 1) {
      if (firstHero && firstCoin) {
        firstCoin.x = firstHero.x
        firstCoin.y = firstHero.y
      }
      game.nextFrame()
      expect(game.scores['Moedas:']).toBe(point)
    }
    expect(game.api.sceneIs('vitoria')).toBe(true)

    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    expect(game.sprites).toHaveLength(4)
    expect(game.sprites[2]).not.toBe(firstHero)
    expect(game.sprites[3]).not.toBe(firstCoin)

    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('jogando')).toBe(true)
    expect(game.scores['Moedas:']).toBe(0)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Herói que anda move e mantém a animação prometida', () => {
    const game = exampleHarness(animatedHeroExample)
    const hero = game.sprites[0]
    expect(hero?.anim).toBeDefined()
    const startX = hero?.x ?? 0
    game.fireKey('ArrowRight')
    game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(hero?.x).toBeGreaterThan(startX)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Mini plataforma responde às setas, gravidade e limites do palco', () => {
    const game = exampleHarness(platformerExample)
    const hero = game.sprites[0]
    const startX = hero?.x ?? 0
    game.fireKey('ArrowRight')
    for (let frame = 0; frame < 5; frame += 1) game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(hero?.x).toBeGreaterThan(startX)
    expect(hero?.x).toBeLessThanOrEqual(320 - (hero?.w ?? 0))
    expect(hero?.y).toBeLessThanOrEqual(200 - (hero?.h ?? 0))
    expect(game.errors).toEqual([])
  })

  it('Sala com paredes deixa andar, mas bloqueia o herói no tile sólido', () => {
    const game = exampleHarness(tilemapExample)
    const hero = game.sprites[0]
    game.fireKey('ArrowLeft')
    for (let frame = 0; frame < 30; frame += 1) game.nextFrame()
    game.fireKey('ArrowLeft', 'keyup')
    expect(hero?.x).toBeGreaterThanOrEqual(32)
    game.fireKey('ArrowDown')
    game.nextFrame()
    game.fireKey('ArrowDown', 'keyup')
    expect(hero?.y).toBeGreaterThan(48)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Jogo desenhado por código coleta a moeda com as figuras reais', () => {
    const game = exampleHarness(codeDrawnExample)
    const [hero, coin] = game.sprites
    expect(hero).toBeDefined()
    expect(coin).toBeDefined()
    if (hero && coin) {
      coin.x = hero.x
      coin.y = hero.y
    }
    game.nextFrame()
    expect(game.scores['Moedas:']).toBe(1)
    expect(coin?.x === hero?.x && coin?.y === hero?.y).toBe(false)
    expect(game.errors).toEqual([])
  })

  it('Pong percorre início, vitória, derrota e novo jogo limpo', () => {
    const game = exampleHarness(pongExample)
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)

    const firstBall = game.sprites[2]
    expect(firstBall).toBeDefined()
    for (let point = 0; point < 8 && !game.api.sceneIs('vitoria'); point += 1) {
      if (firstBall) firstBall.x = 450
      game.nextFrame()
    }
    expect(game.scores['Você:']).toBe(5)
    expect(game.api.sceneIs('vitoria')).toBe(true)

    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    expect(game.sprites.length).toBe(6)
    expect(game.sprites[5]).not.toBe(firstBall)

    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    const secondBall = game.sprites[5]
    for (let point = 0; point < 5; point += 1) {
      if (secondBall) secondBall.x = -20
      game.nextFrame()
    }
    expect(game.api.sceneIs('derrota')).toBe(true)
    expect(game.errors).toEqual([])
  })

  /**
   * ⭐⭐ O caso acima percorre o Pong SEM JOGAR O PONG: ele teleporta a bola para
   * fora (450 / −20) para marcar ponto, então o rebote na raquete, o quique no
   * teto e no chão, a IA do computador e as setas NUNCA rodam com condição
   * verdadeira. É a classe que este repositório já catalogou cinco vezes — os
   * testes asseriam que a bala NASCEU, nunca que ela ACERTOU.
   *
   * Os casos abaixo jogam de verdade. Todos usam `random` fixo, então o saque é
   * determinístico: `randomBetween(-2, 2)` com 0,5 devolve 0 (bola reta).
   */
  const iniciarPong = () => {
    const game = exampleHarness(pongExample, () => 0.5)
    game.fireKey('Enter')
    const [jogador, computador, bola] = game.sprites
    if (!jogador || !computador || !bola) throw new Error('o Pong precisa dos três sprites')
    return { game, jogador, computador, bola }
  }

  it('⭐ a bola rebatida na raquete VOLTA e atravessa o campo até a outra raquete', () => {
    // O caso que não existia. Sem ele, apagar o rebote não quebraria teste nenhum.
    const { game, jogador, computador, bola } = iniciarPong()
    bola.x = jogador.x + jogador.w + 1
    bola.y = jogador.y + 16
    bola.vx = -3
    bola.vy = 0
    game.nextFrame()

    expect(bola.vx ?? 0).toBeGreaterThan(0)

    // ...e ela chega inteira ao outro lado, sem ninguém marcar ponto no caminho.
    for (let quadro = 0; quadro < 400 && bola.x + bola.w < computador.x; quadro += 1) {
      game.nextFrame()
      expect(game.scores['PC:'] ?? 0).toBe(0)
    }
    expect(bola.x + bola.w).toBeGreaterThanOrEqual(computador.x)
    expect(game.errors).toEqual([])
  })

  it('⭐ o ângulo da rebatida muda conforme o PONTO do impacto', () => {
    // É a alma do Pong: bater na beirada manda a bola mais de lado. Sem este caso,
    // um rebote que só inverte o sinal passaria como se fosse o jogo original.
    const impacto = (deslocamento: number) => {
      const { game, jogador, bola } = iniciarPong()
      bola.x = jogador.x + jogador.w + 1
      bola.y = jogador.y + deslocamento
      bola.vx = -3
      bola.vy = 0
      game.nextFrame()
      return bola.vy ?? 0
    }

    const noTopo = impacto(-4)
    const noMeio = impacto(16)
    const naBase = impacto(36)

    expect(noTopo).toBeLessThan(noMeio)
    expect(naBase).toBeGreaterThan(noMeio)
    expect(Math.abs(noTopo)).toBeGreaterThan(Math.abs(noMeio))
    expect(Math.abs(naBase)).toBeGreaterThan(Math.abs(noMeio))
  })

  it('⭐ a bola quica no teto e no chão e NUNCA sai do palco', () => {
    const { game, bola } = iniciarPong()
    bola.x = 200
    bola.y = 2
    bola.vx = 0
    bola.vy = -5
    game.nextFrame()
    expect(bola.vy ?? 0).toBeGreaterThan(0)

    let vazamento = 0
    for (let quadro = 0; quadro < 200; quadro += 1) {
      game.nextFrame()
      vazamento = Math.max(vazamento, -bola.y, bola.y + bola.h - 300)
    }

    // ⭐ DÍVIDA PAGA. Esta linha era `toBe(4)`: o quique feito à mão do exemplo
    // (`se bola.y <= 0 → vy = |vy|`) invertia a velocidade e NÃO corrigia a
    // posição, então a bola atravessava a borda e só voltava no quadro seguinte.
    // Vazava `|vy| − 1` px, e PIORAVA conforme ela acelerava. Com o bloco
    // "Quicar só no teto e no chão" (que corrige a posição, como o irmão de 4
    // bordas sempre fez) o vazamento é zero em qualquer velocidade.
    expect(vazamento).toBe(0)
    expect(game.errors).toEqual([])
  })

  it('a raquete do jogador sobe e desce com as setas e PARA na borda', () => {
    const { game, jogador } = iniciarPong()
    const inicio = jogador.y

    game.fireKey('ArrowUp')
    for (let quadro = 0; quadro < 40; quadro += 1) game.nextFrame()
    game.fireKey('ArrowUp', 'keyup')
    expect(jogador.y).toBeLessThan(inicio)
    expect(jogador.y).toBe(0)

    game.fireKey('ArrowDown')
    for (let quadro = 0; quadro < 80; quadro += 1) game.nextFrame()
    game.fireKey('ArrowDown', 'keyup')
    expect(jogador.y + jogador.h).toBe(300)
  })

  it('a IA do computador persegue a bola nos DOIS sentidos, sem sair do palco', () => {
    const { game, computador, bola } = iniciarPong()
    const centro = (sprite: { y: number; h: number }) => sprite.y + sprite.h / 2

    bola.x = 200
    bola.vx = 0
    bola.vy = 0
    bola.y = 270
    const antesDeDescer = Math.abs(centro(computador) - centro(bola))
    for (let quadro = 0; quadro < 20; quadro += 1) game.nextFrame()
    expect(Math.abs(centro(computador) - centro(bola))).toBeLessThan(antesDeDescer)

    bola.y = 10
    const antesDeSubir = Math.abs(centro(computador) - centro(bola))
    for (let quadro = 0; quadro < 40; quadro += 1) game.nextFrame()
    expect(Math.abs(centro(computador) - centro(bola))).toBeLessThan(antesDeSubir)

    expect(computador.y).toBeGreaterThanOrEqual(0)
    expect(computador.y + computador.h).toBeLessThanOrEqual(300)
  })

  it('o placar do PC também conta, e o saque é determinístico', () => {
    // O caso existente só afere `Você:`; a derrota era inferida pela cena.
    const { game, bola } = iniciarPong()
    for (let ponto = 1; ponto <= 5; ponto += 1) {
      bola.x = -30
      game.nextFrame()
      expect(game.scores['PC:']).toBe(ponto)
      if (ponto < 5) {
        // Saque: volta ao centro, vai para a direita e, com random 0,5, reto.
        expect(bola.x).toBe(214)
        expect(bola.y).toBe(144)
        expect(bola.vx).toBe(3)
        expect(bola.vy).toBe(0)
      }
    }
    expect(game.api.sceneIs('derrota')).toBe(true)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Plataforma com inimigos conclui pelos três tipos, perde vida e reinicia', () => {
    const game = exampleHarness(enemyPlatformerExample)
    expect(game.api.sceneIs('inicio')).toBe(true)
    expect(game.enemyTypes.map((type) => type.items.length)).toEqual([2, 1, 1])
    game.fireKey('Enter')

    for (const type of game.enemyTypes) {
      for (const enemy of type.items) enemy.hp = 0
    }
    game.nextFrame()
    expect(game.api.sceneIs('vitoria')).toBe(true)

    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    const restartedHero = game.sprites[1]
    expect(restartedHero).toBeDefined()
    if (restartedHero) restartedHero.hp = 0
    game.nextFrame()
    expect(game.api.sceneIs('derrota')).toBe(true)
    expect(game.errors).toEqual([])
  })

  it('Nave contra Asteroides atira, alcança a vitória, reinicia e também pode perder', () => {
    const game = exampleHarness(asteroidsExample)
    const asteroidsBeforeStart = game.groups[1]
    expect(asteroidsBeforeStart).toBeDefined()
    for (let frame = 0; frame < 80; frame += 1) game.nextFrame()
    expect(asteroidsBeforeStart?.items).toHaveLength(0)

    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)
    const shots = game.groups[0]
    const asteroids = game.groups[1]
    expect(shots).toBeDefined()
    expect(asteroids).toBeDefined()

    for (let point = 0; point < 25; point += 1) {
      game.fireKey('Space')
      const shot = shots?.items.at(-1)
      expect(shot).toBeDefined()
      if (shot && asteroids) {
        shot.vx = 0
        shot.vy = 0
        game.api.spawn(asteroids, {
          x: shot.x,
          y: shot.y,
          w: 30,
          h: 30,
          color: '#888888',
          vx: 0,
          vy: 0,
        })
      }
      game.nextFrame()
    }
    expect(game.scores['Pontos:']).toBe(25)
    expect(game.api.sceneIs('ganhou')).toBe(true)

    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    const waitingAsteroids = game.groups.at(-1)
    for (let frame = 0; frame < 80; frame += 1) game.nextFrame()
    expect(waitingAsteroids?.items).toHaveLength(0)

    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    const restartedShip = game.sprites.at(-1)
    const restartedAsteroids = game.groups.at(-1)
    for (let impact = 0; impact < 6 && !game.api.sceneIs('perdeu'); impact += 1) {
      if (restartedShip && restartedAsteroids) {
        restartedShip.blinkFrames = 0
        game.api.spawn(restartedAsteroids, {
          x: restartedShip.x,
          y: restartedShip.y,
          w: restartedShip.w,
          h: restartedShip.h,
          color: '#888888',
          vx: 0,
          vy: 0,
        })
      }
      game.nextFrame()
    }
    expect(game.scores['Vidas:']).toBeLessThanOrEqual(0)
    expect(game.api.sceneIs('perdeu')).toBe(true)
    expect(game.errors).toEqual([])
  })

  it('Asteroides clássico gira, atira, pontua, colide e recomeça', () => {
    const game = exampleHarness(asteroidsClassicExample)
    const ship = game.sprites[0]
    game.fireKey('Enter')
    game.fireKey('ArrowRight')
    game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(Math.abs(ship?.angle ?? 0)).toBeGreaterThan(0)

    game.fireKey('Space')
    const shots = game.groups[0]
    const asteroids = game.groups[1]
    const shot = shots?.items.at(-1)
    if (shot && asteroids) {
      shot.vx = 0
      shot.vy = 0
      game.api.spawn(asteroids, {
        x: shot.x,
        y: shot.y,
        w: 30,
        h: 30,
        color: '#888888',
        vx: 0,
        vy: 0,
      })
    }
    game.nextFrame()
    expect(game.scores['Pontos:']).toBe(1)

    if (ship && asteroids) {
      game.api.spawn(asteroids, {
        x: ship.x,
        y: ship.y,
        w: ship.w,
        h: ship.h,
        color: '#888888',
        vx: 0,
        vy: 0,
      })
    }
    game.nextFrame()
    expect(game.api.sceneIs('perdeu')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    expect(game.errors).toEqual([])
  })

  it('Dino Run coleta ovo, perde as três vidas, salva o resultado e reinicia', () => {
    const game = exampleHarness(dinoRunExample)
    const dino = game.sprites[0]
    const obstacles = game.groups[0]
    const eggs = game.groups[1]
    game.fireKey('Enter')

    if (dino && eggs) {
      game.api.spawn(eggs, {
        x: dino.x,
        y: dino.y,
        w: 24,
        h: 30,
        color: '#ffd54a',
        vx: 0,
        vy: 0,
      })
    }
    game.nextFrame()
    expect(game.scores['Pontos:']).toBeGreaterThanOrEqual(10)

    for (let life = 0; life < 3; life += 1) {
      if (dino && obstacles) {
        dino.blinkFrames = 0
        game.api.spawn(obstacles, {
          x: dino.x,
          y: dino.y,
          w: 36,
          h: 36,
          color: '#5f8c3a',
          vx: 0,
          vy: 0,
        })
      }
      game.nextFrame()
    }
    expect(game.api.sceneIs('perdeu')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    expect(game.groups.length).toBe(4)
    expect(game.errors).toEqual([])
  })

  it('Guerra de Gorilas permite mirar, acertar, vencer e começar uma cidade nova', () => {
    const game = exampleHarness(gorilasExample)
    game.fireKey('Enter')
    const [playerOne, playerTwo] = game.throwers
    expect(playerOne).toBeDefined()
    expect(playerTwo).toBeDefined()
    if (playerOne && playerTwo) {
      playerTwo.x = playerOne.x
      playerTwo.y = playerOne.y
      game.firePointer('pointerdown', playerOne.x + playerOne.w / 2, playerOne.y + 18)
      game.nextFrame()
      game.firePointer('pointerup', playerOne.x + playerOne.w / 2, playerOne.y + 18)
      game.nextFrame()
    }
    expect(game.api.sceneIs('ganhou1')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    expect(game.cities).toHaveLength(2)
    expect(game.errors).toEqual([])
  })

  it('Guerra de Gorilas vs Robô troca o turno e o robô realmente mira e joga', () => {
    const game = exampleHarness(gorilasVsRobotExample, () => 0)
    game.fireKey('Enter')
    const [human, robot] = game.throwers
    expect(human).toBeDefined()
    expect(robot).toBeDefined()

    if (human) {
      game.firePointer('pointerdown', human.x + human.w / 2, human.y + 18)
      game.nextFrame()
      game.firePointer('pointerup', human.x + human.w / 2, human.y + 18)
    }
    for (let frame = 0; frame < 120 && game.scores['Vez:'] !== 2; frame += 1) {
      game.nextFrame()
    }
    expect(game.scores['Vez:']).toBe(2)

    if (human && robot) {
      human.x = robot.x
      human.y = robot.y
    }
    for (let frame = 0; frame < 70 && !game.api.sceneIs('ganhou2'); frame += 1) {
      game.nextFrame()
    }
    expect(game.calls.computerTurn).toBeGreaterThanOrEqual(49)
    expect(game.api.sceneIs('ganhou2')).toBe(true)
    expect(game.errors).toEqual([])
  })

  it('Equilibrista atravessa via mouse (se/senão), soma pontos, cai e reinicia', () => {
    const game = exampleHarness(stickHeroExample)
    const path = game.stickGames[0]
    const hero = game.sprites[0]
    expect(path).toBeDefined()
    expect(hero).toBeDefined()
    if (!path || !hero) return
    // O caminho nasce com as cores da criança; o herói é um sprite comum.
    expect(path.colors).toEqual({ platform: '#0ea5a0', stick: '#1b2330' })
    expect([hero.w, hero.h]).toEqual([18, 36])

    game.fireKey('Enter')
    game.nextFrame()

    // Mira o comprimento até o MEIO da próxima plataforma; o exemplo lê o
    // ponteiro no se/senão (segurado cresce, solto derruba).
    const target = path.platforms[1]
    const stick = path.sticks[0]
    expect(target).toBeDefined()
    expect(stick).toBeDefined()
    const targetLength = target && stick ? target.x + target.w / 2 - stick.x : 0

    game.firePointer('pointerdown', 100, 100)
    for (let frame = 0; frame < 200 && (stick?.length ?? 0) < targetLength; frame += 1) {
      game.nextFrame()
    }
    game.firePointer('pointerup', 100, 100)
    for (let frame = 0; frame < 240 && path.phase !== 'waiting'; frame += 1) {
      game.nextFrame()
    }
    // O placar é a VARIÁVEL da criança, somada no evento e mostrada no HUD.
    expect(game.scores['Pontos:']).toBeGreaterThan(0)
    // O sprite do herói foi posicionado pelo "andar" (coords de tela).
    expect(hero.y).toBeLessThan(path.h)

    // Cai: a cena vira "perdeu" e o Enter recomeça o jogo inteiro (restart).
    path.phase = 'falling'
    path.heroY = path.h + 1
    game.nextFrame()
    game.nextFrame()
    expect(game.api.sceneIs('perdeu')).toBe(true)
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    // O restart recriou o caminho (a captura ACUMULA; o novo é o último).
    expect(game.stickGames.length).toBeGreaterThan(1)
    const recreated = game.stickGames[game.stickGames.length - 1]
    expect(recreated?.phase).toBe('waiting')
    expect(game.errors).toEqual([])
  })

  it('Balão sobe com o fogo, conta metros, pousa sem combustível e reinicia', () => {
    const game = exampleHarness(balloonExample)
    const path = game.balloonGames[0]
    const balloon = game.sprites[0] as CapturedSprite & { _fuel?: number }
    expect(path).toBeDefined()
    expect(balloon).toBeDefined()
    if (!path || !balloon) return
    expect([balloon.w, balloon.h]).toEqual([70, 100])

    game.fireKey('Enter')
    game.nextFrame()

    // Segurar o ponteiro acende o fogo (se do exemplo): sobe e queima.
    const yStart = balloon.y
    game.firePointer('pointerdown', 100, 100)
    for (let frame = 0; frame < 45; frame += 1) game.nextFrame()
    game.firePointer('pointerup', 100, 100)
    expect(balloon.y).toBeLessThan(yStart)
    expect(balloon._fuel ?? 100).toBeLessThan(100)
    expect(path.meters).toBeGreaterThan(0)
    expect(game.scores['Metros:']).toBeGreaterThan(0)

    // Sem combustível e pousado: a cena vira "perdeu"; Enter recomeça tudo.
    balloon._fuel = 0
    balloon.y = path.h
    balloon.vy = 0
    game.nextFrame()
    game.nextFrame()
    expect(game.api.sceneIs('perdeu')).toBe(true)
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    // O restart recriou o balão (a captura ACUMULA; o novo é o último).
    const recreated = game.sprites[game.sprites.length - 1] as CapturedSprite & { _fuel?: number }
    expect(recreated?._fuel).toBe(100)
    expect(game.errors).toEqual([])
  })

  it('Aventura com câmera percorre o mundo, coleta as 4 moedas e conclui a exploração', () => {
    const game = exampleHarness(cameraAdventureExample)
    const hero = game.sprites[0]
    const scenery = game.groups[0]
    const coins = game.groups[1]
    expect(scenery?.items).toHaveLength(6)
    expect(coins?.items).toHaveLength(4)
    for (let found = 0; found < 4; found += 1) {
      const coin = coins?.items[0]
      expect(coin).toBeDefined()
      if (hero && coin) {
        hero.x = coin.x
        hero.y = coin.y
      }
      game.nextFrame()
    }
    expect(coins?.items).toHaveLength(0)
    expect(game.scores['Moedas:']).toBe(4)
    expect(game.api.cameraX()).toBeGreaterThan(0)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Batalha de Monstrinhos trava os comandos, aplica a vantagem, alterna turnos e clampa a cura', () => {
    // random fixo 0,5: randomChance(60) é true → o rival sempre usa o Chicote (-3).
    const game = exampleHarness(batalhaMonstrinhosExample, () => 0.5)
    const [meu, rival] = game.sprites
    expect(meu?.hp).toBe(20)
    expect(rival?.hp).toBe(20)
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)

    // Antes da abertura (afterSeconds marca aos 2s; a raiz de 0,5s libera),
    // o menu está TRAVADO.
    game.fireKey('1')
    game.fireKey('1', 'keyup')
    game.nextFrame()
    expect(rival?.hp).toBe(20)

    // (a) entrar rápido: ~2,2s depois o timer + a raiz de liberação soltam o
    // turno do jogador (o que vier POR ÚLTIMO).
    for (let frame = 0; frame < 130; frame += 1) game.nextFrame()
    game.fireKey('1')
    game.fireKey('1', 'keyup')
    game.nextFrame()
    // Faísca: fogo contra planta = forca(4) × 2 = 8 de dano.
    expect(rival?.hp).toBe(12)
    // O HUD mostra o estoque de poções (ainda cheio).
    expect(game.scores['3 Poção (cura 5) x']).toBe(3)

    // A vez do rival: a raiz "A cada 1,5s" devolve o golpe e o turno.
    for (let frame = 0; frame < 100; frame += 1) game.nextFrame()
    expect(meu?.hp).toBe(17)

    // Poção: cura "até 5" mas o runtime CLAMPA no máximo (17 + 5 → 20), e
    // gasta 1 do estoque (3 → 2).
    game.fireKey('3')
    game.fireKey('3', 'keyup')
    game.nextFrame()
    expect(meu?.hp).toBe(20)
    expect(game.scores['3 Poção (cura 5) x']).toBe(2)

    // Mais dois golpes de fogo encerram a batalha: 12 → 4 → 0.
    for (let frame = 0; frame < 100; frame += 1) game.nextFrame()
    game.fireKey('1')
    game.fireKey('1', 'keyup')
    game.nextFrame()
    expect(rival?.hp).toBe(4)
    for (let frame = 0; frame < 100; frame += 1) game.nextFrame()
    game.fireKey('1')
    game.fireKey('1', 'keyup')
    game.nextFrame()
    expect(rival?.hp).toBe(0)
    expect(game.api.sceneIs('vitoria')).toBe(true)

    // Enter reinicia limpo (e o afterSeconds re-arma junto).
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    const restartedRival = game.sprites.at(-1)
    expect(restartedRival?.hp).toBe(20)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Batalha de Monstrinhos: ficar na tela de título não consome a abertura (libera em até 0,5s)', () => {
    const game = exampleHarness(batalhaMonstrinhosExample, () => 0.5)
    const rival = game.sprites[1]
    expect(game.api.sceneIs('inicio')).toBe(true)

    // (b) A criança LÊ o título por ~3,2s: o afterSeconds dispara ainda no
    // título (um one-shot com guarda de cena no corpo seria consumido aqui e
    // travaria o jogo para sempre). Ele só marca aberturaPronta.
    for (let frame = 0; frame < 190; frame += 1) game.nextFrame()
    game.fireKey('1')
    game.fireKey('1', 'keyup')
    game.nextFrame()
    expect(rival?.hp).toBe(20)

    // Entra na batalha: o menu ainda espera a raiz de 0,5s do próximo tique.
    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)

    // Em até 0,5s (~35 quadros) a raiz de liberação solta os comandos.
    for (let frame = 0; frame < 35; frame += 1) game.nextFrame()
    game.fireKey('1')
    game.fireKey('1', 'keyup')
    game.nextFrame()
    expect(rival?.hp).toBe(12)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Batalha de Monstrinhos: a 4ª poção não faz nada e a derrota é alcançável', () => {
    // random fixo 0,99: randomChance(60) falha → o rival usa a Folha Afiada
    // com randomBetween(2, 5) = 5 (o golpe mais forte).
    const game = exampleHarness(batalhaMonstrinhosExample, () => 0.99)
    const [meu, rival] = game.sprites
    game.fireKey('Enter')
    for (let frame = 0; frame < 160; frame += 1) game.nextFrame()

    // Gasta as 3 poções (cada uma passa o turno; o rival responde com -5).
    for (let potion = 0; potion < 3; potion += 1) {
      game.fireKey('3')
      game.fireKey('3', 'keyup')
      game.nextFrame()
      expect(meu?.hp).toBe(20) // curou (clampado no máximo)
      for (let frame = 0; frame < 100; frame += 1) game.nextFrame()
      expect(meu?.hp).toBe(15) // a resposta do rival já saiu
    }
    game.nextFrame()
    expect(game.scores['3 Poção (cura 5) x']).toBe(0)

    // A 4ª poção NÃO cura e NÃO gasta o turno: 100 quadros depois o rival
    // continua sem responder (o turno segue com o jogador).
    game.fireKey('3')
    game.fireKey('3', 'keyup')
    game.nextFrame()
    expect(meu?.hp).toBe(15)
    for (let frame = 0; frame < 100; frame += 1) game.nextFrame()
    expect(meu?.hp).toBe(15)

    // Sem cura infinita a derrota é real: 3 Jatos (4 de dano) mantêm o rival
    // vivo (20 → 8) enquanto os -5 dele zeram o Brasinha (15 → 0).
    for (let hit = 0; hit < 3; hit += 1) {
      game.fireKey('2')
      game.fireKey('2', 'keyup')
      game.nextFrame()
      for (let frame = 0; frame < 100; frame += 1) game.nextFrame()
    }
    expect(rival?.hp).toBe(8)
    expect(meu?.hp).toBe(0)
    expect(game.api.sceneIs('derrota')).toBe(true)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Chuva de Meteoros voa nas 4 direções, atira, destrói, é atingida, perde e reinicia', () => {
    // random fixo 0,99: a chuva de fundo nasce colada na borda direita
    // (randomX = 475) com vx +1 — nunca alcança a nave, que fica embaixo à
    // esquerda. As colisões do roteiro são todas INJETADAS (determinísticas).
    const game = exampleHarness(chuvaDeMeteorosExample, () => 0.99)
    const nave = game.sprites[0]
    const tiros = game.groups[0]
    const meteoros = game.groups[1]
    expect(nave).toBeDefined()
    expect(game.api.sceneIs('inicio')).toBe(true)

    // Na tela de início a chuva NÃO cai (o spawner é gated pela cena jogando).
    for (let frame = 0; frame < 80; frame += 1) game.nextFrame()
    expect(meteoros?.items).toHaveLength(0)

    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)

    // 4 direções: esquerda + cima movem em diagonal (o input original).
    const startX = nave?.x ?? 0
    const startY = nave?.y ?? 0
    game.fireKey('ArrowLeft')
    game.fireKey('ArrowUp')
    for (let frame = 0; frame < 5; frame += 1) game.nextFrame()
    game.fireKey('ArrowLeft', 'keyup')
    game.fireKey('ArrowUp', 'keyup')
    expect(nave?.x).toBeLessThan(startX)
    expect(nave?.y).toBeLessThan(startY)

    // Clamp: segurar para baixo NÃO leva a nave para fora do palco (480×300).
    game.fireKey('ArrowDown')
    for (let frame = 0; frame < 90; frame += 1) game.nextFrame()
    game.fireKey('ArrowDown', 'keyup')
    expect((nave?.y ?? 0) + (nave?.h ?? 0)).toBeLessThanOrEqual(300)

    // Espaço atira: o laser nasce no centro da nave e SOBE (vy negativo).
    game.fireKey('Space')
    game.fireKey('Space', 'keyup')
    expect(tiros?.items).toHaveLength(1)
    const tiro = tiros?.items[0]
    const tiroY = tiro?.y ?? 0
    game.nextFrame()
    expect(tiro?.y ?? 0).toBeLessThan(tiroY)

    // Destruir: meteoro injetado sobre o laser parado = +2 pontos, os dois somem.
    const antesDoBonus = Number(game.scores['Pontos:'] ?? 0)
    if (tiro && meteoros) {
      tiro.vx = 0
      tiro.vy = 0
      game.api.spawn(meteoros, {
        x: tiro.x,
        y: tiro.y,
        w: 30,
        h: 30,
        color: '#b08968',
        vx: 0,
        vy: 0,
      })
    }
    game.nextFrame()
    expect(game.scores['Pontos:'] ?? 0).toBeGreaterThanOrEqual(antesDoBonus + 2)
    expect(tiros?.items).toHaveLength(0)
    expect(meteoros?.items.some((item) => item.w === 30)).toBe(false)

    // O placar POR TEMPO cresce sozinho (~1s de sobrevivência = +1).
    const antesDoTempo = Number(game.scores['Pontos:'] ?? 0)
    for (let frame = 0; frame < 65; frame += 1) game.nextFrame()
    expect(game.scores['Pontos:'] ?? 0).toBeGreaterThan(antesDoTempo)

    // Ser atingida: meteoro injetado sobre a nave = fim de jogo (sem vidas).
    if (nave && meteoros) {
      game.api.spawn(meteoros, {
        x: nave.x,
        y: nave.y,
        w: nave.w,
        h: nave.h,
        color: '#b08968',
        vx: 0,
        vy: 0,
      })
    }
    game.nextFrame()
    expect(game.api.sceneIs('perdeu')).toBe(true)

    // Enter reinicia limpo: nave nova, grupos novos e placar zerado.
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    expect(game.sprites.at(-1)).not.toBe(nave)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('jogando')).toBe(true)
    expect(game.scores['Pontos:']).toBe(0)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Muralha do Reino compra torre no clique, atira, destrói invasor, perde vida e reinicia', () => {
    // random fixo 0,5: os invasores nascem na faixa y ~170. As colisões do
    // roteiro são INJETADAS (determinísticas), não dependem do RNG.
    const game = exampleHarness(muralhaDoReinoExample, () => 0.5)
    const castelo = game.sprites[0]
    const inimigos = game.groups[0]
    const torres = game.groups[1]
    const tiros = game.groups[2]
    expect(castelo).toBeDefined()
    expect(game.api.sceneIs('inicio')).toBe(true)

    // Na tela de início nada nasce (todo spawner é gated pela cena jogando).
    for (let frame = 0; frame < 80; frame += 1) game.nextFrame()
    expect(inimigos?.items).toHaveLength(0)
    expect(tiros?.items).toHaveLength(0)

    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)

    // Os invasores nascem fora da tela à esquerda e marcham para a DIREITA.
    for (let frame = 0; frame < 130; frame += 1) game.nextFrame()
    expect(inimigos?.items.length ?? 0).toBeGreaterThan(0)
    const invasor = inimigos?.items[0]
    const invasorX = invasor?.x ?? 0
    game.nextFrame()
    expect(invasor?.x ?? 0).toBeGreaterThan(invasorX)

    // Comprar torre: clicar na faixa de baixo gasta 50 moedas e cria uma torre.
    expect(game.scores['Moedas:']).toBe(100)
    game.firePointer('pointerdown', 120, 260)
    expect(torres?.items).toHaveLength(1)
    game.nextFrame()
    expect(game.scores['Moedas:']).toBe(50)

    // A torre atira sozinha (a cada 0,5 s) e, como a bala (y 182) agora divide a
    // MESMA faixa dos invasores (y 168) — o P1 do review —, ela os ABATE de verdade:
    // a bala é consumida no impacto e as moedas SOBEM (+25 por invasor), sem nenhuma
    // injeção artificial sobre o tiro. Antes do fix a bala voava numa faixa vazia e
    // as moedas de abate nunca subiam. Observamos a janela: em ALGUM quadro há tiro
    // em voo (a torre dispara) E as moedas crescem (a bala encosta no invasor).
    const moedasAntes = game.scores['Moedas:'] ?? 0
    let viuTiro = false
    let moedasSubiram = false
    for (let frame = 0; frame < 120; frame += 1) {
      game.nextFrame()
      if ((tiros?.items.length ?? 0) > 0) viuTiro = true
      if ((game.scores['Moedas:'] ?? 0) > moedasAntes) moedasSubiram = true
    }
    expect(viuTiro).toBe(true)
    expect(moedasSubiram).toBe(true)

    // Invasor que encosta no castelo tira 1 vida e some.
    const vidasAntes = Number(game.scores['Vidas:'] ?? 10)
    if (castelo && inimigos) {
      game.api.spawn(inimigos, {
        x: castelo.x,
        y: castelo.y,
        w: 30,
        h: 30,
        color: '#c0504d',
        vx: 0,
        vy: 0,
      })
    }
    game.nextFrame()
    expect(game.scores['Vidas:'] ?? 0).toBe(vidasAntes - 1)

    // Sem vidas o castelo cai (a cena perdeu). Injeta invasores até drenar tudo.
    for (let round = 0; round < 12; round += 1) {
      if (castelo && inimigos) {
        game.api.spawn(inimigos, {
          x: castelo.x,
          y: castelo.y,
          w: 30,
          h: 30,
          color: '#c0504d',
          vx: 0,
          vy: 0,
        })
      }
      game.nextFrame()
    }
    expect(game.api.sceneIs('perdeu')).toBe(true)

    // Enter reinicia limpo: moedas de volta a 100 e sem invasores.
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('jogando')).toBe(true)
    expect(game.scores['Moedas:']).toBe(100)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Escalada do Guerreiro sobe pulando, a câmera acompanha e a bandeira do topo vence', () => {
    const game = exampleHarness(escaladaDoGuerreiroExample, () => 0.5)
    const heroi = game.sprites[0]
    const plataformas = game.groups[0]
    expect(heroi).toBeDefined()
    // 9 plataformas em ziguezague (chão + 8 degraus).
    expect(plataformas?.items).toHaveLength(9)
    expect(game.api.sceneIs('inicio')).toBe(true)

    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)

    // O chão sólido segura o herói: a gravidade o assenta no chão (não atravessa).
    for (let frame = 0; frame < 20; frame += 1) game.nextFrame()
    const restY = heroi?.y ?? 0
    expect((restY ?? 0) + (heroi?.h ?? 0)).toBeLessThanOrEqual(916)
    expect(heroi?.vy ?? 1).toBe(0)

    // Andar para a direita: o herói se desloca no eixo x.
    const startX = heroi?.x ?? 0
    game.fireKey('ArrowRight')
    for (let frame = 0; frame < 4; frame += 1) game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(heroi?.x ?? 0).toBeGreaterThan(startX)

    // Pular do chão: com ↑ (parado na vertical) o herói sobe num quadro.
    for (let frame = 0; frame < 6; frame += 1) game.nextFrame()
    const antesDoPulo = heroi?.y ?? 0
    game.fireKey('ArrowUp')
    game.nextFrame()
    game.fireKey('ArrowUp', 'keyup')
    expect(heroi?.y ?? 0).toBeLessThan(antesDoPulo)

    // Teletransporta o herói para o topo: passar da linha (y < 90) vence.
    if (heroi) {
      heroi.x = 84
      heroi.y = 70
      heroi.vy = 0
    }
    game.nextFrame()
    // A câmera acompanhou o herói mundo acima (o pan do original).
    expect(game.api.cameraX).toBeDefined()
    expect(game.api.sceneIs('venceu')).toBe(true)

    // Enter reinicia e dá para escalar de novo.
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('jogando')).toBe(true)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Aventura do Herói anda com câmera, corta o mato, fere com a espada temporária e conclui', () => {
    const game = exampleHarness(aventuraHeroiExample)
    const hero = game.sprites[0]
    const cenario = game.groups[0]
    const golpes = game.groups[1]
    const guarda = game.enemyTypes[0]
    expect(hero).toBeDefined()
    expect(guarda?.items).toHaveLength(4)
    // O herói entra no MESMO grupo das árvores (drawGroupByY ordena os dois).
    expect(cenario?.items).toHaveLength(7)
    expect(cenario?.items[0]).toBe(hero as CapturedSprite)

    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)
    const startX = hero?.x ?? 0
    game.fireKey('ArrowRight')
    for (let frame = 0; frame < 3; frame += 1) game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(hero?.x).toBeGreaterThan(startX)
    // Mundo maior que a tela: a câmera já rolou.
    expect(game.api.cameraX()).toBeGreaterThan(0)

    // Espada temporária: nasce no espaço e o pruneOld (0,3s) some com ela.
    game.fireKey('Space')
    game.fireKey('Space', 'keyup')
    expect(golpes?.items).toHaveLength(1)
    for (let frame = 0; frame < 30; frame += 1) game.nextFrame()
    expect(golpes?.items).toHaveLength(0)

    // Mato destrutível: golpe em cima da peça 2 quebra o tile e dá 1 ponto.
    if (hero) {
      hero.x = 289
      hero.y = 690
    }
    game.fireKey('Space')
    game.fireKey('Space', 'keyup')
    game.nextFrame()
    expect(game.scores['Pontos:']).toBe(1)

    // Contato com o guardião: hurtByEnemy com i-frames (piscar).
    const enemy = guarda?.items[0]
    if (enemy && hero) {
      enemy.x = hero.x
      enemy.y = hero.y
    }
    game.nextFrame()
    expect(hero?.hp).toBe(5)
    expect(hero?.blinkFrames ?? 0).toBeGreaterThan(0)
    // Enquanto pisca, o contato contínuo NÃO drena a vida.
    game.nextFrame()
    expect(hero?.hp).toBe(5)

    // A espada fere o guardião (e é consumida no golpe). Antes, afasta os
    // dois e deixa o pruneOld levar o golpe do mato (ainda vivo, < 0,3s).
    if (hero) {
      hero.x = 800
      hero.y = 600
    }
    if (enemy) {
      enemy.x = 1000
      enemy.y = 300
    }
    for (let frame = 0; frame < 30; frame += 1) game.nextFrame()
    expect(golpes?.items).toHaveLength(0)
    if (enemy && hero) {
      enemy.x = hero.x + 30
      enemy.y = hero.y - 4
      enemy.hp = 3
    }
    game.fireKey('Space')
    game.fireKey('Space', 'keyup')
    game.nextFrame()
    expect(enemy?.hp).toBe(2)
    expect(golpes?.items).toHaveLength(0)

    // Derrotar os 4 guardiões conclui a aventura (+5 pontos por guardião).
    for (const guardian of guarda?.items ?? []) guardian.hp = 0
    game.nextFrame()
    expect(game.scores['Pontos:']).toBe(21)
    expect(game.api.sceneIs('vitoria')).toBe(true)

    // Reinicia e ainda dá para perder: vida zerada troca para a derrota.
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    const restartedHero = game.sprites.at(-1)
    expect(restartedHero).toBeDefined()
    if (restartedHero) restartedHero.hp = 0
    game.nextFrame()
    expect(game.api.sceneIs('derrota')).toBe(true)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Duelo de Heróis: dois jogadores andam, pulam, o golpe tira vida e há vencedor por nocaute', () => {
    const game = exampleHarness(dueloDeHeroisExample, () => 0.5)
    // Ordem de criação: heroi1, heroi2, golpe1, golpe2 (o chão vai no grupo).
    const [heroi1, heroi2] = game.sprites
    expect(heroi1?.hp).toBe(100)
    expect(heroi2?.hp).toBe(100)
    expect(game.api.sceneIs('inicio')).toBe(true)

    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)

    // Andar (lido a cada quadro): A leva o azul para a esquerda; D para a direita.
    const azulX = heroi1?.x ?? 0
    game.fireKey('a')
    for (let frame = 0; frame < 4; frame += 1) game.nextFrame()
    game.fireKey('a', 'keyup')
    expect(heroi1?.x ?? 0).toBeLessThan(azulX)

    // O vermelho anda com as setas.
    const vermelhoX = heroi2?.x ?? 0
    game.fireKey('ArrowRight')
    for (let frame = 0; frame < 4; frame += 1) game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(heroi2?.x ?? 0).toBeGreaterThan(vermelhoX)

    // Pular do chão: W tira o azul do chão num quadro.
    for (let frame = 0; frame < 6; frame += 1) game.nextFrame()
    const azulY = heroi1?.y ?? 0
    game.fireKey('w')
    game.nextFrame()
    expect(heroi1?.y ?? 0).toBeLessThan(azulY)

    // O golpe tira vida: encosta os dois e o azul soca com F (uma vez por golpe).
    if (heroi1 && heroi2) {
      heroi1.x = 200
      heroi1.y = 200
      heroi1.vy = 0
      heroi2.x = 224
      heroi2.y = 200
      heroi2.vy = 0
    }
    game.fireKey('f')
    game.nextFrame()
    expect(heroi2?.hp ?? 100).toBeLessThan(100)
    const vidaVermelho = heroi2?.hp ?? 0

    // Um golpe não drena a vida sozinho: no quadro seguinte a vida não cai mais.
    game.nextFrame()
    expect(heroi2?.hp ?? 0).toBe(vidaVermelho)

    // A recarga conta quadros da partida, não quantas vezes a pergunta foi
    // consultada. Esperar 30 quadros deve liberar um novo golpe sem obrigar a
    // criança a apertar F repetidamente durante a recarga.
    game.fireKey('f', 'keyup')
    for (let frame = 0; frame < 30; frame += 1) game.nextFrame()
    if (heroi1 && heroi2) {
      heroi1.x = 200
      heroi1.y = 200
      heroi1.vy = 0
      heroi2.x = 224
      heroi2.y = 200
      heroi2.vy = 0
    }
    game.fireKey('f')
    game.nextFrame()
    expect(heroi2?.hp ?? 0).toBeLessThan(vidaVermelho)

    // A caixa continua visível por 12 quadros. Entrar nela durante essa janela
    // também precisa acertar, ainda uma única vez por golpe.
    const vidaAntesDoGolpeAtrasado = heroi2?.hp ?? 0
    game.fireKey('f', 'keyup')
    for (let frame = 0; frame < 30; frame += 1) game.nextFrame()
    if (heroi1 && heroi2) {
      heroi1.x = 200
      heroi1.y = 200
      heroi1.vy = 0
      heroi2.x = 270
      heroi2.y = 200
      heroi2.vy = 0
    }
    game.fireKey('f')
    game.nextFrame()
    expect(heroi2?.hp ?? 0).toBe(vidaAntesDoGolpeAtrasado)
    if (heroi2) heroi2.x = 250
    game.nextFrame()
    expect(heroi2?.hp ?? 0).toBeLessThan(vidaAntesDoGolpeAtrasado)
    game.nextFrame()
    expect(heroi2?.hp ?? 0).toBe(vidaAntesDoGolpeAtrasado - 8)

    // Nocaute: zerar a vida do vermelho leva à tela "ganhou1".
    if (heroi2) heroi2.hp = 0
    game.nextFrame()
    expect(game.api.sceneIs('ganhou1')).toBe(true)

    // Enter reinicia limpo: heróis novos com a vida cheia de volta.
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('jogando')).toBe(true)
    const restartedAzul = game.sprites.at(-4)
    expect(restartedAzul).not.toBe(heroi1)
    expect(restartedAzul?.hp).toBe(100)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Duelo de Heróis: golpes simultâneos que zeram as duas vidas terminam em empate', () => {
    const game = exampleHarness(dueloDeHeroisExample, () => 0.5)
    const [heroi1, heroi2] = game.sprites
    expect(heroi1).toBeDefined()
    expect(heroi2).toBeDefined()

    game.fireKey('Enter')
    for (let frame = 0; frame < 8; frame += 1) game.nextFrame()
    if (heroi1 && heroi2) {
      heroi1.x = 200
      heroi1.y = 200
      heroi1.vy = 0
      heroi1.hp = 8
      heroi2.x = 224
      heroi2.y = 200
      heroi2.vy = 0
      heroi2.hp = 8
    }

    game.fireKey('f')
    game.fireKey('ArrowDown')
    game.nextFrame()

    expect(heroi1?.hp).toBe(0)
    expect(heroi2?.hp).toBe(0)
    expect(game.api.sceneIs('empate')).toBe(true)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Portas do Castelo: o rei anda, pula, cruza a porta com fade, troca de fase e vence no fim', () => {
    const game = exampleHarness(portasDoCasteloExample, () => 0.5)
    const rei = game.sprites[0]
    const porta = game.sprites[1]
    const blocos = game.groups[0]
    expect(rei).toBeDefined()
    expect(porta).toBeDefined()
    // Fase 1 começa com o chão + 2 plataformas.
    expect(blocos?.items).toHaveLength(3)
    expect(game.api.sceneIs('inicio')).toBe(true)

    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)

    // O chão sólido segura o rei (a gravidade o assenta, não atravessa).
    for (let frame = 0; frame < 20; frame += 1) game.nextFrame()
    expect((rei?.y ?? 0) + (rei?.h ?? 0)).toBeLessThanOrEqual(300)
    expect(rei?.vy ?? 1).toBe(0)

    // Andar para a direita: o rei se desloca no eixo x.
    const startX = rei?.x ?? 0
    game.fireKey('ArrowRight')
    for (let frame = 0; frame < 4; frame += 1) game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(rei?.x ?? 0).toBeGreaterThan(startX)

    // Pular do chão: a seta pra cima tira o rei do chão num quadro.
    for (let frame = 0; frame < 6; frame += 1) game.nextFrame()
    const antesDoPulo = rei?.y ?? 0
    game.fireKey('ArrowUp')
    game.nextFrame()
    expect(rei?.y ?? 0).toBeLessThan(antesDoPulo)

    // Cruzar a porta da fase 1: encostar dispara a transição (o clarão) e, no
    // meio dela, remonta a fase 2 e reposiciona o rei no começo.
    if (rei && porta) {
      rei.x = porta.x
      rei.y = porta.y
      rei.vx = 0
      rei.vy = 0
    }
    for (let frame = 0; frame < 45; frame += 1) game.nextFrame()
    expect(game.scores['Fase:']).toBe(2)
    expect(rei?.x).toBe(60)

    // Atravessa a porta da fase 2 e depois a da fase 3 para vencer.
    for (let fase = 2; fase <= 3; fase += 1) {
      const portaAtual = game.sprites[1]
      if (rei && portaAtual) {
        rei.x = portaAtual.x
        rei.y = portaAtual.y
        rei.vx = 0
        rei.vy = 0
      }
      for (let frame = 0; frame < 45; frame += 1) game.nextFrame()
    }
    expect(game.api.sceneIs('venceu')).toBe(true)

    // Enter reinicia limpo: de volta à fase 1 (o rei recomeça no início).
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('jogando')).toBe(true)
    expect(game.scores['Fase:']).toBe(1)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Vale Ensolarado: o herói anda, pula, junta as 6 gemas, vence e reinicia limpo', () => {
    const game = exampleHarness(valeEnsolaradoExample, () => 0.5)
    const heroi = game.sprites[0]
    // Grupos na ordem de criação: chão, gemas, corações.
    const gemas = game.groups[1]
    expect(heroi).toBeDefined()
    expect(gemas?.items).toHaveLength(6)
    expect(game.api.sceneIs('inicio')).toBe(true)

    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)

    // O chão sólido segura o herói (a gravidade o assenta, não atravessa).
    for (let frame = 0; frame < 20; frame += 1) game.nextFrame()
    expect((heroi?.y ?? 0) + (heroi?.h ?? 0)).toBeLessThanOrEqual(270)

    // Andar para a direita: o herói se desloca no eixo x.
    const startX = heroi?.x ?? 0
    game.fireKey('ArrowRight')
    for (let frame = 0; frame < 4; frame += 1) game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(heroi?.x ?? 0).toBeGreaterThan(startX)

    // Pular do chão: a seta pra cima tira o herói do chão num quadro.
    for (let frame = 0; frame < 8; frame += 1) game.nextFrame()
    const antesDoPulo = heroi?.y ?? 0
    game.fireKey('ArrowUp')
    game.nextFrame()
    expect(heroi?.y ?? 0).toBeLessThan(antesDoPulo)

    // Cair no poço do chão (a lacuna de 60px entre x340 e x400) NÃO trava o jogo:
    // o herói perde um coração e respawna no começo do vale, em vez de despencar
    // pra sempre. Regressão do soft-lock achado no full review R3+R4 — sem o
    // tratador de queda, heroi.y cresceria sem limite e este teste falharia.
    if (heroi) {
      heroi.x = 360
      heroi.y = 236
      heroi.vy = 0
    }
    const vidaAntesDaQueda = heroi?.hp ?? 0
    for (let frame = 0; frame < 40; frame += 1) game.nextFrame()
    expect((heroi?.y ?? 999) + (heroi?.h ?? 0)).toBeLessThanOrEqual(270)
    expect(heroi?.x ?? 999).toBeLessThan(340)
    expect(heroi?.hp ?? 0).toBe(vidaAntesDaQueda - 1)

    // Juntar as 6 gemas: teletransporta o herói para cima de cada gema.
    for (let found = 0; found < 6; found += 1) {
      const gema = gemas?.items[0]
      expect(gema).toBeDefined()
      if (heroi && gema) {
        heroi.x = gema.x
        heroi.y = gema.y
      }
      game.nextFrame()
    }
    expect(gemas?.items).toHaveLength(0)
    expect(game.scores['Gemas:']).toBe(0)
    expect(game.scores['Pontos:']).toBe(60)
    expect(game.api.sceneIs('vitoria')).toBe(true)

    // Enter reinicia limpo: de volta ao início com as 6 gemas.
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('jogando')).toBe(true)
    expect(game.scores['Gemas:']).toBe(6)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Vila Ninja: o ninja anda, ataca, derrota os 4 monstros, vence, também pode perder', () => {
    const game = exampleHarness(vilaNinjaExample, () => 0.5)
    const heroi = game.sprites[0]
    const golpes = game.groups[2]
    const monstros = game.enemyTypes[0]
    expect(heroi).toBeDefined()
    expect(monstros?.items).toHaveLength(4)
    expect(game.api.sceneIs('inicio')).toBe(true)

    game.fireKey('Enter')
    expect(game.api.sceneIs('jogando')).toBe(true)

    // Andar nas 4 direções (top-down): a seta pra direita desloca no x.
    const startX = heroi?.x ?? 0
    game.fireKey('ArrowRight')
    for (let frame = 0; frame < 4; frame += 1) game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(heroi?.x ?? 0).toBeGreaterThan(startX)

    // Atacar com espaço: nasce um golpe (hitbox temporária) na direção olhada.
    game.fireKey('Space')
    game.fireKey('Space', 'keyup')
    expect(golpes?.items).toHaveLength(1)
    // O golpe some sozinho (pruneOld 0,25s).
    for (let frame = 0; frame < 20; frame += 1) game.nextFrame()
    expect(golpes?.items).toHaveLength(0)

    // Derrotar os 4 monstros (o ataque leva 3 golpes; aqui zeramos a vida).
    for (const inimigo of monstros?.items ?? []) inimigo.hp = 0
    game.nextFrame()
    expect(game.scores['Pontos:']).toBe(20)
    expect(game.api.sceneIs('vitoria')).toBe(true)

    // Enter reinicia e ainda dá para perder: vida zerada troca para a derrota.
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    const restartedHero = game.sprites.at(-1)
    expect(restartedHero).toBeDefined()
    if (restartedHero) restartedHero.hp = 0
    game.nextFrame()
    expect(game.api.sceneIs('derrota')).toBe(true)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('Treinador de Criaturas: anda no mapa, entra no mato, batalha por turnos, vence e também pode perder', () => {
    // random fixo 0,99: randomChance(50) falha -> a criatura usa a patada (-6).
    const game = exampleHarness(treinadorDeCriaturasExample, () => 0.99)
    // Ordem de criação: heroi, criatura, mato.
    const heroi = game.sprites[0]
    const rival = game.sprites[1]
    const mato = game.sprites[2]
    expect(heroi).toBeDefined()
    expect(rival?.hp).toBe(24)
    expect(mato).toBeDefined()
    expect(game.api.sceneIs('inicio')).toBe(true)

    game.fireKey('Enter')
    expect(game.api.sceneIs('mapa')).toBe(true)

    // Anda nas 4 direções (top-down): a seta pra direita desloca no x.
    const startX = heroi?.x ?? 0
    game.fireKey('ArrowRight')
    for (let frame = 0; frame < 4; frame += 1) game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(heroi?.x ?? 0).toBeGreaterThan(startX)

    // Longe do mato ainda é MAPA (a batalha só começa ao encostar na zona).
    if (heroi && mato) {
      heroi.x = mato.x - 200
      heroi.y = mato.y
    }
    game.nextFrame()
    expect(game.api.sceneIs('mapa')).toBe(true)

    // Encostar no mato alto dispara a batalha por turnos (o battleZones).
    if (heroi && mato) {
      heroi.x = mato.x
      heroi.y = mato.y
    }
    game.nextFrame()
    expect(game.api.sceneIs('batalha')).toBe(true)

    // Sua vez: a tecla 1 (Brasa) tira 8 da criatura.
    game.fireKey('1')
    game.fireKey('1', 'keyup')
    game.nextFrame()
    expect(rival?.hp).toBe(16)

    // A vez da criatura: a raiz "A cada 1,2s" devolve o golpe (patada -6) e o turno.
    const minhaVida = heroi?.hp ?? 24
    for (let frame = 0; frame < 90; frame += 1) game.nextFrame()
    expect(heroi?.hp ?? 0).toBe(minhaVida - 6)

    // Mais dois golpes de Brasa encerram a batalha: 16 -> 8 -> 0.
    game.fireKey('1')
    game.fireKey('1', 'keyup')
    game.nextFrame()
    expect(rival?.hp).toBe(8)
    for (let frame = 0; frame < 90; frame += 1) game.nextFrame()
    game.fireKey('1')
    game.fireKey('1', 'keyup')
    game.nextFrame()
    expect(rival?.hp).toBe(0)
    expect(game.api.sceneIs('vitoria')).toBe(true)

    // Enter reinicia limpo: de volta ao início com a criatura de vida cheia.
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    const restartedRival = game.sprites.at(-2)
    expect(restartedRival?.hp).toBe(24)

    // Também dá para PERDER: entra na batalha e zera a própria vida.
    game.fireKey('Enter', 'keyup')
    game.fireKey('Enter')
    expect(game.api.sceneIs('mapa')).toBe(true)
    const heroi2 = game.sprites.at(-3)
    const mato2 = game.sprites.at(-1)
    if (heroi2 && mato2) {
      heroi2.x = mato2.x
      heroi2.y = mato2.y
    }
    game.nextFrame()
    expect(game.api.sceneIs('batalha')).toBe(true)
    if (heroi2) heroi2.hp = 0
    game.nextFrame()
    expect(game.api.sceneIs('derrota')).toBe(true)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })
})
