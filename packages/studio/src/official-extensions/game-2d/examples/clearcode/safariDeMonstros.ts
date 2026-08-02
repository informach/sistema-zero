import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from '../shared'

/**
 * "Safári de Monstros" (base): overworld de captura estilo Monster Hunter
 * (Python-Monsters). Diferencial da trilogia = capturar NO MAPA (sem tela de
 * batalha) + parceiro que evolui. Gerado por __gen_safariDeMonstros.ts;
 * drift test: safariDeMonstrosExample.test.ts.
 */
export const safariDeMonstrosExample: ExtensionExample = beginnerGameExample({
  name: 'Safári de Monstros',
  experience: 'game',
  description:
    'Explore um mundo de monstros com as setas. No mato alto aparecem monstros selvagens: chegue perto e aperte Espaço para capturar. Junte 5 no caderno e veja seu parceiro evoluir. Enter começa e reinicia.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 270 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#12281c',
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
          border: '3px solid #1d3a28',
          'border-radius': '12px',
          background: '#3a7d44',
        },
      },
    ],
    version: 2,
    extensions: [{ extensionId: 'game-2d' }],
    behavior: {
      start: [
        {
          type: 'g2d:fitScreen',
          percent: {
            type: 'num',
            value: 100,
          },
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'explorador',
          body: [
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 6,
              },
              y: {
                type: 'num',
                value: 6,
              },
              w: {
                type: 'num',
                value: 20,
              },
              h: {
                type: 'num',
                value: 5,
              },
              color: '#b8860b',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 9,
              },
              y: {
                type: 'num',
                value: 9,
              },
              w: {
                type: 'num',
                value: 14,
              },
              h: {
                type: 'num',
                value: 6,
              },
              color: '#e8b088',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 13,
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
                value: 19,
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
                value: 7,
              },
              y: {
                type: 'num',
                value: 15,
              },
              w: {
                type: 'num',
                value: 18,
              },
              h: {
                type: 'num',
                value: 12,
              },
              color: '#2e8b57',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 4,
              },
              y: {
                type: 'num',
                value: 16,
              },
              w: {
                type: 'num',
                value: 4,
              },
              h: {
                type: 'num',
                value: 9,
              },
              color: '#e8b088',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 24,
              },
              y: {
                type: 'num',
                value: 16,
              },
              w: {
                type: 'num',
                value: 4,
              },
              h: {
                type: 'num',
                value: 9,
              },
              color: '#e8b088',
            },
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'filhote',
          body: [
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 12,
              },
              y: {
                type: 'num',
                value: 14,
              },
              r: {
                type: 'num',
                value: 9,
              },
              color: '#4fa3d1',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 9,
              },
              y: {
                type: 'num',
                value: 12,
              },
              r: {
                type: 'num',
                value: 2,
              },
              color: '#ffffff',
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
                value: 12,
              },
              r: {
                type: 'num',
                value: 2,
              },
              color: '#ffffff',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 9,
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
                value: 15,
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
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'adulto',
          body: [
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 2,
              },
              y1: {
                type: 'num',
                value: 18,
              },
              x2: {
                type: 'num',
                value: 12,
              },
              y2: {
                type: 'num',
                value: 6,
              },
              x3: {
                type: 'num',
                value: 12,
              },
              y3: {
                type: 'num',
                value: 22,
              },
              color: '#2c78a8',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 22,
              },
              y1: {
                type: 'num',
                value: 18,
              },
              x2: {
                type: 'num',
                value: 12,
              },
              y2: {
                type: 'num',
                value: 6,
              },
              x3: {
                type: 'num',
                value: 12,
              },
              y3: {
                type: 'num',
                value: 22,
              },
              color: '#2c78a8',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 12,
              },
              y: {
                type: 'num',
                value: 15,
              },
              r: {
                type: 'num',
                value: 11,
              },
              color: '#4fa3d1',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 8,
              },
              y: {
                type: 'num',
                value: 12,
              },
              r: {
                type: 'num',
                value: 2,
              },
              color: '#ffe066',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 16,
              },
              y: {
                type: 'num',
                value: 12,
              },
              r: {
                type: 'num',
                value: 2,
              },
              color: '#ffe066',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 8,
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
                value: 16,
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
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'selvagem',
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
                value: 16,
              },
              r: {
                type: 'num',
                value: 12,
              },
              color: '#8e44ad',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 6,
              },
              y1: {
                type: 'num',
                value: 8,
              },
              x2: {
                type: 'num',
                value: 3,
              },
              y2: {
                type: 'num',
                value: 0,
              },
              x3: {
                type: 'num',
                value: 11,
              },
              y3: {
                type: 'num',
                value: 8,
              },
              color: '#5a2d82',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: {
                type: 'num',
                value: 22,
              },
              y1: {
                type: 'num',
                value: 8,
              },
              x2: {
                type: 'num',
                value: 25,
              },
              y2: {
                type: 'num',
                value: 0,
              },
              x3: {
                type: 'num',
                value: 17,
              },
              y3: {
                type: 'num',
                value: 8,
              },
              color: '#5a2d82',
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
                value: 15,
              },
              r: {
                type: 'num',
                value: 3,
              },
              color: '#ff5e5e',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 18,
              },
              y: {
                type: 'num',
                value: 15,
              },
              r: {
                type: 'num',
                value: 3,
              },
              color: '#ff5e5e',
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
                value: 15,
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
                value: 18,
              },
              y: {
                type: 'num',
                value: 15,
              },
              r: {
                type: 'num',
                value: 1,
              },
              color: '#20122f',
            },
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'sabio',
          body: [
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 8,
              },
              y: {
                type: 'num',
                value: 4,
              },
              w: {
                type: 'num',
                value: 12,
              },
              h: {
                type: 'num',
                value: 8,
              },
              color: '#dcd6c8',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 12,
              },
              y: {
                type: 'num',
                value: 9,
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
                value: 16,
              },
              y: {
                type: 'num',
                value: 9,
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
                value: 10,
              },
              y: {
                type: 'num',
                value: 12,
              },
              w: {
                type: 'num',
                value: 8,
              },
              h: {
                type: 'num',
                value: 6,
              },
              color: '#c0c0c0',
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
                value: 18,
              },
              w: {
                type: 'num',
                value: 16,
              },
              h: {
                type: 'num',
                value: 12,
              },
              color: '#6a5acd',
            },
          ],
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'explorador',
          shapeName: 'explorador',
          x: {
            type: 'num',
            value: 90,
          },
          y: {
            type: 'num',
            value: 210,
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
          type: 'g2d:setHitboxScale',
          spriteVar: 'explorador',
          percent: {
            type: 'num',
            value: 80,
          },
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'filhote',
          shapeName: 'filhote',
          x: {
            type: 'num',
            value: 60,
          },
          y: {
            type: 'num',
            value: 210,
          },
          w: {
            type: 'num',
            value: 24,
          },
          h: {
            type: 'num',
            value: 26,
          },
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'adulto',
          shapeName: 'adulto',
          x: {
            type: 'num',
            value: 60,
          },
          y: {
            type: 'num',
            value: 210,
          },
          w: {
            type: 'num',
            value: 28,
          },
          h: {
            type: 'num',
            value: 30,
          },
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'selvagem',
          shapeName: 'selvagem',
          x: {
            type: 'num',
            value: -100,
          },
          y: {
            type: 'num',
            value: -100,
          },
          w: {
            type: 'num',
            value: 30,
          },
          h: {
            type: 'num',
            value: 32,
          },
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'sabio',
          shapeName: 'sabio',
          x: {
            type: 'num',
            value: 240,
          },
          y: {
            type: 'num',
            value: 60,
          },
          w: {
            type: 'num',
            value: 28,
          },
          h: {
            type: 'num',
            value: 34,
          },
        },
        {
          type: 'g2d:createGroup',
          varName: 'muros',
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'muros',
          x: {
            type: 'num',
            value: 0,
          },
          y: {
            type: 'num',
            value: 0,
          },
          w: {
            type: 'num',
            value: 480,
          },
          h: {
            type: 'num',
            value: 20,
          },
          color: '#4a4038',
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
          groupVar: 'muros',
          x: {
            type: 'num',
            value: 0,
          },
          y: {
            type: 'num',
            value: 250,
          },
          w: {
            type: 'num',
            value: 480,
          },
          h: {
            type: 'num',
            value: 20,
          },
          color: '#4a4038',
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
          groupVar: 'muros',
          x: {
            type: 'num',
            value: 0,
          },
          y: {
            type: 'num',
            value: 0,
          },
          w: {
            type: 'num',
            value: 20,
          },
          h: {
            type: 'num',
            value: 270,
          },
          color: '#4a4038',
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
          groupVar: 'muros',
          x: {
            type: 'num',
            value: 460,
          },
          y: {
            type: 'num',
            value: 0,
          },
          w: {
            type: 'num',
            value: 20,
          },
          h: {
            type: 'num',
            value: 270,
          },
          color: '#4a4038',
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
          groupVar: 'muros',
          x: {
            type: 'num',
            value: 150,
          },
          y: {
            type: 'num',
            value: 120,
          },
          w: {
            type: 'num',
            value: 40,
          },
          h: {
            type: 'num',
            value: 40,
          },
          color: '#5a4e42',
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
          varName: 'matos',
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'matos',
          x: {
            type: 'num',
            value: 300,
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
            value: 70,
          },
          color: '#2e7d4f',
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
          groupVar: 'matos',
          x: {
            type: 'num',
            value: 60,
          },
          y: {
            type: 'num',
            value: 60,
          },
          w: {
            type: 'num',
            value: 80,
          },
          h: {
            type: 'num',
            value: 60,
          },
          color: '#2e7d4f',
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
          groupVar: 'matos',
          x: {
            type: 'num',
            value: 340,
          },
          y: {
            type: 'num',
            value: 210,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 40,
          },
          color: '#2e7d4f',
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
          type: 'var',
          name: 'capturados',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'selvagemAtivo',
          value: {
            type: 'bool',
            value: false,
          },
        },
        {
          type: 'var',
          name: 'evoluido',
          value: {
            type: 'bool',
            value: false,
          },
        },
        {
          type: 'var',
          name: 'mensagem',
          value: {
            type: 'str',
            value: 'Ande no mato para achar um monstro selvagem!',
          },
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
                  name: 'mundo',
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
          ],
        },
        {
          type: 'g2d:onKey',
          key: 'Space',
          body: [
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'mundo',
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: {
                      type: 'var',
                      name: 'selvagemAtivo',
                    },
                    right: {
                      type: 'bool',
                      value: true,
                    },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'g2d:touches',
                        aVar: 'explorador',
                        bVar: 'selvagem',
                      },
                      then: [
                        {
                          type: 'if',
                          cond: {
                            type: 'g2d:randomChance',
                            percent: {
                              type: 'num',
                              value: 70,
                            },
                          },
                          then: [
                            {
                              type: 'assign',
                              name: 'capturados',
                              value: {
                                type: 'binop',
                                op: '+',
                                left: {
                                  type: 'var',
                                  name: 'capturados',
                                },
                                right: {
                                  type: 'num',
                                  value: 1,
                                },
                              },
                            },
                            {
                              type: 'assign',
                              name: 'mensagem',
                              value: {
                                type: 'binop',
                                op: '+',
                                left: {
                                  type: 'str',
                                  value: 'Capturou! Monstros no caderno: ',
                                },
                                right: {
                                  type: 'var',
                                  name: 'capturados',
                                },
                              },
                            },
                            {
                              type: 'g2d:playFx',
                              fx: 'win',
                            },
                          ],
                          else: [
                            {
                              type: 'assign',
                              name: 'mensagem',
                              value: {
                                type: 'str',
                                value: 'O monstro fugiu! Procure outro no mato.',
                              },
                            },
                            {
                              type: 'g2d:playFx',
                              fx: 'hurt',
                            },
                          ],
                        },
                        {
                          type: 'assign',
                          name: 'selvagemAtivo',
                          value: {
                            type: 'bool',
                            value: false,
                          },
                        },
                        {
                          type: 'g2d:setPosition',
                          spriteVar: 'selvagem',
                          x: {
                            type: 'num',
                            value: -100,
                          },
                          y: {
                            type: 'num',
                            value: -100,
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
                    value: 'Safári de Monstros',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Ande com as setas pelo mundo. No mato alto aparecem monstros selvagens. Chegue perto e aperte Espaço para capturar. Junte 5 e seu parceiro evolui!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para começar',
                  },
                  bg: '#1f2a44',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'g2d:sceneIs',
                name: 'mundo',
              },
              then: [
                {
                  type: 'g2d:topDown',
                  spriteVar: 'explorador',
                  speed: {
                    type: 'num',
                    value: 3,
                  },
                },
                {
                  type: 'g2d:collideGroup',
                  spriteVar: 'explorador',
                  groupVar: 'muros',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'matos',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawGroup',
                  groupVar: 'muros',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'sabio',
                  ctxVar: 'ctx',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: {
                      type: 'var',
                      name: 'evoluido',
                    },
                    right: {
                      type: 'bool',
                      value: true,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:setPosition',
                      spriteVar: 'adulto',
                      x: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'g2d:spriteX',
                          spriteVar: 'explorador',
                        },
                        right: {
                          type: 'num',
                          value: 26,
                        },
                      },
                      y: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'g2d:spriteY',
                          spriteVar: 'explorador',
                        },
                        right: {
                          type: 'num',
                          value: 4,
                        },
                      },
                    },
                    {
                      type: 'g2d:drawSprite',
                      spriteVar: 'adulto',
                      ctxVar: 'ctx',
                    },
                  ],
                  else: [
                    {
                      type: 'g2d:setPosition',
                      spriteVar: 'filhote',
                      x: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'g2d:spriteX',
                          spriteVar: 'explorador',
                        },
                        right: {
                          type: 'num',
                          value: 24,
                        },
                      },
                      y: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'g2d:spriteY',
                          spriteVar: 'explorador',
                        },
                        right: {
                          type: 'num',
                          value: 4,
                        },
                      },
                    },
                    {
                      type: 'g2d:drawSprite',
                      spriteVar: 'filhote',
                      ctxVar: 'ctx',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: {
                      type: 'var',
                      name: 'selvagemAtivo',
                    },
                    right: {
                      type: 'bool',
                      value: true,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:drawSprite',
                      spriteVar: 'selvagem',
                      ctxVar: 'ctx',
                    },
                  ],
                },
                {
                  type: 'g2d:drawSprite',
                  spriteVar: 'explorador',
                  ctxVar: 'ctx',
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Caderno de monstros:',
                  value: {
                    type: 'var',
                    name: 'capturados',
                  },
                  x: {
                    type: 'num',
                    value: 26,
                  },
                  y: {
                    type: 'num',
                    value: 40,
                  },
                  color: '#f3f6ff',
                  size: {
                    type: 'num',
                    value: 14,
                  },
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: '>',
                  value: {
                    type: 'var',
                    name: 'mensagem',
                  },
                  x: {
                    type: 'num',
                    value: 26,
                  },
                  y: {
                    type: 'num',
                    value: 262,
                  },
                  color: '#ffe9a8',
                  size: {
                    type: 'num',
                    value: 13,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'g2d:touches',
                    aVar: 'explorador',
                    bVar: 'sabio',
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'mensagem',
                      value: {
                        type: 'str',
                        value: 'Sabio: fique no mato e aperte Espaco colado no monstro!',
                      },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: {
                      type: 'var',
                      name: 'selvagemAtivo',
                    },
                    right: {
                      type: 'bool',
                      value: false,
                    },
                  },
                  then: [
                    {
                      type: 'g2d:onSpriteGroupOverlap',
                      spriteVar: 'explorador',
                      groupVar: 'matos',
                      itemName: 'mato',
                      body: [
                        {
                          type: 'if',
                          cond: {
                            type: 'binop',
                            op: '==',
                            left: {
                              type: 'var',
                              name: 'selvagemAtivo',
                            },
                            right: {
                              type: 'bool',
                              value: false,
                            },
                          },
                          then: [
                            {
                              type: 'if',
                              cond: {
                                type: 'g2d:randomChance',
                                percent: {
                                  type: 'num',
                                  value: 3,
                                },
                              },
                              then: [
                                {
                                  type: 'g2d:setPosition',
                                  spriteVar: 'selvagem',
                                  x: {
                                    type: 'mathBinary',
                                    fn: 'min',
                                    a: {
                                      type: 'binop',
                                      op: '+',
                                      left: {
                                        type: 'g2d:spriteX',
                                        spriteVar: 'explorador',
                                      },
                                      right: {
                                        type: 'num',
                                        value: 32,
                                      },
                                    },
                                    b: {
                                      type: 'num',
                                      value: 420,
                                    },
                                  },
                                  y: {
                                    type: 'g2d:spriteY',
                                    spriteVar: 'explorador',
                                  },
                                },
                                {
                                  type: 'assign',
                                  name: 'selvagemAtivo',
                                  value: {
                                    type: 'bool',
                                    value: true,
                                  },
                                },
                                {
                                  type: 'assign',
                                  name: 'mensagem',
                                  value: {
                                    type: 'str',
                                    value: 'Um monstro selvagem apareceu! Aperte Espaco!',
                                  },
                                },
                                {
                                  type: 'g2d:playFx',
                                  fx: 'start',
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
                    type: 'binop',
                    op: '>=',
                    left: {
                      type: 'var',
                      name: 'capturados',
                    },
                    right: {
                      type: 'num',
                      value: 3,
                    },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '==',
                        left: {
                          type: 'var',
                          name: 'evoluido',
                        },
                        right: {
                          type: 'bool',
                          value: false,
                        },
                      },
                      then: [
                        {
                          type: 'assign',
                          name: 'evoluido',
                          value: {
                            type: 'bool',
                            value: true,
                          },
                        },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: {
                            type: 'str',
                            value: 'Seu parceiro evoluiu!',
                          },
                        },
                        {
                          type: 'g2d:shake',
                          ctxVar: 'ctx',
                          intensity: {
                            type: 'num',
                            value: 6,
                          },
                        },
                        {
                          type: 'g2d:playFx',
                          fx: 'powerup',
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
                      name: 'capturados',
                    },
                    right: {
                      type: 'num',
                      value: 5,
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
                    value: 'Safari completo!',
                  },
                  subtitle: {
                    type: 'str',
                    value:
                      'Voce capturou 5 monstros e seu parceiro evoluiu. Um verdadeiro cacador de monstros!',
                  },
                  hint: {
                    type: 'str',
                    value: 'Aperte Enter para jogar de novo',
                  },
                  bg: '#1d4d33',
                },
              ],
            },
          ],
        },
      ],
    },
  },
})
