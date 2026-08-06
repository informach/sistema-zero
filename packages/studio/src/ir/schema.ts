import { z } from 'zod'
import { normalizeGoogleFontFamily } from '../css/googleFonts'
import { isCSSKeyframeSelector, isCSSKeyframesName } from '../css/keyframes'
import { CSS_MEDIA_SIZE_FEATURES, type CSSMediaSizeFeature } from '../css/mediaQueries'
import { isGuidedDomElementTag } from '../domSafety'
import { HTML_TAGS, isHTMLElementChildAllowed } from '../html/catalog'
import { PERSISTENT_EXTENSION_STATEMENT_TYPES } from '../official-extensions/persistentResourceContract'
import { CANVAS3D_AUTO_ADDON_MODULE, isCanvas3DAddonImportCanonical } from '../three/canvas3dAddons'
import {
  isCanvas3DResourceCreatorExpression,
  isCanvas3DResourceCreatorStatement,
} from '../three/canvas3dContract'
import {
  GAME3D_ACTION_CONTEXT_STATEMENT_TYPES,
  GAME3D_RUNNING_CONTEXT_STATEMENT_TYPES,
  GAME3D_START_ONLY_STATEMENT_TYPES,
} from '../three/game3dContract'
import { runtimeProvidedCanvasContexts } from './canvasContexts'
import {
  isEventStatement,
  isLegacyLoadEvent,
  isLifecycleRootAllowed,
  isLoopStatement,
  LEGACY_START_WRAPPER_TYPES,
  type LifecycleArea,
  START_ONLY_STATEMENT_TYPES,
  validateLifecycleSemantics,
} from './lifecycle'
import { cssCommentRejectionReason, cssSelectorRejectionReason } from './outputSafety'
import {
  type Canvas3DStatementContextIndex,
  validateProgrammingReferences as collectProgrammingReferenceIssues,
  createCanvas3DStatementContextIndex,
} from './programmingReferences'

export const MAX_IR_TEXT_CHARS = 2_000_000

const irText = () => z.string().max(MAX_IR_TEXT_CHARS)
const guidedDomTag = (namespace: 'html' | 'svg') =>
  irText().refine((tag) => isGuidedDomElementTag(tag, namespace), {
    message: `Tag ${namespace.toUpperCase()} não permitida no DOM guiado`,
  })

// ---------- Source mapping ----------

/**
 * Campo opcional `__id` carrega o id do bloco Blockly original (ou um id
 * sintético do parser). Usado para construir source maps que ligam um trecho
 * do código gerado ao bloco que o produziu, e vice-versa.
 *
 * Como `z.object()` por padrão remove chaves desconhecidas, precisamos
 * declarar `__id` em cada variant Zod onde queremos preservá-lo.
 */
const idField = { __id: z.string().optional() }

/**
 * Estados da animação automática do Jogo 2D (bloco "Quando o sprite estiver…"
 * + autoAnimate do runtime). Valores SEM acento — viajam como literal no
 * código gerado. Consumido pelo dropdown do bloco, pelo zod e pelo parser.
 */
export const G2D_ANIM_STATES = [
  'parado',
  'andando',
  'vertical',
  'pulando',
  'caindo',
  'dano',
] as const

/**
 * Comportamentos prontos dos TIPOS de inimigo do Jogo 2D (bloco "Criar tipo
 * de inimigo…"). Valores sem acento — viajam como literal no código gerado.
 */
export const G2D_ENEMY_BEHAVIORS = [
  'patrulha',
  'perseguidor',
  'voador',
  'voador-vertical',
  'saltador',
  'atirador',
] as const

/** Parâmetros ajustáveis por comportamento (bloco "Ajustar no tipo de inimigo…"). */
export const G2D_ENEMY_PARAMS = ['pulo', 'ritmo', 'alcance', 'cadencia', 'tiro'] as const

// ---------- Expressions ----------

const jsExprBase = z.discriminatedUnion('type', [
  z.object({ type: z.literal('num'), value: z.number(), ...idField }),
  z.object({ type: z.literal('str'), value: irText(), ...idField }),
  z.object({ type: z.literal('color'), value: irText(), ...idField }),
  z.object({ type: z.literal('colorAlpha'), hex: irText(), alpha: z.number(), ...idField }),
  z.object({ type: z.literal('bool'), value: z.boolean(), ...idField }),
  z.object({ type: z.literal('var'), name: irText(), ...idField }),
  z.object({ type: z.literal('null'), ...idField }),
])

interface JSExprCommon {
  __id?: string
}

export type JSExpr =
  | (JSExprCommon & { type: 'num'; value: number })
  | (JSExprCommon & { type: 'str'; value: string })
  // Cor (ex.: '#22d3ee'). No código é a mesma string; o tipo distinto preserva
  // a intenção para o round-trip voltar ao bloco seletor de cor (sz_val_color).
  | (JSExprCommon & { type: 'color'; value: string })
  // Cor com transparência. `hex` = '#rrggbb', `alpha` = 0..1. Gera 'rgba(r, g, b, a)';
  // o tipo distinto preserva a intenção para voltar ao bloco sz_val_color_alpha.
  | (JSExprCommon & { type: 'colorAlpha'; hex: string; alpha: number })
  | (JSExprCommon & { type: 'bool'; value: boolean })
  | (JSExprCommon & { type: 'var'; name: string })
  // Valor nulo (`null`): "nada / nenhum objeto". Bloco sz_val_null.
  | (JSExprCommon & { type: 'null' })
  | (JSExprCommon & {
      type: 'binop'
      op: '+' | '-' | '*' | '/' | '%' | '**' | '>' | '<' | '>=' | '<=' | '==' | '!=' | '===' | '!=='
      left: JSExpr
      right: JSExpr
    })
  // Operador lógico (`a && b` / `a || b`). Cadeias longas aninham.
  | (JSExprCommon & {
      type: 'logical'
      op: '&&' | '||'
      left: JSExpr
      right: JSExpr
    })
  // Negação booleana (`!x`).
  | (JSExprCommon & { type: 'logicalNot'; value: JSExpr })
  // Operador ternário (`condição ? seVerdadeiro : seFalso`).
  | (JSExprCommon & {
      type: 'ternary'
      condition: JSExpr
      whenTrue: JSExpr
      whenFalse: JSExpr
    })
  | (JSExprCommon & { type: 'call'; name: string; args: JSExpr[] })
  // Game 2D — perguntas (booleanos): tecla apertada e sprites se encostando.
  | (JSExprCommon & { type: 'g2d:keyDown'; key: string })
  | (JSExprCommon & { type: 'g2d:touches'; aVar: string; bVar: string })
  // Game 2D — quantidade de sprites num grupo (valor numérico).
  | (JSExprCommon & { type: 'g2d:countGroup'; groupVar: string })
  // Game 2D — a direção (em graus) que o sprite está apontando (valor numérico).
  | (JSExprCommon & { type: 'g2d:spriteAngle'; spriteVar: string })
  // Tier 1 — contas/mira e perguntas (valores).
  | (JSExprCommon & { type: 'g2d:distance'; aVar: string; bVar: string })
  | (JSExprCommon & { type: 'g2d:angleTo'; aVar: string; bVar: string })
  | (JSExprCommon & { type: 'g2d:getHealth'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:getMaxHealth'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:enemyDamage'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:spriteX'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:spriteY'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:spriteW'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:spriteH'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:centerX'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:centerY'; spriteVar: string })
  // Tamanho do sprite que está sendo desenhado por uma figura (v0.23.0).
  | (JSExprCommon & { type: 'g2d:shapeW' })
  | (JSExprCommon & { type: 'g2d:shapeH' })
  | (JSExprCommon & { type: 'g2d:spriteVx'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:spriteVy'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:spriteSpeed'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:isMoving'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:isMovingH'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:isMovingV'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:randomBetween'; min: number | JSExpr; max: number | JSExpr })
  | (JSExprCommon & { type: 'g2d:randomChance'; percent: number | JSExpr })
  | (JSExprCommon & { type: 'g2d:hasHealth'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:healthDepleted'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:isInvincible'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:cooldownReady'; spriteVar: string; frames: number | JSExpr })
  | (JSExprCommon & { type: 'g2d:isPaused' })
  // Tier 2 — posição da câmera e leitura de tile (valores).
  | (JSExprCommon & { type: 'g2d:cameraX' })
  | (JSExprCommon & { type: 'g2d:cameraY' })
  | (JSExprCommon & { type: 'g2d:randomX' })
  | (JSExprCommon & { type: 'g2d:randomY' })
  | (JSExprCommon & { type: 'g2d:tileAtSprite'; mapVar: string; spriteVar: string })
  // Game 2D — a cena/tela atual é "name"? (valor booleano).
  | (JSExprCommon & { type: 'g2d:sceneIs'; name: string })
  // Game 2D — Kit equilibrista / balão: leituras do estado do jogo (valores).
  | (JSExprCommon & { type: 'g2d:stickPathFell'; pathVar: string })
  | (JSExprCommon & { type: 'g2d:balloonPathMeters'; pathVar: string })
  | (JSExprCommon & { type: 'g2d:balloonFuel'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:balloonLandedOut'; spriteVar: string })
  | (JSExprCommon & { type: 'g2d:pointerDown' })
  // Game 2D — Kit gorilas: perguntas (booleanos) da batalha de bananas.
  | (JSExprCommon & { type: 'g2d:aimReleased'; throwerVar: string })
  | (JSExprCommon & { type: 'g2d:bananaHitThrower'; cityVar: string; throwerVar: string })
  | (JSExprCommon & { type: 'g2d:bananaHitCity'; cityVar: string })
  // Game 3D — perguntas (booleanos): tecla apertada, dois objetos se encostando
  // (AABB) e colisão contra um grupo inteiro de inimigos.
  | (JSExprCommon & { type: 'g3d:keyDown'; key: string })
  | (JSExprCommon & { type: 'g3d:collides'; aVar: string; bVar: string })
  | (JSExprCommon & { type: 'g3d:hitAny'; objVar: string; groupVar: string })
  // Game 3D — Kit Travessia: bateu num veículo? e a linha (pontuação) atual.
  | (JSExprCommon & { type: 'g3d:crosserHit'; objVar: string; worldVar: string })
  | (JSExprCommon & { type: 'g3d:crosserRow'; objVar: string })
  // Game 3D — genérico: objeto encosta em algum de um grupo (caixa real Box3).
  | (JSExprCommon & { type: 'g3d:touchesBox'; objVar: string; groupVar: string })
  // Game 3D — Corrida/genérico: distância, proximidade, bateu num rival?, voltas.
  | (JSExprCommon & { type: 'g3d:distanceTo'; aVar: string; bVar: string })
  | (JSExprCommon & { type: 'g3d:countSwarm'; swarmVar: string })
  | (JSExprCommon & { type: 'g3d:countGroup'; groupVar: string })
  | (JSExprCommon & { type: 'g3d:isNear'; aVar: string; bVar: string; dist: number | JSExpr })
  | (JSExprCommon & { type: 'g3d:raceHit'; objVar: string; worldVar: string })
  | (JSExprCommon & { type: 'g3d:raceLaps'; objVar: string })
  // Game 3D — Kit Empilhar: pontuação (andares) e a torre caiu (fim de jogo)?
  | (JSExprCommon & { type: 'g3d:stackScore'; worldVar: string })
  | (JSExprCommon & { type: 'g3d:stackGameOver'; worldVar: string })
  // Game 3D — genéricos: ler posição/rotação (por eixo), escala e o tempo do quadro.
  | (JSExprCommon & { type: 'g3d:getPos'; objVar: string; axis: string })
  | (JSExprCommon & { type: 'g3d:getRot'; objVar: string; axis: string })
  | (JSExprCommon & { type: 'g3d:getScale'; objVar: string })
  | (JSExprCommon & { type: 'g3d:getVel'; objVar: string; axis: string })
  | (JSExprCommon & { type: 'g3d:getSpeed'; objVar: string })
  | (JSExprCommon & { type: 'g3d:isMoving'; objVar: string })
  | (JSExprCommon & { type: 'g3d:dt'; worldVar: string })
  | (JSExprCommon & { type: 'g3d:angleTo'; aVar: string; bVar: string })
  // Game 3D — mira & clique (raycast): seleção, mira à frente, sensor de chão.
  | (JSExprCommon & { type: 'g3d:pickAtMouse'; worldVar: string })
  | (JSExprCommon & { type: 'g3d:pointerOver'; worldVar: string; objVar: string })
  | (JSExprCommon & {
      type: 'g3d:aimAhead'
      worldVar: string
      objVar: string
      dist: number | JSExpr
    })
  | (JSExprCommon & { type: 'g3d:onGround'; worldVar: string; objVar: string })
  | (JSExprCommon & { type: 'g3d:groundHeight'; worldVar: string; objVar: string })
  // Jogo 2D Avançado (extensão game-2d-advanced) — valores: dimensões internas
  // do jogo, estado atual da máquina, personagens (posição/encosto AABB) e
  // tecla apertada (mapa lowercase do kit).
  | (JSExprCommon & { type: 'gk:gameWidth' })
  | (JSExprCommon & { type: 'gk:gameHeight' })
  | (JSExprCommon & { type: 'gk:gameState' })
  | (JSExprCommon & { type: 'gk:stateIs'; name: string })
  | (JSExprCommon & { type: 'gk:charactersTouch'; aVar: string; bVar: string })
  | (JSExprCommon & { type: 'gk:charX'; charVar: string })
  | (JSExprCommon & { type: 'gk:charY'; charVar: string })
  | (JSExprCommon & { type: 'gk:keyDown'; key: string })
  // Edge-trigger: true SÓ no quadro do aperto (tiro 1-por-aperto sem flag manual).
  | (JSExprCommon & { type: 'gk:keyPressed'; key: string })
  // Jogo 2D Avançado (P24) — valores: enxame, combate, HUD/missão.
  | (JSExprCommon & { type: 'gk:countActive'; mold: string })
  | (JSExprCommon & { type: 'gk:touchCircle'; aVar: string; bVar: string })
  | (JSExprCommon & { type: 'gk:isDead'; charVar: string })
  // O gate do P24 ("if (applied)") em forma de pergunta — protege o dano.
  | (JSExprCommon & { type: 'gk:isInvincible'; charVar: string })
  | (JSExprCommon & { type: 'gk:healthOf'; charVar: string })
  | (JSExprCommon & { type: 'gk:animEnded'; charVar: string })
  | (JSExprCommon & { type: 'gk:lutaWinner' })
  | (JSExprCommon & { type: 'gk:lutaRound' })
  | (JSExprCommon & { type: 'gk:lutaWinsOf'; charVar: string })
  | (JSExprCommon & { type: 'gk:lutaCombo'; charVar: string })
  | (JSExprCommon & { type: 'gk:lutaSpecial'; charVar: string })
  | (JSExprCommon & { type: 'gk:lutaIsGuarding'; charVar: string })
  | (JSExprCommon & { type: 'gk:entityState'; charVar: string })
  | (JSExprCommon & { type: 'gk:angleOf'; charVar: string })
  | (JSExprCommon & { type: 'gk:angleTo'; charVar: string; targetVar: string })
  | (JSExprCommon & {
      type: 'gk:nearestActive'
      mold: string
      x: number | JSExpr
      y: number | JSExpr
    })
  // R21: um vivo QUALQUER do pool (o atirador aleatório do Space Invaders).
  | (JSExprCommon & { type: 'gk:randomActive'; mold: string })
  // 🚀 R22 — Kit Nave: o poder de tiro valendo ('normal'|'metralhadora'|'leque').
  | (JSExprCommon & { type: 'gk:navePowerOf'; charVar: string })
  // 🛤️ R25 — o progresso 0..100 de uma entidade no caminho; e o vivo com
  // maior/menor de uma propriedade (generaliza nearest/random).
  | (JSExprCommon & { type: 'gk:pathProgress'; charVar: string })
  | (JSExprCommon & { type: 'gk:pickActive'; mold: string; mode: string; prop: string })
  // 🏰 R26 — as moedas da carteira do Kit Defesa de Torre.
  | (JSExprCommon & { type: 'gk:tdCoins' })
  | (JSExprCommon & { type: 'gk:countItem'; name: string })
  | (JSExprCommon & { type: 'gk:timeSurvived' })
  | (JSExprCommon & { type: 'gk:kills' })
  // R2: câmera e mouse em coordenadas do mundo e da tela.
  | (JSExprCommon & { type: 'gk:cameraX' })
  | (JSExprCommon & { type: 'gk:cameraY' })
  | (JSExprCommon & { type: 'gk:mouseX' })
  | (JSExprCommon & { type: 'gk:mouseY' })
  | (JSExprCommon & { type: 'gk:mouseScreenX' })
  | (JSExprCommon & { type: 'gk:mouseScreenY' })
  | (JSExprCommon & { type: 'gk:mouseDown' })
  // 🧙 Kit RPG — valores: célula→px, flags, itens e resultado da batalha.
  | (JSExprCommon & { type: 'gk:rpgCell'; n: number | JSExpr })
  | (JSExprCommon & { type: 'gk:rpgHasFlag'; flag: string })
  | (JSExprCommon & { type: 'gk:rpgHasItem'; item: string })
  | (JSExprCommon & { type: 'gk:rpgBattleWon' })
  | (JSExprCommon & { type: 'gk:rpgHasSave' })
  | (JSExprCommon & { type: 'gk:rpgLevel' })
  | (JSExprCommon & { type: 'gk:rpgXp' })
  // 👑 R30: a vida de um combatente na batalha (por nome) — as fases do chefe.
  | (JSExprCommon & { type: 'gk:battlerLife'; name: string })
  | (JSExprCommon & { type: 'gk:battlerMaxLife'; name: string })
  // 🌍 Mundo aberto: o nome do mapa atual.
  | (JSExprCommon & { type: 'gk:rpgCurrentMap' })
  // 🧩 Tabuleiro/grade: ler valor, contar e checar limites (reporters).
  | (JSExprCommon & {
      type: 'gk:boardGet'
      name: string
      col: number | JSExpr
      row: number | JSExpr
    })
  | (JSExprCommon & { type: 'gk:boardCount'; name: string; value: number | JSExpr })
  | (JSExprCommon & {
      type: 'gk:boardIn'
      name: string
      col: number | JSExpr
      row: number | JSExpr
    })
  // 🎲 R30 — jogos de tabuleiro: dado, jogador da vez e a casa da peça (reporters).
  | (JSExprCommon & { type: 'gk:rollDice'; faces: number | JSExpr })
  | (JSExprCommon & { type: 'gk:currentPlayer' })
  | (JSExprCommon & { type: 'gk:spaceOf'; who: string })
  // 🃏 R30 — cartas: pilha (lista), carta de 2 faces e a mão clicável (reporters).
  | (JSExprCommon & { type: 'gk:pileTop'; pileVar: string })
  | (JSExprCommon & { type: 'gk:pileSize'; pileVar: string })
  | (JSExprCommon & { type: 'gk:card'; front: number | JSExpr; back: number | JSExpr })
  | (JSExprCommon & { type: 'gk:cardIsUp'; card: number | JSExpr })
  | (JSExprCommon & { type: 'gk:cardFace'; card: number | JSExpr })
  | (JSExprCommon & {
      type: 'gk:cardAt'
      x: number | JSExpr
      y: number | JSExpr
      pileVar: string
    })
  // 🃏 R30 — Kit Cartas (deck-battler): getters da batalha (reporters).
  | (JSExprCommon & { type: 'gk:cardsEnergy' })
  | (JSExprCommon & { type: 'gk:cardsHeroLife' })
  | (JSExprCommon & { type: 'gk:cardsEnemyLife' })
  | (JSExprCommon & { type: 'gk:cardsIntentAction' })
  | (JSExprCommon & { type: 'gk:cardsIntentValue' })
  // 🥷 Ação em tempo real: "o golpe de A acertou B?" (caixa de golpe à frente).
  | (JSExprCommon & { type: 'gk:didHit'; aVar: string; bVar: string })
  // ⚙️ Física geral (R11): valores que o jogo INTEIRO precisa poder ler.
  | (JSExprCommon & { type: 'gk:isOnGround'; charVar: string })
  // 🧭 R15 — primitivos gerais
  | (JSExprCommon & { type: 'gk:isInside'; charVar: string; region: string })
  | (JSExprCommon & { type: 'gk:overlapPercent'; charVar: string; region: string })
  | (JSExprCommon & { type: 'gk:chance'; percent: number | JSExpr })
  | (JSExprCommon & { type: 'gk:distanceBetween'; a: string; b: string })
  | (JSExprCommon & { type: 'gk:pointIn'; x: number | JSExpr; y: number | JSExpr; charVar: string })
  | (JSExprCommon & { type: 'gk:opacityOf'; charVar: string })
  | (JSExprCommon & { type: 'gk:savedValue'; name: string })
  // 👾 R16 — Kit Monstrinhos
  | (JSExprCommon & { type: 'gk:pkmLevelOf'; creature: string })
  | (JSExprCommon & { type: 'gk:pkmHas'; creature: string })
  | (JSExprCommon & { type: 'gk:pkmTeamSize' })
  | (JSExprCommon & { type: 'gk:pkmBallCount' })
  | (JSExprCommon & { type: 'gk:pkmCaught' })
  | (JSExprCommon & { type: 'gk:velocityOf'; charVar: string; axis: string })
  | (JSExprCommon & { type: 'gk:propertyOf'; charVar: string; prop: string })
  | (JSExprCommon & { type: 'gk:facingOf'; charVar: string })
  | (JSExprCommon & { type: 'gk:cooldownReady'; charVar: string; seconds: number | JSExpr })
  | (JSExprCommon & {
      type: 'gk:tileAt'
      map: string
      x: number | JSExpr
      y: number | JSExpr
    })
  // Jogo 3D Avançado (extensão game-3d-advanced) — valores: mundo, enxames,
  // teclas, posição/vida/estado da entidade, mira e colisão por distância.
  | (JSExprCommon & { type: 'g3k:worldSize' })
  | (JSExprCommon & { type: 'g3k:countAlive'; mold: string })
  | (JSExprCommon & { type: 'g3k:keyDown'; key: string })
  | (JSExprCommon & { type: 'g3k:mouseDown' })
  | (JSExprCommon & { type: 'g3k:mousePressed' })
  | (JSExprCommon & { type: 'g3k:keyPressed'; key: string })
  | (JSExprCommon & { type: 'g3k:posOf'; axis: string; charVar: string })
  // "Ainda está no jogo?" — o teste de alvo válido (pode ter sido derrotado).
  | (JSExprCommon & { type: 'g3k:exists'; charVar: string })
  | (JSExprCommon & { type: 'g3k:entityStateIs'; charVar: string; state: string })
  // "É do molde?" — o filtro de identidade das zonas (o isValidTarget do curso).
  | (JSExprCommon & { type: 'g3k:isMold'; charVar: string; mold: string })
  // O "dot > 0.999" da torre do curso em forma de pergunta (mirar → atirar).
  | (JSExprCommon & { type: 'g3k:isAimingAt'; aVar: string; bVar: string })
  | (JSExprCommon & { type: 'g3k:touches'; aVar: string; bVar: string; dist: number | JSExpr })
  | (JSExprCommon & { type: 'g3k:healthOf'; charVar: string })
  | (JSExprCommon & { type: 'g3k:stateIs'; name: string })
  | (JSExprCommon & { type: 'g3k:gameState' })
  // Gaveta de dados por entidade (cronômetro/alvo/contador) + segundos no estado.
  | (JSExprCommon & { type: 'g3k:entityValue'; key: string; charVar: string })
  | (JSExprCommon & { type: 'g3k:stateTime'; charVar: string })
  | (JSExprCommon & { type: 'g3k:onGround'; charVar: string })
  | (JSExprCommon & { type: 'g3k:velocityOf'; charVar: string; axis: 'x' | 'y' | 'z' })
  | (JSExprCommon & { type: 'g3k:distanceBetween'; aVar: string; bVar: string })
  | (JSExprCommon & { type: 'g3k:randomBetween'; from: number | JSExpr; to: number | JSExpr })
  | (JSExprCommon & { type: 'g3k:randomChance'; percent: number | JSExpr })
  | (JSExprCommon & { type: 'g3k:timeLeft' })
  | (JSExprCommon & { type: 'g3k:maxHealthOf'; charVar: string })
  | (JSExprCommon & { type: 'g3k:stateOf'; charVar: string })
  // Mira/clique no mundo: mouse sobre a entidade (bool) e ponto do chão (núm).
  | (JSExprCommon & { type: 'g3k:pointerOver'; charVar: string })
  | (JSExprCommon & { type: 'g3k:groundPoint'; axis: 'x' | 'y' | 'z' })
  // Mundo 3D (extensão world-3d) — valores: mundo/terreno, carrinho e teclas.
  | (JSExprCommon & { type: 'w3d:worldSize' })
  | (JSExprCommon & { type: 'w3d:groundHeight'; x: number | JSExpr; z: number | JSExpr })
  | (JSExprCommon & { type: 'w3d:carPos'; axis: 'x' | 'y' | 'z' })
  | (JSExprCommon & { type: 'w3d:carSpeed' })
  | (JSExprCommon & { type: 'w3d:personPos'; axis: 'x' | 'y' | 'z' })
  | (JSExprCommon & { type: 'w3d:isDriving' })
  | (JSExprCommon & { type: 'w3d:coinCount' })
  | (JSExprCommon & { type: 'w3d:hasAchievement'; name: string })
  | (JSExprCommon & { type: 'w3d:inventoryCount'; item: string })
  | (JSExprCommon & { type: 'w3d:inventoryHas'; item: string; n: number | JSExpr })
  | (JSExprCommon & { type: 'w3d:keyDown'; key: string })
  | (JSExprCommon & { type: 'w3d:keyPressed'; key: string })
  | (JSExprCommon & { type: 'w3d:timeOfDay' })
  | (JSExprCommon & { type: 'w3d:raceTime' })
  | (JSExprCommon & { type: 'w3d:raceBest' })
  | (JSExprCommon & { type: 'w3d:pinsDown' })
  | (JSExprCommon & { type: 'w3d:knockedCount' })
  // Entrada (caminho "na mão"): tecla apertada (bool) e posição do ponteiro (núm).
  | (JSExprCommon & { type: 'inputKeyPressed'; key: string })
  | (JSExprCommon & { type: 'inputPointer'; axis: 'x' | 'y' })
  // Função matemática de um valor (Math.round/floor/ceil/abs/sqrt) e
  // trigonometria de um valor em radianos (Math.sin/cos/tan/asin/acos/atan).
  | (JSExprCommon & {
      type: 'mathUnary'
      fn:
        | 'round'
        | 'floor'
        | 'ceil'
        | 'abs'
        | 'sqrt'
        | 'sin'
        | 'cos'
        | 'tan'
        | 'asin'
        | 'acos'
        | 'atan'
        | 'sign'
      arg: JSExpr
    })
  // Transforma uma lista item a item: `lista.map((item) => <expr>)`.
  | (JSExprCommon & { type: 'arrayMap'; arrayVar: string; itemName: string; transform: JSExpr })
  // Função de dois valores (Math.min/Math.max/Math.atan2/Math.hypot).
  | (JSExprCommon & {
      type: 'mathBinary'
      fn: 'min' | 'max' | 'atan2' | 'hypot'
      a: JSExpr
      b: JSExpr
    })
  // Distância entre dois objetos com posição (.x/.y): Math.hypot(a.x-b.x, a.y-b.y).
  | (JSExprCommon & { type: 'distance'; a: JSExpr; b: JSExpr })
  // Constante matemática (Math.PI / Math.E).
  | (JSExprCommon & { type: 'mathConst'; name: 'PI' | 'E' })
  // Conversão de ângulo entre graus e radianos.
  | (JSExprCommon & { type: 'angleConvert'; dir: 'degToRad' | 'radToDeg'; arg: JSExpr })
  // Propriedade do evento dentro de um listener (event.clientX/clientY/key/code).
  | (JSExprCommon & { type: 'eventProp'; prop: 'clientX' | 'clientY' | 'key' | 'code' })
  // Lê do armazenamento do navegador (`localStorage.getItem(chave)` / `sessionStorage`).
  | (JSExprCommon & { type: 'storageGet'; store: 'local' | 'session'; key: JSExpr })
  // Vetor 2D/3D literal ({ x, y } / { x, y, z }).
  | (JSExprCommon & { type: 'vec2'; x: JSExpr; y: JSExpr })
  | (JSExprCommon & { type: 'vec3'; x: JSExpr; y: JSExpr; z: JSExpr })
  // Lista/array literal ([a, b, …]).
  | (JSExprCommon & { type: 'array'; items: JSExpr[] })
  // Tamanho de uma lista (arr.length).
  | (JSExprCommon & { type: 'arrayLength'; arrayVar: string })
  // Valor calculado a partir da data/hora atual (ex.: ano no rodapé).
  | (JSExprCommon & { type: 'now'; kind: 'year' | 'date' | 'time' })
  // Parte NUMÉRICA da data/hora atual (new Date().getHours() etc.) — para
  // relógios e animações; o `now` acima só dá strings localizadas.
  | (JSExprCommon & {
      type: 'dateGet'
      part: 'year' | 'month' | 'dayOfMonth' | 'weekday' | 'hours' | 'minutes' | 'seconds' | 'ms'
    })
  // Largura/altura da viewport e densidade de pixels (window.innerWidth /
  // window.innerHeight / window.devicePixelRatio).
  | (JSExprCommon & { type: 'global'; kind: 'innerWidth' | 'innerHeight' | 'devicePixelRatio' })
  // O sistema está no modo escuro? (window.matchMedia('(prefers-color-scheme: dark)').matches)
  | (JSExprCommon & { type: 'systemDark' })
  // Milissegundos desde o carregamento da página (performance.now()) — para delta de quadro.
  | (JSExprCommon & { type: 'perfNow' })
  // Está em tela cheia? (Fullscreen API) → document.fullscreenElement != null.
  | (JSExprCommon & { type: 'isFullscreen' })
  // Largura/altura do elemento canvas associado a um contexto (canvas.width).
  | (JSExprCommon & { type: 'canvasDim'; ctxVar: string; dim: 'width' | 'height' })
  | (JSExprCommon & { type: 'canvasMeasureText'; ctxVar: string; text: JSExpr })
  // Canvas — "o ponto (x,y) está dentro do traçado / na linha do traçado?" (booleanos).
  | (JSExprCommon & { type: 'canvasIsPointInPath'; ctxVar: string; x: JSExpr; y: JSExpr })
  | (JSExprCommon & { type: 'canvasIsPointInStroke'; ctxVar: string; x: JSExpr; y: JSExpr })
  // Inteiro aleatório no intervalo [min, max].
  | (JSExprCommon & { type: 'random'; min: JSExpr; max: JSExpr })
  // Cor HSL. Gera o template `hsl(${h}, ${s}%, ${l}%)`; h/s/l podem ser número,
  // variável ou expressão. Volta ao bloco sz_val_color_hsl.
  | (JSExprCommon & { type: 'hslColor'; h: JSExpr; s: JSExpr; l: JSExpr })
  // Decimal aleatório cru de 0 (inclusive) a 1 (exclusivo) — Math.random().
  | (JSExprCommon & { type: 'randomFloat' })
  // Propriedade do próprio objeto, dentro de um método (this.nome).
  | (JSExprCommon & { type: 'thisProp'; name: string })
  // Propriedade de um objeto/instância (obj.nome).
  | (JSExprCommon & { type: 'propAccess'; objectVar: string; name: string })
  // O elemento atual dentro de um handler (`this`).
  | (JSExprCommon & { type: 'thisRef' })
  // Chamada de método em forma de valor (obj.metodo(args)).
  | (JSExprCommon & { type: 'callMethodExpr'; objectVar: string; method: string; args: JSExpr[] })
  // Lê um data-attribute como valor (`el.dataset.chave`).
  | (JSExprCommon & { type: 'datasetGet'; objectVar: string; key: string })
  // Testa se um elemento tem uma classe (`el.classList.contains('x')`).
  | (JSExprCommon & {
      type: 'classContains'
      targetId: string
      targetKind?: 'id' | 'var' | 'this'
      className: string
    })
  // Junta texto e valores num só texto (template literal `` `a${b}c` ``).
  | (JSExprCommon & { type: 'concat'; parts: JSExpr[] })
  // Item de uma lista por índice (`arr[i]`).
  | (JSExprCommon & { type: 'index'; arrayVar: string; index: JSExpr })
  // Último item da lista (`lista[lista.length - 1]`).
  | (JSExprCommon & { type: 'arrayLast'; arrayVar: string })
  // Achar o 1º item da lista que passa no teste (`lista.find((item) => cond)`).
  | (JSExprCommon & { type: 'arrayFind'; arrayVar: string; itemName: string; cond: JSExpr })
  // Filtrar lista: NOVA lista só com os itens que passam no teste. `array` é uma
  // EXPRESSÃO (soquete) — cobre membro (`this.enemies.filter(...)`), não só variável.
  | (JSExprCommon & { type: 'arrayFilter'; array: JSExpr; itemName: string; cond: JSExpr })
  // Junta listas (`[...a, ...b]`).
  | (JSExprCommon & { type: 'concatArrays'; parts: JSExpr[] })
  // Embaralha uma lista (`arr.sort(() => Math.random() - 0.5)`).
  | (JSExprCommon & { type: 'shuffle'; arrayVar: string })
  // Objeto literal genérico ({ chave: valor, ... }).
  | (JSExprCommon & { type: 'objectLiteral'; entries: Array<{ key: string; value: JSExpr }> })
  // Leitura de propriedade de qualquer valor (objeto = expressão; cobre aninhamento como this.velocidade.x).
  // `optional` = acesso com `?.` (não estoura se o objeto for null/undefined).
  | (JSExprCommon & { type: 'memberGet'; object: JSExpr; name: string; optional?: boolean })
  // Chamada de método em forma de valor sobre qualquer objeto (object.metodo(args)).
  | (JSExprCommon & { type: 'memberCallExpr'; object: JSExpr; method: string; args: JSExpr[] })
  // Instanciar classe em forma de VALOR: new Classe(args) numa tomada (argumento de
  // push/método, valor de propriedade…). `const x = new C()` continua sendo o
  // statement `newInstance`. `namespace` = construtor de uma biblioteca importada
  // (`new THREE.Scene()` → namespace 'THREE', className 'Scene'); ausente = classe
  // do aluno (resolvida por getClassReference).
  | (JSExprCommon & {
      type: 'newExpr'
      className: string
      args: JSExpr[]
      namespace?: string
    })
  // Object.keys/values/entries(obj) — a lista de chaves/valores/pares de um objeto.
  | (JSExprCommon & { type: 'objectOp'; op: 'keys' | 'values' | 'entries'; object: JSExpr })
  // Imagem do projeto (asset): gera a FONTE resolvida (dataURL do projeto, com fallback pro nome).
  | (JSExprCommon & { type: 'assetImage'; name: string })
  // O elemento da página com um id (`document.getElementById('id')`) como VALOR —
  // ex.: guardar uma <img> numa propriedade p/ desenhar depois no canvas.
  | (JSExprCommon & { type: 'getElement'; id: string })
  // Os elementos que casam com um seletor CSS como VALOR —
  // `document.querySelector(sel)` (all:false) / `querySelectorAll(sel)` (all:true).
  | (JSExprCommon & { type: 'querySelectorValue'; selector: string; all: boolean })
  // `new Promise((resolve) => { ... })` — uma promessa com corpo (o `resolve` é
  // chamado via `callFunction`). `param` é o nome do parâmetro (ex.: "resolve").
  | (JSExprCommon & { type: 'newPromise'; param: string; body: JSStatement[] })
  // `Promise.all([...])` — espera todas as promessas de uma lista (valor).
  | (JSExprCommon & { type: 'promiseAll'; list: JSExpr })
  // Acesso por chave/índice computado: obj[chave] / lista[i].
  | (JSExprCommon & { type: 'indexGet'; object: JSExpr; index: JSExpr })

/** Campo de TELA do showScreen (título/subtítulo/dica): texto legado de projetos
 * antigos OU uma expressão (variável, "juntar texto", resultado de função…). */
export type ScreenText = string | JSExpr
/** Normaliza um ScreenText para JSExpr (string crua vira um literal de texto). */
export function screenTextToExpr(v: ScreenText): JSExpr {
  return typeof v === 'string' ? { type: 'str', value: v } : v
}

/** Valor de um campo que virou soquete oval: número/texto CRU de projetos antigos OU
 * uma expressão (variável, conta, "juntar texto", resultado de função). */
export type FieldValue = number | string | JSExpr
/** Normaliza um FieldValue para JSExpr (número/texto cru vira literal). Mantém o IR
 * antigo (valor cru salvo no projeto) compatível com o novo (expressão). */
export function valueToExpr(v: FieldValue): JSExpr {
  if (typeof v === 'number') return { type: 'num', value: v }
  if (typeof v === 'string') return { type: 'str', value: v }
  return v
}

export const JSExprSchema: z.ZodType<JSExpr> = z.lazy(() =>
  z.discriminatedUnion('type', [
    jsExprBase,
    z.object({
      type: z.literal('binop'),
      op: z.enum(['+', '-', '*', '/', '%', '**', '>', '<', '>=', '<=', '==', '!=', '===', '!==']),
      left: JSExprSchema,
      right: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('logical'),
      op: z.enum(['&&', '||']),
      left: JSExprSchema,
      right: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('logicalNot'), value: JSExprSchema, ...idField }),
    z.object({
      type: z.literal('ternary'),
      condition: JSExprSchema,
      whenTrue: JSExprSchema,
      whenFalse: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('call'),
      name: irText(),
      args: z.array(JSExprSchema),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:keyDown'), key: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:touches'),
      aVar: irText(),
      bVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:countGroup'), groupVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:spriteAngle'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:distance'), aVar: irText(), bVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:angleTo'), aVar: irText(), bVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:getHealth'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:getMaxHealth'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:enemyDamage'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:spriteX'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:spriteY'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:spriteW'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:spriteH'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:centerX'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:centerY'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:shapeW'), ...idField }),
    z.object({ type: z.literal('g2d:shapeH'), ...idField }),
    z.object({ type: z.literal('g2d:spriteVx'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:spriteVy'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:spriteSpeed'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:isMoving'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:isMovingH'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:isMovingV'), spriteVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:randomBetween'),
      min: z.union([JSExprSchema, z.number()]),
      max: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:randomChance'),
      percent: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:hasHealth'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:healthDepleted'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:isInvincible'), spriteVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:cooldownReady'),
      spriteVar: irText(),
      frames: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:isPaused'), ...idField }),
    z.object({ type: z.literal('g2d:cameraX'), ...idField }),
    z.object({ type: z.literal('g2d:cameraY'), ...idField }),
    z.object({
      type: z.literal('g2d:randomX'),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:randomY'),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:tileAtSprite'),
      mapVar: irText(),
      spriteVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:sceneIs'), name: irText(), ...idField }),
    z.object({ type: z.literal('g2d:stickPathFell'), pathVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:balloonPathMeters'), pathVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:balloonFuel'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:balloonLandedOut'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:pointerDown'), ...idField }),
    z.object({ type: z.literal('g2d:aimReleased'), throwerVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:bananaHitThrower'),
      cityVar: irText(),
      throwerVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:bananaHitCity'), cityVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:keyDown'), key: irText(), ...idField }),
    z.object({ type: z.literal('g3d:collides'), aVar: irText(), bVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:hitAny'), objVar: irText(), groupVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:crosserHit'),
      objVar: irText(),
      worldVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:crosserRow'), objVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:touchesBox'),
      objVar: irText(),
      groupVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:distanceTo'), aVar: irText(), bVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:countSwarm'), swarmVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:countGroup'), groupVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:isNear'),
      aVar: irText(),
      bVar: irText(),
      dist: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:raceHit'), objVar: irText(), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:raceLaps'), objVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:stackScore'), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:stackGameOver'), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:getPos'), objVar: irText(), axis: irText(), ...idField }),
    z.object({ type: z.literal('g3d:getRot'), objVar: irText(), axis: irText(), ...idField }),
    z.object({ type: z.literal('g3d:getScale'), objVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:getVel'), objVar: irText(), axis: irText(), ...idField }),
    z.object({ type: z.literal('g3d:getSpeed'), objVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:isMoving'), objVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:dt'), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:angleTo'), aVar: irText(), bVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:pickAtMouse'), worldVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:pointerOver'),
      worldVar: irText(),
      objVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:aimAhead'),
      worldVar: irText(),
      objVar: irText(),
      dist: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:onGround'), worldVar: irText(), objVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:groundHeight'),
      worldVar: irText(),
      objVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:gameWidth'), ...idField }),
    z.object({ type: z.literal('gk:gameHeight'), ...idField }),
    z.object({ type: z.literal('gk:gameState'), ...idField }),
    z.object({ type: z.literal('gk:stateIs'), name: irText(), ...idField }),
    z.object({
      type: z.literal('gk:charactersTouch'),
      aVar: irText(),
      bVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:charX'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:charY'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:keyDown'), key: irText(), ...idField }),
    z.object({ type: z.literal('gk:keyPressed'), key: irText(), ...idField }),
    z.object({ type: z.literal('gk:countActive'), mold: irText(), ...idField }),
    z.object({ type: z.literal('gk:touchCircle'), aVar: irText(), bVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:isDead'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:isInvincible'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:healthOf'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:animEnded'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:lutaWinner'), ...idField }),
    z.object({ type: z.literal('gk:lutaRound'), ...idField }),
    z.object({ type: z.literal('gk:lutaWinsOf'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:lutaCombo'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:lutaSpecial'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:lutaIsGuarding'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:entityState'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:angleOf'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('gk:angleTo'),
      charVar: irText(),
      targetVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:nearestActive'),
      mold: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:randomActive'), mold: irText(), ...idField }),
    z.object({ type: z.literal('gk:navePowerOf'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:pathProgress'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('gk:pickActive'),
      mold: irText(),
      mode: irText(),
      prop: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:tdCoins'), ...idField }),
    z.object({ type: z.literal('gk:countItem'), name: irText(), ...idField }),
    z.object({ type: z.literal('gk:timeSurvived'), ...idField }),
    z.object({ type: z.literal('gk:kills'), ...idField }),
    z.object({ type: z.literal('gk:cameraX'), ...idField }),
    z.object({ type: z.literal('gk:cameraY'), ...idField }),
    z.object({ type: z.literal('gk:mouseX'), ...idField }),
    z.object({ type: z.literal('gk:mouseY'), ...idField }),
    z.object({ type: z.literal('gk:mouseScreenX'), ...idField }),
    z.object({ type: z.literal('gk:mouseScreenY'), ...idField }),
    z.object({ type: z.literal('gk:mouseDown'), ...idField }),
    z.object({
      type: z.literal('gk:rpgCell'),
      n: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:rpgHasFlag'), flag: irText(), ...idField }),
    z.object({ type: z.literal('gk:rpgHasItem'), item: irText(), ...idField }),
    z.object({ type: z.literal('gk:rpgBattleWon'), ...idField }),
    z.object({ type: z.literal('gk:rpgHasSave'), ...idField }),
    z.object({ type: z.literal('gk:rpgLevel'), ...idField }),
    z.object({ type: z.literal('gk:rpgXp'), ...idField }),
    z.object({ type: z.literal('gk:battlerLife'), name: irText(), ...idField }),
    z.object({ type: z.literal('gk:battlerMaxLife'), name: irText(), ...idField }),
    z.object({ type: z.literal('gk:rpgCurrentMap'), ...idField }),
    z.object({
      type: z.literal('gk:boardGet'),
      name: irText(),
      col: z.union([JSExprSchema, z.number()]),
      row: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:boardCount'),
      name: irText(),
      value: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:boardIn'),
      name: irText(),
      col: z.union([JSExprSchema, z.number()]),
      row: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rollDice'),
      faces: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:currentPlayer'), ...idField }),
    z.object({ type: z.literal('gk:spaceOf'), who: irText(), ...idField }),
    z.object({ type: z.literal('gk:pileTop'), pileVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:pileSize'), pileVar: irText(), ...idField }),
    z.object({
      type: z.literal('gk:card'),
      front: z.union([JSExprSchema, z.number()]),
      back: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:cardIsUp'),
      card: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:cardFace'),
      card: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:cardAt'),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      pileVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:cardsEnergy'), ...idField }),
    z.object({ type: z.literal('gk:cardsHeroLife'), ...idField }),
    z.object({ type: z.literal('gk:cardsEnemyLife'), ...idField }),
    z.object({ type: z.literal('gk:cardsIntentAction'), ...idField }),
    z.object({ type: z.literal('gk:cardsIntentValue'), ...idField }),
    z.object({ type: z.literal('gk:didHit'), aVar: irText(), bVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:isOnGround'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:isInside'), charVar: irText(), region: irText(), ...idField }),
    z.object({
      type: z.literal('gk:overlapPercent'),
      charVar: irText(),
      region: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:chance'),
      percent: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:distanceBetween'), a: irText(), b: irText(), ...idField }),
    z.object({
      type: z.literal('gk:pointIn'),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      charVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:opacityOf'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:savedValue'), name: irText(), ...idField }),
    z.object({ type: z.literal('gk:pkmLevelOf'), creature: irText(), ...idField }),
    z.object({ type: z.literal('gk:pkmHas'), creature: irText(), ...idField }),
    z.object({ type: z.literal('gk:pkmTeamSize'), ...idField }),
    z.object({ type: z.literal('gk:pkmBallCount'), ...idField }),
    z.object({ type: z.literal('gk:pkmCaught'), ...idField }),
    z.object({ type: z.literal('gk:velocityOf'), charVar: irText(), axis: irText(), ...idField }),
    z.object({ type: z.literal('gk:propertyOf'), charVar: irText(), prop: irText(), ...idField }),
    z.object({ type: z.literal('gk:facingOf'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('gk:cooldownReady'),
      charVar: irText(),
      seconds: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:tileAt'),
      map: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:worldSize'), ...idField }),
    z.object({ type: z.literal('g3k:countAlive'), mold: irText(), ...idField }),
    z.object({ type: z.literal('g3k:keyDown'), key: irText(), ...idField }),
    z.object({ type: z.literal('g3k:mouseDown'), ...idField }),
    z.object({ type: z.literal('g3k:mousePressed'), ...idField }),
    z.object({ type: z.literal('g3k:keyPressed'), key: irText(), ...idField }),
    z.object({ type: z.literal('w3d:worldSize'), ...idField }),
    z.object({
      type: z.literal('w3d:groundHeight'),
      x: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:carPos'), axis: z.enum(['x', 'y', 'z']), ...idField }),
    z.object({ type: z.literal('w3d:carSpeed'), ...idField }),
    z.object({ type: z.literal('w3d:personPos'), axis: z.enum(['x', 'y', 'z']), ...idField }),
    z.object({ type: z.literal('w3d:isDriving'), ...idField }),
    z.object({ type: z.literal('w3d:coinCount'), ...idField }),
    z.object({ type: z.literal('w3d:hasAchievement'), name: irText(), ...idField }),
    z.object({ type: z.literal('w3d:inventoryCount'), item: irText(), ...idField }),
    z.object({
      type: z.literal('w3d:inventoryHas'),
      item: irText(),
      n: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:keyDown'), key: irText(), ...idField }),
    z.object({ type: z.literal('w3d:keyPressed'), key: irText(), ...idField }),
    z.object({ type: z.literal('w3d:timeOfDay'), ...idField }),
    z.object({ type: z.literal('w3d:raceTime'), ...idField }),
    z.object({ type: z.literal('w3d:raceBest'), ...idField }),
    z.object({ type: z.literal('w3d:pinsDown'), ...idField }),
    z.object({ type: z.literal('w3d:knockedCount'), ...idField }),
    z.object({ type: z.literal('g3k:posOf'), axis: irText(), charVar: irText(), ...idField }),
    z.object({ type: z.literal('g3k:exists'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3k:entityStateIs'),
      charVar: irText(),
      state: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:isMold'), charVar: irText(), mold: irText(), ...idField }),
    z.object({ type: z.literal('g3k:isAimingAt'), aVar: irText(), bVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3k:touches'),
      aVar: irText(),
      bVar: irText(),
      dist: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:healthOf'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('g3k:stateIs'), name: irText(), ...idField }),
    z.object({ type: z.literal('g3k:gameState'), ...idField }),
    z.object({ type: z.literal('g3k:entityValue'), key: irText(), charVar: irText(), ...idField }),
    z.object({ type: z.literal('g3k:stateTime'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('g3k:onGround'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3k:velocityOf'),
      charVar: irText(),
      axis: z.enum(['x', 'y', 'z']),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:randomBetween'),
      from: z.union([JSExprSchema, z.number()]),
      to: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:randomChance'),
      percent: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:timeLeft'), ...idField }),
    z.object({
      type: z.literal('g3k:distanceBetween'),
      aVar: irText(),
      bVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:maxHealthOf'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('g3k:stateOf'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('g3k:pointerOver'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('g3k:groundPoint'), axis: z.enum(['x', 'y', 'z']), ...idField }),
    z.object({ type: z.literal('inputKeyPressed'), key: irText(), ...idField }),
    z.object({ type: z.literal('inputPointer'), axis: z.enum(['x', 'y']), ...idField }),
    z.object({ type: z.literal('isFullscreen'), ...idField }),
    z.object({ type: z.literal('systemDark'), ...idField }),
    z.object({ type: z.literal('perfNow'), ...idField }),
    z.object({
      type: z.literal('mathUnary'),
      fn: z.enum([
        'round',
        'floor',
        'ceil',
        'abs',
        'sqrt',
        'sin',
        'cos',
        'tan',
        'asin',
        'acos',
        'atan',
        'sign',
      ]),
      arg: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('arrayMap'),
      arrayVar: irText(),
      itemName: irText(),
      transform: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('mathBinary'),
      fn: z.enum(['min', 'max', 'atan2', 'hypot']),
      a: JSExprSchema,
      b: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('distance'), a: JSExprSchema, b: JSExprSchema, ...idField }),
    z.object({ type: z.literal('mathConst'), name: z.enum(['PI', 'E']), ...idField }),
    z.object({
      type: z.literal('angleConvert'),
      dir: z.enum(['degToRad', 'radToDeg']),
      arg: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('eventProp'),
      prop: z.enum(['clientX', 'clientY', 'key', 'code']),
      ...idField,
    }),
    z.object({
      type: z.literal('storageGet'),
      store: z.enum(['local', 'session']),
      key: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('vec2'), x: JSExprSchema, y: JSExprSchema, ...idField }),
    z.object({
      type: z.literal('vec3'),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('array'), items: z.array(JSExprSchema), ...idField }),
    z.object({ type: z.literal('arrayLength'), arrayVar: irText(), ...idField }),
    z.object({ type: z.literal('now'), kind: z.enum(['year', 'date', 'time']), ...idField }),
    z.object({
      type: z.literal('dateGet'),
      part: z.enum(['year', 'month', 'dayOfMonth', 'weekday', 'hours', 'minutes', 'seconds', 'ms']),
      ...idField,
    }),
    z.object({
      type: z.literal('global'),
      kind: z.enum(['innerWidth', 'innerHeight', 'devicePixelRatio']),
      ...idField,
    }),
    z.object({
      type: z.literal('canvasDim'),
      ctxVar: irText(),
      dim: z.enum(['width', 'height']),
      ...idField,
    }),
    z.object({
      type: z.literal('canvasMeasureText'),
      ctxVar: irText(),
      text: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasIsPointInPath'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasIsPointInStroke'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('random'), min: JSExprSchema, max: JSExprSchema, ...idField }),
    z.object({
      type: z.literal('hslColor'),
      h: JSExprSchema,
      s: JSExprSchema,
      l: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('randomFloat'), ...idField }),
    z.object({ type: z.literal('thisProp'), name: irText(), ...idField }),
    z.object({
      type: z.literal('propAccess'),
      objectVar: irText(),
      name: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('thisRef'), ...idField }),
    z.object({
      type: z.literal('callMethodExpr'),
      objectVar: irText(),
      method: irText(),
      args: z.array(JSExprSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('datasetGet'),
      objectVar: irText(),
      key: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('classContains'),
      targetId: irText(),
      targetKind: z.enum(['id', 'var', 'this']).optional(),
      className: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('concat'), parts: z.array(JSExprSchema), ...idField }),
    z.object({ type: z.literal('index'), arrayVar: irText(), index: JSExprSchema, ...idField }),
    z.object({ type: z.literal('arrayLast'), arrayVar: irText(), ...idField }),
    z.object({
      type: z.literal('arrayFind'),
      arrayVar: irText(),
      itemName: irText(),
      cond: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('arrayFilter'),
      array: JSExprSchema,
      itemName: irText(),
      cond: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('concatArrays'), parts: z.array(JSExprSchema), ...idField }),
    z.object({ type: z.literal('shuffle'), arrayVar: irText(), ...idField }),
    z.object({
      type: z.literal('objectLiteral'),
      entries: z.array(z.object({ key: irText(), value: JSExprSchema })),
      ...idField,
    }),
    z.object({
      type: z.literal('memberGet'),
      object: JSExprSchema,
      name: irText(),
      optional: z.boolean().optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('memberCallExpr'),
      object: JSExprSchema,
      method: irText(),
      args: z.array(JSExprSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('newExpr'),
      className: irText(),
      args: z.array(JSExprSchema),
      namespace: irText().optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('objectOp'),
      op: z.enum(['keys', 'values', 'entries']),
      object: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('assetImage'), name: irText(), ...idField }),
    z.object({ type: z.literal('getElement'), id: irText(), ...idField }),
    z.object({
      type: z.literal('querySelectorValue'),
      selector: irText(),
      all: z.boolean(),
      ...idField,
    }),
    z.object({
      type: z.literal('newPromise'),
      param: irText(),
      body: z.array(z.lazy(() => JSStatementSchema)),
      ...idField,
    }),
    z.object({
      type: z.literal('promiseAll'),
      list: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('indexGet'),
      object: JSExprSchema,
      index: JSExprSchema,
      ...idField,
    }),
  ]),
)

// ---------- HTML ----------

export const HTMLTagSchema = z.enum(HTML_TAGS)
export type HTMLTag = z.infer<typeof HTMLTagSchema>

interface HTMLNodeCommon {
  __id?: string
}

export type HTMLNode =
  | (HTMLNodeCommon & {
      type: 'element'
      tag: HTMLTag
      id?: string
      text?: string
      attrs?: Record<string, string>
      children?: HTMLNode[]
    })
  | (HTMLNodeCommon & {
      type: 'canvas'
      id?: string
      /** Campo legado; código novo prefere `attrs.class`. */
      class?: string
      width?: number
      height?: number
      attrs?: Record<string, string>
      /** Conteúdo alternativo exibido quando Canvas não está disponível. */
      children?: HTMLNode[]
    })
  // Pedaço de texto solto que vive dentro das `children` de uma tag inline/
  // container — permite que `<p>© <span></span> texto</p>` (conteúdo misto)
  // vire blocos aninhados em vez de "código avançado".
  | (HTMLNodeCommon & { type: 'text'; text: string })
  // Comentário HTML `<!-- ... -->` (miolo em `text`).
  | (HTMLNodeCommon & { type: 'comment'; text: string })
  | (HTMLNodeCommon & { type: 'rawHTML'; html: string; advanced: true })

function containsHTMLElement(node: HTMLNode, tag: HTMLTag): boolean {
  if (node.type !== 'element') return false
  if (node.tag === tag) return true
  return node.children?.some((child) => containsHTMLElement(child, tag)) ?? false
}

export const HTMLNodeSchema: z.ZodType<HTMLNode> = z.lazy(() =>
  z
    .discriminatedUnion('type', [
      z.object({
        type: z.literal('element'),
        tag: HTMLTagSchema,
        id: irText().optional(),
        text: irText().optional(),
        attrs: z.record(z.string(), irText()).optional(),
        children: z.array(HTMLNodeSchema).optional(),
        ...idField,
      }),
      z.object({
        type: z.literal('canvas'),
        id: irText().optional(),
        class: irText().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        attrs: z.record(z.string(), irText()).optional(),
        children: z.array(HTMLNodeSchema).optional(),
        ...idField,
      }),
      z.object({
        type: z.literal('text'),
        text: irText(),
        ...idField,
      }),
      z.object({
        type: z.literal('comment'),
        text: irText(),
        ...idField,
      }),
      z.object({
        type: z.literal('rawHTML'),
        html: irText(),
        advanced: z.literal(true),
        ...idField,
      }),
    ])
    .superRefine((node, ctx) => {
      if (node.type !== 'element' || !node.children) return
      node.children.forEach((child, index) => {
        if (!isHTMLElementChildAllowed(node.tag, child)) {
          ctx.addIssue({
            code: 'custom',
            path: ['children', index],
            message: 'Este bloco não cabe dentro deste conteúdo HTML.',
          })
        }
        if (node.tag === 'form' && containsHTMLElement(child, 'form')) {
          ctx.addIssue({
            code: 'custom',
            path: ['children', index],
            message: 'Um formulário não pode ficar dentro de outro formulário.',
          })
        }
      })
    }),
)

// ---------- CSS ----------

/** Uma declaração CSS na ordem em que foi escrita ou montada com blocos. */
export interface CSSDeclaration {
  property: string
  value: string
  /** Id do bloco `sz_css_decl` que originou esta ocorrência. */
  __id?: string
}

/**
 * O array preserva fallbacks (`display` repetido) e ids por ocorrência. O Record
 * compacto continua válido quando cada propriedade aparece uma única vez e para
 * projetos legados; consumidores usam {@link cssDeclarationEntries} nos dois casos.
 */
export type CSSDeclarations = CSSDeclaration[] | Record<string, string>

export function cssDeclarationEntries(
  declarations: CSSDeclarations,
  legacyIds?: Record<string, string>,
): CSSDeclaration[] {
  if (Array.isArray(declarations)) return declarations
  return Object.entries(declarations).map(([property, value]) => ({
    property,
    value,
    ...(legacyIds?.[property] ? { __id: legacyIds[property] } : {}),
  }))
}

/** Último valor por propriedade, apenas para reconhecimento de blocos dedicados. */
export function cssDeclarationsRecord(declarations: CSSDeclarations): Record<string, string> {
  const record: Record<string, string> = {}
  for (const declaration of cssDeclarationEntries(declarations)) {
    record[declaration.property] = declaration.value
  }
  return record
}

export function hasDuplicateCSSDeclarations(declarations: CSSDeclarations): boolean {
  const seen = new Set<string>()
  for (const declaration of cssDeclarationEntries(declarations)) {
    if (seen.has(declaration.property)) return true
    seen.add(declaration.property)
  }
  return false
}

const CSS_SHORTHAND_COMPONENTS: Readonly<Record<string, readonly string[]>> = {
  all: ['*'],
  'border-color': [
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
  ],
  'border-style': [
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
  ],
  'border-width': [
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
  ],
  'border-block-color': ['border-block-start-color', 'border-block-end-color'],
  'border-block-style': ['border-block-start-style', 'border-block-end-style'],
  'border-block-width': ['border-block-start-width', 'border-block-end-width'],
  'border-inline-color': ['border-inline-start-color', 'border-inline-end-color'],
  'border-inline-style': ['border-inline-start-style', 'border-inline-end-style'],
  'border-inline-width': ['border-inline-start-width', 'border-inline-end-width'],
  columns: ['column-width', 'column-count'],
  'contain-intrinsic-size': [
    'contain-intrinsic-width',
    'contain-intrinsic-height',
    'contain-intrinsic-block-size',
    'contain-intrinsic-inline-size',
  ],
  'flex-flow': ['flex-direction', 'flex-wrap'],
  gap: ['row-gap', 'column-gap'],
  inset: ['top', 'right', 'bottom', 'left'],
  'place-content': ['align-content', 'justify-content'],
  'place-items': ['align-items', 'justify-items'],
  'place-self': ['align-self', 'justify-self'],
  'white-space': ['white-space-collapse', 'text-wrap-mode'],
}

function cssPropertiesShareCascade(property: string, candidate: string): boolean {
  if (property.startsWith('--') || candidate.startsWith('--')) return false
  if (property === 'all' || candidate === 'all') return true
  if (candidate.startsWith(`${property}-`) || property.startsWith(`${candidate}-`)) return true
  return (
    CSS_SHORTHAND_COMPONENTS[property]?.includes(candidate) === true ||
    CSS_SHORTHAND_COMPONENTS[candidate]?.includes(property) === true
  )
}

/**
 * Detecta declarações cuja ordem participa da cascata porque uma delas expande
 * ou redefine a outra. Separá-las em blocos dedicados distintos pode inverter
 * o resultado visual mesmo quando os nomes das propriedades são diferentes.
 */
export function hasOrderDependentCSSDeclarations(declarations: CSSDeclarations): boolean {
  const properties = cssDeclarationEntries(declarations).map(({ property }) =>
    property.trim().toLowerCase(),
  )
  return properties.some((property, index) =>
    properties.slice(index + 1).some((candidate) => cssPropertiesShareCascade(property, candidate)),
  )
}

export interface CSSRule {
  selector: string
  declarations: CSSDeclarations
  /**
   * Mapa `propriedade → block.id` do bloco `sz_css_decl` que originou aquela
   * declaração. Existe só quando a regra veio do canvas (não do reverse-parse
   * do texto). É usado pelo gerador para registrar uma entrada no sourcemap
   * por declaração, fazendo o realce bloco↔código funcionar para o bloco da
   * declaração — e não só para a regra-pai inteira.
   */
  __declIds?: Record<string, string>
  __id?: string
}

/**
 * Texto de CSS que não pode carregar `{`/`}` — usado em seletor, nome de
 * `@keyframes` e seletor de passo (`at`). Uma chave nesses campos poderia
 * encerrar a regra atual e emendar outra (injeção: `}` + nova regra com
 * `background:url(...)` para exfiltração). É a correção DURÁVEL: bloqueia já na
 * importação de IR (o strip do gerador é só o cinto-e-suspensório).
 */
const cssNameText = () => irText().regex(/^[^{}]*$/, 'CSS não pode conter chaves { }')

const cssSelectorText = () =>
  irText().refine((selector) => cssSelectorRejectionReason(selector) === null, {
    message: 'O seletor contém uma chave solta ou uma parte incompleta.',
  })

/**
 * Uma chave `{`/`}` em PROFUNDIDADE 0 (fora de aspas e de comentários) rompe a
 * estrutura `selector { … }` e é a vetor de injeção. DENTRO de uma string
 * (`content:"a{b}c"`) ou de um comentário (`/* { *​/`) a chave faz parte do valor
 * e é legítima. Esta máquina de estados (igual à de `generators/css.ts` e à do
 * parser) devolve `true` quando NÃO há chave solta em profundidade 0.
 */
function cssValueHasNoLooseBrace(value: string): boolean {
  let quote: '"' | "'" | null = null
  let inComment = false
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i]
    const next = value[i + 1]
    if (inComment) {
      if (ch === '*' && next === '/') {
        inComment = false
        i += 1
      }
      continue
    }
    if (quote) {
      if (ch === '\\') {
        i += 1
        continue
      }
      if (ch === quote) quote = null
      continue
    }
    if (ch === '/' && next === '*') {
      inComment = true
      i += 1
      continue
    }
    if (ch === '"' || ch === "'") quote = ch
    else if (ch === '{' || ch === '}') return false
  }
  return true
}

/**
 * VALOR de declaração CSS: proíbe chaves `{`/`}` SOLTAS (rompem a regra) mas
 * PERMITE chaves dentro de strings/comentários (`content:"a{b}c"`). O regex
 * antigo `^[^{}]*$` rejeitava o valor inteiro e corrompia o round-trip. O `;` é
 * PERMITIDO porque é legítimo dentro de `url(data:…;base64,…)` e de strings
 * (`content:"a;b"`); o `;` em profundidade 0 (emendar declaração) é barrado no
 * gerador, em `isSafeDeclarationValue` (generators/css.ts).
 */
const cssValueText = () =>
  irText().refine(cssValueHasNoLooseBrace, 'Valor de CSS não pode conter chaves { } soltas')

export const CSSDeclarationSchema: z.ZodType<CSSDeclaration> = z.object({
  property: cssNameText().min(1),
  value: cssValueText(),
  ...idField,
})

const CSSDeclarationsSchema: z.ZodType<CSSDeclarations> = z.union([
  z.array(CSSDeclarationSchema),
  z.record(z.string(), cssValueText()),
])

export const CSSRuleSchema: z.ZodType<CSSRule> = z.object({
  selector: cssSelectorText().min(1),
  declarations: CSSDeclarationsSchema,
  __declIds: z.record(z.string(), z.string()).optional(),
  ...idField,
})

export interface RawCSS {
  type: 'rawCSS'
  code: string
  advanced: true
  __id?: string
}

export const RawCSSSchema: z.ZodType<RawCSS> = z.object({
  type: z.literal('rawCSS'),
  code: irText(),
  advanced: z.literal(true),
  ...idField,
})

/** Comentário CSS `/* ... *\/` (miolo em `text`). */
export interface CommentCSS {
  type: 'comment'
  text: string
  __id?: string
}

export const CommentCSSSchema: z.ZodType<CommentCSS> = z.object({
  type: z.literal('comment'),
  text: irText().refine((text) => cssCommentRejectionReason(text) === null, {
    message: 'O texto contém “*/”, que tentaria fechar o comentário CSS antes da hora.',
  }),
  ...idField,
})

/** Media query guiada de tamanho ou de preferência por movimento reduzido. */
interface MediaQueryCSSBase {
  type: 'mediaQuery'
  rules: CSSEntry[]
  __id?: string
}

export type MediaQueryCSS = MediaQueryCSSBase &
  ({ feature: CSSMediaSizeFeature; px: number } | { feature: 'prefers-reduced-motion'; px?: never })

export const MediaQueryCSSSchema: z.ZodType<MediaQueryCSS> = z.union([
  z.object({
    type: z.literal('mediaQuery'),
    feature: z.enum(CSS_MEDIA_SIZE_FEATURES),
    px: z.number().nonnegative(),
    // Conteúdo da media query. Lazy por ciclo (CSSEntry inclui MediaQueryCSS).
    rules: z.array(z.lazy(() => CSSEntrySchema)),
    ...idField,
  }),
  z.object({
    type: z.literal('mediaQuery'),
    feature: z.literal('prefers-reduced-motion'),
    px: z.never().optional(),
    rules: z.array(z.lazy(() => CSSEntrySchema)),
    ...idField,
  }),
])

/**
 * `@keyframes nome { 0% { … } 100% { … } }`. Cada passo tem um seletor de
 * tempo (`at`: `from`/`to`/`N%`) e suas declarações. Animações que fogem desse
 * formato (ex.: `@-webkit-keyframes`) continuam como {@link RawCSS}.
 */
export interface KeyframesCSS {
  type: 'keyframes'
  name: string
  steps: Array<{ at: string; declarations: CSSDeclarations }>
  __id?: string
}

export const KeyframesCSSSchema: z.ZodType<KeyframesCSS> = z.object({
  type: z.literal('keyframes'),
  name: cssNameText().min(1).refine(isCSSKeyframesName, {
    error: 'Dê à animação um nome simples, sem espaços, como “pulsar”.',
  }),
  steps: z.array(
    z.object({
      at: cssNameText().min(1).refine(isCSSKeyframeSelector, {
        error: 'Use “from”, “to” ou percentuais entre 0% e 100%.',
      }),
      declarations: CSSDeclarationsSchema,
    }),
  ),
  ...idField,
})

/**
 * `@import url("https://fonts.googleapis.com/css?family=Nome")` — importa uma
 * fonte do Google Fonts. `family` é o nome (ex.: "Press Start 2P"); o gerador
 * codifica os espaços. Sai SEMPRE no topo do CSS (regra do `@import`).
 */
export interface GoogleFontCSS {
  type: 'googleFont'
  family: string
  __id?: string
}

export const GoogleFontCSSSchema: z.ZodType<GoogleFontCSS> = z.object({
  type: z.literal('googleFont'),
  family: irText().refine((family) => normalizeGoogleFontFamily(family) !== null, {
    message: 'Nome de fonte inválido. Use apenas o nome da família, como “Press Start 2P”.',
  }),
  ...idField,
})

export type CSSEntry = CSSRule | RawCSS | CommentCSS | MediaQueryCSS | KeyframesCSS | GoogleFontCSS

export const CSSEntrySchema: z.ZodType<CSSEntry> = z.union([
  CSSRuleSchema,
  RawCSSSchema,
  CommentCSSSchema,
  MediaQueryCSSSchema,
  KeyframesCSSSchema,
  GoogleFontCSSSchema,
])

// ---------- JS Statements ----------

export const EVENT_KINDS = [
  'click',
  'keydown',
  'keyup',
  'mouseover',
  'mouseout',
  'mousemove',
  'mousedown',
  'mouseup',
  'pointermove',
  'pointerdown',
  'pointerup',
  'submit',
  'input',
  'change',
  'load',
  'resize',
  // Entrou/saiu da tela cheia (Fullscreen API). Evento global no documento.
  'fullscreenchange',
  // Menu de contexto (botão direito) e perda de foco da janela — usados para
  // zerar o estado do teclado em jogos.
  'contextmenu',
  'blur',
] as const
const eventKindSchema = z.enum(EVENT_KINDS)
export type EventKind = z.infer<typeof eventKindSchema>

interface JSStatementCommon {
  __id?: string
}

export type JSStatement =
  | (JSStatementCommon & { type: 'var'; name: string; value: JSExpr; kind?: 'let' | 'const' })
  // Declaração sem valor inicial (`let x;`).
  | (JSStatementCommon & { type: 'declareVar'; name: string })
  | (JSStatementCommon & { type: 'assign'; name: string; value: JSExpr })
  | (JSStatementCommon & {
      type: 'if'
      cond: JSExpr
      then: JSStatement[]
      // Ramos "senão se" (cada um com condição + corpo); estilo MakeCode Arcade.
      elseif?: Array<{ cond: JSExpr; then: JSStatement[] }>
      else?: JSStatement[]
    })
  | (JSStatementCommon & { type: 'repeat'; times: JSExpr; body: JSStatement[] })
  // Laço com condição (`while (cond) { … }`).
  | (JSStatementCommon & { type: 'while'; cond: JSExpr; body: JSStatement[] })
  // Laço que executa ao menos uma vez (`do { … } while (cond)`).
  | (JSStatementCommon & { type: 'doWhile'; cond: JSExpr; body: JSStatement[] })
  // Sai do laço atual (`break;`).
  | (JSStatementCommon & { type: 'break' })
  // Pula para a próxima volta do laço (`continue;`).
  | (JSStatementCommon & { type: 'continue' })
  // `import * as NOME from 'modulo'` — importa uma biblioteca inteira sob um nome
  // (ex.: `import * as THREE from 'three'`). O gerador eleva ao TOPO do arquivo.
  | (JSStatementCommon & { type: 'importStar'; name: string; module: string })
  // Import nomeado (`import { GLTFLoader } from 'three/addons/…'`), sem alias.
  // Também elevado ao topo. `names` = os identificadores importados.
  | (JSStatementCommon & { type: 'importNamed'; names: string[]; module: string })
  // Itera os itens de uma lista (`for (const item of lista) { … }`). Distinto de
  // `forEach` (sem índice) — preserva a escolha do aluno no round-trip.
  | (JSStatementCommon & {
      type: 'forOf'
      itemName: string
      iterableVar: string
      body: JSStatement[]
    })
  // `for` clássico de contagem (`for (let i = de; i < ate; i += passo) { … }`).
  // `op` sempre `<`; o `repeat` (de 0, passo 1) tem match exato e tem prioridade.
  | (JSStatementCommon & {
      type: 'forRange'
      varName: string
      from: JSExpr
      to: JSExpr
      step: JSExpr
      body: JSStatement[]
    })
  // try/catch/finally. `errorName` ausente = `catch { … }` (sem binding). O
  // `finalizer` ausente = sem bloco `finally`.
  | (JSStatementCommon & {
      type: 'tryCatch'
      body: JSStatement[]
      errorName?: string
      handler: JSStatement[]
      finalizer?: JSStatement[]
    })
  // Busca JSON de uma URL via `fetch(url).then(r => r.json()).then((dados)=>{…})`
  // com `.catch((erro)=>{…})` opcional. `okName`/`catchName` = variáveis dos dados
  // e do erro; o `catchBody` ausente = sem `.catch`.
  | (JSStatementCommon & {
      type: 'fetchJson'
      url: JSExpr
      okName: string
      body: JSStatement[]
      catchName?: string
      catchBody?: JSStatement[]
    })
  | (JSStatementCommon & {
      type: 'event'
      target: string
      /**
       * 'var': `target` é o nome de uma variável que guarda o elemento.
       * 'document': escuta global no documento (clique em qualquer lugar). Senão é um id.
       */
      targetKind?: 'id' | 'var' | 'document' | 'window'
      event: EventKind
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'consoleLog'; value: JSExpr })
  | (JSStatementCommon & { type: 'alert'; value: JSExpr })
  | (JSStatementCommon & { type: 'setText'; targetId: string; value: JSExpr })
  | (JSStatementCommon & {
      type: 'setProperty'
      targetId: string
      /** Quando 'var', `targetId` é o nome de uma variável que guarda o elemento; senão é um id. */
      targetKind?: 'id' | 'var'
      property: 'textContent' | 'value' | 'innerHTML'
      value: JSExpr
    })
  | (JSStatementCommon & {
      type: 'getProperty'
      targetId: string
      /** Quando 'var', `targetId` é o nome de uma variável que guarda o elemento; senão é um id. */
      targetKind?: 'id' | 'var'
      property: 'textContent' | 'value' | 'innerHTML'
      varName: string
    })
  // Estilo inline por código (`el.style.left = valor` / `el.style['z-index'] = valor`).
  | (JSStatementCommon & {
      type: 'setStyle'
      targetId: string
      targetKind?: 'id' | 'var' | 'this'
      property: string
      value: JSExpr
    })
  // Atributo por código (`el.setAttribute('stroke', valor)`).
  | (JSStatementCommon & {
      type: 'setAttribute'
      targetId: string
      targetKind?: 'id' | 'var' | 'this'
      name: string
      value: JSExpr
    })
  // Cria um elemento e guarda numa variável (`const x = document.createElement('div')`).
  | (JSStatementCommon & { type: 'createElement'; tag: string; varName: string })
  // Cria uma FORMA SVG por código (`const x = document.createElementNS(SVG_NS, 'circle')`).
  | (JSStatementCommon & { type: 'createElementNS'; tag: string; varName: string })
  // Lê um atributo de um elemento e guarda numa variável (`const v = el.getAttribute('cx')`).
  | (JSStatementCommon & {
      type: 'getAttribute'
      targetId: string
      targetKind?: 'id' | 'var'
      name: string
      varName: string
    })
  // Adiciona um elemento dentro de outro (`pai.appendChild(filho)`).
  | (JSStatementCommon & { type: 'appendChild'; parentVar: string; childVar: string })
  // Dispara um erro (`throw new Error(<mensagem>)`) — fim de jogo via try/catch.
  | (JSStatementCommon & { type: 'throwError'; message: JSExpr })
  // Copia as propriedades de um objeto para outro (`Object.assign(alvo, origem)`).
  | (JSStatementCommon & { type: 'objectAssign'; targetVar: string; sourceVar: string })
  // Escolha (`switch (subject) { case <match>: <body> break; … default: <default> }`).
  | (JSStatementCommon & {
      type: 'switch'
      subject: JSExpr
      cases: Array<{ __id?: string; match: JSExpr; body: JSStatement[] }>
      default?: JSStatement[]
    })
  // Tela cheia (Fullscreen API) na PÁGINA inteira (document.documentElement).
  // Entrar/sair/alternar — sem campos (o alvo é fixo = a página).
  | (JSStatementCommon & { type: 'requestFullscreen' })
  | (JSStatementCommon & { type: 'exitFullscreen' })
  | (JSStatementCommon & { type: 'toggleFullscreen' })
  // Escreve um data-attribute (`el.dataset.chave = valor`).
  | (JSStatementCommon & {
      type: 'setDataset'
      targetId: string
      targetKind?: 'id' | 'var'
      key: string
      value: JSExpr
    })
  | (JSStatementCommon & { type: 'querySelector'; selector: string; varName: string })
  // Seleciona TODOS os elementos que casam (`document.querySelectorAll('sel')`).
  // O resultado (NodeList) é iterável com `forEach`.
  | (JSStatementCommon & { type: 'querySelectorAll'; selector: string; varName: string })
  | (JSStatementCommon & { type: 'getElementById'; id: string; varName: string })
  // Salva um valor no armazenamento do navegador
  // (`localStorage.setItem(chave, valor)` / `sessionStorage`).
  | (JSStatementCommon & {
      type: 'storageSet'
      store: 'local' | 'session'
      key: JSExpr
      value: JSExpr
    })
  // Dentro de um handler de evento: `event.preventDefault()` / `event.stopPropagation()`.
  | (JSStatementCommon & { type: 'eventMethod'; method: 'preventDefault' | 'stopPropagation' })
  | (JSStatementCommon & {
      type: 'classOp'
      targetId: string
      /** 'var': variável; 'this': o elemento atual (this); senão um id. */
      targetKind?: 'id' | 'var' | 'this'
      op: 'add' | 'remove' | 'toggle'
      className: string
    })
  // Canvas
  | (JSStatementCommon & { type: 'canvasSetup'; canvasId: string; varName: string })
  | (JSStatementCommon & { type: 'canvasSetSize'; ctxVar: string; w: JSExpr; h: JSExpr })
  | (JSStatementCommon & {
      type: 'canvasClear'
      ctxVar: string
      /** @deprecated O elemento é resolvido pelo ctxVar; mantido só ao ler IR antiga. */
      canvasVar?: string
    })
  | (JSStatementCommon & { type: 'canvasFillStyle'; ctxVar: string; color: JSExpr })
  | (JSStatementCommon & {
      type: 'canvasFillRect'
      ctxVar: string
      x: JSExpr
      y: JSExpr
      w: JSExpr
      h: JSExpr
    })
  | (JSStatementCommon & { type: 'canvasArc'; ctxVar: string; x: JSExpr; y: JSExpr; r: JSExpr })
  | (JSStatementCommon & {
      type: 'canvasFillText'
      ctxVar: string
      text: JSExpr
      x: JSExpr
      y: JSExpr
    })
  | (JSStatementCommon & {
      type: 'canvasStrokeRect'
      ctxVar: string
      x: JSExpr
      y: JSExpr
      w: JSExpr
      h: JSExpr
    })
  | (JSStatementCommon & {
      type: 'canvasClearRect'
      ctxVar: string
      x: JSExpr
      y: JSExpr
      w: JSExpr
      h: JSExpr
    })
  | (JSStatementCommon & {
      type: 'canvasRoundRect'
      ctxVar: string
      x: JSExpr
      y: JSExpr
      w: JSExpr
      h: JSExpr
      r: JSExpr
    })
  | (JSStatementCommon & {
      type: 'canvasEllipse'
      ctxVar: string
      x: JSExpr
      y: JSExpr
      rx: JSExpr
      ry: JSExpr
    })
  | (JSStatementCommon & {
      type: 'canvasArcSlice'
      ctxVar: string
      x: JSExpr
      y: JSExpr
      r: JSExpr
      start: JSExpr
      end: JSExpr
    })
  | (JSStatementCommon & {
      type: 'canvasQuadraticCurve'
      ctxVar: string
      cpx: JSExpr
      cpy: JSExpr
      x: JSExpr
      y: JSExpr
    })
  // ctx.arcTo(x1, y1, x2, y2, r) — liga o ponto atual a (x2,y2) com canto arredondado.
  | (JSStatementCommon & {
      type: 'canvasArcTo'
      ctxVar: string
      x1: JSExpr
      y1: JSExpr
      x2: JSExpr
      y2: JSExpr
      r: JSExpr
    })
  | (JSStatementCommon & {
      type: 'canvasBezierCurve'
      ctxVar: string
      cp1x: JSExpr
      cp1y: JSExpr
      cp2x: JSExpr
      cp2y: JSExpr
      x: JSExpr
      y: JSExpr
    })
  | (JSStatementCommon & { type: 'canvasShadow'; ctxVar: string; color: JSExpr; blur: JSExpr })
  | (JSStatementCommon & {
      type: 'canvasStrokeText'
      ctxVar: string
      text: JSExpr
      x: JSExpr
      y: JSExpr
    })
  | (JSStatementCommon & { type: 'canvasLineDash'; ctxVar: string; segment: JSExpr })
  | (JSStatementCommon & {
      type: 'animationLoop'
      body: JSStatement[]
      handle?: string
      // Variáveis opcionais expostas pelo mutator: o tempo do quadro (ms desde o
      // carregamento, vindo do requestAnimationFrame) e o tempo desde o quadro
      // anterior (delta, ms) — para movimento independente de FPS.
      timeVar?: string
      deltaVar?: string
    })
  // Para o loop de animação: cancelAnimationFrame(handle).
  | (JSStatementCommon & { type: 'cancelAnimationFrame'; handle: JSExpr })
  | (JSStatementCommon & { type: 'keyboardSimple'; varName: string })
  // Adiciona um item ao fim de uma lista (arr.push(value)).
  | (JSStatementCommon & { type: 'arrayPush'; arrayVar: string; value: JSExpr })
  // Remove o último (pop) ou o primeiro (shift) item de uma lista.
  | (JSStatementCommon & { type: 'arrayRemove'; arrayVar: string; end: 'pop' | 'shift' })
  // Remove `count` itens de uma lista a partir de `start` (arr.splice(start, count)).
  | (JSStatementCommon & {
      type: 'arraySplice'
      arrayVar: string
      start: JSExpr
      count: JSExpr
    })
  // Canvas extras
  | (JSStatementCommon & {
      type: 'canvasDrawImage'
      ctxVar: string
      src: string
      x: JSExpr
      y: JSExpr
      w: JSExpr
      h: JSExpr
    })
  | (JSStatementCommon & { type: 'canvasSave'; ctxVar: string })
  | (JSStatementCommon & { type: 'canvasRestore'; ctxVar: string })
  | (JSStatementCommon & {
      type: 'canvasTranslate'
      ctxVar: string
      x: JSExpr
      y: JSExpr
    })
  | (JSStatementCommon & { type: 'canvasRotate'; ctxVar: string; angle: JSExpr })
  | (JSStatementCommon & {
      type: 'canvasScale'
      ctxVar: string
      sx: JSExpr
      sy: JSExpr
    })
  | (JSStatementCommon & {
      type: 'canvasGradient'
      ctxVar: string
      varName: string
      x0: JSExpr
      y0: JSExpr
      x1: JSExpr
      y1: JSExpr
      stops: Array<{ offset: number; color: string }>
    })
  // Canvas — traçado/contorno, fonte e transparência (caminho "na mão", v0.6.0).
  | (JSStatementCommon & { type: 'canvasBeginPath'; ctxVar: string })
  | (JSStatementCommon & { type: 'canvasClosePath'; ctxVar: string })
  | (JSStatementCommon & { type: 'canvasStroke'; ctxVar: string })
  | (JSStatementCommon & { type: 'canvasFill'; ctxVar: string })
  | (JSStatementCommon & { type: 'canvasMoveTo'; ctxVar: string; x: JSExpr; y: JSExpr })
  | (JSStatementCommon & { type: 'canvasLineTo'; ctxVar: string; x: JSExpr; y: JSExpr })
  // Canvas — adicionar retângulo ao traçado e recortar o desenho pelo traçado.
  | (JSStatementCommon & {
      type: 'canvasRect'
      ctxVar: string
      x: JSExpr
      y: JSExpr
      w: JSExpr
      h: JSExpr
    })
  | (JSStatementCommon & { type: 'canvasClip'; ctxVar: string })
  | (JSStatementCommon & { type: 'canvasStrokeStyle'; ctxVar: string; color: JSExpr })
  | (JSStatementCommon & { type: 'canvasLineWidth'; ctxVar: string; width: JSExpr })
  | (JSStatementCommon & { type: 'canvasGlobalAlpha'; ctxVar: string; alpha: JSExpr })
  | (JSStatementCommon & {
      type: 'canvasFont'
      ctxVar: string
      weight?: 'bold' | 'italic' | 'italic bold'
      size: number
      family: string
    })
  | (JSStatementCommon & {
      type: 'canvasTextAlign'
      ctxVar: string
      align: 'left' | 'center' | 'right'
    })
  | (JSStatementCommon & {
      type: 'canvasTextBaseline'
      ctxVar: string
      baseline: 'top' | 'middle' | 'bottom' | 'alphabetic'
    })
  // Game 2D extension
  | (JSStatementCommon & {
      type: 'g2d:createSprite'
      varName: string
      x: number | JSExpr
      y: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
      color: string
    })
  | (JSStatementCommon & { type: 'g2d:drawSprite'; spriteVar: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:setPosition'; spriteVar: string; x: JSExpr; y: JSExpr })
  | (JSStatementCommon & { type: 'g2d:setVelocity'; spriteVar: string; vx: JSExpr; vy: JSExpr })
  | (JSStatementCommon & { type: 'g2d:collides'; aVar: string; bVar: string; varName: string })
  | (JSStatementCommon & { type: 'g2d:score'; varName: string; initial: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:gameOver'; ctxVar: string; text: ScreenText })
  // Palco implícito: limpa a tela do runtime (sem o aluno carregar o "pincel").
  | (JSStatementCommon & { type: 'g2d:clear' })
  // Ciclo de vida didático. O início é o contêiner raiz de uma partida; os
  // demais eventos compartilham o escopo criado dentro dele.
  | (JSStatementCommon & { type: 'g2d:onStart'; body: JSStatement[] })
  // Eventos "Quando…" (hats): tecla apertada e sobreposição de sprites.
  | (JSStatementCommon & { type: 'g2d:onKey'; key: string; body: JSStatement[] })
  | (JSStatementCommon & {
      type: 'g2d:onOverlap'
      aVar: string
      bVar: string
      body: JSStatement[]
    })
  // "Quando o sprite pular" (o motor avisa) e "qualquer tecla ou toque".
  | (JSStatementCommon & { type: 'g2d:onJump'; spriteVar: string; body: JSStatement[] })
  | (JSStatementCommon & { type: 'g2d:onAnyInput'; body: JSStatement[] })
  | (JSStatementCommon & { type: 'g2d:updateEachFrame'; body: JSStatement[] })
  // Física: gravidade do mundo, integração de velocidade, ricochete nas bordas,
  // colisão por círculo.
  | (JSStatementCommon & { type: 'g2d:setGravity'; value: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:applyVelocity'; spriteVar: string })
  | (JSStatementCommon & { type: 'g2d:applyGravity'; spriteVar: string })
  | (JSStatementCommon & { type: 'g2d:bounceOnEdges'; spriteVar: string; ctxVar: string })
  | (JSStatementCommon & {
      type: 'g2d:circleCollides'
      aVar: string
      bVar: string
      varName: string
    })
  // Áudio: toca um tom (Web Audio, sem assets).
  | (JSStatementCommon & {
      type: 'g2d:playSound'
      freq: number | JSExpr
      durationMs: number | JSExpr
    })
  // Áudio: efeito sonoro pronto (sintetizado), escolhido por nome.
  | (JSStatementCommon & { type: 'g2d:playFx'; fx: string })
  // Áudio: música de fundo em loop (sintetizada), escolhida por nome.
  | (JSStatementCommon & { type: 'g2d:playMusic'; tune: string })
  // Áudio: para a música de fundo.
  | (JSStatementCommon & { type: 'g2d:stopMusic' })
  // Áudio: toca uma nota musical (dó ré mi…) por uma duração em ms.
  | (JSStatementCommon & { type: 'g2d:playNote'; note: string; ms: number | JSExpr })
  // Tier 1 — mira/movimento, vida, aparência, mundo e pausa (comandos).
  | (JSStatementCommon & { type: 'g2d:aimAt'; spriteVar: string; targetVar: string })
  | (JSStatementCommon & {
      type: 'g2d:moveToward'
      spriteVar: string
      targetVar: string
      speed: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:setHealth'; spriteVar: string; amount: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:changeHealth'; spriteVar: string; delta: number | JSExpr })
  | (JSStatementCommon & {
      type: 'g2d:damageSprite'
      spriteVar: string
      amount: number | JSExpr
      invincibilityFrames: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:flipSprite'; spriteVar: string; dir: string })
  | (JSStatementCommon & { type: 'g2d:setOpacity'; spriteVar: string; percent: number | JSExpr })
  | (JSStatementCommon & {
      type: 'g2d:setSize'
      spriteVar: string
      w: number | JSExpr
      h: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:scaleSprite'; spriteVar: string; factor: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:wrapEdges'; spriteVar: string })
  | (JSStatementCommon & { type: 'g2d:pruneOld'; groupVar: string; seconds: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:pauseGame' })
  | (JSStatementCommon & { type: 'g2d:resumeGame' })
  // Tier 2 — câmera, mapa destrutível, ordem de desenho e depuração (comandos).
  | (JSStatementCommon & {
      type: 'g2d:cameraFollow'
      spriteVar: string
      worldW: number | JSExpr
      worldH: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:setCamera'; x: number | JSExpr; y: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:breakTile'; mapVar: string; spriteVar: string })
  | (JSStatementCommon & {
      type: 'g2d:setTile'
      mapVar: string
      index: number | JSExpr
      spriteVar: string
    })
  | (JSStatementCommon & { type: 'g2d:bringToFront'; spriteVar: string; groupVar: string })
  | (JSStatementCommon & { type: 'g2d:sendToBack'; spriteVar: string; groupVar: string })
  | (JSStatementCommon & { type: 'g2d:drawHitbox'; spriteVar: string })
  | (JSStatementCommon & { type: 'g2d:showFps'; x: number | JSExpr; y: number | JSExpr })
  // Entrada de mouse/toque: corpo recebe a posição do ponteiro em xName/yName.
  | (JSStatementCommon & {
      type: 'g2d:onPointer'
      xName: string
      yName: string
      body: JSStatement[]
    })
  // Imagens / spritesheet / animação (v0.3.0). `image`/`sheetVar` são nomes de
  // asset/variável (strings); coords e quadros são números (mantém os blocos e o
  // round-trip simples). O runtime resolve o nome do asset no manifesto.
  | (JSStatementCommon & {
      type: 'g2d:createImageSprite'
      varName: string
      x: number | JSExpr
      y: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
      image: string
    })
  | (JSStatementCommon & { type: 'g2d:setImage'; spriteVar: string; image: string })
  // Figuras: sprite desenhado por código (v0.23.0). A figura é um corpo de
  // desenho nomeado; os paint_* têm ctxVar fixo (o param 'ctx' da figura).
  | (JSStatementCommon & { type: 'g2d:defineShape'; shapeName: string; body: JSStatement[] })
  | (JSStatementCommon & {
      type: 'g2d:createShapeSprite'
      varName: string
      shapeName: string
      x: number | JSExpr
      y: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:setShape'; spriteVar: string; shapeName: string })
  | (JSStatementCommon & {
      type: 'g2d:paintRect'
      ctxVar: string
      x: number | JSExpr
      y: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
      color: string
    })
  | (JSStatementCommon & {
      type: 'g2d:paintCircle'
      ctxVar: string
      x: number | JSExpr
      y: number | JSExpr
      r: number | JSExpr
      color: string
    })
  | (JSStatementCommon & {
      type: 'g2d:paintEllipse'
      ctxVar: string
      x: number | JSExpr
      y: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
      color: string
    })
  | (JSStatementCommon & {
      type: 'g2d:paintTriangle'
      ctxVar: string
      x1: number | JSExpr
      y1: number | JSExpr
      x2: number | JSExpr
      y2: number | JSExpr
      x3: number | JSExpr
      y3: number | JSExpr
      color: string
    })
  | (JSStatementCommon & {
      type: 'g2d:paintLine'
      ctxVar: string
      x1: number | JSExpr
      y1: number | JSExpr
      x2: number | JSExpr
      y2: number | JSExpr
      color: string
      width: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:loadSpritesheet'
      varName: string
      image: string
      frameW: number | JSExpr
      frameH: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:animateSprite'
      spriteVar: string
      sheetVar: string
      from: number | JSExpr
      to: number | JSExpr
      fps: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:setStateAnim'
      spriteVar: string
      state: string
      sheetVar: string
      from: number | JSExpr
      to: number | JSExpr
      fps: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:autoAnimate'; spriteVar: string })
  | (JSStatementCommon & {
      type: 'g2d:defineEnemyType'
      varName: string
      behavior: string
      color: string
      image: string
      /** Figura desenhada (defineShape) como visual do tipo — ausente = imagem/cor. */
      shape?: string
      hp: number | JSExpr
      speed: number | JSExpr
      dmg: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:enemyStateAnim'
      typeVar: string
      state: string
      sheetVar: string
      from: number | JSExpr
      to: number | JSExpr
      fps: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:setEnemyTypeParam'
      typeVar: string
      param: string
      value: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:spawnEnemy'
      typeVar: string
      x: number | JSExpr
      y: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:updateEnemyType'
      typeVar: string
      ctxVar: string
      targetVar: string
    })
  | (JSStatementCommon & { type: 'g2d:drawEnemyType'; ctxVar: string; typeVar: string })
  | (JSStatementCommon & {
      type: 'g2d:onEnemyDefeated'
      typeVar: string
      itemName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & {
      type: 'g2d:onEnemyShotHit'
      spriteVar: string
      typeVar: string
      itemName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'g2d:hurtByEnemy'; spriteVar: string; enemyVar: string })
  | (JSStatementCommon & {
      type: 'g2d:drawFrame'
      sheetVar: string
      ctxVar: string
      index: number | JSExpr
      x: number | JSExpr
      y: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
    })
  // Movimento + efeitos (v0.4.0).
  | (JSStatementCommon & {
      type: 'g2d:platformer'
      spriteVar: string
      ctxVar: string
      speed: number | JSExpr
      jump: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:topDown'; spriteVar: string; speed: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:flyFree'; spriteVar: string; speed: number | JSExpr })
  | (JSStatementCommon & {
      type: 'g2d:flap'
      spriteVar: string
      ctxVar: string
      force: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:swim'; spriteVar: string; speed: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:followPointer'; spriteVar: string; speed: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:clampToScreen'; spriteVar: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:flash'; color: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:shake'; ctxVar: string; intensity: number | JSExpr })
  | (JSStatementCommon & {
      type: 'g2d:emitParticles'
      count: number | JSExpr
      color: string
      x: number | JSExpr
      y: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:drawParticles'; ctxVar: string })
  // Tiles / tilemaps (v0.5.0). image = nome do asset do tileset (string); grid e
  // solid são texto editável (linhas/índices); tile/x/y são números.
  | (JSStatementCommon & {
      type: 'g2d:createTileMap'
      varName: string
      image: string
      tile: number | JSExpr
      solid: string
      /** Índices de tile PLATAFORMA (one-way). Opcional — omitido quando vazio. */
      platform?: string
      grid: string
    })
  // Mapa PRONTO do Pinta/fatiador: tudo (grade/peças/sólidos) vem do metadado
  // do asset em runtime (__SZGAME_ASSET_META) — o bloco só aponta o desenho.
  | (JSStatementCommon & { type: 'g2d:createTileMapFromAsset'; varName: string; image: string })
  | (JSStatementCommon & {
      type: 'g2d:drawTileMap'
      mapVar: string
      ctxVar: string
      x: number | JSExpr
      y: number | JSExpr
      // Tamanho do tile NA TELA (px); 0/ausente = encaixar sozinho no canvas.
      // Opcional para aceitar IR salvo antes do campo existir.
      size?: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:tileMapCollide'; spriteVar: string; mapVar: string })
  | (JSStatementCommon & { type: 'g2d:collideGroup'; spriteVar: string; groupVar: string })
  // Colisão sólida contra UM sprite só (uma parede/plataforma solta).
  | (JSStatementCommon & { type: 'g2d:collideSprite'; spriteVar: string; otherVar: string })
  // Grupos de sprites (v0.6.0): MUITOS sprites (tiros, inimigos, estrelas). Um
  // grupo é uma lista gerenciada de sprites. x/y/vx/vy são expressões (aceitam
  // aleatório/contas); w/h números; color/image strings (nomes de asset).
  | (JSStatementCommon & { type: 'g2d:createGroup'; varName: string })
  // `varName` OPCIONAL: nomear o sprite criado dá uma alça para os statements
  // seguintes (animar, dar vida…) — o helper `spawn` do runtime já DEVOLVE o
  // sprite. Ausente = saída idêntica à de antes do campo existir.
  | (JSStatementCommon & {
      type: 'g2d:spawnInGroup'
      groupVar: string
      varName?: string
      x: JSExpr
      y: JSExpr
      w: number | JSExpr
      h: number | JSExpr
      color: string
      vx: JSExpr
      vy: JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:spawnImageInGroup'
      groupVar: string
      varName?: string
      x: JSExpr
      y: JSExpr
      w: number | JSExpr
      h: number | JSExpr
      image: string
      vx: JSExpr
      vy: JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:updateGroup'; groupVar: string })
  // Acelera explicitamente todos os sprites atuais do grupo pela gravidade do mundo.
  | (JSStatementCommon & { type: 'g2d:applyGravityToGroup'; groupVar: string })
  | (JSStatementCommon & { type: 'g2d:drawGroup'; groupVar: string; ctxVar: string })
  // Desenho com profundidade top-down: ordena a CÓPIA do grupo pela base (y+h).
  | (JSStatementCommon & { type: 'g2d:drawGroupByY'; groupVar: string; ctxVar: string })
  | (JSStatementCommon & {
      type: 'g2d:forEachInGroup'
      groupVar: string
      itemName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'g2d:clearGroup'; groupVar: string })
  | (JSStatementCommon & {
      type: 'g2d:pruneOffscreen'
      groupVar: string
      ctxVar: string
      itemName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & {
      type: 'g2d:onGroupOverlap'
      aGroup: string
      aName: string
      bGroup: string
      bName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'g2d:addToGroup'; spriteVar: string; groupVar: string })
  | (JSStatementCommon & { type: 'g2d:removeFromGroup'; spriteVar: string; groupVar: string })
  // Temporizadores: "a cada N quadros/segundos" — vira if (SZGame2D.everyX(...)).
  | (JSStatementCommon & { type: 'g2d:everyFrames'; n: JSExpr; body: JSStatement[] })
  | (JSStatementCommon & {
      type: 'g2d:everySeconds'
      seconds: number | JSExpr
      body: JSStatement[]
    })
  // Temporizador one-shot: "depois de N segundos, fazer" — roda UMA vez por partida.
  | (JSStatementCommon & {
      type: 'g2d:afterSeconds'
      seconds: number | JSExpr
      body: JSStatement[]
    })
  // Colisão perdoadora: fator da hitbox (percentual do tamanho, centrado).
  | (JSStatementCommon & {
      type: 'g2d:setHitboxScale'
      spriteVar: string
      percent: number | JSExpr
    })
  // HUD no canvas (v0.6.0): placar, texto, vidas (corações) e barra.
  | (JSStatementCommon & {
      type: 'g2d:drawScore'
      ctxVar: string
      label: string
      value: JSExpr
      x: number | JSExpr
      y: number | JSExpr
      color: string
      size: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:drawLabel'
      ctxVar: string
      text: string
      x: number | JSExpr
      y: number | JSExpr
      color: string
      size: number | JSExpr
      align: 'left' | 'center' | 'right'
    })
  | (JSStatementCommon & {
      type: 'g2d:drawHearts'
      ctxVar: string
      count: JSExpr
      x: number | JSExpr
      y: number | JSExpr
      size: number | JSExpr
      color: string
    })
  | (JSStatementCommon & {
      type: 'g2d:drawSpriteHealth'
      ctxVar: string
      spriteVar: string
      style: 'hearts' | 'bar'
      x: number | JSExpr
      y: number | JSExpr
      size: number | JSExpr
      color: string
    })
  | (JSStatementCommon & {
      type: 'g2d:drawBar'
      ctxVar: string
      value: JSExpr
      max: JSExpr
      x: number | JSExpr
      y: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
      color: string
    })
  // Estado/telas (cenas): trocar de tela, overlay de tela cheia e reiniciar.
  | (JSStatementCommon & { type: 'g2d:setStageDescription'; description: string })
  | (JSStatementCommon & { type: 'g2d:setScene'; name: string })
  | (JSStatementCommon & {
      type: 'g2d:showScreen'
      ctxVar: string
      title: ScreenText
      subtitle: ScreenText
      hint: ScreenText
      bg: string
    })
  | (JSStatementCommon & { type: 'g2d:restart' })
  // Tela: faz o canvas preencher ~percent% da janela (mantendo a proporção).
  | (JSStatementCommon & { type: 'g2d:fitScreen'; percent: number | JSExpr })
  // Moldura no elemento do canvas (enxergar a área do palco ao ensinar).
  | (JSStatementCommon & { type: 'g2d:stageBorder'; color: string; width: number | JSExpr })
  // Cenário: o desenho da criança cobrindo o palco. O FIXO é repintado a cada
  // clear(); o POR QUADRO desenha no ponto em que a criança pôs o bloco.
  | (JSStatementCommon & { type: 'g2d:setBackdrop'; image: string })
  | (JSStatementCommon & { type: 'g2d:drawBackdrop'; ctxVar: string; image: string })
  // Atalho de início: prepara o palco (tamanho do mundo) em tela cheia responsiva.
  | (JSStatementCommon & {
      type: 'g2d:setupStage'
      width: number | JSExpr
      height: number | JSExpr
      bg: string
    })
  // "Ocupar a tela toda": palco SEM dimensões — a resolução acompanha a viewport.
  | (JSStatementCommon & { type: 'g2d:setupFull'; bg: string })
  // Tiro redondo com brilho num grupo; mover com setas; piscar (invencibilidade).
  | (JSStatementCommon & {
      type: 'g2d:spawnBullet'
      groupVar: string
      x: JSExpr
      y: JSExpr
      radius: number | JSExpr
      color: string
      vx: JSExpr
      vy: JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:arrowsX'; spriteVar: string; speed: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:blinkSprite'; spriteVar: string; frames: number | JSExpr })
  // Cenário: fundo de estrelas rolando; arrastar a nave com o dedo (eixo X).
  | (JSStatementCommon & { type: 'g2d:starfield'; ctxVar: string; speed: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:dragX'; spriteVar: string })
  // Kit "Nave & Asteroides" (v0.7.0): desenhos prontos + efeitos + colisão sprite×grupo.
  | (JSStatementCommon & {
      type: 'g2d:createShip'
      varName: string
      x: number | JSExpr
      y: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
      bodyColor: string
      wingColor: string
    })
  | (JSStatementCommon & {
      type: 'g2d:spawnAsteroid'
      groupVar: string
      x: JSExpr
      y: JSExpr
      size: number | JSExpr
      color: string
      vx: JSExpr
      vy: JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:explode'; spriteVar: string; color: string })
  | (JSStatementCommon & { type: 'g2d:playShoot' })
  | (JSStatementCommon & { type: 'g2d:playExplosion' })
  | (JSStatementCommon & {
      type: 'g2d:onSpriteGroupOverlap'
      spriteVar: string
      groupVar: string
      itemName: string
      body: JSStatement[]
    })
  // ---- Nave clássica: girar + impulsionar na direção apontada (v0.10.0) ----
  | (JSStatementCommon & {
      type: 'g2d:steerThrust'
      spriteVar: string
      speed: number | JSExpr
      turn: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:rotateSprite'; spriteVar: string; deg: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:pointSprite'; spriteVar: string; deg: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:thrust'; spriteVar: string; force: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:applyFriction'; spriteVar: string; factor: number | JSExpr })
  | (JSStatementCommon & {
      type: 'g2d:shootFrom'
      spriteVar: string
      groupVar: string
      speed: number | JSExpr
      color: string
    })
  | (JSStatementCommon & {
      type: 'g2d:spawnAsteroidEdge'
      groupVar: string
      size: number | JSExpr
      color: string
      speed: number | JSExpr
    })
  // ---- Pulo genérico + Kit dino (v0.9.0) ----
  | (JSStatementCommon & {
      type: 'g2d:jumpOnGround'
      spriteVar: string
      ctxVar: string
      jump: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:createDino'
      varName: string
      x: number | JSExpr
      y: number | JSExpr
      size: number | JSExpr
      color: string
    })
  // Game 2D — Kits Equilibrista/Balão v2 (v0.42.0): o personagem é um SPRITE
  // e as regras moram no "caminho" (a criança monta o loop e o placar).
  | (JSStatementCommon & {
      type: 'g2d:createStickHero'
      varName: string
      w: number | JSExpr
      h: number | JSExpr
      color: string
    })
  | (JSStatementCommon & {
      type: 'g2d:createStickPath'
      varName: string
      ctxVar: string
      platformColor: string
      stickColor: string
    })
  | (JSStatementCommon & { type: 'g2d:stickPathScenery'; pathVar: string })
  | (JSStatementCommon & { type: 'g2d:stickPathGrow'; pathVar: string; speed: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:stickPathDrop'; pathVar: string })
  | (JSStatementCommon & {
      type: 'g2d:stickPathWalk'
      spriteVar: string
      pathVar: string
      speed: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:stickPathDraw'; pathVar: string })
  | (JSStatementCommon & { type: 'g2d:onStickPathCross'; pathVar: string; body: JSStatement[] })
  | (JSStatementCommon & { type: 'g2d:onStickPathPerfect'; pathVar: string; body: JSStatement[] })
  | (JSStatementCommon & {
      type: 'g2d:createBalloon'
      varName: string
      x: number | JSExpr
      y: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
      color: string
      basketColor: string
    })
  | (JSStatementCommon & { type: 'g2d:createBalloonPath'; varName: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:balloonPathScenery'; pathVar: string })
  | (JSStatementCommon & { type: 'g2d:balloonFire'; spriteVar: string; force: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:balloonFly'; spriteVar: string })
  | (JSStatementCommon & {
      type: 'g2d:balloonPathScroll'
      pathVar: string
      spriteVar: string
      speed: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:onBalloonPathTreeHit'
      pathVar: string
      body: JSStatement[]
    })
  | (JSStatementCommon & {
      type: 'g2d:controlDino'
      spriteVar: string
      ctxVar: string
      jump: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:spawnObstacle'
      groupVar: string
      ctxVar: string
      shape: string
      x: JSExpr
      size: number | JSExpr
      vx: JSExpr
    })
  | (JSStatementCommon & {
      type: 'g2d:spawnEgg'
      groupVar: string
      x: JSExpr
      y: JSExpr
      vx: JSExpr
    })
  | (JSStatementCommon & { type: 'g2d:forest'; ctxVar: string; speed: number | JSExpr })
  | (JSStatementCommon & { type: 'g2d:playJump' })
  | (JSStatementCommon & { type: 'g2d:playDinoHurt' })
  | (JSStatementCommon & { type: 'g2d:playCollect' })
  // ---- Kit gorilas: batalha de bananas (artilharia) ----
  | (JSStatementCommon & { type: 'g2d:createCity'; varName: string })
  | (JSStatementCommon & { type: 'g2d:drawCity'; cityVar: string; ctxVar: string })
  | (JSStatementCommon & {
      type: 'g2d:placeThrower'
      varName: string
      cityVar: string
      side: 'left' | 'right'
      color: string
    })
  | (JSStatementCommon & { type: 'g2d:newWind'; cityVar: string })
  | (JSStatementCommon & { type: 'g2d:drawWind'; cityVar: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:aimDrag'; throwerVar: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:throwBanana'; throwerVar: string; cityVar: string })
  | (JSStatementCommon & { type: 'g2d:updateBanana'; cityVar: string })
  | (JSStatementCommon & { type: 'g2d:drawBanana'; cityVar: string; ctxVar: string })
  | (JSStatementCommon & { type: 'g2d:playWhistle' })
  | (JSStatementCommon & { type: 'g2d:playBoom' })
  | (JSStatementCommon & {
      type: 'g2d:computerTurn'
      throwerVar: string
      cityVar: string
      enemyVar: string
    })
  | (JSStatementCommon & { type: 'g2d:drawAimReadout'; ctxVar: string })
  // ---- Game 3D (extensão game-3d, Three.js via window.SZGame3D) ----
  | (JSStatementCommon & { type: 'g3d:createScene'; canvasId: string; varName: string })
  | (JSStatementCommon & { type: 'g3d:createFullscreenScene'; varName: string; bg: string })
  | (JSStatementCommon & { type: 'g3d:setBackground'; worldVar: string; color: string })
  | (JSStatementCommon & {
      type: 'g3d:setCameraPosition'
      worldVar: string
      x: JSExpr
      y: JSExpr
      z: JSExpr
    })
  | (JSStatementCommon & {
      type: 'g3d:createBox'
      varName: string
      worldVar: string
      size: number | JSExpr
      color: string
    })
  | (JSStatementCommon & {
      type: 'g3d:createSphere'
      varName: string
      worldVar: string
      radius: number | JSExpr
      color: string
    })
  | (JSStatementCommon & {
      type: 'g3d:setPosition'
      objVar: string
      x: JSExpr
      y: JSExpr
      z: JSExpr
    })
  | (JSStatementCommon & {
      type: 'g3d:setRotation'
      objVar: string
      x: JSExpr
      y: JSExpr
      z: JSExpr
    })
  | (JSStatementCommon & { type: 'g3d:animate'; worldVar: string; body: JSStatement[] })
  // Game 3D — caixa retangular (largura/altura/profundidade), p/ o chão e objetos não-cúbicos.
  | (JSStatementCommon & {
      type: 'g3d:createBlock'
      varName: string
      worldVar: string
      width: number | JSExpr
      height: number | JSExpr
      depth: number | JSExpr
      color: string
    })
  // Game 3D — física: velocidade, pulo, gravidade+chão, controle por teclado, escala.
  | (JSStatementCommon & {
      type: 'g3d:setVelocity'
      objVar: string
      x: JSExpr
      y: JSExpr
      z: JSExpr
    })
  | (JSStatementCommon & { type: 'g3d:jump'; objVar: string; force: JSExpr })
  | (JSStatementCommon & { type: 'g3d:applyGravity'; objVar: string; groundVar: string })
  | (JSStatementCommon & { type: 'g3d:controlWithKeys'; objVar: string; speed: number | JSExpr })
  | (JSStatementCommon & { type: 'g3d:setScale'; objVar: string; factor: JSExpr })
  // Game 3D — câmera segue um objeto (mantém o enquadramento atual).
  | (JSStatementCommon & { type: 'g3d:cameraFollow'; worldVar: string; objVar: string })
  // Game 3D — ⏱️ Tempo e repetição (genéricos): rodam DENTRO do "A cada quadro 3D".
  | (JSStatementCommon & { type: 'g3d:everyFrames'; n: number | JSExpr; body: JSStatement[] })
  | (JSStatementCommon & { type: 'g3d:everySeconds'; secs: number | JSExpr; body: JSStatement[] })
  // Game 3D — 📦 Grupos (genéricos): mexer com uma LISTA de objetos.
  | (JSStatementCommon & { type: 'g3d:createGroup'; varName: string })
  | (JSStatementCommon & { type: 'g3d:updateGroup'; groupVar: string; groundVar: string })
  | (JSStatementCommon & { type: 'g3d:updateGroupNoGravity'; groupVar: string })
  | (JSStatementCommon & {
      type: 'g3d:pruneOffscreen'
      worldVar: string
      groupVar: string
      itemName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & {
      type: 'g3d:forEachInGroup'
      groupVar: string
      itemName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'g3d:removeFromGroup'; groupVar: string; objVar: string })
  | (JSStatementCommon & { type: 'g3d:clearGroup'; groupVar: string })
  // Game 3D — Kit "Desvie": soltar 1 inimigo + fim de jogo (parar a cena).
  | (JSStatementCommon & {
      type: 'g3d:spawnEnemy'
      worldVar: string
      groupVar: string
      speed: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3d:stop'; worldVar: string })
  // ---- Game 3D — Kit Travessia (atravessar a rua, mundo em grade z-up) ----
  | (JSStatementCommon & { type: 'g3d:createCrossingScene'; canvasId: string; varName: string })
  | (JSStatementCommon & {
      type: 'g3d:createCrosser'
      varName: string
      worldVar: string
      color: string
    })
  | (JSStatementCommon & { type: 'g3d:crosserMove'; objVar: string; direction: string })
  | (JSStatementCommon & { type: 'g3d:crosserStep'; objVar: string; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:crosserReset'; objVar: string; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:gridPosition'; objVar: string; row: JSExpr; col: JSExpr })
  | (JSStatementCommon & {
      type: 'g3d:addRow'
      worldVar: string
      rowIndex: JSExpr
      kind: string
      direction: string
      speed: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3d:generateRows'; worldVar: string; count: number | JSExpr })
  | (JSStatementCommon & { type: 'g3d:moveTraffic'; worldVar: string })
  // ---- Game 3D — primitivas GENÉRICAS de grade/isométrico (fora do kit, p/ outros jogos) ----
  | (JSStatementCommon & { type: 'g3d:isometricCamera'; worldVar: string; followVar: string })
  | (JSStatementCommon & { type: 'g3d:gridStep'; objVar: string })
  | (JSStatementCommon & { type: 'g3d:gridMove'; objVar: string; direction: string })
  | (JSStatementCommon & {
      type: 'g3d:moveAcross'
      groupVar: string
      speed: number | JSExpr
      min: number | JSExpr
      max: number | JSExpr
    })
  // ---- Game 3D — câmera aérea + movimento circular (genéricos) e Kit Corrida ----
  | (JSStatementCommon & { type: 'g3d:topCamera'; worldVar: string; followVar: string })
  | (JSStatementCommon & {
      type: 'g3d:moveInCircle'
      objVar: string
      radius: number | JSExpr
      speed: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3d:createRaceScene'; canvasId: string; varName: string })
  | (JSStatementCommon & { type: 'g3d:createRaceTrack'; worldVar: string })
  | (JSStatementCommon & {
      type: 'g3d:createRaceCar'
      varName: string
      worldVar: string
      color: string
    })
  | (JSStatementCommon & { type: 'g3d:raceStep'; objVar: string; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:raceControl'; objVar: string; mode: string })
  | (JSStatementCommon & { type: 'g3d:runRivals'; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:raceReset'; objVar: string; worldVar: string })
  // ---- Game 3D — genéricos de movimento/física (sem lib) e Kit Empilhar (Stack) ----
  | (JSStatementCommon & { type: 'g3d:fall'; objVar: string })
  | (JSStatementCommon & {
      type: 'g3d:slideBetween'
      objVar: string
      axis: string
      min: number | JSExpr
      max: number | JSExpr
      speed: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3d:spin'; objVar: string; axis: string; speed: number | JSExpr })
  | (JSStatementCommon & { type: 'g3d:createStackScene'; canvasId: string; varName: string })
  | (JSStatementCommon & { type: 'g3d:createStackTower'; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:stackDrop'; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:stackStep'; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:stackReset'; worldVar: string })
  // ---- Game 3D — genéricos: mover/girar relativo + suavizar (lerp) ----
  | (JSStatementCommon & { type: 'g3d:moveBy'; objVar: string; x: JSExpr; y: JSExpr; z: JSExpr })
  | (JSStatementCommon & { type: 'g3d:rotateBy'; objVar: string; axis: string; amount: JSExpr })
  | (JSStatementCommon & {
      type: 'g3d:moveTowards'
      objVar: string
      x: JSExpr
      y: JSExpr
      z: JSExpr
      factor: number | JSExpr
    })
  // ---- Game 3D — genéricos: olhar/apontar/andar para frente ----
  | (JSStatementCommon & { type: 'g3d:lookAtObject'; aVar: string; bVar: string })
  | (JSStatementCommon & {
      type: 'g3d:lookAtPoint'
      objVar: string
      x: JSExpr
      y: JSExpr
      z: JSExpr
    })
  | (JSStatementCommon & { type: 'g3d:moveForward'; objVar: string; dist: JSExpr })
  | (JSStatementCommon & { type: 'g3d:faceVelocity'; objVar: string })
  // ---- Game 3D — física genérica: corpo, sólidos, presets plataforma/FPS ----
  | (JSStatementCommon & { type: 'g3d:body'; objVar: string; gravity: number | JSExpr })
  | (JSStatementCommon & { type: 'g3d:stepBody'; objVar: string; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:setSolid'; objVar: string })
  | (JSStatementCommon & {
      type: 'g3d:platformerControls'
      objVar: string
      worldVar: string
      speed: number | JSExpr
      jump: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g3d:fpsControls'
      objVar: string
      worldVar: string
      speed: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3d:resolveCollision'; aVar: string; bVar: string })
  // ---- Game 3D — câmeras vivas (1ª pessoa, orbital, 3ª pessoa, olhar, FOV) ----
  | (JSStatementCommon & { type: 'g3d:fpsCamera'; worldVar: string; objVar: string })
  | (JSStatementCommon & { type: 'g3d:orbitCamera'; worldVar: string; objVar: string })
  | (JSStatementCommon & {
      type: 'g3d:thirdPersonCamera'
      worldVar: string
      objVar: string
      dist: number | JSExpr
      height: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3d:cameraLookAt'; worldVar: string; objVar: string })
  | (JSStatementCommon & { type: 'g3d:setFOV'; worldVar: string; deg: number | JSExpr })
  // ---- Game 3D — formas, materiais, texturas, modelo (Fase 6) ----
  | (JSStatementCommon & {
      type: 'g3d:createCylinder'
      varName: string
      worldVar: string
      radius: number | JSExpr
      height: number | JSExpr
      color: string
    })
  | (JSStatementCommon & {
      type: 'g3d:createCone'
      varName: string
      worldVar: string
      radius: number | JSExpr
      height: number | JSExpr
      color: string
    })
  | (JSStatementCommon & {
      type: 'g3d:createPlane'
      varName: string
      worldVar: string
      width: number | JSExpr
      depth: number | JSExpr
      color: string
    })
  | (JSStatementCommon & {
      type: 'g3d:createTorus'
      varName: string
      worldVar: string
      radius: number | JSExpr
      tube: number | JSExpr
      color: string
    })
  | (JSStatementCommon & { type: 'g3d:createModel'; varName: string; worldVar: string })
  | (JSStatementCommon & { type: 'g3d:setColor'; objVar: string; color: string })
  | (JSStatementCommon & { type: 'g3d:setOpacity'; objVar: string; opacity: number | JSExpr })
  | (JSStatementCommon & { type: 'g3d:setMaterial'; objVar: string; kind: string })
  | (JSStatementCommon & { type: 'g3d:setTexture'; objVar: string; asset: string })
  | (JSStatementCommon & { type: 'g3d:setVisible'; objVar: string; mode: string })
  | (JSStatementCommon & { type: 'g3d:removeObject'; worldVar: string; objVar: string })
  | (JSStatementCommon & { type: 'g3d:addToModel'; modelVar: string; partVar: string })
  // ---- Game 3D — luz & céu (Fase 7) ----
  | (JSStatementCommon & {
      type: 'g3d:addAmbientLight'
      worldVar: string
      color: string
      intensity: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g3d:addSunLight'
      worldVar: string
      color: string
      intensity: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g3d:addPointLight'
      worldVar: string
      color: string
      intensity: number | JSExpr
      x: number | JSExpr
      y: number | JSExpr
      z: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g3d:setFog'
      worldVar: string
      color: string
      near: number | JSExpr
      far: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3d:setSky'; worldVar: string; top: string; bottom: string })
  | (JSStatementCommon & { type: 'g3d:setShadows'; worldVar: string; mode: string })
  // ---- Game 3D — enxames & som (Fase 8) ----
  | (JSStatementCommon & { type: 'g3d:createSwarm'; varName: string; worldVar: string })
  | (JSStatementCommon & {
      type: 'g3d:spawnInSwarm'
      swarmVar: string
      originalVar: string
      x: number | JSExpr
      y: number | JSExpr
      z: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g3d:forEachInSwarm'
      swarmVar: string
      itemName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'g3d:removeFromSwarm'; swarmVar: string; itemVar: string })
  | (JSStatementCommon & {
      type: 'g3d:pruneSwarm'
      swarmVar: string
      axis: string
      min: number | JSExpr
      max: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3d:playNote'; freq: number | JSExpr; ms: number | JSExpr })
  | (JSStatementCommon & { type: 'g3d:playEffect'; kind: string })
  // Jogo 2D Avançado (extensão game-2d-advanced): esqueleto de jogo profissional
  // (kit P9) — máquina de estados, loop com delta-time, telas de UI injetadas
  // por JS e personagens nomeados. Config no setup; a mecânica a criança escreve
  // nos ganchos (onUpdate/onDraw) com blocos do núcleo.
  | (JSStatementCommon & {
      type: 'gk:setup'
      w: number | JSExpr
      h: number | JSExpr
      bg: string
      accent: string
    })
  // "Ocupar a tela toda": setup SEM dimensões — a resolução acompanha a viewport.
  | (JSStatementCommon & { type: 'gk:setupFull'; bg: string; accent: string })
  | (JSStatementCommon & { type: 'gk:setStageDescription'; description: string })
  // Moldura da tela (enxergar a área do palco) e contorno das caixas que colidem.
  | (JSStatementCommon & { type: 'gk:stageBorder'; color: string; width: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:setBackdrop'; image: string })
  | (JSStatementCommon & { type: 'gk:drawBackdrop'; image: string })
  | (JSStatementCommon & { type: 'gk:showHitboxes' })
  | (JSStatementCommon & { type: 'gk:start' })
  // `name` = como o jogo chama a imagem; `asset` = nome do desenho no projeto.
  | (JSStatementCommon & { type: 'gk:loadImage'; name: string; asset: string })
  // `screen` das telas PRONTAS é um dos fixos: menu | pausa | carregando | fim.
  | (JSStatementCommon & {
      type: 'gk:setScreenText'
      screen: string
      title: ScreenText
      text: ScreenText
      button: ScreenText
    })
  | (JSStatementCommon & {
      type: 'gk:createScreen'
      name: string
      title: ScreenText
      text: ScreenText
    })
  | (JSStatementCommon & {
      type: 'gk:addButton'
      screen: string
      label: ScreenText
      body: JSStatement[]
    })
  // 🖼️ Fundo da tela (DOM): cor + imagem opcional do Pinta cobrindo o painel.
  | (JSStatementCommon & {
      type: 'gk:setScreenBg'
      screen: string
      color: string
      image: string
    })
  | (JSStatementCommon & { type: 'gk:showScreen'; name: string })
  | (JSStatementCommon & { type: 'gk:hideScreens' })
  | (JSStatementCommon & { type: 'gk:setState'; name: string })
  | (JSStatementCommon & { type: 'gk:restartGame' })
  | (JSStatementCommon & { type: 'gk:onGameStart'; body: JSStatement[] })
  | (JSStatementCommon & { type: 'gk:onEnterState'; name: string; body: JSStatement[] })
  | (JSStatementCommon & { type: 'gk:pause' })
  | (JSStatementCommon & { type: 'gk:resume' })
  | (JSStatementCommon & { type: 'gk:returnToMenu' })
  | (JSStatementCommon & { type: 'gk:endGame' })
  // Ganchos do loop: o corpo do update recebe o delta-time (nome escolhido no
  // bloco, padrão `dt`); o do draw recebe o pincel (padrão `ctx` — os blocos de
  // Canvas do núcleo funcionam dentro, como na figura do Jogo 2D).
  | (JSStatementCommon & { type: 'gk:onUpdate'; dtName: string; body: JSStatement[] })
  | (JSStatementCommon & { type: 'gk:onDraw'; ctxName: string; body: JSStatement[] })
  // HUD: desenha DEPOIS do mundo, SEM a câmera (placar/barras presos na tela).
  | (JSStatementCommon & { type: 'gk:onDrawHud'; ctxName: string; body: JSStatement[] })
  | (JSStatementCommon & { type: 'gk:drawBackground'; color: string; grid: boolean })
  // 🎞️ Folha de quadros: recorte fw×fh + animação por faixa de quadros (guarda
  // de transição no runtime — re-tocar a mesma não reinicia).
  | (JSStatementCommon & {
      type: 'gk:setSheet'
      charVar: string
      image: string
      fw: number | JSExpr
      fh: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:playAnim'
      charVar: string
      from: number | JSExpr
      to: number | JSExpr
      fps: number | JSExpr
    })
  // 🎥 Câmera que segue um personagem num mundo maior que a tela.
  | (JSStatementCommon & {
      type: 'gk:cameraFollow'
      charVar: string
      w: number | JSExpr
      h: number | JSExpr
    })
  // 🌍 Mundo aberto: o tamanho do mundo vem do próprio mapa de tiles.
  | (JSStatementCommon & { type: 'gk:cameraFollowMap'; charVar: string; map: string })
  | (JSStatementCommon & { type: 'gk:cameraStop' })
  // ➡️ Velocidade própria (tiro reto/mirado) e giro.
  | (JSStatementCommon & {
      type: 'gk:launchTowards'
      charVar: string
      targetVar: string
      speed: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:moveByVelocity'; charVar: string; dtVar: string })
  | (JSStatementCommon & { type: 'gk:setAngle'; charVar: string; degrees: number | JSExpr })
  // 🖱️ Clique no jogo em coords internas (letterbox e câmera resolvidos).
  | (JSStatementCommon & {
      type: 'gk:onGameClick'
      xName: string
      yName: string
      body: JSStatement[]
    })
  // 📊 Barra genérica (vida grande/mana/progresso) — o HUD do P24 em canvas.
  | (JSStatementCommon & {
      type: 'gk:drawBar'
      current: number | JSExpr
      max: number | JSExpr
      x: number | JSExpr
      y: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
      color: string
    })
  // 🧙 Kit RPG (Canvas RPG Kit em blocos): grade+paredes, NPC+fala typewriter,
  // flags de história, inventário, mapas com portas e batalha por turnos com
  // menu PRONTO do motor (Atacar/Defender/Fugir).
  | (JSStatementCommon & {
      type: 'gk:rpgMoveGrid'
      charVar: string
      cell: number | JSExpr
      dtVar: string
    })
  | (JSStatementCommon & { type: 'gk:rpgBlockCell'; cx: number | JSExpr; cy: number | JSExpr })
  | (JSStatementCommon & {
      type: 'gk:rpgCreateNpc'
      name: string
      cx: number | JSExpr
      cy: number | JSExpr
      image: string
      look: string
    })
  | (JSStatementCommon & { type: 'gk:rpgDrawNpcs' })
  | (JSStatementCommon & { type: 'gk:rpgOnTalk'; npc: string; body: JSStatement[] })
  | (JSStatementCommon & { type: 'gk:rpgSay'; text: number | JSExpr; speaker: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:rpgAddFlag'; flag: string })
  | (JSStatementCommon & { type: 'gk:rpgGiveItem'; item: string; image: string })
  | (JSStatementCommon & { type: 'gk:rpgRemoveItem'; item: string })
  | (JSStatementCommon & {
      type: 'gk:rpgDrawInventory'
      x: number | JSExpr
      y: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:rpgGoMap'; map: string })
  | (JSStatementCommon & { type: 'gk:rpgSetStartMap'; map: string })
  | (JSStatementCommon & {
      type: 'gk:rpgCreateMap'
      map: string
      cols: number | JSExpr
      rows: number | JSExpr
      ctxName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'gk:rpgOnEnterMap'; map: string; body: JSStatement[] })
  | (JSStatementCommon & {
      type: 'gk:rpgCreateDoor'
      cx: number | JSExpr
      cy: number | JSExpr
      map: string
    })
  // 🌍 Mundo aberto: bordas ligadas (estilo Zelda). O tamanho pertence à criação.
  | (JSStatementCommon & { type: 'gk:rpgConnectEdge'; side: string; map: string })
  | (JSStatementCommon & {
      type: 'gk:rpgBattleStats'
      hp: number | JSExpr
      str: number | JSExpr
      def: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:rpgBattleStart'
      name: string
      hp: number | JSExpr
      str: number | JSExpr
      def: number | JSExpr
      image?: string
    })
  | (JSStatementCommon & { type: 'gk:rpgOnBattleEnd'; body: JSStatement[] })
  // ⚔️ Batalha rica (progressão): golpe especial (energia), poção, XP e status.
  | (JSStatementCommon & {
      type: 'gk:rpgSetSpecial'
      name: string
      dmg: number | JSExpr
      cost: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:rpgGivePotion'; name: string; heal: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:rpgHealHero' })
  | (JSStatementCommon & { type: 'gk:rpgBattleReward'; xp: number | JSExpr })
  | (JSStatementCommon & {
      type: 'gk:rpgInflict'
      who: string
      status: string
      turns: number | JSExpr
    })
  // ⚔️ Batalha em EQUIPE: aliados/inimigos com atributos + golpes nomeados.
  | (JSStatementCommon & {
      type: 'gk:rpgAddAlly'
      name: string
      hp: number | JSExpr
      str: number | JSExpr
      def: number | JSExpr
      color: string
      image?: string
    })
  | (JSStatementCommon & {
      type: 'gk:rpgAddFoe'
      name: string
      hp: number | JSExpr
      str: number | JSExpr
      def: number | JSExpr
      color: string
      image?: string
    })
  | (JSStatementCommon & {
      type: 'gk:rpgTeachMove'
      who: string
      move: string
      dmg: number | JSExpr
      cost: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:rpgTeachHeal'
      who: string
      move: string
      amount: number | JSExpr
      cost: number | JSExpr
    })
  // 👑 R30: chefes — chefão (maior + barra), IA de chefe e golpes do inimigo.
  | (JSStatementCommon & {
      type: 'gk:rpgAddBoss'
      name: string
      hp: number | JSExpr
      str: number | JSExpr
      def: number | JSExpr
      image?: string
    })
  | (JSStatementCommon & { type: 'gk:rpgOnFoeTurn'; name: string; body: JSStatement[] })
  | (JSStatementCommon & { type: 'gk:rpgFoeUse'; name: string; move: string })
  | (JSStatementCommon & { type: 'gk:rpgFoeHitAll'; name: string; dmg: number | JSExpr })
  // ⚔️ Fichas de inimigo reutilizáveis: definir separado + escolher na batalha.
  | (JSStatementCommon & {
      type: 'gk:rpgDefineBattler'
      name: string
      hp: number | JSExpr
      str: number | JSExpr
      def: number | JSExpr
      image: string
      color: string
      boss: boolean
    })
  | (JSStatementCommon & { type: 'gk:rpgBattleNamed'; name: string })
  | (JSStatementCommon & { type: 'gk:rpgAddFoeNamed'; name: string })
  // 🎬 Cenas & NPCs vivos: folha de andar direcional + cutscene por gravação +
  // NPC que anda/vagueia + gatilho ao pisar numa célula.
  | (JSStatementCommon & {
      type: 'gk:setWalkSheet'
      charVar: string
      image: string
      fw: number | JSExpr
      fh: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:rpgCutscene'; body: JSStatement[] })
  | (JSStatementCommon & { type: 'gk:rpgWait'; seconds: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:rpgFace'; npc: string; dir: string })
  | (JSStatementCommon & {
      type: 'gk:rpgNpcWalkTo'
      npc: string
      cx: number | JSExpr
      cy: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:rpgNpcWander'; npc: string })
  | (JSStatementCommon & {
      type: 'gk:rpgOnStep'
      cx: number | JSExpr
      cy: number | JSExpr
      body: JSStatement[]
    })
  // 💬 Menu de escolha (container + opções) + 💾 salvar/continuar.
  | (JSStatementCommon & { type: 'gk:rpgMenu'; title: number | JSExpr; body: JSStatement[] })
  | (JSStatementCommon & { type: 'gk:rpgOption'; label: number | JSExpr; body: JSStatement[] })
  | (JSStatementCommon & { type: 'gk:rpgSave' })
  | (JSStatementCommon & { type: 'gk:rpgLoad' })
  // 🗺️ Mundo de tiles + profundidade: mapa em camadas (chão/topos), sólidos,
  // Y-sort (quem está mais embaixo desenha por último), sombra e tremor da câmera.
  | (JSStatementCommon & { type: 'gk:loadTilemap'; name: string; asset: string })
  | (JSStatementCommon & { type: 'gk:drawTilemap'; name: string; layer: string })
  | (JSStatementCommon & { type: 'gk:tilemapSolid'; name: string })
  | (JSStatementCommon & { type: 'gk:drawShadow'; charVar: string })
  | (JSStatementCommon & { type: 'gk:drawByDepth'; charVar: string })
  | (JSStatementCommon & {
      type: 'gk:cameraShake'
      intensity: number | JSExpr
      seconds: number | JSExpr
    })
  // ⚙️ Física GERAL (R11): gravidade/pulo/chão, colisão sólida, bordas, tempo,
  // peça por célula, propriedade da entidade e tween. Fora de todo kit.
  | (JSStatementCommon & {
      type: 'gk:applyGravity'
      charVar: string
      g: number | JSExpr
      dtVar: string
    })
  | (JSStatementCommon & { type: 'gk:jump'; charVar: string; force: number | JSExpr })
  | (JSStatementCommon & {
      type: 'gk:setVelocity'
      charVar: string
      vx: number | JSExpr
      vy: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:setTerminalVelocity'
      charVar: string
      max: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:bounceOnEdges'; charVar: string })
  | (JSStatementCommon & { type: 'gk:wrapEdges'; charVar: string })
  | (JSStatementCommon & { type: 'gk:paddleBounce'; ballVar: string; paddleVar: string })
  // 🧩 Tabuleiro/grade (geral): cria/lê/escreve células por (coluna, linha).
  | (JSStatementCommon & {
      type: 'gk:boardCreate'
      name: string
      cols: number | JSExpr
      rows: number | JSExpr
      empty: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:boardSet'
      name: string
      value: number | JSExpr
      col: number | JSExpr
      row: number | JSExpr
    })
  // 🎲 R30 — jogos de tabuleiro: ordem de turno (anel) + trilha de casas.
  | (JSStatementCommon & { type: 'gk:playersSetup'; n: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:nextPlayer' })
  | (JSStatementCommon & { type: 'gk:onTurnChange'; body: JSStatement[] })
  | (JSStatementCommon & {
      type: 'gk:moveAlongTrack'
      who: string
      spaces: number | JSExpr
      path: string
    })
  | (JSStatementCommon & { type: 'gk:onLandSpace'; body: JSStatement[] })
  // 🃏 R30 — cartas: mover topo entre pilhas, rebaralhar, virar, desenhar a mão.
  | (JSStatementCommon & { type: 'gk:pileMoveTop'; fromVar: string; toVar: string })
  | (JSStatementCommon & { type: 'gk:pileShuffleFrom'; deckVar: string; discardVar: string })
  | (JSStatementCommon & { type: 'gk:cardFlip'; card: number | JSExpr })
  | (JSStatementCommon & {
      type: 'gk:handDraw'
      pileVar: string
      x: number | JSExpr
      y: number | JSExpr
      fan: boolean
    })
  // 🃏 R30 — Kit Cartas (deck-battler): a batalha, vida/escudo, intenção, turnos.
  | (JSStatementCommon & {
      type: 'gk:cardsStart'
      heroHp: number | JSExpr
      enemyHp: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:cardsEnergyPerTurn'; n: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:cardsSpend'; n: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:cardsOnTurn'; body: JSStatement[] })
  | (JSStatementCommon & { type: 'gk:cardsEndTurn' })
  | (JSStatementCommon & { type: 'gk:cardsDrawHud' })
  | (JSStatementCommon & { type: 'gk:cardsHurtEnemy'; n: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:cardsHurtMe'; n: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:cardsGainBlock'; n: number | JSExpr })
  | (JSStatementCommon & {
      type: 'gk:cardsEnemyIntent'
      action: string
      value: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:cardsOnEnemyTurn'; body: JSStatement[] })
  | (JSStatementCommon & { type: 'gk:collideTilemap'; charVar: string; map: string })
  | (JSStatementCommon & { type: 'gk:collideGroup'; charVar: string; mold: string })
  | (JSStatementCommon & {
      type: 'gk:overlapGroups'
      aName: string
      moldA: string
      bName: string
      moldB: string
      body: JSStatement[]
    })
  | (JSStatementCommon & {
      type: 'gk:everySeconds'
      seconds: number | JSExpr
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'gk:setTileSize'; px: number | JSExpr })
  | (JSStatementCommon & {
      type: 'gk:setTileAt'
      map: string
      x: number | JSExpr
      y: number | JSExpr
      index: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:breakTileAt'; map: string; charVar: string })
  | (JSStatementCommon & {
      type: 'gk:setProperty'
      charVar: string
      prop: string
      value: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:setFacingDir'; charVar: string; dir: string })
  | (JSStatementCommon & {
      type: 'gk:tweenTo'
      charVar: string
      x: number | JSExpr
      y: number | JSExpr
      seconds: number | JSExpr
    })
  // 🏃 Kit Plataforma: o atalho do gênero (Mario/Celeste/Sunnyland) — herói
  // tudo-em-um com feel, plataformas, pisar no inimigo, escada, wall jump.
  | (JSStatementCommon & {
      type: 'gk:platformerHero'
      charVar: string
      speed: number | JSExpr
      force: number | JSExpr
      dtVar: string
    })
  | (JSStatementCommon & {
      type: 'gk:setJumpFeel'
      coyote: number | JSExpr
      buffer: number | JSExpr
      hold: number | JSExpr
      gravity: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:doubleJump'
      charVar: string
      force: number | JSExpr
      times: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:wallSlide'; charVar: string; speed: number | JSExpr })
  | (JSStatementCommon & {
      type: 'gk:wallJump'
      charVar: string
      forceX: number | JSExpr
      forceY: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:climbLadder'
      charVar: string
      map: string
      tile: number | JSExpr
      speed: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:oneWayPlatform'
      charVar: string
      mold: string
      dtVar: string
    })
  | (JSStatementCommon & { type: 'gk:dropThrough'; charVar: string })
  | (JSStatementCommon & {
      type: 'gk:movingPlatform'
      charVar: string
      x1: number | JSExpr
      y1: number | JSExpr
      x2: number | JSExpr
      y2: number | JSExpr
      seconds: number | JSExpr
      dtVar: string
    })
  | (JSStatementCommon & { type: 'gk:rideOn'; charVar: string; mold: string })
  | (JSStatementCommon & {
      type: 'gk:stompKill'
      charVar: string
      mold: string
      bounce: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:patrolTurnAtWall'; charVar: string; speed: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:setCheckpoint'; x: number | JSExpr; y: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:respawn'; charVar: string })
  | (JSStatementCommon & {
      type: 'gk:platStateFrames'
      charVar: string
      state: string
      from: number | JSExpr
      to: number | JSExpr
      fps: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:platformerAnim'; charVar: string })
  // 🧭 R15 — primitivos gerais (fora de todo kit)
  | (JSStatementCommon & {
      type: 'gk:defineRegion'
      name: string
      x: number | JSExpr
      y: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:launchToPoint'
      charVar: string
      x: number | JSExpr
      y: number | JSExpr
      speed: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:setVelocityAngle'
      charVar: string
      degrees: number | JSExpr
      force: number | JSExpr
    })
  // 🖥️/✨/🔁/🎨/🎯 R21 — primitivos gerais (review do Space Invaders)
  | (JSStatementCommon & {
      type: 'gk:floatText'
      text: string | JSExpr
      x: number | JSExpr
      y: number | JSExpr
      color: string
      size: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:trailOn'
      charVar: string
      color: string
      size: number | JSExpr
      rate: number | JSExpr
      life: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:trailOff'; charVar: string })
  | (JSStatementCommon & {
      type: 'gk:shockwave'
      x: number | JSExpr
      y: number | JSExpr
      radius: number | JSExpr
      seconds: number | JSExpr
      color: string
    })
  | (JSStatementCommon & {
      type: 'gk:scrollImage'
      image: string
      vx: number | JSExpr
      vy: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:leanOnMove'; charVar: string; degrees: number | JSExpr })
  | (JSStatementCommon & {
      type: 'gk:fanShot'
      charVar: string
      mold: string
      count: number | JSExpr
      arc: number | JSExpr
      degrees: number | JSExpr
      speed: number | JSExpr
    })
  // 🚀 R22 — Kit Nave: pilotar, poder de tiro, a FORMAÇÃO que marcha em bloco,
  // o atirador aleatório dela, a linha de invasão, o céu de estrelas e a bomba.
  | (JSStatementCommon & {
      type: 'gk:naveShip'
      charVar: string
      speed: number | JSExpr
      lean: number | JSExpr
      dtVar: string
    })
  | (JSStatementCommon & {
      type: 'gk:navePowerup'
      charVar: string
      power: string
      seconds: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:naveWave'
      mold: string
      cols: number | JSExpr
      rows: number | JSExpr
      gap: number | JSExpr
      speed: number | JSExpr
      drop: number | JSExpr
      accel: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:naveWaveShooter'
      mold: string
      seconds: number | JSExpr
      bullet: string
      speed: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:naveInvasionLine'; y: number | JSExpr })
  | (JSStatementCommon & {
      type: 'gk:naveStarfield'
      count: number | JSExpr
      speed: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:naveBomb'
      mold: string
      radius: number | JSExpr
      target: string
    })
  // 🛤️ R25 — caminhos (container+filho, como o rpgMenu), seguir, paralaxe presa
  // à câmera e explosão por FOLHA one-shot; e o status estendido do rpgInflict.
  | (JSStatementCommon & { type: 'gk:definePath'; name: string; body: JSStatement[] })
  | (JSStatementCommon & { type: 'gk:pathPoint'; x: number | JSExpr; y: number | JSExpr })
  | (JSStatementCommon & {
      type: 'gk:followPath'
      charVar: string
      path: string
      speed: number | JSExpr
      dtVar: string
    })
  | (JSStatementCommon & {
      type: 'gk:parallaxLayer'
      image: string
      fx: number | JSExpr
      fy: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:sheetBurst'
      image: string
      frames: number | JSExpr
      fps: number | JSExpr
      x: number | JSExpr
      y: number | JSExpr
      size: number | JSExpr
    })
  // 🏰 R26 — Kit Defesa de Torre
  | (JSStatementCommon & {
      type: 'gk:tdWave'
      path: string
      count: number | JSExpr
      mold: string
      gap: number | JSExpr
      speed: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:tdSlot'
      x: number | JSExpr
      y: number | JSExpr
      size: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:tdDrawSlots' })
  | (JSStatementCommon & {
      type: 'gk:tdOnBuy'
      cost: number | JSExpr
      xName: string
      yName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'gk:tdFreeSlot'; x: number | JSExpr; y: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:tdDrawRange'; charVar: string; radius: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:tdSetCoins'; n: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:tdAddCoins'; n: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:setOpacity'; charVar: string; percent: number | JSExpr })
  | (JSStatementCommon & {
      type: 'gk:fadeTo'
      charVar: string
      percent: number | JSExpr
      seconds: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:tweenProperty'
      charVar: string
      prop: string
      to: number | JSExpr
      seconds: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:lutaMatch'
      p1Var: string
      p2Var: string
      rounds: number | JSExpr
      seconds: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:lutaDrawHud' })
  | (JSStatementCommon & {
      type: 'gk:lutaFighter'
      charVar: string
      left: string
      right: string
      jump: string
      crouch: string
      guard: string
      dtVar: string
    })
  | (JSStatementCommon & { type: 'gk:lutaAI'; charVar: string; level: string })
  | (JSStatementCommon & {
      type: 'gk:lutaMove'
      name: string
      charVar: string
      speed: string
      damage: number | JSExpr
      range: number | JSExpr
      pierce: boolean
      special: boolean
    })
  | (JSStatementCommon & {
      type: 'gk:lutaMoveAnim'
      name: string
      charVar: string
      from: number | JSExpr
      to: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:lutaAttack'; charVar: string; move: string })
  | (JSStatementCommon & {
      type: 'gk:setSwingWindow'
      charVar: string
      start: number | JSExpr
      active: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:playAnimOnce'
      charVar: string
      from: number | JSExpr
      to: number | JSExpr
      fps: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:setEntityState'
      charVar: string
      state: string
      seconds: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:stateAnim'
      charVar: string
      state: string
      from: number | JSExpr
      to: number | JSExpr
      fps: number | JSExpr
      once: boolean
    })
  | (JSStatementCommon & { type: 'gk:stateLook'; charVar: string; state: string; look: string })
  | (JSStatementCommon & { type: 'gk:autoAnimate'; charVar: string })
  | (JSStatementCommon & {
      type: 'gk:thrust'
      charVar: string
      degrees: number | JSExpr
      force: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:applyFriction'
      charVar: string
      factor: number | JSExpr
      dtVar: string
    })
  | (JSStatementCommon & { type: 'gk:waitThen'; seconds: number | JSExpr; body: JSStatement[] })
  | (JSStatementCommon & {
      type: 'gk:setHitbox'
      charVar: string
      ox: number | JSExpr
      oy: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:setHitboxShape'
      charVar: string
      shape: 'circulo' | 'retangulo'
      radius: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:fadeScreen'
      color: string
      seconds: number | JSExpr
      toDark: boolean
    })
  | (JSStatementCommon & { type: 'gk:flashScreen'; color: string; times: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:saveValue'; name: string; value: JSExpr })
  | (JSStatementCommon & { type: 'gk:playMusic'; sound: string })
  | (JSStatementCommon & { type: 'gk:stopSound'; sound: string })
  | (JSStatementCommon & { type: 'gk:setVolume'; sound: string; level: number | JSExpr })
  | (JSStatementCommon & {
      type: 'gk:createEmptyTilemap'
      name: string
      cols: number | JSExpr
      rows: number | JSExpr
      fill: number | JSExpr
      asset: string
    })
  // 👾 R16 — Kit Monstrinhos (o atalho do gênero "pegue e treine bichinhos")
  | (JSStatementCommon & {
      type: 'gk:pkmCreature'
      name: string
      creatureType: string
      hp: number | JSExpr
      str: number | JSExpr
      def: number | JSExpr
      spd: number | JSExpr
      image: string
      look: string
    })
  | (JSStatementCommon & {
      type: 'gk:pkmMove'
      move: string
      creature: string
      moveType: string
      dmg: number | JSExpr
      acc: number | JSExpr
      fx: string
      color: string
    })
  | (JSStatementCommon & {
      type: 'gk:pkmTypeChart'
      atk: string
      def: string
      mult: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:pkmEvolve'
      from: string
      to: string
      level: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:pkmCatchDifficulty'; creature: string; level: string })
  | (JSStatementCommon & { type: 'gk:pkmGive'; creature: string; level: number | JSExpr })
  | (JSStatementCommon & {
      type: 'gk:pkmGiveBall'
      count: number | JSExpr
      power: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:pkmHealTeam' })
  | (JSStatementCommon & { type: 'gk:pkmDrawTeam'; x: number | JSExpr; y: number | JSExpr })
  | (JSStatementCommon & {
      type: 'gk:pkmGrassCells'
      x1: number | JSExpr
      y1: number | JSExpr
      x2: number | JSExpr
      y2: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:pkmGrassTiles'; index: number | JSExpr; map: string })
  | (JSStatementCommon & {
      type: 'gk:pkmWild'
      creature: string
      min: number | JSExpr
      max: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:pkmEncounterRate'; percent: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:pkmBattleWild'; creature: string; level: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:pkmBattleTrainer'; name: string; body: JSStatement[] })
  | (JSStatementCommon & {
      type: 'gk:pkmTrainerCreature'
      creature: string
      level: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:moveWithCustomKeys'
      charVar: string
      up: string
      down: string
      left: string
      right: string
      dtVar: string
    })
  // 🥷 Ação em tempo real (Zelda): golpe na direção + inimigo que patrulha + corações.
  | (JSStatementCommon & {
      type: 'gk:attackFacing'
      charVar: string
      range: number | JSExpr
      duration: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:patrolAround'
      charVar: string
      ox: number | JSExpr
      oy: number | JSExpr
      radius: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:drawHearts'
      x: number | JSExpr
      y: number | JSExpr
      current: number | JSExpr
      max: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:createCharacter'
      varName: string
      image: string
      w: number | JSExpr
      h: number | JSExpr
      speed: number | JSExpr
      color: string
    })
  // `dtVar` = nome da variável de delta-time em escopo (o binder do onUpdate).
  | (JSStatementCommon & { type: 'gk:moveWithKeys'; charVar: string; dtVar: string })
  | (JSStatementCommon & { type: 'gk:keepOnScreen'; charVar: string })
  | (JSStatementCommon & { type: 'gk:drawCharacter'; charVar: string })
  | (JSStatementCommon & {
      type: 'gk:placeCharacter'
      charVar: string
      x: number | JSExpr
      y: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:resetCharacter'; charVar: string })
  | (JSStatementCommon & {
      type: 'gk:setSpeedMultiplier'
      charVar: string
      factor: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:setPauseKey'; key: string })
  // Jogo 2D Avançado (P24) — arquitetura de jogo real.
  // 📢 Avisos (event bus): quem avisa não conhece quem reage.
  | (JSStatementCommon & { type: 'gk:onEvent'; event: string; body: JSStatement[] })
  | (JSStatementCommon & { type: 'gk:emit'; event: string })
  // 👾 Moldes & enxames (tipo data-driven + pool + spawner + cull).
  | (JSStatementCommon & {
      type: 'gk:defineMold'
      name: string
      w: number | JSExpr
      h: number | JSExpr
      health: number | JSExpr
      speed: number | JSExpr
      damage: number | JSExpr
      color: string
      image: string
      look: string
      /** Só existe quando a criança escolhe a caixa REDONDA: no padrão a chave
       * nem entra na IR, e o código gerado fica igual ao dos projetos antigos. */
      shape?: 'circulo'
    })
  | (JSStatementCommon & {
      type: 'gk:spawnFromMold'
      mold: string
      x: number | JSExpr
      y: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:startSpawner'; mold: string; seconds: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:stopSpawner'; mold: string })
  // `const NOME = SZGameKit.spawnFromMold(...)` — nasce 1 com apelido (tiro
  // mirado/boss configurável), padrão do createCharacter.
  | (JSStatementCommon & {
      type: 'gk:spawnNamed'
      varName: string
      mold: string
      x: number | JSExpr
      y: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:forEachActive'
      mold: string
      itemName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'gk:cullOffscreen'; mold: string; margin: number | JSExpr })
  | (JSStatementCommon & { type: 'gk:recycle'; charVar: string })
  | (JSStatementCommon & { type: 'gk:drawActive'; mold: string })
  // 🎨 Desenho (aparência vetorial reutilizável). O corpo desenha em coords LOCAIS
  // (0,0 = canto), pincel `ctxName` bound — Canvas do núcleo funciona dentro.
  // `baseW/baseH` = tamanho-base do desenho: drawLook/drawActive ESCALAM dele
  // p/ o tamanho pedido (opcionais p/ IR v0.2 já salva — ausente = 40×40).
  | (JSStatementCommon & {
      type: 'gk:defineLook'
      name: string
      ctxName: string
      baseW?: number | JSExpr
      baseH?: number | JSExpr
      body: JSStatement[]
    })
  | (JSStatementCommon & {
      type: 'gk:drawLook'
      look: string
      x: number | JSExpr
      y: number | JSExpr
      w: number | JSExpr
      h: number | JSExpr
    })
  // 🎯 Comportamentos (steering: perseguir/vaguear/virar).
  | (JSStatementCommon & { type: 'gk:seek'; charVar: string; targetVar: string; dtVar: string })
  | (JSStatementCommon & { type: 'gk:drift'; charVar: string; dtVar: string })
  | (JSStatementCommon & { type: 'gk:face'; charVar: string; targetVar: string })
  // ❤️ Combate (dano com i-frames, empurrão, barra de vida).
  | (JSStatementCommon & {
      type: 'gk:hurt'
      charVar: string
      amount: number | JSExpr
      iframes: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:knockback'
      charVar: string
      fromVar: string
      force: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:drawHealthBar'; charVar: string; max: number | JSExpr })
  // 🖥️ HUD & Missão.
  | (JSStatementCommon & {
      type: 'gk:setMission'
      seconds: number | JSExpr
      killCount: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:missionKill' })
  | (JSStatementCommon & { type: 'gk:drawTimer'; x: number | JSExpr; y: number | JSExpr })
  // ✨ Faíscas (partículas data-driven pooled).
  | (JSStatementCommon & {
      type: 'gk:defineEffect'
      name: string
      count: number | JSExpr
      color: string
      size: number | JSExpr
      life: number | JSExpr
      speed: number | JSExpr
      gravity: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'gk:burst'
      effect: string
      x: number | JSExpr
      y: number | JSExpr
    })
  | (JSStatementCommon & { type: 'gk:drawEffects' })
  // 🔊 Som (importado + sintetizado).
  | (JSStatementCommon & { type: 'gk:loadSound'; name: string; asset: string })
  | (JSStatementCommon & { type: 'gk:playSound'; name: string })
  | (JSStatementCommon & { type: 'gk:playEffect'; fx: string })
  | (JSStatementCommon & { type: 'gk:playTone'; freq: number | JSExpr; ms: number | JSExpr })
  // Jogo 3D Avançado (extensão game-3d-advanced): base de engine 3D
  // profissional (curso SimonDev) achatada num facade — mundo pronto, moldes
  // montados de peças, enxames com pool, FSM POR ENTIDADE (parado → mirar →
  // atirar → recarregar), grade espacial, mira por slerp, combate e telas.
  | (JSStatementCommon & {
      type: 'g3k:setup'
      w: number | JSExpr
      h: number | JSExpr
      world: number | JSExpr
      sky: string
      ground: string
    })
  | (JSStatementCommon & { type: 'g3k:scatterDecor'; count: number | JSExpr })
  // 🎬 Efeitos de cinema (pós-processamento próprio: sombras/bloom/vinheta).
  | (JSStatementCommon & {
      type: 'g3k:setEffects'
      shadows: boolean
      bloom: boolean
      strength: number | JSExpr
      vignette: boolean
    })
  | (JSStatementCommon & { type: 'g3k:start' })
  // 🧊 Molde: o corpo monta as peças (roda 1x na definição, molde implícito).
  | (JSStatementCommon & {
      type: 'g3k:defineMold'
      name: string
      health: number | JSExpr
      speed: number | JSExpr
      body: JSStatement[]
    })
  | (JSStatementCommon & {
      type: 'g3k:part'
      shape: string
      material: string
      color: string
      texture: string
      model: string
      w: number | JSExpr
      h: number | JSExpr
      d: number | JSExpr
      x: number | JSExpr
      y: number | JSExpr
      z: number | JSExpr
    })
  // 👾 Enxames com pool. `spawnNamed` = `const NOME = SZGameKit3D.spawn(...)`.
  | (JSStatementCommon & {
      type: 'g3k:spawn'
      mold: string
      x: number | JSExpr
      y: number | JSExpr
      z: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g3k:spawnNamed'
      varName: string
      mold: string
      x: number | JSExpr
      y: number | JSExpr
      z: number | JSExpr
    })
  // Nasce no lugar de outra entidade, virado igual (o tiro da torre).
  | (JSStatementCommon & { type: 'g3k:spawnFrom'; mold: string; fromVar: string })
  // `where`: 'edge' (beirada do mundo) | 'anywhere' (qualquer lugar do chão).
  | (JSStatementCommon & {
      type: 'g3k:startSpawner'
      mold: string
      seconds: number | JSExpr
      where: string
    })
  | (JSStatementCommon & { type: 'g3k:stopSpawner'; mold: string })
  | (JSStatementCommon & {
      type: 'g3k:forEachAlive'
      mold: string
      itemName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'g3k:recycle'; charVar: string })
  | (JSStatementCommon & { type: 'g3k:recycleAll'; mold: string })
  | (JSStatementCommon & { type: 'g3k:cullFar'; mold: string; dist: number | JSExpr })
  // 🕹️ Laço e teclas (o dt de moveWithKeys é interno — menos um campo de erro).
  | (JSStatementCommon & { type: 'g3k:onUpdate'; dtName: string; body: JSStatement[] })
  | (JSStatementCommon & { type: 'g3k:moveWithKeys'; charVar: string; speed: number | JSExpr })
  | (JSStatementCommon & { type: 'g3k:setPauseKey'; key: string })
  // 🎥 Câmera viva (um modo por vez).
  | (JSStatementCommon & {
      type: 'g3k:cameraFollow'
      charVar: string
      dist: number | JSExpr
      height: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3k:cameraOrbit'; dist: number | JSExpr })
  | (JSStatementCommon & { type: 'g3k:cameraTop'; height: number | JSExpr })
  | (JSStatementCommon & { type: 'g3k:cameraAngle'; az: number | JSExpr; el: number | JSExpr })
  | (JSStatementCommon & { type: 'g3k:cameraDistance'; dist: number | JSExpr })
  | (JSStatementCommon & {
      type: 'g3k:cameraShake'
      strength: number | JSExpr
      seconds: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3k:cameraLens'; fov: number | JSExpr })
  | (JSStatementCommon & { type: 'g3k:cameraLookAt'; charVar: string })
  | (JSStatementCommon & {
      type: 'g3k:cameraLookAtPoint'
      x: number | JSExpr
      y: number | JSExpr
      z: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3k:cameraSmooth'; lambda: number | JSExpr })
  // 🤖 Entidades (transform + velocidade integrada pelo motor).
  | (JSStatementCommon & {
      type: 'g3k:place'
      charVar: string
      x: number | JSExpr
      y: number | JSExpr
      z: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3k:setYaw'; charVar: string; degrees: number | JSExpr })
  | (JSStatementCommon & {
      type: 'g3k:setVelocity'
      charVar: string
      x: number | JSExpr
      y: number | JSExpr
      z: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3k:setDrag'; charVar: string; drag: number | JSExpr })
  | (JSStatementCommon & {
      type: 'g3k:setEntityValue'
      charVar: string
      key: string
      value: JSExpr
    })
  | (JSStatementCommon & { type: 'g3k:lookAt'; charVar: string; targetVar: string })
  | (JSStatementCommon & { type: 'g3k:moveForward'; charVar: string; speed: number | JSExpr })
  // 🏃 Física: gravidade/pulo/plataforma + molde sólido (parede/chão).
  | (JSStatementCommon & { type: 'g3k:fall'; charVar: string; g: number | JSExpr })
  | (JSStatementCommon & { type: 'g3k:jump'; charVar: string; force: number | JSExpr })
  | (JSStatementCommon & { type: 'g3k:makeSolid'; mold: string })
  | (JSStatementCommon & {
      type: 'g3k:platformerKeys'
      charVar: string
      speed: number | JSExpr
      jump: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3k:setCollider'; mold: string; shape: string })
  | (JSStatementCommon & { type: 'g3k:setPhysics'; mold: string; kind: string })
  | (JSStatementCommon & { type: 'g3k:playAnim'; charVar: string; clip: string; loop: boolean })
  | (JSStatementCommon & { type: 'g3k:stopAnim'; charVar: string })
  | (JSStatementCommon & { type: 'g3k:setStateAnim'; mold: string; state: string; clip: string })
  | (JSStatementCommon & { type: 'g3k:playMusic'; name: string })
  | (JSStatementCommon & { type: 'g3k:stopMusic' })
  | (JSStatementCommon & { type: 'g3k:startTimer'; seconds: number | JSExpr })
  | (JSStatementCommon & { type: 'g3k:stopTimer' })
  | (JSStatementCommon & { type: 'g3k:onTimerEnd'; body: JSStatement[] })
  | (JSStatementCommon & {
      type: 'g3k:say'
      charVar: string
      text: string | JSExpr
      seconds: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3k:hideSay'; charVar: string })
  | (JSStatementCommon & { type: 'g3k:passThrough'; charVar: string; ghost: boolean })
  // Barra de vida flutuante por MOLDE (projeta sobre cada entidade viva).
  | (JSStatementCommon & { type: 'g3k:showHealthBar'; mold: string; on: boolean })
  | (JSStatementCommon & { type: 'g3k:makeTrigger'; mold: string })
  | (JSStatementCommon & { type: 'g3k:setSeed'; seed: number | JSExpr })
  | (JSStatementCommon & {
      type: 'g3k:onOverlap'
      mold: string
      zoneName: string
      whoName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'g3k:setBounce'; mold: string; amount: number | JSExpr })
  | (JSStatementCommon & { type: 'g3k:setFriction'; mold: string; amount: number | JSExpr })
  // 💡 Luz & céu (atmosfera).
  | (JSStatementCommon & {
      type: 'g3k:addLight'
      color: string
      x: number | JSExpr
      y: number | JSExpr
      z: number | JSExpr
      intensity: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3k:setAmbient'; intensity: number | JSExpr })
  | (JSStatementCommon & {
      type: 'g3k:setFog'
      color: string
      near: number | JSExpr
      far: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3k:setSky'; top: string; bottom: string })
  | (JSStatementCommon & { type: 'g3k:setSkyPhoto'; photo: string })
  // 🖱️ Mira/clique no mundo: guardar a entidade sob o mouse + câmera 1ª pessoa.
  | (JSStatementCommon & { type: 'g3k:pick'; varName: string; mold: string })
  | (JSStatementCommon & { type: 'g3k:cameraFps'; charVar: string })
  | (JSStatementCommon & { type: 'g3k:moveFps'; charVar: string; speed: number | JSExpr })
  // 🌊 Emissores contínuos + atratores (partículas data-driven do curso).
  | (JSStatementCommon & {
      type: 'g3k:defineEmitter'
      name: string
      colorFrom: string
      colorTo: string
      sizeFrom: number | JSExpr
      sizeTo: number | JSExpr
      rate: number | JSExpr
      speed: number | JSExpr
      cone: number | JSExpr
      gravity: number | JSExpr
      glow: boolean
      curve: string
    })
  | (JSStatementCommon & {
      type: 'g3k:startEmitter'
      effect: string
      x: number | JSExpr
      y: number | JSExpr
      z: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3k:emitterOn'; effect: string; charVar: string })
  | (JSStatementCommon & { type: 'g3k:stopEmitter'; effect: string })
  | (JSStatementCommon & {
      type: 'g3k:addAttractor'
      effect: string
      x: number | JSExpr
      y: number | JSExpr
      z: number | JSExpr
      intensity: number | JSExpr
      radius: number | JSExpr
    })
  // 🚥 FSM por MOLDE: ganchos de entrar/ficar/sair + transição por tempo.
  | (JSStatementCommon & {
      type: 'g3k:onEnterEntityState'
      mold: string
      state: string
      itemName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & {
      type: 'g3k:onEntityStateUpdate'
      mold: string
      state: string
      itemName: string
      dtName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & {
      type: 'g3k:onExitEntityState'
      mold: string
      state: string
      itemName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'g3k:setEntityState'; charVar: string; state: string })
  | (JSStatementCommon & {
      type: 'g3k:stateTimer'
      mold: string
      state: string
      sec: number | JSExpr
      next: string
    })
  // 🎯 Comportamentos (a matemática do curso: seek e slerp de mira).
  | (JSStatementCommon & { type: 'g3k:seek'; charVar: string; targetVar: string })
  // Rumo a um PONTO fixo (patrulha/waypoint) — só XZ, o Y fica com a gravidade.
  | (JSStatementCommon & {
      type: 'g3k:seekPoint'
      charVar: string
      x: number | JSExpr
      z: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g3k:aimAt'
      charVar: string
      targetVar: string
      smooth: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3k:faceVelocity'; charVar: string })
  // 🕸️ Vizinhança pela grade espacial (nunca O(n²)).
  | (JSStatementCommon & {
      type: 'g3k:forEachNear'
      charVar: string
      mold: string
      radius: number | JSExpr
      itemName: string
      body: JSStatement[]
    })
  // `const NOME = SZGameKit3D.nearest('molde', ent)` — a mira da torre.
  | (JSStatementCommon & {
      type: 'g3k:storeNearest'
      varName: string
      mold: string
      charVar: string
    })
  // ❤️ Combate: i-frames internos; a derrota roda os ganchos e recolhe sozinha.
  | (JSStatementCommon & { type: 'g3k:hurt'; charVar: string; amount: number | JSExpr })
  | (JSStatementCommon & {
      type: 'g3k:onEntityDeath'
      mold: string
      itemName: string
      body: JSStatement[]
    })
  // 👹 Chefão: reagir a dano, curar e disparar em anel (bullet-hell na unha).
  | (JSStatementCommon & { type: 'g3k:heal'; charVar: string; amount: number | JSExpr })
  | (JSStatementCommon & {
      type: 'g3k:onHurt'
      mold: string
      itemName: string
      body: JSStatement[]
    })
  | (JSStatementCommon & {
      type: 'g3k:spawnRing'
      mold: string
      count: number | JSExpr
      fromVar: string
      speed: number | JSExpr
    })
  // 💥 Faíscas 3D (partículas data-driven: rampas de 2 chaves cor/tamanho).
  | (JSStatementCommon & {
      type: 'g3k:defineEffect'
      name: string
      count: number | JSExpr
      colorFrom: string
      colorTo: string
      spread: number | JSExpr
      sizeFrom: number | JSExpr
      sizeTo: number | JSExpr
      life: number | JSExpr
      gravity: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'g3k:burstAt'
      effect: string
      x: number | JSExpr
      y: number | JSExpr
      z: number | JSExpr
    })
  | (JSStatementCommon & { type: 'g3k:burstOn'; effect: string; charVar: string })
  // 🖼️ Telas & HUD (DOM injetado por JS, padrão gk).
  | (JSStatementCommon & {
      type: 'g3k:setScreenText'
      screen: string
      title: ScreenText
      text: ScreenText
      button: ScreenText
    })
  | (JSStatementCommon & {
      type: 'g3k:createScreen'
      name: string
      title: ScreenText
      text: ScreenText
    })
  | (JSStatementCommon & {
      type: 'g3k:addButton'
      screen: string
      label: ScreenText
      body: JSStatement[]
    })
  | (JSStatementCommon & { type: 'g3k:showScreen'; name: string })
  | (JSStatementCommon & { type: 'g3k:hideScreens' })
  // `slot`: top-left | top-center | top-right | bottom-left | bottom-right.
  | (JSStatementCommon & { type: 'g3k:hudText'; slot: string; text: ScreenText })
  // 🚦 Estados do jogo (entrar em 'jogando' fora da pausa RECOMEÇA a arena).
  | (JSStatementCommon & { type: 'g3k:setState'; name: string })
  | (JSStatementCommon & { type: 'g3k:onEnterState'; name: string; body: JSStatement[] })
  | (JSStatementCommon & { type: 'g3k:returnToMenu' })
  | (JSStatementCommon & { type: 'g3k:endGame' })
  // 📢 Avisos (event bus).
  | (JSStatementCommon & { type: 'g3k:onEvent'; event: string; body: JSStatement[] })
  | (JSStatementCommon & { type: 'g3k:emit'; event: string })
  // 🔊 Som (importado + sintetizado).
  | (JSStatementCommon & { type: 'g3k:loadSound'; name: string; asset: string })
  | (JSStatementCommon & { type: 'g3k:playSound'; name: string })
  | (JSStatementCommon & { type: 'g3k:playEffect'; fx: string })
  | (JSStatementCommon & { type: 'g3k:playTone'; freq: number | JSExpr; ms: number | JSExpr })
  // Mundo 3D (extensão world-3d): mundo aberto dirigível estilo folio —
  // terreno por ruído com altura consultável, carrinho arcade com molejo,
  // natureza instanciada com colisores, grama ao vento e efeitos de cinema.
  | (JSStatementCommon & { type: 'w3d:setup'; style: string; world: number | JSExpr })
  | (JSStatementCommon & { type: 'w3d:terrain'; h: number | JSExpr; s: number | JSExpr })
  | (JSStatementCommon & {
      type: 'w3d:flatten'
      x: number | JSExpr
      z: number | JSExpr
      r: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:path'
      x1: number | JSExpr
      z1: number | JSExpr
      x2: number | JSExpr
      z2: number | JSExpr
      w: number | JSExpr
    })
  | (JSStatementCommon & { type: 'w3d:water'; y: number | JSExpr; color: string })
  | (JSStatementCommon & { type: 'w3d:skyPhoto'; asset: string })
  | (JSStatementCommon & { type: 'w3d:start' })
  | (JSStatementCommon & { type: 'w3d:carBoost'; force: number | JSExpr })
  | (JSStatementCommon & { type: 'w3d:engineSound'; on: boolean })
  | (JSStatementCommon & { type: 'w3d:loadSound'; name: string; asset: string })
  | (JSStatementCommon & { type: 'w3d:playSound'; name: string })
  | (JSStatementCommon & { type: 'w3d:playMusic'; name: string })
  | (JSStatementCommon & { type: 'w3d:stopMusic' })
  | (JSStatementCommon & { type: 'w3d:hud'; text: number | JSExpr; corner: string })
  | (JSStatementCommon & { type: 'w3d:say'; text: number | JSExpr; secs: number | JSExpr })
  | (JSStatementCommon & {
      type: 'w3d:point'
      name: string
      x: number | JSExpr
      z: number | JSExpr
    })
  | (JSStatementCommon & { type: 'w3d:onPoint'; name: string; body: JSStatement[] })
  | (JSStatementCommon & {
      type: 'w3d:zone'
      name: string
      x: number | JSExpr
      z: number | JSExpr
      r: number | JSExpr
    })
  | (JSStatementCommon & { type: 'w3d:onZone'; name: string; body: JSStatement[] })
  | (JSStatementCommon & {
      type: 'w3d:totemText'
      x: number | JSExpr
      z: number | JSExpr
      title: string
      body: string
    })
  | (JSStatementCommon & {
      type: 'w3d:totemImage'
      x: number | JSExpr
      z: number | JSExpr
      image: string
      w: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:galleryCreate'
      x: number | JSExpr
      z: number | JSExpr
      title: string
    })
  | (JSStatementCommon & { type: 'w3d:galleryAdd'; image: string; caption: string })
  | (JSStatementCommon & {
      type: 'w3d:raceCreate'
      x: number | JSExpr
      z: number | JSExpr
      deg: number | JSExpr
      laps: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:raceCheckpoint'
      x: number | JSExpr
      z: number | JSExpr
      deg: number | JSExpr
    })
  | (JSStatementCommon & { type: 'w3d:raceOnStart'; body: JSStatement[] })
  | (JSStatementCommon & { type: 'w3d:raceOnCheckpoint'; body: JSStatement[] })
  | (JSStatementCommon & { type: 'w3d:raceOnFinish'; body: JSStatement[] })
  | (JSStatementCommon & {
      type: 'w3d:bowlingCreate'
      x: number | JSExpr
      z: number | JSExpr
      deg: number | JSExpr
    })
  | (JSStatementCommon & { type: 'w3d:bowlingReset' })
  | (JSStatementCommon & { type: 'w3d:bowlingOnStrike'; body: JSStatement[] })
  | (JSStatementCommon & {
      type: 'w3d:stack'
      n: number | JSExpr
      thing: string
      x: number | JSExpr
      z: number | JSExpr
    })
  | (JSStatementCommon & { type: 'w3d:car'; style: string; color: string })
  | (JSStatementCommon & {
      type: 'w3d:carStats'
      speed: number | JSExpr
      turn: number | JSExpr
      jump: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:carPlace'
      x: number | JSExpr
      z: number | JSExpr
      deg: number | JSExpr
    })
  | (JSStatementCommon & { type: 'w3d:grass'; amount: string })
  | (JSStatementCommon & { type: 'w3d:scatter'; n: number | JSExpr; thing: string })
  | (JSStatementCommon & {
      type: 'w3d:scatterModel'
      n: number | JSExpr
      model: string
      s: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:placeThing'
      thing: string
      x: number | JSExpr
      z: number | JSExpr
      s: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:placeModel'
      model: string
      x: number | JSExpr
      z: number | JSExpr
      s: number | JSExpr
      deg: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:clearArea'
      x: number | JSExpr
      z: number | JSExpr
      r: number | JSExpr
    })
  | (JSStatementCommon & { type: 'w3d:onCrash'; body: JSStatement[] })
  // Mundo 3D R11 "carrinho vivo": buzina (tecla H), luzes, marcas de pneu, pintura.
  | (JSStatementCommon & { type: 'w3d:horn' })
  | (JSStatementCommon & { type: 'w3d:onHorn'; body: JSStatement[] })
  | (JSStatementCommon & { type: 'w3d:carLights' })
  | (JSStatementCommon & { type: 'w3d:tireMarks'; on: boolean })
  | (JSStatementCommon & { type: 'w3d:carPaint'; paint: string })
  // Mundo 3D R12 "festa & céu dramático": confete/fogos, tornado, estação, nuvens.
  | (JSStatementCommon & { type: 'w3d:confetti' })
  | (JSStatementCommon & { type: 'w3d:fireworks' })
  | (JSStatementCommon & { type: 'w3d:tornado'; secs: number | JSExpr })
  | (JSStatementCommon & { type: 'w3d:season'; season: string })
  | (JSStatementCommon & { type: 'w3d:clouds'; amount: string })
  // Mundo 3D R13 "boliche & bagunça": empurráveis, letras físicas, explosivos.
  | (JSStatementCommon & {
      type: 'w3d:pushPlace'
      thing: string
      x: number | JSExpr
      z: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:pushScatter'
      n: number | JSExpr
      x: number | JSExpr
      z: number | JSExpr
      r: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:letters'
      word: string
      x: number | JSExpr
      z: number | JSExpr
      s: number | JSExpr
    })
  | (JSStatementCommon & { type: 'w3d:explosive'; x: number | JSExpr; z: number | JSExpr })
  | (JSStatementCommon & { type: 'w3d:onExplosion'; body: JSStatement[] })
  // Mundo 3D R14 "natureza acesa": cachoeira, poste, vaga-lumes, fogueira.
  | (JSStatementCommon & {
      type: 'w3d:waterfall'
      x: number | JSExpr
      z: number | JSExpr
      h: number | JSExpr
      deg: number | JSExpr
    })
  | (JSStatementCommon & { type: 'w3d:lamp'; x: number | JSExpr; z: number | JSExpr })
  | (JSStatementCommon & {
      type: 'w3d:city'
      x: number | JSExpr
      z: number | JSExpr
      size: string
      mode: string
    })
  | (JSStatementCommon & {
      type: 'w3d:stringLights'
      x1: number | JSExpr
      z1: number | JSExpr
      x2: number | JSExpr
      z2: number | JSExpr
    })
  | (JSStatementCommon & { type: 'w3d:traffic'; n: number | JSExpr; sem: string })
  | (JSStatementCommon & {
      type: 'w3d:district'
      kind: string
      x: number | JSExpr
      z: number | JSExpr
      size: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:roadGrid'
      layout: string
      x: number | JSExpr
      z: number | JSExpr
      size: number | JSExpr
      width: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:houseRow'
      n: number | JSExpr
      x1: number | JSExpr
      z1: number | JSExpr
      x2: number | JSExpr
      z2: number | JSExpr
      style: string
    })
  | (JSStatementCommon & { type: 'w3d:quality'; mode: string })
  | (JSStatementCommon & { type: 'w3d:inventoryGive'; item: string; n: number | JSExpr })
  | (JSStatementCommon & { type: 'w3d:inventoryRemove'; item: string; n: number | JSExpr })
  | (JSStatementCommon & {
      type: 'w3d:door'
      x: number | JSExpr
      z: number | JSExpr
      deg: number | JSExpr
      title: string
      body: string
      image: string
    })
  | (JSStatementCommon & {
      type: 'w3d:npcAsk'
      name: string
      question: string
      optA: string
      bodyA: JSStatement[]
      optB: string
      bodyB: JSStatement[]
    })
  | (JSStatementCommon & {
      type: 'w3d:crops'
      n: number | JSExpr
      kind: string
      x: number | JSExpr
      z: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:barn'
      x: number | JSExpr
      z: number | JSExpr
      deg: number | JSExpr
    })
  | (JSStatementCommon & { type: 'w3d:windmill'; x: number | JSExpr; z: number | JSExpr })
  | (JSStatementCommon & {
      type: 'w3d:fence'
      x1: number | JSExpr
      z1: number | JSExpr
      x2: number | JSExpr
      z2: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:animals'
      n: number | JSExpr
      kind: string
      x: number | JSExpr
      z: number | JSExpr
      r: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:crater'
      x: number | JSExpr
      z: number | JSExpr
      r: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:flag'
      x: number | JSExpr
      z: number | JSExpr
      color: string
    })
  | (JSStatementCommon & { type: 'w3d:rocket'; x: number | JSExpr; z: number | JSExpr })
  | (JSStatementCommon & { type: 'w3d:fireflies'; amount: string })
  | (JSStatementCommon & { type: 'w3d:campfire'; x: number | JSExpr; z: number | JSExpr })
  // Mundo 3D R15 "personagem a pé": rig procedural + entrar/sair do veículo.
  | (JSStatementCommon & { type: 'w3d:person'; color: string; hat: string })
  | (JSStatementCommon & {
      type: 'w3d:personStats'
      walk: number | JSExpr
      run: number | JSExpr
      jump: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:personPlace'
      x: number | JSExpr
      z: number | JSExpr
      deg: number | JSExpr
    })
  | (JSStatementCommon & { type: 'w3d:personAccessory'; acc: string })
  | (JSStatementCommon & { type: 'w3d:personEmote'; emote: string })
  | (JSStatementCommon & { type: 'w3d:onVehicle'; when: string; body: JSStatement[] })
  // Mundo 3D R16 "ilha & barco": arquipélago, barco, ponte, farol, ambiente.
  | (JSStatementCommon & { type: 'w3d:islands'; n: number | JSExpr; y: number | JSExpr })
  | (JSStatementCommon & { type: 'w3d:boat'; color: string })
  | (JSStatementCommon & {
      type: 'w3d:bridge'
      x1: number | JSExpr
      z1: number | JSExpr
      x2: number | JSExpr
      z2: number | JSExpr
      w: number | JSExpr
    })
  | (JSStatementCommon & { type: 'w3d:lighthouse'; x: number | JSExpr; z: number | JSExpr })
  | (JSStatementCommon & { type: 'w3d:ambience'; kind: string })
  // Mundo 3D R17 "amigos": NPCs com perambulação e conversa em fila.
  | (JSStatementCommon & {
      type: 'w3d:npc'
      name: string
      x: number | JSExpr
      z: number | JSExpr
      color: string
      hat: string
    })
  | (JSStatementCommon & { type: 'w3d:npcWander'; name: string; r: number | JSExpr })
  | (JSStatementCommon & { type: 'w3d:npcTalk'; name: string; body: JSStatement[] })
  | (JSStatementCommon & { type: 'w3d:npcSay'; name: string; text: string })
  | (JSStatementCommon & { type: 'w3d:npcEmote'; name: string; emote: string })
  // Mundo 3D R18 "moedas & missões": coleta, objetivos, marcadores, seta-guia.
  | (JSStatementCommon & { type: 'w3d:coinsScatter'; n: number | JSExpr })
  | (JSStatementCommon & {
      type: 'w3d:coinsRing'
      n: number | JSExpr
      x: number | JSExpr
      z: number | JSExpr
      r: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:coinsLine'
      n: number | JSExpr
      x1: number | JSExpr
      z1: number | JSExpr
      x2: number | JSExpr
      z2: number | JSExpr
    })
  | (JSStatementCommon & { type: 'w3d:onCollect'; body: JSStatement[] })
  | (JSStatementCommon & { type: 'w3d:quest'; name: string; desc: string })
  | (JSStatementCommon & { type: 'w3d:questDone'; name: string })
  | (JSStatementCommon & { type: 'w3d:onQuestDone'; name: string; body: JSStatement[] })
  | (JSStatementCommon & {
      type: 'w3d:marker'
      icon: string
      x: number | JSExpr
      z: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:guideArrow'
      x: number | JSExpr
      z: number | JSExpr
      on: boolean
    })
  // Mundo 3D R19 "sistemas locais": conquistas, minimapa, pódio, recados.
  | (JSStatementCommon & { type: 'w3d:achievement'; name: string })
  | (JSStatementCommon & { type: 'w3d:onAchievement'; name: string; body: JSStatement[] })
  | (JSStatementCommon & { type: 'w3d:minimap'; mode: string })
  | (JSStatementCommon & { type: 'w3d:racePodium' })
  | (JSStatementCommon & {
      type: 'w3d:whisperCorner'
      x: number | JSExpr
      z: number | JSExpr
    })
  | (JSStatementCommon & {
      type: 'w3d:flameNote'
      x: number | JSExpr
      z: number | JSExpr
      text: string
    })
  | (JSStatementCommon & { type: 'w3d:cameraMode'; mode: string })
  | (JSStatementCommon & {
      type: 'w3d:cameraShake'
      force: number | JSExpr
      secs: number | JSExpr
    })
  | (JSStatementCommon & { type: 'w3d:effects'; on: boolean; strength: number | JSExpr })
  | (JSStatementCommon & { type: 'w3d:dayNight'; minutes: number | JSExpr })
  | (JSStatementCommon & { type: 'w3d:setTime'; time: string })
  | (JSStatementCommon & { type: 'w3d:weather'; kind: string })
  | (JSStatementCommon & { type: 'w3d:wind'; force: number | JSExpr })
  | (JSStatementCommon & { type: 'w3d:onDayNight'; when: string; body: JSStatement[] })
  | (JSStatementCommon & { type: 'w3d:onUpdate'; dtName: string; body: JSStatement[] })
  // Orientação a objetos
  | (JSStatementCommon & {
      type: 'classDecl'
      name: string
      /** Classe-mãe (`class X extends Base`). Ausente = sem herança. */
      superClass?: string
      /** Parâmetros do construtor (ex.: `['nome', 'idade']`). Vazio/ausente = construtor sem args. */
      ctorParams?: string[]
      /**
       * Id do bloco `sz_js_constructor` que originou este construtor. Permite
       * o realce bloco↔código apontar para a faixa `constructor(...) { … }`
       * no Monaco. Ausente quando o IR foi reconstruído a partir do texto.
       */
      ctorId?: string
      /** Corpo livre do construtor (inclui `this.x = v` via `setThisProp`). */
      ctorBody: JSStatement[]
      methods: Array<{
        /** Id do bloco `sz_js_class_method` correspondente, quando conhecido. */
        __id?: string
        name: string
        params: string[]
        body: JSStatement[]
        /** Método `async` (habilita `await` no corpo). */
        async?: boolean
      }>
    })
  | (JSStatementCommon & {
      type: 'newInstance'
      varName: string
      className: string
      /** Argumentos passados ao construtor (`new Classe(args)`). */
      args?: JSExpr[]
      /** Namespace de biblioteca (`const s = new THREE.Scene()` → 'THREE'). */
      namespace?: string
    })
  | (JSStatementCommon & {
      type: 'callMethod'
      objectVar: string
      method: string
      /** Argumentos passados ao método (`obj.metodo(args)`). */
      args?: JSExpr[]
    })
  // Registra um listener que aponta para uma função nomeada (`el.addEventListener('click', fn)`).
  | (JSStatementCommon & {
      type: 'eventHandler'
      target: string
      targetKind?: 'id' | 'var' | 'document' | 'window'
      event: EventKind
      handlerName: string
    })
  // Escreve a própria propriedade dentro de um método/construtor (this.nome = v).
  | (JSStatementCommon & { type: 'setThisProp'; name: string; value: JSExpr })
  // Escreve a propriedade de um objeto/instância (obj.nome = v).
  | (JSStatementCommon & { type: 'setProp'; objectVar: string; name: string; value: JSExpr })
  // Escreve a propriedade de qualquer valor (objeto = expressão; cobre this.velocidade.x = v).
  | (JSStatementCommon & { type: 'memberSet'; object: JSExpr; name: string; value: JSExpr })
  // Escreve um item por chave/índice (`obj[chave] = v` / `lista[i] = v`).
  | (JSStatementCommon & { type: 'indexSet'; object: JSExpr; index: JSExpr; value: JSExpr })
  // Roda o corpo quando uma imagem termina de carregar (`img.onload = () => {…}`).
  | (JSStatementCommon & { type: 'imageOnLoad'; target: JSExpr; body: JSStatement[] })
  // Roda o corpo quando o elemento for clicado (`el.onclick = () => {…}`).
  | (JSStatementCommon & { type: 'onClickAssign'; target: JSExpr; body: JSStatement[] })
  // `await <valor>;` — espera uma promessa terminar (só dentro de método async).
  | (JSStatementCommon & { type: 'awaitStmt'; value: JSExpr })
  // `setTimeout(<fn>, <ms>)` passando uma FUNÇÃO por nome (ex.: `setTimeout(resolve, 2000)`).
  | (JSStatementCommon & { type: 'setTimeoutCall'; fn: string; delay: JSExpr })
  // Roda o corpo se a imagem FALHAR ao carregar (`img.onerror = () => {…}`).
  | (JSStatementCommon & { type: 'imageOnError'; target: JSExpr; body: JSStatement[] })
  // Pede o próximo quadro rodando um corpo inline com o tempo (`requestAnimationFrame((t) => {…})`).
  | (JSStatementCommon & { type: 'requestFrameDo'; param?: string; body: JSStatement[] })
  // Canvas 3D: carregar um recurso async (`loader.load(url, (modelo) => { … })`).
  // `loaderVar` = a var do carregador; `param` = o nome do recurso no corpo.
  | (JSStatementCommon & {
      type: 'loaderLoad'
      /** Papel do carregador. Ausente em snapshots antigos significa modelo. */
      resourceKind?: 'model' | 'audio'
      loaderVar: string
      url: JSExpr
      param: string
      body: JSStatement[]
      errorParam?: string
      errorBody?: JSStatement[]
    })
  // Canvas 3D: percorrer cada parte de um objeto/modelo (`obj.traverse((parte) => { … })`).
  // `object` = o objeto (var ou propriedade, ex.: modelo.scene); `param` = o nome da parte.
  | (JSStatementCommon & {
      type: 'traverseEach'
      object: JSExpr
      param: string
      body: JSStatement[]
    })
  // Canvas 3D: modernização do renderizador em 1 bloco (forward-only) — cada campo
  // vira a grafia ATUAL do three.js (setPixelRatio / shadowMap.type /
  // outputColorSpace / toneMapping); 'off' = não mexer. A Ponte reversa devolve os
  // memberSet/memberCall genéricos (o parser não reconstrói este nó).
  | (JSStatementCommon & {
      type: 'threeSceneSetup'
      scene: string
    })
  | (JSStatementCommon & {
      type: 'threeRendererSetup'
      renderer: string
      canvas: string
    })
  | (JSStatementCommon & {
      type: 'threeCameraSetup'
      camera: string
      canvas: string
      fov: JSExpr
      near: JSExpr
      far: JSExpr
    })
  | (JSStatementCommon & {
      type: 'threeLightSetup'
      light: string
      scene: string
      kind: 'ambient' | 'directional'
      color: JSExpr
      intensity: JSExpr
    })
  | (JSStatementCommon & {
      type: 'rendererConfig'
      renderer: string
      pixels: 'device' | 'off'
      shadows: 'soft' | 'hard' | 'off'
      colorSpace: 'srgb' | 'off'
      toneMapping: 'aces' | 'off'
    })
  | (JSStatementCommon & {
      type: 'rendererResponsive'
      renderer: string
      camera: string
      composer?: string
      cleanup: string
    })
  | (JSStatementCommon & {
      type: 'environmentLoad'
      scene: string
      url: string
      texture: string
      background: boolean
    })
  | (JSStatementCommon & { type: 'disposeObject'; object: string })
  | (JSStatementCommon & {
      type: 'lerpPosition'
      object: string
      target: JSExpr
      alpha: JSExpr
      dt: JSExpr
    })
  // Canvas 3D: macro de efeito BRILHO (bloom) — 1 bloco que arma o EffectComposer +
  // RenderPass + UnrealBloomPass + OutputPass (grafia atual, forward-only). `composer`
  // = a var do composer; strength/radius/threshold = os botões (sockets de valor).
  | (JSStatementCommon & {
      type: 'bloomSetup'
      composer: string
      renderer: string
      scene: string
      camera: string
      strength: JSExpr
      radius: JSExpr
      threshold: JSExpr
    })
  // Canvas 3D: macro de EFEITO partículas — 1 bloco que cria um sistema de pontos
  // (BufferGeometry aleatória + PointsMaterial + Points), forward-only. `particles`
  // = a var do Points; count/size/spread/color = os botões (sockets).
  | (JSStatementCommon & {
      type: 'particlesSetup'
      particles: string
      scene: string
      count: JSExpr
      size: JSExpr
      spread: JSExpr
      color: JSExpr
    })
  // Canvas 3D: macro de EFEITO água — 1 bloco que cria um plano d'água (addon Water
  // + normal map procedural), forward-only. `water` = a var; size/color = os botões.
  | (JSStatementCommon & {
      type: 'waterSetup'
      water: string
      scene: string
      size: JSExpr
      color: JSExpr
    })
  // Canvas 3D: fazer a água ondular (atualiza o uniform `time` no laço) — companheiro
  // do waterSetup.
  | (JSStatementCommon & { type: 'waterTime'; water: string; dt?: JSExpr })
  // Canvas 3D: macro de EFEITO grama — 1 bloco que cria um campo de grama INSTANCIADA
  // com shader de vento (GLSL escondido), forward-only. `grass` = a var; count/size/
  // spread/color = os botões.
  | (JSStatementCommon & {
      type: 'grassSetup'
      grass: string
      scene: string
      count: JSExpr
      size: JSExpr
      spread: JSExpr
      color: JSExpr
    })
  // Canvas 3D: fazer a grama balançar (avança o uniform `time` no laço) — companheiro
  // do grassSetup.
  | (JSStatementCommon & { type: 'grassTime'; grass: string; dt?: JSExpr })
  // Canvas 3D: macro LETREIRO 3D — 1 bloco que desenha um texto num canvas oculto,
  // vira CanvasTexture num plano transparente da cena (o jeito FOLIO de texto no
  // mundo: canvas 2D → textura, nunca TextGeometry), forward-only. `sign` = a var
  // do plano; `text` é CAMPO (letreiro é estático); size/color = botões (sockets).
  | (JSStatementCommon & {
      type: 'signSetup'
      sign: string
      scene: string
      text: string
      size: JSExpr
      color: JSExpr
    })
  // Canvas 3D: receitas procedurais com primitivas. São macros forward-only que
  // expandem para Three.js legível e não dependem de extensão/runtime externo.
  | (JSStatementCommon & {
      type: 'primitiveSetup'
      mesh: string
      scene: string
      shape: 'box' | 'sphere' | 'cylinder' | 'cone' | 'capsule'
      width: JSExpr
      height: JSExpr
      depth: JSExpr
      color: JSExpr
    })
  | (JSStatementCommon & {
      type: 'terrainSetup'
      terrain: string
      scene: string
      heightFunction: string
      size: JSExpr
      segments: JSExpr
      hills: JSExpr
      smooth: JSExpr
      color: JSExpr
    })
  | (JSStatementCommon & {
      type: 'roadSetup'
      road: string
      scene: string
      x1: JSExpr
      z1: JSExpr
      x2: JSExpr
      z2: JSExpr
      width: JSExpr
      color: JSExpr
      heightFunction?: string
      segments?: JSExpr
    })
  | (JSStatementCommon & {
      type: 'buildingSetup'
      building: string
      scene: string
      x: JSExpr
      z: JSExpr
      width: JSExpr
      height: JSExpr
      depth: JSExpr
      color: JSExpr
      roofColor: JSExpr
      heightFunction?: string
    })
  | (JSStatementCommon & {
      type: 'citySetup'
      city: string
      scene: string
      heightFunction: string
      blocksX: JSExpr
      blocksZ: JSExpr
      spacing: JSExpr
      roadWidth: JSExpr
      minHeight: JSExpr
      maxHeight: JSExpr
      seed: JSExpr
      color: JSExpr
      roofColor: JSExpr
    })
  // Canvas 3D: fachada de blocos para o kernel físico próprio. O gerador injeta
  // a implementação somente quando encontra `physicsLiteSetup`.
  | (JSStatementCommon & {
      type: 'physicsLiteSetup'
      world: string
      heightFunction: string
      gravity: JSExpr
      maxSubSteps: JSExpr
    })
  | (JSStatementCommon & {
      type: 'physicsLiteStaticBox'
      world: string
      id: string
      x: JSExpr
      y: JSExpr
      z: JSExpr
      width: JSExpr
      height: JSExpr
      depth: JSExpr
    })
  | (JSStatementCommon & {
      type: 'physicsLiteStaticSphere'
      world: string
      id: string
      x: JSExpr
      y: JSExpr
      z: JSExpr
      radius: JSExpr
    })
  | (JSStatementCommon & {
      type: 'physicsLiteStaticObject'
      world: string
      id: string
      object: string
    })
  | (JSStatementCommon & {
      type: 'physicsLiteStaticCity'
      world: string
      city: string
      prefix: string
    })
  | (JSStatementCommon & {
      type: 'physicsLiteBody'
      world: string
      object: string
      id: string
      kind: 'character' | 'dynamic'
      width: JSExpr
      height: JSExpr
      depth: JSExpr
      friction: JSExpr
      bounce: JSExpr
    })
  | (JSStatementCommon & {
      type: 'physicsLiteMove'
      world: string
      id: string
      x: JSExpr
      z: JSExpr
      speed: JSExpr
    })
  | (JSStatementCommon & {
      type: 'physicsLiteJump'
      world: string
      id: string
      speed: JSExpr
    })
  | (JSStatementCommon & {
      type: 'physicsLiteTrigger'
      world: string
      id: string
      x: JSExpr
      y: JSExpr
      z: JSExpr
      width: JSExpr
      height: JSExpr
      depth: JSExpr
    })
  | (JSStatementCommon & { type: 'physicsLiteStep'; world: string; dt: JSExpr })
  | (JSStatementCommon & {
      type: 'physicsLiteVelocity' | 'physicsLiteImpulse' | 'physicsLiteTeleport'
      world: string
      id: string
      x: JSExpr
      y: JSExpr
      z: JSExpr
    })
  | (JSStatementCommon & { type: 'physicsLiteRemove'; world: string; id: string })
  | (JSStatementCommon & { type: 'physicsLiteClear'; world: string })
  | (JSStatementCommon & {
      type: 'physicsLiteCollisionEvent'
      world: string
      bodyParam: string
      colliderParam: string
      body: JSStatement[]
    })
  | (JSStatementCommon & {
      type: 'physicsLiteTriggerEvent'
      world: string
      bodyParam: string
      triggerParam: string
      enteringParam: string
      body: JSStatement[]
    })
  | (JSStatementCommon & {
      type: 'physicsLiteRaycast'
      world: string
      result: string
      ox: JSExpr
      oy: JSExpr
      oz: JSExpr
      dx: JSExpr
      dy: JSExpr
      dz: JSExpr
      maxDistance: JSExpr
    })
  | (JSStatementCommon & {
      type: 'physicsLiteBodyState'
      world: string
      result: string
      id: string
    })
  | (JSStatementCommon & { type: 'physicsLiteStats'; world: string; result: string })
  // Chamada de método como comando sobre qualquer objeto (object.metodo(args);).
  | (JSStatementCommon & { type: 'memberCall'; object: JSExpr; method: string; args: JSExpr[] })
  // Chamada do construtor da classe-mãe dentro do construtor filho (`super(args);`).
  | (JSStatementCommon & { type: 'superCall'; args: JSExpr[] })
  // Chamada de um método da classe-mãe (`super.metodo(args);`).
  | (JSStatementCommon & { type: 'superMethodCall'; method: string; args: JSExpr[] })
  // Statement que só AVALIA um valor e descarta (`this.game.gameOver;`). Raro —
  // usado p/ round-trip fiel de código que lê algo sem usar (bloco oculto).
  | (JSStatementCommon & { type: 'exprStatement'; value: JSExpr })
  // Pede o próximo quadro chamando uma função (`requestAnimationFrame(nome);`).
  | (JSStatementCommon & { type: 'requestFrame'; fn: string })
  // Canvas 3D: monta a tela do renderizador no corpo da página
  // (`document.body.appendChild(renderer.domElement);`). `renderer` = nome da var.
  | (JSStatementCommon & { type: 'mountRenderer'; renderer: string })
  // Retorno de um método (`return v;`) ou saída antecipada (`return;`).
  | (JSStatementCommon & { type: 'return'; value?: JSExpr })
  // Função nomeada de topo (`function nome(params) { ... }`).
  | (JSStatementCommon & {
      type: 'funcDecl'
      name: string
      params: string[]
      async?: boolean
      body: JSStatement[]
    })
  // Chamada de função como comando (`nome(args);`).
  | (JSStatementCommon & { type: 'callFunction'; name: string; args: JSExpr[] })
  // Para cada item (com posição opcional) de uma lista (`<lista>.forEach((item, i) => {…})`).
  // A lista é uma EXPRESSÃO (variável, `Object.keys(x)`, `obj.lista`…), não só um nome.
  | (JSStatementCommon & {
      type: 'forEach'
      arrayExpr: JSExpr
      itemName: string
      indexName?: string
      body: JSStatement[]
    })
  // Criar uma imagem com fonte (`const v = new Image(); v.src = <fonte>;`).
  | (JSStatementCommon & { type: 'newImage'; varName: string; src: JSExpr })
  // Executar depois de um tempo (`setTimeout(() => {…}, ms)`).
  | (JSStatementCommon & { type: 'setTimeout'; delay: JSExpr; body: JSStatement[] })
  // Repetir a cada intervalo de tempo (`setInterval(() => {…}, ms)`).
  | (JSStatementCommon & { type: 'setInterval'; delay: JSExpr; body: JSStatement[] })
  // Versões em SEGUNDOS: geram `setTimeout/Interval(() => {…}, <delay> * 1000)`.
  // `delay` = segundos; o `* 1000` no código é o que distingue do ms no round-trip.
  | (JSStatementCommon & { type: 'setTimeoutSeconds'; delay: JSExpr; body: JSStatement[] })
  | (JSStatementCommon & { type: 'setIntervalSeconds'; delay: JSExpr; body: JSStatement[] })
  // Escape hatch
  | (JSStatementCommon & { type: 'rawJS'; code: string; advanced: true })

export const JSStatementSchema: z.ZodType<JSStatement> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('var'),
      name: irText(),
      value: JSExprSchema,
      kind: z.enum(['let', 'const']).optional(),
      ...idField,
    }),
    z.object({ type: z.literal('declareVar'), name: irText(), ...idField }),
    z.object({ type: z.literal('assign'), name: irText(), value: JSExprSchema, ...idField }),
    z.object({
      type: z.literal('if'),
      cond: JSExprSchema,
      then: z.array(JSStatementSchema),
      elseif: z
        .array(z.object({ cond: JSExprSchema, then: z.array(JSStatementSchema) }))
        .optional(),
      else: z.array(JSStatementSchema).optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('repeat'),
      times: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('while'),
      cond: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('doWhile'),
      cond: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('break'), ...idField }),
    z.object({ type: z.literal('continue'), ...idField }),
    z.object({ type: z.literal('importStar'), name: irText(), module: irText(), ...idField }),
    z
      .object({
        type: z.literal('importNamed'),
        names: z.array(irText()),
        module: irText().refine(
          (module) => module.trim().length > 0 && module !== CANVAS3D_AUTO_ADDON_MODULE,
          {
            message: 'Informe o caminho do addon que não está no catálogo automático',
          },
        ),
        ...idField,
      })
      .refine((statement) => isCanvas3DAddonImportCanonical(statement.names, statement.module), {
        message: 'Cada addon conhecido precisa usar o arquivo correto da biblioteca',
        path: ['module'],
      }),
    z.object({
      type: z.literal('forOf'),
      itemName: irText(),
      iterableVar: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('forRange'),
      varName: irText(),
      from: JSExprSchema,
      to: JSExprSchema,
      step: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('tryCatch'),
      body: z.array(JSStatementSchema),
      errorName: irText().optional(),
      handler: z.array(JSStatementSchema),
      finalizer: z.array(JSStatementSchema).optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('fetchJson'),
      url: JSExprSchema,
      okName: irText(),
      body: z.array(JSStatementSchema),
      catchName: irText().optional(),
      catchBody: z.array(JSStatementSchema).optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('event'),
      target: irText(),
      targetKind: z.enum(['id', 'var', 'document', 'window']).optional(),
      event: eventKindSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('consoleLog'), value: JSExprSchema, ...idField }),
    z.object({ type: z.literal('alert'), value: JSExprSchema, ...idField }),
    z.object({
      type: z.literal('setText'),
      targetId: irText(),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('setProperty'),
      targetId: irText(),
      targetKind: z.enum(['id', 'var']).optional(),
      property: z.enum(['textContent', 'value', 'innerHTML']),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('getProperty'),
      targetId: irText(),
      targetKind: z.enum(['id', 'var']).optional(),
      property: z.enum(['textContent', 'value', 'innerHTML']),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('setStyle'),
      targetId: irText(),
      targetKind: z.enum(['id', 'var', 'this']).optional(),
      property: irText(),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('setAttribute'),
      targetId: irText(),
      targetKind: z.enum(['id', 'var', 'this']).optional(),
      name: irText(),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('createElement'),
      tag: guidedDomTag('html'),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('createElementNS'),
      tag: guidedDomTag('svg'),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('getAttribute'),
      targetId: irText(),
      targetKind: z.enum(['id', 'var']).optional(),
      name: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('appendChild'),
      parentVar: irText(),
      childVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('throwError'), message: JSExprSchema, ...idField }),
    z.object({
      type: z.literal('objectAssign'),
      targetVar: irText(),
      sourceVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('switch'),
      subject: JSExprSchema,
      cases: z.array(
        z.object({ match: JSExprSchema, body: z.array(JSStatementSchema), ...idField }),
      ),
      default: z.array(JSStatementSchema).optional(),
      ...idField,
    }),
    z.object({ type: z.literal('requestFullscreen'), ...idField }),
    z.object({ type: z.literal('exitFullscreen'), ...idField }),
    z.object({ type: z.literal('toggleFullscreen'), ...idField }),
    z.object({
      type: z.literal('setDataset'),
      targetId: irText(),
      targetKind: z.enum(['id', 'var']).optional(),
      key: irText(),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('querySelector'),
      selector: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('querySelectorAll'),
      selector: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('storageSet'),
      store: z.enum(['local', 'session']),
      key: JSExprSchema,
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('eventMethod'),
      method: z.enum(['preventDefault', 'stopPropagation']),
      ...idField,
    }),
    z.object({
      type: z.literal('getElementById'),
      id: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('classOp'),
      targetId: irText(),
      targetKind: z.enum(['id', 'var', 'this']).optional(),
      op: z.enum(['add', 'remove', 'toggle']),
      className: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('canvasSetup'),
      canvasId: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('canvasSetSize'),
      ctxVar: irText(),
      w: JSExprSchema,
      h: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasClear'),
      ctxVar: irText(),
      // Campo legado e redundante. Projetos antigos continuam válidos, mas a IR
      // canônica nova usa somente ctxVar para localizar a tela correspondente.
      canvasVar: irText().optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('canvasFillStyle'),
      ctxVar: irText(),
      color: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasFillRect'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      w: JSExprSchema,
      h: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasArc'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      r: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasFillText'),
      ctxVar: irText(),
      text: JSExprSchema,
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasStrokeRect'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      w: JSExprSchema,
      h: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasClearRect'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      w: JSExprSchema,
      h: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasRoundRect'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      w: JSExprSchema,
      h: JSExprSchema,
      r: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasEllipse'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      rx: JSExprSchema,
      ry: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasArcSlice'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      r: JSExprSchema,
      start: JSExprSchema,
      end: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasQuadraticCurve'),
      ctxVar: irText(),
      cpx: JSExprSchema,
      cpy: JSExprSchema,
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasBezierCurve'),
      ctxVar: irText(),
      cp1x: JSExprSchema,
      cp1y: JSExprSchema,
      cp2x: JSExprSchema,
      cp2y: JSExprSchema,
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasArcTo'),
      ctxVar: irText(),
      x1: JSExprSchema,
      y1: JSExprSchema,
      x2: JSExprSchema,
      y2: JSExprSchema,
      r: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasShadow'),
      ctxVar: irText(),
      color: JSExprSchema,
      blur: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasStrokeText'),
      ctxVar: irText(),
      text: JSExprSchema,
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasLineDash'),
      ctxVar: irText(),
      segment: JSExprSchema,
      ...idField,
    }),

    z.object({
      type: z.literal('animationLoop'),
      body: z.array(JSStatementSchema),
      handle: irText().optional(),
      timeVar: irText().optional(),
      deltaVar: irText().optional(),
      ...idField,
    }),
    z.object({ type: z.literal('cancelAnimationFrame'), handle: JSExprSchema, ...idField }),
    z.object({ type: z.literal('keyboardSimple'), varName: irText(), ...idField }),
    z.object({
      type: z.literal('arrayPush'),
      arrayVar: irText(),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('arraySplice'),
      arrayVar: irText(),
      start: JSExprSchema,
      count: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('arrayRemove'),
      arrayVar: irText(),
      end: z.enum(['pop', 'shift']),
      ...idField,
    }),
    z.object({
      type: z.literal('canvasDrawImage'),
      ctxVar: irText(),
      src: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      w: JSExprSchema,
      h: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('canvasSave'), ctxVar: irText(), ...idField }),
    z.object({ type: z.literal('canvasRestore'), ctxVar: irText(), ...idField }),
    z.object({
      type: z.literal('canvasTranslate'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasRotate'),
      ctxVar: irText(),
      angle: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasScale'),
      ctxVar: irText(),
      sx: JSExprSchema,
      sy: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasGradient'),
      ctxVar: irText(),
      varName: irText(),
      x0: JSExprSchema,
      y0: JSExprSchema,
      x1: JSExprSchema,
      y1: JSExprSchema,
      stops: z.array(z.object({ offset: z.number(), color: irText() })),
      ...idField,
    }),
    z.object({ type: z.literal('canvasBeginPath'), ctxVar: irText(), ...idField }),
    z.object({ type: z.literal('canvasClosePath'), ctxVar: irText(), ...idField }),
    z.object({ type: z.literal('canvasStroke'), ctxVar: irText(), ...idField }),
    z.object({ type: z.literal('canvasFill'), ctxVar: irText(), ...idField }),
    z.object({
      type: z.literal('canvasMoveTo'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasLineTo'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasRect'),
      ctxVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      w: JSExprSchema,
      h: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('canvasClip'), ctxVar: irText(), ...idField }),
    z.object({
      type: z.literal('canvasStrokeStyle'),
      ctxVar: irText(),
      color: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasLineWidth'),
      ctxVar: irText(),
      width: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasGlobalAlpha'),
      ctxVar: irText(),
      alpha: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('canvasFont'),
      ctxVar: irText(),
      weight: z.enum(['bold', 'italic', 'italic bold']).optional(),
      size: z.number(),
      family: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('canvasTextAlign'),
      ctxVar: irText(),
      align: z.enum(['left', 'center', 'right']),
      ...idField,
    }),
    z.object({
      type: z.literal('canvasTextBaseline'),
      ctxVar: irText(),
      baseline: z.enum(['top', 'middle', 'bottom', 'alphabetic']),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createSprite'),
      varName: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawSprite'),
      spriteVar: irText(),
      ctxVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setPosition'),
      spriteVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setVelocity'),
      spriteVar: irText(),
      vx: JSExprSchema,
      vy: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:collides'),
      aVar: irText(),
      bVar: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:score'),
      varName: irText(),
      initial: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:gameOver'),
      ctxVar: irText(),
      text: z.union([JSExprSchema, irText()]),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:clear'), ...idField }),
    z.object({
      type: z.literal('g2d:onKey'),
      key: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:onOverlap'),
      aVar: irText(),
      bVar: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:onJump'),
      spriteVar: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:onAnyInput'),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setGravity'),
      value: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:applyVelocity'), spriteVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:applyGravity'), spriteVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:bounceOnEdges'),
      spriteVar: irText(),
      ctxVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:circleCollides'),
      aVar: irText(),
      bVar: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:playSound'),
      freq: z.union([JSExprSchema, z.number()]),
      durationMs: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:playFx'),
      fx: z.string(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:playMusic'),
      tune: z.string(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:stopMusic'),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:playNote'),
      note: z.string(),
      ms: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:aimAt'),
      spriteVar: irText(),
      targetVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:moveToward'),
      spriteVar: irText(),
      targetVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setHealth'),
      spriteVar: irText(),
      amount: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:changeHealth'),
      spriteVar: irText(),
      delta: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:damageSprite'),
      spriteVar: irText(),
      amount: z.union([JSExprSchema, z.number()]),
      invincibilityFrames: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:flipSprite'),
      spriteVar: irText(),
      dir: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setOpacity'),
      spriteVar: irText(),
      percent: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setSize'),
      spriteVar: irText(),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:scaleSprite'),
      spriteVar: irText(),
      factor: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:wrapEdges'),
      spriteVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:pruneOld'),
      groupVar: irText(),
      seconds: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:pauseGame'), ...idField }),
    z.object({ type: z.literal('g2d:resumeGame'), ...idField }),
    z.object({
      type: z.literal('g2d:cameraFollow'),
      spriteVar: irText(),
      worldW: z.union([JSExprSchema, z.number()]),
      worldH: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setCamera'),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:breakTile'),
      mapVar: irText(),
      spriteVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setTile'),
      mapVar: irText(),
      index: z.union([JSExprSchema, z.number()]),
      spriteVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:bringToFront'),
      spriteVar: irText(),
      groupVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:sendToBack'),
      spriteVar: irText(),
      groupVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:drawHitbox'), spriteVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:showFps'),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:onPointer'),
      xName: irText(),
      yName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createImageSprite'),
      varName: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      image: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setImage'),
      spriteVar: irText(),
      image: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:defineShape'),
      shapeName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createShapeSprite'),
      varName: irText(),
      shapeName: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setShape'),
      spriteVar: irText(),
      shapeName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:paintRect'),
      ctxVar: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:paintCircle'),
      ctxVar: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      r: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:paintEllipse'),
      ctxVar: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:paintTriangle'),
      ctxVar: irText(),
      x1: z.union([JSExprSchema, z.number()]),
      y1: z.union([JSExprSchema, z.number()]),
      x2: z.union([JSExprSchema, z.number()]),
      y2: z.union([JSExprSchema, z.number()]),
      x3: z.union([JSExprSchema, z.number()]),
      y3: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:paintLine'),
      ctxVar: irText(),
      x1: z.union([JSExprSchema, z.number()]),
      y1: z.union([JSExprSchema, z.number()]),
      x2: z.union([JSExprSchema, z.number()]),
      y2: z.union([JSExprSchema, z.number()]),
      color: irText(),
      width: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:loadSpritesheet'),
      varName: irText(),
      image: irText(),
      frameW: z.union([JSExprSchema, z.number()]),
      frameH: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:animateSprite'),
      spriteVar: irText(),
      sheetVar: irText(),
      from: z.union([JSExprSchema, z.number()]),
      to: z.union([JSExprSchema, z.number()]),
      fps: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setStateAnim'),
      spriteVar: irText(),
      state: z.enum(G2D_ANIM_STATES),
      sheetVar: irText(),
      from: z.union([JSExprSchema, z.number()]),
      to: z.union([JSExprSchema, z.number()]),
      fps: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:autoAnimate'),
      spriteVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:defineEnemyType'),
      varName: irText(),
      behavior: z.enum(G2D_ENEMY_BEHAVIORS),
      color: irText(),
      image: irText(),
      shape: irText().optional(),
      hp: z.union([JSExprSchema, z.number()]),
      speed: z.union([JSExprSchema, z.number()]),
      dmg: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:enemyStateAnim'),
      typeVar: irText(),
      state: z.enum(G2D_ANIM_STATES),
      sheetVar: irText(),
      from: z.union([JSExprSchema, z.number()]),
      to: z.union([JSExprSchema, z.number()]),
      fps: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setEnemyTypeParam'),
      typeVar: irText(),
      param: z.enum(G2D_ENEMY_PARAMS),
      value: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:spawnEnemy'),
      typeVar: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:updateEnemyType'),
      typeVar: irText(),
      ctxVar: irText(),
      targetVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawEnemyType'),
      ctxVar: irText(),
      typeVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:onEnemyDefeated'),
      typeVar: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:onEnemyShotHit'),
      spriteVar: irText(),
      typeVar: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:hurtByEnemy'),
      spriteVar: irText(),
      enemyVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawFrame'),
      sheetVar: irText(),
      ctxVar: irText(),
      index: z.union([JSExprSchema, z.number()]),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:platformer'),
      spriteVar: irText(),
      ctxVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      jump: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:topDown'),
      spriteVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:flyFree'),
      spriteVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:flap'),
      spriteVar: irText(),
      ctxVar: irText(),
      force: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:swim'),
      spriteVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:followPointer'),
      spriteVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:clampToScreen'),
      spriteVar: irText(),
      ctxVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:flash'), color: irText(), ctxVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:shake'),
      ctxVar: irText(),
      intensity: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:emitParticles'),
      count: z.union([JSExprSchema, z.number()]),
      color: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:drawParticles'), ctxVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:createTileMap'),
      varName: irText(),
      image: irText(),
      tile: z.union([JSExprSchema, z.number()]),
      solid: irText(),
      platform: irText().optional(),
      grid: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createTileMapFromAsset'),
      varName: irText(),
      image: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawTileMap'),
      mapVar: irText(),
      ctxVar: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      // Opcional: IR salvo antes do campo "tamanho do tile" não o tem.
      size: z.union([JSExprSchema, z.number()]).optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:tileMapCollide'),
      spriteVar: irText(),
      mapVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:collideGroup'),
      spriteVar: irText(),
      groupVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:collideSprite'),
      spriteVar: irText(),
      otherVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:createGroup'), varName: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:spawnInGroup'),
      groupVar: irText(),
      varName: irText().optional(),
      x: JSExprSchema,
      y: JSExprSchema,
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      color: irText(),
      vx: JSExprSchema,
      vy: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:spawnImageInGroup'),
      groupVar: irText(),
      varName: irText().optional(),
      x: JSExprSchema,
      y: JSExprSchema,
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      image: irText(),
      vx: JSExprSchema,
      vy: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('g2d:updateGroup'), groupVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:applyGravityToGroup'), groupVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:drawGroup'),
      groupVar: irText(),
      ctxVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawGroupByY'),
      groupVar: irText(),
      ctxVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:forEachInGroup'),
      groupVar: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:clearGroup'), groupVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:pruneOffscreen'),
      groupVar: irText(),
      ctxVar: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:onGroupOverlap'),
      aGroup: irText(),
      aName: irText(),
      bGroup: irText(),
      bName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:addToGroup'),
      spriteVar: irText(),
      groupVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:removeFromGroup'),
      spriteVar: irText(),
      groupVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:everyFrames'),
      n: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:everySeconds'),
      seconds: z.union([JSExprSchema, z.number()]),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:afterSeconds'),
      seconds: z.union([JSExprSchema, z.number()]),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setHitboxScale'),
      spriteVar: irText(),
      percent: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawScore'),
      ctxVar: irText(),
      label: irText(),
      value: JSExprSchema,
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      color: irText(),
      size: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawLabel'),
      ctxVar: irText(),
      text: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      color: irText(),
      size: z.union([JSExprSchema, z.number()]),
      align: z.enum(['left', 'center', 'right']),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawHearts'),
      ctxVar: irText(),
      count: JSExprSchema,
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      size: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawSpriteHealth'),
      ctxVar: irText(),
      spriteVar: irText(),
      style: z.enum(['hearts', 'bar']),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      size: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:drawBar'),
      ctxVar: irText(),
      value: JSExprSchema,
      max: JSExprSchema,
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setStageDescription'),
      description: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:setScene'), name: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:showScreen'),
      ctxVar: irText(),
      title: z.union([JSExprSchema, irText()]),
      subtitle: z.union([JSExprSchema, irText()]),
      hint: z.union([JSExprSchema, irText()]),
      bg: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:restart'), ...idField }),
    z.object({
      type: z.literal('g2d:starfield'),
      ctxVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:dragX'), spriteVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:fitScreen'),
      percent: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:stageBorder'),
      color: irText(),
      width: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:setBackdrop'), image: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:drawBackdrop'),
      ctxVar: irText(),
      image: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setupStage'),
      width: z.union([JSExprSchema, z.number()]),
      height: z.union([JSExprSchema, z.number()]),
      bg: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:setupFull'),
      bg: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:spawnBullet'),
      groupVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      radius: z.union([JSExprSchema, z.number()]),
      color: irText(),
      vx: JSExprSchema,
      vy: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:arrowsX'),
      spriteVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:blinkSprite'),
      spriteVar: irText(),
      frames: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createShip'),
      varName: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      bodyColor: irText(),
      wingColor: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:spawnAsteroid'),
      groupVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      size: z.union([JSExprSchema, z.number()]),
      color: irText(),
      vx: JSExprSchema,
      vy: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('g2d:explode'), spriteVar: irText(), color: irText(), ...idField }),
    z.object({ type: z.literal('g2d:playShoot'), ...idField }),
    z.object({ type: z.literal('g2d:playExplosion'), ...idField }),
    z.object({
      type: z.literal('g2d:onSpriteGroupOverlap'),
      spriteVar: irText(),
      groupVar: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:steerThrust'),
      spriteVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      turn: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:rotateSprite'),
      spriteVar: irText(),
      deg: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:pointSprite'),
      spriteVar: irText(),
      deg: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:thrust'),
      spriteVar: irText(),
      force: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:applyFriction'),
      spriteVar: irText(),
      factor: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:shootFrom'),
      spriteVar: irText(),
      groupVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:spawnAsteroidEdge'),
      groupVar: irText(),
      size: z.union([JSExprSchema, z.number()]),
      color: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:jumpOnGround'),
      spriteVar: irText(),
      ctxVar: irText(),
      jump: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createDino'),
      varName: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      size: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createStickHero'),
      varName: irText(),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createStickPath'),
      varName: irText(),
      ctxVar: irText(),
      platformColor: irText(),
      stickColor: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:stickPathScenery'), pathVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:stickPathGrow'),
      pathVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:stickPathDrop'), pathVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:stickPathWalk'),
      spriteVar: irText(),
      pathVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:stickPathDraw'), pathVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:onStickPathCross'),
      pathVar: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:onStickPathPerfect'),
      pathVar: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createBalloon'),
      varName: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      color: irText(),
      basketColor: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:createBalloonPath'),
      varName: irText(),
      ctxVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:balloonPathScenery'), pathVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:balloonFire'),
      spriteVar: irText(),
      force: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:balloonFly'), spriteVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:balloonPathScroll'),
      pathVar: irText(),
      spriteVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:onBalloonPathTreeHit'),
      pathVar: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:controlDino'),
      spriteVar: irText(),
      ctxVar: irText(),
      jump: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:spawnObstacle'),
      groupVar: irText(),
      ctxVar: irText(),
      shape: irText(),
      x: JSExprSchema,
      size: z.union([JSExprSchema, z.number()]),
      vx: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:spawnEgg'),
      groupVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      vx: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:forest'),
      ctxVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:playJump'), ...idField }),
    z.object({ type: z.literal('g2d:playDinoHurt'), ...idField }),
    z.object({ type: z.literal('g2d:playCollect'), ...idField }),
    z.object({ type: z.literal('g2d:createCity'), varName: irText(), ...idField }),
    z.object({ type: z.literal('g2d:drawCity'), cityVar: irText(), ctxVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:placeThrower'),
      varName: irText(),
      cityVar: irText(),
      side: z.enum(['left', 'right']),
      color: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:newWind'), cityVar: irText(), ...idField }),
    z.object({ type: z.literal('g2d:drawWind'), cityVar: irText(), ctxVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:aimDrag'),
      throwerVar: irText(),
      ctxVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:throwBanana'),
      throwerVar: irText(),
      cityVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:updateBanana'), cityVar: irText(), ...idField }),
    z.object({
      type: z.literal('g2d:drawBanana'),
      cityVar: irText(),
      ctxVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:playWhistle'), ...idField }),
    z.object({ type: z.literal('g2d:playBoom'), ...idField }),
    z.object({
      type: z.literal('g2d:computerTurn'),
      throwerVar: irText(),
      cityVar: irText(),
      enemyVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g2d:drawAimReadout'), ctxVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:createScene'),
      canvasId: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createFullscreenScene'),
      varName: irText(),
      bg: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:setBackground'),
      worldVar: irText(),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:setCameraPosition'),
      worldVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createBox'),
      varName: irText(),
      worldVar: irText(),
      size: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createSphere'),
      varName: irText(),
      worldVar: irText(),
      radius: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:setPosition'),
      objVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:setRotation'),
      objVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:animate'),
      worldVar: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createBlock'),
      varName: irText(),
      worldVar: irText(),
      width: z.union([JSExprSchema, z.number()]),
      height: z.union([JSExprSchema, z.number()]),
      depth: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:setVelocity'),
      objVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('g3d:jump'), objVar: irText(), force: JSExprSchema, ...idField }),
    z.object({
      type: z.literal('g3d:applyGravity'),
      objVar: irText(),
      groundVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:controlWithKeys'),
      objVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:setScale'),
      objVar: irText(),
      factor: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:cameraFollow'),
      worldVar: irText(),
      objVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:everyFrames'),
      n: z.union([JSExprSchema, z.number()]),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:everySeconds'),
      secs: z.union([JSExprSchema, z.number()]),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:createGroup'), varName: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:updateGroup'),
      groupVar: irText(),
      groundVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:updateGroupNoGravity'), groupVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:pruneOffscreen'),
      worldVar: irText(),
      groupVar: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:forEachInGroup'),
      groupVar: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:removeFromGroup'),
      groupVar: irText(),
      objVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:clearGroup'), groupVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:spawnEnemy'),
      worldVar: irText(),
      groupVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:stop'), worldVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:createCrossingScene'),
      canvasId: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createCrosser'),
      varName: irText(),
      worldVar: irText(),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:crosserMove'),
      objVar: irText(),
      direction: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:crosserStep'),
      objVar: irText(),
      worldVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:crosserReset'),
      objVar: irText(),
      worldVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:gridPosition'),
      objVar: irText(),
      row: JSExprSchema,
      col: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:addRow'),
      worldVar: irText(),
      rowIndex: JSExprSchema,
      kind: irText(),
      direction: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:generateRows'),
      worldVar: irText(),
      count: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:moveTraffic'), worldVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:isometricCamera'),
      worldVar: irText(),
      followVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:gridStep'), objVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:gridMove'),
      objVar: irText(),
      direction: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:moveAcross'),
      groupVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      min: z.union([JSExprSchema, z.number()]),
      max: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:topCamera'),
      worldVar: irText(),
      followVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:moveInCircle'),
      objVar: irText(),
      radius: z.union([JSExprSchema, z.number()]),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createRaceScene'),
      canvasId: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:createRaceTrack'), worldVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:createRaceCar'),
      varName: irText(),
      worldVar: irText(),
      color: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:raceStep'), objVar: irText(), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:raceControl'), objVar: irText(), mode: irText(), ...idField }),
    z.object({ type: z.literal('g3d:runRivals'), worldVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:raceReset'),
      objVar: irText(),
      worldVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:fall'), objVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:slideBetween'),
      objVar: irText(),
      axis: irText(),
      min: z.union([JSExprSchema, z.number()]),
      max: z.union([JSExprSchema, z.number()]),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:spin'),
      objVar: irText(),
      axis: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createStackScene'),
      canvasId: irText(),
      varName: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:createStackTower'), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:stackDrop'), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:stackStep'), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:stackReset'), worldVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:moveBy'),
      objVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:rotateBy'),
      objVar: irText(),
      axis: irText(),
      amount: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:moveTowards'),
      objVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      factor: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:lookAtObject'), aVar: irText(), bVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:lookAtPoint'),
      objVar: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:moveForward'),
      objVar: irText(),
      dist: JSExprSchema,
      ...idField,
    }),
    z.object({ type: z.literal('g3d:faceVelocity'), objVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:body'),
      objVar: irText(),
      gravity: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:stepBody'), objVar: irText(), worldVar: irText(), ...idField }),
    z.object({ type: z.literal('g3d:setSolid'), objVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:platformerControls'),
      objVar: irText(),
      worldVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      jump: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:fpsControls'),
      objVar: irText(),
      worldVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:resolveCollision'),
      aVar: irText(),
      bVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:fpsCamera'),
      worldVar: irText(),
      objVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:orbitCamera'),
      worldVar: irText(),
      objVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:thirdPersonCamera'),
      worldVar: irText(),
      objVar: irText(),
      dist: z.union([JSExprSchema, z.number()]),
      height: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:cameraLookAt'),
      worldVar: irText(),
      objVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:setFOV'),
      worldVar: irText(),
      deg: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createCylinder'),
      varName: irText(),
      worldVar: irText(),
      radius: z.union([JSExprSchema, z.number()]),
      height: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createCone'),
      varName: irText(),
      worldVar: irText(),
      radius: z.union([JSExprSchema, z.number()]),
      height: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createPlane'),
      varName: irText(),
      worldVar: irText(),
      width: z.union([JSExprSchema, z.number()]),
      depth: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createTorus'),
      varName: irText(),
      worldVar: irText(),
      radius: z.union([JSExprSchema, z.number()]),
      tube: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:createModel'),
      varName: irText(),
      worldVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:setColor'), objVar: irText(), color: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:setOpacity'),
      objVar: irText(),
      opacity: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:setMaterial'), objVar: irText(), kind: irText(), ...idField }),
    z.object({ type: z.literal('g3d:setTexture'), objVar: irText(), asset: irText(), ...idField }),
    z.object({ type: z.literal('g3d:setVisible'), objVar: irText(), mode: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:removeObject'),
      worldVar: irText(),
      objVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:addToModel'),
      modelVar: irText(),
      partVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:addAmbientLight'),
      worldVar: irText(),
      color: irText(),
      intensity: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:addSunLight'),
      worldVar: irText(),
      color: irText(),
      intensity: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:addPointLight'),
      worldVar: irText(),
      color: irText(),
      intensity: z.union([JSExprSchema, z.number()]),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:setFog'),
      worldVar: irText(),
      color: irText(),
      near: z.union([JSExprSchema, z.number()]),
      far: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:setSky'),
      worldVar: irText(),
      top: irText(),
      bottom: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:setShadows'), worldVar: irText(), mode: irText(), ...idField }),
    z.object({
      type: z.literal('g3d:createSwarm'),
      varName: irText(),
      worldVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:spawnInSwarm'),
      swarmVar: irText(),
      originalVar: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:forEachInSwarm'),
      swarmVar: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:removeFromSwarm'),
      swarmVar: irText(),
      itemVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:pruneSwarm'),
      swarmVar: irText(),
      axis: irText(),
      min: z.union([JSExprSchema, z.number()]),
      max: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3d:playNote'),
      freq: z.union([JSExprSchema, z.number()]),
      ms: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3d:playEffect'), kind: irText(), ...idField }),
    z.object({
      type: z.literal('gk:setup'),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      bg: irText(),
      accent: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:setupFull'), bg: irText(), accent: irText(), ...idField }),
    z.object({
      type: z.literal('gk:setStageDescription'),
      description: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:stageBorder'),
      color: irText(),
      width: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:setBackdrop'), image: irText(), ...idField }),
    z.object({ type: z.literal('gk:drawBackdrop'), image: irText(), ...idField }),
    z.object({ type: z.literal('gk:showHitboxes'), ...idField }),
    z.object({ type: z.literal('gk:start'), ...idField }),
    z.object({ type: z.literal('gk:loadImage'), name: irText(), asset: irText(), ...idField }),
    z.object({
      type: z.literal('gk:setScreenText'),
      screen: irText(),
      title: z.union([JSExprSchema, irText()]),
      text: z.union([JSExprSchema, irText()]),
      button: z.union([JSExprSchema, irText()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:createScreen'),
      name: irText(),
      title: z.union([JSExprSchema, irText()]),
      text: z.union([JSExprSchema, irText()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:addButton'),
      screen: irText(),
      label: z.union([JSExprSchema, irText()]),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:setScreenBg'),
      screen: irText(),
      color: irText(),
      image: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:showScreen'), name: irText(), ...idField }),
    z.object({ type: z.literal('gk:hideScreens'), ...idField }),
    z.object({ type: z.literal('gk:setState'), name: irText(), ...idField }),
    z.object({ type: z.literal('gk:restartGame'), ...idField }),
    z.object({
      type: z.literal('gk:onGameStart'),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:onEnterState'),
      name: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('gk:pause'), ...idField }),
    z.object({ type: z.literal('gk:resume'), ...idField }),
    z.object({ type: z.literal('gk:returnToMenu'), ...idField }),
    z.object({ type: z.literal('gk:endGame'), ...idField }),
    z.object({
      type: z.literal('gk:onUpdate'),
      dtName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:onDraw'),
      ctxName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:onDrawHud'),
      ctxName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:setSheet'),
      charVar: irText(),
      image: irText(),
      fw: z.union([JSExprSchema, z.number()]),
      fh: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:playAnim'),
      charVar: irText(),
      from: z.union([JSExprSchema, z.number()]),
      to: z.union([JSExprSchema, z.number()]),
      fps: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:cameraFollow'),
      charVar: irText(),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:cameraFollowMap'),
      charVar: irText(),
      map: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:cameraStop'), ...idField }),
    z.object({
      type: z.literal('gk:launchTowards'),
      charVar: irText(),
      targetVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:moveByVelocity'),
      charVar: irText(),
      dtVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:setAngle'),
      charVar: irText(),
      degrees: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:onGameClick'),
      xName: irText(),
      yName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:drawBar'),
      current: z.union([JSExprSchema, z.number()]),
      max: z.union([JSExprSchema, z.number()]),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgMoveGrid'),
      charVar: irText(),
      cell: z.union([JSExprSchema, z.number()]),
      dtVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgBlockCell'),
      cx: z.union([JSExprSchema, z.number()]),
      cy: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgCreateNpc'),
      name: irText(),
      cx: z.union([JSExprSchema, z.number()]),
      cy: z.union([JSExprSchema, z.number()]),
      image: irText(),
      look: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:rpgDrawNpcs'), ...idField }),
    z.object({
      type: z.literal('gk:rpgOnTalk'),
      npc: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgSay'),
      text: z.union([JSExprSchema, z.number()]),
      speaker: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:rpgAddFlag'), flag: irText(), ...idField }),
    z.object({ type: z.literal('gk:rpgGiveItem'), item: irText(), image: irText(), ...idField }),
    z.object({ type: z.literal('gk:rpgRemoveItem'), item: irText(), ...idField }),
    z.object({
      type: z.literal('gk:rpgDrawInventory'),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:rpgGoMap'), map: irText(), ...idField }),
    z.object({ type: z.literal('gk:rpgSetStartMap'), map: irText(), ...idField }),
    z.object({
      type: z.literal('gk:rpgCreateMap'),
      map: irText(),
      cols: z.union([JSExprSchema, z.number()]),
      rows: z.union([JSExprSchema, z.number()]),
      ctxName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgOnEnterMap'),
      map: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgCreateDoor'),
      cx: z.union([JSExprSchema, z.number()]),
      cy: z.union([JSExprSchema, z.number()]),
      map: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgConnectEdge'),
      side: irText(),
      map: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgBattleStats'),
      hp: z.union([JSExprSchema, z.number()]),
      str: z.union([JSExprSchema, z.number()]),
      def: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgBattleStart'),
      name: irText(),
      hp: z.union([JSExprSchema, z.number()]),
      str: z.union([JSExprSchema, z.number()]),
      def: z.union([JSExprSchema, z.number()]),
      image: irText().optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgSetSpecial'),
      name: irText(),
      dmg: z.union([JSExprSchema, z.number()]),
      cost: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgGivePotion'),
      name: irText(),
      heal: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:rpgHealHero'), ...idField }),
    z.object({
      type: z.literal('gk:rpgBattleReward'),
      xp: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgInflict'),
      who: irText(),
      status: irText(),
      turns: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgAddAlly'),
      name: irText(),
      hp: z.union([JSExprSchema, z.number()]),
      str: z.union([JSExprSchema, z.number()]),
      def: z.union([JSExprSchema, z.number()]),
      color: irText(),
      image: irText().optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgAddFoe'),
      name: irText(),
      hp: z.union([JSExprSchema, z.number()]),
      str: z.union([JSExprSchema, z.number()]),
      def: z.union([JSExprSchema, z.number()]),
      color: irText(),
      image: irText().optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgTeachMove'),
      who: irText(),
      move: irText(),
      dmg: z.union([JSExprSchema, z.number()]),
      cost: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgTeachHeal'),
      who: irText(),
      move: irText(),
      amount: z.union([JSExprSchema, z.number()]),
      cost: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgAddBoss'),
      name: irText(),
      hp: z.union([JSExprSchema, z.number()]),
      str: z.union([JSExprSchema, z.number()]),
      def: z.union([JSExprSchema, z.number()]),
      image: irText().optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgOnFoeTurn'),
      name: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('gk:rpgFoeUse'), name: irText(), move: irText(), ...idField }),
    z.object({
      type: z.literal('gk:rpgFoeHitAll'),
      name: irText(),
      dmg: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgDefineBattler'),
      name: irText(),
      hp: z.union([JSExprSchema, z.number()]),
      str: z.union([JSExprSchema, z.number()]),
      def: z.union([JSExprSchema, z.number()]),
      image: irText(),
      color: irText(),
      boss: z.boolean(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:rpgBattleNamed'), name: irText(), ...idField }),
    z.object({ type: z.literal('gk:rpgAddFoeNamed'), name: irText(), ...idField }),
    z.object({
      type: z.literal('gk:rpgOnBattleEnd'),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:setWalkSheet'),
      charVar: irText(),
      image: irText(),
      fw: z.union([JSExprSchema, z.number()]),
      fh: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgCutscene'),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgWait'),
      seconds: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:rpgFace'), npc: irText(), dir: irText(), ...idField }),
    z.object({
      type: z.literal('gk:rpgNpcWalkTo'),
      npc: irText(),
      cx: z.union([JSExprSchema, z.number()]),
      cy: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:rpgNpcWander'), npc: irText(), ...idField }),
    z.object({
      type: z.literal('gk:rpgOnStep'),
      cx: z.union([JSExprSchema, z.number()]),
      cy: z.union([JSExprSchema, z.number()]),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgMenu'),
      title: z.union([JSExprSchema, z.number()]),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:rpgOption'),
      label: z.union([JSExprSchema, z.number()]),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('gk:rpgSave'), ...idField }),
    z.object({ type: z.literal('gk:rpgLoad'), ...idField }),
    z.object({
      type: z.literal('gk:loadTilemap'),
      name: irText(),
      asset: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:drawTilemap'),
      name: irText(),
      layer: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:tilemapSolid'), name: irText(), ...idField }),
    z.object({ type: z.literal('gk:drawShadow'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:drawByDepth'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('gk:cameraShake'),
      intensity: z.union([JSExprSchema, z.number()]),
      seconds: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:applyGravity'),
      charVar: irText(),
      g: z.union([JSExprSchema, z.number()]),
      dtVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:jump'),
      charVar: irText(),
      force: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:setVelocity'),
      charVar: irText(),
      vx: z.union([JSExprSchema, z.number()]),
      vy: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:setTerminalVelocity'),
      charVar: irText(),
      max: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:bounceOnEdges'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('gk:paddleBounce'),
      ballVar: irText(),
      paddleVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:boardCreate'),
      name: irText(),
      cols: z.union([JSExprSchema, z.number()]),
      rows: z.union([JSExprSchema, z.number()]),
      empty: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:boardSet'),
      name: irText(),
      value: z.union([JSExprSchema, z.number()]),
      col: z.union([JSExprSchema, z.number()]),
      row: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:playersSetup'),
      n: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:nextPlayer'), ...idField }),
    z.object({ type: z.literal('gk:onTurnChange'), body: z.array(JSStatementSchema), ...idField }),
    z.object({
      type: z.literal('gk:moveAlongTrack'),
      who: irText(),
      spaces: z.union([JSExprSchema, z.number()]),
      path: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:onLandSpace'), body: z.array(JSStatementSchema), ...idField }),
    z.object({ type: z.literal('gk:pileMoveTop'), fromVar: irText(), toVar: irText(), ...idField }),
    z.object({
      type: z.literal('gk:pileShuffleFrom'),
      deckVar: irText(),
      discardVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:cardFlip'),
      card: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:handDraw'),
      pileVar: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      fan: z.boolean(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:cardsStart'),
      heroHp: z.union([JSExprSchema, z.number()]),
      enemyHp: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:cardsEnergyPerTurn'),
      n: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:cardsSpend'),
      n: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:cardsOnTurn'), body: z.array(JSStatementSchema), ...idField }),
    z.object({ type: z.literal('gk:cardsEndTurn'), ...idField }),
    z.object({ type: z.literal('gk:cardsDrawHud'), ...idField }),
    z.object({
      type: z.literal('gk:cardsHurtEnemy'),
      n: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:cardsHurtMe'),
      n: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:cardsGainBlock'),
      n: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:cardsEnemyIntent'),
      action: irText(),
      value: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:cardsOnEnemyTurn'),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('gk:wrapEdges'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('gk:collideTilemap'),
      charVar: irText(),
      map: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:collideGroup'), charVar: irText(), mold: irText(), ...idField }),
    z.object({
      type: z.literal('gk:overlapGroups'),
      aName: irText(),
      moldA: irText(),
      bName: irText(),
      moldB: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:everySeconds'),
      seconds: z.union([JSExprSchema, z.number()]),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:setTileSize'),
      px: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:setTileAt'),
      map: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      index: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:breakTileAt'), map: irText(), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('gk:setProperty'),
      charVar: irText(),
      prop: irText(),
      value: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:setFacingDir'), charVar: irText(), dir: irText(), ...idField }),
    z.object({
      type: z.literal('gk:tweenTo'),
      charVar: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      seconds: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    // 🏃 Kit Plataforma
    z.object({
      type: z.literal('gk:platformerHero'),
      charVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      force: z.union([JSExprSchema, z.number()]),
      dtVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:setJumpFeel'),
      coyote: z.union([JSExprSchema, z.number()]),
      buffer: z.union([JSExprSchema, z.number()]),
      hold: z.union([JSExprSchema, z.number()]),
      gravity: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:doubleJump'),
      charVar: irText(),
      force: z.union([JSExprSchema, z.number()]),
      times: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:wallSlide'),
      charVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:wallJump'),
      charVar: irText(),
      forceX: z.union([JSExprSchema, z.number()]),
      forceY: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:climbLadder'),
      charVar: irText(),
      map: irText(),
      tile: z.union([JSExprSchema, z.number()]),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:oneWayPlatform'),
      charVar: irText(),
      mold: irText(),
      dtVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:dropThrough'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('gk:movingPlatform'),
      charVar: irText(),
      x1: z.union([JSExprSchema, z.number()]),
      y1: z.union([JSExprSchema, z.number()]),
      x2: z.union([JSExprSchema, z.number()]),
      y2: z.union([JSExprSchema, z.number()]),
      seconds: z.union([JSExprSchema, z.number()]),
      dtVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:rideOn'), charVar: irText(), mold: irText(), ...idField }),
    z.object({
      type: z.literal('gk:stompKill'),
      charVar: irText(),
      mold: irText(),
      bounce: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:patrolTurnAtWall'),
      charVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:setCheckpoint'),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:respawn'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('gk:platStateFrames'),
      charVar: irText(),
      state: irText(),
      from: z.union([JSExprSchema, z.number()]),
      to: z.union([JSExprSchema, z.number()]),
      fps: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:platformerAnim'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('gk:defineRegion'),
      name: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:launchToPoint'),
      charVar: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:setVelocityAngle'),
      charVar: irText(),
      degrees: z.union([JSExprSchema, z.number()]),
      force: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:floatText'),
      text: z.union([JSExprSchema, z.string()]),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      color: irText(),
      size: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:trailOn'),
      charVar: irText(),
      color: irText(),
      size: z.union([JSExprSchema, z.number()]),
      rate: z.union([JSExprSchema, z.number()]),
      life: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:trailOff'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('gk:shockwave'),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      radius: z.union([JSExprSchema, z.number()]),
      seconds: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:scrollImage'),
      image: irText(),
      vx: z.union([JSExprSchema, z.number()]),
      vy: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:leanOnMove'),
      charVar: irText(),
      degrees: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:fanShot'),
      charVar: irText(),
      mold: irText(),
      count: z.union([JSExprSchema, z.number()]),
      arc: z.union([JSExprSchema, z.number()]),
      degrees: z.union([JSExprSchema, z.number()]),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:naveShip'),
      charVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      lean: z.union([JSExprSchema, z.number()]),
      dtVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:navePowerup'),
      charVar: irText(),
      power: irText(),
      seconds: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:naveWave'),
      mold: irText(),
      cols: z.union([JSExprSchema, z.number()]),
      rows: z.union([JSExprSchema, z.number()]),
      gap: z.union([JSExprSchema, z.number()]),
      speed: z.union([JSExprSchema, z.number()]),
      drop: z.union([JSExprSchema, z.number()]),
      accel: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:naveWaveShooter'),
      mold: irText(),
      seconds: z.union([JSExprSchema, z.number()]),
      bullet: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:naveInvasionLine'),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:naveStarfield'),
      count: z.union([JSExprSchema, z.number()]),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:naveBomb'),
      mold: irText(),
      radius: z.union([JSExprSchema, z.number()]),
      target: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:definePath'),
      name: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:pathPoint'),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:followPath'),
      charVar: irText(),
      path: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      dtVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:parallaxLayer'),
      image: irText(),
      fx: z.union([JSExprSchema, z.number()]),
      fy: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:sheetBurst'),
      image: irText(),
      frames: z.union([JSExprSchema, z.number()]),
      fps: z.union([JSExprSchema, z.number()]),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      size: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    // 🏰 R26 — Kit Defesa de Torre
    z.object({
      type: z.literal('gk:tdWave'),
      path: irText(),
      count: z.union([JSExprSchema, z.number()]),
      mold: irText(),
      gap: z.union([JSExprSchema, z.number()]),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:tdSlot'),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      size: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:tdDrawSlots'), ...idField }),
    z.object({
      type: z.literal('gk:tdOnBuy'),
      cost: z.union([JSExprSchema, z.number()]),
      xName: irText(),
      yName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:tdFreeSlot'),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:tdDrawRange'),
      charVar: irText(),
      radius: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:tdSetCoins'),
      n: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:tdAddCoins'),
      n: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:setOpacity'),
      charVar: irText(),
      percent: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:fadeTo'),
      charVar: irText(),
      percent: z.union([JSExprSchema, z.number()]),
      seconds: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:tweenProperty'),
      charVar: irText(),
      prop: irText(),
      to: z.union([JSExprSchema, z.number()]),
      seconds: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:lutaMatch'),
      p1Var: irText(),
      p2Var: irText(),
      rounds: z.union([JSExprSchema, z.number()]),
      seconds: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:lutaDrawHud'), ...idField }),
    z.object({
      type: z.literal('gk:lutaFighter'),
      charVar: irText(),
      left: irText(),
      right: irText(),
      jump: irText(),
      crouch: irText(),
      guard: irText(),
      dtVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:lutaAI'),
      charVar: irText(),
      level: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:lutaMove'),
      name: irText(),
      charVar: irText(),
      speed: irText(),
      damage: z.union([JSExprSchema, z.number()]),
      range: z.union([JSExprSchema, z.number()]),
      pierce: z.boolean(),
      special: z.boolean(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:lutaMoveAnim'),
      name: irText(),
      charVar: irText(),
      from: z.union([JSExprSchema, z.number()]),
      to: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:lutaAttack'),
      charVar: irText(),
      move: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:setSwingWindow'),
      charVar: irText(),
      start: z.union([JSExprSchema, z.number()]),
      active: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:playAnimOnce'),
      charVar: irText(),
      from: z.union([JSExprSchema, z.number()]),
      to: z.union([JSExprSchema, z.number()]),
      fps: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:setEntityState'),
      charVar: irText(),
      state: irText(),
      seconds: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:stateAnim'),
      charVar: irText(),
      state: irText(),
      from: z.union([JSExprSchema, z.number()]),
      to: z.union([JSExprSchema, z.number()]),
      fps: z.union([JSExprSchema, z.number()]),
      once: z.boolean(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:stateLook'),
      charVar: irText(),
      state: irText(),
      look: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:autoAnimate'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('gk:thrust'),
      charVar: irText(),
      degrees: z.union([JSExprSchema, z.number()]),
      force: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:applyFriction'),
      charVar: irText(),
      factor: z.union([JSExprSchema, z.number()]),
      dtVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:waitThen'),
      seconds: z.union([JSExprSchema, z.number()]),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:setHitbox'),
      charVar: irText(),
      ox: z.union([JSExprSchema, z.number()]),
      oy: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:setHitboxShape'),
      charVar: irText(),
      shape: z.enum(['circulo', 'retangulo']),
      radius: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:fadeScreen'),
      color: irText(),
      seconds: z.union([JSExprSchema, z.number()]),
      toDark: z.boolean(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:flashScreen'),
      color: irText(),
      times: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:saveValue'), name: irText(), value: JSExprSchema, ...idField }),
    z.object({ type: z.literal('gk:playMusic'), sound: irText(), ...idField }),
    z.object({ type: z.literal('gk:stopSound'), sound: irText(), ...idField }),
    z.object({
      type: z.literal('gk:setVolume'),
      sound: irText(),
      level: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:createEmptyTilemap'),
      name: irText(),
      cols: z.union([JSExprSchema, z.number()]),
      rows: z.union([JSExprSchema, z.number()]),
      fill: z.union([JSExprSchema, z.number()]),
      asset: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:pkmCreature'),
      name: irText(),
      creatureType: irText(),
      hp: z.union([JSExprSchema, z.number()]),
      str: z.union([JSExprSchema, z.number()]),
      def: z.union([JSExprSchema, z.number()]),
      spd: z.union([JSExprSchema, z.number()]),
      image: irText(),
      look: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:pkmMove'),
      move: irText(),
      creature: irText(),
      moveType: irText(),
      dmg: z.union([JSExprSchema, z.number()]),
      acc: z.union([JSExprSchema, z.number()]),
      fx: irText(),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:pkmTypeChart'),
      atk: irText(),
      def: irText(),
      mult: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:pkmEvolve'),
      from: irText(),
      to: irText(),
      level: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:pkmCatchDifficulty'),
      creature: irText(),
      level: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:pkmGive'),
      creature: irText(),
      level: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:pkmGiveBall'),
      count: z.union([JSExprSchema, z.number()]),
      power: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:pkmHealTeam'), ...idField }),
    z.object({
      type: z.literal('gk:pkmDrawTeam'),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:pkmGrassCells'),
      x1: z.union([JSExprSchema, z.number()]),
      y1: z.union([JSExprSchema, z.number()]),
      x2: z.union([JSExprSchema, z.number()]),
      y2: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:pkmGrassTiles'),
      index: z.union([JSExprSchema, z.number()]),
      map: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:pkmWild'),
      creature: irText(),
      min: z.union([JSExprSchema, z.number()]),
      max: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:pkmEncounterRate'),
      percent: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:pkmBattleWild'),
      creature: irText(),
      level: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:pkmBattleTrainer'),
      name: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:pkmTrainerCreature'),
      creature: irText(),
      level: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:moveWithCustomKeys'),
      charVar: irText(),
      up: irText(),
      down: irText(),
      left: irText(),
      right: irText(),
      dtVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:attackFacing'),
      charVar: irText(),
      range: z.union([JSExprSchema, z.number()]),
      duration: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:patrolAround'),
      charVar: irText(),
      ox: z.union([JSExprSchema, z.number()]),
      oy: z.union([JSExprSchema, z.number()]),
      radius: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:drawHearts'),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      current: z.union([JSExprSchema, z.number()]),
      max: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:drawBackground'),
      color: irText(),
      grid: z.boolean(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:createCharacter'),
      varName: irText(),
      image: irText(),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      speed: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:moveWithKeys'),
      charVar: irText(),
      dtVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:keepOnScreen'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:drawCharacter'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('gk:placeCharacter'),
      charVar: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:resetCharacter'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('gk:setSpeedMultiplier'),
      charVar: irText(),
      factor: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:setPauseKey'), key: irText(), ...idField }),
    z.object({
      type: z.literal('gk:onEvent'),
      event: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('gk:emit'), event: irText(), ...idField }),
    z.object({
      type: z.literal('gk:defineMold'),
      name: irText(),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      health: z.union([JSExprSchema, z.number()]),
      speed: z.union([JSExprSchema, z.number()]),
      damage: z.union([JSExprSchema, z.number()]),
      color: irText(),
      image: irText(),
      look: irText(),
      shape: z.literal('circulo').optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:spawnFromMold'),
      mold: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:startSpawner'),
      mold: irText(),
      seconds: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:stopSpawner'), mold: irText(), ...idField }),
    z.object({
      type: z.literal('gk:spawnNamed'),
      varName: irText(),
      mold: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:forEachActive'),
      mold: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:cullOffscreen'),
      mold: irText(),
      margin: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:recycle'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:drawActive'), mold: irText(), ...idField }),
    z.object({
      type: z.literal('gk:defineLook'),
      name: irText(),
      ctxName: irText(),
      baseW: z.union([JSExprSchema, z.number()]).optional(),
      baseH: z.union([JSExprSchema, z.number()]).optional(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:drawLook'),
      look: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:seek'),
      charVar: irText(),
      targetVar: irText(),
      dtVar: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('gk:drift'), charVar: irText(), dtVar: irText(), ...idField }),
    z.object({ type: z.literal('gk:face'), charVar: irText(), targetVar: irText(), ...idField }),
    z.object({
      type: z.literal('gk:hurt'),
      charVar: irText(),
      amount: z.union([JSExprSchema, z.number()]),
      iframes: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:knockback'),
      charVar: irText(),
      fromVar: irText(),
      force: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:drawHealthBar'),
      charVar: irText(),
      max: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:setMission'),
      seconds: z.union([JSExprSchema, z.number()]),
      killCount: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:missionKill'), ...idField }),
    z.object({
      type: z.literal('gk:drawTimer'),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:defineEffect'),
      name: irText(),
      count: z.union([JSExprSchema, z.number()]),
      color: irText(),
      size: z.union([JSExprSchema, z.number()]),
      life: z.union([JSExprSchema, z.number()]),
      speed: z.union([JSExprSchema, z.number()]),
      gravity: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('gk:burst'),
      effect: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('gk:drawEffects'), ...idField }),
    z.object({ type: z.literal('gk:loadSound'), name: irText(), asset: irText(), ...idField }),
    z.object({ type: z.literal('gk:playSound'), name: irText(), ...idField }),
    z.object({ type: z.literal('gk:playEffect'), fx: irText(), ...idField }),
    z.object({
      type: z.literal('gk:playTone'),
      freq: z.union([JSExprSchema, z.number()]),
      ms: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:setup'),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      world: z.union([JSExprSchema, z.number()]),
      sky: irText(),
      ground: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:scatterDecor'),
      count: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:setEffects'),
      shadows: z.boolean(),
      bloom: z.boolean(),
      strength: z.union([JSExprSchema, z.number()]),
      vignette: z.boolean(),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:start'), ...idField }),
    z.object({
      type: z.literal('g3k:defineMold'),
      name: irText(),
      health: z.union([JSExprSchema, z.number()]),
      speed: z.union([JSExprSchema, z.number()]),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:part'),
      shape: irText(),
      material: irText(),
      color: irText(),
      texture: irText(),
      model: irText(),
      w: z.union([JSExprSchema, z.number()]),
      h: z.union([JSExprSchema, z.number()]),
      d: z.union([JSExprSchema, z.number()]),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:spawn'),
      mold: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:spawnNamed'),
      varName: irText(),
      mold: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:spawnFrom'),
      mold: irText(),
      fromVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:startSpawner'),
      mold: irText(),
      seconds: z.union([JSExprSchema, z.number()]),
      where: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:stopSpawner'), mold: irText(), ...idField }),
    z.object({
      type: z.literal('g3k:forEachAlive'),
      mold: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:recycle'), charVar: irText(), ...idField }),
    z.object({ type: z.literal('g3k:recycleAll'), mold: irText(), ...idField }),
    z.object({
      type: z.literal('g3k:cullFar'),
      mold: irText(),
      dist: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:onUpdate'),
      dtName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:moveWithKeys'),
      charVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:setPauseKey'), key: irText(), ...idField }),
    z.object({
      type: z.literal('g3k:cameraFollow'),
      charVar: irText(),
      dist: z.union([JSExprSchema, z.number()]),
      height: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:cameraOrbit'),
      dist: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:cameraTop'),
      height: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:cameraAngle'),
      az: z.union([JSExprSchema, z.number()]),
      el: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:cameraDistance'),
      dist: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:cameraShake'),
      strength: z.union([JSExprSchema, z.number()]),
      seconds: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:cameraLens'),
      fov: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:cameraLookAt'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3k:cameraLookAtPoint'),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:cameraSmooth'),
      lambda: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:place'),
      charVar: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:setYaw'),
      charVar: irText(),
      degrees: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:setVelocity'),
      charVar: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:setDrag'),
      charVar: irText(),
      drag: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:setEntityValue'),
      charVar: irText(),
      key: irText(),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:lookAt'),
      charVar: irText(),
      targetVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:moveForward'),
      charVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:fall'),
      charVar: irText(),
      g: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:jump'),
      charVar: irText(),
      force: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:makeSolid'), mold: irText(), ...idField }),
    z.object({
      type: z.literal('g3k:platformerKeys'),
      charVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      jump: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:setCollider'), mold: irText(), shape: irText(), ...idField }),
    z.object({ type: z.literal('g3k:setPhysics'), mold: irText(), kind: irText(), ...idField }),
    z.object({
      type: z.literal('g3k:playAnim'),
      charVar: irText(),
      clip: irText(),
      loop: z.boolean(),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:stopAnim'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3k:setStateAnim'),
      mold: irText(),
      state: irText(),
      clip: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:playMusic'), name: irText(), ...idField }),
    z.object({ type: z.literal('g3k:stopMusic'), ...idField }),
    z.object({
      type: z.literal('g3k:startTimer'),
      seconds: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:stopTimer'), ...idField }),
    z.object({ type: z.literal('g3k:onTimerEnd'), body: z.array(JSStatementSchema), ...idField }),
    z.object({
      type: z.literal('g3k:say'),
      charVar: irText(),
      text: z.union([JSExprSchema, z.string()]),
      seconds: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:hideSay'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3k:passThrough'),
      charVar: irText(),
      ghost: z.boolean(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:showHealthBar'),
      mold: irText(),
      on: z.boolean(),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:makeTrigger'), mold: irText(), ...idField }),
    z.object({
      type: z.literal('g3k:setSeed'),
      seed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:onOverlap'),
      mold: irText(),
      zoneName: irText(),
      whoName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:setBounce'),
      mold: irText(),
      amount: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:setFriction'),
      mold: irText(),
      amount: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:addLight'),
      color: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      intensity: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:setAmbient'),
      intensity: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:setFog'),
      color: irText(),
      near: z.union([JSExprSchema, z.number()]),
      far: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:setSky'), top: irText(), bottom: irText(), ...idField }),
    z.object({ type: z.literal('g3k:setSkyPhoto'), photo: irText(), ...idField }),
    z.object({ type: z.literal('g3k:pick'), varName: irText(), mold: irText(), ...idField }),
    z.object({ type: z.literal('g3k:cameraFps'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3k:moveFps'),
      charVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:defineEmitter'),
      name: irText(),
      colorFrom: irText(),
      colorTo: irText(),
      sizeFrom: z.union([JSExprSchema, z.number()]),
      sizeTo: z.union([JSExprSchema, z.number()]),
      rate: z.union([JSExprSchema, z.number()]),
      speed: z.union([JSExprSchema, z.number()]),
      cone: z.union([JSExprSchema, z.number()]),
      gravity: z.union([JSExprSchema, z.number()]),
      glow: z.boolean(),
      curve: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:startEmitter'),
      effect: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:emitterOn'), effect: irText(), charVar: irText(), ...idField }),
    z.object({ type: z.literal('g3k:stopEmitter'), effect: irText(), ...idField }),
    z.object({
      type: z.literal('g3k:addAttractor'),
      effect: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      intensity: z.union([JSExprSchema, z.number()]),
      radius: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:onEnterEntityState'),
      mold: irText(),
      state: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:onEntityStateUpdate'),
      mold: irText(),
      state: irText(),
      itemName: irText(),
      dtName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:onExitEntityState'),
      mold: irText(),
      state: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:setEntityState'),
      charVar: irText(),
      state: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:stateTimer'),
      mold: irText(),
      state: irText(),
      sec: z.union([JSExprSchema, z.number()]),
      next: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:seek'),
      charVar: irText(),
      targetVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:seekPoint'),
      charVar: irText(),
      x: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:aimAt'),
      charVar: irText(),
      targetVar: irText(),
      smooth: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:faceVelocity'), charVar: irText(), ...idField }),
    z.object({
      type: z.literal('g3k:forEachNear'),
      charVar: irText(),
      mold: irText(),
      radius: z.union([JSExprSchema, z.number()]),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:storeNearest'),
      varName: irText(),
      mold: irText(),
      charVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:hurt'),
      charVar: irText(),
      amount: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:onEntityDeath'),
      mold: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:heal'),
      charVar: irText(),
      amount: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:onHurt'),
      mold: irText(),
      itemName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:spawnRing'),
      mold: irText(),
      count: z.union([JSExprSchema, z.number()]),
      fromVar: irText(),
      speed: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:defineEffect'),
      name: irText(),
      count: z.union([JSExprSchema, z.number()]),
      colorFrom: irText(),
      colorTo: irText(),
      spread: z.union([JSExprSchema, z.number()]),
      sizeFrom: z.union([JSExprSchema, z.number()]),
      sizeTo: z.union([JSExprSchema, z.number()]),
      life: z.union([JSExprSchema, z.number()]),
      gravity: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:burstAt'),
      effect: irText(),
      x: z.union([JSExprSchema, z.number()]),
      y: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:burstOn'),
      effect: irText(),
      charVar: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:setScreenText'),
      screen: irText(),
      title: z.union([JSExprSchema, irText()]),
      text: z.union([JSExprSchema, irText()]),
      button: z.union([JSExprSchema, irText()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:createScreen'),
      name: irText(),
      title: z.union([JSExprSchema, irText()]),
      text: z.union([JSExprSchema, irText()]),
      ...idField,
    }),
    z.object({
      type: z.literal('g3k:addButton'),
      screen: irText(),
      label: z.union([JSExprSchema, irText()]),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:showScreen'), name: irText(), ...idField }),
    z.object({ type: z.literal('g3k:hideScreens'), ...idField }),
    z.object({
      type: z.literal('g3k:hudText'),
      slot: irText(),
      text: z.union([JSExprSchema, irText()]),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:setState'), name: irText(), ...idField }),
    z.object({
      type: z.literal('g3k:onEnterState'),
      name: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:returnToMenu'), ...idField }),
    z.object({ type: z.literal('g3k:endGame'), ...idField }),
    z.object({
      type: z.literal('g3k:onEvent'),
      event: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('g3k:emit'), event: irText(), ...idField }),
    z.object({ type: z.literal('g3k:loadSound'), name: irText(), asset: irText(), ...idField }),
    z.object({ type: z.literal('g3k:playSound'), name: irText(), ...idField }),
    z.object({ type: z.literal('g3k:playEffect'), fx: irText(), ...idField }),
    z.object({
      type: z.literal('g3k:playTone'),
      freq: z.union([JSExprSchema, z.number()]),
      ms: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:setup'),
      style: irText(),
      world: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:terrain'),
      h: z.union([JSExprSchema, z.number()]),
      s: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:flatten'),
      x: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      r: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:path'),
      x1: z.union([JSExprSchema, z.number()]),
      z1: z.union([JSExprSchema, z.number()]),
      x2: z.union([JSExprSchema, z.number()]),
      z2: z.union([JSExprSchema, z.number()]),
      w: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:water'),
      y: z.union([JSExprSchema, z.number()]),
      color: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:skyPhoto'), asset: irText(), ...idField }),
    z.object({ type: z.literal('w3d:start'), ...idField }),
    z.object({ type: z.literal('w3d:car'), style: irText(), color: irText(), ...idField }),
    z.object({
      type: z.literal('w3d:carBoost'),
      force: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:engineSound'), on: z.boolean(), ...idField }),
    z.object({ type: z.literal('w3d:loadSound'), name: irText(), asset: irText(), ...idField }),
    z.object({ type: z.literal('w3d:playSound'), name: irText(), ...idField }),
    z.object({ type: z.literal('w3d:playMusic'), name: irText(), ...idField }),
    z.object({ type: z.literal('w3d:stopMusic'), ...idField }),
    z.object({
      type: z.literal('w3d:hud'),
      text: z.union([JSExprSchema, z.number()]),
      corner: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:say'),
      text: z.union([JSExprSchema, z.number()]),
      secs: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:point'),
      name: irText(),
      x: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:onPoint'),
      name: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:zone'),
      name: irText(),
      x: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      r: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:onZone'),
      name: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:totemText'),
      x: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      title: irText(),
      body: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:totemImage'),
      x: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      image: irText(),
      w: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:galleryCreate'),
      x: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      title: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:galleryAdd'),
      image: irText(),
      caption: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:raceCreate'),
      x: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      deg: z.union([JSExprSchema, z.number()]),
      laps: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:raceCheckpoint'),
      x: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      deg: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:raceOnStart'), body: z.array(JSStatementSchema), ...idField }),
    z.object({
      type: z.literal('w3d:raceOnCheckpoint'),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:raceOnFinish'), body: z.array(JSStatementSchema), ...idField }),
    z.object({
      type: z.literal('w3d:bowlingCreate'),
      x: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      deg: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:bowlingReset'), ...idField }),
    z.object({
      type: z.literal('w3d:bowlingOnStrike'),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:stack'),
      n: z.union([JSExprSchema, z.number()]),
      thing: irText(),
      x: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:carStats'),
      speed: z.union([JSExprSchema, z.number()]),
      turn: z.union([JSExprSchema, z.number()]),
      jump: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:carPlace'),
      x: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      deg: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:grass'), amount: irText(), ...idField }),
    z.object({
      type: z.literal('w3d:scatter'),
      n: z.union([JSExprSchema, z.number()]),
      thing: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:scatterModel'),
      n: z.union([JSExprSchema, z.number()]),
      model: irText(),
      s: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:placeThing'),
      thing: irText(),
      x: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      s: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:placeModel'),
      model: irText(),
      x: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      s: z.union([JSExprSchema, z.number()]),
      deg: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:clearArea'),
      x: z.union([JSExprSchema, z.number()]),
      z: z.union([JSExprSchema, z.number()]),
      r: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:onCrash'), body: z.array(JSStatementSchema), ...idField }),
    z.object({ type: z.literal('w3d:horn'), ...idField }),
    z.object({ type: z.literal('w3d:onHorn'), body: z.array(JSStatementSchema), ...idField }),
    z.object({ type: z.literal('w3d:carLights'), ...idField }),
    z.object({ type: z.literal('w3d:tireMarks'), on: z.boolean(), ...idField }),
    z.object({ type: z.literal('w3d:carPaint'), paint: irText(), ...idField }),
    z.object({ type: z.literal('w3d:confetti'), ...idField }),
    z.object({ type: z.literal('w3d:fireworks'), ...idField }),
    z.object({
      type: z.literal('w3d:tornado'),
      secs: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:season'), season: irText(), ...idField }),
    z.object({ type: z.literal('w3d:clouds'), amount: irText(), ...idField }),
    z.object({
      type: z.literal('w3d:pushPlace'),
      thing: irText(),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:pushScatter'),
      n: z.union([z.number(), JSExprSchema]),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      r: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:letters'),
      word: irText(),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      s: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:explosive'),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:onExplosion'), body: z.array(JSStatementSchema), ...idField }),
    z.object({
      type: z.literal('w3d:waterfall'),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      h: z.union([z.number(), JSExprSchema]),
      deg: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:lamp'),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:city'),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      size: z.string(),
      mode: z.string(),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:stringLights'),
      x1: z.union([z.number(), JSExprSchema]),
      z1: z.union([z.number(), JSExprSchema]),
      x2: z.union([z.number(), JSExprSchema]),
      z2: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:traffic'),
      n: z.union([z.number(), JSExprSchema]),
      sem: z.string(),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:district'),
      kind: z.string(),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      size: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:roadGrid'),
      layout: z.string(),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      size: z.union([z.number(), JSExprSchema]),
      width: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:houseRow'),
      n: z.union([z.number(), JSExprSchema]),
      x1: z.union([z.number(), JSExprSchema]),
      z1: z.union([z.number(), JSExprSchema]),
      x2: z.union([z.number(), JSExprSchema]),
      z2: z.union([z.number(), JSExprSchema]),
      style: z.string(),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:quality'), mode: z.string(), ...idField }),
    z.object({
      type: z.literal('w3d:inventoryGive'),
      item: z.string(),
      n: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:inventoryRemove'),
      item: z.string(),
      n: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:door'),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      deg: z.union([z.number(), JSExprSchema]),
      title: z.string(),
      body: z.string(),
      image: z.string(),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:npcAsk'),
      name: z.string(),
      question: z.string(),
      optA: z.string(),
      bodyA: z.lazy(() => z.array(JSStatementSchema)),
      optB: z.string(),
      bodyB: z.lazy(() => z.array(JSStatementSchema)),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:crops'),
      n: z.union([z.number(), JSExprSchema]),
      kind: z.string(),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:barn'),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      deg: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:windmill'),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:fence'),
      x1: z.union([z.number(), JSExprSchema]),
      z1: z.union([z.number(), JSExprSchema]),
      x2: z.union([z.number(), JSExprSchema]),
      z2: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:animals'),
      n: z.union([z.number(), JSExprSchema]),
      kind: z.string(),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      r: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:crater'),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      r: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:flag'),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      color: z.string(),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:rocket'),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:fireflies'), amount: irText(), ...idField }),
    z.object({
      type: z.literal('w3d:campfire'),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:person'), color: irText(), hat: irText(), ...idField }),
    z.object({
      type: z.literal('w3d:personStats'),
      walk: z.union([z.number(), JSExprSchema]),
      run: z.union([z.number(), JSExprSchema]),
      jump: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:personPlace'),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      deg: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:personAccessory'), acc: irText(), ...idField }),
    z.object({ type: z.literal('w3d:personEmote'), emote: irText(), ...idField }),
    z.object({
      type: z.literal('w3d:onVehicle'),
      when: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:islands'),
      n: z.union([z.number(), JSExprSchema]),
      y: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:boat'), color: irText(), ...idField }),
    z.object({
      type: z.literal('w3d:bridge'),
      x1: z.union([z.number(), JSExprSchema]),
      z1: z.union([z.number(), JSExprSchema]),
      x2: z.union([z.number(), JSExprSchema]),
      z2: z.union([z.number(), JSExprSchema]),
      w: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:lighthouse'),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:ambience'), kind: irText(), ...idField }),
    z.object({
      type: z.literal('w3d:npc'),
      name: irText(),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      color: irText(),
      hat: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:npcWander'),
      name: irText(),
      r: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:npcTalk'),
      name: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:npcSay'), name: irText(), text: irText(), ...idField }),
    z.object({ type: z.literal('w3d:npcEmote'), name: irText(), emote: irText(), ...idField }),
    z.object({
      type: z.literal('w3d:coinsScatter'),
      n: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:coinsRing'),
      n: z.union([z.number(), JSExprSchema]),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      r: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:coinsLine'),
      n: z.union([z.number(), JSExprSchema]),
      x1: z.union([z.number(), JSExprSchema]),
      z1: z.union([z.number(), JSExprSchema]),
      x2: z.union([z.number(), JSExprSchema]),
      z2: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:onCollect'), body: z.array(JSStatementSchema), ...idField }),
    z.object({ type: z.literal('w3d:quest'), name: irText(), desc: irText(), ...idField }),
    z.object({ type: z.literal('w3d:questDone'), name: irText(), ...idField }),
    z.object({
      type: z.literal('w3d:onQuestDone'),
      name: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:marker'),
      icon: irText(),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:guideArrow'),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      on: z.boolean(),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:achievement'), name: irText(), ...idField }),
    z.object({
      type: z.literal('w3d:onAchievement'),
      name: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:minimap'), mode: irText(), ...idField }),
    z.object({ type: z.literal('w3d:racePodium'), ...idField }),
    z.object({
      type: z.literal('w3d:whisperCorner'),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:flameNote'),
      x: z.union([z.number(), JSExprSchema]),
      z: z.union([z.number(), JSExprSchema]),
      text: irText(),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:cameraMode'), mode: irText(), ...idField }),
    z.object({
      type: z.literal('w3d:cameraShake'),
      force: z.union([JSExprSchema, z.number()]),
      secs: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:effects'),
      on: z.boolean(),
      strength: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:dayNight'),
      minutes: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({ type: z.literal('w3d:setTime'), time: irText(), ...idField }),
    z.object({ type: z.literal('w3d:weather'), kind: irText(), ...idField }),
    z.object({
      type: z.literal('w3d:wind'),
      force: z.union([JSExprSchema, z.number()]),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:onDayNight'),
      when: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('w3d:onUpdate'),
      dtName: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:onStart'),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('g2d:updateEachFrame'),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('classDecl'),
      name: irText(),
      superClass: irText().optional(),
      ctorParams: z.array(irText()).optional(),
      ctorId: z.string().optional(),
      ctorBody: z.array(JSStatementSchema),
      methods: z.array(
        z.object({
          __id: z.string().optional(),
          name: irText(),
          params: z.array(irText()),
          body: z.array(JSStatementSchema),
          async: z.boolean().optional(),
        }),
      ),
      ...idField,
    }),
    z.object({
      type: z.literal('newInstance'),
      varName: irText(),
      className: irText(),
      args: z.array(JSExprSchema).optional(),
      namespace: irText().optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('callMethod'),
      objectVar: irText(),
      method: irText(),
      args: z.array(JSExprSchema).optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('eventHandler'),
      target: irText(),
      targetKind: z.enum(['id', 'var', 'document', 'window']).optional(),
      event: eventKindSchema,
      handlerName: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('setThisProp'),
      name: irText(),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('setProp'),
      objectVar: irText(),
      name: irText(),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('memberSet'),
      object: JSExprSchema,
      name: irText(),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('indexSet'),
      object: JSExprSchema,
      index: JSExprSchema,
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('imageOnLoad'),
      target: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('onClickAssign'),
      target: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('awaitStmt'),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('setTimeoutCall'),
      fn: irText(),
      delay: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('imageOnError'),
      target: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('requestFrameDo'),
      param: irText().optional(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('loaderLoad'),
      resourceKind: z.enum(['model', 'audio']).default('model'),
      loaderVar: irText(),
      url: JSExprSchema,
      param: irText(),
      body: z.array(JSStatementSchema),
      errorParam: irText().optional(),
      errorBody: z.array(JSStatementSchema).optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('traverseEach'),
      object: JSExprSchema,
      param: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('threeSceneSetup'),
      scene: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('threeRendererSetup'),
      renderer: irText(),
      canvas: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('threeCameraSetup'),
      camera: irText(),
      canvas: irText(),
      fov: JSExprSchema,
      near: JSExprSchema,
      far: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('threeLightSetup'),
      light: irText(),
      scene: irText(),
      kind: z.enum(['ambient', 'directional']),
      color: JSExprSchema,
      intensity: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('rendererConfig'),
      renderer: irText(),
      pixels: z.enum(['device', 'off']),
      shadows: z.enum(['soft', 'hard', 'off']),
      colorSpace: z.enum(['srgb', 'off']),
      toneMapping: z.enum(['aces', 'off']),
      ...idField,
    }),
    z.object({
      type: z.literal('rendererResponsive'),
      renderer: irText(),
      camera: irText(),
      composer: irText().optional(),
      cleanup: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('environmentLoad'),
      scene: irText(),
      url: irText(),
      texture: irText(),
      background: z.boolean(),
      ...idField,
    }),
    z.object({
      type: z.literal('disposeObject'),
      object: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('lerpPosition'),
      object: irText(),
      target: JSExprSchema,
      alpha: JSExprSchema,
      dt: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('bloomSetup'),
      composer: irText(),
      renderer: irText(),
      scene: irText(),
      camera: irText(),
      strength: JSExprSchema,
      radius: JSExprSchema,
      threshold: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('particlesSetup'),
      particles: irText(),
      scene: irText(),
      count: JSExprSchema,
      size: JSExprSchema,
      spread: JSExprSchema,
      color: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('waterSetup'),
      water: irText(),
      scene: irText(),
      size: JSExprSchema,
      color: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('waterTime'),
      water: irText(),
      dt: JSExprSchema.optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('grassSetup'),
      grass: irText(),
      scene: irText(),
      count: JSExprSchema,
      size: JSExprSchema,
      spread: JSExprSchema,
      color: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('grassTime'),
      grass: irText(),
      dt: JSExprSchema.optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('signSetup'),
      sign: irText(),
      scene: irText(),
      text: irText(),
      size: JSExprSchema,
      color: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('primitiveSetup'),
      mesh: irText(),
      scene: irText(),
      shape: z.enum(['box', 'sphere', 'cylinder', 'cone', 'capsule']),
      width: JSExprSchema,
      height: JSExprSchema,
      depth: JSExprSchema,
      color: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('terrainSetup'),
      terrain: irText(),
      scene: irText(),
      heightFunction: irText(),
      size: JSExprSchema,
      segments: JSExprSchema,
      hills: JSExprSchema,
      smooth: JSExprSchema,
      color: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('roadSetup'),
      road: irText(),
      scene: irText(),
      x1: JSExprSchema,
      z1: JSExprSchema,
      x2: JSExprSchema,
      z2: JSExprSchema,
      width: JSExprSchema,
      color: JSExprSchema,
      heightFunction: irText().optional(),
      segments: JSExprSchema.optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('buildingSetup'),
      building: irText(),
      scene: irText(),
      x: JSExprSchema,
      z: JSExprSchema,
      width: JSExprSchema,
      height: JSExprSchema,
      depth: JSExprSchema,
      color: JSExprSchema,
      roofColor: JSExprSchema,
      heightFunction: irText().optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('citySetup'),
      city: irText(),
      scene: irText(),
      heightFunction: irText(),
      blocksX: JSExprSchema,
      blocksZ: JSExprSchema,
      spacing: JSExprSchema,
      roadWidth: JSExprSchema,
      minHeight: JSExprSchema,
      maxHeight: JSExprSchema,
      seed: JSExprSchema,
      color: JSExprSchema,
      roofColor: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('physicsLiteSetup'),
      world: irText(),
      heightFunction: irText(),
      gravity: JSExprSchema,
      maxSubSteps: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('physicsLiteStaticBox'),
      world: irText(),
      id: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      width: JSExprSchema,
      height: JSExprSchema,
      depth: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('physicsLiteStaticSphere'),
      world: irText(),
      id: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      radius: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('physicsLiteStaticObject'),
      world: irText(),
      id: irText(),
      object: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('physicsLiteStaticCity'),
      world: irText(),
      city: irText(),
      prefix: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('physicsLiteBody'),
      world: irText(),
      object: irText(),
      id: irText(),
      kind: z.enum(['character', 'dynamic']),
      width: JSExprSchema,
      height: JSExprSchema,
      depth: JSExprSchema,
      friction: JSExprSchema,
      bounce: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('physicsLiteMove'),
      world: irText(),
      id: irText(),
      x: JSExprSchema,
      z: JSExprSchema,
      speed: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('physicsLiteJump'),
      world: irText(),
      id: irText(),
      speed: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('physicsLiteTrigger'),
      world: irText(),
      id: irText(),
      x: JSExprSchema,
      y: JSExprSchema,
      z: JSExprSchema,
      width: JSExprSchema,
      height: JSExprSchema,
      depth: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('physicsLiteStep'),
      world: irText(),
      dt: JSExprSchema,
      ...idField,
    }),
    ...(['physicsLiteVelocity', 'physicsLiteImpulse', 'physicsLiteTeleport'] as const).map((type) =>
      z.object({
        type: z.literal(type),
        world: irText(),
        id: irText(),
        x: JSExprSchema,
        y: JSExprSchema,
        z: JSExprSchema,
        ...idField,
      }),
    ),
    z.object({
      type: z.literal('physicsLiteRemove'),
      world: irText(),
      id: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('physicsLiteClear'),
      world: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('physicsLiteCollisionEvent'),
      world: irText(),
      bodyParam: irText(),
      colliderParam: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('physicsLiteTriggerEvent'),
      world: irText(),
      bodyParam: irText(),
      triggerParam: irText(),
      enteringParam: irText(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('physicsLiteRaycast'),
      world: irText(),
      result: irText(),
      ox: JSExprSchema,
      oy: JSExprSchema,
      oz: JSExprSchema,
      dx: JSExprSchema,
      dy: JSExprSchema,
      dz: JSExprSchema,
      maxDistance: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('physicsLiteBodyState'),
      world: irText(),
      result: irText(),
      id: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('physicsLiteStats'),
      world: irText(),
      result: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('memberCall'),
      object: JSExprSchema,
      method: irText(),
      args: z.array(JSExprSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('superCall'),
      args: z.array(JSExprSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('superMethodCall'),
      method: irText(),
      args: z.array(JSExprSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('exprStatement'),
      value: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('requestFrame'),
      fn: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('mountRenderer'),
      renderer: irText(),
      ...idField,
    }),
    z.object({
      type: z.literal('return'),
      value: JSExprSchema.optional(),
      ...idField,
    }),
    z.object({
      type: z.literal('funcDecl'),
      name: irText(),
      params: z.array(irText()),
      async: z.boolean().optional(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('callFunction'),
      name: irText(),
      args: z.array(JSExprSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('forEach'),
      arrayExpr: JSExprSchema,
      itemName: irText(),
      indexName: irText().optional(),
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('newImage'),
      varName: irText(),
      src: JSExprSchema,
      ...idField,
    }),
    z.object({
      type: z.literal('setTimeout'),
      delay: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('setInterval'),
      delay: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('setTimeoutSeconds'),
      delay: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('setIntervalSeconds'),
      delay: JSExprSchema,
      body: z.array(JSStatementSchema),
      ...idField,
    }),
    z.object({
      type: z.literal('rawJS'),
      code: irText(),
      advanced: z.literal(true),
      ...idField,
    }),
  ]),
)

// ---------- Extension usage ----------

export interface ExtensionUsage {
  extensionId: string
}

export const ExtensionUsageSchema = z.object({ extensionId: irText() })

// ---------- HTML document shell ----------

/**
 * Onde o CSS/JS canônico vive no documento gerado:
 * - `external` (padrão): arquivo `style.css`/`script.js` + `<link>`/`<script src>`.
 * - `external-head`: `script.js` externo referenciado dentro do `<head>`.
 * - `inline-head`: `<style>`/`<script>` no fim do `<head>`.
 * - `inline-body-end`: `<style>`/`<script>` antes de `</body>`.
 *
 * Preserva o caso "tudo num único index.html": o conteúdo inline é extraído
 * para blocos (em `css`/`js`) e a geração o devolve ao mesmo lugar.
 */
export type AssetPlacement = 'external' | 'external-head' | 'inline-head' | 'inline-body-end'

export const AssetPlacementSchema = z.enum([
  'external',
  'external-head',
  'inline-head',
  'inline-body-end',
])

/**
 * "Casca" do documento HTML que os blocos não representam (doctype, atributos
 * de `<html>` e o conteúdo de `<head>`). Preservada verbatim no round-trip
 * código↔blocos para que o aluno nunca perca title/meta/links customizados.
 */
export interface HTMLShell {
  /** Ex.: `<!doctype html>`. */
  doctype?: string
  /** Atributos do elemento `<html>`, ex.: ` lang="pt-BR"`. */
  htmlAttrs?: string
  /** Conteúdo interno de `<head>`, verbatim. */
  head?: string
  /** Posição do CSS canônico no documento. Ausente ⇒ `external`. */
  cssPlacement?: AssetPlacement
  /** Posição do JS canônico no documento. Ausente ⇒ `external`. */
  jsPlacement?: AssetPlacement
  /**
   * Se o `<script>` inline original era `type="module"`. Quando ausente/false,
   * o script inline é re-emitido como CLÁSSICO — preserva funções globais e
   * handlers `onclick="..."`. Só relevante quando `jsPlacement` é inline.
   */
  jsModule?: boolean
}

export const HTMLShellSchema = z.object({
  doctype: irText().optional(),
  htmlAttrs: irText().optional(),
  head: irText().optional(),
  cssPlacement: AssetPlacementSchema.optional(),
  jsPlacement: AssetPlacementSchema.optional(),
  jsModule: z.boolean().optional(),
})

// ---------- Top-level SZ-IR ----------

export interface SZIR {
  html: HTMLNode[]
  css: CSSEntry[]
  js: JSStatement[]
  extensions: ExtensionUsage[]
  /** Casca do documento HTML preservada do código (head/doctype). */
  htmlShell?: HTMLShell
}

/** Estrutura canônica do comportamento após a migração para áreas tipadas. */
export interface BehaviorIR {
  start: JSStatement[]
  events: JSStatement[]
  loops: JSStatement[]
}

/**
 * IR versão 2. `js` não coexiste com `behavior`: projetos antigos entram por
 * `SZIR` e são normalizados na fronteira; projetos novos usam somente esta forma.
 */
export interface SZIRV2 {
  version: 2
  html: HTMLNode[]
  css: CSSEntry[]
  behavior: BehaviorIR
  extensions: ExtensionUsage[]
  htmlShell?: HTMLShell
}

export type SZIRInput = SZIR | SZIRV2

const GK_MAP_VISUAL_STATEMENTS = new Set(['gk:drawBackground', 'gk:drawTilemap'])

const G2D_REGISTERED_EVENT_TYPES = new Set([
  'g2d:onPointer',
  'g2d:onKey',
  'g2d:onOverlap',
  'g2d:onJump',
  'g2d:onAnyInput',
])

const G2D_DECLARATION_FIELDS: Readonly<Record<string, string>> = {
  var: 'name',
  'g2d:createSprite': 'varName',
  'g2d:createImageSprite': 'varName',
  'g2d:createShapeSprite': 'varName',
  'g2d:score': 'varName',
  'g2d:collides': 'varName',
  'g2d:circleCollides': 'varName',
  'g2d:createGroup': 'varName',
  // Opcionais: só declaram quando a criança preencheu o nome (o coletor de
  // símbolos ignora ausente/vazio), e o escopo sai do próprio lugar do bloco —
  // nome criado dentro de um temporizador vale ali dentro, não no jogo todo.
  'g2d:spawnInGroup': 'varName',
  'g2d:spawnImageInGroup': 'varName',
  'g2d:loadSpritesheet': 'varName',
  'g2d:defineEnemyType': 'varName',
  'g2d:createTileMap': 'varName',
  'g2d:createTileMapFromAsset': 'varName',
  'g2d:createShip': 'varName',
  'g2d:createDino': 'varName',
  'g2d:createCity': 'varName',
  'g2d:placeThrower': 'varName',
  'g2d:createStickHero': 'varName',
  'g2d:createStickPath': 'varName',
  'g2d:createBalloon': 'varName',
  'g2d:createBalloonPath': 'varName',
}

const G2D_REFERENCE_FIELDS = new Set([
  'spriteVar',
  'targetVar',
  'aVar',
  'bVar',
  'mapVar',
  'groupVar',
  'aGroup',
  'bGroup',
  'typeVar',
  'sheetVar',
  'gameVar',
  'cityVar',
  'throwerVar',
  'enemyVar',
  'otherVar',
  'shapeName',
])

const G2D_IMPLICIT_NAMES = new Set(['ctx', 'event', 'window', 'document', 'Math'])

function findNestedType(value: unknown, forbidden: (type: string) => boolean): string | undefined {
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = findNestedType(child, forbidden)
      if (found) return found
    }
    return undefined
  }
  if (typeof value !== 'object' || value === null) return undefined
  if ('type' in value && typeof value.type === 'string' && forbidden(value.type)) return value.type
  for (const child of Object.values(value)) {
    const found = findNestedType(child, forbidden)
    if (found) return found
  }
  return undefined
}

interface ChildStatementEntry {
  path: (string | number)[]
  body: JSStatement[]
}

function childStatementEntries(statement: JSStatement): ChildStatementEntry[] {
  const bodies: ChildStatementEntry[] = []
  for (const [key, value] of Object.entries(statement)) {
    if (key === 'elseif' && Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const branch = value[index]
        if (branch && typeof branch === 'object' && Array.isArray(branch.then)) {
          bodies.push({ path: ['elseif', index, 'then'], body: branch.then })
        }
      }
      continue
    }
    if (
      (key === 'body' ||
        key === 'then' ||
        key === 'else' ||
        key === 'handler' ||
        key === 'finalizer' ||
        key === 'catchBody' ||
        key === 'ctorBody' ||
        key === 'default' ||
        key === 'bodyA' ||
        key === 'bodyB') &&
      Array.isArray(value)
    ) {
      bodies.push({ path: [key], body: value as JSStatement[] })
    }
    if (key === 'cases' && Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const branch = value[index]
        if (branch && typeof branch === 'object' && Array.isArray(branch.body)) {
          bodies.push({ path: ['cases', index, 'body'], body: branch.body })
        }
      }
    }
    if (key === 'methods' && Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const method = value[index]
        if (method && typeof method === 'object' && Array.isArray(method.body)) {
          bodies.push({ path: ['methods', index, 'body'], body: method.body })
        }
      }
    }
  }
  return bodies
}

function validateG2DDeclarations(
  statements: JSStatement[],
  ctx: z.RefinementCtx,
  path: (string | number)[],
): void {
  const declared = new Map<string, number>()
  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index]
    if (!statement) continue
    const field = G2D_DECLARATION_FIELDS[statement.type]
    if (field) {
      const name = (statement as unknown as Record<string, unknown>)[field]
      if (typeof name === 'string' && name.trim()) {
        const normalized = name.trim()
        const previous = declared.get(normalized)
        if (previous !== undefined) {
          ctx.addIssue({
            code: 'custom',
            path: [...path, index, field],
            message: `O nome “${normalized}” já foi criado neste trecho; escolha um nome diferente`,
          })
        } else {
          declared.set(normalized, index)
        }
      }
    }
    for (const child of childStatementEntries(statement)) {
      validateG2DDeclarations(child.body, ctx, [...path, index, ...child.path])
    }
  }
}

const LOOP_FORBIDDEN_RESOURCE_TYPES: ReadonlySet<string> = new Set([
  ...GAME3D_START_ONLY_STATEMENT_TYPES,
  ...PERSISTENT_EXTENSION_STATEMENT_TYPES,
])

function containsCanvas3DResourceCreatorExpression(
  value: unknown,
  importedClassNames: ReadonlySet<string> | undefined,
): boolean {
  if (Array.isArray(value)) {
    return value.some((child) =>
      containsCanvas3DResourceCreatorExpression(child, importedClassNames),
    )
  }
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (
    isCanvas3DResourceCreatorExpression(
      {
        type: typeof record.type === 'string' ? record.type : '',
        className: typeof record.className === 'string' ? record.className : undefined,
        namespace: typeof record.namespace === 'string' ? record.namespace : undefined,
      },
      importedClassNames,
    )
  ) {
    return true
  }
  return Object.entries(record).some(
    ([key, child]) =>
      key !== '__id' && containsCanvas3DResourceCreatorExpression(child, importedClassNames),
  )
}

function validateLegacyLifecycle(
  statements: JSStatement[],
  ctx: z.RefinementCtx,
  path: (string | number)[],
  canvas3dContexts: Canvas3DStatementContextIndex,
  insideLoop = false,
  nested = false,
  directG3kMoldBody = false,
  insideRunningContext = false,
  insideActionContext = false,
  insideConstructor = false,
  insideActionLoop = false,
): void {
  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index]
    if (!statement) continue
    const canvas3dContext = canvas3dContexts.get(statement)
    if (GAME3D_RUNNING_CONTEXT_STATEMENT_TYPES.has(statement.type) && !insideRunningContext) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, index],
        message: `“${statement.type}” só pode ser usado enquanto o jogo estiver rodando`,
      })
    } else if (
      GAME3D_ACTION_CONTEXT_STATEMENT_TYPES.has(statement.type) &&
      (!insideActionContext || insideConstructor || insideActionLoop)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, index],
        message: `“${statement.type}” precisa responder a um evento ou ser chamado por uma função`,
      })
    } else if (statement.type === 'g3k:part' && !directG3kMoldBody) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, index],
        message: '“g3k:part” só pode ser usado diretamente dentro de “Criar o molde 3D”',
      })
    } else if (directG3kMoldBody && statement.type !== 'g3k:part') {
      ctx.addIssue({
        code: 'custom',
        path: [...path, index],
        message: 'O corpo de “Criar o molde 3D” aceita somente blocos “Peça” diretos',
      })
    } else if (
      insideLoop &&
      (LOOP_FORBIDDEN_RESOURCE_TYPES.has(statement.type) ||
        isCanvas3DResourceCreatorStatement(statement, canvas3dContext?.importedClasses) ||
        containsCanvas3DResourceCreatorExpression(statement, canvas3dContext?.importedClasses))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, index],
        message: `Mova ${statement.type} para fora do laço; este recurso ou configuração deve ser criado uma vez`,
      })
    } else if (nested && START_ONLY_STATEMENT_TYPES.has(statement.type)) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, index],
        message: `“${statement.type}” só pode ser usado diretamente em Ao iniciar`,
      })
    }
    const childInsideLoop = insideLoop || isLoopStatement(statement)
    const childNested =
      nested || (!LEGACY_START_WRAPPER_TYPES.has(statement.type) && !isLegacyLoadEvent(statement))
    for (const child of childStatementEntries(statement)) {
      const childIsG3kMoldBody = statement.type === 'g3k:defineMold' && child.path[0] === 'body'
      const childIsConstructor = statement.type === 'classDecl' && child.path[0] === 'ctorBody'
      const childIsMethod = statement.type === 'classDecl' && child.path[0] === 'methods'
      const startsFunction = statement.type === 'funcDecl' || childIsConstructor || childIsMethod
      const startsEvent = isEventStatement(statement)
      const startsActionBoundary = startsFunction || startsEvent
      const childInsideRunningContext =
        childInsideLoop ||
        startsEvent ||
        statement.type === 'funcDecl' ||
        childIsMethod ||
        (!startsFunction && insideRunningContext)
      const childInsideActionContext =
        startsEvent ||
        statement.type === 'funcDecl' ||
        childIsMethod ||
        (!startsActionBoundary && insideActionContext)
      const childInsideConstructor =
        childIsConstructor || (!startsActionBoundary && insideConstructor)
      const childInsideActionLoop = startsActionBoundary
        ? false
        : insideActionLoop || isLoopStatement(statement)
      validateLegacyLifecycle(
        child.body,
        ctx,
        [...path, index, ...child.path],
        canvas3dContexts,
        childInsideLoop,
        childNested,
        childIsG3kMoldBody,
        childInsideRunningContext,
        childInsideActionContext,
        childInsideConstructor,
        childInsideActionLoop,
      )
    }
  }
}

function g2dLocalNames(statement: JSStatement): string[] {
  const record = statement as unknown as Record<string, unknown>
  switch (statement.type) {
    case 'g2d:onPointer':
      return [record.xName, record.yName].filter((name): name is string => typeof name === 'string')
    case 'g2d:onGroupOverlap':
      return [record.aName, record.bName].filter((name): name is string => typeof name === 'string')
    case 'g2d:forEachInGroup':
    case 'g2d:pruneOffscreen':
    case 'g2d:onSpriteGroupOverlap':
    case 'g2d:onEnemyDefeated':
    case 'g2d:onEnemyShotHit':
      return typeof record.itemName === 'string' ? [record.itemName] : []
    default:
      return []
  }
}

function validateG2DReferenceValue(
  value: unknown,
  symbols: ReadonlySet<string>,
  ctx: z.RefinementCtx,
  path: (string | number)[],
): void {
  if (Array.isArray(value) || typeof value !== 'object' || value === null) return
  const record = value as Record<string, unknown>
  const type = typeof record.type === 'string' ? record.type : ''

  for (const [key, child] of Object.entries(record)) {
    if (key === '__id' || key === 'body' || key === 'then' || key === 'else' || key === 'elseif')
      continue
    if (
      G2D_REFERENCE_FIELDS.has(key) &&
      typeof child === 'string' &&
      G2D_DECLARATION_FIELDS[type] !== key &&
      !(type === 'g2d:defineShape' && key === 'shapeName')
    ) {
      const name = child.trim()
      if (name && !symbols.has(name) && !G2D_IMPLICIT_NAMES.has(name)) {
        ctx.addIssue({
          code: 'custom',
          path: [...path, key],
          message: `O nome “${name}” ainda não foi criado neste jogo`,
        })
      }
      continue
    }
    validateG2DReferenceValue(child, symbols, ctx, [...path, key])
  }
}

function validateG2DReferences(
  statements: JSStatement[],
  ctx: z.RefinementCtx,
  path: (string | number)[],
  inherited: ReadonlySet<string> = G2D_IMPLICIT_NAMES,
): void {
  const symbols = new Set(inherited)
  for (const statement of statements) {
    const field = G2D_DECLARATION_FIELDS[statement.type]
    const name = field ? (statement as unknown as Record<string, unknown>)[field] : undefined
    if (typeof name === 'string' && name.trim()) symbols.add(name.trim())
    if (statement.type === 'g2d:defineShape' && statement.shapeName.trim()) {
      symbols.add(statement.shapeName.trim())
    }
  }

  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index]
    if (!statement) continue
    validateG2DReferenceValue(statement, symbols, ctx, [...path, index])

    const childSymbols = new Set(symbols)
    for (const local of g2dLocalNames(statement)) {
      if (local.trim()) childSymbols.add(local.trim())
    }
    for (const child of childStatementEntries(statement)) {
      validateG2DReferences(child.body, ctx, [...path, index, ...child.path], childSymbols)
    }
  }
}

function collectCanvasIds(nodes: readonly HTMLNode[], ids = new Set<string>()): Set<string> {
  for (const node of nodes) {
    if (node.type === 'canvas' && node.id?.trim()) ids.add(node.id.trim())
    if ('children' in node && node.children) collectCanvasIds(node.children, ids)
  }
  return ids
}

export const SZIRSchema = z
  .object({
    html: z.array(HTMLNodeSchema),
    css: z.array(CSSEntrySchema),
    js: z.array(JSStatementSchema),
    extensions: z.array(ExtensionUsageSchema),
    htmlShell: HTMLShellSchema.optional(),
  })

  .superRefine((ir, ctx) => {
    validateLegacyLifecycle(ir.js, ctx, ['js'], createCanvas3DStatementContextIndex(ir.js))
    for (const issue of collectProgrammingReferenceIssues(ir.js, ['js'], {
      canvasIds: collectCanvasIds(ir.html),
      // Pincel entregue por runtime instalado (`ctx` do Jogo 2D) conta como
      // preparado — canvas do núcleo num jogo 2D não é referência órfã.
      providedCanvasContexts: runtimeProvidedCanvasContexts(ir.extensions),
    })) {
      ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message })
    }
    const starts = ir.js
      .map((statement, index) => ({ statement, index }))
      .filter(({ statement }) => statement.type === 'g2d:onStart')
    if (starts.length > 1) {
      for (const duplicate of starts.slice(1)) {
        ctx.addIssue({
          code: 'custom',
          path: ['js', duplicate.index],
          message: 'Use somente um bloco “Quando o jogo começar”',
        })
      }
    }

    for (let index = 0; index < ir.js.length; index += 1) {
      const statement = ir.js[index]
      if (statement?.type === 'g2d:updateEachFrame') {
        const nestedEvent = findNestedType(statement.body, (type) =>
          G2D_REGISTERED_EVENT_TYPES.has(type),
        )
        if (nestedEvent) {
          ctx.addIssue({
            code: 'custom',
            path: ['js', index, 'body'],
            message: `Mova ${nestedEvent} para fora de “A cada quadro”; eventos são registrados uma vez no início`,
          })
        }
      }
      if (statement?.type === 'g2d:onStart') {
        for (let childIndex = 0; childIndex < statement.body.length; childIndex += 1) {
          const child = statement.body[childIndex]
          if (!child) continue
          if (child.type === 'g2d:onStart') {
            ctx.addIssue({
              code: 'custom',
              path: ['js', index, 'body', childIndex],
              message:
                '“Quando o jogo começar” deve ser o bloco raiz, não ficar dentro de outro bloco',
            })
          }
          if (child.type === 'g2d:updateEachFrame') {
            const nestedEvent = findNestedType(child.body, (type) =>
              G2D_REGISTERED_EVENT_TYPES.has(type),
            )
            if (nestedEvent) {
              ctx.addIssue({
                code: 'custom',
                path: ['js', index, 'body', childIndex, 'body'],
                message: `Mova ${nestedEvent} para fora de “A cada quadro”; eventos são registrados uma vez no início`,
              })
            }
          }
        }
      }
    }
    validateG2DDeclarations(ir.js, ctx, ['js'])
    if (ir.extensions.some((extension) => extension.extensionId === 'game-2d')) {
      validateG2DReferences(ir.js, ctx, ['js'])
    }

    for (let index = 0; index < ir.js.length; index += 1) {
      const statement = ir.js[index]
      if (statement?.type === 'gk:rpgCreateMap') {
        const forbidden = findNestedType(
          statement.body,
          (type) => GK_STATEMENT_TYPES.has(type) && !GK_MAP_VISUAL_STATEMENTS.has(type),
        )
        if (forbidden) {
          ctx.addIssue({
            code: 'custom',
            path: ['js', index, 'body'],
            message: `“Criar o mapa” aceita somente desenho; mova ${forbidden} para “Quando entrar no mapa”`,
          })
        }
      }
      if (statement?.type === 'gk:rpgOnEnterMap') {
        const forbidden = findNestedType(
          statement.body,
          (type) => GK_MAP_VISUAL_STATEMENTS.has(type) || type.startsWith('canvas'),
        )
        if (forbidden) {
          ctx.addIssue({
            code: 'custom',
            path: ['js', index, 'body'],
            message: `“Quando entrar no mapa” aceita somente comportamento; mova ${forbidden} para “Criar o mapa”`,
          })
        }
      }
    }
  })

export const BehaviorIRSchema = z.object({
  start: z.array(JSStatementSchema),
  events: z.array(JSStatementSchema),
  loops: z.array(JSStatementSchema),
})

function v2PathFromLegacy(
  path: PropertyKey[],
  startLength: number,
  eventsLength: number,
): PropertyKey[] {
  if (path[0] !== 'js' || typeof path[1] !== 'number') return path
  const index = path[1]
  if (index < startLength) return ['behavior', 'start', index, ...path.slice(2)]
  if (index < startLength + eventsLength) {
    return ['behavior', 'events', index - startLength, ...path.slice(2)]
  }
  return ['behavior', 'loops', index - startLength - eventsLength, ...path.slice(2)]
}

export const SZIRV2Schema = z
  .object({
    version: z.literal(2),
    html: z.array(HTMLNodeSchema),
    css: z.array(CSSEntrySchema),
    behavior: BehaviorIRSchema,
    extensions: z.array(ExtensionUsageSchema),
    htmlShell: HTMLShellSchema.optional(),
  })
  .superRefine((ir, ctx) => {
    const legacy = SZIRSchema.safeParse({
      html: ir.html,
      css: ir.css,
      js: [...ir.behavior.start, ...ir.behavior.events, ...ir.behavior.loops],
      extensions: ir.extensions,
      ...(ir.htmlShell ? { htmlShell: ir.htmlShell } : {}),
    })
    if (!legacy.success) {
      for (const issue of legacy.error.issues) {
        ctx.addIssue({
          code: 'custom',
          path: v2PathFromLegacy(issue.path, ir.behavior.start.length, ir.behavior.events.length),
          message: issue.message,
        })
      }
    }

    for (const area of ['start', 'events', 'loops'] as const satisfies readonly LifecycleArea[]) {
      for (let index = 0; index < ir.behavior[area].length; index += 1) {
        const statement = ir.behavior[area][index]
        if (!statement) continue
        const rootPath: PropertyKey[] = ['behavior', area, index]
        if (!isLifecycleRootAllowed(statement, area)) {
          ctx.addIssue({
            code: 'custom',
            path: rootPath,
            message: `O bloco “${statement.type}” não pode ficar na área “${area}”`,
          })
        }
        for (const issue of validateLifecycleSemantics(statement, rootPath)) {
          ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message })
        }
      }
    }
  })

export const SZIRInputSchema = z.union([SZIRV2Schema, SZIRSchema])

export function isAdvancedHTML(node: HTMLNode): node is Extract<HTMLNode, { type: 'rawHTML' }> {
  return node.type === 'rawHTML'
}

export function isAdvancedCSS(entry: CSSEntry): entry is RawCSS {
  return (entry as RawCSS).type === 'rawCSS'
}

export function isAdvancedJS(stmt: JSStatement): stmt is Extract<JSStatement, { type: 'rawJS' }> {
  return stmt.type === 'rawJS'
}

export const G2D_STATEMENT_TYPES = new Set([
  'g2d:onStart',
  'g2d:createSprite',
  'g2d:drawSprite',
  'g2d:setPosition',
  'g2d:setVelocity',
  'g2d:collides',
  'g2d:score',
  'g2d:gameOver',
  'g2d:updateEachFrame',
  'g2d:setGravity',
  'g2d:applyVelocity',
  'g2d:applyGravity',
  'g2d:onJump',
  'g2d:onAnyInput',
  'g2d:bounceOnEdges',
  'g2d:circleCollides',
  'g2d:playSound',
  'g2d:playFx',
  'g2d:playMusic',
  'g2d:stopMusic',
  'g2d:playNote',
  'g2d:aimAt',
  'g2d:moveToward',
  'g2d:setHealth',
  'g2d:changeHealth',
  'g2d:damageSprite',
  'g2d:flipSprite',
  'g2d:setOpacity',
  'g2d:setSize',
  'g2d:scaleSprite',
  'g2d:wrapEdges',
  'g2d:pruneOld',
  'g2d:pauseGame',
  'g2d:resumeGame',
  'g2d:cameraFollow',
  'g2d:setCamera',
  'g2d:breakTile',
  'g2d:setTile',
  'g2d:bringToFront',
  'g2d:sendToBack',
  'g2d:drawHitbox',
  'g2d:showFps',
  'g2d:onPointer',
  'g2d:createImageSprite',
  'g2d:setImage',
  'g2d:defineShape',
  'g2d:createShapeSprite',
  'g2d:setShape',
  'g2d:paintRect',
  'g2d:paintCircle',
  'g2d:paintEllipse',
  'g2d:paintTriangle',
  'g2d:paintLine',
  'g2d:loadSpritesheet',
  'g2d:animateSprite',
  'g2d:setStateAnim',
  'g2d:autoAnimate',
  'g2d:defineEnemyType',
  'g2d:enemyStateAnim',
  'g2d:setEnemyTypeParam',
  'g2d:spawnEnemy',
  'g2d:updateEnemyType',
  'g2d:drawEnemyType',
  'g2d:onEnemyDefeated',
  'g2d:onEnemyShotHit',
  'g2d:hurtByEnemy',
  'g2d:drawFrame',
  'g2d:platformer',
  'g2d:topDown',
  'g2d:flyFree',
  'g2d:flap',
  'g2d:swim',
  'g2d:followPointer',
  'g2d:clampToScreen',
  'g2d:flash',
  'g2d:shake',
  'g2d:emitParticles',
  'g2d:drawParticles',
  'g2d:createTileMap',
  'g2d:createTileMapFromAsset',
  'g2d:drawTileMap',
  'g2d:tileMapCollide',
  'g2d:collideGroup',
  'g2d:collideSprite',
  'g2d:createGroup',
  'g2d:spawnInGroup',
  'g2d:spawnImageInGroup',
  'g2d:updateGroup',
  'g2d:applyGravityToGroup',
  'g2d:drawGroup',
  'g2d:drawGroupByY',
  'g2d:forEachInGroup',
  'g2d:clearGroup',
  'g2d:pruneOffscreen',
  'g2d:onGroupOverlap',
  'g2d:addToGroup',
  'g2d:removeFromGroup',
  'g2d:everyFrames',
  'g2d:everySeconds',
  'g2d:afterSeconds',
  'g2d:setHitboxScale',
  'g2d:drawScore',
  'g2d:drawLabel',
  'g2d:drawHearts',
  'g2d:drawSpriteHealth',
  'g2d:drawBar',
  'g2d:setStageDescription',
  'g2d:setScene',
  'g2d:showScreen',
  'g2d:restart',
  'g2d:starfield',
  'g2d:dragX',
  'g2d:fitScreen',
  'g2d:stageBorder',
  'g2d:setBackdrop',
  'g2d:drawBackdrop',
  'g2d:setupStage',
  'g2d:setupFull',
  'g2d:spawnBullet',
  'g2d:arrowsX',
  'g2d:blinkSprite',
  'g2d:createShip',
  'g2d:spawnAsteroid',
  'g2d:explode',
  'g2d:playShoot',
  'g2d:playExplosion',
  'g2d:onSpriteGroupOverlap',
  'g2d:steerThrust',
  'g2d:rotateSprite',
  'g2d:pointSprite',
  'g2d:thrust',
  'g2d:applyFriction',
  'g2d:shootFrom',
  'g2d:spawnAsteroidEdge',
  'g2d:jumpOnGround',
  'g2d:createDino',
  'g2d:controlDino',
  'g2d:spawnObstacle',
  'g2d:spawnEgg',
  'g2d:forest',
  'g2d:playJump',
  'g2d:playDinoHurt',
  'g2d:playCollect',
  'g2d:createCity',
  'g2d:drawCity',
  'g2d:placeThrower',
  'g2d:newWind',
  'g2d:drawWind',
  'g2d:aimDrag',
  'g2d:throwBanana',
  'g2d:updateBanana',
  'g2d:drawBanana',
  'g2d:playWhistle',
  'g2d:playBoom',
  'g2d:computerTurn',
  'g2d:drawAimReadout',
  'g2d:createStickHero',
  'g2d:createStickPath',
  'g2d:stickPathScenery',
  'g2d:stickPathGrow',
  'g2d:stickPathDrop',
  'g2d:stickPathWalk',
  'g2d:stickPathDraw',
  'g2d:onStickPathCross',
  'g2d:onStickPathPerfect',
  'g2d:createBalloon',
  'g2d:createBalloonPath',
  'g2d:balloonPathScenery',
  'g2d:balloonFire',
  'g2d:balloonFly',
  'g2d:balloonPathScroll',
  'g2d:onBalloonPathTreeHit',
])

export const G3D_STATEMENT_TYPES = new Set([
  'g3d:createScene',
  'g3d:createFullscreenScene',
  'g3d:setBackground',
  'g3d:setCameraPosition',
  'g3d:createBox',
  'g3d:createSphere',
  'g3d:setPosition',
  'g3d:setRotation',
  'g3d:animate',
  'g3d:createBlock',
  'g3d:setVelocity',
  'g3d:jump',
  'g3d:applyGravity',
  'g3d:controlWithKeys',
  'g3d:setScale',
  'g3d:cameraFollow',
  'g3d:everyFrames',
  'g3d:everySeconds',
  'g3d:createGroup',
  'g3d:updateGroup',
  'g3d:updateGroupNoGravity',
  'g3d:pruneOffscreen',
  'g3d:forEachInGroup',
  'g3d:removeFromGroup',
  'g3d:clearGroup',
  'g3d:spawnEnemy',
  'g3d:stop',
  'g3d:createCrossingScene',
  'g3d:createCrosser',
  'g3d:crosserMove',
  'g3d:crosserStep',
  'g3d:crosserReset',
  'g3d:gridPosition',
  'g3d:addRow',
  'g3d:generateRows',
  'g3d:moveTraffic',
  'g3d:isometricCamera',
  'g3d:gridStep',
  'g3d:gridMove',
  'g3d:moveAcross',
  'g3d:topCamera',
  'g3d:moveInCircle',
  'g3d:createRaceScene',
  'g3d:createRaceTrack',
  'g3d:createRaceCar',
  'g3d:raceStep',
  'g3d:raceControl',
  'g3d:runRivals',
  'g3d:raceReset',
  'g3d:fall',
  'g3d:slideBetween',
  'g3d:spin',
  'g3d:createStackScene',
  'g3d:createStackTower',
  'g3d:stackDrop',
  'g3d:stackStep',
  'g3d:stackReset',
  'g3d:moveBy',
  'g3d:rotateBy',
  'g3d:moveTowards',
  'g3d:lookAtObject',
  'g3d:lookAtPoint',
  'g3d:moveForward',
  'g3d:faceVelocity',
  'g3d:body',
  'g3d:stepBody',
  'g3d:setSolid',
  'g3d:platformerControls',
  'g3d:fpsControls',
  'g3d:resolveCollision',
  'g3d:fpsCamera',
  'g3d:orbitCamera',
  'g3d:thirdPersonCamera',
  'g3d:cameraLookAt',
  'g3d:setFOV',
  'g3d:createCylinder',
  'g3d:createCone',
  'g3d:createPlane',
  'g3d:createTorus',
  'g3d:createModel',
  'g3d:setColor',
  'g3d:setOpacity',
  'g3d:setMaterial',
  'g3d:setTexture',
  'g3d:setVisible',
  'g3d:removeObject',
  'g3d:addToModel',
  'g3d:addAmbientLight',
  'g3d:addSunLight',
  'g3d:addPointLight',
  'g3d:setFog',
  'g3d:setSky',
  'g3d:setShadows',
  'g3d:createSwarm',
  'g3d:spawnInSwarm',
  'g3d:forEachInSwarm',
  'g3d:removeFromSwarm',
  'g3d:pruneSwarm',
  'g3d:playNote',
  'g3d:playEffect',
])

export const GK_STATEMENT_TYPES = new Set([
  'gk:setup',
  'gk:setupFull',
  'gk:setStageDescription',
  'gk:stageBorder',
  'gk:setBackdrop',
  'gk:drawBackdrop',
  'gk:showHitboxes',
  'gk:start',
  'gk:loadImage',
  'gk:setScreenText',
  'gk:createScreen',
  'gk:addButton',
  'gk:setScreenBg',
  'gk:showScreen',
  'gk:hideScreens',
  'gk:setState',
  'gk:restartGame',
  'gk:onGameStart',
  'gk:onEnterState',
  'gk:pause',
  'gk:resume',
  'gk:returnToMenu',
  'gk:endGame',
  'gk:onUpdate',
  'gk:onDraw',
  'gk:onDrawHud',
  'gk:setSheet',
  'gk:playAnim',
  'gk:cameraFollow',
  'gk:cameraFollowMap',
  'gk:cameraStop',
  'gk:launchTowards',
  'gk:moveByVelocity',
  'gk:setAngle',
  'gk:onGameClick',
  'gk:drawBar',
  'gk:rpgMoveGrid',
  'gk:rpgBlockCell',
  'gk:rpgCreateNpc',
  'gk:rpgDrawNpcs',
  'gk:rpgOnTalk',
  'gk:rpgSay',
  'gk:rpgAddFlag',
  'gk:rpgGiveItem',
  'gk:rpgRemoveItem',
  'gk:rpgDrawInventory',
  'gk:rpgGoMap',
  'gk:rpgSetStartMap',
  'gk:rpgCreateMap',
  'gk:rpgOnEnterMap',
  'gk:rpgCreateDoor',
  'gk:rpgConnectEdge',
  'gk:rpgBattleStats',
  'gk:rpgBattleStart',
  'gk:rpgOnBattleEnd',
  'gk:rpgSetSpecial',
  'gk:rpgGivePotion',
  'gk:rpgHealHero',
  'gk:rpgBattleReward',
  'gk:rpgInflict',
  'gk:rpgAddAlly',
  'gk:rpgAddFoe',
  'gk:rpgDefineBattler',
  'gk:rpgBattleNamed',
  'gk:rpgAddFoeNamed',
  'gk:rpgTeachMove',
  'gk:rpgTeachHeal',
  'gk:rpgAddBoss',
  'gk:rpgOnFoeTurn',
  'gk:rpgFoeUse',
  'gk:rpgFoeHitAll',
  'gk:setWalkSheet',
  'gk:rpgCutscene',
  'gk:rpgWait',
  'gk:rpgFace',
  'gk:rpgNpcWalkTo',
  'gk:rpgNpcWander',
  'gk:rpgOnStep',
  'gk:rpgMenu',
  'gk:rpgOption',
  'gk:rpgSave',
  'gk:rpgLoad',
  'gk:loadTilemap',
  'gk:drawTilemap',
  'gk:tilemapSolid',
  'gk:drawShadow',
  'gk:drawByDepth',
  'gk:cameraShake',
  'gk:applyGravity',
  'gk:jump',
  'gk:setVelocity',
  'gk:setTerminalVelocity',
  'gk:bounceOnEdges',
  'gk:paddleBounce',
  'gk:boardCreate',
  'gk:boardSet',
  'gk:playersSetup',
  'gk:nextPlayer',
  'gk:onTurnChange',
  'gk:moveAlongTrack',
  'gk:onLandSpace',
  'gk:pileMoveTop',
  'gk:pileShuffleFrom',
  'gk:cardFlip',
  'gk:handDraw',
  'gk:cardsStart',
  'gk:cardsEnergyPerTurn',
  'gk:cardsSpend',
  'gk:cardsOnTurn',
  'gk:cardsEndTurn',
  'gk:cardsDrawHud',
  'gk:cardsHurtEnemy',
  'gk:cardsHurtMe',
  'gk:cardsGainBlock',
  'gk:cardsEnemyIntent',
  'gk:cardsOnEnemyTurn',
  'gk:wrapEdges',
  'gk:collideTilemap',
  'gk:collideGroup',
  'gk:overlapGroups',
  'gk:everySeconds',
  'gk:setTileSize',
  'gk:setTileAt',
  'gk:breakTileAt',
  'gk:setProperty',
  'gk:setFacingDir',
  'gk:tweenTo',
  'gk:platformerHero',
  'gk:setJumpFeel',
  'gk:doubleJump',
  'gk:wallSlide',
  'gk:wallJump',
  'gk:climbLadder',
  'gk:oneWayPlatform',
  'gk:dropThrough',
  'gk:movingPlatform',
  'gk:rideOn',
  'gk:stompKill',
  'gk:patrolTurnAtWall',
  'gk:setCheckpoint',
  'gk:respawn',
  'gk:platStateFrames',
  'gk:platformerAnim',
  'gk:defineRegion',
  'gk:launchToPoint',
  'gk:setVelocityAngle',
  'gk:floatText',
  'gk:trailOn',
  'gk:trailOff',
  'gk:shockwave',
  'gk:scrollImage',
  'gk:leanOnMove',
  'gk:fanShot',
  'gk:naveShip',
  'gk:navePowerup',
  'gk:naveWave',
  'gk:naveWaveShooter',
  'gk:naveInvasionLine',
  'gk:naveStarfield',
  'gk:naveBomb',
  'gk:definePath',
  'gk:pathPoint',
  'gk:followPath',
  'gk:parallaxLayer',
  'gk:sheetBurst',
  'gk:tdWave',
  'gk:tdSlot',
  'gk:tdDrawSlots',
  'gk:tdOnBuy',
  'gk:tdFreeSlot',
  'gk:tdDrawRange',
  'gk:tdSetCoins',
  'gk:tdAddCoins',
  'gk:setOpacity',
  'gk:fadeTo',
  'gk:tweenProperty',
  'gk:setHitbox',
  'gk:setHitboxShape',
  'gk:setSwingWindow',
  'gk:lutaMatch',
  'gk:lutaDrawHud',
  'gk:lutaFighter',
  'gk:lutaAI',
  'gk:lutaMove',
  'gk:lutaMoveAnim',
  'gk:lutaAttack',
  'gk:playAnimOnce',
  'gk:setEntityState',
  'gk:stateAnim',
  'gk:stateLook',
  'gk:autoAnimate',
  'gk:thrust',
  'gk:applyFriction',
  'gk:waitThen',
  'gk:fadeScreen',
  'gk:flashScreen',
  'gk:saveValue',
  'gk:playMusic',
  'gk:stopSound',
  'gk:setVolume',
  'gk:createEmptyTilemap',
  'gk:moveWithCustomKeys',
  'gk:pkmCreature',
  'gk:pkmMove',
  'gk:pkmTypeChart',
  'gk:pkmEvolve',
  'gk:pkmCatchDifficulty',
  'gk:pkmGive',
  'gk:pkmGiveBall',
  'gk:pkmHealTeam',
  'gk:pkmDrawTeam',
  'gk:pkmGrassCells',
  'gk:pkmGrassTiles',
  'gk:pkmWild',
  'gk:pkmEncounterRate',
  'gk:pkmBattleWild',
  'gk:pkmBattleTrainer',
  'gk:pkmTrainerCreature',
  'gk:attackFacing',
  'gk:patrolAround',
  'gk:drawHearts',
  'gk:drawBackground',
  'gk:createCharacter',
  'gk:moveWithKeys',
  'gk:keepOnScreen',
  'gk:drawCharacter',
  'gk:placeCharacter',
  'gk:resetCharacter',
  'gk:setSpeedMultiplier',
  'gk:setPauseKey',
  'gk:onEvent',
  'gk:emit',
  'gk:defineMold',
  'gk:spawnFromMold',
  'gk:startSpawner',
  'gk:stopSpawner',
  'gk:spawnNamed',
  'gk:forEachActive',
  'gk:cullOffscreen',
  'gk:recycle',
  'gk:drawActive',
  'gk:defineLook',
  'gk:drawLook',
  'gk:seek',
  'gk:drift',
  'gk:face',
  'gk:hurt',
  'gk:knockback',
  'gk:drawHealthBar',
  'gk:setMission',
  'gk:missionKill',
  'gk:drawTimer',
  'gk:defineEffect',
  'gk:burst',
  'gk:drawEffects',
  'gk:loadSound',
  'gk:playSound',
  'gk:playEffect',
  'gk:playTone',
])

export const G3K_STATEMENT_TYPES = new Set([
  'g3k:setup',
  'g3k:setEffects',
  'g3k:scatterDecor',
  'g3k:start',
  'g3k:defineMold',
  'g3k:part',
  'g3k:spawn',
  'g3k:spawnNamed',
  'g3k:spawnFrom',
  'g3k:startSpawner',
  'g3k:stopSpawner',
  'g3k:forEachAlive',
  'g3k:recycle',
  'g3k:recycleAll',
  'g3k:cullFar',
  'g3k:onUpdate',
  'g3k:moveWithKeys',
  'g3k:setPauseKey',
  'g3k:cameraFollow',
  'g3k:cameraOrbit',
  'g3k:cameraTop',
  'g3k:cameraAngle',
  'g3k:cameraDistance',
  'g3k:cameraShake',
  'g3k:cameraLens',
  'g3k:cameraLookAt',
  'g3k:cameraLookAtPoint',
  'g3k:cameraSmooth',
  'g3k:place',
  'g3k:setYaw',
  'g3k:setVelocity',
  'g3k:setDrag',
  'g3k:setEntityValue',
  'g3k:lookAt',
  'g3k:moveForward',
  'g3k:fall',
  'g3k:jump',
  'g3k:makeSolid',
  'g3k:platformerKeys',
  'g3k:setCollider',
  'g3k:setPhysics',
  'g3k:playAnim',
  'g3k:stopAnim',
  'g3k:setStateAnim',
  'g3k:playMusic',
  'g3k:stopMusic',
  'g3k:startTimer',
  'g3k:stopTimer',
  'g3k:onTimerEnd',
  'g3k:say',
  'g3k:hideSay',
  'g3k:passThrough',
  'g3k:showHealthBar',
  'g3k:makeTrigger',
  'g3k:setSeed',
  'g3k:onOverlap',
  'g3k:setBounce',
  'g3k:setFriction',
  'g3k:addLight',
  'g3k:setAmbient',
  'g3k:setFog',
  'g3k:setSky',
  'g3k:setSkyPhoto',
  'g3k:pick',
  'g3k:cameraFps',
  'g3k:moveFps',
  'g3k:defineEmitter',
  'g3k:startEmitter',
  'g3k:emitterOn',
  'g3k:stopEmitter',
  'g3k:addAttractor',
  'g3k:onEnterEntityState',
  'g3k:onEntityStateUpdate',
  'g3k:onExitEntityState',
  'g3k:setEntityState',
  'g3k:stateTimer',
  'g3k:seek',
  'g3k:seekPoint',
  'g3k:aimAt',
  'g3k:faceVelocity',
  'g3k:forEachNear',
  'g3k:storeNearest',
  'g3k:hurt',
  'g3k:onEntityDeath',
  'g3k:heal',
  'g3k:onHurt',
  'g3k:spawnRing',
  'g3k:defineEffect',
  'g3k:burstAt',
  'g3k:burstOn',
  'g3k:setScreenText',
  'g3k:createScreen',
  'g3k:addButton',
  'g3k:showScreen',
  'g3k:hideScreens',
  'g3k:hudText',
  'g3k:setState',
  'g3k:onEnterState',
  'g3k:returnToMenu',
  'g3k:endGame',
  'g3k:onEvent',
  'g3k:emit',
  'g3k:loadSound',
  'g3k:playSound',
  'g3k:playEffect',
  'g3k:playTone',
])

/** Statements do Mundo 3D (extensão world-3d) — espelho do Set da g3k. */
export const W3D_STATEMENT_TYPES = new Set([
  'w3d:setup',
  'w3d:terrain',
  'w3d:flatten',
  'w3d:path',
  'w3d:water',
  'w3d:skyPhoto',
  'w3d:start',
  'w3d:car',
  'w3d:carStats',
  'w3d:carBoost',
  'w3d:engineSound',
  'w3d:carPlace',
  'w3d:loadSound',
  'w3d:playSound',
  'w3d:playMusic',
  'w3d:stopMusic',
  'w3d:hud',
  'w3d:say',
  'w3d:point',
  'w3d:onPoint',
  'w3d:zone',
  'w3d:onZone',
  'w3d:totemText',
  'w3d:totemImage',
  'w3d:galleryCreate',
  'w3d:galleryAdd',
  'w3d:raceCreate',
  'w3d:raceCheckpoint',
  'w3d:raceOnStart',
  'w3d:raceOnCheckpoint',
  'w3d:raceOnFinish',
  'w3d:bowlingCreate',
  'w3d:bowlingReset',
  'w3d:bowlingOnStrike',
  'w3d:stack',
  'w3d:cameraMode',
  'w3d:cameraShake',
  'w3d:grass',
  'w3d:scatter',
  'w3d:scatterModel',
  'w3d:placeThing',
  'w3d:placeModel',
  'w3d:clearArea',
  'w3d:onCrash',
  'w3d:horn',
  'w3d:onHorn',
  'w3d:carLights',
  'w3d:tireMarks',
  'w3d:carPaint',
  'w3d:confetti',
  'w3d:fireworks',
  'w3d:tornado',
  'w3d:season',
  'w3d:clouds',
  'w3d:pushPlace',
  'w3d:pushScatter',
  'w3d:letters',
  'w3d:explosive',
  'w3d:onExplosion',
  'w3d:waterfall',
  'w3d:lamp',
  'w3d:city',
  'w3d:stringLights',
  'w3d:traffic',
  'w3d:district',
  'w3d:roadGrid',
  'w3d:houseRow',
  'w3d:quality',
  'w3d:inventoryGive',
  'w3d:inventoryRemove',
  'w3d:door',
  'w3d:npcAsk',
  'w3d:crops',
  'w3d:barn',
  'w3d:windmill',
  'w3d:fence',
  'w3d:animals',
  'w3d:crater',
  'w3d:flag',
  'w3d:rocket',
  'w3d:fireflies',
  'w3d:campfire',
  'w3d:person',
  'w3d:personStats',
  'w3d:personPlace',
  'w3d:personAccessory',
  'w3d:personEmote',
  'w3d:onVehicle',
  'w3d:islands',
  'w3d:boat',
  'w3d:bridge',
  'w3d:lighthouse',
  'w3d:ambience',
  'w3d:npc',
  'w3d:npcWander',
  'w3d:npcTalk',
  'w3d:npcSay',
  'w3d:npcEmote',
  'w3d:coinsScatter',
  'w3d:coinsRing',
  'w3d:coinsLine',
  'w3d:onCollect',
  'w3d:quest',
  'w3d:questDone',
  'w3d:onQuestDone',
  'w3d:marker',
  'w3d:guideArrow',
  'w3d:achievement',
  'w3d:onAchievement',
  'w3d:minimap',
  'w3d:racePodium',
  'w3d:whisperCorner',
  'w3d:flameNote',
  'w3d:effects',
  'w3d:dayNight',
  'w3d:setTime',
  'w3d:weather',
  'w3d:wind',
  'w3d:onDayNight',
  'w3d:onUpdate',
])

export function statementIsExtension(stmt: JSStatement, extensionId: string): boolean {
  if (extensionId === 'game-2d') return stmt.type.startsWith('g2d:')
  if (extensionId === 'game-3d') return stmt.type.startsWith('g3d:')
  if (extensionId === 'game-2d-advanced') return stmt.type.startsWith('gk:')
  if (extensionId === 'game-3d-advanced') return stmt.type.startsWith('g3k:')
  if (extensionId === 'world-3d') return stmt.type.startsWith('w3d:')
  return false
}
