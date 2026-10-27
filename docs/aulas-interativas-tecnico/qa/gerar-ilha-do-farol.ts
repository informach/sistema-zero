/** Local source generation only; importing and publishing are separate production operations. */
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  LEARNING_IMPORT_BODY_MAX_BYTES,
  learningImportBodyBytes,
} from '../../../packages/core/src/learning/authoring-manifest-projection'
import { ISLAND_SPEECH } from '../../../packages/core/src/learning/scene/island-3d'
import { derivadosDeVoz } from './gerar-falas-elevenlabs'
import { gravarArquivo } from './gravar-arquivo'
import { ilhaAulas } from './ilha-do-farol-conteudo'
import { ilhaChecks } from './ilha-do-farol-criterios'
import { ILHA_CURSO, ILHA_PARTES, type IlhaParte, montarProjetoIlha } from './ilha-do-farol-projeto'
import { ilhaQuiz } from './ilha-do-farol-quiz'
import { extrairPartesElevenLabs, sincronizarRecadosNaPagina } from './roteiro-elevenlabs'

const dir = resolve(import.meta.dirname, '../../aulas-interativas/a-ilha-do-farol')
mkdirSync(dir, { recursive: true })
const write = (name: string, v: string | object) =>
  gravarArquivo(resolve(dir, name), typeof v === 'string' ? v : JSON.stringify(v, null, 2) + '\n')
const projects = Object.fromEntries(ILHA_PARTES.map((p) => [p, montarProjetoIlha(p)])) as Record<
  IlhaParte,
  ReturnType<typeof montarProjetoIlha>
>
const id = (p: IlhaParte) =>
  `1fa00000-0000-4000-8000-${String(ILHA_PARTES.indexOf(p) + 1).padStart(12, '0')}`
