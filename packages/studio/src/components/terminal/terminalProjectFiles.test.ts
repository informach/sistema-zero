import { describe, expect, it } from 'bun:test'
import {
  buildTerminalFileContents,
  WEB_CONTAINER_PACKAGE_DEPENDENCIES,
} from './terminalProjectFiles'

describe('buildTerminalFileContents', () => {
  it('gera package.json com dependencias fixas para o WebContainer', () => {
    const contents = buildTerminalFileContents({
      id: 'project-1',
      name: 'Meu Projeto',
      files: {
        'index.html': '<h1>Oi</h1>',
        'style.css': 'h1 { color: red; }',
        'script.js': 'console.log("oi");',
      },
      extraFiles: [],
    })

    const packageJson = JSON.parse(contents['package.json'] ?? '{}') as {
      dependencies: Record<string, string>
      packageManager: string
    }

    expect(packageJson.packageManager).toBe('pnpm@9.12.0')
    expect(packageJson.dependencies).toEqual(WEB_CONTAINER_PACKAGE_DEPENDENCIES)
    for (const version of Object.values(packageJson.dependencies)) {
      expect(version).toMatch(/^\d+\.\d+\.\d+$/)
    }
  })

  it('ignora arquivos extras inseguros ou reservados ao montar a arvore', () => {
    const contents = buildTerminalFileContents({
      id: 'project-1',
      name: 'Projeto',
      files: null,
      extraFiles: [
        { name: 'utils.js', language: 'javascript', content: 'export const ok = true;' },
        { name: '../escape.js', language: 'javascript', content: 'alert(1)' },
        { name: 'index.html', language: 'html', content: '<h1>override</h1>' },
      ],
    })

    expect(contents['utils.js']).toBe('export const ok = true;')
    expect(contents['../escape.js']).toBeUndefined()
    expect(contents['index.html']).toBe('')
  })
})
