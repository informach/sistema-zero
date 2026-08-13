import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

interface Sprite {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  onGround?: boolean
  hp?: number
  dmg?: number
  _shell?: boolean
  _shellMoving?: boolean
}

interface TileContact {
  map: TileMap
  index: number
  row: number
  col: number
  x: number
  y: number
  // 'inside' = sobreposição pura, sem resolução de colisão (o par do papel 'contact').
  side: 'head' | 'feet' | 'left' | 'right' | 'inside'
}

interface TileMap {
  rows: number[][]
  tileset: unknown
  layout: { x: number; y: number; tileSize: number } | null
}

interface EnemyType {
  items: Sprite[]
}

interface Api {
  createSprite(options: Partial<Sprite>): Sprite
  defineShape(name: string, draw: (ctx: CanvasRenderingContext2D) => void): void
  createVectorTileset(tileSize: number): unknown
  defineVectorTile(
    tileset: unknown,
    index: number,
    shape: string,
    // 'contact' = a criança ATRAVESSA a peça e o jogo avisa (moeda, lava, água).
    role: 'decor' | 'solid' | 'platform' | 'contact',
  ): void
  createVectorTileMap(tileset: unknown, grid: string): TileMap
  placeTileMap(map: TileMap, x: number, y: number, tileSize: number): void
  drawTileMap(ctx: CanvasRenderingContext2D, map: TileMap): void
  collideTileMap(sprite: Sprite, map: TileMap): void
  forEachTileContact(
    sprite: Sprite,
    map: TileMap,
    side: TileContact['side'] | 'any',
    visit: (contact: TileContact) => void,
  ): void
  tileContactIs(contact: TileContact, index: number): boolean
  setTileAtContact(contact: TileContact, index: number): void
  enableClassicControls(mode: 'auto' | 'always' | 'off'): void
  actionDown(action: string): boolean
  actionPressed(action: string): boolean
  onActionPressed(action: string, fn: () => void, id?: string): void
  pauseGame(): void
  resumeGame(): void
  isPaused(): boolean
  classicPlatformer(sprite: Sprite, speed: number, jump: number): void
  platformerWithTerrain(sprite: Sprite, speed: number, jump: number): void
  createEnemyType(options: Record<string, unknown>): EnemyType
  spawnEnemy(type: EnemyType, x: number, y: number): Sprite | null
  setEnemyStompMode(type: EnemyType, mode: 'defeat' | 'damage' | 'squash' | 'shell' | 'spiky'): void
  stompEnemyType(sprite: Sprite, type: EnemyType, bounce: number): void
  hurtByEnemy(sprite: Sprite, enemy: Sprite): void
  setHealth(sprite: Sprite, value: number): void
  getHealth(sprite: Sprite): number
  updateEnemyShells(type: EnemyType, world?: unknown): void
  drawPixelText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    pixelSize: number,
    color: string,
    align?: 'left' | 'center' | 'right',
  ): void
  drawFade(ctx: CanvasRenderingContext2D, percent: number, color: string): void
}

function load(): {
  api: Api
  listeners: Record<string, Array<(event: Record<string, unknown>) => void>>
  document: Document
} {
  const isolatedDocument = document.implementation.createHTMLDocument('Jogo clássico')
  const listeners: Record<string, Array<(event: Record<string, unknown>) => void>> = {}
  const win = {
    addEventListener(name: string, listener: (event: Record<string, unknown>) => void) {
      listeners[name] ??= []
      listeners[name].push(listener)
    },
    matchMedia: () => ({ matches: true }),
    navigator: { maxTouchPoints: 5 },
    performance: { now: () => 0 },
    devicePixelRatio: 1,
    SZGame2D: undefined,
  } as unknown as Record<string, unknown>
  new Function('window', 'document', 'requestAnimationFrame', gameTwoDRuntime)(
    win,
    isolatedDocument,
    () => 0,
  )
  const api = win.SZGame2D as Api | undefined
  if (!api) throw new Error('runtime não montou window.SZGame2D')
  return { api, listeners, document: isolatedDocument }
}