const palette = new Set<string>()
const visit = (v: unknown) => {
  if (!v || typeof v !== 'object') return
  if ('type' in v && typeof v.type === 'string' && v.type.startsWith('sz_')) palette.add(v.type)
  for (const c of Object.values(v)) visit(c)
}
visit(projects.personalizar.blocksState)
const goals: Record<string, string[]> = {
  'ponto-de-vista': ['other-view', 'same-place'],
  'posicao-3d': ['axis-x', 'axis-y', 'axis-z'],
  'contato-3d': ['contact-apart', 'contact-touch'],
}
const builds: IlhaParte[][] = [
  ['movimento'],
  ['posicao', 'recolher', 'memoria', 'aviso'],
  ['sem-chave', 'decisao', 'personalizar'],
]
const starts: IlhaParte[] = ['inicio', 'movimento', 'aviso']
for (const [i, aula] of ilhaAulas.entries()) {
  const sections: any[] = [],
    blocks: any[] = []
  const fala = (key: string, text: string) => ({
    key,
    content: { kind: 'dialogue', pose: 'speaking', text },
  })
  const addQuiz = () => {
    blocks.push(
      fala(
        'ponte-quiz',
        'Escolha uma resposta e clique em Ver o que acontece. Observe a cena e a explicação. Você pode tentar de novo.',
      ),
      { key: 'quiz', content: ilhaQuiz },
    )
    sections.push({
      key: 'revisao',
      title: 'O que você descobriu no 3D',
      intent: 'explanation',
      objective: 'Conferir ponto de vista, posição, altura e escolha de teste.',
      blockKeys: ['ponte-quiz', 'quiz'],
      workspaceKey: null,
      externalTool: null,
      pendingMedia: [],
      completion: { version: 1, blockIds: ['quiz'] },
    })
  }
  for (const t of aula.trechos) {
    if (i === 2 && t.kind === 'delivery') addQuiz()
    const vk = `video-${t.key}`,
      pk = `ponte-${t.key}`,
      keys = [vk, pk],
      required = [vk]
    blocks.push({
      key: vk,
      plannedVideo: `Título: ${t.title}\n\nMaster integral da professora. Roteiro: ${aula.slug}.roteiro.md, clipe ${vk}. Gravação pendente.`,
    })
    const bridge =
      t.kind === 'closing'
        ? 'Você concluiu os testes desta aula. Clique em Concluir aula.'
        : t.kind === 'experience'
          ? 'Sua vez! Compare as situações na experiência, na ordem que quiser. Quando fizer as descobertas, clique em Próxima parte.'
          : t.kind === 'delivery'
            ? 'Confira o jogo e os objetivos. Aguarde Salvo, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.'
            : t.kind === 'build'
              ? 'Sua vez! Monte a regra, teste no seu jogo e clique em Verificar projeto. Depois de conferir os objetivos e aparecer Salvo, clique em Próxima parte.'
              : t.kind === 'intro'
                ? 'Clique no jogo e use as setas do teclado ou WASD. Aperte R para recomeçar. Você pode seguir mesmo sem terminar a partida. Depois clique em Próxima parte.'
                : 'Consulte seu Passo a passo do projeto quando quiser. Para seguir, clique em Próxima parte.'
    blocks.push(fala(pk, bridge))
    if (t.kind === 'intro') {
      keys.push('jogo-pronto')
      required.push('jogo-pronto')
      blocks.push({
        key: 'jogo-pronto',
        content: {
          kind: 'interactive',
          title: 'Jogue A Ilha do Farol',
          required: true,
          instructions:
            'Clique no jogo e use setas ou WASD no teclado. Encontre a chave e vá ao farol. R recomeça. Você pode seguir sem terminar a partida.',
          hints: [],
          activity: {
            type: 'project-play',
            project: projects.personalizar,
            stage: { width: 960, height: 600 },
            completion: 'participation',
            targets: [],
          },
        },
      })
    }
    if (t.kind === 'material') keys.push('materiais')
    if (t.kind === 'experience') {
      const key = `experiencia-${t.key}`
      keys.push(key)
      required.push(key)
      blocks.push({
        key,
        content: {
          kind: 'interactive',
          title: t.title,
          required: true,
          instructions:
            'Experimente, compare e repita. As descobertas podem ser feitas em qualquer ordem.',
          hints: [],
          semPerguntaFinal: true,
          activity: {
            type: 'experimentation',
            scene: 'island-3d',
            setup: { goals: goals[t.key], freeExploration: true },
          },
        },
      })
    }
    const studio = t.kind === 'build' || t.kind === 'delivery'
    if (t.kind === 'delivery') {
      keys.push('projeto')
      required.push('projeto')
    }
    const part = (t.key === 'entrega' ? 'movimento' : t.key) as IlhaParte
    sections.push({
      key: t.key,
      title: t.title,
      intent:
        t.kind === 'build'
          ? 'application'
          : t.kind === 'experience'
            ? 'exploration'
            : t.kind === 'delivery'
              ? 'delivery'
              : t.kind === 'closing'
                ? 'closing'
                : 'explanation',
      objective: t.title + '.',
      blockKeys: keys,
      workspaceKey: studio || (i === 2 && t.kind === 'closing') ? 'projeto' : null,
      externalTool: null,
      pendingMedia: [],
      completion: {
        version: 1,
        blockIds: required,
        ...(studio ? { projectChecks: ilhaChecks(part) } : {}),
        ...(t.kind === 'delivery' ? { submissionUpToDate: true } : {}),
      },
    })
  }
  const examples: Record<string, unknown> = {},
    mapping: Record<string, unknown> = {}
  let before = starts[i]
  examples[id(before)] = projects[before]
  for (const p of builds[i]) {
    examples[id(p)] = projects[p]
    mapping[p] = { entryExampleId: id(before), solutionExampleId: id(p) }
    before = p
  }
  if (i === 0)
    mapping.entrega = { entryExampleId: id('movimento'), solutionExampleId: id('movimento') }
  if (i === 2)
    mapping.fecho = { entryExampleId: id('personalizar'), solutionExampleId: id('personalizar') }
  blocks.push({
    key: 'projeto',
    content: {
      kind: 'studio',
      purpose: 'submission',
      chain: ILHA_CURSO,
      level: 'iniciante-3d',
      allowedModes: ['blocks'],
      allowLevelReveal: false,
      allowBlocks: [...palette].sort(),
      initialProject: projects[starts[i]],
      projectExamples: { version: 1, examples, sections: mapping },
      ...(i === 2
        ? {
            showcase: {
              enabled: true,
              title: 'A Ilha do Farol',
              summary: 'Encontre a chave, atravesse a ponte e acenda o farol em uma ilha 3D.',
            },
          }
        : {}),
    },
  })
  if (i === 0)
    blocks.push({
      key: 'materiais',
      content: {
        kind: 'materials',
        title: 'Passo a passo do projeto: A Ilha do Farol',
        bookPreview: true,
        items: [
          {
            id: 'passos',
            kind: 'text',
            markdown: ilhaAulas
              .map(
                (a) =>
                  `## ${a.title}\n\n${a.trechos
                    .filter((t) => t.steps)
                    .map(
                      (t) =>
                        `### ${t.title}\n\n${t.steps!.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
                    )
                    .join('\n\n')}`,
              )
              .join('\n\n'),
          },
          {
            id: 'como-estudio',
            kind: 'link',
            label: 'Como usar o Estúdio',
            url: '/como-fazer/estudio-achar-e-organizar-blocos',
          },
          ...[
            ['plataforma-baixar-materiais', 'Como abrir o Passo a passo do projeto e os materiais'],
            ['plataforma-abrir-uma-aula', 'Como abrir uma aula e trocar de parte'],
            ['plataforma-ampliar-a-atividade', 'Como dar mais espaço ao jogo e à experiência'],
            ['plataforma-pedir-ajuda', 'Como pedir ajuda à equipe'],
          ].map(([slug, label]) => ({ id: slug, kind: 'link', label, url: `/como-fazer/${slug}` })),
        ],
      },
    })
  // Como no Cadê e no Farol, o caderno inteiro fica na parte 2 da primeira aula.
  const manifest = {
    version: 5,
    courseSlug: ILHA_CURSO,
    lessonSlug: aula.slug,
    title: aula.title,
    blocks,
    sections,
    ...(i > 0 ? { retireBlockKeys: ['materiais'] } : {}),
  }
  if (
    learningImportBodyBytes(
      manifest,
      'preserve',
      'a'.repeat(64),
      '00000000-0000-4000-8000-000000000000',
    ) > LEARNING_IMPORT_BODY_MAX_BYTES
  )
    throw new Error(`O manifesto ${aula.slug} excede o limite real de importação.`)
  write(`${aula.slug}.manifesto.json`, manifest)
  let script = `# Roteiro de produção · ${aula.title}\n\nMaster integral da professora. Sem intervenções de personagens nesta versão. Gerar áudio, escutar, gravar e publicar são etapas pendentes. Teclado necessário no jogo.\n\n**Antes de gravar:** abra a aula numa aba nova após o deploy. Use uma sessão sem progresso na experiência e sem envio anterior nesta aula. Não preencha Recado (opcional) na tomada do envio. Mostre Salvo somente quando o estado aparecer de verdade. Para repetir um primeiro envio, use outro perfil de ensaio. Nas partes sem Estúdio, use a cena da própria parte; não simule botões ou estados na edição.\n\n`
  for (const [j, t] of aula.trechos.entries())
    script += `## Parte ${j + 1}. ${t.title}\n\n**Clipe:** \`video-${t.key}\`\n\n**Na tela:** ${t.screen}\n\n**Fala para ElevenLabs:**\n\n\`\`\`text\n${t.text.replace(/ (?=\[)/g, '\n\n')}\n\`\`\`\n\n`
  if (i === 2)
    script = script.replace(
      '## Parte 3.',
      '## Revisão. O que você descobriu no 3D\n\nQuiz sem vídeo: escolha, demonstração, explicação e nova tentativa.\n\n## Parte 3.',
    )
  script = sincronizarRecadosNaPagina(script, manifest)
  write(`${aula.slug}.roteiro.md`, script)
  write(
    `${aula.slug}.md`,
    `# ${aula.title}\n\n## Resumo\n\nAula ${i + 1} de A Ilha do Farol, no Faísca. Usa Programação e Jogo 3D. O projeto começa na etapa ${starts[i]} e termina em ${builds[i].at(-1)}. Um envio encerra a construção; o vídeo final reconhece o resultado.\n\n## Partes e critérios\n\n${sections.map((s, j) => `### Parte ${j + 1}. ${s.title}\n\n${s.objective}\n\n- Intenção: ${s.intent}.\n- Blocos: ${s.blockKeys.join(', ')}.\n- Conclusão: ${s.completion.blockIds.join(', ')}${s.completion.projectChecks?.length ? '; objetivos do projeto atual' : ''}${s.completion.submissionUpToDate ? '; envio atualizado confirmado' : ''}.\n\n${s.completion.projectChecks?.map((c: { label: string }) => '- ' + c.label).join('\n') ?? ''}\n\n**Zappy na página (não gravar):** ${blocks.find((b) => s.blockKeys.includes(b.key) && b.content?.kind === 'dialogue')?.content.text ?? ''}`).join('\n\n')}\n\n## Produção\n\n[Fala integral e notas de tela](${aula.slug}.roteiro.md). Fonte editorial: ilha-do-farol-conteudo.ts. O Passo a passo fica na parte 2 da primeira aula; consulta e download são opcionais. Sem certificado. Mídia e publicação pendentes.\n`,
  )
  for (const [ext, text] of derivadosDeVoz(extrairPartesElevenLabs(script)))
    write(`${aula.slug}${ext}`, text)
}
write('blocos.json', { blocks: [...palette].sort() })
write('zappy-etapas.json', {
  version: 1,
  experiences: Object.fromEntries(
    [
      ['experiencia-ponto-de-vista', 'view'],
      ['experiencia-posicao-3d', 'position'],
      ['experiencia-contato-3d', 'contact'],
    ].map(([key, mode]) => [
      key,
      Object.entries(ISLAND_SPEECH)
        .filter(([id]) => id.startsWith(`island-${mode}-`) || id === 'island-complete')
        .map(([id, text]) => ({ id, text })),
    ]),
  ),
})
write('ilha-do-farol.szproject.json', projects.personalizar)
write(
  'passo-a-passo.md',
  '# Passo a passo do projeto — A Ilha do Farol\n\nUse o teclado para jogar: setas ou WASD. R recomeça.\n\n' +
    ilhaAulas
      .map(
        (a) =>
          `## ${a.title}\n\n${a.trechos
            .filter((t) => t.steps)
            .map(
              (t) => `### ${t.title}\n\n${t.steps!.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`,
            )
            .join('\n')}`,
      )
      .join('\n'),
)
console.log(
  'Ilha do Farol: 3 manifestos, roteiros, derivados, inventário e projeto final gerados localmente.',
)
