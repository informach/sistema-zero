import type { LearningManifest } from '../../../packages/core/src/learning'
import { SERVER_BLOCK_CATALOG } from '../../../packages/studio/src/blockly/blockCatalog'
import { courseProjects as dinoProjects } from './corre-dino-projetos-qa'
import { courseProjects as desafioProjects } from './desafio-projetos-qa'
import { courseProjects as meuJeitoProjects } from './meu-jeito-projetos-qa'

const catalog = new Map(SERVER_BLOCK_CATALOG.map((block) => [block.type, block]))
export const STUDIO_COURSE_EDITION = 'jogo-2d-1.0-documento-2'

/** Atualiza a direção de gravação, nunca o trecho original usado como âncora. */
export function currentStudioDirections(source: string): string {
  let text = source
  if (/Tocar som de pulo|Som de pulo/.test(text))
    text = text.replaceAll('Kit dino', 'Som › Efeitos prontos')
  if (text.includes('Aparência') && text.includes('Jogo 2D')) {
    const family = /Preparar o jogo|tela cheia/.test(text)
      ? 'Jogo e telas'
      : /caixa de colisão/.test(text)
        ? 'Colisões'
        : 'Desenho e efeitos'
    text = text.replaceAll('Aparência', family)
  }
  for (const [old, current] of [
    ['Tempo e repetição', 'Tempo › Quadros e intervalos'],
    ['Kit dino', 'Kits prontos › Dino'],
    ['Kit espaço', 'Kits prontos › Espaço'],
    ['Muitos', 'Grupos'],
    ['Placar e HUD', 'Vida e placar'],
    ['Telas e cenas', 'Jogo e telas › Telas e partida'],
    ['Mira e contas', 'Sorteios'],
    ['Tocar som de pulo', 'Tocar efeito, com pulo selecionado'],
    ['Som de pulo', 'Tocar efeito, com pulo selecionado'],
  ])
    text = text.replaceAll(old!, current!)
  text = text.replace(/(?<!Movimento › )Posição e tamanho/g, 'Movimento › Posição e tamanho')
  text = text.replace(/(Jogo 2D, )Vida(?=,)/g, '$1Vida e placar')
  text = text.replace(
    /(Desenhar fundo de estrelas, em )Kits prontos › Espaço/g,
    '$1Cenários › Fundos',
  )
  return text
}

export function currentStudioRecipe<
  T extends { steps: { say: string; visual?: string; edit?: string }[] },
>(recipe: T): T {
  return {
    ...recipe,
    steps: recipe.steps.map((step) => ({
      ...step,
      say: currentStudioDirections(step.say),
      ...(step.visual ? { visual: currentStudioDirections(step.visual) } : {}),
      ...(step.edit ? { edit: currentStudioDirections(step.edit) } : {}),
    })),
  }
}

/** Tipos efetivamente montados, citados nos critérios ou herdados do pré-requisito. */
export function lessonBlockTypes(manifest: LearningManifest): string[] {
  const number = Number(manifest.lessonSlug.match(/\d+/)?.[0] ?? 0)
  const source =
    manifest.courseSlug === 'corre-dino'
      ? dinoProjects()[number]
      : manifest.courseSlug === 'desafio-primeiro-jogo'
        ? desafioProjects()[number]
        : meuJeitoProjects()[number]
  const types = new Set<string>()
  const pending: unknown[] = [
    source,
    manifest.sections,
    manifest.courseSlug === 'o-jogo-do-meu-jeito' && number >= 6
      ? number === 6
        ? desafioProjects()[5]
        : meuJeitoProjects()[6]
      : null,
  ]
  while (pending.length) {
    const value = pending.pop()
    if (typeof value === 'string') {
      if (value.startsWith('sz_')) types.add(value)
      continue
    }
    if (Array.isArray(value)) pending.push(...value)
    else if (value && typeof value === 'object') pending.push(...Object.values(value))
  }
  if (manifest.courseSlug === 'o-jogo-do-meu-jeito' && number >= 6) {
    for (const type of [
      'sz_g2d_create_image_sprite',
      'sz_g2d_load_spritesheet',
      'sz_g2d_animate_sprite',
    ])
      types.add(type)
    if (number >= 7) types.add('sz_g2d_spawn_image_in_group')
  }
  for (const type of types)
    if (!catalog.has(type))
      throw new Error(
        `${manifest.courseSlug}/${manifest.lessonSlug}: bloco ausente do catálogo atual: ${type}`,
      )
  return [...types].sort()
}

