import { describe, expect, it } from 'bun:test'
import { createHash } from 'node:crypto'
import { parseStudioTutorFileReference, type StudioTutorSelection } from '@sistemazero/core/studio'
import { buildProProject } from '../core/proProject'
import { buildStudioTutorRequest } from './tutor'
import { createStudioTutorExcerpts, resolveStudioTutorReference } from './tutorProContext'
import { sanitizeStudioTutorExcerpt, studioTutorSourceHash } from './tutorSafety'

const path = 'src/player.ts'
function selection(content: string, startLine = 301): StudioTutorSelection {
  return {
    path,
    startLine,
    endLine: startLine,
    startColumn: 1,
    endColumn: Math.min(20, (content.split(/\r\n|\r|\n/)[startLine - 1]?.length ?? 0) + 1),
    documentVersion: 7,
    sourceHash: studioTutorSourceHash(content),
  }
}
function request(content: string, selected = selection(content)) {
  return buildStudioTutorRequest({
    project: buildProProject(
      'arena',
      'Arena',
      { [path]: { kind: 'file', content } },
      'dev',
      'canvas-survival',
    ),
    question: '  Por que atravessa o chão?  ',
    intent: 'investigate',
    selectedBlockId: null,
    lastError: null,
    proEditor: {
      projectId: 'arena',
      activeFile: path,
      selection: selected,
      diagnostics: [{ path, line: 151, code: 2322, message: 'tipo incompatível' }],
    },
  })
}

