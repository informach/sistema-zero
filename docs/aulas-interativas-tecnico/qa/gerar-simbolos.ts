/** Autoria local do Poder "O baú dos símbolos". Importação, gravação e publicação são etapas à parte. */
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
import { extrairPartesElevenLabs, sincronizarRecadosNaPagina } from './roteiro-elevenlabs'
import { simbolosAjuda, simbolosAulas } from './simbolos-conteudo'
import { simbolosChecks } from './simbolos-criterios'
import {
  montarProjetoSimbolos,
  SIMBOLOS_CURSO,
  SIMBOLOS_ETAPAS,
  type SimbolosEtapa,
} from './simbolos-projeto'
import { simbolosQuiz2d, simbolosQuiz3d } from './simbolos-quiz'

const dir = resolve(import.meta.dirname, '../../aulas-interativas/faisca/poder-o-bau-dos-simbolos')
mkdirSync(dir, { recursive: true })
const write = (name: string, v: unknown) =>
  gravarArquivo(resolve(dir, name), typeof v === 'string' ? v : `${JSON.stringify(v, null, 2)}\n`)

const help = `# Passo a passo do projeto — O baú dos símbolos\n\nPoder do Faísca. Aqui está cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar, como testar e o que conferir. Você pode consultar quantas vezes quiser.\n\n${simbolosAulas
  .map(
    (a) =>
      `## ${a.dimension === '2d' ? 'Aula 1 · Jogo 2D' : 'Aula 2 · Ilha 3D'}: ${a.title}\n\n${simbolosAjuda(
        a.dimension,
      )
        .map(
          (h) =>
            `### ${h.title}\n\n**Relembre:** ${h.idea}\n\n${h.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n**Teste:** ${h.test}\n\n**Se não funcionar:** ${h.correction}`,
        )
        .join('\n\n')}`,
  )
  .join(
    '\n\n',
  )}\n\n## Entrega\n\nEm cada aula, jogue uma partida inteira: abra o baú na ordem certa, erre a ordem e recomece pelo sol. Pressione R e confira que o baú volta fechado. Clique em Verificar projeto, corrija o que faltar, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.\n`
write('passo-a-passo.md', help)

