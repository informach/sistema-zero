import {
  isLearningManifest,
  LEARNING_IMPORT_BODY_MAX_BYTES,
  type LearningManifest,
  type LessonDraftDocument,
  learningImportBodyBytes,
  learningManifestSource,
  projectLessonManifestDraft,
  TEACHER_NOTES_MAX,
} from '@sistemazero/core/learning'
import { LESSON_BLOCK_KIND_LABELS, type LessonBlockContent, type LessonBlockKind } from './types'

/**
 * O INVERSO do `LessonManifestImport`: lê o rascunho aberto e devolve o manifesto que a mesma
 * aula pode receber em OUTRO ambiente (o caso real: montar no staging e levar para produção sem
 * remontar tudo à mão).
 *
 * O manifesto leva Estúdio, Pinta, certificado e materiais como conteúdo. Arquivos privados
 * associados aos materiais continuam precisando de upload no destino.
 *
 * ⚠️ A função é PURA e roda no navegador: o editor já tem o `draft.document` em memória, então
 * exportar não custa uma ida ao gateway.
 */

export interface ManifestExport {
  manifest: LearningManifest
  source: string
  filename: string
  /** O que muda de um ambiente para o outro e a autora precisa saber ANTES de importar. */
  avisos: string[]
  /** Quantos blocos viajam com o conteúdo dentro. */
  levados: number
  /** Quantos vídeos viajam só como INSTRUÇÃO de produção (chegam vazios no destino). */
  videos: number
}

export class ManifestExportError extends Error {}

/** Tetos que só o MANIFESTO tem — o rascunho e a publicação aceitam mais. */
const TETO = {
  markdown: 50_000,
  dialogue: 400,
  blocos: 200,
  secoes: 59,
  titulo: 200,
  objetivo: 2_000,
  perguntas: 30,
  opcoes: 20,
} as const

type Destino = { tipo: 'conteudo' | 'video' }

