export type GameTwoDContext = CanvasRenderingContext2D

export interface GameTwoDKeys {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
}

export interface GameTwoDPointer {
  x: number
  y: number
  down: boolean
}

export interface GameTwoDImageHandle {
  img: HTMLImageElement | null
  loaded: boolean
  failed: boolean
  url: string
}

export interface GameTwoDSpriteSheet {
  image: GameTwoDImageHandle | null
  frameW: number
  frameH: number
}

export type GameTwoDAction =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'jump'
  | 'action'
  | 'select'
  | 'start'
  | 'pause'

export type GameTwoDSpriteDirection = 'left' | 'right' | 'up' | 'down'

export type GameTwoDVectorTileRole = 'decor' | 'solid' | 'platform'

export interface GameTwoDVectorTileset {
  readonly _kind: 'g2d-vector-tileset'
  tileSize: number
  tiles: Record<number, { shape: string; role: GameTwoDVectorTileRole }>
}

export interface GameTwoDAnimation {
  sheet: GameTwoDSpriteSheet
  from: number
  to: number
  fps: number
  start: number
}

export interface GameTwoDSpriteSkin {
  kind: string
  shape?: string
  body?: string
  wings?: string
  color?: string
  sides?: number
  spin?: number
  spinSpeed?: number
  type?: string
  side?: 'left' | 'right'
}

export interface GameTwoDSpriteOptions {
  x?: number
  y?: number
  w?: number
  h?: number
  color?: string
  vx?: number
  vy?: number
  image?: string | null
}

export interface GameTwoDSprite {
  x: number
  y: number
  w: number
  h: number
  color: string
  vx: number
  vy: number
  image: GameTwoDImageHandle | null
  anim: GameTwoDAnimation | null
  skin?: GameTwoDSpriteSkin
  angle?: number
  facing?: number
  direction?: GameTwoDSpriteDirection
  opacity?: number
  hp?: number
  hpMax?: number
  dmg?: number
  onGround?: boolean
  blinkFrames?: number
  _cooldowns?: Record<string, number>
  /** Dial da colisão perdoadora: fator da hitbox (1 = tamanho cheio). */
  _hitboxScale?: number
}

export interface GameTwoDGroup<TSprite extends GameTwoDSprite = GameTwoDSprite> {
  items: TSprite[]
  /** Versão interna de pertencimento/ordem usada pelas varreduras com snapshot. */
  _revision?: number
}

export interface GameTwoDTileMapOptions {
  image?: string
  tile?: number
  solid?: string
  platform?: string
  grid?: string
}

export interface GameTwoDTileLayout {
  x: number
  y: number
  tileSize: number
  width: number
  height: number
  mode: 'placed' | 'fitted' | 'legacy'
}

export interface GameTwoDTileMap {
  tileset: GameTwoDSpriteSheet | GameTwoDVectorTileset
  tile: number
  draw: number
  rows: number[][]
  solid: number[]
  platform: number[]
  layout: GameTwoDTileLayout | null
  ox: number
  oy: number
}

export type GameTwoDTileContactSide = 'head' | 'feet' | 'left' | 'right'

export interface GameTwoDTileContact {
  map: GameTwoDTileMap
  index: number
  row: number
  col: number
  x: number
  y: number
  side: GameTwoDTileContactSide
}

export type GameTwoDStompMode = 'defeat' | 'damage' | 'squash' | 'shell' | 'spiky'

export type GameTwoDWorldEdges = 'none' | 'floor' | 'solid'
export type GameTwoDCameraHorizontal = 'off' | 'free' | 'right' | 'left'
export type GameTwoDCameraVertical = 'off' | 'free' | 'down' | 'up'

export interface GameTwoDWorld {
  readonly _kind: 'g2d-world'
  width: number
  height: number
  edges: GameTwoDWorldEdges
  tileMaps: GameTwoDTileMap[]
  terrain: Array<{ kind: 'solid' | 'platform'; group: GameTwoDGroup }>
  camera: {
    x: number
    y: number
    horizontal: GameTwoDCameraHorizontal
    vertical: GameTwoDCameraVertical
    deadZoneX: number
    deadZoneY: number
  }
}

export interface GameTwoDLevel {
  readonly _kind: 'g2d-level'
  world: GameTwoDWorld
  spawnX: number
  spawnY: number
  /** Grupos dinâmicos limpos somente por `restartLevel`. */
  resetGroups: GameTwoDGroup[]
}

export interface GameTwoDEnemyTypeOptions extends GameTwoDSpriteOptions {
  behavior?: string
  hp?: number
  speed?: number
  dmg?: number
}

export interface GameTwoDSmartEnemyTypeOptions extends GameTwoDEnemyTypeOptions {
  /** burra | basica | avancada | ultra | rei — cada uma semeia um pacote de comportamentos. */
  smart?: string
}

export interface GameTwoDEnemyType extends GameTwoDGroup {
  bullets: GameTwoDGroup
  config: {
    /** O comportamento de NASCENÇA; nunca muda (o "Somar" mexe só em `behaviors`). */
    behavior: string
    /** Os comportamentos somados, em ordem — a fonte da verdade do "atualizar". */
    behaviors: string[]
    color: string
    image: string
    hp: number
    speed: number
    dmg: number
    w: number
    h: number
  }
  onDefeat: ((sprite: GameTwoDSprite) => void) | null
}

