import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import { parseProjectFiles } from '#parsers'
import { FRAME_APPEARANCE, FRAME_STRUCTURE } from '../../../blockly/blockContracts'
import { CSS_BLOCKS } from '../../../blockly/blocks/css'
import { HTML_BLOCKS } from '../../../blockly/blocks/html'
import { SVG_BLOCKS } from '../../../blockly/blocks/svg'
import type { BlockDefinition } from '../../../blockly/blocks/types'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import {
  buildWorkspaceStateFromIR,
  type SerializedBlocklyBlock,
} from '../../../blockly/workspaceState'
import { webCodecForBlockType, webCodecSupports } from '../registry'

interface DropdownArg {
  type?: string
  name?: string
  options?: Array<[string, string]>
}

function dropdowns(definition: BlockDefinition): DropdownArg[] {
  return [
    definition.args0,
    definition.args1,
    definition.args2,
    definition.args3,
    definition.args4,
    definition.args5,
  ]
    .flatMap((args) => (Array.isArray(args) ? args : []))
    .filter((arg): arg is DropdownArg => Boolean(arg) && typeof arg === 'object')
    .filter((arg) => arg.type === 'field_dropdown' && typeof arg.name === 'string')
}

function stripSourceMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSourceMetadata)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) =>
      key.startsWith('__') ? [] : [[key, stripSourceMetadata(child)]],
    ),
  )
}

function connect(parent: Blockly.Block, inputName: string, child: Blockly.Block): void {
  const parentConnection = parent.getInput(inputName)?.connection
  if (!parentConnection || !child.previousConnection) {
    throw new Error(`Não foi possível encaixar ${child.type} em ${parent.type}.${inputName}.`)
  }
  parentConnection.connect(child.previousConnection)
}

function seedCSSInputs(workspace: Blockly.Workspace, block: Blockly.Block): void {
  const childTypes: Readonly<Record<string, string>> = {
    CSSDecl: 'sz_css_decl',
    CSSEntry: 'sz_css_width',
    KeyframeStep: 'sz_css_keyframe_step',
  }
  for (const input of block.inputList) {
    const connection = input.connection
    if (!connection || connection.targetBlock()) continue
    const childType = connection
      .getCheck()
      ?.map((check) => childTypes[check])
      .find(Boolean)
    if (!childType) continue
    const child = workspace.newBlock(childType)
    if (child.type === 'sz_css_decl') child.setFieldValue('--cor-teste', 'PROP')
    if (!child.previousConnection)
      throw new Error(`${childType} não oferece encaixe de declaração.`)
    connection.connect(child.previousConnection)
    seedCSSInputs(workspace, child)
  }
}

function attachInProject(workspace: Blockly.Workspace, definition: BlockDefinition): Blockly.Block {
  const target = workspace.newBlock(definition.type)
  if (target.type === 'sz_css_decl') target.setFieldValue('--cor-teste', 'PROP')
  seedCSSInputs(workspace, target)

  if (definition.previousStatement === 'HTMLNode') {
    connect(workspace.newBlock(FRAME_STRUCTURE), 'CHILDREN', target)
    return target
  }
  if (definition.previousStatement === 'CSSEntry') {
    connect(workspace.newBlock(FRAME_APPEARANCE), 'CHILDREN', target)
    return target
  }
  if (definition.previousStatement === 'CSSDecl') {
    const rule = workspace.newBlock('sz_css_rule')
    connect(rule, 'CHILDREN', target)
    connect(workspace.newBlock(FRAME_APPEARANCE), 'CHILDREN', rule)
    return target
  }
  if (definition.previousStatement === 'KeyframeStep') {
    const keyframes = workspace.newBlock('sz_css_keyframes_steps')
    connect(keyframes, 'STEPS', target)
    connect(workspace.newBlock(FRAME_APPEARANCE), 'CHILDREN', keyframes)
    return target
  }
  throw new Error(`Contexto web não coberto para ${definition.type}.`)
}

