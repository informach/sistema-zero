import type { ExtensionExample } from '#extensions'
import {
  coastalProceduralExample,
  folioProceduralExample,
  vocationProceduralExample,
} from './referenceExamples'

export { coastalProceduralExample, folioProceduralExample, vocationProceduralExample }

/**
 * Exemplos da vitrine do Mundo 3D. A IR de cada um foi GERADA pelo parser real
 * a partir do fonte em __gen_<nome>.ts (chamadas SZWorld3D.*); o drift test em
 * __tests__/examples.test.ts guarda o resultado. Se o parser mudar a forma
 * canonica, o drift avisa: re-rode o __gen e re-embuta a IR aqui. Todos
 * asset-free (natureza procedural, sem imagens).
 */

export const meuMundoExample: ExtensionExample = {
  name: 'Meu Mundo',
  experience: 'exploration',
  description:
    'Um mundo 3D aberto de floresta para dirigir: morros, agua, grama ao vento e ciclo de dia e noite. Tem carrinho com turbo, um totem de boas-vindas, um ponto secreto para achar e uma area que avisa. Feito so com blocos do Mundo 3D. Abra e explore!',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'world-3d' }],
    version: 2,
    behavior: {
      start: [
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
      ],
      events: [
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
      ],
      loops: [
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
      ],
    },
  },
}

export const corridaExample: ExtensionExample = {
  name: 'Corrida do Por do Sol',
  experience: 'game',
  description:
    'Uma corrida no deserto ao entardecer: siga a trilha pelos 5 checkpoints na ordem e feche as voltas. O cronometro e o recorde aparecem sozinhos. Bata o seu melhor tempo!',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'world-3d' }],
    version: 2,
    behavior: {
      start: [
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
      ],
      events: [
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
      ],
      loops: [
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
      ],
    },
  },
}

export const bolicheExample: ExtensionExample = {
  name: 'Boliche na Praca',
  experience: 'game',
  description:
    'Uma pista de boliche na praia: acelere o jipe contra os 10 pinos e derrube todos para o STRIKE! Tem tambem pilhas de latas e caixas para desabar.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'world-3d' }],
    version: 2,
    behavior: {
      start: [
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
      ],
      events: [
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
      ],
      loops: [
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
      ],
    },
  },
}

export const invernoExample: ExtensionExample = {
  name: 'Inverno Magico',
  experience: 'exploration',
  description:
    'Um mundo de neve a noite, com nevando de verdade e vento. O gelo escorrega o carrinho! Pinheiros cobertos de neve e totens pelo caminho.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'world-3d' }],
    version: 2,
    behavior: {
      start: [
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
      ],
      events: [],
      loops: [
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
      ],
    },
  },
}

