import type { ExtensionExample } from '#extensions'
import type { CSSRule } from '#ir'

function centeredCanvasLayout(background: string): CSSRule[] {
  return [
    {
      selector: 'body',
      declarations: {
        background,
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        'box-sizing': 'border-box',
        'min-height': '100vh',
        padding: '12px',
        margin: '0',
        overflow: 'hidden',
      },
    },
    {
      selector: 'canvas',
      declarations: {
        display: 'block',
        width: 'min(480px, calc(100vw - 24px))',
        height: 'auto',
        'max-height': 'calc(100vh - 24px)',
        'object-fit': 'contain',
      },
    },
  ]
}

/**
 * Exemplo bundlado: "Cubo girando". Cria uma cena 3D, um cubo e gira-o a cada
 * quadro com movimento independente da taxa de atualização da tela.
 */
export const rotatingCubeExample: ExtensionExample = {
  name: 'Cubo girando',
  experience: 'demo',
  description: 'Uma cena 3D com um cubo que gira continuamente (Three.js).',
  ir: {
    html: [],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0b1020',
          'min-height': '100vh',
          margin: '0',
        },
      },
    ],
    version: 2,
    behavior: {
      start: [
        { type: 'g3d:createFullscreenScene', varName: 'cena', bg: '#0b1020' },
        { type: 'g3d:createBox', varName: 'caixa', worldVar: 'cena', size: 1.5, color: '#22d3ee' },
      ],
      events: [],
      loops: [
        {
          type: 'g3d:animate',
          worldVar: 'cena',
          body: [
            {
              type: 'g3d:rotateBy',
              objVar: 'caixa',
              axis: 'x',
              amount: { type: 'num', value: 0.01 },
            },
            {
              type: 'g3d:rotateBy',
              objVar: 'caixa',
              axis: 'y',
              amount: { type: 'num', value: 0.01 },
            },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-3d' }],
  },
}

/**
 * Exemplo bundlado: "Boneco de formas". Mostra a Fase 6 (formas, materiais e montar
 * modelo): um chão (plano), e um boneco montado com esferas + cone (nariz) + cilindro
 * (chapéu metálico) dentro de um MODELO — girar o modelo gira o boneco inteiro.
 */
export const shapesExample: ExtensionExample = {
  name: 'Boneco de formas',
  experience: 'demo',
  description:
    'Um boneco montado com esferas, cone e cilindro (um modelo) sobre o chão, girando — mostra formas, materiais e montar modelo.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 360 }],
    css: centeredCanvasLayout('#1e293b'),
    version: 2,
    behavior: {
      start: [
        { type: 'g3d:createScene', canvasId: 'tela', varName: 'cena' },
        { type: 'g3d:setBackground', worldVar: 'cena', color: '#1e293b' },
        {
          type: 'g3d:setCameraPosition',
          worldVar: 'cena',
          x: { type: 'num', value: 3 },
          y: { type: 'num', value: 2.5 },
          z: { type: 'num', value: 6 },
        },
        {
          type: 'g3d:createPlane',
          varName: 'chao',
          worldVar: 'cena',
          width: 14,
          depth: 14,
          color: '#334155',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'chao',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: -0.2 },
          z: { type: 'num', value: 0 },
        },
        { type: 'g3d:createModel', varName: 'boneco', worldVar: 'cena' },
        {
          type: 'g3d:createSphere',
          varName: 'corpo',
          worldVar: 'cena',
          radius: 0.8,
          color: '#e2e8f0',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'corpo',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 0.8 },
          z: { type: 'num', value: 0 },
        },
        { type: 'g3d:addToModel', modelVar: 'boneco', partVar: 'corpo' },
        {
          type: 'g3d:createSphere',
          varName: 'cabeca',
          worldVar: 'cena',
          radius: 0.5,
          color: '#e2e8f0',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'cabeca',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 1.9 },
          z: { type: 'num', value: 0 },
        },
        { type: 'g3d:addToModel', modelVar: 'boneco', partVar: 'cabeca' },
        {
          type: 'g3d:createCone',
          varName: 'nariz',
          worldVar: 'cena',
          radius: 0.12,
          height: 0.5,
          color: '#f59e0b',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'nariz',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 1.9 },
          z: { type: 'num', value: 0.5 },
        },
        {
          type: 'g3d:setRotation',
          objVar: 'nariz',
          x: { type: 'num', value: 1.5708 },
          y: { type: 'num', value: 0 },
          z: { type: 'num', value: 0 },
        },
        { type: 'g3d:addToModel', modelVar: 'boneco', partVar: 'nariz' },
        {
          type: 'g3d:createCylinder',
          varName: 'chapeu',
          worldVar: 'cena',
          radius: 0.45,
          height: 0.5,
          color: '#0ea5e9',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'chapeu',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 2.55 },
          z: { type: 'num', value: 0 },
        },
        { type: 'g3d:setMaterial', objVar: 'chapeu', kind: 'metal' },
        { type: 'g3d:addToModel', modelVar: 'boneco', partVar: 'chapeu' },
      ],
      events: [],
      loops: [
        {
          type: 'g3d:animate',
          worldVar: 'cena',
          body: [
            {
              type: 'g3d:rotateBy',
              objVar: 'boneco',
              axis: 'y',
              amount: { type: 'num', value: 0.01 },
            },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-3d' }],
  },
}

/**
 * Exemplo bundlado: "Noite enevoada". Mostra a Fase 7 (luz & céu): céu em degradê,
 * neblina, sombras ligadas, uma luz fraca do tipo "lua" e uma luz pontual (tocha)
 * iluminando um cubo que gira sobre o chão.
 */
export const nightExample: ExtensionExample = {
  name: 'Noite enevoada',
  experience: 'demo',
  description:
    'Cena à noite: céu degradê, neblina, sombras e uma luz pontual (tocha) sobre um cubo girando — mostra luz & céu.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 360 }],
    css: centeredCanvasLayout('#05070f'),
    version: 2,
    behavior: {
      start: [
        { type: 'g3d:createScene', canvasId: 'tela', varName: 'cena' },
        { type: 'g3d:setSky', worldVar: 'cena', top: '#0b1026', bottom: '#1e3a5f' },
        { type: 'g3d:setFog', worldVar: 'cena', color: '#1e3a5f', near: 4, far: 22 },
        { type: 'g3d:setShadows', worldVar: 'cena', mode: 'on' },
        { type: 'g3d:addSunLight', worldVar: 'cena', color: '#94a3b8', intensity: 0.35 },
        {
          type: 'g3d:addPointLight',
          worldVar: 'cena',
          color: '#ffd27f',
          intensity: 2.5,
          x: 0,
          y: 3,
          z: 0,
        },
        {
          type: 'g3d:createPlane',
          varName: 'chao',
          worldVar: 'cena',
          width: 30,
          depth: 30,
          color: '#1f2937',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'chao',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: -0.5 },
          z: { type: 'num', value: 0 },
        },
        { type: 'g3d:createBox', varName: 'cubo', worldVar: 'cena', size: 1, color: '#f59e0b' },
        {
          type: 'g3d:setPosition',
          objVar: 'cubo',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 0.5 },
          z: { type: 'num', value: 0 },
        },
      ],
      events: [],
      loops: [
        {
          type: 'g3d:animate',
          worldVar: 'cena',
          body: [
            {
              type: 'g3d:rotateBy',
              objVar: 'cubo',
              axis: 'y',
              amount: { type: 'num', value: 0.02 },
            },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-3d' }],
  },
}

/**
 * Exemplo bundlado: "Enxame que gira". Mostra a Fase 8 (enxames): um cubo "molde"
 * fica escondido e vira 5 cópias num enxame; o "para cada" gira todas a cada quadro.
 */
export const swarmExample: ExtensionExample = {
  name: 'Enxame que gira',
  experience: 'demo',
  description:
    'Um molde escondido vira 5 cópias num enxame, e o "para cada" gira todas juntas — mostra criar enxame, soltar cópias e repetir para cada uma.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 360 }],
    css: centeredCanvasLayout('#0b1020'),
    version: 2,
    behavior: {
      start: [
        { type: 'g3d:createScene', canvasId: 'tela', varName: 'cena' },
        { type: 'g3d:setBackground', worldVar: 'cena', color: '#0b1020' },
        { type: 'g3d:createBox', varName: 'modelo', worldVar: 'cena', size: 0.6, color: '#22d3ee' },
        { type: 'g3d:setVisible', objVar: 'modelo', mode: 'hide' },
        { type: 'g3d:createSwarm', varName: 'enxame', worldVar: 'cena' },
        { type: 'g3d:spawnInSwarm', swarmVar: 'enxame', originalVar: 'modelo', x: -2, y: 0, z: 0 },
        { type: 'g3d:spawnInSwarm', swarmVar: 'enxame', originalVar: 'modelo', x: 0, y: 0.6, z: 0 },
        { type: 'g3d:spawnInSwarm', swarmVar: 'enxame', originalVar: 'modelo', x: 2, y: 0, z: 0 },
        {
          type: 'g3d:spawnInSwarm',
          swarmVar: 'enxame',
          originalVar: 'modelo',
          x: -1,
          y: -1.4,
          z: 0,
        },
        {
          type: 'g3d:spawnInSwarm',
          swarmVar: 'enxame',
          originalVar: 'modelo',
          x: 1,
          y: -1.4,
          z: 0,
        },
      ],
      events: [],
      loops: [
        {
          type: 'g3d:animate',
          worldVar: 'cena',
          body: [
            {
              type: 'g3d:forEachInSwarm',
              swarmVar: 'enxame',
              itemName: 'item',
              body: [
                {
                  type: 'g3d:rotateBy',
                  objVar: 'item',
                  axis: 'y',
                  amount: { type: 'num', value: 0.04 },
                },
              ],
            },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-3d' }],
  },
}

/**
 * Exemplo bundlado: "Desvie dos blocos". Um cubo jogador anda no plano (WASD),
 * pula com gravidade sobre o chão, e a cada 45 quadros nasce 1 bloco inimigo que
 * vem de longe numa velocidade estável — encostar em qualquer um encerra o jogo.
 * A LÓGICA é montada pela criança: "A cada N quadros" solta 1 inimigo, "Atualizar
 * o grupo" move, "Tirar quem saiu da tela" limpa, e "encostou em algum?" encerra.
 */
export const dodgeExample: ExtensionExample = {
  name: 'Desvie dos blocos',
  experience: 'game',
  description:
    'Cubo que anda (WASD), pula e desvia de blocos que aparecem de tempos em tempos. Encostar em um = fim de jogo.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 360 }],
    css: centeredCanvasLayout('#0c4a6e'),
    version: 2,
    behavior: {
      start: [
        { type: 'g3d:createScene', canvasId: 'tela', varName: 'cena' },
        { type: 'g3d:setBackground', worldVar: 'cena', color: '#0c4a6e' },
        {
          type: 'g3d:setCameraPosition',
          worldVar: 'cena',
          x: { type: 'num', value: 4.6 },
          y: { type: 'num', value: 2.7 },
          z: { type: 'num', value: 8 },
        },
        { type: 'g3d:createBox', varName: 'jogador', worldVar: 'cena', size: 1, color: '#34d399' },
        {
          type: 'g3d:createBlock',
          varName: 'chao',
          worldVar: 'cena',
          width: 10,
          height: 0.5,
          depth: 50,
          color: '#0369a1',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'chao',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: -2 },
          z: { type: 'num', value: 0 },
        },
        { type: 'g3d:createGroup', varName: 'inimigos' },
      ],
      events: [],
      loops: [
        {
          type: 'g3d:animate',
          worldVar: 'cena',
          body: [
            { type: 'g3d:controlWithKeys', objVar: 'jogador', speed: 0.05 },
            {
              type: 'if',
              cond: { type: 'g3d:keyDown', key: 'Space' },
              then: [{ type: 'g3d:jump', objVar: 'jogador', force: { type: 'num', value: 0.08 } }],
            },
            { type: 'g3d:applyGravity', objVar: 'jogador', groundVar: 'chao' },
            { type: 'g3d:cameraFollow', worldVar: 'cena', objVar: 'jogador' },
            // Mover o grupo (velocidade + gravidade) e limpar quem saiu da tela.
            { type: 'g3d:updateGroup', groupVar: 'inimigos', groundVar: 'chao' },
            {
              type: 'g3d:pruneOffscreen',
              worldVar: 'cena',
              groupVar: 'inimigos',
              itemName: 'inimigo',
              body: [],
            },
            {
              type: 'if',
              cond: { type: 'g3d:hitAny', objVar: 'jogador', groupVar: 'inimigos' },
              then: [{ type: 'g3d:stop', worldVar: 'cena' }],
            },
          ],
        },
        // IRMÃO do "A cada quadro 3D" (igual ao Jogo 2D): a cada 45 quadros, 1 inimigo.
        {
          type: 'g3d:everyFrames',
          n: 45,
          body: [{ type: 'g3d:spawnEnemy', worldVar: 'cena', groupVar: 'inimigos', speed: 0.1 }],
        },
      ],
    },
    extensions: [{ extensionId: 'game-3d' }],
  },
}

/**
 * Exemplo bundlado: "Atravesse a rua" (Crossy Road / Frogger). Personagem que
 * pula de casa em casa numa grade isométrica, desviando de carros e caminhões
 * que andam e dão a volta. HUD (pontuação, fim de jogo, setas) feito com blocos
 * de HTML/CSS/DOM, ligado ao jogo pelos blocos do Kit Travessia.
 */
export const crossingExample: ExtensionExample = {
  name: 'Atravesse a rua',
  experience: 'game',
  description:
    'Pule de casa em casa numa grade isométrica e desvie dos carros e caminhões. Pontuação e fim de jogo no HUD.',
  ir: {
    html: [
      { type: 'canvas', id: 'jogo', width: 960, height: 540 },
      { type: 'element', tag: 'div', id: 'score', text: '0' },
      {
        type: 'element',
        tag: 'div',
        id: 'controls',
        children: [
          { type: 'element', tag: 'button', id: 'forward', text: '▲' },
          { type: 'element', tag: 'button', id: 'left', text: '◀' },
          { type: 'element', tag: 'button', id: 'backward', text: '▼' },
          { type: 'element', tag: 'button', id: 'right', text: '▶' },
        ],
      },
      {
        type: 'element',
        tag: 'div',
        id: 'result-container',
        children: [
          {
            type: 'element',
            tag: 'div',
            id: 'result',
            children: [
              { type: 'element', tag: 'h1', text: 'Fim de jogo' },
              {
                type: 'element',
                tag: 'p',
                children: [
                  { type: 'text', text: 'Pontos: ' },
                  { type: 'element', tag: 'span', id: 'final-score' },
                ],
              },
              { type: 'element', tag: 'button', id: 'retry', text: 'Recomeçar' },
            ],
          },
        ],
      },
    ],
    css: [
      { type: 'googleFont', family: 'Press Start 2P' },
      {
        selector: 'body',
        declarations: {
          margin: '0',
          overflow: 'hidden',
          'font-family': '"Press Start 2P", cursive',
        },
      },
      {
        selector: 'canvas',
        declarations: { display: 'block', width: '100vw', height: '100vh' },
      },
      {
        selector: '#score',
        declarations: {
          position: 'absolute',
          top: '20px',
          left: '20px',
          'font-size': '1.5em',
          color: 'white',
        },
      },
      {
        selector: '#controls',
        declarations: {
          position: 'absolute',
          bottom: '20px',
          left: '0',
          'min-width': '100%',
          display: 'grid',
          'grid-template-columns': '50px 50px 50px',
          gap: '10px',
          'justify-content': 'center',
        },
      },
      { selector: '#forward', declarations: { 'grid-column': '1 / -1' } },
      {
        selector: '#controls button',
        declarations: {
          height: '40px',
          'background-color': 'white',
          border: '1px solid lightgray',
          cursor: 'pointer',
        },
      },
      {
        selector: '#result-container',
        declarations: {
          position: 'absolute',
          top: '0',
          left: '0',
          'min-width': '100%',
          'min-height': '100%',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          visibility: 'hidden',
        },
      },
      { selector: '#result-container.visivel', declarations: { visibility: 'visible' } },
      {
        selector: '#result',
        declarations: {
          display: 'flex',
          'flex-direction': 'column',
          'align-items': 'center',
          'background-color': 'white',
          padding: '20px',
        },
      },
      {
        selector: '#result button',
        declarations: {
          'background-color': '#ee2233',
          color: 'white',
          padding: '16px 32px',
          'font-family': 'inherit',
          cursor: 'pointer',
        },
      },
    ],
    version: 2,
    behavior: {
      start: [
        { type: 'g3d:createCrossingScene', canvasId: 'jogo', varName: 'mundo' },
        { type: 'g3d:createCrosser', varName: 'jogador', worldVar: 'mundo', color: '#ffffff' },
        { type: 'g3d:generateRows', worldVar: 'mundo', count: 20 },
      ],
      events: [
        {
          type: 'event',
          target: 'forward',
          targetKind: 'id',
          event: 'click',
          body: [{ type: 'g3d:crosserMove', objVar: 'jogador', direction: 'forward' }],
        },
        {
          type: 'event',
          target: 'backward',
          targetKind: 'id',
          event: 'click',
          body: [{ type: 'g3d:crosserMove', objVar: 'jogador', direction: 'backward' }],
        },
        {
          type: 'event',
          target: 'left',
          targetKind: 'id',
          event: 'click',
          body: [{ type: 'g3d:crosserMove', objVar: 'jogador', direction: 'left' }],
        },
        {
          type: 'event',
          target: 'right',
          targetKind: 'id',
          event: 'click',
          body: [{ type: 'g3d:crosserMove', objVar: 'jogador', direction: 'right' }],
        },
        {
          type: 'event',
          target: 'retry',
          targetKind: 'id',
          event: 'click',
          body: [
            { type: 'g3d:crosserReset', objVar: 'jogador', worldVar: 'mundo' },
            { type: 'classOp', targetId: 'result-container', op: 'remove', className: 'visivel' },
          ],
        },
      ],
      loops: [
        {
          type: 'g3d:animate',
          worldVar: 'mundo',
          body: [
            { type: 'g3d:crosserStep', objVar: 'jogador', worldVar: 'mundo' },
            { type: 'g3d:moveTraffic', worldVar: 'mundo' },
            {
              type: 'setProperty',
              targetId: 'score',
              property: 'textContent',
              value: { type: 'g3d:crosserRow', objVar: 'jogador' },
            },
            {
              type: 'if',
              cond: { type: 'g3d:crosserHit', objVar: 'jogador', worldVar: 'mundo' },
              then: [
                { type: 'classOp', targetId: 'result-container', op: 'add', className: 'visivel' },
                {
                  type: 'setProperty',
                  targetId: 'final-score',
                  property: 'textContent',
                  value: { type: 'g3d:crosserRow', objVar: 'jogador' },
                },
              ],
            },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-3d' }],
  },
}

/**
 * Exemplo bundlado: "Corrida maluca" (corrida top-down). Carro que dá voltas numa
 * pista oval controlado por acelerar/frear (↑/↓), desviando de carros e caminhões
 * rivais; pontuação = voltas. Câmera aérea. HUD (placar, botões, fim de jogo) com
 * blocos HTML/CSS/DOM ligado pelos blocos do Kit Corrida.
 */
export const raceExample: ExtensionExample = {
  name: 'Corrida maluca',
  experience: 'game',
  description:
    'Dê voltas na pista (↑ acelera, ↓ freia) desviando dos rivais. A pontuação são as voltas completas.',
  ir: {
    html: [
      { type: 'canvas', id: 'pista', width: 960, height: 540 },
      { type: 'element', tag: 'div', id: 'score', text: '0' },
      {
        type: 'element',
        tag: 'div',
        id: 'buttons',
        children: [
          { type: 'element', tag: 'button', id: 'accelerate', text: '▲ Acelerar' },
          { type: 'element', tag: 'button', id: 'brake', text: '▼ Frear' },
        ],
      },
      {
        type: 'element',
        tag: 'div',
        id: 'results',
        children: [
          {
            type: 'element',
            tag: 'div',
            id: 'results-box',
            children: [
              { type: 'element', tag: 'h1', text: 'Fim de jogo' },
              {
                type: 'element',
                tag: 'p',
                children: [
                  { type: 'text', text: 'Voltas: ' },
                  { type: 'element', tag: 'span', id: 'final-laps' },
                ],
              },
              { type: 'element', tag: 'button', id: 'retry', text: 'Recomeçar' },
            ],
          },
        ],
      },
    ],
    css: [
      { type: 'googleFont', family: 'Press Start 2P' },
      {
        selector: 'body',
        declarations: {
          margin: '0',
          overflow: 'hidden',
          'font-family': '"Press Start 2P", cursive',
        },
      },
      {
        selector: 'canvas',
        declarations: { display: 'block', width: '100vw', height: '100vh' },
      },
      {
        selector: '#score',
        declarations: {
          position: 'absolute',
          top: '20px',
          left: '20px',
          'font-size': '1.5em',
          color: 'white',
        },
      },
      {
        selector: '#buttons',
        declarations: {
          position: 'absolute',
          bottom: '20px',
          left: '0',
          'min-width': '100%',
          display: 'flex',
          gap: '10px',
          'justify-content': 'center',
        },
      },
      {
        selector: '#buttons button',
        declarations: {
          height: '44px',
          'background-color': 'white',
          border: '1px solid lightgray',
          cursor: 'pointer',
        },
      },
      {
        selector: '#results',
        declarations: {
          position: 'absolute',
          top: '0',
          left: '0',
          'min-width': '100%',
          'min-height': '100%',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          visibility: 'hidden',
        },
      },
      { selector: '#results.visivel', declarations: { visibility: 'visible' } },
      {
        selector: '#results-box',
        declarations: {
          display: 'flex',
          'flex-direction': 'column',
          'align-items': 'center',
          'background-color': 'white',
          padding: '20px',
        },
      },
      {
        selector: '#results-box button',
        declarations: {
          'background-color': '#ee2233',
          color: 'white',
          padding: '16px 32px',
          'font-family': 'inherit',
          cursor: 'pointer',
        },
      },
    ],
    version: 2,
    behavior: {
      start: [
        { type: 'g3d:createRaceScene', canvasId: 'pista', varName: 'mundo' },
        { type: 'g3d:createRaceTrack', worldVar: 'mundo' },
        { type: 'g3d:createRaceCar', varName: 'carro', worldVar: 'mundo', color: '#ef2d56' },
      ],
      events: [
        {
          type: 'event',
          target: 'accelerate',
          targetKind: 'id',
          event: 'click',
          body: [{ type: 'g3d:raceControl', objVar: 'carro', mode: 'accelerate' }],
        },
        {
          type: 'event',
          target: 'brake',
          targetKind: 'id',
          event: 'click',
          body: [{ type: 'g3d:raceControl', objVar: 'carro', mode: 'decelerate' }],
        },
        {
          type: 'event',
          target: 'retry',
          targetKind: 'id',
          event: 'click',
          body: [
            { type: 'g3d:raceReset', objVar: 'carro', worldVar: 'mundo' },
            { type: 'classOp', targetId: 'results', op: 'remove', className: 'visivel' },
          ],
        },
      ],
      loops: [
        {
          type: 'g3d:animate',
          worldVar: 'mundo',
          body: [
            { type: 'g3d:raceStep', objVar: 'carro', worldVar: 'mundo' },
            { type: 'g3d:runRivals', worldVar: 'mundo' },
            {
              type: 'setProperty',
              targetId: 'score',
              property: 'textContent',
              value: { type: 'g3d:raceLaps', objVar: 'carro' },
            },
            {
              type: 'if',
              cond: { type: 'g3d:raceHit', objVar: 'carro', worldVar: 'mundo' },
              then: [
                { type: 'classOp', targetId: 'results', op: 'add', className: 'visivel' },
                {
                  type: 'setProperty',
                  targetId: 'final-laps',
                  property: 'textContent',
                  value: { type: 'g3d:raceLaps', objVar: 'carro' },
                },
              ],
            },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-3d' }],
  },
}

export const stackExample: ExtensionExample = {
  name: 'Torre maluca',
  experience: 'game',
  description:
    'Empilhe os blocos! Clique em "Soltar" na hora certa: a parte que encaixa fica, a sobra cai. A pontuação são os andares.',
  ir: {
    html: [
      { type: 'canvas', id: 'jogo', width: 960, height: 540 },
      { type: 'element', tag: 'div', id: 'score', text: '0' },
      {
        type: 'element',
        tag: 'div',
        id: 'buttons',
        children: [{ type: 'element', tag: 'button', id: 'drop', text: 'Soltar bloco' }],
      },
      {
        type: 'element',
        tag: 'div',
        id: 'results',
        children: [
          {
            type: 'element',
            tag: 'div',
            id: 'results-box',
            children: [
              { type: 'element', tag: 'h1', text: 'Fim de jogo' },
              {
                type: 'element',
                tag: 'p',
                children: [
                  { type: 'text', text: 'Andares: ' },
                  { type: 'element', tag: 'span', id: 'final-score' },
                ],
              },
              { type: 'element', tag: 'button', id: 'retry', text: 'Recomeçar' },
            ],
          },
        ],
      },
    ],
    css: [
      { type: 'googleFont', family: 'Press Start 2P' },
      {
        selector: 'body',
        declarations: {
          margin: '0',
          overflow: 'hidden',
          'font-family': '"Press Start 2P", cursive',
        },
      },
      {
        selector: 'canvas',
        declarations: { display: 'block', width: '100vw', height: '100vh' },
      },
      {
        selector: '#score',
        declarations: {
          position: 'absolute',
          top: '20px',
          left: '20px',
          'font-size': '2em',
          color: '#7a4b12',
        },
      },
      {
        selector: '#buttons',
        declarations: {
          position: 'absolute',
          bottom: '20px',
          left: '0',
          'min-width': '100%',
          display: 'flex',
          'justify-content': 'center',
        },
      },
      {
        selector: '#buttons button',
        declarations: {
          height: '52px',
          padding: '0 28px',
          'background-color': '#14b8a6',
          color: 'white',
          border: 'none',
          'font-family': 'inherit',
          cursor: 'pointer',
        },
      },
      {
        selector: '#results',
        declarations: {
          position: 'absolute',
          top: '0',
          left: '0',
          'min-width': '100%',
          'min-height': '100%',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          visibility: 'hidden',
        },
      },
      { selector: '#results.visivel', declarations: { visibility: 'visible' } },
      {
        selector: '#results-box',
        declarations: {
          display: 'flex',
          'flex-direction': 'column',
          'align-items': 'center',
          'background-color': 'white',
          padding: '20px',
        },
      },
      {
        selector: '#results-box button',
        declarations: {
          'background-color': '#14b8a6',
          color: 'white',
          padding: '16px 32px',
          'font-family': 'inherit',
          cursor: 'pointer',
        },
      },
    ],
    version: 2,
    behavior: {
      start: [
        { type: 'g3d:createStackScene', canvasId: 'jogo', varName: 'torre' },
        { type: 'g3d:createStackTower', worldVar: 'torre' },
      ],
      events: [
        {
          type: 'event',
          target: 'drop',
          targetKind: 'id',
          event: 'click',
          body: [{ type: 'g3d:stackDrop', worldVar: 'torre' }],
        },
        {
          type: 'event',
          target: 'retry',
          targetKind: 'id',
          event: 'click',
          body: [
            { type: 'g3d:stackReset', worldVar: 'torre' },
            { type: 'classOp', targetId: 'results', op: 'remove', className: 'visivel' },
          ],
        },
      ],
      loops: [
        {
          type: 'g3d:animate',
          worldVar: 'torre',
          body: [
            { type: 'g3d:stackStep', worldVar: 'torre' },
            {
              type: 'setProperty',
              targetId: 'score',
              property: 'textContent',
              value: { type: 'g3d:stackScore', worldVar: 'torre' },
            },
            {
              type: 'if',
              cond: { type: 'g3d:stackGameOver', worldVar: 'torre' },
              then: [
                { type: 'classOp', targetId: 'results', op: 'add', className: 'visivel' },
                {
                  type: 'setProperty',
                  targetId: 'final-score',
                  property: 'textContent',
                  value: { type: 'g3d:stackScore', worldVar: 'torre' },
                },
              ],
            },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-3d' }],
  },
}

/**
 * Exemplo bundlado: "Corrida Infinita 3D" (nível 1 da família Corrida Infinita,
 * recriação do runner 3D do curso Clear Code): o herói fica PARADO no eixo Z e o
 * mundo vem até ele. Diferente do "Desvie dos blocos" (andar livre + WASD), aqui
 * há 3 PISTAS fixas (setas trocam, com deslize suave), pulo com espaço/seta para
 * cima, obstáculos que nascem longe numa pista sorteada via enxame, placar por
 * TEMPO de sobrevivência no HUD e velocidade que cresce a cada segundo.
 */
export const corridaInfinitaExample: ExtensionExample = {
  name: 'Corrida Infinita 3D',
  experience: 'game',
  description:
    'Você corre parado: o mundo vem até você! Troque de pista com as setas, pule com espaço e desvie das caixas, que ficam cada vez mais rápidas. O placar conta seus segundos de sobrevivência.',
  ir: {
    html: [
      {
        type: 'element',
        tag: 'div',
        id: 'score',
        text: '0',
      },
      {
        type: 'element',
        tag: 'div',
        id: 'hint',
        text: 'Setas: trocar de pista. Espaço ou seta para cima: pular.',
      },
      {
        type: 'element',
        tag: 'div',
        id: 'results',
        children: [
          {
            type: 'element',
            tag: 'div',
            id: 'results-box',
            children: [
              {
                type: 'element',
                tag: 'h1',
                text: 'Bateu!',
              },
              {
                type: 'element',
                tag: 'p',
                children: [
                  {
                    type: 'text',
                    text: 'Você sobreviveu ',
                  },
                  {
                    type: 'element',
                    tag: 'span',
                    id: 'final-score',
                  },
                  {
                    type: 'text',
                    text: ' segundos',
                  },
                ],
              },
              {
                type: 'element',
                tag: 'button',
                id: 'retry',
                text: 'Recomeçar',
              },
            ],
          },
        ],
      },
    ],
    css: [
      {
        type: 'googleFont',
        family: 'Press Start 2P',
      },
      {
        selector: 'body',
        declarations: {
          margin: '0',
          overflow: 'hidden',
          'font-family': '"Press Start 2P", cursive',
        },
      },
      {
        selector: '#score',
        declarations: {
          position: 'absolute',
          top: '20px',
          left: '20px',
          'font-size': '2em',
          color: 'white',
          'z-index': '1',
        },
      },
      {
        selector: '#hint',
        declarations: {
          position: 'absolute',
          bottom: '20px',
          left: '0',
          'min-width': '100%',
          'text-align': 'center',
          'font-size': '0.7em',
          color: 'white',
          'z-index': '1',
        },
      },
      {
        selector: '#results',
        declarations: {
          position: 'absolute',
          top: '0',
          left: '0',
          'min-width': '100%',
          'min-height': '100%',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          visibility: 'hidden',
          'z-index': '1',
        },
      },
      {
        selector: '#results.visivel',
        declarations: {
          visibility: 'visible',
        },
      },
      {
        selector: '#results-box',
        declarations: {
          display: 'flex',
          'flex-direction': 'column',
          'align-items': 'center',
          'background-color': 'white',
          padding: '20px',
        },
      },
      {
        selector: '#results-box button',
        declarations: {
          'background-color': '#f43f5e',
          color: 'white',
          padding: '16px 32px',
          'font-family': 'inherit',
          cursor: 'pointer',
          border: 'none',
        },
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g3d:createFullscreenScene',
          varName: 'cena',
          bg: '#38bdf8',
        },
        {
          type: 'g3d:setSky',
          worldVar: 'cena',
          top: '#0ea5e9',
          bottom: '#fde68a',
        },
        {
          type: 'g3d:setFog',
          worldVar: 'cena',
          color: '#7dd3fc',
          near: {
            type: 'num',
            value: 24,
          },
          far: {
            type: 'num',
            value: 70,
          },
        },
        {
          type: 'g3d:setCameraPosition',
          worldVar: 'cena',
          x: {
            type: 'num',
            value: 0,
          },
          y: {
            type: 'num',
            value: 3.4,
          },
          z: {
            type: 'num',
            value: 7,
          },
        },
        {
          type: 'g3d:createBlock',
          varName: 'chao',
          worldVar: 'cena',
          width: {
            type: 'num',
            value: 9,
          },
          height: {
            type: 'num',
            value: 1,
          },
          depth: {
            type: 'num',
            value: 90,
          },
          color: '#334155',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'chao',
          x: {
            type: 'num',
            value: 0,
          },
          y: {
            type: 'num',
            value: -1,
          },
          z: {
            type: 'num',
            value: -30,
          },
        },
        {
          type: 'g3d:createBlock',
          varName: 'faixaEsquerda',
          worldVar: 'cena',
          width: {
            type: 'num',
            value: 0.12,
          },
          height: {
            type: 'num',
            value: 0.04,
          },
          depth: {
            type: 'num',
            value: 90,
          },
          color: '#f8fafc',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'faixaEsquerda',
          x: {
            type: 'num',
            value: -1.1,
          },
          y: {
            type: 'num',
            value: -0.47,
          },
          z: {
            type: 'num',
            value: -30,
          },
        },
        {
          type: 'g3d:createBlock',
          varName: 'faixaDireita',
          worldVar: 'cena',
          width: {
            type: 'num',
            value: 0.12,
          },
          height: {
            type: 'num',
            value: 0.04,
          },
          depth: {
            type: 'num',
            value: 90,
          },
          color: '#f8fafc',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'faixaDireita',
          x: {
            type: 'num',
            value: 1.1,
          },
          y: {
            type: 'num',
            value: -0.47,
          },
          z: {
            type: 'num',
            value: -30,
          },
        },
        {
          type: 'g3d:createBox',
          varName: 'heroi',
          worldVar: 'cena',
          size: {
            type: 'num',
            value: 1,
          },
          color: '#34d399',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'heroi',
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
          type: 'g3d:createBox',
          varName: 'molde',
          worldVar: 'cena',
          size: {
            type: 'num',
            value: 1.1,
          },
          color: '#f43f5e',
        },
        {
          type: 'g3d:setVisible',
          objVar: 'molde',
          mode: 'hide',
        },
        {
          type: 'g3d:createSwarm',
          varName: 'obstaculos',
          worldVar: 'cena',
        },
        {
          type: 'var',
          name: 'pista',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'sorteio',
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
            value: 0.14,
          },
        },
        {
          type: 'var',
          name: 'tempo',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'rodando',
          value: {
            type: 'bool',
            value: true,
          },
        },
      ],
      events: [
        {
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'keydown',
          body: [
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'eventProp',
                  prop: 'key',
                },
                right: {
                  type: 'str',
                  value: 'ArrowLeft',
                },
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'var',
                      name: 'pista',
                    },
                    right: {
                      type: 'num',
                      value: -1,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'pista',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'var',
                          name: 'pista',
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
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'eventProp',
                  prop: 'key',
                },
                right: {
                  type: 'str',
                  value: 'ArrowRight',
                },
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: {
                      type: 'var',
                      name: 'pista',
                    },
                    right: {
                      type: 'num',
                      value: 1,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'pista',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'pista',
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
        {
          type: 'event',
          target: 'retry',
          event: 'click',
          body: [
            {
              type: 'g3d:forEachInSwarm',
              swarmVar: 'obstaculos',
              itemName: 'item',
              body: [
                {
                  type: 'g3d:removeFromSwarm',
                  swarmVar: 'obstaculos',
                  itemVar: 'item',
                },
              ],
            },
            {
              type: 'assign',
              name: 'pista',
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
                value: 0.14,
              },
            },
            {
              type: 'assign',
              name: 'tempo',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'setProperty',
              targetId: 'score',
              property: 'textContent',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'classOp',
              targetId: 'results',
              op: 'remove',
              className: 'visivel',
            },
            {
              type: 'assign',
              name: 'rodando',
              value: {
                type: 'bool',
                value: true,
              },
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g3d:animate',
          worldVar: 'cena',
          body: [
            {
              type: 'if',
              cond: {
                type: 'var',
                name: 'rodando',
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'logical',
                    op: '||',
                    left: {
                      type: 'g3d:keyDown',
                      key: 'Space',
                    },
                    right: {
                      type: 'g3d:keyDown',
                      key: 'ArrowUp',
                    },
                  },
                  then: [
                    {
                      type: 'g3d:jump',
                      objVar: 'heroi',
                      force: {
                        type: 'num',
                        value: 0.09,
                      },
                    },
                  ],
                },
                {
                  type: 'g3d:applyGravity',
                  objVar: 'heroi',
                  groundVar: 'chao',
                },
                {
                  type: 'g3d:moveTowards',
                  objVar: 'heroi',
                  x: {
                    type: 'binop',
                    op: '*',
                    left: {
                      type: 'var',
                      name: 'pista',
                    },
                    right: {
                      type: 'num',
                      value: 2.2,
                    },
                  },
                  y: {
                    type: 'g3d:getPos',
                    objVar: 'heroi',
                    axis: 'y',
                  },
                  z: {
                    type: 'num',
                    value: 0,
                  },
                  factor: {
                    type: 'num',
                    value: 0.25,
                  },
                },
                {
                  type: 'g3d:forEachInSwarm',
                  swarmVar: 'obstaculos',
                  itemName: 'item',
                  body: [
                    {
                      type: 'g3d:moveBy',
                      objVar: 'item',
                      x: {
                        type: 'num',
                        value: 0,
                      },
                      y: {
                        type: 'num',
                        value: 0,
                      },
                      z: {
                        type: 'var',
                        name: 'velocidade',
                      },
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'g3d:collides',
                        aVar: 'heroi',
                        bVar: 'item',
                      },
                      then: [
                        {
                          type: 'assign',
                          name: 'rodando',
                          value: {
                            type: 'bool',
                            value: false,
                          },
                        },
                        {
                          type: 'g3d:playEffect',
                          kind: 'hit',
                        },
                        {
                          type: 'setProperty',
                          targetId: 'final-score',
                          property: 'textContent',
                          value: {
                            type: 'var',
                            name: 'tempo',
                          },
                        },
                        {
                          type: 'classOp',
                          targetId: 'results',
                          op: 'add',
                          className: 'visivel',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'g3d:pruneSwarm',
                  swarmVar: 'obstaculos',
                  axis: 'z',
                  min: {
                    type: 'num',
                    value: -80,
                  },
                  max: {
                    type: 'num',
                    value: 6,
                  },
                },
                {
                  type: 'setProperty',
                  targetId: 'score',
                  property: 'textContent',
                  value: {
                    type: 'var',
                    name: 'tempo',
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'g3d:everySeconds',
          secs: {
            type: 'num',
            value: 1,
          },
          body: [
            {
              type: 'if',
              cond: {
                type: 'var',
                name: 'rodando',
              },
              then: [
                {
                  type: 'assign',
                  name: 'tempo',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'tempo',
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
                      value: 0.005,
                    },
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'var',
                      name: 'velocidade',
                    },
                    right: {
                      type: 'num',
                      value: 0.56,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'velocidade',
                      value: {
                        type: 'num',
                        value: 0.56,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'g3d:everySeconds',
          secs: {
            type: 'num',
            value: 0.9,
          },
          body: [
            {
              type: 'if',
              cond: {
                type: 'var',
                name: 'rodando',
              },
              then: [
                {
                  type: 'assign',
                  name: 'sorteio',
                  value: {
                    type: 'binop',
                    op: '-',
                    left: {
                      type: 'mathUnary',
                      fn: 'floor',
                      arg: {
                        type: 'binop',
                        op: '*',
                        left: {
                          type: 'randomFloat',
                        },
                        right: {
                          type: 'num',
                          value: 3,
                        },
                      },
                    },
                    right: {
                      type: 'num',
                      value: 1,
                    },
                  },
                },
                {
                  type: 'g3d:spawnInSwarm',
                  swarmVar: 'obstaculos',
                  originalVar: 'molde',
                  x: {
                    type: 'binop',
                    op: '*',
                    left: {
                      type: 'var',
                      name: 'sorteio',
                    },
                    right: {
                      type: 'num',
                      value: 2.2,
                    },
                  },
                  y: {
                    type: 'num',
                    value: 0.05,
                  },
                  z: {
                    type: 'num',
                    value: -60,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    extensions: [
      {
        extensionId: 'game-3d',
      },
    ],
  },
}

/**
 * Exemplo bundlado: "Labirinto dos Robôs" (nível 1 da família Labirinto, um FPS
 * estilo Doom básico): câmera em primeira pessoa presa ao jogador (clique trava
 * o mouse), labirinto de paredes SÓLIDAS seguradas pela física de corpo, robôs
 * em enxame que perseguem com moveTowards (velocidade por tipo) e tiro por MIRA
 * no clique via aimAhead. Sob pointer lock o mouse interno congela, então
 * pickAtMouse/pointerOver são banidos aqui; sem lock o jogo segue de pé (WASD
 * anda pelo fpsControls e o HUD funciona). Gerado por __gen_labirintoRobos.ts.
 */
export const labirintoRobosExample: ExtensionExample = {
  name: 'Labirinto dos Robôs',
  experience: 'game',
  description:
    'Um labirinto em primeira pessoa: clique para travar a mira, ande com WASD e gire com o mouse. Robôs brilhantes te perseguem! Mire e atire com o clique antes que a vida acabe.',
  ir: {
    html: [
      {
        type: 'element',
        tag: 'div',
        id: 'vida-caixa',
        children: [
          {
            type: 'text',
            text: 'Vida ',
          },
          {
            type: 'element',
            tag: 'span',
            id: 'vida',
            text: '3',
          },
        ],
      },
      {
        type: 'element',
        tag: 'div',
        id: 'placar-caixa',
        children: [
          {
            type: 'text',
            text: 'Pontos ',
          },
          {
            type: 'element',
            tag: 'span',
            id: 'placar',
            text: '0',
          },
        ],
      },
      {
        type: 'element',
        tag: 'div',
        id: 'mira',
        text: '+',
      },
      {
        type: 'element',
        tag: 'div',
        id: 'dano',
      },
      {
        type: 'element',
        tag: 'div',
        id: 'hint',
        text: 'Clique para mirar. WASD anda, o mouse gira, o clique atira. R recomeça.',
      },
      {
        type: 'element',
        tag: 'div',
        id: 'fim',
        children: [
          {
            type: 'element',
            tag: 'div',
            id: 'fim-caixa',
            children: [
              {
                type: 'element',
                tag: 'h1',
                id: 'fim-titulo',
                text: 'Fim de jogo',
              },
              {
                type: 'element',
                tag: 'p',
                children: [
                  {
                    type: 'text',
                    text: 'Pontos: ',
                  },
                  {
                    type: 'element',
                    tag: 'span',
                    id: 'final-pontos',
                  },
                ],
              },
              {
                type: 'element',
                tag: 'button',
                id: 'retry',
                text: 'Recomeçar',
              },
            ],
          },
        ],
      },
    ],
    css: [
      {
        type: 'googleFont',
        family: 'Press Start 2P',
      },
      {
        selector: 'body',
        declarations: {
          margin: '0',
          overflow: 'hidden',
          'font-family': '"Press Start 2P", cursive',
        },
      },
      {
        selector: '#vida-caixa',
        declarations: {
          position: 'absolute',
          top: '20px',
          left: '20px',
          'font-size': '1em',
          color: 'white',
          'z-index': '2',
        },
      },
      {
        selector: '#placar-caixa',
        declarations: {
          position: 'absolute',
          top: '20px',
          right: '20px',
          'font-size': '1em',
          color: 'white',
          'z-index': '2',
        },
      },
      {
        selector: '#mira',
        declarations: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          'font-size': '1.6em',
          'pointer-events': 'none',
          'z-index': '2',
        },
      },
      {
        selector: '#dano',
        declarations: {
          position: 'absolute',
          top: '0',
          left: '0',
          'min-width': '100%',
          'min-height': '100%',
          'background-color': '#dc2626',
          opacity: '0',
          transition: 'opacity 0.3s',
          'pointer-events': 'none',
          'z-index': '1',
        },
      },
      {
        selector: '#hint',
        declarations: {
          position: 'absolute',
          bottom: '20px',
          left: '0',
          'min-width': '100%',
          'text-align': 'center',
          'font-size': '0.7em',
          color: 'white',
          'z-index': '2',
        },
      },
      {
        selector: '#fim',
        declarations: {
          position: 'absolute',
          top: '0',
          left: '0',
          'min-width': '100%',
          'min-height': '100%',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          visibility: 'hidden',
          'z-index': '3',
        },
      },
      {
        selector: '#fim.visivel',
        declarations: {
          visibility: 'visible',
        },
      },
      {
        selector: '#fim-caixa',
        declarations: {
          display: 'flex',
          'flex-direction': 'column',
          'align-items': 'center',
          'background-color': 'white',
          padding: '20px',
          'text-align': 'center',
        },
      },
      {
        selector: '#fim-caixa button',
        declarations: {
          'background-color': '#7c3aed',
          color: 'white',
          padding: '16px 32px',
          'font-family': 'inherit',
          cursor: 'pointer',
          border: 'none',
        },
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g3d:createFullscreenScene',
          varName: 'cena',
          bg: '#0f172a',
        },
        {
          type: 'g3d:setSky',
          worldVar: 'cena',
          top: '#1e293b',
          bottom: '#475569',
        },
        {
          type: 'g3d:setFog',
          worldVar: 'cena',
          color: '#0f172a',
          near: {
            type: 'num',
            value: 6,
          },
          far: {
            type: 'num',
            value: 26,
          },
        },
        {
          type: 'g3d:createBlock',
          varName: 'chao',
          worldVar: 'cena',
          width: {
            type: 'num',
            value: 18,
          },
          height: {
            type: 'num',
            value: 1,
          },
          depth: {
            type: 'num',
            value: 18,
          },
          color: '#1f2937',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'chao',
          x: {
            type: 'num',
            value: 0,
          },
          y: {
            type: 'num',
            value: -1,
          },
          z: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'g3d:setSolid',
          objVar: 'chao',
        },
        {
          type: 'g3d:createBox',
          varName: 'jogador',
          worldVar: 'cena',
          size: {
            type: 'num',
            value: 1,
          },
          color: '#38bdf8',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'jogador',
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
            value: 6,
          },
        },
        {
          type: 'g3d:body',
          objVar: 'jogador',
          gravity: {
            type: 'num',
            value: -0.02,
          },
        },
        {
          type: 'g3d:createBlock',
          varName: 'paredeNorte',
          worldVar: 'cena',
          width: {
            type: 'num',
            value: 18,
          },
          height: {
            type: 'num',
            value: 3,
          },
          depth: {
            type: 'num',
            value: 1,
          },
          color: '#7c3aed',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'paredeNorte',
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
            value: -8.5,
          },
        },
        {
          type: 'g3d:setSolid',
          objVar: 'paredeNorte',
        },
        {
          type: 'g3d:createBlock',
          varName: 'paredeSul',
          worldVar: 'cena',
          width: {
            type: 'num',
            value: 18,
          },
          height: {
            type: 'num',
            value: 3,
          },
          depth: {
            type: 'num',
            value: 1,
          },
          color: '#7c3aed',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'paredeSul',
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
            value: 8.5,
          },
        },
        {
          type: 'g3d:setSolid',
          objVar: 'paredeSul',
        },
        {
          type: 'g3d:createBlock',
          varName: 'paredeOeste',
          worldVar: 'cena',
          width: {
            type: 'num',
            value: 1,
          },
          height: {
            type: 'num',
            value: 3,
          },
          depth: {
            type: 'num',
            value: 18,
          },
          color: '#7c3aed',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'paredeOeste',
          x: {
            type: 'num',
            value: -8.5,
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
          type: 'g3d:setSolid',
          objVar: 'paredeOeste',
        },
        {
          type: 'g3d:createBlock',
          varName: 'paredeLeste',
          worldVar: 'cena',
          width: {
            type: 'num',
            value: 1,
          },
          height: {
            type: 'num',
            value: 3,
          },
          depth: {
            type: 'num',
            value: 18,
          },
          color: '#7c3aed',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'paredeLeste',
          x: {
            type: 'num',
            value: 8.5,
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
          type: 'g3d:setSolid',
          objVar: 'paredeLeste',
        },
        {
          type: 'g3d:createBlock',
          varName: 'muroNorte',
          worldVar: 'cena',
          width: {
            type: 'num',
            value: 12,
          },
          height: {
            type: 'num',
            value: 3,
          },
          depth: {
            type: 'num',
            value: 1,
          },
          color: '#6d28d9',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'muroNorte',
          x: {
            type: 'num',
            value: -2,
          },
          y: {
            type: 'num',
            value: 1,
          },
          z: {
            type: 'num',
            value: -3,
          },
        },
        {
          type: 'g3d:setSolid',
          objVar: 'muroNorte',
        },
        {
          type: 'g3d:createBlock',
          varName: 'muroSul',
          worldVar: 'cena',
          width: {
            type: 'num',
            value: 12,
          },
          height: {
            type: 'num',
            value: 3,
          },
          depth: {
            type: 'num',
            value: 1,
          },
          color: '#6d28d9',
        },
        {
          type: 'g3d:setPosition',
          objVar: 'muroSul',
          x: {
            type: 'num',
            value: 2,
          },
          y: {
            type: 'num',
            value: 1,
          },
          z: {
            type: 'num',
            value: 2,
          },
        },
        {
          type: 'g3d:setSolid',
          objVar: 'muroSul',
        },
        {
          type: 'g3d:fpsCamera',
          worldVar: 'cena',
          objVar: 'jogador',
        },
        {
          type: 'g3d:createBox',
          varName: 'moldeLento',
          worldVar: 'cena',
          size: {
            type: 'num',
            value: 1,
          },
          color: '#f43f5e',
        },
        {
          type: 'g3d:setMaterial',
          objVar: 'moldeLento',
          kind: 'glow',
        },
        {
          type: 'g3d:setVisible',
          objVar: 'moldeLento',
          mode: 'hide',
        },
        {
          type: 'g3d:createBox',
          varName: 'moldeRapido',
          worldVar: 'cena',
          size: {
            type: 'num',
            value: 0.7,
          },
          color: '#f59e0b',
        },
        {
          type: 'g3d:setMaterial',
          objVar: 'moldeRapido',
          kind: 'glow',
        },
        {
          type: 'g3d:setVisible',
          objVar: 'moldeRapido',
          mode: 'hide',
        },
        {
          type: 'g3d:createSwarm',
          varName: 'robosLentos',
          worldVar: 'cena',
        },
        {
          type: 'g3d:createSwarm',
          varName: 'robosRapidos',
          worldVar: 'cena',
        },
        {
          type: 'var',
          name: 'vida',
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
          name: 'recarga',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'encostou',
          value: {
            type: 'bool',
            value: false,
          },
        },
        {
          type: 'var',
          name: 'rodando',
          value: {
            type: 'bool',
            value: true,
          },
        },
        {
          type: 'funcDecl',
          name: 'recomecar',
          params: [],
          body: [
            {
              type: 'g3d:forEachInSwarm',
              swarmVar: 'robosLentos',
              itemName: 'item',
              body: [
                {
                  type: 'g3d:removeFromSwarm',
                  swarmVar: 'robosLentos',
                  itemVar: 'item',
                },
              ],
            },
            {
              type: 'g3d:forEachInSwarm',
              swarmVar: 'robosRapidos',
              itemName: 'item',
              body: [
                {
                  type: 'g3d:removeFromSwarm',
                  swarmVar: 'robosRapidos',
                  itemVar: 'item',
                },
              ],
            },
            {
              type: 'g3d:spawnInSwarm',
              swarmVar: 'robosLentos',
              originalVar: 'moldeLento',
              x: {
                type: 'num',
                value: -5,
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
              type: 'g3d:spawnInSwarm',
              swarmVar: 'robosLentos',
              originalVar: 'moldeLento',
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
                value: -6,
              },
            },
            {
              type: 'g3d:spawnInSwarm',
              swarmVar: 'robosLentos',
              originalVar: 'moldeLento',
              x: {
                type: 'num',
                value: -5,
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
              type: 'g3d:spawnInSwarm',
              swarmVar: 'robosRapidos',
              originalVar: 'moldeRapido',
              x: {
                type: 'num',
                value: -6,
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
              type: 'g3d:spawnInSwarm',
              swarmVar: 'robosRapidos',
              originalVar: 'moldeRapido',
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
                value: 0,
              },
            },
            {
              type: 'g3d:setPosition',
              objVar: 'jogador',
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
                value: 6,
              },
            },
            {
              type: 'assign',
              name: 'vida',
              value: {
                type: 'num',
                value: 3,
              },
            },
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
              name: 'recarga',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'setProperty',
              targetId: 'vida',
              property: 'textContent',
              value: {
                type: 'var',
                name: 'vida',
              },
            },
            {
              type: 'setProperty',
              targetId: 'placar',
              property: 'textContent',
              value: {
                type: 'var',
                name: 'pontos',
              },
            },
            {
              type: 'setStyle',
              targetId: 'dano',
              property: 'opacity',
              value: {
                type: 'str',
                value: '0',
              },
            },
            {
              type: 'classOp',
              targetId: 'fim',
              op: 'remove',
              className: 'visivel',
            },
            {
              type: 'assign',
              name: 'rodando',
              value: {
                type: 'bool',
                value: true,
              },
            },
          ],
        },
        {
          type: 'callFunction',
          name: 'recomecar',
          args: [],
        },
      ],
      events: [
        {
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'click',
          body: [
            {
              type: 'if',
              cond: {
                type: 'var',
                name: 'rodando',
              },
              then: [
                {
                  type: 'var',
                  name: 'alvo',
                  value: {
                    type: 'g3d:aimAhead',
                    worldVar: 'cena',
                    objVar: 'jogador',
                    dist: {
                      type: 'num',
                      value: 30,
                    },
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'var',
                    name: 'alvo',
                  },
                  then: [
                    {
                      type: 'g3d:forEachInSwarm',
                      swarmVar: 'robosLentos',
                      itemName: 'item',
                      body: [
                        {
                          type: 'if',
                          cond: {
                            type: 'binop',
                            op: '===',
                            left: {
                              type: 'var',
                              name: 'item',
                            },
                            right: {
                              type: 'var',
                              name: 'alvo',
                            },
                          },
                          then: [
                            {
                              type: 'g3d:removeFromSwarm',
                              swarmVar: 'robosLentos',
                              itemVar: 'item',
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
                              type: 'g3d:playEffect',
                              kind: 'explosion',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'g3d:forEachInSwarm',
                      swarmVar: 'robosRapidos',
                      itemName: 'item',
                      body: [
                        {
                          type: 'if',
                          cond: {
                            type: 'binop',
                            op: '===',
                            left: {
                              type: 'var',
                              name: 'item',
                            },
                            right: {
                              type: 'var',
                              name: 'alvo',
                            },
                          },
                          then: [
                            {
                              type: 'g3d:removeFromSwarm',
                              swarmVar: 'robosRapidos',
                              itemVar: 'item',
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
                              type: 'g3d:playEffect',
                              kind: 'explosion',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'setProperty',
                      targetId: 'placar',
                      property: 'textContent',
                      value: {
                        type: 'var',
                        name: 'pontos',
                      },
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '===',
                        left: {
                          type: 'binop',
                          op: '+',
                          left: {
                            type: 'g3d:countSwarm',
                            swarmVar: 'robosLentos',
                          },
                          right: {
                            type: 'g3d:countSwarm',
                            swarmVar: 'robosRapidos',
                          },
                        },
                        right: {
                          type: 'num',
                          value: 0,
                        },
                      },
                      then: [
                        {
                          type: 'assign',
                          name: 'rodando',
                          value: {
                            type: 'bool',
                            value: false,
                          },
                        },
                        {
                          type: 'setProperty',
                          targetId: 'fim-titulo',
                          property: 'textContent',
                          value: {
                            type: 'str',
                            value: 'Você venceu!',
                          },
                        },
                        {
                          type: 'setProperty',
                          targetId: 'final-pontos',
                          property: 'textContent',
                          value: {
                            type: 'var',
                            name: 'pontos',
                          },
                        },
                        {
                          type: 'classOp',
                          targetId: 'fim',
                          op: 'add',
                          className: 'visivel',
                        },
                        {
                          type: 'g3d:playEffect',
                          kind: 'coin',
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
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'keydown',
          body: [
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'eventProp',
                  prop: 'key',
                },
                right: {
                  type: 'str',
                  value: 'r',
                },
              },
              then: [
                {
                  type: 'callFunction',
                  name: 'recomecar',
                  args: [],
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'eventProp',
                  prop: 'key',
                },
                right: {
                  type: 'str',
                  value: 'R',
                },
              },
              then: [
                {
                  type: 'callFunction',
                  name: 'recomecar',
                  args: [],
                },
              ],
            },
          ],
        },
        {
          type: 'event',
          target: 'retry',
          event: 'click',
          body: [
            {
              type: 'callFunction',
              name: 'recomecar',
              args: [],
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g3d:animate',
          worldVar: 'cena',
          body: [
            {
              type: 'if',
              cond: {
                type: 'var',
                name: 'rodando',
              },
              then: [
                {
                  type: 'g3d:fpsControls',
                  objVar: 'jogador',
                  worldVar: 'cena',
                  speed: {
                    type: 'num',
                    value: 0.09,
                  },
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'var',
                      name: 'recarga',
                    },
                    right: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'recarga',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'var',
                          name: 'recarga',
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
                        op: '===',
                        left: {
                          type: 'var',
                          name: 'recarga',
                        },
                        right: {
                          type: 'num',
                          value: 30,
                        },
                      },
                      then: [
                        {
                          type: 'setStyle',
                          targetId: 'dano',
                          property: 'opacity',
                          value: {
                            type: 'str',
                            value: '0',
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'assign',
                  name: 'encostou',
                  value: {
                    type: 'bool',
                    value: false,
                  },
                },
                {
                  type: 'g3d:forEachInSwarm',
                  swarmVar: 'robosLentos',
                  itemName: 'item',
                  body: [
                    {
                      type: 'g3d:moveTowards',
                      objVar: 'item',
                      x: {
                        type: 'g3d:getPos',
                        objVar: 'jogador',
                        axis: 'x',
                      },
                      y: {
                        type: 'g3d:getPos',
                        objVar: 'item',
                        axis: 'y',
                      },
                      z: {
                        type: 'g3d:getPos',
                        objVar: 'jogador',
                        axis: 'z',
                      },
                      factor: {
                        type: 'num',
                        value: 0.006,
                      },
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'g3d:collides',
                        aVar: 'jogador',
                        bVar: 'item',
                      },
                      then: [
                        {
                          type: 'assign',
                          name: 'encostou',
                          value: {
                            type: 'bool',
                            value: true,
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'g3d:forEachInSwarm',
                  swarmVar: 'robosRapidos',
                  itemName: 'item',
                  body: [
                    {
                      type: 'g3d:moveTowards',
                      objVar: 'item',
                      x: {
                        type: 'g3d:getPos',
                        objVar: 'jogador',
                        axis: 'x',
                      },
                      y: {
                        type: 'g3d:getPos',
                        objVar: 'item',
                        axis: 'y',
                      },
                      z: {
                        type: 'g3d:getPos',
                        objVar: 'jogador',
                        axis: 'z',
                      },
                      factor: {
                        type: 'num',
                        value: 0.015,
                      },
                    },
                    {
                      type: 'if',
                      cond: {
                        type: 'g3d:collides',
                        aVar: 'jogador',
                        bVar: 'item',
                      },
                      then: [
                        {
                          type: 'assign',
                          name: 'encostou',
                          value: {
                            type: 'bool',
                            value: true,
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'if',
                  cond: {
                    type: 'var',
                    name: 'encostou',
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '===',
                        left: {
                          type: 'var',
                          name: 'recarga',
                        },
                        right: {
                          type: 'num',
                          value: 0,
                        },
                      },
                      then: [
                        {
                          type: 'assign',
                          name: 'vida',
                          value: {
                            type: 'binop',
                            op: '-',
                            left: {
                              type: 'var',
                              name: 'vida',
                            },
                            right: {
                              type: 'num',
                              value: 1,
                            },
                          },
                        },
                        {
                          type: 'assign',
                          name: 'recarga',
                          value: {
                            type: 'num',
                            value: 90,
                          },
                        },
                        {
                          type: 'setProperty',
                          targetId: 'vida',
                          property: 'textContent',
                          value: {
                            type: 'var',
                            name: 'vida',
                          },
                        },
                        {
                          type: 'setStyle',
                          targetId: 'dano',
                          property: 'opacity',
                          value: {
                            type: 'str',
                            value: '0.5',
                          },
                        },
                        {
                          type: 'g3d:playEffect',
                          kind: 'hit',
                        },
                        {
                          type: 'if',
                          cond: {
                            type: 'binop',
                            op: '===',
                            left: {
                              type: 'var',
                              name: 'vida',
                            },
                            right: {
                              type: 'num',
                              value: 0,
                            },
                          },
                          then: [
                            {
                              type: 'assign',
                              name: 'rodando',
                              value: {
                                type: 'bool',
                                value: false,
                              },
                            },
                            {
                              type: 'setProperty',
                              targetId: 'fim-titulo',
                              property: 'textContent',
                              value: {
                                type: 'str',
                                value: 'Os robôs te pegaram!',
                              },
                            },
                            {
                              type: 'setProperty',
                              targetId: 'final-pontos',
                              property: 'textContent',
                              value: {
                                type: 'var',
                                name: 'pontos',
                              },
                            },
                            {
                              type: 'classOp',
                              targetId: 'fim',
                              op: 'add',
                              className: 'visivel',
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
        },
      ],
    },
    extensions: [{ extensionId: 'game-3d' }],
  },
}

/**
 * Exemplo bundlado: "Mundo de Blocos" (nível 1 da família Mundo de Blocos, um
 * construtor estilo Minecraft): câmera ISOMÉTRICA com o mouse livre, cursor
 * translúcido que anda pela grade com as setas (gridPosition), chão e muralha
 * gerados com forRange do núcleo, espaço/Enter coloca o bloco do tipo
 * escolhido (empilha sozinho na célula ocupada), clique quebra via pickAtMouse
 * e o objetivo leve é uma torre de 5 blocos. Gerado por __gen_mundoBlocos.ts.
 */
export const mundoBlocosExample: ExtensionExample = {
  name: 'Mundo de Blocos',
  experience: 'game',
  description:
    'Um mundinho de blocos com câmera isométrica: mova o cursor com as setas, coloque blocos com espaço e quebre com o clique. Troque o tipo com 1, 2 e 3 e construa uma torre de 5 blocos!',
  ir: {
    html: [
      {
        type: 'element',
        tag: 'div',
        id: 'tipo-caixa',
        children: [
          {
            type: 'text',
            text: 'Bloco: ',
          },
          {
            type: 'element',
            tag: 'span',
            id: 'tipo',
            text: 'grama',
          },
        ],
      },
      {
        type: 'element',
        tag: 'div',
        id: 'torre-caixa',
        children: [
          {
            type: 'text',
            text: 'Torre: ',
          },
          {
            type: 'element',
            tag: 'span',
            id: 'torre',
            text: '0',
          },
        ],
      },
      {
        type: 'element',
        tag: 'div',
        id: 'hint',
        text: 'Setas movem o cursor. Espaço coloca o bloco e o clique quebra. Troque com 1, 2 e 3.',
      },
      {
        type: 'element',
        tag: 'div',
        id: 'festa',
        children: [
          {
            type: 'element',
            tag: 'div',
            id: 'festa-caixa',
            children: [
              {
                type: 'element',
                tag: 'h1',
                text: 'Parabéns! Torre de 5 blocos!',
              },
            ],
          },
        ],
      },
    ],
    css: [
      {
        type: 'googleFont',
        family: 'Press Start 2P',
      },
      {
        selector: 'body',
        declarations: {
          margin: '0',
          overflow: 'hidden',
          'font-family': '"Press Start 2P", cursive',
        },
      },
      {
        selector: '#tipo-caixa',
        declarations: {
          position: 'absolute',
          top: '20px',
          left: '20px',
          'font-size': '0.9em',
          color: 'white',
          'z-index': '1',
        },
      },
      {
        selector: '#torre-caixa',
        declarations: {
          position: 'absolute',
          top: '20px',
          right: '20px',
          'font-size': '0.9em',
          color: 'white',
          'z-index': '1',
        },
      },
      {
        selector: '#hint',
        declarations: {
          position: 'absolute',
          bottom: '20px',
          left: '0',
          'min-width': '100%',
          'text-align': 'center',
          'font-size': '0.7em',
          color: 'white',
          'z-index': '1',
        },
      },
      {
        selector: '#festa',
        declarations: {
          position: 'absolute',
          top: '0',
          left: '0',
          'min-width': '100%',
          'min-height': '100%',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          visibility: 'hidden',
          'pointer-events': 'none',
          'z-index': '2',
        },
      },
      {
        selector: '#festa.visivel',
        declarations: {
          visibility: 'visible',
        },
      },
      {
        selector: '#festa-caixa',
        declarations: {
          'background-color': 'white',
          padding: '20px',
          'text-align': 'center',
        },
      },
    ],
    version: 2,
    behavior: {
      start: [
        {
          type: 'g3d:createFullscreenScene',
          varName: 'mundo',
          bg: '#0ea5e9',
        },
        {
          type: 'g3d:setSky',
          worldVar: 'mundo',
          top: '#38bdf8',
          bottom: '#bae6fd',
        },
        {
          type: 'g3d:isometricCamera',
          worldVar: 'mundo',
          followVar: '',
        },
        {
          type: 'g3d:createBox',
          varName: 'moldeGrama',
          worldVar: 'mundo',
          size: {
            type: 'num',
            value: 1,
          },
          color: '#22c55e',
        },
        {
          type: 'g3d:setVisible',
          objVar: 'moldeGrama',
          mode: 'hide',
        },
        {
          type: 'g3d:createBox',
          varName: 'moldePedra',
          worldVar: 'mundo',
          size: {
            type: 'num',
            value: 1,
          },
          color: '#94a3b8',
        },
        {
          type: 'g3d:setVisible',
          objVar: 'moldePedra',
          mode: 'hide',
        },
        {
          type: 'g3d:createBox',
          varName: 'moldeMadeira',
          worldVar: 'mundo',
          size: {
            type: 'num',
            value: 1,
          },
          color: '#b45309',
        },
        {
          type: 'g3d:setVisible',
          objVar: 'moldeMadeira',
          mode: 'hide',
        },
        {
          type: 'g3d:createSwarm',
          varName: 'chao',
          worldVar: 'mundo',
        },
        {
          type: 'g3d:createSwarm',
          varName: 'blocos',
          worldVar: 'mundo',
        },
        {
          type: 'forRange',
          varName: 'linhaChao',
          from: {
            type: 'num',
            value: -4,
          },
          to: {
            type: 'num',
            value: 5,
          },
          step: {
            type: 'num',
            value: 1,
          },
          body: [
            {
              type: 'forRange',
              varName: 'colunaChao',
              from: {
                type: 'num',
                value: -4,
              },
              to: {
                type: 'num',
                value: 5,
              },
              step: {
                type: 'num',
                value: 1,
              },
              body: [
                {
                  type: 'g3d:spawnInSwarm',
                  swarmVar: 'chao',
                  originalVar: 'moldeGrama',
                  x: {
                    type: 'var',
                    name: 'colunaChao',
                  },
                  y: {
                    type: 'num',
                    value: -1,
                  },
                  z: {
                    type: 'var',
                    name: 'linhaChao',
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'forRange',
          varName: 'passo',
          from: {
            type: 'num',
            value: -4,
          },
          to: {
            type: 'num',
            value: 5,
          },
          step: {
            type: 'num',
            value: 1,
          },
          body: [
            {
              type: 'g3d:spawnInSwarm',
              swarmVar: 'blocos',
              originalVar: 'moldePedra',
              x: {
                type: 'var',
                name: 'passo',
              },
              y: {
                type: 'num',
                value: 0,
              },
              z: {
                type: 'num',
                value: -4,
              },
            },
            {
              type: 'g3d:spawnInSwarm',
              swarmVar: 'blocos',
              originalVar: 'moldePedra',
              x: {
                type: 'var',
                name: 'passo',
              },
              y: {
                type: 'num',
                value: 1,
              },
              z: {
                type: 'num',
                value: -4,
              },
            },
          ],
        },
        {
          type: 'g3d:createBox',
          varName: 'cursor',
          worldVar: 'mundo',
          size: {
            type: 'num',
            value: 1.05,
          },
          color: '#fde047',
        },
        {
          type: 'g3d:setOpacity',
          objVar: 'cursor',
          opacity: {
            type: 'num',
            value: 0.45,
          },
        },
        {
          type: 'var',
          name: 'linha',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'coluna',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'var',
          name: 'tipo',
          value: {
            type: 'num',
            value: 1,
          },
        },
        {
          type: 'var',
          name: 'recorde',
          value: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'funcDecl',
          name: 'colocarBloco',
          params: [],
          body: [
            {
              type: 'var',
              name: 'alturaAlvo',
              value: {
                type: 'num',
                value: 0,
              },
            },
            {
              type: 'g3d:forEachInSwarm',
              swarmVar: 'blocos',
              itemName: 'item',
              body: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '===',
                    left: {
                      type: 'g3d:getPos',
                      objVar: 'item',
                      axis: 'x',
                    },
                    right: {
                      type: 'var',
                      name: 'coluna',
                    },
                  },
                  then: [
                    {
                      type: 'if',
                      cond: {
                        type: 'binop',
                        op: '===',
                        left: {
                          type: 'g3d:getPos',
                          objVar: 'item',
                          axis: 'z',
                        },
                        right: {
                          type: 'var',
                          name: 'linha',
                        },
                      },
                      then: [
                        {
                          type: 'if',
                          cond: {
                            type: 'binop',
                            op: '>=',
                            left: {
                              type: 'g3d:getPos',
                              objVar: 'item',
                              axis: 'y',
                            },
                            right: {
                              type: 'var',
                              name: 'alturaAlvo',
                            },
                          },
                          then: [
                            {
                              type: 'assign',
                              name: 'alturaAlvo',
                              value: {
                                type: 'binop',
                                op: '+',
                                left: {
                                  type: 'g3d:getPos',
                                  objVar: 'item',
                                  axis: 'y',
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
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'var',
                  name: 'tipo',
                },
                right: {
                  type: 'num',
                  value: 1,
                },
              },
              then: [
                {
                  type: 'g3d:spawnInSwarm',
                  swarmVar: 'blocos',
                  originalVar: 'moldeGrama',
                  x: {
                    type: 'var',
                    name: 'coluna',
                  },
                  y: {
                    type: 'var',
                    name: 'alturaAlvo',
                  },
                  z: {
                    type: 'var',
                    name: 'linha',
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'var',
                  name: 'tipo',
                },
                right: {
                  type: 'num',
                  value: 2,
                },
              },
              then: [
                {
                  type: 'g3d:spawnInSwarm',
                  swarmVar: 'blocos',
                  originalVar: 'moldePedra',
                  x: {
                    type: 'var',
                    name: 'coluna',
                  },
                  y: {
                    type: 'var',
                    name: 'alturaAlvo',
                  },
                  z: {
                    type: 'var',
                    name: 'linha',
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'var',
                  name: 'tipo',
                },
                right: {
                  type: 'num',
                  value: 3,
                },
              },
              then: [
                {
                  type: 'g3d:spawnInSwarm',
                  swarmVar: 'blocos',
                  originalVar: 'moldeMadeira',
                  x: {
                    type: 'var',
                    name: 'coluna',
                  },
                  y: {
                    type: 'var',
                    name: 'alturaAlvo',
                  },
                  z: {
                    type: 'var',
                    name: 'linha',
                  },
                },
              ],
            },
            {
              type: 'g3d:playEffect',
              kind: 'jump',
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '>',
                left: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'var',
                    name: 'alturaAlvo',
                  },
                  right: {
                    type: 'num',
                    value: 1,
                  },
                },
                right: {
                  type: 'var',
                  name: 'recorde',
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'recorde',
                  value: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'var',
                      name: 'alturaAlvo',
                    },
                    right: {
                      type: 'num',
                      value: 1,
                    },
                  },
                },
                {
                  type: 'setProperty',
                  targetId: 'torre',
                  property: 'textContent',
                  value: {
                    type: 'var',
                    name: 'recorde',
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'var',
                  name: 'recorde',
                },
                right: {
                  type: 'num',
                  value: 5,
                },
              },
              then: [
                {
                  type: 'g3d:playEffect',
                  kind: 'coin',
                },
                {
                  type: 'classOp',
                  targetId: 'festa',
                  op: 'add',
                  className: 'visivel',
                },
                {
                  type: 'setTimeout',
                  delay: {
                    type: 'num',
                    value: 2500,
                  },
                  body: [
                    {
                      type: 'classOp',
                      targetId: 'festa',
                      op: 'remove',
                      className: 'visivel',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      events: [
        {
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'keydown',
          body: [
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'eventProp',
                  prop: 'key',
                },
                right: {
                  type: 'str',
                  value: 'ArrowLeft',
                },
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'var',
                      name: 'coluna',
                    },
                    right: {
                      type: 'num',
                      value: -4,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'coluna',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'var',
                          name: 'coluna',
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
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'eventProp',
                  prop: 'key',
                },
                right: {
                  type: 'str',
                  value: 'ArrowRight',
                },
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: {
                      type: 'var',
                      name: 'coluna',
                    },
                    right: {
                      type: 'num',
                      value: 4,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'coluna',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'coluna',
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
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'eventProp',
                  prop: 'key',
                },
                right: {
                  type: 'str',
                  value: 'ArrowUp',
                },
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '>',
                    left: {
                      type: 'var',
                      name: 'linha',
                    },
                    right: {
                      type: 'num',
                      value: -4,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'linha',
                      value: {
                        type: 'binop',
                        op: '-',
                        left: {
                          type: 'var',
                          name: 'linha',
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
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'eventProp',
                  prop: 'key',
                },
                right: {
                  type: 'str',
                  value: 'ArrowDown',
                },
              },
              then: [
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: {
                      type: 'var',
                      name: 'linha',
                    },
                    right: {
                      type: 'num',
                      value: 4,
                    },
                  },
                  then: [
                    {
                      type: 'assign',
                      name: 'linha',
                      value: {
                        type: 'binop',
                        op: '+',
                        left: {
                          type: 'var',
                          name: 'linha',
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
            {
              type: 'g3d:gridPosition',
              objVar: 'cursor',
              row: {
                type: 'var',
                name: 'linha',
              },
              col: {
                type: 'var',
                name: 'coluna',
              },
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'eventProp',
                  prop: 'key',
                },
                right: {
                  type: 'str',
                  value: '1',
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'tipo',
                  value: {
                    type: 'num',
                    value: 1,
                  },
                },
                {
                  type: 'setProperty',
                  targetId: 'tipo',
                  property: 'textContent',
                  value: {
                    type: 'str',
                    value: 'grama',
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'eventProp',
                  prop: 'key',
                },
                right: {
                  type: 'str',
                  value: '2',
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'tipo',
                  value: {
                    type: 'num',
                    value: 2,
                  },
                },
                {
                  type: 'setProperty',
                  targetId: 'tipo',
                  property: 'textContent',
                  value: {
                    type: 'str',
                    value: 'pedra',
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'eventProp',
                  prop: 'key',
                },
                right: {
                  type: 'str',
                  value: '3',
                },
              },
              then: [
                {
                  type: 'assign',
                  name: 'tipo',
                  value: {
                    type: 'num',
                    value: 3,
                  },
                },
                {
                  type: 'setProperty',
                  targetId: 'tipo',
                  property: 'textContent',
                  value: {
                    type: 'str',
                    value: 'madeira',
                  },
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'eventProp',
                  prop: 'key',
                },
                right: {
                  type: 'str',
                  value: 'Enter',
                },
              },
              then: [
                {
                  type: 'callFunction',
                  name: 'colocarBloco',
                  args: [],
                },
              ],
            },
            {
              type: 'if',
              cond: {
                type: 'binop',
                op: '===',
                left: {
                  type: 'eventProp',
                  prop: 'key',
                },
                right: {
                  type: 'str',
                  value: ' ',
                },
              },
              then: [
                {
                  type: 'callFunction',
                  name: 'colocarBloco',
                  args: [],
                },
              ],
            },
          ],
        },
        {
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'click',
          body: [
            {
              type: 'var',
              name: 'alvo',
              value: {
                type: 'g3d:pickAtMouse',
                worldVar: 'mundo',
              },
            },
            {
              type: 'if',
              cond: {
                type: 'var',
                name: 'alvo',
              },
              then: [
                {
                  type: 'var',
                  name: 'antes',
                  value: {
                    type: 'g3d:countSwarm',
                    swarmVar: 'blocos',
                  },
                },
                {
                  type: 'g3d:removeFromSwarm',
                  swarmVar: 'blocos',
                  itemVar: 'alvo',
                },
                {
                  type: 'if',
                  cond: {
                    type: 'binop',
                    op: '<',
                    left: {
                      type: 'g3d:countSwarm',
                      swarmVar: 'blocos',
                    },
                    right: {
                      type: 'var',
                      name: 'antes',
                    },
                  },
                  then: [
                    {
                      type: 'g3d:playEffect',
                      kind: 'hit',
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
          type: 'g3d:animate',
          worldVar: 'mundo',
          body: [
            {
              type: 'g3d:spin',
              objVar: 'cursor',
              axis: 'y',
              speed: {
                type: 'num',
                value: 0.02,
              },
            },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-3d' }],
  },
}
