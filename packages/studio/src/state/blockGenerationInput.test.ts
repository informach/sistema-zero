import { expect, it, spyOn } from 'bun:test'
import { GENERATED_JS_HEADER, generateHTML } from '#generators'
import { normalizeSZIR } from '#ir'
import { createEmptyProject } from '../core/project'
import { extractInlineAssetMetadata } from '../parsers/html'
import { blockGenerationInput } from './blockGenerationInput'

const built = () => normalizeSZIR({ html: [], css: [], js: [], extensions: [] })

it('preserves the saved banner on load and uses the established banner for a new block edit', () => {
  const project = createEmptyProject('banner-edit', 'Banner')
  project.ir = built()
  project.files['script.js'] = 'console.log(1);'
  expect(blockGenerationInput(built(), project, true).jsHeader).toBeUndefined()
  expect(blockGenerationInput(built(), project, false).jsHeader).toBe(GENERATED_JS_HEADER)
  project.files['script.js'] = `${GENERATED_JS_HEADER}\nconsole.log(1);`
  expect(blockGenerationInput(built(), project, false).jsHeader).toBe(GENERATED_JS_HEADER)
})

it('recovers saved document metadata when the lightweight load has no IR', () => {
  const project = createEmptyProject('shell-recovery', 'Nome no cartão')
  project.ir = null
  project.files['index.html'] =
    '<!DOCTYPE html><html lang="en" data-owner="original"><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Título original</title><meta name="custom" content="preservar"></head><body><script src="script.js"></script></body></html>'
  project.files['script.js'] = 'console.log("fonte original");'
  const before = structuredClone(project)
  const input = blockGenerationInput(built(), project, true)
  expect(input.ir.htmlShell?.doctype).toBe('<!DOCTYPE html>')
  expect(input.ir.htmlShell?.htmlAttrs).toContain('data-owner="original"')
  expect(input.ir.htmlShell?.head).toContain('<title>Título original</title>')
  expect(input.ir.htmlShell?.head).toContain('initial-scale=1.0')
  expect(input.ir.htmlShell?.head).toContain('name="custom"')
  expect(project).toEqual(before)
})

it('does not materialize a normalized shell for the standard generated document', () => {
  const project = createEmptyProject('default-shell', 'Meu jogo')
  project.ir = null
  project.files['index.html'] = generateHTML({ title: project.name, body: [] })
  expect(blockGenerationInput(built(), project, true).ir.htmlShell).toBeUndefined()
})

it('recovers inline placement and the actual absence of a banner', () => {
  const project = createEmptyProject('inline-shell', 'Inline')
  project.ir = null
  project.files = {
    'index.html':
      '<html><head><style>body{color:red}</style></head><body><script type="module">console.log("inline");</script></body></html>',
    'style.css': '',
    'script.js': '',
  }
  const input = blockGenerationInput(built(), project, true)
  expect(input.ir.htmlShell?.cssPlacement).toBe('inline-head')
  expect(input.ir.htmlShell?.jsPlacement).toBe('inline-body-end')
  expect(input.ir.htmlShell?.jsModule).toBe(true)
  expect(input.jsHeader).toBeUndefined()
  expect(blockGenerationInput(built(), project, false).jsHeader).toBe(GENERATED_JS_HEADER)
})

it('reads the head of a deep document without rebuilding its body or parsing JavaScript', () => {
  const html = `<html><head><title>Preservado</title></head><body>${'<div>'.repeat(200)}${'</div>'.repeat(200)}</body></html>`
  const metadata = extractInlineAssetMetadata(html, '', 'this is deliberately invalid JavaScript')
  expect(metadata.htmlShell?.head).toContain('<title>Preservado</title>')
  expect(metadata.jsSource).toBe('this is deliberately invalid JavaScript')
  expect(Object.hasOwn(metadata, 'html')).toBe(false)
})

it('preserves saved data and rejects metadata recovery when the parser fails', () => {
  const project = createEmptyProject('failed-shell', 'Não sobrescrever')
  project.ir = null
  const before = structuredClone(project)
  const parser = spyOn(DOMParser.prototype, 'parseFromString').mockImplementation(() => {
    throw new Error('falha de ambiente simulada')
  })
  try {
    expect(() => blockGenerationInput(built(), project, true)).toThrow('falha de ambiente simulada')
    expect(project).toEqual(before)
  } finally {
    parser.mockRestore()
  }
})
