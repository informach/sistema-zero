import type { ExtensionExample } from '#extensions'
import { beginnerGameExample, EXAMPLE_HOUSE_IMAGE, EXAMPLE_TREE_IMAGE } from './shared'

/**
 * Exemplo "Aventura com câmera" (v0.16.0): vitrine dos blocos novos — a câmera
 * segue o herói por um mundo MAIOR que a tela (1600 de largura), ele pega moedas
 * (grupo) com efeito sonoro, toca música de fundo e mostra instruções + placar
 * fixos na tela (o HUD não rola com a câmera). Montado SÓ com blocos.
 */
export const cameraAdventureExample: ExtensionExample = beginnerGameExample({
  name: 'Aventura com câmera',
  experience: 'exploration',
  description:
    'Explore um caminho com casas e árvores; a câmera segue o herói enquanto ele coleta 4 moedas.',
  assets: [
    {
      id: 'example-camera-house',
      name: 'casa-aventura',
      kind: 'image',
      dataUrl: EXAMPLE_HOUSE_IMAGE,
      width: 110,
      height: 86,
      source: 'library',
      libId: 'example-camera-house',
    },
    {
      id: 'example-camera-tree',
      name: 'arvore-aventura',
      kind: 'image',
      dataUrl: EXAMPLE_TREE_IMAGE,
      width: 54,
      height: 70,
      source: 'library',
      libId: 'example-camera-tree',
    },
  ],
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 320 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0b1020',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
      {
        selector: 'canvas',
        declarations: { border: '2px solid #4ade80', background: '#11172a' },
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g2d:createSprite',
          varName: 'heroi',
          x: 40,
          y: 284,
          w: 36,
          h: 36,
          color: '#4ade80',
        },
        { type: 'g2d:createGroup', varName: 'paisagem' },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'paisagem',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 304 },
          w: 1600,
          h: 16,
          color: '#334155',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnImageInGroup',
          groupVar: 'paisagem',
          x: { type: 'num', value: 150 },
          y: { type: 'num', value: 230 },
          w: 90,
          h: 74,
          image: 'casa-aventura',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnImageInGroup',
          groupVar: 'paisagem',
          x: { type: 'num', value: 500 },
          y: { type: 'num', value: 244 },
          w: 42,
          h: 60,
          image: 'arvore-aventura',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'paisagem',
          x: { type: 'num', value: 760 },
          y: { type: 'num', value: 260 },
          w: 180,
          h: 18,
          color: '#38bdf8',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnImageInGroup',
          groupVar: 'paisagem',
          x: { type: 'num', value: 1080 },
          y: { type: 'num', value: 218 },
          w: 110,
          h: 86,
          image: 'casa-aventura',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnImageInGroup',
          groupVar: 'paisagem',
          x: { type: 'num', value: 1420 },
          y: { type: 'num', value: 234 },
          w: 54,
          h: 70,
          image: 'arvore-aventura',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        { type: 'g2d:createGroup', varName: 'moedas' },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'moedas',
          x: { type: 'num', value: 320 },
          y: { type: 'num', value: 270 },
          w: 18,
          h: 18,
          color: '#fbbf24',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'moedas',
          x: { type: 'num', value: 640 },
          y: { type: 'num', value: 210 },
          w: 18,
          h: 18,
          color: '#fbbf24',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'moedas',
          x: { type: 'num', value: 980 },
          y: { type: 'num', value: 270 },
          w: 18,
          h: 18,
          color: '#fbbf24',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'moedas',
          x: { type: 'num', value: 1320 },
          y: { type: 'num', value: 200 },
          w: 18,
          h: 18,
          color: '#fbbf24',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        { type: 'var', name: 'pontos', value: { type: 'num', value: 0 } },
        { type: 'g2d:playMusic', tune: 'adventure' },
      ],
      events: [],
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            { type: 'g2d:topDown', spriteVar: 'heroi', speed: 5 },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<',
                left: { type: 'memberGet', object: { type: 'var', name: 'heroi' }, name: 'x' },
                right: { type: 'num', value: 0 },
              },
              then: [
                {
                  type: 'memberSet',
                  object: { type: 'var', name: 'heroi' },
                  name: 'x',
                  value: { type: 'num', value: 0 },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>',
                left: { type: 'memberGet', object: { type: 'var', name: 'heroi' }, name: 'x' },
                right: { type: 'num', value: 1564 },
              },
              then: [
                {
                  type: 'memberSet',
                  object: { type: 'var', name: 'heroi' },
                  name: 'x',
                  value: { type: 'num', value: 1564 },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '<',
                left: { type: 'memberGet', object: { type: 'var', name: 'heroi' }, name: 'y' },
                right: { type: 'num', value: 72 },
              },
              then: [
                {
                  type: 'memberSet',
                  object: { type: 'var', name: 'heroi' },
                  name: 'y',
                  value: { type: 'num', value: 72 },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>',
                left: { type: 'memberGet', object: { type: 'var', name: 'heroi' }, name: 'y' },
                right: { type: 'num', value: 268 },
              },
              then: [
                {
                  type: 'memberSet',
                  object: { type: 'var', name: 'heroi' },
                  name: 'y',
                  value: { type: 'num', value: 268 },
                },
              ],
            },
            { type: 'g2d:cameraFollow', spriteVar: 'heroi', worldW: 1600, worldH: 320 },
            {
              type: 'g2d:onSpriteGroupOverlap',
              spriteVar: 'heroi',
              groupVar: 'moedas',
              itemName: 'moeda',
              body: [
                { type: 'g2d:removeFromGroup', spriteVar: 'moeda', groupVar: 'moedas' },
                { type: 'g2d:playFx', fx: 'coin' },
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
            { type: 'g2d:drawGroup', groupVar: 'paisagem', ctxVar: 'ctx' },
            { type: 'g2d:drawGroup', groupVar: 'moedas', ctxVar: 'ctx' },
            { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
            {
              type: 'g2d:drawScore',
              ctxVar: 'ctx',
              label: 'Moedas:',
              value: { type: 'var', name: 'pontos' },
              x: 12,
              y: 28,
              color: '#ffffff',
              size: 22,
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>=',
                left: { type: 'var', name: 'pontos' },
                right: { type: 'num', value: 4 },
              },
              then: [
                {
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: 'Exploração completa! Você encontrou as 4 moedas.',
                  x: 240,
                  y: 54,
                  color: '#fbbf24',
                  size: 16,
                  align: 'center',
                },
              ],
              else: [
                {
                  type: 'g2d:drawLabel',
                  ctxVar: 'ctx',
                  text: 'Use as 4 setas para explorar o caminho.',
                  x: 240,
                  y: 54,
                  color: '#e2e8f0',
                  size: 16,
                  align: 'center',
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
 * Plataforma com TIPOS de inimigo (v0.22.0): três classes de inimigo
 * (patrulha, saltador e atirador) com vida/dano próprios, herói que atira num
 * grupo COMUM (prova que os blocos de grupo funcionam no tipo), dano de
 * contato com i-frames, "quando for derrotado" somando pontos e fim de jogo.
 */
export const enemyPlatformerExample: ExtensionExample = beginnerGameExample({
  name: 'Plataforma com inimigos',
  experience: 'game',
  description: 'Três tipos de inimigo (patrulha, saltador e atirador), tiro, vida e pontos.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 320 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0b1020',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
      {
        selector: 'canvas',
        declarations: { border: '2px solid #4ade80', background: '#11172a' },
      },
    ],
    version: 2,
    behavior: {
      start: [
        { type: 'g2d:setGravity', value: 0.6 },
        {
          type: 'g2d:createSprite',
          varName: 'heroi',
          x: 30,
          y: 240,
          w: 28,
          h: 28,
          color: '#4ade80',
        },
        { type: 'g2d:setHealth', spriteVar: 'heroi', amount: 3 },
        { type: 'g2d:score', varName: 'pontos', initial: 0 },
        { type: 'g2d:createGroup', varName: 'tiros' },
        { type: 'g2d:setScene', name: 'inicio' },
        {
          type: 'g2d:defineEnemyType',
          varName: 'goomba',
          behavior: 'patrulha',
          color: '#b45309',
          image: '',
          hp: 1,
          speed: 2,
          dmg: 1,
          w: 26,
          h: 26,
        },
        {
          type: 'g2d:defineEnemyType',
          varName: 'sapinho',
          behavior: 'saltador',
          color: '#22c55e',
          image: '',
          hp: 2,
          speed: 2,
          dmg: 1,
          w: 26,
          h: 26,
        },
        {
          type: 'g2d:defineEnemyType',
          varName: 'canhao',
          behavior: 'atirador',
          color: '#a855f7',
          image: '',
          hp: 3,
          speed: 0,
          dmg: 1,
          w: 30,
          h: 30,
        },
        { type: 'g2d:setEnemyTypeParam', typeVar: 'canhao', param: 'cadencia', value: 120 },
        { type: 'g2d:spawnEnemy', typeVar: 'goomba', x: 220, y: 280 },
        { type: 'g2d:spawnEnemy', typeVar: 'goomba', x: 340, y: 280 },
        { type: 'g2d:spawnEnemy', typeVar: 'sapinho', x: 280, y: 280 },
        { type: 'g2d:spawnEnemy', typeVar: 'canhao', x: 430, y: 280 },
      ],
      events: [
        {
          type: 'g2d:onEnemyDefeated',
          typeVar: 'goomba',
          itemName: 'inimigo',
          body: [
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
            { type: 'g2d:playFx', fx: 'hit' },
          ],
        },
        {
          type: 'g2d:onEnemyDefeated',
          typeVar: 'sapinho',
          itemName: 'inimigo',
          body: [
            {
              type: 'assign',
              name: 'pontos',
              value: {
                type: 'binop',
                op: '+',
                left: { type: 'var', name: 'pontos' },
                right: { type: 'num', value: 20 },
              },
            },
            { type: 'g2d:playFx', fx: 'hit' },
          ],
        },
        {
          type: 'g2d:onEnemyDefeated',
          typeVar: 'canhao',
          itemName: 'inimigo',
          body: [
            {
              type: 'assign',
              name: 'pontos',
              value: {
                type: 'binop',
                op: '+',
                left: { type: 'var', name: 'pontos' },
                right: { type: 'num', value: 30 },
              },
            },
            { type: 'g2d:playFx', fx: 'hit' },
          ],
        },
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
          type: 'g2d:onKey',
          key: 'Space',
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'jogando' },
              then: [
                {
                  type: 'g2d:spawnBullet',
                  groupVar: 'tiros',
                  x: { type: 'g2d:centerX', spriteVar: 'heroi' },
                  y: { type: 'g2d:centerY', spriteVar: 'heroi' },
                  radius: 5,
                  color: '#facc15',
                  vx: { type: 'num', value: 8 },
                  vy: { type: 'num', value: 0 },
                },
                { type: 'g2d:playFx', fx: 'laser' },
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
                  title: 'Plataforma com inimigos',
                  subtitle:
                    'Setas movem, seta para cima pula e Espaço atira. Derrote os 4 inimigos!',
                  hint: 'Aperte Enter para começar',
                  bg: '#11172a',
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'jogando' },
              then: [
                { type: 'g2d:platformer', spriteVar: 'heroi', ctxVar: 'ctx', speed: 4, jump: 11 },
                { type: 'g2d:clampToScreen', spriteVar: 'heroi', ctxVar: 'ctx' },
                { type: 'g2d:autoAnimate', spriteVar: 'heroi' },
                {
                  type: 'g2d:updateEnemyType',
                  typeVar: 'goomba',
                  ctxVar: 'ctx',
                  targetVar: 'heroi',
                },
                {
                  type: 'g2d:updateEnemyType',
                  typeVar: 'sapinho',
                  ctxVar: 'ctx',
                  targetVar: 'heroi',
                },
                {
                  type: 'g2d:updateEnemyType',
                  typeVar: 'canhao',
                  ctxVar: 'ctx',
                  targetVar: 'heroi',
                },
                { type: 'g2d:updateGroup', groupVar: 'tiros' },
                {
                  type: 'g2d:pruneOffscreen',
                  groupVar: 'tiros',
                  ctxVar: 'ctx',
                  itemName: 'tiro',
                  body: [],
                },
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'heroi',
                  groupVar: 'goomba',
                  itemName: 'inimigo',
                  body: [{ type: 'g2d:hurtByEnemy', spriteVar: 'heroi', enemyVar: 'inimigo' }],
                },
                {
                  type: 'g2d:onSpriteGroupOverlap',
                  spriteVar: 'heroi',
                  groupVar: 'sapinho',
                  itemName: 'inimigo',
                  body: [{ type: 'g2d:hurtByEnemy', spriteVar: 'heroi', enemyVar: 'inimigo' }],
                },
                {
                  type: 'g2d:onEnemyShotHit',
                  spriteVar: 'heroi',
                  typeVar: 'canhao',
                  itemName: 'tiro',
                  body: [{ type: 'g2d:hurtByEnemy', spriteVar: 'heroi', enemyVar: 'tiro' }],
                },
                {
                  type: 'g2d:onGroupOverlap',
                  aGroup: 'tiros',
                  aName: 'tiro',
                  bGroup: 'goomba',
                  bName: 'inimigo',
                  body: [
                    { type: 'g2d:changeHealth', spriteVar: 'inimigo', delta: -1 },
                    { type: 'g2d:removeFromGroup', spriteVar: 'tiro', groupVar: 'tiros' },
                  ],
                },
                {
                  type: 'g2d:onGroupOverlap',
                  aGroup: 'tiros',
                  aName: 'tiro',
                  bGroup: 'sapinho',
                  bName: 'inimigo',
                  body: [
                    { type: 'g2d:changeHealth', spriteVar: 'inimigo', delta: -1 },
                    { type: 'g2d:removeFromGroup', spriteVar: 'tiro', groupVar: 'tiros' },
                  ],
                },
                {
                  type: 'g2d:onGroupOverlap',
                  aGroup: 'tiros',
                  aName: 'tiro',
                  bGroup: 'canhao',
                  bName: 'inimigo',
                  body: [
                    { type: 'g2d:changeHealth', spriteVar: 'inimigo', delta: -1 },
                    { type: 'g2d:removeFromGroup', spriteVar: 'tiro', groupVar: 'tiros' },
                  ],
                },
                { type: 'g2d:drawEnemyType', ctxVar: 'ctx', typeVar: 'goomba' },
                { type: 'g2d:drawEnemyType', ctxVar: 'ctx', typeVar: 'sapinho' },
                { type: 'g2d:drawEnemyType', ctxVar: 'ctx', typeVar: 'canhao' },
                { type: 'g2d:drawGroup', ctxVar: 'ctx', groupVar: 'tiros' },
                { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
                {
                  type: 'g2d:drawSpriteHealth',
                  ctxVar: 'ctx',
                  spriteVar: 'heroi',
                  style: 'hearts',
                  x: 12,
                  y: 12,
                  size: 16,
                  color: '#f87171',
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Pontos:',
                  value: { type: 'var', name: 'pontos' },
                  x: 12,
                  y: 56,
                  color: '#ffffff',
                  size: 20,
                },
                {
                  type: 'if',
                  cond: { type: 'g2d:healthDepleted', spriteVar: 'heroi' },
                  then: [{ type: 'g2d:setScene', name: 'derrota' }],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<=',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'binop',
                        op: '+',
                        left: { type: 'g2d:countGroup', groupVar: 'goomba' },
                        right: { type: 'g2d:countGroup', groupVar: 'sapinho' },
                      },
                      right: { type: 'g2d:countGroup', groupVar: 'canhao' },
                    },
                    right: { type: 'num', value: 0 },
                  },
                  then: [{ type: 'g2d:setScene', name: 'vitoria' }],
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
                  title: 'Você venceu!',
                  subtitle: 'Todos os inimigos foram derrotados.',
                  hint: 'Aperte Enter para jogar de novo',
                  bg: '#063018',
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
                  title: 'Fim de jogo',
                  subtitle: 'Os inimigos venceram desta vez!',
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
 * Jogo desenhado por CÓDIGO (v0.23.0): herói e moeda montados SÓ com figuras
 * (zero imagem) — o herói é um corpo + olho, a moeda um círculo. Move em 4
 * direções, colisão pontua. Prova que o sprite desenhado por código anda e
 * colide como qualquer outro.
 */
export const codeDrawnExample: ExtensionExample = beginnerGameExample({
  name: 'Jogo desenhado por código',
  experience: 'demo',
  description: 'Herói e moeda desenhados com formas (sem nenhuma imagem); pegue as moedas.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 400, height: 300 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0b1020',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
      {
        selector: 'canvas',
        declarations: { border: '2px solid #4ade80', background: '#11172a' },
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g2d:defineShape',
          shapeName: 'heroi',
          body: [
            {
              type: 'g2d:paintRect',
              ctxVar: 'ctx',
              x: { type: 'num', value: 2 },
              y: { type: 'num', value: 2 },
              w: { type: 'num', value: 24 },
              h: { type: 'num', value: 24 },
              color: '#4ade80',
            },
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: { type: 'num', value: 18 },
              y: { type: 'num', value: 10 },
              r: { type: 'num', value: 4 },
              color: '#0b1020',
            },
          ],
        },
        {
          type: 'g2d:defineShape',
          shapeName: 'moeda',
          body: [
            {
              type: 'g2d:paintCircle',
              ctxVar: 'ctx',
              x: { type: 'num', value: 8 },
              y: { type: 'num', value: 8 },
              r: { type: 'num', value: 7 },
              color: '#facc15',
            },
          ],
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'heroi',
          shapeName: 'heroi',
          x: 40,
          y: 130,
          w: 28,
          h: 28,
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'moeda',
          shapeName: 'moeda',
          x: 320,
          y: 140,
          w: 16,
          h: 16,
        },
        { type: 'g2d:score', varName: 'pontos', initial: 0 },
      ],
      events: [],
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            { type: 'g2d:topDown', spriteVar: 'heroi', speed: 3 },
            { type: 'g2d:clampToScreen', spriteVar: 'heroi', ctxVar: 'ctx' },
            {
              type: 'if',
              cond: { type: 'g2d:touches', aVar: 'heroi', bVar: 'moeda' },
              then: [
                {
                  type: 'g2d:setPosition',
                  spriteVar: 'moeda',
                  x: { type: 'g2d:randomX' },
                  y: { type: 'g2d:randomY' },
                },
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
                { type: 'g2d:playFx', fx: 'coin' },
              ],
              else: [],
            },
            { type: 'g2d:drawSprite', spriteVar: 'moeda', ctxVar: 'ctx' },
            { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
            {
              type: 'g2d:drawScore',
              ctxVar: 'ctx',
              label: 'Moedas:',
              value: { type: 'var', name: 'pontos' },
              x: 12,
              y: 28,
              color: '#ffffff',
              size: 20,
            },
            {
              type: 'g2d:drawLabel',
              ctxVar: 'ctx',
              text: 'Use as setas para pegar a moeda amarela.',
              x: 200,
              y: 288,
              color: '#e2e8f0',
              size: 14,
              align: 'center',
            },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})
