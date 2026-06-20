import type { ExtensionExample } from '#extensions'

/**
 * Exemplo bundlado: "Pong simples". Carregado pelo painel de extensões via
 * botão "Carregar exemplo". Substitui a IR atual do projeto.
 */
export const pongExample: ExtensionExample = {
  name: 'Pong simples',
  description: 'Bola que rebate nas bordas + raquete controlada pelas setas.',
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
        declarations: { border: '2px solid #22d3ee', background: '#11172a' },
      },
    ],
    js: [
      {
        type: 'g2d:createSprite',
        varName: 'jogador',
        x: 20,
        y: 130,
        w: 12,
        h: 40,
        color: '#22d3ee',
      },
      {
        type: 'g2d:createSprite',
        varName: 'bola',
        x: 190,
        y: 140,
        w: 12,
        h: 12,
        color: '#fbbf24',
      },
      {
        type: 'g2d:setVelocity',
        spriteVar: 'bola',
        vx: { type: 'num', value: 3 },
        vy: { type: 'num', value: 2 },
      },
      {
        type: 'g2d:updateEachFrame',
        body: [
          { type: 'g2d:clear' },
          { type: 'g2d:topDown', spriteVar: 'jogador', speed: 4 },
          { type: 'g2d:drawSprite', spriteVar: 'jogador', ctxVar: 'ctx' },
          // Física da bola com os blocos do próprio motor (em vez de JS cru, que
          // caía no bloco "código avançado"): mover pela velocidade, quicar nas
          // bordas e, ao bater na raquete, mandar a bola para a direita (vx > 0).
          { type: 'g2d:applyVelocity', spriteVar: 'bola' },
          { type: 'g2d:bounceOnEdges', spriteVar: 'bola', ctxVar: 'ctx' },
          { type: 'g2d:collides', aVar: 'jogador', bVar: 'bola', varName: 'bateu' },
          {
            type: 'if',
            cond: { type: 'var', name: 'bateu' },
            then: [
              {
                type: 'memberSet',
                object: { type: 'var', name: 'bola' },
                name: 'vx',
                value: {
                  type: 'mathUnary',
                  fn: 'abs',
                  arg: { type: 'memberGet', object: { type: 'var', name: 'bola' }, name: 'vx' },
                },
              },
            ],
          },
          { type: 'g2d:drawSprite', spriteVar: 'bola', ctxVar: 'ctx' },
        ],
      },
    ],
    extensions: [{ extensionId: 'game-2d' }],
  },
}

/**
 * Exemplo "Herói que anda": sprite com imagem da biblioteca + animação de
 * spritesheet, movido pelas setas. Os nomes de asset (`heroi`, `heroi-andando`)
 * casam com itens do starter pack — enquanto a imagem não é adicionada, o sprite
 * aparece como retângulo (placeholder) e segue jogável.
 */
export const animatedHeroExample: ExtensionExample = {
  name: 'Herói que anda',
  description: 'Sprite com imagem + animação de spritesheet, movido pelas setas.',
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
        declarations: { border: '2px solid #f472b6', background: '#11172a' },
      },
    ],
    js: [
      {
        type: 'g2d:createImageSprite',
        varName: 'heroi',
        x: 180,
        y: 130,
        w: 48,
        h: 48,
        image: 'heroi',
      },
      {
        type: 'g2d:loadSpritesheet',
        varName: 'andar',
        image: 'heroi-andando',
        frameW: 32,
        frameH: 32,
      },
      {
        type: 'g2d:animateSprite',
        spriteVar: 'heroi',
        sheetVar: 'andar',
        from: 0,
        to: 3,
        fps: 8,
      },
      {
        type: 'g2d:updateEachFrame',
        body: [
          { type: 'g2d:clear' },
          { type: 'g2d:topDown', spriteVar: 'heroi', speed: 3 },
          { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
        ],
      },
    ],
    extensions: [{ extensionId: 'game-2d' }],
  },
}

/**
 * Exemplo "Mini plataforma" (v0.4.0): herói que anda com esquerda/direita, pula
 * com gravidade e não sai da tela. Setas para mover/pular. Sprite colorido (não
 * depende de asset) para o exemplo funcionar sozinho.
 */
