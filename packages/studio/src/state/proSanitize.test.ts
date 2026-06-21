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

describe('sanitizeProjectForHost — limite do id do initialProject', () => {
  const files = { 'index.html': '<h1>oi</h1>', 'style.css': '', 'script.js': '' }

  it('mantém um id seguro (ulid/alfanumérico) vindo do host', () => {
    const out = sanitizeProjectForHost({ id: '01HZ8XK3M9P0QABCDEFGHJKMNP', name: 'Ok', files })
    expect(out?.id).toBe('01HZ8XK3M9P0QABCDEFGHJKMNP')
  })

  it('substitui por um id fresco quando o id excede o teto de tamanho', () => {
    const huge = 'a'.repeat(5000)
    const out = sanitizeProjectForHost({ id: huge, name: 'Gigante', files })
    expect(out?.id).not.toBe(huge)
    expect(out?.id.length).toBeLessThanOrEqual(128)
    expect(out?.id).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('substitui por um id fresco quando o id tem caracteres fora do charset seguro', () => {
    const out = sanitizeProjectForHost({ id: 'sz:project:../../etc', name: 'Hostil', files })
    expect(out?.id).not.toBe('sz:project:../../etc')
    expect(out?.id).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('substitui por um id fresco quando o id não é string', () => {
    const out = sanitizeProjectForHost({ id: 12345, name: 'Número', files })
    expect(out).not.toBeNull()
    expect(typeof out?.id).toBe('string')
    expect(out?.id).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})
