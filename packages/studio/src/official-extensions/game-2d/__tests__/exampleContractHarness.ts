import { beforeAll, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import type { ExtensionExample } from '#extensions'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement, normalizeSZIR } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { collectTypes, stripIds } from '../__gen_dinoCorredor'
import { gameTwoDBlocks } from '../blocks'

interface ExampleContractOptions {
  example: ExtensionExample
  source: string
  stage: {
    width: number
    height: number
    bg: string
  }
}

function parseExampleLifecycleSource(source: string): JSStatement[] {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(source),
    extensions: [{ extensionId: 'game-2d' }],
  })

  // A IR persistida é JSON e não guarda campos opcionais com `undefined`.
  return JSON.parse(JSON.stringify(behaviorStatements(normalized))) as JSStatement[]
}

export function setupGameTwoDExampleTests(): void {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })
}

/** Registra os quatro contratos estruturais compartilhados por todos os exemplos completos. */
export function registerExampleContractTests({
  example,
  source,
  stage,
}: ExampleContractOptions): void {
  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall), fora a dupla do wrapper', () => {
    const parsed = stripIds(parseExampleLifecycleSource(source))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)

    const embedded = stripIds(behaviorStatements(example.ir)) as JSStatement[]
    expect(embedded[0]).toEqual({
      type: 'g2d:setupStage',
      ...stage,
    } as JSStatement)
    expect(embedded[1]).toEqual({
      type: 'g2d:setStageDescription',
      description: example.description ?? '',
    } as JSStatement)
    expect(parsed).toEqual(embedded.slice(2))
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(example.ir)).not.toContain('—')
    expect(example.name).not.toContain('—')
    expect(example.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(stripIds(behaviorStatements(example.ir)) as JSStatement[], 0)
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR preserva o jogo inteiro', () => {
    const state = buildWorkspaceStateFromIR(
      example.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const workspace = new Blockly.Workspace()

    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, workspace)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(workspace))
      const embedded = behaviorStatements(example.ir)
      expect(collectTypes(rebuilt).has('rawJS')).toBe(false)
      expect(rebuilt.length).toBe(embedded.length)
      expect(compileStatements(stripIds(rebuilt) as JSStatement[], 0)).toBe(
        compileStatements(stripIds(embedded) as JSStatement[], 0),
      )
    } finally {
      workspace.dispose()
    }
  })
}
