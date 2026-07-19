import type { ExtensionExample } from '#extensions'
import type { JSStatement } from '#ir'

function isBeginnerPeriodicLoop(
  statement: JSStatement,
): statement is Extract<JSStatement, { type: 'g2d:everyFrames' | 'g2d:everySeconds' }> {
  return statement.type === 'g2d:everyFrames' || statement.type === 'g2d:everySeconds'
}

/**
 * Migra os exemplos antigos em que “A cada N” vivia dentro do quadro principal.
 * A cadência vira uma raiz própria; quando estava dentro de um `se`, o corpo
 * conserva essa condição (por exemplo, só criar asteroide durante “jogando”).
 */
function liftBeginnerPeriodicLoops(loops: JSStatement[]): JSStatement[] {
  const lifted: JSStatement[] = []
  const roots = loops.map((root) => {
    if (root.type !== 'g2d:updateEachFrame') return root
    const body = root.body.flatMap((statement): JSStatement[] => {
      if (isBeginnerPeriodicLoop(statement)) {
        lifted.push(statement)
        return []
      }
      if (statement.type !== 'if') return [statement]
      const then = statement.then.flatMap((child): JSStatement[] => {
        if (!isBeginnerPeriodicLoop(child)) return [child]
        lifted.push({
          ...child,
          body: [{ type: 'if', cond: structuredClone(statement.cond), then: child.body }],
        })
        return []
      })
      return [{ ...statement, then }]
    })
    return { ...root, body }
  })
  return [...roots, ...lifted]
}

/**
 * Todos os cartões ensinam o mesmo caminho que a criança usa nas aulas: um
 * único “Quando o jogo começar” prepara o palco implícito e contém a partida.
 * O canvas deixa de ser uma peça escondida no HTML do exemplo.
 */
function beginnerGameExample(example: ExtensionExample): ExtensionExample {
  const canvas = example.ir.html.find(
    (node): node is Extract<(typeof example.ir.html)[number], { type: 'canvas' }> =>
      node.type === 'canvas',
  )
  if (!canvas || typeof canvas.width !== 'number' || typeof canvas.height !== 'number') {
    throw new Error(`O exemplo “${example.name}” precisa declarar o tamanho do palco`)
  }
  const canvasRule = example.ir.css.find(
    (entry) => 'selector' in entry && entry.selector === 'canvas',
  )
  const background =
    canvasRule &&
    'declarations' in canvasRule &&
    typeof canvasRule.declarations.background === 'string'
      ? canvasRule.declarations.background
      : '#11172a'
  const startId = `exemplo-${example.name.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-')}`
  return {
    ...example,
    ir: {
      ...example.ir,
      html: example.ir.html.filter((node) => node !== canvas),
      version: 2,
      behavior: {
        start: [
          {
            type: 'g2d:setupStage',
            width: canvas.width,
            height: canvas.height,
            bg: background,
            __id: startId,
          },
          ...example.ir.behavior.start,
        ],
        events: example.ir.behavior.events,
        loops: liftBeginnerPeriodicLoops(example.ir.behavior.loops),
      },
    },
  }
}

const EXAMPLE_HERO_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI3IiBmaWxsPSIjMjU2M2ViIi8+PGNpcmNsZSBjeD0iMTYiIGN5PSIxMCIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxyZWN0IHg9IjEwIiB5PSIxNiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiByeD0iNCIgZmlsbD0iIzYwYTVmYSIvPjxjaXJjbGUgY3g9IjE0IiBjeT0iOSIgcj0iMSIvPjxjaXJjbGUgY3g9IjE4IiBjeT0iOSIgcj0iMSIvPjwvc3ZnPg=='
const EXAMPLE_HERO_WALK_SHEET =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAxMjggMzIiPjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMzIiIGZpbGw9Im5vbmUiLz48ZyBmaWxsPSIjMjU2M2ViIiBzdHJva2U9IiNmZGU2OGEiIHN0cm9rZS13aWR0aD0iMyI+PGNpcmNsZSBjeD0iMTYiIGN5PSI5IiByPSI2IiBmaWxsPSIjZmRlNjhhIi8+PHBhdGggZD0iTTE2IDE1djltMC01LTcgNW03LTUgNyA1bS03IDAtNSA3bTUtNyA1IDciLz48Y2lyY2xlIGN4PSI0OCIgY3k9IjkiIHI9IjYiIGZpbGw9IiNmZGU2OGEiLz48cGF0aCBkPSJNNDggMTV2OW0wLTUtOCAybTgtMiA4IDJtLTggMy04IDRtOC00IDcgNyIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iOSIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxwYXRoIGQ9Ik04MCAxNXY5bTAtNS03IDVtNy01IDcgNW0tNyA1LTUgMm01LTcgNSAzIi8+PGNpcmNsZSBjeD0iMTEyIiBjeT0iOSIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxwYXRoIGQ9Ik0xMTIgMTV2OW0wLTUtOCAybTgtMiA4IDJtLTggNS03IDVtNy03IDggNCIvPjwvZz48L3N2Zz4='
const EXAMPLE_TILESET_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDY0IDMyIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiMzMzQxNTUiLz48cGF0aCBkPSJNMCA4aDMyTTAgMTZoMzJNMCAyNGgzMiIgc3Ryb2tlPSIjNDc1NTY5Ii8+PHJlY3QgeD0iMzIiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0iIzdjM2FlZCIvPjxwYXRoIGQ9Ik0zMiA4aDMyTTMyIDE2aDMyTTMyIDI0aDMyTTQwIDB2OG0xNiAwdjhtLTE2IDB2OG0xNiAwdjgiIHN0cm9rZT0iI2M0YjVmZCIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+'

