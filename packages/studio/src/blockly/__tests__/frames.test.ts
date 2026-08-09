import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { generateProjectFiles } from '#generators'
import { behaviorStatements, SZIRV2Schema } from '#ir'
import { gameTwoDBlocks } from '../../official-extensions/game-2d/blocks'
import { gameKitBlocks } from '../../official-extensions/game-2d-advanced/blocks'
import { registerExtensionBlocks } from '../blocks'
import { BEHAVIOR_AREAS_STATE_VERSION } from '../blocksStateVersion'
import { buildIRFromWorkspace, collectFlatFromWorkspace } from '../buildIR'
import {
  blocksStateHasFrame,
  markLifecycleBlocksState,
  normalizeBlocksStateToFrames,
} from '../normalizeFrames'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'

function connectInto(parent: Blockly.Block, input: string, child: Blockly.Block): void {
  const conn = parent.getInput(input)?.connection
  if (conn && child.previousConnection) conn.connect(child.previousConnection)
}

function isSerializedWorkspaceState(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

describe('Blocos-container (frames) — só gera o que está DENTRO', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('bloco DENTRO de Ao iniciar gera; bloco SOLTO fora de qualquer área é rascunho (ignorado)', () => {
    const ws = new Blockly.Workspace()
    const behavior = ws.newBlock('sz_frame_start')
    connectInto(behavior, 'CHILDREN', ws.newBlock('sz_js_console_log_text'))
    // Rascunho: solto no topo, fora de qualquer frame → NÃO entra na IR.
    ws.newBlock('sz_js_console_log_text')

    const ir = buildIRFromWorkspace(ws)
    expect(ir.behavior.start).toHaveLength(1)
    expect(ir.behavior.start[0]?.type).toBe('consoleLog')
  })

  it('HTML→Estrutura e CSS→Aparência (cada categoria no seu arquivo)', () => {
    const ws = new Blockly.Workspace()
    connectInto(ws.newBlock('sz_frame_structure'), 'CHILDREN', ws.newBlock('sz_html_h1'))
    connectInto(
      ws.newBlock('sz_frame_appearance'),
      'CHILDREN',
      ws.newBlock('sz_css_body_background'),
    )

    const ir = buildIRFromWorkspace(ws)
    expect(ir.html).toHaveLength(1)
    expect(ir.css).toHaveLength(1)
    expect(behaviorStatements(ir)).toHaveLength(0)
  })

  it('a "boca" do frame respeita o tipo: HTML encaixa na Estrutura, CSS não', () => {
    const ws = new Blockly.Workspace()
    const html = ws.newBlock('sz_html_h1')
    connectInto(ws.newBlock('sz_frame_structure'), 'CHILDREN', html)
    expect(html.type).toBe('sz_html_h1')
    expect(html.getParent()?.type).toBe('sz_frame_structure')

    // CSS (previousStatement 'CSSEntry') não casa o check 'HTMLNode' da Estrutura:
    // o connect rejeita (lança OU é no-op) e o bloco fica sem pai.
    const css = ws.newBlock('sz_css_body_background')
    const conn = ws.newBlock('sz_frame_structure').getInput('CHILDREN')?.connection
    try {
      if (conn && css.previousConnection) conn.connect(css.previousConnection)
    } catch {
      /* check incompatível → esperado */
    }
    expect(css.getParent()).toBeNull()
  })

  it('eventos e loops só encaixam em suas próprias áreas', () => {
    const ws = new Blockly.Workspace()
    const start = ws.newBlock('sz_frame_start')
    const events = ws.newBlock('sz_frame_events')
    const loops = ws.newBlock('sz_frame_loops')
    const click = ws.newBlock('sz_js_on_click')
    const animation = ws.newBlock('sz_canvas_anim_loop')
    const clickConnection = click.previousConnection
    const animationConnection = animation.previousConnection
    if (!clickConnection || !animationConnection) throw new Error('Conexões do fixture ausentes')

    try {
      start.getInput('CHILDREN')?.connection?.connect(clickConnection)
    } catch {
      // O Blockly lança quando os checks não se cruzam.
    }
    expect(click.getParent()).toBeNull()
    events.getInput('CHILDREN')?.connection?.connect(clickConnection)
    expect(click.getParent()).toBe(events)

    try {
      start.getInput('CHILDREN')?.connection?.connect(animationConnection)
    } catch {
      // O Blockly lança quando os checks não se cruzam.
    }
    expect(animation.getParent()).toBeNull()
    loops.getInput('CHILDREN')?.connection?.connect(animationConnection)
    expect(animation.getParent()).toBe(loops)
  })
})

