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
