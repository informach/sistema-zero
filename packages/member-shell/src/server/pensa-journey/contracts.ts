import {
  PENSA_QUESTION_TOPICS,
  type PensaCapabilitySnapshot,
  type PensaProposal,
} from '@sistemazero/core/pensa'
import { z } from 'zod'
import { dimensionAllows } from '../pensa-agents/planner-contract'
import { isGameRuntimeExtension, STUDIO_EXTENSION_NAMES } from './interface-map'

const short = (max: number) => z.string().trim().min(1).max(max)
const ids = (max = 30) => z.array(short(160)).max(max)
export const ProposalDraftSchema = z.strictObject({
  title: short(100),
  summary: short(600),
  firstResult: short(400),
  essentials: z.array(short(180)).min(1).max(3),
  suggestions: z.array(short(180)).max(3),
  later: z.array(z.strictObject({ text: short(500), origin: z.enum(['child', 'zappy']) })).max(12),
  dimension: z.enum(['2d', '3d']),
  missions: z
    .array(
      z.strictObject({
        key: short(80),
        destination: z.enum(['studio', 'pinta', 'molda']),
        title: short(120),
        result: short(400),
        dependencies: ids(8),
        // Missão CURTA: até 16 blocos. É também o que deixa o guia de oito missões caber no teto
        // do pedido (os blocos da missão vão sempre, com nome e caminho na paleta).
        blockIds: ids(16),
        extensionIds: ids(10),
        mechanicIds: ids(10),
        toolIds: ids(16),
        asset: z
          .strictObject({
            id: short(100),
            kind: z.enum(['sprite', 'background', 'tileset', 'tilemap', 'model', 'texture', 'sky']),
            source: z.enum(['new', 'existing', 'editor']),
            creationId: short(120).nullable(),
            description: short(1000),
          })
          .nullable(),
      }),
    )
    .min(1)
    .max(8),
  test: z.strictObject({ action: short(400), expected: short(400) }),
  referenceIds: ids(6),
})
export type ProposalDraft = z.infer<typeof ProposalDraftSchema>
/**
 * A pergunta do Zappy com respostas para tocar (15/10/2026, inspirada no `ask_player` do
 * sandbox): um assunto, uma frase e de 2 a 4 respostas no mesmo eixo, todas possíveis.
 * `workingTitle` é o nome provisório do jogo enquanto a proposta não chega.
 */
export const PlanningQuestionSchema = z.strictObject({
  about: z.enum(PENSA_QUESTION_TOPICS),
  text: short(300),
  options: z
    .array(z.strictObject({ label: short(80), description: short(200) }))
    .min(2)
    .max(4),
  workingTitle: short(100).nullable(),
})
export const PlanningReplySchema = z.strictObject({
  question: PlanningQuestionSchema.nullable(),
  proposal: ProposalDraftSchema.nullable(),
})

/**
 * O que a pergunta não pode ser, por regra (o resto é do prompt): perguntar com o teto esgotado,
 * oferecer 2D ou 3D a quem só tem um deles ou num jogo que já tem formato, duas respostas iguais e
 * uma resposta que repete o "Tanto faz" (a tela já oferece esse botão).
 * `fixedDimension` é o formato do jogo já construído (`null` num jogo novo).
 */
export function questionIssues(
  question: z.infer<typeof PlanningQuestionSchema>,
  caps: Pick<PensaCapabilitySnapshot, 'dimensions'>,
  questionsLeft: number,
  fixedDimension: '2d' | '3d' | null = null,
): string[] {
  const issues: string[] = []
  if (questionsLeft <= 0)
    issues.push(
      'Você já fez as perguntas que cabiam. Devolva a proposta (question=null) e decida o que falta em suggestions.',
    )
  if (question.about === 'dimension' && fixedDimension)
    issues.push(
      `O jogo já é ${fixedDimension.toUpperCase()} e o formato não muda numa versão nova. Pergunte outra coisa ou proponha.`,
    )
  else if (question.about === 'dimension' && caps.dimensions.length < 2)
    issues.push(
      `A criança só tem o Estúdio ${caps.dimensions.join(' e ').toUpperCase()}: 2D ou 3D não é escolha dela. Pergunte outra coisa ou proponha.`,
    )
  const labels = question.options.map((o) => o.label.trim().toLocaleLowerCase('pt-BR'))
  if (new Set(labels).size !== labels.length)
    issues.push('Duas respostas da pergunta têm o mesmo rótulo. Cada resposta é um jogo diferente.')
  if (labels.some((label) => label.startsWith('tanto faz')))
    issues.push(
      'A tela já oferece "Tanto faz, escolhe você". As respostas são escolhas de jogo, nunca "tanto faz".',
    )
  return issues
}