export function buildLessonManifest(
  document: LessonDraftDocument<LessonBlockContent>,
  courseSlug: string,
): ManifestExport {
  const avisos: string[] = []
  // Dedupe: os avisos nascem dentro do laço dos blocos, e dois textos legados repetiriam a MESMA
  // frase — que a tela usa como `key` da lista.
  const avisar = (aviso: string) => {
    if (!avisos.includes(aviso)) avisos.push(aviso)
  }
  if (document.blocks.length > TETO.blocos)
    throw new ManifestExportError(
      `Esta aula tem ${document.blocks.length} blocos e o manifesto aceita ${TETO.blocos}. Divida a aula antes de exportar.`,
    )
  if (document.sections.length > TETO.secoes)
    throw new ManifestExportError(
      `Esta aula tem ${document.sections.length} partes e o manifesto aceita ${TETO.secoes}. Junte duas partes antes de exportar.`,
    )

  const withoutCompletion = document.sections.find((s) => !s.completion)
  if (withoutCompletion)
    throw new ManifestExportError(
      `A parte "${withoutCompletion.title}" precisa de critérios de conclusão antes de exportar.`,
    )

  const nomeDoBloco = (kind: LessonBlockKind, posicao: number) => {
    const ordem = document.blocks
      .slice(0, posicao + 1)
      .filter((b) => b.content.kind === kind).length
    return `${LESSON_BLOCK_KIND_LABELS[kind] ?? kind} nº ${ordem}`
  }

  // ── Passada 1: decidir o destino de cada bloco, SEM numerar nada ainda. ──────────────────
  const destinos: Destino[] = document.blocks.map((block, posicao) => {
    const kind = block.content.kind as LessonBlockKind
    switch (block.content.kind) {
      case 'interactive':
        return { tipo: 'conteudo' }
      case 'rich_text': {
        const markdown = block.content.markdown ?? ''
        if (!markdown.trim())
          throw new ManifestExportError(
            `O ${nomeDoBloco(kind, posicao)} precisa de markdown para exportar. Reabra e salve o texto no editor.`,
          )
        if (markdown.length > TETO.markdown)
          throw new ManifestExportError(
            `O ${nomeDoBloco(kind, posicao)} tem ${markdown.length} caracteres e o manifesto aceita ${TETO.markdown}. Divida esse texto em dois blocos antes de exportar.`,
          )
        return { tipo: 'conteudo' }
      }
      case 'dialogue': {
        if (block.content.text.length > TETO.dialogue)
          throw new ManifestExportError(
            `A ${nomeDoBloco(kind, posicao)} tem ${block.content.text.length} caracteres e o manifesto aceita ${TETO.dialogue}. Encurte a fala antes de exportar.`,
          )
        return { tipo: 'conteudo' }
      }
      case 'quiz': {
        const { passingScore, questions } = block.content
        // ⚠️ `passingScore` 0 é salvável no editor (o campo tem `min={0}`) e o manifesto exige
        // MAIOR que zero. Sem esta guarda o quiz ia como conteúdo e só o validador final
        // reclamava, com a frase genérica — e "Revisar e publicar" não acusa nada, porque 0
        // publica.
        if (typeof passingScore !== 'number' || passingScore <= 0)
          throw new ManifestExportError(
            `O ${nomeDoBloco(kind, posicao)} precisa de nota de corte maior que zero para exportar.`,
          )
        if (!Array.isArray(questions) || questions.length === 0)
          throw new ManifestExportError(
            `O ${nomeDoBloco(kind, posicao)} precisa de perguntas para exportar.`,
          )
        if (questions.length > TETO.perguntas)
          throw new ManifestExportError(
            `O ${nomeDoBloco(kind, posicao)} tem ${questions.length} perguntas e o manifesto aceita ${TETO.perguntas}.`,
          )
        const larga = questions.find((q) => q.choices.length > TETO.opcoes)
        if (larga)
          throw new ManifestExportError(
            `Uma pergunta do ${nomeDoBloco(kind, posicao)} tem ${larga.choices.length} opções e o manifesto aceita ${TETO.opcoes}.`,
          )
        return { tipo: 'conteudo' }
      }
      case 'video':
        return { tipo: 'video' }
      case 'studio':
      case 'pinta':
      case 'certificate':
        return { tipo: 'conteudo' }
      case 'materials': {
        const files = block.content.items.filter((item) => item.kind === 'file')
        if (files.length)
          avisar(
            `${files.length} arquivo(s) dos materiais precisam ser enviados novamente no destino e vinculados ao bloco importado.`,
          )
        return { tipo: 'conteudo' }
      }
      default:
        throw new ManifestExportError(
          `O ${nomeDoBloco(kind, posicao)} usa um tipo de mídia que precisa ser cadastrado no destino. Exporte depois de substituir esse bloco por conteúdo portátil.`,
        )
    }
  })

  for (const section of document.sections) {
    if (section.title.length > TETO.titulo || section.objective.length > TETO.objetivo)
      throw new ManifestExportError(
        `O título ou o objetivo da parte "${section.title.slice(0, 40)}" passa do que o manifesto aceita (${TETO.titulo} e ${TETO.objetivo} caracteres).`,
      )
    if (section.teacherNotes?.trim() && section.teacherNotes.length > TEACHER_NOTES_MAX)
      throw new ManifestExportError(
        `As anotações da parte "${section.title.slice(0, 40)}" passam de ${TEACHER_NOTES_MAX} caracteres. Encurte antes de exportar.`,
      )
  }
  let projection: ReturnType<typeof projectLessonManifestDraft>
  try {
    projection = projectLessonManifestDraft(document, courseSlug)
  } catch (error) {
    throw new ManifestExportError(
      error instanceof Error ? error.message : 'Não foi possível preparar o manifesto.',
    )
  }
  for (const warning of projection.warnings) avisar(warning)
  const manifest = projection.manifest
  const levados = destinos.filter((destino) => destino.tipo === 'conteudo').length
  const videos = destinos.filter((destino) => destino.tipo === 'video').length

  if (videos)
    avisar(
      `${videos === 1 ? 'Um vídeo viaja' : `${videos} vídeos viajam`} só como orientação de produção: no destino o bloco chega VAZIO e o vídeo precisa ser enviado lá antes de publicar.`,
    )
  // ⚠️ O export não conhece o destino, então nunca emite `retireBlockKeys`: um bloco apagado na
  // origem não é apagado lá. O serviço o preserva e o empilha no fim da seção de fechamento.
  avisar(
    'Apagar um bloco aqui não o apaga no destino: ele continua lá, no fim da última parte. Confira a prévia da importação e tire o que sobrou à mão.',
  )
  if (
    document.blocks.some(
      (b) =>
        b.content.kind === 'interactive' &&
        'instructionAudioUrl' in (b.content.activity as unknown as Record<string, unknown>),
    )
  )
    avisar(
      'Alguma cena tem uma narração escolhida à mão. Ela NÃO viaja (o endereço é deste ambiente): escolha o áudio de novo no destino, ou deixe a voz do Zappy assumir.',
    )
  if (document.blocks.some((b) => b.content.kind === 'dialogue' && b.content.zappySpeech))
    avisar(
      'Algum balão do Zappy tem ajuste de pronúncia. O manifesto não carrega esse campo: refaça o ajuste no destino.',
    )

  // A última rede: o mesmo validador que o import roda. Um manifesto que não passa aqui só
  // falharia lá, depois de a autora baixar o arquivo e abrir a outra aula. Os tetos conhecidos já
  // foram conferidos acima, um a um, com o nome do bloco — esta mensagem é para o que sobrar.
  if (!isLearningManifest(manifest))
    throw new ManifestExportError(
      'Não consegui montar um manifesto válido para esta aula. Confira as partes e as atividades no "Revisar e publicar".',
    )
  if (learningImportBodyBytes(manifest) > LEARNING_IMPORT_BODY_MAX_BYTES)
    throw new ManifestExportError(
      'A aula excede 2 MiB no corpo completo de importação. Reduza os snapshots antes de exportar.',
    )
  return {
    manifest,
    source: learningManifestSource(manifest),
    filename: `${courseSlug}-${document.slug}-manifesto.json`,
    avisos,
    levados,
    videos,
  }
}
