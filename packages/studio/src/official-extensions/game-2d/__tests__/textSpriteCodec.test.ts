import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { compileStatements } from '../../../generators/js'
import { behaviorStatements, normalizeSZIR, SZIRV2Schema } from '../../../ir'
import { parseJS } from '../../../parsers/js'
import { gameTwoDRuntime } from '../runtime'
import type { GameTwoDRuntimeApi } from '../runtimeContract'
import { setupGameTwoDExampleTests } from './exampleContractHarness'

setupGameTwoDExampleTests()

function throughBlocks(source: string): string {
  const ir = SZIRV2Schema.parse(
    normalizeSZIR({
      html: [],
      css: [],
      js: parseJS(source),
      extensions: [{ extensionId: 'game-2d' }],
    }),
  )
  const workspace = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(buildWorkspaceStateFromIR(ir), workspace)
    const saved = JSON.stringify(Blockly.serialization.workspaces.save(workspace))
    workspace.clear()
    Blockly.serialization.workspaces.load(JSON.parse(saved), workspace)
    return compileStatements(behaviorStatements(buildIRFromWorkspace(workspace)), 0)
  } finally {
    workspace.dispose()
  }
}

function execute(source: string): unknown {
  const win: { SZGame2D?: GameTwoDRuntimeApi; addEventListener(): void } = {
    addEventListener() {},
  }
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  if (!win.SZGame2D) throw new Error('Runtime não inicializado')
  return new Function('SZGame2D', `${source}\nreturn resultado;`)(win.SZGame2D)
}

describe('Ponte de sprites de texto preserva o programa original', () => {
  for (const kind of ['let', 'var']) {
    for (const creator of ['createTextSprite', 'spawnTextInGroup']) {
      it(`${kind} com ${creator} continua reatribuível após salvar e reabrir blocos`, () => {
        const args = creator === 'spawnTextInGroup' ? 'grupo, ' : ''
        const source = `const grupo = SZGame2D.createGroup();
${kind} resposta = SZGame2D.${creator}(${args}'A', 10, 10);
resposta = SZGame2D.${creator}(${args}'B', 20, 20);
let resultado = SZGame2D.spriteText(resposta);`
        expect(execute(source)).toBe('B')
        expect(execute(compileStatements(parseJS(source), 0))).toBe('B')
        const rebuilt = throughBlocks(source)
        expect(rebuilt).toContain(`${kind} resposta =`)
        expect(execute(rebuilt)).toBe('B')
      })
    }
  }

  it('var criado num laço conserva o escopo depois do laço', () => {
    const source = `for (let i = 1; i < 3; i++) {
  var numero = SZGame2D.createTextSprite(i, 10, 10);
}
let resultado = SZGame2D.spriteText(numero);`
    expect(execute(throughBlocks(source))).toBe('2')
  })

  for (const scope of ['let', 'callback', 'function']) {
    it(`não torna global um sprite local de ${scope}`, () => {
      const source =
        scope === 'let'
          ? `for (let i = 0; i < 1; i++) { let numero = SZGame2D.createTextSprite(i, 0, 0); }`
          : scope === 'callback'
            ? `SZGame2D.onKey('Enter', function () { var numero = SZGame2D.createTextSprite(1, 0, 0); });`
            : `function criar() { var numero = SZGame2D.createTextSprite(1, 0, 0); }`
      expect(() =>
        throughBlocks(`${source}\nlet resultado = SZGame2D.spriteText(numero);`),
      ).toThrow('numero')
    })
  }

  it('não reutiliza um ID explícito ao gerar outro evento', () => {
    const source = `const alvo = SZGame2D.createTextSprite('A', 0, 0);
SZGame2D.onSpriteClick(alvo, function () {}, 'cliqueSprite');
SZGame2D.onSpriteClick(alvo, function () {});`
    const events = parseJS(compileStatements(parseJS(source), 0)).filter(
      (s) => s.type === 'g2d:onSpriteClick',
    )
    expect(events.map((s) => s.eventId)).toEqual(['cliqueSprite', 'cliqueSprite_2'])
  })

  for (const method of ['onSpriteClick', 'onGroupClick']) {
    it(`${method} conserva IDs explícitos, inclusive repetidos e vazios`, () => {
      const param = method === 'onGroupClick' ? 'resposta' : ''
      const source = `const alvo = SZGame2D.${method === 'onGroupClick' ? 'createGroup()' : "createTextSprite('A', 10, 10)"};
SZGame2D.${method}(alvo, function (${param}) { console.log('primeiro'); }, 'mesmo');
SZGame2D.${method}(alvo, function (${param}) { console.log('segundo'); }, 'mesmo');
SZGame2D.${method}(alvo, function (${param}) { console.log('terceiro'); }, '');`
      const rebuilt = throughBlocks(source)
      const events = parseJS(rebuilt).filter(
        (s) => s.type === 'g2d:onSpriteClick' || s.type === 'g2d:onGroupClick',
      )
      expect(events.map((s) => ('eventId' in s ? s.eventId : undefined))).toEqual([
        'mesmo',
        'mesmo',
        '',
      ])
      expect(rebuilt.match(/}, "mesmo"\);/g)?.length).toBe(2)
      expect(throughBlocks(rebuilt)).toBe(rebuilt)
    })
  }
})
