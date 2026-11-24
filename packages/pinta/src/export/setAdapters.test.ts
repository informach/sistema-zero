import { expect, it } from 'bun:test'
import { spawnSync } from 'node:child_process'
import type { PintaSceneObject } from '@sistemazero/core/studio/pinta-scene'
import {
  sceneObjectTransformSource,
  transformSceneSetObject,
} from '@sistemazero/core/studio/pinta-scene-runtime'
import { pygameSceneModule } from './pygameProject'

const object = (id: string, extra = {}): PintaSceneObject => ({
  id,
  name: id,
  type: '',
  x: 2,
  y: 3,
  width: 8,
  height: 6,
  properties: {},
  ...extra,
})
const cases = [0, 30, 90].flatMap((rotation) =>
  [false, true].flatMap((flipX) =>
    [false, true].flatMap((flipY) =>
      [32, 48].flatMap((height) =>
        [0, 35].flatMap((childRotation) =>
          ['rect', 'polygon', 'polyline', 'ellipse', 'art'].map((shape) => ({
            parent: object('copy', {
              x: 48,
              y: 50,
              width: 32,
              height,
              rotation,
              flipX: flipX || undefined,
              flipY: flipY || undefined,
            }),
            child: object('child', {
              rotation: childRotation,
              shape,
              ...(shape === 'polygon' || shape === 'polyline'
                ? {
                    points: [
                      { x: 0, y: 0 },
                      { x: 8, y: 2 },
                      { x: 3, y: 6 },
                    ],
                  }
                : {}),
              properties: {
                local: { type: 'object', value: 'sibling' },
                external: { type: 'object', value: 'outside' },
              },
            }),
          })),
        ),
      ),
    ),
  ),
)
const ids = ['child', 'sibling']

it('a zero-area legacy set remains readable as a degenerate footprint', () => {
  expect(() =>
    transformSceneSetObject(object('copy', { width: 0 }), object('child'), 16, 16, ids),
  ).not.toThrow()
})

it('an affinely transformed ellipse retains its exact boundary under nonuniform scaling', () => {
  for (const { parent, child } of cases.filter(
    (c) => c.child.shape === 'ellipse' && c.parent.height === 48 && c.child.rotation === 35,
  )) {
    const transformed = transformSceneSetObject(parent, child, 16, 16, ids),
      angle = ((parent.rotation ?? 0) * Math.PI) / 180,
      inner = ((child.rotation ?? 0) * Math.PI) / 180,
      output = (-(transformed.rotation ?? 0) * Math.PI) / 180
    for (let n = 0; n < 32; n++) {
      const t = (n * Math.PI) / 16,
        px = (child.width / 2) * (1 + Math.cos(t)),
        py = (child.height / 2) * (1 + Math.sin(t))
      let x = child.x + px * Math.cos(inner) - py * Math.sin(inner),
        y = child.y + px * Math.sin(inner) + py * Math.cos(inner)
      x = (parent.flipX ? 16 - x : x) * 2
      y = (parent.flipY ? 16 - y : y) * 3
      const wx = parent.x + x * Math.cos(angle) - y * Math.sin(angle) - transformed.x,
        wy = parent.y + x * Math.sin(angle) + y * Math.cos(angle) - transformed.y,
        ox = wx * Math.cos(output) - wy * Math.sin(output),
        oy = wx * Math.sin(output) + wy * Math.cos(output)
      expect(
        ((ox - transformed.width / 2) / (transformed.width / 2)) ** 2 +
          ((oy - transformed.height / 2) / (transformed.height / 2)) ** 2,
      ).toBeCloseTo(1, 8)
    }
  }
})

it('the embedded JS transformation is exactly the same helper, without external dependencies', () => {
  const embedded = new Function(`${sceneObjectTransformSource}; return transformSceneSetObject`)()
  for (const { parent, child } of cases)
    expect(embedded(parent, child, 16, 16, ids)).toEqual(
      transformSceneSetObject(parent, child, 16, 16, ids),
    )
})

it('uniform set reflection and rotation preserve every authored rectangle corner', () => {
  for (const { parent, child } of cases.filter(
    (c) => c.child.shape === 'rect' && c.parent.height === 32,
  )) {
    const transformed = transformSceneSetObject(parent, child, 16, 16, ids),
      angle = ((parent.rotation ?? 0) * Math.PI) / 180,
      inner = ((child.rotation ?? 0) * Math.PI) / 180,
      resultAngle = ((transformed.rotation ?? 0) * Math.PI) / 180
    const actual = [
      [0, 0],
      [transformed.width, 0],
      [0, transformed.height],
      [transformed.width, transformed.height],
    ].map(([x, y]) => ({
      x: transformed.x + x! * Math.cos(resultAngle) - y! * Math.sin(resultAngle),
      y: transformed.y + x! * Math.sin(resultAngle) + y! * Math.cos(resultAngle),
    }))
    for (const [x, y] of [
      [0, 0],
      [child.width, 0],
      [0, child.height],
      [child.width, child.height],
    ]) {
      let px = child.x + x! * Math.cos(inner) - y! * Math.sin(inner),
        py = child.y + x! * Math.sin(inner) + y! * Math.cos(inner)
      px = (parent.flipX ? 16 - px : px) * 2
      py = (parent.flipY ? 16 - py : py) * 2
      const expected = {
        x: parent.x + px * Math.cos(angle) - py * Math.sin(angle),
        y: parent.y + px * Math.sin(angle) + py * Math.cos(angle),
      }
      expect(actual.some((p) => Math.hypot(p.x - expected.x, p.y - expected.y) < 1e-8)).toBe(true)
    }
  }
})