function fire(
  listeners: Record<string, Array<(event: Record<string, unknown>) => void>>,
  name: string,
  event: Record<string, unknown>,
) {
  for (const listener of listeners[name] ?? []) listener(event)
}

describe('primitivas de plataforma clássica', () => {
  it('expõe ações semânticas com borda de aperto e teclado clássico', () => {
    const { api, listeners } = load()

    fire(listeners, 'keydown', { key: 'z', code: 'KeyZ', repeat: false })
    expect(api.actionDown('jump')).toBe(true)
    expect(api.actionPressed('jump')).toBe(true)

    fire(listeners, 'keyup', { key: 'z', code: 'KeyZ' })
    expect(api.actionDown('jump')).toBe(false)
    fire(listeners, 'keydown', { key: 'Enter', code: 'Enter', repeat: false })
    expect(api.actionDown('start')).toBe(true)
  })

  it('cria controles de toque acessíveis e aceita dois botões simultâneos', () => {
    const { api, document } = load()
    api.enableClassicControls('always')

    const left = document.querySelector<HTMLButtonElement>('[data-sz-g2d-action="left"]')
    const jump = document.querySelector<HTMLButtonElement>('[data-sz-g2d-action="jump"]')
    expect(left?.getAttribute('aria-label')).toBe('Mover para a esquerda')
    expect(jump?.getAttribute('aria-label')).toBe('Pular')

    left?.dispatchEvent(new Event('pointerdown'))
    jump?.dispatchEvent(new Event('pointerdown'))
    expect(api.actionDown('left')).toBe(true)
    expect(api.actionDown('jump')).toBe(true)

    left?.dispatchEvent(new Event('pointerup'))
    expect(api.actionDown('left')).toBe(false)
    expect(api.actionDown('jump')).toBe(true)
  })

  it('oferece a ação cima e ativa botões por teclado e tecnologia assistiva', () => {
    const { api, document } = load()
    api.enableClassicControls('always')

    const up = document.querySelector<HTMLButtonElement>('[data-sz-g2d-action="up"]')
    const jump = document.querySelector<HTMLButtonElement>('[data-sz-g2d-action="jump"]')
    expect(up?.getAttribute('aria-label')).toBe('Mover para cima')

    jump?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(api.actionDown('jump')).toBe(true)
    expect(api.actionPressed('jump')).toBe(true)
    jump?.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }))
    expect(api.actionDown('jump')).toBe(false)

    up?.click()
    expect(api.actionDown('up')).toBe(true)
    expect(api.actionPressed('up')).toBe(true)
  })

  it('despacha a mesma ação de pausa por teclado e toque, sem alternância implícita', () => {
    const { api, listeners, document } = load()
    let activations = 0
    api.onActionPressed(
      'pause',
      () => {
        activations += 1
        if (api.isPaused()) api.resumeGame()
        else api.pauseGame()
      },
      'alternar-pausa',
    )

    fire(listeners, 'keydown', { key: 'Escape', code: 'Escape', repeat: false })
    expect(activations).toBe(1)
    expect(api.isPaused()).toBe(true)
    fire(listeners, 'keyup', { key: 'Escape', code: 'Escape' })

    api.enableClassicControls('always')
    const pause = document.querySelector<HTMLButtonElement>('[data-sz-g2d-action="pause"]')
    pause?.dispatchEvent(new Event('pointerdown'))
    expect(activations).toBe(2)
    expect(api.isPaused()).toBe(false)
    pause?.dispatchEvent(new Event('pointerup'))

    pause?.click()
    expect(activations).toBe(3)
    expect(api.isPaused()).toBe(true)
  })

  it('acelera, freia e permite pulo de altura variável em passos determinísticos', () => {
    const { api, listeners } = load()
    const player = api.createSprite({ x: 0, y: 80, w: 14, h: 16 })
    player.onGround = true

    fire(listeners, 'keydown', { key: 'ArrowRight', code: 'ArrowRight', repeat: false })
    api.classicPlatformer(player, 2.5, 6)
    const firstVelocity = player.vx
    api.classicPlatformer(player, 2.5, 6)
    expect(firstVelocity).toBeGreaterThan(0)
    expect(player.vx).toBeGreaterThan(firstVelocity)
    expect(player.vx).toBeLessThanOrEqual(2.5)

    fire(listeners, 'keydown', { key: 'z', code: 'KeyZ', repeat: false })
    player.onGround = true
    api.classicPlatformer(player, 2.5, 6)
    const heldJump = player.vy
    fire(listeners, 'keyup', { key: 'z', code: 'KeyZ' })
    api.classicPlatformer(player, 2.5, 6)
    expect(player.vy).toBeGreaterThan(heldJump)
  })

  it('⭐ pular CORRENDO sobe mais que pular parado', () => {
    // A assinatura do pulo do gênero, e o motor não tinha: o impulso era o mesmo
    // número parado ou em disparada. Um teste que só olhasse "pulou?" passaria
    // idêntico antes e depois, que foi como isso ficou tanto tempo sem ninguém ver.
    const { api, listeners } = load()
    fire(listeners, 'keydown', { key: 'z', code: 'KeyZ', repeat: false })

    const parado = api.createSprite({ x: 0, y: 80, w: 14, h: 16 })
    parado.onGround = true
    parado.vx = 0
    api.classicPlatformer(parado, 2.5, 6)

    const emDisparada = api.createSprite({ x: 0, y: 80, w: 14, h: 16 })
    emDisparada.onGround = true
    emDisparada.vx = 2.5 * 1.64 // o teto da corrida
    api.classicPlatformer(emDisparada, 2.5, 6)

    expect(Math.abs(emDisparada.vy)).toBeGreaterThan(Math.abs(parado.vy))
  })

  it('⭐ soltar o botão cedo dá pulinho; segurar dá o pulo inteiro', () => {
    const { api, listeners } = load()

    const arco = (segurarQuadros: number): number => {
      const heroi = api.createSprite({ x: 0, y: 200, w: 14, h: 16 })
      heroi.onGround = true
      fire(listeners, 'keydown', { key: 'z', code: 'KeyZ', repeat: false })
      let maisAlto = heroi.y
      for (let frame = 0; frame < 40; frame += 1) {
        if (frame === segurarQuadros) fire(listeners, 'keyup', { key: 'z', code: 'KeyZ' })
        api.classicPlatformer(heroi, 2.5, 6)
        // Sem cenário aqui não existe chão para pousar; segurar o estado no ar é o
        // que impede o "apertado" preso (o carimbo não avança fora do laço de quadro)
        // de disparar um pulo novo e mascarar a medida.
        heroi.onGround = false
        maisAlto = Math.min(maisAlto, heroi.y)
      }
      fire(listeners, 'keyup', { key: 'z', code: 'KeyZ' })
      return 200 - maisAlto
    }

    const pulinho = arco(1)
    const inteiro = arco(40)
    expect(pulinho).toBeGreaterThan(0)
    expect(inteiro).toBeGreaterThan(pulinho * 1.8)
  })

  it('⭐ no ar o impulso horizontal é CONSERVADO (nada de atrito aéreo)', () => {
    // O atrito de 0.015 por quadro comia o alcance no meio do voo — é o que impede
    // um pulo longo de existir. Anti-vácuo: no CHÃO o atrito continua freando.
    const { api } = load()

    const noAr = api.createSprite({ x: 0, y: 40, w: 14, h: 16 })
    noAr.vx = 3
    noAr.onGround = false
    for (let frame = 0; frame < 20; frame += 1) {
      api.classicPlatformer(noAr, 2.5, 6)
      noAr.onGround = false
    }
    expect(noAr.vx).toBe(3)

    const noChao = api.createSprite({ x: 0, y: 40, w: 14, h: 16 })
    noChao.vx = 3
    noChao.onGround = true
    api.classicPlatformer(noChao, 2.5, 6)
    expect(noChao.vx).toBeLessThan(3)
  })

  it('desenha tiles vetoriais pelo registro de figuras, sem imagem externa', () => {
    const { api } = load()
    const calls: string[] = []
    const ctx = {
      canvas: { width: 64, height: 64 },
      save() {},
      restore() {},
      translate(x: number, y: number) {
        calls.push(`translate:${x},${y}`)
      },
      fillRect(x: number, y: number, w: number, h: number) {
        calls.push(`rect:${x},${y},${w},${h}`)
      },
    } as unknown as CanvasRenderingContext2D
    api.defineShape('bloco', (shapeCtx) => shapeCtx.fillRect(0, 0, 16, 16))
    const tileset = api.createVectorTileset(16)
    api.defineVectorTile(tileset, 0, 'bloco', 'solid')
    const map = api.createVectorTileMap(tileset, '0 .;0 0')
    api.placeTileMap(map, 0, 0, 16)

    api.drawTileMap(ctx, map)
    expect(calls.filter((call) => call.startsWith('rect:'))).toHaveLength(3)
    expect(map.rows).toEqual([
      [0, -1],
      [0, 0],
    ])
  })

  it('expõe o tile e o lado exatos da colisão para blocos destrutíveis', () => {
    const { api } = load()
    const tileset = api.createVectorTileset(16)
    api.defineVectorTile(tileset, 4, 'tijolo', 'solid')
    const map = api.createVectorTileMap(tileset, '.;4')
    api.placeTileMap(map, 0, 0, 16)
    const player = api.createSprite({ x: 1, y: 5, w: 14, h: 14, vy: 4 })

    api.collideTileMap(player, map)
    const contacts: TileContact[] = []
    api.forEachTileContact(player, map, 'feet', (contact) => contacts.push(contact))

    expect(contacts).toHaveLength(1)
    const contact = contacts[0]
    if (!contact) throw new Error('contato esperado não foi registrado')
    expect(contact).toMatchObject({ index: 4, row: 1, col: 0, side: 'feet' })
    expect(api.tileContactIs(contact, 4)).toBe(true)
    expect(api.tileContactIs(contact, 2)).toBe(false)
    api.setTileAtContact(contact, -1)
    expect(map.rows[1]?.[0]).toBe(-1)
  })

  it('⭐ a pisada recolhe o inimigo num casco PARADO — quem chuta é o encostão', () => {
    // ⚠️ Isto era o INVERSO: o casco saía disparado já na primeira pisada e era a
    // segunda que o parava. No gênero, pisar recolhe e ENCOSTAR lança — e é essa
    // ordem que transforma o casco numa decisão em vez de num enfeite rolante.
    const { api } = load()
    const type = api.createEnemyType({ hp: 1, dmg: 1, w: 16, h: 16 })
    const enemy = api.spawnEnemy(type, 16, 16)
    const player = api.createSprite({ x: 16, y: 5, w: 16, h: 16, vy: 5 })
    if (!enemy) throw new Error('inimigo não nasceu')
    api.setEnemyStompMode(type, 'shell')

    api.stompEnemyType(player, type, 5)
    expect(enemy._shell).toBe(true)
    expect(enemy._shellMoving).toBe(false)
    expect(enemy.hp).toBeGreaterThan(0)
    // Parado é inofensivo: encostar nele não pode custar vida.
    expect(enemy.dmg).toBe(0)

    const paradoEm = enemy.x
    api.updateEnemyShells(type)
    expect(enemy.x).toBe(paradoEm)

    // O encostão chuta, e o casco em movimento volta a MACHUCAR.
    api.hurtByEnemy(player, enemy)
    expect(enemy._shellMoving).toBe(true)
    expect(enemy.dmg).toBe(1)
    api.updateEnemyShells(type)
    expect(enemy.x).not.toBe(paradoEm)
  })

  it('⭐ o casco parado não machuca; o casco que já se afastou machuca', () => {
    // ⚠️ A versão anterior deste caso chamava `hurtByEnemy` DUAS VEZES SEGUIDAS, sem
    // um quadro no meio — e por isso consagrava um defeito em vez de pegá-lo. No jogo
    // real o chute e o "encostão seguinte" acontecem em quadros diferentes, e o casco
    // anda 5 px/quadro contra um herói que corre quase isso: a sobreposição do
    // PRÓPRIO chute durava vários quadros e cobrava vida de quem chutou. Agora o
    // casco só volta a machucar quem o chutou depois que os dois se descolam.
    const { api } = load()
    const type = api.createEnemyType({ hp: 1, dmg: 2, w: 16, h: 16 })
    const casco = api.spawnEnemy(type, 60, 16)
    const heroi = api.createSprite({ x: 60, y: 5, w: 16, h: 16, vy: 5 })
    if (!casco) throw new Error('inimigo não nasceu')
    api.setHealth(heroi, 5)
    api.setEnemyStompMode(type, 'shell')
    api.stompEnemyType(heroi, type, 5)

    // A pisada reposiciona o herói em cima; para medir o CONTATO do chute ele
    // precisa estar de fato sobreposto ao casco, como fica no jogo.
    heroi.x = casco.x
    heroi.y = casco.y

    // Encostar num casco parado CHUTA (e não tira vida nenhuma).
    api.hurtByEnemy(heroi, casco)
    expect(api.getHealth(heroi)).toBe(5)
    expect(casco._shellMoving).toBe(true)

    // Ainda em cima dele no quadro seguinte: o próprio chute não pode punir.
    api.updateEnemyShells(type)
    api.hurtByEnemy(heroi, casco)
    expect(api.getHealth(heroi)).toBe(5)

    // Descolou: agora o casco em movimento cobra o dano do bicho, como qualquer um.
    for (let frame = 0; frame < 8; frame += 1) api.updateEnemyShells(type)
    api.hurtByEnemy(heroi, casco)
    expect(api.getHealth(heroi)).toBe(3)
  })

  it('um casco EM MOVIMENTO derrota inimigos de outros tipos registrados', () => {
    const { api } = load()
    const shells = api.createEnemyType({ hp: 1, w: 16, h: 16 })
    const targets = api.createEnemyType({ hp: 1, w: 16, h: 16 })
    const shell = api.spawnEnemy(shells, 16, 16)
    const target = api.spawnEnemy(targets, 21, 16)
    const player = api.createSprite({ x: 16, y: 5, w: 16, h: 16, vy: 5 })
    if (!shell || !target) throw new Error('inimigos não nasceram')
    api.setEnemyStompMode(shells, 'shell')

    api.stompEnemyType(player, shells, 5)
    // Parado ele não varre ninguém — anti-vácuo do caso de baixo.
    api.updateEnemyShells(shells)
    expect(target.hp).toBe(1)

    api.hurtByEnemy(player, shell) // o chute
    api.updateEnemyShells(shells)

    expect(shell._shell).toBe(true)
    expect(target.hp).toBe(0)
    expect(target.dmg).toBe(0)
  })

  it('o modo de pisada com dano preserva inimigos resistentes até o último golpe', () => {
    const { api } = load()
    const type = api.createEnemyType({ hp: 2, dmg: 1, w: 16, h: 16 })
    const enemy = api.spawnEnemy(type, 16, 16)
    const player = api.createSprite({ x: 16, y: 5, w: 16, h: 16, vy: 5 })
    if (!enemy) throw new Error('inimigo não nasceu')
    api.setEnemyStompMode(type, 'damage')

    api.stompEnemyType(player, type, 5)
    expect(enemy.hp).toBe(1)
    expect(enemy.dmg).toBe(1)

    player.y = 5
    player.vy = 5
    api.stompEnemyType(player, type, 5)
    expect(enemy.hp).toBe(0)
    expect(enemy.dmg).toBe(0)
  })

  it('não reposiciona nem quica o jogador ao tentar pisar em inimigo espinhoso', () => {
    const { api } = load()
    const type = api.createEnemyType({ hp: 1, w: 16, h: 16 })
    api.spawnEnemy(type, 16, 16)
    const player = api.createSprite({ x: 16, y: 5, w: 16, h: 16, vy: 5 })
    api.setEnemyStompMode(type, 'spiky')
    const before = { y: player.y, vy: player.vy }

    api.stompEnemyType(player, type, 5)

    expect(player.y).toBe(before.y)
    expect(player.vy).toBe(before.vy)
    expect(type.items).toHaveLength(1)
  })

  it('⭐ o pad de TOQUE move os helpers antigos, não só a plataforma clássica', () => {
    // ⚠️ O pad alimenta só a camada semântica, e por muito tempo apenas dois helpers
    // a liam. No celular, o botão de direção não movia nada num jogo feito com o
    // "Mover como plataforma" — que é o bloco mais usado da extensão.
    const { api, listeners, document: doc } = load()
    api.enableClassicControls('always')

    const heroi = api.createSprite({ x: 100, y: 40, w: 16, h: 16 })
    const inicio = heroi.x
    const botao = doc.querySelector<HTMLButtonElement>('[data-sz-g2d-action="right"]')
    expect(botao).not.toBeNull()
    botao?.dispatchEvent(new Event('pointerdown'))

    api.platformerWithTerrain(heroi, 4, 11)
    expect(heroi.x).toBeGreaterThan(inicio)

    // Anti-vácuo: com o dedo SOLTO ele não anda sozinho.
    botao?.dispatchEvent(new Event('pointerup'))
    const parado = heroi.x
    api.platformerWithTerrain(heroi, 4, 11)
    expect(heroi.x).toBe(parado)

    fire(listeners, 'keydown', { key: 'ArrowRight', code: 'ArrowRight', repeat: false })
    api.platformerWithTerrain(heroi, 4, 11)
    expect(heroi.x).toBeGreaterThan(parado)
  })

  it('⭐⭐ o pad NÃO empresta teclas de pulo aos blocos antigos de movimento', () => {
    // ⚠️ Os helpers antigos passaram a ler a camada semântica para o DEDO alcançá-los,
    // e herdaram junto o mapa de TECLAS dela: `z` e ESPAÇO viraram pulo em todo jogo
    // de plataforma que já existia. O exemplo oficial "Herói que anda" usa ESPAÇO para
    // atirar, então cada tiro lançava o herói no ar. O comentário do lote afirmava o
    // contrário ("para teclado os dois caminhos são equivalentes"), e é verdade só
    // para DIREÇÃO: setas e WASD alimentam os dois mapas, `z`/ESPAÇO só o novo.
    const pulou = (tecla: { key: string; code: string } | null): boolean => {
      const { api, listeners } = load()
      const heroi = api.createSprite({ x: 0, y: 100, w: 16, h: 16 })
      heroi.onGround = true
      api.platformerWithTerrain(heroi, 4, 11)
      heroi.vy = 0
      heroi.onGround = true
      if (tecla) fire(listeners, 'keydown', { ...tecla, repeat: false })
      api.platformerWithTerrain(heroi, 4, 11)
      return heroi.vy < 0
    }

    // Anti-vácuo: a tecla de pulo DE SEMPRE continua pulando.
    expect(pulou({ key: 'ArrowUp', code: 'ArrowUp' })).toBe(true)
    expect(pulou(null)).toBe(false)

    // E as duas que a camada clássica trouxe NÃO pulam aqui.
    expect(pulou({ key: ' ', code: 'Space' })).toBe(false)
    expect(pulou({ key: 'z', code: 'KeyZ' })).toBe(false)
  })

  it('⭐ esconder a aba SOLTA as ações do teclado clássico', () => {
    // O teclado do núcleo solta as teclas no blur E ao esconder a aba; este só tinha
    // o blur. Trocar de aba por atalho deixava a ação presa e o herói andando sozinho.
    const { api, listeners, document: doc } = load()
    fire(listeners, 'keydown', { key: 'ArrowRight', code: 'ArrowRight', repeat: false })
    expect(api.actionDown('right')).toBe(true)

    Object.defineProperty(doc, 'hidden', { value: true, configurable: true })
    doc.dispatchEvent(new Event('visibilitychange'))
    expect(api.actionDown('right')).toBe(false)
  })

  it('⭐ a peça "atravessa e avisa" NÃO segura o sprite, mas gera contato', () => {
    // ⚠️ Sem isto não existe moeda de cenário, lava nem água: o contato de tile só
    // nascia da RESOLUÇÃO de colisão, ou seja, só valia para sólido e plataforma —
    // exatamente o oposto das peças que a criança atravessa.
    const { api } = load()
    api.defineShape('moeda', () => {})
    api.defineShape('chao', () => {})
    const tiles = api.createVectorTileset(16)
    api.defineVectorTile(tiles, 0, 'chao', 'solid')
    api.defineVectorTile(tiles, 1, 'moeda', 'contact')
    const map = api.createVectorTileMap(tiles, '1 1;0 0')
    api.placeTileMap(map, 0, 0, 16)

    const heroi = api.createSprite({ x: 0, y: 0, w: 16, h: 16 })
    heroi.vx = 1
    heroi.x = 1
    api.collideTileMap(heroi, map)

    // Atravessou: a peça não empurrou nem zerou a velocidade.
    expect(heroi.x).toBe(1)
    expect(heroi.vx).toBe(1)

    const dentro: number[] = []
    api.forEachTileContact(heroi, map, 'inside', (contato) => {
      dentro.push(contato.col)
      expect(api.tileContactIs(contato, 1)).toBe(true)
    })
    expect(dentro).toEqual([0, 1])

    // E a criança consegue APAGAR a peça no lugar exato — é assim que se coleta.
    api.forEachTileContact(heroi, map, 'inside', (contato) => {
      api.setTileAtContact(contato, -1)
    })
    expect(map.rows[0]).toEqual([-1, -1])

    // Anti-vácuo: a MESMA peça marcada como decoração não avisa nada.
    const mudos = api.createVectorTileset(16)
    api.defineVectorTile(mudos, 1, 'moeda', 'decor')
    const mapaMudo = api.createVectorTileMap(mudos, '1 1;1 1')
    api.placeTileMap(mapaMudo, 0, 0, 16)
    const outro = api.createSprite({ x: 0, y: 0, w: 16, h: 16 })
    api.collideTileMap(outro, mapaMudo)
    let avisos = 0
    api.forEachTileContact(outro, mapaMudo, 'any', () => {
      avisos += 1
    })
    expect(avisos).toBe(0)
  })

  it('⭐ o lado "dentro" FILTRA: um contato de chão não entra no laço da moeda', () => {
    // ⚠️ O caso acima monta uma cena onde NÃO existe contato de outro lado, então ele
    // passa idêntico com o filtro quebrado — é um vácuo. E o filtro estava mesmo
    // quebrado: a régua do runtime listava head/feet/left/right e caía em "qualquer"
    // para "dentro", que é o lado que este lote criou. O gesto que o manual ensina
    // ("Trocar o tile do contato por -1" dentro do laço) apagaria o CHÃO sob os pés.
    const { api } = load()
    api.defineShape('moeda', () => {})
    api.defineShape('chao', () => {})
    const tiles = api.createVectorTileset(16)
    api.defineVectorTile(tiles, 0, 'chao', 'solid')
    api.defineVectorTile(tiles, 1, 'moeda', 'contact')
    // Moeda na linha de cima, chão na de baixo: o herói pisa no chão E atravessa a moeda.
    const map = api.createVectorTileMap(tiles, '1 1;0 0')
    api.placeTileMap(map, 0, 0, 16)

    const heroi = api.createSprite({ x: 0, y: 4, w: 16, h: 16 })
    heroi.vy = 4
    api.collideTileMap(heroi, map)

    const pes: number[] = []
    api.forEachTileContact(heroi, map, 'feet', (contato) => pes.push(contato.index))
    // Anti-vácuo: o contato de CHÃO existe mesmo nesta cena.
    expect(pes).toContain(0)

    const dentro: number[] = []
    api.forEachTileContact(heroi, map, 'inside', (contato) => dentro.push(contato.index))
    expect(dentro.length).toBeGreaterThan(0)
    // E é SÓ a moeda: nenhum índice de chão pode entrar aqui.
    expect(dentro.every((index) => index === 1)).toBe(true)
  })

  it('⭐ a fonte de pixel tem a BARRA e os acentos do português', () => {
    // ⚠️ A barra faltava e a tela de título escreve "BACKSPACE: 1/2": saía 1?2. E
    // qualquer acento virava "?", que foi o motivo de o exemplo escrever RECOMECA
    // sem a cedilha — um contorno à mão para uma falta que era da fonte.
    const { api } = load()
    const desenhados: Array<[number, number]> = []
    const ctx = {
      save() {},
      restore() {},
      fillRect(x: number, y: number) {
        desenhados.push([x, y])
      },
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D

    const contarPixels = (texto: string): number => {
      desenhados.length = 0
      api.drawPixelText(ctx, texto, 0, 20, 1, '#fff', 'left')
      return desenhados.length
    }

    const interrogacao = contarPixels('?')
    // Cada um destes tem que ter desenho PRÓPRIO, e não o do "?" de fallback.
    for (const char of ['/', ',', '(', ')', '+', 'Ç', 'Á', 'Ã', 'É', 'Ô']) {
      expect(`${char}: ${contarPixels(char) === interrogacao}`).toBe(`${char}: false`)
    }

    // A vogal acentuada é a letra MAIS o acento, e sobe uma linha para a base ficar
    // alinhada com as vizinhas (senão o texto ficaria dançando).
    desenhados.length = 0
    api.drawPixelText(ctx, 'A', 0, 20, 1, '#fff', 'left')
    const semAcento = desenhados.length
    desenhados.length = 0
    api.drawPixelText(ctx, 'Á', 0, 20, 1, '#fff', 'left')
    const comAcento = desenhados.slice()
    expect(comAcento.length).toBeGreaterThan(semAcento)
    expect(Math.min(...comAcento.map(([, y]) => y))).toBe(19)
  })

  it('desenha texto pixelado e fade apenas com operações do canvas', () => {
    const { api } = load()
    let pixels = 0
    const alphas: number[] = []
    const ctx = {
      canvas: { width: 256, height: 240 },
      globalAlpha: 1,
      save() {},
      restore() {},
      fillRect(this: { globalAlpha: number }) {
        pixels += 1
        alphas.push(this.globalAlpha)
      },
    } as unknown as CanvasRenderingContext2D

    api.drawPixelText(ctx, '1-UP', 8, 8, 2, '#fff')
    expect(pixels).toBeGreaterThan(10)
    api.drawFade(ctx, 50, '#000')
    expect(alphas).toContain(0.5)
  })
})
