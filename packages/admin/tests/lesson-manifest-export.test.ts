import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  isLearningManifest,
  type LearningManifest,
  type LessonDraftDocument,
  type LessonSection,
} from '@sistemazero/core/learning'
import { buildLessonManifest, ManifestExportError } from '../src/lib/lesson-manifest-export'
import type { LessonBlockContent } from '../src/lib/types'

/**
 * Cópia do `importedLearningId` do members (`domain/learning/learning-import.ts`). O teste precisa
 * dele para montar o rascunho que a IMPORTAÇÃO produziria e então exportar de volta; copiar o
 * hash aqui é mais barato do que o admin depender do members, e um drift nele só faria o
 * round-trip abaixo montar ids diferentes — que o próprio teste nunca compara com o members.
 */
function importedLearningId(lessonId: string, kind: 'block' | 'section', key: string) {
  const hash = createHash('sha256')
    .update(`sz-learning-v1:${lessonId}:${kind}:${key}`)
    .digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

const LESSON_ID = '0f6f6e2e-1111-4222-8333-444455556666'

function secao(
  id: string,
  title: string,
  blockIds: string[],
  extra: Partial<LessonSection> = {},
): LessonSection {
  return {
    id,
    title,
    objective: `Objetivo de ${title}`,
    intent: 'exploration',
    blockIds,
    workspaceBlockId: null,
    externalTool: null,
    pendingMedia: [],
    completion: { version: 1, blockIds },
    ...extra,
  }
}

function documento(
  blocks: LessonDraftDocument<LessonBlockContent>['blocks'],
  sections: LessonSection[],
  extra: Partial<LessonDraftDocument<LessonBlockContent>> = {},
): LessonDraftDocument<LessonBlockContent> {
  return {
    title: 'Aula do Dino',
    slug: 'aula-03',
    estimatedMinutes: 20,
    attachments: [],
    plannedVideos: [],
    blocks,
    sections,
    ...extra,
  }
}

/** Uma cena real dos manifestos atuais: montar uma à mão não passa no validador do core. */
function primeiraCenaDoCurso() {
  const origem = JSON.parse(
    readFileSync(
      join(
        import.meta.dir,
        '../../../docs/aulas-interativas/aulas/corre-dino-aula-03.manifesto.json',
      ),
      'utf8',
    ),
  ) as LearningManifest
  const cena = origem.blocks.find(
    (b) => 'content' in b && b.content.kind === 'interactive',
  ) as Extract<LearningManifest['blocks'][number], { content: unknown }>
  return cena.content as Extract<LessonBlockContent, { kind: 'interactive' }>
}

describe('buildLessonManifest', () => {
  test('cada tipo cai no ramo que a importação sabe consumir', () => {
    const doc = documento(
      [
        {
          id: 'aaaaaaaa-0000-4000-8000-000000000001',
          content: { kind: 'rich_text', markdown: 'Oi' },
        },
        {
          id: 'bbbbbbbb-0000-4000-8000-000000000002',
          content: {
            kind: 'dialogue',
            pose: 'happy',
            text: 'Vamos lá!',
            vozes: { 'Vamos lá!': 'k' },
          },
        },
        {
          id: 'cccccccc-0000-4000-8000-000000000003',
          content: {
            kind: 'video',
            provider: 'vimeo',
            src: 'https://player.vimeo.com/video/123456',
          },
        },
        {
          id: 'dddddddd-0000-4000-8000-000000000004',
          content: { kind: 'image', url: 'https://x/y.webp' },
        },
      ],
      [
        secao('s1', 'Parte 1', [
          'aaaaaaaa-0000-4000-8000-000000000001',
          'bbbbbbbb-0000-4000-8000-000000000002',
          'cccccccc-0000-4000-8000-000000000003',
          'dddddddd-0000-4000-8000-000000000004',
        ]),
      ],
      {
        plannedVideos: [
          {
            blockId: 'cccccccc-0000-4000-8000-000000000003',
            instructions: 'Gravar a abertura',
            videoId: '123456',
          },
        ],
      },
    )
    const { manifest, paraCadastrar, levados, videos } = buildLessonManifest(doc, 'corre-dino')

    expect(isLearningManifest(manifest)).toBe(true)
    expect(manifest.version).toBe(4)
    expect(manifest.lessonSlug).toBe('aula-03')
    // O vídeo NÃO conta como "viaja com o conteúdo": ele leva só a orientação de produção.
    expect(levados).toBe(2)
    expect(videos).toBe(1)

    const [texto, fala, video, imagem] = manifest.blocks
    expect(texto).toEqual({ key: 'texto-aaaaaaaa', content: { kind: 'rich_text', markdown: 'Oi' } })
    // ⚠️ SEM `vozes`: o MP3 vive no R2 deste ambiente e não existe no destino.
    expect(fala).toEqual({
      key: 'fala-bbbbbbbb',
      content: { kind: 'dialogue', text: 'Vamos lá!', pose: 'happy' },
    })
    expect(video).toEqual({
      key: 'video-cccccccc',
      plannedVideo: 'Gravar a abertura\nVídeo de origem: https://player.vimeo.com/video/123456',
    })
    expect(imagem).toEqual({ key: 'imagem-dddddddd', existing: { kind: 'image', index: 0 } })
    expect(paraCadastrar).toEqual([{ kind: 'image', label: 'Imagem', index: 0, secao: 'Parte 1' }])
  })

  test('o índice da referência conta por TIPO, na ordem do documento', () => {
    // A régua do `learning-import.service.ts`: ele resolve `existing` filtrando os blocos do
    // rascunho por kind e pegando o n-ésimo. Contar por seção, ou contar todos os blocos, faria o
    // destino apontar para o bloco errado — em silêncio, porque o tipo bate.
    const doc = documento(
      [
        { id: '11111111-0000-4000-8000-00000000000a', content: { kind: 'image', url: 'a' } },
        {
          id: '22222222-0000-4000-8000-00000000000b',
          content: { kind: 'rich_text', markdown: 'meio' },
        },
        { id: '33333333-0000-4000-8000-00000000000c', content: { kind: 'image', url: 'b' } },
        { id: '44444444-0000-4000-8000-00000000000d', content: { kind: 'audio', url: 'c' } },
      ],
      [
        secao('s1', 'Parte 1', [
          '11111111-0000-4000-8000-00000000000a',
          '22222222-0000-4000-8000-00000000000b',
        ]),
        secao('s2', 'Parte 2', [
          '33333333-0000-4000-8000-00000000000c',
          '44444444-0000-4000-8000-00000000000d',
        ]),
      ],
    )
    const { manifest, paraCadastrar } = buildLessonManifest(doc, 'corre-dino')
    const referencias = manifest.blocks.filter((b) => 'existing' in b)
    expect(referencias).toEqual([
      { key: 'imagem-11111111', existing: { kind: 'image', index: 0 } },
      { key: 'imagem-33333333', existing: { kind: 'image', index: 1 } },
      { key: 'audio-44444444', existing: { kind: 'audio', index: 0 } },
    ])
    expect(paraCadastrar.map((p) => `${p.label} ${p.index} ${p.secao}`)).toEqual([
      'Imagem 0 Parte 1',
      'Imagem 1 Parte 2',
      'Áudio 0 Parte 2',
    ])
  })

  test('seção sem critérios derruba para a versão 2, e lá o quiz vira referência', () => {
    const quiz = {
      id: '55555555-0000-4000-8000-00000000000e',
      content: {
        kind: 'quiz' as const,
        passingScore: 70,
        questions: [
          {
            id: 'q1',
            prompt: 'Quanto?',
            choices: [
              { id: 'a', label: 'Um' },
              { id: 'b', label: 'Dois' },
            ],
            correctChoiceIds: ['a'],
          },
        ],
      },
    }
    const comCriterio = buildLessonManifest(
      documento([quiz], [secao('s1', 'Parte 1', [quiz.id])]),
      'corre-dino',
    )
    expect(comCriterio.manifest.version).toBe(4)
    expect(comCriterio.manifest.blocks[0]).toHaveProperty('content')

    const semCriterio = buildLessonManifest(
      documento([quiz], [secao('s1', 'Parte 1', [quiz.id], { completion: undefined })]),
      'corre-dino',
    )
    expect(semCriterio.manifest.version).toBe(2)
    expect(semCriterio.manifest.blocks[0]).toEqual({
      key: 'quiz-55555555',
      existing: { kind: 'quiz', index: 0 },
    })
  })

  test('quiz sem nota de corte não cabe no formato e avisa', () => {
    const quiz = {
      id: '66666666-0000-4000-8000-00000000000f',
      content: {
        kind: 'quiz' as const,
        questions: [
          {
            id: 'q1',
            prompt: 'Quanto?',
            choices: [
              { id: 'a', label: 'Um' },
              { id: 'b', label: 'Dois' },
            ],
            correctChoiceIds: ['a'],
          },
        ],
      },
    }
    const { manifest, avisos } = buildLessonManifest(
      documento([quiz], [secao('s1', 'Parte 1', [quiz.id])]),
      'corre-dino',
    )
    expect(manifest.blocks[0]).toHaveProperty('existing')
    expect(avisos.some((a) => a.includes('nota de corte'))).toBe(true)
  })

  test('texto guardado só em HTML sai como referência, nunca vazio', () => {
    const legado = {
      id: '77777777-0000-4000-8000-0000000000aa',
      content: { kind: 'rich_text' as const, html: '<p>antigo</p>' },
    }
    const { manifest, avisos } = buildLessonManifest(
      documento([legado], [secao('s1', 'Parte 1', [legado.id])]),
      'corre-dino',
    )
    expect(manifest.blocks[0]).toEqual({
      key: 'texto-77777777',
      existing: { kind: 'rich_text', index: 0 },
    })
    expect(avisos.some((a) => a.includes('HTML'))).toBe(true)
  })

  test('a key vem do id, então exportar duas vezes dá o mesmo arquivo', () => {
    const doc = documento(
      [
        {
          id: '88888888-0000-4000-8000-0000000000bb',
          content: { kind: 'rich_text', markdown: 'Oi' },
        },
      ],
      [secao('s1', 'Parte 1', ['88888888-0000-4000-8000-0000000000bb'])],
    )
    const a = buildLessonManifest(doc, 'corre-dino')
    const b = buildLessonManifest(doc, 'corre-dino')
    expect(a.manifest).toEqual(b.manifest)
    expect(a.filename).toBe('corre-dino-aula-03-manifesto.json')

    // A ordem muda, a key NÃO: é isso que faz reimportar atualizar no lugar em vez de duplicar.
    const reordenado = documento(
      [
        {
          id: '99999999-0000-4000-8000-0000000000cc',
          content: { kind: 'rich_text', markdown: 'Dois' },
        },
        ...doc.blocks,
      ],
      [
        secao('s1', 'Parte 1', [
          '99999999-0000-4000-8000-0000000000cc',
          '88888888-0000-4000-8000-0000000000bb',
        ]),
      ],
    )
    const depois = buildLessonManifest(reordenado, 'corre-dino')
    expect(depois.manifest.blocks.map((b) => b.key)).toContain('texto-88888888')
  })

  test('o `pendingMedia` da seção NÃO é repetido: senão o destino cria um vídeo a mais', () => {
    // O serviço de importação converte cada `pendingMedia` num bloco `plannedVideo` novo
    // (`video-<secao>-<n>`). Repetir a lista aqui, com o vídeo já saindo como bloco, faria o
    // destino ganhar DOIS vídeos na mesma seção — e mais um a cada reimportação.
    const video = {
      id: 'aaaa1111-0000-4000-8000-0000000000dd',
      content: { kind: 'video' as const, provider: 'vimeo' as const, src: '' },
    }
    const doc = documento(
      [video],
      [secao('s1', 'Parte 1', [video.id], { pendingMedia: ['Gravar a abertura'] })],
      { plannedVideos: [{ blockId: video.id, instructions: 'Gravar a abertura', videoId: null }] },
    )
    const { manifest } = buildLessonManifest(doc, 'corre-dino')
    expect(manifest.sections[0]?.pendingMedia).toEqual([])
    expect(manifest.blocks.filter((b) => 'plannedVideo' in b)).toHaveLength(1)
  })

  test('seção que aponta para bloco ausente falha em vez de exportar torto', () => {
    const doc = documento([], [secao('s1', 'Parte 1', ['nao-existe'])])
    expect(() => buildLessonManifest(doc, 'corre-dino')).toThrow(ManifestExportError)
  })

  test('⚠️ a cena perde o ÁUDIO do ambiente: `vozes` e a narração escolhida à mão', () => {
    // O dicionário `texto falado → URL do MP3` aponta para o bucket R2 DESTE ambiente. Levá-lo
    // faz a produção servir áudio do staging E o botão "Gerar a voz do Zappy" do destino dizer
    // "em dia" (ele considera pronta toda fala com entrada no dicionário), então ninguém clica e
    // o erro nunca aparece.
    const cena = primeiraCenaDoCurso()
    const comAudio = {
      id: 'cccc2222-0000-4000-8000-0000000000ee',
      content: {
        ...cena,
        activity: {
          ...cena.activity,
          vozes: { 'Oi!': 'https://testes.r2.dev/voz/abc.mp3' },
          instructionAudioUrl: 'https://testes.r2.dev/narracao.mp3',
        },
      } as LessonBlockContent,
    }
    const { manifest, avisos } = buildLessonManifest(
      documento([comAudio], [secao('s1', 'Parte 1', [comAudio.id])]),
      'corre-dino',
    )
    const saiu = manifest.blocks[0]
    if (!saiu || !('content' in saiu)) throw new Error('a cena tinha que viajar por conteúdo')
    const activity = (saiu.content as unknown as { activity: Record<string, unknown> }).activity
    expect('vozes' in activity).toBe(false)
    expect('instructionAudioUrl' in activity).toBe(false)
    // O resto da cena fica intacto: o que sai é só o endereço do áudio.
    expect(activity.scene).toBe((cena.activity as { scene: string }).scene)
    expect(avisos.some((a) => a.includes('narração escolhida à mão'))).toBe(true)
  })

  test('a pronúncia do Zappy não cabe no formato, e a autora é AVISADA em vez de perdê-la calada', () => {
    const fala = {
      id: 'dddd3333-0000-4000-8000-0000000000ff',
      content: {
        kind: 'dialogue' as const,
        text: 'Oi!',
        zappySpeech: { sourceText: 'Oi!', speechText: 'ôi' },
        vozes: { 'Oi!': 'https://testes.r2.dev/voz/x.mp3' },
      },
    }
    const { manifest, avisos } = buildLessonManifest(
      documento([fala], [secao('s1', 'Parte 1', [fala.id])]),
      'corre-dino',
    )
    // O TIPO do balão no manifesto tem só kind/text/pose/vozes. O validador não recusa campos
    // extras hoje, mas contrabandear um quebraria no dia em que ele passasse a recusar.
    expect(manifest.blocks[0]).toEqual({
      key: 'fala-dddd3333',
      content: { kind: 'dialogue', text: 'Oi!' },
    })
    expect(avisos.some((a) => a.includes('pronúncia'))).toBe(true)
  })

  test('⚠️⚠️ um TIPO partido entre conteúdo e referência é recusado, com o motivo', () => {
    // O destino resolve `existing` contando os blocos daquele tipo que EXISTEM lá, e os que
    // viajam por conteúdo ainda não existem (é o import que os cria). Com um quiz viajando e
    // outro como referência, a referência sai com índice 1 e o destino, que tem um quiz só,
    // recusa tudo — ou, numa reimportação, resolve para o quiz ERRADO em silêncio.
    const bom = {
      id: 'aaaa4444-0000-4000-8000-000000000011',
      content: {
        kind: 'quiz' as const,
        passingScore: 70,
        questions: [
          {
            id: 'q1',
            prompt: 'Quanto?',
            choices: [
              { id: 'a', label: 'Um' },
              { id: 'b', label: 'Dois' },
            ],
            correctChoiceIds: ['a'],
          },
        ],
      },
    }
    const semNota = {
      id: 'bbbb5555-0000-4000-8000-000000000022',
      content: { ...bom.content, passingScore: 0 },
    }
    expect(() =>
      buildLessonManifest(
        documento([bom, semNota], [secao('s1', 'Parte 1', [bom.id, semNota.id])]),
        'corre-dino',
      ),
    ).toThrow(/ficaram divididos[\s\S]*nota de corte/)
  })

  test('nota de corte ZERO é salvável no editor e não pode derrubar o export', () => {
    // O campo tem `min={0}` e o members aceita; o manifesto exige MAIOR que zero. Sem a guarda,
    // o quiz ia como conteúdo e só o validador final reclamava, com a frase genérica — e
    // "Revisar para publicar" não acusa nada, porque 0 publica.
    const quiz = {
      id: 'cccc6666-0000-4000-8000-000000000033',
      content: {
        kind: 'quiz' as const,
        passingScore: 0,
        questions: [
          {
            id: 'q1',
            prompt: 'Quanto?',
            choices: [
              { id: 'a', label: 'Um' },
              { id: 'b', label: 'Dois' },
            ],
            correctChoiceIds: ['a'],
          },
        ],
      },
    }
    const { manifest, avisos } = buildLessonManifest(
      documento([quiz], [secao('s1', 'Parte 1', [quiz.id])]),
      'corre-dino',
    )
    expect(manifest.blocks[0]).toHaveProperty('existing')
    expect(avisos.some((a) => a.includes('nota de corte'))).toBe(true)
  })

  test('cada teto do manifesto tem mensagem que NOMEIA o bloco e o número', () => {
    // O rascunho e a publicação aceitam mais que o manifesto em vários campos. Cair na frase
    // genérica ("confira no Revisar para publicar") mandaria a autora para uma tela que não
    // conhece nenhum desses limites.
    const texto = {
      id: 'aaaa7777-0000-4000-8000-000000000044',
      content: { kind: 'rich_text' as const, markdown: 'x'.repeat(50_001) },
    }
    expect(() =>
      buildLessonManifest(documento([texto], [secao('s1', 'Parte 1', [texto.id])]), 'corre-dino'),
    ).toThrow(/Texto nº 1 tem 50001 caracteres e o manifesto aceita 50000/)

    const fala = {
      id: 'bbbb8888-0000-4000-8000-000000000055',
      content: { kind: 'dialogue' as const, text: 'y'.repeat(401) },
    }
    expect(() =>
      buildLessonManifest(documento([fala], [secao('s1', 'Parte 1', [fala.id])]), 'corre-dino'),
    ).toThrow(/Diálogo do Zappy nº 1 tem 401 caracteres/)

    const muitas = Array.from({ length: 60 }, (_, i) => secao(`s${i}`, `Parte ${i}`, []))
    expect(() => buildLessonManifest(documento([], muitas), 'corre-dino')).toThrow(
      /60 seções e o manifesto aceita 59/,
    )
  })

  test('orientação de vídeo longa demais é cortada, mas o LINK sobrevive', () => {
    // O campo do editor aceita 5000 e o manifesto também: somar o link estoura por poucos
    // caracteres. Sem o link a autora não sabe qual vídeo reenviar no destino.
    const src = 'https://player.vimeo.com/video/987654321'
    const video = {
      id: 'cccc9999-0000-4000-8000-000000000066',
      content: { kind: 'video' as const, provider: 'vimeo' as const, src },
    }
    const { manifest, avisos } = buildLessonManifest(
      documento([video], [secao('s1', 'Parte 1', [video.id])], {
        plannedVideos: [{ blockId: video.id, instructions: 'z'.repeat(5_000), videoId: null }],
      }),
      'corre-dino',
    )
    const saiu = manifest.blocks[0]
    if (!saiu || !('plannedVideo' in saiu)) throw new Error('o vídeo tinha que virar plannedVideo')
    expect(saiu.plannedVideo.length).toBeLessThanOrEqual(5_000)
    expect(saiu.plannedVideo).toContain(src)
    expect(avisos.some((a) => a.includes('cortada'))).toBe(true)
  })

  test('o mesmo aviso não se repete: a tela usa o texto como chave da lista', () => {
    const html = (id: string) => ({
      id,
      content: { kind: 'rich_text' as const, html: '<p>antigo</p>' },
    })
    const a = html('aaaa1010-0000-4000-8000-000000000077')
    const b = html('bbbb1010-0000-4000-8000-000000000088')
    const { avisos } = buildLessonManifest(
      documento([a, b], [secao('s1', 'Parte 1', [a.id, b.id])]),
      'corre-dino',
    )
    expect(new Set(avisos).size).toBe(avisos.length)
  })

  test('⚠️ o limite conhecido: exportar do DESTINO gera keys novas', () => {
    // A key sai dos 8 primeiros hex do id LOCAL, e o id local do destino é derivado da key. Não
    // existe ponto fixo: exportar de B (que recebeu de A) dá keys diferentes das de A, e
    // reimportar esse arquivo no próprio B criaria blocos NOVOS ao lado dos antigos. Este teste
    // CONGELA esse limite para ninguém prometer o contrário na documentação: a origem tem que ser
    // sempre a mesma aula.
    const idEmA = 'aaaa1111-0000-4000-8000-000000000099'
    const origem = documento(
      [{ id: idEmA, content: { kind: 'rich_text', markdown: 'Oi' } }],
      [secao('s1', 'Parte 1', [idEmA])],
    )
    const doStaging = buildLessonManifest(origem, 'corre-dino')
    const keyEmA = doStaging.manifest.blocks[0]?.key as string

    // O que o import cria no destino, e o que um export feito LÁ devolveria.
    const idEmB = importedLearningId(LESSON_ID, 'block', keyEmA)
    const destino = documento(
      [{ id: idEmB, content: { kind: 'rich_text', markdown: 'Oi' } }],
      [secao(importedLearningId(LESSON_ID, 'section', 'secao-s1'), 'Parte 1', [idEmB])],
    )
    const doDestino = buildLessonManifest(destino, 'corre-dino')
    expect(doDestino.manifest.blocks[0]?.key).not.toBe(keyEmA)
  })

  test('ida e volta com um manifesto atual preserva seções e conteúdo', () => {
    // Monta o rascunho que a IMPORTAÇÃO produziria a partir do manifesto do repositório e
    // exporta de volta. É o caminho que a autora percorre de verdade: importou no staging,
    // mexeu, exporta para produção.
    const origem = JSON.parse(
      readFileSync(
        join(
          import.meta.dir,
          '../../../docs/aulas-interativas/aulas/corre-dino-aula-03.manifesto.json',
        ),
        'utf8',
      ),
    ) as LearningManifest
    expect(isLearningManifest(origem)).toBe(true)

    const idPorKey = new Map<string, string>()
    const blocks: LessonDraftDocument<LessonBlockContent>['blocks'] = []
    const plannedVideos: LessonDraftDocument<LessonBlockContent>['plannedVideos'] = []
    for (const entry of origem.blocks) {
      const id = importedLearningId(LESSON_ID, 'block', entry.key)
      idPorKey.set(entry.key, id)
      if ('content' in entry) blocks.push({ id, content: entry.content as LessonBlockContent })
      else if ('plannedVideo' in entry) {
        blocks.push({ id, content: { kind: 'video', provider: 'vimeo', src: '' } })
        plannedVideos.push({ blockId: id, instructions: entry.plannedVideo, videoId: null })
      } else
        blocks.push({
          id,
          // Os `existing` do manifesto são blocos cadastrados à mão na aula.
          content: {
            kind: entry.existing.kind,
            level: 'iniciante',
          } as unknown as LessonBlockContent,
        })
    }
    const sections: LessonSection[] = origem.sections.map((s) => ({
      id: importedLearningId(LESSON_ID, 'section', s.key),
      title: s.title,
      objective: s.objective,
      intent: s.intent,
      blockIds: s.blockKeys.map((k) => idPorKey.get(k) as string),
      workspaceBlockId: s.workspaceKey ? (idPorKey.get(s.workspaceKey) as string) : null,
      externalTool: s.externalTool,
      pendingMedia: [],
      ...(s.completion
        ? {
            completion: {
              ...s.completion,
              blockIds: s.completion.blockIds.map((k) => idPorKey.get(k) as string),
            },
          }
        : {}),
    }))

    const { manifest } = buildLessonManifest(
      documento(blocks, sections, { title: origem.title, slug: origem.lessonSlug, plannedVideos }),
      origem.courseSlug,
    )

    expect(manifest.version).toBe(origem.version)
    expect(manifest.title).toBe(origem.title)
    expect(manifest.sections.map((s) => [s.title, s.intent, s.blockKeys.length])).toEqual(
      origem.sections.map((s) => [s.title, s.intent, s.blockKeys.length]),
    )
    // O que viajava por conteúdo continua por conteúdo, e na mesma ordem.
    const forma = (m: LearningManifest) =>
      m.blocks.map((b) =>
        'content' in b
          ? `content:${b.content.kind}`
          : 'plannedVideo' in b
            ? 'plannedVideo'
            : 'existing',
      )
    expect(forma(manifest)).toEqual(forma(origem))
    const conteudos = (m: LearningManifest) =>
      m.blocks.flatMap((b) => ('content' in b ? [b.content] : []))
    expect(conteudos(manifest)).toEqual(conteudos(origem))
  })
})