/**
 * Num jogo já construído o formato é fixo (o members recusa trocar com 409 "Este jogo já tem um
 * formato"): a proposta da versão nova mantém a `dimension` dele.
 */
export function fixedDimensionIssues(
  draft: Pick<ProposalDraft, 'dimension'>,
  fixedDimension: '2d' | '3d' | null,
): string[] {
  if (!fixedDimension || draft.dimension === fixedDimension) return []
  return [
    `O jogo já é ${fixedDimension.toUpperCase()}: a proposta mantém dimension="${fixedDimension}" (o formato não muda numa versão nova).`,
  ]
}

/**
 * Jogo novo começa JOGANDO (o "julgado nos primeiros dez segundos" do sandbox): a primeira missão é
 * no Estúdio e já mexe com uma figura pronta; a arte da criança vem depois e troca a figura. Com o
 * jogo já construído (uma versão guardada ou resultados prontos), a regra não vale.
 * ⚠️ Fica FORA do `validateJourneyProposal`: aquela régua é de RECURSOS e roda também nos guias de
 * propostas já aceitas, que não podem passar a falhar por uma regra de desenho nova.
 */
export function playFirstIssues(
  draft: Pick<ProposalDraft, 'missions'>,
  gameExists: boolean,
): string[] {
  const first = draft.missions[0]
  if (gameExists || !first || first.destination === 'studio') return []
  return [
    `Missão "${first.key}": a primeira missão de um jogo novo é no Estúdio e já deixa algo se mexendo no ▶ Reproduzir com uma figura pronta. Coloque a missão de arte depois dela e faça uma missão do Estúdio, depois da arte, trocar a figura pronta pela arte da criança.`,
  ]
}
/** As extensões de JOGO que as missões do Estúdio pedem (blocos e manuais), na ordem do plano. */
export function gameExtensionsOf(
  missions: readonly Pick<
    ProposalDraft['missions'][number],
    'destination' | 'extensionIds' | 'mechanicIds'
  >[],
): string[] {
  const found = new Set<string>()
  for (const mission of missions) {
    if (mission.destination !== 'studio') continue
    for (const id of [...mission.extensionIds, ...mission.mechanicIds])
      if (isGameRuntimeExtension(id)) found.add(id)
  }
  return [...found]
}

/**
 * O jogo do plano é UM arquivo do Estúdio, e o Estúdio recusa instalar duas extensões de jogo no
 * mesmo projeto (a segunda conflita com a primeira). Então todas as missões do Estúdio usam a MESMA
 * extensão de jogo, e num jogo já construído ela é a que o jogo já tem (`builtExtension`).
 * ⚠️ Fica FORA do `validateJourneyProposal`, como as outras regras de desenho: aquela régua roda
 * também nos guias de propostas já aceitas.
 */
export function gameExtensionIssues(
  draft: Pick<ProposalDraft, 'missions'>,
  builtExtension: string | null,
): string[] {
  const used = gameExtensionsOf(draft.missions)
  const name = (id: string) => STUDIO_EXTENSION_NAMES[id] ?? id
  if (builtExtension && used.some((id) => id !== builtExtension))
    return [
      `O jogo já usa a extensão ${name(builtExtension)} (${builtExtension}), e cada jogo usa uma extensão de jogo só: use só blocos e manuais dela (troque ${used
        .filter((id) => id !== builtExtension)
        .join(', ')}).`,
    ]
  if (used.length > 1)
    return [
      `Cada jogo usa UMA extensão de jogo só, e as missões misturam ${used.join(' e ')}. Escolha uma (a mais simples que faz a ideia funcionar) e use só blocos e manuais dela em todas as missões do Estúdio.`,
    ]
  return []
}

/** A extensão de jogo da versão já construída (a da proposta guardada), se ela tem uma só. */
export function builtGameExtension(
  proposal: Pick<ProposalDraft, 'missions'> | null | undefined,
): string | null {
  const used = proposal ? gameExtensionsOf(proposal.missions) : []
  return used.length === 1 ? (used[0] ?? null) : null
}

export const GuideDraftSchema = z.strictObject({
  missions: z
    .array(
      z.strictObject({
        key: short(80),
        // Um gesto por passo: `action` é o gesto inteiro (onde clicar, qual bloco, para onde
        // arrastar) e `effect` é o porquê, numa frase ("Isso prepara o jogo para começar.").
        steps: z
          .array(z.strictObject({ action: short(260), effect: short(180) }))
          .min(1)
          .max(8),
        testAction: short(300),
        expected: short(300),
      }),
    )
    .min(1)
    .max(8),
})
/**
 * O passo que manda a criança "ir" a um lugar que não existe (15/10/2026, relato dela: "Abrir o
 * Estúdio e ir para a área ⚙️ Ao iniciar"). As áreas são BLOCOS que ela pega e arrasta, e o guia já
 * aparece dentro do Estúdio. Cada padrão diz o conserto, que é o que o reparo recebe.
 */
