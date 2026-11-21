import { describe, expect, it } from 'bun:test'
import { EXECUTION_LIMITS } from '../src/learning/project-execution'
import { StudioProjectDocumentSchema } from '../src/studio/project-document'
import {
  isRunnableStudentTest,
  studentTestServerBatches,
} from '../src/studio/student-test-runnable'
import {
  isStudioStudentTest,
  STUDENT_TEST_CASES_MAX,
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

/** No Python (tabela da proposta): "testar o programa e testar uma função". */
const dobro = {
  id: 'dobro',
  name: 'O dobro dá certo',
  rule: {
    type: 'functionReturns',
    name: 'dobro',
    cases: [
      { args: [2], expected: 4 },
      { args: [0], expected: 0 },
    ],
  },
}

describe('os testes da criança no Python', () => {
  it('o teste de função tem forma no documento e roda só no Python', () => {
    expect(isStudioStudentTest(dobro)).toBe(true)
    expect(isRunnableStudentTest(dobro as never, 'python')).toBe(true)
    // No JavaScript clássico a aba não testa função (a tabela da proposta).
    expect(isRunnableStudentTest(dobro as never, 'javascript')).toBe(false)
  })

  it('o teste de função recusa forma ruim: sem casos, casos demais, chave a mais, nome vazio', () => {
    const ruins = [
      { ...dobro, rule: { ...dobro.rule, cases: [] } },
      {
        ...dobro,
        rule: {
          ...dobro.rule,
          cases: Array.from({ length: STUDENT_TEST_CASES_MAX + 1 }, () => dobro.rule.cases[0]),
        },
      },
      { ...dobro, rule: { ...dobro.rule, steps: [] } },
      { ...dobro, rule: { ...dobro.rule, name: '' } },
      { ...dobro, rule: { ...dobro.rule, cases: [{ expected: 1 }] } },
    ]
    for (const ruim of ruins) expect(isStudioStudentTest(ruim)).toBe(false)
  })

  it('o teto de casos é o dos objetivos', () => {
    expect(STUDENT_TEST_CASES_MAX).toBe(EXECUTION_LIMITS.maxCases)
  })

  it('o teste do programa no Python: tecla e espera, a variável ou as mensagens', () => {
    expect(isRunnableStudentTest(moeda as never, 'python')).toBe(true)
    const mensagens = {
      ...moeda,
      rule: {
        ...moeda.rule,
        expect: { target: { kind: 'console' }, compare: 'contains', value: 'Fim' },
      },
    }
    expect(isRunnableStudentTest(mensagens as never, 'python')).toBe(true)
    const naoRodam = [
      // A tela do Python é um desenho: não há texto de página para ler.
      {
        ...moeda,
        rule: {
          ...moeda.rule,
          expect: { target: { kind: 'text' }, compare: 'contains', value: 'Fim' },
        },
      },
      // O clique no sprite de um grupo é do Jogo 2D.
      {
        ...moeda,
        rule: {
          ...moeda.rule,
          steps: [
            {
              action: 'clickTarget',
              target: { kind: 'sprite', path: 'moeda', groupPath: 'moedas' },
            },
          ],
        },
      },
    ]
    for (const teste of naoRodam) {
      expect(isRunnableStudentTest(teste as never, 'javascript')).toBe(true)
      expect(isRunnableStudentTest(teste as never, 'python')).toBe(false)
    }
  })

  it('o documento do Python clássico guarda os testes; sem testes, nada muda', () => {
    const hash = 'b'.repeat(64)
    const documento = {
      formatVersion: 3,
      id: 'project-2',
      name: 'Dobro',
      createdAt: 1,
      updatedAt: 2,
      projectTools: [],
      installedExtensions: [],
      assets: [],
      ir: null,
      blocksState: null,
      programmingLanguage: 'python',
      runtime: { profileId: 'python-browser', releaseId: 'python-1', manifestSha256: hash },
      kind: 'classic',
      mode: 'bridge',
      python: {
        entrypoint: 'main.py',
        dependencyLock: {
          lockVersion: 1,
          target: 'browser',
          pythonVersion: '3.14.2',
          runtimeManifestSha256: hash,
          requirementsSha256: hash,
          packages: [],
        },
      },
      files: { 'main.py': 'def dobro(n):\n    return n * 2\n' },
    }
    const semTestes = StudioProjectDocumentSchema.safeParse(documento)
    const comTestes = StudioProjectDocumentSchema.safeParse({
      ...documento,
      studentTests: [dobro, moeda],
    })
    expect(semTestes.success).toBe(true)
    if (semTestes.success) expect(Object.hasOwn(semTestes.data, 'studentTests')).toBe(false)
    expect(comTestes.success).toBe(true)
    if (comTestes.success) expect(comTestes.data).toMatchObject({ studentTests: [dobro, moeda] })
    expect(
      StudioProjectDocumentSchema.safeParse({
        ...documento,
        studentTests: [{ ...dobro, rule: { type: 'script', steps: [], code: 'return true' } }],
      }).success,
    ).toBe(false)
  })
})

describe('os testes da criança no Pro em JavaScript', () => {
  const recado = {
    id: 'recado',
    name: 'A página mostra o recado',
    rule: {
      type: 'behavior',
      steps: [],
      expect: { target: { kind: 'text' }, compare: 'contains', value: 'Editado em JavaScript' },
    },
  }
  const somar = {
    id: 'somar',
    name: 'Somar pontos',
    rule: {
      type: 'functionReturns',
      name: 'somarPontos',
      module: 'src/regras.js',
      cases: [{ args: [2, 3], expected: 5 }],
    },
  }

  it('o teste do jogo (texto, mensagens, estado do kit) e o da função exportada de src', () => {
    expect(isRunnableStudentTest(recado as never, 'javascript', 'pro')).toBe(true)
    expect(isRunnableStudentTest(somar as never, 'javascript', 'pro')).toBe(true)
    const placar = {
      ...recado,
      rule: {
        ...recado.rule,
        steps: [{ action: 'press', key: 'Space' }],
        expect: { target: { kind: 'game', field: 'score' }, compare: 'increased' },
      },
    }
    expect(isRunnableStudentTest(placar as never, 'javascript', 'pro')).toBe(true)
  })

  it('no Pro não: a variável do jogo, função sem arquivo de src, o Python', () => {
    expect(isRunnableStudentTest(moeda as never, 'javascript', 'pro')).toBe(false)
    expect(
      isRunnableStudentTest(
        { ...somar, rule: { ...somar.rule, module: undefined } } as never,
        'javascript',
        'pro',
      ),
    ).toBe(false)
    expect(isRunnableStudentTest(somar as never, 'python', 'pro')).toBe(false)
    // O teste de função no JavaScript clássico continua de fora.
    expect(isRunnableStudentTest(somar as never, 'javascript')).toBe(false)
  })

  it('o documento do Pro em JavaScript guarda os testes', () => {
    const hash = 'c'.repeat(64)
    const documento = {
      formatVersion: 3,
      id: 'project-3',
      name: 'Meu projeto Pro',
      createdAt: 1,
      updatedAt: 2,
      projectTools: [],
      installedExtensions: [],
      assets: [],
      ir: null,
      blocksState: null,
      programmingLanguage: 'javascript',
      runtime: { profileId: 'javascript-web', releaseId: 'javascript-1', manifestSha256: hash },
      kind: 'pro',
      mode: 'code',
      files: { 'index.html': '', 'style.css': '', 'script.js': '' },
      tree: { src: { kind: 'dir' }, 'src/main.js': { kind: 'file', content: 'export {}' } },
      proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
    }
    const comTestes = StudioProjectDocumentSchema.safeParse({
      ...documento,
      studentTests: [recado, somar],
    })
    expect(StudioProjectDocumentSchema.safeParse(documento).success).toBe(true)
    expect(comTestes.success).toBe(true)
  })
})

describe('os lotes do executor do servidor', () => {
  const espera = (id: string, ms: number) => ({
    id,
    name: id,
    rule: {
      type: 'behavior' as const,
      steps: [{ action: 'wait' as const, ms }],
      expect: { target: { kind: 'text' as const }, compare: 'truthy' as const },
    },
  })
  it('até 8 testes e 40 segundos de espera por lote, na ordem da lista', () => {
    const doze = Array.from({ length: 12 }, (_, i) => espera(`t${i}`, 0))
    expect(studentTestServerBatches(doze).map((lote) => lote.length)).toEqual([8, 4])
    const longos = Array.from({ length: 5 }, (_, i) => espera(`l${i}`, 10_000))
    expect(studentTestServerBatches(longos).map((lote) => lote.map((t) => t.id))).toEqual([
      ['l0', 'l1', 'l2', 'l3'],
      ['l4'],
    ])
    expect(studentTestServerBatches([])).toEqual([])
  })
})