const inventory: Record<string, string[]> = {}
for (const [index, aula] of simbolosAulas.entries()) {
  const projects = Object.fromEntries(
    SIMBOLOS_ETAPAS.map((p) => [p, montarProjetoSimbolos(aula.dimension, p)]),
  ) as Record<SimbolosEtapa, ReturnType<typeof montarProjetoSimbolos>>
  const palette = new Set<string>()
  const visit = (v: unknown) => {
    if (!v || typeof v !== 'object') return
    if ('type' in v && typeof v.type === 'string' && v.type.startsWith('sz_')) palette.add(v.type)
    for (const c of Object.values(v)) visit(c)
  }
  visit(projects.estrela.blocksState)
  inventory[aula.dimension] = [...palette].sort()
  const id = (p: SimbolosEtapa) =>
    `fa15ca04-0000-4000-800${index}-${String(SIMBOLOS_ETAPAS.indexOf(p) + 1).padStart(12, '0')}`
  const authoredProject = (part: SimbolosEtapa) => {
    const project = projects[part]
    if (!isStudioAuthoringProject(project)) throw Error(`Projeto inválido: ${part}`)
    return project
  }
  const examples: StudioProjectExamples['examples'] = { [id('inicio')]: authoredProject('inicio') },
    mapping: StudioProjectExamples['sections'] = {}
  let previous: SimbolosEtapa = 'inicio'
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
        plannedVideo: `Título: ${t.title}\n\nMaster integral da professora: simbolos-${aula.slug}.roteiro.md, clipe video-${t.key}. Gravação pendente.`,
      })
    }
    keys.push(`ponte-${t.key}`)
    blocks.push({
      key: `ponte-${t.key}`,
      content: { kind: 'dialogue', pose: 'speaking', text: t.ponte },
    })
    if (t.kind === 'intro') {
      keys.push('jogo-pronto')
      required.push('jogo-pronto')
      blocks.push({
        key: 'jogo-pronto',
        content: {
          kind: 'interactive',
          title: 'Jogue O baú dos símbolos',
          required: true,
          instructions:
            aula.dimension === '2d'
              ? 'Clique no jogo e use as setas do teclado. Toque os símbolos na ordem da placa e abra o baú; depois erre a ordem. R começa outra partida. Você pode seguir sem terminar.'
              : 'Clique no jogo e use as setas ou W, A, S e D. Toque os símbolos na ordem da placa e abra o baú; depois erre a ordem. R começa outra partida. Você pode seguir sem terminar.',
          hints: [],
          activity: {
            type: 'project-play',
            project: projects.estrela,
            stage:
              aula.dimension === '2d' ? { width: 480, height: 360 } : { width: 960, height: 600 },
            completion: 'participation',
            targets: [],
          },
        },
      })
    }
    if (t.kind === 'material') keys.push('materiais')
    if (t.kind === 'experience') {
      keys.push('experiencia')
      required.push('experiencia')
      blocks.push({
        key: 'experiencia',
        content: {
          kind: 'interactive',
          required: true,
          title: 'A ordem dos símbolos',
          semPerguntaFinal: true,
          instructions:
            'Toque os símbolos e acompanhe o passo: na ordem da placa, fora da vez e começando pelo meio. Depois compare com o baú que só conta. Você pode repetir quantas vezes quiser.',
          hints: [],
          activity: { type: 'experimentation', scene: 'symbol-sequence', cenario: 'farol' },
        },
      })
    }
    if (t.kind === 'quiz') {
      keys.push('quiz')
      required.push('quiz')
      blocks.push({
        key: 'quiz',
        content: aula.dimension === '2d' ? simbolosQuiz2d : simbolosQuiz3d,
      })
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
              : t.kind === 'experience'
                ? 'exploration'
                : 'explanation',
      objective: `${t.title}.`,
      blockKeys: keys,
      workspaceKey: studio ? 'projeto' : null,
      externalTool: null,
      pendingMedia: [],
      completion: {
        version: 1,
        blockIds: required,
        ...(studio && t.etapa ? { projectChecks: simbolosChecks(aula.dimension, t.etapa) } : {}),
        ...(t.kind === 'delivery' ? { submissionUpToDate: true } : {}),
      },
    })
  }
  blocks.push({
    key: 'projeto',
    content: {
      kind: 'studio',
      purpose: 'submission',
      chain: `${SIMBOLOS_CURSO}-${aula.dimension}`,
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
        title: 'Passo a passo do projeto: O baú dos símbolos',
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
    courseSlug: SIMBOLOS_CURSO,
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
  write(`simbolos-${aula.slug}.manifesto.json`, manifest)
  let script = `# Roteiro de produção · ${aula.title}\n\nMaster integral da professora. ${aula.dimension === '2d' ? 'Montagem guiada completa no vídeo, um gesto por vez, com o destino à vista antes da peça.' : 'Transferência: o vídeo relembra a regra e a montagem completa fica no Passo a passo do projeto, sem resolver os encaixes no vídeo.'} Sem intervenções de personagens. Voz, escuta, gravação e publicação pendentes.\n\n**Antes de gravar:** use um perfil de ensaio sem envio nesta aula. Mostre o projeto da dimensão correta. Não preencha Recado no envio. Mostre Objetivo cumprido! e Projeto enviado! só quando esses estados aparecerem de verdade.\n\n`
  for (const [i, t] of aula.trechos.entries())
    script +=
      t.kind === 'quiz'
        ? `## Parte ${i + 1}. ${t.title}\n\nSem vídeo: diálogo do Zappy e quiz. Alternativas equivalentes antes da escolha; resposta corrigida pelo servidor.\n\n`
        : `## Parte ${i + 1}. ${t.title}\n\n**Clipe:** \`video-${t.key}\`\n\n**Na tela:** ${t.screen}\n\n**Fala para ElevenLabs:**\n\n\`\`\`text\n${t.text.replace(/ (?=\[)/g, '\n\n')}\n\`\`\`\n\n`
  script = sincronizarRecadosNaPagina(script, manifest)
  write(`simbolos-${aula.slug}.roteiro.md`, script)
  for (const [ext, text] of derivadosDeVoz(extrairPartesElevenLabs(script)))
    write(`simbolos-${aula.slug}${ext}`, text)
  write(
    `simbolos-${aula.slug}.md`,
    `# ${aula.title}\n\nPoder do Faísca · O baú dos símbolos · ${aula.dimension.toUpperCase()}. Um projeto contínuo, uma entrega. Ajuda livre no Passo a passo do projeto; sem certificado nem publicação obrigatória.\n\n${sections.map((s, i) => `## Parte ${i + 1}. ${s.title}\n\n${s.objective}\n\n- Intenção: ${s.intent}.\n- Blocos: ${s.blockKeys.join(', ')}.\n- Estúdio: ${s.workspaceKey ?? 'não'}.\n- Conclusão: ${s.completion?.blockIds.join(', ') || 'avanço livre'}${s.completion?.submissionUpToDate ? '; envio atualizado' : ''}.\n\n${s.completion?.projectChecks?.map((c: { label: string }) => `- ${c.label}`).join('\n') ?? ''}`).join('\n\n')}\n\n[Fala integral](simbolos-${aula.slug}.roteiro.md) · [Passo a passo](passo-a-passo.md).\n`,
  )
  write(`simbolos-${aula.dimension}.szproject.json`, {
    ...projects.estrela,
    assets: await resolveCourseModels(projects.estrela.assets ?? []),
  })
  write(`simbolos-${aula.dimension}-inicio.szproject.json`, {
    ...projects.inicio,
    assets: await resolveCourseModels(projects.inicio.assets ?? []),
  })
}
write('blocos.json', inventory)
write(
  'modulos.md',
  '# O baú dos símbolos — organização do curso\n\nPoder 4 do posto Faísca (`jornada-faisca-poder-4`). Módulo: **O baú dos símbolos**. Preservar o ID do curso, do módulo reservado e da `aula-1`; a `aula-2` é criada no Admin, no mesmo curso, antes da importação.\n\n' +
    simbolosAulas
      .map(
        (a, i) =>
          `## Aula ${i + 1}. ${a.title}\n\nIdentificador: ${a.slug}. Dimensão: ${a.dimension.toUpperCase()}.\n\n${a.trechos.map((t, n) => `${n + 1}. ${t.title}.`).join('\n')}\n\n[Manifesto](simbolos-${a.slug}.manifesto.json) · [Roteiro](simbolos-${a.slug}.roteiro.md).`,
      )
      .join('\n\n') +
    '\n\nUma entrega por aula. O Poder conta com as duas aulas concluídas. Sem certificado nem publicação na comunidade. Produzir e anexar a mídia real antes de publicar; publicar o curso só depois da `aula-2`.\n',
)
console.log(
  'Baú dos símbolos: duas aulas, roteiros, voz, ajuda, inventário e quatro projetos portáteis gerados.',
)
