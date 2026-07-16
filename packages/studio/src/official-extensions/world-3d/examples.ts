import type { ExtensionExample } from '#extensions'

/**
 * Exemplos da vitrine do Mundo 3D. A IR de cada um foi GERADA pelo parser real
 * a partir do fonte em __gen_<nome>.ts (chamadas SZWorld3D.*); o drift test em
 * __tests__/examples.test.ts guarda o resultado. Se o parser mudar a forma
 * canonica, o drift avisa: re-rode o __gen e re-embuta a IR aqui. Todos
 * asset-free (natureza procedural, sem imagens).
 */

export const meuMundoExample: ExtensionExample = {
  name: 'Meu Mundo',
  description:
    'Um mundo 3D aberto de floresta para dirigir: morros, agua, grama ao vento e ciclo de dia e noite. Tem carrinho com turbo, um totem de boas-vindas, um ponto secreto para achar e uma area que avisa. Feito so com blocos do Mundo 3D. Abra e explore!',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'world-3d' }],
    js: [
      {
        type: 'w3d:setup',
        style: 'floresta',
        world: {
          type: 'num',
          value: 180,
        },
      },
      {
        type: 'w3d:terrain',
        h: {
          type: 'num',
          value: 4,
        },
        s: {
          type: 'num',
          value: 6,
        },
      },
      {
        type: 'w3d:water',
        y: {
          type: 'num',
          value: -8,
        },
        color: '#2b6cb0',
      },
      {
        type: 'w3d:grass',
        amount: 'media',
      },
      {
        type: 'w3d:dayNight',
        minutes: {
          type: 'num',
          value: 4,
        },
      },
      {
        type: 'w3d:clearArea',
        x: {
          type: 'num',
          value: 0,
        },
        z: {
          type: 'num',
          value: 0,
        },
        r: {
          type: 'num',
          value: 40,
        },
      },
      {
        type: 'w3d:scatter',
        n: {
          type: 'num',
          value: 280,
        },
        thing: 'arvores',
      },
      {
        type: 'w3d:scatter',
        n: {
          type: 'num',
          value: 90,
        },
        thing: 'pedras',
      },
      {
        type: 'w3d:scatter',
        n: {
          type: 'num',
          value: 160,
        },
        thing: 'flores',
      },
      {
        type: 'w3d:scatter',
        n: {
          type: 'num',
          value: 40,
        },
        thing: 'cogumelos',
      },
      {
        type: 'w3d:car',
        style: 'passeio',
        color: '#ef4444',
      },
      {
        type: 'w3d:carBoost',
        force: {
          type: 'num',
          value: 1.5,
        },
      },
      {
        type: 'w3d:engineSound',
        on: true,
      },
      {
        type: 'w3d:totemText',
        x: {
          type: 'num',
          value: 0,
        },
        z: {
          type: 'num',
          value: 14,
        },
        title: 'Meu Mundo',
        body: 'Dirija com WASD, turbo no Shift. Ache o ponto secreto!',
      },
      {
        type: 'w3d:point',
        name: 'segredo',
        x: {
          type: 'num',
          value: 35,
        },
        z: {
          type: 'num',
          value: -35,
        },
      },
      {
        type: 'w3d:onPoint',
        name: 'segredo',
        body: [
          {
            type: 'w3d:say',
            text: {
              type: 'str',
              value: 'Voce achou o tesouro escondido!',
            },
            secs: {
              type: 'num',
              value: 3,
            },
          },
          {
            type: 'w3d:cameraShake',
            force: {
              type: 'num',
              value: 0.6,
            },
            secs: {
              type: 'num',
              value: 0.4,
            },
          },
        ],
      },
      {
        type: 'w3d:zone',
        name: 'laguinho',
        x: {
          type: 'num',
          value: -40,
        },
        z: {
          type: 'num',
          value: 30,
        },
        r: {
          type: 'num',
          value: 12,
        },
      },
      {
        type: 'w3d:onZone',
        name: 'laguinho',
        body: [
          {
            type: 'w3d:hud',
            text: {
              type: 'str',
              value: 'Cuidado com a agua!',
            },
            corner: 'baixo-esquerda',
          },
        ],
      },
      {
        type: 'w3d:onCrash',
        body: [
          {
            type: 'w3d:cameraShake',
            force: {
              type: 'num',
              value: 0.5,
            },
            secs: {
              type: 'num',
              value: 0.3,
            },
          },
        ],
      },
      {
        type: 'w3d:onUpdate',
        dtName: 'dt',
        body: [
          {
            type: 'w3d:hud',
            text: {
              type: 'binop',
              op: '+',
              left: {
                type: 'str',
                value: 'Velocidade: ',
              },
              right: {
                type: 'mathUnary',
                fn: 'round',
                arg: {
                  type: 'w3d:carSpeed',
                },
              },
            },
            corner: 'topo-direita',
          },
        ],
      },
      {
        type: 'w3d:start',
      },
    ],
  },
}

