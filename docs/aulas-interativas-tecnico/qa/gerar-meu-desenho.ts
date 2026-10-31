/** Autoria local do extra "Meu primeiro desenho no Pinta". Importação, gravação e publicação são etapas à parte. */
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest, type LearningManifest } from '../../../packages/core/src/learning'
import {
  LEARNING_IMPORT_BODY_MAX_BYTES,
  learningImportBodyBytes,
} from '../../../packages/core/src/learning/authoring-manifest-projection'
import type { StudioProjectExamples } from '../../../packages/core/src/learning/studio-project-examples'
import { isStudioAuthoringProject } from '../../../packages/core/src/studio/authoring-project'
import { derivadosDeVoz } from './gerar-falas-elevenlabs'
import { gravarArquivo } from './gravar-arquivo'
import { meuDesenhoAjuda, meuDesenhoAula } from './meu-desenho-conteudo'
import { meuDesenhoChecks } from './meu-desenho-criterios'
import {
  CHAVE_DO_JOGO,
  desenhoInicialDaChave,
  MEU_DESENHO_CURSO,
  projetoComMinhaChave,
  projetoInicialMeuDesenho,
  VAGA_CHAVE,
} from './meu-desenho-projeto'
import { extrairPartesElevenLabs, sincronizarRecadosNaPagina } from './roteiro-elevenlabs'

/**
 * As ferramentas que o bloco de Pinta libera: as que a aula ensina, e a Ajustar (o único jeito de
 * voltar quem aproximou demais pela rolagem). Os dois quadradinhos de Preenchimento e Contorno e o
 * painel Cores não são ferramentas e aparecem sempre.
 */
export const FERRAMENTAS_DA_CHAVE = ['select', 'ellipse', 'rect', 'brush', 'fit']

const dir = resolve(
  import.meta.dirname,
  '../../aulas-interativas/faisca/meu-primeiro-desenho-no-pinta',
)
mkdirSync(dir, { recursive: true })
const write = (name: string, v: unknown) =>
  gravarArquivo(resolve(dir, name), typeof v === 'string' ? v : `${JSON.stringify(v, null, 2)}\n`)

const aula = meuDesenhoAula
const help = `# Passo a passo do projeto — Meu primeiro desenho no Pinta\n\nExtra do Faísca. Aqui estão as duas montagens da aula: desenhar a chave no Pinta e colocar o desenho no jogo da Chave do Farol. Você pode consultar quantas vezes quiser.\n\n${meuDesenhoAjuda
  .map(
    (h, i) =>
      `## ${i + 1}. ${h.title}\n\n**Relembre:** ${h.idea}\n\n${h.steps.map((s, n) => `${n + 1}. ${s}`).join('\n')}\n\n**Teste:** ${h.test}\n\n**Se não funcionar:** ${h.correction}`,
  )
  .join(
    '\n\n',
  )}\n\n## Entrega\n\nEnvie o desenho antes de abrir o jogo: é assim que ele chega aos materiais do jogo. No jogo, troque a imagem, jogue uma partida inteira e clique em Verificar projeto. Corrija o que faltar, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula. Quer outra chave? Volte à parte do desenho, mude e clique em Enviar de novo: na próxima vez que você abrir a aula, o jogo vem com a chave nova.\n`
write('passo-a-passo.md', help)

const inicial = projetoInicialMeuDesenho()
const gabarito = projetoComMinhaChave()
for (const [nome, projeto] of [
  ['inicial', inicial],
  ['gabarito', gabarito],
] as const)
  if (!isStudioAuthoringProject(projeto)) throw Error(`Projeto inválido: ${nome}`)

const palette = new Set<string>()
const visit = (v: unknown) => {
  if (!v || typeof v !== 'object') return
  if ('type' in v && typeof v.type === 'string' && v.type.startsWith('sz_')) palette.add(v.type)
  for (const c of Object.values(v)) visit(c)
}
visit(gabarito.blocksState)
const inventory = [...palette].sort()

