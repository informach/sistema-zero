/** Autoria local. Importação, gravação e publicação são operações de produção separadas. */
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest, type LearningManifest } from '../../../packages/core/src/learning'
import {
  LEARNING_IMPORT_BODY_MAX_BYTES,
  learningImportBodyBytes,
} from '../../../packages/core/src/learning/authoring-manifest-projection'
import type { StudioProjectExamples } from '../../../packages/core/src/learning/studio-project-examples'
import { isStudioAuthoringProject } from '../../../packages/core/src/studio/authoring-project'
import { resolveCourseModels } from '../../../packages/studio/src/core/courseModels'
import { derivadosDeVoz } from './gerar-falas-elevenlabs'
import { gravarArquivo } from './gravar-arquivo'
import { jardimAjuda, jardimAulas } from './jardim-conteudo'
import { jardimChecks } from './jardim-criterios'
import {
  JARDIM_CURSO,
  JARDIM_ETAPAS,
  type JardimEtapa,
  montarProjetoJardim,
} from './jardim-projeto'
import { jardimQuiz } from './jardim-quiz'
import { extrairPartesElevenLabs, sincronizarRecadosNaPagina } from './roteiro-elevenlabs'

const dir = resolve(import.meta.dirname, '../../aulas-interativas/faisca/o-jardim-secreto')
mkdirSync(dir, { recursive: true })
const write = (name: string, v: unknown) =>
  gravarArquivo(resolve(dir, name), typeof v === 'string' ? v : `${JSON.stringify(v, null, 2)}\n`)
const help = `# Passo a passo do projeto — O Jardim Secreto\n\nMissão Faísca. Ajuda opcional: comece pelo resultado, relembre a ideia e abra a montagem se precisar. Você pode programar em outra ordem, repetir testes e escolher mensagens e posições.\n\n${jardimAulas
  .map(
    (a) =>
      `## ${a.title}\n\n${jardimAjuda(a.dimension)
        .map(
          (h) =>
            `### ${h.title}\n\n**Relembre:** ${h.idea}\n\n${h.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n**Teste:** ${h.test}\n\n**Se não funcionar:** ${h.correction}`,
        )
        .join('\n\n')}`,
  )
  .join(
    '\n\n',
  )}\n\n## Entrega\n\nEm cada aula, verifique os objetivos, aguarde Salvo, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula. Não precisa publicar na comunidade. Concluir a missão não concede certificado nem promove sozinho: a jornada também confere os dois cursos-base e um Poder distinto.\n`
