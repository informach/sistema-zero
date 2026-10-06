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
import { etapasNave, ORDEM_NAVE, projetoNave } from './nave-contra-asteroides-etapas'

export interface SecaoNave {
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
export interface AulaNave {
  slug: string
  title: string
  entry: string
  outcome: string
  reason: string
  concepts: string[][]
  sections: SecaoNave[]
  legacyKeys: string[]
  previousRetireKeys: string[]
}
const DIR = resolve(import.meta.dir, '../aulas')
export const aulasNave = JSON.parse(
  readFileSync(resolve(import.meta.dir, 'nave-contra-asteroides.conteudo.json'), 'utf8'),
) as AulaNave[]
const CURSO = 'nave-contra-asteroides'
const checkExit =
  'Funcionou? Clique em Verificar esta etapa. Se faltar alguma coisa, corrija os blocos e clique novamente. Quando aparecer Objetivo da etapa cumprido!, espere a indicação Salvo.'
const send = 'Clique em Enviar para o professor e confirme em Enviar.'
// Na aula, o Compartilhar não mostra o campo de título e já traz o resumo do curso. A comemoração
// do Mural oferece Copiar link de jogar antes de Fechar (ajuste do responsável em 06/10/2026).
const publish =
  'Publicar no Mural é opcional; você também pode deixar para outra hora. Se quiser mostrar o jogo agora, clique em Compartilhar depois do envio. O resumo do projeto já vem preenchido. Deixe como está. Clique em Gerar capa e confira a imagem. Depois clique em Publicar. Seu jogo está no Mural! Que conquista! Agora você, sua família e seus amigos podem jogar o jogo que você criou. Clique em Copiar link de jogar e mande o link para a sua família e seus amigos. Quem receber pode jogar direto, até no celular. Se precisar, peça ajuda a um adulto para mandar. Depois de copiar o link, clique em Fechar.'

export function falasSecao(section: SecaoNave): string[] {
  const speech = [...(section.speech ?? [])]
  if (section.checks?.length) {
    speech.push(
      // Depois da publicação, o fecho diz "Por último": a fala já termina em "Depois de copiar o link".
      `${checkExit} ${section.final ? `${send} ${section.publish ? `${publish} Por último` : 'Depois'}, clique em Concluir aula.` : 'Depois, clique em Próxima seção.'}`,
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
export function gerarManifestoNave(lesson: AulaNave, index: number): LearningManifest {
  const checkpoints = etapasNave()
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
            'Clique no jogo. Enter começa; as setas movem a nave e a barra de espaço atira. Conheça os controles e continue quando quiser.',
          hints: [],
          activity: {
            type: 'project-play',
            completion: 'participation',
            project: projetoNave(9),
            stage: { width: 800, height: 480 },
            targets: [],
          },
        },
        true,
      )
    if (s.materials)
      add('caderno', {
        kind: 'materials',
        title: 'Caderno do Aluno: Nave Contra Asteroides',
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
        enabled: index === 8,
        title: 'Nave contra Asteroides',
        summary:
          'Mova a nave, acerte os asteroides e tente chegar a 26 pontos sem perder as três vidas.',
      },
      initialProject: projetoNave(index),
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
function roteiro(lesson: AulaNave, index: number) {
  const lines = [
    `# Roteiro de gravação · Nave Contra Asteroides · Aula ${index + 1}`,
    '',
    `**${lesson.title}**`,
    '',
    'Fonte: `qa/nave-contra-asteroides.conteudo.json`. Gerado por `qa/gerar-nave-contra-asteroides.ts`. Revise a fonte e regenere os três arquivos juntos.',
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
function proposta(lesson: AulaNave, index: number, manifest: LearningManifest) {
  const lines = [
    `# Nave Contra Asteroides · Aula ${index + 1} · ${lesson.title}`,
    '',
    'Fonte editorial: `qa/nave-contra-asteroides.conteudo.json`. Este arquivo, o roteiro e o manifesto são gerados juntos. Para a sequência completa e a implantação, consulte [o mapa do curso](../modulos-nave-contra-asteroides.md).',
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
        'Versão completa do mesmo jogo, derivada do marco original 5. Conclusão por participação; vencer não é exigência para conhecer o jogo.',
        '',
      )
    if (s.materials)
      lines.push(
        'Anexar somente `output/pdf/nave-contra-asteroides-caderno.pdf` ao bloco caderno. Ler, baixar e imprimir são opcionais; não entram na conclusão.',
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
        'Publicação opcional após o envio: Compartilhar → resumo já preenchido, sem mexer → Gerar capa → conferir → Publicar → Seu jogo está no Mural! → Copiar link de jogar → Fechar → Concluir aula. Não bloquear a conclusão por publicação.',
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
    `Aula ${index + 1} na cadeia \`${CURSO}\`. Entrada: etapa ${index}; saída: etapa ${index + 1} de \`qa/nave-contra-asteroides-etapas.ts\`. Os cinco marcos originais e o código do jogo permanecem preservados.`,
    '',
    'A ordem vídeo → Zappy → atividade é editorial. Configurar videoBeforeActivity no curso e conferir com perfil de aluno; não presumir que a ordem por si só ativa o bloqueio. Gravar os vídeos revisados, anexar o PDF quando aplicável e ensaiar com crianças antes de declarar o percurso validado.',
    '',
  )
  return lines.join('\n')
}

if (import.meta.main) {
  if (aulasNave.map((a) => a.slug).join() !== ORDEM_NAVE.join())
    throw new Error('Ordem editorial e projetos divergentes')
  const manifestos: string[] = []
  for (const [i, lesson] of aulasNave.entries()) {
    const m = gerarManifestoNave(lesson, i)
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
  console.log(`${aulasNave.length} trios de Nave Contra Asteroides gerados.`)
}