const exemplo = (n: number) => `fa15ca0e-0000-4000-8001-${String(n).padStart(12, '0')}`
const examples: StudioProjectExamples['examples'] = {
  [exemplo(1)]: inicial as StudioProjectExamples['examples'][string],
  [exemplo(2)]: gabarito as StudioProjectExamples['examples'][string],
}

const sections: LearningManifest['sections'] = []
const blocks: LearningManifest['blocks'] = []
for (const t of aula.trechos) {
  const keys = [`video-${t.key}`, `ponte-${t.key}`]
  const required = [`video-${t.key}`]
  blocks.push(
    {
      key: `video-${t.key}`,
      plannedVideo: `Título: ${t.title}\n\nMaster integral da professora: meu-desenho-${aula.slug}.roteiro.md, clipe video-${t.key}. Gravação pendente.`,
    },
    { key: `ponte-${t.key}`, content: { kind: 'dialogue', pose: 'speaking', text: t.ponte } },
  )
  if (t.kind === 'intro') {
    keys.push('jogo-pronto')
    required.push('jogo-pronto')
    blocks.push({
      key: 'jogo-pronto',
      content: {
        kind: 'interactive',
        title: 'Jogue com a chave desenhada',
        required: true,
        instructions:
          'Clique no jogo e use as setas do teclado. Pegue a chave desenhada e leve o personagem até o farol. Você pode seguir sem terminar.',
        hints: [],
        activity: {
          type: 'project-play',
          project: gabarito,
          stage: { width: 480, height: 360 },
          completion: 'participation',
          targets: [],
        },
      },
    })
  }
  if (t.kind === 'material') keys.push('materiais')
  if (t.kind === 'draw') {
    keys.push('desenho')
    required.push('desenho')
  }
  if (t.kind === 'swap') {
    keys.push('projeto')
    required.push('projeto')
  }
  const workspace = t.kind === 'draw' ? 'desenho' : t.kind === 'swap' ? 'projeto' : null
  sections.push({
    key: t.key,
    title: t.title,
    intent:
      t.kind === 'intro'
        ? 'explanation'
        : t.kind === 'material'
          ? 'material'
          : t.kind === 'draw'
            ? 'delivery'
            : 'closing',
    objective: `${t.title}.`,
    blockKeys: keys,
    workspaceKey: workspace,
    externalTool: null,
    pendingMedia: [],
    completion: {
      version: 1,
      blockIds: required,
      ...(t.kind === 'swap' ? { projectChecks: meuDesenhoChecks } : {}),
      ...(workspace ? { submissionUpToDate: true } : {}),
    },
  })
}
blocks.push(
  {
    key: 'materiais',
    content: {
      kind: 'materials',
      title: 'Passo a passo do projeto: Meu primeiro desenho no Pinta',
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
  },
  {
    key: 'desenho',
    content: {
      kind: 'pinta',
      purpose: 'submission',
      initialAsset: desenhoInicialDaChave(),
      allowTools: FERRAMENTAS_DA_CHAVE,
      artSlot: { name: VAGA_CHAVE, replaces: CHAVE_DO_JOGO },
    },
  },
  {
    key: 'projeto',
    content: {
      kind: 'studio',
      purpose: 'submission',
      level: 'iniciante-2d',
      allowedModes: ['blocks'],
      allowLevelReveal: false,
      allowBlocks: inventory,
      initialProject: inicial,
      artSlots: [{ name: VAGA_CHAVE, mode: 'add' }],
      projectExamples: {
        version: 1,
        examples,
        sections: { trocar: { entryExampleId: exemplo(1), solutionExampleId: exemplo(2) } },
      },
    },
  },
)
const manifest = {
  version: 5,
  courseSlug: MEU_DESENHO_CURSO,
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
write(`meu-desenho-${aula.slug}.manifesto.json`, manifest)

let script = `# Roteiro de produção · ${aula.title}\n\nMaster integral da professora. Montagem guiada completa no vídeo, um gesto por vez, com o destino à vista antes da ferramenta: no Pinta, o quadro e a ferramenta antes de desenhar; no Estúdio, o bloco antes de trocar a imagem. Sem intervenções de personagens. Voz, escuta, gravação e publicação pendentes.\n\n**Antes de gravar:** use um perfil de ensaio sem envio nesta aula. Envie o desenho de verdade na parte do Pinta antes de gravar a parte do Estúdio: é o envio que põe minha-chave nos materiais do jogo. Não preencha Recado nos envios. Mostre Desenho enviado!, Objetivo cumprido! e Projeto enviado! só quando esses estados aparecerem de verdade.\n\n`
for (const [i, t] of aula.trechos.entries())
  script += `## Parte ${i + 1}. ${t.title}\n\n**Clipe:** \`video-${t.key}\`\n\n**Na tela:** ${t.screen}\n\n**Fala para ElevenLabs:**\n\n\`\`\`text\n${t.text.replace(/ (?=\[)/g, '\n\n')}\n\`\`\`\n\n`
script = sincronizarRecadosNaPagina(script, manifest)
write(`meu-desenho-${aula.slug}.roteiro.md`, script)
for (const [ext, text] of derivadosDeVoz(extrairPartesElevenLabs(script)))
  write(`meu-desenho-${aula.slug}${ext}`, text)
write(
  `meu-desenho-${aula.slug}.md`,
  `# ${aula.title}\n\nExtra do Faísca · Meu primeiro desenho no Pinta · 2D. Duas entregas na mesma aula: o desenho (Pinta) e o jogo com o desenho (Estúdio). Ajuda livre no Passo a passo do projeto; sem certificado, sem quiz e sem publicação obrigatória.\n\n${sections.map((s, i) => `## Parte ${i + 1}. ${s.title}\n\n${s.objective}\n\n- Intenção: ${s.intent}.\n- Blocos: ${s.blockKeys.join(', ')}.\n- Espaço de trabalho: ${s.workspaceKey ?? 'não'}.\n- Conclusão: ${s.completion?.blockIds.join(', ') || 'avanço livre'}${s.completion?.submissionUpToDate ? '; envio atualizado' : ''}.\n\n${s.completion?.projectChecks?.map((c: { label: string }) => `- ${c.label}`).join('\n') ?? ''}`).join('\n\n')}\n\n[Fala integral](meu-desenho-${aula.slug}.roteiro.md) · [Passo a passo](passo-a-passo.md).\n`,
)
write('meu-desenho-inicio.szproject.json', inicial)
write('meu-desenho.szproject.json', gabarito)
write('blocos.json', inventory)
write(
  'modulos.md',
  `# Meu primeiro desenho no Pinta — organização do curso\n\nExtra 2 do posto Faísca (\`${MEU_DESENHO_CURSO}\`). Módulo: **Meu primeiro desenho no Pinta**. Preservar o ID do curso, do módulo reservado e da \`aula-1\` criados pelo seed da jornada.\n\n## Aula 1. ${aula.title}\n\nIdentificador: ${aula.slug}. Dimensão: 2D.\n\n${aula.trechos.map((t, n) => `${n + 1}. ${t.title}.`).join('\n')}\n\n[Manifesto](meu-desenho-${aula.slug}.manifesto.json) · [Roteiro](meu-desenho-${aula.slug}.roteiro.md).\n\nDuas entregas: o desenho (vaga de arte \`${VAGA_CHAVE}\`, que substitui \`${CHAVE_DO_JOGO}\`) e o jogo com o desenho. Extra opcional: não conta para subir de posto. Sem certificado nem publicação na comunidade. Produzir e anexar a mídia real antes de publicar.\n`,
)
console.log('Meu primeiro desenho: aula, roteiro, voz, ajuda, inventário e dois projetos gerados.')