export const corridaExample: ExtensionExample = {
  name: 'Corrida do Por do Sol',
  description:
    'Uma corrida no deserto ao entardecer: siga a trilha pelos 5 checkpoints na ordem e feche as voltas. O cronometro e o recorde aparecem sozinhos. Bata o seu melhor tempo!',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'world-3d' }],
    js: [
      {
        type: 'w3d:setup',
        style: 'deserto',
        world: {
          type: 'num',
          value: 220,
        },
      },
      {
        type: 'w3d:terrain',
        h: {
          type: 'num',
          value: 5,
        },
        s: {
          type: 'num',
          value: 7,
        },
      },
      {
        type: 'w3d:setTime',
        time: 'entardecer',
      },
      {
        type: 'w3d:grass',
        amount: 'pouca',
      },
      {
        type: 'w3d:clearArea',
        x: {
          type: 'num',
          value: 0,
        },
        z: {
          type: 'num',
          value: 0,
        },
        r: {
          type: 'num',
          value: 30,
        },
      },
      {
        type: 'w3d:path',
        x1: {
          type: 'num',
          value: 0,
        },
        z1: {
          type: 'num',
          value: 0,
        },
        x2: {
          type: 'num',
          value: 60,
        },
        z2: {
          type: 'num',
          value: 40,
        },
        w: {
          type: 'num',
          value: 8,
        },
      },
      {
        type: 'w3d:path',
        x1: {
          type: 'num',
          value: 60,
        },
        z1: {
          type: 'num',
          value: 40,
        },
        x2: {
          type: 'num',
          value: 20,
        },
        z2: {
          type: 'num',
          value: -60,
        },
        w: {
          type: 'num',
          value: 8,
        },
      },
      {
        type: 'w3d:path',
        x1: {
          type: 'num',
          value: 20,
        },
        z1: {
          type: 'num',
          value: -60,
        },
        x2: {
          type: 'num',
          value: 0,
        },
        z2: {
          type: 'num',
          value: 0,
        },
        w: {
          type: 'num',
          value: 8,
        },
      },
      {
        type: 'w3d:scatter',
        n: {
          type: 'num',
          value: 120,
        },
        thing: 'cactos',
      },
      {
        type: 'w3d:scatter',
        n: {
          type: 'num',
          value: 60,
        },
        thing: 'pedras',
      },
      {
        type: 'w3d:car',
        style: 'corrida',
        color: '#f59e0b',
      },
      {
        type: 'w3d:carBoost',
        force: {
          type: 'num',
          value: 2,
        },
      },
      {
        type: 'w3d:engineSound',
        on: true,
      },
      {
        type: 'w3d:totemText',
        x: {
          type: 'num',
          value: 0,
        },
        z: {
          type: 'num',
          value: 8,
        },
        title: 'Corrida do Por do Sol',
        body: 'Passe pelos checkpoints na ordem e feche a volta!',
      },
      {
        type: 'w3d:raceCreate',
        x: {
          type: 'num',
          value: 0,
        },
        z: {
          type: 'num',
          value: 0,
        },
        deg: {
          type: 'num',
          value: 0,
        },
        laps: {
          type: 'num',
          value: 2,
        },
      },
      {
        type: 'w3d:raceCheckpoint',
        x: {
          type: 'num',
          value: 60,
        },
        z: {
          type: 'num',
          value: 40,
        },
        deg: {
          type: 'num',
          value: 0,
        },
      },
      {
        type: 'w3d:raceCheckpoint',
        x: {
          type: 'num',
          value: 40,
        },
        z: {
          type: 'num',
          value: 0,
        },
        deg: {
          type: 'num',
          value: 90,
        },
      },
      {
        type: 'w3d:raceCheckpoint',
        x: {
          type: 'num',
          value: 20,
        },
        z: {
          type: 'num',
          value: -60,
        },
        deg: {
          type: 'num',
          value: 0,
        },
      },
      {
        type: 'w3d:raceCheckpoint',
        x: {
          type: 'num',
          value: -20,
        },
        z: {
          type: 'num',
          value: -20,
        },
        deg: {
          type: 'num',
          value: 45,
        },
      },
      {
        type: 'w3d:raceCheckpoint',
        x: {
          type: 'num',
          value: -10,
        },
        z: {
          type: 'num',
          value: 30,
        },
        deg: {
          type: 'num',
          value: 90,
        },
      },
      {
        type: 'w3d:raceOnStart',
        body: [
          {
            type: 'w3d:say',
            text: {
              type: 'str',
              value: 'Valendo!',
            },
            secs: {
              type: 'num',
              value: 2,
            },
          },
        ],
      },
      {
        type: 'w3d:raceOnFinish',
        body: [
          {
            type: 'w3d:say',
            text: {
              type: 'binop',
              op: '+',
              left: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Chegou! Tempo: ',
                },
                right: {
                  type: 'mathUnary',
                  fn: 'round',
                  arg: {
                    type: 'w3d:raceTime',
                  },
                },
              },
              right: {
                type: 'str',
                value: 's',
              },
            },
            secs: {
              type: 'num',
              value: 4,
            },
          },
          {
            type: 'w3d:cameraShake',
            force: {
              type: 'num',
              value: 0.7,
            },
            secs: {
              type: 'num',
              value: 0.5,
            },
          },
        ],
      },
      {
        type: 'w3d:onUpdate',
        dtName: 'dt',
        body: [
          {
            type: 'w3d:hud',
            text: {
              type: 'binop',
              op: '+',
              left: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Recorde: ',
                },
                right: {
                  type: 'mathUnary',
                  fn: 'round',
                  arg: {
                    type: 'w3d:raceBest',
                  },
                },
              },
              right: {
                type: 'str',
                value: 's',
              },
            },
            corner: 'baixo-direita',
          },
        ],
      },
      {
        type: 'w3d:start',
      },
    ],
  },
}