const python = [process.env.PYTHON, 'python3', 'python'].find(
  (name) =>
    name &&
    spawnSync(name, ['-I', '-c', 'import pygame'], {
      env: { ...process.env, PYGAME_HIDE_SUPPORT_PROMPT: '1' },
    }).status === 0,
)
it.skipIf(!python)(
  'real Pygame expansion and queries match the canonical affine geometry and reference namespaces',
  () => {
    const script = `${pygameSceneModule}\nfixtures=json.loads(${JSON.stringify(JSON.stringify(cases))})\nresults=[transformar_objeto_conjunto(f['parent'],f['child'],16,16,['child','sibling']) for f in fixtures]\nprint(json.dumps(results))\n`
    const result = spawnSync(python!, ['-I', '-'], {
      input: script,
      encoding: 'utf-8',
      env: { ...process.env, PYGAME_HIDE_SUPPORT_PROMPT: '1' },
    })
    expect(result.status, result.stderr).toBe(0)
    const actual = JSON.parse(result.stdout)
    function compare(a: any, b: any) {
      if (typeof b === 'number') expect(a).toBeCloseTo(b, 7)
      else if (b && typeof b === 'object') for (const key of Object.keys(b)) compare(a[key], b[key])
      else expect(a || undefined).toEqual(b || undefined)
    }
    cases.forEach((fixture, index) => {
      compare(actual[index], transformSceneSetObject(fixture.parent, fixture.child, 16, 16, ids))
    })
    const query = `${pygameSceneModule}\nm=Mundo.__new__(Mundo)\nm.mapas={'root': {'id':'root','tileSize':16,'cols':4,'rows':4,'tilesets':[], 'layers':[{'id':'main','kind':'objects','objects':[{'id':'copy','name':'Copy','x':0,'y':0,'width':16,'height':16,'shape':'set','setId':'set','flipX':True,'properties':{}}]}], 'sets':[{'id':'set','cols':1,'rows':1,'layers':[{'id':'kids','kind':'objects','objects':[{'id':'a','name':'A','x':2,'y':0,'width':4,'height':4,'shape':'rect','properties':{}}]}]}]}}\nm.carregar('root')\nassert m.contem(m.objetos[1],11,2),m.objetos\nassert not m.contem(m.objetos[1],15,2),m.objetos\n`
    const hit = spawnSync(python!, ['-I', '-'], {
      input: query,
      encoding: 'utf-8',
      env: { ...process.env, PYGAME_HIDE_SUPPORT_PROMPT: '1' },
    })
    expect(hit.status, hit.stderr).toBe(0)
  },
)

it.skipIf(!python)(
  'Pygame movement tests the rotated tile polygon rather than its expanded bounding box',
  () => {
    const script = `${pygameSceneModule}\nm=Mundo.__new__(Mundo)\nm.mapas={'root': {'id':'root','tileSize':16,'cols':8,'rows':8,'tilesets':[{'id':'ts','solid':[0],'platform':[]}], 'layers':[{'id':'main','kind':'objects','objects':[{'id':'copy','name':'Copy','x':32,'y':32,'width':16,'height':16,'shape':'set','setId':'set','rotation':45,'properties':{}}]}], 'sets':[{'id':'set','cols':1,'rows':1,'layers':[{'id':'tiles','kind':'tiles','tilesetId':'ts','cells':[0]}]}]}}\nm.carregar('root')\nassert m.solidos[0].colliderect(pygame.FRect(21,33,1,1))\nassert not m.bloqueado(pygame.FRect(21,33,1,1)),m.solidos_transformados\nassert m.bloqueado(pygame.FRect(31,40,2,2)),m.solidos_transformados\nm.jogador=pygame.FRect(21,33,1,1)\nm.mover(1,0)\nassert m.jogador.x == 22,m.jogador\n`
    const result = spawnSync(python!, ['-I', '-'], {
      input: script,
      encoding: 'utf-8',
      env: { ...process.env, PYGAME_HIDE_SUPPORT_PROMPT: '1' },
    })
    expect(result.status, result.stderr).toBe(0)
  },
)
