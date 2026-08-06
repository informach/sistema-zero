export type GameKitCallback = (...args: unknown[]) => unknown

export interface GameKitSetupOptions {
  width?: number
  height?: number
  background?: string
  accent?: string
}

export interface GameKitEntity {
  x: number
  y: number
  w: number
  h: number
  vx?: number
  vy?: number
  color?: string
  image?: string
  [property: string]: unknown
}

/**
 * Inventário enumerável exato de `window.SZGameKit`.
 *
 * `runProject` é intencionalmente não enumerável e aparece no contrato abaixo,
 * mas não nesta lista usada para auditar a montagem pública do runtime.
 */
export const GAME_KIT_ENUMERABLE_API_KEYS = [
  'setup',
  'setupFull',
  'setStageDescription',
  'start',
  'width',
  'height',
  'loadImage',
  'setScreenText',
  'createScreen',
  'addButton',
  'setScreenBg',
  'showScreen',
  'hideScreens',
  'setState',
  'restartGame',
  'onGameStart',
  'onEnterState',
  'stateIs',
  'state',
  'pause',
  'resume',
  'returnToMenu',
  'endGame',
  'onUpdate',
  'onDraw',
  'drawBackground',
  'createCharacter',
  'moveWithKeys',
  'keepOnScreen',
  'drawCharacter',
  'placeCharacter',
  'resetCharacter',
  'setSpeedMultiplier',
  'touching',
  'charX',
  'charY',
  'keyDown',
  'setPauseKey',
  'on',
  'emit',
  'defineMold',
  'spawnFromMold',
  'startSpawner',
  'forEachActive',
  'cullOffscreen',
  'recycle',
  'drawActive',
  'countActive',
  'defineLook',
  'drawLook',
  'seek',
  'drift',
  'face',
  'hurt',
  'knockback',
  'drawHealthBar',
  'touchCircle',
  'isDead',
  'healthOf',
  'setMission',
  'missionKill',
  'drawTimer',
  'timeSurvived',
  'kills',
  'defineEffect',
  'burst',
  'drawEffects',
  'loadSound',
  'playSound',
  'playEffect',
  'playTone',
  'stopSpawner',
  'isInvincible',
  'keyPressed',
  'setSheet',
  'playAnim',
  'cameraFollow',
  'cameraFollowMap',
  'cameraStop',
  'cameraX',
  'cameraY',
  'onDrawHud',
  'launchTowards',
  'moveByVelocity',
  'setAngle',
  'mouseX',
  'mouseY',
  'mouseScreenX',
  'mouseScreenY',
  'mouseDown',
  'onGameClick',
  'drawBar',
  'rpgMoveGrid',
  'rpgBlockCell',
  'rpgCell',
  'rpgCreateNpc',
  'rpgDrawNpcs',
  'rpgOnTalk',
  'rpgSay',
  'rpgAddFlag',
  'rpgHasFlag',
  'rpgGiveItem',
  'rpgHasItem',
  'rpgRemoveItem',
  'rpgDrawInventory',
  'rpgGoMap',
  'rpgSetStartMap',
  'rpgCreateMap',
  'rpgOnEnterMap',
  'rpgCreateDoor',
  'rpgConnectEdge',
  'rpgCurrentMap',
  'rpgBattleStats',
  'rpgBattleStart',
  'rpgOnBattleEnd',
  'rpgBattleWon',
  'setWalkSheet',
  'rpgCutscene',
  'rpgWait',
  'rpgFace',
  'rpgNpcWalkTo',
  'rpgNpcWander',
  'rpgOnStep',
  'rpgMenu',
  'rpgOption',
  'rpgSave',
  'rpgLoad',
  'rpgHasSave',
  'rpgSetSpecial',
  'rpgGivePotion',
  'rpgHealHero',
  'rpgBattleReward',
  'rpgInflict',
  'rpgLevel',
  'rpgXp',
  'rpgAddAlly',
  'rpgAddFoe',
  'rpgDefineBattler',
  'rpgBattleNamed',
  'rpgAddFoeNamed',
  'rpgTeachMove',
  'rpgTeachHeal',
  'rpgAddBoss',
  'battlerLife',
  'battlerMaxLife',
  'rpgOnFoeTurn',
  'rpgFoeUse',
  'rpgFoeHitAll',
  'rollDice',
  'playersSetup',
  'currentPlayer',
  'nextPlayer',
  'onTurnChange',
  'moveAlongTrack',
  'spaceOf',
  'onLandSpace',
  'pileMoveTop',
  'pileShuffleFrom',
  'pileTop',
  'pileSize',
  'card',
  'cardFlip',
  'cardIsUp',
  'cardFace',
  'handDraw',
  'cardAt',
  'cardsStart',
  'cardsEnergyPerTurn',
  'cardsEnergy',
  'cardsSpend',
  'cardsHeroLife',
  'cardsEnemyLife',
  'cardsHurtEnemy',
  'cardsHurtMe',
  'cardsGainBlock',
  'cardsEnemyIntent',
  'cardsIntentAction',
  'cardsIntentValue',
  'cardsOnTurn',
  'cardsOnEnemyTurn',
  'cardsEndTurn',
  'cardsDrawHud',
  'cameraShake',
  'loadTilemap',
  'drawTilemap',
  'tilemapSolid',
  'drawShadow',
  'drawByDepth',
  'applyGravity',
  'setTerminalVelocity',
  'setVelocity',
  'velocityOf',
  'jump',
  'isOnGround',
  'collideTilemap',
  'collideGroup',
  'overlapGroups',
  'bounceOnEdges',
  'wrapEdges',
  'paddleBounce',
  'boardCreate',
  'boardSet',
  'boardGet',
  'boardCount',
  'boardIn',
  'everySeconds',
  'cooldownReady',
  'tileAt',
  'setTileAt',
  'breakTileAt',
  'setTileSize',
  'propertyOf',
  'setProperty',
  'setFacingDir',
  'facingOf',
  'tweenTo',
  'pkmCreature',
  'pkmMove',
  'pkmTypeChart',
  'pkmEvolve',
  'pkmCatchDifficulty',
  'pkmLevelOf',
  'pkmGive',
  'pkmGiveBall',
  'pkmHealTeam',
  'pkmHas',
  'pkmTeamSize',
  'pkmBallCount',
  'pkmDrawTeam',
  'pkmGrassCells',
  'pkmGrassTiles',
  'pkmWild',
  'pkmEncounterRate',
  'pkmBattleWild',
  'pkmBattleTrainer',
  'pkmTrainerCreature',
  'pkmCaught',
  'defineRegion',
  'isInside',
  'overlapPercent',
  'chance',
  'distanceBetween',
  'pointIn',
  'launchToPoint',
  'setVelocityAngle',
  'setOpacity',
  'opacityOf',
  'fadeTo',
  'tweenProperty',
  'setHitbox',
  'fadeScreen',
  'flashScreen',
  'saveValue',
  'savedValue',
  'playMusic',
  'stopSound',
  'setVolume',
  'createEmptyTilemap',
  'moveWithCustomKeys',
  'platformerHero',
  'setJumpFeel',
  'doubleJump',
  'wallSlide',
  'wallJump',
  'climbLadder',
  'oneWayPlatform',
  'dropThrough',
  'movingPlatform',
  'rideOn',
  'stompKill',
  'patrolTurnAtWall',
  'setCheckpoint',
  'respawn',
  'platStateFrames',
  'platformerAnim',
  'attackFacing',
  'didHit',
  'patrolAround',
  'drawHearts',
  'setSwingWindow',
  'playAnimOnce',
  'animEnded',
  'setEntityState',
  'entityState',
  'stateAnim',
  'stateLook',
  'autoAnimate',
  'angleOf',
  'angleTo',
  'thrust',
  'applyFriction',
  'waitThen',
  'nearestActive',
  'rpgCountItem',
  'randomActive',
  'floatText',
  'trailOn',
  'trailOff',
  'shockwave',
  'scrollImage',
  'leanOnMove',
  'fanShot',
  'naveShip',
  'navePowerup',
  'navePowerOf',
  'naveWave',
  'naveWaveShooter',
  'naveInvasionLine',
  'naveStarfield',
  'naveBomb',
  'definePath',
  'pathPoint',
  'followPath',
  'pathProgress',
  'pickActive',
  'parallaxLayer',
  'sheetBurst',
  'tdWave',
  'tdSlot',
  'tdDrawSlots',
  'tdOnBuy',
  'tdFreeSlot',
  'tdDrawRange',
  'tdSetCoins',
  'tdAddCoins',
  'tdCoins',
  'lutaMatch',
  'lutaDrawHud',
  'lutaWinner',
  'lutaRoundNow',
  'lutaWinsOf',
  'lutaFighter',
  'lutaAI',
  'lutaIsGuarding',
  'lutaMove',
  'lutaMoveAnim',
  'lutaAttack',
  'lutaComboOf',
  'lutaSpecialOf',
  'showStageBorder',
  'setBackdrop',
  'drawBackdrop',
  'showHitboxes',
  'setHitboxShape',
] as const

