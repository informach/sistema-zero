import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { loadExtensionExamples } from '#extensions'
import { generateJS } from '#generators'
import {
  behaviorStatements,
  type JSStatement,
  MOLD_ONLY_STATEMENT_TYPES,
  normalizeSZIR,
  partitionMolds,
  START_ONLY_STATEMENT_TYPES,
  SZIRV2Schema,
} from '#ir'
import { OFFICIAL_CATALOG } from '#official-extensions'
import { gameTwoDBlocks } from '../../official-extensions/game-2d/blocks'
import { SERVER_BLOCK_CATALOG, type ServerBlockCatalogEntry } from '../blockCatalog'
import { getBlockContract } from '../blockContracts'
import { registerExtensionBlocks } from '../blocks'
import { FRAME_BLOCKS } from '../blocks/frames'
import { BEHAVIOR_AREAS_STATE_VERSION } from '../blocksStateVersion'
import { buildIRFromWorkspace } from '../buildIR'
import { normalizeBlocksStateToFrames } from '../normalizeFrames'
import { ensureBlocklyInitialized } from '../setup'
import { buildCoreToolbox } from '../toolbox'
import { buildWorkspaceStateFromIR } from '../workspaceState'

const FIGURA: JSStatement = {
  type: 'g2d:defineShape',
  shapeName: 'heroi',
  body: [],
}

function project(behavior: Partial<Parameters<typeof partitionMolds>[0]>) {
  return {
    version: 2 as const,
    html: [],
    css: [],
    behavior: { start: [], events: [], loops: [], ...behavior },
    extensions: [{ extensionId: 'game-2d' }],
  }
}

