import type { ExtensionExample } from '#extensions'

/**
 * Exemplo da vitrine "Defesa da Torre Profissional" — torres com FSM própria (parado →
 * mirar → atirar → recarregar) caçam invasores que nascem na beirada e
 * perseguem o cristal. Exercita: moldes de peças, pool/spawner, FSM por
 * entidade, vizinhança (nearest/forEachNear), combate, faíscas, telas, HUD e
 * som sintetizado — 100% asset-free (peças procedurais + som do computador).
 *
 * ⚠️ A IR abaixo foi GERADA pelo parser real a partir do fonte achatado (o
 * mesmo do drift test em __tests__/examples.test.ts). Se o parser mudar a
 * saída, o drift avisa: rode o fonte por parseJS e cole o resultado aqui.
 */
export const defesaDaTorreExample: ExtensionExample = {
  name: 'Defesa da Torre Profissional',
  experience: 'game',
  description:
    'Torres com cérebro próprio (máquina de estados: parado → mirar → atirar → recarregar) caçam os invasores que avançam contra o cristal. Tudo montado de peças: nenhuma imagem.',
  ir: {
    html: [],
    css: [],
    extensions: [
      {
        extensionId: 'game-3d-advanced',
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g3k:setup',
          w: {
            type: 'num',
            value: 1280,
          },
          h: {
            type: 'num',
            value: 720,
          },
          world: {
            type: 'num',
            value: 60,
          },
          sky: '#0b1026',
          ground: '#14532d',
        },
        {
          type: 'g3k:setEffects',
          shadows: true,
          bloom: true,
          strength: {
            type: 'num',
            value: 1.2,
          },
          vignette: true,
        },
        {
          type: 'g3k:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Defesa da Torre Profissional',
          },
          text: {
            type: 'str',
            value: 'Os invasores vêm da beirada do mundo. Suas torres têm cérebro próprio!',
          },
          button: {
            type: 'str',
            value: 'Defender',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'O cristal sobreviveu!',
          },
          text: {
            type: 'str',
            value: 'As torres agradecem.',
          },
          button: {
            type: 'str',
            value: 'Defender de novo',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'fim',
          title: {
            type: 'str',
            value: 'O cristal caiu!',
          },
          text: {
            type: 'str',
            value: 'Os invasores passaram. Proteja o cristal na próxima!',
          },
          button: {
            type: 'str',
            value: 'Tentar de novo',
          },
        },
        {
          type: 'g3k:defineMold',
          name: 'cristal',
          health: {
            type: 'num',
            value: 200,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              texture: '',
              model: '',
              color: '#0e7490',
              w: {
                type: 'num',
                value: 2.2,
              },
              h: {
                type: 'num',
                value: 0.4,
              },
              d: {
                type: 'num',
                value: 2.2,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.2,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'normal',
              texture: '',
              model: '',
              color: '#22d3ee',
              w: {
                type: 'num',
                value: 1.6,
              },
              h: {
                type: 'num',
                value: 3,
              },
              d: {
                type: 'num',
                value: 1.6,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.9,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'torre',
          health: {
            type: 'num',
            value: 120,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'cylinder',
              material: 'normal',
              texture: '',
              model: '',
              color: '#64748b',
              w: {
                type: 'num',
                value: 1.2,
              },
              h: {
                type: 'num',
                value: 2,
              },
              d: {
                type: 'num',
                value: 1.2,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              texture: '',
              model: '',
              color: '#94a3b8',
              w: {
                type: 'num',
                value: 0.4,
              },
              h: {
                type: 'num',
                value: 0.4,
              },
              d: {
                type: 'num',
                value: 1.4,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 2,
              },
              z: {
                type: 'num',
                value: 0.5,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'invasor',
          health: {
            type: 'num',
            value: 30,
          },
          speed: {
            type: 'num',
            value: 3,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'normal',
              texture: '',
              model: '',
              color: '#ef4444',
              w: {
                type: 'num',
                value: 1.2,
              },
              h: {
                type: 'num',
                value: 1.2,
              },
              d: {
                type: 'num',
                value: 1.2,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.6,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'normal',
              texture: '',
              model: '',
              color: '#7f1d1d',
              w: {
                type: 'num',
                value: 0.7,
              },
              h: {
                type: 'num',
                value: 0.8,
              },
              d: {
                type: 'num',
                value: 0.7,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.6,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'tiro',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'normal',
              texture: '',
              model: '',
              color: '#fde047',
              w: {
                type: 'num',
                value: 0.35,
              },
              h: {
                type: 'num',
                value: 0.35,
              },
              d: {
                type: 'num',
                value: 0.35,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineEffect',
          name: 'explosao',
          count: {
            type: 'num',
            value: 30,
          },
          colorFrom: '#fb923c',
          colorTo: '#451a03',
          spread: {
            type: 'num',
            value: 8,
          },
          sizeFrom: {
            type: 'num',
            value: 0.6,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.8,
          },
          gravity: {
            type: 'num',
            value: -9,
          },
        },
        {
          type: 'g3k:defineEffect',
          name: 'faisca',
          count: {
            type: 'num',
            value: 10,
          },
          colorFrom: '#fde047',
          colorTo: '#fb923c',
          spread: {
            type: 'num',
            value: 3,
          },
          sizeFrom: {
            type: 'num',
            value: 0.3,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.3,
          },
          gravity: {
            type: 'num',
            value: 0,
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
          type: 'g3k:stateTimer',
          mold: 'torre',
          state: 'recarregar',
          sec: {
            type: 'num',
            value: 1,
          },
          next: 'parado',
        },
      ],
      events: [
        {
          type: 'g3k:onEnterState',
          name: 'jogando',
          body: [
            {
              type: 'assign',
              name: 'pontos',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:scatterDecor',
              count: {
                type: 'num',
                value: 20,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'cristal',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'torre',
              x: {
                type: 'num',
                value: 8,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 8,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'torre',
              x: {
                type: 'num',
                value: -8,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 8,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'torre',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: -10,
              },
            },
            {
              type: 'g3k:startSpawner',
              mold: 'invasor',
              seconds: {
                type: 'num',
                value: 2,
              },
              where: 'edge',
            },
            {
              type: 'g3k:cameraTop',
              height: {
                type: 'num',
                value: 45,
              },
            },
          ],
        },
        {
          type: 'g3k:onEnterEntityState',
          mold: 'torre',
          state: 'atirar',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:spawnFrom',
              mold: 'tiro',
              fromVar: 'ela',
            },
            {
              type: 'g3k:playEffect',
              fx: 'laser',
            },
            {
              type: 'g3k:setEntityState',
              charVar: 'ela',
              state: 'recarregar',
            },
          ],
        },
        {
          type: 'g3k:onEntityDeath',
          mold: 'invasor',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:burstOn',
              effect: 'explosao',
              charVar: 'ela',
            },
            {
              type: 'g3k:playEffect',
              fx: 'explosion',
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
              type: 'if',
              cond: {
                type: 'binop',
                op: '>=',
                left: {
                  type: 'var',
                  name: 'pontos',
                },
                right: {
                  type: 'num',
                  value: 15,
                },
              },
              then: [
                {
                  type: 'g3k:setState',
                  name: 'vitoria',
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onEntityDeath',
          mold: 'cristal',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:burstOn',
              effect: 'explosao',
              charVar: 'ela',
            },
            {
              type: 'g3k:playEffect',
              fx: 'gameover',
            },
            {
              type: 'g3k:endGame',
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'torre',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:storeNearest',
              varName: 'alvo',
              mold: 'invasor',
              charVar: 'ela',
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '&&',
                left: {
                  type: 'g3k:exists',
                  charVar: 'alvo',
                },
                right: {
                  type: 'g3k:touches',
                  aVar: 'ela',
                  bVar: 'alvo',
                  dist: {
                    type: 'num',
                    value: 14,
                  },
                },
              },
              then: [
                {
                  type: 'g3k:setEntityState',
                  charVar: 'ela',
                  state: 'mirar',
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'torre',
          state: 'mirar',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:storeNearest',
              varName: 'alvo',
              mold: 'invasor',
              charVar: 'ela',
            },
            {
              type: 'if',
              cond: {
                type: 'logicalNot',
                value: {
                  type: 'g3k:exists',
                  charVar: 'alvo',
                },
              },
              then: [
                {
                  type: 'g3k:setEntityState',
                  charVar: 'ela',
                  state: 'parado',
                },
              ],
              else: [
                {
                  type: 'g3k:aimAt',
                  charVar: 'ela',
                  targetVar: 'alvo',
                  smooth: {
                    type: 'num',
                    value: 6,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g3k:isAimingAt',
                    aVar: 'ela',
                    bVar: 'alvo',
                  },
                  then: [
                    {
                      type: 'g3k:setEntityState',
                      charVar: 'ela',
                      state: 'atirar',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'invasor',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:storeNearest',
              varName: 'alvo',
              mold: 'cristal',
              charVar: 'ela',
            },
            {
              type: 'if',
              cond: {
                type: 'g3k:exists',
                charVar: 'alvo',
              },
              then: [
                {
                  type: 'g3k:seek',
                  charVar: 'ela',
                  targetVar: 'alvo',
                },
                {
                  type: 'g3k:faceVelocity',
                  charVar: 'ela',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g3k:touches',
                    aVar: 'ela',
                    bVar: 'alvo',
                    dist: {
                      type: 'num',
                      value: 2,
                    },
                  },
                  then: [
                    {
                      type: 'g3k:hurt',
                      charVar: 'alvo',
                      amount: {
                        type: 'num',
                        value: 15,
                      },
                    },
                    {
                      type: 'g3k:burstOn',
                      effect: 'explosao',
                      charVar: 'ela',
                    },
                    {
                      type: 'g3k:recycle',
                      charVar: 'ela',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'tiro',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:moveForward',
              charVar: 'ela',
              speed: {
                type: 'num',
                value: 18,
              },
            },
            {
              type: 'g3k:forEachNear',
              charVar: 'ela',
              mold: 'invasor',
              radius: {
                type: 'num',
                value: 1.5,
              },
              itemName: 'vitima',
              body: [
                {
                  type: 'g3k:hurt',
                  charVar: 'vitima',
                  amount: {
                    type: 'num',
                    value: 15,
                  },
                },
                {
                  type: 'g3k:burstOn',
                  effect: 'faisca',
                  charVar: 'vitima',
                },
                {
                  type: 'g3k:recycle',
                  charVar: 'ela',
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:cullFar',
              mold: 'tiro',
              dist: {
                type: 'num',
                value: 40,
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'top-left',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Derrotados: ',
                },
                right: {
                  type: 'var',
                  name: 'pontos',
                },
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'top-right',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Invasores: ',
                },
                right: {
                  type: 'g3k:countAlive',
                  mold: 'invasor',
                },
              },
            },
          ],
        },
      ],
    },
  },
}

/**
 * Exemplo da vitrine "Salto nas Nuvens" — um mini-plataforma 3D: o herói pula
 * de plataforma sólida em plataforma sólida (física de verdade: gravidade +
 * pulo + colisão), junta moedas girando (brilho no material), deixa um rastro
 * de poeira (emissor contínuo) e a câmera o segue. Exercita a LARGURA nova da
 * v0.2.0: física/plataforma, formas & material, luz de ambiente, emissor
 * contínuo, câmera seguidora — tudo 100% asset-free.
 *
 * ⚠️ IR GERADA pelo parser real (fonte em __tests__/platformerExample.test.ts).
 */
export const saltoNasNuvensExample: ExtensionExample = {
  name: 'Salto nas Nuvens',
  experience: 'game',
  description:
    'Um mini-plataforma 3D com física de verdade: pule entre as plataformas sólidas, junte as moedas girantes e siga o herói com a câmera. Mostra a gravidade, o pulo, o mundo sólido e um rastro de partículas.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-3d-advanced' }],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g3k:setup',
          w: {
            type: 'num',
            value: 1280,
          },
          h: {
            type: 'num',
            value: 720,
          },
          world: {
            type: 'num',
            value: 60,
          },
          sky: '#0b1026',
          ground: '#1e293b',
        },
        {
          type: 'g3k:setEffects',
          shadows: true,
          bloom: true,
          strength: {
            type: 'num',
            value: 1.1,
          },
          vignette: true,
        },
        {
          type: 'g3k:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Salto nas Nuvens',
          },
          text: {
            type: 'str',
            value: 'Pule de plataforma em plataforma e junte as moedas. Cuidado para não cair!',
          },
          button: {
            type: 'str',
            value: 'Pular',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'Você juntou tudo!',
          },
          text: {
            type: 'str',
            value: 'Que pulos!',
          },
          button: {
            type: 'str',
            value: 'Jogar de novo',
          },
        },
        {
          type: 'g3k:defineMold',
          name: 'heroi',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#38bdf8',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.9,
              },
              h: {
                type: 'num',
                value: 1.1,
              },
              d: {
                type: 'num',
                value: 0.9,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.55,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'normal',
              color: '#e0f2fe',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.7,
              },
              h: {
                type: 'num',
                value: 0.7,
              },
              d: {
                type: 'num',
                value: 0.7,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.3,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'chao',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#334155',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 4,
              },
              h: {
                type: 'num',
                value: 0.6,
              },
              d: {
                type: 'num',
                value: 4,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'moeda',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'torus',
              material: 'brilho',
              color: '#fde047',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.7,
              },
              h: {
                type: 'num',
                value: 0.7,
              },
              d: {
                type: 'num',
                value: 0.3,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:makeSolid',
          mold: 'chao',
        },
        {
          type: 'g3k:defineEmitter',
          name: 'poeira',
          colorFrom: '#e0f2fe',
          colorTo: '#38bdf8',
          sizeFrom: {
            type: 'num',
            value: 0.35,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          rate: {
            type: 'num',
            value: 18,
          },
          speed: {
            type: 'num',
            value: 1.5,
          },
          cone: {
            type: 'num',
            value: 40,
          },
          gravity: {
            type: 'num',
            value: -3,
          },
          glow: true,
          curve: 'suave',
        },
        {
          type: 'g3k:defineEffect',
          name: 'brilho',
          count: {
            type: 'num',
            value: 16,
          },
          colorFrom: '#fde047',
          colorTo: '#f97316',
          spread: {
            type: 'num',
            value: 4,
          },
          sizeFrom: {
            type: 'num',
            value: 0.4,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.5,
          },
          gravity: {
            type: 'num',
            value: 2,
          },
        },
        {
          type: 'var',
          name: 'moedas',
          value: {
            type: 'num',
            value: 0,
          },
        },
      ],
      events: [
        {
          type: 'g3k:onEnterState',
          name: 'jogando',
          body: [
            {
              type: 'assign',
              name: 'moedas',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:setAmbient',
              intensity: {
                type: 'num',
                value: 0.5,
              },
            },
            {
              type: 'g3k:addLight',
              color: '#fef3c7',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 16,
              },
              z: {
                type: 'num',
                value: 6,
              },
              intensity: {
                type: 'num',
                value: 1.2,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'chao',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'chao',
              x: {
                type: 'num',
                value: 7,
              },
              y: {
                type: 'num',
                value: 1.5,
              },
              z: {
                type: 'num',
                value: -2,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'chao',
              x: {
                type: 'num',
                value: -7,
              },
              y: {
                type: 'num',
                value: 3,
              },
              z: {
                type: 'num',
                value: 2,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'chao',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 4.5,
              },
              z: {
                type: 'num',
                value: -8,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'moeda',
              x: {
                type: 'num',
                value: 7,
              },
              y: {
                type: 'num',
                value: 3,
              },
              z: {
                type: 'num',
                value: -2,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'moeda',
              x: {
                type: 'num',
                value: -7,
              },
              y: {
                type: 'num',
                value: 4.5,
              },
              z: {
                type: 'num',
                value: 2,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'moeda',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 6,
              },
              z: {
                type: 'num',
                value: -8,
              },
            },
            {
              type: 'g3k:spawnNamed',
              varName: 'heroi',
              mold: 'heroi',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 3,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:cameraFollow',
              charVar: 'heroi',
              dist: {
                type: 'num',
                value: 12,
              },
              height: {
                type: 'num',
                value: 6,
              },
            },
            {
              type: 'g3k:emitterOn',
              effect: 'poeira',
              charVar: 'heroi',
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'heroi',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:platformerKeys',
              charVar: 'ela',
              speed: {
                type: 'num',
                value: 8,
              },
              jump: {
                type: 'num',
                value: 11,
              },
            },
            {
              type: 'g3k:forEachNear',
              charVar: 'ela',
              mold: 'moeda',
              radius: {
                type: 'num',
                value: 1.4,
              },
              itemName: 'm',
              body: [
                {
                  type: 'g3k:burstOn',
                  effect: 'brilho',
                  charVar: 'm',
                },
                {
                  type: 'g3k:recycle',
                  charVar: 'm',
                },
                {
                  type: 'assign',
                  name: 'moedas',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'moedas',
                    },
                    right: {
                      type: 'num',
                      value: 1,
                    },
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: {
                      type: 'var',
                      name: 'moedas',
                    },
                    right: {
                      type: 'num',
                      value: 3,
                    },
                  },
                  then: [
                    {
                      type: 'g3k:setState',
                      name: 'vitoria',
                    },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<',
                left: {
                  type: 'g3k:posOf',
                  axis: 'y',
                  charVar: 'ela',
                },
                right: {
                  type: 'num',
                  value: -12,
                },
              },
              then: [
                {
                  type: 'g3k:setState',
                  name: 'menu',
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'moeda',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:setYaw',
              charVar: 'ela',
              degrees: {
                type: 'binop',
                op: '*',
                left: {
                  type: 'g3k:stateTime',
                  charVar: 'ela',
                },
                right: {
                  type: 'num',
                  value: 120,
                },
              },
            },
          ],
        },
        {
          type: 'g3k:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:hudText',
              slot: 'top-left',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Moedas: ',
                },
                right: {
                  type: 'var',
                  name: 'moedas',
                },
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'top-right',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Faltam: ',
                },
                right: {
                  type: 'binop',
                  op: '-',
                  left: {
                    type: 'num',
                    value: 3,
                  },
                  right: {
                    type: 'var',
                    name: 'moedas',
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },
}

/**
 * Exemplo da vitrine "Parkour do Vulcão" — o SANDBOX de física da v0.3.0 num
 * jogo só: colisor de CÁPSULA (não engancha em quina), RAMPA que se sobe,
 * ELEVADOR sólido que anda e CARREGA o herói, TRAMPOLIM que quica, chão com
 * ATRITO, GEMAS como zona (dispara ao encostar, sem empurrar), emissor de
 * poeira NÃO-brilhante seguindo o herói (fumaça com curva assada) e semente
 * fixa (a partida é sempre igual). 100% asset-free.
 *
 * ⚠️ IR GERADA pelo parser real (fonte em __tests__/parkourExample.test.ts).
 */
export const parkourDoVulcaoExample: ExtensionExample = {
  name: 'Parkour do Vulcão',
  experience: 'game',
  description:
    'Um parkour 3D com física de verdade: suba a rampa, pegue carona no elevador, quique no trampolim e junte as 3 gemas. Mostra cápsula, rampa, plataforma móvel, quique, atrito e zonas.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-3d-advanced' }],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g3k:setup',
          w: {
            type: 'num',
            value: 1280,
          },
          h: {
            type: 'num',
            value: 720,
          },
          world: {
            type: 'num',
            value: 60,
          },
          sky: '#0b1026',
          ground: '#1e293b',
        },
        {
          type: 'g3k:setEffects',
          shadows: true,
          bloom: true,
          strength: {
            type: 'num',
            value: 1.1,
          },
          vignette: true,
        },
        {
          type: 'g3k:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Parkour do Vulcão',
          },
          text: {
            type: 'str',
            value:
              'Suba a rampa, pegue carona no elevador e junte as 3 gemas. O trampolim te joga longe!',
          },
          button: {
            type: 'str',
            value: 'Escalar',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'Você pegou todas!',
          },
          text: {
            type: 'str',
            value: 'Que parkour!',
          },
          button: {
            type: 'str',
            value: 'Escalar de novo',
          },
        },
        {
          type: 'g3k:defineMold',
          name: 'heroi',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#38bdf8',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.9,
              },
              h: {
                type: 'num',
                value: 1.1,
              },
              d: {
                type: 'num',
                value: 0.9,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.55,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'normal',
              color: '#e0f2fe',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.7,
              },
              h: {
                type: 'num',
                value: 0.7,
              },
              d: {
                type: 'num',
                value: 0.7,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.3,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'chao',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#334155',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 8,
              },
              h: {
                type: 'num',
                value: 0.6,
              },
              d: {
                type: 'num',
                value: 8,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'rampa',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'rampa',
              material: 'normal',
              color: '#475569',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 4,
              },
              h: {
                type: 'num',
                value: 3,
              },
              d: {
                type: 'num',
                value: 8,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'elevador',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 2,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'metal',
              color: '#64748b',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 3,
              },
              h: {
                type: 'num',
                value: 0.5,
              },
              d: {
                type: 'num',
                value: 3,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'trampolim',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'brilho',
              color: '#22c55e',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 2.5,
              },
              h: {
                type: 'num',
                value: 0.4,
              },
              d: {
                type: 'num',
                value: 2.5,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'gema',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'torus',
              material: 'brilho',
              color: '#fde047',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.8,
              },
              h: {
                type: 'num',
                value: 0.8,
              },
              d: {
                type: 'num',
                value: 0.4,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:setCollider',
          mold: 'heroi',
          shape: 'capsule',
        },
        {
          type: 'g3k:makeSolid',
          mold: 'chao',
        },
        {
          type: 'g3k:makeSolid',
          mold: 'rampa',
        },
        {
          type: 'g3k:makeSolid',
          mold: 'elevador',
        },
        {
          type: 'g3k:makeSolid',
          mold: 'trampolim',
        },
        {
          type: 'g3k:setBounce',
          mold: 'trampolim',
          amount: {
            type: 'num',
            value: 0.9,
          },
        },
        {
          type: 'g3k:setFriction',
          mold: 'chao',
          amount: {
            type: 'num',
            value: 0.3,
          },
        },
        {
          type: 'g3k:makeTrigger',
          mold: 'gema',
        },
        {
          type: 'g3k:defineEmitter',
          name: 'poeira',
          colorFrom: '#e0f2fe',
          colorTo: '#64748b',
          sizeFrom: {
            type: 'num',
            value: 0.3,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          rate: {
            type: 'num',
            value: 14,
          },
          speed: {
            type: 'num',
            value: 1.2,
          },
          cone: {
            type: 'num',
            value: 45,
          },
          gravity: {
            type: 'num',
            value: -2,
          },
          glow: false,
          curve: 'suave',
        },
        {
          type: 'g3k:defineEffect',
          name: 'brilho',
          count: {
            type: 'num',
            value: 18,
          },
          colorFrom: '#fde047',
          colorTo: '#f97316',
          spread: {
            type: 'num',
            value: 4,
          },
          sizeFrom: {
            type: 'num',
            value: 0.4,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.5,
          },
          gravity: {
            type: 'num',
            value: 2,
          },
        },
        {
          type: 'var',
          name: 'gemas',
          value: {
            type: 'num',
            value: 0,
          },
        },
      ],
      events: [
        {
          type: 'g3k:onEnterState',
          name: 'jogando',
          body: [
            {
              type: 'assign',
              name: 'gemas',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:setSeed',
              seed: {
                type: 'num',
                value: 7,
              },
            },
            {
              type: 'g3k:setAmbient',
              intensity: {
                type: 'num',
                value: 0.45,
              },
            },
            {
              type: 'g3k:addLight',
              color: '#fca5a5',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 14,
              },
              z: {
                type: 'num',
                value: -10,
              },
              intensity: {
                type: 'num',
                value: 1.4,
              },
            },
            {
              type: 'g3k:setFog',
              color: '#0b1026',
              near: {
                type: 'num',
                value: 30,
              },
              far: {
                type: 'num',
                value: 90,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'chao',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'rampa',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.3,
              },
              z: {
                type: 'num',
                value: 8,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'trampolim',
              x: {
                type: 'num',
                value: -8,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'gema',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 4.5,
              },
              z: {
                type: 'num',
                value: 12,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'gema',
              x: {
                type: 'num',
                value: -8,
              },
              y: {
                type: 'num',
                value: 7,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'gema',
              x: {
                type: 'num',
                value: 9,
              },
              y: {
                type: 'num',
                value: 5,
              },
              z: {
                type: 'num',
                value: -6,
              },
            },
            {
              type: 'g3k:spawnNamed',
              varName: 'elevador',
              mold: 'elevador',
              x: {
                type: 'num',
                value: 9,
              },
              y: {
                type: 'num',
                value: 2,
              },
              z: {
                type: 'num',
                value: -6,
              },
            },
            {
              type: 'g3k:setVelocity',
              charVar: 'elevador',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 2,
              },
            },
            {
              type: 'g3k:spawnNamed',
              varName: 'heroi',
              mold: 'heroi',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 2,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:cameraFollow',
              charVar: 'heroi',
              dist: {
                type: 'num',
                value: 12,
              },
              height: {
                type: 'num',
                value: 6,
              },
            },
            {
              type: 'g3k:emitterOn',
              effect: 'poeira',
              charVar: 'heroi',
            },
          ],
        },
        {
          type: 'g3k:onOverlap',
          mold: 'gema',
          zoneName: 'zona',
          whoName: 'quem',
          body: [
            {
              type: 'g3k:burstOn',
              effect: 'brilho',
              charVar: 'zona',
            },
            {
              type: 'g3k:playEffect',
              fx: 'coin',
            },
            {
              type: 'g3k:recycle',
              charVar: 'zona',
            },
            {
              type: 'assign',
              name: 'gemas',
              value: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'var',
                  name: 'gemas',
                },
                right: {
                  type: 'num',
                  value: 1,
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>=',
                left: {
                  type: 'var',
                  name: 'gemas',
                },
                right: {
                  type: 'num',
                  value: 3,
                },
              },
              then: [
                {
                  type: 'g3k:setState',
                  name: 'vitoria',
                },
              ],
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'elevador',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>',
                left: {
                  type: 'g3k:posOf',
                  axis: 'z',
                  charVar: 'ela',
                },
                right: {
                  type: 'num',
                  value: 2,
                },
              },
              then: [
                {
                  type: 'g3k:setVelocity',
                  charVar: 'ela',
                  x: {
                    type: 'num',
                    value: 0,
                  },
                  y: {
                    type: 'num',
                    value: 0,
                  },
                  z: {
                    type: 'num',
                    value: -2,
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<',
                left: {
                  type: 'g3k:posOf',
                  axis: 'z',
                  charVar: 'ela',
                },
                right: {
                  type: 'num',
                  value: -10,
                },
              },
              then: [
                {
                  type: 'g3k:setVelocity',
                  charVar: 'ela',
                  x: {
                    type: 'num',
                    value: 0,
                  },
                  y: {
                    type: 'num',
                    value: 0,
                  },
                  z: {
                    type: 'num',
                    value: 2,
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'gema',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:setYaw',
              charVar: 'ela',
              degrees: {
                type: 'binop',
                op: '*',
                left: {
                  type: 'g3k:stateTime',
                  charVar: 'ela',
                },
                right: {
                  type: 'num',
                  value: 90,
                },
              },
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'heroi',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:platformerKeys',
              charVar: 'ela',
              speed: {
                type: 'num',
                value: 8,
              },
              jump: {
                type: 'num',
                value: 11,
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<',
                left: {
                  type: 'g3k:posOf',
                  axis: 'y',
                  charVar: 'ela',
                },
                right: {
                  type: 'num',
                  value: -12,
                },
              },
              then: [
                {
                  type: 'g3k:setState',
                  name: 'menu',
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:hudText',
              slot: 'top-left',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Gemas: ',
                  },
                  right: {
                    type: 'var',
                    name: 'gemas',
                  },
                },
                right: {
                  type: 'str',
                  value: '/3',
                },
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'top-right',
              text: {
                type: 'str',
                value: 'WASD anda, espaço pula',
              },
            },
          ],
        },
      ],
    },
  },
}

/**
 * Exemplo da vitrine "Quadra Maluca" (v0.4.0) — a prova viva dos três consertos
 * deste lote, num jogo que a criança de fato joga:
 *
 * 1. ⭐ WASD RELATIVO À CÂMERA: a câmera é de órbita e a criança ARRASTA o mouse
 *    para girar — e o W continua entrando na tela. Antes o WASD andava por eixo
 *    FIXO do mundo: nesta câmera sairia 40° torto, e numa que segue sairia o
 *    contrário exato ("a impressão que tenho é que está ao contrário").
 * 2. ⭐ QUIQUE DOS DOIS LADOS: as bolas quicam no CHÃO COMUM do mundo — o que era
 *    literalmente inexprimível antes (o quique só existia na superfície, e o
 *    piso-base não quicava nada). O herói, "personagem", não quica em lugar
 *    nenhum, e ainda assim pisa nas mesmas coisas.
 * 3. TIPOS DE FÍSICA: um bloco por molde (personagem/bola/caixa/gelo) e cada
 *    coisa já se comporta como o que ela é — inclusive o rinque de gelo, que
 *    escorrega porque o atrito também é dos dois lados.
 *
 * Exercita ainda: câmera olhando uma ENTIDADE (antes era cravada no meio do
 * mundo), tremor no impacto, zonas, faíscas, semente, HUD e som.
 *
 * ⚠️ A IR abaixo foi GERADA pelo parser real (ver __gen_quicaram.ts); o drift
 * test em __tests__/quicaramExample.test.ts guarda o resultado.
 */
export const quadraMalucaExample: ExtensionExample = {
  name: 'Quadra Maluca',
  experience: 'game',
  description:
    'Arraste o mouse para girar a câmera: o WASD anda sempre para onde você olha. Cinco bolas malucas quicam pelo chão, o rinque de gelo escorrega e os caixotes não saem do lugar: cada coisa com a física dela.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-3d-advanced' }],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g3k:setup',
          w: {
            type: 'num',
            value: 1280,
          },
          h: {
            type: 'num',
            value: 720,
          },
          world: {
            type: 'num',
            value: 50,
          },
          sky: '#1e1b4b',
          ground: '#4c1d95',
        },
        {
          type: 'g3k:setEffects',
          shadows: true,
          bloom: true,
          strength: {
            type: 'num',
            value: 1.2,
          },
          vignette: true,
        },
        {
          type: 'g3k:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Quadra Maluca',
          },
          text: {
            type: 'str',
            value:
              'Arraste o mouse para girar a câmera: o WASD anda SEMPRE para onde você está olhando. Encoste nas 5 bolas quicantes, mas cuidado: o gelo escorrega!',
          },
          button: {
            type: 'str',
            value: 'Jogar',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'Pegou todas!',
          },
          text: {
            type: 'str',
            value: 'Você domou as bolas malucas.',
          },
          button: {
            type: 'str',
            value: 'Jogar de novo',
          },
        },
        {
          type: 'g3k:defineMold',
          name: 'heroi',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#22d3ee',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.9,
              },
              h: {
                type: 'num',
                value: 1.1,
              },
              d: {
                type: 'num',
                value: 0.9,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.55,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'normal',
              color: '#cffafe',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.7,
              },
              h: {
                type: 'num',
                value: 0.7,
              },
              d: {
                type: 'num',
                value: 0.7,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.3,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'brilho',
              color: '#facc15',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.3,
              },
              h: {
                type: 'num',
                value: 0.5,
              },
              d: {
                type: 'num',
                value: 0.3,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.9,
              },
              z: {
                type: 'num',
                value: 0.5,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'bola',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'brilho',
              color: '#fb7185',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1.1,
              },
              h: {
                type: 'num',
                value: 1.1,
              },
              d: {
                type: 'num',
                value: 1.1,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.55,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'caixote',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#a16207',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 2,
              },
              h: {
                type: 'num',
                value: 2,
              },
              d: {
                type: 'num',
                value: 2,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'gelo',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'metal',
              color: '#e0f2fe',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 12,
              },
              h: {
                type: 'num',
                value: 0.5,
              },
              d: {
                type: 'num',
                value: 12,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.25,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:setPhysics',
          mold: 'heroi',
          kind: 'personagem',
        },
        {
          type: 'g3k:setPhysics',
          mold: 'bola',
          kind: 'bola',
        },
        {
          type: 'g3k:setPhysics',
          mold: 'caixote',
          kind: 'caixa',
        },
        {
          type: 'g3k:setPhysics',
          mold: 'gelo',
          kind: 'gelo',
        },
        {
          type: 'g3k:makeSolid',
          mold: 'gelo',
        },
        {
          type: 'g3k:makeSolid',
          mold: 'caixote',
        },
        {
          type: 'g3k:makeTrigger',
          mold: 'bola',
        },
        {
          type: 'g3k:defineEffect',
          name: 'plim',
          count: {
            type: 'num',
            value: 24,
          },
          colorFrom: '#fb7185',
          colorTo: '#4c1d95',
          spread: {
            type: 'num',
            value: 6,
          },
          sizeFrom: {
            type: 'num',
            value: 0.5,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.6,
          },
          gravity: {
            type: 'num',
            value: 3,
          },
        },
        {
          type: 'var',
          name: 'pegou',
          value: {
            type: 'num',
            value: 0,
          },
        },
      ],
      events: [
        {
          type: 'g3k:onEnterState',
          name: 'jogando',
          body: [
            {
              type: 'assign',
              name: 'pegou',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:setSeed',
              seed: {
                type: 'num',
                value: 11,
              },
            },
            {
              type: 'g3k:setAmbient',
              intensity: {
                type: 'num',
                value: 0.5,
              },
            },
            {
              type: 'g3k:setFog',
              color: '#1e1b4b',
              near: {
                type: 'num',
                value: 35,
              },
              far: {
                type: 'num',
                value: 95,
              },
            },
            {
              type: 'g3k:addLight',
              color: '#a5b4fc',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 16,
              },
              z: {
                type: 'num',
                value: 0,
              },
              intensity: {
                type: 'num',
                value: 1.5,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'gelo',
              x: {
                type: 'num',
                value: 13,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'caixote',
              x: {
                type: 'num',
                value: -8,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 6,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'caixote',
              x: {
                type: 'num',
                value: 5,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: -9,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'caixote',
              x: {
                type: 'num',
                value: -3,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: -6,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'bola',
              x: {
                type: 'num',
                value: -6,
              },
              y: {
                type: 'num',
                value: 12,
              },
              z: {
                type: 'num',
                value: -2,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'bola',
              x: {
                type: 'num',
                value: 2,
              },
              y: {
                type: 'num',
                value: 15,
              },
              z: {
                type: 'num',
                value: 4,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'bola',
              x: {
                type: 'num',
                value: 8,
              },
              y: {
                type: 'num',
                value: 11,
              },
              z: {
                type: 'num',
                value: -5,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'bola',
              x: {
                type: 'num',
                value: 14,
              },
              y: {
                type: 'num',
                value: 13,
              },
              z: {
                type: 'num',
                value: 3,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'bola',
              x: {
                type: 'num',
                value: -10,
              },
              y: {
                type: 'num',
                value: 16,
              },
              z: {
                type: 'num',
                value: 8,
              },
            },
            {
              type: 'g3k:spawnNamed',
              varName: 'heroi',
              mold: 'heroi',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1,
              },
              z: {
                type: 'num',
                value: 8,
              },
            },
            {
              type: 'g3k:cameraOrbit',
              dist: {
                type: 'num',
                value: 26,
              },
            },
            {
              type: 'g3k:cameraLookAt',
              charVar: 'heroi',
            },
            {
              type: 'g3k:cameraAngle',
              az: {
                type: 'num',
                value: 40,
              },
              el: {
                type: 'num',
                value: 26,
              },
            },
          ],
        },
        {
          type: 'g3k:onOverlap',
          mold: 'bola',
          zoneName: 'zona',
          whoName: 'quem',
          body: [
            {
              type: 'if',
              cond: {
                type: 'g3k:isMold',
                charVar: 'quem',
                mold: 'heroi',
              },
              then: [
                {
                  type: 'g3k:burstOn',
                  effect: 'plim',
                  charVar: 'zona',
                },
                {
                  type: 'g3k:playEffect',
                  fx: 'coin',
                },
                {
                  type: 'g3k:cameraShake',
                  strength: {
                    type: 'num',
                    value: 0.3,
                  },
                  seconds: {
                    type: 'num',
                    value: 0.25,
                  },
                },
                {
                  type: 'g3k:recycle',
                  charVar: 'zona',
                },
                {
                  type: 'assign',
                  name: 'pegou',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'pegou',
                    },
                    right: {
                      type: 'num',
                      value: 1,
                    },
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: {
                      type: 'var',
                      name: 'pegou',
                    },
                    right: {
                      type: 'num',
                      value: 5,
                    },
                  },
                  then: [
                    {
                      type: 'g3k:setState',
                      name: 'vitoria',
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
          type: 'g3k:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:hudText',
              slot: 'top-left',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Bolas: ',
                  },
                  right: {
                    type: 'var',
                    name: 'pegou',
                  },
                },
                right: {
                  type: 'str',
                  value: '/5',
                },
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'top-right',
              text: {
                type: 'str',
                value: 'Arraste o mouse · ande com WASD',
              },
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'heroi',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:platformerKeys',
              charVar: 'ela',
              speed: {
                type: 'num',
                value: 7,
              },
              jump: {
                type: 'num',
                value: 10,
              },
            },
            {
              type: 'g3k:faceVelocity',
              charVar: 'ela',
            },
          ],
        },
      ],
    },
  },
}

/**
 * Exemplo da vitrine "Guardião do Portal" (v0.5.0) — a vitrine do que este lote
 * abriu, num jogo que a criança joga:
 *
 * - ⏱️ CRONÔMETRO: segurar por 30 s e a condição de vitória (o "Quando o tempo
 *   acabar"). Antes não existia bloco de tempo NENHUM para ela.
 * - 💬 FALA: o guardião fala em cima da própria cabeça e o balão acompanha ele
 *   pela tela — o jogo passa a contar história, em vez de só ter placar nos
 *   cantos.
 * - 🎲 SORTEIO SEMEADO: as pedras caem em lugar sorteado, mas a semente faz a
 *   partida se repetir IGUAL. Com o bloco de acaso do NÚCLEO isso seria
 *   impossível — ele ignora a semente, e era essa a promessa quebrada.
 * - 🏀 FÍSICA POR TIPO + tremor da câmera no impacto, e a FSM do curso
 *   (nearest + exists + seek) movendo o enxame.
 *
 * ⚠️ A animação de modelo .glb NÃO entra aqui de propósito: os modelos pesam MB e
 * estourariam a cota de assets. Ela é provada por TESTE (model.test.ts, com um
 * .glb mínimo montado na hora) — o mesmo veredito do V9/P6 no núcleo.
 *
 * A IR abaixo foi GERADA pelo parser real (ver __gen_guardiao.ts); o drift test
 * em __tests__/guardiaoExample.test.ts guarda o resultado.
 */
export const guardiaoDoPortalExample: ExtensionExample = {
  name: 'Guardião do Portal',
  experience: 'game',
  description:
    'Segure os invasores por 30 segundos! O guardião fala, a câmera treme no impacto, as pedras quicam. E a semente faz a partida se repetir igualzinha.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-3d-advanced' }],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g3k:setup',
          w: {
            type: 'num',
            value: 1280,
          },
          h: {
            type: 'num',
            value: 720,
          },
          world: {
            type: 'num',
            value: 60,
          },
          sky: '#082f49',
          ground: '#134e4a',
        },
        {
          type: 'g3k:setEffects',
          shadows: true,
          bloom: true,
          strength: {
            type: 'num',
            value: 1.2,
          },
          vignette: true,
        },
        {
          type: 'g3k:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Guardião do Portal',
          },
          text: {
            type: 'str',
            value:
              'Segure os invasores por 30 segundos! Fale com eles, tremam as pedras. E o acaso é sempre o mesmo, por causa da semente.',
          },
          button: {
            type: 'str',
            value: 'Guardar',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'O portal resistiu!',
          },
          text: {
            type: 'str',
            value: 'Você segurou até o fim.',
          },
          button: {
            type: 'str',
            value: 'Guardar de novo',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'fim',
          title: {
            type: 'str',
            value: 'O portal caiu...',
          },
          text: {
            type: 'str',
            value: 'Os invasores passaram.',
          },
          button: {
            type: 'str',
            value: 'Tentar de novo',
          },
        },
        {
          type: 'g3k:defineMold',
          name: 'portal',
          health: {
            type: 'num',
            value: 100,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'torus',
              material: 'brilho',
              color: '#22d3ee',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 4,
              },
              h: {
                type: 'num',
                value: 4,
              },
              d: {
                type: 'num',
                value: 0.8,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 2.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#0e7490',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 3,
              },
              h: {
                type: 'num',
                value: 0.5,
              },
              d: {
                type: 'num',
                value: 3,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'guardiao',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#38bdf8',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.9,
              },
              h: {
                type: 'num',
                value: 1.2,
              },
              d: {
                type: 'num',
                value: 0.9,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.6,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'normal',
              color: '#e0f2fe',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.7,
              },
              h: {
                type: 'num',
                value: 0.7,
              },
              d: {
                type: 'num',
                value: 0.7,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.4,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'brilho',
              color: '#facc15',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.3,
              },
              h: {
                type: 'num',
                value: 0.5,
              },
              d: {
                type: 'num',
                value: 0.3,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1,
              },
              z: {
                type: 'num',
                value: 0.5,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'invasor',
          health: {
            type: 'num',
            value: 20,
          },
          speed: {
            type: 'num',
            value: 4,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'normal',
              color: '#f43f5e',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1,
              },
              h: {
                type: 'num',
                value: 1,
              },
              d: {
                type: 'num',
                value: 1,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'normal',
              color: '#881337',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.6,
              },
              h: {
                type: 'num',
                value: 0.7,
              },
              d: {
                type: 'num',
                value: 0.6,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.3,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'pedra',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'normal',
              color: '#a8a29e',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1.4,
              },
              h: {
                type: 'num',
                value: 1.4,
              },
              d: {
                type: 'num',
                value: 1.4,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:setPhysics',
          mold: 'guardiao',
          kind: 'personagem',
        },
        {
          type: 'g3k:setPhysics',
          mold: 'pedra',
          kind: 'bola',
        },
        {
          type: 'g3k:showHealthBar',
          mold: 'portal',
          on: true,
        },
        {
          type: 'g3k:defineEffect',
          name: 'poeira',
          count: {
            type: 'num',
            value: 20,
          },
          colorFrom: '#f43f5e',
          colorTo: '#082f49',
          spread: {
            type: 'num',
            value: 6,
          },
          sizeFrom: {
            type: 'num',
            value: 0.5,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.6,
          },
          gravity: {
            type: 'num',
            value: 2,
          },
        },
        {
          type: 'var',
          name: 'segurou',
          value: {
            type: 'num',
            value: 0,
          },
        },
      ],
      events: [
        {
          type: 'g3k:onEnterState',
          name: 'jogando',
          body: [
            {
              type: 'assign',
              name: 'segurou',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:setSeed',
              seed: {
                type: 'num',
                value: 9,
              },
            },
            {
              type: 'g3k:setAmbient',
              intensity: {
                type: 'num',
                value: 0.5,
              },
            },
            {
              type: 'g3k:setFog',
              color: '#082f49',
              near: {
                type: 'num',
                value: 30,
              },
              far: {
                type: 'num',
                value: 90,
              },
            },
            {
              type: 'g3k:startTimer',
              seconds: {
                type: 'num',
                value: 30,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'portal',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:spawnNamed',
              varName: 'heroi',
              mold: 'guardiao',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1,
              },
              z: {
                type: 'num',
                value: 8,
              },
            },
            {
              type: 'g3k:cameraFollow',
              charVar: 'heroi',
              dist: {
                type: 'num',
                value: 14,
              },
              height: {
                type: 'num',
                value: 7,
              },
            },
            {
              type: 'g3k:say',
              charVar: 'heroi',
              text: {
                type: 'str',
                value: 'Aguenta firme!',
              },
              seconds: {
                type: 'num',
                value: 3,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'pedra',
              x: {
                type: 'g3k:randomBetween',
                from: {
                  type: 'num',
                  value: -12,
                },
                to: {
                  type: 'num',
                  value: 12,
                },
              },
              y: {
                type: 'num',
                value: 10,
              },
              z: {
                type: 'g3k:randomBetween',
                from: {
                  type: 'num',
                  value: -12,
                },
                to: {
                  type: 'num',
                  value: 12,
                },
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'pedra',
              x: {
                type: 'g3k:randomBetween',
                from: {
                  type: 'num',
                  value: -12,
                },
                to: {
                  type: 'num',
                  value: 12,
                },
              },
              y: {
                type: 'num',
                value: 14,
              },
              z: {
                type: 'g3k:randomBetween',
                from: {
                  type: 'num',
                  value: -12,
                },
                to: {
                  type: 'num',
                  value: 12,
                },
              },
            },
            {
              type: 'g3k:startSpawner',
              mold: 'invasor',
              seconds: {
                type: 'num',
                value: 1.5,
              },
              where: 'edge',
            },
          ],
        },
        {
          type: 'g3k:onTimerEnd',
          body: [
            {
              type: 'g3k:setState',
              name: 'vitoria',
            },
          ],
        },
        {
          type: 'g3k:onEntityDeath',
          mold: 'portal',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:burstOn',
              effect: 'poeira',
              charVar: 'ela',
            },
            {
              type: 'g3k:playEffect',
              fx: 'gameover',
            },
            {
              type: 'g3k:endGame',
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g3k:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:hudText',
              slot: 'top-left',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Faltam: ',
                  },
                  right: {
                    type: 'mathUnary',
                    fn: 'ceil',
                    arg: {
                      type: 'g3k:timeLeft',
                    },
                  },
                },
                right: {
                  type: 'str',
                  value: 's',
                },
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'top-right',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Parados: ',
                },
                right: {
                  type: 'var',
                  name: 'segurou',
                },
              },
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'guardiao',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:platformerKeys',
              charVar: 'ela',
              speed: {
                type: 'num',
                value: 8,
              },
              jump: {
                type: 'num',
                value: 10,
              },
            },
            {
              type: 'g3k:faceVelocity',
              charVar: 'ela',
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'invasor',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:storeNearest',
              varName: 'alvo',
              mold: 'portal',
              charVar: 'ela',
            },
            {
              type: 'if',
              cond: {
                type: 'g3k:exists',
                charVar: 'alvo',
              },
              then: [
                {
                  type: 'g3k:seek',
                  charVar: 'ela',
                  targetVar: 'alvo',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g3k:touches',
                    aVar: 'ela',
                    bVar: 'alvo',
                    dist: {
                      type: 'num',
                      value: 2.2,
                    },
                  },
                  then: [
                    {
                      type: 'g3k:hurt',
                      charVar: 'alvo',
                      amount: {
                        type: 'num',
                        value: 15,
                      },
                    },
                    {
                      type: 'g3k:burstOn',
                      effect: 'poeira',
                      charVar: 'ela',
                    },
                    {
                      type: 'g3k:playEffect',
                      fx: 'hit',
                    },
                    {
                      type: 'g3k:recycle',
                      charVar: 'ela',
                    },
                  ],
                },
              ],
            },
            {
              type: 'g3k:faceVelocity',
              charVar: 'ela',
            },
            {
              type: 'g3k:forEachNear',
              charVar: 'ela',
              mold: 'guardiao',
              radius: {
                type: 'num',
                value: 1.6,
              },
              itemName: 'vizinho',
              body: [
                {
                  type: 'g3k:burstOn',
                  effect: 'poeira',
                  charVar: 'ela',
                },
                {
                  type: 'g3k:playEffect',
                  fx: 'hit',
                },
                {
                  type: 'g3k:cameraShake',
                  strength: {
                    type: 'num',
                    value: 0.25,
                  },
                  seconds: {
                    type: 'num',
                    value: 0.2,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g3k:randomChance',
                    percent: {
                      type: 'num',
                      value: 30,
                    },
                  },
                  then: [
                    {
                      type: 'g3k:say',
                      charVar: 'vizinho',
                      text: {
                        type: 'str',
                        value: 'Essa foi por pouco!',
                      },
                      seconds: {
                        type: 'num',
                        value: 1.5,
                      },
                    },
                  ],
                },
                {
                  type: 'g3k:recycle',
                  charVar: 'ela',
                },
                {
                  type: 'assign',
                  name: 'segurou',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'segurou',
                    },
                    right: {
                      type: 'num',
                      value: 1,
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  },
}

/**
 * Exemplo "Tiro ao Alvo" — o point-and-click do kit: alvos aparecem e fogem,
 * a criança CLICA para acertar (mousePressed + pick), o dourado vale 3 pela
 * gaveta da entidade, o aviso "acertou" toca som/treme a câmera, e uma tela
 * PRÓPRIA de dica abre com H. Cobre as famílias que nenhum outro exemplo
 * exercitava: mira & clique, avisos, tela própria, gaveta da entidade,
 * teclas por "apertada agora?", céu em runtime e lente/ângulo da câmera.
 *
 * A IR abaixo foi GERADA pelo parser real a partir do fonte em __gen_tiro.ts
 * (o drift test em __tests__/tiroExample.test.ts compara os dois). Se o parser
 * mudar a forma canônica, re-rode o gerador e cole aqui.
 */
export const tiroAoAlvoExample: ExtensionExample = {
  name: 'Tiro ao Alvo',
  experience: 'game',
  description:
    'Point-and-click: alvos aparecem e fogem, e cada CLIQUE certeiro vale pontos (o dourado vale 3). Tela de dica própria, aviso de acerto e lente de mira: feche 12 pontos em 25 segundos.',
  ir: {
    html: [],
    css: [],
    extensions: [
      {
        extensionId: 'game-3d-advanced',
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g3k:setup',
          w: {
            type: 'num',
            value: 1280,
          },
          h: {
            type: 'num',
            value: 720,
          },
          world: {
            type: 'num',
            value: 40,
          },
          sky: '#1e1b4b',
          ground: '#365314',
        },
        {
          type: 'g3k:setEffects',
          shadows: true,
          bloom: true,
          strength: {
            type: 'num',
            value: 1.1,
          },
          vignette: true,
        },
        {
          type: 'g3k:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Tiro ao Alvo',
          },
          text: {
            type: 'str',
            value:
              'Clique nos alvos antes que eles fujam. O dourado vale 3! Faça 12 pontos em 25 segundos. Aperte H para a dica.',
          },
          button: {
            type: 'str',
            value: 'Valendo!',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'Olho de águia!',
          },
          text: {
            type: 'str',
            value: 'Pontaria perfeita.',
          },
          button: {
            type: 'str',
            value: 'De novo',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'fim',
          title: {
            type: 'str',
            value: 'O tempo acabou...',
          },
          text: {
            type: 'str',
            value: 'Foi por pouco!',
          },
          button: {
            type: 'str',
            value: 'Tentar de novo',
          },
        },
        {
          type: 'g3k:defineMold',
          name: 'alvo',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'cylinder',
              material: 'normal',
              color: '#b91c1c',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1.7,
              },
              h: {
                type: 'num',
                value: 0.25,
              },
              d: {
                type: 'num',
                value: 1.7,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cylinder',
              material: 'normal',
              color: '#fef2f2',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1,
              },
              h: {
                type: 'num',
                value: 0.3,
              },
              d: {
                type: 'num',
                value: 1,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#78350f',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.25,
              },
              h: {
                type: 'num',
                value: 1.5,
              },
              d: {
                type: 'num',
                value: 0.25,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.75,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'dourado',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'cylinder',
              material: 'brilho',
              color: '#f59e0b',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1.7,
              },
              h: {
                type: 'num',
                value: 0.25,
              },
              d: {
                type: 'num',
                value: 1.7,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#78350f',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.25,
              },
              h: {
                type: 'num',
                value: 1.5,
              },
              d: {
                type: 'num',
                value: 0.25,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.75,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineEffect',
          name: 'acerto',
          count: {
            type: 'num',
            value: 18,
          },
          colorFrom: '#fde047',
          colorTo: '#b91c1c',
          spread: {
            type: 'num',
            value: 5,
          },
          sizeFrom: {
            type: 'num',
            value: 0.4,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.5,
          },
          gravity: {
            type: 'num',
            value: 2,
          },
        },
        {
          type: 'g3k:createScreen',
          name: 'dica',
          title: {
            type: 'str',
            value: 'Dica de caçador',
          },
          text: {
            type: 'str',
            value:
              'O dourado foge mais rápido! Aperte C para a lente de mira e V para a lente normal.',
          },
        },
        {
          type: 'g3k:addButton',
          screen: 'dica',
          label: {
            type: 'str',
            value: 'Entendi!',
          },
          body: [
            {
              type: 'g3k:hideScreens',
            },
          ],
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
          type: 'g3k:stateTimer',
          mold: 'alvo',
          state: 'parado',
          sec: {
            type: 'num',
            value: 2.6,
          },
          next: 'fugiu',
        },
        {
          type: 'g3k:stateTimer',
          mold: 'dourado',
          state: 'parado',
          sec: {
            type: 'num',
            value: 1.6,
          },
          next: 'fugiu',
        },
      ],
      events: [
        {
          type: 'g3k:onEnterState',
          name: 'jogando',
          body: [
            {
              type: 'assign',
              name: 'pontos',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:setSeed',
              seed: {
                type: 'num',
                value: 3,
              },
            },
            {
              type: 'g3k:setSky',
              top: '#312e81',
              bottom: '#f59e0b',
            },
            {
              type: 'g3k:setAmbient',
              intensity: {
                type: 'num',
                value: 0.55,
              },
            },
            {
              type: 'g3k:cameraOrbit',
              dist: {
                type: 'num',
                value: 24,
              },
            },
            {
              type: 'g3k:cameraAngle',
              az: {
                type: 'num',
                value: 0,
              },
              el: {
                type: 'num',
                value: 42,
              },
            },
            {
              type: 'g3k:cameraLens',
              fov: {
                type: 'num',
                value: 50,
              },
            },
            {
              type: 'g3k:startTimer',
              seconds: {
                type: 'num',
                value: 25,
              },
            },
            {
              type: 'g3k:startSpawner',
              mold: 'alvo',
              seconds: {
                type: 'num',
                value: 1,
              },
              where: 'anywhere',
            },
            {
              type: 'g3k:startSpawner',
              mold: 'dourado',
              seconds: {
                type: 'num',
                value: 5,
              },
              where: 'anywhere',
            },
          ],
        },
        {
          type: 'g3k:onEnterEntityState',
          mold: 'alvo',
          state: 'parado',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:setEntityValue',
              charVar: 'ela',
              key: 'valor',
              value: {
                type: 'num',
                value: 1,
              },
            },
          ],
        },
        {
          type: 'g3k:onEnterEntityState',
          mold: 'dourado',
          state: 'parado',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:setEntityValue',
              charVar: 'ela',
              key: 'valor',
              value: {
                type: 'num',
                value: 3,
              },
            },
          ],
        },
        {
          type: 'g3k:onEnterEntityState',
          mold: 'alvo',
          state: 'fugiu',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:recycle',
              charVar: 'ela',
            },
          ],
        },
        {
          type: 'g3k:onEnterEntityState',
          mold: 'dourado',
          state: 'fugiu',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:recycle',
              charVar: 'ela',
            },
          ],
        },
        {
          type: 'g3k:onEvent',
          event: 'acertou',
          body: [
            {
              type: 'g3k:playEffect',
              fx: 'coin',
            },
            {
              type: 'g3k:cameraShake',
              strength: {
                type: 'num',
                value: 0.15,
              },
              seconds: {
                type: 'num',
                value: 0.15,
              },
            },
          ],
        },
        {
          type: 'g3k:onTimerEnd',
          body: [
            {
              type: 'g3k:endGame',
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g3k:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:hudText',
              slot: 'top-left',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Pontos: ',
                  },
                  right: {
                    type: 'var',
                    name: 'pontos',
                  },
                },
                right: {
                  type: 'str',
                  value: '/12',
                },
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'top-right',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Tempo: ',
                  },
                  right: {
                    type: 'mathUnary',
                    fn: 'ceil',
                    arg: {
                      type: 'g3k:timeLeft',
                    },
                  },
                },
                right: {
                  type: 'str',
                  value: 's',
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'g3k:keyPressed',
                key: 'h',
              },
              then: [
                {
                  type: 'g3k:showScreen',
                  name: 'dica',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g3k:keyPressed',
                key: 'c',
              },
              then: [
                {
                  type: 'g3k:cameraLens',
                  fov: {
                    type: 'num',
                    value: 30,
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g3k:keyPressed',
                key: 'v',
              },
              then: [
                {
                  type: 'g3k:cameraLens',
                  fov: {
                    type: 'num',
                    value: 50,
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g3k:mousePressed',
              },
              then: [
                {
                  type: 'g3k:pick',
                  varName: 'alvoClicado',
                  mold: 'alvo',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g3k:exists',
                    charVar: 'alvoClicado',
                  },
                  then: [
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
                          type: 'g3k:entityValue',
                          key: 'valor',
                          charVar: 'alvoClicado',
                        },
                      },
                    },
                    {
                      type: 'g3k:burstOn',
                      effect: 'acerto',
                      charVar: 'alvoClicado',
                    },
                    {
                      type: 'g3k:recycle',
                      charVar: 'alvoClicado',
                    },
                    {
                      type: 'g3k:emit',
                      event: 'acertou',
                    },
                  ],
                },
                {
                  type: 'g3k:pick',
                  varName: 'douradoClicado',
                  mold: 'dourado',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g3k:exists',
                    charVar: 'douradoClicado',
                  },
                  then: [
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
                          type: 'g3k:entityValue',
                          key: 'valor',
                          charVar: 'douradoClicado',
                        },
                      },
                    },
                    {
                      type: 'g3k:burstOn',
                      effect: 'acerto',
                      charVar: 'douradoClicado',
                    },
                    {
                      type: 'g3k:recycle',
                      charVar: 'douradoClicado',
                    },
                    {
                      type: 'g3k:emit',
                      event: 'acertou',
                    },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>=',
                left: {
                  type: 'var',
                  name: 'pontos',
                },
                right: {
                  type: 'num',
                  value: 12,
                },
              },
              then: [
                {
                  type: 'g3k:setState',
                  name: 'vitoria',
                },
              ],
            },
          ],
        },
      ],
    },
  },
}

export const chefaoDasSombrasExample: ExtensionExample = {
  name: 'O Chefão das Sombras',
  experience: 'game',
  description:
    'Enfrente um chefão em três fases: clique nele para atacar e desvie do anel de tiros. A cada fase ele fica mais bravo e se cura um pouco.',
  ir: {
    html: [],
    css: [],
    extensions: [
      {
        extensionId: 'game-3d-advanced',
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g3k:setup',
          w: {
            type: 'num',
            value: 1280,
          },
          h: {
            type: 'num',
            value: 720,
          },
          world: {
            type: 'num',
            value: 50,
          },
          sky: '#1e1b4b',
          ground: '#312e81',
        },
        {
          type: 'g3k:setEffects',
          shadows: true,
          bloom: true,
          strength: {
            type: 'num',
            value: 1.4,
          },
          vignette: true,
        },
        {
          type: 'g3k:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'O Chefão das Sombras',
          },
          text: {
            type: 'str',
            value:
              'Clique no chefão para atacar e desvie do anel de tiros com WASD. Ele fica mais bravo (e se cura) a cada fase!',
          },
          button: {
            type: 'str',
            value: 'Enfrentar',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'Sombra derrotada!',
          },
          text: {
            type: 'str',
            value: 'Você venceu as três fases do chefão.',
          },
          button: {
            type: 'str',
            value: 'Enfrentar de novo',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'fim',
          title: {
            type: 'str',
            value: 'O herói caiu...',
          },
          text: {
            type: 'str',
            value: 'O anel de tiros te pegou. Desvie mais na próxima!',
          },
          button: {
            type: 'str',
            value: 'Tentar de novo',
          },
        },
        {
          type: 'g3k:defineMold',
          name: 'chefao',
          health: {
            type: 'num',
            value: 100,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'metal',
              color: '#4c1d95',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 3,
              },
              h: {
                type: 'num',
                value: 3,
              },
              d: {
                type: 'num',
                value: 3,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'brilho',
              color: '#f472b6',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1.2,
              },
              h: {
                type: 'num',
                value: 1.2,
              },
              d: {
                type: 'num',
                value: 1.2,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'normal',
              color: '#a21caf',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.6,
              },
              h: {
                type: 'num',
                value: 1.4,
              },
              d: {
                type: 'num',
                value: 0.6,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 2,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'normal',
              color: '#a21caf',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.6,
              },
              h: {
                type: 'num',
                value: 1.4,
              },
              d: {
                type: 'num',
                value: 0.6,
              },
              x: {
                type: 'num',
                value: 1.6,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'normal',
              color: '#a21caf',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.6,
              },
              h: {
                type: 'num',
                value: 1.4,
              },
              d: {
                type: 'num',
                value: 0.6,
              },
              x: {
                type: 'num',
                value: -1.6,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'heroi',
          health: {
            type: 'num',
            value: 60,
          },
          speed: {
            type: 'num',
            value: 8,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#22d3ee',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.9,
              },
              h: {
                type: 'num',
                value: 1,
              },
              d: {
                type: 'num',
                value: 0.9,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'brilho',
              color: '#a5f3fc',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.7,
              },
              h: {
                type: 'num',
                value: 0.7,
              },
              d: {
                type: 'num',
                value: 0.7,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.3,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'tiro',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'brilho',
              color: '#f472b6',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.5,
              },
              h: {
                type: 'num',
                value: 0.5,
              },
              d: {
                type: 'num',
                value: 0.5,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:showHealthBar',
          mold: 'chefao',
          on: true,
        },
        {
          type: 'g3k:showHealthBar',
          mold: 'heroi',
          on: true,
        },
        {
          type: 'g3k:defineEffect',
          name: 'explosao',
          count: {
            type: 'num',
            value: 30,
          },
          colorFrom: '#f472b6',
          colorTo: '#1e1b4b',
          spread: {
            type: 'num',
            value: 8,
          },
          sizeFrom: {
            type: 'num',
            value: 0.7,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.7,
          },
          gravity: {
            type: 'num',
            value: -2,
          },
        },
        {
          type: 'g3k:defineEffect',
          name: 'faisca',
          count: {
            type: 'num',
            value: 10,
          },
          colorFrom: '#a5f3fc',
          colorTo: '#4c1d95',
          spread: {
            type: 'num',
            value: 3,
          },
          sizeFrom: {
            type: 'num',
            value: 0.3,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.3,
          },
          gravity: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'fase',
          value: {
            type: 'num',
            value: 1,
          },
        },
        {
          type: 'g3k:stateTimer',
          mold: 'chefao',
          state: 'parado',
          sec: {
            type: 'num',
            value: 1.5,
          },
          next: 'atirando',
        },
      ],
      events: [
        {
          type: 'g3k:onEnterState',
          name: 'jogando',
          body: [
            {
              type: 'assign',
              name: 'fase',
              value: {
                type: 'num',
                value: 1,
              },
            },
            {
              type: 'g3k:setSeed',
              seed: {
                type: 'num',
                value: 7,
              },
            },
            {
              type: 'g3k:setAmbient',
              intensity: {
                type: 'num',
                value: 0.5,
              },
            },
            {
              type: 'g3k:setFog',
              color: '#1e1b4b',
              near: {
                type: 'num',
                value: 30,
              },
              far: {
                type: 'num',
                value: 80,
              },
            },
            {
              type: 'g3k:spawnNamed',
              varName: 'chefe',
              mold: 'chefao',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:spawnNamed',
              varName: 'heroi',
              mold: 'heroi',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1,
              },
              z: {
                type: 'num',
                value: 12,
              },
            },
            {
              type: 'g3k:cameraTop',
              height: {
                type: 'num',
                value: 40,
              },
            },
            {
              type: 'g3k:say',
              charVar: 'chefe',
              text: {
                type: 'str',
                value: 'Ninguém vence a Sombra!',
              },
              seconds: {
                type: 'num',
                value: 3,
              },
            },
          ],
        },
        {
          type: 'g3k:onEnterEntityState',
          mold: 'chefao',
          state: 'atirando',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:spawnRing',
              mold: 'tiro',
              count: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'num',
                  value: 4,
                },
                right: {
                  type: 'binop',
                  op: '*',
                  left: {
                    type: 'var',
                    name: 'fase',
                  },
                  right: {
                    type: 'num',
                    value: 2,
                  },
                },
              },
              fromVar: 'ela',
              speed: {
                type: 'num',
                value: 7,
              },
            },
            {
              type: 'g3k:playEffect',
              fx: 'laser',
            },
            {
              type: 'g3k:cameraShake',
              strength: {
                type: 'num',
                value: 0.3,
              },
              seconds: {
                type: 'num',
                value: 0.2,
              },
            },
            {
              type: 'g3k:setEntityState',
              charVar: 'ela',
              state: 'parado',
            },
          ],
        },
        {
          type: 'g3k:onHurt',
          mold: 'chefao',
          itemName: 'ela',
          body: [
            {
              type: 'var',
              name: 'vida',
              value: {
                type: 'g3k:healthOf',
                charVar: 'ela',
              },
              kind: 'const',
            },
            {
              type: 'var',
              name: 'teto',
              value: {
                type: 'g3k:maxHealthOf',
                charVar: 'ela',
              },
              kind: 'const',
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '&&',
                left: {
                  type: 'binop',
                  op: '<=',
                  left: {
                    type: 'var',
                    name: 'vida',
                  },
                  right: {
                    type: 'binop',
                    op: '*',
                    left: {
                      type: 'var',
                      name: 'teto',
                    },
                    right: {
                      type: 'num',
                      value: 0.33,
                    },
                  },
                },
                right: {
                  type: 'binop',
                  op: '<',
                  left: {
                    type: 'var',
                    name: 'fase',
                  },
                  right: {
                    type: 'num',
                    value: 3,
                  },
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'fase',
                  value: {
                    type: 'num',
                    value: 3,
                  },
                },
                {
                  type: 'g3k:say',
                  charVar: 'ela',
                  text: {
                    type: 'str',
                    value: 'Você vai se arrepender!',
                  },
                  seconds: {
                    type: 'num',
                    value: 2,
                  },
                },
                {
                  type: 'g3k:heal',
                  charVar: 'ela',
                  amount: {
                    type: 'num',
                    value: 8,
                  },
                },
                {
                  type: 'g3k:cameraShake',
                  strength: {
                    type: 'num',
                    value: 0.6,
                  },
                  seconds: {
                    type: 'num',
                    value: 0.4,
                  },
                },
              ],
              elseif: [
                {
                  cond: {
                    type: 'logical',
                    op: '&&',
                    left: {
                      type: 'binop',
                      op: '<=',
                      left: {
                        type: 'var',
                        name: 'vida',
                      },
                      right: {
                        type: 'binop',
                        op: '*',
                        left: {
                          type: 'var',
                          name: 'teto',
                        },
                        right: {
                          type: 'num',
                          value: 0.66,
                        },
                      },
                    },
                    right: {
                      type: 'binop',
                      op: '<',
                      left: {
                        type: 'var',
                        name: 'fase',
                      },
                      right: {
                        type: 'num',
                        value: 2,
                      },
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'fase',
                      value: {
                        type: 'num',
                        value: 2,
                      },
                    },
                    {
                      type: 'g3k:say',
                      charVar: 'ela',
                      text: {
                        type: 'str',
                        value: 'Impossível!',
                      },
                      seconds: {
                        type: 'num',
                        value: 2,
                      },
                    },
                    {
                      type: 'g3k:heal',
                      charVar: 'ela',
                      amount: {
                        type: 'num',
                        value: 8,
                      },
                    },
                    {
                      type: 'g3k:cameraShake',
                      strength: {
                        type: 'num',
                        value: 0.4,
                      },
                      seconds: {
                        type: 'num',
                        value: 0.3,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onEntityDeath',
          mold: 'chefao',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:burstOn',
              effect: 'explosao',
              charVar: 'ela',
            },
            {
              type: 'g3k:playEffect',
              fx: 'win',
            },
            {
              type: 'g3k:setState',
              name: 'vitoria',
            },
          ],
        },
        {
          type: 'g3k:onEntityDeath',
          mold: 'heroi',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:burstOn',
              effect: 'explosao',
              charVar: 'ela',
            },
            {
              type: 'g3k:playEffect',
              fx: 'gameover',
            },
            {
              type: 'g3k:endGame',
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'heroi',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:moveWithKeys',
              charVar: 'ela',
              speed: {
                type: 'num',
                value: 8,
              },
            },
            {
              type: 'g3k:faceVelocity',
              charVar: 'ela',
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'tiro',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:forEachNear',
              charVar: 'ela',
              mold: 'heroi',
              radius: {
                type: 'num',
                value: 1.4,
              },
              itemName: 'vitima',
              body: [
                {
                  type: 'g3k:hurt',
                  charVar: 'vitima',
                  amount: {
                    type: 'num',
                    value: 6,
                  },
                },
                {
                  type: 'g3k:burstOn',
                  effect: 'faisca',
                  charVar: 'ela',
                },
                {
                  type: 'g3k:recycle',
                  charVar: 'ela',
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'if',
              cond: {
                type: 'g3k:mousePressed',
              },
              then: [
                {
                  type: 'g3k:pick',
                  varName: 'alvo',
                  mold: 'chefao',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g3k:exists',
                    charVar: 'alvo',
                  },
                  then: [
                    {
                      type: 'g3k:hurt',
                      charVar: 'alvo',
                      amount: {
                        type: 'num',
                        value: 15,
                      },
                    },
                    {
                      type: 'g3k:burstOn',
                      effect: 'explosao',
                      charVar: 'alvo',
                    },
                    {
                      type: 'g3k:playEffect',
                      fx: 'hit',
                    },
                  ],
                },
              ],
            },
            {
              type: 'g3k:cullFar',
              mold: 'tiro',
              dist: {
                type: 'num',
                value: 28,
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'top-left',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Fase ',
                  },
                  right: {
                    type: 'var',
                    name: 'fase',
                  },
                },
                right: {
                  type: 'str',
                  value: ' de 3',
                },
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'top-right',
              text: {
                type: 'str',
                value: 'Clique no chefão!',
              },
            },
          ],
        },
      ],
    },
  },
}

