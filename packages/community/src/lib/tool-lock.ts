import {
  type AdultCreatorCapability,
  type AdultJourneyView,
  adultJourneyPosition,
} from '@sistemazero/core/journey'
import { normalizeJourney } from './journey-stage'

/** As ferramentas de criação do adulto; a chave também é o `utm_content` (`ferramenta-<chave>`). */
export type CreativeToolKey = 'estudio' | 'pinta' | 'molda' | 'pensa' | 'estudio-pro'

interface CreativeToolInfo {
  name: string
  /** A licença que a ferramenta pede em `/members/access` (sem o prefixo `adult-`). */
  ref: string
  /** O que a jornada precisa ter liberado para a ferramenta abrir. */
  capabilities: readonly AdultCreatorCapability[]
}

export const CREATIVE_TOOLS: Record<CreativeToolKey, CreativeToolInfo> = {
  estudio: { name: 'Estúdio', ref: 'estudio-completo', capabilities: ['studio'] },
  pinta: { name: 'Pinta', ref: 'pinta', capabilities: ['pinta'] },
  molda: { name: 'Molda', ref: 'molda', capabilities: ['molda'] },
  pensa: { name: 'Pensa', ref: 'pensa', capabilities: ['pensa', 'ai'] },
  'estudio-pro': { name: 'Estúdio Pro', ref: 'estudio-completo', capabilities: ['studio', 'pro'] },
}

/**
 * Por que a ferramenta está fechada: `plan` sem a licença na conta, `journey` quando a jornada ainda
 * não liberou e `advanced` quando o Pensa pede a IA da jornada histórica (curso avançado).
 */
export type ToolLockReason = 'plan' | 'journey' | 'advanced'

export interface ToolAccessState {
  access: Record<string, boolean>
  journey: AdultJourneyView
  tier: { hasPalette: boolean; pro: boolean }
}

/**
 * A MESMA régua do quadro `/criar` e das páginas de cada ferramenta (antes só o `/criar` sabia o
 * motivo). `null` = nada na conta nem na jornada fecha a ferramenta.
 */
export function toolLockReason(
  tool: CreativeToolKey,
  state: ToolAccessState,
): ToolLockReason | null {
  if (state.access[CREATIVE_TOOLS[tool].ref] !== true) return 'plan'
  const capabilities = state.journey.capabilities
  if (tool === 'pensa' && !capabilities.includes('ai'))
    return state.journey.curriculum ? 'journey' : 'advanced'
  if (tool === 'pensa' && !capabilities.includes('pensa')) return 'journey'
  if (tool === 'pinta' || tool === 'molda') return capabilities.includes(tool) ? null : 'journey'
  if (tool === 'estudio' || tool === 'estudio-pro') {
    if (!capabilities.includes('studio') || !state.tier.hasPalette) return 'journey'
    if (tool === 'estudio-pro' && !state.tier.pro) return 'journey'
  }
  return null
}

/**
 * O nome da etapa em que a ferramenta abre: a posição a que a pessoa chega ao concluir a etapa que
 * libera a última capacidade que falta (a mesma leitura do "abre no nível" do Kids). Sem uma etapa
 * ainda por concluir que a libere, `null`: a tela não promete uma etapa que não existe. Isso inclui
 * a etapa abaixo do piso da jornada (`reachedPosition`), que aparece concluída sem ter entregado a
 * capacidade: a tela usa a frase genérica, sem nome de etapa e sem "mais adiante".
 * Com currículo, informa o próprio posto que ensina a capacidade: sua base/par/curso pode
 * liberá-la antes da promoção, inclusive num posto preservado pelo piso.
 */
export function toolStageTitle(tool: CreativeToolKey, journey: AdultJourneyView): string | null {
  const view = normalizeJourney(journey)
  if (!view.configured) return null
  const missing = CREATIVE_TOOLS[tool].capabilities.filter(
    (capability) => !view.capabilities.includes(capability),
  )
  if (missing.length === 0) return null
  let required = -1
  for (const capability of missing) {
    const index = view.stages.findIndex(
      (stage) =>
        (Boolean(view.curriculum) || !stage.completed) && stage.capabilities.includes(capability),
    )
    if (index === -1) return null
    required = Math.max(required, index)
  }
  // Curriculum tools are taught during a post's bases/pair/course, before its promotion.
  return view.curriculum
    ? view.stages[required]!.title
    : (view.stages[required + 1]?.title ?? 'Lenda')
}

/** A página da etapa atual (os cursos que faltam), ou Seu progresso quando não há etapa aberta. */
export function currentStageHref(journey: AdultJourneyView): string {
  const stageId = adultJourneyPosition(journey)?.stageId
  return stageId ? `/cursos/etapa/${encodeURIComponent(stageId)}` : '/progresso'
}

/** A jornada já entregou tudo o que a ferramenta pede (as capacidades sobrevivem ao fim do acesso). */
export function toolEarned(tool: CreativeToolKey, journey: AdultJourneyView): boolean {
  return CREATIVE_TOOLS[tool].capabilities.every((capability) =>
    journey.capabilities.includes(capability),
  )
}

export interface ToolLock {
  reason: ToolLockReason
  /**
   * Em `plan` e `journey`: o nome da etapa em que a ferramenta abre, quando a jornada o sabe. Etapa
   * histórica concluída pelo piso sem entregar a capacidade não vira nome. Com currículo,
   * informa o posto dos cursos que ensinam a ferramenta, sem prometer liberação pela promoção.
   */
  stageTitle: string | null
  /** Em `journey` e `advanced`: para onde o botão leva (a etapa atual ou Seu progresso). */
  stageHref: string | null
  /** Só em `plan`: a pessoa já conquistou a ferramenta na jornada e volta a abri-la ao assinar. */
  earned: boolean
  /** Curriculum grants happen during the post, rather than on arrival at its successor. */
  curriculum?: boolean
}

/** O motivo do cadeado, pronto para o `ToolNotice` (dados simples, atravessam para o cliente). */
export function toolLock(tool: CreativeToolKey, state: ToolAccessState): ToolLock | null {
  const reason = toolLockReason(tool, state)
  if (!reason) return null
  const context = state.journey.curriculum ? { curriculum: true } : {}
  if (reason === 'plan') {
    const earned = toolEarned(tool, state.journey)
    return {
      ...context,
      reason,
      stageTitle: earned ? null : toolStageTitle(tool, state.journey),
      stageHref: null,
      earned,
    }
  }
  return {
    ...context,
    reason,
    stageTitle: reason === 'journey' ? toolStageTitle(tool, state.journey) : null,
    stageHref: currentStageHref(state.journey),
    earned: false,
  }
}
