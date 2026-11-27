/**
 * O gerador comum dos quatro Poderes do Faísca (Moedas no caminho, O segredo da cabana, A ponte
 * apressada e O baú dos símbolos) e das missões do posto (O Jardim Secreto, do Faísca, e A Estação
 * de Reciclagem, do Construtor), que têm o mesmo esqueleto sem a experiência. Antes eram quatro geradores quase iguais; cada `gerar-<poder>.ts`
 * agora só descreve o curso (`PoderConfig`) e chama `gerarPoder`.
 *
 * Revisão de 23/11/2026, no molde do Cadê, da Chave do Farol e da Ilha do Farol:
 * - o roteiro sai por `renderizarClipe(falaDaParte(...))`, com as trocas da Debinha (Aula 1) e do Dedé
 *   (Aula 2) a partir do campo `kids`, a tabela de substituições, o `.edicao.json` e a voz de cada
 *   personagem;
 * - o envio fecha a última construção (`kind: 'delivery'`, com os objetivos da etapa e o envio em dia);
 *   depois dele, o quiz é o "Quiz de fechamento" da plataforma (`intent: 'closing'`), porque depois da
 *   entrega só podem vir fechamentos (`isFinalProjectSection`);
 * - os materiais levam os links do Como fazer da Ilha, sem texto para ler;
 * - os JSON saem no formato que a CI confere (`formatarJson`).
 */
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest, type LearningManifest } from '../../../packages/core/src/learning'
import {
  LEARNING_IMPORT_BODY_MAX_BYTES,
  learningImportBodyBytes,
} from '../../../packages/core/src/learning/authoring-manifest-projection'
import { discoverySpeechSteps } from '../../../packages/core/src/learning/scene/discovery-guidance'
import type { StudioProjectExamples } from '../../../packages/core/src/learning/studio-project-examples'
import { isStudioAuthoringProject } from '../../../packages/core/src/studio/authoring-project'
import { resolveCourseModels } from '../../../packages/studio/src/core/courseModels'
import { avatarDaAula } from './avatares-video'
import { falaDaParte, itensDosMateriais, videoPlanejado } from './faisca-comum'
import { formatarJson } from './formatar-json'
import { derivadosDeVoz } from './gerar-falas-elevenlabs'
import { gravarArquivo } from './gravar-arquivo'
import { organizarManifestos } from './organizar-projetos'
import {
  extrairPartesElevenLabs,
  renderizarClipe,
  sincronizarRecadosNaPagina,
} from './roteiro-elevenlabs'

export type PoderDimensao = '2d' | '3d'

/** Uma parte de uma aula de Poder, como a fonte editorial de cada curso a descreve. */
export type PoderTrecho<E extends string = string> = {
  key: string
  title: string
  /** `fecho`: só o vídeo, depois do envio (a comemoração da missão, 24/11/2026). */
  kind: 'intro' | 'material' | 'experience' | 'build' | 'delivery' | 'quiz' | 'fecho'
  etapa?: E
  /** O recado do Zappy na página, logo depois do vídeo (ou antes do quiz). Não é gravado. */
  ponte: string
  /** A fala gravada, com as marcas de interpretação. Vazia no quiz, que não tem vídeo. */
  text: string
  screen: string
  /**
   * As frases que a Debinha (Aula 1) ou o Dedé (Aula 2) dizem na edição kids. Cada uma é um parágrafo
   * inteiro do `text`, com a professora antes e depois (como na Ilha do Farol, 22/11/2026).
   */
  kids?: string[]
}

export type PoderAula<E extends string = string> = {
  slug: string
  title: string
  dimension: PoderDimensao
  trechos: PoderTrecho<E>[]
}

type Ativos = Parameters<typeof resolveCourseModels>[0]
type Objetivos = NonNullable<
  NonNullable<LearningManifest['sections'][number]['completion']>['projectChecks']
>

export interface PoderConfig<
  E extends string,
  P extends { blocksState?: unknown; assets?: Ativos },
