import { describe, expect, test } from 'bun:test'
import {
  canonicalJson,
  isContentFingerprint,
  pintaContentFingerprint,
  sha256Hex,
  studioContentFingerprint,
} from '../src/creations'
import {
  defaultLessonSection,
  isSectionCompletion,
  type LessonSection,
  sectionCompletionIssues,
  submissionFreshness,
  submissionUpToDateWorkspace,
} from '../src/learning'

/**
 * "Envio em dia" (10/10/2026): o rascunho da fase guardado na conta e o envio à equipe são
 * comparados pela impressão digital do conteúdo. As formas das partes abaixo são as dos dois
 * primeiros usos: a parte 4 da aula 2 do Cadê e a parte `posicionar-chave` do Desafio Dia 3.
 */

const projeto = {
  id: 'sz-lesson-studio-perfil-bloco',
  name: 'Meu jogo',
  createdAt: 1,
  updatedAt: 2,
  mode: 'blocks',
  files: { 'index.html': '<div></div>', 'style.css': '', 'script.js': 'criarSprite("gato")' },
  extraFiles: [],
  assets: [
    {
      id: 'gato',
      name: 'gato',
      kind: 'image',
      dataUrl: 'data:image/png;base64,AAA',
      source: 'library',
    },
  ],
  ir: null,
  blocksState: { blocks: { languageVersion: 0, blocks: [] } },
  installedExtensions: [{ id: 'g2d', version: '1.0.0', installedAt: 5 }],
}