export const platformerExample: ExtensionExample = {
  name: 'Mini plataforma',
  description: 'Herói que anda, pula com gravidade e fica preso na tela (setas).',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 320, height: 200 }],
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
    js: [
      {
        type: 'g2d:createSprite',
        varName: 'heroi',
        x: 20,
        y: 120,
        w: 36,
        h: 36,
        color: '#4ade80',
      },
      {
        type: 'g2d:updateEachFrame',
        body: [
          { type: 'g2d:clear' },
          { type: 'g2d:platformer', spriteVar: 'heroi', ctxVar: 'ctx', speed: 4, jump: 11 },
          { type: 'g2d:clampToScreen', spriteVar: 'heroi', ctxVar: 'ctx' },
          { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
        ],
      },
    ],
    extensions: [{ extensionId: 'game-2d' }],
  },
}

/**
 * Exemplo "Sala com paredes" (v0.5.0): um mapa de tiles (chão + paredes) com um
 * herói que anda nas 4 direções pelas setas e NÃO atravessa as paredes (tiles
 * sólidos). Usa o `tileset` da biblioteca (chão = 0, parede = 1); enquanto o asset
 * não for adicionado, os tiles aparecem como retângulos (placeholder) e o mapa
 * segue jogável.
 */
export const tilemapExample: ExtensionExample = {
  name: 'Sala com paredes',
  description: 'Mapa de tiles com paredes que o herói não atravessa (setas para andar).',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 320, height: 256 }],
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
        declarations: { border: '2px solid #f472b6', background: '#11172a' },
      },
    ],
    js: [
      {
        type: 'g2d:createTileMap',
        varName: 'mapa',
        image: 'tileset',
        tile: 32,
        solid: '1',
        grid: '1 1 1 1 1 1 1 1 1 1;1 0 0 0 0 0 0 0 0 1;1 0 0 0 0 0 0 0 0 1;1 0 0 0 1 1 0 0 0 1;1 0 0 0 1 1 0 0 0 1;1 0 0 0 0 0 0 0 0 1;1 0 0 0 0 0 0 0 0 1;1 1 1 1 1 1 1 1 1 1',
      },
      {
        type: 'g2d:createImageSprite',
        varName: 'heroi',
        x: 48,
        y: 48,
        w: 28,
        h: 28,
        image: 'heroi',
      },
      {
        type: 'g2d:updateEachFrame',
        body: [
          { type: 'g2d:clear' },
          { type: 'g2d:drawTileMap', mapVar: 'mapa', ctxVar: 'ctx', x: 0, y: 0 },
          { type: 'g2d:topDown', spriteVar: 'heroi', speed: 3 },
          { type: 'g2d:tileMapCollide', spriteVar: 'heroi', mapVar: 'mapa' },
          { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
        ],
      },
    ],
    extensions: [{ extensionId: 'game-2d' }],
  },
}

/**
 * Exemplo "Nave contra Asteroides" (v0.6.0): jogo de tiro completo montado só com
 * blocos — grupos de sprites (tiros, asteroides), spawner por tempo, colisão de
 * grupo, HUD no canvas (placar + vidas) e telas de início/vitória/derrota. Mostra
 * o padrão recomendado: setup no TOPO (visível ao loop) + um único "a cada quadro"
 * que despacha por cena com "se a tela atual é X". Sprites coloridos (sem asset).
 */
