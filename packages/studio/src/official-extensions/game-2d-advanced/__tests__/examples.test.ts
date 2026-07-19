import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, SZIRV2Schema } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { gameKitBlocks } from '../blocks'
import {
  arenaGoblinsExample,
  batalhaEmEquipeExample,
  bichinhosDoQuintalExample,
  cacaMoedasExample,
  cobrinhaExample,
  corridaTabuleiroExample,
  defesaDoReinoExample,
  dueloDeCartasExample,
  dueloDosBonecosExample,
  florestaNinjaExample,
  invasaoDosOvnisExample,
  jogoDaMemoriaExample,
  meuPrimeiroJogoExample,
  oChefaoExample,
  oChefaoFichaExample,
  quebraBlocosExample,
  reinoAbertoExample,
  saltoNaFlorestaExample,
  vilaDoDragaoExample,
} from '../examples'
import { gameKitExtension } from '../index'

const EXAMPLES = [
  meuPrimeiroJogoExample,
  cacaMoedasExample,
  arenaGoblinsExample,
  vilaDoDragaoExample,
  florestaNinjaExample,
  saltoNaFlorestaExample,
  bichinhosDoQuintalExample,
  invasaoDosOvnisExample,
  dueloDosBonecosExample,
  defesaDoReinoExample,
  reinoAbertoExample,
  batalhaEmEquipeExample,
  oChefaoExample,
  oChefaoFichaExample,
  corridaTabuleiroExample,
  jogoDaMemoriaExample,
  dueloDeCartasExample,
  cobrinhaExample,
  quebraBlocosExample,
] as const

type ExampleName = (typeof EXAMPLES)[number]['name']

