import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { generateJS } from '#generators'
import {
  behaviorStatements,
  type JSStatement,
  MOLD_NESTABLE_STATEMENT_TYPES,
  MOLD_ONLY_STATEMENT_TYPES,
  normalizeSZIR,
  partitionMolds,
  START_ONLY_STATEMENT_TYPES,
  SZIRV2Schema,
} from '#ir'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { normalizeBlocksStateToFrames } from '../../../blockly/normalizeFrames'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { gameTwoDBlocks } from '../blocks'

/**
 * A IDENTIDADE do inimigo mora em 🧩 Meus moldes.
 *
 * O que o inimigo É (os comportamentos somados e os ajustes) descreve a criatura,
 * não a partida — então esses blocos saíram do ⚙️ Ao iniciar. ⚠️ Mas os dois
 * primeiros PRECISAM continuar cabendo dentro de um
 * evento: é assim que o chefão fica furioso na metade da vida e que a onda
 * seguinte fica mais dura. Por isso eles vivem em `MOLD_NESTABLE_STATEMENT_TYPES`
 * (raiz no molde, aninhado permitido) e não em `MOLD_ONLY_STATEMENT_TYPES`, cujo
 * invariante "só na preparação, nunca aninhado" segue intacto.
 */

/** Os três que mudaram de área neste lote. */
const DA_IDENTIDADE = [
  'sz_g2d_enemy_add_behavior',
  'sz_g2d_enemy_type_param',
  'sz_g2d_all_enemies_group',
] as const

/** Os que também podem aparecer DENTRO de um corpo (a receita do chefão). */
const ANINHAVEIS = ['sz_g2d_enemy_add_behavior', 'sz_g2d_enemy_type_param'] as const
const ANIMACAO_DE_ESTADO = 'sz_g2d_enemy_state_anim'
const AJUSTES_LEGADOS_NO_START = [
  'sz_g2d_enemy_add_behavior_legacy_start',
  'sz_g2d_enemy_type_param_legacy_start',
] as const

function conecta(ws: Blockly.Workspace, frameType: string, blockType: string): boolean {
  const frame = ws.newBlock(frameType)
  const bloco = ws.newBlock(blockType)
  const previous = bloco.previousConnection
  if (!previous) throw new Error(`${blockType} sem previousConnection`)
  return frame.getInput('CHILDREN')?.connection?.connect(previous) === true
}

