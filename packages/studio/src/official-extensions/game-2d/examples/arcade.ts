import type { ExtensionExample } from '#extensions'
import { beginnerGameExample } from './shared'

/**
 * Exemplo "Nave contra Asteroides" (v0.6.0): jogo de tiro completo montado só com
 * blocos — grupos de sprites (tiros, asteroides), spawner por tempo, colisão de
 * grupo, HUD no canvas (placar + vidas) e telas de início/vitória/derrota. Mostra
 * o padrão recomendado: setup no começo do jogo + um único "a cada quadro"
 * que despacha por cena com "se a tela atual é X". Sprites coloridos (sem asset).
 */
export const asteroidsExample: ExtensionExample = beginnerGameExample({
  name: 'Nave contra Asteroides',
  experience: 'game',
  description:
    'Jogo de tiro: atire nos asteroides, ganhe pontos e sobreviva. Tem telas de início, vitória e derrota. Setas/dedo movem; Espaço atira; Enter começa.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 400, height: 320 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#020611',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
      {
        selector: 'canvas',
        declarations: { border: '2px solid #35e8ff', background: '#06101f' },
      },
    ],
    version: 2,
    behavior: {
      start: [
        // --- Setup (no começo: assim o "a cada quadro" enxerga estas variáveis) ---
        { type: 'g2d:fitScreen', percent: 100 },
        {
          type: 'g2d:createShip',
          varName: 'nave',
          x: 180,
          y: 250,
          w: 54,
          h: 62,
          bodyColor: '#35e8ff',
          wingColor: '#2568ff',
        },
        { type: 'g2d:setHealth', spriteVar: 'nave', amount: 3 },
        { type: 'g2d:createGroup', varName: 'tiros' },
        { type: 'g2d:createGroup', varName: 'asteroides' },
        { type: 'var', name: 'pontos', value: { type: 'num', value: 0 } },
        { type: 'g2d:setScene', name: 'inicio' },
      ],
      events: [
        // --- Enter: começar / reiniciar ---
        {
          type: 'g2d:onKey',
          key: 'Enter',
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'inicio' },
              then: [{ type: 'g2d:setScene', name: 'jogando' }],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'perdeu' },
              then: [{ type: 'g2d:restart' }],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'ganhou' },
              then: [{ type: 'g2d:restart' }],
            },
          ],
        },
        // --- Espaço: atirar (só quando está jogando) ---
        {
          type: 'g2d:onKey',
          key: 'Space',
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'jogando' },
              then: [
                {
                  type: 'g2d:spawnInGroup',
                  groupVar: 'tiros',
                  x: {
                    type: 'binop',
                    op: '+',
                    left: { type: 'memberGet', object: { type: 'var', name: 'nave' }, name: 'x' },
                    right: { type: 'num', value: 24 },
                  },
                  y: { type: 'memberGet', object: { type: 'var', name: 'nave' }, name: 'y' },
                  w: 6,
                  h: 14,
                  color: '#9cff57',
                  vx: { type: 'num', value: 0 },
                  vy: { type: 'num', value: -7 },
                },
                { type: 'g2d:playShoot' },
              ],
            },
          ],
        },
      ],
      loops: [
        // --- Enquanto estiver rodando: limpa, desenha o fundo e despacha por cena ---
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            { type: 'g2d:starfield', ctxVar: 'ctx', speed: 1 },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'inicio' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'Nave contra Asteroides',
                  subtitle: 'Atire nos asteroides e sobreviva!',
                  hint: 'Aperte Enter para começar',
                  bg: '#02111f',
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'jogando' },
              then: [
                { type: 'g2d:dragX', spriteVar: 'nave' },
                { type: 'g2d:clampToScreen', spriteVar: 'nave', ctxVar: 'ctx' },
                { type: 'g2d:drawSprite', spriteVar: 'nave', ctxVar: 'ctx' },
                {
                  type: 'g2d:everyFrames',
                  n: { type: 'num', value: 40 },
                  body: [
                    {
                      type: 'g2d:spawnAsteroid',
                      groupVar: 'asteroides',
                      x: { type: 'g2d:randomX' },
                      y: { type: 'num', value: -30 },
                      size: 40,
                      color: '#8d8f9b',
                      vx: { type: 'num', value: 0 },
                      vy: { type: 'num', value: 3 },
                    },
                  ],
                },
                { type: 'g2d:updateGroup', groupVar: 'tiros' },
                { type: 'g2d:updateGroup', groupVar: 'asteroides' },
                { type: 'g2d:drawGroup', groupVar: 'tiros', ctxVar: 'ctx' },
                { type: 'g2d:drawGroup', groupVar: 'asteroides', ctxVar: 'ctx' },
                {
                  type: 'g2d:onGroupOverlap',
                  aGroup: 'tiros',
                  aName: 'tiro',
                  bGroup: 'asteroides',
                  bName: 'asteroide',
                  body: [
                    { type: 'g2d:removeFromGroup', spriteVar: 'tiro', groupVar: 'tiros' },
                    { type: 'g2d:removeFromGroup', spriteVar: 'asteroide', groupVar: 'asteroides' },
                    {
                      type: 'assign',
                      name: 'pontos',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: { type: 'var', name: 'pontos' },
                        right: { type: 'num', value: 1 },
                      },
                    },
                    { type: 'g2d:explode', spriteVar: 'asteroide', color: '#ffb13b' },
                    { type: 'g2d:playExplosion' },
                    { type: 'g2d:shake', ctxVar: 'ctx', intensity: 5 },
                  ],
                },
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'nave',
                  groupVar: 'asteroides',
                  itemName: 'asteroide',
                  body: [
                    { type: 'g2d:removeFromGroup', spriteVar: 'asteroide', groupVar: 'asteroides' },
                    { type: 'g2d:explode', spriteVar: 'asteroide', color: '#ff5d3d' },
                    { type: 'g2d:playExplosion' },
                    { type: 'g2d:shake', ctxVar: 'ctx', intensity: 8 },
                    {
                      type: 'g2d:damageSprite',
                      spriteVar: 'nave',
                      amount: 1,
                      invincibilityFrames: 45,
                    },
                  ],
                },
                {
                  type: 'g2d:pruneOffscreen',
                  groupVar: 'asteroides',
                  ctxVar: 'ctx',
                  itemName: 'a',
                  body: [{ type: 'g2d:changeHealth', spriteVar: 'nave', delta: -1 }],
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Pontos:',
                  value: { type: 'var', name: 'pontos' },
                  x: 12,
                  y: 26,
                  color: '#ffffff',
                  size: 22,
                },
                {
                  type: 'g2d:drawSpriteHealth',
                  ctxVar: 'ctx',
                  spriteVar: 'nave',
                  style: 'hearts',
                  x: 12,
                  y: 40,
                  size: 16,
                  color: '#ff5d5d',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: { type: 'var', name: 'pontos' },
                    right: { type: 'num', value: 25 },
                  },
                  then: [{ type: 'g2d:setScene', name: 'ganhou' }],
                },
                {
                  type: 'if',
                  cond: { type: 'g2d:healthDepleted', spriteVar: 'nave' },
                  then: [{ type: 'g2d:setScene', name: 'perdeu' }],
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'ganhou' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'Você venceu!',
                  subtitle: 'Missão cumprida: a galáxia está segura!',
                  hint: 'Aperte Enter para jogar de novo',
                  bg: '#063018',
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'perdeu' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'Fim de jogo',
                  subtitle: 'Os asteroides passaram pela defesa!',
                  hint: 'Aperte Enter para tentar de novo',
                  bg: '#300a0a',
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

/**
 * Exemplo bundlado: "Dino Run" (Kit dino, v0.9.0). Jogo de corrida: o dinossauro
 * corre, pula os obstáculos do chão (cacto/pedra), abaixa do pássaro, pega ovos
 * de bônus e tem vidas, pontos e RECORDE que persiste (localStorage). Telas de
 * início e fim. Mostra o Kit dino + pulo no chão + grupos + HUD + cenas juntos.
 */
export const dinoRunExample: ExtensionExample = beginnerGameExample({
  name: 'Dino Run',
  experience: 'game',
  description:
    'Jogo de corrida: pule os obstáculos (cacto/pedra), abaixe do pássaro e pegue os ovos de bônus. Tem vidas, pontos e recorde que continua salvo. Pule com ↑/Espaço/toque; abaixe com ↓; Enter começa.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 270 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#bdf4ff',
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
          background: '#bdf4ff',
        },
      },
    ],
    version: 2,
    behavior: {
      start: [
        // --- Setup (no começo: o "a cada quadro" enxerga estas variáveis) ---
        { type: 'g2d:fitScreen', percent: 100 },
        { type: 'g2d:createDino', varName: 'dino', x: 120, y: 150, size: 64, color: '#5fb45f' },
        { type: 'g2d:setHealth', spriteVar: 'dino', amount: 3 },
        { type: 'g2d:createGroup', varName: 'obstaculos' },
        { type: 'g2d:createGroup', varName: 'ovos' },
        { type: 'var', name: 'pontos', value: { type: 'num', value: 0 } },
        // recorde salvo no navegador (Math.floor transforma o texto/null em número).
        {
          type: 'var',
          name: 'recorde',
          value: {
            type: 'mathUnary',
            fn: 'floor',
            arg: { type: 'storageGet', store: 'local', key: { type: 'str', value: 'dinoRecorde' } },
          },
        },
        { type: 'g2d:setScene', name: 'inicio' },
      ],
      events: [
        // --- Enter: começar / reiniciar ---
        {
          type: 'g2d:onKey',
          key: 'Enter',
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'inicio' },
              then: [{ type: 'g2d:setScene', name: 'jogando' }],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'perdeu' },
              then: [{ type: 'g2d:restart' }],
            },
          ],
        },
      ],
      loops: [
        // --- Enquanto estiver rodando: limpa, desenha a floresta e despacha por cena ---
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            { type: 'g2d:forest', ctxVar: 'ctx', speed: 5 },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'inicio' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'Dino Run',
                  subtitle: 'Pule os obstáculos, abaixe do pássaro e pegue os ovos!',
                  hint: 'Aperte Enter para começar',
                  bg: '#185078',
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'jogando' },
              then: [
                { type: 'g2d:controlDino', spriteVar: 'dino', ctxVar: 'ctx', jump: 15 },
                { type: 'g2d:drawSprite', spriteVar: 'dino', ctxVar: 'ctx' },
                // a cada 1,3s nasce um obstáculo aleatório na borda direita
                {
                  type: 'g2d:everySeconds',
                  seconds: 1.3,
                  body: [
                    {
                      type: 'g2d:spawnObstacle',
                      groupVar: 'obstaculos',
                      ctxVar: 'ctx',
                      shape: 'random',
                      x: { type: 'num', value: 500 },
                      size: 44,
                      vx: { type: 'num', value: -6 },
                    },
                  ],
                },
                // a cada 4s nasce um ovo de bônus (no alto: precisa pular)
                {
                  type: 'g2d:everySeconds',
                  seconds: 4,
                  body: [
                    {
                      type: 'g2d:spawnEgg',
                      groupVar: 'ovos',
                      x: { type: 'num', value: 500 },
                      y: { type: 'num', value: 115 },
                      vx: { type: 'num', value: -6 },
                    },
                  ],
                },
                { type: 'g2d:updateGroup', groupVar: 'obstaculos' },
                { type: 'g2d:updateGroup', groupVar: 'ovos' },
                { type: 'g2d:drawGroup', groupVar: 'obstaculos', ctxVar: 'ctx' },
                { type: 'g2d:drawGroup', groupVar: 'ovos', ctxVar: 'ctx' },
                // bateu num obstáculo: perde vida + pisca + tremor
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'dino',
                  groupVar: 'obstaculos',
                  itemName: 'obs',
                  body: [
                    { type: 'g2d:removeFromGroup', spriteVar: 'obs', groupVar: 'obstaculos' },
                    { type: 'g2d:explode', spriteVar: 'obs', color: '#ff5d3d' },
                    { type: 'g2d:playDinoHurt' },
                    { type: 'g2d:shake', ctxVar: 'ctx', intensity: 8 },
                    {
                      type: 'g2d:damageSprite',
                      spriteVar: 'dino',
                      amount: 1,
                      invincibilityFrames: 80,
                    },
                  ],
                },
                // pegou um ovo: ganha pontos de bônus
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'dino',
                  groupVar: 'ovos',
                  itemName: 'ovo',
                  body: [
                    { type: 'g2d:removeFromGroup', spriteVar: 'ovo', groupVar: 'ovos' },
                    { type: 'g2d:explode', spriteVar: 'ovo', color: '#ffd54a' },
                    { type: 'g2d:playCollect' },
                    {
                      type: 'assign',
                      name: 'pontos',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: { type: 'var', name: 'pontos' },
                        right: { type: 'num', value: 10 },
                      },
                    },
                  ],
                },
                // tira da tela quem já passou (o dino escapou: sem punição)
                {
                  type: 'g2d:pruneOffscreen',
                  groupVar: 'obstaculos',
                  ctxVar: 'ctx',
                  itemName: 'a',
                  body: [],
                },
                {
                  type: 'g2d:pruneOffscreen',
                  groupVar: 'ovos',
                  ctxVar: 'ctx',
                  itemName: 'b',
                  body: [],
                },
                // pontos sobem com o tempo (a cada 6 quadros, +1)
                {
                  type: 'g2d:everyFrames',
                  n: { type: 'num', value: 6 },
                  body: [
                    {
                      type: 'assign',
                      name: 'pontos',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: { type: 'var', name: 'pontos' },
                        right: { type: 'num', value: 1 },
                      },
                    },
                  ],
                },
                // HUD: pontos, recorde e vidas
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Pontos:',
                  value: { type: 'var', name: 'pontos' },
                  x: 12,
                  y: 28,
                  color: '#20415c',
                  size: 22,
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Recorde:',
                  value: { type: 'var', name: 'recorde' },
                  x: 12,
                  y: 52,
                  color: '#20415c',
                  size: 16,
                },
                {
                  type: 'g2d:drawSpriteHealth',
                  ctxVar: 'ctx',
                  spriteVar: 'dino',
                  style: 'hearts',
                  x: 372,
                  y: 22,
                  size: 16,
                  color: '#ff4f7a',
                },
                // acabaram as vidas: salva o recorde e vai pra tela de fim
                {
                  type: 'if',
                  cond: { type: 'g2d:healthDepleted', spriteVar: 'dino' },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '>',
                        left: { type: 'var', name: 'pontos' },
                        right: { type: 'var', name: 'recorde' },
                      },
                      then: [
                        { type: 'assign', name: 'recorde', value: { type: 'var', name: 'pontos' } },
                        {
                          type: 'storageSet',
                          store: 'local',
                          key: { type: 'str', value: 'dinoRecorde' },
                          value: { type: 'var', name: 'pontos' },
                        },
                      ],
                    },
                    { type: 'g2d:setScene', name: 'perdeu' },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'perdeu' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'Fim de jogo',
                  subtitle: 'Você tropeçou! Tente bater o seu recorde.',
                  hint: 'Aperte Enter para jogar de novo',
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