export interface GameTwoDCity {
  buildings: Array<{
    x: number
    w: number
    h: number
    color: string
    lights: boolean[]
  }>
  holes: Array<{ x: number; y: number; r: number }>
  wind: number
  W: number
  H: number
}

export interface GameTwoDStickPath {
  ctx: GameTwoDContext
  w: number
  h: number
  phase: string
  sceneOffset: number
  platforms: Array<{ x: number; w: number }>
  sticks: Array<{ x: number; length: number; rotation: number }>
}

export interface GameTwoDBalloonPath {
  ctx: GameTwoDContext
  w: number
  h: number
  dist: number
  meters: number
  trees: Array<{ x: number; th: number; color: string }>
}

/** Ciclo de vida compartilhado pelo gerador, runtime e testes. */
export interface GameTwoDLifecycleApi {
  gameLoop(fn: () => void, id?: string): () => void
  onStart(fn: () => void, id?: string): void
  onPointer(fn: (x: number, y: number) => void, id?: string): void
  onKey(key: string, fn: () => void, id?: string): void
  /** Uma ação clássica apertada por teclado, toque ou tecnologia assistiva. */
  onActionPressed(action: GameTwoDAction, fn: () => void, id?: string): void
  /** Qualquer tecla OU toque na tela (a tela de "aperte para começar"). */
  onAnyInput(fn: () => void, id?: string): void
  pointer: GameTwoDPointer
  restart(): void
  setupStage(width: number, height: number, background: string): void
  setStageDescription(description: string): void
  sceneIs(name: string): boolean
}

export interface GameTwoDStageApi {
  clear(): void
  fitScreen(percent: number): void
  setupStageFull(background: string): void
  /** Moldura colorida em volta da tela do jogo (para enxergar a área do palco). */
  showStageBorder(color: string, width: number): void
  /**
   * Fixa o desenho da criança como cenário: repintado a cada `clear()`, cobrindo
   * o palco sem deformar. ⚠️ NÃO entra nos overrides de câmera (`_camWrap`) de
   * propósito — o cenário fica preso à tela, e é isso que deixa espaço para um
   * bloco de paralaxe no futuro.
   */
  setBackdrop(name: string): void
  /** Desenha o cenário AGORA, neste ponto do quadro (o que vier depois cobre). */
  drawBackdrop(ctx: GameTwoDContext, name: string): void
}