describe('Migração transparente para frames (normalizeBlocksStateToFrames)', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
    registerExtensionBlocks(gameKitBlocks)
  })

  it('projeto LEGADO (blocos soltos, sem frames) migra para os 3 frames PRESERVANDO a saída', () => {
    // Estado legado: blocos soltos no topo, como antes dos frames.
    const ws = new Blockly.Workspace()
    ws.newBlock('sz_html_h1')
    ws.newBlock('sz_js_console_log_text')
    const legacy = Blockly.serialization.workspaces.save(ws)
    expect(blocksStateHasFrame(legacy)).toBe(false)

    // Saída ANTES (modelo plano, exatamente o que o projeto já gerava).
    const filesBefore = generateProjectFiles({
      ir: collectFlatFromWorkspace(ws),
      projectName: 'X',
    })

    // Migra → vira framado.
    const migrated = normalizeBlocksStateToFrames(legacy) as Record<string, unknown>
    expect(blocksStateHasFrame(migrated)).toBe(true)

    // Saída DEPOIS (modelo frames): idêntica byte-a-byte.
    const ws2 = new Blockly.Workspace()
    Blockly.serialization.workspaces.load(migrated, ws2)
    const filesAfter = generateProjectFiles({ ir: buildIRFromWorkspace(ws2), projectName: 'X' })

    expect(filesAfter).toEqual(filesBefore)
  })

  it('idempotente: estado JÁ com frames volta igual (mesma referência)', () => {
    const framed = buildWorkspaceStateFromIR({
      html: [],
      css: [],
      js: [{ type: 'consoleLog', value: { type: 'str', value: 'oi' } }],
      extensions: [],
    })
    expect(normalizeBlocksStateToFrames(framed)).toBe(framed)
  })

  it('estado nulo/vazio não muda', () => {
    expect(normalizeBlocksStateToFrames(null)).toBeNull()
    const empty = { blocks: { languageVersion: 0, blocks: [] } }
    expect(normalizeBlocksStateToFrames(empty)).toBe(empty)
  })

  it('desembrulha a área antiga em início, eventos e loops sem conservar o boot', () => {
    const legacy = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_behavior',
            id: 'area-antiga',
            inputs: {
              CHILDREN: {
                block: {
                  type: 'sz_g2d_on_start',
                  id: 'inicio-antigo',
                  inputs: {
                    BODY: {
                      block: {
                        type: 'sz_g2d_create_sprite',
                        id: 'criar',
                        next: {
                          block: {
                            type: 'sz_g2d_on_key',
                            id: 'tecla',
                            next: {
                              block: {
                                type: 'sz_g2d_update_each_frame',
                                id: 'quadro',
                                next: { block: { type: 'sz_gk_start', id: 'boot' } },
                              },
                            },
                          },
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

    const migrated = normalizeBlocksStateToFrames(legacy) as typeof legacy
    const areas = migrated.blocks.blocks
    expect(areas.map((block) => block.type)).toEqual([
      'sz_frame_start',
      'sz_frame_events',
      'sz_frame_loops',
    ])
    expect(JSON.stringify(migrated)).toContain('"id":"criar"')
    expect(JSON.stringify(migrated)).toContain('"id":"tecla"')
    expect(JSON.stringify(migrated)).toContain('"id":"quadro"')
    expect(JSON.stringify(migrated)).not.toContain('"id":"boot"')
    expect(normalizeBlocksStateToFrames(migrated)).toBe(migrated)
  })

  it('mescla uma área antiga nos três frames atuais sem duplicar nem perder execução', () => {
    const hybrid = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_start',
            id: 'inicio-atual',
            inputs: {
              CHILDREN: {
                block: {
                  type: 'sz_js_console_log_text',
                  id: 'comando-atual',
                  fields: { VALUE: 'atual' },
                },
              },
            },
          },
          {
            type: 'sz_frame_events',
            id: 'eventos-atual',
            inputs: { CHILDREN: { block: { type: 'sz_js_on_resize', id: 'evento-atual' } } },
          },
          {
            type: 'sz_frame_loops',
            id: 'loops-atual',
            inputs: { CHILDREN: { block: { type: 'sz_canvas_anim_loop', id: 'loop-atual' } } },
          },
          {
            type: 'sz_frame_behavior',
            id: 'area-antiga',
            inputs: {
              CHILDREN: {
                block: {
                  type: 'sz_js_console_log_text',
                  id: 'comando-antigo',
                  fields: { VALUE: 'antigo' },
                  next: {
                    block: {
                      type: 'sz_js_on_click_anywhere',
                      id: 'evento-antigo',
                      next: {
                        block: { type: 'sz_canvas_anim_loop', id: 'loop-antigo' },
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

    const migrated = normalizeBlocksStateToFrames(hybrid) as typeof hybrid
    for (const type of ['sz_frame_start', 'sz_frame_events', 'sz_frame_loops']) {
      expect(
        migrated.blocks.blocks.filter((block) => block.type === type),
        type,
      ).toHaveLength(1)
    }
    for (const id of [
      'comando-atual',
      'comando-antigo',
      'evento-atual',
      'evento-antigo',
      'loop-atual',
      'loop-antigo',
    ]) {
      expect(JSON.stringify(migrated), id).toContain(`"id":"${id}"`)
    }

    const workspace = new Blockly.Workspace()
    Blockly.serialization.workspaces.load(migrated, workspace)
    const ir = buildIRFromWorkspace(workspace)
    expect(ir.behavior.start).toHaveLength(2)
    expect(ir.behavior.events).toHaveLength(2)
    expect(ir.behavior.loops).toHaveLength(2)
    workspace.dispose()
    expect(normalizeBlocksStateToFrames(migrated)).toBe(migrated)
  })

  it('migra por área quando o projeto legado já estava parcialmente framado', () => {
    const partial = {
      blocks: {
        languageVersion: 0,
        blocks: [
          { type: 'sz_frame_structure', id: 'html', x: 32, y: 32 },
          {
            type: 'sz_js_console_log_text',
            id: 'comando-solto',
            x: 32,
            y: 400,
            fields: { VALUE: 'continua executando' },
          },
        ],
      },
    }

    const migrated = normalizeBlocksStateToFrames(partial) as typeof partial
    expect(migrated).not.toBe(partial)
    expect(migrated.blocks.blocks.map((block) => block.type)).toEqual([
      'sz_frame_structure',
      'sz_frame_start',
    ])
    expect(JSON.stringify(migrated)).toContain('"id":"comando-solto"')

    const workspace = new Blockly.Workspace()
    Blockly.serialization.workspaces.load(migrated, workspace)
    expect(buildIRFromWorkspace(workspace).behavior.start[0]?.type).toBe('consoleLog')
    workspace.dispose()
    expect(normalizeBlocksStateToFrames(migrated)).toBe(migrated)
  })

  it('executa só a primeira área antiga e preserva duplicatas como rascunho', () => {
    const legacy = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_behavior',
            id: 'area-principal',
            inputs: {
              CHILDREN: {
                block: { type: 'sz_js_console_log_text', id: 'executa', fields: { VALUE: 'um' } },
              },
            },
          },
          {
            type: 'sz_frame_behavior',
            id: 'area-duplicada',
            inputs: {
              CHILDREN: {
                block: {
                  type: 'sz_js_console_log_text',
                  id: 'rascunho',
                  fields: { VALUE: 'dois' },
                },
              },
            },
          },
        ],
      },
    }

    const migrated = normalizeBlocksStateToFrames(legacy) as typeof legacy
    expect(migrated.blocks.blocks.map((block) => block.type)).toEqual([
      'sz_frame_start',
      'sz_js_console_log_text',
    ])
    expect(migrated.blocks.blocks[1]?.id).toBe('rascunho')

    const workspace = new Blockly.Workspace()
    Blockly.serialization.workspaces.load(migrated, workspace)
    expect(buildIRFromWorkspace(workspace).behavior.start).toHaveLength(1)
    expect(workspace.getBlockById('rascunho')?.getParent()).toBeNull()
    workspace.dispose()
    expect(normalizeBlocksStateToFrames(migrated)).toBe(migrated)
  })

  it('preserva blocos soltos como rascunho em um estado atual versionado', () => {
    const current = markLifecycleBlocksState({
      blocks: {
        languageVersion: 0,
        blocks: [
          { type: 'sz_frame_structure', id: 'html', x: 32, y: 32 },
          { type: 'sz_js_console_log_text', id: 'rascunho', x: 32, y: 400 },
        ],
      },
    })
    expect(normalizeBlocksStateToFrames(current)).toBe(current)
  })

  it('migra comandos antigos de tela cheia inválidos para rascunhos carregáveis', () => {
    const previousVersion = {
      szBehaviorAreasVersion: 3,
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_start',
            inputs: {
              CHILDREN: {
                block: {
                  type: 'sz_js_toggle_fullscreen',
                  id: 'alternar-invalido',
                  next: {
                    block: {
                      type: 'sz_js_console_log_text',
                      id: 'comando-valido',
                      fields: { VALUE: 'continua' },
                    },
                  },
                },
              },
            },
          },
          {
            type: 'sz_frame_events',
            inputs: {
              CHILDREN: {
                block: {
                  type: 'sz_js_on_resize',
                  inputs: {
                    DO: {
                      block: { type: 'sz_js_request_fullscreen', id: 'entrar-invalido' },
                    },
                  },
                  next: {
                    block: {
                      type: 'sz_js_on_click_anywhere',
                      inputs: {
                        DO: {
                          block: { type: 'sz_js_toggle_fullscreen', id: 'alternar-valido' },
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

    const migrated = normalizeBlocksStateToFrames(previousVersion) as typeof previousVersion
    expect(migrated.szBehaviorAreasVersion).toBe(BEHAVIOR_AREAS_STATE_VERSION)

    const workspace = new Blockly.Workspace()
    expect(() => Blockly.serialization.workspaces.load(migrated, workspace)).not.toThrow()
    expect(workspace.getBlockById('alternar-invalido')?.getParent()).toBeNull()
    expect(workspace.getBlockById('entrar-invalido')?.getParent()).toBeNull()
    expect(workspace.getBlockById('alternar-valido')?.getParent()?.type).toBe(
      'sz_js_on_click_anywhere',
    )
    const ir = buildIRFromWorkspace(workspace)
    expect(ir.behavior.start.map((statement) => statement.type)).toEqual(['consoleLog'])
    expect(ir.behavior.events[0]).toMatchObject({ type: 'event', body: [] })
    workspace.dispose()
  })

  it('migra a versão 4 soltando tela cheia de funções e callbacks adiados', () => {
    const previousVersion = {
      szBehaviorAreasVersion: 4,
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_start',
            inputs: {
              CHILDREN: {
                block: {
                  type: 'sz_js_function',
                  inputs: {
                    BODY: {
                      block: { type: 'sz_js_request_fullscreen', id: 'funcao-invalida' },
                    },
                  },
                },
              },
            },
          },
          {
            type: 'sz_frame_events',
            inputs: {
              CHILDREN: {
                block: {
                  type: 'sz_js_on_click_anywhere',
                  inputs: {
                    DO: {
                      block: {
                        type: 'sz_js_set_timeout_seconds',
                        inputs: {
                          DO: {
                            block: { type: 'sz_js_toggle_fullscreen', id: 'timer-invalido' },
                          },
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

    const migrated = normalizeBlocksStateToFrames(previousVersion) as typeof previousVersion
    expect(migrated.szBehaviorAreasVersion).toBe(BEHAVIOR_AREAS_STATE_VERSION)

    const workspace = new Blockly.Workspace()
    expect(() => Blockly.serialization.workspaces.load(migrated, workspace)).not.toThrow()
    expect(workspace.getBlockById('funcao-invalida')?.getParent()).toBeNull()
    expect(workspace.getBlockById('timer-invalido')?.getParent()).toBeNull()
    workspace.dispose()
  })

  it('migra a versão 5 usando ativação e timing declarados pelas extensões', () => {
    const previousVersion = {
      szBehaviorAreasVersion: 5,
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_events',
            inputs: {
              CHILDREN: {
                block: {
                  type: 'sz_js_on_click_anywhere',
                  inputs: {
                    DO: {
                      block: {
                        type: 'sz_gk_wait',
                        inputs: {
                          DO: {
                            block: { type: 'sz_js_request_fullscreen', id: 'espera-invalida' },
                          },
                        },
                      },
                    },
                  },
                  next: {
                    block: {
                      type: 'sz_gk_on_game_click',
                      inputs: {
                        BODY: {
                          block: { type: 'sz_js_toggle_fullscreen', id: 'jogo-valido' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          {
            type: 'sz_frame_start',
            inputs: {
              CHILDREN: {
                block: {
                  type: 'sz_gk_add_button',
                  inputs: {
                    BODY: {
                      block: { type: 'sz_js_toggle_fullscreen', id: 'botao-valido' },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    }

    const migrated = normalizeBlocksStateToFrames(previousVersion) as typeof previousVersion
    expect(migrated.szBehaviorAreasVersion).toBe(BEHAVIOR_AREAS_STATE_VERSION)

    const workspace = new Blockly.Workspace()
    expect(() => Blockly.serialization.workspaces.load(migrated, workspace)).not.toThrow()
    expect(workspace.getBlockById('espera-invalida')?.getParent()).toBeNull()
    expect(workspace.getBlockById('jogo-valido')?.getParent()?.type).toBe('sz_gk_on_game_click')
    expect(workspace.getBlockById('botao-valido')?.getParent()?.type).toBe('sz_gk_add_button')
    workspace.dispose()
  })

  it('migra a versão 2: reencaminha eventos e ergue preparações salvas dentro de loops', () => {
    const previousVersion = {
      szBehaviorAreasVersion: 2,
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_start',
            id: 'inicio',
            inputs: {
              CHILDREN: {
                block: { type: 'sz_js_on_click', id: 'evento-no-inicio' },
              },
            },
          },
          { type: 'sz_frame_events', id: 'eventos' },
          {
            type: 'sz_frame_loops',
            id: 'loops',
            inputs: {
              CHILDREN: {
                block: {
                  type: 'sz_canvas_anim_loop',
                  id: 'loop',
                  inputs: {
                    BODY: {
                      block: { type: 'sz_canvas_setup', id: 'preparo-no-loop' },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    }

    const migrated = normalizeBlocksStateToFrames(previousVersion) as {
      szBehaviorAreasVersion: number
      blocks: { blocks: Array<{ type: string; [key: string]: unknown }> }
    }
    expect(migrated.szBehaviorAreasVersion).toBe(BEHAVIOR_AREAS_STATE_VERSION)
    const byType = new Map(migrated.blocks.blocks.map((block) => [block.type, block]))
    expect(JSON.stringify(byType.get('sz_frame_start'))).toContain('preparo-no-loop')
    expect(JSON.stringify(byType.get('sz_frame_events'))).toContain('evento-no-inicio')
    expect(JSON.stringify(byType.get('sz_frame_loops'))).not.toContain('preparo-no-loop')
    expect(normalizeBlocksStateToFrames(migrated)).toBe(migrated)
  })

  it('preserva código avançado na área compatível escolhida pelo projeto', () => {
    const previousVersion = {
      szBehaviorAreasVersion: 5,
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_start',
            inputs: {
              CHILDREN: {
                block: { type: 'sz_adv_raw_js', id: 'raw-inicio', fields: { CODE: 'preparar();' } },
              },
            },
          },
          {
            type: 'sz_frame_events',
            inputs: {
              CHILDREN: {
                block: {
                  type: 'sz_adv_raw_js',
                  id: 'raw-evento',
                  fields: { CODE: 'window.addEventListener("custom", agir);' },
                },
              },
            },
          },
          {
            type: 'sz_frame_loops',
            inputs: {
              CHILDREN: {
                block: { type: 'sz_adv_raw_js', id: 'raw-loop', fields: { CODE: 'animar();' } },
              },
            },
          },
        ],
      },
    }

    const migrated = normalizeBlocksStateToFrames(previousVersion)
    if (!isSerializedWorkspaceState(migrated)) throw new Error('Estado migrado inválido')
    const workspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(migrated, workspace)
      expect(workspace.getBlockById('raw-inicio')?.getParent()?.type).toBe('sz_frame_start')
      expect(workspace.getBlockById('raw-evento')?.getParent()?.type).toBe('sz_frame_events')
      expect(workspace.getBlockById('raw-loop')?.getParent()?.type).toBe('sz_frame_loops')

      const ir = buildIRFromWorkspace(workspace)
      expect(ir.behavior.start.map((statement) => statement.type)).toEqual(['rawJS'])
      expect(ir.behavior.events.map((statement) => statement.type)).toEqual(['rawJS'])
      expect(ir.behavior.loops.map((statement) => statement.type)).toEqual(['rawJS'])
      expect(SZIRV2Schema.safeParse(ir).success).toBe(true)
    } finally {
      workspace.dispose()
    }
  })

  it('termina a migração v2 parcialmente framada antes de gravar a versão nova', () => {
    const previousVersion = {
      szBehaviorAreasVersion: 2,
      blocks: {
        languageVersion: 0,
        blocks: [
          { type: 'sz_frame_start', id: 'inicio' },
          { type: 'sz_g2d_on_key', id: 'evento-solto' },
          { type: 'sz_g2d_update_each_frame', id: 'loop-solto' },
        ],
      },
    }

    const migrated = normalizeBlocksStateToFrames(previousVersion) as {
      szBehaviorAreasVersion: number
      blocks: { blocks: Array<{ type: string; [key: string]: unknown }> }
    }
    expect(migrated.szBehaviorAreasVersion).toBe(BEHAVIOR_AREAS_STATE_VERSION)
    expect(migrated.blocks.blocks.map((block) => block.type)).toEqual([
      'sz_frame_start',
      'sz_frame_events',
      'sz_frame_loops',
    ])
    expect(JSON.stringify(migrated)).toContain('evento-solto')
    expect(JSON.stringify(migrated)).toContain('loop-solto')
    expect(normalizeBlocksStateToFrames(migrated)).toBe(migrated)
  })
})