describe('a identidade do inimigo mora em 🧩 Meus moldes', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  describe('encaixe', () => {
    it('nenhum molde de inimigo ensina a área Ao iniciar no tooltip', () => {
      for (const tipo of [
        'sz_g2d_define_enemy_type',
        'sz_g2d_define_enemy_smart',
        ...DA_IDENTIDADE,
      ]) {
        const definition = gameTwoDBlocks.find((block) => block.type === tipo)
        expect(definition?.tooltip, `${tipo} sem tooltip`).toBeTruthy()
        expect(definition?.tooltip, `${tipo} aponta para a área errada`).not.toContain('Ao iniciar')
      }
    })

    it('os três RECUSAM o Ao iniciar e ACEITAM a área de moldes', () => {
      for (const tipo of DA_IDENTIDADE) {
        const ws = new Blockly.Workspace()
        try {
          expect(conecta(ws, 'sz_frame_start', tipo), `${tipo} no Ao iniciar`).toBe(false)
          expect(conecta(ws, 'sz_frame_molds', tipo), `${tipo} nos moldes`).toBe(true)
        } finally {
          ws.dispose()
        }
      }
    })

    it('a animação de estado usa a folha carregada no Ao iniciar', () => {
      const ws = new Blockly.Workspace()
      try {
        expect(conecta(ws, 'sz_frame_molds', ANIMACAO_DE_ESTADO)).toBe(false)
        expect(conecta(ws, 'sz_frame_start', ANIMACAO_DE_ESTADO)).toBe(true)
      } finally {
        ws.dispose()
      }
    })

    it('⭐ os que escalam a dificuldade continuam cabendo DENTRO de um evento', () => {
      // A regressão que importa: sem isto, o chefão não teria como ficar furioso
      // no "Quando um inimigo do tipo ... levar dano".
      for (const tipo of ANINHAVEIS) {
        const ws = new Blockly.Workspace()
        try {
          const evento = ws.newBlock('sz_g2d_on_enemy_hurt')
          const bloco = ws.newBlock(tipo)
          const previous = bloco.previousConnection
          if (!previous) throw new Error(`${tipo} sem previousConnection`)
          expect(evento.getInput('BODY')?.connection?.connect(previous), tipo).toBe(true)
        } finally {
          ws.dispose()
        }
      }
    })
  })

  describe('as receitas do meio do jogo continuam de pé', () => {
    it('os ajustes e a animação cabem no corpo de um evento e de um laço', () => {
      // O que muda o inimigo no meio da partida: somar comportamento, apertar a
      // cadência e trocar a animação de um estado para ele parecer furioso.
      const CONFIGURACOES = [...ANINHAVEIS, ANIMACAO_DE_ESTADO] as const
      for (const hospedeiro of ['sz_g2d_on_enemy_hurt', 'sz_g2d_every_seconds']) {
        for (const tipo of CONFIGURACOES) {
          const ws = new Blockly.Workspace()
          try {
            const host = ws.newBlock(hospedeiro)
            const bloco = ws.newBlock(tipo)
            const previous = bloco.previousConnection
            if (!previous) throw new Error(`${tipo} sem previousConnection`)
            expect(
              host.getInput('BODY')?.connection?.connect(previous),
              `${tipo} em ${hospedeiro}`,
            ).toBe(true)
          } finally {
            ws.dispose()
          }
        }
      }
    })

    it('⚠️ mas o grupo geral NÃO cabe num evento (é preparação, e só)', () => {
      const ws = new Blockly.Workspace()
      try {
        const evento = ws.newBlock('sz_g2d_on_enemy_hurt')
        const bloco = ws.newBlock('sz_g2d_all_enemies_group')
        const previous = bloco.previousConnection
        if (!previous) throw new Error('grupo geral sem previousConnection')
        expect(evento.getInput('BODY')?.connection?.connect(previous)).toBe(false)
      } finally {
        ws.dispose()
      }
    })
  })

  describe('a IR concorda com o Blockly', () => {
    it('os dois ajustes são molde ANINHÁVEL, e o grupo geral é molde puro', () => {
      expect([...MOLD_NESTABLE_STATEMENT_TYPES].sort()).toEqual([
        'g2d:enemyAddBehavior',
        'g2d:setEnemyTypeParam',
      ])
      expect(MOLD_ONLY_STATEMENT_TYPES.has('g2d:allEnemiesGroup')).toBe(true)
    })

    it('⭐ o conjunto novo NÃO invade o START_ONLY (é o que permite aninhar)', () => {
      // START_ONLY proíbe aninhar. Se um destes entrasse lá, a receita do chefão
      // morreria na validação da IR, mesmo com o Blockly deixando encaixar.
      for (const tipo of MOLD_NESTABLE_STATEMENT_TYPES) {
        expect(START_ONLY_STATEMENT_TYPES.has(tipo), tipo).toBe(false)
      }
      // E o invariante da área de moldes segue valendo inteiro para o MOLD_ONLY.
      for (const tipo of MOLD_ONLY_STATEMENT_TYPES) {
        expect(START_ONLY_STATEMENT_TYPES.has(tipo), tipo).toBe(true)
      }
    })

    it('partitionMolds preserva a ordem dos ajustes antigos no Ao iniciar', () => {
      const start: JSStatement[] = [
        { type: 'g2d:defineEnemyType', varName: 'alien', behavior: 'patrulha' },
        { type: 'g2d:enemyAddBehavior', typeVar: 'alien', behavior: 'atirador' },
        { type: 'g2d:setEnemyTypeParam', typeVar: 'alien', param: 'cadencia', value: 30 },
        { type: 'g2d:allEnemiesGroup', varName: 'todos' },
        { type: 'g2d:loadSpritesheet', varName: 'andar', image: 'andar.png' },
        {
          type: 'g2d:enemyStateAnim',
          typeVar: 'alien',
          state: 'andando',
          sheetVar: 'andar',
        },
        { type: 'g2d:setGravity', value: 0.6 },
      ] as unknown as JSStatement[]
      const partido = partitionMolds({ start, events: [], loops: [] })
      expect(partido.molds?.map((s) => s.type)).toEqual([
        'g2d:defineEnemyType',
        'g2d:allEnemiesGroup',
      ])
      expect(partido.start.map((s) => s.type)).toEqual([
        'g2d:enemyAddBehaviorLegacyStart',
        'g2d:setEnemyTypeParamLegacyStart',
        'g2d:loadSpritesheet',
        'g2d:enemyStateAnim',
        'g2d:setGravity',
      ])
    })

    it('projeto SEM esses blocos preserva a identidade da IR (nada reprocessa à toa)', () => {
      const ir = {
        version: 2 as const,
        html: [],
        css: [],
        behavior: {
          start: [{ type: 'g2d:setGravity', value: 0.6 }] as unknown as JSStatement[],
          events: [],
          loops: [],
        },
        extensions: [{ extensionId: 'game-2d' }],
      }
      expect(normalizeSZIR(ir)).toBe(ir)
    })
  })

  describe('projeto salvo se conserta ao abrir', () => {
    /** Estado antigo: os blocos de identidade dentro do frame de Ao iniciar. */
    const estadoAntigo = (comAreaDeMoldes: boolean) => {
      const filhos = DA_IDENTIDADE.map((type) => ({ type }))
      const encadeado = filhos.reduceRight<Record<string, unknown> | undefined>(
        (proximo, bloco) => ({ ...bloco, ...(proximo ? { next: { block: proximo } } : {}) }),
        undefined,
      )
      const tops: Record<string, unknown>[] = [
        { type: 'sz_frame_start', x: 32, y: 32, inputs: { CHILDREN: { block: encadeado } } },
      ]
      if (comAreaDeMoldes) tops.unshift({ type: 'sz_frame_molds', x: 32, y: 32 })
      return { blocks: { languageVersion: 0, blocks: tops } }
    }

    const tiposDoFrame = (estado: unknown, frameType: string): string[] => {
      const tops =
        ((estado as { blocks?: { blocks?: Record<string, unknown>[] } }).blocks?.blocks ?? []) || []
      const frame = tops.find((b) => b.type === frameType)
      const out: string[] = []
      let atual = (frame?.inputs as { CHILDREN?: { block?: Record<string, unknown> } })?.CHILDREN
        ?.block
      while (atual) {
        out.push(String(atual.type))
        atual = (atual.next as { block?: Record<string, unknown> } | undefined)?.block
      }
      return out
    }

    it('leva só o molde puro para a área de moldes e preserva os ajustes antigos', () => {
      const normalizado = normalizeBlocksStateToFrames(estadoAntigo(true))
      expect(tiposDoFrame(normalizado, 'sz_frame_start')).toEqual([...AJUSTES_LEGADOS_NO_START])
      expect(tiposDoFrame(normalizado, 'sz_frame_molds')).toEqual(['sz_g2d_all_enemies_group'])
    })

    it('⭐ CRIA a área de moldes quando o projeto salvo tinha um molde puro', () => {
      const normalizado = normalizeBlocksStateToFrames(estadoAntigo(false))
      expect(tiposDoFrame(normalizado, 'sz_frame_start')).toEqual([...AJUSTES_LEGADOS_NO_START])
      expect(tiposDoFrame(normalizado, 'sz_frame_molds')).toEqual(['sz_g2d_all_enemies_group'])
    })

    it('mantém a carga e a animação de estado juntas no Ao iniciar', () => {
      const estado = {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'sz_frame_start',
              x: 32,
              y: 32,
              inputs: {
                CHILDREN: {
                  block: {
                    type: 'sz_g2d_load_spritesheet',
                    next: { block: { type: ANIMACAO_DE_ESTADO } },
                  },
                },
              },
            },
          ],
        },
      }
      const normalizado = normalizeBlocksStateToFrames(estado)
      expect(tiposDoFrame(normalizado, 'sz_frame_start')).toEqual([
        'sz_g2d_load_spritesheet',
        ANIMACAO_DE_ESTADO,
      ])
      expect(tiposDoFrame(normalizado, 'sz_frame_molds')).toEqual([])
    })

    it('executa a folha antes da animação de estado depois de migrar o projeto', () => {
      const estado = {
        szBehaviorAreasVersion: 6,
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'sz_frame_start',
              inputs: {
                CHILDREN: {
                  block: {
                    type: 'sz_g2d_define_enemy_type',
                    fields: { NAME: 'zumbis' },
                    next: {
                      block: {
                        type: 'sz_g2d_load_spritesheet',
                        fields: { NAME: 'andar', IMAGE: 'zumbi-andando' },
                        next: {
                          block: {
                            type: 'sz_g2d_enemy_state_anim',
                            fields: { TYPE: 'zumbis', STATE: 'andando', SHEET: 'andar' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      }
      const ws = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(
          normalizeBlocksStateToFrames(estado) as unknown as Record<string, unknown>,
          ws,
        )
        const ir = buildIRFromWorkspace(ws)
        expect(ir.behavior.molds?.map((statement) => statement.type)).toEqual([
          'g2d:defineEnemyType',
        ])
        expect(ir.behavior.start.map((statement) => statement.type)).toEqual([
          'g2d:loadSpritesheet',
          'g2d:enemyStateAnim',
        ])
        expect(SZIRV2Schema.safeParse(ir).success).toBe(true)

        const calls: string[] = []
        const api = {
          onStart(callback: () => void) {
            calls.push('início')
            callback()
          },
          createEnemyType() {
            calls.push('tipo')
            return { name: 'zumbis' }
          },
          loadSpriteSheet() {
            calls.push('folha')
            return { image: 'zumbi-andando' }
          },
          setEnemyStateAnimation(_type: unknown, _state: string, sheet: unknown) {
            if (!sheet) throw new Error('A animação recebeu a folha antes de ela existir')
            calls.push('animação')
          },
        }
        const generated = generateJS({
          behavior: ir.behavior,
          lifecycle: { target: 'game-2d', globalName: 'SZGame2D', runMethod: 'onStart' },
        })
        new Function('SZGame2D', generated)(api)
        expect(calls).toEqual(['início', 'tipo', 'folha', 'animação'])
      } finally {
        ws.dispose()
      }
    })

    it('⭐ a VARIÁVEL e o Ajustar antigos preservam sua ordem no Ao iniciar', () => {
      const estado = {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'sz_frame_start',
              x: 32,
              y: 32,
              inputs: {
                CHILDREN: {
                  block: {
                    type: 'sz_js_var_create',
                    fields: { NAME: 'dificuldade' },
                    inputs: { VALUE: { block: { type: 'sz_val_number', fields: { NUM: 30 } } } },
                    next: {
                      block: {
                        type: 'sz_g2d_enemy_type_param',
                        fields: { TYPE: 'alien', PARAM: 'cadencia' },
                        inputs: {
                          VALUE: {
                            block: { type: 'sz_val_variable', fields: { NAME: 'dificuldade' } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      }
      const normalizado = normalizeBlocksStateToFrames(estado)
      expect(tiposDoFrame(normalizado, 'sz_frame_molds')).toEqual([])
      expect(tiposDoFrame(normalizado, 'sz_frame_start')).toEqual([
        'sz_js_var_create',
        'sz_g2d_enemy_type_param_legacy_start',
      ])
    })

    it('e o que vira IR mantém os ajustes antigos no ponto de execução original', () => {
      const ws = new Blockly.Workspace()
      try {
        const normalizado = normalizeBlocksStateToFrames(estadoAntigo(false))
        Blockly.serialization.workspaces.load(normalizado as unknown as Record<string, unknown>, ws)
        const ir = buildIRFromWorkspace(ws)
        expect(ir.behavior.molds?.map((statement) => statement.type)).toEqual([
          'g2d:allEnemiesGroup',
        ])
        expect(ir.behavior.start.map((statement) => statement.type)).toEqual([
          'g2d:enemyAddBehaviorLegacyStart',
          'g2d:setEnemyTypeParamLegacyStart',
        ])
        // E a vista linear segue entregando tudo, na ordem de execução.
        expect(behaviorStatements(ir).length).toBe(DA_IDENTIDADE.length)
      } finally {
        ws.dispose()
      }
    })
  })
})
