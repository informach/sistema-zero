/** Gera os três documentos de cada aula; não importa nem publica conteúdo. */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type {
  InteractiveBlock,
  LearningManifest,
  SectionIntent,
} from '../../../packages/core/src/learning'
import {
  orientacaoAvatares,
  type ParticipacaoAvatar,
  palavrasDoVideo,
  planoAvatar,
  roteiroComAvatar,
} from './avatares-video'
import { gravarArquivo } from './gravar-arquivo'
import { ORDEM_MEU_JEITO, projetoMeuJeito } from './meu-jeito-etapas'

type Content = Extract<LearningManifest['blocks'][number], { content: unknown }>['content']
export interface SecaoMeuJeito {
  avatar?: ParticipacaoAvatar | ParticipacaoAvatar[]
  key: string
  title: string
  bridge: string
  kind: string
  screen?: string
  /** Experiência com comparação do dia a dia: o meme ilustrado que aparece na frase dela. */
  meme?: string
  speech?: string[]
  videoKey?: string
  externalTool?: 'pinta' | 'estudio'
  final?: boolean
  activity?: InteractiveBlock
  activityKey?: string
  play?: boolean
  materials?: boolean
  questions?: Extract<Content, { kind: 'quiz' }>['questions']
}
export interface AulaMeuJeito {
  slug: string
  title: string
  entry: string
  outcome: string
  reason: string
  concepts: string[][]
  sections: SecaoMeuJeito[]
  gallery: Extract<Content, { kind: 'pinta' | 'studio' }>
  legacyKeys: string[]
  previousRetireKeys: string[]
}
export const aulasMeuJeito = JSON.parse(
  readFileSync(resolve(import.meta.dir, 'meu-jeito.conteudo.json'), 'utf8'),
) as AulaMeuJeito[]
/**
 * Onde a fala aparece. No vídeo (`video`), o fecho das aplicações manda pausar; no Mapa da
 * Aventura (`mapa`), que é lido e não assistido, ele começa direto pela ação e manda voltar "à aba
 * da aula", porque o PDF não tem "esta aba".
 */
export type MeioDaFala = 'video' | 'mapa'
/**
 * O fecho das aplicações no Pinta e no Estúdio: pausar, abrir a ferramenta, comparar, esperar o
 * salvamento e sair. Uma conversa só, com o porquê de esperar (revisão de 06/10/2026: três vozes,
 * conversa contínua e chamados de atenção). A fala de cada seção termina na conferência e deixa
 * este fecho dizer como sair, sem repetir "aguarde Salvo" duas vezes.
 */
function fechoDaAplicacao(s: SecaoMeuJeito, meio: MeioDaFala): string | undefined {
  const volte = meio === 'video' ? 'volte a esta aba' : 'volte à aba da aula'
  if (s.key === 'compartilhar')
    // Publicar é opcional e não tem uma conferência anterior para comparar (revisão de 06/10/2026).
    return `${meio === 'video' ? 'Pause aqui se você escolheu publicar.' : 'Se você escolheu publicar, faça esses passos no Estúdio.'} Se o Estúdio ainda não estiver aberto, clique em Abrir meu Estúdio. Depois de clicar em Fechar, ${volte} e clique em Próxima parte.`
  if (!s.externalTool || s.final) return undefined
  const conferencia =
    meio === 'video' ? 'a conferência que a gente acabou de fazer' : 'a conferência deste passo'
  if (s.key === 'exportar')
    // Baixar o projeto não muda o jogo: o sinal de que deu certo é o arquivo, não o Salvo.
    return `${meio === 'video' ? 'Pause aqui e faça esta parte no seu jogo.' : 'Faça esta parte no seu jogo.'} Se o Estúdio ainda não estiver aberto, clique em Abrir meu Estúdio. Depois compare o nome do arquivo com ${conferencia}. Quando o arquivo .szproject.json estiver nos seus downloads, ${volte} e clique em Próxima parte.`
  const pinta = s.externalTool === 'pinta'
  const ferramenta = pinta ? 'Pinta' : 'Estúdio'
  const criacao = pinta ? 'desenho' : 'jogo'
  const salvo = pinta ? 'Guardado na sua conta' : 'Salvo'
  return `${meio === 'video' ? `Pause aqui e faça esta parte no seu ${criacao}.` : `Faça esta parte no seu ${criacao}.`} Se o ${ferramenta} ainda não estiver aberto, clique em Abrir meu ${ferramenta}. Depois compare o seu ${criacao} com ${conferencia} e espere aparecer ${salvo}, porque é assim que o seu ${criacao} fica guardado para a próxima parte. Quando aparecer, ${volte} e clique em Próxima parte.`
}
/**
 * A fala completa da parte. As frases fixas falam o vocabulário do curso (Diretrizes, seção 6,
 * 06/10/2026): a criança ouve fase e parte, e os botões pelo nome novo (Próxima parte).
 */