/**
 * Exemplo "Guerra de Gorilas" (v0.11.0): dois gorilas no alto dos prédios jogam
 * bananas um no outro. Arraste a partir do gorila da vez para mirar (mais longe =
 * mais forte) e SOLTE para lançar; o vento e a gravidade entortam a parábola e a
 * banana abre crateras. Acertar o gorila inimigo vence; errar passa a vez (e
 * sorteia um novo vento). 2 jogadores no mesmo aparelho. Mostra o Kit gorilas.
 */
export const gorilasExample: ExtensionExample = beginnerGameExample({
  name: 'Guerra de Gorilas',
  experience: 'game',
  description:
    'Dois gorilas no alto dos prédios jogam bananas um no outro. Arraste a partir do gorila da vez para mirar (mais longe = mais forte) e solte para lançar; o vento e a gravidade entortam a parábola e a banana abre crateras nos prédios. Acertar o inimigo vence; errar passa a vez. 2 jogadores. Enter começa.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 270 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#10162e',
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
          background: '#10162e',
          cursor: 'crosshair',
        },
      },
    ],
    version: 2,
    behavior: {
      start: [
        // --- Setup (no começo: o "a cada quadro" enxerga estas variáveis) ---
        { type: 'g2d:fitScreen', percent: 100 },
        { type: 'g2d:createCity', varName: 'cidade' },
        {
          type: 'g2d:placeThrower',
          varName: 'gorila1',
          cityVar: 'cidade',
          side: 'left',
          color: '#6b4a2b',
        },
        {
          type: 'g2d:placeThrower',
          varName: 'gorila2',
          cityVar: 'cidade',
          side: 'right',
          color: '#7b5e3b',
        },
        { type: 'var', name: 'vez', value: { type: 'num', value: 0 } },
        { type: 'g2d:newWind', cityVar: 'cidade' },
        { type: 'g2d:setScene', name: 'inicio' },
      ],
      events: [
        // --- Enter: começar / reiniciar ---
        {
          type: 'g2d:onKey',
          key: 'Enter',
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'inicio' },
              then: [{ type: 'g2d:setScene', name: 'jogando' }],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'ganhou1' },
              then: [{ type: 'g2d:restart' }],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'ganhou2' },
              then: [{ type: 'g2d:restart' }],
            },
          ],
        },
      ],
      loops: [
        // --- Enquanto estiver rodando: limpa, desenha a cidade e despacha por cena ---
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            { type: 'g2d:drawCity', cityVar: 'cidade', ctxVar: 'ctx' },
            // tela de início
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'inicio' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'Guerra de Gorilas',
                  subtitle:
                    'Arraste a partir do gorila da vez para mirar e solte para jogar a banana. 2 jogadores!',
                  hint: 'Aperte Enter para começar',
                  bg: '#1b2a4a',
                },
              ],
            },
            // jogando
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'jogando' },
              then: [
                { type: 'g2d:drawWind', cityVar: 'cidade', ctxVar: 'ctx' },
                { type: 'g2d:drawSprite', spriteVar: 'gorila1', ctxVar: 'ctx' },
                { type: 'g2d:drawSprite', spriteVar: 'gorila2', ctxVar: 'ctx' },
                // vez do jogador 1 (esquerda): mira e lança
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: { type: 'var', name: 'vez' },
                    right: { type: 'num', value: 0 },
                  },
                  then: [
                    { type: 'g2d:aimDrag', throwerVar: 'gorila1', ctxVar: 'ctx' },
                    {
                      type: 'if',
                      cond: { type: 'g2d:aimReleased', throwerVar: 'gorila1' },
                      then: [
                        { type: 'g2d:throwBanana', throwerVar: 'gorila1', cityVar: 'cidade' },
                        { type: 'g2d:playWhistle' },
                      ],
                    },
                  ],
                },
                // vez do jogador 2 (direita): mira e lança
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: { type: 'var', name: 'vez' },
                    right: { type: 'num', value: 1 },
                  },
                  then: [
                    { type: 'g2d:aimDrag', throwerVar: 'gorila2', ctxVar: 'ctx' },
                    {
                      type: 'if',
                      cond: { type: 'g2d:aimReleased', throwerVar: 'gorila2' },
                      then: [
                        { type: 'g2d:throwBanana', throwerVar: 'gorila2', cityVar: 'cidade' },
                        { type: 'g2d:playWhistle' },
                      ],
                    },
                  ],
                },
                // a banana voa (gravidade + vento) e aparece
                { type: 'g2d:updateBanana', cityVar: 'cidade' },
                { type: 'g2d:drawBanana', cityVar: 'cidade', ctxVar: 'ctx' },
                // a banana do jogador 1 acertou o gorila 2? (vitória)
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: { type: 'var', name: 'vez' },
                    right: { type: 'num', value: 0 },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'g2d:bananaHitThrower',
                        cityVar: 'cidade',
                        throwerVar: 'gorila2',
                      },
                      then: [
                        { type: 'g2d:explode', spriteVar: 'gorila2', color: '#ffd23f' },
                        { type: 'g2d:playBoom' },
                        { type: 'g2d:shake', ctxVar: 'ctx', intensity: 10 },
                        { type: 'g2d:setScene', name: 'ganhou1' },
                      ],
                    },
                  ],
                },
                // a banana do jogador 2 acertou o gorila 1? (vitória)
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: { type: 'var', name: 'vez' },
                    right: { type: 'num', value: 1 },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'g2d:bananaHitThrower',
                        cityVar: 'cidade',
                        throwerVar: 'gorila1',
                      },
                      then: [
                        { type: 'g2d:explode', spriteVar: 'gorila1', color: '#ffd23f' },
                        { type: 'g2d:playBoom' },
                        { type: 'g2d:shake', ctxVar: 'ctx', intensity: 10 },
                        { type: 'g2d:setScene', name: 'ganhou2' },
                      ],
                    },
                  ],
                },
                // errou (bateu num prédio ou saiu da tela): troca de turno + novo vento
                {
                  type: 'if',
                  cond: { type: 'g2d:bananaHitCity', cityVar: 'cidade' },
                  then: [
                    { type: 'g2d:playBoom' },
                    { type: 'g2d:shake', ctxVar: 'ctx', intensity: 5 },
                    {
                      type: 'assign',
                      name: 'vez',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: { type: 'num', value: 1 },
                        right: { type: 'var', name: 'vez' },
                      },
                    },
                    { type: 'g2d:newWind', cityVar: 'cidade' },
                  ],
                },
                // HUD: de quem é a vez (vez + 1)
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Jogador da vez:',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: { type: 'var', name: 'vez' },
                    right: { type: 'num', value: 1 },
                  },
                  x: 12,
                  y: 26,
                  color: '#ffffff',
                  size: 18,
                },
              ],
            },
            // vitória do jogador 1
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'ganhou1' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'Jogador 1 venceu!',
                  subtitle: 'Mira certeira!',
                  hint: 'Aperte Enter para jogar de novo',
                  bg: '#143a1f',
                },
              ],
            },
            // vitória do jogador 2
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'ganhou2' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'Jogador 2 venceu!',
                  subtitle: 'Mira certeira!',
                  hint: 'Aperte Enter para jogar de novo',
                  bg: '#143a1f',
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