const VAGUE_STEPS: readonly { pattern: RegExp; fix: string; studioOnly?: boolean }[] = [
  {
    pattern:
      /\b(?:ir|v[aá]|volte|voltar|entre|entrar|abra|abrir|acesse|acessar)\s+(?:para\s+|at[eé]\s+)?(?:a|na|à)\s+[aá]rea\b/iu,
    fix: 'as áreas são blocos: diga "clique em "🗂️ Áreas do projeto", pegue o bloco da área e arraste para o espaço de montar" ou "arraste para dentro da área X"',
  },
  {
    pattern:
      /\b(?:abra|abrir|entre|entrar|v[aá]|ir)\s+(?:para\s+|no\s+|n[oa]\s+)?(?:o\s+)?est[uú]dio\b/iu,
    fix: 'o Guia do Pensa já aparece dentro do Estúdio com o jogo aberto: tire o passo de abrir o Estúdio',
    // Numa missão do Pinta ou do Molda, ir ao Estúdio pode ser o fim legítimo do desenho.
    studioOnly: true,
  },
  {
    pattern: /\bimplement/iu,
    fix: 'troque "implementar" pelo gesto: qual bloco pegar, de qual categoria, e para onde arrastar',
  },
]

/**
 * Os passos vagos do guia, com a missão e o conserto (vazio = nada a reparar). `studioKeys` são as
 * missões do Estúdio (sem a lista, todas contam como do Estúdio).
 */
export function guideIssues(
  guides: z.infer<typeof GuideDraftSchema>,
  studioKeys?: ReadonlySet<string>,
): string[] {
  const issues: string[] = []
  for (const mission of guides.missions)
    mission.steps.forEach((step, index) => {
      const studio = !studioKeys || studioKeys.has(mission.key)
      for (const { pattern, fix, studioOnly } of VAGUE_STEPS)
        if ((studio || !studioOnly) && pattern.test(step.action))
          issues.push(`Missão "${mission.key}", passo ${index + 1} ("${step.action}"): ${fix}.`)
    })
  return issues
}

export const HelpReplySchema = z.strictObject({ text: short(1500) })

/** Lista curta de ids para o motivo: o reparo precisa saber QUAL, não receber o catálogo. */
function list(ids: readonly string[]): string {
  const shown = ids.slice(0, 8).join(', ')
  return ids.length > 8 ? `${shown} e mais ${ids.length - 8}` : shown
}

/**
 * A revisão editorial não substitui estas restrições determinísticas. Cada motivo diz a MISSÃO
 * (pela chave) e o id que reprovou: é o que o revisor e a tentativa de reparo recebem (antes era
 * "Bloco indisponível.", e o modelo não tinha como saber qual trocar).
 */