> {
  /** O nome do curso, como aparece para a criança ("Moedas no caminho"). */
  nome: string
  /** A pasta em docs/aulas-interativas/<trilha>. */
  pasta: string
  /** A trilha do curso (a pasta do posto em docs/aulas-interativas). Sem ela, `faisca`. */
  trilha?: string
  /** O começo dos nomes dos arquivos ("moedas" → moedas-aula-1.manifesto.json, moedas-2d.szproject.json). */
  prefixo: string
  /** O nome dos arquivos de uma aula, quando não é `<prefixo>-<slug>` (o Jardim usa só `aula-1`). */
  arquivoDaAula?: (slug: string) => string
  /** "Poder do Faísca" ou "Missão do Faísca", no resumo de cada aula. */
  tipo?: string
  curso: string
  etapas: readonly E[]
  /**
   * A ordem dos ids dos exemplos, quando não é a das etapas: as etapas novas (as partes longas
   * divididas em 24/11/2026) entram no fim, para os ids das que já existiam não mudarem.
   */
  idEtapas?: readonly E[]
  etapaFinal: E
  montarProjeto: (dimensao: PoderDimensao, etapa: E) => P
  checks: (dimensao: PoderDimensao, etapa: E) => Objetivos
  /** O quiz de cada dimensão (só as aulas com parte de quiz usam). */
  quiz: Partial<Record<PoderDimensao, unknown>>
  aulas: PoderAula<E>[]
  /** Os ids dos exemplos do Estúdio: `${idBase}-0000-4000-800<aula>-<etapa>` (não mudam). */
  idBase: string
  /** O jogo pronto da abertura. */
  jogoPronto: {
    title: string
    instrucoes: Record<PoderDimensao, string>
    /** O tamanho do jogo pronto; sem ele, 480 × 360 no 2D e 960 × 600 no 3D. */
    palco?: Record<PoderDimensao, { width: number; height: number }>
  }
  /** O conteúdo do bloco `experiencia` (interativo), igual ao que o curso já publicava. */
  experiencia?: Record<string, unknown>
  /** A cena das falas do Zappy dentro da experiência (`zappy-etapas.json`). */
  cenaDoZappy?: Parameters<typeof discoverySpeechSteps>[0]
  /**
   * O jeito das partes de construção no roteiro. Sem ele, a montagem guiada completa no vídeo (os
   * Poderes). A missão do posto (o Jardim) mostra o que o jogo precisa fazer, sem montar.
   */
  notaDeProducao?: string
  /**
   * A nota do roteiro 3D sobre o teclado. Sem ela, a do Faísca (o personagem anda com as setas na
   * velocidade 4).
   */
  notaDoTeclado3D?: string
  /** Onde fica a ajuda, no resumo de cada aula. Sem ela, a ajuda livre no Passo a passo. */
  ajuda?: string
  /** O passo a passo em texto (`passo-a-passo.md`) e a organização do curso (`modulos.md`). */
  passoAPasso: string
  modulos: string
  /** A linha final do console. */
  resumo: string
}

export async function gerarPoder<
  E extends string,
  P extends { blocksState?: unknown; assets?: Ativos },