export const bolicheExample: ExtensionExample = {
  name: 'Boliche na Praca',
  description:
    'Uma pista de boliche na praia: acelere o jipe contra os 10 pinos e derrube todos para o STRIKE! Tem tambem pilhas de latas e caixas para desabar.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'world-3d' }],
    js: [
      {
        type: 'w3d:setup',
        style: 'praia',
        world: {
          type: 'num',
          value: 160,
        },
      },
      {
        type: 'w3d:terrain',
        h: {
          type: 'num',
          value: 2,
        },
        s: {
          type: 'num',
          value: 8,
        },
      },
      {
        type: 'w3d:water',
        y: {
          type: 'num',
          value: -3,
        },
        color: '#3182ce',
      },
      {
        type: 'w3d:grass',
        amount: 'pouca',
      },
      {
        type: 'w3d:clearArea',
        x: {
          type: 'num',
          value: 0,
        },
        z: {
          type: 'num',
          value: 0,
        },
        r: {
          type: 'num',
          value: 50,
        },
      },
      {
        type: 'w3d:scatter',
        n: {
          type: 'num',
          value: 60,
        },
        thing: 'arvores',
      },
      {
        type: 'w3d:car',
        style: 'jipe',
        color: '#2b6cb0',
      },
      {
        type: 'w3d:carBoost',
        force: {
          type: 'num',
          value: 1.5,
        },
      },
      {
        type: 'w3d:engineSound',
        on: true,
      },
      {
        type: 'w3d:totemText',
        x: {
          type: 'num',
          value: 0,
        },
        z: {
          type: 'num',
          value: -12,
        },
        title: 'Boliche na Praca',
        body: 'Acelere contra os pinos! Derrube todos para o strike.',
      },
      {
        type: 'w3d:bowlingCreate',
        x: {
          type: 'num',
          value: 0,
        },
        z: {
          type: 'num',
          value: 25,
        },
        deg: {
          type: 'num',
          value: 0,
        },
      },
      {
        type: 'w3d:stack',
        n: {
          type: 'num',
          value: 6,
        },
        thing: 'latas',
        x: {
          type: 'num',
          value: 20,
        },
        z: {
          type: 'num',
          value: 10,
        },
      },
      {
        type: 'w3d:stack',
        n: {
          type: 'num',
          value: 5,
        },
        thing: 'caixas',
        x: {
          type: 'num',
          value: -20,
        },
        z: {
          type: 'num',
          value: 10,
        },
      },
      {
        type: 'w3d:bowlingOnStrike',
        body: [
          {
            type: 'w3d:say',
            text: {
              type: 'str',
              value: 'STRIKE!',
            },
            secs: {
              type: 'num',
              value: 3,
            },
          },
          {
            type: 'w3d:cameraShake',
            force: {
              type: 'num',
              value: 0.8,
            },
            secs: {
              type: 'num',
              value: 0.5,
            },
          },
        ],
      },
      {
        type: 'w3d:onUpdate',
        dtName: 'dt',
        body: [
          {
            type: 'w3d:hud',
            text: {
              type: 'binop',
              op: '+',
              left: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Pinos: ',
                },
                right: {
                  type: 'w3d:pinsDown',
                },
              },
              right: {
                type: 'str',
                value: '/10',
              },
            },
            corner: 'topo-esquerda',
          },
          {
            type: 'w3d:hud',
            text: {
              type: 'binop',
              op: '+',
              left: {
                type: 'str',
                value: 'Derrubados: ',
              },
              right: {
                type: 'w3d:knockedCount',
              },
            },
            corner: 'topo-direita',
          },
        ],
      },
      {
        type: 'w3d:start',
      },
    ],
  },
}

