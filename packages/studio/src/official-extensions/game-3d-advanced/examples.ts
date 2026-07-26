import type { ExtensionExample } from '#extensions'

/**
 * Exemplo da vitrine "Defesa da Torre" — torres com FSM própria (parado →
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
  name: 'Defesa da Torre',
  experience: 'game',
  description:
    'Torres com cérebro próprio (máquina de estados: parado → mirar → atirar → recarregar) caçam os invasores que avançam contra o cristal. Tudo montado de peças — nenhuma imagem.',
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
            value: 'Defesa da Torre',
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
    'Arraste o mouse para girar a câmera — o WASD anda sempre para onde você olha. Cinco bolas malucas quicam pelo chão, o rinque de gelo escorrega e os caixotes não saem do lugar: cada coisa com a física dela.',
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
              'Arraste o mouse para girar a câmera: o WASD anda SEMPRE para onde você está olhando. Encoste nas 5 bolas quicantes — mas o gelo escorrega!',
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
    'Segure os invasores por 30 segundos! O guardião fala, a câmera treme no impacto, as pedras quicam — e a semente faz a partida se repetir igualzinha.',
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
              'Segure os invasores por 30 segundos! Fale com eles, tremam as pedras — e o acaso é sempre o mesmo, por causa da semente.',
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
    'Point-and-click: alvos aparecem e fogem, e cada CLIQUE certeiro vale pontos (o dourado vale 3). Tela de dica própria, aviso de acerto e lente de mira — feche 12 pontos em 25 segundos.',
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
