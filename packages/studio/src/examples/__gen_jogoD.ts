// Gerado por scripts/gen-jogo-d.ts. Não edite.
import type { SZIRV2 } from '../ir'
/** Explore o mundo: a vila, a floresta, a montanha, o lago, o campo e as ruínas. Setas ou WASD andam, Espaço afasta um inimigo perto. Entre nas cavernas e nas casas pelas portas. Pegue moedas, abra os baús e deite na cama de uma casa para guardar o jogo. */
export const JOGO_D_IR = {
  version: 2,
  html: [],
  css: [],
  behavior: {
    start: [
      {
        type: 'g2d:setupStage',
        width: {
          type: 'num',
          value: 640,
        },
        height: {
          type: 'num',
          value: 480,
        },
        bg: '#16301f',
      },
      {
        type: 'g2d:setStageDescription',
        description:
          'Explore o mundo: a vila, a floresta, a montanha, o lago, o campo e as ruínas. Setas ou WASD andam, Espaço afasta um inimigo perto. Entre nas cavernas e nas casas pelas portas. Pegue moedas, abra os baús e deite na cama de uma casa para guardar o jogo.',
      },
      {
        type: 'g2d:loadSound',
        name: 'moeda',
        asset: 'jogo-d-som-moeda',
      },
      {
        type: 'g2d:loadSound',
        name: 'bau',
        asset: 'jogo-d-som-bau',
      },
      {
        type: 'g2d:loadSound',
        name: 'dano',
        asset: 'jogo-d-som-dano',
      },
      {
        type: 'g2d:loadSound',
        name: 'porta',
        asset: 'jogo-d-som-porta',
      },
      {
        type: 'g2d:loadSound',
        name: 'dormir',
        asset: 'jogo-d-som-dormir',
      },
      {
        type: 'g2d:loadSound',
        name: 'musicaMundo',
        asset: 'jogo-d-musica-mundo',
      },
      {
        type: 'g2d:loadSound',
        name: 'musicaCaverna',
        asset: 'jogo-d-musica-caverna',
      },
      {
        type: 'g2d:sceneCommand',
        method: 'createMapScene',
        args: [
          {
            type: 'str',
            value: 'mapa',
          },
          {
            type: 'str',
            value: 'jogo-d-mundo',
          },
        ],
      },
      {
        type: 'g2d:createWorld',
        varName: 'mundo',
        width: {
          type: 'g2d:sceneValue',
          method: 'mapSize',
          args: [
            {
              type: 'str',
              value: 'mapa',
            },
            {
              type: 'str',
              value: 'width',
            },
          ],
        },
        height: {
          type: 'g2d:sceneValue',
          method: 'mapSize',
          args: [
            {
              type: 'str',
              value: 'mapa',
            },
            {
              type: 'str',
              value: 'height',
            },
          ],
        },
      },
      {
        type: 'g2d:configureWorldCamera',
        worldVar: 'mundo',
        horizontal: 'free',
        vertical: 'free',
        deadZoneX: {
          type: 'num',
          value: 0,
        },
        deadZoneY: {
          type: 'num',
          value: 0,
        },
      },
      {
        type: 'g2d:createImageSprite',
        varName: 'jogador',
        x: {
          type: 'binop',
          op: '-',
          left: {
            type: 'g2d:sceneValue',
            method: 'mapSpawn',
            args: [
              {
                type: 'str',
                value: 'mapa',
              },
              {
                type: 'str',
                value: 'x',
              },
            ],
          },
          right: {
            type: 'num',
            value: 11,
          },
        },
        y: {
          type: 'binop',
          op: '-',
          left: {
            type: 'g2d:sceneValue',
            method: 'mapSpawn',
            args: [
              {
                type: 'str',
                value: 'mapa',
              },
              {
                type: 'str',
                value: 'y',
              },
            ],
          },
          right: {
            type: 'num',
            value: 12,
          },
        },
        w: {
          type: 'num',
          value: 22,
        },
        h: {
          type: 'num',
          value: 24,
        },
        image: 'jogo-d-heroi',
      },
      {
        type: 'g2d:setHealth',
        spriteVar: 'jogador',
        amount: {
          type: 'num',
          value: 5,
        },
      },
      {
        type: 'g2d:createGroup',
        varName: 'moedas',
      },
      {
        type: 'g2d:createGroup',
        varName: 'inimigos',
      },
      {
        type: 'g2d:createGroup',
        varName: 'baus',
      },
      {
        type: 'var',
        name: 'lugar',
        value: {
          type: 'str',
          value: 'jogo-d-mundo',
        },
      },
      {
        type: 'var',
        name: 'regiao',
        value: {
          type: 'str',
          value: '',
        },
      },
      {
        type: 'var',
        name: 'ativas',
        value: {
          type: 'array',
          items: [],
        },
      },
      {
        type: 'var',
        name: 'pegos',
        value: {
          type: 'array',
          items: [],
        },
      },
      {
        type: 'var',
        name: 'pontos',
        value: {
          type: 'num',
          value: 0,
        },
      },
      {
        type: 'var',
        name: 'recado',
        value: {
          type: 'str',
          value: '',
        },
      },
      {
        type: 'var',
        name: 'tempoDoRecado',
        value: {
          type: 'num',
          value: 0,
        },
      },
      {
        type: 'var',
        name: 'esmaecer',
        value: {
          type: 'num',
          value: 0,
        },
      },
      {
        type: 'var',
        name: 'salvo',
        value: {
          type: 'binop',
          op: '===',
          left: {
            type: 'storageGet',
            store: 'local',
            key: {
              type: 'str',
              value: 'jogo-d-salvo',
            },
          },
          right: {
            type: 'str',
            value: 'sim',
          },
        },
      },
      {
        type: 'if',
        cond: {
          type: 'var',
          name: 'salvo',
        },
        then: [
          {
            type: 'var',
            name: 'listaGuardada',
            value: {
              type: 'storageGet',
              store: 'local',
              key: {
                type: 'str',
                value: 'jogo-d-pegos',
              },
            },
            kind: 'const',
          },
          {
            type: 'if',
            cond: {
              type: 'var',
              name: 'listaGuardada',
            },
            then: [
              {
                type: 'assign',
                name: 'pegos',
                value: {
                  type: 'memberCallExpr',
                  object: {
                    type: 'var',
                    name: 'listaGuardada',
                  },
                  method: 'split',
                  args: [
                    {
                      type: 'str',
                      value: ',',
                    },
                  ],
                },
              },
            ],
          },
          {
            type: 'assign',
            name: 'pontos',
            value: {
              type: 'mathUnary',
              fn: 'round',
              arg: {
                type: 'storageGet',
                store: 'local',
                key: {
                  type: 'str',
                  value: 'jogo-d-pontos',
                },
              },
            },
          },
          {
            type: 'assign',
            name: 'recado',
            value: {
              type: 'str',
              value: 'Jogo guardado de volta!',
            },
          },
          {
            type: 'assign',
            name: 'tempoDoRecado',
            value: {
              type: 'num',
              value: 120,
            },
          },
        ],
      },
      {
        type: 'funcDecl',
        name: 'jaPegou',
        params: ['chave'],
        body: [
          {
            type: 'forOf',
            itemName: 'item',
            iterableVar: 'pegos',
            body: [
              {
                type: 'if',
                cond: {
                  type: 'binop',
                  op: '===',
                  left: {
                    type: 'var',
                    name: 'item',
                  },
                  right: {
                    type: 'var',
                    name: 'chave',
                  },
                },
                then: [
                  {
                    type: 'return',
                    value: {
                      type: 'bool',
                      value: true,
                    },
                  },
                ],
              },
            ],
          },
          {
            type: 'return',
            value: {
              type: 'bool',
              value: false,
            },
          },
        ],
      },
      {
        type: 'funcDecl',
        name: 'estaAtivo',
        params: ['objeto'],
        body: [
          {
            type: 'if',
            cond: {
              type: 'binop',
              op: '!==',
              left: {
                type: 'var',
                name: 'lugar',
              },
              right: {
                type: 'str',
                value: 'jogo-d-mundo',
              },
            },
            then: [
              {
                type: 'return',
                value: {
                  type: 'bool',
                  value: true,
                },
              },
            ],
          },
          {
            type: 'return',
            value: {
              type: 'memberCallExpr',
              object: {
                type: 'var',
                name: 'ativas',
              },
              method: 'includes',
              args: [
                {
                  type: 'g2d:sceneValue',
                  method: 'mapObjectProperty',
                  args: [
                    {
                      type: 'var',
                      name: 'objeto',
                    },
                    {
                      type: 'str',
                      value: 'regiao',
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        type: 'funcDecl',
        name: 'ligarEntidades',
        params: [],
        body: [
          {
            type: 'g2d:clearGroup',
            groupVar: 'moedas',
          },
          {
            type: 'g2d:clearGroup',
            groupVar: 'inimigos',
          },
          {
            type: 'g2d:clearGroup',
            groupVar: 'baus',
          },
          {
            type: 'var',
            name: 'listaMoeda',
            value: {
              type: 'g2d:sceneValue',
              method: 'mapObjects',
              args: [
                {
                  type: 'str',
                  value: 'mapa',
                },
                {
                  type: 'str',
                  value: 'moeda',
                },
              ],
            },
            kind: 'const',
          },
          {
            type: 'forOf',
            itemName: 'objeto',
            iterableVar: 'listaMoeda',
            body: [
              {
                type: 'var',
                name: 'chave',
                value: {
                  type: 'g2d:sceneValue',
                  method: 'mapObjectProperty',
                  args: [
                    {
                      type: 'var',
                      name: 'objeto',
                    },
                    {
                      type: 'str',
                      value: 'chave',
                    },
                  ],
                },
                kind: 'const',
              },
              {
                type: 'if',
                cond: {
                  type: 'logical',
                  op: '&&',
                  left: {
                    type: 'call',
                    name: 'estaAtivo',
                    args: [
                      {
                        type: 'var',
                        name: 'objeto',
                      },
                    ],
                  },
                  right: {
                    type: 'logicalNot',
                    value: {
                      type: 'call',
                      name: 'jaPegou',
                      args: [
                        {
                          type: 'var',
                          name: 'chave',
                        },
                      ],
                    },
                  },
                },
                then: [
                  {
                    type: 'g2d:spawnImageInGroup',
                    groupVar: 'moedas',
                    varName: 'moeda',
                    x: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'g2d:sceneValue',
                        method: 'mapObjectField',
                        args: [
                          {
                            type: 'var',
                            name: 'objeto',
                          },
                          {
                            type: 'str',
                            value: 'x',
                          },
                        ],
                      },
                      right: {
                        type: 'num',
                        value: 6,
                      },
                    },
                    y: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'g2d:sceneValue',
                        method: 'mapObjectField',
                        args: [
                          {
                            type: 'var',
                            name: 'objeto',
                          },
                          {
                            type: 'str',
                            value: 'y',
                          },
                        ],
                      },
                      right: {
                        type: 'num',
                        value: 6,
                      },
                    },
                    w: {
                      type: 'num',
                      value: 20,
                    },
                    h: {
                      type: 'num',
                      value: 20,
                    },
                    image: 'jogo-d-moeda',
                    vx: {
                      type: 'num',
                      value: 0,
                    },
                    vy: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  {
                    type: 'g2d:setSpriteData',
                    spriteVar: 'moeda',
                    key: 'chave',
                    value: {
                      type: 'var',
                      name: 'chave',
                    },
                  },
                ],
              },
            ],
          },
          {
            type: 'var',
            name: 'listaInimigo',
            value: {
              type: 'g2d:sceneValue',
              method: 'mapObjects',
              args: [
                {
                  type: 'str',
                  value: 'mapa',
                },
                {
                  type: 'str',
                  value: 'inimigo',
                },
              ],
            },
            kind: 'const',
          },
          {
            type: 'forOf',
            itemName: 'objeto',
            iterableVar: 'listaInimigo',
            body: [
              {
                type: 'var',
                name: 'chave',
                value: {
                  type: 'g2d:sceneValue',
                  method: 'mapObjectProperty',
                  args: [
                    {
                      type: 'var',
                      name: 'objeto',
                    },
                    {
                      type: 'str',
                      value: 'chave',
                    },
                  ],
                },
                kind: 'const',
              },
              {
                type: 'if',
                cond: {
                  type: 'logical',
                  op: '&&',
                  left: {
                    type: 'call',
                    name: 'estaAtivo',
                    args: [
                      {
                        type: 'var',
                        name: 'objeto',
                      },
                    ],
                  },
                  right: {
                    type: 'logicalNot',
                    value: {
                      type: 'call',
                      name: 'jaPegou',
                      args: [
                        {
                          type: 'var',
                          name: 'chave',
                        },
                      ],
                    },
                  },
                },
                then: [
                  {
                    type: 'if',
                    cond: {
                      type: 'binop',
                      op: '===',
                      left: {
                        type: 'g2d:sceneValue',
                        method: 'mapObjectField',
                        args: [
                          {
                            type: 'var',
                            name: 'objeto',
                          },
                          {
                            type: 'str',
                            value: 'name',
                          },
                        ],
                      },
                      right: {
                        type: 'str',
                        value: 'Morcego',
                      },
                    },
                    then: [
                      {
                        type: 'g2d:spawnImageInGroup',
                        groupVar: 'inimigos',
                        varName: 'morcego',
                        x: {
                          type: 'binop',
                          op: '+',
                          left: {
                            type: 'g2d:sceneValue',
                            method: 'mapObjectField',
                            args: [
                              {
                                type: 'var',
                                name: 'objeto',
                              },
                              {
                                type: 'str',
                                value: 'x',
                              },
                            ],
                          },
                          right: {
                            type: 'num',
                            value: 4,
                          },
                        },
                        y: {
                          type: 'binop',
                          op: '+',
                          left: {
                            type: 'g2d:sceneValue',
                            method: 'mapObjectField',
                            args: [
                              {
                                type: 'var',
                                name: 'objeto',
                              },
                              {
                                type: 'str',
                                value: 'y',
                              },
                            ],
                          },
                          right: {
                            type: 'num',
                            value: 4,
                          },
                        },
                        w: {
                          type: 'num',
                          value: 24,
                        },
                        h: {
                          type: 'num',
                          value: 24,
                        },
                        image: 'jogo-d-morcego',
                        vx: {
                          type: 'num',
                          value: 0,
                        },
                        vy: {
                          type: 'num',
                          value: 0,
                        },
                      },
                      {
                        type: 'g2d:setSpriteData',
                        spriteVar: 'morcego',
                        key: 'chave',
                        value: {
                          type: 'var',
                          name: 'chave',
                        },
                      },
                    ],
                    else: [
                      {
                        type: 'g2d:spawnImageInGroup',
                        groupVar: 'inimigos',
                        varName: 'gosma',
                        x: {
                          type: 'binop',
                          op: '+',
                          left: {
                            type: 'g2d:sceneValue',
                            method: 'mapObjectField',
                            args: [
                              {
                                type: 'var',
                                name: 'objeto',
                              },
                              {
                                type: 'str',
                                value: 'x',
                              },
                            ],
                          },
                          right: {
                            type: 'num',
                            value: 4,
                          },
                        },
                        y: {
                          type: 'binop',
                          op: '+',
                          left: {
                            type: 'g2d:sceneValue',
                            method: 'mapObjectField',
                            args: [
                              {
                                type: 'var',
                                name: 'objeto',
                              },
                              {
                                type: 'str',
                                value: 'y',
                              },
                            ],
                          },
                          right: {
                            type: 'num',
                            value: 4,
                          },
                        },
                        w: {
                          type: 'num',
                          value: 24,
                        },
                        h: {
                          type: 'num',
                          value: 24,
                        },
                        image: 'jogo-d-gosma',
                        vx: {
                          type: 'num',
                          value: 0,
                        },
                        vy: {
                          type: 'num',
                          value: 0,
                        },
                      },
                      {
                        type: 'g2d:setSpriteData',
                        spriteVar: 'gosma',
                        key: 'chave',
                        value: {
                          type: 'var',
                          name: 'chave',
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'var',
            name: 'listaBau',
            value: {
              type: 'g2d:sceneValue',
              method: 'mapObjects',
              args: [
                {
                  type: 'str',
                  value: 'mapa',
                },
                {
                  type: 'str',
                  value: 'bau',
                },
              ],
            },
            kind: 'const',
          },
          {
            type: 'forOf',
            itemName: 'objeto',
            iterableVar: 'listaBau',
            body: [
              {
                type: 'var',
                name: 'chave',
                value: {
                  type: 'g2d:sceneValue',
                  method: 'mapObjectProperty',
                  args: [
                    {
                      type: 'var',
                      name: 'objeto',
                    },
                    {
                      type: 'str',
                      value: 'chave',
                    },
                  ],
                },
                kind: 'const',
              },
              {
                type: 'if',
                cond: {
                  type: 'call',
                  name: 'estaAtivo',
                  args: [
                    {
                      type: 'var',
                      name: 'objeto',
                    },
                  ],
                },
                then: [
                  {
                    type: 'g2d:spawnImageInGroup',
                    groupVar: 'baus',
                    varName: 'bau',
                    x: {
                      type: 'g2d:sceneValue',
                      method: 'mapObjectField',
                      args: [
                        {
                          type: 'var',
                          name: 'objeto',
                        },
                        {
                          type: 'str',
                          value: 'x',
                        },
                      ],
                    },
                    y: {
                      type: 'g2d:sceneValue',
                      method: 'mapObjectField',
                      args: [
                        {
                          type: 'var',
                          name: 'objeto',
                        },
                        {
                          type: 'str',
                          value: 'y',
                        },
                      ],
                    },
                    w: {
                      type: 'num',
                      value: 32,
                    },
                    h: {
                      type: 'num',
                      value: 32,
                    },
                    image: 'jogo-d-bau',
                    vx: {
                      type: 'num',
                      value: 0,
                    },
                    vy: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  {
                    type: 'g2d:setSpriteData',
                    spriteVar: 'bau',
                    key: 'chave',
                    value: {
                      type: 'var',
                      name: 'chave',
                    },
                  },
                  {
                    type: 'if',
                    cond: {
                      type: 'call',
                      name: 'jaPegou',
                      args: [
                        {
                          type: 'var',
                          name: 'chave',
                        },
                      ],
                    },
                    then: [
                      {
                        type: 'g2d:setImage',
                        spriteVar: 'bau',
                        image: 'jogo-d-bau-aberto',
                      },
                      {
                        type: 'g2d:setSpriteData',
                        spriteVar: 'bau',
                        key: 'aberto',
                        value: {
                          type: 'num',
                          value: 1,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'funcDecl',
        name: 'guardarOJogo',
        params: [],
        body: [
          {
            type: 'storageSet',
            store: 'local',
            key: {
              type: 'str',
              value: 'jogo-d-pegos',
            },
            value: {
              type: 'memberCallExpr',
              object: {
                type: 'var',
                name: 'pegos',
              },
              method: 'join',
              args: [
                {
                  type: 'str',
                  value: ',',
                },
              ],
            },
          },
          {
            type: 'storageSet',
            store: 'local',
            key: {
              type: 'str',
              value: 'jogo-d-pontos',
            },
            value: {
              type: 'var',
              name: 'pontos',
            },
          },
          {
            type: 'storageSet',
            store: 'local',
            key: {
              type: 'str',
              value: 'jogo-d-salvo',
            },
            value: {
              type: 'str',
              value: 'sim',
            },
          },
        ],
      },
      {
        type: 'g2d:playTrack',
        name: 'musicaMundo',
      },
    ],
    events: [
      {
        type: 'g2d:sceneEvent',
        method: 'mapArea',
        args: [
          {
            type: 'str',
            value: 'mapa',
          },
          {
            type: 'var',
            name: 'jogador',
          },
          {
            type: 'str',
            value: 'region',
          },
        ],
        body: [
          {
            type: 'assign',
            name: 'regiao',
            value: {
              type: 'g2d:sceneValue',
              method: 'mapObjectField',
              args: [
                {
                  type: 'var',
                  name: 'area',
                },
                {
                  type: 'str',
                  value: 'name',
                },
              ],
            },
          },
          {
            type: 'assign',
            name: 'ativas',
            value: {
              type: 'memberCallExpr',
              object: {
                type: 'g2d:sceneValue',
                method: 'mapObjectProperty',
                args: [
                  {
                    type: 'var',
                    name: 'area',
                  },
                  {
                    type: 'str',
                    value: 'vizinhas',
                  },
                ],
              },
              method: 'split',
              args: [
                {
                  type: 'str',
                  value: ',',
                },
              ],
            },
          },
          {
            type: 'arrayPush',
            arrayVar: 'ativas',
            value: {
              type: 'var',
              name: 'regiao',
            },
          },
          {
            type: 'callFunction',
            name: 'ligarEntidades',
            args: [],
          },
        ],
        parameter: 'area',
      },
      {
        type: 'g2d:sceneEvent',
        method: 'mapArea',
        args: [
          {
            type: 'str',
            value: 'mapa',
          },
          {
            type: 'var',
            name: 'jogador',
          },
          {
            type: 'str',
            value: 'door',
          },
        ],
        body: [
          {
            type: 'var',
            name: 'destino',
            value: {
              type: 'g2d:sceneValue',
              method: 'mapObjectProperty',
              args: [
                {
                  type: 'var',
                  name: 'porta',
                },
                {
                  type: 'str',
                  value: 'destino',
                },
              ],
            },
            kind: 'const',
          },
          {
            type: 'var',
            name: 'chegada',
            value: {
              type: 'g2d:sceneValue',
              method: 'mapObjectProperty',
              args: [
                {
                  type: 'var',
                  name: 'porta',
                },
                {
                  type: 'str',
                  value: 'chegada',
                },
              ],
            },
            kind: 'const',
          },
          {
            type: 'g2d:sceneCommand',
            method: 'useMapDoor',
            args: [
              {
                type: 'str',
                value: 'mapa',
              },
              {
                type: 'var',
                name: 'jogador',
              },
              {
                type: 'var',
                name: 'porta',
              },
            ],
          },
          {
            type: 'if',
            cond: {
              type: 'logicalNot',
              value: {
                type: 'memberCallExpr',
                object: {
                  type: 'g2d:sceneValue',
                  method: 'mapObjects',
                  args: [
                    {
                      type: 'str',
                      value: 'mapa',
                    },
                    {
                      type: 'str',
                      value: 'door',
                    },
                  ],
                },
                method: 'includes',
                args: [
                  {
                    type: 'var',
                    name: 'porta',
                  },
                ],
              },
            },
            then: [
              {
                type: 'assign',
                name: 'lugar',
                value: {
                  type: 'var',
                  name: 'destino',
                },
              },
              {
                type: 'var',
                name: 'ponto',
                value: {
                  type: 'g2d:sceneValue',
                  method: 'mapObjectById',
                  args: [
                    {
                      type: 'str',
                      value: 'mapa',
                    },
                    {
                      type: 'var',
                      name: 'chegada',
                    },
                  ],
                },
                kind: 'const',
              },
              {
                type: 'if',
                cond: {
                  type: 'binop',
                  op: '!==',
                  left: {
                    type: 'var',
                    name: 'ponto',
                  },
                  right: {
                    type: 'null',
                  },
                },
                then: [
                  {
                    type: 'g2d:setPosition',
                    spriteVar: 'jogador',
                    x: {
                      type: 'binop',
                      op: '-',
                      left: {
                        type: 'g2d:sceneValue',
                        method: 'mapObjectField',
                        args: [
                          {
                            type: 'var',
                            name: 'ponto',
                          },
                          {
                            type: 'str',
                            value: 'x',
                          },
                        ],
                      },
                      right: {
                        type: 'num',
                        value: 11,
                      },
                    },
                    y: {
                      type: 'binop',
                      op: '-',
                      left: {
                        type: 'g2d:sceneValue',
                        method: 'mapObjectField',
                        args: [
                          {
                            type: 'var',
                            name: 'ponto',
                          },
                          {
                            type: 'str',
                            value: 'y',
                          },
                        ],
                      },
                      right: {
                        type: 'num',
                        value: 12,
                      },
                    },
                  },
                ],
              },
              {
                type: 'memberSet',
                object: {
                  type: 'var',
                  name: 'mundo',
                },
                name: 'width',
                value: {
                  type: 'g2d:sceneValue',
                  method: 'mapSize',
                  args: [
                    {
                      type: 'str',
                      value: 'mapa',
                    },
                    {
                      type: 'str',
                      value: 'width',
                    },
                  ],
                },
              },
              {
                type: 'memberSet',
                object: {
                  type: 'var',
                  name: 'mundo',
                },
                name: 'height',
                value: {
                  type: 'g2d:sceneValue',
                  method: 'mapSize',
                  args: [
                    {
                      type: 'str',
                      value: 'mapa',
                    },
                    {
                      type: 'str',
                      value: 'height',
                    },
                  ],
                },
              },
              {
                type: 'assign',
                name: 'esmaecer',
                value: {
                  type: 'num',
                  value: 100,
                },
              },
              {
                type: 'g2d:playClip',
                name: 'porta',
              },
              {
                type: 'g2d:stopTrack',
                scope: 'all',
              },
              {
                type: 'if',
                cond: {
                  type: 'binop',
                  op: '===',
                  left: {
                    type: 'var',
                    name: 'lugar',
                  },
                  right: {
                    type: 'str',
                    value: 'jogo-d-mundo',
                  },
                },
                then: [
                  {
                    type: 'g2d:playTrack',
                    name: 'musicaMundo',
                  },
                ],
                else: [
                  {
                    type: 'g2d:playTrack',
                    name: 'musicaCaverna',
                  },
                ],
              },
              {
                type: 'callFunction',
                name: 'ligarEntidades',
                args: [],
              },
            ],
          },
        ],
        parameter: 'porta',
      },
      {
        type: 'g2d:sceneEvent',
        method: 'mapArea',
        args: [
          {
            type: 'str',
            value: 'mapa',
          },
          {
            type: 'var',
            name: 'jogador',
          },
          {
            type: 'str',
            value: 'cama',
          },
        ],
        body: [
          {
            type: 'callFunction',
            name: 'guardarOJogo',
            args: [],
          },
          {
            type: 'g2d:changeHealth',
            spriteVar: 'jogador',
            delta: {
              type: 'num',
              value: 5,
            },
          },
          {
            type: 'g2d:playClip',
            name: 'dormir',
          },
          {
            type: 'assign',
            name: 'recado',
            value: {
              type: 'str',
              value: 'Você dormiu. O jogo está guardado.',
            },
          },
          {
            type: 'assign',
            name: 'tempoDoRecado',
            value: {
              type: 'num',
              value: 150,
            },
          },
          {
            type: 'assign',
            name: 'esmaecer',
            value: {
              type: 'num',
              value: 100,
            },
          },
        ],
        parameter: 'cama',
      },
      {
        type: 'g2d:onTouchGroup',
        spriteVar: 'jogador',
        groupVar: 'moedas',
        itemName: 'moeda',
        body: [
          {
            type: 'arrayPush',
            arrayVar: 'pegos',
            value: {
              type: 'g2d:spriteData',
              spriteVar: 'moeda',
              key: 'chave',
              fallback: {
                type: 'str',
                value: '',
              },
            },
          },
          {
            type: 'assign',
            name: 'pontos',
            value: {
              type: 'binop',
              op: '+',
              left: {
                type: 'var',
                name: 'pontos',
              },
              right: {
                type: 'num',
                value: 1,
              },
            },
          },
          {
            type: 'g2d:emitParticles',
            count: {
              type: 'num',
              value: 8,
            },
            color: '#f4d03f',
            x: {
              type: 'g2d:centerX',
              spriteVar: 'moeda',
            },
            y: {
              type: 'g2d:centerY',
              spriteVar: 'moeda',
            },
          },
          {
            type: 'g2d:removeFromGroup',
            spriteVar: 'moeda',
            groupVar: 'moedas',
          },
          {
            type: 'g2d:playClip',
            name: 'moeda',
          },
        ],
      },
      {
        type: 'g2d:onTouchGroup',
        spriteVar: 'jogador',
        groupVar: 'baus',
        itemName: 'bau',
        body: [
          {
            type: 'if',
            cond: {
              type: 'binop',
              op: '===',
              left: {
                type: 'g2d:spriteData',
                spriteVar: 'bau',
                key: 'aberto',
                fallback: {
                  type: 'num',
                  value: 0,
                },
              },
              right: {
                type: 'num',
                value: 0,
              },
            },
            then: [
              {
                type: 'g2d:setSpriteData',
                spriteVar: 'bau',
                key: 'aberto',
                value: {
                  type: 'num',
                  value: 1,
                },
              },
              {
                type: 'g2d:setImage',
                spriteVar: 'bau',
                image: 'jogo-d-bau-aberto',
              },
              {
                type: 'arrayPush',
                arrayVar: 'pegos',
                value: {
                  type: 'g2d:spriteData',
                  spriteVar: 'bau',
                  key: 'chave',
                  fallback: {
                    type: 'str',
                    value: '',
                  },
                },
              },
              {
                type: 'assign',
                name: 'pontos',
                value: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'var',
                    name: 'pontos',
                  },
                  right: {
                    type: 'num',
                    value: 10,
                  },
                },
              },
              {
                type: 'g2d:emitParticles',
                count: {
                  type: 'num',
                  value: 16,
                },
                color: '#f9e79f',
                x: {
                  type: 'g2d:centerX',
                  spriteVar: 'bau',
                },
                y: {
                  type: 'g2d:centerY',
                  spriteVar: 'bau',
                },
              },
              {
                type: 'g2d:playClip',
                name: 'bau',
              },
            ],
          },
        ],
      },
      {
        type: 'g2d:onTouchGroup',
        spriteVar: 'jogador',
        groupVar: 'inimigos',
        itemName: 'inimigo',
        body: [
          {
            type: 'if',
            cond: {
              type: 'logicalNot',
              value: {
                type: 'g2d:isInvincible',
                spriteVar: 'jogador',
              },
            },
            then: [
              {
                type: 'g2d:damageSprite',
                spriteVar: 'jogador',
                amount: {
                  type: 'num',
                  value: 1,
                },
                invincibilityFrames: {
                  type: 'num',
                  value: 60,
                },
              },
              {
                type: 'g2d:playClip',
                name: 'dano',
              },
            ],
          },
        ],
      },
      {
        type: 'g2d:onKey',
        key: 'Space',
        body: [
          {
            type: 'g2d:forEachInGroup',
            groupVar: 'inimigos',
            itemName: 'inimigo',
            body: [
              {
                type: 'if',
                cond: {
                  type: 'binop',
                  op: '<',
                  left: {
                    type: 'g2d:distance',
                    aVar: 'jogador',
                    bVar: 'inimigo',
                  },
                  right: {
                    type: 'num',
                    value: 48,
                  },
                },
                then: [
                  {
                    type: 'arrayPush',
                    arrayVar: 'pegos',
                    value: {
                      type: 'g2d:spriteData',
                      spriteVar: 'inimigo',
                      key: 'chave',
                      fallback: {
                        type: 'str',
                        value: '',
                      },
                    },
                  },
                  {
                    type: 'assign',
                    name: 'pontos',
                    value: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'var',
                        name: 'pontos',
                      },
                      right: {
                        type: 'num',
                        value: 5,
                      },
                    },
                  },
                  {
                    type: 'g2d:emitParticles',
                    count: {
                      type: 'num',
                      value: 12,
                    },
                    color: '#82e0aa',
                    x: {
                      type: 'g2d:centerX',
                      spriteVar: 'inimigo',
                    },
                    y: {
                      type: 'g2d:centerY',
                      spriteVar: 'inimigo',
                    },
                  },
                  {
                    type: 'g2d:removeFromGroup',
                    spriteVar: 'inimigo',
                    groupVar: 'inimigos',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    loops: [
      {
        type: 'g2d:updateEachFrame',
        body: [
          {
            type: 'g2d:clear',
          },
          {
            type: 'g2d:topDown',
            spriteVar: 'jogador',
            speed: {
              type: 'num',
              value: 3,
            },
          },
          {
            type: 'g2d:sceneCommand',
            method: 'collideMapScene',
            args: [
              {
                type: 'var',
                name: 'jogador',
              },
              {
                type: 'str',
                value: 'mapa',
              },
            ],
          },
          {
            type: 'g2d:followCameraInWorld',
            spriteVar: 'jogador',
            worldVar: 'mundo',
          },
          {
            type: 'g2d:forEachInGroup',
            groupVar: 'inimigos',
            itemName: 'inimigo',
            body: [
              {
                type: 'if',
                cond: {
                  type: 'binop',
                  op: '<',
                  left: {
                    type: 'g2d:distance',
                    aVar: 'jogador',
                    bVar: 'inimigo',
                  },
                  right: {
                    type: 'num',
                    value: 140,
                  },
                },
                then: [
                  {
                    type: 'g2d:moveToward',
                    spriteVar: 'inimigo',
                    targetVar: 'jogador',
                    speed: {
                      type: 'num',
                      value: 1,
                    },
                  },
                ],
              },
            ],
          },
          {
            type: 'g2d:sceneCommand',
            method: 'drawMapScene',
            args: [
              {
                type: 'str',
                value: 'mapa',
              },
              {
                type: 'str',
                value: 'back',
              },
            ],
          },
          {
            type: 'g2d:drawGroup',
            groupVar: 'moedas',
            ctxVar: 'ctx',
          },
          {
            type: 'g2d:drawGroup',
            groupVar: 'baus',
            ctxVar: 'ctx',
          },
          {
            type: 'g2d:drawGroup',
            groupVar: 'inimigos',
            ctxVar: 'ctx',
          },
          {
            type: 'g2d:drawSprite',
            spriteVar: 'jogador',
            ctxVar: 'ctx',
          },
          {
            type: 'g2d:drawParticles',
            ctxVar: 'ctx',
          },
          {
            type: 'g2d:sceneCommand',
            method: 'drawMapScene',
            args: [
              {
                type: 'str',
                value: 'mapa',
              },
              {
                type: 'str',
                value: 'front',
              },
            ],
          },
          {
            type: 'g2d:drawScore',
            ctxVar: 'ctx',
            label: 'Pontos',
            value: {
              type: 'var',
              name: 'pontos',
            },
            x: {
              type: 'num',
              value: 16,
            },
            y: {
              type: 'num',
              value: 28,
            },
            color: '#ffffff',
            size: {
              type: 'num',
              value: 20,
            },
          },
          {
            type: 'g2d:drawLabel',
            ctxVar: 'ctx',
            text: {
              type: 'binop',
              op: '+',
              left: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Vidas: ',
                  },
                  right: {
                    type: 'g2d:getHealth',
                    spriteVar: 'jogador',
                  },
                },
                right: {
                  type: 'str',
                  value: '   ',
                },
              },
              right: {
                type: 'var',
                name: 'regiao',
              },
            },
            x: {
              type: 'num',
              value: 16,
            },
            y: {
              type: 'num',
              value: 54,
            },
            color: '#ffe9a8',
            size: {
              type: 'num',
              value: 16,
            },
            align: 'left',
          },
          {
            type: 'if',
            cond: {
              type: 'binop',
              op: '>',
              left: {
                type: 'var',
                name: 'tempoDoRecado',
              },
              right: {
                type: 'num',
                value: 0,
              },
            },
            then: [
              {
                type: 'g2d:drawLabel',
                ctxVar: 'ctx',
                text: {
                  type: 'var',
                  name: 'recado',
                },
                x: {
                  type: 'num',
                  value: 320,
                },
                y: {
                  type: 'num',
                  value: 450,
                },
                color: '#ffffff',
                size: {
                  type: 'num',
                  value: 18,
                },
                align: 'center',
              },
              {
                type: 'assign',
                name: 'tempoDoRecado',
                value: {
                  type: 'binop',
                  op: '-',
                  left: {
                    type: 'var',
                    name: 'tempoDoRecado',
                  },
                  right: {
                    type: 'num',
                    value: 1,
                  },
                },
              },
            ],
          },
          {
            type: 'if',
            cond: {
              type: 'binop',
              op: '>',
              left: {
                type: 'var',
                name: 'esmaecer',
              },
              right: {
                type: 'num',
                value: 0,
              },
            },
            then: [
              {
                type: 'g2d:drawFade',
                ctxVar: 'ctx',
                percent: {
                  type: 'var',
                  name: 'esmaecer',
                },
                color: '#000000',
              },
              {
                type: 'assign',
                name: 'esmaecer',
                value: {
                  type: 'binop',
                  op: '-',
                  left: {
                    type: 'var',
                    name: 'esmaecer',
                  },
                  right: {
                    type: 'num',
                    value: 5,
                  },
                },
              },
            ],
          },
          {
            type: 'if',
            cond: {
              type: 'g2d:healthDepleted',
              spriteVar: 'jogador',
            },
            then: [
              {
                type: 'g2d:restart',
              },
            ],
          },
        ],
      },
    ],
  },
  extensions: [
    {
      extensionId: 'game-2d',
    },
  ],
} as SZIRV2
