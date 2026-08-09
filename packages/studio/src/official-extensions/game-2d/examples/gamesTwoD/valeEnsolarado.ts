import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from '../shared'

/**
 * Exemplo "Vale Ensolarado": recriação BÁSICA do sunnyland-platformer do Chris
 * Courses. O herói anda e pula (platformer + gravidade + colisão sólida contra o
 * grupo de plataformas) por um vale maior que a tela (cameraFollow), juntando as
 * 6 gemas para vencer. Um gambá patrulha o chão e uma águia voa; encostar tira 1
 * coração (hurtByEnemy com piscar). Ficar sem corações perde. 100% procedural
 * (formas e cores, sem tilemap nem PNGs). A behavior foi GERADA pelo parser real
 * a partir do fonte em __gen_valeEnsolarado.ts (drift test:
 * valeEnsolaradoExample.test.ts).
 */
export const valeEnsolaradoExample: ExtensionExample = beginnerGameExample({
  name: 'Vale Ensolarado',
  experience: 'game',
  description:
    'Ande e pule pelo vale para juntar as 6 gemas azuis. Desvie do gambá e da águia e cuide da sua vida. Enter começa e reinicia.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 270 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0e2a1a',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
      {
        selector: 'canvas',
        declarations: {
          border: '3px solid #ffffff',
          'border-radius': '18px',
          background: '#8fd0a8',
        },
      },
    ],
    version: 2,
    behavior: {
      molds: [
        {
          type: 'g2d:defineShape',
          shapeName: 'raposinha',
          body: [
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 14,
              },
              y: {
                type: 'num',
                value: 9,
              },
              r: {
                type: 'num',
                value: 8,
              },
              color: '#e8813a',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 6,
              },
              y: {
                type: 'num',
                value: 15,
              },
              w: {
                type: 'num',
                value: 16,
              },
              h: {
                type: 'num',
                value: 15,
              },
              color: '#f0a05a',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 8,
              },
              y1: {
                type: 'num',
                value: 5,
              },
              x2: {
                type: 'num',
                value: 4,
              },
              y2: {
                type: 'num',
                value: 0,
              },
              x3: {
                type: 'num',
                value: 12,
              },
              y3: {
                type: 'num',
                value: 3,
              },
              color: '#e8813a',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 20,
              },
              y1: {
                type: 'num',
                value: 5,
              },
              x2: {
                type: 'num',
                value: 24,
              },
              y2: {
                type: 'num',
                value: 0,
              },
              x3: {
                type: 'num',
                value: 16,
              },
              y3: {
                type: 'num',
                value: 3,
              },
              color: '#e8813a',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 11,
              },
              y: {
                type: 'num',
                value: 9,
              },
              r: {
                type: 'num',
                value: 2,
              },
              color: '#20122f',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 17,
              },
              y: {
                type: 'num',
                value: 9,
              },
              r: {
                type: 'num',
                value: 2,
              },
              color: '#20122f',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 8,
              },
              y: {
                type: 'num',
                value: 30,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 8,
              },
              color: '#7a4a21',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 15,
              },
              y: {
                type: 'num',
                value: 30,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 8,
              },
              color: '#7a4a21',
            },
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'gambazinho',
          body: [
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 15,
              },
              y: {
                type: 'num',
                value: 15,
              },
              r: {
                type: 'num',
                value: 12,
              },
              color: '#7a5a3a',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 10,
              },
              y: {
                type: 'num',
                value: 12,
              },
              r: {
                type: 'num',
                value: 3,
              },
              color: '#f6f2ff',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 12,
              },
              r: {
                type: 'num',
                value: 3,
              },
              color: '#f6f2ff',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 10,
              },
              y: {
                type: 'num',
                value: 12,
              },
              r: {
                type: 'num',
                value: 1,
              },
              color: '#20122f',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 12,
              },
              r: {
                type: 'num',
                value: 1,
              },
              color: '#20122f',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 6,
              },
              y: {
                type: 'num',
                value: 8,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 5,
              },
              color: '#5a3f28',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 19,
              },
              y: {
                type: 'num',
                value: 8,
              },
              w: {
                type: 'num',
                value: 5,
              },
              h: {
                type: 'num',
                value: 5,
              },
              color: '#5a3f28',
            },
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'aguiazinha',
          body: [
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 15,
              },
              y: {
                type: 'num',
                value: 12,
              },
              r: {
                type: 'num',
                value: 9,
              },
              color: '#a8763a',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 3,
              },
              y1: {
                type: 'num',
                value: 12,
              },
              x2: {
                type: 'num',
                value: 15,
              },
              y2: {
                type: 'num',
                value: 6,
              },
              x3: {
                type: 'num',
                value: 15,
              },
              y3: {
                type: 'num',
                value: 18,
              },
              color: '#c69150',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 27,
              },
              y1: {
                type: 'num',
                value: 12,
              },
              x2: {
                type: 'num',
                value: 15,
              },
              y2: {
                type: 'num',
                value: 6,
              },
              x3: {
                type: 'num',
                value: 15,
              },
              y3: {
                type: 'num',
                value: 18,
              },
              color: '#c69150',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 15,
              },
              y1: {
                type: 'num',
                value: 12,
              },
              x2: {
                type: 'num',
                value: 22,
              },
              y2: {
                type: 'num',
                value: 10,
              },
              x3: {
                type: 'num',
                value: 22,
              },
              y3: {
                type: 'num',
                value: 14,
              },
              color: '#ffd166',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 15,
              },
              y: {
                type: 'num',
                value: 10,
              },
              r: {
                type: 'num',
                value: 2,
              },
              color: '#20122f',
            },
          ],
        },
        {
          type: 'g2d:defineEnemyType',
          varName: 'gambas',
          behavior: 'patrulha',
          color: '#7a5a3a',
          image: '',
          shape: 'gambazinho',
          hp: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0.8,
          },
          dmg: {
            type: 'num',
            value: 1,
          },
          w: {
            type: 'num',
            value: 30,
          },
          h: {
            type: 'num',
            value: 30,
          },
        },
        {
          type: 'g2d:defineEnemyType',
          varName: 'aguias',
          behavior: 'voador',
          color: '#a8763a',
          image: '',
          shape: 'aguiazinha',
          hp: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 1,
          },
          dmg: {
            type: 'num',
            value: 1,
          },
          w: {
            type: 'num',
            value: 30,
          },
          h: {
            type: 'num',
            value: 24,
          },
        },
      ],
      start: [
        {
          type: 'g2d:fitScreen',
          percent: {
            type: 'num',
            value: 100,
          },
        },
        {
          type: 'g2d:setGravity',
          value: {
            type: 'num',
            value: 0.6,
          },
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'heroi',
          shapeName: 'raposinha',
          x: {
            type: 'num',
            value: 60,
          },
          y: {
            type: 'num',
            value: 150,
          },
          w: {
            type: 'num',
            value: 28,
          },
          h: {
            type: 'num',
            value: 38,
          },
        },
        {
          type: 'g2d:setHitboxScale',
          spriteVar: 'heroi',
          percent: {
            type: 'num',
            value: 80,
          },
        },
        {
          type: 'g2d:setHealth',
          spriteVar: 'heroi',
          amount: {
            type: 'num',
            value: 3,
          },
        },
        {
          type: 'g2d:createGroup',
          varName: 'chao',
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'chao',
          x: {
            type: 'num',
            value: 0,
          },
          y: {
            type: 'num',
            value: 236,
          },
          w: {
            type: 'num',
            value: 340,
          },
          h: {
            type: 'num',
            value: 34,
          },
          color: '#5a8f3a',
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
          type: 'g2d:spawnInGroup',
          groupVar: 'chao',
          x: {
            type: 'num',
            value: 400,
          },
          y: {
            type: 'num',
            value: 236,
          },
          w: {
            type: 'num',
            value: 560,
          },
          h: {
            type: 'num',
            value: 34,
          },
          color: '#5a8f3a',
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
          type: 'g2d:spawnInGroup',
          groupVar: 'chao',
          x: {
            type: 'num',
            value: 150,
          },
          y: {
            type: 'num',
            value: 186,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#7a5a3a',
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
          type: 'g2d:spawnInGroup',
          groupVar: 'chao',
          x: {
            type: 'num',
            value: 330,
          },
          y: {
            type: 'num',
            value: 150,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#7a5a3a',
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
          type: 'g2d:spawnInGroup',
          groupVar: 'chao',
          x: {
            type: 'num',
            value: 520,
          },
          y: {
            type: 'num',
            value: 176,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#7a5a3a',
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
          type: 'g2d:spawnInGroup',
          groupVar: 'chao',
          x: {
            type: 'num',
            value: 700,
          },
          y: {
            type: 'num',
            value: 140,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#7a5a3a',
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
          type: 'g2d:createGroup',
          varName: 'gemas',
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'gemas',
          x: {
            type: 'num',
            value: 190,
          },
          y: {
            type: 'num',
            value: 156,
          },
          w: {
            type: 'num',
            value: 18,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#38bdf8',
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
          type: 'g2d:spawnInGroup',
          groupVar: 'gemas',
          x: {
            type: 'num',
            value: 366,
          },
          y: {
            type: 'num',
            value: 120,
          },
          w: {
            type: 'num',
            value: 18,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#38bdf8',
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
          type: 'g2d:spawnInGroup',
          groupVar: 'gemas',
          x: {
            type: 'num',
            value: 470,
          },
          y: {
            type: 'num',
            value: 206,
          },
          w: {
            type: 'num',
            value: 18,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#38bdf8',
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
          type: 'g2d:spawnInGroup',
          groupVar: 'gemas',
          x: {
            type: 'num',
            value: 556,
          },
          y: {
            type: 'num',
            value: 146,
          },
          w: {
            type: 'num',
            value: 18,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#38bdf8',
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
          type: 'g2d:spawnInGroup',
          groupVar: 'gemas',
          x: {
            type: 'num',
            value: 736,
          },
          y: {
            type: 'num',
            value: 110,
          },
          w: {
            type: 'num',
            value: 18,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#38bdf8',
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
          type: 'g2d:spawnInGroup',
          groupVar: 'gemas',
          x: {
            type: 'num',
            value: 890,
          },
          y: {
            type: 'num',
            value: 206,
          },
          w: {
            type: 'num',
            value: 18,
          },
          h: {
            type: 'num',
            value: 18,
          },
          color: '#38bdf8',
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
          type: 'g2d:createGroup',
          varName: 'coracoes',
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'coracoes',
          x: {
            type: 'num',
            value: 420,
          },
          y: {
            type: 'num',
            value: 204,
          },
          w: {
            type: 'num',
            value: 18,
          },
          h: {
            type: 'num',
            value: 16,
          },
          color: '#ff6b81',
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
          type: 'g2d:spawnEnemy',
          typeVar: 'gambas',
          x: {
            type: 'num',
            value: 260,
          },
          y: {
            type: 'num',
            value: 206,
          },
        },
        {
          type: 'g2d:spawnEnemy',
          typeVar: 'gambas',
          x: {
            type: 'num',
            value: 620,
          },
          y: {
            type: 'num',
            value: 206,
          },
        },
        {
          type: 'g2d:spawnEnemy',
          typeVar: 'aguias',
          x: {
            type: 'num',
            value: 480,
          },
          y: {
            type: 'num',
            value: 90,
          },
        },
        {
          type: 'g2d:spawnEnemy',
          typeVar: 'aguias',
          x: {
            type: 'num',
            value: 760,
          },
          y: {
            type: 'num',
            value: 70,
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
          name: 'gemasVale',
          value: {
            type: 'num',
            value: 6,
          },
        },
        {
          type: 'g2d:playMusic',
          tune: 'happy',
        },
        {
          type: 'g2d:setScene',
          name: 'inicio',
        },
      ],
      events: [
        {
          type: 'g2d:onKey',
          key: 'Enter',
          body: [
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'inicio',
              },
              then: [
                {
                  type: 'g2d:setScene',
                  name: 'jogando',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'vitoria',
              },
              then: [
                {
                  type: 'g2d:restart',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'derrota',
              },
              then: [
                {
                  type: 'g2d:restart',
                },
              ],
            },
          ],
        },
        {
          type: 'g2d:onKey',
          key: 'ArrowUp',
          body: [
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'jogando',
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: {
                      type: 'g2d:spriteVy',
                      spriteVar: 'heroi',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: {
                        type: 'var',
                        name: 'heroi',
                      },
                      name: 'vy',
                      value: {
                        type: 'num',
                        value: -11,
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'jump',
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
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'inicio',
              },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: {
                    type: 'str',
                    value: 'Vale Ensolarado',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Ande e pule pelo vale para juntar as 6 gemas azuis. Desvie do gambá e da águia. Use as setas e a seta pra cima para pular!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para começar',
                  },
                  bg: '#1d5a78',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'jogando',
              },
              then: [
                {
                  type: 'g2d:cameraFollow',
                  spriteVar: 'heroi',
                  worldW: {
                    type: 'num',
                    value: 960,
                  },
                  worldH: {
                    type: 'num',
                    value: 270,
                  },
                },
                {
                  type: 'g2d:arrowsX',
                  spriteVar: 'heroi',
                  speed: {
                    type: 'num',
                    value: 3,
                  },
                },
                {
                  type: 'g2d:applyGravity',
                  spriteVar: 'heroi',
                },
                {
                  type: 'g2d:applyVelocity',
                  spriteVar: 'heroi',
                },
                {
                  type: 'g2d:collideGroup',
                  spriteVar: 'heroi',
                  groupVar: 'chao',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'g2d:centerY',
                      spriteVar: 'heroi',
                    },
                    right: {
                      type: 'num',
                      value: 300,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:changeHealth',
                      spriteVar: 'heroi',
                      delta: {
                        type: 'num',
                        value: -1,
                      },
                    },
                    {
                      type: 'g2d:setPosition',
                      spriteVar: 'heroi',
                      x: {
                        type: 'num',
                        value: 60,
                      },
                      y: {
                        type: 'num',
                        value: 150,
                      },
                    },
                    {
                      type: 'memberSet',
                      object: {
                        type: 'var',
                        name: 'heroi',
                      },
                      name: 'vy',
                      value: {
                        type: 'num',
                        value: 0,
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'hurt',
                    },
                  ],
                },
                {
                  type: 'g2d:applyGravityToGroup',
                  groupVar: 'gambas',
                },
                {
                  type: 'g2d:updateEnemyType',
                  typeVar: 'gambas',
                  ctxVar: 'ctx',
                  targetVar: 'heroi',
                },
                {
                  type: 'g2d:forEachInGroup',
                  groupVar: 'gambas',
                  itemName: 'gamba',
                  body: [
                    {
                      type: 'g2d:collideGroup',
                      spriteVar: 'gamba',
                      groupVar: 'chao',
                    },
                  ],
                },
                {
                  type: 'g2d:updateEnemyType',
                  typeVar: 'aguias',
                  ctxVar: 'ctx',
                  targetVar: 'heroi',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'chao',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'gemas',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'coracoes',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawEnemyType',
                  ctxVar: 'ctx',
                  typeVar: 'gambas',
                },
                {
                  type: 'g2d:drawEnemyType',
                  ctxVar: 'ctx',
                  typeVar: 'aguias',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'heroi',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'heroi',
                  groupVar: 'gemas',
                  itemName: 'gema',
                  body: [
                    {
                      type: 'g2d:removeFromGroup',
                      spriteVar: 'gema',
                      groupVar: 'gemas',
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
                      type: 'assign',
                      name: 'gemasVale',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'var',
                          name: 'gemasVale',
                        },
                        right: {
                          type: 'num',
                          value: 1,
                        },
                      },
                    },
                    {
                      type: 'g2d:emitParticles',
                      x: {
                        type: 'g2d:centerX',
                        spriteVar: 'gema',
                      },
                      y: {
                        type: 'g2d:centerY',
                        spriteVar: 'gema',
                      },
                      count: {
                        type: 'num',
                        value: 12,
                      },
                      color: '#7dd3fc',
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'gem',
                    },
                  ],
                },
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'heroi',
                  groupVar: 'coracoes',
                  itemName: 'coracao',
                  body: [
                    {
                      type: 'g2d:removeFromGroup',
                      spriteVar: 'coracao',
                      groupVar: 'coracoes',
                    },
                    {
                      type: 'g2d:changeHealth',
                      spriteVar: 'heroi',
                      delta: {
                        type: 'num',
                        value: 1,
                      },
                    },
                    {
                      type: 'g2d:playFx',
                      fx: 'heal',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'logicalNot',
                    value: {
                      type: 'g2d:isInvincible',
                      spriteVar: 'heroi',
                    },
                  },
                  then: [
                    {
                      type: 'g2d:onSpriteGroupOverlap',
                      spriteVar: 'heroi',
                      groupVar: 'gambas',
                      itemName: 'gamba',
                      body: [
                        {
                          type: 'g2d:hurtByEnemy',
                          spriteVar: 'heroi',
                          enemyVar: 'gamba',
                        },
                        {
                          type: 'g2d:shake',
                          ctxVar: 'ctx',
                          intensity: {
                            type: 'num',
                            value: 5,
                          },
                        },
                        {
                          type: 'g2d:playFx',
                          fx: 'hurt',
                        },
                      ],
                    },
                    {
                      type: 'g2d:onSpriteGroupOverlap',
                      spriteVar: 'heroi',
                      groupVar: 'aguias',
                      itemName: 'aguia',
                      body: [
                        {
                          type: 'g2d:hurtByEnemy',
                          spriteVar: 'heroi',
                          enemyVar: 'aguia',
                        },
                        {
                          type: 'g2d:shake',
                          ctxVar: 'ctx',
                          intensity: {
                            type: 'num',
                            value: 5,
                          },
                        },
                        {
                          type: 'g2d:playFx',
                          fx: 'hurt',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'g2d:drawParticles',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawSpriteHealth',
                  ctxVar: 'ctx',
                  spriteVar: 'heroi',
                  style: 'hearts',
                  x: {
                    type: 'num',
                    value: 14,
                  },
                  y: {
                    type: 'num',
                    value: 24,
                  },
                  size: {
                    type: 'num',
                    value: 16,
                  },
                  color: '#ff6b81',
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Gemas:',
                  value: {
                    type: 'var',
                    name: 'gemasVale',
                  },
                  x: {
                    type: 'num',
                    value: 14,
                  },
                  y: {
                    type: 'num',
                    value: 52,
                  },
                  color: '#7dd3fc',
                  size: {
                    type: 'num',
                    value: 16,
                  },
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Pontos:',
                  value: {
                    type: 'var',
                    name: 'pontos',
                  },
                  x: {
                    type: 'num',
                    value: 14,
                  },
                  y: {
                    type: 'num',
                    value: 74,
                  },
                  color: '#ffffff',
                  size: {
                    type: 'num',
                    value: 16,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<=',
                    left: {
                      type: 'var',
                      name: 'gemasVale',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:playFx',
                      fx: 'win',
                    },
                    {
                      type: 'g2d:setScene',
                      name: 'vitoria',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g2d:healthDepleted',
                    spriteVar: 'heroi',
                  },
                  then: [
                    {
                      type: 'g2d:playFx',
                      fx: 'gameover',
                    },
                    {
                      type: 'g2d:setScene',
                      name: 'derrota',
                    },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'vitoria',
              },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: {
                    type: 'str',
                    value: 'Você juntou as gemas!',
                  },
                  subtitle: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'str',
                        value: 'Todas as 6 gemas brilham no seu bolso e você fez ',
                      },
                      right: {
                        type: 'var',
                        name: 'pontos',
                      },
                    },
                    right: {
                      type: 'str',
                      value: ' pontos. Que aventura no vale!',
                    },
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para jogar de novo',
                  },
                  bg: '#1d4d33',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'derrota',
              },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: {
                    type: 'str',
                    value: 'O herói cansou!',
                  },
                  subtitle: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'str',
                        value: 'Os bichos do vale venceram desta vez. Você juntou ',
                      },
                      right: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'num',
                          value: 6,
                        },
                        right: {
                          type: 'var',
                          name: 'gemasVale',
                        },
                      },
                    },
                    right: {
                      type: 'str',
                      value: ' gemas.',
                    },
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para tentar de novo',
                  },
                  bg: '#5a2a2a',
                },
              ],
            },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})