export function falasSecao(s: SecaoMeuJeito, meio: MeioDaFala = 'video'): string[] {
  const fecho = fechoDaAplicacao(s, meio)
  const falas = [...(s.speech ?? []), ...(fecho ? [fecho] : [])]
  if (meio === 'video') return falas
  // No Mapa, o jogo pronto perde os dois parágrafos em que o narrador joga ("Olha aqui: …" e
  // "Olha só: …"), e o resto perde os chamados de atenção.
  return falas.filter((p) => !(s.play && /^Olha (?:aqui|só):/.test(p))).map(semChamados)
}
/**
 * No PDF não há vídeo para apontar: "Olha aqui", "Olha só", "Repare" e "Tá vendo?" puxam o olhar
 * para um gesto da gravação (Diretrizes, seção 6). No Mapa eles saem e a frase seguinte começa com
 * maiúscula; "Repare nos/nas…" vira "Confira os/as…", que é o que a criança faz no papel.
 */
export function semChamados(paragrafo: string): string {
  return paragrafo
    .replace(/\bRepare n([oa]s?) /g, 'Confira $1 ')
    .replace(/, (?:olha aqui|olha só|repare): /g, ', ')
    .replace(
      /(?:Tá vendo\? |(?:Olha aqui|Olha só|Repare): |Repare que )(\p{L})/gu,
      (_, letra: string) => letra.toUpperCase(),
    )
}
/**
 * A aplicação que vem logo depois de uma experiência começa pela retomada dela (Diretrizes, seção
 * 2); a que aplica uma experiência mais atrás nomeia a parte ("…da primeira parte desta aula?").
 */
const comecaPelaRetomada = (s: SecaoMeuJeito) =>
  // Primeiro o problema, depois a lembrança (06/10/2026, à noite): o teste pode vir antes do "Lembra".
  Boolean(s.speech?.[0]?.includes('Lembra da experiência'))
/**
 * A nota "Na tela". Nas experiências o vídeo é uma DEMONSTRAÇÃO (Diretrizes, decisão de
 * 06/10/2026): o narrador faz os testes na primeira pessoa e só no fim passa a vez. O jogo pronto e
 * o Mapa usam a nota da própria seção; as aplicações no Pinta e no Estúdio ganham a retomada (quando
 * vêm logo depois de uma experiência) e o apontamento de cada chamado de atenção.
 */
