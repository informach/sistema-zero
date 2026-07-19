import type { ExtensionExample } from '#extensions'

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
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#1e293b',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
    ],
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
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#05070f',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
    ],
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
    ],
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
 * pula com gravidade sobre o chão, e blocos inimigos vêm de longe acelerando —
 * encostar em qualquer um encerra o jogo. Reproduz o clássico jogo 3D de desviar
 * usando só os blocos da extensão (física + Kit Desvie + câmera que segue).
 */
export const dodgeExample: ExtensionExample = {
  name: 'Desvie dos blocos',
  experience: 'game',
  description:
    'Cubo que anda (WASD), pula e desvia de blocos que avançam acelerando. Encostar em um = fim de jogo.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 480, height: 360 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#0c4a6e',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
    ],
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
            {
              type: 'g3d:runEnemies',
              worldVar: 'cena',
              groupVar: 'inimigos',
              groundVar: 'chao',
              every: 200,
              speed: 0.02,
            },
            {
              type: 'if',
              cond: { type: 'g3d:hitAny', objVar: 'jogador', groupVar: 'inimigos' },
              then: [{ type: 'g3d:stop', worldVar: 'cena' }],
            },
          ],
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