describe('contexto Pro por trecho, sem efeitos ou hashing assíncrono', () => {
  it('seleção distante, diagnóstico e imports conservam linhas originais sob orçamento', () => {
    const content = Array.from(
      { length: 400 },
      (_, index) => `const line${index + 1} = ${index};`,
    ).join('\n')
    const result = request(content)
    expect(result).not.toBeInstanceOf(Promise)
    expect(result.question).toBe('Por que atravessa o chão?')
    expect(result.context.pro?.intent).toBe('investigate')
    expect(result.context.pro?.selection).toEqual(selection(content))
    const files = result.context.code ?? []
    expect(files).toHaveLength(3)
    expect(files[0]?.content).toContain('const line301 = 300;')
    expect(files[0]?.excerpt?.startLine).toBe(295)
    expect(files[1]?.content).toContain('const line151 = 150;')
    expect(files[2]?.excerpt?.startLine).toBe(1)
    expect(files.reduce((total, file) => total + file.content.length, 0)).toBeLessThanOrEqual(4000)
    expect(new Set(files.map((file) => file.excerpt?.id)).size).toBe(3)
  })

  it('seleção no meio de uma linha longa chega ao contexto, sem enviar a linha inteira', () => {
    const content = `// ${'a'.repeat(40_000)}SELECTED_TARGET${'b'.repeat(10_000)}`
    const selected = { ...selection(content, 1), startColumn: 40_004, endColumn: 40_019 }
    const result = request(content, selected)
    expect(result.context.code?.[0]?.content).toContain('SELECTED_TARGET')
    expect(result.context.code?.[0]?.excerpt).toMatchObject({
      startLine: 1,
      endLine: 1,
      truncated: true,
    })
    expect(result.context.code?.[0]?.content.length).toBeLessThanOrEqual(4000)
  })

  it('hash bruto coincide com SHA-256 UTF-8 e difere do digest do contexto redigido', () => {
    const content = 'const apiKey = "sk-secret-example"\r\nconst nome = "🚀"'
    expect(studioTutorSourceHash(content)).toBe(
      `sha256-${createHash('sha256').update(content).digest('base64')}`,
    )
    const file = createStudioTutorExcerpts({ path, content }, { maxChars: 4000 })[0]
    expect(file?.excerpt?.sourceHash).toBe(studioTutorSourceHash(content))
    expect(file?.excerpt?.contextDigest).not.toBe(file?.excerpt?.sourceHash)
    expect(file?.content).not.toContain('sk-secret-example')
    expect(file?.excerpt?.mapping).toBe('lines')
  })

  it('segredo iniciado fora da seleção é removido inteiro antes do recorte', () => {
    const content = [
      'const privateKey = `',
      ...Array.from({ length: 400 }, () => 'SECRET_PAYLOAD'),
      '`',
      'console.log("safe")',
    ].join('\n')
    const result = request(content)
    expect(JSON.stringify(result)).not.toContain('SECRET_PAYLOAD')
    expect(result.context.code?.[0]?.excerpt?.startLine).toBe(295)
  })

  it('seleção de outra versão não é apresentada como seleção atual', () => {
    const result = request('const current = true', selection('const old = true', 1))
    expect(result.context.pro?.selection).toBeUndefined()
    expect(result.context.code?.[0]?.content).toBe('const current = true')
  })

  it('coordenadas fora do documento são descartadas mesmo com hash atual', () => {
    const content = 'const current = true'
    expect(request(content, selection(content, 301)).context.pro?.selection).toBeUndefined()
    expect(
      request(content, { ...selection(content, 1), endColumn: 999 }).context.pro?.selection,
    ).toBeUndefined()
  })

  it('não atribui diagnóstico antigo à versão editada do arquivo', () => {
    const content = 'const current = true'
    const project = buildProProject(
      'arena',
      'Arena',
      { [path]: { kind: 'file', content } },
      'dev',
      'canvas-survival',
    )
    const result = buildStudioTutorRequest({
      project,
      question: 'Explique o erro',
      selectedBlockId: null,
      lastError: null,
      proEditor: {
        projectId: 'arena',
        diagnostics: [
          {
            path,
            line: 1,
            code: 2322,
            message: 'erro antigo',
            source: 'typescript',
            sourceHash: studioTutorSourceHash('const old = false'),
            documentVersion: 3,
          },
        ],
      },
    })
    expect(result.context.pro?.diagnostics).toEqual([])
  })

  it('redação que remove newline degrada o mapa; corte posterior recalcula digest e faixa', () => {
    const file = createStudioTutorExcerpts(
      { path, content: 'Bearer\nabcdefghijklmnop\nconst safe = true' },
      { maxChars: 4000 },
    )[0]
    expect(file?.excerpt?.mapping).toBe('file')
    const safe = createStudioTutorExcerpts(
      { path, content: 'one\ntwo\nthree' },
      { maxChars: 4000 },
    )[0]
    if (!safe) throw new Error('recorte ausente')
    const cut = sanitizeStudioTutorExcerpt(safe, (text) => text, 6)
    expect(cut.excerpt).toMatchObject({
      startLine: 1,
      endLine: 2,
      truncated: true,
      mapping: 'lines',
    })
    expect(cut.excerpt?.contextDigest).not.toBe(safe.excerpt?.contextDigest)
  })
})

describe('navegação do editor verifica conteúdo vivo', () => {
  const content = 'one\ntwo\nthree'
  const reference = { path, startLine: 2, endLine: 3, sourceHash: studioTutorSourceHash(content) }
  it('realça só a revisão analisada; edição e legado abrem apenas o arquivo', () => {
    expect(resolveStudioTutorReference(reference, content)).toEqual(reference)
    expect(resolveStudioTutorReference(reference, `changed\n${content}`)).toEqual({ path })
    expect(resolveStudioTutorReference({ path, startLine: 2, endLine: 3 }, content)).toEqual({
      path,
    })
    expect(resolveStudioTutorReference(reference, undefined)).toBeNull()
  })
  it('recusa paths externos, faixas incompletas e metadados falsos', () => {
    expect(
      parseStudioTutorFileReference({ path: '../outside.ts', startLine: 1, endLine: 2 }),
    ).toBeNull()
    expect(parseStudioTutorFileReference({ path, startLine: 1 })).toBeNull()
    expect(parseStudioTutorFileReference({ path, sourceHash: 'invented' })).toBeNull()
    expect(resolveStudioTutorReference({ path: '.env' }, 'PRIVATE=1')).toBeNull()
  })
})