/**
 * Exemplo "Guerra de Gorilas vs Robô" (v0.12.0): igual ao "Guerra de Gorilas",
 * mas o jogador 2 é o COMPUTADOR (IA). Você arrasta para mirar; o robô mira
 * sozinho (simula vários lançamentos e escolhe o melhor) e joga. Mostra o bloco
 * do robô + a leitura de ângulo/força. (Autoplay = trocar também o seu ramo por
 * "O robô do gorila 1 …".)
 */
export const gorilasVsRobotExample: ExtensionExample = beginnerGameExample({
  name: 'Guerra de Gorilas vs Robô',
  experience: 'game',
  description:
    'Jogue contra o COMPUTADOR: você arrasta para mirar e o robô mira e joga sozinho (simula lançamentos e escolhe o melhor). Vento e gravidade entortam a banana; acertar o inimigo vence. Enter começa.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 270 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#10162e',
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
          background: '#10162e',
          cursor: 'crosshair',
        },
      },
    ],
    version: 2,
    behavior: {
      start: [
        { type: 'g2d:fitScreen', percent: 100 },
        { type: 'g2d:createCity', varName: 'cidade' },
        {
          type: 'g2d:placeThrower',
          varName: 'gorila1',
          cityVar: 'cidade',
          side: 'left',
          color: '#6b4a2b',
        },
        {
          type: 'g2d:placeThrower',
          varName: 'gorila2',
          cityVar: 'cidade',
          side: 'right',
          color: '#7b5e3b',
        },
        { type: 'var', name: 'vez', value: { type: 'num', value: 0 } },
        { type: 'g2d:newWind', cityVar: 'cidade' },
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
              then: [{ type: 'g2d:setScene', name: 'jogando' }],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'ganhou1' },
              then: [{ type: 'g2d:restart' }],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'ganhou2' },
              then: [{ type: 'g2d:restart' }],
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            { type: 'g2d:drawCity', cityVar: 'cidade', ctxVar: 'ctx' },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'inicio' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'Guerra de Gorilas vs Robô',
                  subtitle: 'Você é o gorila da esquerda. Arraste para mirar e solte para jogar!',
                  hint: 'Aperte Enter para começar',
                  bg: '#1b2a4a',
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'jogando' },
              then: [
                { type: 'g2d:drawWind', cityVar: 'cidade', ctxVar: 'ctx' },
                { type: 'g2d:drawSprite', spriteVar: 'gorila1', ctxVar: 'ctx' },
                { type: 'g2d:drawSprite', spriteVar: 'gorila2', ctxVar: 'ctx' },
                // vez do jogador 1 (você): mira arrastando e lança
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: { type: 'var', name: 'vez' },
                    right: { type: 'num', value: 0 },
                  },
                  then: [
                    { type: 'g2d:aimDrag', throwerVar: 'gorila1', ctxVar: 'ctx' },
                    {
                      type: 'if',
                      cond: { type: 'g2d:aimReleased', throwerVar: 'gorila1' },
                      then: [
                        { type: 'g2d:throwBanana', throwerVar: 'gorila1', cityVar: 'cidade' },
                        { type: 'g2d:playWhistle' },
                      ],
                    },
                  ],
                },
                // vez do jogador 2: o ROBÔ joga sozinho mirando no gorila 1
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: { type: 'var', name: 'vez' },
                    right: { type: 'num', value: 1 },
                  },
                  then: [
                    {
                      type: 'g2d:computerTurn',
                      throwerVar: 'gorila2',
                      cityVar: 'cidade',
                      enemyVar: 'gorila1',
                    },
                  ],
                },
                { type: 'g2d:updateBanana', cityVar: 'cidade' },
                { type: 'g2d:drawBanana', cityVar: 'cidade', ctxVar: 'ctx' },
                { type: 'g2d:drawAimReadout', ctxVar: 'ctx' },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: { type: 'var', name: 'vez' },
                    right: { type: 'num', value: 0 },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'g2d:bananaHitThrower',
                        cityVar: 'cidade',
                        throwerVar: 'gorila2',
                      },
                      then: [
                        { type: 'g2d:explode', spriteVar: 'gorila2', color: '#ffd23f' },
                        { type: 'g2d:playBoom' },
                        { type: 'g2d:shake', ctxVar: 'ctx', intensity: 10 },
                        { type: 'g2d:setScene', name: 'ganhou1' },
                      ],
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '==',
                    left: { type: 'var', name: 'vez' },
                    right: { type: 'num', value: 1 },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'g2d:bananaHitThrower',
                        cityVar: 'cidade',
                        throwerVar: 'gorila1',
                      },
                      then: [
                        { type: 'g2d:explode', spriteVar: 'gorila1', color: '#ffd23f' },
                        { type: 'g2d:playBoom' },
                        { type: 'g2d:shake', ctxVar: 'ctx', intensity: 10 },
                        { type: 'g2d:setScene', name: 'ganhou2' },
                      ],
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: { type: 'g2d:bananaHitCity', cityVar: 'cidade' },
                  then: [
                    { type: 'g2d:playBoom' },
                    { type: 'g2d:shake', ctxVar: 'ctx', intensity: 5 },
                    {
                      type: 'assign',
                      name: 'vez',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: { type: 'num', value: 1 },
                        right: { type: 'var', name: 'vez' },
                      },
                    },
                    { type: 'g2d:newWind', cityVar: 'cidade' },
                  ],
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Vez:',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: { type: 'var', name: 'vez' },
                    right: { type: 'num', value: 1 },
                  },
                  x: 12,
                  y: 26,
                  color: '#ffffff',
                  size: 18,
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'ganhou1' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'Você venceu!',
                  subtitle: 'Mira certeira contra o robô!',
                  hint: 'Aperte Enter para jogar de novo',
                  bg: '#143a1f',
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'ganhou2' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'O robô venceu!',
                  subtitle: 'Tente de novo!',
                  hint: 'Aperte Enter para jogar de novo',
                  bg: '#3a1414',
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

