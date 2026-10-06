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
  speech?: string[]
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
const checkExit =
  'Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo.'
const send = 'Clique em Enviar para o professor e confirme em Enviar.'
const publish =
  'Se quiser mostrar o jogo no Mural, clique em Compartilhar depois do envio. Confira o título e escreva um resumo do seu jogo. Clique em Gerar capa e confira a imagem. Depois clique em Publicar. Espere a mensagem Seu jogo está no Mural! e clique em Fechar. Publicar é opcional; você também pode deixar para outra hora.'

export function falasSecao(section: SecaoDino): string[] {
  const speech = [...(section.speech ?? [])]
  if (section.checks?.length) {
    speech.push(
      `${checkExit} ${section.final ? `${send} ${section.publish ? `${publish} ` : ''}Depois, clique em Concluir aula.` : 'Depois, clique em Próxima seção.'}`,
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
        plannedVideo: `Título: ${s.title}\n\nRegravar no Estúdio atual. ${s.screen}\n\nFala completa em ${CURSO}-${lesson.slug}.roteiro.md. Preservar a mídia existente até a troca revisada; este campo não publica nem substitui a gravação. Duração: estimar pela fala e pelos gestos do roteiro, sem acelerar encaixes.`,
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
            'Clique na área do jogo para começar. Toque e solte a barra de espaço, a seta para cima ou a tela para pular. Tente passar pelos cactos. Depois de perder, uma entrada volta à abertura e outra começa. Você não precisa bater recorde para continuar.',
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
        title: 'Caderno do Aluno: Corre, Dino!',
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
        `**Na tela:** ${s.screen} ${s.checks?.length ? 'Ao terminar, mostrar Verificar esta etapa e o resultado, aguardar Salvo e seguir o encaminhamento narrado.' : ''}`.trimEnd(),
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
        `**Experiência existente:** \`${s.activity.activity.type === 'experimentation' ? s.activity.activity.scene : s.activity.activity.type}\`. ${s.activity.instructions} Sem palpite e sem pergunta final. Os controles e metas foram conferidos no código da cena.`,
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
        '**Conclui quando:** vídeo assistido e critérios conferidos em Verificar esta etapa' +
          (s.final ? ', com envio confirmado ao professor.' : '.'),
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
        'Publicação opcional após o envio: Compartilhar → título e resumo → Gerar capa → conferir → Publicar → Seu jogo está no Mural! → Fechar → Concluir aula. Não bloquear a conclusão por publicação.',
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
