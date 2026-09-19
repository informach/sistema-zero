import {
  isLearningManifest,
  type LearningManifest,
  type LessonDraftDocument,
  type LessonSection,
} from '@sistemazero/core/learning'
import { LESSON_BLOCK_KIND_LABELS, type LessonBlockContent, type LessonBlockKind } from './types'

/**
 * O INVERSO do `LessonManifestImport`: lê o rascunho aberto e devolve o manifesto que a mesma
 * aula pode receber em OUTRO ambiente (o caso real: montar no staging e levar para produção sem
 * remontar tudo à mão).
 *
 * ⚠️⚠️ **O formato não carrega a aula inteira, e isso é do formato, não desta função.** O
 * `LearningManifest` do core transporta a ORGANIZAÇÃO (seções, ordem, critérios) e o conteúdo
 * AUTORAL que cabe em texto: cenas interativas, quiz, textos e as falas do Zappy. Mídia, e-book,
 * Estúdio/Pinta, certificado e materiais são REFERÊNCIAS (`{existing:{kind,index}}`) — o serviço
 * de importação resolve cada uma pelo n-ésimo bloco daquele tipo no destino e RECUSA a importação
 * inteira quando ele não existe. Por isso `paraCadastrar` não é enfeite: é a lista exata do que
 * precisa ser criado no destino ANTES de importar, na ordem em que o serviço vai contar.
 *
 * ⚠️ A função é PURA e roda no navegador: o editor já tem o `draft.document` em memória, então
 * exportar não custa uma ida ao gateway.
 */

/** Um bloco que o manifesto não carrega: vai como referência e precisa existir no destino. */
export interface ManifestPendencia {
  kind: LessonBlockKind
  /** O rótulo na língua da autora ("Imagem", "Estúdio"). */
  label: string
  /** A posição entre as REFERÊNCIAS do mesmo tipo, contada como o destino vai contar. */
  index: number
  /** A seção em que ele está hoje, para a autora achar o lugar no destino. */
  secao: string
}

export interface ManifestExport {
  manifest: LearningManifest
  filename: string
  /** O que muda de um ambiente para o outro e a autora precisa saber ANTES de importar. */
  avisos: string[]
  paraCadastrar: ManifestPendencia[]
  /** Quantos blocos viajam com o conteúdo dentro. */
  levados: number
  /** Quantos vídeos viajam só como INSTRUÇÃO de produção (chegam vazios no destino). */
  videos: number
}

export class ManifestExportError extends Error {}

/**
 * ⚠️⚠️ A KEY SAI DO ID DE ORIGEM, nunca da posição.
 *
 * O serviço de importação deriva o id do destino de
 * `sha256('sz-learning-v1:<lessonId do destino>:block:<key>')`, então a key é a IDENTIDADE do
 * bloco através dos ambientes: exportar de novo a MESMA aula de origem dá as mesmas keys, e a
 * reimportação no mesmo destino atualiza no lugar (`preserve`/`update`) em vez de criar um bloco
 * ao lado. Uma key por posição (`cena-1`, `cena-2`) seria mais bonita de ler e mapearia ERRADO
 * assim que a autora reordenasse ou apagasse blocos na origem entre um export e o seguinte — o
 * conteúdo de uma cena cairia sobre outra, levando junto o progresso das crianças naquele id.
 *
 * ⚠️⚠️ O que NÃO vale: exportar do DESTINO. Lá os ids já são os derivados, então as keys saem
 * outras, e reimportar esse arquivo no próprio destino DUPLICARIA os blocos. A origem tem que ser
 * sempre a mesma aula — é o fluxo real (o staging manda, a produção recebe).
 *
 * Oito dígitos hex do UUID dão 2^32 valores; a colisão é conferida na montagem e vira erro, em
 * vez de um manifesto que o validador do core recusa por key duplicada.
 */