/** Promessa estrutural independente da implementação detalhada de cada fixture. */
const REQUIRED_TYPES = {
  'Meu primeiro jogo': [
    'gk:setup',
    'gk:createCharacter',
    'gk:onUpdate',
    'gk:moveWithKeys',
    'gk:onDraw',
  ],
  'Caça-moedas profissional': [
    'gk:setScreenText',
    'gk:createScreen',
    'gk:addButton',
    'gk:restartGame',
    'gk:charactersTouch',
    'gk:gameWidth',
    'canvasFillText',
  ],
  'Arena dos Goblins': [
    'gk:onEvent',
    'gk:emit',
    'gk:defineMold',
    'gk:startSpawner',
    'gk:forEachActive',
    'gk:cullOffscreen',
    'gk:recycle',
    'gk:defineLook',
    'gk:seek',
    'gk:hurt',
    'gk:keyPressed',
    'gk:isInvincible',
    'gk:setMission',
    'gk:defineEffect',
  ],
  'Vila do Dragão': [
    'gk:rpgSetStartMap',
    'gk:rpgCreateMap',
    'gk:rpgOnEnterMap',
    'gk:rpgCreateDoor',
    'gk:rpgCreateNpc',
    'gk:rpgOnTalk',
    'gk:rpgGiveItem',
    'gk:rpgCutscene',
    'gk:rpgBattleStart',
    'gk:rpgSetSpecial',
    'gk:rpgGivePotion',
    'gk:rpgBattleReward',
  ],
  'Floresta Ninja': [
    'gk:attackFacing',
    'gk:didHit',
    'gk:patrolAround',
    'gk:drawHearts',
    'gk:drawShadow',
    'gk:onDrawHud',
  ],
  'Salto na Floresta': [
    'gk:platformerHero',
    'gk:setJumpFeel',
    'gk:oneWayPlatform',
    'gk:dropThrough',
    'gk:movingPlatform',
    'gk:rideOn',
    'gk:stompKill',
    'gk:setCheckpoint',
    'gk:respawn',
    'gk:platformerAnim',
  ],
  'Bichinhos do Quintal': [
    'gk:rpgSetStartMap',
    'gk:rpgCreateMap',
    'gk:rpgOnEnterMap',
    'gk:pkmCreature',
    'gk:pkmMove',
    'gk:pkmTypeChart',
    'gk:pkmEvolve',
    'gk:pkmGive',
    'gk:pkmGrassCells',
    'gk:pkmWild',
    'gk:pkmCaught',
    'gk:rpgOnBattleEnd',
  ],
  'Invasão dos Óvnis': [
    'gk:naveShip',
    'gk:navePowerup',
    'gk:naveWave',
    'gk:naveWaveShooter',
    'gk:naveInvasionLine',
    'gk:naveStarfield',
    'gk:naveBomb',
    'gk:fanShot',
    'gk:overlapGroups',
  ],
  'Duelo dos Bonecos': [
    'gk:lutaMatch',
    'gk:lutaFighter',
    'gk:lutaAI',
    'gk:lutaMove',
    'gk:lutaAttack',
    'gk:lutaDrawHud',
    'gk:lutaWinner',
    'gk:collideGroup',
  ],
  'Defesa do Reino': [
    'gk:tdSetCoins',
    'gk:tdSlot',
    'gk:tdOnBuy',
    'gk:tdDrawRange',
    'gk:tdWave',
    'gk:definePath',
    'gk:pathPoint',
    'gk:pickActive',
    'gk:launchTowards',
  ],
  'Reino Aberto': [
    'gk:rpgSetStartMap',
    'gk:rpgCreateMap',
    'gk:rpgOnEnterMap',
    'gk:rpgConnectEdge',
    'gk:rpgCurrentMap',
    'gk:cameraFollow',
    'gk:rpgCreateNpc',
  ],
  'Batalha em Equipe': [
    'gk:rpgSetStartMap',
    'gk:rpgCreateMap',
    'gk:rpgOnEnterMap',
    'gk:rpgBattleStats',
    'gk:rpgAddAlly',
    'gk:rpgAddFoe',
    'gk:rpgTeachMove',
    'gk:rpgTeachHeal',
    'gk:rpgBattleStart',
    'gk:rpgOnBattleEnd',
  ],
  'O Chefao': [
    'gk:rpgSetStartMap',
    'gk:rpgCreateMap',
    'gk:rpgOnEnterMap',
    'gk:rpgAddBoss',
    'gk:rpgOnFoeTurn',
    'gk:rpgFoeUse',
    'gk:rpgFoeHitAll',
    'gk:battlerLife',
  ],
  'O Chefao da Ficha': [
    'gk:rpgSetStartMap',
    'gk:rpgCreateMap',
    'gk:rpgOnEnterMap',
    'gk:setScreenBg',
    'gk:rpgDefineBattler',
    'gk:rpgAddFoeNamed',
    'gk:rpgBattleNamed',
  ],
  'Corrida de Tabuleiro': [
    'gk:rollDice',
    'gk:playersSetup',
    'gk:currentPlayer',
    'gk:nextPlayer',
    'gk:onTurnChange',
    'gk:moveAlongTrack',
    'gk:onLandSpace',
  ],
  'Jogo da Memoria': ['gk:card', 'gk:cardFlip', 'gk:cardFace', 'gk:cardAt', 'gk:handDraw'],
  'Duelo de Cartas': [
    'gk:cardsStart',
    'gk:cardsOnTurn',
    'gk:cardsOnEnemyTurn',
    'gk:cardsEnemyIntent',
    'gk:cardsHurtEnemy',
    'gk:cardsGainBlock',
    'gk:cardsDrawHud',
    'gk:pileMoveTop',
  ],
  Cobrinha: ['gk:boardCreate', 'gk:boardSet', 'gk:boardGet', 'gk:boardIn', 'forRange'],
  'Quebra-blocos': ['gk:paddleBounce', 'gk:bounceOnEdges', 'gk:moveByVelocity'],
} as const satisfies Record<ExampleName, readonly string[]>

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key !== '__id') out[key] = stripIds(child)
    }
    return out as T
  }
  return value
}

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectTypes(item, out)
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.type === 'string') out.add(record.type)
    for (const child of Object.values(record)) collectTypes(child, out)
  }
  return out
}

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('game-2d-advanced — catálogo dos exemplos', () => {
  it('manifest mantém os 19 exemplos canônicos na ordem da vitrine', () => {
    expect(gameKitExtension.manifest.examples.map((example) => example.name)).toEqual(
      EXAMPLES.map((example) => example.name),
    )
    expect(gameKitExtension.minLevel).toBe('intermediario-2d')
  })

  it('cenários RPG desenham o fundo no mapa, nunca por cima no onDraw global', () => {
    for (const example of [
      bichinhosDoQuintalExample,
      reinoAbertoExample,
      batalhaEmEquipeExample,
      oChefaoExample,
      oChefaoFichaExample,
    ]) {
      const maps = behaviorStatements(example.ir).filter(
        (statement) => statement.type === 'gk:rpgCreateMap',
      )
      expect(maps.length).toBeGreaterThan(0)
      for (const map of maps) expect(collectTypes(map.body).has('gk:drawBackground')).toBe(true)
      for (const draw of behaviorStatements(example.ir).filter(
        (statement) => statement.type === 'gk:onDraw',
      )) {
        expect(collectTypes(draw.body).has('gk:drawBackground')).toBe(false)
      }
    }
  })

  it('Vila do Dragão expõe mapa e objetivo sem coordenadas secretas', () => {
    const code = compileStatements(behaviorStatements(vilaDoDragaoExample.ir), 0)
    for (const label of [
      'VILA DO DRAGÃO',
      'CAVERNA DO DRAGÃO',
      'Objetivo: ouça o Ferreiro',
      'Objetivo: entre na caverna',
      'ESPAÇO: enfrentar o Dragão',
    ]) {
      expect(code).toContain(JSON.stringify(label))
    }
  })

  it('O Chefao da Ficha traz o sprite do Dragão como asset real', () => {
    expect(oChefaoFichaExample.assets).toHaveLength(1)
    expect(oChefaoFichaExample.assets?.[0]).toMatchObject({ name: 'dragao', kind: 'image' })
    expect(oChefaoFichaExample.assets?.[0]?.dataUrl.startsWith('data:image/png;base64,')).toBe(true)
  })
})