describe('🧩 Meus moldes — a área de definições', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  it('a lista de moldes é um subconjunto do que só cabe na preparação', () => {
    for (const type of MOLD_ONLY_STATEMENT_TYPES) {
      expect(START_ONLY_STATEMENT_TYPES.has(type), type).toBe(true)
    }
  })

  it('a função e a variável NÃO são moldes: elas cabem nas duas áreas', () => {
    expect(MOLD_ONLY_STATEMENT_TYPES.has('funcDecl')).toBe(false)
    expect(MOLD_ONLY_STATEMENT_TYPES.has('var')).toBe(false)
  })

  describe('partição na fronteira da IR', () => {
    it('move para a área nova o que a IR antiga trouxe em Ao iniciar', () => {
      const partitioned = partitionMolds({
        start: [FIGURA, { type: 'g2d:setGravity', value: { type: 'num', value: 1 } }],
        events: [],
        loops: [],
      })
      expect(partitioned.molds?.map((s) => s.type)).toEqual(['g2d:defineShape'])
      expect(partitioned.start.map((s) => s.type)).toEqual(['g2d:setGravity'])
    })

    it('preserva a ORDEM relativa dentro de cada área', () => {
      const outra: JSStatement = { type: 'g2d:defineShape', shapeName: 'inimigo', body: [] }
      const partitioned = partitionMolds({ start: [FIGURA, outra], events: [], loops: [] })
      expect(partitioned.molds?.map((s) => 'shapeName' in s && s.shapeName)).toEqual([
        'heroi',
        'inimigo',
      ])
    })

    it('OMITE a chave quando não há molde, deixando o behavior com a forma antiga', () => {
      const behavior = {
        start: [{ type: 'g2d:setGravity' as const, value: { type: 'num' as const, value: 1 } }],
        events: [],
        loops: [],
      }
      expect('molds' in partitionMolds(behavior)).toBe(false)
      // E a IR inteira preserva a IDENTIDADE: nada reprocessa à toa.
      const ir = project(behavior)
      expect(normalizeSZIR(ir)).toBe(ir)
    })
  })

  describe('geração', () => {
    it('emite a seção dentro do envelope da partida, antes do Ao iniciar', () => {
      const code = generateJS({
        behavior: { molds: [FIGURA], start: [], events: [], loops: [] },
        lifecycle: 'game-2d',
      })
      const envelope = code.indexOf('function __szProjectRun()')
      const molds = code.indexOf('// Meus moldes')
      const start = code.indexOf('// Ao iniciar')
      expect(envelope).toBeGreaterThanOrEqual(0)
      // ⚠️ A ordem é o contrato: fora do envelope, o molde morreria no restart.
      expect(molds).toBeGreaterThan(envelope)
      expect(start).toBeGreaterThan(molds)
    })

    it('sem molde, não emite o marcador: a saída fica igual à de antes da área', () => {
      const behavior = { start: [], events: [], loops: [] }
      expect(generateJS({ behavior, lifecycle: 'game-2d' })).not.toContain('// Meus moldes')
    })
  })

  describe('encaixe', () => {
    it('o Blockly RECUSA um molde no Ao iniciar e ACEITA na área dele', () => {
      const ws = new Blockly.Workspace()
      try {
        const molds = ws.newBlock('sz_frame_molds')
        const start = ws.newBlock('sz_frame_start')
        const figura = ws.newBlock('sz_g2d_define_shape')
        const previous = figura.previousConnection
        if (!previous) throw new Error('figura sem previousConnection')
        expect(start.getInput('CHILDREN')?.connection?.connect(previous)).toBe(false)
        expect(molds.getInput('CHILDREN')?.connection?.connect(previous)).toBe(true)
        expect(buildIRFromWorkspace(ws).behavior.molds?.[0]?.type).toBe('g2d:defineShape')
      } finally {
        ws.dispose()
      }
    })

    it('a função é aceita NAS DUAS áreas', () => {
      for (const frameType of ['sz_frame_molds', 'sz_frame_start']) {
        const ws = new Blockly.Workspace()
        try {
          const frame = ws.newBlock(frameType)
          const fn = ws.newBlock('sz_js_function')
          const previous = fn.previousConnection
          if (!previous) throw new Error('função sem previousConnection')
          expect(frame.getInput('CHILDREN')?.connection?.connect(previous), frameType).toBe(true)
        } finally {
          ws.dispose()
        }
      }
    })
  })

  describe('⭐⭐ cada Área do projeto segue a curadoria, como qualquer bloco', () => {
    const FRAME_DE = {
      structure: 'sz_frame_structure',
      appearance: 'sz_frame_appearance',
      molds: 'sz_frame_molds',
      start: 'sz_frame_start',
      events: 'sz_frame_events',
      loops: 'sz_frame_loops',
    } as const

    const areasDaPaleta = (profile: object): string[] => {
      const extras = OFFICIAL_CATALOG.map((e) => e.blockly.toolboxCategory).filter(Boolean)
      const toolbox = buildCoreToolbox(extras as never, profile as never)
      const categoria = toolbox.contents.find(
        (c) => 'name' in c && c.name === '🗂️ Áreas do projeto',
      ) as { contents: Array<{ type?: string }> } | undefined
      return (categoria?.contents ?? []).map((b) => b.type ?? '')
    }

    it('uma aula que só liberou blocos de sprite recebe SÓ o Ao iniciar', () => {
      // Antes, as seis áreas eram fixas: a criança recebia 🧱 Estrutura e
      // 🎨 Aparência numa aula sem um único bloco de HTML ou CSS para pôr nelas.
      expect(
        areasDaPaleta({ level: 'avancado-3d', allowBlocks: ['sz_g2d_create_sprite'] }),
      ).toEqual([FRAME_DE.start])
    })

    it('uma aula só de HTML recebe SÓ a Estrutura', () => {
      expect(areasDaPaleta({ level: 'avancado-3d', allowBlocks: ['sz_html_text'] })).toEqual([
        FRAME_DE.structure,
      ])
    })

    it('somar um laço à lista traz o Enquanto estiver rodando junto', () => {
      expect(
        areasDaPaleta({
          level: 'avancado-3d',
          allowBlocks: ['sz_g2d_create_sprite', 'sz_g2d_update_each_frame'],
        }),
      ).toEqual([FRAME_DE.start, FRAME_DE.loops])
    })

    it('as áreas saem na ORDEM em que executam, não na ordem da lista da aula', () => {
      expect(
        areasDaPaleta({
          level: 'avancado-3d',
          allowBlocks: ['sz_g2d_update_each_frame', 'sz_html_text', 'sz_g2d_create_sprite'],
        }),
      ).toEqual([FRAME_DE.structure, FRAME_DE.start, FRAME_DE.loops])
    })

    it('⭐⭐ a área MARCADA no picker do admin aparece, mesmo sem bloco dela', () => {
      // Sem isto, o professor marca 🧩 Meus moldes na lista da aula e a área
      // simplesmente não aparece: o picker vira um botão morto, que é o oposto
      // do motivo de as áreas terem entrado no catálogo.
      expect(
        areasDaPaleta({
          level: 'avancado-3d',
          allowBlocks: ['sz_frame_molds', 'sz_g2d_create_sprite'],
        }),
      ).toEqual([FRAME_DE.molds, FRAME_DE.start])
    })

    it('uma lista SÓ de áreas entrega exatamente as marcadas', () => {
      expect(
        areasDaPaleta({
          level: 'avancado-3d',
          allowBlocks: ['sz_frame_start', 'sz_frame_loops'],
        }),
      ).toEqual([FRAME_DE.start, FRAME_DE.loops])
    })

    it('⭐ com blocos na paleta e nenhuma área derivada, o Ao iniciar é o piso', () => {
      // Blocos de VALOR não pertencem a área nenhuma. Sem esta rede, a criança
      // via blocos na paleta e nenhum lugar onde encaixá-los.
      expect(areasDaPaleta({ level: 'avancado-3d', allowBlocks: ['sz_val_number'] })).toEqual([
        FRAME_DE.start,
      ])
    })
  })

  describe('⭐ o catálogo do Zappy diz a área REAL de cada bloco-container', () => {
    it('cada frame é a sua própria área, não "structure"', () => {
      const areaDe = (type: string) =>
        SERVER_BLOCK_CATALOG.find((entry) => entry.type === type)?.area
      // O mapa antigo mandava todo `domain: 'frame'` para 'structure', então o
      // tutor ensinava que ⚙️ Ao iniciar pertence à estrutura da página.
      expect(areaDe('sz_frame_structure')).toBe('structure')
      expect(areaDe('sz_frame_appearance')).toBe('appearance')
      expect(areaDe('sz_frame_molds')).toBe('molds')
      expect(areaDe('sz_frame_start')).toBe('start')
      expect(areaDe('sz_frame_events')).toBe('events')
      expect(areaDe('sz_frame_loops')).toBe('loops')
    })

    it('um bloco de molde é anunciado na área de molde', () => {
      expect(SERVER_BLOCK_CATALOG.find((e) => e.type === 'sz_g2d_define_shape')?.area).toBe('molds')
    })

    it('⭐ drift: TODO frame visível tem área própria no catálogo e entra na paleta', () => {
      // Dois mapas frame→área vivem separados (`AREA_FRAMES` no toolbox decide o
      // que aparece; `AREA_OF_FRAME` no catálogo decide o que o Zappy lê). Uma
      // sétima área criada só num deles some da paleta ou é anunciada errada,
      // nos dois casos em silêncio.
      const frames = FRAME_BLOCKS.filter((b) => !b.hidden).map((b) => b.type)
      const noCatalogo = new Map(
        SERVER_BLOCK_CATALOG.filter((e) => e.type.startsWith('sz_frame_')).map((e) => [
          e.type,
          e.area,
        ]),
      )
      // Nenhum frame sobra de fora, e nenhum é anunciado como área de outro.
      expect([...noCatalogo.keys()].sort()).toEqual([...frames].sort())
      // A ÁREA do catálogo, não `string`: com `noUncheckedIndexedAccess` o índice
      // devolve `… | undefined`, que é exatamente o tipo do `Map.get` comparado.
      const areaEsperada: Record<string, ServerBlockCatalogEntry['area']> = {
        sz_frame_structure: 'structure',
        sz_frame_appearance: 'appearance',
        sz_frame_molds: 'molds',
        sz_frame_start: 'start',
        sz_frame_events: 'events',
        sz_frame_loops: 'loops',
      }
      for (const frame of frames) {
        expect(noCatalogo.get(frame), frame).toBe(areaEsperada[frame])
      }

      // E a paleta CHEIA oferece exatamente os mesmos frames.
      const extras = OFFICIAL_CATALOG.map((e) => e.blockly.toolboxCategory).filter(Boolean)
      const toolbox = buildCoreToolbox(extras as never, { level: 'avancado-3d' })
      const categoria = toolbox.contents.find(
        (c) => 'name' in c && c.name === '🗂️ Áreas do projeto',
      ) as { contents: Array<{ type?: string }> }
      expect(categoria.contents.map((b) => b.type).sort()).toEqual([...frames].sort())
    })
  })

  describe('⭐⭐ a paleta nunca oferece um molde sem oferecer a área', () => {
    // O pior buraco possível: a criança vê "Carregar o som" ou "Desenhar a
    // figura assim:", arrasta, e a área onde eles encaixam não existe para ela.
    // Aconteceu de verdade com um degrau fixo escolhido à mão (7 blocos órfãos,
    // incluindo o som do núcleo, que é a porta de entrada).
    const DEGRAUS = [
      'iniciante-2d',
      'iniciante-3d',
      'intermediario-2d',
      'intermediario-3d',
      'avancado-2d',
      'avancado-3d',
    ] as const

    /**
     * Blocos que PERTENCEM à área (só encaixam nela). Variável e função cabem
     * nas duas de propósito e não contam: elas não deixam a criança na mão.
     */
    const moldesVisiveis = (contents: readonly unknown[], achados: string[] = []): string[] => {
      for (const entry of contents) {
        const node = entry as { kind?: string; type?: string; contents?: readonly unknown[] }
        if (node.kind === 'block' && node.type) {
          const root = getBlockContract(node.type)?.placement?.root
          if (root?.length === 1 && root[0] === 'molds') achados.push(node.type)
        } else if (Array.isArray(node.contents)) {
          moldesVisiveis(node.contents, achados)
        }
      }
      return achados
    }

    for (const level of DEGRAUS) {
      it(`degrau ${level}: se há bloco de molde na paleta, a área está lá`, () => {
        const extras = OFFICIAL_CATALOG.map((e) => e.blockly.toolboxCategory).filter(Boolean)
        const toolbox = buildCoreToolbox(extras as never, { level })
        const areas = toolbox.contents.find(
          (c) => 'name' in c && c.name === '🗂️ Áreas do projeto',
        ) as { contents: Array<{ type?: string }> }
        const temArea = areas.contents.some((b) => b.type === 'sz_frame_molds')
        const moldes = moldesVisiveis(toolbox.contents).filter((t) => t !== 'sz_frame_molds')

        if (moldes.length > 0) {
          expect(temArea, `${level}: órfãos = ${moldes.slice(0, 5).join(', ')}`).toBe(true)
        }
        // E o inverso: a área não aparece sozinha, sem nada para pôr dentro.
        if (temArea) expect(moldes.length, level).toBeGreaterThan(0)
      })
    }
  })

  describe('validação de referência entre as áreas', () => {
    const num = (value: number) => ({ type: 'num' as const, value })
    /** Ficha de inimigo que usa a figura ⟨shape⟩ como aparência. */
    const inimigoComFigura = (shape: string): JSStatement =>
      ({
        type: 'g2d:defineEnemyType',
        varName: 'zumbis',
        behavior: 'patrulha',
        color: '#e05a5a',
        image: '',
        shape,
        hp: num(2),
        speed: num(1),
        dmg: num(1),
        w: num(32),
        h: num(32),
      }) as unknown as JSStatement

    it('⭐ recusa o molde que usa um nome criado só depois, no Ao iniciar', () => {
      // A folha nasce no Ao iniciar e a animação do tipo (molde) tenta usá-la:
      // ao rodar, o molde executaria antes de a folha existir.
      const parsed = SZIRV2Schema.safeParse(
        project({
          molds: [
            {
              type: 'g2d:enemyStateAnim',
              typeVar: 'zumbis',
              state: 'andando',
              sheetVar: 'andar',
              from: num(0),
              to: num(3),
              fps: num(8),
            } as unknown as JSStatement,
          ],
          start: [
            {
              type: 'g2d:loadSpritesheet',
              varName: 'andar',
              image: 'folha',
              frameW: num(32),
              frameH: num(32),
            } as unknown as JSStatement,
          ],
        }),
      )
      expect(parsed.success).toBe(false)
      if (!parsed.success) {
        expect(parsed.error.issues.some((i) => i.message.includes('é criado depois'))).toBe(true)
      }
    })

    it('aceita quando a figura está na MESMA área, antes de quem a usa', () => {
      const parsed = SZIRV2Schema.safeParse(project({ molds: [FIGURA, inimigoComFigura('heroi')] }))
      expect(parsed.success).toBe(true)
    })
  })

  describe('migração do estado salvo', () => {
    const savedState = (children: unknown) => ({
      szBehaviorAreasVersion: 6,
      blocks: {
        languageVersion: 0,
        blocks: [{ type: 'sz_frame_start', x: 32, y: 32, inputs: { CHILDREN: children } }],
      },
    })

    /**
     * ⭐⭐ A pergunta que os primeiros testes desta suíte NÃO faziam: o estado
     * migrado ABRE? Eles asseriam que a cadeia serializada tinha mudado, e a
     * serialização aceita qualquer coisa — o `connectionChecker` só entra no
     * `load`. Um projeto real com um tipo de inimigo que usa uma variável saía
     * daqui "migrado" e simplesmente não abria.
     */
    const loadMigrated = (state: unknown) => {
      const migrated = normalizeBlocksStateToFrames(state)
      const ws = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(migrated as never, ws)
        const ir = buildIRFromWorkspace(ws)
        return {
          molds: (ir.behavior.molds ?? []).map((s) => s.type),
          start: ir.behavior.start.map((s) => s.type),
          soltos: ws
            .getTopBlocks(false)
            .filter((b) => !b.type.startsWith('sz_frame_'))
            .map((b) => b.type),
        }
      } finally {
        ws.dispose()
      }
    }

    it('leva a figura para a área nova e carimba a versão', () => {
      const migrated = normalizeBlocksStateToFrames(
        savedState({ block: { type: 'sz_g2d_define_shape', fields: { NAME: 'heroi' } } }),
      ) as { szBehaviorAreasVersion?: number; blocks: { blocks: Array<{ type: string }> } }

      expect(migrated.szBehaviorAreasVersion).toBe(BEHAVIOR_AREAS_STATE_VERSION)
      expect(migrated.blocks.blocks.map((b) => b.type)).toContain('sz_frame_molds')
    })

    it('⭐⭐ leva junto a variável de que o molde depende, e o projeto ABRE', () => {
      const resultado = loadMigrated(
        savedState({
          block: {
            type: 'sz_js_var_create',
            fields: { NAME: 'dificuldade' },
            next: {
              block: {
                type: 'sz_g2d_define_enemy_type',
                fields: { NAME: 'zumbi' },
                inputs: {
                  SPEED: { block: { type: 'sz_val_variable', fields: { NAME: 'dificuldade' } } },
                },
              },
            },
          },
        }),
      )
      // A variável vem ANTES do molde que a consome, e nada ficou solto: se o
      // encaixe fosse recusado, o `load` estouraria ou o bloco viraria rascunho.
      expect(resultado.molds).toEqual(['var', 'g2d:defineEnemyType'])
      expect(resultado.soltos).toEqual([])
    })

    it('⭐ NÃO sobe um declarador que não cabe em Meus moldes', () => {
      // "Criar pontuação" também declara um nome, mas é criador de recurso
      // concreto e só existe em Ao iniciar. Subi-lo geraria um estado que o
      // Blockly recusa — o projeto deixaria de abrir.
      const resultado = loadMigrated(
        savedState({
          block: {
            type: 'sz_g2d_score',
            fields: { NAME: 'pontos' },
            next: { block: { type: 'sz_g2d_define_shape', fields: { NAME: 'heroi' } } },
          },
        }),
      )
      expect(resultado.molds).toEqual(['g2d:defineShape'])
      expect(resultado.start).toEqual(['g2d:score'])
      expect(resultado.soltos).toEqual([])
    })

    it('a FUNÇÃO não migra: fica onde a criança deixou', () => {
      const migrated = normalizeBlocksStateToFrames(
        savedState({ block: { type: 'sz_js_function', fields: { NAME: 'fazerAlgo' } } }),
      ) as { blocks: { blocks: Array<{ type: string }> } }

      expect(migrated.blocks.blocks.map((b) => b.type)).not.toContain('sz_frame_molds')
    })
  })

  describe('round-trip por blocos', () => {
    it('IR → workspace → IR preserva a área de cada statement', () => {
      const ir = project({
        molds: [FIGURA],
        start: [{ type: 'g2d:setGravity', value: { type: 'num', value: 1 } }],
      })
      const ws = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(
          buildWorkspaceStateFromIR(ir) as unknown as Record<string, unknown>,
          ws,
        )
        const rebuilt = buildIRFromWorkspace(ws)
        expect(rebuilt.behavior.molds?.map((s) => s.type)).toEqual(['g2d:defineShape'])
        expect(rebuilt.behavior.start.map((s) => s.type)).toEqual(['g2d:setGravity'])
      } finally {
        ws.dispose()
      }
    })
  })

  it('⭐ NENHUM exemplo oficial deixou molde em Ao iniciar', async () => {
    // A prova de que os exemplos foram ajustados na FONTE e não consertados em
    // runtime: `normalizeSZIR` mascararia um esquecimento, e aqui a IR é lida
    // exatamente como está no disco.
    const pendentes: string[] = []
    for (const extension of OFFICIAL_CATALOG) {
      for (const example of await loadExtensionExamples(extension)) {
        for (const statement of example.ir.behavior.start) {
          if (MOLD_ONLY_STATEMENT_TYPES.has(statement.type)) {
            pendentes.push(`${extension.manifest.id} › ${example.name}: ${statement.type}`)
          }
        }
      }
    }
    expect(pendentes).toEqual([])
  })
})

