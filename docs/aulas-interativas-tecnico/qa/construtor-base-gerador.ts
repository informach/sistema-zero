/**
 * Autoria das bases do Construtor: o mesmo molde editorial do Faísca, com um
 * projeto contínuo e exemplos de entrada/solução pequenos por montagem.
 * Não publica aulas, não atribui IDs do banco e não modifica os protótipos aprovados.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest, type LearningManifest } from '../../../packages/core/src/learning'
import {
  LEARNING_IMPORT_BODY_MAX_BYTES,
  LEARNING_MANIFEST_SOURCE_MAX_BYTES,
  learningImportBodyBytes,
} from '../../../packages/core/src/learning/authoring-manifest-projection'
import { isExecutionRule } from '../../../packages/core/src/learning/project-execution'
import { evaluateProjectStructure } from '../../../packages/core/src/learning/project-structure'
import { discoverySpeechSteps } from '../../../packages/core/src/learning/scene/discovery-guidance'
import { isSectionCompletion } from '../../../packages/core/src/learning/section-progression'
import {
  readManifestStudioProjectExamples,
  type StudioProjectExamples,
  studioLessonProjectExamplesIssues,
  studioProjectExampleEnvironmentIssues,
  studioProjectExampleSectionIssues,
} from '../../../packages/core/src/learning/studio-project-examples'
import {
  isStudioAuthoringProject,
  type StudioAuthoringProject,
} from '../../../packages/core/src/studio/authoring-project'
import { studioProjectContinuityIssue } from '../../../packages/core/src/studio/project-continuity'
import { avatarDaAula } from './avatares-video'
import type { ConstrutorBaseConfig } from './construtor-base-tipos'
import { falaDaParte, itensDosMateriais, videoPlanejado } from './faisca-comum'
import { formatarJson } from './formatar-json'
import { derivadosDeVoz } from './gerar-falas-elevenlabs'
import { gravarArquivo } from './gravar-arquivo'
import {
  extrairPartesElevenLabs,
  renderizarClipe,
  sincronizarRecadosNaPagina,
} from './roteiro-elevenlabs'

const hash = (text: string) => createHash('sha256').update(text).digest('hex')
/** IDs privados dos exemplos, independentes dos IDs do banco e do documento. */
export function idExemploConstrutor(course: string, stage: string) {
  const value = hash(`construtor-example-v1:${course}:${stage}`)
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-4${value.slice(13, 16)}-8${value.slice(17, 20)}-${value.slice(20, 32)}`
}
export function tiposDosBlocos(value: unknown): string[] {
  const types = new Set<string>()
  const stack = [value]
  while (stack.length) {
    const node = stack.pop()
    if (!node || typeof node !== 'object') continue
    if ('type' in node && typeof node.type === 'string' && node.type.startsWith('sz_'))
      types.add(node.type)
    for (const child of Object.values(node))
      if (child && typeof child === 'object') stack.push(child)
  }
  return [...types].sort()
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
function writeAt(dir: string) {
  mkdirSync(dir, { recursive: true })
  return (name: string, value: unknown, compact = false) => {
    const target = resolve(dir, name)
    if (typeof value === 'string') return gravarArquivo(target, value)
    const text = `${JSON.stringify(value, null, compact ? undefined : 2)}\n`
    gravarArquivo(
      target,
      compact || Buffer.byteLength(text) > 2_097_152 ? text : formatarJson(value),
    )
  }
}

/** Pode ser chamado durante a autoria para liberar os projetos e o JSON ao caderno. */
export function materializarProjetosConstrutor(cfg: ConstrutorBaseConfig) {
  assert(
    cfg.etapas.length && new Set(cfg.etapas).size === cfg.etapas.length,
    `${cfg.curso}: etapas ausentes ou repetidas`,
  )
  assert(cfg.etapas.includes(cfg.etapaFinal), `${cfg.curso}: etapa final desconhecida`)
  const write = writeAt(cfg.pasta)
  const projects = Object.fromEntries(cfg.etapas.map((stage) => [stage, cfg.montarProjeto(stage)]))
  const first = projects[cfg.etapas[0]!]
  for (const [stage, project] of Object.entries(projects)) {
    assert(
      isStudioAuthoringProject(project),
      `${cfg.curso}/${stage}: projeto fora do contrato do Estúdio`,
    )
    assert(
      !studioProjectContinuityIssue(project, first),
      `${cfg.curso}/${stage}: ambiente diferente do inicial`,
    )
    mkdirSync(resolve(cfg.pasta, 'projetos'), { recursive: true })
    write(`projetos/${stage}.szproject.json`, project, true)
  }
  const portatil = cfg.portatil ?? ((projeto: StudioAuthoringProject) => projeto)
  write('projeto-inicial.szproject.json', portatil(first), true)
  write('projeto-final.szproject.json', portatil(projects[cfg.etapaFinal]!), true)
  const { montarProjeto: _build, checks: _checks, pasta: _path, portatil: _portable, ...authored } = cfg
  write('curso-autoria.json', {
    version: 1,
    ...authored,
    chain: cfg.chain ?? cfg.curso,
    status: 'autoria-para-revisao',
    limiteDeAutoria:
      'Telas de início e resultado, estado, Enter e reinício vêm preparados; o aluno constrói as regras da partida. As escolhas de arte não mudam a dificuldade.',
    projetos: Object.fromEntries(
      cfg.etapas.map((stage) => [stage, `projetos/${stage}.szproject.json`]),
    ),
  })
  return projects
}

export function gerarBaseConstrutor(cfg: ConstrutorBaseConfig) {
  const write = writeAt(cfg.pasta)
  const projects = materializarProjetosConstrutor(cfg)
  const palette = tiposDosBlocos(projects[cfg.etapaFinal].blocksState)
  const inventory = new Set(palette)
  const manifests: LearningManifest[] = []
  const reports: unknown[] = []
  const experiences: Record<string, unknown> = {}
  const scripts: string[] = []
  let lastStage = cfg.etapas[0]!
  assert(new Set(cfg.aulas.map((a) => a.slug)).size === cfg.aulas.length, 'Slugs de aula repetidos')

  for (const [index, aula] of cfg.aulas.entries()) {
    assert(
      aula.entryStage === lastStage,
      `${aula.slug}: entrada ${aula.entryStage} não continua ${lastStage}`,
    )
    assert(
      aula.trechos.length && new Set(aula.trechos.map((t) => t.key)).size === aula.trechos.length,
      `${aula.slug}: partes repetidas ou ausentes`,
    )
    assert(
      aula.trechos.filter((t) => t.kind === 'delivery').length === 1,
      `${aula.slug}: precisa de uma entrega`,
    )
    const file = `${cfg.prefixo}-${aula.slug}`
    const roteiro = `${file}.roteiro.md`
    const blocks: LearningManifest['blocks'] = []
    const sections: LearningManifest['sections'] = []
    const examples: StudioProjectExamples['examples'] = {}
    const bindings: StudioProjectExamples['sections'] = {}
    const id = (stage: string) => idExemploConstrutor(cfg.curso, stage)
    const include = (stage: string) => {
      assert(projects[stage], `${aula.slug}: etapa desconhecida ${stage}`)
      examples[id(stage)] = projects[stage]
      return id(stage)
    }
    let previous = aula.entryStage
    let delivered = false
    const partReports: unknown[] = []
    for (const t of aula.trechos) {
      assert(
        !delivered || ['quiz', 'fecho', 'material'].includes(t.kind),
        `${aula.slug}/${t.key}: depois do envio só cabe fechamento`,
      )
      assert(t.ponte.trim(), `${aula.slug}/${t.key}: falta recado na página`)
      for (const type of t.blockTypes ?? [])
        assert(inventory.has(type), `${aula.slug}/${t.key}: bloco ${type} ausente da paleta final`)
      const keys: string[] = []
      const required: string[] = []
      if (t.kind !== 'quiz') {
        assert(t.text.trim() && t.screen.trim(), `${aula.slug}/${t.key}: falta fala ou Na tela`)
        keys.push(`video-${t.key}`)
        required.push(`video-${t.key}`)
        blocks.push({
          key: `video-${t.key}`,
          plannedVideo: videoPlanejado(t.title, roteiro, falaDaParte(t, index)),
        })
      }
      keys.push(`ponte-${t.key}`)
      blocks.push({
        key: `ponte-${t.key}`,
        content: { kind: 'dialogue', pose: 'speaking', text: t.ponte },
      })
      if (t.kind === 'intro') {
        const key = `jogo-pronto-${t.key}`
        keys.push(key)
        required.push(key)
        blocks.push({
          key,
          content: {
            kind: 'interactive',
            title: cfg.jogoPronto.title,
            required: true,
            instructions: cfg.jogoPronto.instrucoes,
            hints: [],
            activity: {
              type: 'project-play',
              project: projects[cfg.etapaFinal],
              stage:
                cfg.jogoPronto.palco ??
                (cfg.dimensao === '2d' ? { width: 800, height: 480 } : { width: 960, height: 600 }),
              completion: 'participation',
              targets: [],
            },
          },
        })
      }
      if (t.kind === 'material') keys.push('materiais')
      if (t.kind === 'experience') {
        assert(t.experience, `${aula.slug}/${t.key}: falta experiência nativa`)
        const key = `experiencia-${t.key}`
        keys.push(key)
        required.push(key)
        blocks.push({ key, content: t.experience })
        const activity = t.experience.activity
        experiences[`${aula.slug}/${t.key}`] = {
          activity,
          ...('scene' in activity
            ? { falas: discoverySpeechSteps(activity.scene, activity.setup) }
            : {}),
        }
      }
      if (t.kind === 'quiz') {
        assert(t.quiz, `${aula.slug}/${t.key}: falta quiz`)
        const key = `quiz-${t.key}`
        keys.push(key)
        required.push(key)
        blocks.push({ key, content: t.quiz })
      }
      const studio = t.kind === 'build' || t.kind === 'delivery'
      if (t.kind === 'delivery') {
        keys.push('projeto')
        required.push('projeto')
      }
      const checks = studio && t.etapa ? cfg.checks(t.etapa) : undefined
      if (studio) {
        assert(t.etapa, `${aula.slug}/${t.key}: falta etapa da montagem`)
        assert(
          cfg.etapas.indexOf(t.etapa) >= cfg.etapas.indexOf(previous),
          `${aula.slug}/${t.key}: progressão volta de ${previous} para ${t.etapa}`,
        )
        assert(
          checks?.length && checks.some((c) => !c.optional),
          `${aula.slug}/${t.key}: faltam objetivos obrigatórios`,
        )
        assert(
          isSectionCompletion({ version: 1, blockIds: [], projectChecks: checks }),
          `${aula.slug}/${t.key}: critérios fora do contrato real`,
        )
        const structural = checks.filter((c) => !isExecutionRule(c.rule))
        for (const check of structural)
          assert(
            evaluateProjectStructure(check.rule as never, projects[t.etapa]),
            `${aula.slug}/${t.key}: solução não passa ${check.id}`,
          )
        const pending = structural.filter(
          (c) => !c.optional && !evaluateProjectStructure(c.rule as never, projects[previous]),
        )
        // Arte opcional, revisão e envio podem conservar a entrada; são registrados, não fingidos como falha.
        const sameStage = previous === t.etapa
        assert(
          pending.length ||
            checks.some((c) => isExecutionRule(c.rule)) ||
            t.kind === 'delivery' ||
            t.entryMayPass,
          `${aula.slug}/${t.key}: entrada já cumpre os critérios; explique entryMayPass`,
        )
        bindings[t.key] = { entryExampleId: include(previous), solutionExampleId: include(t.etapa) }
        partReports.push({
          key: t.key,
          entryStage: previous,
          solutionStage: t.etapa,
          structuralChecks: structural.length,
          newStructuralChecks: pending.map((c) => c.id),
          executionChecks: checks.filter((c) => isExecutionRule(c.rule)).map((c) => c.id),
          entryMayPass:
            t.entryMayPass ??
            (t.kind === 'delivery' && sameStage
              ? 'Entrega e conferência da montagem anterior.'
              : null),
        })
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
              : delivered
                ? 'closing'
                : t.kind === 'material'
                  ? 'material'
                  : t.kind === 'experience'
                    ? 'exploration'
                    : 'explanation',
        objective: t.objective ?? `${t.title}.`,
        blockKeys: keys,
        workspaceKey: studio ? 'projeto' : null,
        externalTool: null,
        pendingMedia: [],
        completion: {
          version: 1,
          blockIds: required,
          ...(checks ? { projectChecks: checks } : {}),
          ...(t.kind === 'delivery' ? { submissionUpToDate: true } : {}),
        },
      })
      if (t.kind === 'delivery') delivered = true
    }
    const registry: StudioProjectExamples = { version: 1, examples, sections: bindings }
    blocks.push({
      key: 'projeto',
      content: {
        kind: 'studio',
        purpose: 'submission',
        chain: cfg.chain ?? cfg.curso,
        level: `iniciante-${cfg.dimensao}`,
        allowedModes: ['blocks'],
        allowLevelReveal: false,
        allowBlocks: palette,
        initialProject: projects[aula.entryStage],
        projectExamples: registry,
      },
    })
    if (aula.trechos.some((t) => t.kind === 'material'))
      blocks.push({
        key: 'materiais',
        content: {
          kind: 'materials',
          title: `Passo a passo do projeto: ${cfg.nome}`,
          bookPreview: true,
          items: itensDosMateriais(),
        },
      })
    const manifest: LearningManifest = {
      version: 5,
      courseSlug: cfg.curso,
      lessonSlug: aula.slug,
      title: aula.title,
      blocks,
      sections,
      ...(aula.retireBlockKeys?.length ? { retireBlockKeys: aula.retireBlockKeys } : {}),
    }
    assert(isLearningManifest(manifest), `${aula.slug}: manifesto rejeitado pelo schema oficial`)
    const read = readManifestStudioProjectExamples(registry)
    assert(
      read.kind === 'valid',
      `${aula.slug}: registro de exemplos inválido: ${JSON.stringify(read)}`,
    )
    const issues = [
      ...studioProjectExampleEnvironmentIssues(registry, projects[aula.entryStage]),
      ...studioProjectExampleSectionIssues(
        registry,
        'projeto',
        sections.map((s) => ({ id: s.key, workspaceBlockId: s.workspaceKey })),
      ),
      ...studioLessonProjectExamplesIssues([{ blockId: 'projeto', bytes: read.bytes, registry }]),
    ]
    assert(!issues.length, `${aula.slug}: exemplos incompatíveis: ${JSON.stringify(issues)}`)
    const importBytes = learningImportBodyBytes(
      manifest,
      'preserve',
      'a'.repeat(64),
      '00000000-0000-4000-8000-000000000000',
    )
    assert(
      importBytes <= LEARNING_IMPORT_BODY_MAX_BYTES,
      `${aula.slug}: corpo de importação ${importBytes} excede 2 MiB`,
    )
    assert(
      Buffer.byteLength(JSON.stringify(manifest)) <= LEARNING_MANIFEST_SOURCE_MAX_BYTES,
      `${aula.slug}: fonte excede 16 MiB`,
    )
    write(`${file}.manifesto.json`, manifest)
    const avatar = avatarDaAula(index)
    let script = `# Roteiro de produção · ${aula.title}\n\nA professora grava o master integral. Na edição kids, ${avatar} substitui somente os parágrafos das tabelas de substituição, sem voz sobreposta. A edição adulta conserva o master. As falas prontas e o índice de edição são derivados desta fonte.\n\nMontagem guiada completa no vídeo, um gesto por vez, deixando o destino visível antes de pegar a peça. As telas e o reinício são infraestrutura preparada; as partes ensinam as regras da partida. A personalização muda a aparência.\n\n**Antes de gravar:** use uma sessão de ensaio sem envio anterior, carregue a entrada da parte e dê foco ao jogo antes das teclas. Mostre Objetivo cumprido! e Projeto enviado! somente quando aparecerem. Os tempos de tecla são estimativas a confirmar no Verificar plano. Gravação e publicação pendentes.\n\n`
    for (const [partIndex, t] of aula.trechos.entries())
      script +=
        t.kind === 'quiz'
          ? `## Parte ${partIndex + 1}. ${t.title}\n\nQuiz sem vídeo, com resposta corrigida no servidor, explicação e nova tentativa.\n\n`
          : `## Parte ${partIndex + 1}. ${t.title}\n\n${renderizarClipe(falaDaParte(t, index), t.screen)}\n${t.kind === 'experience' ? '**Falas da experiência:** consulte `zappy-etapas.json`. O vídeo convida; os controles e as comparações continuam livres na bancada.\n\n' : ''}`
    script = sincronizarRecadosNaPagina(script, manifest)
    write(roteiro, script)
    scripts.push(roteiro)
    const voices = derivadosDeVoz(extrairPartesElevenLabs(script))
    for (const [suffix, text] of voices) write(`${file}${suffix}`, text)
    for (const suffix of ['.debinha.elevenlabs.txt', '.dede.elevenlabs.txt'])
      if (!voices.has(suffix) && existsSync(resolve(cfg.pasta, `${file}${suffix}`)))
        unlinkSync(resolve(cfg.pasta, `${file}${suffix}`))
    write(
      `${file}.md`,
      `# ${aula.title}\n\nBase do Construtor · ${cfg.nome} · ${cfg.dimensao.toUpperCase()}.\n\n**Entrada:** ${aula.entry}\n\n**Conquista:** ${aula.outcome}\n\n${sections.map((s, i) => `## Parte ${i + 1}. ${s.title}\n\n${s.objective}\n\n- Intenção: ${s.intent}.\n- Atividades: ${s.blockKeys.join(', ')}.\n- Estúdio: ${s.workspaceKey ?? 'não'}.\n- Conclusão: ${s.completion?.blockIds.join(', ') || 'avanço livre'}${s.completion?.submissionUpToDate ? '; envio atualizado' : ''}.\n${s.completion?.projectChecks?.map((c) => `- ${c.label}`).join('\n') ?? ''}`).join('\n\n')}\n\n[Roteiro completo](${roteiro}) · [Passo a passo](passo-a-passo.md).\n`,
    )
    reports.push({
      lessonSlug: aula.slug,
      title: aula.title,
      entryStage: aula.entryStage,
      finalStage: previous,
      sections: sections.length,
      plannedVideos: blocks.filter((b) => 'plannedVideo' in b).length,
      importBytes,
      exampleBytes: read.bytes,
      examples: Object.keys(examples).length,
      parts: partReports,
    })
    manifests.push(manifest)
    lastStage = previous
  }
  assert(
    lastStage === cfg.etapaFinal,
    `${cfg.curso}: a última aula termina em ${lastStage}, não ${cfg.etapaFinal}`,
  )
  write('blocos.json', { version: 1, dimension: cfg.dimensao, allowBlocks: palette })
  write('zappy-etapas.json', { version: 1, experiences })
  write(
    'mapa-de-aulas.md',
    `# ${cfg.nome}\n\nBase ${cfg.dimensao.toUpperCase()} do Construtor, em ${cfg.aulas.length} aulas. As telas, estado e reinício vêm preparados. A autoria das regras evolui por pequenas montagens; a escolha de arte não altera as regras.\n\n${cfg.aulas.map((a, i) => `## Aula ${i + 1}. ${a.title}\n\n**Entrada:** ${a.entry}\n\n**Conquista:** ${a.outcome}\n\n${a.trechos.map((t, j) => `${j + 1}. ${t.title} (${t.kind}).`).join('\n')}`).join('\n\n')}\n`,
  )
  write(
    'passo-a-passo.md',
    `# Passo a passo do projeto · ${cfg.nome}\n\n${cfg.introducaoPassoAPasso ?? 'Consulte a montagem e teste o que mudou no seu jogo.'}\n\n${cfg.aulas.map((a, i) => `## Aula ${i + 1}. ${a.title}\n\n${a.trechos.map((t) => `### ${t.title}\n\n${t.objective ?? t.ponte}\n\n${(t.steps ?? []).map((step, n) => `${n + 1}. ${step}`).join('\n')}${t.tests?.length ? `\n\n**Teste no jogo:**\n\n${t.tests.map((test) => `- ${test}`).join('\n')}` : ''}`).join('\n\n')}`).join('\n\n')}\n`,
  )
  const validation = {
    version: 1,
    course: cfg.curso,
    status: 'contratos-editoriais-validados',
    lessons: reports,
    stages: cfg.etapas.length,
    blockTypes: palette.length,
    snapshots: cfg.etapas.map((stage) => ({
      stage,
      file: `projetos/${stage}.szproject.json`,
      sha256: hash(readFileSync(resolve(cfg.pasta, `projetos/${stage}.szproject.json`), 'utf8')),
    })),
    limits: {
      importBodyBytes: LEARNING_IMPORT_BODY_MAX_BYTES,
      sourceBytes: LEARNING_MANIFEST_SOURCE_MAX_BYTES,
    },
    scope:
      'Schema oficial, continuidade, exemplos, orçamento de importação, critérios estruturais e sincronização de voz. Critérios de execução exigem QA de runtime separado; nenhuma publicação executada.',
  }
  write('validacao-autoria.json', validation)
  return { manifests, validation, scripts }
}