export const ilhaExample: ExtensionExample = {
  name: 'Ilha dos Criadores',
  experience: 'game',
  description:
    'Um arquipelago de ferias para explorar a pe, de carrinho e de BARCO (aperte E para entrar e sair). Tem farol, ponte, palmeiras, a amiga Lia que conversa e uma missao: pegue 15 moedas e vire Cacador de Moedas, com fogos e conquista!',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'world-3d' }],
    version: 2,
    behavior: {
      start: [
        {
          type: 'w3d:setup',
          style: 'praia',
          world: {
            type: 'num',
            value: 240,
          },
        },
        {
          type: 'w3d:islands',
          n: {
            type: 'num',
            value: 4,
          },
          y: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'w3d:grass',
          amount: 'pouca',
        },
        {
          type: 'w3d:clouds',
          amount: 'muitas',
        },
        {
          type: 'w3d:ambience',
          kind: 'mar',
        },
        {
          type: 'w3d:dayNight',
          minutes: {
            type: 'num',
            value: 6,
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
            value: 30,
          },
        },
        {
          type: 'w3d:scatter',
          n: {
            type: 'num',
            value: 120,
          },
          thing: 'palmeiras',
        },
        {
          type: 'w3d:scatter',
          n: {
            type: 'num',
            value: 60,
          },
          thing: 'flores',
        },
        {
          type: 'w3d:car',
          style: 'jipe',
          color: '#f59e0b',
        },
        {
          type: 'w3d:person',
          color: '#3b82f6',
          hat: 'palha',
        },
        {
          type: 'w3d:boat',
          color: '#f8fafc',
        },
        {
          type: 'w3d:bridge',
          x1: {
            type: 'num',
            value: 18,
          },
          z1: {
            type: 'num',
            value: -16,
          },
          x2: {
            type: 'num',
            value: 52,
          },
          z2: {
            type: 'num',
            value: -60,
          },
          w: {
            type: 'num',
            value: 4,
          },
        },
        {
          type: 'w3d:lighthouse',
          x: {
            type: 'num',
            value: 60,
          },
          z: {
            type: 'num',
            value: -70,
          },
        },
        {
          type: 'w3d:lamp',
          x: {
            type: 'num',
            value: 6,
          },
          z: {
            type: 'num',
            value: 6,
          },
        },
        {
          type: 'w3d:lamp',
          x: {
            type: 'num',
            value: -6,
          },
          z: {
            type: 'num',
            value: 6,
          },
        },
        {
          type: 'w3d:npc',
          name: 'Lia',
          x: {
            type: 'num',
            value: 8,
          },
          z: {
            type: 'num',
            value: 10,
          },
          color: '#f97316',
          hat: 'palha',
        },
        {
          type: 'w3d:npcWander',
          name: 'Lia',
          r: {
            type: 'num',
            value: 10,
          },
        },
        {
          type: 'w3d:npcTalk',
          name: 'Lia',
          body: [
            {
              type: 'w3d:npcSay',
              name: 'Lia',
              text: 'Oi! Bem-vindo a ilha!',
            },
            {
              type: 'w3d:npcSay',
              name: 'Lia',
              text: 'Dizem que o farol guarda um tesouro...',
            },
            {
              type: 'w3d:npcSay',
              name: 'Lia',
              text: 'Pegue 15 moedas e va ate la!',
            },
          ],
        },
        {
          type: 'w3d:coinsScatter',
          n: {
            type: 'num',
            value: 30,
          },
        },
        {
          type: 'w3d:coinsRing',
          n: {
            type: 'num',
            value: 8,
          },
          x: {
            type: 'num',
            value: 60,
          },
          z: {
            type: 'num',
            value: -70,
          },
          r: {
            type: 'num',
            value: 8,
          },
        },
        {
          type: 'w3d:quest',
          name: 'moedas',
          desc: 'Pegue 15 moedas',
        },
        {
          type: 'w3d:marker',
          icon: 'moeda',
          x: {
            type: 'num',
            value: 60,
          },
          z: {
            type: 'num',
            value: -70,
          },
        },
        {
          type: 'w3d:guideArrow',
          x: {
            type: 'num',
            value: 60,
          },
          z: {
            type: 'num',
            value: -70,
          },
          on: true,
        },
        {
          type: 'w3d:minimap',
          mode: 'teleporte',
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
          title: 'Ilha dos Criadores',
          body: 'Ande com WASD; E entra no carrinho e no barco!',
        },
      ],
      events: [
        {
          type: 'w3d:onCollect',
          body: [
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>=',
                left: {
                  type: 'w3d:coinCount',
                },
                right: {
                  type: 'num',
                  value: 15,
                },
              },
              then: [
                {
                  type: 'w3d:questDone',
                  name: 'moedas',
                },
              ],
            },
          ],
        },
        {
          type: 'w3d:onQuestDone',
          name: 'moedas',
          body: [
            {
              type: 'w3d:fireworks',
            },
            {
              type: 'w3d:say',
              text: {
                type: 'str',
                value: 'Missao completa! Voce e um Cacador de Moedas!',
              },
              secs: {
                type: 'num',
                value: 4,
              },
            },
            {
              type: 'w3d:achievement',
              name: 'Cacador de Moedas',
            },
          ],
        },
      ],
      loops: [],
    },
  },
}

