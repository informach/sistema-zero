import { beforeAll, expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { registerExtensionBlocks } from '../../blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { FieldNamePicker } from '../../blockly/fields/FieldNamePicker'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { compileStatements } from '../../generators/js'
import { behaviorStatements, normalizeSZIR, SZIRV2Schema } from '../../ir'
import { validateProgrammingReferences } from '../../ir/programmingReferences'
import { parseJS } from '../../parsers/js'
import { gameTwoDBlocks } from '../game-2d/blocks'
import { gameKitBlocks } from '../game-2d-advanced/blocks'
import { sceneMethods } from './catalog'

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
  registerExtensionBlocks(gameKitBlocks)
})

for (const target of ['g2d', 'gk'] as const) {
  const api = target === 'g2d' ? 'SZGame2D' : 'SZGameKit'
  const extensionId = target === 'g2d' ? 'game-2d' : 'game-2d-advanced'
  for (const entry of sceneMethods(target)) {
    test(`${target}.${entry.method}: code → IR → saved blocks → code is stable`, () => {
      const args = entry.args.map((arg) =>
        arg.field === 'sprite' ? String(arg.value) : JSON.stringify(arg.value),
      )
      if (entry.event || entry.each)
        args.push(
          `function (${entry.parameter ?? ''}) { ${api}.trackCameraView("pista", "wide"); ${api}.trackCameraView("pista", "near"); }`,
        )
      const call = `${api}.${entry.method}(${args.join(', ')})`
      const declaration =
        entry.args.some((arg) => arg.field === 'sprite') || entry.placement === 'event-body'
          ? 'let jogador = 0; '
          : ''
      const code =
        entry.placement === 'event-body'
          ? `${declaration}${api}.${target === 'g2d' ? 'onTrackEncounter' : 'onTrackSpriteEncounter'}("pista", jogador, function (${target === 'gk' ? 'encontrado' : ''}) { ${call}; });`
          : declaration + (entry.value ? `let resultado = ${call};` : `${call};`)
      const js = parseJS(code)
      expect(JSON.stringify(js)).toContain(
        `${target}:scene${entry.value ? 'Value' : entry.event ? 'Event' : entry.each ? 'Each' : 'Command'}`,
      )
      expect(JSON.stringify(js)).not.toContain('rawJS')
      const ir = SZIRV2Schema.parse(
        normalizeSZIR({ html: [], css: [], js, extensions: [{ extensionId }] }),
      )
      const workspace = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(buildWorkspaceStateFromIR(ir), workspace)
        const saved = Blockly.serialization.workspaces.save(workspace)
        workspace.clear()
        Blockly.serialization.workspaces.load(saved, workspace)
        const output = compileStatements(behaviorStatements(buildIRFromWorkspace(workspace)), 0)
        expect(output).toBe(compileStatements(behaviorStatements(ir), 0))
        expect(compileStatements(parseJS(output), 0)).toBe(output)
      } finally {
        workspace.dispose()
      }
    })
  }
  test(`${target}: expressions accept nested variables and preserve invalid calls`, () => {
    const source = `let distancia = 4; ${api}.${target === 'g2d' ? 'trackScore' : 'trackSpeed'}('pista', distancia * 2); if (${api}.${target === 'g2d' ? 'spriteTrackValue' : 'trackPosition'}('pista', 'distance') > 3) { distancia = distancia + 1; }`
    const nodes = parseJS(source)
    expect(JSON.stringify(nodes)).not.toContain('rawJS')
    expect(compileStatements(parseJS(compileStatements(nodes, 0)), 0)).toBe(
      compileStatements(nodes, 0),
    )
    for (const source of [
      `${api}.createSceneLayer('x', 'y', 'invalid');`,
      `${api}.advanceTrack('pista', 1, 2);`,
      `let x = ${api}.trackValue('pista', 'invalid');`,
    ]) {
      expect(JSON.stringify(parseJS(source))).not.toContain(`${target}:scene`)
      expect(compileStatements(parseJS(source), 0)).toContain(api)
    }
  })
}

