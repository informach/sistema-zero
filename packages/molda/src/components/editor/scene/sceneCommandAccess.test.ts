import { describe, expect, test } from 'bun:test'
import {
  MOLDA_TOOL_FAMILIES,
  type MoldaToolBandId,
  moldaToolFamilyIds,
  readMoldaToolAccess,
} from '../../../core/toolFamilies'
import {
  SCENE_COMMAND_ACCESS,
  type SceneToolCheck,
  sceneCommandAllowed,
} from './sceneCommandAccess'
import {
  contextualSceneCommands,
  matchSceneShortcut,
  SCENE_COMMANDS,
  type SceneCommandId,
  sceneCommandForShortcut,
  sceneRailGroups,
} from './sceneCommandRegistry'

const upTo = (...bands: MoldaToolBandId[]) =>
  readMoldaToolAccess({ allow: moldaToolFamilyIds(bands) }).can
const entry = upTo('basic')
const nothing = readMoldaToolAccess({ allow: [] }).can

const lockedFor = (can: SceneToolCheck) =>
  SCENE_COMMANDS.map((command) => command.id as SceneCommandId).filter(
    (id) => !sceneCommandAllowed(id, can),
  )

describe('família de cada comando', () => {
  test('o mapa cobre o registro inteiro, e só famílias que existem', () => {
    const families = new Set<string>(MOLDA_TOOL_FAMILIES.map((family) => family.id))
    expect(Object.keys(SCENE_COMMAND_ACCESS).sort()).toEqual(
      SCENE_COMMANDS.map((command) => command.id).sort(),
    )
    for (const [id, family] of Object.entries(SCENE_COMMAND_ACCESS))
      expect(family === 'always' || families.has(family), `${id} → ${family}`).toBe(true)
  })

  /** A lista do plano ("Fica fora do portão, sempre"): mudar exige decidir, não escorregar. */
  test('ler, sair, desfazer, guardar e olhar nunca trancam', () => {
    expect(lockedFor(nothing)).not.toContain('app.exit')
    expect(
      SCENE_COMMANDS.map((command) => command.id as SceneCommandId).filter(
        (id) => SCENE_COMMAND_ACCESS[id] === 'always',
      ),
    ).toEqual([
      'app.exit',
      'app.undo',
      'app.redo',
      'app.save',
      'app.backup',
      'tool.select',
      'select.additive',
      'view.isolate',
      'view.frame',
      'view.grid',
      'view.supports',
    ])
  })

  test('no nível de entrada saem malha, laço, caixa, ponto de apoio e arquivo de outro programa', () => {
    expect(lockedFor(entry)).toEqual([
      'app.import',
      'add.locator',
      'tool.box',
      'tool.lasso',
      'node.convert-mesh',
      'mode.mesh',
      'mesh.extrude',
      'mesh.inset',
      'mesh.plane-cut',
      'mesh.uv',
    ])
    expect(lockedFor(upTo('basic', 'intermediate'))).toEqual([
      'app.import',
      'mesh.plane-cut',
      'mesh.uv',
    ])
    expect(lockedFor(upTo('basic', 'intermediate', 'professional'))).toEqual([])
  })
})

describe('o registro com o portão', () => {
  test('sem `can`, nada muda: é o mesmo que tudo liberado', () => {
    const everything = () => true
    for (const context of ['model', 'mesh-face', 'animate', 'global'] as const)
      for (const slot of ['rail', 'stage', 'app', 'menu', 'dock', 'dialog'] as const)
        expect(contextualSceneCommands(context, slot, {}, everything).map((c) => c.id)).toEqual(
          contextualSceneCommands(context, slot).map((c) => c.id),
        )
  })

  test('trancado some do trilho (nunca desligado), e o grupo que esvazia não vira legenda', () => {
    const rail = sceneRailGroups('model', {}, entry)
    expect(rail.map((entry) => entry.group)).toEqual(['create', 'tools', 'piece', 'pinned'])
    const ids = rail.flatMap((entry) => entry.commands.map((command) => command.id))
    expect(ids).toContain('add.box')
    expect(ids).toContain('tool.move')
    expect(ids).not.toContain('tool.lasso')
    expect(ids).not.toContain('add.locator')
    expect(ids).not.toContain('mode.mesh')
    expect(contextualSceneCommands('global', 'menu', {}, entry).map((c) => c.id)).toEqual([
      'app.save',
      'app.backup',
    ])
  })

  test('atalho trancado é reconhecido, mas não executa', () => {
    const del = { key: 'Delete', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }
    const undo = { key: 'z', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false }
    expect(sceneCommandForShortcut('model', del, entry)).toBe('node.remove')
    expect(matchSceneShortcut('model', del, nothing)).toEqual({
      id: 'node.remove',
      allowed: false,
    })
    expect(sceneCommandForShortcut('model', del, nothing)).toBeNull()
    expect(sceneCommandForShortcut('global', undo, nothing)).toBe('app.undo')
    expect(
      matchSceneShortcut('model', { ...del, key: 'q' }, entry),
      'tecla que não é de ninguém continua livre',
    ).toBeNull()
  })
})
