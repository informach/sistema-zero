import { describe, expect, it } from 'bun:test'
import { createProProject } from '../components/code/pro-templates'
import { sanitizeProjectForHost } from './projectStore'

describe('sanitizeStoredProject — projetos profissionais', () => {
  it('preserva um projeto pro válido', () => {
    const project = createProProject('p1', 'App', 'react-ts')
    const out = sanitizeProjectForHost(JSON.parse(JSON.stringify(project)))
    expect(out?.kind).toBe('pro')
    expect(out?.mode).toBe('code')
    expect(out?.proMeta?.templateId).toBe('react-ts')
    expect(out?.tree?.['src/App.tsx']?.kind).toBe('file')
  })

  it('rebaixa pro com tree inválida para classic', () => {
    const out = sanitizeProjectForHost({
      id: 'x',
      name: 'Quebrado',
      kind: 'pro',
      tree: { 'node_modules/evil.js': { kind: 'file', content: 'x' } },
      proMeta: { devScript: 'dev', templateId: 'react-ts' },
      files: { 'index.html': '', 'style.css': '', 'script.js': '' },
    })
    expect(out).not.toBeNull()
    expect(out?.kind).toBeUndefined()
    expect(out?.tree).toBeUndefined()
  })

  it('rebaixa pro sem proMeta para classic', () => {
    const out = sanitizeProjectForHost({
      id: 'x',
      name: 'Sem meta',
      kind: 'pro',
      tree: { 'src/main.ts': { kind: 'file', content: 'a' } },
      files: { 'index.html': '', 'style.css': '', 'script.js': '' },
    })
    expect(out?.kind).toBeUndefined()
  })

  it('nunca aceita node_modules na árvore', () => {
    const project = createProProject('p2', 'App', 'vanilla-vite')
    const polluted = JSON.parse(JSON.stringify(project)) as {
      tree: Record<string, unknown>
    }
    polluted.tree['node_modules/three/index.js'] = { kind: 'file', content: 'big' }
    const out = sanitizeProjectForHost(polluted)
    // node_modules invalida a árvore inteira → rebaixa para classic
    expect(out?.kind).toBeUndefined()
  })

  it('projeto classic permanece classic', () => {
    const out = sanitizeProjectForHost({
      id: 'c',
      name: 'Classic',
      files: { 'index.html': '<h1>oi</h1>', 'style.css': '', 'script.js': '' },
    })
    expect(out?.kind).toBeUndefined()
    expect(out?.files['index.html']).toBe('<h1>oi</h1>')
  })
})