test('advanced waves and per-copy actions stay in blocks and keep callback names scoped', () => {
  const source = `
SZGameKit.setup({ width: 640, height: 480, background: "#102d46", accent: "#ffffff" });
SZGameKit.createSpriteTrack("asteroides");
SZGameKit.defineMold("alvo", { w: 20, h: 20, speed: 0, health: 2 });
SZGameKit.onTrackMoldEncounter("asteroides", "alvo", function (encontrado) {
    SZGameKit.setHealth(encontrado, 3);
    SZGameKit.collectTrackItem();
});
if (SZGameKit.everySeconds("onda", 1)) {
    const alvo = SZGameKit.spawnFromMold("alvo", 0, 0);
    SZGameKit.putTrackSprite("asteroides", alvo, 80, 900);
    SZGameKit.repeatTrackSprite("asteroides", alvo, 3, 120, "alternate");
    SZGameKit.trackSpriteVelocity(alvo, 0, -200);
    SZGameKit.forEachTrackSprite(alvo, function (copia) {
      SZGameKit.setHealth(copia, 3);
      let posicao = copia.x;
    });
}`
  const js = parseJS(source)
  expect(JSON.stringify(js)).not.toMatch(/rawJS|memberCall|functionDecl/)
  expect(validateProgrammingReferences(js)).toEqual([])
  const ir = SZIRV2Schema.parse(
    normalizeSZIR({ html: [], css: [], js, extensions: [{ extensionId: 'game-2d-advanced' }] }),
  )
  const workspace = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(buildWorkspaceStateFromIR(ir), workspace)
    const event = workspace
      .getAllBlocks(false)
      .find((block) => block.type === 'sz_gk_on_track_mold_encounter')!
    const mold = event.getField('MOLD')
    expect(mold).toBeInstanceOf(FieldNamePicker)
    expect((mold as FieldNamePicker).kind).toBe('mold')
    const output = compileStatements(behaviorStatements(buildIRFromWorkspace(workspace)), 0)
    expect(output).toBe(compileStatements(behaviorStatements(ir), 0))
    expect(validateProgrammingReferences(parseJS(`${output}\nlet vazou = copia;`))).not.toEqual([])
  } finally {
    workspace.dispose()
  }
})

test('beginner shortcuts cannot enter the advanced scene schema', () => {
  const js = parseJS('SZGame2D.trackTravel("pista", 320, 6600);')
  expect(js[0]?.type).toBe('g2d:sceneCommand')
  expect(
    SZIRV2Schema.safeParse(
      normalizeSZIR({
        html: [],
        css: [],
        js: [{ ...js[0], type: 'gk:sceneCommand' }] as typeof js,
        extensions: [{ extensionId: 'game-2d-advanced' }],
      }),
    ).success,
  ).toBe(false)
})

for (const parameter of ['class', 'cópia azul']) {
  test(`callback declarations and references share identifier normalization: ${parameter}`, () => {
    const source =
      'const alvo = SZGameKit.createCharacter({w:20,h:20,speed:0}); SZGameKit.forEachTrackSprite(alvo,function(copia){ SZGameKit.setHealth(copia,3); });'
    const ir = normalizeSZIR({
      html: [],
      css: [],
      js: parseJS(source),
      extensions: [{ extensionId: 'game-2d-advanced' }],
    })
    const workspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(buildWorkspaceStateFromIR(ir), workspace)
      workspace
        .getAllBlocks(false)
        .find((b) => b.type === 'sz_gk_for_each_track_sprite')!
        .setFieldValue(parameter, 'PARAM')
      workspace
        .getAllBlocks(false)
        .find((b) => b.type === 'sz_gk_set_health')!
        .setFieldValue(parameter, 'WHO')
      const rebuilt = SZIRV2Schema.parse(buildIRFromWorkspace(workspace))
      const code = compileStatements(behaviorStatements(rebuilt), 0)
      const sprite = { health: 0 }
      new Function('SZGameKit', code)({
        createCharacter: () => sprite,
        forEachTrackSprite: (who: typeof sprite, fn: (copy: typeof sprite) => void) => fn(who),
        setHealth: (who: typeof sprite, health: number) => {
          who.health = health
        },
      })
      expect(sprite.health).toBe(3)
    } finally {
      workspace.dispose()
    }
  })
}
