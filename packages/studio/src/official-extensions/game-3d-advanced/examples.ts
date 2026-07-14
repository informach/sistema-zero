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
    js: [
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
        type: 'g3k:stateTimer',
        mold: 'torre',
        state: 'recarregar',
        sec: {
          type: 'num',
          value: 1,
        },
        next: 'parado',
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
      {
        type: 'g3k:start',
      },
    ],
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
  description:
    'Um mini-plataforma 3D com física de verdade: pule entre as plataformas sólidas, junte as moedas girantes e siga o herói com a câmera. Mostra a gravidade, o pulo, o mundo sólido e um rastro de partículas.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-3d-advanced' }],
    js: [
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
      {
        type: 'g3k:start',
      },
    ],
  },
}
