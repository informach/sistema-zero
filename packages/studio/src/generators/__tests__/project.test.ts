import { describe, expect, it } from 'bun:test'
import { generateProjectFiles } from '../project'

describe('generateProjectFiles', () => {
  it('produz os três arquivos esperados a partir de IR completo', () => {
    const files = generateProjectFiles({
      projectName: 'Pong',
      ir: {
        html: [{ type: 'canvas', id: 'game', width: 400, height: 300 }],
        css: [{ selector: 'body', declarations: { background: '#0b1020' } }],
        js: [{ type: 'canvasSetup', canvasId: 'game', varName: 'ctx' }],
        extensions: [],
      },
    })
    expect(files['index.html']).toContain('<title>Pong</title>')
    expect(files['index.html']).toContain('<canvas id="game"')
    expect(files['index.html']).not.toContain('SZGame2D')
    expect(files['style.css']).toContain('background: #0b1020;')
    expect(files['script.js']).toContain("const ctx = canvas?.getContext?.('2d');")
    expect(files['script.js']).toContain('if (!ctx)')
  })
})
