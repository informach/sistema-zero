import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { compileStatements } from '../../../generators/js'
import { behaviorStatements, normalizeSZIR, SZIRV2Schema } from '../../../ir'
import { parseJS } from '../../../parsers/js'
import { gameTwoDRuntime } from '../runtime'
import { setupGameTwoDExampleTests } from './exampleContractHarness'

setupGameTwoDExampleTests()

function throughBlocks(source: string, requiredType?: string): string {
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
    if (requiredType)
      expect(workspace.getAllBlocks(false).some((block) => block.type === requiredType)).toBe(true)
    expect(workspace.getAllBlocks(false).some((block) => block.type === 'sz_adv_raw_js')).toBe(
      false,
    )
    const saved = Blockly.serialization.workspaces.save(workspace)
    workspace.clear()
    Blockly.serialization.workspaces.load(saved, workspace)
    return compileStatements(behaviorStatements(buildIRFromWorkspace(workspace)), 0)
  } finally {
    workspace.dispose()
  }
}

function execute(source: string): unknown {
  const win = { addEventListener() {}, SZGame2D: undefined }
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  return new Function('SZGame2D', `${source}\nreturn resultado;`)(win.SZGame2D)
}

describe('Ações atuais do Jogo 2D', () => {
  it('duplicar uma ação criada nos blocos cria outra recarga independente', () => {
    const ir = normalizeSZIR({
      html: [],
      css: [],
      js: [
        {
          type: 'g2d:createSprite',
          varName: 'jogador',
          x: 0,
          y: 0,
          w: 20,
          h: 20,
          color: '#ffffff',
        },
        {
          type: 'g2d:withCooldown',
          __id: 'recarga-original',
          key: 'recarga-original',
          spriteVar: 'jogador',
          frames: { type: 'num', value: 30 },
          body: [],
        },
      ],
      extensions: [{ extensionId: 'game-2d' }],
    })
    const workspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(buildWorkspaceStateFromIR(ir), workspace)
      const original = workspace.getBlockById('recarga-original')
      if (!original) throw new Error('Ação não foi reconstruída')
      const state = Blockly.serialization.blocks.save(original)
      if (!state) throw new Error('Ação não foi serializada')
      const copy = Blockly.serialization.blocks.append({ ...state, id: 'recarga-copia' }, workspace)
      if (!original.nextConnection || !copy.previousConnection)
        throw new Error('Conexões da ação ausentes')
      original.nextConnection.connect(copy.previousConnection)
      const actions = behaviorStatements(buildIRFromWorkspace(workspace)).filter(
        (stmt) => stmt.type === 'g2d:withCooldown',
      )
      expect(actions.map((action) => action.key)).toEqual(['recarga-original', 'recarga-copia'])
    } finally {
      workspace.dispose()
    }
  })
  it('pergunta circular é pura e editável depois de salvar e reabrir', () => {
    const source = `const a = SZGame2D.createSprite({x:0,y:0,w:20,h:20});
const b = SZGame2D.createSprite({x:10,y:0,w:20,h:20});
let resultado = false;
if (SZGame2D.circleCollides(a,b)) { resultado = true; }`
    const rebuilt = throughBlocks(source, 'sz_g2d_circle_touches')
    expect(rebuilt).toContain('SZGame2D.circleCollides(a, b)')
    expect(execute(rebuilt)).toBe(true)
    expect(
      execute(`${source}\nresultado = [resultado, SZGame2D.circleCollides(a,b), a.x, b.x];`),
    ).toEqual([true, true, 0, 10])
  })

  it('recarga preserva chaves e executa cada ação independentemente', () => {
    const source = `const jogador = SZGame2D.createSprite({x:0,y:0,w:20,h:20});
let resultado = 0;
SZGame2D.withCooldown(jogador,30,function(){resultado += 1;},'tiro');
SZGame2D.withCooldown(jogador,30,function(){resultado += 10;},'tiro');
SZGame2D.withCooldown(jogador,30,function(){resultado += 100;},'pulo');`
    expect(execute(source)).toBe(101)
    expect(execute(throughBlocks(source, 'sz_g2d_with_cooldown'))).toBe(101)
  })

  it('destruir remove todos os vínculos e impede reinserção pelo array público', () => {
    expect(
      execute(`
const sprite = SZGame2D.createTextSprite(42,10,20);
const a = SZGame2D.createGroup(); const b = SZGame2D.createGroup();
a.items.push(sprite,sprite); b.items.push(sprite);
SZGame2D.destroySprite(sprite); SZGame2D.destroySprite(sprite);
a.items.push(sprite); b.items=[sprite];
SZGame2D.setPosition(sprite,100,200); SZGame2D.setSpriteText(sprite,'voltou');
let resultado = [a.items.length,b.items.length,sprite.x,sprite.y,SZGame2D.isColliding(sprite,sprite),SZGame2D.circleCollides(sprite,sprite),SZGame2D.cooldownReady(sprite,1,'x')];
`),
    ).toEqual([0, 0, 10, 20, false, false, false])
  })

  it('destruição continua editável e não executa a ação com sprite destruído', () => {
    const source = `const jogador = SZGame2D.createSprite({x:0,y:0,w:20,h:20});
let resultado = 0;
SZGame2D.destroySprite(jogador);
SZGame2D.withCooldown(jogador,1,function(){resultado += 1;},'tiro');`
    expect(execute(throughBlocks(source, 'sz_g2d_destroy_sprite'))).toBe(0)
  })

  it('tirar do último grupo permite reutilização sem destruir o sprite', () => {
    expect(
      execute(`
const sprite = SZGame2D.createSprite({x:10,y:20}); const grupo = SZGame2D.createGroup();
grupo.items.push(sprite); grupo.items.length=0;
SZGame2D.setPosition(sprite,50,60); grupo.items.push(sprite);
let resultado = [grupo.items.length,sprite.x,sprite.y];
`),
    ).toEqual([1, 50, 60])
  })
})