for (const example of EXAMPLES) {
  describe(`game-2d-advanced — ${example.name}`, () => {
    it('schema e promessa estrutural', () => {
      expect(SZIRV2Schema.safeParse(example.ir).success).toBe(true)
      const types = collectTypes(example.ir)
      expect(types.has('rawJS')).toBe(false)
      expect(types.has('rawHTML')).toBe(false)
      expect(types.has('rawCSS')).toBe(false)
      const requiredTypes = REQUIRED_TYPES[example.name as keyof typeof REQUIRED_TYPES]
      expect(requiredTypes).toBeDefined()
      if (!requiredTypes) throw new Error(`exemplo sem promessa estrutural: ${example.name}`)
      for (const type of requiredTypes) expect(types.has(type)).toBe(true)
      if (types.has('gk:rpgCreateMap')) {
        expect(types.has('gk:rpgSetStartMap')).toBe(true)
        expect(types.has('gk:rpgOnMap')).toBe(false)
        expect(types.has('gk:rpgMapSize')).toBe(false)
      }
      if (example === meuPrimeiroJogoExample) {
        expect(types.has('gk:defineMold')).toBe(false)
        expect(types.has('gk:onEnterState')).toBe(false)
      }
    })

    it('IR → JavaScript → IR e fixpoint textual', () => {
      const code = compileStatements(behaviorStatements(example.ir), 0)
      const reparsed = stripIds(parseJS(code))
      expect(reparsed).toEqual(behaviorStatements(example.ir))
      expect(compileStatements(reparsed, 0)).toBe(code)
    })

    it('IR → Blockly → IR sem drift', () => {
      const state = buildWorkspaceStateFromIR(
        example.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
      )
      const workspace = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(
          state as unknown as Record<string, unknown>,
          workspace,
        )
        expect(stripIds(behaviorStatements(buildIRFromWorkspace(workspace)))).toEqual(
          behaviorStatements(example.ir),
        )
      } finally {
        workspace.dispose()
      }
    })
  })
}