/**
 * Exemplo "Corrida Infinita Profissional" — o RUNNER infinito do motor
 * avançado (nível 2 da família "Corrida Infinita"). O herói fica PRESO na
 * pista: só troca de faixa (A/D ou setas, via place + posOf) e pula com a
 * física do kit (personagem + jump/onGround). Barreiras, moedas e árvores
 * nascem LONGE à frente em cadência própria (relógios por dt no onUpdate,
 * encurtando com a velocidade) e vêm até ele por setVelocity; cullFar recicla
 * o que passou. Moeda = zona com filtro isMold (burst + som + ponto + acelera);
 * barreira = zona que treme a câmera e encerra o jogo. A dificuldade sobe com
 * o tempo E com cada moeda; o sorteio das faixas é 100% do kit
 * (randomBetween/randomChance) sob setSeed. Tudo procedural, sem .glb.
 *
 * A IR abaixo foi GERADA pelo parser real (ver __gen_corridaProfissional.ts);
 * o drift test em __tests__/corridaProfissionalExample.test.ts guarda o
 * resultado.
 */
export const corridaInfinitaProfissionalExample: ExtensionExample = {
  name: 'Corrida Infinita Profissional',
  experience: 'game',
  description:
    'Corra sem fim numa pista de três faixas: troque de faixa, pule as barreiras e pegue moedas. O jogo acelera com o tempo e cada batida treme a câmera. Tudo de peças, no motor avançado.',
  ir: {
    html: [],
    css: [],
    extensions: [
      {
        extensionId: 'game-3d-advanced',
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g3k:setup',
          w: {
            type: 'num',
            value: 1280,
          },
          h: {
            type: 'num',
            value: 720,
          },
          world: {
            type: 'num',
            value: 100,
          },
          sky: '#0f172a',
          ground: '#1e293b',
        },
        {
          type: 'g3k:setEffects',
          shadows: true,
          bloom: true,
          strength: {
            type: 'num',
            value: 1.2,
          },
          vignette: true,
        },
        {
          type: 'g3k:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Corrida Infinita Profissional',
          },
          text: {
            type: 'str',
            value:
              'Troque de faixa com A e D (ou as setas) e pule com espaço. Desvie das barreiras, pegue moedas e aguente firme: a corrida acelera sem parar!',
          },
          button: {
            type: 'str',
            value: 'Correr',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'fim',
          title: {
            type: 'str',
            value: 'Bateu!',
          },
          text: {
            type: 'str',
            value: 'A pista venceu desta vez. Desvie das barreiras e pegue mais moedas na próxima!',
          },
          button: {
            type: 'str',
            value: 'Correr de novo',
          },
        },
        {
          type: 'g3k:defineMold',
          name: 'heroi',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#fb923c',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.9,
              },
              h: {
                type: 'num',
                value: 1.1,
              },
              d: {
                type: 'num',
                value: 0.9,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.55,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'normal',
              color: '#ffedd5',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.7,
              },
              h: {
                type: 'num',
                value: 0.7,
              },
              d: {
                type: 'num',
                value: 0.7,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.3,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'brilho',
              color: '#22d3ee',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.3,
              },
              h: {
                type: 'num',
                value: 0.5,
              },
              d: {
                type: 'num',
                value: 0.3,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.9,
              },
              z: {
                type: 'num',
                value: 0.5,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'obstaculo',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#7f1d1d',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 2.4,
              },
              h: {
                type: 'num',
                value: 1.2,
              },
              d: {
                type: 'num',
                value: 0.8,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.6,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'brilho',
              color: '#f97316',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.5,
              },
              h: {
                type: 'num',
                value: 0.6,
              },
              d: {
                type: 'num',
                value: 0.5,
              },
              x: {
                type: 'num',
                value: -0.8,
              },
              y: {
                type: 'num',
                value: 1.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'brilho',
              color: '#f97316',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.5,
              },
              h: {
                type: 'num',
                value: 0.6,
              },
              d: {
                type: 'num',
                value: 0.5,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'brilho',
              color: '#f97316',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.5,
              },
              h: {
                type: 'num',
                value: 0.6,
              },
              d: {
                type: 'num',
                value: 0.5,
              },
              x: {
                type: 'num',
                value: 0.8,
              },
              y: {
                type: 'num',
                value: 1.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'moeda',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'torus',
              material: 'brilho',
              color: '#fde047',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.9,
              },
              h: {
                type: 'num',
                value: 0.9,
              },
              d: {
                type: 'num',
                value: 0.35,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'arvore',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'cylinder',
              material: 'normal',
              color: '#78350f',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.5,
              },
              h: {
                type: 'num',
                value: 1.6,
              },
              d: {
                type: 'num',
                value: 0.5,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.8,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'normal',
              color: '#166534',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1.8,
              },
              h: {
                type: 'num',
                value: 2.6,
              },
              d: {
                type: 'num',
                value: 1.8,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 2.6,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'pista',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#334155',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 10,
              },
              h: {
                type: 'num',
                value: 0.1,
              },
              d: {
                type: 'num',
                value: 96,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.05,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#facc15',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.2,
              },
              h: {
                type: 'num',
                value: 0.12,
              },
              d: {
                type: 'num',
                value: 96,
              },
              x: {
                type: 'num',
                value: -1.5,
              },
              y: {
                type: 'num',
                value: 0.06,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#facc15',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.2,
              },
              h: {
                type: 'num',
                value: 0.12,
              },
              d: {
                type: 'num',
                value: 96,
              },
              x: {
                type: 'num',
                value: 1.5,
              },
              y: {
                type: 'num',
                value: 0.06,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:setPhysics',
          mold: 'heroi',
          kind: 'personagem',
        },
        {
          type: 'g3k:makeTrigger',
          mold: 'obstaculo',
        },
        {
          type: 'g3k:makeTrigger',
          mold: 'moeda',
        },
        {
          type: 'g3k:defineEffect',
          name: 'brilho',
          count: {
            type: 'num',
            value: 20,
          },
          colorFrom: '#fde047',
          colorTo: '#0f172a',
          spread: {
            type: 'num',
            value: 5,
          },
          sizeFrom: {
            type: 'num',
            value: 0.4,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.5,
          },
          gravity: {
            type: 'num',
            value: 2,
          },
        },
        {
          type: 'g3k:defineEffect',
          name: 'poeira',
          count: {
            type: 'num',
            value: 28,
          },
          colorFrom: '#f97316',
          colorTo: '#0f172a',
          spread: {
            type: 'num',
            value: 7,
          },
          sizeFrom: {
            type: 'num',
            value: 0.6,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.7,
          },
          gravity: {
            type: 'num',
            value: 3,
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
          name: 'tempoDeJogo',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'velocidade',
          value: {
            type: 'num',
            value: 12,
          },
        },
        {
          type: 'var',
          name: 'faixa',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'proximaBarreira',
          value: {
            type: 'num',
            value: 1.2,
          },
        },
        {
          type: 'var',
          name: 'proximaMoeda',
          value: {
            type: 'num',
            value: 2,
          },
        },
        {
          type: 'var',
          name: 'proximaArvore',
          value: {
            type: 'num',
            value: 0.5,
          },
        },
      ],
      events: [
        {
          type: 'g3k:onEnterState',
          name: 'jogando',
          body: [
            {
              type: 'assign',
              name: 'pontos',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'assign',
              name: 'tempoDeJogo',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'assign',
              name: 'velocidade',
              value: {
                type: 'num',
                value: 12,
              },
            },
            {
              type: 'assign',
              name: 'faixa',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'assign',
              name: 'proximaBarreira',
              value: {
                type: 'num',
                value: 1.2,
              },
            },
            {
              type: 'assign',
              name: 'proximaMoeda',
              value: {
                type: 'num',
                value: 2,
              },
            },
            {
              type: 'assign',
              name: 'proximaArvore',
              value: {
                type: 'num',
                value: 0.5,
              },
            },
            {
              type: 'g3k:setSeed',
              seed: {
                type: 'num',
                value: 21,
              },
            },
            {
              type: 'g3k:setAmbient',
              intensity: {
                type: 'num',
                value: 0.55,
              },
            },
            {
              type: 'g3k:setFog',
              color: '#0f172a',
              near: {
                type: 'num',
                value: 30,
              },
              far: {
                type: 'num',
                value: 85,
              },
            },
            {
              type: 'g3k:addLight',
              color: '#38bdf8',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 14,
              },
              z: {
                type: 'num',
                value: -6,
              },
              intensity: {
                type: 'num',
                value: 1.3,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'pista',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:spawnNamed',
              varName: 'heroi',
              mold: 'heroi',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:cameraFollow',
              charVar: 'heroi',
              dist: {
                type: 'num',
                value: 11,
              },
              height: {
                type: 'num',
                value: 5,
              },
            },
            {
              type: 'g3k:cameraSmooth',
              lambda: {
                type: 'num',
                value: 6,
              },
            },
            {
              type: 'g3k:say',
              charVar: 'heroi',
              text: {
                type: 'str',
                value: 'Corre!',
              },
              seconds: {
                type: 'num',
                value: 2,
              },
            },
          ],
        },
        {
          type: 'g3k:onOverlap',
          mold: 'moeda',
          zoneName: 'zona',
          whoName: 'quem',
          body: [
            {
              type: 'if',
              cond: {
                type: 'g3k:isMold',
                charVar: 'quem',
                mold: 'heroi',
              },
              then: [
                {
                  type: 'g3k:burstOn',
                  effect: 'brilho',
                  charVar: 'zona',
                },
                {
                  type: 'g3k:playEffect',
                  fx: 'coin',
                },
                {
                  type: 'g3k:recycle',
                  charVar: 'zona',
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
                  type: 'assign',
                  name: 'velocidade',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'velocidade',
                    },
                    right: {
                      type: 'num',
                      value: 0.2,
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onOverlap',
          mold: 'obstaculo',
          zoneName: 'zona',
          whoName: 'quem',
          body: [
            {
              type: 'if',
              cond: {
                type: 'g3k:isMold',
                charVar: 'quem',
                mold: 'heroi',
              },
              then: [
                {
                  type: 'g3k:burstOn',
                  effect: 'poeira',
                  charVar: 'zona',
                },
                {
                  type: 'g3k:playEffect',
                  fx: 'gameover',
                },
                {
                  type: 'g3k:cameraShake',
                  strength: {
                    type: 'num',
                    value: 0.6,
                  },
                  seconds: {
                    type: 'num',
                    value: 0.5,
                  },
                },
                {
                  type: 'g3k:endGame',
                },
              ],
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'heroi',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '||',
                left: {
                  type: 'g3k:keyPressed',
                  key: 'a',
                },
                right: {
                  type: 'g3k:keyPressed',
                  key: 'esquerda',
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'faixa',
                  value: {
                    type: 'binop',
                    op: '-',
                    left: {
                      type: 'var',
                      name: 'faixa',
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
                type: 'logical',
                op: '||',
                left: {
                  type: 'g3k:keyPressed',
                  key: 'd',
                },
                right: {
                  type: 'g3k:keyPressed',
                  key: 'direita',
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'faixa',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'faixa',
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
                op: '<',
                left: {
                  type: 'var',
                  name: 'faixa',
                },
                right: {
                  type: 'num',
                  value: -1,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'faixa',
                  value: {
                    type: 'num',
                    value: -1,
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
                  name: 'faixa',
                },
                right: {
                  type: 'num',
                  value: 1,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'faixa',
                  value: {
                    type: 'num',
                    value: 1,
                  },
                },
              ],
            },
            {
              type: 'g3k:place',
              charVar: 'ela',
              x: {
                type: 'binop',
                op: '*',
                left: {
                  type: 'var',
                  name: 'faixa',
                },
                right: {
                  type: 'num',
                  value: 3,
                },
              },
              y: {
                type: 'g3k:posOf',
                axis: 'y',
                charVar: 'ela',
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '&&',
                left: {
                  type: 'g3k:keyPressed',
                  key: 'espaco',
                },
                right: {
                  type: 'g3k:onGround',
                  charVar: 'ela',
                },
              },
              then: [
                {
                  type: 'g3k:jump',
                  charVar: 'ela',
                  force: {
                    type: 'num',
                    value: 10,
                  },
                },
                {
                  type: 'g3k:playEffect',
                  fx: 'jump',
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'assign',
              name: 'velocidade',
              value: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'var',
                  name: 'velocidade',
                },
                right: {
                  type: 'binop',
                  op: '*',
                  left: {
                    type: 'var',
                    name: 'dt',
                  },
                  right: {
                    type: 'num',
                    value: 0.35,
                  },
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>',
                left: {
                  type: 'var',
                  name: 'velocidade',
                },
                right: {
                  type: 'num',
                  value: 34,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'velocidade',
                  value: {
                    type: 'num',
                    value: 34,
                  },
                },
              ],
            },
            {
              type: 'assign',
              name: 'tempoDeJogo',
              value: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'var',
                  name: 'tempoDeJogo',
                },
                right: {
                  type: 'var',
                  name: 'dt',
                },
              },
            },
            {
              type: 'assign',
              name: 'proximaBarreira',
              value: {
                type: 'binop',
                op: '-',
                left: {
                  type: 'var',
                  name: 'proximaBarreira',
                },
                right: {
                  type: 'var',
                  name: 'dt',
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<=',
                left: {
                  type: 'var',
                  name: 'proximaBarreira',
                },
                right: {
                  type: 'num',
                  value: 0,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'proximaBarreira',
                  value: {
                    type: 'binop',
                    op: '/',
                    left: {
                      type: 'num',
                      value: 30,
                    },
                    right: {
                      type: 'var',
                      name: 'velocidade',
                    },
                  },
                },
                {
                  type: 'var',
                  name: 'lugarBarreira',
                  value: {
                    type: 'num',
                    value: 0,
                  },
                },
                {
                  type: 'var',
                  name: 'sorteioBarreira',
                  value: {
                    type: 'g3k:randomBetween',
                    from: {
                      type: 'num',
                      value: 0,
                    },
                    to: {
                      type: 'num',
                      value: 3,
                    },
                  },
                  kind: 'const',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: {
                      type: 'var',
                      name: 'sorteioBarreira',
                    },
                    right: {
                      type: 'num',
                      value: 1,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'lugarBarreira',
                      value: {
                        type: 'num',
                        value: -3,
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
                      name: 'sorteioBarreira',
                    },
                    right: {
                      type: 'num',
                      value: 2,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'lugarBarreira',
                      value: {
                        type: 'num',
                        value: 3,
                      },
                    },
                  ],
                },
                {
                  type: 'g3k:spawnNamed',
                  varName: 'barreira',
                  mold: 'obstaculo',
                  x: {
                    type: 'var',
                    name: 'lugarBarreira',
                  },
                  y: {
                    type: 'num',
                    value: 0,
                  },
                  z: {
                    type: 'num',
                    value: 45,
                  },
                },
                {
                  type: 'g3k:setVelocity',
                  charVar: 'barreira',
                  x: {
                    type: 'num',
                    value: 0,
                  },
                  y: {
                    type: 'num',
                    value: 0,
                  },
                  z: {
                    type: 'binop',
                    op: '-',
                    left: {
                      type: 'num',
                      value: 0,
                    },
                    right: {
                      type: 'var',
                      name: 'velocidade',
                    },
                  },
                },
              ],
            },
            {
              type: 'assign',
              name: 'proximaMoeda',
              value: {
                type: 'binop',
                op: '-',
                left: {
                  type: 'var',
                  name: 'proximaMoeda',
                },
                right: {
                  type: 'var',
                  name: 'dt',
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<=',
                left: {
                  type: 'var',
                  name: 'proximaMoeda',
                },
                right: {
                  type: 'num',
                  value: 0,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'proximaMoeda',
                  value: {
                    type: 'binop',
                    op: '/',
                    left: {
                      type: 'num',
                      value: 20,
                    },
                    right: {
                      type: 'var',
                      name: 'velocidade',
                    },
                  },
                },
                {
                  type: 'var',
                  name: 'lugarMoeda',
                  value: {
                    type: 'num',
                    value: 0,
                  },
                },
                {
                  type: 'var',
                  name: 'sorteioMoeda',
                  value: {
                    type: 'g3k:randomBetween',
                    from: {
                      type: 'num',
                      value: 0,
                    },
                    to: {
                      type: 'num',
                      value: 3,
                    },
                  },
                  kind: 'const',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: {
                      type: 'var',
                      name: 'sorteioMoeda',
                    },
                    right: {
                      type: 'num',
                      value: 1,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'lugarMoeda',
                      value: {
                        type: 'num',
                        value: -3,
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
                      name: 'sorteioMoeda',
                    },
                    right: {
                      type: 'num',
                      value: 2,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'lugarMoeda',
                      value: {
                        type: 'num',
                        value: 3,
                      },
                    },
                  ],
                },
                {
                  type: 'g3k:spawnNamed',
                  varName: 'moeda',
                  mold: 'moeda',
                  x: {
                    type: 'var',
                    name: 'lugarMoeda',
                  },
                  y: {
                    type: 'num',
                    value: 1.1,
                  },
                  z: {
                    type: 'num',
                    value: 45,
                  },
                },
                {
                  type: 'g3k:setVelocity',
                  charVar: 'moeda',
                  x: {
                    type: 'num',
                    value: 0,
                  },
                  y: {
                    type: 'num',
                    value: 0,
                  },
                  z: {
                    type: 'binop',
                    op: '-',
                    left: {
                      type: 'num',
                      value: 0,
                    },
                    right: {
                      type: 'var',
                      name: 'velocidade',
                    },
                  },
                },
              ],
            },
            {
              type: 'assign',
              name: 'proximaArvore',
              value: {
                type: 'binop',
                op: '-',
                left: {
                  type: 'var',
                  name: 'proximaArvore',
                },
                right: {
                  type: 'var',
                  name: 'dt',
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<=',
                left: {
                  type: 'var',
                  name: 'proximaArvore',
                },
                right: {
                  type: 'num',
                  value: 0,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'proximaArvore',
                  value: {
                    type: 'binop',
                    op: '/',
                    left: {
                      type: 'num',
                      value: 16,
                    },
                    right: {
                      type: 'var',
                      name: 'velocidade',
                    },
                  },
                },
                {
                  type: 'var',
                  name: 'ladoArvore',
                  value: {
                    type: 'num',
                    value: 8,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g3k:randomChance',
                    percent: {
                      type: 'num',
                      value: 50,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'ladoArvore',
                      value: {
                        type: 'num',
                        value: -8,
                      },
                    },
                  ],
                },
                {
                  type: 'g3k:spawnNamed',
                  varName: 'arvore',
                  mold: 'arvore',
                  x: {
                    type: 'var',
                    name: 'ladoArvore',
                  },
                  y: {
                    type: 'num',
                    value: 0,
                  },
                  z: {
                    type: 'num',
                    value: 45,
                  },
                },
                {
                  type: 'g3k:setVelocity',
                  charVar: 'arvore',
                  x: {
                    type: 'num',
                    value: 0,
                  },
                  y: {
                    type: 'num',
                    value: 0,
                  },
                  z: {
                    type: 'binop',
                    op: '-',
                    left: {
                      type: 'num',
                      value: 0,
                    },
                    right: {
                      type: 'var',
                      name: 'velocidade',
                    },
                  },
                },
              ],
            },
            {
              type: 'g3k:cullFar',
              mold: 'obstaculo',
              dist: {
                type: 'num',
                value: 60,
              },
            },
            {
              type: 'g3k:cullFar',
              mold: 'moeda',
              dist: {
                type: 'num',
                value: 60,
              },
            },
            {
              type: 'g3k:cullFar',
              mold: 'arvore',
              dist: {
                type: 'num',
                value: 60,
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'top-left',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Moedas: ',
                },
                right: {
                  type: 'var',
                  name: 'pontos',
                },
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'top-right',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Tempo: ',
                  },
                  right: {
                    type: 'mathUnary',
                    fn: 'floor',
                    arg: {
                      type: 'var',
                      name: 'tempoDeJogo',
                    },
                  },
                },
                right: {
                  type: 'str',
                  value: 's',
                },
              },
            },
          ],
        },
      ],
    },
  },
}

/**
 * Exemplo da vitrine "Labirinto dos Robôs Profissional" — o FPS estilo Doom do
 * motor avançado (nível 2 da família "Labirinto"): camera_fps + move_fps
 * (clique trava a mira), labirinto de paredes como moldes SÓLIDOS e robôs de
 * DOIS tipos data-driven (vigia rápido/frágil × tanque lento/forte) com FSM de
 * 3 estados (patrulhar → perseguir → atacar) e memória por entidade (gavetas
 * alvoX/alvoZ). ⭐ Veredito do spike: sob pointer lock o mouse interno CONGELA,
 * então NADA de pick/groundPoint/pointerOver — o gatilho é mousePressed() e o
 * projétil alinhado ao olhar é spawnFrom + moveForward (o yaw do FPS gira o
 * mesh do herói), com COOLDOWN de 0,5 s por relógio de dt (proximoTiro) — os
 * i-frames do motor são de 0,5 s, então clique mais rápido que isso gastaria
 * tiro sem dano. i-frames com onHurt + tremor + vinheta. 100% asset-free.
 *
 * ⚠️ IR GERADA pelo parser real (ver __gen_labirintoProfissional.ts); o drift
 * test em __tests__/labirintoProfissionalExample.test.ts guarda o resultado.
 */
export const labirintoDosRobosProfissionalExample: ExtensionExample = {
  name: 'Labirinto dos Robôs Profissional',
  experience: 'game',
  description:
    'Um FPS de labirinto: trave a mira, ande com WASD e atire com o clique. Robôs de dois tipos patrulham, perseguem e atacam com cérebro de 3 estados. Desligue todos. Tudo de peças, sem imagem.',
  ir: {
    html: [],
    css: [],
    extensions: [
      {
        extensionId: 'game-3d-advanced',
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g3k:setup',
          w: {
            type: 'num',
            value: 1280,
          },
          h: {
            type: 'num',
            value: 720,
          },
          world: {
            type: 'num',
            value: 44,
          },
          sky: '#0b1120',
          ground: '#1e293b',
        },
        {
          type: 'g3k:setEffects',
          shadows: true,
          bloom: true,
          strength: {
            type: 'num',
            value: 1.2,
          },
          vignette: true,
        },
        {
          type: 'g3k:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Labirinto dos Robôs',
          },
          text: {
            type: 'str',
            value:
              'Clique para travar a mira. Ande com WASD, olhe com o mouse e atire com o clique. Robôs patrulham os corredores: desligue os 5!',
          },
          button: {
            type: 'str',
            value: 'Entrar',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'Labirinto limpo!',
          },
          text: {
            type: 'str',
            value: 'Todos os robôs foram desligados. Que pontaria!',
          },
          button: {
            type: 'str',
            value: 'Jogar de novo',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'fim',
          title: {
            type: 'str',
            value: 'Os robôs venceram...',
          },
          text: {
            type: 'str',
            value: 'Sua energia acabou. Atire de longe e recue pelos corredores!',
          },
          button: {
            type: 'str',
            value: 'Tentar de novo',
          },
        },
        {
          type: 'g3k:defineMold',
          name: 'heroi',
          health: {
            type: 'num',
            value: 60,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#0ea5e9',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.8,
              },
              h: {
                type: 'num',
                value: 1,
              },
              d: {
                type: 'num',
                value: 0.8,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'brilho',
              color: '#22d3ee',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.25,
              },
              h: {
                type: 'num',
                value: 0.5,
              },
              d: {
                type: 'num',
                value: 0.25,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.9,
              },
              z: {
                type: 'num',
                value: 0.55,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'tiro',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'brilho',
              color: '#fde047',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.3,
              },
              h: {
                type: 'num',
                value: 0.3,
              },
              d: {
                type: 'num',
                value: 0.3,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.15,
              },
              z: {
                type: 'num',
                value: 0.3,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'vigia',
          health: {
            type: 'num',
            value: 20,
          },
          speed: {
            type: 'num',
            value: 4.2,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'normal',
              color: '#ef4444',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1.1,
              },
              h: {
                type: 'num',
                value: 1.1,
              },
              d: {
                type: 'num',
                value: 1.1,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.6,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'brilho',
              color: '#fca5a5',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.35,
              },
              h: {
                type: 'num',
                value: 0.18,
              },
              d: {
                type: 'num',
                value: 0.2,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.75,
              },
              z: {
                type: 'num',
                value: 0.55,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'normal',
              color: '#7f1d1d',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.4,
              },
              h: {
                type: 'num',
                value: 0.5,
              },
              d: {
                type: 'num',
                value: 0.4,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.35,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'tanque',
          health: {
            type: 'num',
            value: 45,
          },
          speed: {
            type: 'num',
            value: 2.2,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#7c3aed',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1.6,
              },
              h: {
                type: 'num',
                value: 1.4,
              },
              d: {
                type: 'num',
                value: 1.2,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.7,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'brilho',
              color: '#c4b5fd',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.6,
              },
              h: {
                type: 'num',
                value: 0.25,
              },
              d: {
                type: 'num',
                value: 0.2,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1,
              },
              z: {
                type: 'num',
                value: 0.65,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cylinder',
              material: 'normal',
              color: '#4c1d95',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.8,
              },
              h: {
                type: 'num',
                value: 0.4,
              },
              d: {
                type: 'num',
                value: 0.8,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.6,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'muralha',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#334155',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 38,
              },
              h: {
                type: 'num',
                value: 3,
              },
              d: {
                type: 'num',
                value: 1,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'muralhaLado',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#334155',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1,
              },
              h: {
                type: 'num',
                value: 3,
              },
              d: {
                type: 'num',
                value: 38,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'parede',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#475569',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 12,
              },
              h: {
                type: 'num',
                value: 3,
              },
              d: {
                type: 'num',
                value: 1,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'paredeLado',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#475569',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1,
              },
              h: {
                type: 'num',
                value: 3,
              },
              d: {
                type: 'num',
                value: 12,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:setPhysics',
          mold: 'heroi',
          kind: 'personagem',
        },
        {
          type: 'g3k:makeTrigger',
          mold: 'tiro',
        },
        {
          type: 'g3k:makeSolid',
          mold: 'muralha',
        },
        {
          type: 'g3k:makeSolid',
          mold: 'muralhaLado',
        },
        {
          type: 'g3k:makeSolid',
          mold: 'parede',
        },
        {
          type: 'g3k:makeSolid',
          mold: 'paredeLado',
        },
        {
          type: 'g3k:defineEffect',
          name: 'faisca',
          count: {
            type: 'num',
            value: 14,
          },
          colorFrom: '#fde047',
          colorTo: '#7f1d1d',
          spread: {
            type: 'num',
            value: 4,
          },
          sizeFrom: {
            type: 'num',
            value: 0.35,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.4,
          },
          gravity: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g3k:defineEffect',
          name: 'choque',
          count: {
            type: 'num',
            value: 12,
          },
          colorFrom: '#f43f5e',
          colorTo: '#111827',
          spread: {
            type: 'num',
            value: 5,
          },
          sizeFrom: {
            type: 'num',
            value: 0.4,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.45,
          },
          gravity: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g3k:defineEffect',
          name: 'explosao',
          count: {
            type: 'num',
            value: 30,
          },
          colorFrom: '#fb923c',
          colorTo: '#111827',
          spread: {
            type: 'num',
            value: 8,
          },
          sizeFrom: {
            type: 'num',
            value: 0.6,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.7,
          },
          gravity: {
            type: 'num',
            value: -6,
          },
        },
        {
          type: 'var',
          name: 'restantes',
          value: {
            type: 'num',
            value: 5,
          },
        },
        {
          type: 'var',
          name: 'proximoTiro',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g3k:stateTimer',
          mold: 'tiro',
          state: 'parado',
          sec: {
            type: 'num',
            value: 1.1,
          },
          next: 'sumir',
        },
        {
          type: 'g3k:stateTimer',
          mold: 'vigia',
          state: 'parado',
          sec: {
            type: 'num',
            value: 0.2,
          },
          next: 'patrulhar',
        },
        {
          type: 'g3k:stateTimer',
          mold: 'vigia',
          state: 'atacar',
          sec: {
            type: 'num',
            value: 0.8,
          },
          next: 'perseguir',
        },
        {
          type: 'g3k:stateTimer',
          mold: 'tanque',
          state: 'parado',
          sec: {
            type: 'num',
            value: 0.2,
          },
          next: 'patrulhar',
        },
        {
          type: 'g3k:stateTimer',
          mold: 'tanque',
          state: 'atacar',
          sec: {
            type: 'num',
            value: 1.2,
          },
          next: 'perseguir',
        },
      ],
      events: [
        {
          type: 'g3k:onEnterState',
          name: 'jogando',
          body: [
            {
              type: 'assign',
              name: 'restantes',
              value: {
                type: 'num',
                value: 5,
              },
            },
            {
              type: 'assign',
              name: 'proximoTiro',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:setSeed',
              seed: {
                type: 'num',
                value: 7,
              },
            },
            {
              type: 'g3k:setAmbient',
              intensity: {
                type: 'num',
                value: 0.4,
              },
            },
            {
              type: 'g3k:setFog',
              color: '#0b1120',
              near: {
                type: 'num',
                value: 10,
              },
              far: {
                type: 'num',
                value: 38,
              },
            },
            {
              type: 'g3k:addLight',
              color: '#f97316',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 6,
              },
              z: {
                type: 'num',
                value: 0,
              },
              intensity: {
                type: 'num',
                value: 1.4,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'muralha',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 17,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'muralha',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: -17,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'muralhaLado',
              x: {
                type: 'num',
                value: 17,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'muralhaLado',
              x: {
                type: 'num',
                value: -17,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'parede',
              x: {
                type: 'num',
                value: -6,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 8,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'parede',
              x: {
                type: 'num',
                value: 6,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: -8,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'parede',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'paredeLado',
              x: {
                type: 'num',
                value: 8,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 6,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'paredeLado',
              x: {
                type: 'num',
                value: -8,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: -6,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'vigia',
              x: {
                type: 'num',
                value: -12,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 12,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'vigia',
              x: {
                type: 'num',
                value: 12,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 12,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'vigia',
              x: {
                type: 'num',
                value: 12,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: -12,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'tanque',
              x: {
                type: 'num',
                value: -12,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: -12,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'tanque',
              x: {
                type: 'num',
                value: 5,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 5,
              },
            },
            {
              type: 'g3k:spawnNamed',
              varName: 'jogador',
              mold: 'heroi',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1,
              },
              z: {
                type: 'num',
                value: -13,
              },
            },
            {
              type: 'g3k:cameraFps',
              charVar: 'jogador',
            },
            {
              type: 'g3k:say',
              charVar: 'jogador',
              text: {
                type: 'str',
                value: 'Limpe o labirinto!',
              },
              seconds: {
                type: 'num',
                value: 2,
              },
            },
          ],
        },
        {
          type: 'g3k:onEnterEntityState',
          mold: 'tiro',
          state: 'sumir',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:recycle',
              charVar: 'ela',
            },
          ],
        },
        {
          type: 'g3k:onEnterEntityState',
          mold: 'vigia',
          state: 'patrulhar',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:setEntityValue',
              charVar: 'ela',
              key: 'alvoX',
              value: {
                type: 'g3k:randomBetween',
                from: {
                  type: 'num',
                  value: -13,
                },
                to: {
                  type: 'num',
                  value: 13,
                },
              },
            },
            {
              type: 'g3k:setEntityValue',
              charVar: 'ela',
              key: 'alvoZ',
              value: {
                type: 'g3k:randomBetween',
                from: {
                  type: 'num',
                  value: -13,
                },
                to: {
                  type: 'num',
                  value: 13,
                },
              },
            },
          ],
        },
        {
          type: 'g3k:onEnterEntityState',
          mold: 'vigia',
          state: 'atacar',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:storeNearest',
              varName: 'alvo',
              mold: 'heroi',
              charVar: 'ela',
            },
            {
              type: 'if',
              cond: {
                type: 'g3k:exists',
                charVar: 'alvo',
              },
              then: [
                {
                  type: 'g3k:hurt',
                  charVar: 'alvo',
                  amount: {
                    type: 'num',
                    value: 8,
                  },
                },
                {
                  type: 'g3k:burstOn',
                  effect: 'choque',
                  charVar: 'ela',
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onEnterEntityState',
          mold: 'tanque',
          state: 'patrulhar',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:setEntityValue',
              charVar: 'ela',
              key: 'alvoX',
              value: {
                type: 'g3k:randomBetween',
                from: {
                  type: 'num',
                  value: -13,
                },
                to: {
                  type: 'num',
                  value: 13,
                },
              },
            },
            {
              type: 'g3k:setEntityValue',
              charVar: 'ela',
              key: 'alvoZ',
              value: {
                type: 'g3k:randomBetween',
                from: {
                  type: 'num',
                  value: -13,
                },
                to: {
                  type: 'num',
                  value: 13,
                },
              },
            },
          ],
        },
        {
          type: 'g3k:onEnterEntityState',
          mold: 'tanque',
          state: 'atacar',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:storeNearest',
              varName: 'alvo',
              mold: 'heroi',
              charVar: 'ela',
            },
            {
              type: 'if',
              cond: {
                type: 'g3k:exists',
                charVar: 'alvo',
              },
              then: [
                {
                  type: 'g3k:hurt',
                  charVar: 'alvo',
                  amount: {
                    type: 'num',
                    value: 15,
                  },
                },
                {
                  type: 'g3k:burstOn',
                  effect: 'choque',
                  charVar: 'ela',
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onOverlap',
          mold: 'tiro',
          zoneName: 'zona',
          whoName: 'quem',
          body: [
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '||',
                left: {
                  type: 'g3k:isMold',
                  charVar: 'quem',
                  mold: 'vigia',
                },
                right: {
                  type: 'g3k:isMold',
                  charVar: 'quem',
                  mold: 'tanque',
                },
              },
              then: [
                {
                  type: 'g3k:hurt',
                  charVar: 'quem',
                  amount: {
                    type: 'num',
                    value: 15,
                  },
                },
                {
                  type: 'g3k:burstOn',
                  effect: 'faisca',
                  charVar: 'quem',
                },
                {
                  type: 'g3k:playEffect',
                  fx: 'hit',
                },
                {
                  type: 'g3k:recycle',
                  charVar: 'zona',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '&&',
                left: {
                  type: 'logical',
                  op: '&&',
                  left: {
                    type: 'logical',
                    op: '&&',
                    left: {
                      type: 'logicalNot',
                      value: {
                        type: 'g3k:isMold',
                        charVar: 'quem',
                        mold: 'heroi',
                      },
                    },
                    right: {
                      type: 'logicalNot',
                      value: {
                        type: 'g3k:isMold',
                        charVar: 'quem',
                        mold: 'vigia',
                      },
                    },
                  },
                  right: {
                    type: 'logicalNot',
                    value: {
                      type: 'g3k:isMold',
                      charVar: 'quem',
                      mold: 'tanque',
                    },
                  },
                },
                right: {
                  type: 'logicalNot',
                  value: {
                    type: 'g3k:isMold',
                    charVar: 'quem',
                    mold: 'tiro',
                  },
                },
              },
              then: [
                {
                  type: 'g3k:recycle',
                  charVar: 'zona',
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onHurt',
          mold: 'heroi',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:cameraShake',
              strength: {
                type: 'num',
                value: 0.5,
              },
              seconds: {
                type: 'num',
                value: 0.4,
              },
            },
            {
              type: 'g3k:playEffect',
              fx: 'hurt',
            },
          ],
        },
        {
          type: 'g3k:onEntityDeath',
          mold: 'vigia',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:burstOn',
              effect: 'explosao',
              charVar: 'ela',
            },
            {
              type: 'g3k:playEffect',
              fx: 'explosion',
            },
          ],
        },
        {
          type: 'g3k:onEntityDeath',
          mold: 'tanque',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:burstOn',
              effect: 'explosao',
              charVar: 'ela',
            },
            {
              type: 'g3k:playEffect',
              fx: 'explosion',
            },
          ],
        },
        {
          type: 'g3k:onEntityDeath',
          mold: 'heroi',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:burstOn',
              effect: 'explosao',
              charVar: 'ela',
            },
            {
              type: 'g3k:playEffect',
              fx: 'gameover',
            },
            {
              type: 'g3k:endGame',
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'heroi',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:moveFps',
              charVar: 'ela',
              speed: {
                type: 'num',
                value: 7,
              },
            },
            {
              type: 'assign',
              name: 'proximoTiro',
              value: {
                type: 'binop',
                op: '-',
                left: {
                  type: 'var',
                  name: 'proximoTiro',
                },
                right: {
                  type: 'var',
                  name: 'dt',
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '&&',
                left: {
                  type: 'g3k:mousePressed',
                },
                right: {
                  type: 'binop',
                  op: '<=',
                  left: {
                    type: 'var',
                    name: 'proximoTiro',
                  },
                  right: {
                    type: 'num',
                    value: 0,
                  },
                },
              },
              then: [
                {
                  type: 'g3k:spawnFrom',
                  mold: 'tiro',
                  fromVar: 'ela',
                },
                {
                  type: 'g3k:playEffect',
                  fx: 'laser',
                },
                {
                  type: 'assign',
                  name: 'proximoTiro',
                  value: {
                    type: 'num',
                    value: 0.5,
                  },
                },
              ],
            },
            {
              type: 'g3k:hudText',
              slot: 'top-left',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Vida: ',
                },
                right: {
                  type: 'g3k:healthOf',
                  charVar: 'ela',
                },
              },
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'tiro',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:moveForward',
              charVar: 'ela',
              speed: {
                type: 'num',
                value: 26,
              },
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'vigia',
          state: 'patrulhar',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:seekPoint',
              charVar: 'ela',
              x: {
                type: 'g3k:entityValue',
                key: 'alvoX',
                charVar: 'ela',
              },
              z: {
                type: 'g3k:entityValue',
                key: 'alvoZ',
                charVar: 'ela',
              },
            },
            {
              type: 'g3k:faceVelocity',
              charVar: 'ela',
            },
            {
              type: 'if',
              cond: {
                type: 'g3k:randomChance',
                percent: {
                  type: 'num',
                  value: 1,
                },
              },
              then: [
                {
                  type: 'g3k:setEntityValue',
                  charVar: 'ela',
                  key: 'alvoX',
                  value: {
                    type: 'g3k:randomBetween',
                    from: {
                      type: 'num',
                      value: -13,
                    },
                    to: {
                      type: 'num',
                      value: 13,
                    },
                  },
                },
                {
                  type: 'g3k:setEntityValue',
                  charVar: 'ela',
                  key: 'alvoZ',
                  value: {
                    type: 'g3k:randomBetween',
                    from: {
                      type: 'num',
                      value: -13,
                    },
                    to: {
                      type: 'num',
                      value: 13,
                    },
                  },
                },
              ],
            },
            {
              type: 'g3k:storeNearest',
              varName: 'alvo',
              mold: 'heroi',
              charVar: 'ela',
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '&&',
                left: {
                  type: 'g3k:exists',
                  charVar: 'alvo',
                },
                right: {
                  type: 'g3k:touches',
                  aVar: 'ela',
                  bVar: 'alvo',
                  dist: {
                    type: 'num',
                    value: 9,
                  },
                },
              },
              then: [
                {
                  type: 'g3k:setEntityState',
                  charVar: 'ela',
                  state: 'perseguir',
                },
                {
                  type: 'g3k:say',
                  charVar: 'ela',
                  text: {
                    type: 'str',
                    value: 'Te vi!',
                  },
                  seconds: {
                    type: 'num',
                    value: 1,
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'vigia',
          state: 'perseguir',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:storeNearest',
              varName: 'alvo',
              mold: 'heroi',
              charVar: 'ela',
            },
            {
              type: 'if',
              cond: {
                type: 'logicalNot',
                value: {
                  type: 'g3k:exists',
                  charVar: 'alvo',
                },
              },
              then: [
                {
                  type: 'g3k:setEntityState',
                  charVar: 'ela',
                  state: 'patrulhar',
                },
              ],
              else: [
                {
                  type: 'g3k:seekPoint',
                  charVar: 'ela',
                  x: {
                    type: 'g3k:posOf',
                    axis: 'x',
                    charVar: 'alvo',
                  },
                  z: {
                    type: 'g3k:posOf',
                    axis: 'z',
                    charVar: 'alvo',
                  },
                },
                {
                  type: 'g3k:faceVelocity',
                  charVar: 'ela',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g3k:touches',
                    aVar: 'ela',
                    bVar: 'alvo',
                    dist: {
                      type: 'num',
                      value: 1.6,
                    },
                  },
                  then: [
                    {
                      type: 'g3k:setEntityState',
                      charVar: 'ela',
                      state: 'atacar',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'logicalNot',
                    value: {
                      type: 'g3k:touches',
                      aVar: 'ela',
                      bVar: 'alvo',
                      dist: {
                        type: 'num',
                        value: 12,
                      },
                    },
                  },
                  then: [
                    {
                      type: 'g3k:setEntityState',
                      charVar: 'ela',
                      state: 'patrulhar',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'tanque',
          state: 'patrulhar',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:seekPoint',
              charVar: 'ela',
              x: {
                type: 'g3k:entityValue',
                key: 'alvoX',
                charVar: 'ela',
              },
              z: {
                type: 'g3k:entityValue',
                key: 'alvoZ',
                charVar: 'ela',
              },
            },
            {
              type: 'g3k:faceVelocity',
              charVar: 'ela',
            },
            {
              type: 'if',
              cond: {
                type: 'g3k:randomChance',
                percent: {
                  type: 'num',
                  value: 1,
                },
              },
              then: [
                {
                  type: 'g3k:setEntityValue',
                  charVar: 'ela',
                  key: 'alvoX',
                  value: {
                    type: 'g3k:randomBetween',
                    from: {
                      type: 'num',
                      value: -13,
                    },
                    to: {
                      type: 'num',
                      value: 13,
                    },
                  },
                },
                {
                  type: 'g3k:setEntityValue',
                  charVar: 'ela',
                  key: 'alvoZ',
                  value: {
                    type: 'g3k:randomBetween',
                    from: {
                      type: 'num',
                      value: -13,
                    },
                    to: {
                      type: 'num',
                      value: 13,
                    },
                  },
                },
              ],
            },
            {
              type: 'g3k:storeNearest',
              varName: 'alvo',
              mold: 'heroi',
              charVar: 'ela',
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '&&',
                left: {
                  type: 'g3k:exists',
                  charVar: 'alvo',
                },
                right: {
                  type: 'g3k:touches',
                  aVar: 'ela',
                  bVar: 'alvo',
                  dist: {
                    type: 'num',
                    value: 7,
                  },
                },
              },
              then: [
                {
                  type: 'g3k:setEntityState',
                  charVar: 'ela',
                  state: 'perseguir',
                },
                {
                  type: 'g3k:say',
                  charVar: 'ela',
                  text: {
                    type: 'str',
                    value: 'Intruso!',
                  },
                  seconds: {
                    type: 'num',
                    value: 1,
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'tanque',
          state: 'perseguir',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:storeNearest',
              varName: 'alvo',
              mold: 'heroi',
              charVar: 'ela',
            },
            {
              type: 'if',
              cond: {
                type: 'logicalNot',
                value: {
                  type: 'g3k:exists',
                  charVar: 'alvo',
                },
              },
              then: [
                {
                  type: 'g3k:setEntityState',
                  charVar: 'ela',
                  state: 'patrulhar',
                },
              ],
              else: [
                {
                  type: 'g3k:seekPoint',
                  charVar: 'ela',
                  x: {
                    type: 'g3k:posOf',
                    axis: 'x',
                    charVar: 'alvo',
                  },
                  z: {
                    type: 'g3k:posOf',
                    axis: 'z',
                    charVar: 'alvo',
                  },
                },
                {
                  type: 'g3k:faceVelocity',
                  charVar: 'ela',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g3k:touches',
                    aVar: 'ela',
                    bVar: 'alvo',
                    dist: {
                      type: 'num',
                      value: 1.8,
                    },
                  },
                  then: [
                    {
                      type: 'g3k:setEntityState',
                      charVar: 'ela',
                      state: 'atacar',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'logicalNot',
                    value: {
                      type: 'g3k:touches',
                      aVar: 'ela',
                      bVar: 'alvo',
                      dist: {
                        type: 'num',
                        value: 10,
                      },
                    },
                  },
                  then: [
                    {
                      type: 'g3k:setEntityState',
                      charVar: 'ela',
                      state: 'patrulhar',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:cullFar',
              mold: 'tiro',
              dist: {
                type: 'num',
                value: 34,
              },
            },
            {
              type: 'assign',
              name: 'restantes',
              value: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'g3k:countAlive',
                  mold: 'vigia',
                },
                right: {
                  type: 'g3k:countAlive',
                  mold: 'tanque',
                },
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'top-right',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Robôs: ',
                },
                right: {
                  type: 'var',
                  name: 'restantes',
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<',
                left: {
                  type: 'var',
                  name: 'restantes',
                },
                right: {
                  type: 'num',
                  value: 1,
                },
              },
              then: [
                {
                  type: 'g3k:playEffect',
                  fx: 'win',
                },
                {
                  type: 'g3k:setState',
                  name: 'vitoria',
                },
              ],
            },
          ],
        },
      ],
    },
  },
}

/**
 * Exemplo da vitrine "Mundo de Blocos Profissional" — o construtor estilo
 * Minecraft do motor avançado (nível 2 da família "Mundo de Blocos"), em
 * 3ª PESSOA de propósito (adaptação do spike: camera_fps congela o mouse
 * interno e mataria a construção). cameraFollow deixa o mouse LIVRE:
 * groundPoint + Math.round do núcleo arredondam o clique para a grade de 2 em
 * 2 e o spawn planta um bloco SÓLIDO (dá para subir) — mas SÓ com a célula a
 * até 3 do herói (guarda de alcance: clique no céu devolve groundPoint 0/0,
 * longe, e nada acontece); teclas 1/2/3 trocam o molde (grama/pedra/madeira),
 * X liga o modo reciclar (UM pick sem molde + cascata isMold: só o bloco da
 * frente sai, sem atravessar oclusão) e o teto de 30 blocos avisa pela fala.
 * Muralha + árvores compostas nascem por setSeed; vitória verificável:
 * colocar um bloco, subir nele e pousar acima de y 2.2 (o topo da muralha).
 *
 * ⚠️ IR GERADA pelo parser real (ver __gen_mundoProfissional.ts); o drift
 * test em __tests__/mundoProfissionalExample.test.ts guarda o resultado.
 */
export const mundoDeBlocosProfissionalExample: ExtensionExample = {
  name: 'Mundo de Blocos Profissional',
  experience: 'game',
  description:
    'Construtor 3D em 3ª pessoa: ande, pule e clique no chão perto de você para plantar blocos sólidos (1, 2 e 3 trocam o tipo). Coloque um bloco, suba nele e pule até o topo da muralha. X recicla.',
  ir: {
    html: [],
    css: [],
    extensions: [
      {
        extensionId: 'game-3d-advanced',
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g3k:setup',
          w: {
            type: 'num',
            value: 1280,
          },
          h: {
            type: 'num',
            value: 720,
          },
          world: {
            type: 'num',
            value: 44,
          },
          sky: '#7dd3fc',
          ground: '#86efac',
        },
        {
          type: 'g3k:setEffects',
          shadows: true,
          bloom: true,
          strength: {
            type: 'num',
            value: 1,
          },
          vignette: false,
        },
        {
          type: 'g3k:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Mundo de Blocos',
          },
          text: {
            type: 'str',
            value:
              'Ande com WASD e pule com espaço. Escolha o bloco com 1, 2 e 3 e clique no chão perto de você para construir. Aperte X para reciclar. Coloque um bloco junto da muralha, suba nele e pule até o topo!',
          },
          button: {
            type: 'str',
            value: 'Construir',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'Chegou ao topo!',
          },
          text: {
            type: 'str',
            value:
              'Você colocou um bloco, subiu nele e pulou até o topo da muralha. Jogue de novo e invente outro caminho!',
          },
          button: {
            type: 'str',
            value: 'Construir de novo',
          },
        },
        {
          type: 'g3k:defineMold',
          name: 'heroi',
          health: {
            type: 'num',
            value: 100,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#f59e0b',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.8,
              },
              h: {
                type: 'num',
                value: 0.9,
              },
              d: {
                type: 'num',
                value: 0.5,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.45,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'normal',
              color: '#fde68a',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.6,
              },
              h: {
                type: 'num',
                value: 0.6,
              },
              d: {
                type: 'num',
                value: 0.6,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.2,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#78350f',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.3,
              },
              h: {
                type: 'num',
                value: 0.2,
              },
              d: {
                type: 'num',
                value: 0.3,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.5,
              },
              z: {
                type: 'num',
                value: 0.1,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'grama',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#92400e',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1.9,
              },
              h: {
                type: 'num',
                value: 1,
              },
              d: {
                type: 'num',
                value: 1.9,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#4ade80',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1.9,
              },
              h: {
                type: 'num',
                value: 0.2,
              },
              d: {
                type: 'num',
                value: 1.9,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.1,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'pedra',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#94a3b8',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1.9,
              },
              h: {
                type: 'num',
                value: 1.2,
              },
              d: {
                type: 'num',
                value: 1.9,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.6,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#64748b',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1.2,
              },
              h: {
                type: 'num',
                value: 0.4,
              },
              d: {
                type: 'num',
                value: 1.2,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.9,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'madeira',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#b45309',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1.9,
              },
              h: {
                type: 'num',
                value: 1.2,
              },
              d: {
                type: 'num',
                value: 1.9,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.6,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#78350f',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1.92,
              },
              h: {
                type: 'num',
                value: 0.25,
              },
              d: {
                type: 'num',
                value: 1.92,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.6,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'muralha',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#a8a29e',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 12,
              },
              h: {
                type: 'num',
                value: 2.4,
              },
              d: {
                type: 'num',
                value: 1.2,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.2,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#78716c',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 12,
              },
              h: {
                type: 'num',
                value: 0.3,
              },
              d: {
                type: 'num',
                value: 1.4,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 2.25,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'arvore',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'cylinder',
              material: 'normal',
              color: '#78350f',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.6,
              },
              h: {
                type: 'num',
                value: 1.6,
              },
              d: {
                type: 'num',
                value: 0.6,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.8,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'normal',
              color: '#16a34a',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 2.4,
              },
              h: {
                type: 'num',
                value: 2.2,
              },
              d: {
                type: 'num',
                value: 2.4,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 2.6,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:setPhysics',
          mold: 'heroi',
          kind: 'personagem',
        },
        {
          type: 'g3k:makeSolid',
          mold: 'grama',
        },
        {
          type: 'g3k:makeSolid',
          mold: 'pedra',
        },
        {
          type: 'g3k:makeSolid',
          mold: 'madeira',
        },
        {
          type: 'g3k:makeSolid',
          mold: 'muralha',
        },
        {
          type: 'g3k:makeSolid',
          mold: 'arvore',
        },
        {
          type: 'g3k:defineEffect',
          name: 'poeira',
          count: {
            type: 'num',
            value: 16,
          },
          colorFrom: '#fef3c7',
          colorTo: '#86efac',
          spread: {
            type: 'num',
            value: 4,
          },
          sizeFrom: {
            type: 'num',
            value: 0.4,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.5,
          },
          gravity: {
            type: 'num',
            value: -4,
          },
        },
        {
          type: 'var',
          name: 'modo',
          value: {
            type: 'str',
            value: 'construir',
          },
        },
        {
          type: 'var',
          name: 'tipoDeBloco',
          value: {
            type: 'str',
            value: 'grama',
          },
        },
        {
          type: 'var',
          name: 'blocos',
          value: {
            type: 'num',
            value: 0,
          },
        },
      ],
      events: [
        {
          type: 'g3k:onEnterState',
          name: 'jogando',
          body: [
            {
              type: 'assign',
              name: 'modo',
              value: {
                type: 'str',
                value: 'construir',
              },
            },
            {
              type: 'assign',
              name: 'tipoDeBloco',
              value: {
                type: 'str',
                value: 'grama',
              },
            },
            {
              type: 'assign',
              name: 'blocos',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:setSeed',
              seed: {
                type: 'num',
                value: 12,
              },
            },
            {
              type: 'g3k:setAmbient',
              intensity: {
                type: 'num',
                value: 0.85,
              },
            },
            {
              type: 'g3k:setFog',
              color: '#bae6fd',
              near: {
                type: 'num',
                value: 30,
              },
              far: {
                type: 'num',
                value: 70,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'muralha',
              x: {
                type: 'num',
                value: -12,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 10,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'muralha',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 10,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'muralha',
              x: {
                type: 'num',
                value: 12,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 10,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'arvore',
              x: {
                type: 'g3k:randomBetween',
                from: {
                  type: 'num',
                  value: -15,
                },
                to: {
                  type: 'num',
                  value: -8,
                },
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'g3k:randomBetween',
                from: {
                  type: 'num',
                  value: -12,
                },
                to: {
                  type: 'num',
                  value: -2,
                },
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'arvore',
              x: {
                type: 'g3k:randomBetween',
                from: {
                  type: 'num',
                  value: -15,
                },
                to: {
                  type: 'num',
                  value: -8,
                },
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'g3k:randomBetween',
                from: {
                  type: 'num',
                  value: 0,
                },
                to: {
                  type: 'num',
                  value: 6,
                },
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'arvore',
              x: {
                type: 'g3k:randomBetween',
                from: {
                  type: 'num',
                  value: -7,
                },
                to: {
                  type: 'num',
                  value: -2,
                },
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'g3k:randomBetween',
                from: {
                  type: 'num',
                  value: -14,
                },
                to: {
                  type: 'num',
                  value: -8,
                },
              },
            },
            {
              type: 'g3k:spawnNamed',
              varName: 'jogador',
              mold: 'heroi',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1,
              },
              z: {
                type: 'num',
                value: -4,
              },
            },
            {
              type: 'g3k:cameraFollow',
              charVar: 'jogador',
              dist: {
                type: 'num',
                value: 13,
              },
              height: {
                type: 'num',
                value: 7,
              },
            },
            {
              type: 'g3k:cameraSmooth',
              lambda: {
                type: 'num',
                value: 4,
              },
            },
            {
              type: 'g3k:say',
              charVar: 'jogador',
              text: {
                type: 'str',
                value: 'Clique no chão para construir!',
              },
              seconds: {
                type: 'num',
                value: 3,
              },
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'heroi',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:platformerKeys',
              charVar: 'ela',
              speed: {
                type: 'num',
                value: 6,
              },
              jump: {
                type: 'num',
                value: 9,
              },
            },
            {
              type: 'assign',
              name: 'blocos',
              value: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'g3k:countAlive',
                    mold: 'grama',
                  },
                  right: {
                    type: 'g3k:countAlive',
                    mold: 'pedra',
                  },
                },
                right: {
                  type: 'g3k:countAlive',
                  mold: 'madeira',
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'g3k:keyPressed',
                key: '1',
              },
              then: [
                {
                  type: 'assign',
                  name: 'tipoDeBloco',
                  value: {
                    type: 'str',
                    value: 'grama',
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g3k:keyPressed',
                key: '2',
              },
              then: [
                {
                  type: 'assign',
                  name: 'tipoDeBloco',
                  value: {
                    type: 'str',
                    value: 'pedra',
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g3k:keyPressed',
                key: '3',
              },
              then: [
                {
                  type: 'assign',
                  name: 'tipoDeBloco',
                  value: {
                    type: 'str',
                    value: 'madeira',
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g3k:keyPressed',
                key: 'x',
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '===',
                    left: {
                      type: 'var',
                      name: 'modo',
                    },
                    right: {
                      type: 'str',
                      value: 'construir',
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'modo',
                      value: {
                        type: 'str',
                        value: 'reciclar',
                      },
                    },
                  ],
                  else: [
                    {
                      type: 'assign',
                      name: 'modo',
                      value: {
                        type: 'str',
                        value: 'construir',
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g3k:mousePressed',
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '===',
                    left: {
                      type: 'var',
                      name: 'modo',
                    },
                    right: {
                      type: 'str',
                      value: 'reciclar',
                    },
                  },
                  then: [
                    {
                      type: 'g3k:pick',
                      varName: 'alvo',
                      mold: '',
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'logical',
                        op: '||',
                        left: {
                          type: 'logical',
                          op: '||',
                          left: {
                            type: 'g3k:isMold',
                            charVar: 'alvo',
                            mold: 'grama',
                          },
                          right: {
                            type: 'g3k:isMold',
                            charVar: 'alvo',
                            mold: 'pedra',
                          },
                        },
                        right: {
                          type: 'g3k:isMold',
                          charVar: 'alvo',
                          mold: 'madeira',
                        },
                      },
                      then: [
                        {
                          type: 'g3k:burstOn',
                          effect: 'poeira',
                          charVar: 'alvo',
                        },
                        {
                          type: 'g3k:recycle',
                          charVar: 'alvo',
                        },
                        {
                          type: 'g3k:playEffect',
                          fx: 'click',
                        },
                      ],
                    },
                  ],
                  else: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '>=',
                        left: {
                          type: 'var',
                          name: 'blocos',
                        },
                        right: {
                          type: 'num',
                          value: 30,
                        },
                      },
                      then: [
                        {
                          type: 'g3k:say',
                          charVar: 'ela',
                          text: {
                            type: 'str',
                            value: 'O mundo lotou! Aperte X e recicle uns blocos.',
                          },
                          seconds: {
                            type: 'num',
                            value: 2,
                          },
                        },
                      ],
                      else: [
                        {
                          type: 'var',
                          name: 'celulaX',
                          value: {
                            type: 'binop',
                            op: '*',
                            left: {
                              type: 'mathUnary',
                              fn: 'round',
                              arg: {
                                type: 'binop',
                                op: '/',
                                left: {
                                  type: 'g3k:groundPoint',
                                  axis: 'x',
                                },
                                right: {
                                  type: 'num',
                                  value: 2,
                                },
                              },
                            },
                            right: {
                              type: 'num',
                              value: 2,
                            },
                          },
                          kind: 'const',
                        },
                        {
                          type: 'var',
                          name: 'celulaZ',
                          value: {
                            type: 'binop',
                            op: '*',
                            left: {
                              type: 'mathUnary',
                              fn: 'round',
                              arg: {
                                type: 'binop',
                                op: '/',
                                left: {
                                  type: 'g3k:groundPoint',
                                  axis: 'z',
                                },
                                right: {
                                  type: 'num',
                                  value: 2,
                                },
                              },
                            },
                            right: {
                              type: 'num',
                              value: 2,
                            },
                          },
                          kind: 'const',
                        },
                        {
                          type: 'if',
                          cond: {
                            type: 'logical',
                            op: '&&',
                            left: {
                              type: 'binop',
                              op: '<=',
                              left: {
                                type: 'mathUnary',
                                fn: 'abs',
                                arg: {
                                  type: 'binop',
                                  op: '-',
                                  left: {
                                    type: 'var',
                                    name: 'celulaX',
                                  },
                                  right: {
                                    type: 'g3k:posOf',
                                    axis: 'x',
                                    charVar: 'ela',
                                  },
                                },
                              },
                              right: {
                                type: 'num',
                                value: 3,
                              },
                            },
                            right: {
                              type: 'binop',
                              op: '<=',
                              left: {
                                type: 'mathUnary',
                                fn: 'abs',
                                arg: {
                                  type: 'binop',
                                  op: '-',
                                  left: {
                                    type: 'var',
                                    name: 'celulaZ',
                                  },
                                  right: {
                                    type: 'g3k:posOf',
                                    axis: 'z',
                                    charVar: 'ela',
                                  },
                                },
                              },
                              right: {
                                type: 'num',
                                value: 3,
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
                                  type: 'var',
                                  name: 'tipoDeBloco',
                                },
                                right: {
                                  type: 'str',
                                  value: 'grama',
                                },
                              },
                              then: [
                                {
                                  type: 'g3k:spawn',
                                  mold: 'grama',
                                  x: {
                                    type: 'var',
                                    name: 'celulaX',
                                  },
                                  y: {
                                    type: 'num',
                                    value: 0,
                                  },
                                  z: {
                                    type: 'var',
                                    name: 'celulaZ',
                                  },
                                },
                              ],
                            },
                            {
                              type: 'if',
                              cond: {
                                type: 'binop',
                                op: '===',
                                left: {
                                  type: 'var',
                                  name: 'tipoDeBloco',
                                },
                                right: {
                                  type: 'str',
                                  value: 'pedra',
                                },
                              },
                              then: [
                                {
                                  type: 'g3k:spawn',
                                  mold: 'pedra',
                                  x: {
                                    type: 'var',
                                    name: 'celulaX',
                                  },
                                  y: {
                                    type: 'num',
                                    value: 0,
                                  },
                                  z: {
                                    type: 'var',
                                    name: 'celulaZ',
                                  },
                                },
                              ],
                            },
                            {
                              type: 'if',
                              cond: {
                                type: 'binop',
                                op: '===',
                                left: {
                                  type: 'var',
                                  name: 'tipoDeBloco',
                                },
                                right: {
                                  type: 'str',
                                  value: 'madeira',
                                },
                              },
                              then: [
                                {
                                  type: 'g3k:spawn',
                                  mold: 'madeira',
                                  x: {
                                    type: 'var',
                                    name: 'celulaX',
                                  },
                                  y: {
                                    type: 'num',
                                    value: 0,
                                  },
                                  z: {
                                    type: 'var',
                                    name: 'celulaZ',
                                  },
                                },
                              ],
                            },
                            {
                              type: 'g3k:burstAt',
                              effect: 'poeira',
                              x: {
                                type: 'var',
                                name: 'celulaX',
                              },
                              y: {
                                type: 'num',
                                value: 1,
                              },
                              z: {
                                type: 'var',
                                name: 'celulaZ',
                              },
                            },
                            {
                              type: 'g3k:playEffect',
                              fx: 'coin',
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
              type: 'if',
              cond: {
                type: 'logical',
                op: '&&',
                left: {
                  type: 'binop',
                  op: '>',
                  left: {
                    type: 'g3k:posOf',
                    axis: 'y',
                    charVar: 'ela',
                  },
                  right: {
                    type: 'num',
                    value: 2.2,
                  },
                },
                right: {
                  type: 'g3k:onGround',
                  charVar: 'ela',
                },
              },
              then: [
                {
                  type: 'g3k:playEffect',
                  fx: 'win',
                },
                {
                  type: 'g3k:setState',
                  name: 'vitoria',
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:hudText',
              slot: 'top-left',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Blocos: ',
                  },
                  right: {
                    type: 'var',
                    name: 'blocos',
                  },
                },
                right: {
                  type: 'str',
                  value: ' de 30',
                },
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'bottom-left',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Bloco: ',
                  },
                  right: {
                    type: 'var',
                    name: 'tipoDeBloco',
                  },
                },
                right: {
                  type: 'str',
                  value: ' (1 2 3)',
                },
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'top-right',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Modo: ',
                  },
                  right: {
                    type: 'var',
                    name: 'modo',
                  },
                },
                right: {
                  type: 'str',
                  value: ' (X troca)',
                },
              },
            },
          ],
        },
      ],
    },
  },
}

/**
 * Exemplo bundlado: "Patrulha Espacial Profissional" (nível 2 da família
 * Patrulha Espacial, o Space Shooter do curso raylib no motor avançado). Nave
 * de peças vista de trás anda SÓ no X (keyDown + clamp + place) com balanço
 * senoidal e atira com espaço (keyPressed + spawnFrom + moveForward, cooldown
 * de 0,4 s). ⭐ Morte dramática: o meteoro atingido vira estado "morrendo"
 * (clarão, congelado, sem machucar) e SÓ explode/recicla 0,25 s depois. Zona
 * única no meteoro (laser e nave são visitantes filtrados por isMold +
 * entityStateIs). 20 destruídos = vitória; 3 vidas com tremor e vinheta.
 * A IR foi GERADA pelo parser real a partir do SOURCE em
 * __gen_patrulhaProfissional.ts (drift: patrulhaProfissionalExample.test.ts).
 */
export const patrulhaEspacialProfissionalExample: ExtensionExample = {
  name: 'Patrulha Espacial Profissional',
  experience: 'game',
  description:
    'Pilote a nave vista de trás: ande para os lados, atire lasers e destrua 20 meteoros. O atingido brilha antes de explodir, a chuva acelera e cada batida treme a câmera. Tudo de peças, sem imagem.',
  ir: {
    html: [],
    css: [],
    extensions: [
      {
        extensionId: 'game-3d-advanced',
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g3k:setup',
          w: {
            type: 'num',
            value: 1280,
          },
          h: {
            type: 'num',
            value: 720,
          },
          world: {
            type: 'num',
            value: 130,
          },
          sky: '#020617',
          ground: '#0b1120',
        },
        {
          type: 'g3k:setEffects',
          shadows: true,
          bloom: true,
          strength: {
            type: 'num',
            value: 1.3,
          },
          vignette: true,
        },
        {
          type: 'g3k:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Patrulha Espacial Profissional',
          },
          text: {
            type: 'str',
            value:
              'Ande com A e D (ou as setas) e atire com espaço. O meteoro atingido brilha antes de explodir: destrua 20 para cumprir a patrulha!',
          },
          button: {
            type: 'str',
            value: 'Patrulhar',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'Patrulha cumprida!',
          },
          text: {
            type: 'str',
            value: 'Você destruiu 20 meteoros e o setor está seguro. Que pontaria!',
          },
          button: {
            type: 'str',
            value: 'Patrulhar de novo',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'fim',
          title: {
            type: 'str',
            value: 'A nave caiu...',
          },
          text: {
            type: 'str',
            value: 'Os meteoros venceram desta vez. Atire de longe e não pare de se mexer!',
          },
          button: {
            type: 'str',
            value: 'Tentar de novo',
          },
        },
        {
          type: 'g3k:defineMold',
          name: 'nave',
          health: {
            type: 'num',
            value: 3,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#94a3b8',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.9,
              },
              h: {
                type: 'num',
                value: 0.4,
              },
              d: {
                type: 'num',
                value: 1.8,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#38bdf8',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 2.4,
              },
              h: {
                type: 'num',
                value: 0.14,
              },
              d: {
                type: 'num',
                value: 0.8,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.45,
              },
              z: {
                type: 'num',
                value: -0.3,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'brilho',
              color: '#22d3ee',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.4,
              },
              h: {
                type: 'num',
                value: 0.7,
              },
              d: {
                type: 'num',
                value: 0.4,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.55,
              },
              z: {
                type: 'num',
                value: 1,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cylinder',
              material: 'brilho',
              color: '#f97316',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.3,
              },
              h: {
                type: 'num',
                value: 0.3,
              },
              d: {
                type: 'num',
                value: 0.3,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: -1.05,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'laser',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'brilho',
              color: '#4ade80',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.18,
              },
              h: {
                type: 'num',
                value: 0.18,
              },
              d: {
                type: 'num',
                value: 1.1,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: 0.8,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'meteoro',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'normal',
              color: '#78716c',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1.7,
              },
              h: {
                type: 'num',
                value: 1.7,
              },
              d: {
                type: 'num',
                value: 1.7,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'normal',
              color: '#57534e',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.6,
              },
              h: {
                type: 'num',
                value: 0.6,
              },
              d: {
                type: 'num',
                value: 0.6,
              },
              x: {
                type: 'num',
                value: 0.6,
              },
              y: {
                type: 'num',
                value: 0.45,
              },
              z: {
                type: 'num',
                value: 0.35,
              },
            },
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'normal',
              color: '#44403c',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.5,
              },
              h: {
                type: 'num',
                value: 0.5,
              },
              d: {
                type: 'num',
                value: 0.5,
              },
              x: {
                type: 'num',
                value: -0.55,
              },
              y: {
                type: 'num',
                value: -0.25,
              },
              z: {
                type: 'num',
                value: 0.5,
              },
            },
          ],
        },
        {
          type: 'g3k:setPhysics',
          mold: 'nave',
          kind: 'flutuante',
        },
        {
          type: 'g3k:makeTrigger',
          mold: 'meteoro',
        },
        {
          type: 'g3k:defineEffect',
          name: 'clarao',
          count: {
            type: 'num',
            value: 26,
          },
          colorFrom: '#f8fafc',
          colorTo: '#fde047',
          spread: {
            type: 'num',
            value: 6,
          },
          sizeFrom: {
            type: 'num',
            value: 0.5,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.3,
          },
          gravity: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g3k:defineEffect',
          name: 'explosao',
          count: {
            type: 'num',
            value: 34,
          },
          colorFrom: '#fb923c',
          colorTo: '#111827',
          spread: {
            type: 'num',
            value: 9,
          },
          sizeFrom: {
            type: 'num',
            value: 0.7,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.7,
          },
          gravity: {
            type: 'num',
            value: -4,
          },
        },
        {
          type: 'g3k:defineEffect',
          name: 'choque',
          count: {
            type: 'num',
            value: 16,
          },
          colorFrom: '#f43f5e',
          colorTo: '#111827',
          spread: {
            type: 'num',
            value: 5,
          },
          sizeFrom: {
            type: 'num',
            value: 0.45,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.5,
          },
          gravity: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g3k:defineEmitter',
          name: 'turbina',
          colorFrom: '#38bdf8',
          colorTo: '#0f172a',
          sizeFrom: {
            type: 'num',
            value: 0.3,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          rate: {
            type: 'num',
            value: 40,
          },
          speed: {
            type: 'num',
            value: 5,
          },
          cone: {
            type: 'num',
            value: 14,
          },
          gravity: {
            type: 'num',
            value: 0,
          },
          glow: true,
          curve: 'suave',
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
          name: 'tempoDeJogo',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'velocidade',
          value: {
            type: 'num',
            value: 12,
          },
        },
        {
          type: 'var',
          name: 'naveX',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'balanco',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'proximoTiro',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'proximoMeteoro',
          value: {
            type: 'num',
            value: 1.2,
          },
        },
        {
          type: 'g3k:stateTimer',
          mold: 'laser',
          state: 'parado',
          sec: {
            type: 'num',
            value: 1.6,
          },
          next: 'sumir',
        },
        {
          type: 'g3k:stateTimer',
          mold: 'meteoro',
          state: 'morrendo',
          sec: {
            type: 'num',
            value: 0.25,
          },
          next: 'acabou',
        },
      ],
      events: [
        {
          type: 'g3k:onEnterState',
          name: 'jogando',
          body: [
            {
              type: 'assign',
              name: 'pontos',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'assign',
              name: 'tempoDeJogo',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'assign',
              name: 'velocidade',
              value: {
                type: 'num',
                value: 12,
              },
            },
            {
              type: 'assign',
              name: 'naveX',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'assign',
              name: 'balanco',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'assign',
              name: 'proximoTiro',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'assign',
              name: 'proximoMeteoro',
              value: {
                type: 'num',
                value: 1.2,
              },
            },
            {
              type: 'g3k:setSeed',
              seed: {
                type: 'num',
                value: 9,
              },
            },
            {
              type: 'g3k:setAmbient',
              intensity: {
                type: 'num',
                value: 0.35,
              },
            },
            {
              type: 'g3k:setFog',
              color: '#020617',
              near: {
                type: 'num',
                value: 45,
              },
              far: {
                type: 'num',
                value: 120,
              },
            },
            {
              type: 'g3k:addLight',
              color: '#38bdf8',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 12,
              },
              z: {
                type: 'num',
                value: -10,
              },
              intensity: {
                type: 'num',
                value: 1.3,
              },
            },
            {
              type: 'g3k:spawnNamed',
              varName: 'patrulheira',
              mold: 'nave',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:cameraFollow',
              charVar: 'patrulheira',
              dist: {
                type: 'num',
                value: 10,
              },
              height: {
                type: 'num',
                value: 4,
              },
            },
            {
              type: 'g3k:cameraSmooth',
              lambda: {
                type: 'num',
                value: 6,
              },
            },
            {
              type: 'g3k:emitterOn',
              effect: 'turbina',
              charVar: 'patrulheira',
            },
            {
              type: 'g3k:say',
              charVar: 'patrulheira',
              text: {
                type: 'str',
                value: 'Patrulha iniciada!',
              },
              seconds: {
                type: 'num',
                value: 2,
              },
            },
          ],
        },
        {
          type: 'g3k:onEnterEntityState',
          mold: 'laser',
          state: 'sumir',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:recycle',
              charVar: 'ela',
            },
          ],
        },
        {
          type: 'g3k:onEnterEntityState',
          mold: 'meteoro',
          state: 'acabou',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:burstOn',
              effect: 'explosao',
              charVar: 'ela',
            },
            {
              type: 'g3k:playEffect',
              fx: 'explosion',
            },
            {
              type: 'g3k:recycle',
              charVar: 'ela',
            },
          ],
        },
        {
          type: 'g3k:onOverlap',
          mold: 'meteoro',
          zoneName: 'zona',
          whoName: 'quem',
          body: [
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '&&',
                left: {
                  type: 'g3k:isMold',
                  charVar: 'quem',
                  mold: 'laser',
                },
                right: {
                  type: 'g3k:entityStateIs',
                  charVar: 'zona',
                  state: 'parado',
                },
              },
              then: [
                {
                  type: 'g3k:recycle',
                  charVar: 'quem',
                },
                {
                  type: 'g3k:setVelocity',
                  charVar: 'zona',
                  x: {
                    type: 'num',
                    value: 0,
                  },
                  y: {
                    type: 'num',
                    value: 0,
                  },
                  z: {
                    type: 'num',
                    value: 0,
                  },
                },
                {
                  type: 'g3k:setEntityState',
                  charVar: 'zona',
                  state: 'morrendo',
                },
                {
                  type: 'g3k:burstOn',
                  effect: 'clarao',
                  charVar: 'zona',
                },
                {
                  type: 'g3k:playEffect',
                  fx: 'hit',
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
                  type: 'assign',
                  name: 'velocidade',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'velocidade',
                    },
                    right: {
                      type: 'num',
                      value: 0.3,
                    },
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '&&',
                left: {
                  type: 'g3k:isMold',
                  charVar: 'quem',
                  mold: 'nave',
                },
                right: {
                  type: 'g3k:entityStateIs',
                  charVar: 'zona',
                  state: 'parado',
                },
              },
              then: [
                {
                  type: 'g3k:burstOn',
                  effect: 'choque',
                  charVar: 'zona',
                },
                {
                  type: 'g3k:recycle',
                  charVar: 'zona',
                },
                {
                  type: 'g3k:hurt',
                  charVar: 'quem',
                  amount: {
                    type: 'num',
                    value: 1,
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onHurt',
          mold: 'nave',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:cameraShake',
              strength: {
                type: 'num',
                value: 0.6,
              },
              seconds: {
                type: 'num',
                value: 0.45,
              },
            },
            {
              type: 'g3k:playEffect',
              fx: 'hurt',
            },
          ],
        },
        {
          type: 'g3k:onEntityDeath',
          mold: 'nave',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:burstOn',
              effect: 'explosao',
              charVar: 'ela',
            },
            {
              type: 'g3k:playEffect',
              fx: 'gameover',
            },
            {
              type: 'g3k:endGame',
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'nave',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '||',
                left: {
                  type: 'g3k:keyDown',
                  key: 'a',
                },
                right: {
                  type: 'g3k:keyDown',
                  key: 'esquerda',
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'naveX',
                  value: {
                    type: 'binop',
                    op: '-',
                    left: {
                      type: 'var',
                      name: 'naveX',
                    },
                    right: {
                      type: 'binop',
                      op: '*',
                      left: {
                        type: 'num',
                        value: 16,
                      },
                      right: {
                        type: 'var',
                        name: 'dt',
                      },
                    },
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '||',
                left: {
                  type: 'g3k:keyDown',
                  key: 'd',
                },
                right: {
                  type: 'g3k:keyDown',
                  key: 'direita',
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'naveX',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'naveX',
                    },
                    right: {
                      type: 'binop',
                      op: '*',
                      left: {
                        type: 'num',
                        value: 16,
                      },
                      right: {
                        type: 'var',
                        name: 'dt',
                      },
                    },
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<',
                left: {
                  type: 'var',
                  name: 'naveX',
                },
                right: {
                  type: 'num',
                  value: -9,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'naveX',
                  value: {
                    type: 'num',
                    value: -9,
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
                  name: 'naveX',
                },
                right: {
                  type: 'num',
                  value: 9,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'naveX',
                  value: {
                    type: 'num',
                    value: 9,
                  },
                },
              ],
            },
            {
              type: 'assign',
              name: 'balanco',
              value: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'var',
                  name: 'balanco',
                },
                right: {
                  type: 'var',
                  name: 'dt',
                },
              },
            },
            {
              type: 'g3k:place',
              charVar: 'ela',
              x: {
                type: 'var',
                name: 'naveX',
              },
              y: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'num',
                  value: 1,
                },
                right: {
                  type: 'binop',
                  op: '*',
                  left: {
                    type: 'mathUnary',
                    fn: 'sin',
                    arg: {
                      type: 'binop',
                      op: '*',
                      left: {
                        type: 'var',
                        name: 'balanco',
                      },
                      right: {
                        type: 'num',
                        value: 5,
                      },
                    },
                  },
                  right: {
                    type: 'num',
                    value: 0.2,
                  },
                },
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'assign',
              name: 'proximoTiro',
              value: {
                type: 'binop',
                op: '-',
                left: {
                  type: 'var',
                  name: 'proximoTiro',
                },
                right: {
                  type: 'var',
                  name: 'dt',
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '&&',
                left: {
                  type: 'g3k:keyPressed',
                  key: 'espaco',
                },
                right: {
                  type: 'binop',
                  op: '<=',
                  left: {
                    type: 'var',
                    name: 'proximoTiro',
                  },
                  right: {
                    type: 'num',
                    value: 0,
                  },
                },
              },
              then: [
                {
                  type: 'g3k:spawnFrom',
                  mold: 'laser',
                  fromVar: 'ela',
                },
                {
                  type: 'g3k:playEffect',
                  fx: 'laser',
                },
                {
                  type: 'assign',
                  name: 'proximoTiro',
                  value: {
                    type: 'num',
                    value: 0.4,
                  },
                },
              ],
            },
            {
              type: 'g3k:hudText',
              slot: 'top-left',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Vida: ',
                },
                right: {
                  type: 'g3k:healthOf',
                  charVar: 'ela',
                },
              },
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'laser',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:moveForward',
              charVar: 'ela',
              speed: {
                type: 'num',
                value: 42,
              },
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'meteoro',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:setEntityValue',
              charVar: 'ela',
              key: 'giro',
              value: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'g3k:entityValue',
                  key: 'giro',
                  charVar: 'ela',
                },
                right: {
                  type: 'binop',
                  op: '*',
                  left: {
                    type: 'num',
                    value: 90,
                  },
                  right: {
                    type: 'var',
                    name: 'dt',
                  },
                },
              },
            },
            {
              type: 'g3k:setYaw',
              charVar: 'ela',
              degrees: {
                type: 'g3k:entityValue',
                key: 'giro',
                charVar: 'ela',
              },
            },
          ],
        },
        {
          type: 'g3k:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'assign',
              name: 'tempoDeJogo',
              value: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'var',
                  name: 'tempoDeJogo',
                },
                right: {
                  type: 'var',
                  name: 'dt',
                },
              },
            },
            {
              type: 'assign',
              name: 'velocidade',
              value: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'var',
                  name: 'velocidade',
                },
                right: {
                  type: 'binop',
                  op: '*',
                  left: {
                    type: 'var',
                    name: 'dt',
                  },
                  right: {
                    type: 'num',
                    value: 0.3,
                  },
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>',
                left: {
                  type: 'var',
                  name: 'velocidade',
                },
                right: {
                  type: 'num',
                  value: 30,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'velocidade',
                  value: {
                    type: 'num',
                    value: 30,
                  },
                },
              ],
            },
            {
              type: 'assign',
              name: 'proximoMeteoro',
              value: {
                type: 'binop',
                op: '-',
                left: {
                  type: 'var',
                  name: 'proximoMeteoro',
                },
                right: {
                  type: 'var',
                  name: 'dt',
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<=',
                left: {
                  type: 'var',
                  name: 'proximoMeteoro',
                },
                right: {
                  type: 'num',
                  value: 0,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'proximoMeteoro',
                  value: {
                    type: 'binop',
                    op: '/',
                    left: {
                      type: 'num',
                      value: 22,
                    },
                    right: {
                      type: 'var',
                      name: 'velocidade',
                    },
                  },
                },
                {
                  type: 'g3k:spawnNamed',
                  varName: 'pedra',
                  mold: 'meteoro',
                  x: {
                    type: 'g3k:randomBetween',
                    from: {
                      type: 'num',
                      value: -9,
                    },
                    to: {
                      type: 'num',
                      value: 9,
                    },
                  },
                  y: {
                    type: 'num',
                    value: 1,
                  },
                  z: {
                    type: 'num',
                    value: 58,
                  },
                },
                {
                  type: 'g3k:setVelocity',
                  charVar: 'pedra',
                  x: {
                    type: 'num',
                    value: 0,
                  },
                  y: {
                    type: 'num',
                    value: 0,
                  },
                  z: {
                    type: 'binop',
                    op: '-',
                    left: {
                      type: 'num',
                      value: 0,
                    },
                    right: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'var',
                        name: 'velocidade',
                      },
                      right: {
                        type: 'g3k:randomBetween',
                        from: {
                          type: 'num',
                          value: 0,
                        },
                        to: {
                          type: 'num',
                          value: 6,
                        },
                      },
                    },
                  },
                },
                {
                  type: 'g3k:setEntityValue',
                  charVar: 'pedra',
                  key: 'giro',
                  value: {
                    type: 'g3k:randomBetween',
                    from: {
                      type: 'num',
                      value: 0,
                    },
                    to: {
                      type: 'num',
                      value: 360,
                    },
                  },
                },
              ],
            },
            {
              type: 'g3k:cullFar',
              mold: 'meteoro',
              dist: {
                type: 'num',
                value: 90,
              },
            },
            {
              type: 'g3k:cullFar',
              mold: 'laser',
              dist: {
                type: 'num',
                value: 80,
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'top-right',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Meteoros: ',
                  },
                  right: {
                    type: 'var',
                    name: 'pontos',
                  },
                },
                right: {
                  type: 'str',
                  value: ' de 20',
                },
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'bottom-right',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Tempo: ',
                  },
                  right: {
                    type: 'mathUnary',
                    fn: 'floor',
                    arg: {
                      type: 'var',
                      name: 'tempoDeJogo',
                    },
                  },
                },
                right: {
                  type: 'str',
                  value: 's',
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>=',
                left: {
                  type: 'var',
                  name: 'pontos',
                },
                right: {
                  type: 'num',
                  value: 20,
                },
              },
              then: [
                {
                  type: 'g3k:playEffect',
                  fx: 'win',
                },
                {
                  type: 'g3k:setState',
                  name: 'vitoria',
                },
              ],
            },
          ],
        },
      ],
    },
  },
}

export const atravesseProfissionalExample: ExtensionExample = {
  name: 'Atravesse a Rua Profissional',
  experience: 'game',
  description:
    'O Crossy Road no motor avancado: pule em grade com as setas, atravesse as faixas e desvie dos carros que cruzam a pista. Chegue na faixa 20 sem ser atropelado. Tudo de pecas, sem imagem.',
  ir: {
    html: [],
    css: [],
    extensions: [
      {
        extensionId: 'game-3d-advanced',
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g3k:setup',
          w: {
            type: 'num',
            value: 1280,
          },
          h: {
            type: 'num',
            value: 720,
          },
          world: {
            type: 'num',
            value: 80,
          },
          sky: '#bfe3ff',
          ground: '#8ecb62',
        },
        {
          type: 'g3k:setEffects',
          shadows: true,
          bloom: false,
          strength: {
            type: 'num',
            value: 1,
          },
          vignette: true,
        },
        {
          type: 'g3k:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Atravesse a Rua Profissional',
          },
          text: {
            type: 'str',
            value:
              'Pule com as setas (ou WASD) e atravesse 20 faixas sem ser atropelado. Espere a faixa abrir e pule na hora certa!',
          },
          button: {
            type: 'str',
            value: 'Atravessar',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'Voce atravessou!',
          },
          text: {
            type: 'str',
            value: 'Chegou do outro lado em seguranca depois de 20 faixas. Que reflexos!',
          },
          button: {
            type: 'str',
            value: 'Jogar de novo',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'fim',
          title: {
            type: 'str',
            value: 'Foi atropelado!',
          },
          text: {
            type: 'str',
            value: 'Um carro te pegou. Olhe as duas direcoes e pule na brecha!',
          },
          button: {
            type: 'str',
            value: 'Tentar de novo',
          },
        },
        {
          type: 'g3k:defineMold',
          name: 'heroi',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 16,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#f8fafc',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.7,
              },
              h: {
                type: 'num',
                value: 0.7,
              },
              d: {
                type: 'num',
                value: 0.7,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.4,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#f0619a',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.24,
              },
              h: {
                type: 'num',
                value: 0.24,
              },
              d: {
                type: 'num',
                value: 0.24,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.86,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'carro',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#ef4444',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1.7,
              },
              h: {
                type: 'num',
                value: 0.5,
              },
              d: {
                type: 'num',
                value: 0.9,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.3,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#dbeafe',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.8,
              },
              h: {
                type: 'num',
                value: 0.36,
              },
              d: {
                type: 'num',
                value: 0.86,
              },
              x: {
                type: 'num',
                value: -0.15,
              },
              y: {
                type: 'num',
                value: 0.66,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:setPhysics',
          mold: 'heroi',
          kind: 'personagem',
        },
        {
          type: 'g3k:makeTrigger',
          mold: 'carro',
        },
        {
          type: 'g3k:defineEffect',
          name: 'batida',
          count: {
            type: 'num',
            value: 24,
          },
          colorFrom: '#f87171',
          colorTo: '#111827',
          spread: {
            type: 'num',
            value: 5,
          },
          sizeFrom: {
            type: 'num',
            value: 0.5,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.5,
          },
          gravity: {
            type: 'num',
            value: -3,
          },
        },
        {
          type: 'var',
          name: 'linha',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'coluna',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'alvoX',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'alvoZ',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'proximoCarro',
          value: {
            type: 'num',
            value: 0.8,
          },
        },
        {
          type: 'var',
          name: 'velocidade',
          value: {
            type: 'num',
            value: 7,
          },
        },
      ],
      events: [
        {
          type: 'g3k:onEnterState',
          name: 'jogando',
          body: [
            {
              type: 'assign',
              name: 'linha',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'assign',
              name: 'coluna',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'assign',
              name: 'alvoX',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'assign',
              name: 'alvoZ',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'assign',
              name: 'proximoCarro',
              value: {
                type: 'num',
                value: 0.8,
              },
            },
            {
              type: 'assign',
              name: 'velocidade',
              value: {
                type: 'num',
                value: 7,
              },
            },
            {
              type: 'g3k:setSeed',
              seed: {
                type: 'num',
                value: 5,
              },
            },
            {
              type: 'g3k:setAmbient',
              intensity: {
                type: 'num',
                value: 0.7,
              },
            },
            {
              type: 'g3k:setFog',
              color: '#bfe3ff',
              near: {
                type: 'num',
                value: 44,
              },
              far: {
                type: 'num',
                value: 96,
              },
            },
            {
              type: 'g3k:addLight',
              color: '#fff7d6',
              x: {
                type: 'num',
                value: -8,
              },
              y: {
                type: 'num',
                value: 16,
              },
              z: {
                type: 'num',
                value: -6,
              },
              intensity: {
                type: 'num',
                value: 1,
              },
            },
            {
              type: 'g3k:spawnNamed',
              varName: 'boneco',
              mold: 'heroi',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:setYaw',
              charVar: 'boneco',
              degrees: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:cameraFollow',
              charVar: 'boneco',
              dist: {
                type: 'num',
                value: 11,
              },
              height: {
                type: 'num',
                value: 15,
              },
            },
            {
              type: 'g3k:cameraSmooth',
              lambda: {
                type: 'num',
                value: 5,
              },
            },
            {
              type: 'g3k:say',
              charVar: 'boneco',
              text: {
                type: 'str',
                value: 'Vai!',
              },
              seconds: {
                type: 'num',
                value: 1,
              },
            },
          ],
        },
        {
          type: 'g3k:onOverlap',
          mold: 'carro',
          zoneName: 'zona',
          whoName: 'quem',
          body: [
            {
              type: 'if',
              cond: {
                type: 'g3k:isMold',
                charVar: 'quem',
                mold: 'heroi',
              },
              then: [
                {
                  type: 'g3k:burstOn',
                  effect: 'batida',
                  charVar: 'quem',
                },
                {
                  type: 'g3k:hurt',
                  charVar: 'quem',
                  amount: {
                    type: 'num',
                    value: 1,
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onEntityDeath',
          mold: 'heroi',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:cameraShake',
              strength: {
                type: 'num',
                value: 0.6,
              },
              seconds: {
                type: 'num',
                value: 0.4,
              },
            },
            {
              type: 'g3k:playEffect',
              fx: 'gameover',
            },
            {
              type: 'g3k:endGame',
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'heroi',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '||',
                left: {
                  type: 'g3k:keyPressed',
                  key: 'w',
                },
                right: {
                  type: 'g3k:keyPressed',
                  key: 'cima',
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'linha',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'linha',
                    },
                    right: {
                      type: 'num',
                      value: 1,
                    },
                  },
                },
                {
                  type: 'assign',
                  name: 'alvoZ',
                  value: {
                    type: 'binop',
                    op: '*',
                    left: {
                      type: 'var',
                      name: 'linha',
                    },
                    right: {
                      type: 'num',
                      value: 2,
                    },
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '||',
                left: {
                  type: 'g3k:keyPressed',
                  key: 's',
                },
                right: {
                  type: 'g3k:keyPressed',
                  key: 'baixo',
                },
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'var',
                      name: 'linha',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'linha',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'var',
                          name: 'linha',
                        },
                        right: {
                          type: 'num',
                          value: 1,
                        },
                      },
                    },
                    {
                      type: 'assign',
                      name: 'alvoZ',
                      value: {
                        type: 'binop',
                        op: '*',
                        left: {
                          type: 'var',
                          name: 'linha',
                        },
                        right: {
                          type: 'num',
                          value: 2,
                        },
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '||',
                left: {
                  type: 'g3k:keyPressed',
                  key: 'a',
                },
                right: {
                  type: 'g3k:keyPressed',
                  key: 'esquerda',
                },
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'var',
                      name: 'coluna',
                    },
                    right: {
                      type: 'num',
                      value: -4,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'coluna',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'var',
                          name: 'coluna',
                        },
                        right: {
                          type: 'num',
                          value: 1,
                        },
                      },
                    },
                    {
                      type: 'assign',
                      name: 'alvoX',
                      value: {
                        type: 'binop',
                        op: '*',
                        left: {
                          type: 'var',
                          name: 'coluna',
                        },
                        right: {
                          type: 'num',
                          value: 2,
                        },
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '||',
                left: {
                  type: 'g3k:keyPressed',
                  key: 'd',
                },
                right: {
                  type: 'g3k:keyPressed',
                  key: 'direita',
                },
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: {
                      type: 'var',
                      name: 'coluna',
                    },
                    right: {
                      type: 'num',
                      value: 4,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'coluna',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'coluna',
                        },
                        right: {
                          type: 'num',
                          value: 1,
                        },
                      },
                    },
                    {
                      type: 'assign',
                      name: 'alvoX',
                      value: {
                        type: 'binop',
                        op: '*',
                        left: {
                          type: 'var',
                          name: 'coluna',
                        },
                        right: {
                          type: 'num',
                          value: 2,
                        },
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'g3k:seekPoint',
              charVar: 'ela',
              x: {
                type: 'var',
                name: 'alvoX',
              },
              z: {
                type: 'var',
                name: 'alvoZ',
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'top-left',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Faixa: ',
                  },
                  right: {
                    type: 'var',
                    name: 'linha',
                  },
                },
                right: {
                  type: 'str',
                  value: ' de 20',
                },
              },
            },
          ],
        },
        {
          type: 'g3k:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'assign',
              name: 'velocidade',
              value: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'var',
                  name: 'velocidade',
                },
                right: {
                  type: 'binop',
                  op: '*',
                  left: {
                    type: 'var',
                    name: 'dt',
                  },
                  right: {
                    type: 'num',
                    value: 0.15,
                  },
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>',
                left: {
                  type: 'var',
                  name: 'velocidade',
                },
                right: {
                  type: 'num',
                  value: 13,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'velocidade',
                  value: {
                    type: 'num',
                    value: 13,
                  },
                },
              ],
            },
            {
              type: 'assign',
              name: 'proximoCarro',
              value: {
                type: 'binop',
                op: '-',
                left: {
                  type: 'var',
                  name: 'proximoCarro',
                },
                right: {
                  type: 'var',
                  name: 'dt',
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<=',
                left: {
                  type: 'var',
                  name: 'proximoCarro',
                },
                right: {
                  type: 'num',
                  value: 0,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'proximoCarro',
                  value: {
                    type: 'g3k:randomBetween',
                    from: {
                      type: 'num',
                      value: 0.5,
                    },
                    to: {
                      type: 'num',
                      value: 1.2,
                    },
                  },
                },
                {
                  type: 'var',
                  name: 'faixa',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'linha',
                    },
                    right: {
                      type: 'mathUnary',
                      fn: 'floor',
                      arg: {
                        type: 'g3k:randomBetween',
                        from: {
                          type: 'num',
                          value: 2,
                        },
                        to: {
                          type: 'num',
                          value: 8,
                        },
                      },
                    },
                  },
                  kind: 'const',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g3k:randomChance',
                    percent: {
                      type: 'num',
                      value: 50,
                    },
                  },
                  then: [
                    {
                      type: 'g3k:spawnNamed',
                      varName: 'carroD',
                      mold: 'carro',
                      x: {
                        type: 'num',
                        value: -12,
                      },
                      y: {
                        type: 'num',
                        value: 0,
                      },
                      z: {
                        type: 'binop',
                        op: '*',
                        left: {
                          type: 'var',
                          name: 'faixa',
                        },
                        right: {
                          type: 'num',
                          value: 2,
                        },
                      },
                    },
                    {
                      type: 'g3k:setYaw',
                      charVar: 'carroD',
                      degrees: {
                        type: 'num',
                        value: 90,
                      },
                    },
                    {
                      type: 'g3k:setVelocity',
                      charVar: 'carroD',
                      x: {
                        type: 'var',
                        name: 'velocidade',
                      },
                      y: {
                        type: 'num',
                        value: 0,
                      },
                      z: {
                        type: 'num',
                        value: 0,
                      },
                    },
                  ],
                  else: [
                    {
                      type: 'g3k:spawnNamed',
                      varName: 'carroE',
                      mold: 'carro',
                      x: {
                        type: 'num',
                        value: 12,
                      },
                      y: {
                        type: 'num',
                        value: 0,
                      },
                      z: {
                        type: 'binop',
                        op: '*',
                        left: {
                          type: 'var',
                          name: 'faixa',
                        },
                        right: {
                          type: 'num',
                          value: 2,
                        },
                      },
                    },
                    {
                      type: 'g3k:setYaw',
                      charVar: 'carroE',
                      degrees: {
                        type: 'num',
                        value: 270,
                      },
                    },
                    {
                      type: 'g3k:setVelocity',
                      charVar: 'carroE',
                      x: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'num',
                          value: 0,
                        },
                        right: {
                          type: 'var',
                          name: 'velocidade',
                        },
                      },
                      y: {
                        type: 'num',
                        value: 0,
                      },
                      z: {
                        type: 'num',
                        value: 0,
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'g3k:forEachAlive',
              mold: 'carro',
              itemName: 'c',
              body: [
                {
                  type: 'if',
                  cond: {
                    type: 'logical',
                    op: '||',
                    left: {
                      type: 'binop',
                      op: '>',
                      left: {
                        type: 'g3k:posOf',
                        axis: 'x',
                        charVar: 'c',
                      },
                      right: {
                        type: 'num',
                        value: 16,
                      },
                    },
                    right: {
                      type: 'binop',
                      op: '<',
                      left: {
                        type: 'g3k:posOf',
                        axis: 'x',
                        charVar: 'c',
                      },
                      right: {
                        type: 'num',
                        value: -16,
                      },
                    },
                  },
                  then: [
                    {
                      type: 'g3k:recycle',
                      charVar: 'c',
                    },
                  ],
                },
              ],
            },
            {
              type: 'g3k:hudText',
              slot: 'top-right',
              text: {
                type: 'str',
                value: 'Chegue na faixa 20!',
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>=',
                left: {
                  type: 'var',
                  name: 'linha',
                },
                right: {
                  type: 'num',
                  value: 20,
                },
              },
              then: [
                {
                  type: 'g3k:playEffect',
                  fx: 'win',
                },
                {
                  type: 'g3k:setState',
                  name: 'vitoria',
                },
              ],
            },
          ],
        },
      ],
    },
  },
}