/**
 * Exemplo bundlado: "Pong simples". Carregado pelo painel de extensões via
 * botão "Carregar exemplo". Substitui a IR atual do projeto.
 */
export const pongExample: ExtensionExample = beginnerGameExample({
  name: 'Pong simples',
  experience: 'game',
  description: 'Primeiro a 5 pontos vence: mova a raquete com as setas e rebata a bola.',
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
    version: 2,
    behavior: {
      start: [
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
          varName: 'computador',
          x: 368,
          y: 130,
          w: 12,
          h: 40,
          color: '#f472b6',
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
        { type: 'var', name: 'pontos', value: { type: 'num', value: 0 } },
        { type: 'var', name: 'pontosComputador', value: { type: 'num', value: 0 } },
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
                  title: 'Pong simples',
                  subtitle: 'Use as setas para mover a raquete azul. O primeiro a 5 pontos vence!',
                  hint: 'Aperte Enter para começar',
                  bg: '#11172a',
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'jogando' },
              then: [
                { type: 'g2d:topDown', spriteVar: 'jogador', speed: 4 },
                {
                  type: 'memberSet',
                  object: { type: 'var', name: 'jogador' },
                  name: 'x',
                  value: { type: 'num', value: 20 },
                },
                { type: 'g2d:clampToScreen', spriteVar: 'jogador', ctxVar: 'ctx' },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: { type: 'memberGet', object: { type: 'var', name: 'bola' }, name: 'y' },
                    right: {
                      type: 'memberGet',
                      object: { type: 'var', name: 'computador' },
                      name: 'y',
                    },
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'computador' },
                      name: 'y',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'memberGet',
                          object: { type: 'var', name: 'computador' },
                          name: 'y',
                        },
                        right: { type: 'num', value: 2.5 },
                      },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: { type: 'memberGet', object: { type: 'var', name: 'bola' }, name: 'y' },
                    right: {
                      type: 'memberGet',
                      object: { type: 'var', name: 'computador' },
                      name: 'y',
                    },
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'computador' },
                      name: 'y',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'memberGet',
                          object: { type: 'var', name: 'computador' },
                          name: 'y',
                        },
                        right: { type: 'num', value: 2.5 },
                      },
                    },
                  ],
                },
                {
                  type: 'memberSet',
                  object: { type: 'var', name: 'computador' },
                  name: 'x',
                  value: { type: 'num', value: 368 },
                },
                { type: 'g2d:clampToScreen', spriteVar: 'computador', ctxVar: 'ctx' },
                { type: 'g2d:applyVelocity', spriteVar: 'bola' },
                {
                  type: 'if',
                  cond: {
                    type: 'logical',
                    op: '||',
                    left: {
                      type: 'binop',
                      op: '<=',
                      left: { type: 'memberGet', object: { type: 'var', name: 'bola' }, name: 'y' },
                      right: { type: 'num', value: 0 },
                    },
                    right: {
                      type: 'binop',
                      op: '>=',
                      left: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'memberGet',
                          object: { type: 'var', name: 'bola' },
                          name: 'y',
                        },
                        right: {
                          type: 'memberGet',
                          object: { type: 'var', name: 'bola' },
                          name: 'h',
                        },
                      },
                      right: { type: 'num', value: 300 },
                    },
                  },
                  then: [
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'vy',
                      value: {
                        type: 'binop',
                        op: '*',
                        left: {
                          type: 'memberGet',
                          object: { type: 'var', name: 'bola' },
                          name: 'vy',
                        },
                        right: { type: 'num', value: -1 },
                      },
                    },
                  ],
                },
                { type: 'g2d:collides', aVar: 'jogador', bVar: 'bola', varName: 'bateuJogador' },
                {
                  type: 'if',
                  cond: { type: 'var', name: 'bateuJogador' },
                  then: [
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'vx',
                      value: {
                        type: 'mathUnary',
                        fn: 'abs',
                        arg: {
                          type: 'memberGet',
                          object: { type: 'var', name: 'bola' },
                          name: 'vx',
                        },
                      },
                    },
                  ],
                },
                {
                  type: 'g2d:collides',
                  aVar: 'computador',
                  bVar: 'bola',
                  varName: 'bateuComputador',
                },
                {
                  type: 'if',
                  cond: { type: 'var', name: 'bateuComputador' },
                  then: [
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'vx',
                      value: {
                        type: 'binop',
                        op: '*',
                        left: {
                          type: 'mathUnary',
                          fn: 'abs',
                          arg: {
                            type: 'memberGet',
                            object: { type: 'var', name: 'bola' },
                            name: 'vx',
                          },
                        },
                        right: { type: 'num', value: -1 },
                      },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: { type: 'memberGet', object: { type: 'var', name: 'bola' }, name: 'x' },
                    right: { type: 'num', value: -12 },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'pontosComputador',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: { type: 'var', name: 'pontosComputador' },
                        right: { type: 'num', value: 1 },
                      },
                    },
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'x',
                      value: { type: 'num', value: 194 },
                    },
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'y',
                      value: { type: 'num', value: 144 },
                    },
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'vx',
                      value: { type: 'num', value: 3 },
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: { type: 'memberGet', object: { type: 'var', name: 'bola' }, name: 'x' },
                    right: { type: 'num', value: 400 },
                  },
                  then: [
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
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'x',
                      value: { type: 'num', value: 194 },
                    },
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'y',
                      value: { type: 'num', value: 144 },
                    },
                    {
                      type: 'memberSet',
                      object: { type: 'var', name: 'bola' },
                      name: 'vx',
                      value: { type: 'num', value: -3 },
                    },
                  ],
                },
                { type: 'g2d:drawSprite', spriteVar: 'jogador', ctxVar: 'ctx' },
                { type: 'g2d:drawSprite', spriteVar: 'computador', ctxVar: 'ctx' },
                { type: 'g2d:drawSprite', spriteVar: 'bola', ctxVar: 'ctx' },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Você:',
                  value: { type: 'var', name: 'pontos' },
                  x: 120,
                  y: 28,
                  color: '#22d3ee',
                  size: 20,
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'Computador:',
                  value: { type: 'var', name: 'pontosComputador' },
                  x: 230,
                  y: 28,
                  color: '#f472b6',
                  size: 20,
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: { type: 'var', name: 'pontos' },
                    right: { type: 'num', value: 5 },
                  },
                  then: [{ type: 'g2d:setScene', name: 'vitoria' }],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>=',
                    left: { type: 'var', name: 'pontosComputador' },
                    right: { type: 'num', value: 5 },
                  },
                  then: [{ type: 'g2d:setScene', name: 'derrota' }],
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
                  subtitle: 'Chegou a 5 pontos primeiro.',
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
                  subtitle: 'O computador chegou a 5 pontos.',
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
 * Exemplo "Herói que anda": sprite com imagem da biblioteca + animação de
 * spritesheet, movido pelas setas. Os nomes de asset (`heroi`, `heroi-andando`)
 * casam com os dois assets mínimos embutidos no próprio cartão.
 */