export const parqueExample: ExtensionExample = {
  name: 'Parque dos Brinquedos',
  experience: 'exploration',
  description:
    'Um parquinho de bagunca fisica: derrube as letras de PARQUE, jogue boliche com o carro de corrida, exploda caixas TNT em cadeia e aperte o botao do TORNADO! Buzine com H, deixe marcas de pneu e escreva um recado no cantinho.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'world-3d' }],
    version: 2,
    behavior: {
      start: [
        {
          type: 'w3d:setup',
          style: 'primavera',
          world: {
            type: 'num',
            value: 200,
          },
        },
        {
          type: 'w3d:terrain',
          h: {
            type: 'num',
            value: 3,
          },
          s: {
            type: 'num',
            value: 6,
          },
        },
        {
          type: 'w3d:flatten',
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
            value: 45,
          },
        },
        {
          type: 'w3d:grass',
          amount: 'media',
        },
        {
          type: 'w3d:dayNight',
          minutes: {
            type: 'num',
            value: 5,
          },
        },
        {
          type: 'w3d:scatter',
          n: {
            type: 'num',
            value: 150,
          },
          thing: 'arvores',
        },
        {
          type: 'w3d:scatter',
          n: {
            type: 'num',
            value: 80,
          },
          thing: 'flores',
        },
        {
          type: 'w3d:car',
          style: 'corrida',
          color: '#3b82f6',
        },
        {
          type: 'w3d:carBoost',
          force: {
            type: 'num',
            value: 2,
          },
        },
        {
          type: 'w3d:horn',
        },
        {
          type: 'w3d:carLights',
        },
        {
          type: 'w3d:tireMarks',
          on: true,
        },
        {
          type: 'w3d:carPaint',
          paint: 'listras',
        },
        {
          type: 'w3d:letters',
          word: 'PARQUE',
          x: {
            type: 'num',
            value: 0,
          },
          z: {
            type: 'num',
            value: 18,
          },
          s: {
            type: 'num',
            value: 1.4,
          },
        },
        {
          type: 'w3d:pushScatter',
          n: {
            type: 'num',
            value: 20,
          },
          x: {
            type: 'num',
            value: -20,
          },
          z: {
            type: 'num',
            value: 0,
          },
          r: {
            type: 'num',
            value: 12,
          },
        },
        {
          type: 'w3d:stack',
          n: {
            type: 'num',
            value: 6,
          },
          thing: 'caixas',
          x: {
            type: 'num',
            value: 20,
          },
          z: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'w3d:bowlingCreate',
          x: {
            type: 'num',
            value: 0,
          },
          z: {
            type: 'num',
            value: -30,
          },
          deg: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'w3d:explosive',
          x: {
            type: 'num',
            value: 30,
          },
          z: {
            type: 'num',
            value: 20,
          },
        },
        {
          type: 'w3d:explosive',
          x: {
            type: 'num',
            value: 30,
          },
          z: {
            type: 'num',
            value: 26,
          },
        },
        {
          type: 'w3d:explosive',
          x: {
            type: 'num',
            value: 34,
          },
          z: {
            type: 'num',
            value: 23,
          },
        },
        {
          type: 'w3d:point',
          name: 'tornado',
          x: {
            type: 'num',
            value: -30,
          },
          z: {
            type: 'num',
            value: 25,
          },
        },
        {
          type: 'w3d:point',
          name: 'festa',
          x: {
            type: 'num',
            value: 25,
          },
          z: {
            type: 'num',
            value: -12,
          },
        },
        {
          type: 'w3d:coinsLine',
          n: {
            type: 'num',
            value: 10,
          },
          x1: {
            type: 'num',
            value: 0,
          },
          z1: {
            type: 'num',
            value: 5,
          },
          x2: {
            type: 'num',
            value: 0,
          },
          z2: {
            type: 'num',
            value: -25,
          },
        },
        {
          type: 'w3d:whisperCorner',
          x: {
            type: 'num',
            value: -12,
          },
          z: {
            type: 'num',
            value: 12,
          },
        },
        {
          type: 'w3d:minimap',
          mode: 'ver',
        },
        {
          type: 'w3d:hud',
          text: {
            type: 'str',
            value: 'Buzine com H! E tem um segredo: cima cima baixo baixo esq dir esq dir B A',
          },
          corner: 'baixo-esquerda',
        },
      ],
      events: [
        {
          type: 'w3d:bowlingOnStrike',
          body: [
            {
              type: 'w3d:confetti',
            },
            {
              type: 'w3d:achievement',
              name: 'Strike',
            },
          ],
        },
        {
          type: 'w3d:onExplosion',
          body: [
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
          type: 'w3d:onPoint',
          name: 'tornado',
          body: [
            {
              type: 'w3d:tornado',
              secs: {
                type: 'num',
                value: 12,
              },
            },
            {
              type: 'w3d:say',
              text: {
                type: 'str',
                value: 'SEGURA!',
              },
              secs: {
                type: 'num',
                value: 2,
              },
            },
          ],
        },
        {
          type: 'w3d:onPoint',
          name: 'festa',
          body: [
            {
              type: 'w3d:fireworks',
            },
            {
              type: 'w3d:fireworks',
            },
          ],
        },
      ],
      loops: [],
    },
  },
}

