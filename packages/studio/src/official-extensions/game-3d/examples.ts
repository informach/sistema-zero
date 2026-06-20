import type { ExtensionExample } from '#extensions'

/**
 * Exemplo bundlado: "Cubo girando". Cria uma cena 3D, um cubo e gira-o a cada
 * quadro usando uma variável que aumenta.
 */
export const rotatingCubeExample: ExtensionExample = {
  name: 'Cubo girando',
  description: 'Uma cena 3D com um cubo que gira continuamente (Three.js).',
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
    js: [
      { type: 'g3d:createScene', canvasId: 'tela', varName: 'cena' },
      { type: 'g3d:createBox', varName: 'caixa', worldVar: 'cena', size: 1.5, color: '#22d3ee' },
      { type: 'var', name: 'angulo', value: { type: 'num', value: 0 } },
      {
        type: 'g3d:animate',
        worldVar: 'cena',
        body: [
          {
            type: 'assign',
            name: 'angulo',
            value: {
              type: 'binop',
              op: '+',
              left: { type: 'var', name: 'angulo' },
              right: { type: 'num', value: 0.01 },
            },
          },
          {
            type: 'g3d:setRotation',
            objVar: 'caixa',
            x: { type: 'var', name: 'angulo' },
            y: { type: 'var', name: 'angulo' },
            z: { type: 'num', value: 0 },
          },
        ],
      },
    ],
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
    js: [
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
  description:
    'Pule de casa em casa numa grade isométrica e desvie dos carros e caminhões. Pontuação e fim de jogo no HUD.',
  ir: {
    html: [
      { type: 'canvas', id: 'jogo' },
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
        declarations: { margin: '0', 'font-family': '"Press Start 2P", cursive' },
      },
      { selector: 'canvas', declarations: { display: 'block' } },
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
    js: [
      { type: 'g3d:createCrossingScene', canvasId: 'jogo', varName: 'mundo' },
      { type: 'g3d:createCrosser', varName: 'jogador', worldVar: 'mundo', color: '#ffffff' },
      { type: 'g3d:generateRows', worldVar: 'mundo', count: 20 },
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
    extensions: [{ extensionId: 'game-3d' }],
  },
}
