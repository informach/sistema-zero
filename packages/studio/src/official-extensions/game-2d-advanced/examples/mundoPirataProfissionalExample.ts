import type { ExtensionExample } from '#extensions'
import { withIndependentPeriodicLoops } from './withIndependentPeriodicLoops'

/**
 * Exemplo bundlado: "Mundo Pirata Profissional" — nível 2 da trilogia de
 * plataforma lateral do Clear Code (Super Pirate World) no motor avançado, SEM
 * assets. Diferencial: controlador de plataforma do motor (platformerHero) +
 * SEMI-COLISÃO (oneWayPlatform: pisa por cima, desce com a seta para baixo),
 * checkpoint com respawn, TRÊS inimigos (dente persegue, casco patrulha, canhão
 * atira pérolas), moedas, 3 vidas, partículas e câmera seguindo o herói.
 *
 * ⚠️ IR GERADA pelo parser a partir do fonte em __gen_mundoPirataProfissional.ts;
 * o drift test manda re-embutir se o parser mudar.
 */
export const mundoPirataProfissionalExample: ExtensionExample = withIndependentPeriodicLoops({
  name: 'Mundo Pirata Profissional',
  experience: 'game',
  description:
    'Plataforma pirata no motor avançado: use o controlador de pulo, desça pelas tábuas, pise em 3 tipos de inimigo, pegue moedas e chegue na bandeira com 3 vidas e checkpoint. Tudo de formas, sem imagem.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d-advanced' }],
    version: 2,
    behavior: {
      molds: [
        {
          type: 'gk:defineLook',
          name: 'piratao',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#c0392b',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 6,
              },
              y: {
                type: 'num',
                value: 14,
              },
              w: {
                type: 'num',
                value: 18,
              },
              h: {
                type: 'num',
                value: 18,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#f7c8a2',
              },
            },
            {
              type: 'canvasArc',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 15,
              },
              y: {
                type: 'num',
                value: 9,
              },
              r: {
                type: 'num',
                value: 7,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#2c3e50',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 3,
              },
              y: {
                type: 'num',
                value: 3,
              },
              w: {
                type: 'num',
                value: 24,
              },
              h: {
                type: 'num',
                value: 6,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#34495e',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 8,
              },
              y: {
                type: 'num',
                value: 32,
              },
              w: {
                type: 'num',
                value: 6,
              },
              h: {
                type: 'num',
                value: 12,
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 17,
              },
              y: {
                type: 'num',
                value: 32,
              },
              w: {
                type: 'num',
                value: 6,
              },
              h: {
                type: 'num',
                value: 12,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 30,
          },
          baseH: {
            type: 'num',
            value: 44,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'tijolo',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#8d6e63',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
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
                value: 80,
              },
              h: {
                type: 'num',
                value: 40,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#6d4c41',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
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
                value: 80,
              },
              h: {
                type: 'num',
                value: 5,
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 20,
              },
              w: {
                type: 'num',
                value: 80,
              },
              h: {
                type: 'num',
                value: 2,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 80,
          },
          baseH: {
            type: 'num',
            value: 40,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'tabua',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#a1887f',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
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
                value: 90,
              },
              h: {
                type: 'num',
                value: 16,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#7a5628',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 12,
              },
              w: {
                type: 'num',
                value: 90,
              },
              h: {
                type: 'num',
                value: 4,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 90,
          },
          baseH: {
            type: 'num',
            value: 16,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'dente',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#8e44ad',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 2,
              },
              y: {
                type: 'num',
                value: 6,
              },
              w: {
                type: 'num',
                value: 24,
              },
              h: {
                type: 'num',
                value: 18,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#ffffff',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 6,
              },
              y: {
                type: 'num',
                value: 0,
              },
              w: {
                type: 'num',
                value: 4,
              },
              h: {
                type: 'num',
                value: 8,
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 14,
              },
              y: {
                type: 'num',
                value: 0,
              },
              w: {
                type: 'num',
                value: 4,
              },
              h: {
                type: 'num',
                value: 8,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 28,
          },
          baseH: {
            type: 'num',
            value: 24,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'casco',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#16a085',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 4,
              },
              w: {
                type: 'num',
                value: 28,
              },
              h: {
                type: 'num',
                value: 16,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#0e6655',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 4,
              },
              y: {
                type: 'num',
                value: 8,
              },
              w: {
                type: 'num',
                value: 20,
              },
              h: {
                type: 'num',
                value: 4,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 28,
          },
          baseH: {
            type: 'num',
            value: 20,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'canhao',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#5d4037',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 0,
              },
              y: {
                type: 'num',
                value: 8,
              },
              w: {
                type: 'num',
                value: 26,
              },
              h: {
                type: 'num',
                value: 20,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#3e2723',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 2,
              },
              y: {
                type: 'num',
                value: 0,
              },
              w: {
                type: 'num',
                value: 12,
              },
              h: {
                type: 'num',
                value: 12,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 26,
          },
          baseH: {
            type: 'num',
            value: 28,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'perola',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#e0f7fa',
              },
            },
            {
              type: 'canvasArc',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 6,
              },
              y: {
                type: 'num',
                value: 6,
              },
              r: {
                type: 'num',
                value: 6,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 12,
          },
          baseH: {
            type: 'num',
            value: 12,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'moeda',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#ffd166',
              },
            },
            {
              type: 'canvasArc',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 8,
              },
              y: {
                type: 'num',
                value: 8,
              },
              r: {
                type: 'num',
                value: 7,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#f0a500',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 6,
              },
              y: {
                type: 'num',
                value: 4,
              },
              w: {
                type: 'num',
                value: 4,
              },
              h: {
                type: 'num',
                value: 8,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 16,
          },
          baseH: {
            type: 'num',
            value: 16,
          },
        },
        {
          type: 'gk:defineLook',
          name: 'bandeira',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#8a8a8a',
              },
            },
            {
              type: 'canvasFillRect',
              ctxVar: 'ctx',
              x: {
                type: 'num',
                value: 4,
              },
              y: {
                type: 'num',
                value: 0,
              },
              w: {
                type: 'num',
                value: 4,
              },
              h: {
                type: 'num',
                value: 70,
              },
            },
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#e63946',
              },
            },
            {
              type: 'canvasFillRect',
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
                value: 36,
              },
              h: {
                type: 'num',
                value: 24,
              },
            },
          ],
          baseW: {
            type: 'num',
            value: 48,
          },
          baseH: {
            type: 'num',
            value: 70,
          },
        },
        {
          type: 'gk:defineMold',
          name: 'chao',
          w: {
            type: 'num',
            value: 80,
          },
          h: {
            type: 'num',
            value: 40,
          },
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          damage: {
            type: 'num',
            value: 0,
          },
          color: '#8d6e63',
          image: '',
          look: 'tijolo',
        },
        {
          type: 'gk:defineMold',
          name: 'tabua',
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 16,
          },
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          damage: {
            type: 'num',
            value: 0,
          },
          color: '#a1887f',
          image: '',
          look: 'tabua',
        },
        {
          type: 'gk:defineMold',
          name: 'moeda',
          w: {
            type: 'num',
            value: 16,
          },
          h: {
            type: 'num',
            value: 16,
          },
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          damage: {
            type: 'num',
            value: 0,
          },
          color: '#ffd166',
          image: '',
          look: 'moeda',
        },
        {
          type: 'gk:defineMold',
          name: 'dente',
          w: {
            type: 'num',
            value: 28,
          },
          h: {
            type: 'num',
            value: 24,
          },
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          damage: {
            type: 'num',
            value: 0,
          },
          color: '#8e44ad',
          image: '',
          look: 'dente',
        },
        {
          type: 'gk:defineMold',
          name: 'casco',
          w: {
            type: 'num',
            value: 28,
          },
          h: {
            type: 'num',
            value: 20,
          },
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          damage: {
            type: 'num',
            value: 0,
          },
          color: '#16a085',
          image: '',
          look: 'casco',
        },
        {
          type: 'gk:defineMold',
          name: 'canhao',
          w: {
            type: 'num',
            value: 26,
          },
          h: {
            type: 'num',
            value: 28,
          },
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          damage: {
            type: 'num',
            value: 0,
          },
          color: '#5d4037',
          image: '',
          look: 'canhao',
        },
        {
          type: 'gk:defineMold',
          name: 'perola',
          w: {
            type: 'num',
            value: 12,
          },
          h: {
            type: 'num',
            value: 12,
          },
          health: {
            type: 'num',
            value: 1,
          },
          speed: {
            type: 'num',
            value: 0,
          },
          damage: {
            type: 'num',
            value: 0,
          },
          color: '#e0f7fa',
          image: '',
          look: 'perola',
        },
        {
          type: 'gk:defineEffect',
          name: 'poeira',
          count: {
            type: 'num',
            value: 8,
          },
          color: '#ffffff',
          size: {
            type: 'num',
            value: 3,
          },
          life: {
            type: 'num',
            value: 0.4,
          },
          speed: {
            type: 'num',
            value: 100,
          },
          gravity: {
            type: 'num',
            value: 300,
          },
        },
        {
          type: 'gk:defineEffect',
          name: 'estrela',
          count: {
            type: 'num',
            value: 12,
          },
          color: '#ffd166',
          size: {
            type: 'num',
            value: 4,
          },
          life: {
            type: 'num',
            value: 0.5,
          },
          speed: {
            type: 'num',
            value: 160,
          },
          gravity: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'gk:defineRegion',
          name: 'fim',
          x: {
            type: 'num',
            value: 1560,
          },
          y: {
            type: 'num',
            value: 250,
          },
          w: {
            type: 'num',
            value: 90,
          },
          h: {
            type: 'num',
            value: 100,
          },
        },
      ],
      start: [
        {
          type: 'gk:setup',
          w: {
            type: 'num',
            value: 800,
          },
          h: {
            type: 'num',
            value: 400,
          },
          bg: '#8ecae6',
          accent: '#e63946',
        },
        {
          type: 'gk:setScreenText',
          screen: 'menu',
          title: {
            type: 'str',
            value: 'Mundo Pirata Profissional',
          },
          text: {
            type: 'str',
            value:
              'Corra com as setas, pule com a seta para cima e desça pelas tábuas com a seta para baixo. Pise nos inimigos, pegue as moedas e chegue na bandeira sem perder as 3 vidas!',
          },
          button: {
            type: 'str',
            value: 'Aventurar',
          },
        },
        {
          type: 'gk:setScreenText',
          screen: 'vitoria',
          title: {
            type: 'str',
            value: 'Bandeira conquistada!',
          },
          text: {
            type: 'str',
            value: 'Você atravessou o mundo pirata inteiro. Que capitão!',
          },
          button: {
            type: 'str',
            value: 'Jogar de novo',
          },
        },
        {
          type: 'gk:setScreenText',
          screen: 'fim',
          title: {
            type: 'str',
            value: 'Fim da linha...',
          },
          text: {
            type: 'str',
            value: 'Suas vidas acabaram. Pise nos inimigos por cima e desvie das pérolas!',
          },
          button: {
            type: 'str',
            value: 'Tentar de novo',
          },
        },
        {
          type: 'gk:setJumpFeel',
          coyote: {
            type: 'num',
            value: 0.1,
          },
          buffer: {
            type: 'num',
            value: 0.1,
          },
          hold: {
            type: 'num',
            value: 0.3,
          },
          gravity: {
            type: 'num',
            value: 2000,
          },
        },
        {
          type: 'gk:createCharacter',
          varName: 'heroi',
          image: '',
          w: {
            type: 'num',
            value: 30,
          },
          h: {
            type: 'num',
            value: 44,
          },
          speed: {
            type: 'num',
            value: 220,
          },
          color: '#4a76b8',
        },
        {
          type: 'gk:stateLook',
          charVar: 'heroi',
          state: 'parado',
          look: 'piratao',
        },
        {
          type: 'var',
          name: 'vidas',
          value: {
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
          name: 'proximaPerola',
          value: {
            type: 'num',
            value: 1.6,
          },
        },
        {
          type: 'gk:setCheckpoint',
          x: {
            type: 'num',
            value: 40,
          },
          y: {
            type: 'num',
            value: 250,
          },
        },
        {
          type: 'gk:respawn',
          charVar: 'heroi',
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 0,
          },
          y: {
            type: 'num',
            value: 340,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 80,
          },
          y: {
            type: 'num',
            value: 340,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 160,
          },
          y: {
            type: 'num',
            value: 340,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 240,
          },
          y: {
            type: 'num',
            value: 340,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 480,
          },
          y: {
            type: 'num',
            value: 340,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 560,
          },
          y: {
            type: 'num',
            value: 340,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 640,
          },
          y: {
            type: 'num',
            value: 340,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 880,
          },
          y: {
            type: 'num',
            value: 340,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 960,
          },
          y: {
            type: 'num',
            value: 340,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 1040,
          },
          y: {
            type: 'num',
            value: 340,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 1120,
          },
          y: {
            type: 'num',
            value: 340,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 1200,
          },
          y: {
            type: 'num',
            value: 340,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 1280,
          },
          y: {
            type: 'num',
            value: 340,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 1360,
          },
          y: {
            type: 'num',
            value: 340,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 1440,
          },
          y: {
            type: 'num',
            value: 340,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'chao',
          x: {
            type: 'num',
            value: 1520,
          },
          y: {
            type: 'num',
            value: 340,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'tabua',
          x: {
            type: 'num',
            value: 320,
          },
          y: {
            type: 'num',
            value: 250,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'tabua',
          x: {
            type: 'num',
            value: 700,
          },
          y: {
            type: 'num',
            value: 230,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'tabua',
          x: {
            type: 'num',
            value: 1080,
          },
          y: {
            type: 'num',
            value: 250,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'tabua',
          x: {
            type: 'num',
            value: 1300,
          },
          y: {
            type: 'num',
            value: 220,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'moeda',
          x: {
            type: 'num',
            value: 160,
          },
          y: {
            type: 'num',
            value: 300,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'moeda',
          x: {
            type: 'num',
            value: 350,
          },
          y: {
            type: 'num',
            value: 210,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'moeda',
          x: {
            type: 'num',
            value: 730,
          },
          y: {
            type: 'num',
            value: 190,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'moeda',
          x: {
            type: 'num',
            value: 980,
          },
          y: {
            type: 'num',
            value: 300,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'moeda',
          x: {
            type: 'num',
            value: 1110,
          },
          y: {
            type: 'num',
            value: 210,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'moeda',
          x: {
            type: 'num',
            value: 1330,
          },
          y: {
            type: 'num',
            value: 180,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'moeda',
          x: {
            type: 'num',
            value: 1480,
          },
          y: {
            type: 'num',
            value: 300,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'dente',
          x: {
            type: 'num',
            value: 620,
          },
          y: {
            type: 'num',
            value: 316,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'casco',
          x: {
            type: 'num',
            value: 1000,
          },
          y: {
            type: 'num',
            value: 320,
          },
        },
        {
          type: 'gk:spawnFromMold',
          mold: 'canhao',
          x: {
            type: 'num',
            value: 1240,
          },
          y: {
            type: 'num',
            value: 312,
          },
        },
        {
          type: 'gk:cameraFollow',
          charVar: 'heroi',
          w: {
            type: 'num',
            value: 1700,
          },
          h: {
            type: 'num',
            value: 400,
          },
        },
      ],
      events: [
        {
          type: 'gk:onEvent',
          event: 'pirata:levou',
          body: [
            {
              type: 'assign',
              name: 'vidas',
              value: {
                type: 'binop',
                op: '-',
                left: {
                  type: 'var',
                  name: 'vidas',
                },
                right: {
                  type: 'num',
                  value: 1,
                },
              },
            },
            {
              type: 'gk:cameraShake',
              intensity: {
                type: 'num',
                value: 8,
              },
              seconds: {
                type: 'num',
                value: 0.3,
              },
            },
            {
              type: 'gk:playEffect',
              fx: 'hurt',
            },
            {
              type: 'gk:respawn',
              charVar: 'heroi',
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<',
                left: {
                  type: 'var',
                  name: 'vidas',
                },
                right: {
                  type: 'num',
                  value: 1,
                },
              },
              then: [
                {
                  type: 'gk:playEffect',
                  fx: 'gameover',
                },
                {
                  type: 'gk:setState',
                  name: 'fim',
                },
              ],
            },
          ],
        },
      ],
      loops: [
        {
          type: 'gk:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'gk:platformerHero',
              charVar: 'heroi',
              speed: {
                type: 'num',
                value: 220,
              },
              force: {
                type: 'num',
                value: 640,
              },
              dtVar: 'dt',
            },
            {
              type: 'gk:dropThrough',
              charVar: 'heroi',
            },
            {
              type: 'gk:collideGroup',
              charVar: 'heroi',
              mold: 'chao',
            },
            {
              type: 'gk:oneWayPlatform',
              charVar: 'heroi',
              mold: 'tabua',
              dtVar: 'dt',
            },
            {
              type: 'gk:platformerAnim',
              charVar: 'heroi',
            },
            {
              type: 'gk:forEachActive',
              mold: 'moeda',
              itemName: 'moeda',
              body: [
                {
                  type: 'if',
                  cond: {
                    type: 'gk:charactersTouch',
                    aVar: 'heroi',
                    bVar: 'moeda',
                  },
                  then: [
                    {
                      type: 'gk:burst',
                      effect: 'estrela',
                      x: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'gk:charX',
                          charVar: 'moeda',
                        },
                        right: {
                          type: 'num',
                          value: 8,
                        },
                      },
                      y: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'gk:charY',
                          charVar: 'moeda',
                        },
                        right: {
                          type: 'num',
                          value: 8,
                        },
                      },
                    },
                    {
                      type: 'gk:playEffect',
                      fx: 'coin',
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
                      type: 'gk:recycle',
                      charVar: 'moeda',
                    },
                  ],
                },
              ],
            },
            {
              type: 'gk:forEachActive',
              mold: 'dente',
              itemName: 'bicho',
              body: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'gk:charX',
                      charVar: 'heroi',
                    },
                    right: {
                      type: 'gk:charX',
                      charVar: 'bicho',
                    },
                  },
                  then: [
                    {
                      type: 'gk:setVelocity',
                      charVar: 'bicho',
                      vx: {
                        type: 'num',
                        value: 70,
                      },
                      vy: {
                        type: 'num',
                        value: 0,
                      },
                    },
                  ],
                  else: [
                    {
                      type: 'gk:setVelocity',
                      charVar: 'bicho',
                      vx: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'num',
                          value: 0,
                        },
                        right: {
                          type: 'num',
                          value: 70,
                        },
                      },
                      vy: {
                        type: 'num',
                        value: 0,
                      },
                    },
                  ],
                },
                {
                  type: 'gk:moveByVelocity',
                  charVar: 'bicho',
                  dtVar: 'dt',
                },
                {
                  type: 'gk:applyGravity',
                  charVar: 'bicho',
                  g: {
                    type: 'num',
                    value: 1600,
                  },
                  dtVar: 'dt',
                },
                {
                  type: 'gk:collideGroup',
                  charVar: 'bicho',
                  mold: 'chao',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'gk:charactersTouch',
                    aVar: 'heroi',
                    bVar: 'bicho',
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '<',
                        left: {
                          type: 'binop',
                          op: '+',
                          left: {
                            type: 'gk:charY',
                            charVar: 'heroi',
                          },
                          right: {
                            type: 'num',
                            value: 30,
                          },
                        },
                        right: {
                          type: 'gk:charY',
                          charVar: 'bicho',
                        },
                      },
                      then: [
                        {
                          type: 'gk:burst',
                          effect: 'poeira',
                          x: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'gk:charX',
                              charVar: 'bicho',
                            },
                            right: {
                              type: 'num',
                              value: 14,
                            },
                          },
                          y: {
                            type: 'gk:charY',
                            charVar: 'bicho',
                          },
                        },
                        {
                          type: 'gk:playEffect',
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
                              value: 2,
                            },
                          },
                        },
                        {
                          type: 'gk:recycle',
                          charVar: 'bicho',
                        },
                      ],
                      else: [
                        {
                          type: 'gk:emit',
                          event: 'pirata:levou',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: 'gk:forEachActive',
              mold: 'casco',
              itemName: 'bicho',
              body: [
                {
                  type: 'gk:moveByVelocity',
                  charVar: 'bicho',
                  dtVar: 'dt',
                },
                {
                  type: 'gk:applyGravity',
                  charVar: 'bicho',
                  g: {
                    type: 'num',
                    value: 1600,
                  },
                  dtVar: 'dt',
                },
                {
                  type: 'gk:collideGroup',
                  charVar: 'bicho',
                  mold: 'chao',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: {
                      type: 'gk:charX',
                      charVar: 'bicho',
                    },
                    right: {
                      type: 'num',
                      value: 900,
                    },
                  },
                  then: [
                    {
                      type: 'gk:setVelocity',
                      charVar: 'bicho',
                      vx: {
                        type: 'num',
                        value: 55,
                      },
                      vy: {
                        type: 'num',
                        value: 0,
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
                      type: 'gk:charX',
                      charVar: 'bicho',
                    },
                    right: {
                      type: 'num',
                      value: 1140,
                    },
                  },
                  then: [
                    {
                      type: 'gk:setVelocity',
                      charVar: 'bicho',
                      vx: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'num',
                          value: 0,
                        },
                        right: {
                          type: 'num',
                          value: 55,
                        },
                      },
                      vy: {
                        type: 'num',
                        value: 0,
                      },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'gk:charactersTouch',
                    aVar: 'heroi',
                    bVar: 'bicho',
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '<',
                        left: {
                          type: 'binop',
                          op: '+',
                          left: {
                            type: 'gk:charY',
                            charVar: 'heroi',
                          },
                          right: {
                            type: 'num',
                            value: 30,
                          },
                        },
                        right: {
                          type: 'gk:charY',
                          charVar: 'bicho',
                        },
                      },
                      then: [
                        {
                          type: 'gk:burst',
                          effect: 'poeira',
                          x: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'gk:charX',
                              charVar: 'bicho',
                            },
                            right: {
                              type: 'num',
                              value: 14,
                            },
                          },
                          y: {
                            type: 'gk:charY',
                            charVar: 'bicho',
                          },
                        },
                        {
                          type: 'gk:playEffect',
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
                              value: 2,
                            },
                          },
                        },
                        {
                          type: 'gk:recycle',
                          charVar: 'bicho',
                        },
                      ],
                      else: [
                        {
                          type: 'gk:emit',
                          event: 'pirata:levou',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: 'assign',
              name: 'proximaPerola',
              value: {
                type: 'binop',
                op: '-',
                left: {
                  type: 'var',
                  name: 'proximaPerola',
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
                  name: 'proximaPerola',
                },
                right: {
                  type: 'num',
                  value: 0,
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'proximaPerola',
                  value: {
                    type: 'num',
                    value: 2,
                  },
                },
                {
                  type: 'gk:spawnNamed',
                  varName: 'bala',
                  mold: 'perola',
                  x: {
                    type: 'num',
                    value: 1240,
                  },
                  y: {
                    type: 'num',
                    value: 306,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: {
                      type: 'gk:charX',
                      charVar: 'heroi',
                    },
                    right: {
                      type: 'num',
                      value: 1240,
                    },
                  },
                  then: [
                    {
                      type: 'gk:setVelocity',
                      charVar: 'bala',
                      vx: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'num',
                          value: 0,
                        },
                        right: {
                          type: 'num',
                          value: 150,
                        },
                      },
                      vy: {
                        type: 'num',
                        value: 0,
                      },
                    },
                  ],
                  else: [
                    {
                      type: 'gk:setVelocity',
                      charVar: 'bala',
                      vx: {
                        type: 'num',
                        value: 150,
                      },
                      vy: {
                        type: 'num',
                        value: 0,
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'gk:forEachActive',
              mold: 'perola',
              itemName: 'bala',
              body: [
                {
                  type: 'gk:moveByVelocity',
                  charVar: 'bala',
                  dtVar: 'dt',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'gk:charactersTouch',
                    aVar: 'heroi',
                    bVar: 'bala',
                  },
                  then: [
                    {
                      type: 'gk:recycle',
                      charVar: 'bala',
                    },
                    {
                      type: 'gk:emit',
                      event: 'pirata:levou',
                    },
                  ],
                },
              ],
            },
            {
              type: 'gk:cullOffscreen',
              mold: 'perola',
              margin: {
                type: 'num',
                value: 200,
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>',
                left: {
                  type: 'gk:charY',
                  charVar: 'heroi',
                },
                right: {
                  type: 'num',
                  value: 430,
                },
              },
              then: [
                {
                  type: 'gk:emit',
                  event: 'pirata:levou',
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'gk:isInside',
                charVar: 'heroi',
                region: 'fim',
              },
              then: [
                {
                  type: 'gk:playEffect',
                  fx: 'win',
                },
                {
                  type: 'gk:setState',
                  name: 'vitoria',
                },
              ],
            },
          ],
        },
        {
          type: 'gk:onDraw',
          ctxName: 'ctx',
          body: [
            {
              type: 'gk:drawBackground',
              color: '#8ecae6',
              grid: false,
            },
            {
              type: 'gk:drawActive',
              mold: 'chao',
            },
            {
              type: 'gk:drawActive',
              mold: 'tabua',
            },
            {
              type: 'gk:drawActive',
              mold: 'moeda',
            },
            {
              type: 'gk:drawLook',
              look: 'bandeira',
              x: {
                type: 'num',
                value: 1560,
              },
              y: {
                type: 'num',
                value: 270,
              },
              w: {
                type: 'num',
                value: 48,
              },
              h: {
                type: 'num',
                value: 70,
              },
            },
            {
              type: 'gk:drawActive',
              mold: 'dente',
            },
            {
              type: 'gk:drawActive',
              mold: 'casco',
            },
            {
              type: 'gk:drawActive',
              mold: 'canhao',
            },
            {
              type: 'gk:drawActive',
              mold: 'perola',
            },
            {
              type: 'gk:drawShadow',
              charVar: 'heroi',
            },
            {
              type: 'gk:drawCharacter',
              charVar: 'heroi',
            },
            {
              type: 'gk:drawEffects',
            },
          ],
        },
        {
          type: 'gk:onDrawHud',
          ctxName: 'ctx',
          body: [
            {
              type: 'canvasFillStyle',
              ctxVar: 'ctx',
              color: {
                type: 'color',
                value: '#0e2a38',
              },
            },
            {
              type: 'canvasFont',
              ctxVar: 'ctx',
              size: 24,
              family: 'sans-serif',
            },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Vidas: ',
                },
                right: {
                  type: 'var',
                  name: 'vidas',
                },
              },
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 36,
              },
            },
            {
              type: 'canvasFillText',
              ctxVar: 'ctx',
              text: {
                type: 'binop',
                op: '+',
                left: {
                  type: 'str',
                  value: 'Tesouro: ',
                },
                right: {
                  type: 'var',
                  name: 'pontos',
                },
              },
              x: {
                type: 'num',
                value: 20,
              },
              y: {
                type: 'num',
                value: 68,
              },
            },
          ],
        },
      ],
    },
  },
})
