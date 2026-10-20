import {
  type CreativeToolId,
  type JourneyLevelSlug,
  kidsCreativeToolAvailability,
} from '@sistemazero/core/journey'
import {
  isKidsStaffPreview,
  type KidsJourneyAccess,
} from '@sistemazero/member-shell/lib/kids-journey-access'

/**
 * O posto da Jornada em que a política PUBLICADA abre a ferramenta, para a tela do produto
 * bloqueado (a conta não tem a Comunidade, então o `kidsCreativeToolAvailability` de verdade
 * responde `not-included`, sem posto).
 *
 * A pergunta aqui é outra: "na Comunidade, a partir de qual posto ela abre?". A resposta sai da
 * MESMA régua do core, como se a criança começasse sem nenhuma capacidade: o posto que cobre
 * todas as capacidades da ferramenta (o Pensa precisa também da IA), dentro do horizonte
 * publicado. Política pausada, sem horizonte, prévia da equipe ou jornada indisponível → `null`,
 * e a tela não cita posto nenhum (nunca um nome digitado à mão).
 */
export function toolOpensAtLevel(
  tool: CreativeToolId,
  journey: KidsJourneyAccess | null,
): JourneyLevelSlug | null {
  if (!journey || isKidsStaffPreview(journey)) return null
  const fromScratch = { ...journey, earned: { ...journey.earned, capabilities: [] } }
  return kidsCreativeToolAvailability({ tool, owned: true, journey: fromScratch }).requiredLevel
}

/**
 * A criança JÁ conquistou na Jornada tudo o que a ferramenta pede (as capacidades ficam com ela
 * quando a assinatura acaba). A tela do produto bloqueado troca a promessa do posto por "você já
 * chegou ao posto, com a assinatura volta a abrir". Prévia da equipe ou jornada indisponível →
 * `false` (nenhuma promessa de volta).
 */
export function toolEarnedInJourney(tool: CreativeToolId, journey: KidsJourneyAccess | null) {
  if (!journey || isKidsStaffPreview(journey)) return false
  return kidsCreativeToolAvailability({ tool, owned: true, journey }).state === 'available'
}