function keyFor(prefixo: string, id: string): string {
  const hex = id
    .replace(/[^0-9a-f]/gi, '')
    .toLowerCase()
    .slice(0, 8)
  // A key do core é `/^[a-z][a-z0-9-]{0,79}$/`: o prefixo garante a inicial de letra e o hex
  // pode começar por dígito sem problema.
  return `${prefixo}-${hex || 'sem-id'}`
}

const PREFIXO: Record<LessonBlockKind, string> = {
  interactive: 'cena',
  rich_text: 'texto',
  dialogue: 'fala',
  video: 'video',
  image: 'imagem',
  audio: 'audio',
  quiz: 'quiz',
  embed: 'html',
  ebook: 'ebook',
  studio: 'estudio',
  pinta: 'pinta',
  certificate: 'certificado',
  coming_soon: 'em-breve',
  materials: 'materiais',
}

/** Tetos que só o MANIFESTO tem — o rascunho e a publicação aceitam mais. */
const TETO = {
  markdown: 50_000,
  plannedVideo: 5_000,
  dialogue: 400,
  blocos: 200,
  secoes: 59,
  titulo: 200,
  objetivo: 2_000,
  perguntas: 30,
  opcoes: 20,
} as const

type ManifestBlock = LearningManifest['blocks'][number]
type ManifestSection = LearningManifest['sections'][number]
type ManifestContent = Extract<ManifestBlock, { content: unknown }>['content']

/** O que cada bloco do rascunho vira no manifesto, decidido ANTES de montar. */
type Destino =
  | { tipo: 'conteudo'; content: ManifestContent }
  | { tipo: 'video'; texto: string }
  | { tipo: 'referencia'; motivo?: string }

/**
 * O texto do vídeo planejado. O manifesto não leva o arquivo nem o embed: leva a INSTRUÇÃO de
 * produção, que é o que a autora lê no destino para reenviar. Quando o bloco de origem já tem um
 * vídeo, o link entra no texto — é ele que identifica qual vídeo era.
 *
 * ⚠️ O campo de orientação do editor aceita 5000 caracteres e o manifesto também: somar o link
 * estoura o teto por poucos caracteres. Quem é cortada é a INSTRUÇÃO, nunca o link — sem ele a
 * autora não sabe qual vídeo reenviar.
 */
function plannedVideoText(
  content: Extract<LessonBlockContent, { kind: 'video' }>,
  instructions: string | undefined,
  avisar: (aviso: string) => void,
): string {
  const link = content.src?.trim() ? `Vídeo de origem: ${content.src.trim()}` : ''
  const instrucao = instructions?.trim() ?? ''
  const inteiro = [instrucao, link].filter(Boolean).join('\n')
  if (inteiro.length <= TETO.plannedVideo) return inteiro || 'Vídeo a produzir.'
  avisar(
    'A orientação de um vídeo era longa demais para o manifesto e foi cortada no fim. O link do vídeo de origem foi preservado.',
  )
  const sobra = Math.max(0, TETO.plannedVideo - link.length - 1)
  return `${instrucao.slice(0, sobra)}\n${link}`.trim()
}

/**
 * Tira da cena os endereços de ÁUDIO, que são do ambiente e não da autoria.
 *
 * ⚠️⚠️ `activity.vozes` é o dicionário `texto falado → URL do MP3`, e a URL aponta para o bucket
 * R2 DESTE ambiente. Levá-lo faz duas coisas ruins de uma vez: a produção passa a servir áudio do
 * bucket de staging (que some quando ele for limpo, e que a CSP de lá pode recusar em silêncio) e
 * o botão "Gerar a voz do Zappy" do destino diz "em dia" — ele considera pronta toda fala que já
 * tem entrada no dicionário, então ninguém clica e o erro nunca aparece. O áudio é cache
 * regenerável: um clique no destino refaz tudo, e a chave é o hash do TEXTO, então nem custa
 * crédito onde já foi gerado.
 *
 * ⚠️ `instructionAudioUrl` (a narração escolhida à mão para a cena) sai pelo mesmo motivo, e este
 * é PERDA de autoria — por isso ela é avisada. Levar o endereço quebrado seria pior: ficaria mudo
 * no destino sem ninguém saber.
 *
 * O `zappySpeech` (pronúncia escrita pela autora) também não cabe no formato do balão: a
 * autora é AVISADA, em vez de perdê-lo calada.
 */
