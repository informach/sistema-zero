import type { SceneArgument, SceneMethod } from '../scene-2d/catalog'

const text = (name: string, value: string): SceneArgument => ({ name, value })
const map = text('NAME', 'cenario'),
  sprite: SceneArgument = { name: 'SPRITE', value: 'jogador', field: 'sprite' },
  object = text('OBJECT', 'objeto')
export const MAP_TWO_D_METHODS: readonly SceneMethod[] = [
  {
    method: 'createMapScene',
    block: 'create_map_scene',
    family: 'begin',
    placement: 'start-only-command',
    message: 'Criar cenário %1 do meu desenho %2',
    args: [map, { name: 'IMAGE', value: '', field: 'image' }],
    tooltip:
      'Leva todas as camadas, peças, objetos e conjuntos do Pinta. Use os blocos de cenário para desenhar e colidir.',
  },
  {
    method: 'drawMapScene',
    block: 'draw_map_scene',
    family: 'begin',
    message: 'Desenhar cenário %1 %2',
    args: [
      map,
      {
        name: 'PASS',
        value: 'back',
        field: 'select',
        options: [
          ['atrás dos personagens', 'back'],
          ['na frente dos personagens', 'front'],
        ],
      },
    ],
    tooltip: 'Desenhe o fundo antes dos personagens e a frente depois deles.',
  },
  {
    method: 'collideMapScene',
    block: 'collide_map_scene',
    family: 'begin',
    message: 'Colidir %1 com cenário %2',
    args: [sprite, map],
    tooltip: 'Usa as peças sólidas, plataformas e camadas de colisão do Pinta.',
  },
  {
    method: 'mapObjects',
    block: 'map_objects',
    family: 'more',
    value: true,
    message: 'objetos do cenário %1 com tipo ou papel %2',
    args: [map, text('TYPE', 'inimigo')],
    tooltip:
      'Uma lista de objetos. Tipo vazio encontra todos; também aceita os papéis start, door, enemy, danger, path, trigger e region.',
  },
  {
    method: 'mapObjectNamed',
    block: 'map_object_named',
    family: 'more',
    value: true,
    message: 'objeto do cenário %1 chamado %2',
    args: [map, text('OBJECT_NAME', 'Porta')],
    tooltip: 'Encontra o objeto pelo nome. Retorna vazio se ele não existe.',
  },
  {
    method: 'mapObjectById',
    block: 'map_object_by_id',
    family: 'more',
    value: true,
    message: 'objeto do cenário %1 com referência %2',
    args: [map, text('ID', '')],
    tooltip:
      'Encontra o objeto indicado por uma propriedade de referência. Também encontra objetos dentro de conjuntos.',
  },
  {
    method: 'mapResourceImage',
    block: 'map_resource_image',
    family: 'more',
    value: true,
    message: 'imagem do recurso %2 do cenário %1',
    args: [map, text('ID', '')],
    tooltip:
      'Use a referência de arte de uma propriedade do Pinta. Devolve a imagem deste cenário, inclusive uma cópia guardada, para carregar ou desenhar no jogo.',
  },
  {
    method: 'mapLayerProperty',
    block: 'map_layer_property',
    family: 'more',
    value: true,
    message: 'propriedade %3 da camada %2 do cenário %1',
    args: [map, text('LAYER', ''), text('KEY', 'vida')],
    tooltip:
      'Lê uma propriedade da camada pela referência dela. Conserva números, sim/não e referências.',
  },
  {
    method: 'mapTileProperty',
    block: 'map_tile_property',
    family: 'more',
    value: true,
    message: 'propriedade %4 da peça %3 do conjunto de peças %2 do cenário %1',
    args: [map, text('TILESET', ''), { name: 'TILE', value: 0 }, text('KEY', 'vida')],
    tooltip:
      'Lê uma propriedade da peça pela referência do conjunto. A primeira peça tem número zero.',
  },
  {
    method: 'mapObjectProperty',
    block: 'map_object_property',
    family: 'more',
    value: true,
    message: 'propriedade %2 do objeto %1',
    args: [object, text('KEY', 'vida')],
    tooltip: 'Lê texto, número, sim/não, cor ou referência, conservando o tipo escolhido no Pinta.',
  },
  {
    method: 'mapObjectField',
    block: 'map_object_field',
    family: 'more',
    value: true,
    message: 'dado %2 do objeto %1',
    args: [
      object,
      {
        name: 'KEY',
        value: 'x',
        field: 'select',
        options: [
          ['posição X', 'x'],
          ['posição Y', 'y'],
          ['largura', 'width'],
          ['altura', 'height'],
          ['nome', 'name'],
          ['tipo', 'type'],
          ['papel', 'role'],
          ['forma', 'shape'],
          ['giro', 'rotation'],
        ],
      },
    ],
    tooltip: 'Lê a posição, forma, giro e identidade do objeto.',
  },
  {
    method: 'mapInArea',
    block: 'map_in_area',
    family: 'more',
    value: true,
    message: '%1 está na área do objeto %2',
    args: [sprite, object],
    tooltip: 'Testa a forma e o giro do objeto, inclusive elipses e polígonos.',
  },
  {
    method: 'mapArea',
    block: 'on_map_area',
    family: 'more',
    event: true,
    parameter: 'area',
    message: 'Quando %2 entrar em área %3 do cenário %1 guardar em %4',
    args: [map, sprite, text('TYPE', 'trigger')],
    tooltip: 'Executa uma vez ao entrar. A variável área contém o objeto encontrado.',
  },
  {
    method: 'useMapDoor',
    block: 'use_map_door',
    family: 'more',
    message: 'Usar porta %3 com %2 no cenário %1',
    args: [map, sprite, object],
    tooltip:
      'A propriedade destino aponta para outro desenho de mapa no projeto. Ao entrar, troca o cenário e vai ao ponto de início.',
  },
  {
    method: 'mapSpawn',
    block: 'map_spawn',
    family: 'begin',
    value: true,
    message: 'início do cenário %1 em %2',
    args: [
      map,
      {
        name: 'AXIS',
        value: 'x',
        field: 'select',
        options: [
          ['X', 'x'],
          ['Y', 'y'],
        ],
      },
    ],
    tooltip: 'A posição do objeto com papel Onde o jogador começa.',
  },
  {
    method: 'mapSize',
    block: 'map_size',
    family: 'more',
    value: true,
    message: 'tamanho do cenário %1 em %2',
    args: [
      map,
      {
        name: 'AXIS',
        value: 'width',
        field: 'select',
        options: [
          ['largura', 'width'],
          ['altura', 'height'],
        ],
      },
    ],
    tooltip: 'O tamanho inteiro do cenário em pixels.',
  },
]