describe('impressão digital do conteúdo', () => {
  test('o JSON canônico continua o mesmo das partes já guardadas no R2', async () => {
    // Fixo de propósito: os hashes das partes guardadas dependem deste texto byte a byte.
    expect(canonicalJson({ b: 1, a: { d: undefined, c: [2, { z: 1, y: 2 }] } })).toBe(
      '{"a":{"c":[2,{"y":2,"z":1}]},"b":1}',
    )
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  // ⚠️ O nome fica fora do PROJETO, mas o `index.html` regerado pelo editor de blocos leva o
  // `<title>` com ele: na vida real, renomear e mexer num bloco muda a impressão.
  test('o Estúdio ignora nome, datas, posição dos blocos, versão da extensão e a biblioteca do curso', async () => {
    const base = await studioContentFingerprint(projeto)
    expect(isContentFingerprint(base)).toBe(true)
    const vitrine = {
      ...projeto,
      name: 'Outro nome',
      updatedAt: 99,
      mode: 'code',
      blocksState: { blocks: { languageVersion: 0, blocks: [{ x: 10 }] } },
      installedExtensions: [{ id: 'g2d', version: '2.0.0', installedAt: 9 }],
      // O player acrescenta as imagens que o projeto inicial ganhou depois.
      assets: [
        ...projeto.assets,
        {
          id: 'rato',
          name: 'rato',
          kind: 'image',
          dataUrl: 'data:image/png;base64,B',
          source: 'library',
        },
      ],
    }
    expect(await studioContentFingerprint(vitrine)).toBe(base)
  })

  test('o Estúdio muda com o código, uma extensão nova ou um desenho próprio', async () => {
    const base = await studioContentFingerprint(projeto)
    const codigo = {
      ...projeto,
      files: { ...projeto.files, 'script.js': 'criarSprite("rato")' },
    }
    const extensao = {
      ...projeto,
      installedExtensions: [
        ...projeto.installedExtensions,
        { id: 'g3d', version: '1', installedAt: 1 },
      ],
    }
    const desenho = {
      ...projeto,
      assets: [
        ...projeto.assets,
        {
          id: 'meu',
          name: 'meu',
          kind: 'image',
          dataUrl: 'data:image/png;base64,C',
          source: 'upload',
        },
      ],
    }
    const pessoal = {
      ...projeto,
      assets: [
        ...projeto.assets,
        {
          id: 'p',
          name: 'p',
          kind: 'image',
          dataUrl: 'data:image/png;base64,D',
          source: 'library',
          libId: 'personal:abc',
        },
      ],
    }
    for (const outro of [codigo, extensao, desenho, pessoal])
      expect(await studioContentFingerprint(outro)).not.toBe(base)
  })

  test('o Pinta ignora id, nome e datas, e muda com um pixel', async () => {
    const desenho = {
      id: 'a',
      name: 'meu-desenho',
      kind: 'pixel-background',
      createdAt: 1,
      updatedAt: 2,
      width: 2,
      height: 1,
      cels: [{ data: [0, 1] }],
    }
    const base = await pintaContentFingerprint(desenho)
    expect(isContentFingerprint(base)).toBe(true)
    expect(await pintaContentFingerprint({ ...desenho, id: 'b', name: 'x', updatedAt: 3 })).toBe(
      base,
    )
    expect(await pintaContentFingerprint({ ...desenho, cels: [{ data: [1, 1] }] })).not.toBe(base)
  })

  test('o que não é projeto não tem impressão', async () => {
    expect(await studioContentFingerprint(null)).toBeNull()
    expect(await pintaContentFingerprint('desenho')).toBeNull()
  })
})

describe('submissionFreshness', () => {
  const enviado = new Date('2026-10-10T12:00:00Z')
  const depois = new Date('2026-10-10T12:05:00Z')
  const antes = new Date('2026-10-10T11:55:00Z')

  test('sem envio pede enviar', () => {
    expect(submissionFreshness({ submission: null, draft: null })).toBe('missing')
  })

  test('rascunho diferente guardado DEPOIS do envio pede reenviar', () => {
    expect(
      submissionFreshness({
        submission: { fingerprint: 'v1:a', submittedAt: enviado },
        draft: { fingerprint: 'v1:b', syncedAt: depois },
      }),
    ).toBe('outdated')
  })

  test('igual, ou o envio é mais novo que o rascunho, está em dia', () => {
    expect(
      submissionFreshness({
        submission: { fingerprint: 'v1:a', submittedAt: enviado },
        draft: { fingerprint: 'v1:a', syncedAt: depois },
      }),
    ).toBe('fresh')
    expect(
      submissionFreshness({
        submission: { fingerprint: 'v1:a', submittedAt: enviado },
        draft: { fingerprint: 'v1:b', syncedAt: antes },
      }),
    ).toBe('fresh')
  })

  test('faltando a impressão de um dos lados, deixa passar', () => {
    for (const input of [
      { submission: { fingerprint: null, submittedAt: enviado }, draft: null },
      {
        submission: { fingerprint: 'v1:a', submittedAt: enviado },
        draft: { fingerprint: null, syncedAt: depois },
      },
      { submission: { fingerprint: 'v1:a', submittedAt: enviado }, draft: null },
    ])
      expect(submissionFreshness(input)).toBe('fresh')
  })
})

describe('a autoria do envio em dia', () => {
  const blocks = [
    { id: 'video-a', content: { kind: 'video' } },
    { id: 'projeto', content: { kind: 'studio', purpose: 'submission' } },
    { id: 'video-b', content: { kind: 'video' } },
    { id: 'video-c', content: { kind: 'video' } },
  ]
  // Forma da aula 2 do Cadê: entrega em `contar-achados`, personalizar e publicar em fechamentos.
  const cade = (completion: LessonSection['completion']): LessonSection[] => [
    {
      ...defaultLessonSection('contar', 'Cada personagem vale um achado', ['video-a', 'projeto']),
      intent: 'delivery',
      workspaceBlockId: 'projeto',
      completion: { version: 1, blockIds: ['video-a', 'projeto'] },
    },
    {
      ...defaultLessonSection('personalizar', 'Deixe o jogo com a sua cara', ['video-b']),
      intent: 'closing',
      workspaceBlockId: 'projeto',
      completion,
    },
    {
      ...defaultLessonSection('conclusao', 'Publique seu jogo', ['video-c']),
      intent: 'closing',
      workspaceBlockId: 'projeto',
      completion: { version: 1, blockIds: ['video-c'] },
    },
  ]

  test('o campo só aceita true', () => {
    expect(isSectionCompletion({ version: 1, blockIds: [], submissionUpToDate: true })).toBe(true)
    expect(isSectionCompletion({ version: 1, blockIds: [], submissionUpToDate: false })).toBe(false)
  })

  test('a parte de personalizar do Cadê aceita o critério', () => {
    const sections = cade({ version: 1, blockIds: ['video-b'], submissionUpToDate: true })
    expect(sectionCompletionIssues(sections, blocks)).toEqual([])
    expect(submissionUpToDateWorkspace(sections, blocks, 'personalizar')).toEqual({
      blockId: 'projeto',
      kind: 'studio',
    })
  })

  test('o critério sozinho já é uma checagem verificável', () => {
    const sections = cade({ version: 1, blockIds: [], submissionUpToDate: true })
    expect(sectionCompletionIssues(sections, blocks)).toEqual([])
  })

  test('sem espaço de trabalho, ou antes da entrega, o critério é recusado', () => {
    const semEstudio = cade({ version: 1, blockIds: ['video-b'], submissionUpToDate: true }).map(
      (section) =>
        section.id === 'personalizar' ? { ...section, workspaceBlockId: null } : section,
    )
    expect(
      sectionCompletionIssues(semEstudio, blocks).some((i) => i.message.includes('envio em dia')),
    ).toBe(true)
    const antesDaEntrega: LessonSection[] = [
      {
        ...defaultLessonSection('aquecer', 'Aquecer', ['video-b']),
        intent: 'application',
        workspaceBlockId: 'projeto',
        completion: { version: 1, blockIds: ['video-b'], submissionUpToDate: true },
      },
      ...cade({ version: 1, blockIds: ['video-b'] }),
    ]
    expect(submissionUpToDateWorkspace(antesDaEntrega, blocks, 'aquecer')).toBeNull()
  })

  test('a galeria não é um espaço de trabalho do envio em dia', () => {
    const galeria = blocks.map((block) =>
      block.id === 'projeto'
        ? { ...block, content: { kind: 'studio', purpose: 'submission', gallery: { minItems: 1 } } }
        : block,
    )
    const sections = cade({ version: 1, blockIds: ['video-b'], submissionUpToDate: true })
    expect(submissionUpToDateWorkspace(sections, galeria, 'personalizar')).toBeNull()
  })
})