export const vilaExample: ExtensionExample = {
  name: 'Vila das Vocacoes',
  experience: 'exploration',
  description:
    'Uma cidadezinha COMPLETA com transito e semaforos de verdade! Converse com a Guia (ela faz uma PERGUNTA com dois botoes), abra as portas da Padaria e da Oficina para conhecer as profissoes, pegue moedas na praca e use o minimapa para teleportar.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'world-3d' }],
    version: 2,
    behavior: {
      start: [
        {
          type: 'w3d:setup',
          style: 'primavera',
          world: {
            type: 'num',
            value: 200,
          },
        },
        {
          type: 'w3d:city',
          x: {
            type: 'num',
            value: 0,
          },
          z: {
            type: 'num',
            value: 0,
          },
          size: 'media',
          mode: 'dia',
        },
        {
          type: 'w3d:traffic',
          n: {
            type: 'num',
            value: 6,
          },
          sem: 'semaforos',
        },
        {
          type: 'w3d:car',
          style: 'passeio',
          color: '#3b82f6',
        },
        {
          type: 'w3d:person',
          color: '#f59e0b',
          hat: 'bone',
        },
        {
          type: 'w3d:door',
          x: {
            type: 'num',
            value: 31,
          },
          z: {
            type: 'num',
            value: -6,
          },
          deg: {
            type: 'num',
            value: 270,
          },
          title: 'Padaria',
          body: 'Cheiro de pao quentinho! A padeira acorda cedinho para assar o pao da vila inteira.',
          image: '',
        },
        {
          type: 'w3d:door',
          x: {
            type: 'num',
            value: -31,
          },
          z: {
            type: 'num',
            value: 6,
          },
          deg: {
            type: 'num',
            value: 90,
          },
          title: 'Oficina',
          body: 'Aqui a mecanica conserta os carrinhos da vila. Chaves, parafusos e muita engenhoca!',
          image: '',
        },
        {
          type: 'w3d:npc',
          name: 'Guia',
          x: {
            type: 'num',
            value: 4,
          },
          z: {
            type: 'num',
            value: 6,
          },
          color: '#22c55e',
          hat: 'coroa',
        },
        {
          type: 'w3d:npcWander',
          name: 'Guia',
          r: {
            type: 'num',
            value: 4,
          },
        },
        {
          type: 'w3d:npcTalk',
          name: 'Guia',
          body: [
            {
              type: 'w3d:npcSay',
              name: 'Guia',
              text: 'Bem-vindo a Vila das Vocacoes!',
            },
            {
              type: 'w3d:npcAsk',
              name: 'Guia',
              question: 'O que voce quer ser quando crescer?',
              optA: 'Padeiro',
              bodyA: [
                {
                  type: 'w3d:npcSay',
                  name: 'Guia',
                  text: 'A padaria fica na entrada leste. Va conhecer!',
                },
                {
                  type: 'w3d:questDone',
                  name: 'conhecer',
                },
              ],
              optB: 'Mecanico',
              bodyB: [
                {
                  type: 'w3d:npcSay',
                  name: 'Guia',
                  text: 'A oficina fica na entrada oeste. Boa visita!',
                },
                {
                  type: 'w3d:questDone',
                  name: 'conhecer',
                },
              ],
            },
          ],
        },
        {
          type: 'w3d:quest',
          name: 'conhecer',
          desc: 'Converse com a Guia da vila',
        },
        {
          type: 'w3d:coinsRing',
          n: {
            type: 'num',
            value: 10,
          },
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
            value: 12,
          },
        },
        {
          type: 'w3d:minimap',
          mode: 'teleporte',
        },
        {
          type: 'w3d:hud',
          text: {
            type: 'str',
            value: 'Aperte E nas portas e converse com a Guia!',
          },
          corner: 'baixo-esquerda',
        },
      ],
      events: [
        {
          type: 'w3d:onQuestDone',
          name: 'conhecer',
          body: [
            {
              type: 'w3d:confetti',
            },
            {
              type: 'w3d:achievement',
              name: 'Cidadao da Vila',
            },
          ],
        },
      ],
      loops: [],
    },
  },
}

