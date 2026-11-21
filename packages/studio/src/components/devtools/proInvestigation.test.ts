import { describe, expect, it } from 'bun:test'
import { proErrorSteps, proLineText } from './proInvestigation'

/** Investigar no Pro: a pilha do erro vira os passos que são arquivos do projeto. */

const files = new Set(['src/main.js', 'src/inimigos.js', 'src/Jogo Novo.ts'])
const isFile = (path: string) => files.has(path)

describe('o caminho até o erro no Pro', () => {
  it('lê a pilha do Chromium, do Firefox e do Safari, só com os arquivos do projeto', () => {
    const chromium = [
      "TypeError: Cannot read properties of undefined (reading 'x')",
      '    at mover (https://abc.webcontainer-api.io/src/inimigos.js?t=1732:12:9)',
      '    at loop (https://abc.webcontainer-api.io/src/main.js:40:3)',
      '    at https://abc.webcontainer-api.io/node_modules/.vite/deps/three.js?v=9:100:2',
    ].join('\n')
    expect(proErrorSteps(chromium, isFile)).toEqual([
      { file: 'src/inimigos.js', line: 12, column: 9 },
      { file: 'src/main.js', line: 40, column: 3 },
    ])
    const firefox =
      'mover@https://jogo.test/src/inimigos.js:12:9\nloop@https://jogo.test/src/main.js:40:3'
    expect(proErrorSteps(firefox, isFile)).toHaveLength(2)
    expect(proErrorSteps('at https://jogo.test/src/Jogo%20Novo.ts:3:1', isFile)).toEqual([
      { file: 'src/Jogo Novo.ts', line: 3, column: 1 },
    ])
  })

  it('pilha sem arquivo do projeto, ou sem endereço, não dá passo', () => {
    expect(proErrorSteps('Error: x\n    at <anonymous>', isFile)).toEqual([])
    expect(proErrorSteps('    at https://jogo.test/assets/index-a1b2.js:1:9000', isFile)).toEqual(
      [],
    )
  })

  it('a linha do arquivo como a criança escreveu', () => {
    expect(proLineText('a\n   inimigo.x += 1   \nb', 2)).toBe('inimigo.x += 1')
    expect(proLineText(undefined, 1)).toBe('')
    expect(proLineText(`x = ${'1'.repeat(200)}`, 1)).toHaveLength(121)
  })
})
