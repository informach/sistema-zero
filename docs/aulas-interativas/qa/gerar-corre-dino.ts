/** Uma fonte editorial gera proposta, roteiro e manifesto. Não importa nem publica aulas. */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type {
  InteractiveBlock,
  LearningManifest,
  SectionIntent,
} from '../../../packages/core/src/learning'
import type { SectionProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { SERVER_BLOCK_CATALOG } from '../../../packages/studio/src/blockly/blockCatalog'
import { etapasDino, ORDEM_DINO, projetoDino } from './corre-dino-etapas'

export interface SecaoDino {
  key: string
  title: string
  bridge: string
  screen?: string
  /** Experiência: o meme ilustrado que acompanha a comparação do dia a dia (nota de tela). */
  meme?: string
  speech?: string[]
  /**
   * Os passos que o Caderno do Aluno imprime, no imperativo. Existe onde o vídeo é demonstração
   * na primeira pessoa (experiências e jogo pronto), que não serve como passo para a criança.
   */
  caderno?: string[]
  videoKey?: string
  checks?: SectionProjectCheck[]
  final?: boolean
  kind: string
  activity?: InteractiveBlock
  activityKey?: string
  play?: boolean
  materials?: boolean
  publish?: boolean
  questions?: Extract<
    NonNullable<LearningManifest['blocks'][number]['content']>,
    { kind: 'quiz' }
  >['questions']
}
export interface AulaDino {
  slug: string
  title: string
  entry: string
  outcome: string
  reason: string
  concepts: string[][]
  sections: SecaoDino[]
  legacyKeys: string[]
  previousRetireKeys: string[]
}
const DIR = resolve(import.meta.dir, '../aulas')
export const aulasDino = JSON.parse(
  readFileSync(resolve(import.meta.dir, 'corre-dino.conteudo.json'), 'utf8'),
) as AulaDino[]
const CURSO = 'corre-dino'
// Fórmulas fixas do vocabulário da aventura (Diretrizes, seção 6): verificação, envio e saída.
const checkExit =
  'Funcionou? Clique em Verificar esta parte. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo cumprido!, espere aparecer Salvo.'
const send = 'Depois, clique em Enviar meu projeto e confirme em Enviar.'
// Na aula, o Compartilhar não mostra o campo Título e traz o resumo do manifesto (showcase).
const publish =
  'Quando o envio terminar, se quiser mostrar o seu jogo no Mural, clique em Compartilhar. Você pode publicar agora ou deixar para outra hora. O resumo do projeto já vem preenchido. Deixe como está. Clique em Gerar capa e confira a imagem. Depois, clique em Publicar e espere a confirmação. Seu jogo está no Mural! Que conquista! Agora você, sua família e seus amigos podem jogar o jogo que você criou. Clique em Copiar link de jogar e mande o link para a sua família e seus amigos. Quem receber pode jogar direto, até no celular. Se precisar, peça ajuda a um adulto para mandar. Depois de copiar o link, clique em Fechar.'
/** O fim de todo vídeo de experiência: só aqui a vez passa para quem faz a aula. */
export const SUA_VEZ =
  'Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte.'
/** O modelo da nota de tela das experiências (Diretrizes, seção 2: o vídeo é uma demonstração). */
const telaExperiencia =
  'Demonstração: quem faz os testes é o narrador, na primeira pessoa. Fazer cada gesto no ritmo da fala e deixar o resultado real à vista (palco, faixa e contadores) enquanto a fala explica por que ele aconteceu, sem cortar entre o gesto e o resultado.'

export function ehExperiencia(section: SecaoDino): boolean {
  return section.activity?.activity.type === 'experimentation'
}

/** A nota "Na tela" do vídeo. Nas montagens, é a nota da fonte; nas experiências, o modelo. */
export function telaSecao(section: SecaoDino): string {
  if (!ehExperiencia(section)) return section.screen ?? ''
  const meme = section.meme
    ? ` Meme ilustrado na frase da comparação, por 2 a 3 segundos: ${section.meme} Desenho nosso, sem foto de pessoa real nem meme da internet, sem cobrir a experiência.`
    : ''
  return `${telaExperiencia} ${section.screen}${meme} Em Agora é a sua vez, parar os gestos e mostrar a experiência e o botão Próxima parte.`
}

export function falasSecao(section: SecaoDino): string[] {
  const speech = [...(section.speech ?? [])]
  if (ehExperiencia(section)) speech.push(SUA_VEZ)
  if (section.checks?.length) {
    speech.push(
      `${checkExit} ${section.final ? `${send} ${section.publish ? `${publish} Por último, clique em Concluir fase.` : 'Quando o envio terminar, clique em Concluir fase.'}` : 'Depois, clique em Próxima parte.'}`,
    )
  }
  return speech
}
function types(value: unknown): string[] {
  const found = new Set<string>()
  const walk = (v: unknown) => {
    if (typeof v === 'string' && v.startsWith('sz_')) found.add(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(value)
  return [...found].sort()
}
export function gerarManifestoDino(lesson: AulaDino, index: number): LearningManifest {
  const checkpoints = etapasDino()
  const allowed = types([checkpoints[index + 1], lesson.sections.map((s) => s.checks)])
  const blocks: LearningManifest['blocks'] = []
  const sections: LearningManifest['sections'] = []
  for (const s of lesson.sections) {
    const blockKeys: string[] = []
    const required: string[] = []
    const add = (
      key: string,
      content: NonNullable<LearningManifest['blocks'][number]['content']>,
      needed = false,
    ) => {
      blocks.push({ key, content })
      blockKeys.push(key)
      if (needed) required.push(key)
    }
    if (s.videoKey) {
      blocks.push({
        key: s.videoKey,
        plannedVideo: `Título: ${s.title}\n\nRegravar no Estúdio atual. ${telaSecao(s)}\n\nFala completa em ${CURSO}-${lesson.slug}.roteiro.md. Preservar a mídia existente até a troca revisada; este campo não publica nem substitui a gravação. Duração: estimar pela fala e pelos gestos do roteiro, sem acelerar encaixes.`,
      })
      blockKeys.push(s.videoKey)
      required.push(s.videoKey)
    }
    add(`fala-${s.key}`, { kind: 'dialogue', pose: 'speaking', text: s.bridge })
    if (s.questions) add('quiz', { kind: 'quiz', passingScore: 100, questions: s.questions }, true)
    if (s.activity) add(s.activityKey ?? `experiencia-${s.key}`, s.activity, true)
    if (s.play)
      add(
        'jogo-pronto',
        {
          kind: 'interactive',
          required: true,
          title: 'Experimente o jogo pronto',
          instructions:
            'Clique na área do jogo para começar. Toque e solte a barra de espaço ou a seta para cima, ou toque na parte de cima da tela, para pular. Tente passar pelos cactos. Depois de perder, uma entrada volta à abertura e outra começa. Você pode continuar mesmo sem bater recorde.',
          hints: [],
          activity: {
            type: 'project-play',
            completion: 'participation',
            project: projetoDino(13),
            stage: { width: 480, height: 270 },
            targets: [],
          },
        },
        true,
      )
    if (s.materials)
      add('caderno', {
        kind: 'materials',
        title: 'Mapa da Aventura: Corre, Dino!',
        bookPreview: true,
        items: [],
      })
    if (s.final) {
      blockKeys.push('projeto')
      required.push('projeto')
    }
    const intent =
      s.kind === 'practice' ? 'application' : s.kind === 'reflection' ? 'explanation' : s.kind
    sections.push({
      key: s.key,
      title: s.title,
      intent: intent as SectionIntent,
      objective: s.bridge,
      blockKeys,
      workspaceKey: s.checks?.length ? 'projeto' : null,
      externalTool: null,
      pendingMedia: [],
      completion: {
        version: 1,
        blockIds: required,
        ...(s.checks?.length ? { projectChecks: s.checks } : {}),
      },
    })
  }
  blocks.push({
    key: 'projeto',
    content: {
      kind: 'studio',
      purpose: 'submission',
      chain: CURSO,
      level: 'iniciante-2d',
      allowedModes: ['blocks'],
      allowLevelReveal: false,
      allowBlocks: allowed,
      showcase: {
        enabled: index === 12,
        title: 'Corre, Dino!',
        summary:
          'Pule os cactos, some pontos e tente ir mais longe numa corrida que fica mais rápida.',
      },
      initialProject: projetoDino(index),
    },
  })
  const present = new Set(blocks.map((b) => b.key))
  return {
    version: 5,
    courseSlug: CURSO,
    lessonSlug: lesson.slug,
    title: lesson.title,
    retireBlockKeys: [...new Set([...lesson.previousRetireKeys, ...lesson.legacyKeys])].filter(
      (key) => !present.has(key),
    ),
    blocks,
    sections,
  }
}
function roteiro(lesson: AulaDino, index: number) {
  const lines = [
    `# Roteiro de gravação · Corre, Dino! · Aula ${index + 1}`,
    '',
    `**${lesson.title}**`,
    '',
    'Fonte: `qa/corre-dino.conteudo.json`. Gerado por `qa/gerar-corre-dino.ts`. Revise a fonte e regenere os três arquivos juntos.',
    '',
    `Entrada: ${lesson.entry} Saída: ${lesson.outcome}`,
    '',
    `${index === 0 ? 'Começar com o projeto vazio preparado para esta aula.' : 'Retomar o projeto enviado na aula anterior. O projeto inicial é alternativa quando não houver envio, nunca substituição do trabalho salvo.'} Mostrar caminhos, campos e encaixes sem cortes. A prévia do Estúdio é automática. Só a narração é gravada; a ponte do Zappy é texto da página.`,
    '',
    'Toda fala é uma conversa contínua com quem está fazendo a aula: as frases se ligam umas às outras ("por isso", "mas", "agora que", "ou seja"), cada resultado vem junto do porquê e a fala chama a atenção para o que aparece na tela ("Olha aqui", "Olha só", "Repare", "Tá vendo?"). Neste curso, "então" é o encaixe do bloco Se e não serve de palavra de ligação. A montagem que aplica uma experiência começa pela retomada no próprio jogo, e a ponte do Zappy convida e termina na ação de saída (Diretrizes, seção 6, revisão de 06/10/2026).',
    '',
  ]
  lesson.sections.forEach((s, i) => {
    lines.push(`## Seção ${i + 1}. ${s.title}`, '')
    if (s.videoKey) {
      const speech = falasSecao(s)
      const words = speech.join(' ').split(/\s+/).length
      const voice = Math.ceil(words / 130)
      lines.push(
        `### Clipe \`${s.videoKey}\` · ${s.title}`,
        '',
        `**Estimativa de gravação:** aproximadamente ${voice} minuto(s) de fala, mais o tempo dos gestos e testes. Recalibrar no ensaio; não acelerar a montagem para caber.`,
        '',
        `**Na tela:** ${telaSecao(s)} ${s.checks?.length ? `Ao terminar, clicar em Verificar esta parte, mostrar Objetivo cumprido!, aguardar Salvo e seguir o encaminhamento narrado${s.final ? ' (Enviar meu projeto, Enviar e Concluir fase)' : ' (Próxima parte)'}.` : ''}${s.publish ? ' Na publicação opcional, mostrar Compartilhar com o resumo já preenchido, Gerar capa, Publicar e a comemoração Seu jogo está no Mural!, com o botão Copiar link de jogar.' : ''}`.trimEnd(),
        '',
        '**Narração:**',
        `> "${speech.join('\n>\n> ')}"`,
        '',
      )
    }
    lines.push(`**Zappy na página (não gravar):** ${s.bridge}`, '')
    if (s.questions)
      lines.push(
        'Sem vídeo ou ferramenta nesta seção. O quiz vem imediatamente depois do Zappy. Leia a explicação após enviar; tentativas ilimitadas, sem espera.',
        '',
      )
  })
  return lines.join('\n')
}
function proposta(lesson: AulaDino, index: number, manifest: LearningManifest) {
  const lines = [
    `# Corre, Dino! · Aula ${index + 1} · ${lesson.title}`,
    '',
    'Fonte editorial: `qa/corre-dino.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-corre-dino.md).',
    '',
    '## Resumo',
    '',
    `- Estado de entrada: ${lesson.entry}`,
    `- Resultado da aula: ${lesson.outcome}`,
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
      `**Tarefa:** ${s.bridge}`,
      '',
      `**Blocos na página:** ${manifest.sections[i]!.blockKeys.join(' → ')}.`,
      '',
      `**Zappy na página (não gravar):** ${s.bridge}`,
      '',
    )
    if (s.activity)
      lines.push(
        `**Experiência existente:** \`${s.activity.activity.type === 'experimentation' ? s.activity.activity.scene : s.activity.activity.type}\`. ${s.activity.instructions} Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena. O vídeo é uma demonstração: o narrador faz esses testes na primeira pessoa, explica cada resultado e só no fim passa a vez.`,
        '',
      )
    if (s.play)
      lines.push(
        'Versão completa do mesmo jogo, derivada do marco original 13. Conclusão por participação; vencer não é exigência para conhecer o jogo.',
        '',
      )
    if (s.materials)
      lines.push(
        'Anexar somente `output/pdf/corre-dino-caderno.pdf` ao bloco caderno. Ler, baixar e imprimir são opcionais; não entram na conclusão.',
        '',
      )
    if (s.checks?.length)
      lines.push(
        '**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta parte' +
          (s.final ? ', com o envio em Enviar meu projeto confirmado em Enviar.' : '.'),
        '',
        ...s.checks.map((c) => `- ${c.label}`),
        '',
      )
    if (s.questions)
      lines.push(
        '**Revisão formativa:** Zappy → quiz. Todas corretas, com explicação e novas tentativas sem limite nem espera. Perguntas do manifesto; nenhum conteúdo novo nesta seção.',
        '',
      )
    if (s.publish)
      lines.push(
        'Publicação opcional após o envio: Compartilhar → resumo já preenchido → Gerar capa → conferir → Publicar → Seu jogo está no Mural! → Copiar link de jogar → Fechar → Concluir fase. Não bloquear a conclusão por publicação.',
        '',
      )
  })
  const studio = manifest.blocks.find((b) => b.key === 'projeto')!.content
  const allowed = studio?.kind === 'studio' ? (studio.allowBlocks ?? []) : []
  lines.push(
    '## Blocos disponíveis',
    '',
    '| Bloco | Caminho na paleta |',
    '| --- | --- |',
    ...allowed.map((type) => {
      const b = SERVER_BLOCK_CATALOG.find((x) => x.type === type)
      if (!b) throw new Error(`Bloco ausente: ${type}`)
      return `| ${b.label.replaceAll('|', '/')} | ${b.palettePath.join(' → ')} |`
    }),
    '',
    '## Continuidade e produção',
    '',
    `Aula ${index + 1} na cadeia \`${CURSO}\`. Entrada: etapa ${index}; saída: etapa ${index + 1} de \`qa/corre-dino-etapas.ts\`. Os 13 marcos originais e o código do jogo permanecem preservados.`,
    '',
    'A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.',
    '',
  )
  return lines.join('\n')
}

if (import.meta.main) {
  if (aulasDino.map((a) => a.slug).join() !== ORDEM_DINO.join())
    throw new Error('Ordem editorial e projetos divergentes')
  const manifestos: string[] = []
  for (const [i, lesson] of aulasDino.entries()) {
    const m = gerarManifestoDino(lesson, i)
    const path = resolve(DIR, `${CURSO}-${lesson.slug}`)
    writeFileSync(`${path}.manifesto.json`, `${JSON.stringify(m, null, 2)}\n`)
    manifestos.push(`${path}.manifesto.json`)
    writeFileSync(`${path}.roteiro.md`, roteiro(lesson, i))
    writeFileSync(`${path}.md`, proposta(lesson, i, m))
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
  console.log(`${aulasDino.length} trios de Corre, Dino! gerados.`)
}
