/** Gera os três documentos de cada aula; não importa nem publica conteúdo. */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type {
  InteractiveBlock,
  LearningManifest,
  SectionIntent,
} from '../../../packages/core/src/learning'
import { ORDEM_MEU_JEITO, projetoMeuJeito } from './meu-jeito-etapas'

type Content = Extract<LearningManifest['blocks'][number], { content: unknown }>['content']
export interface SecaoMeuJeito {
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
 * A fala completa da seção. As frases fixas falam o vocabulário da aventura (Diretrizes, seção 6,
 * 06/10/2026): a criança ouve fase, parte e guia, e os botões pelo nome novo (Próxima parte).
 */
export function falasSecao(s: SecaoMeuJeito): string[] {
  const speech = [...(s.speech ?? [])]
  if (s.key === 'compartilhar') {
    // Publicar é opcional e não tem uma conferência anterior para comparar (revisão de 06/10/2026).
    speech.push(
      'Pause aqui se escolheu publicar. Use Abrir meu Estúdio se a ferramenta ainda não estiver aberta. Depois de clicar em Fechar, volte a esta aba e clique em Próxima parte.',
    )
  } else if (s.externalTool && !s.final) {
    const tool = s.externalTool === 'pinta' ? 'Pinta' : 'Estúdio'
    speech.push(
      `Pause aqui para fazer esta parte no seu ${tool === 'Pinta' ? 'desenho' : 'jogo'}. Use Abrir meu ${tool} se a ferramenta ainda não estiver aberta. Compare o resultado com a conferência que a gente acabou de fazer. Antes de sair, espere ${tool === 'Pinta' ? 'Guardado na sua conta' : 'Salvo'}. Volte a esta aba e clique em Próxima parte.`,
    )
  }
  return speech
}
/**
 * A nota "Na tela". Nas experiências o vídeo é uma DEMONSTRAÇÃO (Diretrizes, decisão de
 * 06/10/2026): o narrador faz os testes na primeira pessoa e só no fim passa a vez. As montagens e
 * o jogo pronto usam a nota da própria seção, sem este modelo.
 */
export function telaSecao(s: SecaoMeuJeito): string {
  if (!s.activity) return s.screen ?? ''
  const meme = s.meme
    ? ` Meme na comparação: ${s.meme} Desenho nosso no formato de meme, com o Zappy ou os personagens do jogo; sem foto de pessoa real nem meme da internet. Fica 2 a 3 segundos na tela, sem cobrir a experiência, e a narração explica sem depender dele.`
    : ''
  return `Demonstração na primeira pessoa: o narrador faz cada teste no ritmo da fala e deixa ver o resultado real antes de explicar; o vídeo não dá ordens antes de passar a vez. ${s.screen}${meme} No fim, apontar a experiência para a pessoa repetir os mesmos testes e apontar Próxima parte.`
}
export function gerarManifestoMeuJeito(lesson: AulaMeuJeito): LearningManifest {
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
        plannedVideo: `Título: ${s.title}\n\nRegravar nas ferramentas atuais. ${telaSecao(s)}\n\nFala completa em meu-jeito-${lesson.slug}.roteiro.md. Estimar a duração pela fala e pelos gestos; não acelerar para caber. Preservar a mídia existente até a substituição revisada. Este campo não publica nem substitui gravações.`,
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
            'Clique no jogo. Enter começa; as setas movem a nave e Espaço atira. Depois que a partida terminar, Enter volta à abertura e outro Enter começa. Observe as artes. Você pode seguir mesmo sem vencer.',
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
      // A chave continua `materiais-caderno`; para a criança, o caderno é o Mapa da Aventura.
      add('materiais-caderno', {
        kind: 'materials',
        title: 'Mapa da Aventura: O Jogo do Meu Jeito',
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
  const lines = [
    `# Roteiro de gravação · O Jogo do Meu Jeito · Aula ${index + 1}`,
    '',
    `**${lesson.title}**`,
    '',
    'Fonte: `qa/meu-jeito.conteudo.json`. Gerado por `qa/gerar-meu-jeito.ts`. Revise a fonte e regenere proposta, roteiro e manifesto juntos.',
    '',
    `Entrada: ${lesson.entry} Saída: ${lesson.outcome}`,
    '',
    'Retomar o trabalho do aluno na ferramenta externa. Não substituir por um modelo. Mostrar caminhos, campos, formas e encaixes sem cortes. A prévia do Estúdio é automática. A ponte do Zappy é texto na página; não entra na narração. As conferências do desenho são visuais, sem aprovação automática por assistir ao vídeo.',
    '',
    'Nas experiências, o vídeo é uma demonstração: a primeira frase diz o conceito, o narrador faz os testes na primeira pessoa a partir de "Olha aqui:", explica por que cada resultado aconteceu e só no fim passa a vez. Nas aplicações no Pinta e no Estúdio, a fala segue no imperativo, para fazer junto.',
    '',
    'Vocabulário da aventura (06/10/2026): na narração, na ponte do Zappy e nos títulos, a criança ouve e lê fase, parte, Mapa da Aventura e guia, e os botões pelo nome novo (Próxima parte, Concluir fase, Enviar para o guia, Recebido pelo seu guia.). Aula, seção e caderno ficam só nas notas da equipe.',
    '',
  ]
  lesson.sections.forEach((s, i) => {
    lines.push(`## Seção ${i + 1}. ${s.title}`, '')
    if (s.videoKey) {
      const speech = falasSecao(s)
      lines.push(
        `### Clipe \`${s.videoKey}\` · ${s.title}`,
        '',
        `**Estimativa de gravação:** aproximadamente ${Math.ceil(speech.join(' ').split(/\s+/).length / 130)} minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio.`,
        '',
        `**Na tela:** ${telaSecao(s)} ${s.externalTool ? 'Mostrar a passagem entre a aba da aula e a ferramenta, o trabalho salvo e o resultado de referência para a autoconferência narrada.' : ''}`.trimEnd(),
        '',
        '**Narração:**',
        `> "${speech.join('\n>\n> ')}"`,
        '',
      )
    }
    lines.push(`**Zappy na página (não gravar):** ${s.bridge}`, '')
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
    'Fonte editorial: `qa/meu-jeito.conteudo.json`. Gerador: `qa/gerar-meu-jeito.ts`. Consulte [o mapa do curso](../modulos-o-jogo-do-meu-jeito.md).',
    '',
    '## Resumo',
    '',
    `- Entrada: ${lesson.entry}`,
    `- Resultado: ${lesson.outcome}`,
    `- Seções: ${lesson.sections.length}. Vídeos: ${lesson.sections.filter((s) => s.videoKey).length}.`,
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
    if (s.activity)
      lines.push(
        `**Experiência existente:** \`${s.activity.activity.type === 'experimentation' ? s.activity.activity.scene : s.activity.activity.type}\`. ${s.activity.instructions} Sem palpite, pistas ou pergunta final.`,
        '',
      )
    if (s.externalTool)
      lines.push(
        `**Aplicação no ${s.externalTool === 'pinta' ? 'Pinta' : 'Estúdio'}:** o roteiro inclui o caminho, a ação e a autoconferência visual. ${s.final ? 'Conclusão exige vídeo e recebimento da entrega pela galeria.' : 'Esta seção registra o vídeo; o recebimento do trabalho é exigido na entrega final desta aula. Assistir não comprova a qualidade do desenho.'}`,
        '',
      )
    if (s.play)
      lines.push(
        'Jogo derivado do marco original 8, com artes ilustrativas de dois quadros. Conclusão por participação. As artes são exemplos; não substituem as criações do aluno.',
        '',
      )
    if (s.materials)
      lines.push(
        'Anexar `output/pdf/meu-jeito-caderno.pdf`, que a criança conhece como Mapa da Aventura, a `materiais-caderno`. Ler, baixar e imprimir são opcionais e não entram na conclusão; a fala oferece ler aqui ou baixar como convite.',
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
    const path = resolve(import.meta.dir, `../aulas/meu-jeito-${lesson.slug}`)
    writeFileSync(`${path}.manifesto.json`, `${JSON.stringify(manifest, null, 2)}\n`)
    manifestos.push(`${path}.manifesto.json`)
    writeFileSync(`${path}.roteiro.md`, roteiro(lesson, index))
    writeFileSync(`${path}.md`, proposta(lesson, index, manifest))
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