export const invernoExample: ExtensionExample = {
  name: 'Inverno Magico',
  description:
    'Um mundo de neve a noite, com nevando de verdade e vento. O gelo escorrega o carrinho! Pinheiros cobertos de neve e totens pelo caminho.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'world-3d' }],
    js: [
      {
        type: 'w3d:setup',
        style: 'neve',
        world: {
          type: 'num',
          value: 170,
        },
      },
      {
        type: 'w3d:terrain',
        h: {
          type: 'num',
          value: 6,
        },
        s: {
          type: 'num',
          value: 5,
        },
      },
      {
        type: 'w3d:setTime',
        time: 'noite',
      },
      {
        type: 'w3d:weather',
        kind: 'neve',
      },
      {
        type: 'w3d:wind',
        force: {
          type: 'num',
          value: 2,
        },
      },
      {
        type: 'w3d:grass',
        amount: 'pouca',
      },
      {
        type: 'w3d:clearArea',
        x: {
          type: 'num',
          value: 0,
        },
        z: {
          type: 'num',
          value: 0,
        },
        r: {
          type: 'num',
          value: 35,
        },
      },
      {
        type: 'w3d:scatter',
        n: {
          type: 'num',
          value: 200,
        },
        thing: 'pinheiros',
      },
      {
        type: 'w3d:scatter',
        n: {
          type: 'num',
          value: 80,
        },
        thing: 'pedras',
      },
      {
        type: 'w3d:car',
        style: 'jipe',
        color: '#38bdf8',
      },
      {
        type: 'w3d:carBoost',
        force: {
          type: 'num',
          value: 1.5,
        },
      },
      {
        type: 'w3d:engineSound',
        on: true,
      },
      {
        type: 'w3d:totemText',
        x: {
          type: 'num',
          value: 0,
        },
        z: {
          type: 'num',
          value: 12,
        },
        title: 'Inverno Magico',
        body: 'Uma noite de neve. Dirija com cuidado, o gelo escorrega!',
      },
      {
        type: 'w3d:totemText',
        x: {
          type: 'num',
          value: 30,
        },
        z: {
          type: 'num',
          value: -20,
        },
        title: 'Floresta Gelada',
        body: 'Os pinheiros dormem sob a neve.',
      },
      {
        type: 'w3d:cameraMode',
        mode: 'seguir',
      },
      {
        type: 'w3d:onUpdate',
        dtName: 'dt',
        body: [
          {
            type: 'w3d:hud',
            text: {
              type: 'str',
              value: 'Noite de neve',
            },
            corner: 'baixo-esquerda',
          },
        ],
      },
      {
        type: 'w3d:start',
      },
    ],
  },
}

export const world3DExamples: ExtensionExample[] = [
  meuMundoExample,
  corridaExample,
  bolicheExample,
  invernoExample,
]