export function lessonStudioEdition(manifest: LearningManifest) {
  const blocks = lessonBlockTypes(manifest).map((type) => {
    const block = catalog.get(type)!
    return {
      type,
      label: block.label,
      palettePath: block.palettePath,
      area: block.area,
      tooltip: block.tooltip,
    }
  })
  return {
    edition: STUDIO_COURSE_EDITION,
    documentFormatVersion: 2,
    extensionVersion: '1.0.0',
    recordingStatus: blocks.length
      ? 'regravar-e-validar-em-staging'
      : 'revisar-midia-da-ferramenta',
    blocks,
  }
}

export function studioGuideMarkdown(manifest: LearningManifest): string {
  const edition = lessonStudioEdition(manifest)
  const lines = ['', '## Blocos e gravação no Estúdio atual', '', `Edição: ${edition.edition}.`, '']
  if (!edition.blocks.length)
    return [
      ...lines,
      'Esta aula não monta blocos no Estúdio. Preserve o percurso e a entrega previstos; os blocos do jogo entram nas aulas de integração.',
      '',
    ].join('\n')
  lines.push(
    'Use os endereços abaixo ao gravar os gestos e a narração. As falas e âncoras identificadas como originais documentam a gravação anterior. Capture a paleta atual e substitua as indicações de localização antigas antes de publicar a aula.',
    '',
    'No seletor Tocar efeito, escolha pulo, tiro, explosão ou derrota conforme a ação. O som fica no evento ou na colisão que o dispara. Preparar o jogo continua em Ao iniciar; seus eventos e relógios ficam nas áreas indicadas no passo a passo.',
    '',
    'Confira com o perfil de aluno: abrir a aula, encontrar cada peça, montar, testar, conferir os critérios, guardar, reabrir e continuar na aula seguinte. Nas aulas de publicação, teste também Fazer minha versão e a edição da cópia.',
    '',
    '| Bloco | Onde encontrar | O que faz |',
    '| --- | --- | --- |',
    ...edition.blocks.map(
      (block) =>
        `| ${block.label.replaceAll('|', '/')} | ${block.palettePath.join(' › ')} | ${block.tooltip.replaceAll('|', '/').replace(/\s+/g, ' ')} |`,
    ),
    '',
    'Os identificadores para configuração estão em blocos-por-aula.json na pasta do curso. A lista reúne o programa herdado e as peças usadas durante esta aula, inclusive as retiradas no resultado final. Ela não concede modos ou extensões adicionais.',
    '',
  )
  return lines.join('\n')
}

/** Instrução de produção; as âncoras e a fala original continuam intactas. */
export function annotateStudioRecording(
  manifest: LearningManifest,
  clips: { edit: string; production?: string; visual?: string; newNarration?: string }[],
): void {
  if (!lessonBlockTypes(manifest).length) return
  for (const clip of clips) {
    if (clip.visual) clip.visual = currentStudioDirections(clip.visual)
    if (clip.newNarration) clip.newNarration = currentStudioDirections(clip.newNarration)
    clip.production = 'regravar-estudio-atual'
    clip.edit = `Regravar a tela com a edição ${STUDIO_COURSE_EDITION}; seguir o mapa de blocos do roteiro para categorias, rótulos e opções de som. ${clip.edit}`
  }
  for (const block of manifest.blocks)
    if ('plannedVideo' in block)
      block.plannedVideo = `Gravação atual obrigatória: seguir o mapa de blocos do roteiro. ${block.plannedVideo}`
}