export const luaExample: ExtensionExample = {
  name: 'Base da Lua',
  experience: 'game',
  description:
    'Um mundo LUNAR de verdade: gravidade fraquinha (os pulos flutuam!), ceu estrelado, crateras, foguete e bandeira. Voe de jetpack ate a cratera grande, pegue as 12 moedas e vire Astronauta, com direito a fogos!',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'world-3d' }],
    version: 2,
    behavior: {
      start: [
        {
          type: 'w3d:setup',
          style: 'lua',
          world: {
            type: 'num',
            value: 180,
          },
        },
        {
          type: 'w3d:person',
          color: '#e8e8f0',
          hat: 'capacete',
        },
        {
          type: 'w3d:personAccessory',
          acc: 'jetpack',
        },
        {
          type: 'w3d:rocket',
          x: {
            type: 'num',
            value: 8,
          },
          z: {
            type: 'num',
            value: -10,
          },
        },
        {
          type: 'w3d:flag',
          x: {
            type: 'num',
            value: 0,
          },
          z: {
            type: 'num',
            value: -10,
          },
          color: '#ef4444',
        },
        {
          type: 'w3d:crater',
          x: {
            type: 'num',
            value: 30,
          },
          z: {
            type: 'num',
            value: 30,
          },
          r: {
            type: 'num',
            value: 10,
          },
        },
        {
          type: 'w3d:coinsRing',
          n: {
            type: 'num',
            value: 12,
          },
          x: {
            type: 'num',
            value: 30,
          },
          z: {
            type: 'num',
            value: 30,
          },
          r: {
            type: 'num',
            value: 8,
          },
        },
        {
          type: 'w3d:quest',
          name: 'moedas',
          desc: 'Pegue 12 moedas na cratera',
        },
        {
          type: 'w3d:marker',
          icon: 'estrela',
          x: {
            type: 'num',
            value: 30,
          },
          z: {
            type: 'num',
            value: 30,
          },
        },
        {
          type: 'w3d:guideArrow',
          x: {
            type: 'num',
            value: 30,
          },
          z: {
            type: 'num',
            value: 30,
          },
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
            value: 6,
          },
          title: 'Base da Lua',
          body: 'Pulos flutuantes! Segure espaco com o jetpack para voar.',
        },
      ],
      events: [
        {
          type: 'w3d:onCollect',
          body: [
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>=',
                left: {
                  type: 'w3d:coinCount',
                },
                right: {
                  type: 'num',
                  value: 12,
                },
              },
              then: [
                {
                  type: 'w3d:questDone',
                  name: 'moedas',
                },
              ],
            },
          ],
        },
        {
          type: 'w3d:onQuestDone',
          name: 'moedas',
          body: [
            {
              type: 'w3d:fireworks',
            },
            {
              type: 'w3d:achievement',
              name: 'Astronauta',
            },
          ],
        },
      ],
      loops: [],
    },
  },
}