export const reunirRebanhoProfissionalExample: ExtensionExample = {
  name: 'Reunir o Rebanho Profissional',
  experience: 'game',
  description:
    'Pastoreie no motor avançado: cada bichinho tem cérebro próprio (vagar e seguir). Chegue perto para o rebanho seguir você e leve o grupo ao curral. Reúna 8 antes do tempo. Tudo de peças, sem imagem.',
  ir: {
    html: [],
    css: [],
    extensions: [
      {
        extensionId: 'game-3d-advanced',
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g3k:setup',
          w: {
            type: 'num',
            value: 1280,
          },
          h: {
            type: 'num',
            value: 720,
          },
          world: {
            type: 'num',
            value: 60,
          },
          sky: '#7dd3fc',
          ground: '#166534',
        },
        {
          type: 'g3k:setEffects',
          shadows: true,
          bloom: true,
          strength: {
            type: 'num',
            value: 1.1,
          },
          vignette: true,
        },
        {
          type: 'g3k:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Reunir o Rebanho Profissional',
          },
          text: {
            type: 'str',
            value:
              'Ande com WASD ou as setas. Chegue perto dos bichinhos que vagam para eles seguirem você e leve o rebanho ao curral dourado. Reúna 8 antes do tempo acabar!',
          },
          button: {
            type: 'str',
            value: 'Pastorear',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'Rebanho reunido!',
          },
          text: {
            type: 'str',
            value: 'Você guiou 8 bichinhos até o curral. Que pastor!',
          },
          button: {
            type: 'str',
            value: 'Pastorear de novo',
          },
        },
        {
          type: 'g3k:setScreenText',
          screen: 'fim',
          title: {
            type: 'str',
            value: 'O tempo acabou...',
          },
          text: {
            type: 'str',
            value:
              'Faltaram bichinhos no curral. Chegue perto para eles seguirem e leve o grupo junto!',
          },
          button: {
            type: 'str',
            value: 'Tentar de novo',
          },
        },
        {
          type: 'g3k:defineMold',
          name: 'pastor',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#0ea5e9',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.9,
              },
              h: {
                type: 'num',
                value: 1.2,
              },
              d: {
                type: 'num',
                value: 0.9,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.6,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'cone',
              material: 'brilho',
              color: '#fbbf24',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.7,
              },
              h: {
                type: 'num',
                value: 0.5,
              },
              d: {
                type: 'num',
                value: 0.7,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1.35,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'bicho',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 4.5,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'sphere',
              material: 'normal',
              color: '#f8fafc',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 1,
              },
              h: {
                type: 'num',
                value: 0.9,
              },
              d: {
                type: 'num',
                value: 1.1,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#1f2937',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.35,
              },
              h: {
                type: 'num',
                value: 0.35,
              },
              d: {
                type: 'num',
                value: 0.35,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.6,
              },
              z: {
                type: 'num',
                value: 0.55,
              },
            },
          ],
        },
        {
          type: 'g3k:defineMold',
          name: 'curral',
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'brilho',
              color: '#fbbf24',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 6,
              },
              h: {
                type: 'num',
                value: 0.3,
              },
              d: {
                type: 'num',
                value: 6,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.15,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#b45309',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 6,
              },
              h: {
                type: 'num',
                value: 1,
              },
              d: {
                type: 'num',
                value: 0.3,
              },
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: -3,
              },
            },
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#b45309',
              texture: '',
              model: '',
              w: {
                type: 'num',
                value: 0.3,
              },
              h: {
                type: 'num',
                value: 1,
              },
              d: {
                type: 'num',
                value: 6,
              },
              x: {
                type: 'num',
                value: -3,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: 0,
              },
            },
          ],
        },
        {
          type: 'g3k:makeTrigger',
          mold: 'curral',
        },
        {
          type: 'g3k:defineEffect',
          name: 'laco',
          count: {
            type: 'num',
            value: 14,
          },
          colorFrom: '#22d3ee',
          colorTo: '#0369a1',
          spread: {
            type: 'num',
            value: 4,
          },
          sizeFrom: {
            type: 'num',
            value: 0.35,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.4,
          },
          gravity: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g3k:defineEffect',
          name: 'entrega',
          count: {
            type: 'num',
            value: 22,
          },
          colorFrom: '#fde047',
          colorTo: '#166534',
          spread: {
            type: 'num',
            value: 6,
          },
          sizeFrom: {
            type: 'num',
            value: 0.5,
          },
          sizeTo: {
            type: 'num',
            value: 0,
          },
          life: {
            type: 'num',
            value: 0.6,
          },
          gravity: {
            type: 'num',
            value: 2,
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
          name: 'tempoRestante',
          value: {
            type: 'num',
            value: 75,
          },
        },
        {
          type: 'var',
          name: 'pastorX',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'pastorZ',
          value: {
            type: 'num',
            value: 8,
          },
        },
        {
          type: 'var',
          name: 'proximoBicho',
          value: {
            type: 'num',
            value: 1.5,
          },
        },
        {
          type: 'g3k:stateTimer',
          mold: 'bicho',
          state: 'parado',
          sec: {
            type: 'num',
            value: 0.2,
          },
          next: 'vagando',
        },
      ],
      events: [
        {
          type: 'g3k:onEnterState',
          name: 'jogando',
          body: [
            {
              type: 'assign',
              name: 'pontos',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'assign',
              name: 'tempoRestante',
              value: {
                type: 'num',
                value: 75,
              },
            },
            {
              type: 'assign',
              name: 'pastorX',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'assign',
              name: 'pastorZ',
              value: {
                type: 'num',
                value: 8,
              },
            },
            {
              type: 'assign',
              name: 'proximoBicho',
              value: {
                type: 'num',
                value: 1.5,
              },
            },
            {
              type: 'g3k:setSeed',
              seed: {
                type: 'num',
                value: 5,
              },
            },
            {
              type: 'g3k:setAmbient',
              intensity: {
                type: 'num',
                value: 0.55,
              },
            },
            {
              type: 'g3k:setFog',
              color: '#7dd3fc',
              near: {
                type: 'num',
                value: 55,
              },
              far: {
                type: 'num',
                value: 120,
              },
            },
            {
              type: 'g3k:addLight',
              color: '#fef9c3',
              x: {
                type: 'num',
                value: -8,
              },
              y: {
                type: 'num',
                value: 14,
              },
              z: {
                type: 'num',
                value: -6,
              },
              intensity: {
                type: 'num',
                value: 1.2,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'curral',
              x: {
                type: 'num',
                value: 16,
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: 16,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'bicho',
              x: {
                type: 'num',
                value: -12,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: -6,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'bicho',
              x: {
                type: 'num',
                value: -6,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: 10,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'bicho',
              x: {
                type: 'num',
                value: 4,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: -12,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'bicho',
              x: {
                type: 'num',
                value: 12,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: -4,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'bicho',
              x: {
                type: 'num',
                value: -14,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: 6,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'bicho',
              x: {
                type: 'num',
                value: 8,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: 8,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'bicho',
              x: {
                type: 'num',
                value: -2,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: -14,
              },
            },
            {
              type: 'g3k:spawn',
              mold: 'bicho',
              x: {
                type: 'num',
                value: 14,
              },
              y: {
                type: 'num',
                value: 0.5,
              },
              z: {
                type: 'num',
                value: 12,
              },
            },
            {
              type: 'g3k:spawnNamed',
              varName: 'guia',
              mold: 'pastor',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 1,
              },
              z: {
                type: 'num',
                value: 8,
              },
            },
            {
              type: 'g3k:cameraFollow',
              charVar: 'guia',
              dist: {
                type: 'num',
                value: 16,
              },
              height: {
                type: 'num',
                value: 13,
              },
            },
            {
              type: 'g3k:cameraSmooth',
              lambda: {
                type: 'num',
                value: 6,
              },
            },
            {
              type: 'g3k:say',
              charVar: 'guia',
              text: {
                type: 'str',
                value: 'Toca o rebanho!',
              },
              seconds: {
                type: 'num',
                value: 2,
              },
            },
          ],
        },
        {
          type: 'g3k:onEnterEntityState',
          mold: 'bicho',
          state: 'vagando',
          itemName: 'ela',
          body: [
            {
              type: 'g3k:setEntityValue',
              charVar: 'ela',
              key: 'alvoX',
              value: {
                type: 'g3k:randomBetween',
                from: {
                  type: 'num',
                  value: -16,
                },
                to: {
                  type: 'num',
                  value: 16,
                },
              },
            },
            {
              type: 'g3k:setEntityValue',
              charVar: 'ela',
              key: 'alvoZ',
              value: {
                type: 'g3k:randomBetween',
                from: {
                  type: 'num',
                  value: -16,
                },
                to: {
                  type: 'num',
                  value: 16,
                },
              },
            },
          ],
        },
        {
          type: 'g3k:onOverlap',
          mold: 'curral',
          zoneName: 'zona',
          whoName: 'quem',
          body: [
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '&&',
                left: {
                  type: 'g3k:isMold',
                  charVar: 'quem',
                  mold: 'bicho',
                },
                right: {
                  type: 'g3k:entityStateIs',
                  charVar: 'quem',
                  state: 'seguindo',
                },
              },
              then: [
                {
                  type: 'g3k:burstOn',
                  effect: 'entrega',
                  charVar: 'quem',
                },
                {
                  type: 'g3k:playEffect',
                  fx: 'coin',
                },
                {
                  type: 'g3k:recycle',
                  charVar: 'quem',
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
              ],
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'pastor',
          state: 'parado',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '||',
                left: {
                  type: 'g3k:keyDown',
                  key: 'a',
                },
                right: {
                  type: 'g3k:keyDown',
                  key: 'esquerda',
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'pastorX',
                  value: {
                    type: 'binop',
                    op: '-',
                    left: {
                      type: 'var',
                      name: 'pastorX',
                    },
                    right: {
                      type: 'binop',
                      op: '*',
                      left: {
                        type: 'num',
                        value: 13,
                      },
                      right: {
                        type: 'var',
                        name: 'dt',
                      },
                    },
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '||',
                left: {
                  type: 'g3k:keyDown',
                  key: 'd',
                },
                right: {
                  type: 'g3k:keyDown',
                  key: 'direita',
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'pastorX',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'pastorX',
                    },
                    right: {
                      type: 'binop',
                      op: '*',
                      left: {
                        type: 'num',
                        value: 13,
                      },
                      right: {
                        type: 'var',
                        name: 'dt',
                      },
                    },
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '||',
                left: {
                  type: 'g3k:keyDown',
                  key: 'w',
                },
                right: {
                  type: 'g3k:keyDown',
                  key: 'cima',
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'pastorZ',
                  value: {
                    type: 'binop',
                    op: '-',
                    left: {
                      type: 'var',
                      name: 'pastorZ',
                    },
                    right: {
                      type: 'binop',
                      op: '*',
                      left: {
                        type: 'num',
                        value: 13,
                      },
                      right: {
                        type: 'var',
                        name: 'dt',
                      },
                    },
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '||',
                left: {
                  type: 'g3k:keyDown',
                  key: 's',
                },
                right: {
                  type: 'g3k:keyDown',
                  key: 'baixo',
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'pastorZ',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'pastorZ',
                    },
                    right: {
                      type: 'binop',
                      op: '*',
                      left: {
                        type: 'num',
                        value: 13,
                      },
                      right: {
                        type: 'var',
                        name: 'dt',
                      },
                    },
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<',
                left: {
                  type: 'var',
                  name: 'pastorX',
                },
                right: {
                  type: 'num',
                  value: -24,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'pastorX',
                  value: {
                    type: 'num',
                    value: -24,
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
                  name: 'pastorX',
                },
                right: {
                  type: 'num',
                  value: 24,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'pastorX',
                  value: {
                    type: 'num',
                    value: 24,
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<',
                left: {
                  type: 'var',
                  name: 'pastorZ',
                },
                right: {
                  type: 'num',
                  value: -24,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'pastorZ',
                  value: {
                    type: 'num',
                    value: -24,
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
                  name: 'pastorZ',
                },
                right: {
                  type: 'num',
                  value: 24,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'pastorZ',
                  value: {
                    type: 'num',
                    value: 24,
                  },
                },
              ],
            },
            {
              type: 'g3k:place',
              charVar: 'ela',
              x: {
                type: 'var',
                name: 'pastorX',
              },
              y: {
                type: 'num',
                value: 1,
              },
              z: {
                type: 'var',
                name: 'pastorZ',
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'top-left',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Reunidos: ',
                  },
                  right: {
                    type: 'var',
                    name: 'pontos',
                  },
                },
                right: {
                  type: 'str',
                  value: ' de 8',
                },
              },
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'bicho',
          state: 'vagando',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:seekPoint',
              charVar: 'ela',
              x: {
                type: 'g3k:entityValue',
                key: 'alvoX',
                charVar: 'ela',
              },
              z: {
                type: 'g3k:entityValue',
                key: 'alvoZ',
                charVar: 'ela',
              },
            },
            {
              type: 'g3k:faceVelocity',
              charVar: 'ela',
            },
            {
              type: 'if',
              cond: {
                type: 'g3k:randomChance',
                percent: {
                  type: 'num',
                  value: 1,
                },
              },
              then: [
                {
                  type: 'g3k:setEntityValue',
                  charVar: 'ela',
                  key: 'alvoX',
                  value: {
                    type: 'g3k:randomBetween',
                    from: {
                      type: 'num',
                      value: -16,
                    },
                    to: {
                      type: 'num',
                      value: 16,
                    },
                  },
                },
                {
                  type: 'g3k:setEntityValue',
                  charVar: 'ela',
                  key: 'alvoZ',
                  value: {
                    type: 'g3k:randomBetween',
                    from: {
                      type: 'num',
                      value: -16,
                    },
                    to: {
                      type: 'num',
                      value: 16,
                    },
                  },
                },
              ],
            },
            {
              type: 'g3k:storeNearest',
              varName: 'guia',
              mold: 'pastor',
              charVar: 'ela',
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '&&',
                left: {
                  type: 'g3k:exists',
                  charVar: 'guia',
                },
                right: {
                  type: 'g3k:touches',
                  aVar: 'ela',
                  bVar: 'guia',
                  dist: {
                    type: 'num',
                    value: 3,
                  },
                },
              },
              then: [
                {
                  type: 'g3k:setEntityState',
                  charVar: 'ela',
                  state: 'seguindo',
                },
                {
                  type: 'g3k:burstOn',
                  effect: 'laco',
                  charVar: 'ela',
                },
                {
                  type: 'g3k:playEffect',
                  fx: 'coin',
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onEntityStateUpdate',
          mold: 'bicho',
          state: 'seguindo',
          itemName: 'ela',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:storeNearest',
              varName: 'guia',
              mold: 'pastor',
              charVar: 'ela',
            },
            {
              type: 'if',
              cond: {
                type: 'logicalNot',
                value: {
                  type: 'g3k:exists',
                  charVar: 'guia',
                },
              },
              then: [
                {
                  type: 'g3k:setEntityState',
                  charVar: 'ela',
                  state: 'vagando',
                },
              ],
              else: [
                {
                  type: 'g3k:seekPoint',
                  charVar: 'ela',
                  x: {
                    type: 'g3k:posOf',
                    axis: 'x',
                    charVar: 'guia',
                  },
                  z: {
                    type: 'g3k:posOf',
                    axis: 'z',
                    charVar: 'guia',
                  },
                },
                {
                  type: 'g3k:faceVelocity',
                  charVar: 'ela',
                },
              ],
            },
          ],
        },
        {
          type: 'g3k:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'assign',
              name: 'tempoRestante',
              value: {
                type: 'binop',
                op: '-',
                left: {
                  type: 'var',
                  name: 'tempoRestante',
                },
                right: {
                  type: 'var',
                  name: 'dt',
                },
              },
            },
            {
              type: 'assign',
              name: 'proximoBicho',
              value: {
                type: 'binop',
                op: '-',
                left: {
                  type: 'var',
                  name: 'proximoBicho',
                },
                right: {
                  type: 'var',
                  name: 'dt',
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'logical',
                op: '&&',
                left: {
                  type: 'binop',
                  op: '<=',
                  left: {
                    type: 'var',
                    name: 'proximoBicho',
                  },
                  right: {
                    type: 'num',
                    value: 0,
                  },
                },
                right: {
                  type: 'binop',
                  op: '<',
                  left: {
                    type: 'g3k:countAlive',
                    mold: 'bicho',
                  },
                  right: {
                    type: 'num',
                    value: 8,
                  },
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'proximoBicho',
                  value: {
                    type: 'num',
                    value: 3,
                  },
                },
                {
                  type: 'g3k:spawn',
                  mold: 'bicho',
                  x: {
                    type: 'g3k:randomBetween',
                    from: {
                      type: 'num',
                      value: -16,
                    },
                    to: {
                      type: 'num',
                      value: 16,
                    },
                  },
                  y: {
                    type: 'num',
                    value: 0.5,
                  },
                  z: {
                    type: 'g3k:randomBetween',
                    from: {
                      type: 'num',
                      value: -16,
                    },
                    to: {
                      type: 'num',
                      value: 16,
                    },
                  },
                },
              ],
            },
            {
              type: 'g3k:hudText',
              slot: 'top-right',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Tempo: ',
                  },
                  right: {
                    type: 'mathUnary',
                    fn: 'floor',
                    arg: {
                      type: 'var',
                      name: 'tempoRestante',
                    },
                  },
                },
                right: {
                  type: 'str',
                  value: 's',
                },
              },
            },
            {
              type: 'g3k:hudText',
              slot: 'bottom-right',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'No campo: ',
                },
                right: {
                  type: 'g3k:countAlive',
                  mold: 'bicho',
                },
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>=',
                left: {
                  type: 'var',
                  name: 'pontos',
                },
                right: {
                  type: 'num',
                  value: 8,
                },
              },
              then: [
                {
                  type: 'g3k:playEffect',
                  fx: 'win',
                },
                {
                  type: 'g3k:setState',
                  name: 'vitoria',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<=',
                left: {
                  type: 'var',
                  name: 'tempoRestante',
                },
                right: {
                  type: 'num',
                  value: 0,
                },
              },
              then: [
                {
                  type: 'g3k:playEffect',
                  fx: 'gameover',
                },
                {
                  type: 'g3k:setState',
                  name: 'fim',
                },
              ],
            },
          ],
        },
      ],
    },
  },
}
