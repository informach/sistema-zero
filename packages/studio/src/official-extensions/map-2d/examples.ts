import type { ExtensionExample } from '#extensions'
import type { JSExpr, JSStatement, SZIRV2 } from '#ir'
import { VILA_SCENE_ASSETS } from '../../examples/pintaScenes.generated'
import type { SceneApiMethod } from '../scene-2d/catalog'

/** O mesmo cenário de homologação executa nos dois hosts; as APIs antigas continuam intactas. */
export function pintaSceneExample(target: 'g2d' | 'gk'): ExtensionExample {
  const str = (value: string): JSExpr => ({ type: 'str', value }),
    num = (value: number): JSExpr => ({ type: 'num', value }),
    ref = (name: string): JSExpr => ({ type: 'var', name })
  const command = (method: SceneApiMethod, args: JSExpr[]): JSStatement => ({
    type: `${target}:sceneCommand`,
    method,
    args,
  })
  const value = (method: SceneApiMethod, args: JSExpr[]): JSExpr => ({
    type: `${target}:sceneValue`,
    method,
    args,
  })
  const start: JSStatement[] = [
    command('createMapScene', [str('mapa'), str('vila-e-floresta')]),
    { type: 'var', name: 'lugares', value: value('mapObjects', [str('mapa'), str('')]) },
    {
      type: 'var',
      name: 'portaDaCabana',
      value: value('mapObjectNamed', [str('mapa'), str('Porta da cabana')]),
    },
    { type: 'var', name: 'inicioX', value: value('mapSpawn', [str('mapa'), str('x')]) },
    { type: 'var', name: 'inicioY', value: value('mapSpawn', [str('mapa'), str('y')]) },
    { type: 'var', name: 'larguraDoLugar', value: value('mapSize', [str('mapa'), str('width')]) },
    {
      type: 'var',
      name: 'chaves',
      value: value('mapObjectProperty', [ref('portaDaCabana'), str('chave')]),
    },
    { type: 'consoleLog', value: value('mapObjectField', [ref('portaDaCabana'), str('name')]) },
    { type: 'consoleLog', value: ref('chaves') },
    {
      type: 'var',
      name: 'morador',
      value: value('mapObjectNamed', [str('mapa'), str('Morador')]),
    },
    {
      type: 'var',
      name: 'portaDoMorador',
      value: value('mapObjectById', [
        str('mapa'),
        value('mapObjectProperty', [ref('morador'), str('porta')]),
      ]),
    },
    {
      type: 'var',
      name: 'imagemDoMorador',
      value: value('mapResourceImage', [str('mapa'), str('morador')]),
    },
    {
      type: 'consoleLog',
      value: value('mapObjectField', [ref('portaDoMorador'), str('name')]),
    },
    {
      type: 'consoleLog',
      value: value('mapLayerProperty', [str('mapa'), str('vila'), str('ambiente')]),
    },
    {
      type: 'consoleLog',
      value: value('mapTileProperty', [str('mapa'), str('vila-pecas'), num(0), str('atrito')]),
    },
    { type: 'var', name: 'naPorta', value: { type: 'bool', value: false } },
  ]
  const events: JSStatement[] = [
    {
      type: `${target}:sceneEvent`,
      method: 'mapArea',
      args: [str('mapa'), ref('jogador'), str('door')],
      parameter: 'porta',
      body: [command('useMapDoor', [str('mapa'), ref('jogador'), ref('porta')])],
    },
  ]
  const collision = command('collideMapScene', [ref('jogador'), str('mapa')]),
    inside: JSStatement = {
      type: 'assign',
      name: 'naPorta',
      value: value('mapInArea', [ref('jogador'), ref('portaDaCabana')]),
    }
  let ir: SZIRV2
  if (target === 'g2d')
    ir = {
      version: 2,
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-2d' }],
      behavior: {
        start: [
          { type: 'g2d:setupStage', width: 640, height: 480, bg: '#e8edf4' },
          {
            type: 'g2d:setStageDescription',
            description:
              'A Vila e a Floresta. Use as setas para andar; entre pela porta da cabana.',
          },
          ...start,
          {
            type: 'g2d:createSprite',
            varName: 'jogador',
            x: 32,
            y: 32,
            w: 12,
            h: 12,
            color: '#4ade80',
          },
        ],
        events,
        loops: [
          {
            type: 'g2d:updateEachFrame',
            body: [
              { type: 'g2d:clear' },
              { type: 'g2d:topDown', spriteVar: 'jogador', speed: 3 },
              collision,
              inside,
              command('drawMapScene', [str('mapa'), str('back')]),
              { type: 'g2d:drawSprite', spriteVar: 'jogador', ctxVar: 'ctx' },
              command('drawMapScene', [str('mapa'), str('front')]),
            ],
          },
        ],
      },
    }
  else
    ir = {
      version: 2,
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-2d-advanced' }],
      behavior: {
        start: [
          { type: 'gk:setup', w: num(640), h: num(480), bg: '#e8edf4', accent: '#4ade80' },
          ...start,
          {
            type: 'gk:createCharacter',
            varName: 'jogador',
            image: '',
            w: num(12),
            h: num(12),
            speed: num(120),
            color: '#4ade80',
          },
          { type: 'gk:placeCharacter', charVar: 'jogador', x: ref('inicioX'), y: ref('inicioY') },
        ],
        events,
        loops: [
          {
            type: 'gk:onUpdate',
            dtName: 'dt',
            body: [{ type: 'gk:moveWithKeys', charVar: 'jogador', dtVar: 'dt' }, collision, inside],
          },
          {
            type: 'gk:onDraw',
            ctxName: 'ctx',
            body: [
              { type: 'gk:drawBackground', color: '#e8edf4', grid: false },
              command('drawMapScene', [str('mapa'), str('back')]),
              { type: 'gk:drawCharacter', charVar: 'jogador' },
              command('drawMapScene', [str('mapa'), str('front')]),
            ],
          },
        ],
      },
    }
  return {
    name: target === 'g2d' ? 'A Vila e a Floresta' : 'A Vila e a Floresta (Avançado)',
    experience: 'game',
    description:
      'Ande com as setas e entre pela porta da cabana. O cenário conserva 18 camadas, água animada, árvores na frente, objetos e conjuntos do Pinta. Nos blocos, siga a referência da porta do morador, encontre sua arte e leia as propriedades da camada e da peça.',
    difficulty: 'intermediate',
    concepts: ['Pinta', 'cenário', 'camadas', 'objetos', 'porta', 'propriedades', 'animação'],
    genre: 'exploração',
    ir,
    assets: structuredClone(VILA_SCENE_ASSETS),
  }
}