/**
 * Exemplo "Asteroides clássico" (v0.10.0): a nave GIRA com as setas ← → (ou A/D),
 * IMPULSIONA na direção apontada com ↑ (ou W) e desliza com atrito; atira PARA A
 * FRENTE com Espaço; asteroides nascem das bordas rumo ao centro. Colisão de tiro
 * destrói o asteroide (+1); a nave encostando num asteroide é fim de jogo. Mostra
 * os blocos novos de nave clássica (girar/impulsionar/atirar-pra-frente/borda).
 */
export const asteroidsClassicExample: ExtensionExample = beginnerGameExample({
  name: 'Asteroides clássico',
  experience: 'game',
  description:
    'Pilote a nave girando e impulsionando como no Asteroids clássico: ← → giram, ↑ acelera na direção apontada, Espaço atira pra frente. Desvie e atire nos asteroides que vêm das bordas. Enter começa.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 400, height: 320 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#020611',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
      {
        selector: 'canvas',
        declarations: { border: '2px solid #35e8ff', background: '#06101f' },
      },
    ],
    version: 2,
    behavior: {
      start: [
        // --- Setup (no começo: assim o "a cada quadro" enxerga estas variáveis) ---
        { type: 'g2d:fitScreen', percent: 100 },
        {
          type: 'g2d:createShip',
          varName: 'nave',
          x: 180,
          y: 150,
          w: 54,
          h: 62,
          bodyColor: '#35e8ff',
          wingColor: '#2568ff',
        },
        { type: 'g2d:createGroup', varName: 'tiros' },
        { type: 'g2d:createGroup', varName: 'asteroides' },
        { type: 'var', name: 'pontos', value: { type: 'num', value: 0 } },
        { type: 'g2d:setScene', name: 'inicio' },
      ],
      events: [
        // --- Enter: começar / reiniciar ---
        {
          type: 'g2d:onKey',
          key: 'Enter',
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'inicio' },
              then: [{ type: 'g2d:setScene', name: 'jogando' }],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'perdeu' },
              then: [{ type: 'g2d:restart' }],
            },
          ],
        },
        // --- Espaço: atirar PARA A FRENTE (só quando está jogando) ---
        {
          type: 'g2d:onKey',
          key: 'Space',
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'jogando' },
              then: [
                {
                  type: 'g2d:shootFrom',
                  spriteVar: 'nave',
                  groupVar: 'tiros',
                  speed: 6,
                  color: '#9cff57',
                },
                { type: 'g2d:playShoot' },
              ],
            },
          ],
        },
      ],
      loops: [
        // --- Enquanto estiver rodando: limpa, desenha o fundo e despacha por cena ---
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            { type: 'g2d:starfield', ctxVar: 'ctx', speed: 1 },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'inicio' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'Asteroides clássico',
                  subtitle: 'Gire com ← →, acelere com ↑ e atire com Espaço!',
                  hint: 'Aperte Enter para começar',
                  bg: '#02111f',
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'jogando' },
              then: [
                { type: 'g2d:steerThrust', spriteVar: 'nave', speed: 3, turn: 4 },
                { type: 'g2d:clampToScreen', spriteVar: 'nave', ctxVar: 'ctx' },
                { type: 'g2d:drawSprite', spriteVar: 'nave', ctxVar: 'ctx' },
                {
                  type: 'g2d:everySeconds',
                  seconds: 3,
                  body: [
                    {
                      type: 'g2d:spawnAsteroidEdge',
                      groupVar: 'asteroides',
                      size: 40,
                      color: '#8d8f9b',
                      speed: 1.5,
                    },
                  ],
                },
                { type: 'g2d:updateGroup', groupVar: 'tiros' },
                { type: 'g2d:updateGroup', groupVar: 'asteroides' },
                { type: 'g2d:drawGroup', groupVar: 'tiros', ctxVar: 'ctx' },
                { type: 'g2d:drawGroup', groupVar: 'asteroides', ctxVar: 'ctx' },
                {
                  type: 'g2d:onGroupOverlap',
                  aGroup: 'tiros',
                  aName: 'tiro',
                  bGroup: 'asteroides',
                  bName: 'asteroide',
                  body: [
                    { type: 'g2d:removeFromGroup', spriteVar: 'tiro', groupVar: 'tiros' },
                    { type: 'g2d:removeFromGroup', spriteVar: 'asteroide', groupVar: 'asteroides' },
                    {
                      type: 'assign',
                      name: 'pontos',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: { type: 'var', name: 'pontos' },
                        right: { type: 'num', value: 1 },
                      },
                    },
                    { type: 'g2d:explode', spriteVar: 'asteroide', color: '#ffb13b' },
                    { type: 'g2d:playExplosion' },
                    { type: 'g2d:shake', ctxVar: 'ctx', intensity: 5 },
                  ],
                },
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'nave',
                  groupVar: 'asteroides',
                  itemName: 'asteroide',
                  body: [
                    { type: 'g2d:explode', spriteVar: 'nave', color: '#ff5d3d' },
                    { type: 'g2d:playExplosion' },
                    { type: 'g2d:shake', ctxVar: 'ctx', intensity: 10 },
                    { type: 'g2d:setScene', name: 'perdeu' },
                  ],
                },
                {
                  type: 'g2d:pruneOffscreen',
                  groupVar: 'tiros',
                  ctxVar: 'ctx',
                  itemName: 't',
                  body: [],
                },
                {
                  type: 'g2d:pruneOffscreen',
                  groupVar: 'asteroides',
                  ctxVar: 'ctx',
                  itemName: 'a',
                  body: [],
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Pontos:',
                  value: { type: 'var', name: 'pontos' },
                  x: 12,
                  y: 26,
                  color: '#ffffff',
                  size: 22,
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'perdeu' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'Fim de jogo',
                  subtitle: 'A nave foi atingida por um asteroide!',
                  hint: 'Aperte Enter para tentar de novo',
                  bg: '#300a0a',
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

/**
 * Exemplo bundlado: "Equilibrista" (estilo Stick Hero), montado com os blocos
 * DECOMPOSTOS do kit (v0.40.0): a criança vê e customiza cada passo do loop —
 * cenário, esticar o bastão, andar/cair e desenhar — além das cores na criação
 * e dos eventos de atravessar/acerto perfeito.
 */
export const stickHeroExample: ExtensionExample = beginnerGameExample({
  name: 'Equilibrista',
  experience: 'game',
  description:
    'Estica o bastão segurando o mouse/dedo e atravessa as plataformas (estilo Stick Hero). O loop do jogo é montado passo a passo: cenário, esticar, andar e desenhar.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 360, height: 480 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#dff0d0',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
          cursor: 'pointer',
        },
      },
      {
        selector: 'canvas',
        declarations: { border: '2px solid #1b2330', 'border-radius': '12px' },
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g2d:stickHeroCreate',
          varName: 'jogo',
          ctxVar: 'ctx',
          heroColor: '#d6455d',
          stickColor: '#1b2330',
          platformColor: '#0ea5a0',
        },
      ],
      events: [
        // --- Atravessou: um som curto comemora o passo ---
        {
          type: 'g2d:onStickHeroCross',
          gameVar: 'jogo',
          body: [{ type: 'g2d:playJump' }],
        },
        // --- Acertou bem no meio: som de moeda + brilho na tela ---
        {
          type: 'g2d:onStickHeroPerfect',
          gameVar: 'jogo',
          body: [
            { type: 'g2d:playCollect' },
            { type: 'g2d:flash', ctxVar: 'ctx', color: '#ffe066' },
          ],
        },
        // --- Enter: recomeçar depois de cair ---
        {
          type: 'g2d:onKey',
          key: 'Enter',
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:stickHeroOver', gameVar: 'jogo' },
              then: [{ type: 'g2d:restartStickHero', gameVar: 'jogo' }],
            },
          ],
        },
      ],
      loops: [
        // --- O loop montado na mão: cenário → esticar → andar → desenhar → HUD ---
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            { type: 'g2d:stickHeroScenery', gameVar: 'jogo' },
            { type: 'g2d:stickHeroHold', gameVar: 'jogo', speed: 1 },
            { type: 'g2d:stickHeroStep', gameVar: 'jogo', speed: 1 },
            { type: 'g2d:stickHeroDraw', gameVar: 'jogo' },
            {
              type: 'g2d:drawScore',
              ctxVar: 'ctx',
              label: 'Pontos:',
              value: { type: 'g2d:stickHeroScore', gameVar: 'jogo' },
              x: 12,
              y: 26,
              color: '#1b2330',
              size: 22,
            },
            {
              type: 'if',
              cond: { type: 'g2d:stickHeroOver', gameVar: 'jogo' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'Caiu!',
                  subtitle: 'O bastão não alcançou a plataforma.',
                  hint: 'Aperte Enter para jogar de novo',
                  bg: '#1b2330',
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

/**
 * Exemplo bundlado: "Balão" (estilo Hot-Air-Balloon), montado com os blocos
 * DECOMPOSTOS do kit (v0.40.0): cenário, subir/cair, avançar o caminho e
 * desenhar são blocos separados; a batida na árvore vira evento com explosão.
 */
export const balloonExample: ExtensionExample = beginnerGameExample({
  name: 'Balão',
  experience: 'game',
  description:
    'Suba segurando o mouse/dedo, economize combustível e desvie das árvores. O loop do jogo é montado passo a passo: cenário, subir, avançar e desenhar.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 560, height: 360 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#cfe8f0',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
          cursor: 'pointer',
        },
      },
      {
        selector: 'canvas',
        declarations: { border: '2px solid #1b2330', 'border-radius': '12px' },
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g2d:balloonCreate',
          varName: 'jogo',
          ctxVar: 'ctx',
          color: '#7c3aed',
          basketColor: '#8a5a2b',
        },
      ],
      events: [
        // --- Bateu numa árvore: explosão, tremida e som de "bum" ---
        {
          type: 'g2d:onBalloonTreeHit',
          gameVar: 'jogo',
          body: [
            { type: 'g2d:emitParticles', x: 130, y: 170, count: 18, color: '#ff8c42' },
            { type: 'g2d:shake', ctxVar: 'ctx', intensity: 8 },
            { type: 'g2d:playBoom' },
          ],
        },
        // --- Enter: recomeçar depois de bater ou pousar sem combustível ---
        {
          type: 'g2d:onKey',
          key: 'Enter',
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:balloonOver', gameVar: 'jogo' },
              then: [{ type: 'g2d:restartBalloon', gameVar: 'jogo' }],
            },
          ],
        },
      ],
      loops: [
        // --- O loop montado na mão: cenário → subir → avançar → desenhar → HUD ---
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            { type: 'g2d:balloonScenery', gameVar: 'jogo' },
            { type: 'g2d:balloonLift', gameVar: 'jogo', force: 1 },
            { type: 'g2d:balloonScroll', gameVar: 'jogo', speed: 1 },
            { type: 'g2d:balloonDraw', gameVar: 'jogo' },
            {
              type: 'g2d:drawScore',
              ctxVar: 'ctx',
              label: 'Metros:',
              value: { type: 'g2d:balloonScore', gameVar: 'jogo' },
              x: 12,
              y: 26,
              color: '#1b2330',
              size: 22,
            },
            {
              type: 'g2d:drawLabel',
              ctxVar: 'ctx',
              text: 'Combustível',
              x: 12,
              y: 46,
              color: '#1b2330',
              size: 13,
              align: 'left',
            },
            {
              type: 'g2d:drawBar',
              ctxVar: 'ctx',
              value: { type: 'g2d:balloonFuel', gameVar: 'jogo' },
              max: { type: 'num', value: 100 },
              x: 12,
              y: 52,
              w: 160,
              h: 12,
              color: '#ff8c42',
            },
            {
              type: 'if',
              cond: { type: 'g2d:balloonOver', gameVar: 'jogo' },
              then: [
                {
                  type: 'g2d:showScreen',
                  ctxVar: 'ctx',
                  title: 'Fim do voo!',
                  subtitle: 'O balão bateu ou ficou sem combustível.',
                  hint: 'Aperte Enter para voar de novo',
                  bg: '#1b2330',
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