describe('a espera virou um bloco próprio', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('a função simples não mostra a palavra "assíncrona"', () => {
    const ws = new Blockly.Workspace()
    try {
      expect(ws.newBlock('sz_js_function').toString()).not.toContain('assíncrona')
    } finally {
      ws.dispose()
    }
  })

  it('IR com async gera o bloco irmão, e a volta preserva o async', () => {
    const ir = {
      version: 2 as const,
      html: [],
      css: [],
      behavior: {
        start: [{ type: 'funcDecl' as const, name: 'carregar', params: [], async: true, body: [] }],
        events: [],
        loops: [],
      },
      extensions: [],
    }
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(
        buildWorkspaceStateFromIR(ir) as unknown as Record<string, unknown>,
        ws,
      )
      expect(ws.getAllBlocks(false).some((b) => b.type === 'sz_js_function_async')).toBe(true)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))[0]
      expect(rebuilt).toMatchObject({ type: 'funcDecl', name: 'carregar', async: true })
    } finally {
      ws.dispose()
    }
  })

  it('⭐ projeto salvo com ASYNC=TRUE vira o bloco novo, sem perder a espera', () => {
    const migrated = normalizeBlocksStateToFrames({
      szBehaviorAreasVersion: 6,
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
                  type: 'sz_js_function',
                  fields: { NAME: 'carregar', ASYNC: 'TRUE' },
                  extraState: { params: [{ name: 'url', id: 'p1' }] },
                },
              },
            },
          },
        ],
      },
    }) as {
      blocks: { blocks: Array<{ inputs?: Record<string, { block?: Record<string, unknown> }> }> }
    }

    const fn = migrated.blocks.blocks[0]?.inputs?.CHILDREN?.block
    expect(fn?.type).toBe('sz_js_function_async')
    expect(fn?.fields).toEqual({ NAME: 'carregar' })
    // Os parâmetros sobrevivem à troca de tipo.
    expect(fn?.extraState).toMatchObject({ params: [{ name: 'url', id: 'p1' }] })
  })

  it('ASYNC=FALSE só perde o campo morto e continua sendo a função simples', () => {
    const migrated = normalizeBlocksStateToFrames({
      szBehaviorAreasVersion: 6,
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_start',
            x: 32,
            y: 32,
            inputs: {
              CHILDREN: {
                block: { type: 'sz_js_function', fields: { NAME: 'fazerAlgo', ASYNC: 'FALSE' } },
              },
            },
          },
        ],
      },
    }) as {
      blocks: { blocks: Array<{ inputs?: Record<string, { block?: Record<string, unknown> }> }> }
    }

    const fn = migrated.blocks.blocks[0]?.inputs?.CHILDREN?.block
    expect(fn?.type).toBe('sz_js_function')
    expect(fn?.fields).toEqual({ NAME: 'fazerAlgo' })
  })
})