export const animatedHeroExample: ExtensionExample = beginnerGameExample({
  name: 'Herói que anda',
  experience: 'demo',
  description: 'Sprite com imagem + animação de spritesheet, movido pelas setas.',
  assets: [
    {
      id: 'example-hero',
      name: 'heroi',
      kind: 'image',
      dataUrl: EXAMPLE_HERO_IMAGE,
      width: 32,
      height: 32,
      source: 'library',
      libId: 'example-hero',
    },
    {
      id: 'example-hero-walk',
      name: 'heroi-andando',
      kind: 'image',
      dataUrl: EXAMPLE_HERO_WALK_SHEET,
      width: 128,
      height: 32,
      source: 'library',
      libId: 'example-hero-walk',
    },
  ],
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
    version: 2,
    behavior: {
      start: [
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
      ],
      events: [],
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            { type: 'g2d:topDown', spriteVar: 'heroi', speed: 3 },
            { type: 'g2d:drawSprite', spriteVar: 'heroi', ctxVar: 'ctx' },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})

/**
 * Exemplo "Mini plataforma" (v0.4.0): herói que anda com esquerda/direita, pula
 * com gravidade e não sai da tela. Setas para mover/pular. Sprite colorido (não
 * depende de asset) para o exemplo funcionar sozinho.
 */
export const platformerExample: ExtensionExample = beginnerGameExample({
  name: 'Mini plataforma',
  experience: 'demo',
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
    version: 2,
    behavior: {
      start: [
        {
          type: 'g2d:createSprite',
          varName: 'heroi',
          x: 20,
          y: 120,
          w: 36,
          h: 36,
          color: '#4ade80',
        },
      ],
      events: [],
      loops: [
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
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})

/**
 * Exemplo "Sala com paredes" (v0.5.0): um mapa de tiles (chão + paredes) com um
 * herói que anda nas 4 direções pelas setas e NÃO atravessa as paredes (tiles
 * sólidos). Embute uma folha mínima (chão = 0, parede = 1) e o herói.
 */
export const tilemapExample: ExtensionExample = beginnerGameExample({
  name: 'Sala com paredes',
  experience: 'demo',
  description: 'Mapa de tiles com paredes que o herói não atravessa (setas para andar).',
  assets: [
    {
      id: 'example-room-tileset',
      name: 'tileset',
      kind: 'image',
      dataUrl: EXAMPLE_TILESET_IMAGE,
      width: 64,
      height: 32,
      source: 'library',
      libId: 'example-room-tileset',
    },
    {
      id: 'example-room-hero',
      name: 'heroi',
      kind: 'image',
      dataUrl: EXAMPLE_HERO_IMAGE,
      width: 32,
      height: 32,
      source: 'library',
      libId: 'example-room-hero',
    },
  ],
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
    version: 2,
    behavior: {
      start: [
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
      ],
      events: [],
      loops: [
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
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})

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
        { type: 'g2d:createGroup', varName: 'tiros' },
        { type: 'g2d:createGroup', varName: 'asteroides' },
        { type: 'var', name: 'pontos', value: { type: 'num', value: 0 } },
        { type: 'var', name: 'vidas', value: { type: 'num', value: 3 } },
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
        // --- Loop principal: limpa, desenha a cidade e despacha por cena ---
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
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})

/**
 * Exemplo bundlado: "Equilibrista" (estilo Stick Hero). Crie o jogo uma vez e
 * atualize-o a cada quadro — segure o mouse/dedo para esticar o bastão e solte
 * para atravessar a próxima plataforma.
 */
export const stickHeroExample: ExtensionExample = beginnerGameExample({
  name: 'Equilibrista',
  experience: 'game',
  description:
    'Estica o bastão segurando o mouse/dedo e atravessa as plataformas (estilo Stick Hero).',
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
      start: [{ type: 'g2d:createStickHero', varName: 'jogo', ctxVar: 'ctx' }],
      events: [
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
        {
          type: 'g2d:updateEachFrame',
          body: [{ type: 'g2d:updateStickHero', gameVar: 'jogo' }],
        },
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})

/**
 * Exemplo bundlado: "Balão" (estilo Hot-Air-Balloon). Segure o mouse/dedo para
 * subir (gasta combustível); voe baixo para economizar e desvie das árvores.
 */
export const balloonExample: ExtensionExample = beginnerGameExample({
  name: 'Balão',
  experience: 'game',
  description: 'Suba segurando o mouse/dedo, economize combustível e desvie das árvores.',
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
      start: [{ type: 'g2d:createBalloon', varName: 'jogo', ctxVar: 'ctx' }],
      events: [
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
        {
          type: 'g2d:updateEachFrame',
          body: [{ type: 'g2d:updateBalloon', gameVar: 'jogo' }],
        },
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})

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
          type: 'g2d:spawnInGroup',
          groupVar: 'paisagem',
          x: { type: 'num', value: 150 },
          y: { type: 'num', value: 230 },
          w: 90,
          h: 74,
          color: '#fb923c',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'paisagem',
          x: { type: 'num', value: 500 },
          y: { type: 'num', value: 244 },
          w: 42,
          h: 60,
          color: '#15803d',
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
          type: 'g2d:spawnInGroup',
          groupVar: 'paisagem',
          x: { type: 'num', value: 1080 },
          y: { type: 'num', value: 218 },
          w: 110,
          h: 86,
          color: '#a78bfa',
          vx: { type: 'num', value: 0 },
          vy: { type: 'num', value: 0 },
        },
        {
          type: 'g2d:spawnInGroup',
          groupVar: 'paisagem',
          x: { type: 'num', value: 1420 },
          y: { type: 'num', value: 234 },
          w: 54,
          h: 70,
          color: '#166534',
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
                  type: 'g2d:drawHearts',
                  ctxVar: 'ctx',
                  count: { type: 'g2d:getHealth', spriteVar: 'heroi' },
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
                  cond: {
                    type: 'logicalNot',
                    value: { type: 'g2d:hasHealth', spriteVar: 'heroi' },
                  },
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
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})