export type GameKitEnumerableApiKey = (typeof GAME_KIT_ENUMERABLE_API_KEYS)[number]

type GameKitFallbackMethod = (...args: unknown[]) => unknown

/** Assinaturas fortes das operações centrais e dos valores retornados pela API. */
export interface GameKitKnownApi {
  runProject(fn: () => void): void
  setup(opts?: GameKitSetupOptions): void
  setupFull(opts?: Pick<GameKitSetupOptions, 'background' | 'accent'>): void
  setStageDescription(description: string): void
  start(): void
  width(): number
  height(): number
  setScreenText(screen: string, title: string, textBody: string, button: string): void
  createScreen(name: string, title: string, textBody: string): void
  addButton(screen: string, label: string, fn: () => void): void
  setScreenBg(screen: string, color: string, image: string): void
  showScreen(name: string): void
  hideScreens(restoreCanvasFocus?: boolean): void
  setState(name: string): void
  restartGame(): void
  onGameStart(fn: () => void): void
  onEnterState(name: string, fn: () => void): void
  stateIs(name: string): boolean
  state(): string
  pause(): void
  resume(): void
  returnToMenu(): void
  endGame(): void
  onUpdate(fn: (deltaSeconds: number) => void): void
  onDraw(fn: (context: CanvasRenderingContext2D) => void): void
  createCharacter(opts?: Partial<GameKitEntity> & { speed?: number }): GameKitEntity
  moveWithKeys(c: GameKitEntity, dt: number): void
  keepOnScreen(c: GameKitEntity): void
  drawCharacter(c: GameKitEntity): void
  touching(a: GameKitEntity, b: GameKitEntity): boolean
  charX(c: GameKitEntity): number
  charY(c: GameKitEntity): number
  keyDown(k: string): boolean
  keyPressed(k: string): boolean
  mouseX(): number
  mouseY(): number
  mouseScreenX(): number
  mouseScreenY(): number
  mouseDown(): boolean
  onGameClick(fn: (x: number, y: number, screenX: number, screenY: number) => void): void
  battlerLife(name: string): number
  battlerMaxLife(name: string): number
  rollDice(faces: number): number
  currentPlayer(): number
  spaceOf(who: unknown): number
  pileSize(pile: unknown): number
  card(front: unknown, back: unknown): Record<string, unknown>
  cardIsUp(c: unknown): boolean
  cardAt(x: number, y: number, pile: unknown): number
  cardsEnergy(): number
  cardsHeroLife(): number
  cardsEnemyLife(): number
  cardsIntentAction(): string
  cardsIntentValue(): number
  navePowerOf(who: unknown): string
  pathProgress(who: unknown): number
  pickActive(moldName: string, mode: string, prop: string): unknown
  tdCoins(): number
  lutaWinner(): string
  lutaRoundNow(): number
  lutaWinsOf(who: unknown): number
  lutaIsGuarding(who: unknown): boolean
  lutaComboOf(who: unknown): number
  lutaSpecialOf(who: unknown): number
}

/** Contrato público único usado pelo runtime, pelos geradores e pelos testes. */
export type GameKitRuntimeApi = {
  [Key in GameKitEnumerableApiKey]: Key extends keyof GameKitKnownApi
    ? GameKitKnownApi[Key]
    : GameKitFallbackMethod
} & Pick<GameKitKnownApi, 'runProject'>

export const GAME_KIT_API_KEYS = [
  'runProject',
  ...GAME_KIT_ENUMERABLE_API_KEYS,
] as const satisfies readonly (keyof GameKitRuntimeApi)[]

export type GameKitApiKey = (typeof GAME_KIT_API_KEYS)[number]