export const asteroidsExample: ExtensionExample = {
  name: 'Nave contra Asteroides',
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
    js: [
      // --- Setup (no TOPO: assim o "a cada quadro" enxerga estas variáveis) ---
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
      { type: 'g2d:createGroup', varName: 'tiros' },
      { type: 'g2d:createGroup', varName: 'asteroides' },
      { type: 'var', name: 'pontos', value: { type: 'num', value: 0 } },
      { type: 'var', name: 'vidas', value: { type: 'num', value: 3 } },
      { type: 'g2d:setScene', name: 'inicio' },
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
      // --- Loop principal: limpa, desenha o fundo e despacha por cena ---
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
                    x: {
                      type: 'random',
                      min: { type: 'num', value: 10 },
                      max: { type: 'num', value: 360 },
                    },
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
                    type: 'assign',
                    name: 'vidas',
                    value: {
                      type: 'binop',
                      op: '-',
                      left: { type: 'var', name: 'vidas' },
                      right: { type: 'num', value: 1 },
                    },
                  },
                ],
              },
              {
                type: 'g2d:pruneOffscreen',
                groupVar: 'asteroides',
                ctxVar: 'ctx',
                itemName: 'a',
                body: [
                  {
                    type: 'assign',
                    name: 'vidas',
                    value: {
                      type: 'binop',
                      op: '-',
                      left: { type: 'var', name: 'vidas' },
                      right: { type: 'num', value: 1 },
                    },
                  },
                ],
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
                type: 'g2d:drawHearts',
                ctxVar: 'ctx',
                count: { type: 'var', name: 'vidas' },
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
                cond: {
                  type: 'binop',
                  op: '<=',
                  left: { type: 'var', name: 'vidas' },
                  right: { type: 'num', value: 0 },
                },
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
    extensions: [{ extensionId: 'game-2d' }],
  },
}

/**
 * Exemplo bundlado: "Dino Run" (Kit dino, v0.9.0). Jogo de corrida: o dinossauro
 * corre, pula os obstáculos do chão (cacto/pedra), abaixa do pássaro, pega ovos
 * de bônus e tem vidas, pontos e RECORDE que persiste (localStorage). Telas de
 * início e fim. Mostra o Kit dino + pulo no chão + grupos + HUD + cenas juntos.
 */
export const dinoRunExample: ExtensionExample = {
  name: 'Dino Run',
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
    js: [
      // --- Setup (no TOPO: o "a cada quadro" enxerga estas variáveis) ---
      { type: 'g2d:fitScreen', percent: 100 },
      { type: 'g2d:createDino', varName: 'dino', x: 120, y: 150, size: 64, color: '#5fb45f' },
      { type: 'g2d:createGroup', varName: 'obstaculos' },
      { type: 'g2d:createGroup', varName: 'ovos' },
      { type: 'var', name: 'pontos', value: { type: 'num', value: 0 } },
      { type: 'var', name: 'vidas', value: { type: 'num', value: 3 } },
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
      // --- Loop principal: limpa, desenha a floresta e despacha por cena ---
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
                  { type: 'g2d:blinkSprite', spriteVar: 'dino', frames: 80 },
                  {
                    type: 'assign',
                    name: 'vidas',
                    value: {
                      type: 'binop',
                      op: '-',
                      left: { type: 'var', name: 'vidas' },
                      right: { type: 'num', value: 1 },
                    },
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
                type: 'g2d:drawHearts',
                ctxVar: 'ctx',
                count: { type: 'var', name: 'vidas' },
                x: 372,
                y: 22,
                size: 16,
                color: '#ff4f7a',
              },
              // acabaram as vidas: salva o recorde e vai pra tela de fim
              {
                type: 'if',
                cond: {
                  type: 'binop',
                  op: '<=',
                  left: { type: 'var', name: 'vidas' },
                  right: { type: 'num', value: 0 },
                },
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
    extensions: [{ extensionId: 'game-2d' }],
  },
}

/**
 * Exemplo "Asteroides clássico" (v0.10.0): a nave GIRA com as setas ← → (ou A/D),
 * IMPULSIONA na direção apontada com ↑ (ou W) e desliza com atrito; atira PARA A
 * FRENTE com Espaço; asteroides nascem das bordas rumo ao centro. Colisão de tiro
 * destrói o asteroide (+1); a nave encostando num asteroide é fim de jogo. Mostra
 * os blocos novos de nave clássica (girar/impulsionar/atirar-pra-frente/borda).
 */
export const asteroidsClassicExample: ExtensionExample = {
  name: 'Asteroides clássico',
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
    js: [
      // --- Setup (no TOPO: assim o "a cada quadro" enxerga estas variáveis) ---
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
      // --- Loop principal: limpa, desenha o fundo e despacha por cena ---
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
    extensions: [{ extensionId: 'game-2d' }],
  },
}