export function telaSecao(s: SecaoMeuJeito): string {
  // Cada chamado da fala ("Olha aqui", "Olha só", "Repare", "Tá vendo?") precisa de um
  // apontamento visível no vídeo (Diretrizes, seção 6).
  const chamados =
    ' Em cada chamado da fala (Olha aqui, Olha só, Repare, Tá vendo?), apontar na tela o que ela mostra.'
  if (!s.activity) {
    if (!s.externalTool) return s.screen ?? ''
    const testaNaRetomada = s.speech?.[0]?.includes('Tá vendo?')
    const retomada = comecaPelaRetomada(s)
      ? `Começar pela retomada, antes de qualquer gesto novo, com o trabalho da criança à vista${testaNaRetomada ? ': primeiro o teste, com o resultado que o Tá vendo? cita à vista, e depois a lembrança da experiência' : ''}. `
      : ''
    return `${retomada}${s.screen ?? ''}${chamados}`
  }
  const meme = s.meme
    ? ` Meme na comparação: ${s.meme} Desenho nosso no formato de meme, com o Zappy ou os personagens do jogo; sem foto de pessoa real nem meme da internet. Fica 2 a 3 segundos na tela, sem cobrir a experiência, e a narração explica sem depender dele.`
    : ''
  return `Demonstração na primeira pessoa: o narrador faz cada teste no ritmo da fala e deixa ver o resultado real antes de explicar; o vídeo não dá ordens antes de passar a vez. ${s.screen}${meme}${chamados} No fim, apontar a experiência para a pessoa repetir os mesmos testes e apontar Próxima parte.`
}
export function gerarManifestoMeuJeito(lesson: AulaMeuJeito): LearningManifest {
  const index = ORDEM_MEU_JEITO.indexOf(lesson.slug)
  const blocks: LearningManifest['blocks'] = []
  const sections: LearningManifest['sections'] = []
  for (const s of lesson.sections) {
    const blockKeys: string[] = []
    const required: string[] = []
    const add = (key: string, content: Content, needed = false) => {
      blocks.push({ key, content })
      blockKeys.push(key)
      if (needed) required.push(key)
    }
    if (s.videoKey) {
      blocks.push({
        key: s.videoKey,
        plannedVideo: `Título: ${s.title}\n\nProduzir nas ferramentas atuais. Se houver vídeo já gravado, usar as âncoras para inserir o avatar e conferir a retomada antes de pedir gravação complementar. ${telaSecao(s)}\n\n${planoAvatar(s, falasSecao(s), index)}\n\nFala completa em meu-jeito-${lesson.slug}.roteiro.md. Estimar a duração pela fala e pelos gestos; não acelerar para caber. Preservar a mídia existente até a substituição revisada. Este campo não publica nem substitui gravações.`,
      })
      blockKeys.push(s.videoKey)
      required.push(s.videoKey)
    }
    add(`fala-${s.key}`, { kind: 'dialogue', pose: 'speaking', text: s.bridge })
    if (s.activity) add(s.activityKey!, s.activity, true)
    if (s.play)
      add(
        'jogo-pronto',
        {
          kind: 'interactive',
          required: true,
          title: 'Experimente uma versão com artes próprias',
          instructions:
            'Clique no jogo e toque na tecla Enter para começar. As setas movem a nave e Espaço atira. Depois que a partida terminar, Enter volta à abertura e outro Enter começa de novo. Repare no fogo da nave e nas pedras. Você pode seguir mesmo sem vencer.',
          hints: [],
          activity: {
            type: 'project-play',
            completion: 'participation',
            project: projetoMeuJeito(8),
            stage: { width: 480, height: 300 },
            targets: [],
          },
        },
        true,
      )
    if (s.materials)
      // A chave continua `materiais-caderno`; para a criança, o caderno é o Passo a passo do projeto.
      add('materiais-caderno', {
        kind: 'materials',
        title: 'Passo a passo do projeto: O Jogo do Meu Jeito',
        bookPreview: true,
        items: [],
      })
    if (s.questions) add('quiz', { kind: 'quiz', passingScore: 100, questions: s.questions }, true)
    if (s.final) add('entrega-galeria-v6', lesson.gallery, true)
    sections.push({
      key: s.key,
      title: s.title,
      objective: s.bridge,
      intent: (s.kind === 'reflection' ? 'explanation' : s.kind) as SectionIntent,
      blockKeys,
      workspaceKey: null,
      externalTool: s.externalTool ?? null,
      pendingMedia: [],
      completion: { version: 1, blockIds: required },
    })
  }
  const present = new Set(blocks.map((b) => b.key))
  return {
    version: 5,
    courseSlug: 'o-jogo-do-meu-jeito',
    lessonSlug: lesson.slug,
    title: lesson.title,
    retireBlockKeys: [...new Set([...lesson.previousRetireKeys, ...lesson.legacyKeys])].filter(
      (key) => !present.has(key),
    ),
    blocks,
    sections,
  }
}
function roteiro(lesson: AulaMeuJeito, index: number) {
  const lines = [`# Roteiro de produção · ${lesson.title}`, '', orientacaoAvatares(index), '']
  lesson.sections.forEach((s, i) => {
    lines.push(`## Seção ${i + 1}. ${s.title}`, '')
    if (s.videoKey) {
      const speech = falasSecao(s)
      lines.push(
        `### Clipe \`${s.videoKey}\` · ${s.title}`,
        '',
        `**Estimativa de gravação:** aproximadamente ${Math.ceil(palavrasDoVideo(s, speech) / 130)} minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.`,
        '',
        roteiroComAvatar(
          s,
          speech,
          `${telaSecao(s)} ${s.externalTool ? 'Mostrar a passagem entre a aba da aula e a ferramenta, o trabalho salvo e o resultado de referência para a autoconferência narrada.' : ''}`.trimEnd(),
          index,
        ),
        '',
      )
    }
    lines.push(`**Recado na página (não gravar):** ${s.bridge}`, '')
    if (s.questions)
      lines.push(
        'Sem vídeo nem ferramenta. O quiz vem imediatamente depois do Zappy. Correção com explicação, tentativas ilimitadas e sem espera.',
        '',
      )
  })
  return lines.join('\n')
}
function proposta(lesson: AulaMeuJeito, index: number, m: LearningManifest) {
  const lines = [
    `# O Jogo do Meu Jeito · Aula ${index + 1} · ${lesson.title}`,
    '',
    'Fonte editorial: `qa/meu-jeito.conteudo.json`. Gerador: `qa/gerar-meu-jeito.ts`. Consulte [o mapa do curso](modulos.md).',
    '',
    '## Resumo',
    '',
    `- Entrada: ${lesson.entry}`,
    `- Resultado: ${lesson.outcome}`,
    `- Seções: ${lesson.sections.length}. Vídeos: ${lesson.sections.filter((s) => s.videoKey).length}.`,
    '',
    orientacaoAvatares(index),
    '',
    '## Diagnóstico e decisão',
    '',
    lesson.reason,
    '',
    '## Triagem dos conceitos',
    '',
    '| Conceito | Como e quando trabalhar | Razão |',
    '| --- | --- | --- |',
    ...lesson.concepts.map((c) => `| ${c.join(' | ')} |`),
    '',
    '## Proposta final',
    '',
  ]
  lesson.sections.forEach((s, i) => {
    lines.push(
      `### Seção ${i + 1}. ${s.title}`,
      '',
      `**Tarefa / Zappy na página:** ${s.bridge}`,
      '',
      `**Blocos na página:** ${m.sections[i]!.blockKeys.join(' → ')}.`,
      '',
    )
    if (s.avatar)
      lines.push(`**Participação no vídeo:** ${planoAvatar(s, falasSecao(s), index)}`, '')
    if (s.activity)
      lines.push(
        `**Experiência existente:** \`${s.activity.activity.type === 'experimentation' ? s.activity.activity.scene : s.activity.activity.type}\`. ${s.activity.instructions} Sem palpite, pistas ou pergunta final.`,
        '',
      )
    if (s.externalTool)
      lines.push(
        `**Aplicação no ${s.externalTool === 'pinta' ? 'Pinta' : 'Estúdio'}:** ${comecaPelaRetomada(s) ? 'o roteiro começa pela retomada de uma experiência desta aula e ' : 'o roteiro '}inclui o caminho, a ação, o porquê dos resultados e a autoconferência visual. ${s.final ? 'Conclusão exige vídeo e recebimento da entrega pela galeria.' : 'Esta parte registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.'}`,
        '',
      )
    if (s.play)
      lines.push(
        'Jogo derivado do marco original 8, com artes ilustrativas de dois quadros. Conclusão por participação. As artes são exemplos; não substituem as criações do aluno.',
        '',
      )
    if (s.materials)
      lines.push(
        'Anexar `docs/aulas-interativas/o-jogo-do-meu-jeito/passo-a-passo-do-projeto.pdf`, que a criança conhece como Passo a passo do projeto, a `materiais-caderno`. Ler, baixar e imprimir são opcionais e não entram na conclusão; a fala oferece ler aqui ou baixar como convite.',
        '',
      )
    if (s.questions)
      lines.push(
        '**Quiz formativo:** somente Zappy → quiz, sem vídeo ou ferramenta. Todas corretas, explicação após responder e tentativas ilimitadas, sem espera.',
        '',
      )
  })
  lines.push(
    '## Continuidade e produção',
    '',
    'Os oito slugs e a chave de entrega `entrega-galeria-v6` são preservados. Aula 5 recebe duas artes; as demais recebem um trabalho. A galeria guarda a cópia enviada. Não criar workspace embutido nem aplicar projectChecks a um projeto externo.',
    '',
    'O programa de referência permanece em `qa/meu-jeito-projetos-qa.ts`; as etapas e artes de demonstração ficam em `qa/meu-jeito-etapas.ts`. Usar Programação e Jogo 2D já trazidos com o projeto de Nave Contra Asteroides. Não acrescentar HTML/CSS nem instalar extensão em um projeto vazio só para cumprir uma tarefa.',
    '',
    'A ordem vídeo → Zappy → atividade não configura sozinha o bloqueio: conferir videoBeforeActivity no curso durante a importação. Gravar os clipes, vincular o PDF, testar com perfil de aluno e ensaiar com crianças antes de declarar o percurso validado.',
    '',
  )
  return lines.join('\n')
}
if (import.meta.main) {
  if (aulasMeuJeito.map((a) => a.slug).join() !== ORDEM_MEU_JEITO.join())
    throw new Error('Ordem divergente')
  const manifestos: string[] = []
  for (const [index, lesson] of aulasMeuJeito.entries()) {
    const manifest = gerarManifestoMeuJeito(lesson)
    const path = resolve(
      import.meta.dir,
      `../../aulas-interativas/o-jogo-do-meu-jeito/meu-jeito-${lesson.slug}`,
    )
    gravarArquivo(`${path}.manifesto.json`, `${JSON.stringify(manifest, null, 2)}\n`)
    manifestos.push(`${path}.manifesto.json`)
    gravarArquivo(`${path}.roteiro.md`, roteiro(lesson, index))
    gravarArquivo(`${path}.md`, proposta(lesson, index, manifest))
  }
  // Mesmo formato que a CI confere (biome ci), como nos geradores do Cadê e do Farol.
  const formatado = Bun.spawnSync({
    cmd: [process.execPath, 'x', 'biome', 'format', '--write', ...manifestos],
    cwd: resolve(import.meta.dir, '../../..'),
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (formatado.exitCode !== 0)
    throw new Error(`Biome não formatou os manifestos: ${formatado.stderr.toString()}`)
  console.log(`${aulasMeuJeito.length} trios de O Jogo do Meu Jeito gerados.`)
}