const AUDIO_DO_AMBIENTE = ['vozes', 'instructionAudioUrl'] as const

function semAudioDoAmbiente(content: Extract<LessonBlockContent, { kind: 'interactive' }>) {
  // ⚠️ Os casts por `unknown` são o preço de mexer numa união fechada por campos que só uma das
  // variantes declara: a alternativa seria repetir o `switch` do core aqui dentro.
  const activity = content.activity as unknown as Record<string, unknown> | undefined
  if (!activity || !AUDIO_DO_AMBIENTE.some((campo) => campo in activity)) return content
  const resto = { ...activity }
  for (const campo of AUDIO_DO_AMBIENTE) delete resto[campo]
  return { ...content, activity: resto } as unknown as typeof content
}

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
      `Esta aula tem ${document.sections.length} seções e o manifesto aceita ${TETO.secoes}. Junte duas seções antes de exportar.`,
    )

  const instrucoes = new Map(document.plannedVideos.map((v) => [v.blockId, v.instructions]))
  const semCriterio = document.sections.some((s) => !s.completion)
  // v4 é o formato completo (quiz por conteúdo + `retireBlockKeys`), mas ele EXIGE `completion`
  // em toda seção. Com uma seção sem critérios, o manifesto cai para v2 — e lá o quiz não cabe.
  const version: LearningManifest['version'] = semCriterio ? 2 : 4
  if (semCriterio)
    avisar(
      'Há seção sem critérios de conclusão, então o manifesto sai na versão 2. Nessa versão o quiz não viaja: ele entra na lista de blocos para cadastrar no destino.',
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
        return {
          tipo: 'conteudo',
          content: semAudioDoAmbiente(block.content) as ManifestContent,
        }
      case 'rich_text': {
        const markdown = block.content.markdown ?? ''
        // Bloco legado guarda só `html`; o formato só conhece markdown.
        if (!markdown.trim())
          return {
            tipo: 'referencia',
            motivo:
              'Um texto antigo está guardado em HTML, e o manifesto só leva texto em markdown. Reabra e salve esse bloco no editor para ele viajar junto.',
          }
        if (markdown.length > TETO.markdown)
          throw new ManifestExportError(
            `O ${nomeDoBloco(kind, posicao)} tem ${markdown.length} caracteres e o manifesto aceita ${TETO.markdown}. Divida esse texto em dois blocos antes de exportar.`,
          )
        return { tipo: 'conteudo', content: { kind: 'rich_text', markdown } }
      }
      case 'dialogue': {
        if (block.content.text.length > TETO.dialogue)
          throw new ManifestExportError(
            `A ${nomeDoBloco(kind, posicao)} tem ${block.content.text.length} caracteres e o manifesto aceita ${TETO.dialogue}. Encurte a fala antes de exportar.`,
          )
        // ⚠️ SEM `vozes` (ver `semAudioDoAmbiente`) e sem `zappySpeech`: a pronúncia é autoria,
        // mas o TIPO do balão no manifesto tem só `kind`/`text`/`pose`/`vozes`. Enfiar um campo
        // fora do contrato funcionaria hoje (o validador não recusa extras) e quebraria no dia em
        // que ele passasse a recusar — então ela vira AVISO, não contrabando.
        return {
          tipo: 'conteudo',
          content: {
            kind: 'dialogue',
            text: block.content.text,
            ...(block.content.pose ? { pose: block.content.pose } : {}),
          } as ManifestContent,
        }
      }
      case 'quiz': {
        const { passingScore, questions } = block.content
        if (version !== 4) return { tipo: 'referencia' }
        // ⚠️ `passingScore` 0 é salvável no editor (o campo tem `min={0}`) e o manifesto exige
        // MAIOR que zero. Sem esta guarda o quiz ia como conteúdo e só o validador final
        // reclamava, com a frase genérica — e "Revisar para publicar" não acusa nada, porque 0
        // publica.
        if (typeof passingScore !== 'number' || passingScore <= 0)
          return {
            tipo: 'referencia',
            motivo:
              'Um quiz sem nota de corte não cabe no manifesto. Defina a nota de corte para ele viajar junto.',
          }
        if (!Array.isArray(questions) || questions.length === 0)
          return { tipo: 'referencia', motivo: 'Um quiz sem perguntas não cabe no manifesto.' }
        if (questions.length > TETO.perguntas)
          throw new ManifestExportError(
            `O ${nomeDoBloco(kind, posicao)} tem ${questions.length} perguntas e o manifesto aceita ${TETO.perguntas}.`,
          )
        const larga = questions.find((q) => q.choices.length > TETO.opcoes)
        if (larga)
          throw new ManifestExportError(
            `Uma pergunta do ${nomeDoBloco(kind, posicao)} tem ${larga.choices.length} opções e o manifesto aceita ${TETO.opcoes}.`,
          )
        return { tipo: 'conteudo', content: { kind: 'quiz', passingScore, questions } }
      }
      case 'video':
        return {
          tipo: 'video',
          texto: plannedVideoText(block.content, instrucoes.get(block.id), avisar),
        }
      default:
        return { tipo: 'referencia' }
    }
  })

  // ⚠️⚠️ **Um tipo não pode ficar PARTIDO entre conteúdo e referência.** O serviço resolve
  // `{existing:{kind,index}}` contando os blocos daquele tipo no rascunho do DESTINO, onde os que
  // viajam por conteúdo ainda NÃO existem (é o import que os cria). Com um quiz por conteúdo e
  // outro por referência, a referência sai com índice 1 e o destino, que tem um quiz só, recusa a
  // importação inteira — ou, pior, numa reimportação resolve para o quiz ERRADO e a aula de
  // produção troca de conteúdo em silêncio. Melhor falhar aqui, dizendo o que consertar.
  for (const kind of new Set(document.blocks.map((b) => b.content.kind as LessonBlockKind))) {
    const daFamilia = destinos.filter((_, i) => document.blocks[i]?.content.kind === kind)
    const referencias = daFamilia.filter((d) => d.tipo === 'referencia')
    if (daFamilia.some((d) => d.tipo === 'conteudo') && referencias.length)
      throw new ManifestExportError(
        `Os blocos do tipo "${LESSON_BLOCK_KIND_LABELS[kind] ?? kind}" ficaram divididos: parte viaja dentro do manifesto e parte viraria referência, e o destino não tem como distinguir as duas. ${
          referencias.find((d) => d.motivo)?.motivo ??
          'Acerte o bloco que ficou de fora e exporte de novo.'
        }`,
      )
  }

  // ── Passada 2: montar, numerando as referências SÓ entre elas. ───────────────────────────
  const paraCadastrar: ManifestPendencia[] = []
  const keyByBlockId = new Map<string, string>()
  const usadas = new Set<string>()
  const referenciasPorKind = new Map<string, number>()
  const secaoDoBloco = new Map<string, string>()
  for (const section of document.sections)
    for (const blockId of section.blockIds) secaoDoBloco.set(blockId, section.title)

  const blocks: ManifestBlock[] = []
  let levados = 0
  let videos = 0
  document.blocks.forEach((block, posicao) => {
    const kind = block.content.kind as LessonBlockKind
    const key = keyFor(PREFIXO[kind] ?? 'bloco', block.id)
    if (usadas.has(key))
      throw new ManifestExportError(
        'Dois blocos desta aula geraram a mesma referência. Avise no chamado: o manifesto não pode sair com referência repetida.',
      )
    usadas.add(key)
    keyByBlockId.set(block.id, key)
    const destino = destinos[posicao] as Destino
    if (destino.tipo === 'conteudo') {
      blocks.push({ key, content: destino.content })
      levados += 1
      return
    }
    if (destino.tipo === 'video') {
      blocks.push({ key, plannedVideo: destino.texto })
      videos += 1
      return
    }
    const index = referenciasPorKind.get(kind) ?? 0
    referenciasPorKind.set(kind, index + 1)
    if (destino.motivo) avisar(destino.motivo)
    paraCadastrar.push({
      kind,
      label: LESSON_BLOCK_KIND_LABELS[kind] ?? kind,
      index,
      secao: secaoDoBloco.get(block.id) ?? 'Fora de seção',
    })
    blocks.push({ key, existing: { kind, index } })
  })

  const mapped = (blockId: string): string => {
    const key = keyByBlockId.get(blockId)
    if (!key)
      throw new ManifestExportError(
        'Uma seção aponta para um bloco que não está mais na aula. Recarregue o rascunho e tente de novo.',
      )
    return key
  }
  const keysDeSecao = new Set<string>()
  const sections: ManifestSection[] = document.sections.map((section: LessonSection) => {
    const key = keyFor('secao', section.id)
    if (keysDeSecao.has(key))
      throw new ManifestExportError(
        'Duas seções desta aula geraram a mesma referência. Avise no chamado: o manifesto não pode sair com seção repetida.',
      )
    keysDeSecao.add(key)
    if (section.title.length > TETO.titulo || section.objective.length > TETO.objetivo)
      throw new ManifestExportError(
        `O título ou o objetivo da seção "${section.title.slice(0, 40)}" passa do que o manifesto aceita (${TETO.titulo} e ${TETO.objetivo} caracteres).`,
      )
    return {
      key,
      title: section.title,
      objective: section.objective,
      intent: section.intent,
      blockKeys: section.blockIds.map(mapped),
      workspaceKey: section.workspaceBlockId ? mapped(section.workspaceBlockId) : null,
      externalTool: section.externalTool,
      // Os vídeos pendentes já saem como blocos `plannedVideo`; repeti-los aqui criaria um segundo
      // bloco de vídeo no destino (o serviço converte cada `pendingMedia` num bloco novo).
      pendingMedia: [],
      ...(section.completion
        ? {
            completion: {
              ...section.completion,
              blockIds: section.completion.blockIds.map(mapped),
            },
          }
        : {}),
    }
  })

  if (paraCadastrar.length)
    avisar(
      'Os arquivos (imagens, áudios, PDFs e anexos) não viajam no manifesto: os buckets de staging e de produção são diferentes, então eles precisam ser reenviados no destino.',
    )
  if (videos)
    avisar(
      `${videos === 1 ? 'Um vídeo viaja' : `${videos} vídeos viajam`} só como orientação de produção: no destino o bloco chega VAZIO e o vídeo precisa ser enviado lá antes de publicar.`,
    )
  // ⚠️ O export não conhece o destino, então nunca emite `retireBlockKeys`: um bloco apagado na
  // origem não é apagado lá. O serviço o preserva e o empilha no fim da seção de fechamento.
  avisar(
    'Apagar um bloco aqui não o apaga no destino: ele continua lá, no fim da última seção. Confira a prévia da importação e tire o que sobrou à mão.',
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

  const manifest = {
    version,
    courseSlug,
    lessonSlug: document.slug,
    title: document.title,
    blocks,
    sections,
  } as LearningManifest
  // A última rede: o mesmo validador que o import roda. Um manifesto que não passa aqui só
  // falharia lá, depois de a autora baixar o arquivo e abrir a outra aula. Os tetos conhecidos já
  // foram conferidos acima, um a um, com o nome do bloco — esta mensagem é para o que sobrar.
  if (!isLearningManifest(manifest))
    throw new ManifestExportError(
      'Não consegui montar um manifesto válido para esta aula. Confira as seções e as atividades no "Revisar para publicar".',
    )
  return {
    manifest,
    filename: `${courseSlug}-${document.slug}-manifesto.json`,
    avisos,
    paraCadastrar,
    levados,
    videos,
  }
}
