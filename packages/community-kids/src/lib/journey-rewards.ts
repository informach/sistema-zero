import {
  JOURNEY_LEVEL_SLUGS,
  KIDS_CREATOR_CAPABILITIES,
  type KidsCreatorCapability,
  type KidsJourneyView,
} from '@sistemazero/core/journey'
import { moldaFeatureList } from './molda-level-gain'
import type { StudentLevelSlug } from './types'

export interface JourneyRewardInfo {
  title: string
  description: string
}

const CAPABILITY_REWARD_INFO: Record<KidsCreatorCapability, JourneyRewardInfo> = {
  studio: {
    title: 'Estúdio livre',
    description:
      'Crie com os blocos conquistados nos cursos, quando o Estúdio estiver incluído na sua conta.',
  },
  pinta: {
    title: 'Pinta',
    description: 'Desenhe personagens e cenários, quando o Pinta estiver incluído na sua conta.',
  },
  bridge: {
    title: 'Modo Ponte',
    description: 'Veja os blocos e o código lado a lado, trabalhando juntos.',
  },
  pro: {
    title: 'Modo Pro',
    description: 'Escreva o jogo direto no código, com o Estúdio incluído na sua conta.',
  },
  ai: {
    title: 'Zappy',
    description: 'O Zappy ajuda nas ferramentas que estão disponíveis para você.',
  },
  pensa: {
    title: 'Pensa',
    description: 'Planeje a ideia do jogo, quando o Pensa estiver incluído na sua conta.',
  },
  molda: {
    title: 'Molda, a sua oficina 3D',
    description:
      'Modele peças, pinte texturas e crie céus para seus jogos, quando o Molda estiver incluído na sua conta.',
  },
  'molda-intermediate': {
    title: 'Novas ferramentas do Molda',
    description: `No Molda, você conquistou ${moldaFeatureList('intermediate')}.`,
  },
  'molda-professional': {
    title: 'Ferramentas avançadas do Molda',
    description: `No Molda, você conquistou ${moldaFeatureList('professional')}.`,
  },
}

function capabilityRewardInfo(capabilities: readonly KidsCreatorCapability[]): JourneyRewardInfo {
  const ordered = KIDS_CREATOR_CAPABILITIES.filter((capability) =>
    capabilities.includes(capability),
  )
  const title = ordered.map((capability) => CAPABILITY_REWARD_INFO[capability].title).join(' + ')
  return {
    title,
    description: ordered
      .map((capability) => CAPABILITY_REWARD_INFO[capability].description)
      .join(' '),
  }
}

/** Actual retained resources, including capabilities removed from the current policy's awards. */
export function journeyEarnedRewardInfo(view: KidsJourneyView): JourneyRewardInfo {
  return capabilityRewardInfo(view.earned.capabilities)
}

/** No rank threshold: each node describes the current policy and actual retained child rights. */
export function journeyRewardInfo(
  view: KidsJourneyView,
  slug: StudentLevelSlug,
): JourneyRewardInfo {
  const earnedNode =
    JOURNEY_LEVEL_SLUGS.indexOf(slug) <= JOURNEY_LEVEL_SLUGS.indexOf(view.earned.level)
  const assigned = view.advances.find((advance) => advance.level === slug)?.capabilities ?? []
  const capabilities = assigned.filter((capability) =>
    earnedNode
      ? view.earned.capabilities.includes(capability)
      : !view.earned.capabilities.includes(capability),
  )
  if (!earnedNode && view.mode === 'paused')
    return {
      title: 'Próximos cursos',
      description: 'Os próximos cursos estão em preparação.',
    }
  if (capabilities.length) return capabilityRewardInfo(capabilities)
  if (slug === 'noob')
    return {
      title: 'O Estúdio nas aulas',
      description: 'Você cria dentro das aulas, com as peças de cada curso.',
    }
  return {
    title: 'Um posto novo no mapa',
    description: earnedNode
      ? 'Seu posto e suas conquistas continuam guardados.'
      : 'Mais um passo na sua jornada de criação.',
  }
}

/** As ferramentas de uma trilha ditas numa frase curta, para o cartão "Próximo nível". */
const CAPABILITY_PHRASE: Record<KidsCreatorCapability, string> = {
  studio: 'o Estúdio livre',
  pinta: 'o Pinta para desenhar',
  bridge: 'a Ponte entre blocos e código',
  pro: 'o modo Pro',
  ai: 'a ajuda do Zappy',
  pensa: 'o Pensa para planejar',
  molda: 'o Molda para criar modelos 3D',
  'molda-intermediate': 'ferramentas novas no Molda',
  'molda-professional': 'as ferramentas avançadas do Molda',
}

/**
 * "o Molda para criar modelos 3D e o Pensa para planejar": as ferramentas que a trilha libera,
 * na ordem do catálogo. `null` quando a trilha não libera ferramenta.
 */
export function capabilityPhrase(capabilities: readonly KidsCreatorCapability[]): string | null {
  const ordered = KIDS_CREATOR_CAPABILITIES.filter((capability) =>
    capabilities.includes(capability),
  ).map((capability) => CAPABILITY_PHRASE[capability])
  if (!ordered.length) return null
  return ordered.length === 1
    ? ordered[0]!
    : `${ordered.slice(0, -1).join(', ')} e ${ordered.at(-1)}`
}

/**
 * As ferramentas que cada trilha do currículo libera, pelo slug do posto. No currículo o
 * `advances[i]` carrega as ferramentas concedidas DURANTE a trilha `i` (depois do 2D, do 3D,
 * do par ou de um curso dela), e não as do posto de chegada.
 */
export function curriculumTrailCapabilities(
  view: KidsJourneyView,
): Partial<Record<StudentLevelSlug, readonly KidsCreatorCapability[]>> {
  const stages = view.curriculum?.stages ?? []
  return Object.fromEntries(
    stages.map((stage, index) => [stage.level, view.advances[index]?.capabilities ?? []]),
  )
}