export const fazendinhaExample: ExtensionExample = {
  name: 'Fazendinha',
  experience: 'exploration',
  description:
    'Uma fazenda viva: celeiro vermelho, moinho que GIRA com o vento, fileiras de milho, alface e abobora, cerquinha de madeira e bichinhos passeando (galinhas que bicam e vacas que pastam). A Rosa pergunta o que voce quer colher!',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'world-3d' }],
    version: 2,
    behavior: {
      start: [
        {
          type: 'w3d:setup',
          style: 'fazenda',
          world: {
            type: 'num',
            value: 180,
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
          type: 'w3d:grass',
          amount: 'media',
        },
        {
          type: 'w3d:car',
          style: 'jipe',
          color: '#16a34a',
        },
        {
          type: 'w3d:barn',
          x: {
            type: 'num',
            value: -15,
          },
          z: {
            type: 'num',
            value: 15,
          },
          deg: {
            type: 'num',
            value: 20,
          },
        },
        {
          type: 'w3d:windmill',
          x: {
            type: 'num',
            value: 15,
          },
          z: {
            type: 'num',
            value: 25,
          },
        },
        {
          type: 'w3d:crops',
          n: {
            type: 'num',
            value: 4,
          },
          kind: 'milho',
          x: {
            type: 'num',
            value: 0,
          },
          z: {
            type: 'num',
            value: 30,
          },
        },
        {
          type: 'w3d:crops',
          n: {
            type: 'num',
            value: 3,
          },
          kind: 'alface',
          x: {
            type: 'num',
            value: -18,
          },
          z: {
            type: 'num',
            value: 34,
          },
        },
        {
          type: 'w3d:crops',
          n: {
            type: 'num',
            value: 3,
          },
          kind: 'abobora',
          x: {
            type: 'num',
            value: 18,
          },
          z: {
            type: 'num',
            value: 38,
          },
        },
        {
          type: 'w3d:fence',
          x1: {
            type: 'num',
            value: -24,
          },
          z1: {
            type: 'num',
            value: 26,
          },
          x2: {
            type: 'num',
            value: 24,
          },
          z2: {
            type: 'num',
            value: 26,
          },
        },
        {
          type: 'w3d:animals',
          n: {
            type: 'num',
            value: 5,
          },
          kind: 'galinhas',
          x: {
            type: 'num',
            value: -12,
          },
          z: {
            type: 'num',
            value: 12,
          },
          r: {
            type: 'num',
            value: 6,
          },
        },
        {
          type: 'w3d:animals',
          n: {
            type: 'num',
            value: 3,
          },
          kind: 'vacas',
          x: {
            type: 'num',
            value: 14,
          },
          z: {
            type: 'num',
            value: 10,
          },
          r: {
            type: 'num',
            value: 8,
          },
        },
        {
          type: 'w3d:npc',
          name: 'Rosa',
          x: {
            type: 'num',
            value: -8,
          },
          z: {
            type: 'num',
            value: 8,
          },
          color: '#e04f3f',
          hat: 'palha',
        },
        {
          type: 'w3d:npcTalk',
          name: 'Rosa',
          body: [
            {
              type: 'w3d:npcAsk',
              name: 'Rosa',
              question: 'O que vamos colher hoje?',
              optA: 'Milho',
              bodyA: [
                {
                  type: 'w3d:npcSay',
                  name: 'Rosa',
                  text: 'O milharal fica atras da cerca. Nao pise nas mudas!',
                },
              ],
              optB: 'Alface',
              bodyB: [
                {
                  type: 'w3d:npcSay',
                  name: 'Rosa',
                  text: 'As alfaces estao do lado do celeiro. Capriche!',
                },
              ],
            },
          ],
        },
        {
          type: 'w3d:wind',
          force: {
            type: 'num',
            value: 3,
          },
        },
        {
          type: 'w3d:weather',
          kind: 'folhas',
        },
        {
          type: 'w3d:totemText',
          x: {
            type: 'num',
            value: 0,
          },
          z: {
            type: 'num',
            value: 6,
          },
          title: 'Fazendinha',
          body: 'Visite o celeiro, veja o moinho girar e cuide dos bichinhos!',
        },
      ],
      events: [],
      loops: [],
    },
  },
}

export const world3DExamples: ExtensionExample[] = [
  meuMundoExample,
  corridaExample,
  bolicheExample,
  invernoExample,
  ilhaExample,
  parqueExample,
  vilaExample,
  luaExample,
  fazendinhaExample,
  folioProceduralExample,
  coastalProceduralExample,
  vocationProceduralExample,
]
