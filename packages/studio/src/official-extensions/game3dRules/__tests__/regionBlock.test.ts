import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type SZIRInput } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import type { BlockDefinition } from '../../../blockly/blocks/types'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { HTMLConnectionChecker } from '../../../blockly/htmlConnectionChecker'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { parseProjectFilesWithDiagnostics } from '../../../parsers/project'
import { gameThreeDBlocks } from '../../game-3d/blocks'
import { gameKit3DBlocks } from '../../game-3d-advanced/blocks'
import { world3DBlocks } from '../../world-3d/blocks'
import { isGameRulesStatement } from '../ir'

/**
 * "Quando … entrar na região …" (lote 6 da conclusão, 22/11/2026) nos três motores 3D: o código
 * vira o bloco e o bloco volta ao MESMO código. O Jogo 3D pergunta pelo objeto (variável), o
 * Mundo 3D pelo jogador (sem objeto) e o 3D Avançado pelo MOLDE (entre aspas): no Avançado as
 * entidades nascem dentro do "Quando o jogo entrar no estado", e a regra mora no ⚡ Quando
 * acontecer, onde a variável não existe.
 */

ensureBlocklyInitialized()
for (const blocks of [gameThreeDBlocks, world3DBlocks, gameKit3DBlocks])
  registerExtensionBlocks(blocks as BlockDefinition[])

const CASOS = [
  {
    prefix: 'g3d',
    prelude:
      'const cena = SZGame3D.createScene("tela");\nconst heroi = SZGame3D.createBox(cena, { size: 2, color: "#ff0000" });\n',
    rule: 'SZGame3D.onEnterRegion(heroi, "Vila", () => {\n  SZGame3D.addScore(1);\n});',
    fields: { OBJ: 'heroi', REGION: 'Vila' },
  },
  {
    prefix: 'w3d',
    prelude: 'SZWorld3D.setup({ style: "floresta" });\n',
    rule: 'SZWorld3D.onEnterRegion("Vila", () => {\n  SZWorld3D.addScore(1);\n});',
    fields: { REGION: 'Vila' },
  },
  {
    prefix: 'g3k',
    prelude: 'SZGameKit3D.setup({ width: 640, height: 360 });\n',
    rule: 'SZGameKit3D.onEnterRegion("heroi", "Vila", () => {\n  SZGameKit3D.addScore(1);\n});',
    fields: { OBJ: 'heroi', REGION: 'Vila' },
  },
] as const

const codeOf = (ir: SZIRInput) => compileStatements(behaviorStatements(ir), 0)

describe('"Quando entrar na região": código ⇄ bloco nos três motores 3D', () => {
  for (const caso of CASOS) {
    it(`${caso.prefix}: vira o bloco com o nome da região e volta ao mesmo código`, () => {
      const parsed = parseProjectFilesWithDiagnostics({
        'index.html': '<canvas id="tela"></canvas>',
        'style.css': '',
        'script.js': caso.prelude + caso.rule,
      })
      expect(parsed.diagnostics.filter((entry) => entry.kind === 'semanticError')).toEqual([])
      const original = codeOf(parsed.ir)
      expect(original).toContain(caso.rule)
      expect(JSON.stringify(parsed.ir)).not.toContain('"rawJS"')
      const workspace = new Blockly.Workspace()
      workspace.connectionChecker = new HTMLConnectionChecker()
      try {
        Blockly.serialization.workspaces.load(
          buildWorkspaceStateFromIR(parsed.ir) as never,
          workspace,
        )
        const blocks = workspace.getBlocksByType(`sz_${caso.prefix}_on_enter_region`, false)
        expect(blocks).toHaveLength(1)
        const block = blocks[0] as Blockly.Block
        for (const [name, value] of Object.entries(caso.fields))
          expect(block.getFieldValue(name), name).toBe(value)
        if (!('OBJ' in caso.fields)) expect(block.getField('OBJ')).toBeNull()
        expect(codeOf(buildIRFromWorkspace(workspace))).toBe(original)
      } finally {
        workspace.dispose()
      }
    })
  }

  it('a forma de outro motor fica como código (nunca um bloco que não casa)', () => {
    for (const source of [
      // O Avançado segue o molde: variável ali não é o bloco.
      'SZGameKit3D.onEnterRegion(heroi, "Vila", () => {\n});',
      // O Jogo 3D segue o objeto: texto ali não é o bloco.
      'SZGame3D.onEnterRegion("heroi", "Vila", () => {\n});',
      // O Mundo 3D não tem objeto: o jogador é implícito.
      'SZWorld3D.onEnterRegion(heroi, "Vila", () => {\n});',
      // Sem nome de região.
      'SZGame3D.onEnterRegion(heroi, nome, () => {\n});',
    ])
      expect(
        parseJS(source).some((statement) => isGameRulesStatement(statement)),
        source,
      ).toBe(false)
  })

  it('o seletor do 3D Avançado lista moldes; o do Jogo 3D, objetos', () => {
    const kindOf = (blocks: readonly BlockDefinition[], type: string) =>
      (
        blocks.find((block) => block.type === type)?.args0 as
          | { name?: string; kind?: string }[]
          | undefined
      )?.find((arg) => arg.name === 'OBJ')?.kind
    expect(kindOf(gameKit3DBlocks as BlockDefinition[], 'sz_g3k_on_enter_region')).toBe('mold3d')
    expect(kindOf(gameThreeDBlocks as BlockDefinition[], 'sz_g3d_on_enter_region')).toBe(
      'g3d-object',
    )
    // As outras regras do Avançado continuam com o seletor de entidade.
    expect(kindOf(gameKit3DBlocks as BlockDefinition[], 'sz_g3k_on_timer_end')).toBeUndefined()
  })
})
