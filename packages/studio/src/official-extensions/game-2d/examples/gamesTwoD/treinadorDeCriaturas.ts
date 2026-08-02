import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from '../shared'

/**
 * Exemplo "Treinador de Criaturas": recriacao BASICA e ENXUTA do
 * pokemon-style-game do Chris Courses (RPG top-down + batalha por turnos). O
 * heroi anda nas 4 direcoes com colisao contra os muros; ao encostar no mato
 * alto uma batalha por turnos comeca contra uma criatura selvagem (golpes por
 * teclas 1/2/3, barras de vida, vencer ou perder) e o objetivo e vencer a
 * batalha. 100% procedural (formas e cores, sem os PNGs do mapa e dos monstros).
 * A behavior foi GERADA pelo parser real a partir do fonte em
 * __gen_treinadorDeCriaturas.ts (drift test: treinadorDeCriaturasExample.test.ts).
 */
export const treinadorDeCriaturasExample: ExtensionExample = beginnerGameExample({
  name: 'Treinador de Criaturas',
  experience: 'game',
  description:
    'Ande com as setas e entre no mato alto para achar uma criatura. Vença a batalha por turnos com as teclas 1, 2 e 3. Enter começa e reinicia.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 270 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0f1220',
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
          background: '#3f7d4f',
        },
      },
    ],
    version: 2,
    behavior: {
      start: [
        { type: 'g2d:fitScreen', percent: { type: 'num', value: 100 } },
        {
          type: 'g2d:defineShape',
          shapeName: 'treinador',
          body: [
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 8 },
              y: { type: 'num', value: 4 },
              w: { type: 'num', value: 14 },
              h: { type: 'num', value: 12 },
              color: '#3a2a1a',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 6 },
              y: { type: 'num', value: 14 },
              w: { type: 'num', value: 18 },
              h: { type: 'num', value: 8 },
              color: '#c0392b',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: { type: 'num', value: 12 },
              y: { type: 'num', value: 10 },
              r: { type: 'num', value: 1 },
              color: '#20122f',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: { type: 'num', value: 18 },
              y: { type: 'num', value: 10 },
              r: { type: 'num', value: 1 },
              color: '#20122f',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 8 },
              y: { type: 'num', value: 22 },
              w: { type: 'num', value: 14 },
              h: { type: 'num', value: 12 },
              color: '#2c5aa0',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 4 },
              y: { type: 'num', value: 22 },
              w: { type: 'num', value: 5 },
              h: { type: 'num', value: 9 },
              color: '#e8b088',
            },
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 21 },
              y: { type: 'num', value: 22 },
              w: { type: 'num', value: 5 },
              h: { type: 'num', value: 9 },
              color: '#e8b088',
            },
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'criatura',
          body: [
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: { type: 'num', value: 16 },
              y: { type: 'num', value: 18 },
              r: { type: 'num', value: 13 },
              color: '#7b4fbf',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: { type: 'num', value: 8 },
              y1: { type: 'num', value: 8 },
              x2: { type: 'num', value: 4 },
              y2: { type: 'num', value: 0 },
              x3: { type: 'num', value: 13 },
              y3: { type: 'num', value: 8 },
              color: '#5a3a92',
            },
            {
              type: 'g2d:paintTriangle',
              ctxVar: 'ctx',
              x1: { type: 'num', value: 24 },
              y1: { type: 'num', value: 8 },
              x2: { type: 'num', value: 28 },
              y2: { type: 'num', value: 0 },
              x3: { type: 'num', value: 19 },
              y3: { type: 'num', value: 8 },
              color: '#5a3a92',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: { type: 'num', value: 11 },
              y: { type: 'num', value: 16 },
              r: { type: 'num', value: 3 },
              color: '#ffe066',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: { type: 'num', value: 21 },
              y: { type: 'num', value: 16 },
              r: { type: 'num', value: 3 },
              color: '#ffe066',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: { type: 'num', value: 11 },
              y: { type: 'num', value: 16 },
              r: { type: 'num', value: 1 },
              color: '#20122f',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: { type: 'num', value: 21 },
              y: { type: 'num', value: 16 },
              r: { type: 'num', value: 1 },
              color: '#20122f',
            },
          ],
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'heroi',
          shapeName: 'treinador',
          x: { type: 'num', value: 90 },
          y: { type: 'num', value: 210 },
          w: { type: 'num', value: 30 },
          h: { type: 'num', value: 34 },
        },
        { type: 'g2d:setHitboxScale', spriteVar: 'heroi', percent: { type: 'num', value: 80 } },
        {
          type: 'g2d:createShapeSprite',
          varName: 'rival',
          shapeName: 'criatura',
          x: { type: 'num', value: 320 },
          y: { type: 'num', value: 60 },
          w: { type: 'num', value: 96 },
          h: { type: 'num', value: 96 },
        },
        { type: 'g2d:setHealth', spriteVar: 'heroi', amount: { type: 'num', value: 24 } },
        { type: 'g2d:setHealth', spriteVar: 'rival', amount: { type: 'num', value: 24 } },
        { type: 'g2d:createGroup', varName: 'muros' },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'muros',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 0 },
          w: { type: 'num', value: 480 },
          h: { type: 'num', value: 20 },
          color: '#4a4038',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'muros',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 250 },
          w: { type: 'num', value: 480 },
          h: { type: 'num', value: 20 },
          color: '#4a4038',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'muros',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 0 },
          w: { type: 'num', value: 20 },
          h: { type: 'num', value: 270 },
          color: '#4a4038',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'muros',
          x: { type: 'num', value: 460 },
          y: { type: 'num', value: 0 },
          w: { type: 'num', value: 20 },
          h: { type: 'num', value: 270 },
          color: '#4a4038',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'muros',
          x: { type: 'num', value: 150 },
          y: { type: 'num', value: 120 },
          w: { type: 'num', value: 60 },
          h: { type: 'num', value: 60 },
          color: '#5a4e42',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:createSprite',
          varName: 'mato',
          x: { type: 'num', value: 320 },
          y: { type: 'num', value: 170 },
          w: { type: 'num', value: 90 },
          h: { type: 'num', value: 70 },
          color: '#2e7d4f',
        },
        { type: 'var', name: 'turno', value: { type: 'str', value: 'espera' } },
        { type: 'var', name: 'dano', value: { type: 'num', value: 0 } },
        {
          type: 'var',
          name: 'mensagem',
          value: { type: 'str', value: 'Ache o mato alto para achar uma criatura!' },
        },
        { type: 'g2d:setScene', name: 'inicio' },
      ],
      events: [
        {
          type: 'g2d:onKey',
          key: 'Enter',
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'inicio' },
              then: [{ type: 'g2d:setScene', name: 'mapa' }],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'vitoria' },
              then: [{ type: 'g2d:restart' }],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'derrota' },
              then: [{ type: 'g2d:restart' }],
            },
          ],
        },
        {
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'keydown',
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'batalha' },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: { type: 'var', name: 'turno' },
                    right: { type: 'str', value: 'jogador' },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '==',
                        left: { type: 'eventProp', prop: 'key' },
                        right: { type: 'str', value: '1' },
                      },
                      then: [
                        { type: 'assign', name: 'dano', value: { type: 'num', value: 8 } },
                        {
                          type: 'g2d:changeHealth',
                          spriteVar: 'rival',
                          delta: {
                            type: 'binop',
                            op: '-',
                            left: { type: 'num', value: 0 },
                            right: { type: 'var', name: 'dano' },
                          },
                        },
                        {
                          type: 'g2d:blinkSprite',
                          spriteVar: 'rival',
                          frames: { type: 'num', value: 24 },
                        },
                        { type: 'g2d:shake', ctxVar: 'ctx', intensity: { type: 'num', value: 6 } },
                        { type: 'g2d:playFx', fx: 'explosion' },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'binop',
                              op: '+',
                              left: { type: 'str', value: 'Brasa! A criatura perdeu ' },
                              right: { type: 'var', name: 'dano' },
                            },
                            right: { type: 'str', value: ' de vida' },
                          },
                        },
                        {
                          type: 'assign',
                          name: 'turno',
                          value: { type: 'str', value: 'criatura' },
                        },
                      ],
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '==',
                        left: { type: 'eventProp', prop: 'key' },
                        right: { type: 'str', value: '2' },
                      },
                      then: [
                        { type: 'assign', name: 'dano', value: { type: 'num', value: 5 } },
                        {
                          type: 'g2d:changeHealth',
                          spriteVar: 'rival',
                          delta: {
                            type: 'binop',
                            op: '-',
                            left: { type: 'num', value: 0 },
                            right: { type: 'var', name: 'dano' },
                          },
                        },
                        {
                          type: 'g2d:blinkSprite',
                          spriteVar: 'rival',
                          frames: { type: 'num', value: 24 },
                        },
                        { type: 'g2d:playFx', fx: 'hit' },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: {
                            type: 'binop',
                            op: '+',
                            left: {
                              type: 'binop',
                              op: '+',
                              left: { type: 'str', value: 'Rajada! A criatura perdeu ' },
                              right: { type: 'var', name: 'dano' },
                            },
                            right: { type: 'str', value: ' de vida' },
                          },
                        },
                        {
                          type: 'assign',
                          name: 'turno',
                          value: { type: 'str', value: 'criatura' },
                        },
                      ],
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '==',
                        left: { type: 'eventProp', prop: 'key' },
                        right: { type: 'str', value: '3' },
                      },
                      then: [
                        {
                          type: 'g2d:changeHealth',
                          spriteVar: 'heroi',
                          delta: { type: 'num', value: 3 },
                        },
                        { type: 'g2d:playFx', fx: 'heal' },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: { type: 'str', value: 'Foco! Você recuperou um pouco de vida' },
                        },
                        {
                          type: 'assign',
                          name: 'turno',
                          value: { type: 'str', value: 'criatura' },
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
            { type: 'g2d:clear' },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'inicio' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: { type: 'str', value: 'Treinador de Criaturas' },
                  subtitle: {
                    type: 'str',
                    value:
                      'Ande com as setas e entre no mato alto para encontrar uma criatura selvagem. Vença a batalha por turnos!',
                  },
                  hint: { type: 'str', value: 'Aperte Enter para começar' },
                  bg: '#1f2a44',
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'mapa' },
              then: [
                { type: 'g2d:topDown', spriteVar: 'heroi', speed: { type: 'num', value: 3 } },
                { type: 'g2d:collideGroup', spriteVar: 'heroi', groupVar: 'muros' },
                { type: 'g2d:drawSprite', spriteVar: 'mato', ctxVar: 'ctx' },
                { type: 'g2d:drawGroup', groupVar: 'muros', ctxVar: 'ctx' },
                { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: '>',
                  value: { type: 'var', name: 'mensagem' },
                  x: { type: 'num', value: 26 },
                  y: { type: 'num', value: 40 },
                  color: '#f3f6ff',
                  size: { type: 'num', value: 14 },
                },
                {
                  type: 'if',
                  cond: { type: 'g2d:touches', aVar: 'heroi', bVar: 'mato' },
                  then: [
                    { type: 'assign', name: 'turno', value: { type: 'str', value: 'jogador' } },
                    {
                      type: 'assign',
                      name: 'mensagem',
                      value: { type: 'str', value: 'Uma criatura selvagem apareceu!' },
                    },
                    { type: 'g2d:playFx', fx: 'start' },
                    { type: 'g2d:setScene', name: 'batalha' },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'batalha' },
              then: [
                { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
                { type: 'g2d:drawSprite', spriteVar: 'rival', ctxVar: 'ctx' },
                {
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: 'Você',
                  x: { type: 'num', value: 26 },
                  y: { type: 'num', value: 208 },
                  color: '#a8d8ff',
                  size: { type: 'num', value: 14 },
                  align: 'left',
                },
                {
                  type: 'g2d:drawBar',
                  ctxVar: 'ctx',
                  value: { type: 'g2d:getHealth', spriteVar: 'heroi' },
                  max: { type: 'g2d:getMaxHealth', spriteVar: 'heroi' },
                  x: { type: 'num', value: 26 },
                  y: { type: 'num', value: 216 },
                  w: { type: 'num', value: 150 },
                  h: { type: 'num', value: 12 },
                  color: '#3fbf6f',
                },
                {
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: 'Criatura selvagem',
                  x: { type: 'num', value: 300 },
                  y: { type: 'num', value: 36 },
                  color: '#d8b4ff',
                  size: { type: 'num', value: 14 },
                  align: 'left',
                },
                {
                  type: 'g2d:drawBar',
                  ctxVar: 'ctx',
                  value: { type: 'g2d:getHealth', spriteVar: 'rival' },
                  max: { type: 'g2d:getMaxHealth', spriteVar: 'rival' },
                  x: { type: 'num', value: 300 },
                  y: { type: 'num', value: 44 },
                  w: { type: 'num', value: 150 },
                  h: { type: 'num', value: 12 },
                  color: '#3fbf6f',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: { type: 'var', name: 'turno' },
                    right: { type: 'str', value: 'jogador' },
                  },
                  then: [
                    {
                      type: 'g2d:drawLabel',
                      ctxVar: 'ctx',
                      text: 'Sua vez! Escolha o golpe com as teclas:',
                      x: { type: 'num', value: 26 },
                      y: { type: 'num', value: 234 },
                      color: '#ffe9a8',
                      size: { type: 'num', value: 13 },
                      align: 'left',
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: { type: 'var', name: 'turno' },
                    right: { type: 'str', value: 'criatura' },
                  },
                  then: [
                    {
                      type: 'g2d:drawLabel',
                      ctxVar: 'ctx',
                      text: 'A criatura prepara o golpe dela...',
                      x: { type: 'num', value: 26 },
                      y: { type: 'num', value: 234 },
                      color: '#ffb4a8',
                      size: { type: 'num', value: 13 },
                      align: 'left',
                    },
                  ],
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: '>',
                  value: { type: 'var', name: 'mensagem' },
                  x: { type: 'num', value: 26 },
                  y: { type: 'num', value: 252 },
                  color: '#f3f6ff',
                  size: { type: 'num', value: 13 },
                },
                {
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: '1 Brasa (forte)   2 Rajada (média)   3 Foco (cura)',
                  x: { type: 'num', value: 26 },
                  y: { type: 'num', value: 270 },
                  color: '#c7d2fe',
                  size: { type: 'num', value: 13 },
                  align: 'left',
                },
                {
                  type: 'if',
                  cond: { type: 'g2d:healthDepleted', spriteVar: 'rival' },
                  then: [
                    { type: 'g2d:playFx', fx: 'win' },
                    { type: 'g2d:setScene', name: 'vitoria' },
                  ],
                },
                {
                  type: 'if',
                  cond: { type: 'g2d:healthDepleted', spriteVar: 'heroi' },
                  then: [
                    { type: 'g2d:playFx', fx: 'gameover' },
                    { type: 'g2d:setScene', name: 'derrota' },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'vitoria' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: { type: 'str', value: 'Você venceu a batalha!' },
                  subtitle: {
                    type: 'str',
                    value: 'A criatura selvagem desmaiou. Você é um treinador de verdade!',
                  },
                  hint: { type: 'str', value: 'Aperte Enter para jogar de novo' },
                  bg: '#1d4d33',
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'derrota' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: { type: 'str', value: 'Você perdeu!' },
                  subtitle: {
                    type: 'str',
                    value:
                      'Sua vida acabou nesta batalha. Escolha melhor os golpes e tente de novo!',
                  },
                  hint: { type: 'str', value: 'Aperte Enter para tentar de novo' },
                  bg: '#5a2a2a',
                },
              ],
            },
          ],
        },
        {
          type: 'g2d:everySeconds',
          seconds: { type: 'num', value: 1.2 },
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'batalha' },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: { type: 'var', name: 'turno' },
                    right: { type: 'str', value: 'criatura' },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: { type: 'g2d:randomChance', percent: { type: 'num', value: 50 } },
                      then: [
                        { type: 'assign', name: 'dano', value: { type: 'num', value: 4 } },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: { type: 'str', value: 'A criatura mordeu! Você perdeu 4 de vida' },
                        },
                      ],
                      else: [
                        { type: 'assign', name: 'dano', value: { type: 'num', value: 6 } },
                        {
                          type: 'assign',
                          name: 'mensagem',
                          value: {
                            type: 'str',
                            value: 'A criatura deu uma patada! Você perdeu 6 de vida',
                          },
                        },
                      ],
                    },
                    {
                      type: 'g2d:changeHealth',
                      spriteVar: 'heroi',
                      delta: {
                        type: 'binop',
                        op: '-',
                        left: { type: 'num', value: 0 },
                        right: { type: 'var', name: 'dano' },
                      },
                    },
                    {
                      type: 'g2d:blinkSprite',
                      spriteVar: 'heroi',
                      frames: { type: 'num', value: 24 },
                    },
                    { type: 'g2d:shake', ctxVar: 'ctx', intensity: { type: 'num', value: 5 } },
                    { type: 'g2d:playFx', fx: 'hurt' },
                    { type: 'assign', name: 'turno', value: { type: 'str', value: 'jogador' } },
                  ],
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
