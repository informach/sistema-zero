import { describe, expect, it } from 'bun:test'
import { StudioProjectDocumentSchema } from '../src/studio/project-document'
import { isRunnableStudentTest } from '../src/studio/student-test-runnable'
import {
  isStudioStudentTest,
  STUDENT_TESTS_MAX,
  type StudioStudentTest,
  StudioStudentTestsSchema,
  sanitizeStudioStudentTests,
} from '../src/studio/student-tests'

/** "Meus testes" (aba do Estúdio, proposta aprovada em 20/11/2026): o contrato no documento. */

const moeda = {
  id: 'moeda-ponto',
  name: 'Encostar na moeda dá ponto',
  rule: {
    type: 'behavior',
    steps: [
      { action: 'press', key: 'Enter' },
      { action: 'press', key: 'ArrowLeft', holdMs: 1500 },
      { action: 'wait', ms: 500 },
    ],
    expect: { target: { kind: 'value', path: 'pontos' }, compare: 'increased' },
  },
} satisfies StudioStudentTest

describe('os testes da criança no documento do projeto', () => {
  it('aceita o teste no formato dos objetivos (passos e a conferência do fim)', () => {
    expect(isStudioStudentTest(moeda)).toBe(true)
    expect(
      isStudioStudentTest({
        ...moeda,
        rule: {
          ...moeda.rule,
          expect: { target: { kind: 'value', path: 'heroi.x' }, compare: 'atMost', value: 296 },
        },
      }),
    ).toBe(true)
  })

  it('o documento recusa forma ruim: id, nome, chave a mais, outro tipo, passos demais, tamanho', () => {
    const ruins = [
      { ...moeda, id: 'tem espaço' },
      { ...moeda, name: '   ' },
      { ...moeda, name: 'x'.repeat(61) },
      { ...moeda, extra: true },
      { ...moeda, rule: { ...moeda.rule, checkpoints: [] } },
      { ...moeda, rule: { type: 'script', steps: [], expect: moeda.rule.expect } },
      {
        ...moeda,
        rule: {
          ...moeda.rule,
          steps: Array.from({ length: 21 }, () => ({ action: 'wait', ms: 1 })),
        },
      },
      {
        ...moeda,
        rule: {
          ...moeda.rule,
          expect: { target: { kind: 'text' }, compare: 'contains', value: 'x'.repeat(7_000) },
        },
      },
    ]
    for (const ruim of ruins) expect(isStudioStudentTest(ruim)).toBe(false)
  })

  it('o contrato inteiro (antes de rodar) recusa o que o executor não sabe fazer', () => {
    expect(isRunnableStudentTest(moeda as never)).toBe(true)
    const naoRodam = [
      // Passo desconhecido e tecla fora da lista.
      { ...moeda, rule: { ...moeda.rule, steps: [{ action: 'jump' }] } },
      { ...moeda, rule: { ...moeda.rule, steps: [{ action: 'press', key: 'KeyQ' }] } },
      // Mais de 15 segundos somados (10 s de espera + 5 s segurando + 80 ms).
      {
        ...moeda,
        rule: {
          ...moeda.rule,
          steps: [
            { action: 'wait', ms: 10_000 },
            { action: 'press', key: 'ArrowUp', holdMs: 5_000 },
            { action: 'press', key: 'Enter' },
          ],
        },
      },
      // A posição pelo alvo `spritePosition` só vale no padrão parado-e-anda dos objetivos.
      {
        ...moeda,
        rule: {
          ...moeda.rule,
          expect: {
            target: { kind: 'spritePosition', path: 'heroi', axis: 'x' },
            compare: 'changed',
          },
        },
      },
    ]
    for (const teste of naoRodam) {
      // A forma o documento aceita; quem roda recusa (a aba mostra que não pode rodar).
      expect(isStudioStudentTest(teste)).toBe(true)
      expect(isRunnableStudentTest(teste as never)).toBe(false)
    }
  })

  it('a lista do documento tem teto e não aceita id repetido', () => {
    expect(StudioStudentTestsSchema.safeParse([moeda]).success).toBe(true)
    expect(StudioStudentTestsSchema.safeParse([moeda, moeda]).success).toBe(false)
    const muitos = Array.from({ length: STUDENT_TESTS_MAX + 1 }, (_, i) => ({
      ...moeda,
      id: `t${i}`,
    }))
    expect(StudioStudentTestsSchema.safeParse(muitos).success).toBe(false)
  })

  it('a leitura tolerante fica com os válidos, sem repetir, e some quando não sobra nenhum', () => {
    expect(sanitizeStudioStudentTests([moeda, { ...moeda, id: 'ruim', name: '' }, moeda])).toEqual([
      moeda,
    ])
    expect(sanitizeStudioStudentTests([{ nada: 1 }])).toBeUndefined()
    expect(sanitizeStudioStudentTests(undefined)).toBeUndefined()
  })

  it('o documento do projeto clássico em JavaScript guarda os testes; sem testes, nada muda', () => {
    // Um documento válido (o mesmo formato dos testes de `studio-project-document.test.ts`).
    const documento = {
      formatVersion: 3,
      id: 'project-1',
      name: 'Pegue a moeda',
      createdAt: 1,
      updatedAt: 2,
      projectTools: [],
      installedExtensions: [],
      assets: [],
      ir: null,
      blocksState: null,
      programmingLanguage: 'javascript',
      runtime: {
        profileId: 'javascript-web',
        releaseId: 'javascript-1',
        manifestSha256: 'a'.repeat(64),
      },
      kind: 'classic',
      mode: 'blocks',
      files: {
        'index.html': '<canvas></canvas>',
        'style.css': 'body{}',
        'script.js': 'let pontos = 0',
      },
    }
    const semTestes = StudioProjectDocumentSchema.safeParse(documento)
    const comTestes = StudioProjectDocumentSchema.safeParse({ ...documento, studentTests: [moeda] })
    const testeRuim = StudioProjectDocumentSchema.safeParse({
      ...documento,
      studentTests: [{ ...moeda, rule: { type: 'script', steps: [], code: 'return true' } }],
    })
    expect(semTestes.success).toBe(true)
    expect(comTestes.success).toBe(true)
    if (comTestes.success) expect(comTestes.data).toMatchObject({ studentTests: [moeda] })
    expect(testeRuim.success).toBe(false)
  })
})