export interface GameTwoDSpriteApi {
  createSprite(options?: GameTwoDSpriteOptions): GameTwoDSprite
  drawSprite(ctx: GameTwoDContext, sprite: GameTwoDSprite): void
  isColliding(a: GameTwoDSprite, b: GameTwoDSprite): boolean
  setHitboxScale(sprite: GameTwoDSprite, percent: number): void
  loadImage(source: string): GameTwoDImageHandle | null
  loadSpriteSheet(name: string, frameWidth: number, frameHeight: number): GameTwoDSpriteSheet
  setImage(sprite: GameTwoDSprite, name: string | null): void
  setAnimation(
    sprite: GameTwoDSprite,
    sheet: GameTwoDSpriteSheet,
    from: number,
    to: number,
    fps: number,
  ): void
  /**
   * Anima UMA vez e CONGELA no último quadro (estrela cadente, golpe, baú que
   * abre). O par `animationEnded` responde quando terminou. Toda animação daqui
   * era loop infinito por construção — o `% quadros` do desenho era a única
   * coisa que existia.
   */
  playAnimationOnce(
    sprite: GameTwoDSprite,
    sheet: GameTwoDSpriteSheet,
    from: number,
    to: number,
    fps: number,
  ): void
  /** A animação de UMA VEZ já tocou tudo? (a que repete nunca acaba.) */
  animationEnded(sprite: GameTwoDSprite): boolean
  drawFrame(
    ctx: GameTwoDContext,
    sheet: GameTwoDSpriteSheet,
    index: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void
  setStateAnimation(
    sprite: GameTwoDSprite,
    state: string,
    sheet: GameTwoDSpriteSheet,
    from: number,
    to: number,
    fps: number,
  ): void
  autoAnimate(sprite: GameTwoDSprite): void
  defineShape(name: string, draw: (ctx: GameTwoDContext) => void): void
  setShape(sprite: GameTwoDSprite, name: string): void
  createShapeSprite(name: string, options?: GameTwoDSpriteOptions): GameTwoDSprite
  shapeW(): number
  shapeH(): number
  paintRect(
    ctx: GameTwoDContext,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ): void
  paintCircle(ctx: GameTwoDContext, x: number, y: number, radius: number, color: string): void
  paintEllipse(
    ctx: GameTwoDContext,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ): void
  paintTriangle(
    ctx: GameTwoDContext,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    color: string,
  ): void
  paintLine(
    ctx: GameTwoDContext,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    width: number,
  ): void
}

export interface GameTwoDPhysicsApi {
  setGravity(gravity: number): void
  /** Move o sprite pela velocidade. NÃO soma gravidade (ver `applyGravity`). */
  applyVelocity(sprite: GameTwoDSprite): void
  /** Soma a gravidade DO MUNDO ao `vy` do sprite (padrão 0.6; pode ser negativa). */
  applyGravity(sprite: GameTwoDSprite): void
  bounceOnEdges(sprite: GameTwoDSprite, ctx: GameTwoDContext): void
  circleCollides(a: GameTwoDSprite, b: GameTwoDSprite): boolean
}

export interface GameTwoDAudioApi {
  playSound(frequency: number, milliseconds: number): void
  playFx(name: string): void
  playMusic(name: string): void
  stopMusic(): void
  playNote(note: string, milliseconds: number): void
  /**
   * Áudio de ARQUIVO (o que a criança enviou), em oposição a tudo acima, que é
   * sintetizado. `clip`/`track` em vez de `sound`/`music` porque esses dois já
   * pertencem aos blocos de bip e de melodia pronta — e bloco que a criança já
   * usa não muda de forma.
   */
  loadSound(name: string, asset: string): void
  playClip(name: string): void
  stopClip(name: string): void
  playTrack(name: string): void
  stopTrack(): void
  setSoundVolume(level: number): void
  playShoot(): void
  playExplosion(): void
  playJump(): void
  playDinoHurt(): void
  playCollect(): void
  playWhistle(): void
}

export interface GameTwoDMathAndStateApi {
  distance(a: GameTwoDSprite, b: GameTwoDSprite): number
  angleTo(a: GameTwoDSprite, b: GameTwoDSprite): number
  aimAt(a: GameTwoDSprite, b: GameTwoDSprite): void
  moveToward(a: GameTwoDSprite, b: GameTwoDSprite, speed: number): void
  randomBetween(min: number, max: number): number
  randomChance(percent: number): boolean
  setHealth(sprite: GameTwoDSprite, health: number): void
  changeHealth(sprite: GameTwoDSprite, delta: number): void
  getHealth(sprite: GameTwoDSprite): number
  getMaxHealth(sprite: GameTwoDSprite): number
  hasHealth(sprite: GameTwoDSprite): boolean
  healthDepleted(sprite: GameTwoDSprite): boolean
  isInvincible(sprite: GameTwoDSprite): boolean
  damageSprite(sprite: GameTwoDSprite, amount: number, invincibilityFrames: number): void
  spriteX(sprite: GameTwoDSprite): number
  spriteY(sprite: GameTwoDSprite): number
  spriteW(sprite: GameTwoDSprite): number
  spriteH(sprite: GameTwoDSprite): number
  centerX(sprite: GameTwoDSprite): number
  centerY(sprite: GameTwoDSprite): number
  spriteVx(sprite: GameTwoDSprite): number
  spriteVy(sprite: GameTwoDSprite): number
  spriteSpeed(sprite: GameTwoDSprite): number
  isMoving(sprite: GameTwoDSprite): boolean
  isMovingH(sprite: GameTwoDSprite): boolean
  isMovingV(sprite: GameTwoDSprite): boolean
  randomX(): number
  randomY(): number
  cooldownReady(sprite: GameTwoDSprite, frames: number, key?: string): boolean
  pruneOld(group: GameTwoDGroup, seconds: number): void
  flipSprite(sprite: GameTwoDSprite, direction: GameTwoDSpriteDirection): void
  setOpacity(sprite: GameTwoDSprite, percent: number): void
  /** Reposiciona sem colidir com o caminho anterior (teleporte/respawn). */
  setPosition(sprite: GameTwoDSprite, x: number, y: number): void
  setSize(sprite: GameTwoDSprite, width: number, height: number): void
  scaleSprite(sprite: GameTwoDSprite, factor: number): void
  wrapEdges(sprite: GameTwoDSprite): void
  pauseGame(): void
  resumeGame(): void
  isPaused(): boolean
}

export interface GameTwoDInputAndMotionApi {
  keys: GameTwoDKeys
  keyDown(key: string): boolean
  pointerDown(): boolean
  touches(a: GameTwoDSprite, b: GameTwoDSprite): boolean
  /** Jogo fixo de uma tela: a borda atraída do canvas funciona como chão. */
  platformer(sprite: GameTwoDSprite, ctx: GameTwoDContext, speed: number, jump: number): void
  /** Plataforma sobre terreno real; colida com o Mundo depois de mover. */
  platformerWithTerrain(sprite: GameTwoDSprite, speed: number, jump: number): void
  enableClassicControls(mode: 'auto' | 'always' | 'off'): void
  actionDown(action: GameTwoDAction): boolean
  actionPressed(action: GameTwoDAction): boolean
  classicPlatformer(sprite: GameTwoDSprite, speed: number, jump: number): void
  jumpWithTerrain(sprite: GameTwoDSprite, jump: number): void
  topDown(sprite: GameTwoDSprite, speed: number): void
  flyFree(sprite: GameTwoDSprite, speed: number): void
  flap(sprite: GameTwoDSprite, ctx: GameTwoDContext, force: number): void
  swim(sprite: GameTwoDSprite, speed: number): void
  followPointer(sprite: GameTwoDSprite, speed: number): void
  clampToScreen(sprite: GameTwoDSprite, ctx: GameTwoDContext): void
  rotateSprite(sprite: GameTwoDSprite, degrees: number): void
  pointSprite(sprite: GameTwoDSprite, degrees: number): void
  thrust(sprite: GameTwoDSprite, force: number): void
  applyFriction(sprite: GameTwoDSprite, factor: number): void
  steerThrust(sprite: GameTwoDSprite, speed: number, turnDegrees: number): void
  spriteAngleDeg(sprite: GameTwoDSprite): number
  shootFrom(
    sprite: GameTwoDSprite,
    group: GameTwoDGroup,
    options?: { speed?: number; radius?: number; color?: string },
  ): GameTwoDSprite | null
  spawnAsteroidFromEdge(
    group: GameTwoDGroup,
    options?: { size?: number; color?: string; speed?: number },
  ): GameTwoDSprite | null
  arrowsX(sprite: GameTwoDSprite, speed: number): void
  blink(sprite: GameTwoDSprite, frames: number): void
  flash(ctx: GameTwoDContext, color: string): void
  shake(ctx: GameTwoDContext, intensity: number): void
  emitParticles(x: number, y: number, count: number, color: string): void
  drawParticles(ctx: GameTwoDContext): void
}

export interface GameTwoDWorldApi {
  /** @deprecated Prefira a câmera configurada por `GameTwoDWorld`. */
  cameraFollow(sprite: GameTwoDSprite, worldWidth: number, worldHeight: number): void
  /** @deprecated Prefira `configureWorldCamera` + `followCameraInWorld`. */
  setCamera(x: number, y: number): void
  cameraX(): number
  cameraY(): number
  setTileAtSprite(map: GameTwoDTileMap, index: number, sprite: GameTwoDSprite): void
  breakTileAtSprite(map: GameTwoDTileMap, sprite: GameTwoDSprite): void
  tileAtSprite(map: GameTwoDTileMap, sprite: GameTwoDSprite): number
  bringToFront(group: GameTwoDGroup, sprite: GameTwoDSprite): void
  sendToBack(group: GameTwoDGroup, sprite: GameTwoDSprite): void
  drawHitbox(sprite: GameTwoDSprite): void
  showFps(x: number, y: number): void
  onOverlap(
    getA: () => GameTwoDSprite | null,
    getB: () => GameTwoDSprite | null,
    fn: () => void,
    id?: string,
  ): void
  /**
   * "Quando o sprite pular": o MOTOR avisa no instante do pulo (plataforma,
   * pular no chão e kit dino). O sprite entra como thunk, como no onOverlap.
   */
  onJump(getSprite: () => GameTwoDSprite | null, fn: () => void, id?: string): void
  createTileMap(options: GameTwoDTileMapOptions): GameTwoDTileMap
  createTileMapFromAsset(name: string): GameTwoDTileMap
  createVectorTileset(tileSize: number): GameTwoDVectorTileset
  defineVectorTile(
    tileset: GameTwoDVectorTileset,
    index: number,
    shape: string,
    role: GameTwoDVectorTileRole,
  ): void
  createVectorTileMap(tileset: GameTwoDVectorTileset, grid: string): GameTwoDTileMap
  fitTileMapToStage(ctx: GameTwoDContext, map: GameTwoDTileMap): void
  placeTileMap(map: GameTwoDTileMap, x: number, y: number, tileSize: number): void
  /**
   * Desenha o layout preparado. Os argumentos x/y/size são aceitos somente por
   * compatibilidade; código novo deve preparar o mapa antes e passar dois argumentos.
   */
  drawTileMap(
    ctx: GameTwoDContext,
    map: GameTwoDTileMap,
    x?: number,
    y?: number,
    size?: number,
  ): void
  collideTileMap(sprite: GameTwoDSprite, map: GameTwoDTileMap): void
  forEachTileContact(
    sprite: GameTwoDSprite,
    map: GameTwoDTileMap,
    side: GameTwoDTileContactSide | 'any',
    visit: (contact: GameTwoDTileContact) => void,
  ): void
  tileContactIs(contact: GameTwoDTileContact, index: number): boolean
  setTileAtContact(contact: GameTwoDTileContact, index: number): void
  collideGroup(sprite: GameTwoDSprite, group: GameTwoDGroup): void
  collideSprite(sprite: GameTwoDSprite, obstacle: GameTwoDSprite): void
  collidePlatform(sprite: GameTwoDSprite, platform: GameTwoDSprite): void
  collidePlatformGroup(sprite: GameTwoDSprite, group: GameTwoDGroup): void
  tileAt(map: GameTwoDTileMap, x: number, y: number): number
  createWorld(width: number, height: number): GameTwoDWorld
  createWorldFromTileMap(map: GameTwoDTileMap, tileSize: number): GameTwoDWorld
  addTileMapToWorld(worldValue: GameTwoDWorld, map: GameTwoDTileMap): void
  addSolidGroupToWorld(worldValue: GameTwoDWorld, group: GameTwoDGroup): void
  addEnemyTypeToWorld(worldValue: GameTwoDWorld, type: GameTwoDEnemyType): void
  addPlatformGroupToWorld(worldValue: GameTwoDWorld, group: GameTwoDGroup): void
  setWorldEdges(worldValue: GameTwoDWorld, edges: GameTwoDWorldEdges): void
  configureWorldCamera(
    worldValue: GameTwoDWorld,
    horizontal: GameTwoDCameraHorizontal,
    vertical: GameTwoDCameraVertical,
    deadZoneX: number,
    deadZoneY: number,
  ): void
  collideWorld(sprite: GameTwoDSprite, worldValue: GameTwoDWorld): void
  followCameraInWorld(sprite: GameTwoDSprite, worldValue: GameTwoDWorld): void
  drawWorld(ctx: GameTwoDContext, worldValue: GameTwoDWorld): void
  createLevel(worldValue: GameTwoDWorld, spawnX: number, spawnY: number): GameTwoDLevel
  /** Entra e preserva tiles/grupos já alterados. */
  enterLevel(level: GameTwoDLevel, player: GameTwoDSprite): void
  /** Faz o grupo renascer junto da Fase quando `restartLevel` for usado. */
  resetGroupWithLevel(level: GameTwoDLevel, group: GameTwoDGroup): void
  /** Restaura mapas e grupos registrados antes de entrar novamente. */
  restartLevel(level: GameTwoDLevel, player: GameTwoDSprite): void
  onLevelEnter(getLevel: () => GameTwoDLevel, fn: () => void, id?: string): void
  levelIsActive(level: GameTwoDLevel): boolean
  collideCurrentLevel(sprite: GameTwoDSprite): void
  followCurrentLevelCamera(sprite: GameTwoDSprite): void
  drawCurrentLevel(ctx: GameTwoDContext): void
  createGroup(): GameTwoDGroup
  spawn(group: GameTwoDGroup, options?: GameTwoDSpriteOptions): GameTwoDSprite | null
  spawnBullet(
    group: GameTwoDGroup,
    options?: GameTwoDSpriteOptions & { radius?: number },
  ): GameTwoDSprite | null
  /** Soma a gravidade do mundo ao `vy` de cada sprite atual do grupo. */
  applyGravityToGroup(group: GameTwoDGroup): void
  updateGroup(group: GameTwoDGroup): void
  drawGroup(ctx: GameTwoDContext, group: GameTwoDGroup): void
  drawGroupByY(ctx: GameTwoDContext, group: GameTwoDGroup): void
  forEachInGroup(group: GameTwoDGroup, fn: (sprite: GameTwoDSprite, index: number) => void): void
  countGroup(group: GameTwoDGroup): number
  clearGroup(group: GameTwoDGroup): void
  addToGroup(group: GameTwoDGroup, sprite: GameTwoDSprite): void
  removeFromGroup(group: GameTwoDGroup, sprite: GameTwoDSprite): void
  pruneOffscreen(
    ctx: GameTwoDContext,
    group: GameTwoDGroup,
    margin: number,
    onLeave?: (sprite: GameTwoDSprite) => void,
  ): void
  overlapGroups(
    a: GameTwoDGroup,
    b: GameTwoDGroup,
    fn: (a: GameTwoDSprite, b: GameTwoDSprite) => void,
  ): void
  everyFrames(key: string, frames: number): boolean
  everySeconds(key: string, seconds: number): boolean
  afterSeconds(key: string, seconds: number): boolean
}

export interface GameTwoDHudAndSceneApi {
  drawScore(
    ctx: GameTwoDContext,
    label: string,
    value: string | number,
    x: number,
    y: number,
    color: string,
    size: number,
  ): void
  drawLabel(
    ctx: GameTwoDContext,
    text: string,
    x: number,
    y: number,
    color: string,
    size: number,
    align: 'left' | 'center' | 'right',
  ): void
  drawPixelText(
    ctx: GameTwoDContext,
    text: string,
    x: number,
    y: number,
    pixelSize: number,
    color: string,
    align?: 'left' | 'center' | 'right',
  ): void
  drawFade(ctx: GameTwoDContext, percent: number, color: string): void
  drawHearts(
    ctx: GameTwoDContext,
    count: number,
    x: number,
    y: number,
    size: number,
    color: string,
  ): void
  drawBar(
    ctx: GameTwoDContext,
    value: number,
    max: number,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ): void
  drawSpriteHealth(
    ctx: GameTwoDContext,
    sprite: GameTwoDSprite,
    style: 'hearts' | 'bar',
    x: number,
    y: number,
    size: number,
    color: string,
  ): void
  setScene(name: string): void
  getScene(): string
  showScreen(
    ctx: GameTwoDContext,
    title: string,
    subtitle: string,
    hint: string,
    background: string,
  ): void
  showGameOver(ctx: GameTwoDContext, text: string): void
  drawStarfield(ctx: GameTwoDContext, speed: number): void
  dragX(sprite: GameTwoDSprite): void
}

export interface GameTwoDArcadeApi {
  createShip(options?: GameTwoDSpriteOptions & { body?: string; wings?: string }): GameTwoDSprite
  spawnAsteroid(
    group: GameTwoDGroup,
    options?: GameTwoDSpriteOptions & { size?: number },
  ): GameTwoDSprite | null
  explodeSprite(sprite: GameTwoDSprite, color: string): void
  overlapSpriteGroup(
    getSprite: () => GameTwoDSprite | null,
    group: GameTwoDGroup,
    fn: (sprite: GameTwoDSprite) => void,
  ): void
  createEnemyType(options?: GameTwoDEnemyTypeOptions): GameTwoDEnemyType
  /** A VISTA de todos os inimigos: um grupo montado dos tipos vivos, sem copia. */
  createAllEnemiesGroup(): GameTwoDGroup
  createSmartEnemyType(options?: GameTwoDSmartEnemyTypeOptions): GameTwoDEnemyType
  setEnemyStateAnimation(
    type: GameTwoDEnemyType,
    state: string,
    sheet: GameTwoDSpriteSheet,
    from: number,
    to: number,
    fps: number,
  ): void
  setEnemyTypeParam(type: GameTwoDEnemyType, param: string, value: number): void
  addEnemyTypeBehavior(type: GameTwoDEnemyType, behavior: string): void
  spawnEnemy(type: GameTwoDEnemyType, x: number, y: number): GameTwoDSprite | null
  updateEnemyType(
    type: GameTwoDEnemyType,
    ctx: GameTwoDContext,
    target?: GameTwoDSprite | null,
  ): void
  drawEnemyType(ctx: GameTwoDContext, type: GameTwoDEnemyType): void
  onEnemyDefeated(type: GameTwoDEnemyType, fn: (sprite: GameTwoDSprite) => void, id?: string): void
  onEnemyHurt(type: GameTwoDEnemyType, fn: (sprite: GameTwoDSprite) => void, id?: string): void
  overlapEnemyShots(
    getSprite: () => GameTwoDSprite | null,
    type: GameTwoDEnemyType,
    fn: (shot: GameTwoDSprite) => void,
  ): void
  overlapEnemyBeams(
    getSprite: () => GameTwoDSprite | null,
    type: GameTwoDEnemyType,
    fn: (enemy: GameTwoDSprite) => void,
  ): void
  enemyDamage(sprite: GameTwoDSprite): number
  hurtByEnemy(sprite: GameTwoDSprite, enemy: GameTwoDSprite): void
  stompEnemyType(sprite: GameTwoDSprite, type: GameTwoDEnemyType, bounce: number): void
  setEnemyStompMode(type: GameTwoDEnemyType, mode: GameTwoDStompMode): void
  updateEnemyShells(type: GameTwoDEnemyType, worldValue?: GameTwoDWorld): void
  jumpOnGround(sprite: GameTwoDSprite, ctx: GameTwoDContext, jump: number): void
  createDino(options?: GameTwoDSpriteOptions & { size?: number }): GameTwoDSprite
  controlDino(sprite: GameTwoDSprite, ctx: GameTwoDContext, jump: number): void
  spawnObstacle(
    group: GameTwoDGroup,
    ctx: GameTwoDContext,
    options?: { type?: string; x?: number; size?: number; vx?: number },
  ): GameTwoDSprite | null
  spawnEgg(
    group: GameTwoDGroup,
    options?: { x?: number; y?: number; vx?: number },
  ): GameTwoDSprite | null
  drawForest(ctx: GameTwoDContext, speed: number): void
  createCity(): GameTwoDCity
  drawCity(ctx: GameTwoDContext, city: GameTwoDCity): void
  placeThrower(
    city: GameTwoDCity,
    options?: { side?: 'left' | 'right'; color?: string },
  ): GameTwoDSprite
  newWind(city: GameTwoDCity): void
  drawWind(ctx: GameTwoDContext, city: GameTwoDCity): void
  aimDrag(ctx: GameTwoDContext, thrower: GameTwoDSprite): void
  aimReleased(thrower: GameTwoDSprite): boolean
  throwBanana(thrower: GameTwoDSprite, city: GameTwoDCity): void
  updateBanana(city: GameTwoDCity): void
  drawBanana(ctx: GameTwoDContext, city: GameTwoDCity): void
  bananaHitThrower(city: GameTwoDCity, thrower: GameTwoDSprite): boolean
  bananaHitCity(city: GameTwoDCity): boolean
  computerTurn(thrower: GameTwoDSprite, city: GameTwoDCity, enemy: GameTwoDSprite): void
  drawAimReadout(ctx: GameTwoDContext): void
  // Kit equilibrista v2 (v0.42.0): o herói é um SPRITE; as regras moram no
  // caminho. A criança monta o loop (crescer/derrubar/andar) e o placar.
  createStickHero(opts?: { w?: number; h?: number; color?: string }): GameTwoDSprite
  createStickPath(
    ctx: GameTwoDContext,
    opts?: { platform?: string; stick?: string },
  ): GameTwoDStickPath | null
  stickPathScenery(path: GameTwoDStickPath): void
  stickPathGrow(path: GameTwoDStickPath, speed?: number): void
  stickPathDrop(path: GameTwoDStickPath): void
  stickPathWalk(path: GameTwoDStickPath, hero: GameTwoDSprite, speed?: number): void
  stickPathDraw(path: GameTwoDStickPath): void
  stickPathOnCross(path: GameTwoDStickPath, fn: () => void, id?: string): void
  stickPathOnPerfect(path: GameTwoDStickPath, fn: () => void, id?: string): void
  stickPathFell(path: GameTwoDStickPath): boolean
  // Kit balão v2 (v0.42.0): o balão é um SPRITE (com combustível próprio); as
  // árvores moram no caminho.
  createBalloon(opts?: {
    x?: number
    y?: number
    w?: number
    h?: number
    body?: string
    basket?: string
  }): GameTwoDSprite
  createBalloonPath(ctx: GameTwoDContext): GameTwoDBalloonPath | null
  balloonPathScenery(path: GameTwoDBalloonPath): void
  balloonFire(balloon: GameTwoDSprite, force?: number): void
  balloonFly(balloon: GameTwoDSprite): void
  balloonPathScroll(path: GameTwoDBalloonPath, balloon: GameTwoDSprite, speed?: number): void
  balloonPathOnTreeHit(path: GameTwoDBalloonPath, fn: () => void, id?: string): void
  balloonPathMeters(path: GameTwoDBalloonPath): number
  balloonFuel(balloon: GameTwoDSprite): number
  balloonLandedOut(balloon: GameTwoDSprite): boolean
}

export interface GameTwoDRuntimeApi
  extends GameTwoDLifecycleApi,
    GameTwoDStageApi,
    GameTwoDSpriteApi,
    GameTwoDPhysicsApi,
    GameTwoDAudioApi,
    GameTwoDMathAndStateApi,
    GameTwoDInputAndMotionApi,
    GameTwoDWorldApi,
    GameTwoDHudAndSceneApi,
    GameTwoDArcadeApi {}

/** Inventário exato da API pública injetada em `window.SZGame2D`. */
export const GAME_TWO_D_API_KEYS = [
  'createSprite',
  'drawSprite',
  'clear',
  'fitScreen',
  'setupStage',
  'setupStageFull',
  'showStageBorder',
  'setBackdrop',
  'drawBackdrop',
  'spawnBullet',
  'arrowsX',
  'blink',
  'isColliding',
  'setHitboxScale',
  'onStart',
  'gameLoop',
  'keys',
  'setGravity',
  'applyVelocity',
  'applyGravity',
  'bounceOnEdges',
  'circleCollides',
  'playSound',
  'playFx',
  'playMusic',
  'stopMusic',
  'playNote',
  'loadSound',
  'playClip',
  'stopClip',
  'playTrack',
  'stopTrack',
  'setSoundVolume',
  'distance',
  'angleTo',
  'aimAt',
  'moveToward',
  'randomBetween',
  'randomChance',
  'setHealth',
  'changeHealth',
  'getHealth',
  'getMaxHealth',
  'healthDepleted',
  'isInvincible',
  'damageSprite',
  'spriteX',
  'spriteY',
  'spriteW',
  'spriteH',
  'centerX',
  'centerY',
  'spriteVx',
  'spriteVy',
  'spriteSpeed',
  'isMoving',
  'isMovingH',
  'isMovingV',
  'randomX',
  'randomY',
  'hasHealth',
  'cooldownReady',
  'pruneOld',
  'flipSprite',
  'setOpacity',
  'setPosition',
  'setSize',
  'scaleSprite',
  'wrapEdges',
  'pauseGame',
  'resumeGame',
  'isPaused',
  'cameraFollow',
  'setCamera',
  'cameraX',
  'cameraY',
  'setTileAtSprite',
  'breakTileAtSprite',
  'tileAtSprite',
  'bringToFront',
  'sendToBack',
  'drawHitbox',
  'showFps',
  'onPointer',
  'onKey',
  'onActionPressed',
  'onAnyInput',
  'onOverlap',
  'onJump',
  'keyDown',
  'pointerDown',
  'touches',
  'pointer',
  'loadImage',
  'loadSpriteSheet',
  'setImage',
  'setAnimation',
  'playAnimationOnce',
  'animationEnded',
  'drawFrame',
  'setStateAnimation',
  'autoAnimate',
  'defineShape',
  'setShape',
  'createShapeSprite',
  'shapeW',
  'shapeH',
  'paintRect',
  'paintCircle',
  'paintEllipse',
  'paintTriangle',
  'paintLine',
  'platformer',
  'platformerWithTerrain',
  'enableClassicControls',
  'actionDown',
  'actionPressed',
  'classicPlatformer',
  'jumpWithTerrain',
  'topDown',
  'flyFree',
  'flap',
  'swim',
  'followPointer',
  'clampToScreen',
  'flash',
  'shake',
  'emitParticles',
  'drawParticles',
  'createTileMap',
  'createTileMapFromAsset',
  'createVectorTileset',
  'defineVectorTile',
  'createVectorTileMap',
  'fitTileMapToStage',
  'placeTileMap',
  'drawTileMap',
  'collideTileMap',
  'forEachTileContact',
  'tileContactIs',
  'setTileAtContact',
  'collideGroup',
  'collideSprite',
  'collidePlatform',
  'collidePlatformGroup',
  'tileAt',
  'createWorld',
  'createWorldFromTileMap',
  'addTileMapToWorld',
  'addSolidGroupToWorld',
  'addEnemyTypeToWorld',
  'addPlatformGroupToWorld',
  'setWorldEdges',
  'configureWorldCamera',
  'collideWorld',
  'followCameraInWorld',
  'drawWorld',
  'createLevel',
  'enterLevel',
  'resetGroupWithLevel',
  'restartLevel',
  'onLevelEnter',
  'levelIsActive',
  'collideCurrentLevel',
  'followCurrentLevelCamera',
  'drawCurrentLevel',
  'createGroup',
  'spawn',
  'applyGravityToGroup',
  'updateGroup',
  'drawGroup',
  'drawGroupByY',
  'forEachInGroup',
  'countGroup',
  'clearGroup',
  'addToGroup',
  'removeFromGroup',
  'pruneOffscreen',
  'overlapGroups',
  'everyFrames',
  'everySeconds',
  'afterSeconds',
  'drawScore',
  'drawLabel',
  'drawPixelText',
  'drawFade',
  'drawHearts',
  'drawBar',
  'drawSpriteHealth',
  'setStageDescription',
  'setScene',
  'getScene',
  'sceneIs',
  'showScreen',
  'showGameOver',
  'restart',
  'drawStarfield',
  'dragX',
  'createShip',
  'spawnAsteroid',
  'explodeSprite',
  'playShoot',
  'playExplosion',
  'overlapSpriteGroup',
  'createEnemyType',
  'createAllEnemiesGroup',
  'createSmartEnemyType',
  'setEnemyStateAnimation',
  'setEnemyTypeParam',
  'addEnemyTypeBehavior',
  'spawnEnemy',
  'updateEnemyType',
  'drawEnemyType',
  'onEnemyDefeated',
  'onEnemyHurt',
  'overlapEnemyShots',
  'overlapEnemyBeams',
  'enemyDamage',
  'hurtByEnemy',
  'stompEnemyType',
  'setEnemyStompMode',
  'updateEnemyShells',
  'rotateSprite',
  'pointSprite',
  'thrust',
  'applyFriction',
  'steerThrust',
  'spriteAngleDeg',
  'shootFrom',
  'spawnAsteroidFromEdge',
  'jumpOnGround',
  'createDino',
  'controlDino',
  'spawnObstacle',
  'spawnEgg',
  'drawForest',
  'playJump',
  'playDinoHurt',
  'playCollect',
  'createCity',
  'drawCity',
  'placeThrower',
  'newWind',
  'drawWind',
  'aimDrag',
  'aimReleased',
  'throwBanana',
  'updateBanana',
  'drawBanana',
  'bananaHitThrower',
  'bananaHitCity',
  'playWhistle',
  'computerTurn',
  'drawAimReadout',
  'createStickHero',
  'createStickPath',
  'stickPathScenery',
  'stickPathGrow',
  'stickPathDrop',
  'stickPathWalk',
  'stickPathDraw',
  'stickPathOnCross',
  'stickPathOnPerfect',
  'stickPathFell',
  'createBalloon',
  'createBalloonPath',
  'balloonPathScenery',
  'balloonFire',
  'balloonFly',
  'balloonPathScroll',
  'balloonPathOnTreeHit',
  'balloonPathMeters',
  'balloonFuel',
  'balloonLandedOut',
] as const satisfies readonly (keyof GameTwoDRuntimeApi)[]

export type GameTwoDApiKey = (typeof GAME_TWO_D_API_KEYS)[number]

/** Falha na compilação se uma chave tipada deixar de aparecer no inventário. */
export const GAME_TWO_D_API_CONTRACT_COVERAGE: Record<
  Exclude<keyof GameTwoDRuntimeApi, GameTwoDApiKey>,
  never
> = {}

const GAME_TWO_D_API_EXPRESSION_OVERRIDES: Partial<Record<GameTwoDApiKey, string>> = {
  drawSprite: '_camWrap(drawSprite)',
  drawParticles: '_camWrap(drawParticles)',
  drawTileMap: '_camWrap(drawTileMap)',
  drawGroup: '_camWrap(drawGroup)',
  drawGroupByY: '_camWrap(drawGroupByY)',
  drawEnemyType: '_camWrap(drawEnemyType)',
}

/** Gera a montagem pública do runtime a partir do inventário tipado da API. */
export function buildGameTwoDRuntimeApiSource(): string {
  const properties = GAME_TWO_D_API_KEYS.map((key) => {
    const expression = GAME_TWO_D_API_EXPRESSION_OVERRIDES[key] ?? key
    return `    ${key}: ${expression}`
  }).join(',\n')

  return `  /** @satisfies {GameTwoDRuntimeApi} */\n  window.SZGame2D = {\n${properties}\n  };`
}