export function validateJourneyProposal(
  proposal: Pick<PensaProposal, 'dimension' | 'missions'>,
  caps: PensaCapabilitySnapshot,
  mechanics: readonly string[],
  existingCreations: readonly string[] = [],
  inventory?: readonly { id: string; kind: string }[],
  blocks?: readonly { type: string; extension: string | null; category?: string }[],
): string[] {
  const issues: string[] = []
  if (!caps.studio || !caps.dimensions.includes(proposal.dimension))
    issues.push(`O Estúdio não está disponível para um jogo ${proposal.dimension.toUpperCase()}.`)
  if (!proposal.missions.some((m) => m.destination === 'studio'))
    issues.push('Falta uma missão do Estúdio que construa o jogo.')
  const previous = new Map<string, (typeof proposal.missions)[number]>()
  const assetIds = new Set<string>()
  const blockById = new Map(blocks?.map((block) => [block.type, block]))
  for (const mission of proposal.missions) {
    const at = `Missão "${mission.key}"`
    if (previous.has(mission.key)) issues.push(`${at}: a chave se repete.`)
    const badDependencies = mission.dependencies.filter((id) => !previous.has(id))
    if (badDependencies.length)
      issues.push(
        `${at}: depende de ${list(badDependencies)}, que não é uma missão anterior a ela.`,
      )
    if (!caps[mission.destination])
      issues.push(`${at}: a ferramenta ${mission.destination} não está disponível.`)
    const lockedBlocks = mission.blockIds.filter((id) => !caps.blockIds.includes(id))
    if (lockedBlocks.length)
      issues.push(`${at}: blocos fora da paleta da criança: ${list(lockedBlocks)}.`)
    const lockedExtensions = mission.extensionIds.filter((id) => !caps.extensionIds.includes(id))
    if (lockedExtensions.length)
      issues.push(`${at}: extensões indisponíveis: ${list(lockedExtensions)}.`)
    const threeD = [
      ...[...mission.extensionIds, ...mission.mechanicIds].filter(
        (extension) => !dimensionAllows({ extension }, proposal.dimension),
      ),
      ...mission.blockIds.filter((id) => {
        const block = blockById.get(id)
        return block ? !dimensionAllows(block, proposal.dimension) : false
      }),
    ]
    if (threeD.length) issues.push(`${at}: recurso 3D num jogo 2D: ${list([...new Set(threeD)])}.`)
    if (blocks) {
      const missing = new Map<string, string[]>()
      for (const id of mission.blockIds) {
        const extension = blockById.get(id)?.extension
        if (extension && !mission.extensionIds.includes(extension))
          missing.set(extension, [...(missing.get(extension) ?? []), id])
      }
      for (const [extension, ids] of missing)
        issues.push(
          `${at}: os blocos ${list(ids)} são da extensão ${extension}, que falta em extensionIds.`,
        )
    }
    const unknownManuals = mission.mechanicIds.filter((id) => !mechanics.includes(id))
    if (unknownManuals.length)
      issues.push(`${at}: manuais desconhecidos em mechanicIds: ${list(unknownManuals)}.`)
    const lockedTools = mission.toolIds.filter((id) => !caps.moldaTools.includes(id))
    if (lockedTools.length)
      issues.push(`${at}: ferramentas do Molda indisponíveis: ${list(lockedTools)}.`)
    if (mission.destination === 'studio' && !mission.blockIds.length)
      issues.push(`${at}: missão do Estúdio sem nenhum bloco em blockIds.`)
    if (mission.destination === 'molda' && !mission.toolIds.length)
      issues.push(`${at}: missão do Molda sem nenhuma ferramenta em toolIds.`)
    if (mission.destination !== 'studio' && !mission.asset)
      issues.push(`${at}: missão de arte sem asset definido.`)
    if (mission.asset) {
      const asset = mission.asset
      if (proposal.dimension === '2d' && ['model', 'texture', 'sky'].includes(asset.kind))
        issues.push(`${at}: a arte ${asset.id} (${asset.kind}) precisa de um jogo 3D.`)
      if (asset.source === 'existing' && mission.destination !== 'studio')
        issues.push(
          `${at}: a arte guardada ${asset.creationId ?? asset.id} entra direto numa missão do Estúdio, sem missão para desenhar de novo.`,
        )
      if (
        asset.source === 'existing' &&
        (!asset.creationId || !existingCreations.includes(asset.creationId))
      )
        issues.push(
          `${at}: a criação guardada ${asset.creationId ?? '(sem creationId)'} não está no inventário.`,
        )
      else if (asset.source === 'existing' && inventory) {
        const found = inventory.find((item) => item.id === asset.creationId)
        if (found && found.kind !== asset.kind)
          issues.push(
            `${at}: a criação guardada ${asset.creationId} é ${found.kind}, não ${asset.kind}.`,
          )
      }
      if (
        mission.destination === 'pinta' &&
        !['sprite', 'background', 'tileset', 'tilemap'].includes(asset.kind)
      )
        issues.push(`${at}: arte ${asset.kind} não é feita no Pinta.`)
      if (mission.destination === 'molda' && !['model', 'texture', 'sky'].includes(asset.kind))
        issues.push(`${at}: arte ${asset.kind} não é feita no Molda.`)
      if (assetIds.has(asset.id)) issues.push(`${at}: a arte ${asset.id} se repete.`)
      assetIds.add(asset.id)
    }
    previous.set(mission.key, mission)
  }
  // Toda arte produzida tem uma etapa posterior que a leva para dentro do jogo.
  const dependsOn = (key: string, wanted: string, seen = new Set<string>()): boolean => {
    if (seen.has(key)) return false
    seen.add(key)
    return (
      previous
        .get(key)
        ?.dependencies.some((dep) => dep === wanted || dependsOn(dep, wanted, seen)) ?? false
    )
  }
  for (const mission of proposal.missions.filter((m) => m.destination !== 'studio')) {
    if (!proposal.missions.some((m) => m.destination === 'studio' && dependsOn(m.key, mission.key)))
      issues.push(
        `Missão "${mission.key}": a arte não entra no jogo; falta uma missão do Estúdio que dependa dela.`,
      )
  }
  return [...new Set(issues)]
}