function serializedBlockTypes(blocks: readonly SerializedBlocklyBlock[]): Set<string> {
  const types = new Set<string>()
  const stack = [...blocks]
  while (stack.length > 0) {
    const block = stack.pop()
    if (!block) continue
    types.add(block.type)
    if (block.next?.block) stack.push(block.next.block)
    for (const input of Object.values(block.inputs ?? {})) {
      if (input.block) stack.push(input.block)
      if (input.shadow) stack.push(input.shadow)
    }
  }
  return types
}

beforeAll(() => ensureBlocklyInitialized())

describe('contrato executável dos codecs HTML, CSS e SVG', () => {
  for (const definition of [...HTML_BLOCKS, ...CSS_BLOCKS, ...SVG_BLOCKS]) {
    it(definition.type, () => {
      const codec = webCodecForBlockType(definition.type)
      if (!codec) throw new Error(`Bloco sem codec: ${definition.type}`)

      const workspace = new Blockly.Workspace()
      try {
        attachInProject(workspace, definition)
        const ir = buildIRFromWorkspace(workspace)
        const entries = codec.irKind === 'html' ? ir.html : ir.css
        expect(entries.length).toBeGreaterThan(0)

        const directState = buildWorkspaceStateFromIR(ir)
        if (webCodecSupports(codec, 'ir-to-block')) {
          expect(serializedBlockTypes(directState.blocks.blocks)).toContain(definition.type)
        }

        const files = generateProjectFiles({ ir, projectName: 'Contrato web' })
        const reparsed = parseProjectFiles(files)
        const reparsedEntries = codec.irKind === 'html' ? reparsed.html : reparsed.css
        expect(reparsedEntries.length).toBeGreaterThan(0)

        if (webCodecSupports(codec, 'code-to-ir') && webCodecSupports(codec, 'ir-to-block')) {
          const reparsedState = buildWorkspaceStateFromIR(reparsed)
          expect(serializedBlockTypes(reparsedState.blocks.blocks)).toContain(definition.type)
        }
      } finally {
        workspace.dispose()
      }
    })
  }
})

describe('contrato executável das opções de dropdown HTML, CSS e SVG', () => {
  const cases = [...HTML_BLOCKS, ...CSS_BLOCKS, ...SVG_BLOCKS].flatMap((definition) =>
    dropdowns(definition).flatMap((field) =>
      (field.options ?? []).map(([, value]) => ({
        definition,
        field: field.name ?? '',
        value,
      })),
    ),
  )

  it('mantém o inventário esperado de escolhas', () => {
    expect(cases).toHaveLength(99)
  })

  for (const { definition, field, value } of cases) {
    it(`${definition.type}.${field}=${value || 'automático'}`, () => {
      const workspace = new Blockly.Workspace()
      try {
        const target = attachInProject(workspace, definition)
        target.setFieldValue(value, field)
        const ir = buildIRFromWorkspace(workspace)
        expect(SZIRV2Schema.safeParse(ir).success).toBe(true)

        const restoredWorkspace = new Blockly.Workspace()
        try {
          Blockly.serialization.workspaces.load(
            buildWorkspaceStateFromIR(ir) as unknown as Record<string, unknown>,
            restoredWorkspace,
          )
          expect(stripSourceMetadata(buildIRFromWorkspace(restoredWorkspace))).toEqual(
            stripSourceMetadata(ir),
          )
        } finally {
          restoredWorkspace.dispose()
        }

        const codec = webCodecForBlockType(definition.type)
        if (
          codec &&
          webCodecSupports(codec, 'code-to-ir') &&
          webCodecSupports(codec, 'ir-to-block')
        ) {
          const reparsed = parseProjectFiles(
            generateProjectFiles({ ir, projectName: 'Contrato dos menus web' }),
          )
          const reparsedState = buildWorkspaceStateFromIR(reparsed)
          expect(serializedBlockTypes(reparsedState.blocks.blocks)).toContain(definition.type)
        }
      } finally {
        workspace.dispose()
      }
    })
  }
})