>(cfg: PoderConfig<E, P>) {
  const dir = resolve(
    import.meta.dirname,
    `../../aulas-interativas/${cfg.trilha ?? 'faisca'}/${cfg.pasta}`,
  )
  mkdirSync(dir, { recursive: true })
  // No formato da CI (biome ci). O JSON acima do files.maxSize do Biome (2 MiB, como o manifesto da
  // Aula 1 de Moedas) o Biome não formata nem confere: esse sai do JSON.stringify, como antes.
  const write = (name: string, v: string | object) => {
    if (typeof v === 'string') return gravarArquivo(resolve(dir, name), v)
    const puro = `${JSON.stringify(v, null, 2)}\n`
    gravarArquivo(resolve(dir, name), Buffer.byteLength(puro) > 2_097_152 ? puro : formatarJson(v))
  }
  write('passo-a-passo.md', cfg.passoAPasso)

  const inventory: Record<string, string[]> = {}
  for (const [index, aula] of cfg.aulas.entries()) {
    const projects = Object.fromEntries(
      cfg.etapas.map((p) => [p, cfg.montarProjeto(aula.dimension, p)]),
    ) as Record<E, P>
    const palette = new Set<string>()
    const visit = (v: unknown) => {
      if (!v || typeof v !== 'object') return
      if ('type' in v && typeof v.type === 'string' && v.type.startsWith('sz_')) palette.add(v.type)
      for (const c of Object.values(v)) visit(c)
    }
    visit(projects[cfg.etapaFinal].blocksState)
    inventory[aula.dimension] = [...palette].sort()
    const id = (p: E) =>
      `${cfg.idBase}-0000-4000-800${index}-${String((cfg.idEtapas ?? cfg.etapas).indexOf(p) + 1).padStart(12, '0')}`
    const authoredProject = (part: E) => {
      const project = projects[part]
      if (!isStudioAuthoringProject(project)) throw Error(`Projeto inválido: ${part}`)
      return project
    }
    const inicio = cfg.etapas[0] as E
    const examples: StudioProjectExamples['examples'] = { [id(inicio)]: authoredProject(inicio) },
      mapping: StudioProjectExamples['sections'] = {}
    let previous: E = inicio
    let entregue = false
    const arquivo = cfg.arquivoDaAula?.(aula.slug) ?? `${cfg.prefixo}-${aula.slug}`
    const roteiro = `${arquivo}.roteiro.md`
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
          plannedVideo: videoPlanejado(t.title, roteiro, falaDaParte(t, index)),
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
            title: cfg.jogoPronto.title,
            required: true,
            instructions: cfg.jogoPronto.instrucoes[aula.dimension],
            hints: [],
            activity: {
              type: 'project-play',
              project: projects[cfg.etapaFinal],
              stage:
                cfg.jogoPronto.palco?.[aula.dimension] ??
                (aula.dimension === '2d'
                  ? { width: 480, height: 360 }
                  : { width: 960, height: 600 }),
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
        if (!cfg.experiencia)
          throw Error(`${aula.slug}: parte de experiência sem a experiência do curso`)
        blocks.push({ key: 'experiencia', content: cfg.experiencia })
      }
      if (t.kind === 'quiz') {
        keys.push('quiz')
        required.push('quiz')
        const quiz = cfg.quiz[aula.dimension]
        if (!quiz)
          throw Error(`${aula.slug}: parte de quiz sem o quiz da dimensão ${aula.dimension}`)
        blocks.push({ key: 'quiz', content: quiz })
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
              : // Depois da entrega, o Passo a passo é um fechamento (a missão o entrega no fim).
                t.kind === 'material'
                ? entregue
                  ? 'closing'
                  : 'material'
                : t.kind === 'experience'
                  ? 'exploration'
                  : // Depois da entrega, o quiz é o "Quiz de fechamento" (section-templates.ts).
                    (t.kind === 'quiz' || t.kind === 'fecho') && entregue
                    ? 'closing'
                    : 'explanation',
        objective: `${t.title}.`,
        blockKeys: keys,
        workspaceKey: studio ? 'projeto' : null,
        externalTool: null,
        pendingMedia: [],
        completion: {
          version: 1,
          blockIds: required,
          ...(studio && t.etapa ? { projectChecks: cfg.checks(aula.dimension, t.etapa) } : {}),
          ...(t.kind === 'delivery' ? { submissionUpToDate: true } : {}),
        },
      })
      if (t.kind === 'delivery') entregue = true
    }
    blocks.push({
      key: 'projeto',
      content: {
        kind: 'studio',
        purpose: 'submission',
        chain: `${cfg.curso}-${aula.dimension}`,
        level: `iniciante-${aula.dimension}`,
        allowedModes: ['blocks'],
        allowLevelReveal: false,
        allowBlocks: inventory[aula.dimension],
        initialProject: projects[inicio],
        projectExamples: { version: 1, examples, sections: mapping },
      },
    })
    if (aula.trechos.some((t) => t.kind === 'material'))
      blocks.push({
        key: 'materiais',
        content: {
          kind: 'materials',
          title: `Passo a passo do projeto: ${cfg.nome}`,
          bookPreview: true,
          // O livro do Passo a passo (o PDF anexado) e os links de ajuda, sem texto para ler
          // (materiais-sem-texto.ts): o que os passos dizem está nos vídeos das partes.
          items: itensDosMateriais(),
        },
      })
    const manifest = {
      version: 5,
      courseSlug: cfg.curso,
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
    write(`${arquivo}.manifesto.json`, manifest)

    const avatar = avatarDaAula(index)
    const comKids = aula.trechos.some((t) => t.kids?.length)
    let script = `# Roteiro de produção · ${aula.title}\n\nA professora grava toda a fala principal. Copie o arquivo .elevenlabs.txt para gerar a voz integral. ${
      comKids
        ? `Na montagem kids, ${avatar} substitui somente as frases das tabelas de substituição, com a voz do arquivo .${avatar === 'Dedé' ? 'dede' : 'debinha'}.elevenlabs.txt e sem voz sobreposta; o adulto usa o master integral.`
        : 'Sem intervenções de personagens.'
    } ${cfg.notaDeProducao ?? 'Montagem guiada completa no vídeo, um gesto por vez, com o destino à vista antes da peça.'} ${
      aula.dimension === '3d'
        ? (cfg.notaDoTeclado3D ??
          'O jogo é de teclado: o robô dá o foco ao jogo (Rodar de novo no Estúdio, ou um toque no jogo pronto) antes de segurar as setas. Os tempos das setas no Na tela são estimativas para a velocidade 4 e se acertam no Verificar plano. ')
        : ''
    }Gravação e publicação desta revisão ainda não confirmadas.\n\n**Antes de gravar:** use um perfil de ensaio sem envio nesta aula. Mostre o projeto da dimensão correta. Não preencha Recado no envio. Mostre Objetivo cumprido! e Projeto enviado! só quando esses estados aparecerem de verdade.\n\n`
    for (const [i, t] of aula.trechos.entries())
      script +=
        t.kind === 'quiz'
          ? `## Parte ${i + 1}. ${t.title}\n\nQuiz sem vídeo: escolha, demonstração, explicação e nova tentativa. Resposta corrigida pelo servidor.\n\n`
          : `## Parte ${i + 1}. ${t.title}\n\n${renderizarClipe(falaDaParte(t, index), t.screen)}\n${
              t.kind === 'experience'
                ? `**Falas dentro da experiência:** exportadas em \`zappy-etapas.json\`. A orientação sugere comparações pelo estado observado; os controles permanecem livres.\n\n`
                : ''
            }`
    script = sincronizarRecadosNaPagina(script, manifest)
    write(roteiro, script)
    for (const [ext, text] of derivadosDeVoz(extrairPartesElevenLabs(script)))
      write(`${arquivo}${ext}`, text)
    write(
      `${arquivo}.md`,
      `# ${aula.title}\n\n${cfg.tipo ?? 'Poder do Faísca'} · ${cfg.nome} · ${aula.dimension.toUpperCase()}. Um projeto contínuo, enviado na última construção. ${cfg.ajuda ?? 'Ajuda livre no Passo a passo do projeto'}; sem certificado nem publicação obrigatória.\n\n${sections.map((s, i) => `## Parte ${i + 1}. ${s.title}\n\n${s.objective}\n\n- Intenção: ${s.intent}.\n- Blocos: ${s.blockKeys.join(', ')}.\n- Estúdio: ${s.workspaceKey ?? 'não'}.\n- Conclusão: ${s.completion?.blockIds.join(', ') || 'avanço livre'}${s.completion?.submissionUpToDate ? '; envio atualizado' : ''}.\n\n${s.completion?.projectChecks?.map((c: { label: string }) => `- ${c.label}`).join('\n') ?? ''}`).join('\n\n')}\n\n${comKids ? `Na edição kids, ${avatar} diz as frases das tabelas de substituição do roteiro.\n\n` : ''}[Fala integral](${roteiro}) · [Passo a passo](passo-a-passo.md).\n`,
    )
    const final = projects[cfg.etapaFinal]
    const comeco = projects[inicio]
    write(`${cfg.prefixo}-${aula.dimension}.szproject.json`, {
      ...final,
      assets: await resolveCourseModels(final.assets ?? []),
    })
    write(`${cfg.prefixo}-${aula.dimension}-inicio.szproject.json`, {
      ...comeco,
      assets: await resolveCourseModels(comeco.assets ?? []),
    })
  }
  write('blocos.json', inventory)
  // As falas do Zappy dentro da experiência, para a gravação e a auditoria (como no Farol).
  if (cfg.cenaDoZappy)
    write('zappy-etapas.json', {
      version: 1,
      experiences: { experiencia: discoverySpeechSteps(cfg.cenaDoZappy) },
    })
  write('modulos.md', cfg.modulos)
  console.log(cfg.resumo)
  // Os projetos dos manifestos já organizados, como o "Organizar blocos" do Estúdio (organizar-projetos.ts).
  organizarManifestos([dir])
}