write('passo-a-passo.md', help)
const inventory: Record<string, string[]> = {}
for (const [index, aula] of jardimAulas.entries()) {
  const projects = Object.fromEntries(
    JARDIM_ETAPAS.map((p) => [p, montarProjetoJardim(aula.dimension, p)]),
  ) as Record<JardimEtapa, ReturnType<typeof montarProjetoJardim>>
  const palette = new Set<string>()
  const visit = (v: unknown) => {
    if (!v || typeof v !== 'object') return
    if ('type' in v && typeof v.type === 'string' && v.type.startsWith('sz_')) palette.add(v.type)
    for (const c of Object.values(v)) visit(c)
  }
  visit(projects.posicao.blocksState)
  inventory[aula.dimension] = [...palette].sort()
  const id = (p: JardimEtapa) =>
    `fa15ca00-0000-4000-800${index}-${String(JARDIM_ETAPAS.indexOf(p) + 1).padStart(12, '0')}`
  const authoredProject = (part: JardimEtapa) => {
    const project = projects[part]
    if (!isStudioAuthoringProject(project)) throw Error('Projeto inválido: ' + part)
    return project
  }
  const examples: StudioProjectExamples['examples'] = { [id('inicio')]: authoredProject('inicio') },
    mapping: StudioProjectExamples['sections'] = {}
  let previous: JardimEtapa = 'inicio'
  const sections: LearningManifest['sections'] = [],
    blocks: LearningManifest['blocks'] = []
  for (const t of aula.trechos) {
    const keys: string[] = [],
      required: string[] = []
    if (t.kind !== 'quiz') {
      keys.push(`video-${t.key}`)
      required.push(`video-${t.key}`)
      blocks.push({
        key: `video-${t.key}`,
        plannedVideo: `Título: ${t.title}\n\nMaster integral da professora: ${aula.slug}.roteiro.md, clipe video-${t.key}. Gravação pendente.`,
      })
    }
    const text =
      t.kind === 'intro'
        ? 'Clique no jogo e experimente. Use as setas do teclado; R começa outra partida. Você pode seguir sem terminar. Depois clique em Próxima parte.'
        : t.kind === 'material'
          ? 'Abra a ajuda quando precisar. Há lembretes, montagem completa e testes dos dois jardins. Consultar é opcional. Depois clique em Próxima parte.'
          : t.kind === 'quiz'
            ? 'Escolha uma resposta. Nas perguntas com cena, clique em Ver o que acontece; na outra, clique em Responder. Leia a explicação e tente de novo se precisar.'
            : t.kind === 'delivery'
              ? 'Confira os objetivos, aguarde Salvo e clique em Enviar meu projeto. Confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.'
              : 'Monte e teste a regra no seu jardim. Você pode experimentar e consultar a ajuda quantas vezes quiser. Clique em Verificar projeto, confira os objetivos desta parte e aguarde Salvo. Depois clique em Próxima parte.'
    keys.push(`ponte-${t.key}`)
    blocks.push({ key: `ponte-${t.key}`, content: { kind: 'dialogue', pose: 'speaking', text } })
    if (t.kind === 'intro') {
      keys.push('jogo-pronto')
      required.push('jogo-pronto')
      blocks.push({
        key: 'jogo-pronto',
        content: {
          kind: 'interactive',
          title: 'Jogue O Jardim Secreto',
          required: true,
          instructions:
            'Clique no jogo e use as setas do teclado. Recolha o regador e leve o personagem à flor. R começa outra partida. Você pode seguir sem terminar.',
          hints: [],
          activity: {
            type: 'project-play',
            project: projects.posicao,
            stage: { width: 960, height: 600 },
            completion: 'participation',
            targets: [],
          },
        },
      })
    }
    if (t.kind === 'material') keys.push('materiais')
    if (t.kind === 'quiz') {
      keys.push('quiz')
      required.push('quiz')
      blocks.push({ key: 'quiz', content: jardimQuiz })
    }
    const studio = t.kind === 'build' || t.kind === 'delivery'
    if (t.kind === 'delivery') {
      keys.push('projeto')
      required.push('projeto')
    }
    if (studio && t.etapa) {
      examples[id(t.etapa)] = authoredProject(t.etapa)
      mapping[t.key] = { entryExampleId: id(previous), solutionExampleId: id(t.etapa) }
      previous = t.etapa
    }
    sections.push({
      key: t.key,
      title: t.title,
      intent:
        t.kind === 'build'
          ? 'application'
          : t.kind === 'delivery'
            ? 'delivery'
            : t.kind === 'material'
              ? 'material'
              : 'explanation',
      objective: `${t.title}.`,
      blockKeys: keys,
      workspaceKey: studio ? 'projeto' : null,
      externalTool: null,
      pendingMedia: [],
      completion: {
        version: 1,
        blockIds: required,
        ...(studio && t.etapa ? { projectChecks: jardimChecks(aula.dimension, t.etapa) } : {}),
        ...(t.kind === 'delivery' ? { submissionUpToDate: true } : {}),
      },
    })
  }
  blocks.push({
    key: 'projeto',
    content: {
      kind: 'studio',
      purpose: 'submission',
      chain: `${JARDIM_CURSO}-${aula.dimension}`,
      level: `iniciante-${aula.dimension}`,
      allowedModes: ['blocks'],
      allowLevelReveal: false,
      allowBlocks: inventory[aula.dimension],
      initialProject: projects.inicio,
      projectExamples: { version: 1, examples, sections: mapping },
    },
  })
  if (index === 0)
    blocks.push({
      key: 'materiais',
      content: {
        kind: 'materials',
        title: 'Passo a passo do projeto: O Jardim Secreto',
        bookPreview: true,
        items: [
          { id: 'passos', kind: 'text', markdown: help },
          {
            id: 'como-estudio',
            kind: 'link',
            label: 'Como usar o Estúdio',
            url: '/como-fazer/estudio-achar-e-organizar-blocos',
          },
          {
            id: 'pedir-ajuda',
            kind: 'link',
            label: 'Como pedir ajuda à equipe',
            url: '/como-fazer/plataforma-pedir-ajuda',
          },
        ],
      },
    })
  const manifest = {
    version: 5,
    courseSlug: JARDIM_CURSO,
    lessonSlug: aula.slug,
    title: aula.title,
    blocks,
    sections,
  }
  if (!isLearningManifest(manifest)) throw Error(`Manifesto inválido: ${aula.slug}`)
  if (
    learningImportBodyBytes(
      manifest,
      'preserve',
      'a'.repeat(64),
      '00000000-0000-4000-8000-000000000000',
    ) > LEARNING_IMPORT_BODY_MAX_BYTES
  )
    throw Error('Importação acima de 2 MiB')
  write(`${aula.slug}.manifesto.json`, manifest)
  let script = `# Roteiro de produção · ${aula.title}\n\nMaster integral da professora. Montagem completa na ajuda opcional, sem resolver os encaixes no vídeo principal. Sem intervenções de personagens. Voz, escuta, gravação e publicação pendentes.\n\n**Antes de gravar:** use um perfil de ensaio sem envio nesta aula. Mostre o projeto da dimensão correta. Não preencha Recado no envio. Mostre Salvo e Projeto enviado! só quando esses estados aparecerem de verdade.\n\n`
  for (const [i, t] of aula.trechos.entries())
    script +=
      t.kind === 'quiz'
        ? `## Parte ${i + 1}. ${t.title}\n\nSem vídeo: diálogo do Zappy e quiz. Alternativas equivalentes antes da escolha; resposta corrigida pelo servidor.\n\n`
        : `## Parte ${i + 1}. ${t.title}\n\n**Clipe:** \`video-${t.key}\`\n\n**Na tela:** ${t.screen}\n\n**Fala para ElevenLabs:**\n\n\`\`\`text\n${t.text.replace(/ (?=\[)/g, '\n\n')}\n\`\`\`\n\n`
  script = sincronizarRecadosNaPagina(script, manifest)
  write(`${aula.slug}.roteiro.md`, script)
  for (const [ext, text] of derivadosDeVoz(extrairPartesElevenLabs(script)))
    write(`${aula.slug}${ext}`, text)
  write(
    `${aula.slug}.md`,
    `# ${aula.title}\n\nMissão Faísca · O Jardim Secreto · ${aula.dimension.toUpperCase()}. Um projeto contínuo, uma entrega. Ajuda livre; sem certificado nem publicação obrigatória.\n\n${sections.map((s, i) => `## Parte ${i + 1}. ${s.title}\n\n${s.objective}\n\n- Intenção: ${s.intent}.\n- Blocos: ${s.blockKeys.join(', ')}.\n- Estúdio: ${s.workspaceKey ?? 'não'}.\n- Conclusão: ${s.completion?.blockIds.join(', ') || 'avanço livre'}${s.completion?.submissionUpToDate ? '; envio atualizado' : ''}.\n\n${s.completion?.projectChecks?.map((c: { label: string }) => `- ${c.label}`).join('\n') ?? ''}`).join('\n\n')}\n\n[Fala integral](${aula.slug}.roteiro.md) · [Ajuda completa](passo-a-passo.md).\n`,
  )
  write(`jardim-${aula.dimension}.szproject.json`, {
    ...projects.posicao,
    assets: await resolveCourseModels(projects.posicao.assets ?? []),
  })
  write(`jardim-${aula.dimension}-inicio.szproject.json`, {
    ...projects.inicio,
    assets: await resolveCourseModels(projects.inicio.assets ?? []),
  })
}
write('blocos.json', inventory)
write(
  'modulos.md',
  '# O Jardim Secreto — organização do curso\n\nMissão do posto Faísca. Módulo: **Faça o jardim florescer**. Renomear o módulo reservado Plano de produção, preservando seu ID e as duas aulas reservadas.\n\n' +
    jardimAulas
      .map(
        (a, i) =>
          `## Aula ${i + 1}. ${a.title}\n\nIdentificador: ${a.slug}. Dimensão: ${a.dimension.toUpperCase()}.\n\n${a.trechos.map((t, n) => `${n + 1}. ${t.title}.`).join('\n')}\n\n[Manifesto](${a.slug}.manifesto.json) · [Roteiro](${a.slug}.roteiro.md).`,
      )
      .join('\n\n') +
    '\n\nUma entrega por aula. Sem certificado, Poder obrigatório ou publicação na comunidade. Produzir e anexar a mídia real antes de publicar.\n',
)
console.log(
  'Jardim: duas aulas, roteiros, voz, ajuda, inventário e quatro projetos portáteis gerados.',
)
